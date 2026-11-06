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

<!-- Stock Adjustment Modal (ปรับปรุงยอดสต๊อก / แก้ไขรับเข้าผิด) -->
<div class="modal fade pe-modal" id="spAdjustModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 560px;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-sliders-h text-warning me-2"></i>ปรับปรุงยอดสต๊อกอะไหล่ (Stock Adjustment)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-warning py-2 px-3 mb-3 pe-text-sm" style="border-left: 4px solid #d97706;">
                    <i class="fas fa-info-circle me-1"></i> ใช้สำหรับปรับลดยอดที่คีย์รับเข้าผิด หรือปรับยอดตามการตรวจนับจริง <b>โดยไม่นับเป็นการเบิกใช้งาน (Issue) และไม่คิดเป็นงบซ่อมบำรุง</b>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label" for="spAdjItemInput">อะไหล่ <span class="pe-text-danger">*</span></label>
                    <input type="text" class="pe-form-input" id="spAdjItemInput" list="spAdjItemList" placeholder="พิมพ์เพื่อค้นหาอะไหล่" onchange="SparePartsModule.onAdjustItemInput()" autocomplete="off">
                    <datalist id="spAdjItemList"></datalist>
                    <input type="hidden" id="spAdjItem">
                </div>

                <div class="mb-3">
                    <label class="pe-form-label" for="spAdjLocation">คลังจัดเก็บ <span class="pe-text-danger">*</span></label>
                    <select class="pe-form-input" id="spAdjLocation" onchange="SparePartsModule.updateAdjustPreview()">
                        <option value="">-- เลือกคลังจัดเก็บ --</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label">รูปแบบการปรับปรุงยอด <span class="pe-text-danger">*</span></label>
                    <div class="btn-group w-100" role="group" aria-label="รูปแบบการปรับปรุงยอด">
                        <input type="radio" class="btn-check" name="spAdjMode" id="spAdjModeDeduct" value="DEDUCT" checked onchange="SparePartsModule.onAdjustModeChange()">
                        <label class="btn btn-outline-danger py-2" for="spAdjModeDeduct"><i class="fas fa-minus-circle me-1"></i>หักลด (รับเข้าผิด)</label>

                        <input type="radio" class="btn-check" name="spAdjMode" id="spAdjModeExact" value="SET_EXACT" onchange="SparePartsModule.onAdjustModeChange()">
                        <label class="btn btn-outline-primary py-2" for="spAdjModeExact"><i class="fas fa-equals me-1"></i>ตั้งยอดตามนับจริง</label>

                        <input type="radio" class="btn-check" name="spAdjMode" id="spAdjModeAdd" value="ADD" onchange="SparePartsModule.onAdjustModeChange()">
                        <label class="btn btn-outline-success py-2" for="spAdjModeAdd"><i class="fas fa-plus-circle me-1"></i>ปรับเพิ่ม</label>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label" id="spAdjQtyLabel" for="spAdjQty">จำนวนที่ต้องการหักลด <span class="pe-text-danger">*</span></label>
                    <input type="number" class="pe-form-input" id="spAdjQty" min="0" step="1" inputmode="numeric" style="min-height:44px;" placeholder="ระบุจำนวน" oninput="SparePartsModule.updateAdjustPreview()">
                </div>

                <div class="p-3 rounded mb-3" style="background: #f8f9fa; border: 1px solid #dee2e6;">
                    <div class="d-flex justify-content-between align-items-center mb-1 pe-text-sm">
                        <span class="text-muted">สต๊อกคงเหลือปัจจุบัน:</span>
                        <span class="fw-bold" id="spAdjCurrentQty">0</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-1 pe-text-sm">
                        <span class="text-muted">ยอดที่ปรับปรุง:</span>
                        <span class="fw-bold" id="spAdjDeltaQty">0</span>
                    </div>
                    <hr class="my-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold">สต๊อกคงเหลือหลังปรับปรุง:</span>
                        <span class="fs-5 fw-bold text-primary" id="spAdjNewQty">0</span>
                    </div>
                </div>

                <div class="mb-2">
                    <label class="pe-form-label" for="spAdjReason">สาเหตุการปรับปรุงสต๊อก <span class="pe-text-danger">*</span></label>
                    <div class="d-flex flex-wrap gap-1 mb-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="SparePartsModule.setAdjustReason('คีย์รับเข้าผิดรายการ / ผิดจำนวน')">คีย์รับเข้าผิดรายการ/จำนวน</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="SparePartsModule.setAdjustReason('ปรับยอดตามการตรวจนับสต๊อกจริง')">ตรวจนับสต๊อกจริง</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="SparePartsModule.setAdjustReason('อะไหล่ชำรุด / เสื่อมสภาพ')">อะไหล่ชำรุด</button>
                    </div>
                    <textarea class="pe-form-input" id="spAdjReason" rows="2" maxlength="400" placeholder="ระบุสาเหตุการปรับปรุงสต๊อก (จำเป็นต้องระบุ)"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="pe-btn pe-btn-primary" id="spAdjSaveBtn" style="background:#d97706;border-color:#d97706;min-height:44px;" onclick="SparePartsModule.submitAdjustStock()">
                    <i class="fas fa-check-circle me-1"></i> ยืนยันการปรับปรุงสต๊อก
                </button>
            </div>
        </div>
    </div>
</div>
