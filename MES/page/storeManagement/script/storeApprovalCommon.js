// MES/page/storeManagement/script/storeApprovalCommon.js
// Shared module for Cycle Count Approvals, Two-Sided Atomic Relocation, Two-Tier Blind Recount Decision, and PRD Returns
"use strict";

let sharedApprovalModalInstance = null;
let sharedRecountDecisionModalInstance = null;
let sharedPrdReturnModalInstance = null;
let sharedPrdQrScanner = null;
let activeRecountRow = null;
let selectedRecountChoice = null;
let activePrdReturnTag = null;

// ==========================================
// 1. PENDING APPROVALS CHECK & BADGE SYNC
// ==========================================
async function checkPendingCycleCountApprovals() {
    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        const count = res && res.data ? res.data.length : 0;

        // Update dashboard badge if present
        const dashBadge = document.getElementById('badgePendingCount');
        if (dashBadge) {
            dashBadge.innerText = count.toLocaleString();
            dashBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Update cycle count page header badge if present
        const ccBadge = document.getElementById('ccPendingApprovalBadge');
        if (ccBadge) {
            ccBadge.innerText = count.toLocaleString();
            if (count > 0) {
                ccBadge.classList.remove('d-none');
            } else {
                ccBadge.classList.add('d-none');
            }
        }

        // If inventoryDashboard has updateMainAlertBadge
        if (typeof updateMainAlertBadge === 'function') {
            updateMainAlertBadge();
        }

        return count;
    } catch (e) {
        console.error('Error checking pending approvals:', e);
        return 0;
    }
}

// Alias for backwards compatibility with legacy calls
window.checkPendingCycleCountApprovals = checkPendingCycleCountApprovals;
window.checkPendingApprovals = checkPendingCycleCountApprovals;

