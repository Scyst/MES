<div class="modal fade" id="detailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-search-location me-2"></i> พิกัดวัตถุดิบ (Locations & Tags)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body p-0 bg-light">
                <div class="bg-white p-3 border-bottom shadow-sm">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="fw-bold text-primary mb-1" id="modalItemNo">-</h5>
                            <div class="text-muted small" id="modalItemDesc">-</div>
                        </div>
                        <div id="modalItemTotalQty" class="text-end">
                            <!-- Total Qty will be injected via JS -->
                        </div>
                    </div>
                </div>
                
                <div class="overflow-auto hide-scrollbar px-2" style="width: 100%;">
                    <ul class="nav nav-pills p-1 mt-2 bg-white rounded-pill border shadow-sm flex-nowrap" id="detailsTab" role="tablist" style="width: max-content; min-width: 100%;">
                        <li class="nav-item flex-fill text-center" role="presentation">
                            <button class="nav-link active rounded-pill fw-bold text-secondary w-100 text-nowrap" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab" aria-controls="overview" aria-selected="true"><i class="fas fa-info-circle me-1"></i> ภาพรวม</button>
                        </li>
                        <li class="nav-item flex-fill text-center" role="presentation">
                            <button class="nav-link rounded-pill fw-bold text-secondary w-100 text-nowrap" id="tags-tab" data-bs-toggle="tab" data-bs-target="#tags" type="button" role="tab" aria-controls="tags" aria-selected="false"><i class="fas fa-tags me-1"></i> แท็กสินค้า</button>
                        </li>
                        <li class="nav-item flex-fill text-center" role="presentation">
                            <button class="nav-link rounded-pill fw-bold text-secondary w-100 text-nowrap" id="pending-po-tab" data-bs-toggle="tab" data-bs-target="#pending-po" type="button" role="tab" aria-controls="pending-po" aria-selected="false"><i class="fas fa-file-invoice-dollar me-1"></i> รายการ PO</button>
                        </li>
                        <li class="nav-item flex-fill text-center" role="presentation">
                            <button class="nav-link rounded-pill fw-bold text-secondary w-100 text-nowrap" id="ledger-tab" data-bs-toggle="tab" data-bs-target="#ledger" type="button" role="tab" aria-controls="ledger" aria-selected="false"><i class="fas fa-book me-1"></i> ประวัติ</button>
                        </li>
                    </ul>
                </div>

                <style>
                    #detailsTab .nav-link { padding: 0.5rem 1rem; font-size: 0.85rem; }
                    #detailsTab .nav-link.active { background-color: #0d6efd; color: white !important; }
                    #detailsTab .nav-link:hover:not(.active) { background-color: #f8f9fa; }
                </style>

                <div class="tab-content bg-light p-3" id="detailsTabContent" style="min-height: 45vh;">
                    <!-- Tab 1: Overview -->
                    <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview-tab">
                        <div id="mismatchWarningContainer" class="d-none mb-3">
                            <!-- Mismatch Alert will be injected here via JS -->
                        </div>
                        
                        <div class="card border border-success border-opacity-25 shadow-sm h-100 rounded-4 overflow-hidden">
                            <div class="card-header bg-success bg-opacity-10 text-success fw-bold border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                                <span><i class="fas fa-check-circle me-1"></i> สต็อกพร้อมใช้งาน (Available)</span>
                                <span class="badge bg-success rounded-pill" id="availCountBadge">0</span>
                            </div>
                            <div class="card-body p-0 table-responsive hide-scrollbar" style="max-height: 50vh;">
                                <table class="table table-hover align-middle mb-0" style="font-size: 0.85rem;">
                                    <thead class="sticky-top bg-white">
                                        <tr class="text-secondary small">
                                            <th class="px-3 border-bottom py-2">Location</th>
                                            <th class="text-end px-3 border-bottom py-2">QTY</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modalAvailTbody" class="border-top-0"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Tags & Pallets -->
                    <div class="tab-pane fade" id="tags" role="tabpanel" aria-labelledby="tags-tab">
                        <div class="card border border-primary border-opacity-25 shadow-sm h-100 rounded-4 overflow-hidden">
                            <div class="card-header bg-primary bg-opacity-10 text-primary fw-bold border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                                <span><i class="fas fa-tags me-1"></i> รายการแท็กและพาเลททั้งหมด</span>
                                <span class="badge bg-primary rounded-pill" id="tagsCountBadge">0</span>
                            </div>
                            <div class="card-body p-0 table-responsive hide-scrollbar" style="max-height: 50vh;">
                                <table class="table table-hover align-middle mb-0" style="font-size: 0.85rem;">
                                    <thead class="sticky-top bg-white">
                                        <tr class="text-secondary small">
                                            <th class="px-3 border-bottom py-2">Serial No.</th>
                                            <th class="text-end px-3 border-bottom py-2">QTY</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modalTagsTbody" class="border-top-0"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Pending POs -->
                    <div class="tab-pane fade" id="pending-po" role="tabpanel" aria-labelledby="pending-po-tab">
                        <div class="card border border-warning border-opacity-25 shadow-sm h-100 rounded-4 overflow-hidden">
                            <div class="card-header bg-warning bg-opacity-10 text-dark fw-bold border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                                <span><i class="fas fa-truck me-1"></i> สินค้ารอรับเข้า (Pending PO)</span>
                                <span class="badge bg-warning text-dark rounded-pill" id="pendCountBadge">0</span>
                            </div>
                            <div class="card-body p-0 table-responsive hide-scrollbar" style="max-height: 50vh;">
                                <table class="table table-hover align-middle mb-0" style="font-size: 0.85rem;">
                                    <thead class="sticky-top bg-white">
                                        <tr class="text-secondary small">
                                            <th class="px-3 border-bottom py-2">Pallet / CTN / PO</th>
                                            <th class="text-end px-3 border-bottom py-2">QTY</th>
                                        </tr>
                                    </thead>
                                    <tbody id="modalPendTbody" class="border-top-0"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 4: Ledger -->
                    <div class="tab-pane fade" id="ledger" role="tabpanel" aria-labelledby="ledger-tab">
                        <div class="card border border-info border-opacity-25 shadow-sm h-100 rounded-4 overflow-hidden">
                            <div class="card-header bg-info bg-opacity-10 text-dark fw-bold border-bottom-0 py-2 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                                <span><i class="fas fa-history me-1 text-info"></i> ประวัติการทำรายการ</span>
                                <select id="ledgerFilterSelect" class="form-select form-select-sm w-auto shadow-sm rounded-pill" onchange="renderItemLedger()">
                                    <option value="store">เฉพาะคลังสโตร์ (Store)</option>
                                    <option value="all">ทั้งหมด (All)</option>
                                </select>
                            </div>
                            <div class="card-body p-0 overflow-auto hide-scrollbar" style="max-height: 50vh; background-color: #f8f9fa;">
                                <div class="list-group list-group-flush" id="modalLedgerList">
                                    <!-- Ledger list items will be injected here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div> <!-- close modal-body -->

            <div class="modal-footer bg-white border-top justify-content-center">
                <button type="button" class="btn btn-primary fw-bold px-4 py-2 shadow-sm rounded-pill w-100" onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();" data-bs-dismiss="modal">
                    <i class="fas fa-qrcode me-2"></i> สแกน
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="cycleCountModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-clipboard-list me-2"></i> ปรับปรุง/นับสต็อก (Cycle Count)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="cycleCountForm" onsubmit="submitCycleCount(event)">
                <div class="modal-body p-4 bg-light">
                    <div class="bg-white p-3 rounded border shadow-sm mb-3">
                        <div class="text-muted small mb-1">รหัสวัตถุดิบ (Part No.)</div>
                        <h6 class="fw-bold text-primary mb-0" id="ccItemNo">-</h6>
                        <div class="text-muted small mt-1 text-truncate" id="ccItemDesc">-</div>
                    </div>
                    <input type="hidden" id="ccItemId">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold text-secondary small">นับของที่คลังไหน? (Location)</label>
                        <select id="ccLocation" class="form-select border-secondary-subtle shadow-sm" required></select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold text-secondary small">ยอดที่นับได้จริง (Actual QTY)</label>
                        <input type="number" id="ccActualQty" class="form-control form-control-lg fw-bold text-danger border-secondary-subtle shadow-sm text-end" min="0" step="0.01" required placeholder="0.00">
                    </div>

                    <div class="mb-1">
                        <label class="form-label fw-bold text-secondary small">หมายเหตุ / สาเหตุ (ถ้ามี)</label>
                        <input type="text" id="ccRemark" class="form-control border-secondary-subtle shadow-sm" placeholder="เช่น นับสต็อกประจำเดือน, พบของเสียหาย...">
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-secondary fw-bold shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-warning fw-bold px-4 shadow-sm" id="btnSubmitCC"><i class="fas fa-paper-plane me-1"></i> ส่งคำขอปรับยอด</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="approvalModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-warning">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check me-2"></i> รายการรออนุมัติปรับยอดสต็อก</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-body-tertiary">
                <div class="table-responsive hide-scrollbar m-0" style="max-height: 60vh;">
                    <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr class="text-secondary">
                                <th class="px-3 d-none d-md-table-cell">วันที่นับ</th>
                                <th>Item No.</th>
                                <th>Location</th>
                                <th class="text-end d-none d-md-table-cell">System QTY</th>
                                <th class="text-end text-primary">Actual QTY</th>
                                <th class="text-end">Diff</th>
                                <th class="d-none d-lg-table-cell">หมายเหตุ</th>
                                <th class="d-none d-md-table-cell">ผู้นับ</th>
                                <th class="text-center px-3">Action</th>
                            </tr>
                        </thead>
                        <tbody id="approvalTbody">
                            <tr><td colspan="9" class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted me-2"></i>กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-white border-top py-2">
                <button type="button" class="btn btn-secondary btn-sm fw-bold shadow-sm px-4" data-bs-dismiss="modal">ปิด</button>
            </div>
        </div>
    </div>
