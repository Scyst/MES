// MES/page/storeManagement/script/tagHistoryTest.js

document.addEventListener('DOMContentLoaded', () => {
    const traceForm = document.getElementById('traceForm');
    const serialNoInput = document.getElementById('serialNoInput');
    const btnSearch = document.getElementById('btnSearch');
    const errorAlert = document.getElementById('errorAlert');
    const btnClear = document.getElementById('btnClear');
    
    // Modal & Loading
    const traceTagModalEl = document.getElementById('traceTagModal');
    let traceTagModal;
    if (traceTagModalEl) {
        traceTagModal = new bootstrap.Modal(traceTagModalEl);
    }

    // Recent Tags Elements
    const recentTagsTableBody = document.getElementById('recentTagsTableBody');
    
    // Daily KPI Elements
    const kpiTotal = document.getElementById('kpiTotal');
    const kpiReceive = document.getElementById('kpiReceive');
    const kpiIssue = document.getElementById('kpiIssue');
    const kpiWip = document.getElementById('kpiWip');
    const kpiReturn = document.getElementById('kpiReturn');

    // UI Elements for Tag Info (in Modal)
    const lblSerialNo = document.getElementById('lblSerialNo');
    const lblItemNo = document.getElementById('lblItemNo');
    const lblPartDesc = document.getElementById('lblPartDesc');
    const lblStatus = document.getElementById('lblStatus');
    const lblQty = document.getElementById('lblQty');
    const lblPo = document.getElementById('lblPo');
    const lblLocation = document.getElementById('lblLocation');
    const historyTableBody = document.getElementById('historyTableBody');

    // Initialize Page Data
    loadDashboardKpis();
    loadRecentTags();

    traceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const barcode = serialNoInput.value.trim();
        if (!barcode) return;

        // Reset UI
        errorAlert.classList.add('d-none');
        
        // Show loading state in button
        const originalBtnHtml = btnSearch.innerHTML;
        btnSearch.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        btnSearch.disabled = true;
        serialNoInput.disabled = true;

        try {
            const res = await fetchAPI(`trace_tag_v2&serial_no=${encodeURIComponent(barcode)}`, 'GET');
            
            if (!res) return; // Error already handled by fetchAPI
            
            if (res.success && res.data) {
                renderTagInfo(res.data.tag_info);
                renderTimeline(res.data.history);
                if (traceTagModal) traceTagModal.show();
            } else {
                showError(res.message || 'ไม่พบข้อมูลสำหรับ Barcode นี้');
            }
        } catch (error) {
            console.error(error);
            showError(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            // Restore button state
            btnSearch.innerHTML = originalBtnHtml;
            btnSearch.disabled = false;
            serialNoInput.disabled = false;
            serialNoInput.focus();
        }
    });

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            serialNoInput.value = '';
            serialNoInput.focus();
            errorAlert.classList.add('d-none');
        });
    }

    // Global function to trigger search from table row click
    window.searchForTag = function(barcode) {
        serialNoInput.value = barcode;
        traceForm.dispatchEvent(new Event('submit'));
    };

    async function loadDashboardKpis() {
        if (!kpiTotal) return;
        try {
            const res = await fetchAPI('get_trace_dashboard_kpis', 'GET');
            if (res && res.success && res.data) {
                kpiTotal.textContent = res.data.total.toLocaleString();
                kpiReceive.textContent = res.data.receive.toLocaleString();
                kpiIssue.textContent = res.data.issue.toLocaleString();
                kpiWip.textContent = res.data.wip.toLocaleString();
                kpiReturn.textContent = res.data.return_adjust.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading dashboard KPIs:', error);
        }
    }

    async function loadRecentTags() {
        if (!recentTagsTableBody) return;
        
        try {
            const res = await fetchAPI('get_recent_active_tags', 'GET');
            if (!res || !res.success || !res.data) {
                recentTagsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">ไม่สามารถโหลดข้อมูลได้</td></tr>';
                return;
            }
            
            const tags = res.data;
            
            if (tags.length === 0) {
                recentTagsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ไม่มีประวัติการเคลื่อนไหวล่าสุด</td></tr>';
                return;
            }
            
            recentTagsTableBody.innerHTML = '';
            tags.forEach(tag => {
                const qtyStr = tag.quantity_changed ? Math.abs(parseFloat(tag.quantity_changed)).toLocaleString() : '-';
                const isOut = parseFloat(tag.quantity_changed || 0) < 0 || (tag.transaction_type && tag.transaction_type.includes('ISSUE'));
                const qtyBadge = qtyStr !== '-' ? `<span class="fw-bold ${isOut ? 'text-danger' : 'text-success'}">${isOut ? '-' : '+'}${qtyStr}</span>` : '-';
                
                let statusClass = 'bg-secondary';
                if (tag.status === 'WIP') statusClass = 'bg-warning text-dark';
                else if (tag.status === 'RM') statusClass = 'bg-success';
                
                const typeLabel = formatTransactionType(tag.transaction_type);
                const desc = tag.part_description || '-';
                const dateStr = tag.transaction_date || '-';
                
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.onclick = () => searchForTag(tag.serial_no);
                tr.innerHTML = `
                    <td class="text-muted small">${dateStr}</td>
                    <td><span class="text-primary fw-bold text-decoration-underline">${tag.serial_no || '-'}</span></td>
                    <td><div class="text-wrap" style="max-width: 250px;"><small class="fw-bold">${tag.part_no || '-'}</small><br><span class="text-muted" style="font-size: 0.75rem;">${desc}</span></div></td>
                    <td class="text-center"><span class="badge ${isOut ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}">${typeLabel}</span></td>
                    <td class="text-end">${qtyBadge}</td>
                    <td class="text-center"><span class="badge ${statusClass}">${tag.status || '-'}</span></td>
                    <td class="text-muted small"><i class="fas fa-map-marker-alt text-danger me-1"></i>${tag.location || '-'}</td>
                    <td><span class="text-muted small"><i class="fas fa-user-circle me-1"></i>${tag.actor_name || '-'}</span></td>
                `;
                recentTagsTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error loading recent tags:', error);
            recentTagsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
        }
    }

    function renderTagInfo(info) {
        if (!lblSerialNo) return;
        lblSerialNo.textContent = info.serial_no || '-';
        lblItemNo.textContent   = info.item_no || '-';
        lblPartDesc.textContent = info.part_description || '-';
        lblQty.textContent      = (info.current_qty ? parseFloat(info.current_qty).toLocaleString() : '0') + ' pcs';
        lblPo.textContent       = info.po_number || '-';
        if (lblLocation) lblLocation.textContent = info.location_name || info.warehouse_no || '-';

        // Status: simple colored text
        const statusColors = { 'WIP': '#f59e0b', 'RM': '#10b981', 'AVAILABLE': '#10b981' };
        const color = statusColors[info.status] || '#6b7280';
        lblStatus.innerHTML = `<span style="color:${color}; font-weight:700;">${info.status || '-'}</span>`;
    }

    function renderTimeline(history) {
        if (!historyTableBody) return;
        historyTableBody.innerHTML = '';
        
        if (!history || history.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ไม่พบประวัติการทำรายการ</td></tr>';
            return;
        }

        history.forEach((item, index) => {
            const isOut = item.quantity_changed < 0 || item.transaction_type.includes('ISSUE');
            
            const qtyText = Math.abs(parseFloat(item.quantity_changed || 0)).toLocaleString();
            const qtyIn = !isOut ? `<span class="text-success fw-bold">+${qtyText}</span>` : '-';
            const qtyOut = isOut ? `<span class="text-danger fw-bold">-${qtyText}</span>` : '-';
            
            const dateStr = item.transaction_timestamp ? formatDateTime(item.transaction_timestamp) : '-';
            const typeLabel = formatTransactionType(item.transaction_type);
            const typeBadge = `<span class="badge ${isOut ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} w-100 py-2">${typeLabel}</span>`;

            let locHtml = '';
            if (item.from_loc && item.to_loc) {
                locHtml = `<div class="mb-1"><small class="text-muted">${escapeHTML(item.from_loc)} <i class="fas fa-arrow-right mx-1"></i> ${escapeHTML(item.to_loc)}</small></div>`;
            } else if (item.to_loc) {
                locHtml = `<div class="mb-1"><small class="text-muted"><i class="fas fa-map-marker-alt text-danger me-1"></i>${escapeHTML(item.to_loc)}</small></div>`;
            } else if (item.from_loc) {
                locHtml = `<div class="mb-1"><small class="text-muted"><i class="fas fa-map-marker-alt text-danger me-1"></i>${escapeHTML(item.from_loc)} (ออก)</small></div>`;
            }
            
            let refHtml = item.reference_id ? `<div><span class="badge bg-secondary">${escapeHTML(item.reference_id)}</span></div>` : '';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center text-muted">${index + 1}</td>
                <td>${dateStr}</td>
                <td class="text-center">${typeBadge}</td>
                <td class="text-end" style="background-color: rgba(25, 135, 84, 0.05);">${qtyIn}</td>
                <td class="text-end" style="background-color: rgba(220, 53, 69, 0.05);">${qtyOut}</td>
                <td>${locHtml}${refHtml || (locHtml ? '' : '-')}</td>
                <td><div class="text-wrap" style="min-width: 200px; max-width: 400px; word-break: break-word;">${item.notes || '-'}</div></td>
                <td><span class="text-muted"><i class="fas fa-user-circle me-1"></i>${item.actor_name || '-'}</span></td>
            `;
            historyTableBody.appendChild(tr);
        });
    }

    function formatDateTime(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + 
               d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    function formatTransactionType(type) {
        const map = {
            'RECEIVE_RM': 'รับเข้า (Receive)',
            'RECEIVE_WIP': 'รับเข้า (Receive to WIP)',
            'ISSUE_STORE': 'ตัดจ่าย (Issue from Store)',
            'ISSUE_PARTIAL': 'ตัดจ่ายบางส่วน (Partial Issue)',
            'ISSUE_FULL': 'ตัดจ่ายทั้งหมด (Full Issue)',
            'FORCE_ISSUE': 'ตัดจ่าย (Force Issue)',
            'CONSUMPTION': 'ใช้งาน (Consume)'
        };
        return map[type] || type;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showError(msg) {
        if (!errorAlert) return;
        const msgSpan = errorAlert.querySelector('#errorMessage') || errorAlert;
        // Support multi-line messages (\n becomes <br>)
        msgSpan.innerHTML = (msg || '').replace(/\n/g, '<br>');
        errorAlert.classList.remove('d-none');
    }
});