// ==========================================
// 2. APPROVAL MODAL & TWO-SIDED RELOCATION
// ==========================================
async function openApprovalModal() {
    const modalEl = document.getElementById('approvalModal');
    if (!modalEl) {
        console.error('approvalModal element not found in DOM');
        return;
    }

    if (!sharedApprovalModalInstance) {
        sharedApprovalModalInstance = new bootstrap.Modal(modalEl);
    }

    const tbody = document.getElementById('approvalTbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-warning me-2"></i> กำลังโหลดรายการรออนุมัติ...</td></tr>';
    }

    sharedApprovalModalInstance.show();

    try {
        const res = await fetchAPI('get_pending_counts', 'GET');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-check-circle text-success me-1"></i> ไม่มีรายการรออนุมัติ (ข้อมูลสต็อกตรงทั้งหมด)</td></tr>';
            checkPendingCycleCountApprovals();
            return;
        }

        res.data.forEach(row => {
            const diff = parseFloat(row.diff_qty);
            const diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
            const diffSign = diff > 0 ? '+' : '';
            const serialBadge = row.serial_no ? `<div class="font-monospace text-muted small"><i class="fas fa-qrcode me-1 opacity-75"></i>${escapeHTML(row.serial_no)}</div>` : '';
            
            const isFlagged = parseInt(row.is_flagged_recount) === 1;
            const hasRecount = row.recount_qty !== null && row.recount_qty !== undefined;
            const isRelocation = parseInt(row.is_relocation) === 1;
            const rowDataJson = JSON.stringify(row).replace(/'/g, "&#39;");

            let statusBadge = '';
            let actualQtyHtml = '';
            let diffHtml = '';
            let locationHtml = '';
            let actionHtml = '';

            // Format Location Column (Highlight Relocation)
            if (isRelocation) {
                locationHtml = `
                    <div>
                        <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-0.5 mb-1 text-nowrap">
                            <i class="fas fa-exchange-alt me-1"></i>ย้ายตำแหน่ง
                        </span>
                        <div class="small text-nowrap">
                            <span class="text-muted text-decoration-line-through">${escapeHTML(row.orig_location_name || '-')}</span>
                            <i class="fas fa-arrow-right mx-1 text-primary"></i>
                            <span class="fw-bold text-success">${escapeHTML(row.location_name)}</span>
                        </div>
                    </div>
                `;
            } else {
                locationHtml = `<div class="fw-semibold text-dark">${escapeHTML(row.location_name)}</div>`;
            }

            if (isFlagged && !hasRecount) {
                // Tier 2 Recount Pending on Floor - Strictly Locked
                statusBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5"><i class="fas fa-lock me-1"></i>รอนับซ้ำรอบ 2</span>`;
                actualQtyHtml = `<div class="text-danger fw-bold fs-6">${parseFloat(row.actual_qty).toLocaleString()}</div><span class="text-muted" style="font-size:0.68rem;">รอบ 1</span>`;
                diffHtml = `<span class="badge bg-danger text-white rounded-pill px-2 py-0.5" style="font-size:0.7rem;">ดิฟสูง ล็อก</span>`;
                actionHtml = `
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary disabled" title="ต้องรอพนักงานคนที่สองนับซ้ำรอบ 2 ก่อนอนุมัติ"><i class="fas fa-lock text-muted"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="processApproval(${row.count_id}, 'REJECT')" title="ปัดตกคำขอนี้"><i class="fas fa-times"></i></button>
                    </div>
                `;
            } else if (isFlagged && hasRecount) {
                // Tier 2 Recount Done - Ready for Strict Manual Decision
                statusBadge = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-0.5"><i class="fas fa-balance-scale me-1"></i>นับซ้ำแล้ว รอตัดสิน</span>`;
                actualQtyHtml = `
                    <div class="small text-primary fw-bold">รอบ 1: ${parseFloat(row.count1_qty !== null ? row.count1_qty : row.actual_qty).toLocaleString()}</div>
                    <div class="small text-success fw-bold">รอบ 2: ${parseFloat(row.recount_qty).toLocaleString()}</div>
                `;
                const d1 = parseFloat(row.count1_qty !== null ? row.count1_qty : row.actual_qty) - parseFloat(row.system_qty);
                const d2 = parseFloat(row.recount_qty) - parseFloat(row.system_qty);
                diffHtml = `
                    <div class="small fw-semibold text-danger">D1: ${d1 > 0 ? '+' : ''}${d1.toLocaleString()}</div>
                    <div class="small fw-semibold text-success">D2: ${d2 > 0 ? '+' : ''}${d2.toLocaleString()}</div>
                `;
                actionHtml = `
                    <button class="btn btn-sm btn-primary fw-bold shadow-xs px-2.5 py-1 text-nowrap" onclick='openRecountDecisionModal(${rowDataJson})' title="เปิดหน้าต่างตัดสินผล 3 คอลัมน์">
                        <i class="fas fa-gavel me-1"></i>ตัดสินใจ
                    </button>
                `;
            } else {
                // Normal pending cycle count item (or Single-Click Relocation)
                if (isRelocation) {
                    statusBadge = `<span class="badge bg-info-subtle text-info-emphasis rounded-pill px-2 py-0.5">รออนุมัติย้ายตำแหน่ง</span>`;
                    actualQtyHtml = `<div class="text-primary fw-bold fs-6">${parseFloat(row.actual_qty).toLocaleString()}</div>`;
                    diffHtml = `<div class="fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</div>`;
                    actionHtml = `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-info text-white fw-bold shadow-xs px-2.5 py-1 text-nowrap" onclick="processApproval(${row.count_id}, 'APPROVE', true, '${escapeHTML(row.serial_no)}', '${escapeHTML(row.orig_location_name || '-')}', '${escapeHTML(row.location_name)}')" title="อนุมัติย้ายตำแหน่งพาเลทและปรับยอด 2 ฝั่งให้อัตโนมัติ">
                                <i class="fas fa-exchange-alt me-1"></i>อนุมัติย้าย
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="processApproval(${row.count_id}, 'REJECT')" title="ไม่อนุมัติ"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                } else {
                    statusBadge = `<span class="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5">ปกติ</span>`;
                    actualQtyHtml = `<div class="text-primary fw-bold fs-6">${parseFloat(row.actual_qty).toLocaleString()}</div>`;
                    diffHtml = `<div class="fw-bold ${diffClass}">${diffSign}${diff.toLocaleString()}</div>`;
                    actionHtml = `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-success" onclick="processApproval(${row.count_id}, 'APPROVE')" title="อนุมัติ"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="processApproval(${row.count_id}, 'REJECT')" title="ไม่อนุมัติ"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                }
            }
            
            const tr = `
                <tr class="${isFlagged && !hasRecount ? 'table-danger-subtle' : (isFlagged && hasRecount ? 'table-warning-subtle' : (isRelocation ? 'table-info-subtle' : ''))}">
                    <td class="text-muted small d-none d-md-table-cell">${row.counted_at.substring(0,16)}</td>
                    <td>
                        <div class="fw-bold text-primary" title="${escapeHTML(row.part_description)}">${escapeHTML(row.item_no)}</div>
                        ${serialBadge}
                        <div class="mt-0.5">${statusBadge}</div>
                    </td>
                    <td>${locationHtml}</td>
                    <td class="text-end fw-bold text-secondary d-none d-md-table-cell">${parseFloat(row.system_qty).toLocaleString()}</td>
                    <td class="text-end">${actualQtyHtml}</td>
                    <td class="text-end">${diffHtml}</td>
                    <td class="small text-truncate d-none d-lg-table-cell" style="max-width: 150px;" title="${escapeHTML(row.remark)}">${escapeHTML(row.remark || '-')}</td>
                    <td class="small d-none d-md-table-cell">${escapeHTML(row.counter1_name || row.counter_name || '-')}</td>
                    <td class="text-center">${actionHtml}</td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });

        checkPendingCycleCountApprovals();

    } catch (e) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }
}

async function processApproval(countId, actionType, isRelocation = false, serialNo = '', fromLoc = '', toLoc = '') {
    let confirmPrompt = '';
    if (actionType === 'APPROVE') {
        if (isRelocation) {
            confirmPrompt = `ยืนยันอนุมัติย้ายตำแหน่งพาเลท [${serialNo}] จาก "${fromLoc}" ไปยัง "${toLoc}"?\n\n(ระบบจะตัดยอดออกจาก ${fromLoc} และเพิ่มยอดเข้า ${toLoc} ให้อัตโนมัติในคลิกเดียว — ยอดรวมคลังจะไม่เปลี่ยนแปลง)`;
        } else {
            confirmPrompt = 'ยืนยันการอนุมัติเพื่อปรับยอดสต็อกจริง?';
        }
    } else {
        confirmPrompt = 'ไม่อนุมัติและปัดตกคำขอนี้?';
    }

    if (!confirm(confirmPrompt)) return;

    const formData = new FormData();
    formData.append('count_id', countId);
    formData.append('approval_action', actionType);

    const res = await fetchAPI('approve_cycle_count', 'POST', formData);
    if (res && res.success) {
        if (typeof showToast === 'function') {
            showToast(res.message, 'var(--bs-success)');
        } else {
            Swal.fire({
                title: 'สำเร็จ',
                text: res.message || 'ดำเนินการเรียบร้อยแล้ว',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        }
        openApprovalModal();
        checkPendingCycleCountApprovals();

        // Refresh Shelf Monitor if function exists (cycleCount.php)
        if (typeof refreshShelfMonitor === 'function') {
            refreshShelfMonitor();
        }
        // Refresh Dashboard if function exists (inventoryDashboard.php)
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
    }
}

// ==========================================
// 3. TWO-TIER BLIND RECOUNT PROTOCOL (Strict Manual Decision)
// ==========================================
function openRecountDecisionModal(row) {
    activeRecountRow = row;
    selectedRecountChoice = null;

    if (!sharedRecountDecisionModalInstance) {
        const modalEl = document.getElementById('recountDecisionModal');
        if (modalEl) sharedRecountDecisionModalInstance = new bootstrap.Modal(modalEl);
    }

    const rdItemNo = document.getElementById('rdItemNo');
    if (rdItemNo) rdItemNo.innerText = row.item_no || row.item_code || '-';
    const rdItemDesc = document.getElementById('rdItemDesc');
    if (rdItemDesc) rdItemDesc.innerText = row.part_description || row.item_name || '-';
    const rdLocation = document.getElementById('rdLocation');
    if (rdLocation) rdLocation.innerText = row.location_name || row.location || '-';
    const rdSerialNo = document.getElementById('rdSerialNo');
    if (rdSerialNo) rdSerialNo.innerText = row.serial_no ? `Tag: ${row.serial_no}` : '';
    
    const unitPrice = parseFloat(row.unit_price || 0);
    const rdUnitPrice = document.getElementById('rdUnitPrice');
    if (rdUnitPrice) rdUnitPrice.innerText = `${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿`;

    const sysQty = parseFloat(row.system_qty || 0);
    const count1Qty = parseFloat(row.count1_qty !== null && row.count1_qty !== undefined ? row.count1_qty : row.actual_qty);
    const recountQty = parseFloat(row.recount_qty || 0);

    const rdSystemQty = document.getElementById('rdSystemQty');
    if (rdSystemQty) rdSystemQty.innerText = sysQty.toLocaleString();
    const rdCount1Qty = document.getElementById('rdCount1Qty');
    if (rdCount1Qty) rdCount1Qty.innerText = count1Qty.toLocaleString();
    const rdRecountQty = document.getElementById('rdRecountQty');
    if (rdRecountQty) rdRecountQty.innerText = recountQty.toLocaleString();

    const rdCounter1Info = document.getElementById('rdCounter1Info');
    if (rdCounter1Info) rdCounter1Info.innerText = `โดย: ${row.counter1_name || row.counter_name || '-'}`;
    const rdCount1Time = document.getElementById('rdCount1Time');
    if (rdCount1Time) rdCount1Time.innerText = row.count1_at ? row.count1_at.substring(0, 16) : (row.counted_at ? row.counted_at.substring(0, 16) : '-');

    const rdRecounterInfo = document.getElementById('rdRecounterInfo');
    if (rdRecounterInfo) rdRecounterInfo.innerText = `โดย: ${row.recounter_name || '-'}`;
    const rdRecountTime = document.getElementById('rdRecountTime');
    if (rdRecountTime) rdRecountTime.innerText = row.recount_at ? row.recount_at.substring(0, 16) : '-';

    // Calculate diffs
    const diff1 = count1Qty - sysQty;
    const diff1Val = diff1 * unitPrice;
    const diff1Sign = diff1 > 0 ? '+' : '';
    const badge1 = document.getElementById('rdDiff1Badge');
    if (badge1) {
        badge1.className = `badge rounded-pill mt-2 px-2 py-1 ${diff1 === 0 ? 'bg-secondary' : (diff1 > 0 ? 'bg-success' : 'bg-danger')}`;
        badge1.innerText = `Diff: ${diff1Sign}${diff1.toLocaleString()} (${diff1Sign}${diff1Val.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿)`;
    }

    const diff2 = recountQty - sysQty;
    const diff2Val = diff2 * unitPrice;
    const diff2Sign = diff2 > 0 ? '+' : '';
    const badge2 = document.getElementById('rdDiff2Badge');
    if (badge2) {
        badge2.className = `badge rounded-pill mt-2 px-2 py-1 ${diff2 === 0 ? 'bg-secondary' : (diff2 > 0 ? 'bg-success' : 'bg-danger')}`;
        badge2.innerText = `Diff: ${diff2Sign}${diff2.toLocaleString()} (${diff2Sign}${diff2Val.toLocaleString(undefined, {minimumFractionDigits: 2})} ฿)`;
    }

    // Reset radio selection and highlight
    document.querySelectorAll('.rd-choice-card').forEach(c => {
        c.style.borderColor = '#e2e8f0';
        c.style.boxShadow = 'none';
    });
    document.querySelectorAll('input[name="rdChoiceRadio"]').forEach(r => r.checked = false);
    const reasonInput = document.getElementById('rdDecisionReason');
    if (reasonInput) reasonInput.value = '';

    if (sharedRecountDecisionModalInstance) sharedRecountDecisionModalInstance.show();
}

function selectDecisionChoice(choice) {
    selectedRecountChoice = choice;
    document.querySelectorAll('input[name="rdChoiceRadio"]').forEach(r => {
        r.checked = (r.value === choice);
    });

    // Reset styles
    const cardSys = document.getElementById('cardChoiceSystem');
    const cardC1 = document.getElementById('cardChoiceCount1');
    const cardRec = document.getElementById('cardChoiceRecount');

    if (cardSys) {
        cardSys.style.borderColor = choice === 'SYSTEM' ? '#64748b' : '#e2e8f0';
        cardSys.style.boxShadow = choice === 'SYSTEM' ? '0 0 0 3px rgba(100, 116, 139, 0.25)' : 'none';
    }
    if (cardC1) {
        cardC1.style.borderColor = choice === 'COUNT_1' ? '#2563eb' : '#e2e8f0';
        cardC1.style.boxShadow = choice === 'COUNT_1' ? '0 0 0 3px rgba(37, 99, 235, 0.25)' : 'none';
    }
    if (cardRec) {
        cardRec.style.borderColor = choice === 'RECOUNT' ? '#16a34a' : '#e2e8f0';
        cardRec.style.boxShadow = choice === 'RECOUNT' ? '0 0 0 3px rgba(22, 163, 74, 0.25)' : 'none';
    }
}

async function submitRecountDecision() {
    if (!activeRecountRow) return;
    if (!selectedRecountChoice) {
        Swal.fire('กรุณาเลือกยอดที่ต้องการใช้', 'คุณต้องตัดสินใจเลือก 1 ยอด (ยอดระบบเดิม, ยอดรอบ 1, หรือ ยอดรอบ 2)', 'warning');
        return;
    }

    const reasonEl = document.getElementById('rdDecisionReason');
    const reason = reasonEl ? reasonEl.value.trim() : '';
    if (!reason) {
        Swal.fire('กรุณาระบุเหตุผลการตัดสินใจ', 'ระบุเหตุผลในการเลือกยอดนี้เพื่อบันทึกเป็น Audit Trail ในระบบ', 'warning');
        return;
    }

    const choiceLabel = selectedRecountChoice === 'COUNT_1' ? 'ยอดนับรอบ 1' : (selectedRecountChoice === 'RECOUNT' ? 'ยอดนับซ้ำรอบ 2' : 'ยึดยอดระบบเดิม');
    const confirmRes = await Swal.fire({
        title: 'ยืนยันการตัดสินใจและปรับสต็อก?',
        html: `คุณเลือก <b>${choiceLabel}</b><br>เหตุผล: <i>${escapeHTML(reason)}</i>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันและปรับสต็อก',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmRes.isConfirmed) return;

    Swal.fire({ title: 'กำลังบันทึกการตัดสินใจ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('count_id', activeRecountRow.count_id);
    formData.append('approval_action', 'APPROVE');
    formData.append('selected_choice', selectedRecountChoice);
    formData.append('decision_reason', reason);

    const res = await fetchAPI('approve_cycle_count', 'POST', formData);
    if (res && res.success) {
        Swal.fire('สำเร็จ', res.message || 'บันทึกการตัดสินใจและปรับยอดสต็อกเรียบร้อย', 'success');
        if (sharedRecountDecisionModalInstance) sharedRecountDecisionModalInstance.hide();
        openApprovalModal();
        checkPendingCycleCountApprovals();
        if (typeof refreshShelfMonitor === 'function') refreshShelfMonitor();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } else {
        Swal.fire('เกิดข้อผิดพลาด', res ? res.message : 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
}

async function submitRecountReject() {
    if (!activeRecountRow) return;
    const reasonEl = document.getElementById('rdDecisionReason');
    const reason = reasonEl ? reasonEl.value.trim() : '';

    const confirmRes = await Swal.fire({
        title: 'ยืนยันการปัดตกคำขอ (Reject)?',
        text: 'รายการตรวจนับนี้จะถูกปฏิเสธและไม่ปรับยอดสต็อก',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'ใช่, ปัดตกคำขอนี้',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmRes.isConfirmed) return;

    Swal.fire({ title: 'กำลังดำเนินการ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('count_id', activeRecountRow.count_id);
    formData.append('approval_action', 'REJECT');
    formData.append('decision_reason', reason || 'ผู้จัดการปฏิเสธคำขอปรับยอด');

    const res = await fetchAPI('approve_cycle_count', 'POST', formData);
    if (res && res.success) {
        Swal.fire('สำเร็จ', 'ปฏิเสธคำขอเรียบร้อยแล้ว', 'info');
        if (sharedRecountDecisionModalInstance) sharedRecountDecisionModalInstance.hide();
        openApprovalModal();
        checkPendingCycleCountApprovals();
        if (typeof refreshShelfMonitor === 'function') refreshShelfMonitor();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } else {
        Swal.fire('เกิดข้อผิดพลาด', res ? res.message : 'ไม่สามารถปฏิเสธได้', 'error');
    }
}

// ==========================================
// 4. PRD MATERIAL RETURN (รับคืนวัตถุดิบจากฝ่ายผลิต)
// ==========================================
function openPrdReturnModal() {
    const modalEl = document.getElementById('prdReturnModal');
    if (!modalEl) {
        console.error('prdReturnModal not found in DOM');
        return;
    }

    if (!sharedPrdReturnModalInstance) {
        sharedPrdReturnModalInstance = new bootstrap.Modal(modalEl);
    }

    resetPrdReturnForm();
    sharedPrdReturnModalInstance.show();

    // Auto-focus input after modal shown
    setTimeout(() => {
        const inp = document.getElementById('prdReturnScanInput');
        if (inp) {
            inp.focus();
            inp.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchPrdReturnTag();
                }
            });
        }
    }, 400);
}

function resetPrdReturnForm() {
    activePrdReturnTag = null;
    const scanInput = document.getElementById('prdReturnScanInput');
    if (scanInput) scanInput.value = '';

    const detailsCard = document.getElementById('prdReturnDetailsCard');
    if (detailsCard) detailsCard.classList.add('d-none');

    const emptyPrompt = document.getElementById('prdReturnEmptyPrompt');
    if (emptyPrompt) emptyPrompt.classList.remove('d-none');

    const locSelect = document.getElementById('prdReturnLocationSelect');
    if (locSelect) locSelect.innerHTML = '<option value="">-- เลือกคลังที่เก็บสินค้า --</option>';

    const qtyInput = document.getElementById('prdReturnQtyInput');
    if (qtyInput) qtyInput.value = '';

    const reasonInput = document.getElementById('prdReturnReasonInput');
    if (reasonInput) reasonInput.value = 'งานเหลือจากไลน์ผลิต นำส่งคืนคลัง Store';

    // Stop QR camera if running
    if (sharedPrdQrScanner) {
        sharedPrdQrScanner.stop().then(() => {
            const readerEl = document.getElementById('prdReturnCameraReader');
            if (readerEl) readerEl.classList.add('d-none');
            const btnCam = document.getElementById('btnTogglePrdCamera');
            if (btnCam) btnCam.classList.remove('btn-danger'), btnCam.classList.add('btn-outline-secondary');
        }).catch(err => console.warn(err));
    }
}

async function searchPrdReturnTag(forcedSerial = null) {
    const scanInput = document.getElementById('prdReturnScanInput');
    const serial = forcedSerial || (scanInput ? scanInput.value.trim() : '');

    if (!serial) {
        Swal.fire('กรุณาระบุแท็ก', 'กรุณาสแกน QR หรือพิมพ์รหัสแท็ก/พาเลท', 'warning');
        return;
    }

    try {
        const btn = document.getElementById('btnSearchPrdTag');
        if (btn) btn.disabled = true;

        const res = await fetchAPI(`check_prd_return_tag&serial_no=${encodeURIComponent(serial)}`, 'GET');
        if (btn) btn.disabled = false;

        if (!res || !res.success || !res.data) {
            Swal.fire('ไม่พบแท็ก', res ? res.message : 'ไม่พบข้อมูลแท็กนี้ในระบบ', 'error');
            return;
        }

        activePrdReturnTag = res.data;
        const tag = res.data;

        // Populate Details
        document.getElementById('prdItemNo').innerText = tag.item_no || tag.sap_no || '-';
        document.getElementById('prdItemDesc').innerText = tag.part_description || '-';
        document.getElementById('prdSerialNo').innerText = tag.serial_no || '-';
        document.getElementById('prdPalletNo').innerText = tag.pallet_no ? `Pallet: ${tag.pallet_no}` : (tag.qty_per_pallet ? `Std Pallet: ${parseFloat(tag.qty_per_pallet).toLocaleString()}` : '');
        document.getElementById('prdLastIssuedAt').innerText = tag.last_issued_at || 'ไม่ระบุ';

        // Badge Status
        const statusBadge = document.getElementById('prdReturnStatusBadge');
        if (statusBadge) {
            if (tag.status === 'AVAILABLE') {
                statusBadge.className = 'badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5';
                statusBadge.innerText = 'AVAILABLE (ใน Store)';
            } else if (tag.status === 'WIP') {
                statusBadge.className = 'badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-0.5';
                statusBadge.innerText = 'WIP (ตัดจ่ายไปผลิตแล้ว)';
            } else {
                statusBadge.className = 'badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-0.5';
                statusBadge.innerText = tag.status || '-';
            }
        }

        // Populate Location Dropdown
        const locSelect = document.getElementById('prdReturnLocationSelect');
        if (locSelect && res.locations) {
            locSelect.innerHTML = '<option value="">-- เลือกคลังที่เก็บสินค้า --</option>';
            res.locations.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.location_id;
                opt.innerText = `${l.location_name} (${l.zone_name})`;
                if (tag.location_id && parseInt(tag.location_id) === parseInt(l.location_id)) {
                    opt.selected = true;
                }
                locSelect.appendChild(opt);
            });
        }

        // Default QTY: use current_qty or qty_per_pallet
        const defaultQty = parseFloat(tag.current_qty) > 0 ? parseFloat(tag.current_qty) : parseFloat(tag.qty_per_pallet || 0);
        const qtyInput = document.getElementById('prdReturnQtyInput');
        if (qtyInput) qtyInput.value = defaultQty > 0 ? defaultQty : '';

        // Show Details Card
        document.getElementById('prdReturnDetailsCard').classList.remove('d-none');
        document.getElementById('prdReturnEmptyPrompt').classList.add('d-none');

        // Focus QTY input
        setTimeout(() => {
            if (qtyInput) qtyInput.focus();
        }, 300);

    } catch (e) {
        console.error('searchPrdReturnTag error:', e);
    }
}

async function submitPrdReturn() {
    if (!activePrdReturnTag) {
        Swal.fire('ยังไม่ได้เลือกแท็ก', 'กรุณาสแกนหรือค้นหาแท็กที่ต้องการรับคืนก่อน', 'warning');
        return;
    }

    const locSelect = document.getElementById('prdReturnLocationSelect');
    const locationId = locSelect ? parseInt(locSelect.value) : 0;
    if (!locationId) {
        Swal.fire('กรุณาเลือกคลังปลายทาง', 'กรุณาเลือกตำแหน่งหรือคลัง Store ที่จะนำสินค้าเข้าไปจัดเก็บ', 'warning');
        return;
    }

    const qtyInput = document.getElementById('prdReturnQtyInput');
    const returnQty = qtyInput ? parseFloat(qtyInput.value) : 0;
    if (!returnQty || returnQty <= 0 || isNaN(returnQty)) {
        Swal.fire('กรุณาระบุจำนวน', 'จำนวนที่รับคืนต้องมากกว่า 0 ชิ้น', 'warning');
        return;
    }

    const reasonInput = document.getElementById('prdReturnReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    const selectedLocText = locSelect.options[locSelect.selectedIndex].text;
    const confirmRes = await Swal.fire({
        title: 'ยืนยันรับคืนวัตถุดิบเข้า Store?',
        html: `
            <div class="text-start small p-2 bg-light rounded border">
                <div><b>แท็ก:</b> ${escapeHTML(activePrdReturnTag.serial_no)}</div>
                <div><b>พาร์ท:</b> ${escapeHTML(activePrdReturnTag.item_no)} - ${escapeHTML(activePrdReturnTag.part_description)}</div>
                <div><b>จำนวนรับคืน:</b> <span class="fw-bold text-success">${returnQty.toLocaleString()} ชิ้น</span></div>
                <div><b>เข้าคลัง:</b> <span class="fw-bold text-primary">${escapeHTML(selectedLocText)}</span></div>
                <div><b>หมายเหตุ:</b> <i>${escapeHTML(reason || '-')}</i></div>
            </div>
            <div class="text-muted small mt-2">เมื่อกดยืนยัน ยอดจะเข้าคลัง Store และแท็กจะสามารถนำไปเบิกจ่ายต่อได้ทันที</div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันรับคืน',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmRes.isConfirmed) return;

    Swal.fire({ title: 'กำลังบันทึกการรับคืน...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('serial_no', activePrdReturnTag.serial_no);
    formData.append('location_id', locationId);
    formData.append('return_qty', returnQty);
    formData.append('reason', reason);

    const res = await fetchAPI('process_prd_return', 'POST', formData);
    if (res && res.success) {
        Swal.fire({
            title: 'รับคืนสำเร็จ',
            text: res.message,
            icon: 'success',
            timer: 3000
        });

        resetPrdReturnForm();
        if (sharedPrdReturnModalInstance) sharedPrdReturnModalInstance.hide();

        checkPendingCycleCountApprovals();
        if (typeof refreshShelfMonitor === 'function') refreshShelfMonitor();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } else {
        Swal.fire('เกิดข้อผิดพลาด', res ? res.message : 'ไม่สามารถรับคืนสินค้าได้', 'error');
    }
}

function togglePrdReturnCamera() {
    const readerEl = document.getElementById('prdReturnCameraReader');
    const btnCam = document.getElementById('btnTogglePrdCamera');
    if (!readerEl) return;

    if (sharedPrdQrScanner && readerEl.classList.contains('d-none') === false) {
        sharedPrdQrScanner.stop().then(() => {
            readerEl.classList.add('d-none');
            if (btnCam) btnCam.classList.remove('btn-danger'), btnCam.classList.add('btn-outline-secondary');
        });
        return;
    }

    if (typeof Html5Qrcode === 'undefined') {
        Swal.fire('กล้องไม่พร้อมใช้งาน', 'ระบบสแกนกล้องยังไม่พร้อม กรุณาพิมพ์หมายเลขแท็กแทน', 'warning');
        return;
    }

    readerEl.classList.remove('d-none');
    if (btnCam) btnCam.classList.add('btn-danger'), btnCam.classList.remove('btn-outline-secondary');

    if (!sharedPrdQrScanner) {
        sharedPrdQrScanner = new Html5Qrcode('prdReturnCameraReader');
    }

    sharedPrdQrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            // Success scan
            sharedPrdQrScanner.stop().then(() => {
                readerEl.classList.add('d-none');
                if (btnCam) btnCam.classList.remove('btn-danger'), btnCam.classList.add('btn-outline-secondary');
                const inp = document.getElementById('prdReturnScanInput');
                if (inp) inp.value = decodedText;
                searchPrdReturnTag(decodedText);
            });
        },
        (errorMessage) => {
            // scanning...
        }
    ).catch(err => {
        console.error('Camera start failed:', err);
        readerEl.classList.add('d-none');
        if (btnCam) btnCam.classList.remove('btn-danger'), btnCam.classList.add('btn-outline-secondary');
        Swal.fire('ไม่สามารถเปิดกล้องได้', 'กรุณาอนุญาตสิทธิ์เข้าถึงกล้องบนเบราว์เซอร์ หรือพิมพ์รหัสแท็กแทน', 'warning');
    });
}

// Auto-run badge check on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    checkPendingCycleCountApprovals();
});
