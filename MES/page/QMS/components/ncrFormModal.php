<div class="modal fade" id="ncrModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-fullscreen-md-down">
        <div class="modal-content border-0 shadow">
            
            <div class="modal-header bg-white border-bottom">
                <h5 class="modal-title fw-bold text-dark">
                    <i class="fas fa-camera text-primary me-2"></i> แจ้งปัญหา (New NCR)
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body bg-light p-3 p-md-4">
                <form id="formNCR" class="needs-validation" novalidate>
                    
                    <div class="card border-0 shadow-sm mb-3 rounded-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small text-secondary fw-bold">ลูกค้า (Customer) <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-lg fs-6" name="customer_name" required placeholder="ระบุชื่อลูกค้า...">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small text-secondary fw-bold">ไลน์ผลิต (Line) <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-lg fs-6" name="production_line" id="select_line" required>
                                        <option value="" selected disabled>-- กำลังโหลดข้อมูล --</option>
                                    </select>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small text-secondary fw-bold">ชื่อชิ้นงาน / Part No. <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-lg fs-6" name="product_name" list="item_list" required placeholder="ค้นหาสินค้า...">
                                    <datalist id="item_list"></datalist>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-secondary fw-bold">โมเดล (Model)</label>
                                    <input type="text" class="form-control form-control-lg fs-6" name="product_model" placeholder="Ex. Model X...">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3 rounded-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-12">
                                    <label class="form-label small text-secondary fw-bold">ประเภทของเสีย (Defect Type) <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-lg fs-6 text-danger fw-bold" name="defect_type" required>
                                        <option value="" selected disabled>-- ระบุอาการเสีย --</option>
                                        <option value="Scratch">รอยขีดข่วน (Scratch)</option>
                                        <option value="Dent">รอยบุบ (Dent)</option>
                                        <option value="Dimension">ขนาดไม่ได้ (Dimension)</option>
                                        <option value="Rust">สนิม (Rust)</option>
                                        <option value="Contamination">สิ่งปนเปื้อน (Contamination)</option>
                                        <option value="Others">อื่นๆ (Others)</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small text-secondary fw-bold">จำนวนที่พบ (Qty) <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control form-control-lg text-center fw-bold fs-5" name="defect_qty" required min="1" value="1">
                                </div>
                                <div class="col-12">
                                    <label class="form-label small text-secondary fw-bold">รายละเอียดเพิ่มเติม <span class="text-danger">*</span></label>
                                    <textarea class="form-control" name="defect_description" rows="3" required placeholder="อธิบายจุดที่พบปัญหา..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3 rounded-4">
                        <div class="card-body">
                            <label class="form-label small text-secondary fw-bold mb-2">ถ่ายรูปหน้างาน (Evidence) <span class="text-danger">*</span></label>
                            
                            <div class="photo-upload-box" id="uploadBox">
                                <i class="fas fa-camera fa-3x text-primary opacity-75 mb-2"></i>
                                <h6 class="fw-bold text-primary mb-1">แตะเพื่อถ่ายรูป หรือ เลือกรูปภาพ</h6>
                                <small class="text-muted">บังคับอัปโหลดอย่างน้อย 1 รูป</small>
                                <input type="file" id="ncrFileInput" name="ncr_images[]" multiple accept="image/*" capture="environment" required>
                            </div>
                            
                            <div id="imagePreviewContainer" class="preview-container"></div>
                        </div>
                    </div>

                    <div class="accordion mb-3" id="accordionExtra">
                        <div class="accordion-item border-0 shadow-sm rounded-4 overflow-hidden">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed bg-white text-secondary small fw-bold py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExtra">
                                    <i class="fas fa-cog me-2"></i> ข้อมูลเพิ่มเติมและผู้แจ้ง (Extra & Audit)
                                </button>
                            </h2>
                            <div id="collapseExtra" class="accordion-collapse collapse bg-light">
                                <div class="accordion-body">
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <label class="form-label small text-secondary">วันที่ผลิต</label>
                                            <input type="date" class="form-control form-control-sm" name="production_date" value="<?php echo date('Y-m-d'); ?>">
                                        </div>
                                        <div class="col-6">
                                            <label class="form-label small text-secondary">กะ (Shift)</label>
                                            <select class="form-select form-select-sm" name="found_shift">
                                                <option value="Day">Day</option>
                                                <option value="Night">Night</option>
                                            </select>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label small text-secondary">Lot No.</label>
                                            <input type="text" class="form-control form-control-sm" name="lot_no" placeholder="ระบุ Lot No (ถ้ามี)...">
                                        </div>
                                        
                                        <div class="col-12 mt-3 pt-3 border-top border-secondary border-opacity-25">
                                            <label class="form-label small text-primary fw-bold"><i class="fas fa-user-edit me-1"></i> ชื่อผู้แจ้งบนเอกสาร (Issuer)</label>
                                            <input type="text" class="form-control form-control-sm border-primary bg-primary bg-opacity-10 fw-bold" name="issue_by_name" required value="<?php echo $_SESSION['user']['username'] ?? ''; ?>">
                                            <div class="form-text small text-muted">แก้ไขได้หากคุณกำลังแจ้งเรื่องแทนผู้อื่น</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
            
            <div class="modal-footer bg-white border-top p-3 d-flex flex-nowrap gap-2">
                <button type="button" class="btn btn-light border fw-bold w-25" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" form="formNCR" class="btn btn-primary fw-bold w-75 shadow-sm fs-5" id="btnSaveNCR">
                    <i class="fas fa-paper-plane me-2"></i> ส่งข้อมูล
                </button>
            </div>
        </div>
    </div>
</div>