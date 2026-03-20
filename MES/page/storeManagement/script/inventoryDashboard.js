"use strict";

let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let issueModal;
let detailsModalInstance;
let searchTimer;
let cycleCountModal;
let approvalModal;
let ccHistoryModal;

// =================================================================
// 1. CORE UTILITY: ฟังก์ชันกลางสำหรับเรียก API (มี Loading & CSRF)
// =================================================================
async function fetchAPI(action, method = 'GET', bodyData = null, buttonId = null) {
    let btn = null;
    let originalHtml = '';
    
    // Operator Proofing: ล็อกปุ่มทันที
    if (buttonId) {
        btn = document.getElementById(buttonId);
        if (btn) {
            if (btn.disabled) return null; 
            originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    }

    try {
        const url = `api/api_store.php?action=${action}`;
        const options = { method: method };

        if (method === 'POST') {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
            
            if (bodyData instanceof FormData) {
                bodyData.append('csrf_token', csrfToken);
                options.body = bodyData;
            } else {
                bodyData = bodyData || {};
                bodyData.csrf_token = csrfToken;
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(bodyData);
            }
        }

        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || `HTTP Error: ${response.status}`);
        }
        return result;
        
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
        throw error;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

// =================================================================
// 2. INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Init Modals
    const issueModalEl = document.getElementById('issueModal');
    if (issueModalEl) issueModal = new bootstrap.Modal(issueModalEl);

    const detailsModalEl = document.getElementById('detailsModal');
    if (detailsModalEl) detailsModalInstance = new bootstrap.Modal(detailsModalEl);

    // Load Data
    loadLocations();
    loadDashboardData();

    // ผูก Event Listeners ให้ Filters
    document.getElementById('locationFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('materialFilter')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    document.getElementById('hideZeroStock')?.addEventListener('change', () => { currentPage = 1; loadDashboardData(); });
    
    // ผูก Event ให้ช่อง Search (ใช้ Debounce ป้องกันยิง API รัวๆ)
    document.getElementById('filterSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1; 
            loadDashboardData();
        }, 500);
    });

    // ตรวจจับการกด Enter ในช่องสแกนเบิกของ
    document.getElementById('issueBarcode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchPalletTags();
        }
    });
    const historyModalEl = document.getElementById('ccHistoryModal');
    if (historyModalEl) ccHistoryModal = new bootstrap.Modal(historyModalEl);
});

