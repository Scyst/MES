<div class="modal fade" id="detailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-search-location me-2"></i> พิกัดวัตถุดิบ (Locations)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="p-3 bg-light border-bottom">
                    <h4 class="fw-bold text-primary mb-0" id="modalItemNo">-</h4>
                    <div class="text-muted small" id="modalItemDesc">-</div>
                </div>
                
                <div class="row g-0">
                    <div class="col-md-6 p-3 border-end">
                        <h6 class="fw-bold text-success mb-3"><i class="fas fa-check-circle me-1"></i> พร้อมใช้งาน (Available)</h6>
                        <table class="table table-sm table-bordered text-nowrap">
                            <thead class="table-light"><tr><th>Location</th><th class="text-end">QTY</th></tr></thead>
                            <tbody id="modalAvailTbody"></tbody>
                        </table>
                    </div>
                    <div class="col-md-6 p-3">
                        <h6 class="fw-bold text-warning mb-3"><i class="fas fa-truck me-1"></i> รอรับเข้า (Pending)</h6>
                        <table class="table table-sm table-bordered text-nowrap">
                            <thead class="table-light"><tr><th>Pallet / CTN</th><th class="text-end">QTY</th></tr></thead>
                            <tbody id="modalPendTbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-white border-top">
                <button type="button" class="btn btn-secondary fw-bold" data-bs-dismiss="modal">ปิด</button>
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
                <h5 class="modal-title fw-bold"><i class="fas fa-clipboard-list me-2"></i> ปรับปรุง/นับสต็อก (Cycle Count)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="cycleCountForm" onsubmit="submitCycleCount(event)">
                <div class="modal-body p-4 bg-light">
                    <div class="mb-3">
                        <h5 class="fw-bold text-primary mb-1" id="ccItemNo">-</h5>
                        <div class="text-muted small" id="ccItemDesc">-</div>
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
                    <button type="button" class="btn btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4" id="btnSubmitCC"><i class="fas fa-paper-plane me-1"></i> ส่งคำขอปรับยอด</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="approvalModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg bg-body-tertiary">
            <div class="modal-header bg-warning">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check me-2"></i> รายการรออนุมัติปรับยอดสต็อก</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 text-nowrap">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr>
                                <th class="d-none d-md-table-cell">Date</th>
                                <th>Item No.</th>
                                <th>Location</th>
                                <th class="text-end d-none d-md-table-cell">System QTY</th>
                                <th class="text-end text-primary">Actual QTY</th>
                                <th class="text-end">Diff</th>
                                <th class="d-none d-lg-table-cell">Remark</th>
                                <th class="d-none d-md-table-cell">Counter</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="approvalTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="ccHistoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg bg-body-tertiary">
            <div class="modal-header bg-info text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-history me-2"></i> ประวัติการปรับปรุงสต็อกย้อนหลัง</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr>
                                <th class="d-none d-md-table-cell">เวลาที่อนุมัติ</th>
                                <th>Item No.</th>
                                <th>Location</th>
                                <th class="text-end d-none d-md-table-cell">System</th>
                                <th class="text-end">Actual</th>
                                <th class="text-end">Diff</th>
                                <th class="text-center">Status</th>
                                <th class="d-none d-lg-table-cell">คนนับ / คนอนุมัติ</th>
                            </tr>
                        </thead>
                        <tbody id="ccHistoryTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>