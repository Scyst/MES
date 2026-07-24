// workOrderModule.js — Work Order Management Module
const WorkOrderModule = (() => {
    let allData = [];
    let machineList = [];
    let currentView = window.innerWidth <= 768 ? 'kanban' : 'table';

    // Cropper State
    let cropper = null;
    let currentCropTarget = null; // 'before' or 'after'
    let croppedImageBlob = null;
    let croppedImageAfterBlob = null;

    function getFiltersFromDOM() {
        return {
            status: document.getElementById('woFilterStatus')?.value || '',
            priority: document.getElementById('woFilterPriority')?.value || '',
            line: document.getElementById('woFilterLine')?.value || '',
            startDate: document.getElementById('woStartDate')?.value || '',
            endDate: document.getElementById('woEndDate')?.value || '',
            dateType: document.getElementById('woDateFilterType')?.value || 'requested_at'
        };
    }

    async function loadData(filters = null) {
        try {
            const apiParams = filters || getFiltersFromDOM();
            const res = await PEApp.apiCall('workOrderAPI.php', {
                action: 'get_work_orders', ...apiParams
            });
            allData = res.data || [];
            const summary = res.summary || {};

            // Update KPIs
            PEApp.animateValue(document.getElementById('kpiTotalWO'), 0, summary.total || 0);
            PEApp.animateValue(document.getElementById('kpiOpenWO'), 0, summary.open_count || 0);
            PEApp.animateValue(document.getElementById('kpiCompletedWO'), 0, summary.completed_count || 0);

            const avgEl = document.getElementById('kpiAvgRepair');
            if (avgEl) avgEl.innerHTML = `${Math.round(summary.avg_repair || 0)} <span class="unit">min</span>`;

            // Update badge
            const badge = document.getElementById('woOpenBadge');
            if (badge) {
                const openCount = summary.open_count || 0;
                badge.textContent = openCount;
                badge.style.display = openCount > 0 ? '' : 'none';
            }

            renderView();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function filterTable() {
        const q = (document.getElementById('woSearchInput')?.value || '').toLowerCase();
        renderView(q);
    }

    function renderView(searchQuery = '') {
        const filtered = searchQuery
            ? allData.filter(w =>
                (w.wo_number || '').toLowerCase().includes(searchQuery) ||
                (w.machine_name || '').toLowerCase().includes(searchQuery) ||
                (w.machine_display_name || '').toLowerCase().includes(searchQuery) ||
                (w.issue_title || '').toLowerCase().includes(searchQuery) ||
                (w.assigned_to || '').toLowerCase().includes(searchQuery))
            : allData;

        if (currentView === 'table') renderTable(filtered);
        else if (currentView === 'kanban') renderKanban(filtered);
        else if (currentView === 'board') renderBoard(filtered);
    }

    function renderTable(data) {
        const tbody = document.getElementById('woTableBody');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="11" class="pe-text-center pe-text-muted" style="padding:60px;">No work orders found</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(w => {
            const machineTxt = w.machine_code
                ? `${PEApp.escapeHtml(w.machine_code)}`
                : PEApp.escapeHtml(w.machine_name || '-');

            let quickActionBtn = '';
            let rowAction = `WorkOrderModule.openModal(${w.wo_id})`; // default

            if (w.status === 'Open') {
                quickActionBtn = `<button class="pe-btn pe-btn-primary pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.quickAccept(${w.wo_id})" style="margin-right:4px;">รับงาน</button>`;
                rowAction = `WorkOrderModule.quickAccept(${w.wo_id})`;
            } else if (w.status === 'Assigned') {
                quickActionBtn = `<button class="pe-btn pe-btn-warning pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.quickStart(${w.wo_id})" style="margin-right:4px; color:white;">เริ่มงาน</button>`;
                rowAction = `WorkOrderModule.quickStart(${w.wo_id})`;
            } else if (w.status === 'In Progress') {
                quickActionBtn = `<button class="pe-btn pe-btn-success pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.openQuickCloseModal(${w.wo_id})" style="margin-right:4px;">ปิดงาน</button>`;
                rowAction = `WorkOrderModule.openQuickCloseModal(${w.wo_id})`;
            }

            return `
            <tr style="cursor:pointer;" onclick="${rowAction}">
                <td>${PEApp.getStatusBadge(w.status)}</td>
                <td class="pe-fw-bold" style="color:var(--pe-primary);">${PEApp.escapeHtml(w.wo_number)}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(w.wo_type || '-')}</td>
                <td>${PEApp.getPriorityBadge(w.priority)}</td>
                <td class="pe-text-sm">${machineTxt}</td>
                <td>${PEApp.escapeHtml(w.line || '-')}</td>
                <td class="pe-text-sm" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${PEApp.escapeHtml(w.issue_title || '-')}</td>
                <td class="pe-text-sm">${PEApp.formatDate(w.requested_at)}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(w.assigned_to || '-')}</td>
                <td class="pe-text-sm pe-text-center">${w.repair_minutes ? w.repair_minutes + ' min' : '-'}</td>
                <td class="pe-text-center" style="white-space:nowrap;">
                    ${quickActionBtn}
                    <button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="event.stopPropagation(); WorkOrderModule.printPDF(${w.wo_id})" title="Print PDF" style="color:var(--pe-primary); margin-right:4px;">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="event.stopPropagation(); WorkOrderModule.openModal(${w.wo_id})" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function renderKanban(data) {
        const container = document.getElementById('woCardContainer');
        if (!container) return;
        
        container.innerHTML = data.map(w => {
            const priorityAccent = {
                'Critical': 'var(--pe-danger)',
                'High': '#f97316',
                'Normal': 'var(--pe-primary)',
                'Low': 'var(--pe-text-muted)'
            }[w.priority] || 'var(--pe-border)';
            
            let quickActionBtn = '';
            let rowAction = `WorkOrderModule.openModal(${w.wo_id})`; // default
            
            if (w.status === 'Open') {
                quickActionBtn = `<button class="pe-btn pe-btn-primary pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.quickAccept(${w.wo_id})" style="padding: 5px 14px; font-size: 13px;">รับงาน</button>`;
                rowAction = `WorkOrderModule.quickAccept(${w.wo_id})`;
            } else if (w.status === 'Assigned') {
                quickActionBtn = `<button class="pe-btn pe-btn-warning pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.quickStart(${w.wo_id})" style="padding: 5px 14px; font-size: 13px; color:white;">เริ่มงาน</button>`;
                rowAction = `WorkOrderModule.quickStart(${w.wo_id})`;
            } else if (w.status === 'In Progress') {
                quickActionBtn = `<button class="pe-btn pe-btn-success pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.openQuickCloseModal(${w.wo_id})" style="padding: 5px 14px; font-size: 13px;">ปิดงาน</button>`;
                rowAction = `WorkOrderModule.openQuickCloseModal(${w.wo_id})`;
            }
            
            return `
            <div class="pe-kanban-card" style="border-left: 4px solid ${priorityAccent};" onclick="${rowAction}">
                <!-- Row 1: Machine (Top Left) & Badges (Top Right) -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--pe-text-secondary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${PEApp.escapeHtml(w.machine_code || w.machine_name || '-')}">
                        <i class="fas fa-cogs me-1"></i>${PEApp.escapeHtml(w.machine_code || w.machine_name || '-')}
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: flex-end; flex-shrink: 0;">
                        ${PEApp.getStatusBadge(w.status)}
                        ${PEApp.getPriorityBadge(w.priority)}
                    </div>
                </div>
                
                <!-- Row 2: Issue Title -->
                <div style="font-size: 15px; font-weight: 700; color: var(--pe-text-primary); line-height: 1.4; margin-bottom: 10px;">
                    ${PEApp.escapeHtml(w.issue_title || '-')}
                </div>
                
                <!-- Row 3: WO# & Date -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--pe-text-secondary); margin-bottom: 12px;">
                    <span style="font-weight: 600; color: var(--pe-text-muted);"><i class="fas fa-hashtag me-1" style="opacity:0.6;"></i>${PEApp.escapeHtml(w.wo_number)}</span>
                    <span><i class="far fa-clock me-1"></i>${PEApp.formatDate(w.requested_at)}</span>
                </div>
                
                <!-- Row 4: Icons (Left) & Actions (Right) -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--pe-border-light);">
                    <div style="display: flex; gap: 6px;">
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.printPDF(${w.wo_id})" title="Print PDF" style="padding: 4px 8px; color: var(--pe-text-muted);">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="event.stopPropagation(); WorkOrderModule.openModal(${w.wo_id})" title="Edit Details" style="padding: 4px 8px; color: var(--pe-primary);">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                    <div>
                        ${quickActionBtn}
                    </div>
                </div>
            </div>
        `}).join('') || '<div class="pe-text-center pe-text-muted" style="padding: 48px 20px;"><i class="fas fa-inbox fa-2x mb-3" style="display:block; opacity:0.3;"></i>ไม่พบรายการ</div>';
    }


    function renderBoard(data) {
        const cols = {
            'Open': document.getElementById('board-col-Open'),
            'Assigned': document.getElementById('board-col-Assigned'),
            'In Progress': document.getElementById('board-col-InProgress'),
            'Completed': document.getElementById('board-col-Completed')
        };
        
        const counts = { 'Open': 0, 'Assigned': 0, 'In Progress': 0, 'Completed': 0 };

        // Clear cols
        for (let k in cols) { if (cols[k]) cols[k].innerHTML = ''; }

        data.forEach(w => {
            let colKey = w.status;
            
            // Map statuses for Board view
            if (colKey === 'Pending') colKey = 'Open';
            
            if (!cols[colKey]) return; // Cancelled or other statuses won't appear on the board
            
            counts[colKey]++;
            
            const machineTxt = w.machine_code
                ? `${PEApp.escapeHtml(w.machine_code)}`
                : PEApp.escapeHtml(w.machine_name || '-');
                
            let cardHtml = `
            <div class="pe-board-card" draggable="true" ondragstart="WorkOrderModule.dragStart(event, ${w.wo_id})" id="board-card-${w.wo_id}" onclick="WorkOrderModule.openModal(${w.wo_id})">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="pe-fw-bold" style="color:var(--pe-primary); font-size: 0.95rem;">${PEApp.escapeHtml(w.wo_number)}</div>
                    ${PEApp.getPriorityBadge(w.priority)}
                </div>
                <div class="pe-text-sm pe-text-muted mb-2 pe-text-truncate" title="${PEApp.escapeHtml(w.issue_title)}">
                    ${PEApp.escapeHtml(w.issue_title)}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto" style="font-size: 0.8rem; color: var(--pe-text-muted);">
                    <div><i class="fas fa-industry me-1"></i> ${machineTxt}</div>
                </div>
            </div>`;
            
            cols[colKey].insertAdjacentHTML('beforeend', cardHtml);
        });

        // Update counts
        for (let k in counts) {
            const countEl = document.getElementById(`count-board-${k.replace(' ', '')}`);
            if (countEl) countEl.innerText = counts[k];
        }
    }

    function dragStart(ev, id) {
        ev.dataTransfer.setData("text/plain", id);
        setTimeout(() => ev.target.classList.add('dragging'), 0);
    }

    function allowDrop(ev) {
        ev.preventDefault();
    }

    function dragEnter(ev) {
        ev.preventDefault();
        const col = ev.currentTarget;
        if (col.classList.contains('pe-board-column')) {
            col.classList.add('drag-over');
        }
    }

    function dragLeave(ev) {
        const col = ev.currentTarget;
        if (col.classList.contains('pe-board-column')) {
            col.classList.remove('drag-over');
        }
    }

    async function drop(ev) {
        ev.preventDefault();
        const col = ev.currentTarget;
        col.classList.remove('drag-over');
        
        const woId = ev.dataTransfer.getData("text/plain");
        const newStatus = col.getAttribute('data-status');
        
        if (!woId || !newStatus) return;
        
        const card = document.getElementById(`board-card-${woId}`);
        if (card) card.classList.remove('dragging');

        // Check current status to avoid redundant calls
        const targetWo = allData.find(w => w.wo_id == woId);
        if (targetWo && targetWo.status === newStatus) return;

        // Validation Rules for Drag and Drop
        if (newStatus === 'Assigned' && (!targetWo.assigned_to || targetWo.assigned_to.trim() === '')) {
            renderBoard(allData); // Revert board UI
            openModal(woId); // Open full modal to assign tech
            document.getElementById('woFrmStatus').value = 'Assigned';
            setTimeout(() => {
                const el = document.getElementById('woFrmAssignedTo');
                if (el) el.focus();
            }, 500);
            PEApp.showToast('กรุณาระบุชื่อช่างผู้รับผิดชอบก่อนย้ายไปที่ Assigned', 'info');
            return;
        }

        if (newStatus === 'Completed' && (!targetWo.photo_after || !targetWo.action_taken || targetWo.action_taken.trim() === '')) {
            renderBoard(allData); // Revert board UI
            if (typeof openQuickClose === 'function') openQuickClose(woId); 
            else if (typeof window.openQuickClose === 'function') window.openQuickClose(woId);
            else if (typeof openQuickCloseModal === 'function') openQuickCloseModal(woId);
            else {
                // Fallback to full modal
                openModal(woId);
                document.getElementById('woFrmStatus').value = 'Completed';
            }
            PEApp.showToast('กรุณาระบุรูปภาพและรายละเอียดการซ่อมเพื่อปิดงาน', 'info');
            return;
        }

        try {
            // Optimistic UI update
            if (targetWo) targetWo.status = newStatus;
            renderBoard(allData);

            // Send API call to update status
            const res = await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                action: 'update_status_only',
                wo_id: woId,
                status: newStatus
            });
            
            if (res.success) {
                // Background refresh to ensure full data sync without jitter
                loadData();
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            PEApp.showToast(e.message || 'Error updating status', 'error');
            loadData(); // rollback
        }
    }
    function setView(view) {
        currentView = view;
        document.getElementById('woViewTable')?.classList.toggle('active', view === 'table');
        document.getElementById('woViewKanban')?.classList.toggle('active', view === 'kanban');
        document.getElementById('woViewBoard')?.classList.toggle('active', view === 'board');
        
        document.getElementById('woTableView').style.display = view === 'table' ? '' : 'none';
        document.getElementById('woKanbanView').style.display = view === 'kanban' ? '' : 'none';
        
        const board = document.getElementById('woBoardView');
        if (board) board.style.display = view === 'board' ? '' : 'none';
        
        renderView();
    }

    async function openModal(editId = null) {
        const isEdit = !!editId;
        document.getElementById('woEditId').value = editId || '';
        document.getElementById('woModalTitle').textContent = isEdit ? 'Edit Work Order' : 'New Work Order';
        
        const modalDialog = document.getElementById('woModalDialog');
        const reqCol = document.getElementById('woRequesterCol');
        const imgBefore = document.getElementById('woImageBeforeCol');
        
        if (isEdit) {
            if (modalDialog) { modalDialog.classList.remove('modal-lg'); modalDialog.classList.add('modal-xl'); }
            if (reqCol) { reqCol.classList.remove('col-lg-12'); reqCol.classList.add('col-lg-6', 'wo-divider-col'); }
            if (imgBefore) { imgBefore.classList.remove('col-md-12'); imgBefore.classList.add('col-md-6'); }
        } else {
            if (modalDialog) { modalDialog.classList.remove('modal-xl'); modalDialog.classList.add('modal-lg'); }
            if (reqCol) { reqCol.classList.remove('col-lg-6', 'wo-divider-col'); reqCol.classList.add('col-lg-12'); }
            if (imgBefore) { imgBefore.classList.remove('col-md-6'); imgBefore.classList.add('col-md-12'); }
        }
        
        const isDeleted = editId && allData.find(w => w.wo_id == editId && (w.is_active === 0 || w.is_active === '0'));
        
        document.getElementById('woSaveBtn').innerHTML = isEdit ? '<i class="fas fa-save me-1"></i> Update' : '<i class="fas fa-save me-1"></i> Create Work Order';

        // Reset all fields
        ['woFrmTitle', 'woFrmDetail', 'woFrmLine', 'woFrmAssignedTo', 'woFrmRootCause', 'woFrmAction'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('woFrmType').value = 'Corrective';
        document.getElementById('woFrmMachine').value = '';
        if (document.getElementById('woFrmMachineName')) {
            document.getElementById('woFrmMachineName').value = '';
            if (document.getElementById('colCustomMachine')) document.getElementById('colCustomMachine').style.display = 'block';
            if (document.getElementById('colLine')) document.getElementById('colLine').className = 'col-md-3';
        }
        document.getElementById('woFrmLine').value = '';
        // Default to current time for New Work Order
        document.getElementById('woFrmRequestDate').value = isEdit ? '' : getLocalISO();
        document.getElementById('woFrmRepairMin').value = '';
        document.getElementById('woFrmStartedAt').value = '';
        document.getElementById('woFrmCompletedAt').value = '';
        document.getElementById('woFrmStatus').value = 'Open';

        // Show/hide tech section
        const techFields = ['woTechSection', 'woAssignedToGroup', 'woStartedAtGroup', 'woCompletedAtGroup', 'woStatusGroup', 'woRepairMinGroup', 'woRootCauseGroup', 'woActionGroup', 'woSparePartsGroup', 'woImageAfterGroup'];
        techFields.forEach(id => { 
            const el = document.getElementById(id);
            if (el) {
                if (isEdit) {
                    el.classList.remove('d-none');
                    el.style.display = '';
                } else {
                    el.classList.add('d-none');
                }
            }
        });

        // Reset images
        const imgInput = document.getElementById('woFrmImage');
        if (imgInput) imgInput.value = '';
        const previewDiv = document.getElementById('woImagePreview');
        if (previewDiv) previewDiv.style.display = 'none';
        const dropzoneBefore = document.getElementById('woDropzoneBefore');
        if (dropzoneBefore) dropzoneBefore.classList.remove('has-image');

        const imgAfterInput = document.getElementById('woFrmImageAfter');
        if (imgAfterInput) imgAfterInput.value = '';
        const previewAfterDiv = document.getElementById('woImageAfterPreview');
        if (previewAfterDiv) previewAfterDiv.style.display = 'none';
        const dropzoneAfter = document.getElementById('woDropzoneAfter');
        if (dropzoneAfter) dropzoneAfter.classList.remove('has-image');

        croppedImageBlob = null;
        croppedImageAfterBlob = null;

        const deleteBtn = document.getElementById('woDeleteBtn');
        const printBtn = document.getElementById('woPrintBtn');
        const saveBtn = document.getElementById('woSaveBtn');
        const acceptBtn = document.getElementById('woQuickAcceptBtn');
        const closeBtn = document.getElementById('woQuickCloseBtn');
        
        if (printBtn) {
            printBtn.style.display = (isEdit && !isDeleted) ? '' : 'none';
        }
        
        if (acceptBtn) acceptBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';

        if (isDeleted) {
            document.getElementById('woModalTitle').textContent = 'Restore Work Order';
            saveBtn.innerHTML = '<i class="fas fa-trash-restore me-1"></i> Restore Work Order';
            saveBtn.onclick = restoreItem;
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            saveBtn.onclick = save;
            if (deleteBtn) deleteBtn.style.display = isEdit ? 'block' : 'none';
        }

        // Load machine dropdown
        await loadMachineDropdown('woFrmMachine');

        if (isEdit) {
            const wo = allData.find(w => w.wo_id == editId);
            if (wo) {
                document.getElementById('woFrmType').value = wo.wo_type || 'Corrective';
                document.getElementById('woFrmPriority').value = wo.priority || 'Normal';
                document.getElementById('woFrmMachine').value = wo.machine_id || '';
                if (document.getElementById('woFrmMachineName')) {
                    document.getElementById('woFrmMachineName').value = (!wo.machine_id && wo.machine_name) ? wo.machine_name : '';
                    if (document.getElementById('colCustomMachine')) document.getElementById('colCustomMachine').style.display = wo.machine_id ? 'none' : 'block';
                    if (document.getElementById('colLine')) document.getElementById('colLine').className = wo.machine_id ? 'col-md-6' : 'col-md-3';
                }
                document.getElementById('woFrmLine').value = wo.line || '';
                document.getElementById('woFrmTitle').value = wo.issue_title || '';
                document.getElementById('woFrmDetail').value = wo.issue_detail || '';
                document.getElementById('woFrmStatus').value = wo.status || 'Open';
                document.getElementById('woFrmAssignedTo').value = wo.assigned_to || '';
                document.getElementById('woFrmRepairMin').value = wo.repair_minutes || '';
                document.getElementById('woFrmRootCause').value = wo.root_cause || '';
                document.getElementById('woFrmAction').value = wo.action_taken || '';

                if (wo.requested_at) document.getElementById('woFrmRequestDate').value = wo.requested_at.replace(' ', 'T').substring(0, 16);
                if (wo.started_at) document.getElementById('woFrmStartedAt').value = wo.started_at.replace(' ', 'T').substring(0, 16);
                if (wo.completed_at) document.getElementById('woFrmCompletedAt').value = wo.completed_at.replace(' ', 'T').substring(0, 16);

                if (acceptBtn) {
                    acceptBtn.style.display = (wo.status === 'Open' || wo.status === 'Assigned') && !isDeleted ? '' : 'none';
                }
                if (closeBtn) {
                    closeBtn.style.display = (wo.status === 'In Progress') && !isDeleted ? '' : 'none';
                }

                if (wo.image_path) {
                    const img = previewDiv.querySelector('img');
                    if (img) {
                        img.src = '../../' + wo.image_path;
                        previewDiv.style.display = 'flex';
                        if (dropzoneBefore) dropzoneBefore.classList.add('has-image');
                    }
                }
                if (wo.photo_after) {
                    const imgAfter = previewAfterDiv.querySelector('img');
                    if (imgAfter) {
                        imgAfter.src = '../../' + wo.photo_after;
                        previewAfterDiv.style.display = 'flex';
                        if (dropzoneAfter) dropzoneAfter.classList.add('has-image');
                    }
                }
                
                // Load spare parts used
                loadSpareParts(editId);
            }
        }

        PEApp.showModal('workOrderModal');
    }

    async function loadMachineDropdown(selectId) {
        try {
            const res = await PEApp.apiCall('workOrderAPI.php', { action: 'get_machines_list' });
            const sel = document.getElementById(selectId);
            if (!sel) return;
            machineList = res.data || [];
            const currentVal = sel.value;
            while (sel.options.length > 1) sel.options.remove(1);
            machineList.forEach(m => {
                sel.add(new Option(`${m.machine_code} — ${m.machine_name}`, m.machine_id, false, m.machine_id == currentVal));
            });

            // Populate Datalists
            if (res.lines && res.lines.length > 0) {
                const lineList = document.getElementById('woLineList');
                if (lineList) {
                    lineList.innerHTML = res.lines.map(l => `<option value="${PEApp.escapeHtml(l)}"></option>`).join('');
                }
            }
            if (res.technicians && res.technicians.length > 0) {
                const techList = document.getElementById('woTechList');
                if (techList) {
                    techList.innerHTML = res.technicians.map(t => `<option value="${PEApp.escapeHtml(t)}"></option>`).join('');
                }
            }
        } catch (e) { /* silent */ }
    }

    async function save() {
        const title = document.getElementById('woFrmTitle')?.value?.trim();
        if (!title) {
            PEApp.showToast('กรุณากรอก Issue Title', 'warning');
            return;
        }

        const btn = document.getElementById('woSaveBtn');
        btn.disabled = true;

        const editId = document.getElementById('woEditId')?.value;
        
        // Require Before Image for New Work Orders
        if (!editId) {
            const imgInput = document.getElementById('woFrmImage');
            if (!croppedImageBlob && (!imgInput || imgInput.files.length === 0)) {
                PEApp.showToast('กรุณาแนบรูปภาพปัญหาก่อนซ่อม (Before Image)', 'warning');
                btn.disabled = false;
                return;
            }
        }

        const status = document.getElementById('woFrmStatus')?.value || 'Open';
        
        // Require After Image if status is Completed
        if (status === 'Completed') {
            const imgAfterInput = document.getElementById('woFrmImageAfter');
            const previewAfterDiv = document.getElementById('woImageAfterPreview');
            const hasExistingAfterImage = previewAfterDiv && previewAfterDiv.style.display !== 'none';
            
            if (!croppedImageAfterBlob && (!imgAfterInput || imgAfterInput.files.length === 0) && !hasExistingAfterImage) {
                PEApp.showToast('กรุณาแนบรูปภาพหลังซ่อม (After Image) เนื่องจากสถานะเป็น Completed', 'warning');
                btn.disabled = false;
                return;
            }
        }

        try {
            let imagePath = null;
            if (croppedImageBlob) {
                const file = new File([croppedImageBlob], "image_before.webp", { type: "image/webp" });
                imagePath = await PEApp.uploadFile(file, 'WO');
            } else {
                const imgInput = document.getElementById('woFrmImage');
                if (imgInput && imgInput.files.length > 0) {
                    imagePath = await PEApp.uploadFile(imgInput.files[0], 'WO');
                }
            }

            let photoAfter = null;
            if (croppedImageAfterBlob) {
                const file = new File([croppedImageAfterBlob], "image_after.webp", { type: "image/webp" });
                photoAfter = await PEApp.uploadFile(file, 'WO');
            } else {
                const imgAfterInput = document.getElementById('woFrmImageAfter');
                if (imgAfterInput && imgAfterInput.files.length > 0) {
                    photoAfter = await PEApp.uploadFile(imgAfterInput.files[0], 'WO');
                }
            }

            if (editId) {
                const payload = {
                    action: 'update_wo',
                    wo_id: editId,
                    wo_type: document.getElementById('woFrmType')?.value || 'Corrective',
                    priority: document.getElementById('woFrmPriority')?.value || 'Normal',
                    status: document.getElementById('woFrmStatus')?.value || 'Open',
                    machine_id: document.getElementById('woFrmMachine')?.value || '',
                    machine_name: document.getElementById('woFrmMachineName')?.value || '',
                    line: document.getElementById('woFrmLine')?.value || '',
                    issue_title: title,
                    issue_detail: document.getElementById('woFrmDetail')?.value || '',
                    assigned_to: document.getElementById('woFrmAssignedTo')?.value || '',
                    started_at: document.getElementById('woFrmStartedAt')?.value || '',
                    completed_at: document.getElementById('woFrmCompletedAt')?.value || '',
                    repair_minutes: document.getElementById('woFrmRepairMin')?.value || '',
                    root_cause: document.getElementById('woFrmRootCause')?.value || '',
                    action_taken: document.getElementById('woFrmAction')?.value || ''
                };
                if (imagePath) payload.image_path = imagePath;
                if (photoAfter) payload.photo_after = photoAfter;
                await PEApp.apiCall('workOrderAPI.php', {}, 'POST', payload);
            } else {
                const payload = {
                    action: 'create_wo',
                    wo_type: document.getElementById('woFrmType')?.value || 'Corrective',
                    priority: document.getElementById('woFrmPriority')?.value || 'Normal',
                    machine_id: document.getElementById('woFrmMachine')?.value || '',
                    machine_name: document.getElementById('woFrmMachineName')?.value || '',
                    line: document.getElementById('woFrmLine')?.value || '',
                    requested_at: document.getElementById('woFrmRequestDate')?.value || '',
                    issue_title: title,
                    issue_detail: document.getElementById('woFrmDetail')?.value || ''
                };
                if (imagePath) payload.image_path = imagePath;
                await PEApp.apiCall('workOrderAPI.php', {}, 'POST', payload);
            }

            PEApp.showToast(editId ? 'อัปเดต Work Order เรียบร้อย' : 'สร้าง Work Order เรียบร้อย', 'success');
            PEApp.hideModal('workOrderModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function initCropper() {
        const modal = document.getElementById('cropImageModal');
        if (!modal) return;
        let cropModal = null;
        try {
            cropModal = new bootstrap.Modal(modal);
        } catch(e) {}
        if (!cropModal) return;

        const imageToCrop = document.getElementById('imageToCrop');

        function openCropper(file, target) {
            currentCropTarget = target;
            const reader = new FileReader();
            reader.onload = (e) => {
                imageToCrop.src = e.target.result;
                cropModal.show();
                modal.addEventListener('shown.bs.modal', function onShown() {
                    modal.removeEventListener('shown.bs.modal', onShown);
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, {
                        aspectRatio: NaN,
                        viewMode: 1,
                        autoCropArea: 1,
                        responsive: true
                    });
                });
            };
            reader.readAsDataURL(file);
        }

        function setupDropzone(dropzoneId, inputId, target) {
            const dropzone = document.getElementById(dropzoneId);
            const input = document.getElementById(inputId);
            if (!dropzone || !input) return;

            dropzone.addEventListener('click', () => input.click());

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    // Update the input files to match the dropped file for consistency
                    input.files = e.dataTransfer.files;
                    openCropper(e.dataTransfer.files[0], target);
                }
            });

            input.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    openCropper(this.files[0], target);
                }
            });
        }

        setupDropzone('woDropzoneBefore', 'woFrmImage', 'before');
        setupDropzone('woDropzoneAfter', 'woFrmImageAfter', 'after');
        setupDropzone('qcDropzoneAfter', 'qcFrmImageAfter', 'qc_after');

        document.getElementById('btnRotateLeft')?.addEventListener('click', () => { if (cropper) cropper.rotate(-90); });
        document.getElementById('btnRotateRight')?.addEventListener('click', () => { if (cropper) cropper.rotate(90); });
        
        // Aspect Ratio buttons
        document.querySelectorAll('.btn-aspect').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!cropper) return;
                // Update active state
                document.querySelectorAll('.btn-aspect').forEach(b => b.classList.remove('active', 'btn-light'));
                document.querySelectorAll('.btn-aspect').forEach(b => b.classList.add('btn-outline-light'));
                this.classList.remove('btn-outline-light');
                this.classList.add('active', 'btn-light');
                
                const ratio = parseFloat(this.getAttribute('data-ratio'));
                cropper.setAspectRatio(ratio);
            });
        });

        document.getElementById('btnCancelCrop')?.addEventListener('click', () => {
            cropModal.hide();
            if (cropper) { cropper.destroy(); cropper = null; }
            if (currentCropTarget === 'before') {
                document.getElementById('woFrmImage').value = '';
                if (!croppedImageBlob) {
                    document.getElementById('woDropzoneBefore').classList.remove('has-image');
                    document.getElementById('woImagePreview').style.display = 'none';
                }
            } else if (currentCropTarget === 'after') {
                document.getElementById('woFrmImageAfter').value = '';
                if (!croppedImageAfterBlob) {
                    document.getElementById('woDropzoneAfter').classList.remove('has-image');
                    document.getElementById('woImageAfterPreview').style.display = 'none';
                }
            } else if (currentCropTarget === 'qc_after') {
                document.getElementById('qcFrmImageAfter').value = '';
                if (!croppedImageAfterBlob) {
                    document.getElementById('qcDropzoneAfter').classList.remove('has-image');
                    document.getElementById('qcImageAfterPreview').style.display = 'none';
                }
            }
        });

        document.getElementById('btnConfirmCrop')?.addEventListener('click', () => {
            if (!cropper) return;
            const canvas = cropper.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920 });
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                if (currentCropTarget === 'before') {
                    croppedImageBlob = blob;
                    document.getElementById('woImagePreview').querySelector('img').src = url;
                    document.getElementById('woImagePreview').style.display = 'flex';
                    document.getElementById('woDropzoneBefore').classList.add('has-image');
                } else if (currentCropTarget === 'after') {
                    croppedImageAfterBlob = blob;
                    document.getElementById('woImageAfterPreview').querySelector('img').src = url;
                    document.getElementById('woImageAfterPreview').style.display = 'flex';
                    document.getElementById('woDropzoneAfter').classList.add('has-image');
                } else if (currentCropTarget === 'qc_after') {
                    croppedImageAfterBlob = blob;
                    document.getElementById('qcImageAfterPreview').querySelector('img').src = url;
                    document.getElementById('qcImageAfterPreview').style.display = 'flex';
                    document.getElementById('qcDropzoneAfter').classList.add('has-image');
                }
                cropModal.hide();
                if (cropper) { cropper.destroy(); cropper = null; }
            }, 'image/webp', 0.85);
        });
    }

    document.addEventListener('DOMContentLoaded', initCropper);

    async function deleteItem() {
        const editId = document.getElementById('woEditId')?.value;
        if (!editId) return;

        if (!confirm('ยืนยันที่จะลบ Work Order นี้อย่างถาวร?')) {
            return;
        }

        const btn = document.getElementById('woDeleteBtn');
        if (btn) btn.disabled = true;

        try {
            await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                action: 'delete_wo',
                wo_id: editId
            });
            PEApp.showToast('ลบ Work Order เรียบร้อยแล้ว', 'success');
            PEApp.hideModal('workOrderModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function exportExcel() {
        if (!allData.length) { PEApp.showToast('No data to export', 'warning'); return; }
        if (typeof XLSX === 'undefined') { PEApp.showToast('XLSX library not loaded', 'error'); return; }

        const ws = XLSX.utils.json_to_sheet(allData.map(w => ({
            'WO #': w.wo_number, 'Type': w.wo_type, 'Status': w.status, 'Priority': w.priority,
            'Machine': w.machine_name || '', 'Line': w.line || '', 'Issue': w.issue_title || '',
            'Requested By': w.requested_by || '', 'Requested At': w.requested_at || '',
            'Assigned To': w.assigned_to || '', 'Started': w.started_at || '',
            'Completed': w.completed_at || '', 'Repair (min)': w.repair_minutes || '',
            'Root Cause': w.root_cause || '', 'Action': w.action_taken || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Work Orders');
        XLSX.writeFile(wb, `WorkOrders_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    async function restoreItem() {
        const editId = document.getElementById('woEditId')?.value;
        if (!editId) return;

        if (!confirm('ยืนยันที่จะกู้คืน Work Order นี้?')) return;

        const btn = document.getElementById('woSaveBtn');
        if (btn) btn.disabled = true;

        try {
            await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                action: 'restore_wo',
                wo_id: editId
            });
            PEApp.showToast('กู้คืน Work Order เรียบร้อยแล้ว', 'success');
            PEApp.hideModal('woModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function onMachineChange() {
        const sel = document.getElementById('woFrmMachine');
        const lineInput = document.getElementById('woFrmLine');
        const nameInput = document.getElementById('woFrmMachineName');
        const colCustomMachine = document.getElementById('colCustomMachine');
        const colLine = document.getElementById('colLine');
        if (!sel) return;
        
        if (colCustomMachine && colLine) {
            if (sel.value === '') {
                colCustomMachine.style.display = 'block';
                colLine.className = 'col-md-3';
            } else {
                colCustomMachine.style.display = 'none';
                colLine.className = 'col-md-6';
            }
        }

        if (lineInput) {
            const machine = machineList.find(m => m.machine_id == sel.value);
            if (machine) lineInput.value = machine.line || '';
        }
    }

    // Init date defaults & listeners
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 30);
        
        const startEl = document.getElementById('woStartDate');
        const endEl = document.getElementById('woEndDate');
        
        // Use local timezone formatting (YYYY-MM-DD)
        const formatLocal = (d) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d - offset).toISOString().slice(0, 10);
        };
        
        if (startEl && !startEl.value) startEl.value = formatLocal(start);
        if (endEl && !endEl.value) endEl.value = formatLocal(now);

        // Setup image preview listeners
        document.getElementById('woFrmImage')?.addEventListener('change', function() {
            const previewDiv = document.getElementById('woImagePreview');
            const file = this.files[0];
            if (file && previewDiv) {
                previewDiv.querySelector('img').src = URL.createObjectURL(file);
                previewDiv.style.display = 'block';
            }
        });

        document.getElementById('woFrmImageAfter')?.addEventListener('change', function() {
            const previewAfterDiv = document.getElementById('woImageAfterPreview');
            const file = this.files[0];
            if (file && previewAfterDiv) {
                previewAfterDiv.querySelector('img').src = URL.createObjectURL(file);
                previewAfterDiv.style.display = 'block';
            }
        });
    });

    function printPDF(id = null) {
        const woId = id || document.getElementById('woEditId').value;
        if (!woId) return;
        window.open(PE_CONFIG.apiBase + 'generate_wo_pdf.php?wo_id=' + woId, '_blank');
    }

    // --- Spare Parts Management ---
    let availableParts = [];

    async function loadSpareParts(woId) {
        const tbody = document.getElementById('woSparePartsTableBody');
        const totalCostEl = document.getElementById('woSparePartsTotalCost');
        if (!tbody || !totalCostEl) return;

        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_wo_parts', wo_id: woId });
            const parts = res.data.parts_used || [];
            
            if (parts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="pe-text-center pe-text-muted">No parts issued</td></tr>';
                totalCostEl.textContent = '0.00';
            } else {
                tbody.innerHTML = parts.map(p => `
                    <tr>
                        <td>${PEApp.escapeHtml(p.item_name)} <div class="pe-text-xs pe-text-muted">${PEApp.escapeHtml(p.item_code)}</div></td>
                        <td class="pe-text-end">${parseFloat(p.quantity).toLocaleString()} ${PEApp.escapeHtml(p.uom)}</td>
                        <td class="pe-text-end text-danger d-flex justify-content-end align-items-center gap-2">
                            ${parseFloat(p.total_cost).toLocaleString('en-US', {minimumFractionDigits: 2})}
                            <button type="button" class="btn btn-sm btn-link text-danger p-0 m-0" onclick="WorkOrderModule.deleteSparePart(${p.transaction_id})" title="Delete Part">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
                totalCostEl.textContent = parseFloat(res.data.grand_total).toLocaleString('en-US', {minimumFractionDigits: 2});
            }
        } catch (e) {
            console.error('Error loading parts:', e);
        }
    }

    async function openSparePartsModal() {
        const woId = document.getElementById('woEditId')?.value;
        if (!woId) {
            PEApp.showToast('กรุณาสร้างและบันทึก Work Order ก่อนเบิกอะไหล่', 'warning');
            return;
        }

        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_available_parts' });
            availableParts = res.data || [];
            
            document.getElementById('woIssueItemInput').value = '';
            document.getElementById('woIssueItem').value = '';
            const datalist = document.getElementById('woIssueItemList');
            datalist.innerHTML = '';
            
            const itemMap = new Map();
            availableParts.forEach(p => {
                if (!itemMap.has(p.item_id)) {
                    itemMap.set(p.item_id, true);
                }
            });
            
            window.woTextToIdMap = new Map();
            availableParts.forEach(p => {
                if (itemMap.get(p.item_id)) {
                    const text = `[${p.item_code}] ${p.item_name}`;
                    window.woTextToIdMap.set(text, p.item_id);
                    const opt = document.createElement('option');
                    opt.value = text;
                    datalist.appendChild(opt);
                    itemMap.set(p.item_id, false); // prevent duplicates
                }
            });

            document.getElementById('woIssueQty').value = '';
            document.getElementById('woIssueNotes').value = '';
            document.getElementById('woIssueLocation').innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
            document.getElementById('woIssueMaxQty').textContent = 'ยอดคงเหลือ: 0';
            document.getElementById('woIssuePrice').value = '';
            document.getElementById('woIssueItemDesc').textContent = '';

            PEApp.showModal('woIssuePartModal');
        } catch (e) {
            PEApp.showToast('ไม่สามารถดึงข้อมูลอะไหล่ได้: ' + e.message, 'error');
        }
    }

    function onSparePartChange() {
        const textValue = document.getElementById('woIssueItemInput').value;
        const itemId = window.woTextToIdMap?.get(textValue) || '';
        document.getElementById('woIssueItem').value = itemId;

        const locSel = document.getElementById('woIssueLocation');
        const maxQty = document.getElementById('woIssueMaxQty');
        const priceInput = document.getElementById('woIssuePrice');
        const descDiv = document.getElementById('woIssueItemDesc');
        
        locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
        
        if (!itemId) {
            maxQty.textContent = 'ยอดคงเหลือ: 0';
            priceInput.value = '';
            descDiv.textContent = '';
            return;
        }

        const parts = availableParts.filter(p => p.item_id == itemId);
        if (parts.length > 0) {
            const p = parts[0];
            const totalQty = parts.reduce((sum, loc) => sum + parseFloat(loc.onhand_qty || 0), 0);
            descDiv.textContent = `สต๊อกคงเหลือรวมทุกคลัง: ${totalQty} ${p.uom || ''}`;
            priceInput.value = parseFloat(p.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2});
            
            parts.forEach(loc => {
                locSel.add(new Option(`${loc.location_name} (คงเหลือ: ${parseFloat(loc.onhand_qty)} ${p.uom || ''})`, loc.location_id));
            });

            // Auto select if only one location
            if (parts.length === 1) {
                locSel.value = parts[0].location_id;
                maxQty.textContent = `ยอดคงเหลือ: ${parseFloat(parts[0].onhand_qty)} ${p.uom}`;
                document.getElementById('woIssueQty').max = parts[0].onhand_qty;
            }

            locSel.onchange = () => {
                const selectedLoc = parts.find(x => x.location_id == locSel.value);
                if (selectedLoc) {
                    maxQty.textContent = `ยอดคงเหลือ: ${parseFloat(selectedLoc.onhand_qty)} ${p.uom}`;
                    document.getElementById('woIssueQty').max = selectedLoc.onhand_qty;
                } else {
                    maxQty.textContent = `ยอดคงเหลือ: 0`;
                }
            };
        }
    }

    async function confirmIssuePart() {
        const woId = document.getElementById('woEditId')?.value;
        const itemId = document.getElementById('woIssueItem').value;
        const locationId = document.getElementById('woIssueLocation').value;
        const qty = parseFloat(document.getElementById('woIssueQty').value);
        const notes = document.getElementById('woIssueNotes').value;

        if (!woId || !itemId || !locationId || !qty || qty <= 0) {
            PEApp.showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
            return;
        }

        // Check stock
        const maxQty = parseFloat(document.getElementById('woIssueQty').max || 0);
        if (qty > maxQty) {
            PEApp.showToast(`จำนวนที่เบิก (${qty}) เกินยอดคงเหลือ (${maxQty})`, 'error');
            return;
        }

        try {
            await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', {
                action: 'issue_parts',
                wo_id: woId,
                parts: [{ item_id: itemId, location_id: locationId, quantity: qty }],
                notes: notes
            });
            
            PEApp.showToast('เบิกอะไหล่เรียบร้อย', 'success');
            PEApp.hideModal('woIssuePartModal');
            
            // Reload table
            loadSpareParts(woId);
            loadData(); // Reload main WO list to update cost if needed
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    async function deleteSparePart(txId) {
        if (!confirm('ยืนยันที่จะลบรายการเบิกอะไหล่นี้และคืนสต๊อก?')) return;

        const woId = document.getElementById('woEditId')?.value;
        if (!woId) return;

        try {
            await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', {
                action: 'delete_wo_part',
                wo_id: woId,
                transaction_id: txId
            });
            
            PEApp.showToast('ลบรายการเบิกเรียบร้อย', 'success');
            
            // Reload table
            loadSpareParts(woId);
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    // --- Helpers for Auto-Calculation & Defaults ---
    function getLocalISO(date = new Date()) {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date - offset).toISOString().substring(0, 16);
    }

    function calcRepairTime() {
        const start = document.getElementById('woFrmStartedAt')?.value;
        const end = document.getElementById('woFrmCompletedAt')?.value;
        if (start && end) {
            const diffMs = new Date(end) - new Date(start);
            if (diffMs >= 0) {
                document.getElementById('woFrmRepairMin').value = Math.floor(diffMs / 60000);
            }
        }
    }

    function getJobSummaryHtml(woId, mainText) {
        const wo = allData.find(w => w.wo_id == woId);
        if (!wo) return mainText;
        
        let imgHtml = '';
        if (wo.image_path) {
            const imgUrl = `../../${wo.image_path}`;
            imgHtml = `<div style="text-align:center; margin-bottom: 10px;">
                <img src="${imgUrl}" alt="Issue Image" style="max-height: 150px; border-radius: 8px; object-fit: cover;">
            </div>`;
        }
        
        return `
            <div style="font-size: 1rem; margin-bottom: 15px;">${mainText}</div>
            <div style="text-align: left; background: #f8f9fa; padding: 10px; border-radius: 8px; font-size: 0.9rem; border: 1px solid #dee2e6;">
                ${imgHtml}
                <strong>ใบงาน:</strong> ${wo.wo_number}<br>
                <strong>เครื่องจักร:</strong> ${wo.machine_display_name || wo.machine_name || '-'}<br>
                <strong>อาการเสีย:</strong> <span style="color: var(--pe-primary);">${PEApp.escapeHtml(wo.issue_title)}</span>
            </div>
        `;
    }

    async function quickAccept(woId) {
        try {
            const result = await Swal.fire({
                title: 'รับงานซ่อม?',
                html: getJobSummaryHtml(woId, "สถานะจะเปลี่ยนเป็น In Progress"),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'รับงาน',
                cancelButtonText: 'ยกเลิก'
            });

            if (result.isConfirmed) {
                await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                    action: 'quick_accept',
                    wo_id: woId
                });
                
                PEApp.showToast('รับงานเรียบร้อย', 'success');
                
                // Hide main modal if open
                const mainModalEl = document.getElementById('workOrderModal');
                const mainModal = bootstrap.Modal.getInstance(mainModalEl);
                if (mainModal) mainModal.hide();

                loadData();
            }
        } catch (error) {
            console.error(error);
            PEApp.showToast(error.message, 'error');
        }
    }

    async function quickStart(woId) {
        try {
            const result = await Swal.fire({
                title: 'เริ่มงานซ่อม?',
                html: getJobSummaryHtml(woId, "สถานะจะเปลี่ยนเป็น In Progress"),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'เริ่มงาน',
                cancelButtonText: 'ยกเลิก'
            });

            if (result.isConfirmed) {
                await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                    action: 'quick_start',
                    wo_id: woId
                });
                
                PEApp.showToast('เริ่มงานเรียบร้อย', 'success');
                
                // Hide main modal if open
                const mainModalEl = document.getElementById('workOrderModal');
                if (mainModalEl) {
                    const mainModal = bootstrap.Modal.getInstance(mainModalEl);
                    if (mainModal) mainModal.hide();
                }

                loadData();
            }
        } catch (error) {
            console.error(error);
            PEApp.showToast(error.message, 'error');
        }
    }

    function openQuickCloseModal(woId) {
        const wo = allData.find(w => w.wo_id == woId);
        if (!wo) return;

        document.getElementById('qcWoId').value = woId;
        document.getElementById('qcFrmAction').value = wo.action_taken || '';
        document.getElementById('qcFrmRootCause').value = wo.root_cause || '';

        if (document.getElementById('qcFrmStartedAt')) {
            document.getElementById('qcFrmStartedAt').value = wo.started_at ? wo.started_at.slice(0, 16) : '';
        }
        if (document.getElementById('qcFrmCompletedAt')) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('qcFrmCompletedAt').value = now.toISOString().slice(0, 16);
        }

        // Reset image
        const imgAfterInput = document.getElementById('qcFrmImageAfter');
        if (imgAfterInput) imgAfterInput.value = '';
        const previewAfterDiv = document.getElementById('qcImageAfterPreview');
        if (previewAfterDiv) previewAfterDiv.style.display = 'none';
        const dropzoneAfter = document.getElementById('qcDropzoneAfter');
        if (dropzoneAfter) dropzoneAfter.classList.remove('has-image');

        croppedImageAfterBlob = null;
        currentCropTarget = null;
        const mainModalEl = document.getElementById('workOrderModal');
        const mainModal = bootstrap.Modal.getInstance(mainModalEl);
        if (mainModal) mainModal.hide();

        const modal = new bootstrap.Modal(document.getElementById('quickCloseModal'));
        modal.show();
    }

    async function submitQuickClose() {
        const woId = document.getElementById('qcWoId').value;
        const actionTaken = document.getElementById('qcFrmAction').value.trim();
        const rootCause = document.getElementById('qcFrmRootCause').value.trim();
        const startedAt = document.getElementById('qcFrmStartedAt')?.value;
        const completedAt = document.getElementById('qcFrmCompletedAt')?.value;
        const btn = document.getElementById('qcSaveBtn');
        const imgInput = document.getElementById('qcFrmImageAfter');

        if (!actionTaken) {
            PEApp.showToast('กรุณาระบุสิ่งที่ดำเนินการแก้ไข', 'warning');
            return;
        }

        if (!croppedImageAfterBlob && (!imgInput || imgInput.files.length === 0)) {
            PEApp.showToast('กรุณาแนบรูปภาพหลังซ่อม (After Image)', 'warning');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

            let photoAfter = null;
            if (croppedImageAfterBlob) {
                const file = new File([croppedImageAfterBlob], "image_after.webp", { type: "image/webp" });
                photoAfter = await PEApp.uploadFile(file, 'WO');
            } else if (imgInput && imgInput.files.length > 0) {
                photoAfter = await PEApp.uploadFile(imgInput.files[0], 'WO');
            }

            await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                action: 'quick_close',
                wo_id: woId,
                photo_after: photoAfter,
                action_taken: actionTaken,
                root_cause: rootCause,
                started_at: startedAt,
                completed_at: completedAt
            });
            
            PEApp.showToast('ปิดงานเรียบร้อย', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickCloseModal'));
            if (modal) modal.hide();
            loadData();
        } catch (error) {
            console.error(error);
            PEApp.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check me-1"></i> ยืนยันการปิดงาน';
        }
    }

    function openFilterModal() {
        const m = new bootstrap.Modal(document.getElementById('woFilterModal'));
        m.show();
    }

    function resetFilters() {
        document.getElementById('woFilterStatus').value = 'Active';
        document.getElementById('woFilterPriority').value = '';
        document.getElementById('woFilterLine').value = '';
        document.getElementById('woDateFilterType').value = 'requested_at';
        document.getElementById('woStartDate').value = '';
        document.getElementById('woEndDate').value = '';
    }

    function setupHelpers() {
        const statusEl = document.getElementById('woFrmStatus');
        const startEl = document.getElementById('woFrmStartedAt');
        const endEl = document.getElementById('woFrmCompletedAt');

        if (startEl && endEl) {
            startEl.addEventListener('change', calcRepairTime);
            endEl.addEventListener('change', calcRepairTime);
        }

        if (statusEl) {
            statusEl.addEventListener('change', (e) => {
                const s = e.target.value;
                if (s === 'In Progress' && startEl && !startEl.value) {
                    startEl.value = getLocalISO();
                } else if (s === 'Completed' && endEl && !endEl.value) {
                    endEl.value = getLocalISO();
                    calcRepairTime();
                }
            });
        }

        // Sync view toggle buttons and container visibility on load
        setView(currentView);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupHelpers);
    } else {
        setupHelpers();
    }

    return { 
        loadData, filterTable, setView, openModal, save, deleteItem, restoreItem, exportExcel, 
        onMachineChange, printPDF, openSparePartsModal, onSparePartChange, confirmIssuePart, deleteSparePart,
        quickAccept, quickStart, openQuickCloseModal, submitQuickClose,
        dragStart, allowDrop, dragEnter, dragLeave, drop,
        openFilterModal, resetFilters
    };
})();

window.WorkOrderModule = WorkOrderModule;
export default WorkOrderModule;
