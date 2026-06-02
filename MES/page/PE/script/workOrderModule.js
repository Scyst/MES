// workOrderModule.js — Work Order Management Module
const WorkOrderModule = (() => {
    let allData = [];
    let machineList = [];
    let currentView = 'table';

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
                        <div class="wo-number">${PEApp.escapeHtml(w.wo_number)}</div>
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
        const techFields = ['woTechSection', 'woAssignedToGroup', 'woStartedAtGroup', 'woCompletedAtGroup', 'woStatusGroup', 'woRepairMinGroup', 'woRootCauseGroup', 'woActionGroup'];
        techFields.forEach(id => { document.getElementById(id).style.display = isEdit ? '' : 'none'; });

        // Reset image
        const imgInput = document.getElementById('woFrmImage');
        if (imgInput) imgInput.value = '';
        const previewDiv = document.getElementById('woImagePreview');
        if (previewDiv) previewDiv.style.display = 'none';

        const deleteBtn = document.getElementById('woDeleteBtn');
        const saveBtn = document.getElementById('woSaveBtn');
        
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
                        previewDiv.style.display = 'block';
                    }
                }
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
            const imgInput = document.getElementById('woFrmImage');
            if (imgInput && imgInput.files.length > 0) {
                imagePath = await PEApp.uploadFile(imgInput.files[0], 'WO');
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

    // Init date defaults
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const startEl = document.getElementById('woStartDate');
        const endEl = document.getElementById('woEndDate');
        if (startEl && !startEl.value) startEl.value = first.toISOString().slice(0, 10);
        if (endEl && !endEl.value) endEl.value = now.toISOString().slice(0, 10);
    });

    return { loadData, filterTable, setView, openModal, save, deleteItem, restoreItem, exportExcel, onMachineChange };
})();