async function openCcHistoryModal() {
    ccHistoryModal.show();
    const tbody = document.getElementById('ccHistoryTbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-info"></i></td></tr>';
    
    try {
        const res = await fetchAPI('get_cycle_count_history', 'GET');
        tbody.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">ยังไม่มีประวัติการปรับยอด</td></tr>';
            return;
        }

        res.data.forEach(row => {
            const diff = parseFloat(row.diff_qty);
            const diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
            const diffSign = diff > 0 ? '+' : '';
            
            const badge = row.status === 'APPROVED' 
                ? '<span class="badge bg-success">APPROVED</span>' 
                : '<span class="badge bg-danger">REJECTED</span>';

            const timeStr = row.approved_at ? row.approved_at.substring(0, 16) : '-';

            const tr = `
                <tr>
                    <td class="text-muted small">${timeStr}</td>
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${row.item_no}</td>
                    <td>${escapeHTML(row.location_name)}</td>
                    <td class="text-end fw-bold text-secondary">${parseFloat(row.system_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold text-dark">${parseFloat(row.actual_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</td>
                    <td class="text-center">${badge}</td>
                    <td class="small">
                        <div><span class="text-muted">นับ:</span> ${escapeHTML(row.counter_name)}</div>
                        <div><span class="text-muted">อนุมัติ:</span> <span class="fw-bold">${escapeHTML(row.approver_name)}</span></div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดประวัติ</td></tr>';
    }
}

// =================================================================
// 3. MASTER DATA & DASHBOARD
// =================================================================
async function loadLocations() {
    try {
        const result = await fetchAPI('get_master_data', 'GET');
        const filterSelect = document.getElementById('locationFilter');
        const issueSelect = document.getElementById('issueToLocation');
        
        if (issueSelect) issueSelect.innerHTML = '';
        if (filterSelect) filterSelect.innerHTML = '<option value="ALL">All Locations</option>';
        
        result.data.locations.forEach(loc => {
            if (filterSelect) filterSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
            if (issueSelect) issueSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
        });
    } catch (err) {
        console.error("Failed to load master data:", err);
    }
}

async function loadDashboardData() {
    const locId = document.getElementById('locationFilter')?.value || 'ALL';
    const matType = document.getElementById('materialFilter')?.value || 'ALL';
    const hideZero = document.getElementById('hideZeroStock')?.checked || false;
    const searchStr = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');

    const tbody = document.getElementById('dashboardTbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>';

    try {
        const queryParams = `get_inventory_dashboard&location_id=${locId}&material_type=${matType}&hide_zero=${hideZero}&search=${searchStr}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');

        // Render KPI Header
        if (result.kpi) {
            document.getElementById('totalSkus').innerText = result.kpi.total_skus.toLocaleString();
            document.getElementById('outOfStock').innerText = result.kpi.out_of_stock.toLocaleString();
            document.getElementById('totalPending').innerText = parseFloat(result.kpi.total_pending_qty).toLocaleString();
            document.getElementById('totalValue').innerText = parseFloat(result.kpi.total_value).toLocaleString(undefined, {minimumFractionDigits: 2});
        }

        // Render Table
        tbody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ไม่พบข้อมูลสินค้าคงคลัง</td></tr>';
            return;
        }

        result.data.forEach((row, index) => {
            const availableQty = parseFloat(row.available_qty);
            const tr = document.createElement('tr');
            if (availableQty <= 0) tr.className = 'row-out-of-stock';
            
            const runningNumber = ((currentPage - 1) * rowsPerPage) + index + 1;

            // แทรก HTML สำหรับตารางที่มี 10 คอลัมน์ตามหน้า UI ใหม่
            tr.innerHTML = `
                <td>${runningNumber}</td>
                <td class="fw-bold text-primary">${row.item_no}</td>
                <td class="text-truncate" style="max-width: 250px;" title="${row.part_description || '-'}">${row.part_description || '-'}</td>
                <td><span class="badge bg-secondary">${row.material_type}</span></td>
                <td class="text-end text-warning fw-bold">${parseFloat(row.pending_qty).toLocaleString()}</td>
                <td class="text-end fw-bold text-success">${availableQty.toLocaleString()}</td>
                <td class="text-end fw-bold">${parseFloat(row.total_qty).toLocaleString()}</td>
                <td class="text-end text-muted">${parseFloat(row.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-end text-primary fw-bold">${parseFloat(row.total_value).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-center">
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-light border text-secondary" onclick="showItemDetails(${row.item_id}, '${row.item_no}', '${escapeHTML(row.part_description)}')" title="ดูพิกัดสต็อก">
                            <i class="fas fa-search-location"></i>
                        </button>
                        <button class="btn btn-sm btn-light border text-warning" onclick="openCycleCountModal(${row.item_id}, '${row.item_no}', '${escapeHTML(row.part_description)}')" title="นับ/ปรับสต็อก">
                            <i class="fas fa-clipboard-list"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Render Pagination
        if (result.pagination) {
            totalPages = result.pagination.total_pages || 1;
            const pageInfo = document.getElementById('pageInfo');
            const btnPrev = document.getElementById('btnPrevPage');
            const btnNext = document.getElementById('btnNextPage');
            
            if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
            if (btnPrev) btnPrev.disabled = currentPage <= 1;
            if (btnNext) btnNext.disabled = currentPage >= totalPages;
        }

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> โหลดข้อมูลล้มเหลว</td></tr>';
    }
}

function changePage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    loadDashboardData();
}

// =================================================================
// 4. ISSUE & PRINT (ระบบเบิกจ่าย และ พิมพ์สติ๊กเกอร์)
// =================================================================
async function fetchPalletTags() {
    const inputEl = document.getElementById('issueBarcode');
    const barcode = inputEl.value.trim();
    if (!barcode) return;

    try {
        const result = await fetchAPI(`get_pallet_tags&barcode=${encodeURIComponent(barcode)}`, 'GET');
        const tbody = document.getElementById('issueTagsTbody');
        if (result.data && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(tag => {
                const isWIP = (tag.status !== 'AVAILABLE' && tag.status);
                const rowHtml = `
                    <tr class="${isWIP ? 'table-warning' : ''}">
                        <td class="text-center">
                            <input class="form-check-input tag-checkbox" type="checkbox" value="${tag.serial_no}" ${isWIP ? 'disabled' : 'checked'}>
                        </td>
                        <td>${tag.serial_no} ${isWIP ? '<span class="badge bg-warning text-dark">WIP</span>' : ''}</td>
                        <td>${tag.part_no}</td>
                        <td class="text-end fw-bold">${parseFloat(tag.qty).toLocaleString()}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', rowHtml);
            });
            document.getElementById('btnSubmitIssue').disabled = false;
            updateSelectedCount();
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">ไม่พบข้อมูล หรือวัตถุดิบถูกเบิกไปแล้ว</td></tr>`;
            document.getElementById('btnSubmitIssue').disabled = true;
            updateSelectedCount();
        }
    } catch (error) {
    } finally {
        inputEl.value = '';
        inputEl.focus();
    }
}

