// downtimeModule.js — Downtime Tracker Module
const DowntimeModule = (() => {
    let allData = [];
    let machineList = [];

    async function loadData() {
        try {
            const line = document.getElementById('dtFilterLine')?.value || '';
            const cause = document.getElementById('dtFilterCause')?.value || '';
            const startDate = document.getElementById('dtStartDate')?.value || '';
            const endDate = document.getElementById('dtEndDate')?.value || '';

            const res = await PEApp.apiCall('downtimeAPI.php', {
                action: 'get_downtime', line, cause_category: cause, startDate, endDate, limit: 100
            });
            allData = res.data || [];

            // KPIs
            const kpi = res.kpi || {};
            const totalEl = document.getElementById('kpiTotalDowntime');
            if (totalEl) totalEl.innerHTML = `${PEApp.formatNumber(kpi.total_downtime || 0)} <span class="unit">min</span>`;
            PEApp.animateValue(document.getElementById('kpiDtEvents'), 0, kpi.total_events || 0);
            const avgEl = document.getElementById('kpiAvgDuration');
            if (avgEl) avgEl.innerHTML = `${Math.round(kpi.avg_duration || 0)} <span class="unit">min</span>`;
            const topEl = document.getElementById('kpiTopCause');
            if (topEl) topEl.textContent = res.top_cause || '-';

            // Line summary
            renderLineSummary(res.line_summary || []);

            // Update showing count
            const showingEl = document.getElementById('dtShowing');
            if (showingEl) showingEl.textContent = allData.length;

            renderTable();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function renderLineSummary(summary) {
        const el = document.getElementById('dtLineSummary');
        if (!el) return;
        if (!summary.length) { el.innerHTML = '<span class="pe-text-muted">No downtime data</span>'; return; }

        const totalMin = summary.reduce((s, r) => s + (r.total_minutes || 0), 0);
        el.innerHTML = summary.map(r => {
            const pct = totalMin > 0 ? Math.round((r.total_minutes / totalMin) * 100) : 0;
            return `<span class="pe-badge pe-badge-open me-2 mb-1">${PEApp.escapeHtml(r.line || 'N/A')}: ${r.event_count} events, ${PEApp.formatNumber(r.total_minutes)} min (${pct}%)</span>`;
        }).join('') + `<span class="pe-fw-bold ms-2">Total: ${PEApp.formatNumber(totalMin)} min</span>`;
    }

    function filterTable() {
        const q = (document.getElementById('dtSearchInput')?.value || '').toLowerCase();
        renderTable(q);
    }

    function renderTable(searchQuery = '') {
        const tbody = document.getElementById('dtTableBody');
        if (!tbody) return;

        const filtered = searchQuery
            ? allData.filter(d =>
                (d.machine_name || '').toLowerCase().includes(searchQuery) ||
                (d.machine_code || '').toLowerCase().includes(searchQuery) ||
                (d.cause_detail || '').toLowerCase().includes(searchQuery) ||
                (d.cause_category || '').toLowerCase().includes(searchQuery) ||
                (d.notes || '').toLowerCase().includes(searchQuery))
            : allData;

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="10" class="pe-text-center pe-text-muted" style="padding:60px;">No downtime records found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(d => {
            const catColor = getCauseColor(d.cause_category);
            return `
            <tr>
                <td class="pe-text-sm">${PEApp.formatDate(d.log_date)}</td>
                <td class="pe-text-sm">${PEApp.formatTime(d.start_time)}</td>
                <td class="pe-text-sm">
                    ${d.end_time ? PEApp.formatTime(d.end_time) : '<span class="pe-badge pe-badge-danger pe-animate-pulse" style="animation: pulse-red 1.5s infinite;"><div class="dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:4px;"></div>Ongoing</span>'}
                </td>
                <td class="pe-fw-bold" style="color:var(--pe-warning);">${d.end_time ? (d.duration_min || 0) + ' min' : '-'}</td>
                <td>${PEApp.escapeHtml(d.line || '-')}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(d.machine_code || d.machine_name || '-')}</td>
                <td><span class="pe-badge" style="background:${catColor.bg};color:${catColor.text};">${PEApp.escapeHtml(d.cause_category || '-')}</span></td>
                <td class="pe-text-sm" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${PEApp.escapeHtml(d.cause_detail || '-')}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(d.recovered_by || '-')}</td>
                <td class="pe-text-center">
                    <div class="pe-d-flex pe-gap-8 justify-content-center">
                        <button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="DowntimeModule.editRow(${d.downtime_id})" title="Edit"><i class="fas fa-pen"></i></button>
                        ${PE_CONFIG.canManage ? `<button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="DowntimeModule.deleteRow(${d.downtime_id})" title="Delete" style="color:var(--pe-danger);"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function getCauseColor(cat) {
        const map = {
            'Mechanical': { bg: 'var(--pe-danger-light)', text: 'var(--pe-danger)' },
            'Electrical': { bg: 'var(--pe-warning-light)', text: '#b45309' },
            'Tooling':    { bg: '#ede9fe', text: '#7c3aed' },
            'Quality':    { bg: 'var(--pe-info-light)', text: 'var(--pe-info)' },
            'Material':   { bg: '#fef3c7', text: '#92400e' },
            'Operator':   { bg: 'var(--pe-primary-light)', text: 'var(--pe-primary)' },
            'Planned':    { bg: 'var(--pe-success-light)', text: 'var(--pe-success)' }
        };
        return map[cat] || { bg: '#f1f5f9', text: '#64748b' };
    }

    async function openModal(editId = null) {
        document.getElementById('dtEditId').value = editId || '';
        document.getElementById('dtModalTitle').textContent = editId ? 'Edit Downtime' : 'Record Downtime';
        document.getElementById('dtSaveBtn').innerHTML = editId
            ? '<i class="fas fa-save me-1"></i> Update'
            : '<i class="fas fa-save me-1"></i> Save Downtime';

        // Reset
        ['dtFrmLine', 'dtFrmCauseDetail', 'dtFrmRecoveredBy', 'dtFrmNotes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('dtFrmMachine').value = '';
        document.getElementById('dtFrmDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('dtFrmStartTime').value = '';
        document.getElementById('dtFrmEndTime').value = '';
        document.getElementById('dtFrmCauseCategory').value = '';
        document.getElementById('dtFrmCreateWO').checked = false;
        document.getElementById('dtCalcDuration').textContent = '0 min';

        // Load machines
        await loadMachineDropdown();

        PEApp.showModal('downtimeModal');
    }

    async function editRow(id) {
        const row = allData.find(d => d.downtime_id == id);
        if (!row) return;

        await openModal(id);

        document.getElementById('dtFrmMachine').value = row.machine_id || '';
        document.getElementById('dtFrmLine').value = row.line || '';
        document.getElementById('dtFrmDate').value = row.log_date ? row.log_date.substring(0, 10) : '';
        document.getElementById('dtFrmStartTime').value = row.start_time ? new Date(row.start_time).toTimeString().substring(0, 5) : '';
        document.getElementById('dtFrmEndTime').value = row.end_time ? new Date(row.end_time).toTimeString().substring(0, 5) : '';
        document.getElementById('dtFrmCauseCategory').value = row.cause_category || '';
        document.getElementById('dtFrmCauseDetail').value = row.cause_detail || '';
        document.getElementById('dtFrmRecoveredBy').value = row.recovered_by || '';
        document.getElementById('dtFrmNotes').value = row.notes || '';

        calcDuration();
    }

    async function deleteRow(id) {
        const result = await PEApp.showConfirm('Delete Downtime?', 'This action cannot be undone.');
        if (!result.isConfirmed) return;

        try {
            await PEApp.apiCall('downtimeAPI.php', {}, 'POST', { action: 'delete_downtime', downtime_id: id });
            PEApp.showToast('ลบข้อมูลเรียบร้อย', 'success');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    async function loadMachineDropdown() {
        try {
            const res = await PEApp.apiCall('workOrderAPI.php', { action: 'get_machines_list' });
            machineList = res.data || [];
            const sel = document.getElementById('dtFrmMachine');
            if (!sel) return;
            const currentVal = sel.value;
            while (sel.options.length > 1) sel.options.remove(1);
            machineList.forEach(m => {
                sel.add(new Option(`${m.machine_code} — ${m.machine_name}`, m.machine_id, false, m.machine_id == currentVal));
            });
        } catch (e) { /* silent */ }
    }

    function onMachineChange() {
        const sel = document.getElementById('dtFrmMachine');
        const lineInput = document.getElementById('dtFrmLine');
        if (!sel || !lineInput) return;

        const machine = machineList.find(m => m.machine_id == sel.value);
        if (machine) lineInput.value = machine.line || '';
    }

    function onCauseChange() {
        const cat = document.getElementById('dtFrmCauseCategory')?.value;
        const cb = document.getElementById('dtFrmCreateWO');
        if (cb && (cat === 'Mechanical' || cat === 'Electrical')) {
            cb.checked = true;
        }
    }

    function calcDuration() {
        const start = document.getElementById('dtFrmStartTime')?.value;
        const end = document.getElementById('dtFrmEndTime')?.value;
        const el = document.getElementById('dtCalcDuration');
        if (!start || !end || !el) return;

        let startMin = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
        let endMin = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
        if (endMin < startMin) endMin += 1440; // Overnight

        const duration = endMin - startMin;
        el.textContent = `${duration} min (${(duration / 60).toFixed(1)} hrs)`;
    }

    async function save() {
        const causeCategory = document.getElementById('dtFrmCauseCategory')?.value;
        const causeDetail = document.getElementById('dtFrmCauseDetail')?.value?.trim();
        const date = document.getElementById('dtFrmDate')?.value;
        const startTime = document.getElementById('dtFrmStartTime')?.value;
        const endTime = document.getElementById('dtFrmEndTime')?.value;

        if (!date || !startTime || !causeCategory || !causeDetail) {
            PEApp.showToast('กรุณากรอกข้อมูลให้ครบ (Date, Start Time, Cause Category, Cause Detail)', 'warning');
            return;
        }

        const btn = document.getElementById('dtSaveBtn');
        btn.disabled = true;

        const editId = document.getElementById('dtEditId')?.value;
        const machineId = document.getElementById('dtFrmMachine')?.value;
        const machine = machineList.find(m => m.machine_id == machineId);

        try {
            const payload = {
                action: editId ? 'update_downtime' : 'add_downtime',
                machine_id: machineId || null,
                machine_name: machine ? machine.machine_name : '',
                line: document.getElementById('dtFrmLine')?.value || '',
                log_date: date,
                start_time: startTime,
                end_time: endTime,
                cause_category: causeCategory,
                cause_detail: causeDetail,
                recovered_by: document.getElementById('dtFrmRecoveredBy')?.value || '',
                notes: document.getElementById('dtFrmNotes')?.value || '',
                create_wo: document.getElementById('dtFrmCreateWO')?.checked || false
            };
            if (editId) payload.downtime_id = editId;

            await PEApp.apiCall('downtimeAPI.php', {}, 'POST', payload);
            PEApp.showToast(editId ? 'อัปเดตเรียบร้อย' : 'บันทึก Downtime เรียบร้อย', 'success');
            
            if (payload.create_wo && typeof PEApp.loadedTabs !== 'undefined') {
                PEApp.loadedTabs.delete('workorders');
            }
            
            PEApp.hideModal('downtimeModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function exportExcel() {
        if (!allData.length) { PEApp.showToast('No data', 'warning'); return; }
        if (typeof XLSX === 'undefined') return;

        const ws = XLSX.utils.json_to_sheet(allData.map(d => ({
            'Date': d.log_date, 'Start': d.start_time, 'End': d.end_time,
            'Duration (min)': d.duration_min, 'Line': d.line, 'Machine': d.machine_name || '',
            'Category': d.cause_category, 'Cause': d.cause_detail,
            'Recovered By': d.recovered_by, 'Notes': d.notes
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Downtime');
        XLSX.writeFile(wb, `Downtime_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        const startEl = document.getElementById('dtStartDate');
        const endEl = document.getElementById('dtEndDate');
        if (startEl && !startEl.value) startEl.value = now.toISOString().slice(0, 10);
        if (endEl && !endEl.value) endEl.value = now.toISOString().slice(0, 10);
    });

    return { loadData, filterTable, openModal, editRow, deleteRow, save, exportExcel, onMachineChange, onCauseChange, calcDuration };
})();
