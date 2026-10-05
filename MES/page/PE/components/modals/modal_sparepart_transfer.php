<!-- modal_sparepart_transfer.php — Spare Part Location Transfer -->
<div class="modal fade pe-modal" id="spTransferModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-exchange-alt text-primary me-1"></i> ย้ายคลังอะไหล่ (Transfer)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-lg-5">
                        <div class="card shadow-sm h-100 border-0" style="background:#f8f9fa;">
                            <div class="card-body">
                                <h6 class="text-primary mb-3"><i class="fas fa-plus-circle me-1"></i> เพิ่มรายการย้าย</h6>
                                <div class="mb-3">
                                    <label class="pe-form-label" for="spTrItemInput">อะไหล่ <span class="pe-text-danger">*</span></label>
                                    <input type="text" class="pe-form-input" id="spTrItemInput" list="spTrItemList" placeholder="พิมพ์เพื่อค้นหาอะไหล่" onchange="SparePartsModule.onTransferItemInput()" autocomplete="off">
                                    <datalist id="spTrItemList"></datalist>
                                    <input type="hidden" id="spTrItem">
                                </div>
                                <div class="mb-3">
                                    <label class="pe-form-label" for="spTrFrom">คลังต้นทาง <span class="pe-text-danger">*</span></label>
                                    <select class="pe-form-input" id="spTrFrom">
                                        <option value="">-- เลือกคลังต้นทาง --</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="pe-form-label" for="spTrTo">คลังปลายทาง <span class="pe-text-danger">*</span></label>
                                    <select class="pe-form-input" id="spTrTo">
                                        <option value="">-- เลือกคลังปลายทาง --</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="pe-form-label" for="spTrQty">จำนวน <span class="pe-text-danger">*</span></label>
                                    <input type="number" class="pe-form-input" id="spTrQty" min="1" step="1" inputmode="numeric" style="min-height:44px;">
                                </div>
                                <button type="button" class="pe-btn pe-btn-primary w-100" style="min-height:44px;" onclick="SparePartsModule.addTransferLine()">
                                    <i class="fas fa-arrow-right me-1"></i> เพิ่มในรายการ
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-7">
                        <div class="card shadow-sm h-100 border-0">
                            <div class="card-body d-flex flex-column">
                                <h6 class="text-primary mb-3"><i class="fas fa-list me-1"></i> รายการย้ายคลัง <span class="badge bg-secondary ms-2" id="spTrCount">0</span></h6>
                                <div class="table-responsive flex-grow-1" style="max-height: 280px; overflow-y: auto;">
                                    <table class="table pe-table pe-table-sm align-middle">
                                        <thead>
                                            <tr>
                                                <th>อะไหล่</th>
                                                <th>ต้นทาง</th>
                                                <th>ปลายทาง</th>
                                                <th class="text-end">จำนวน</th>
                                                <th class="text-center" style="width:50px;"></th>
                                            </tr>
                                        </thead>
                                        <tbody id="spTrBody">
                                            <tr><td colspan="5" class="text-center text-muted py-4">ยังไม่มีรายการ</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <hr>
                                <label class="pe-form-label fw-bold" for="spTrNotes">หมายเหตุ</label>
                                <textarea class="pe-form-input" id="spTrNotes" rows="2" maxlength="400" placeholder="เหตุผลในการย้ายคลัง"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="pe-btn pe-btn-success" id="spTrSaveBtn" onclick="SparePartsModule.submitTransfer()">
                    <i class="fas fa-check-circle me-1"></i> ยืนยันการย้ายคลัง
                </button>
            </div>
        </div>
    </div>
</div>