function toggleAllTags(source) {
    const checkboxes = document.querySelectorAll('.tag-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function submitSpecificIssue(ignoreFifo = false) {
    const selectedCheckboxes = document.querySelectorAll('.tag-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    const serials = Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
    const toLocation = document.getElementById('issueToLocation').value;

    const formData = new FormData();
    formData.append('serials', serials);
    formData.append('to_location', toLocation);
    
    if (ignoreFifo) formData.append('ignore_fifo', 'true');

    const result = await fetchAPI('issue_selected_tags', 'POST', formData, 'btnSubmitIssue');
    
    if (result) {
        if (result.require_fifo_confirm) {
            Swal.fire({
                title: '⚠️ แจ้งเตือน FIFO',
                text: result.message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันจ่ายแท็กนี้ (ข้าม FIFO)',
                cancelButtonText: 'ยกเลิก (ไปหยิบแท็กเก่า)'
            }).then((confirmRes) => {
                if (confirmRes.isConfirmed) {
                    submitSpecificIssue(true); 
                }
            });
            return;
        }
        Swal.fire('สำเร็จ', `เบิกจ่ายสำเร็จ ${result.issued_count} รายการ`, 'success').then(() => {
            issueModal.hide();
            loadDashboardData(); 
            if(result.issued_tags && result.issued_tags.length > 0) {
                printIssueTags(result.issued_tags);
            }
        });
    }
}

function printIssueTags(tagsArray) {
    try {
        const printArea = document.getElementById('printArea');
        if (!printArea) return;

        printArea.innerHTML = '';
        printArea.classList.remove('d-none');

        tagsArray.forEach((tag, index) => {
            const qrId = "qr-code-" + index;
            const html = `
                <div class="tag-print-wrapper" style="page-break-after: always; display: flex; flex-direction: column; justify-content: center; height: 100vh;">
                    <div class="tag-print-container" style="border: 2px solid #000; padding: 10px; width: 100%; display: flex; font-family: sans-serif; position: relative;">
                        <div class="tag-print-info" style="width: 70%; padding-right: 10px;">
                            <div style="font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; margin-bottom: 5px; padding-bottom: 5px;">
                                SNC FORMER PCL. <br><small>WIP MATERIAL TAG</small>
                            </div>
                            <b>Item:</b> <span style="font-size: 16px; font-weight: bold;">${tag.item_no || tag.part_no}</span><br>
                            <b style="font-size: 10px;">Desc:</b> <span style="font-size: 10px;">${tag.part_description}</span><br>
                            <b>QTY:</b> <span style="font-size: 16px; font-weight: bold;">${parseFloat(tag.qty).toLocaleString()}</span><br>
                            <b>Date:</b> ${tag.received_date ? tag.received_date.split(' ')[0] : '-'}
                        </div>
                        <div class="tag-print-qr" style="width: 30%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <div id="${qrId}"></div>
                            <div style="font-size: 10px; margin-top: 5px; font-weight: bold;">${tag.serial_no}</div>
                        </div>
                    </div>
                </div>
            `;
            printArea.innerHTML += html;
        });
        
        // Render QR Code (Requires qrcode.min.js loaded in PHP)
        if (typeof QRCode !== 'undefined') {
            tagsArray.forEach((tag, index) => {
                new QRCode(document.getElementById('qr-code-' + index), {
                    text: tag.serial_no,
                    width: 70, height: 70,
                    colorDark : "#000000", colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.M 
                });
            });
        }
        
        // สั่ง Print
        setTimeout(() => {
            window.print();
            printArea.classList.add('d-none');
            printArea.innerHTML = ''; 
        }, 500);

    } catch(err) {
        console.error("Print Error:", err);
        Swal.fire('Print Error', 'ไม่สามารถสร้างสติ๊กเกอร์ได้', 'error');
    }
}

// =================================================================
// 5. VIEW ITEM DETAILS (เปิด Modal ดูพิกัด)
// =================================================================
async function showItemDetails(itemId, itemNo, itemDesc) {
    document.getElementById('modalItemNo').innerText = itemNo;
    document.getElementById('modalItemDesc').innerText = itemDesc || '-';
    
    const availTbody = document.getElementById('modalAvailTbody');
    const pendTbody = document.getElementById('modalPendTbody');
    
    availTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    pendTbody.innerHTML = '<tr><td colspan="2" class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    detailsModalInstance.show();

    try {
        const res = await fetchAPI(`get_item_details&item_id=${itemId}`, 'GET');
        
        availTbody.innerHTML = '';
        if (res.available_details && res.available_details.length > 0) {
            res.available_details.forEach(loc => {
                availTbody.innerHTML += `<tr><td>${escapeHTML(loc.location_name)}</td><td class="text-end fw-bold text-success">${parseFloat(loc.qty).toLocaleString()}</td></tr>`;
            });
        } else {
            availTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">ไม่มีของในคลัง</td></tr>';
        }

        pendTbody.innerHTML = '';
        if (res.pending_details && res.pending_details.length > 0) {
            res.pending_details.forEach(p => {
                pendTbody.innerHTML += `
                    <tr>
                        <td>
                            ${escapeHTML(p.tracking_no)}
                            <div class="small text-muted">PO: ${escapeHTML(p.po_number || '-')}</div>
                        </td>
                        <td class="text-end fw-bold text-warning align-middle">${parseFloat(p.qty).toLocaleString()}</td>
                    </tr>`;
            });
        } else {
            pendTbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">ไม่มีของรอรับเข้า</td></tr>';
        }
        
    } catch (err) {
        availTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        pendTbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// ผูก Event นับจำนวน Tag ตอนติ๊ก Checkbox ໃນหน้า Issue
function updateSelectedCount() {
    const checkedCount = document.querySelectorAll('.tag-checkbox:checked').length;
    document.getElementById('selectedTagsCount').innerText = `เลือก ${checkedCount} รายการ`;
}
document.getElementById('issueTagsTbody')?.addEventListener('change', updateSelectedCount);

// =================================================================
// 6. CYCLE COUNT (ระบบปรับปรุงสต็อก)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    cycleCountModal = new bootstrap.Modal(document.getElementById('cycleCountModal'));
    approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    
    // เช็คสิทธิ์และดึงตัวเลขแจ้งเตือน ถ้าเป็น Admin/Supervisor
    checkPendingApprovals();
    // สั่งให้เช็คเรื่อยๆ ทุก 30 วินาที
    setInterval(checkPendingApprovals, 30000);
});

function openCycleCountModal(itemId, itemNo, itemDesc) {
    document.getElementById('cycleCountForm').reset();
    document.getElementById('ccItemId').value = itemId;
    document.getElementById('ccItemNo').innerText = itemNo;
    document.getElementById('ccItemDesc').innerText = itemDesc || '-';

    // คัดลอก Options จาก locationFilter มาใส่ (ยกเว้น ALL)
    const locSelect = document.getElementById('ccLocation');
    const filterSelect = document.getElementById('locationFilter');
    locSelect.innerHTML = '<option value="" selected disabled>เลือกคลังสินค้าที่ตรวจนับ...</option>';
    
    Array.from(filterSelect.options).forEach(opt => {
        if (opt.value !== 'ALL') {
            locSelect.add(new Option(opt.text, opt.value));
        }
    });

    // ถ้ามีการ Filter Location อยู่แล้วให้ Auto Select
    const currentFilterLoc = document.getElementById('locationFilter').value;
    if (currentFilterLoc !== 'ALL') {
        locSelect.value = currentFilterLoc;
    }

    cycleCountModal.show();
    setTimeout(() => document.getElementById('ccActualQty').focus(), 500);
}

async function submitCycleCount(e) {
    e.preventDefault();
    
    if (!confirm('ยืนยันส่งยอดที่นับได้? (ระบบจะส่งคำขอไปให้หัวหน้าอนุมัติ)')) return;

    const formData = new FormData();
    formData.append('item_id', document.getElementById('ccItemId').value);
    formData.append('location_id', document.getElementById('ccLocation').value);
    formData.append('actual_qty', document.getElementById('ccActualQty').value);
    formData.append('remark', document.getElementById('ccRemark').value);

    const res = await fetchAPI('submit_cycle_count', 'POST', formData, 'btnSubmitCC');
    if (res) {
        Swal.fire({ title: 'สำเร็จ', text: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
        cycleCountModal.hide();
        checkPendingApprovals(); // อัปเดตตัวเลขแจ้งเตือน
    }
}

async function checkPendingApprovals() {
    if (typeof CAN_MANAGE_WH === 'undefined' || !CAN_MANAGE_WH) return;

    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        const btn = document.getElementById('btnApprovalModal');
        const badge = document.getElementById('badgePendingCount');
        
        if (res && btn && badge) {
            btn.classList.remove('d-none');
            if (res.count > 0) {
                badge.innerText = res.count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { console.error('Failed to check approvals', e); }
}

async function openApprovalModal() {
    const tbody = document.getElementById('approvalTbody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-warning"></i></td></tr>';
    approvalModal.show();

    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        tbody.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">ไม่มีรายการรออนุมัติ</td></tr>';
            document.getElementById('badgePendingCount').style.display = 'none';
            return;
        }

        res.data.forEach(row => {
            const diff = parseFloat(row.diff_qty);
            const diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
            const diffSign = diff > 0 ? '+' : '';
            
            const tr = `
                <tr>
                    <td class="text-muted small">${row.counted_at.substring(0,16)}</td>
                    <td class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${row.item_no}</td>
                    <td>${escapeHTML(row.location_name)}</td>
                    <td class="text-end fw-bold text-secondary">${parseFloat(row.system_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold text-primary fs-6">${parseFloat(row.actual_qty).toLocaleString()}</td>
                    <td class="text-end fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</td>
                    <td class="small text-truncate" style="max-width: 150px;" title="${escapeHTML(row.remark)}">${escapeHTML(row.remark || '-')}</td>
                    <td class="small">${escapeHTML(row.counter_name)}</td>
                    <td class="text-center">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success" onclick="processApproval(${row.count_id}, 'APPROVE')" title="อนุมัติ"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="processApproval(${row.count_id}, 'REJECT')" title="ไม่อนุมัติ"><i class="fas fa-times"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

async function processApproval(countId, actionType) {
    let msg = actionType === 'APPROVE' ? 'ยืนยันการอนุมัติเพื่อปรับยอดสต็อกจริง?' : 'ไม่อนุมัติและปัดตกคำขอนี้?';
    if (!confirm(msg)) return;

    const formData = new FormData();
    formData.append('count_id', countId);
    formData.append('approval_action', actionType);

    const res = await fetchAPI('approve_cycle_count', 'POST', formData);
    if (res) {
        showToast(res.message, 'var(--bs-success)');
        openApprovalModal(); // รีเฟรชตารางอนุมัติ
        loadDashboardData(); // รีเฟรชตารางหน้าหลัก
        checkPendingApprovals(); // อัปเดตตัวเลขแจ้งเตือน
    }
}

// นำฟังก์ชัน showToast มาใส่เผื่อหน้า Dashboard ยังไม่มี
function showToast(msg, color) {
    let t = document.getElementById('liveToast');
    if (!t) {
        // หากไม่มี Toast ใน HTML ให้สร้างแทรกสด
        const toastHTML = `
            <div id="toast" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
                <div id="liveToast" class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body fw-bold" id="toastMessage"></div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        t = document.getElementById('liveToast');
    }
    const tb = document.getElementById('toastMessage');
    tb.innerText = msg;
    t.className = `toast align-items-center text-white border-0 ${color.replace('var(--bs-','bg-')}`;
    new bootstrap.Toast(t).show();
}