<div class="modal fade" id="ncrModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <form id="formNCR" novalidate>
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title"><i class="fas fa-exclamation-triangle me-2"></i>แจ้งปัญหาคุณภาพ (Create NCR)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                
                <div class="modal-body">
                    <h6 class="text-danger border-bottom pb-2 mb-3">1. พบปัญหาที่ไหน (Product Info)</h6>
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label">ลูกค้า (Customer) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="customer_name" required placeholder="ระบุชื่อลูกค้า...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">ชื่อชิ้นงาน (Part Name/No.) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="product_name" required placeholder="ระบุชื่อสินค้า...">
                        </div>
                    </div>

                    <h6 class="text-danger border-bottom pb-2 mb-3 mt-4">2. อาการเสีย (Defect Details)</h6>
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label">ประเภทของเสีย (Defect Type)</label>
                            <select class="form-select" name="defect_type" required>
                                <option value="" selected disabled>-- เลือกอาการ --</option>
                                <option value="Scratch">รอยขีดข่วน (Scratch)</option>
                                <option value="Dent">รอยบุบ (Dent)</option>
                                <option value="Dimension">ขนาดไม่ได้ (Dimension)</option>
                                <option value="Rust">สนิม (Rust)</option>
                                <option value="Contamination">สิ่งปนเปื้อน (Contamination)</option>
                                <option value="Others">อื่นๆ (Others)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">จำนวนที่พบ (Qty)</label>
                            <input type="number" class="form-control" name="defect_qty" value="0" min="0">
                        </div>
                        <div class="col-12">
                            <label class="form-label">รายละเอียดเพิ่มเติม (Description)</label>
                            <textarea class="form-control" name="defect_description" rows="2" placeholder="อธิบายลักษณะปัญหา..."></textarea>
                        </div>
                    </div>

                    <h6 class="text-danger border-bottom pb-2 mb-3 mt-4">3. ข้อมูลการผลิต (Traceability)</h6>
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label class="form-label">วันที่ผลิต (Prod Date)</label>
                            <input type="date" class="form-control" name="production_date" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Lot No.</label>
                            <input type="text" class="form-control" name="lot_no" placeholder="ถ้ามี...">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">กะ (Shift)</label>
                            <select class="form-select" name="found_shift">
                                <option value="Day">Day (กลางวัน)</option>
                                <option value="Night">Night (กลางคืน)</option>
                            </select>
                        </div>
                    </div>

                    <div class="bg-light p-3 rounded mt-4 border border-danger border-opacity-25">
                        <label class="form-label fw-bold"><i class="fas fa-camera me-2"></i>รูปภาพหลักฐาน (Evidence)</label>
                        <input type="file" class="form-control" name="ncr_images[]" multiple accept="image/*">
                        <div class="form-text text-muted">ถ่ายรูปจุดที่เสียให้ชัดเจน (เลือกได้หลายรูป)</div>
                    </div>
                </div>

                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-danger" id="btnSaveNCR">
                        <i class="fas fa-save me-1"></i> บันทึกแจ้ง QC
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>