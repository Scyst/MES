<div class="modal fade" id="detailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-search-location me-2"></i> พิกัดวัตถุดิบ (Locations)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-body-tertiary">
                <div class="p-3 bg-white border-bottom shadow-sm z-1 position-relative">
                    <h5 class="fw-bold text-primary mb-0" id="modalItemNo">-</h5>
                    <div class="text-muted small" id="modalItemDesc">-</div>
                </div>
                
                <div class="row g-0">
                    <div class="col-md-6 border-end bg-white">
                        <div class="p-2 bg-light border-bottom fw-bold text-success text-center shadow-sm"><i class="fas fa-check-circle me-1"></i> พร้อมใช้งาน (Available)</div>
                        <div class="table-responsive hide-scrollbar m-0" style="max-height: 40vh;">
                            <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                                <thead class="table-light sticky-top shadow-sm"><tr><th class="px-3">Location</th><th class="text-end px-3">QTY</th></tr></thead>
                                <tbody id="modalAvailTbody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-6 bg-white">
                        <div class="p-2 bg-light border-bottom fw-bold text-warning text-center shadow-sm"><i class="fas fa-truck me-1"></i> รอรับเข้า (Pending)</div>
                        <div class="table-responsive hide-scrollbar m-0" style="max-height: 40vh;">
                            <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                                <thead class="table-light sticky-top shadow-sm"><tr><th class="px-3">Pallet / CTN</th><th class="text-end px-3">QTY</th></tr></thead>
                                <tbody id="modalPendTbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-white border-top">
                <button type="button" class="btn btn-secondary fw-bold shadow-sm" data-bs-dismiss="modal">ปิด</button>
                <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="if(typeof traceModalInstance !== 'undefined') traceModalInstance.show();" data-bs-dismiss="modal">
                    <i class="fas fa-qrcode me-2"></i> สแกนเบิกจ่าย (Scanner)
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

<div class="modal fade" id="ccHistoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-info text-white">
                <h6 class="modal-title fw-bold"><i class="fas fa-history me-2"></i> ประวัติการปรับปรุงสต็อกย้อนหลัง</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-body-tertiary">
                <div class="table-responsive hide-scrollbar m-0" style="max-height: 60vh;">
                    <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr class="text-secondary">
                                <th class="px-3 d-none d-md-table-cell">เวลาที่อนุมัติ</th>
                                <th>Item No.</th>
                                <th>Location</th>
                                <th class="text-end d-none d-md-table-cell">System</th>
                                <th class="text-end">Actual</th>
                                <th class="text-end">Diff</th>
                                <th class="text-center">Status</th>
                                <th class="px-3 d-none d-lg-table-cell">คนนับ / คนอนุมัติ</th>
                            </tr>
                        </thead>
                        <tbody id="ccHistoryTbody">
                            <tr><td colspan="8" class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted me-2"></i>กำลังโหลด...</td></tr>
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