<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow rounded-4">
            
            <div class="modal-header border-0 pb-0 pt-4 px-4 bg-white">
                <div class="d-flex align-items-center w-100">
                    <div class="rounded-circle bg-info bg-opacity-10 d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                        <i class="fas fa-book-reader text-info fs-4"></i>
                    </div>
                    <div>
                        <h5 class="modal-title fw-bold text-dark mb-0" style="letter-spacing: -0.5px;">คู่มือการใช้งาน</h5>
                        <p class="text-muted small mb-0">Sales Order Tracking Guide</p>
                    </div>
                    <button type="button" class="btn-close ms-auto" data-bs-dismiss="modal"></button>
                </div>
            </div>

            <div class="modal-body p-4 bg-white">
                
                <div class="row g-4 mb-4">
                    <div class="col-md-6">
                        <div class="p-3 rounded-3 border border-light bg-light bg-opacity-50 h-100">
                            <div class="d-flex align-items-center mb-2">
                                <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                                    <i class="fas fa-search text-primary"></i>
                                </div>
                                <h6 class="fw-bold text-dark mb-0">1. ค้นหาอัจฉริยะ</h6>
                            </div>
                            <p class="text-secondary small mb-2">พิมพ์คำค้นหลายคำเว้นวรรคเพื่อกรองข้อมูลแบบละเอียด (AND Logic)</p>
                            <div class="bg-white border rounded px-2 py-1 small text-muted font-monospace">
                                <i class="fas fa-keyboard me-1"></i> Red Chicago Wait
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="p-3 rounded-3 border border-light bg-light bg-opacity-50 h-100">
                            <div class="d-flex align-items-center mb-2">
                                <div class="bg-success bg-opacity-10 rounded-circle p-2 me-2">
                                    <i class="fas fa-edit text-success"></i>
                                </div>
                                <h6 class="fw-bold text-dark mb-0">2. แก้ไขข้อมูลไว</h6>
                            </div>
                            <ul class="text-secondary small mb-0 ps-3">
                                <li class="mb-1"><strong>ดับเบิลคลิก</strong> ที่ช่องข้อมูลเพื่อแก้ไขทันที</li>
                                <li><strong>ติ๊กถูก</strong> เพื่อเปลี่ยนสถานะงาน (ระบบลงเวลาให้เอง)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <hr class="border-light">

                <div class="row g-4">
                    <div class="col-md-12">
                        <div class="d-flex">
                            <div class="bg-warning bg-opacity-10 rounded-circle p-3 me-3 flex-shrink-0" style="width: 50px; height: 50px; display:flex; align-items:center; justify-content:center;">
                                <i class="fas fa-file-import text-dark"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold text-dark mb-1">3. การนำเข้าไฟล์ (Import Excel)</h6>
                                <p class="text-secondary small mb-2">ระบบใช้ <b>PO Number + SKU</b> เป็นกุญแจในการตรวจสอบข้อมูล:</p>
                                <div class="d-flex gap-3 small">
                                    <div class="d-flex align-items-center text-success">
                                        <i class="fas fa-check-circle me-2"></i> เจอของเดิม = อัปเดต
                                    </div>
                                    <div class="d-flex align-items-center text-primary">
                                        <i class="fas fa-plus-circle me-2"></i> ไม่เจอ = เพิ่มใหม่
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-12">
                        <div class="alert alert-danger bg-opacity-10 border-0 d-flex align-items-start rounded-3 mb-0">
                            <i class="fas fa-tag text-danger fs-5 me-3 mt-1"></i>
                            <div>
                                <h6 class="fw-bold text-danger mb-1">ทำไมราคาเป็น $0.00 ?</h6>
                                <p class="small text-secondary mb-0">
                                    แสดงว่า <b>SKU</b> นี้ยังไม่มีในฐานข้อมูลหลัก ให้ไปเพิ่มที่เมนู <a href="#" class="fw-bold text-danger text-decoration-none">System Settings > Item Master</a> ระบบจะดึงราคามาแสดงอัตโนมัติ
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
            <div class="modal-footer border-0 pt-0 pb-4 px-4 bg-white">
                <button type="button" class="btn btn-light text-muted w-100 rounded-pill" data-bs-dismiss="modal">เข้าใจแล้ว (Close)</button>
            </div>
        </div>
    </div>
</div>