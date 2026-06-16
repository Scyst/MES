// workOrderModule.js — Work Order Management Module
const WorkOrderModule = (() => {
    let allData = [];
    let machineList = [];
    let currentView = 'table';

    // Cropper State
    let cropper = null;
    let currentCropTarget = null; // 'before' or 'after'
    let croppedImageBlob = null;
    let croppedImageAfterBlob = null;

    async function loadData() {
        try {
            const status = document.getElementById('woFilterStatus')?.value || '';
            const priority = document.getElementById('woFilterPriority')?.value || '';
            const line = document.getElementById('woFilterLine')?.value || '';
            const startDate = document.getElementById('woStartDate')?.value || '';
            const endDate = document.getElementById('woEndDate')?.value || '';

            const res = await PEApp.apiCall('workOrderAPI.php', {
                action: 'get_work_orders', status, priority, line, startDate, endDate
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
        else renderKanban(filtered);
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

            return `
            <tr style="cursor:pointer;" onclick="WorkOrderModule.openModal(${w.wo_id})">
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
                <td class="pe-text-center">
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
        const statuses = ['Open', 'Assigned', 'In Progress', 'Completed'];
        const groups = { Open: [], Assigned: [], 'In Progress': [], Completed: [] };

        data.forEach(w => {
            const g = groups[w.status] || groups['Open'];
            g.push(w);
        });

        statuses.forEach(s => {
            const key = s.replace(/\s+/g, '');
            const container = document.getElementById(`kanban${key}Cards`);
            const countEl = document.getElementById(`kanban${key}Count`);
            if (countEl) countEl.textContent = groups[s].length;

            if (container) {
                container.innerHTML = groups[s].map(w => `
                    <div class="pe-kanban-card" onclick="WorkOrderModule.openModal(${w.wo_id})">
                        <div class="pe-d-flex pe-justify-between pe-align-center pe-mb-8">
                            <div class="wo-number" style="margin-bottom:0;">${PEApp.escapeHtml(w.wo_number)}</div>
                            <button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="event.stopPropagation(); WorkOrderModule.printPDF(${w.wo_id})" title="Print PDF" style="color:var(--pe-primary); padding:2px;">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                        <div class="pe-d-flex pe-gap-8 pe-mb-0" style="margin-bottom:6px;">
                            ${PEApp.getPriorityBadge(w.priority)}
                        </div>
                        <div class="wo-title">${PEApp.escapeHtml(w.issue_title || '-')}</div>
                        <div class="wo-meta">
                            <span><i class="fas fa-cog me-1"></i>${PEApp.escapeHtml(w.machine_code || w.machine_name || '-')}</span>
                            <span>${PEApp.formatDate(w.requested_at)}</span>
                        </div>
                    </div>
                `).join('') || '<div class="pe-text-center pe-text-muted pe-text-xs" style="padding:20px;">No items</div>';
            }
        });
    }

    function setView(view) {
        currentView = view;
        document.getElementById('woViewTable')?.classList.toggle('active', view === 'table');
        document.getElementById('woViewKanban')?.classList.toggle('active', view === 'kanban');
        document.getElementById('woTableView').style.display = view === 'table' ? '' : 'none';
        document.getElementById('woKanbanView').style.display = view === 'kanban' ? '' : 'none';
        renderView();
    }

    async function openModal(editId = null) {
        const isEdit = !!editId;
        document.getElementById('woEditId').value = editId || '';
        document.getElementById('woModalTitle').textContent = isEdit ? 'Edit Work Order' : 'New Work Order';
        
        const isDeleted = editId && allData.find(w => w.wo_id == editId && (w.is_active === 0 || w.is_active === '0'));
        
        document.getElementById('woSaveBtn').innerHTML = isEdit ? '<i class="fas fa-save me-1"></i> Update' : '<i class="fas fa-save me-1"></i> Create Work Order';

        // Reset all fields
        ['woFrmTitle', 'woFrmDetail', 'woFrmLine', 'woFrmAssignedTo', 'woFrmRootCause', 'woFrmAction'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('woFrmType').value = 'Corrective';
        document.getElementById('woFrmPriority').value = 'Normal';
        document.getElementById('woFrmMachine').value = '';
        document.getElementById('woFrmRequestDate').value = '';
        document.getElementById('woFrmRepairMin').value = '';
        document.getElementById('woFrmStartedAt').value = '';
        document.getElementById('woFrmCompletedAt').value = '';
        document.getElementById('woFrmStatus').value = 'Open';

        // Show/hide tech section
        const techFields = ['woTechSection', 'woAssignedToGroup', 'woStartedAtGroup', 'woCompletedAtGroup', 'woStatusGroup', 'woRepairMinGroup', 'woRootCauseGroup', 'woActionGroup', 'woSparePartsGroup', 'woImageAfterGroup'];
        techFields.forEach(id => { document.getElementById(id).style.display = isEdit ? '' : 'none'; });

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
        
        if (printBtn) {
            printBtn.style.display = (isEdit && !isDeleted) ? '' : 'none';
        }
        
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
                        aspectRatio: 4 / 3,
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

        document.getElementById('btnRotateLeft')?.addEventListener('click', () => { if (cropper) cropper.rotate(-90); });
        document.getElementById('btnRotateRight')?.addEventListener('click', () => { if (cropper) cropper.rotate(90); });
        
        document.getElementById('btnCancelCrop')?.addEventListener('click', () => {
            cropModal.hide();
            if (cropper) { cropper.destroy(); cropper = null; }
            if (currentCropTarget === 'before') {
                document.getElementById('woFrmImage').value = '';
                if (!croppedImageBlob) {
                    document.getElementById('woDropzoneBefore').classList.remove('has-image');
                    document.getElementById('woImagePreview').style.display = 'none';
                }
            } else {
                document.getElementById('woFrmImageAfter').value = '';
                if (!croppedImageAfterBlob) {
                    document.getElementById('woDropzoneAfter').classList.remove('has-image');
                    document.getElementById('woImageAfterPreview').style.display = 'none';
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
                } else {
                    croppedImageAfterBlob = blob;
                    document.getElementById('woImageAfterPreview').querySelector('img').src = url;
                    document.getElementById('woImageAfterPreview').style.display = 'flex';
                    document.getElementById('woDropzoneAfter').classList.add('has-image');
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
        if (!sel || !lineInput) return;
        const machine = machineList.find(m => m.machine_id == sel.value);
        if (machine) lineInput.value = machine.line || '';
    }

    // Init date defaults & listeners
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const startEl = document.getElementById('woStartDate');
        const endEl = document.getElementById('woEndDate');
        if (startEl && !startEl.value) startEl.value = first.toISOString().slice(0, 10);
        if (endEl && !endEl.value) endEl.value = now.toISOString().slice(0, 10);

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
            
            const itemSel = document.getElementById('woIssueItem');
            itemSel.innerHTML = '<option value="">-- เลือกอะไหล่ --</option>';
            
            // Group locations by item to easily populate location dropdown
            const uniqueItems = [];
            const itemMap = new Map();
            availableParts.forEach(p => {
                if (!itemMap.has(p.item_id)) {
                    itemMap.set(p.item_id, true);
                    uniqueItems.push(p);
                }
            });
            
            uniqueItems.forEach(p => {
                itemSel.add(new Option(`${p.item_code} - ${p.item_name}`, p.item_id));
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
        const itemId = document.getElementById('woIssueItem').value;
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
            descDiv.textContent = `หน่วย: ${p.uom}`;
            priceInput.value = parseFloat(p.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2});
            
            parts.forEach(loc => {
                locSel.add(new Option(`${loc.location_name} (คงเหลือ: ${parseFloat(loc.onhand_qty)})`, loc.location_id));
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

    return { loadData, filterTable, setView, openModal, save, deleteItem, restoreItem, exportExcel, onMachineChange, printPDF, openSparePartsModal, onSparePartChange, confirmIssuePart, deleteSparePart };
})();
