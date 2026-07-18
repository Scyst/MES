<div class="modal fade" id="modalMtAdjust" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form id="formMtAdjust" class="modal-content border-0 shadow-lg border-start border-5 border-warning">
            <div class="modal-header bg-light">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-sliders-h text-warning me-2"></i>ปรับปรุงยอดสต๊อก (Stock Take)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="alert alert-warning border-0 small">
                    <i class="fas fa-info-circle me-1"></i> <b>วิธีการ:</b> เลือกอะไหล่ แล้วระบุจำนวนที่ <b>"นับได้จริง"</b> ณ ปัจจุบัน
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">เลือกอะไหล่ <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="adj_hidden_item_id">
                    <input class="form-control border-0 bg-light fw-bold" list="adjItemOptions" id="adj_item_input" placeholder="-- พิมพ์รหัสหรือชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="adjItemOptions"></datalist>
                    <div id="adj_onhand_hint" class="form-text text-end mt-1">ยอดปัจจุบันในระบบ: <span class="fw-bold text-primary">-</span></div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">คลังที่ต้องการปรับ <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select border-0 bg-light" required>
                        <option value="">-- เลือกสถานที่เก็บ --</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">ยอดที่นับได้จริง (Actual Count) <span class="text-danger">*</span></label>
                    <div class="input-group">
                        <input type="number" id="adj_actual_qty" class="form-control border-0 bg-light fw-bold text-primary fs-5" step="0.01" required placeholder="ใส่จำนวนที่นับได้...">
                        <span class="input-group-text bg-light border-0 part-uom text-muted small">Unit</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 px-1">
                        <span class="small text-muted">ส่วนต่างที่จะถูกปรับ (Diff):</span>
                        <span id="adj_diff_value" class="fw-bold fs-6">-</span>
                    </div>
                    <input type="hidden" name="quantity" id="adj_final_diff">
                </div>

                <div class="mb-0">
                    <label class="form-label fw-bold small text-muted">เหตุผลการปรับปรุง <span class="text-danger">*</span></label>
                    <textarea name="notes" class="form-control border-0 bg-light" rows="2" placeholder="เช่น นับสต๊อกประจำเดือน, ของชำรุด..." required></textarea>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-warning px-4 fw-bold">ยืนยันการปรับยอด</button>
            </div>
        </form>
    </div>
</div>