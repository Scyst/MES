<div class="modal fade" id="modalMtItem" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <form id="formMtItem" class="modal-content border-0 shadow-lg border-top border-5 border-primary">
            <div class="modal-header bg-light">
                <h5 class="modal-title fw-bold text-primary"><i class="fas fa-cog me-2"></i>จัดการข้อมูลอะไหล่ (Item Master)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <input type="hidden" name="item_id" id="mt_item_id">
                
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label fw-bold small text-muted mb-1">รหัสอะไหล่ (Item Code) <span class="text-danger">*</span></label>
                        <input type="text" name="item_code" id="mt_item_code" class="form-control fw-bold" required placeholder="เช่น SP-MTR-001">
                    </div>
                    <div class="col-md-8">
                        <label class="form-label fw-bold small text-muted mb-1">ชื่ออะไหล่ (Item Name) <span class="text-danger">*</span></label>
                        <input type="text" name="item_name" id="mt_item_name" class="form-control" required placeholder="เช่น มอเตอร์ 2HP 3-Phase">
                    </div>
                    
                    <div class="col-md-12">
                        <label class="form-label fw-bold small text-muted mb-1">รายละเอียดเพิ่มเติม / สเปค (Description)</label>
                        <input type="text" name="description" id="mt_description" class="form-control" placeholder="เช่น รุ่น, แบรนด์, ขนาด">
                    </div>

                    <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted mb-1">ผู้ผลิต/ผู้จัดจำหน่าย (Supplier)</label>
                        <input type="text" name="supplier" id="mt_supplier" class="form-control">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold small text-muted mb-1">ราคาประเมิน (฿)</label>
                        <input type="number" name="unit_price" id="mt_unit_price" class="form-control" step="0.01" min="0" value="0">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold small text-muted mb-1">หน่วยนับ (UOM) <span class="text-danger">*</span></label>
                        <select name="uom" id="mt_uom" class="form-select fw-bold" required>
                            <option value="PCS">PCS (ชิ้น/ตัว)</option>
                            <option value="SET">SET (ชุด)</option>
                            <option value="M">m (เมตร)</option>
                            <option value="KG">kg (กิโลกรัม)</option>
                            <option value="LITER">L (ลิตร)</option>
                            <option value="ROLL">ROLL (ม้วน)</option>
                            <option value="BOX">BOX (กล่อง)</option>
                            <option value="PACK">PACK (แพ็ค)</option>
                            <option value="BOTTLE">BOTTLE (ขวด)</option>
                            <option value="CAN">CAN (กระป๋อง)</option>
                            <option value="TUBE">TUBE (หลอด)</option>
                        </select>
                    </div>

                    <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted mb-1">จุดสั่งซื้อ (Min Stock)</label>
                        <input type="number" name="min_stock" id="mt_min_stock" class="form-control text-danger fw-bold" step="0.01" min="0" value="0">
                        <small class="form-text text-muted">ระบบจะเตือนเมื่อยอดน้อยกว่าหรือเท่ากับค่านี้</small>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted mb-1">จุดเก็บสูงสุด (Max Stock)</label>
                        <input type="number" name="max_stock" id="mt_max_stock" class="form-control text-success fw-bold" step="0.01" min="0" value="0">
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-primary px-4 fw-bold"><i class="fas fa-save me-1"></i> บันทึกข้อมูล</button>
            </div>
        </form>
    </div>
</div>