<div class="modal fade" id="ncrModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-fullscreen-lg-down custom-modal-width">
        <div class="modal-content">
            
            <div class="modal-header bg-primary text-white align-items-center">
                <h5 class="modal-title fw-bold mb-0 d-flex align-items-center">
                    <i class="fas fa-exclamation-circle me-2"></i>แจ้งพบปัญหาคุณภาพ (New NCR)
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body bg-light">
                <form id="formNCR" class="needs-validation" novalidate>
                    <div class="row">
                        
                        <div class="col-lg-6 mb-3 d-flex flex-column gap-3">
                            
                            <div class="card shadow-sm border-0">
                                <div class="card-header bg-white fw-bold">
                                    <i class="fas fa-cube text-primary me-2"></i>ข้อมูลการผลิตและผลิตภัณฑ์
                                </div>
                                <div class="card-body pb-2">
                                    <div class="row">
                                        <div class="col-md-4 mb-2">  
                                            <label class="form-label small fw-bold">ไลน์ผลิต (Line) <span class="text-danger">*</span></label>
                                            <select class="form-select form-select-sm" name="production_line" id="select_line" required>
                                                <option value="" selected disabled>-- โหลดข้อมูล... --</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <label class="form-label small fw-bold">วันที่ผลิต (Prod. Date)</label>
                                            <input type="date" class="form-control form-control-sm" name="production_date" value="<?php echo date('Y-m-d'); ?>">
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <label class="form-label small fw-bold">กะ (Shift)</label>
                                            <select class="form-select form-select-sm" name="found_shift">
                                                <option value="Day">Day</option>
                                                <option value="Night">Night</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold">ลูกค้า (Customer) <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-sm" name="customer_name" list="customer_list" required placeholder="ระบุชื่อลูกค้า...">
                                            <datalist id="customer_list"></datalist>
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold">ชื่อชิ้นงาน / Part No. <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-sm" name="product_name" list="item_list" required placeholder="ค้นหาสินค้า...">
                                            <datalist id="item_list"></datalist>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold text-muted">โมเดล (Model)</label>
                                            <input type="text" class="form-control form-control-sm bg-light" name="product_model" placeholder="Ex. Model X...">
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold text-muted">Lot No.</label>
                                            <input type="text" class="form-control form-control-sm bg-light" name="lot_no" placeholder="ระบุ Lot No (ถ้ามี)...">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card shadow-sm border-0 flex-grow-1">
                                <div class="card-header bg-white fw-bold">
                                    <i class="fas fa-user-shield text-success me-2"></i>การจัดการเบื้องต้น & ข้อมูลผู้แจ้ง
                                </div>
                                <div class="card-body pb-2">
                                    
                                    <div class="row">
                                        <div class="col-md-4 mb-2">
                                            <label class="form-label small fw-bold">การจัดการเบื้องต้น</label>
                                            <select class="form-select form-select-sm border-warning" name="prelim_disposition">
                                                <option value="">-- ไม่ระบุ --</option>
                                                <option value="Rework">Rework (ซ่อม/แก้ไข)</option>
                                                <option value="Scrap">Scrap (ทำลายทิ้ง)</option>
                                                <option value="Sort">Sort (คัดแยก)</option>
                                                <option value="Hold">Hold (ระงับใช้งาน)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-8 mb-2">
                                            <label class="form-label small fw-bold">หมายเหตุการจัดการ</label>
                                            <input type="text" class="form-control form-control-sm border-warning" name="prelim_remark" placeholder="รายละเอียดเพิ่มเติม...">
                                        </div>
                                    </div>

                                    <div class="col-12"><hr class="my-2 border-secondary border-opacity-25"></div>

                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold">แหล่งที่พบปัญหา</label>
                                            <select class="form-select form-select-sm" name="found_by_type">
                                                <option value="">-- ไม่ระบุ --</option>
                                                <option value="Customer">Customer (ลูกค้า)</option>
                                                <option value="QC">QC (ฝ่ายตรวจสอบคุณภาพ)</option>
                                                <option value="Maintenance">Maintenance (ซ่อมบำรุง)</option>
                                                <option value="Other">Other (อื่นๆ)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label small fw-bold text-muted">Invoice No. (ถ้ามี)</label>
                                            <input type="text" class="form-control form-control-sm bg-light" name="invoice_no" placeholder="อ้างอิง...">
                                        </div>
                                    </div>

                                    <div class="row bg-primary bg-opacity-10 p-2 mx-0 rounded">
                                        <div class="col-md-6 mb-1">
                                            <label class="form-label small fw-bold text-primary mb-1">ชื่อผู้แจ้ง <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control form-control-sm border-primary fw-bold" name="issue_by_name" required value="<?php echo $_SESSION['user']['username'] ?? ''; ?>">
                                        </div>
                                        <div class="col-md-6 mb-1">
                                            <label class="form-label small fw-bold text-primary mb-1">ตำแหน่ง</label>
                                            <input type="text" class="form-control form-control-sm border-primary" name="issuer_position" placeholder="เช่น QC Inspector...">
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="col-lg-6 mb-3 d-flex flex-column">
                            <div class="card shadow-sm border-0 h-100">
                                <div class="card-header bg-white fw-bold">
                                    <i class="fas fa-search text-danger me-2"></i>รายละเอียดปัญหาและหลักฐาน
                                </div>
                                <div class="card-body d-flex flex-column pb-2">
                                    
                                    <div class="row">
                                        <div class="col-md-8 mb-2">
                                            <label class="form-label small fw-bold">ประเภทของเสีย (Defect Type) <span class="text-danger">*</span></label>
                                            <select class="form-select form-select-sm text-danger fw-bold border-danger" name="defect_type" required>
                                                <option value="" selected disabled>-- ระบุอาการเสีย --</option>
                                                <option value="Scratch">รอยขีดข่วน (Scratch)</option>
                                                <option value="Dent">รอยบุบ (Dent)</option>
                                                <option value="Dimension">ขนาดไม่ได้ (Dimension)</option>
                                                <option value="Rust">สนิม (Rust)</option>
                                                <option value="Contamination">สิ่งปนเปื้อน (Contamination)</option>
                                                <option value="Others">อื่นๆ (Others)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <label class="form-label small fw-bold">จำนวนที่พบ (Qty) <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control form-control-sm text-center fw-bold text-danger border-danger" name="defect_qty" required min="0.0001" step="any" value="1">
                                        </div>
                                    </div>

                                    <div class="mb-2">
                                        <label class="form-label small fw-bold">รายละเอียดเพิ่มเติม <span class="text-danger">*</span></label>
                                        <textarea class="form-control form-control-sm" name="defect_description" rows="3" required placeholder="อธิบายจุดที่พบปัญหา ตำแหน่งที่เกิดเหตุ..."></textarea>
                                    </div>
                                    
                                    <div class="flex-grow-1 mt-2">
                                        <label class="form-label small fw-bold mb-1">ถ่ายรูปหน้างาน (Evidence) <span class="text-danger">*</span></label>
                                        <div class="photo-upload-box h-100 d-flex flex-column align-items-center justify-content-center" id="uploadBox" style="min-height: 150px;">
                                            <i class="fas fa-camera fa-2x text-primary opacity-75 mb-2"></i>
                                            <h6 class="fw-bold text-primary mb-1">แตะเพื่อถ่ายรูป หรือ เลือกรูปภาพ</h6>
                                            <small class="text-muted">บังคับอัปโหลดอย่างน้อย 1 รูป (ไม่เกิน 5MB)</small>
                                            <input type="file" id="ncrFileInput" name="ncr_images[]" multiple accept="image/*" capture="environment" required>
                                        </div>
                                    </div>
                                    
                                    <div id="imagePreviewContainer" class="preview-container"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            
            <div class="modal-footer bg-white">
                <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" form="formNCR" class="btn btn-primary rounded-pill px-4 fw-bold" id="btnSaveNCR">
                    <i class="fas fa-paper-plane me-2"></i>สร้างใบแจ้งปัญหา (NCR)
                </button>
            </div>

        </div>
    </div>
</div>