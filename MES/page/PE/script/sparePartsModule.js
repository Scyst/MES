// sparePartsModule.js — Spare Parts & Inventory Module
const SparePartsModule = (() => {
    let allData = [];

    async function loadData() {
        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_onhand' });
            allData = res.data || [];
            const kpi = res.kpi || {};

            // KPIs
            PEApp.animateValue(document.getElementById('kpiTotalSKU'), 0, kpi.total_sku || 0);
            PEApp.animateValue(document.getElementById('kpiLowStock'), 0, kpi.low_stock || 0);
            const valEl = document.getElementById('kpiTotalValue');
            if (valEl) valEl.textContent = PEApp.formatCurrency(kpi.total_value || 0);

            // Low stock badge
            const badge = document.getElementById('lowStockBadge');
            if (badge) {
                badge.textContent = kpi.low_stock || 0;
                badge.style.display = (kpi.low_stock || 0) > 0 ? '' : 'none';
            }

            // Locations filter
            const locSel = document.getElementById('spFilterLocation');
            if (locSel && locSel.options.length <= 1) {
                (res.locations || []).forEach(l => {
                    locSel.add(new Option(l.location_name, l.location_id));
                });
            }

            document.getElementById('spLastSync').textContent = new Date().toLocaleTimeString('th-TH');
            renderTable();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function filterTable() {
        const q = (document.getElementById('spSearchInput')?.value || '').toLowerCase();
        renderTable(q);
    }

    function renderTable(searchQuery = '') {
        const tbody = document.getElementById('spTableBody');
        if (!tbody) return;
        const locFilter = document.getElementById('spFilterLocation')?.value || '';

        let filtered = allData;
        if (locFilter) filtered = filtered.filter(r => r.location_id == locFilter);
        if (searchQuery) {
            filtered = filtered.filter(r =>
                (r.item_code || '').toLowerCase().includes(searchQuery) ||
                (r.item_name || '').toLowerCase().includes(searchQuery) ||
                (r.description || '').toLowerCase().includes(searchQuery));
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="pe-text-center pe-text-muted" style="padding:60px;">No items found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const isLow = r.min_stock > 0 && r.onhand_qty <= r.min_stock;
            return `
            <tr ${isLow ? 'style="background:var(--pe-danger-light);"' : ''}>
                <td class="pe-fw-bold">${PEApp.escapeHtml(r.item_code)}</td>
                <td>${PEApp.escapeHtml(r.item_name)}</td>
                <td class="pe-text-sm pe-text-muted">${PEApp.escapeHtml(r.description || '-')}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(r.location_name || '-')}</td>
                <td class="pe-text-center pe-text-sm">${PEApp.formatNumber(r.min_stock)} / ${PEApp.formatNumber(r.max_stock)}</td>
                <td class="pe-text-end pe-fw-bold ${isLow ? 'pe-text-danger' : ''}">${PEApp.formatNumber(r.onhand_qty)}</td>
                <td class="pe-text-center pe-text-sm">${PEApp.escapeHtml(r.uom || '-')}</td>
                <td class="pe-text-center">
                    ${isLow ? '<span class="pe-badge pe-priority-high" style="font-size:10px;"><i class="fas fa-exclamation-triangle me-1"></i>Low</span>' : '<span class="pe-badge pe-status-active" style="font-size:10px;">OK</span>'}
                </td>
            </tr>`;
        }).join('');
    }

    async function openReceiveModal() {
        // Redirect to existing system for now
        PEApp.showToast('Opening Receive form from existing system...', 'info');
        window.open('../maintenancePE/maintenanceStockUI.php', '_blank');
    }

    async function openIssueModal() {
        PEApp.showToast('Opening Issue form from existing system...', 'info');
        window.open('../maintenancePE/maintenanceStockUI.php', '_blank');
    }

    function exportExcel() {
        if (!allData.length) { PEApp.showToast('No data', 'warning'); return; }
        if (typeof XLSX === 'undefined') return;

        const ws = XLSX.utils.json_to_sheet(allData.map(r => ({
            'Item Code': r.item_code, 'Item Name': r.item_name, 'Description': r.description,
            'Location': r.location_name, 'Min': r.min_stock, 'Max': r.max_stock,
            'On-Hand': r.onhand_qty, 'Unit': r.uom, 'Unit Price': r.unit_price
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Spare Parts');
        XLSX.writeFile(wb, `SpareParts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    return { loadData, filterTable, openReceiveModal, openIssueModal, exportExcel };
})();