</div>

<!-- Strict Manual Decision Modal (Phase 3.2: Two-Tier Blind Recount Protocol) -->
<div class="modal fade" id="recountDecisionModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 14px; overflow: hidden;">
            <div class="modal-header bg-dark text-white py-2.5 px-3">
                <div class="d-flex align-items-center gap-2">
                    <div class="d-flex align-items-center justify-content-center bg-warning text-dark rounded-circle" style="width: 32px; height: 32px;">
                        <i class="fas fa-gavel" style="font-size: 0.95rem;"></i>
                    </div>
                    <div>
                        <h6 class="modal-title fw-bold mb-0">ตัดสินผลการตรวจนับซ้ำ (Two-Tier Recount Protocol)</h6>
                        <span class="text-white-50" style="font-size: 0.72rem;">ระบบสอบทานผลต่างสูง — ผู้จัดการต้องพิจารณาตัดสินใจเลือกยอดด้วยตนเอง (Strict Manual Decision)</span>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3 bg-light">
                <!-- Item Info Card -->
                <div class="card border-0 shadow-sm rounded-3 mb-3">
                    <div class="card-body p-3">
                        <div class="row g-2 align-items-center">
                            <div class="col-12 col-md-6">
                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 small mb-1" id="rdVarianceBadge">
                                    <i class="fas fa-exclamation-triangle me-1"></i>ตรวจพบผลต่างสูง (High Variance)
                                </span>
                                <h6 class="fw-bold text-dark mb-0" id="rdItemNo">-</h6>
                                <div class="text-muted small" id="rdItemDesc">-</div>
                            </div>
                            <div class="col-6 col-md-3">
                                <div class="text-muted small">ตำแหน่ง (Location):</div>
                                <div class="fw-bold text-dark" id="rdLocation">-</div>
                                <div class="font-monospace text-muted small" id="rdSerialNo">-</div>
                            </div>
                            <div class="col-6 col-md-3 text-md-end">
                                <div class="text-muted small">ราคาต่อหน่วย:</div>
                                <div class="fw-bold text-success fs-6" id="rdUnitPrice">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3-Column Comparison Grid -->
                <div class="row g-2 mb-3">
                    <!-- Column 1: System Qty -->
                    <div class="col-12 col-md-4">
                        <div class="card h-100 border-2 rounded-3 text-center rd-choice-card" id="cardChoiceSystem" onclick="selectDecisionChoice('SYSTEM')" style="cursor: pointer; transition: all 0.2s;">
                            <div class="card-header bg-secondary-subtle border-0 py-2">
                                <div class="form-check d-flex justify-content-center align-items-center gap-2 m-0">
                                    <input class="form-check-input" type="radio" name="rdChoiceRadio" id="radioChoiceSystem" value="SYSTEM" onchange="selectDecisionChoice('SYSTEM')">
                                    <label class="form-check-label fw-bold text-secondary mb-0 cursor-pointer" for="radioChoiceSystem">
                                        1. ยอดระบบเดิม
                                    </label>
                                </div>
                            </div>
                            <div class="card-body p-3">
                                <div class="text-muted small mb-1">System QTY</div>
                                <div class="fw-bold text-secondary display-6 mb-2" id="rdSystemQty">0</div>
                                <div class="badge bg-light text-muted border rounded-pill px-2 py-1 small">
                                    ไม่ปรับยอด คงสต็อกเดิม
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Count 1 Qty -->
                    <div class="col-12 col-md-4">
                        <div class="card h-100 border-2 rounded-3 text-center rd-choice-card" id="cardChoiceCount1" onclick="selectDecisionChoice('COUNT_1')" style="cursor: pointer; transition: all 0.2s;">
                            <div class="card-header bg-primary-subtle border-0 py-2">
                                <div class="form-check d-flex justify-content-center align-items-center gap-2 m-0">
                                    <input class="form-check-input" type="radio" name="rdChoiceRadio" id="radioChoiceCount1" value="COUNT_1" onchange="selectDecisionChoice('COUNT_1')">
                                    <label class="form-check-label fw-bold text-primary mb-0 cursor-pointer" for="radioChoiceCount1">
                                        2. ยอดนับรอบ 1
                                    </label>
                                </div>
                            </div>
                            <div class="card-body p-3">
                                <div class="text-muted small mb-1">Count 1 QTY</div>
                                <div class="fw-bold text-primary display-6 mb-2" id="rdCount1Qty">0</div>
                                <div class="text-muted small" id="rdCounter1Info">โดย: -</div>
                                <div class="text-muted" style="font-size: 0.72rem;" id="rdCount1Time">-</div>
                                <div class="badge rounded-pill mt-2 px-2 py-1" id="rdDiff1Badge">Diff: -</div>
                            </div>
                        </div>
                    </div>

                    <!-- Column 3: Recount Qty -->
                    <div class="col-12 col-md-4">
                        <div class="card h-100 border-2 rounded-3 text-center rd-choice-card" id="cardChoiceRecount" onclick="selectDecisionChoice('RECOUNT')" style="cursor: pointer; transition: all 0.2s;">
                            <div class="card-header bg-success-subtle border-0 py-2">
                                <div class="form-check d-flex justify-content-center align-items-center gap-2 m-0">
                                    <input class="form-check-input" type="radio" name="rdChoiceRadio" id="radioChoiceRecount" value="RECOUNT" onchange="selectDecisionChoice('RECOUNT')">
                                    <label class="form-check-label fw-bold text-success mb-0 cursor-pointer" for="radioChoiceRecount">
                                        3. ยอดนับซ้ำรอบ 2
                                    </label>
                                </div>
                            </div>
                            <div class="card-body p-3">
                                <div class="text-muted small mb-1">Recount QTY</div>
                                <div class="fw-bold text-success display-6 mb-2" id="rdRecountQty">0</div>
                                <div class="text-muted small" id="rdRecounterInfo">โดย: -</div>
                                <div class="text-muted" style="font-size: 0.72rem;" id="rdRecountTime">-</div>
                                <div class="badge rounded-pill mt-2 px-2 py-1" id="rdDiff2Badge">Diff: -</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Decision Reason Input (Mandatory) -->
                <div class="card border-0 shadow-sm rounded-3 p-3 bg-white">
                    <label class="form-label fw-bold text-dark small mb-1">
                        <i class="fas fa-comment-dots text-primary me-1"></i> บันทึกเหตุผลการตัดสินใจของผู้จัดการ (Decision Reason) <span class="text-danger">*</span>
                    </label>
                    <textarea id="rdDecisionReason" class="form-control" rows="2" placeholder="ระบุเหตุผลในการตัดสินใจ (เช่น: ตรวจสอบร่วมกันรอบ 2 พบสินค้าซุกอยู่ใต้พาเลทจริง, ยืนยันยอดนับรอบ 2 ถูกต้อง)..."></textarea>
                    <div class="form-text text-muted" style="font-size: 0.72rem;">* จำเป็นต้องระบุเหตุผลเพื่อบันทึกเป็น Audit Trail ในระบบตามมาตรฐาน ISO 9001 / IATF 16949</div>
                </div>
            </div>
            <div class="modal-footer bg-white border-top py-2.5 px-3 d-flex justify-content-between">
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold px-3" onclick="submitRecountReject()">
                    <i class="fas fa-times me-1"></i> ปัดตกคำขอนี้ (Reject)
                </button>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-secondary btn-sm fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary btn-sm fw-bold px-4 shadow-sm" id="btnSubmitDecision" onclick="submitRecountDecision()">
                        <i class="fas fa-check-circle me-1"></i> ยืนยันการตัดสินใจและปรับสต็อก
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="ccHistoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style="max-width: 95%;">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white py-2.5 px-3">
                <div class="d-flex align-items-center gap-2">
                    <i class="fas fa-file-invoice text-info fs-5"></i>
                    <div>
                        <h6 class="modal-title fw-bold mb-0">บันทึกประวัติตรวจนับสต็อก & ใบรับรองการตรวจสอบ (Cycle Count Audit Ledger)</h6>
                        <span class="text-white-50" style="font-size: 0.72rem;">ระบบสอบทานผลต่างสินค้าคงคลังและออกรายงานรับรองตามมาตรฐาน ISO/IATF (Phase 3.1)</span>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-outline-light btn-sm fw-bold" onclick="exportCcHistoryExcel()" title="ส่งออกข้อมูลเป็น Excel CSV พร้อม UTF-8 BOM">
                        <i class="fas fa-file-excel text-success me-1"></i> Export Excel
                    </button>
                    <button type="button" class="btn btn-primary btn-sm fw-bold shadow-sm" onclick="printCcAuditReport()" title="เปิดเอกสารรับรองพร้อม 3 ช่องลงนามเพื่อพิมพ์หรือบันทึกเป็น PDF">
                        <i class="fas fa-print me-1"></i> พิมพ์ใบรับรอง (PDF)
                    </button>
                    <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="modal"></button>
                </div>
            </div>
            
            <!-- Filter Toolbar -->
            <div class="p-2.5 bg-light border-bottom">
                <div class="row g-2 align-items-center">
                    <div class="col-12 col-md-auto d-flex align-items-center gap-1">
                        <label class="form-label mb-0 text-muted small fw-semibold">ช่วงวันที่:</label>
                        <input type="date" id="ccFilterStartDate" class="form-control form-control-sm" style="width: 130px;">
                        <span class="text-muted small">-</span>
                        <input type="date" id="ccFilterEndDate" class="form-control form-control-sm" style="width: 130px;">
                    </div>
                    <div class="col-12 col-md-auto d-flex align-items-center gap-1">
                        <button type="button" id="btnPeriodThisMonth" class="btn btn-xs btn-outline-primary active fw-semibold" onclick="setCcHistoryQuickPeriod('this_month')">เดือนนี้</button>
                        <button type="button" id="btnPeriodLastMonth" class="btn btn-xs btn-outline-secondary fw-semibold" onclick="setCcHistoryQuickPeriod('last_month')">เดือนก่อน</button>
                        <button type="button" id="btnPeriod30Days" class="btn btn-xs btn-outline-secondary fw-semibold" onclick="setCcHistoryQuickPeriod('last_30_days')">30 วันล่าสุด</button>
                    </div>
                    <div class="col-6 col-md-2">
                        <select id="ccFilterLocation" class="form-select form-select-sm">
                            <option value="ALL">ทุกตำแหน่ง (All Locations)</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-auto">
                        <select id="ccFilterStatus" class="form-select form-select-sm" style="width: 130px;">
                            <option value="ALL">ทุกสถานะ (All)</option>
                            <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
                            <option value="REJECTED">ปฏิเสธ (Rejected)</option>
                            <option value="PENDING">รอดำเนินการ (Pending)</option>
                        </select>
                    </div>
                    <div class="col-8 col-md">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" id="ccFilterSearch" class="form-control form-control-sm border-start-0" placeholder="ค้นหา Part No, SAP, Serial, Loc..." onkeyup="if(event.key==='Enter') loadCcHistoryData()">
                        </div>
                    </div>
                    <div class="col-4 col-md-auto">
                        <button type="button" class="btn btn-primary btn-sm fw-bold w-100 px-3 shadow-sm" onclick="loadCcHistoryData()">
                            <i class="fas fa-filter me-1"></i> กรอง
                        </button>
                    </div>
                </div>

                <!-- KPI Summary Badges -->
                <div class="d-flex align-items-center gap-3 flex-wrap mt-2 pt-2 border-top" style="font-size: 0.78rem;">
                    <div class="text-muted">
                        รายการทั้งหมด: <span id="ccSummaryTotal" class="fw-bold text-dark">0</span>
                    </div>
                    <div class="text-muted">
                        อนุมัติ: <span id="ccSummaryApproved" class="fw-bold text-success">0</span> | ปฏิเสธ: <span id="ccSummaryRejected" class="fw-bold text-danger">0</span>
                    </div>
                    <div class="text-muted">
                        ยอดดิฟชิ้นรวม: <span id="ccSummaryDiffQty" class="fw-bold text-secondary">0</span>
                    </div>
                    <div class="text-muted">
                        มูลค่าดิฟรวม (Absolute): <span id="ccSummaryAbsDiffValue" class="fw-bold text-dark">0.00 ฿</span>
                    </div>
                    <div class="text-muted">
                        มูลค่าผลต่างสุทธิ (Net): <span id="ccSummaryNetDiffValue" class="fw-bold text-primary">0.00 ฿</span>
                    </div>
                </div>
            </div>

            <div class="modal-body p-0 bg-body-tertiary">
                <div class="table-responsive hide-scrollbar m-0" style="max-height: 58vh;">
                    <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.82rem;">
                        <thead class="table-dark sticky-top shadow-sm" style="font-size: 0.76rem; letter-spacing: 0.3px;">
                            <tr>
                                <th class="px-2 text-center" style="width: 40px;">#</th>
                                <th class="px-2">วันที่ตรวจ</th>
                                <th>Item No / Description</th>
                                <th>Serial No (Tag)</th>
                                <th>Location / Zone</th>
                                <th class="text-end">ราคา/หน่วย</th>
                                <th class="text-end">System</th>
                                <th class="text-end">Actual</th>
                                <th class="text-end">Diff Qty</th>
                                <th class="text-end">Diff Value (฿)</th>
                                <th class="text-center">Status</th>
                                <th class="px-2">ผู้ตรวจ / ผู้อนุมัติ</th>
                            </tr>
                        </thead>
                        <tbody id="ccHistoryTbody">
                            <tr><td colspan="12" class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted me-2"></i>กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="modal-footer bg-white border-top py-2 d-flex justify-content-between align-items-center">
                <span class="text-muted small">
                    <i class="fas fa-info-circle me-1 text-primary"></i> ข้อมูลเชื่อมโยงกับฐานข้อมูลตรวจนับกลาง `dbo.INVENTORY_CYCLE_COUNTS`
                </span>
                <button type="button" class="btn btn-secondary btn-sm fw-bold shadow-sm px-4" data-bs-dismiss="modal">ปิด</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="createTransferModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-info text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-exchange-alt me-2"></i> สร้างรายการโอนย้าย / ส่ง Shipping</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="formCreateTransfer" onsubmit="submitTransferRequest(event)">
                <div class="modal-body p-4 bg-light">
                    <input type="hidden" id="transItemId">
                    
                    <div class="bg-white p-3 rounded border shadow-sm mb-3">
                        <div class="text-muted small mb-1">รหัสวัตถุดิบ (Part No.)</div>
                        <h6 class="fw-bold text-primary mb-0" id="transItemNo">-</h6>
                        <div class="text-muted small mt-1 text-truncate" id="transItemDesc">-</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-secondary mb-1">เลือกแท็กอ้างอิง (Select Tag) - <span class="text-muted fw-normal">Optional</span></label>
                        <div id="transTagContainer" class="border border-secondary-subtle rounded shadow-sm p-2" style="max-height: 180px; overflow-y: auto; background-color: #fff;">
                            <div class="text-muted small">ระบุจำนวนเอง (Manual QTY)</div>
                        </div>
                        <div class="form-text small text-muted"><i class="fas fa-info-circle"></i> สามารถติ๊กเลือกแท็กได้หลายรายการพร้อมกัน (หากไม่ติ๊กเลย จะเป็นการระบุจำนวนเอง)</div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary mb-1">จากคลัง (From)</label>
                            <select id="transFromLoc" class="form-select border-secondary-subtle shadow-sm" required></select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary mb-1">ไปคลัง (To)</label>
                            <select id="transToLoc" class="form-select border-info fw-bold text-info shadow-sm" required></select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-secondary mb-1">จำนวน (QTY)</label>
                        <input type="number" id="transQty" class="form-control form-control-lg text-center fw-bold text-dark border-secondary-subtle shadow-sm" min="0.01" step="0.01" required placeholder="0">
                        <div class="form-text text-end mt-1" style="font-size: 0.75rem;">ยอดพร้อมใช้: <span id="transAvailQty" class="fw-bold text-success">0</span></div>
                    </div>

                    <div class="mb-2">
                        <label class="form-label small fw-bold text-secondary mb-1">หมายเหตุ / อ้างอิง</label>
                        <input type="text" id="transRemark" class="form-control border-secondary-subtle shadow-sm" placeholder="เช่น เลขบิล, ชื่อคนขับรถ...">
                    </div>
                </div>
                <div class="modal-footer bg-white border-top">
                    <button type="button" class="btn btn-secondary fw-bold shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-info text-white fw-bold px-4 shadow-sm" id="btnSubmitTransfer">
                        <i class="fas fa-paper-plane me-1"></i> ส่งคำขอโอนย้าย
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="confirmTransferModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-truck-loading me-2"></i>รายการรอโอนย้าย / เตรียมส่งออก</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-body-tertiary">
                
                <div class="bg-white p-2 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 sticky-top" style="z-index: 1020;">
                    <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                        <div class="input-group input-group-sm" style="width: auto; max-width: 220px;">
                            <span class="input-group-text bg-light text-secondary"><i class="fas fa-filter"></i></span>
                            <select id="pendingTypeFilter" class="form-select border-secondary-subtle fw-bold text-dark" onchange="loadPendingTransfers()">
                                <option value="ALL">ทั้งหมด (All)</option>
                                <option value="NORMAL" class="text-primary">โอนย้ายปกติ</option>
                                <option value="REPLACEMENT" class="text-danger">ชดเชยของเสีย</option>
                            </select>
                        </div>
                        <div class="input-group input-group-sm" style="width: auto; flex-grow: 1; max-width: 300px;">
                            <span class="input-group-text bg-light text-secondary"><i class="fas fa-search"></i></span>
                            <input type="text" id="pendingSearch" class="form-control border-secondary-subtle" placeholder="ค้นหา Part No., หมายเหตุ...">
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button id="btnBulkApprove" class="btn btn-sm btn-success fw-bold shadow-sm d-none" onclick="bulkProcessTransfer('COMPLETED')">
                            <i class="fas fa-check-double me-1"></i> อนุมัติที่เลือก (<span id="selectedCount">0</span>)
                        </button>
                        <button id="btnBulkReject" class="btn btn-sm btn-danger fw-bold shadow-sm d-none" onclick="bulkProcessTransfer('CANCELLED')">
                            <i class="fas fa-times me-1"></i> ปฏิเสธที่เลือก
                        </button>
                    </div>
                </div>

                <div class="table-responsive hide-scrollbar m-0" style="max-height: 60vh;">
                    <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr class="text-secondary">
                                <th class="text-center px-2" style="width: 40px;">
                                    <input class="form-check-input shadow-sm" type="checkbox" id="selectAllTransfers" onchange="toggleSelectAllTransfers(this)" style="transform: scale(1.2); cursor:pointer;">
                                </th>
                                <th class="px-2">วันที่-เวลา</th>
                                <th>Part No.</th>
                                <th>เส้นทาง (Route)</th>
                                <th class="text-end">จำนวน</th>
                                <th>ผู้ขอเบิก</th>
                                <th>หมายเหตุ</th>
                                <th class="text-center px-3"><i class="fas fa-cog"></i></th>
                            </tr>
                        </thead>
                        <tbody id="pendingTransferTbody">
                            <tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted me-2"></i>กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="d-flex flex-wrap justify-content-between align-items-center p-2 bg-white border-top rounded-bottom">
                    <small class="text-muted fw-bold" id="pendingPaginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                    <nav>
                        <ul class="pagination pagination-sm mb-0" id="pendingPaginationControls"></ul>
                    </nav>
                </div>

            </div>
        </div>
    </div>
</div>