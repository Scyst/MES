<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
            
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-shipping-fast me-2"></i>Shipping Schedule Guide</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body p-4">
                
                <div class="alert alert-success bg-success bg-opacity-10 border-0 mb-4">
                    <h6 class="fw-bold text-success mb-2"><i class="fas fa-file-excel me-2"></i>การนำเข้าไฟล์ Excel (Shipping Data)</h6>
                    <p class="small text-muted mb-0">
                        ระบบรองรับการ Import เพื่ออัปเดตข้อมูลตู้คอนเทนเนอร์ โดยใช้ <strong>PO Number</strong> เป็นหลัก<br>
                        คอลัมน์สำคัญที่ควรรู้:
                    </p>
                    <div class="table-responsive mt-2">
                        <table class="table table-sm table-bordered bg-white small mb-0">
                            <thead class="table-light">
                                <tr><th>Excel Column</th><th>System Field</th><th>ตัวอย่างข้อมูล</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>PO Number</td><td>po_number</td><td>38001-xxxxxxx (จำเป็นต้องมี)</td></tr>
                                <tr><td>Container No</td><td>container_no</td><td>TCLU1234567</td></tr>
                                <tr><td>Booking No</td><td>booking_no</td><td>BK-2026-001</td></tr>
                                <tr><td>ETD</td><td>etd</td><td>25/12/2026</td></tr>
                                <tr><td>Load Time</td><td>load_time</td><td>13:30 (หรือ 0.56)</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h6 class="fw-bold text-success mb-3 border-bottom pb-2"><i class="fas fa-traffic-light me-2"></i>สถานะและการแจ้งเตือน</h6>
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-danger me-2">Late</span>
                            <span class="small text-muted">เลยกำหนดโหลดตู้ (Load Date < วันนี้)</span>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-warning text-dark me-2">Urgent</span>
                            <span class="small text-muted">เหลือเวลาโหลด < 3 วัน</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-check-circle text-success fa-lg me-2"></i>
                            <span class="small text-muted"><strong>Confirmed:</strong> งานเสร็จสมบูรณ์ (ซ่อนจากหน้า Active)</span>
                        </div>
                    </div>
                </div>

                <div class="mt-3 p-3 bg-light rounded">
                    <small class="text-secondary">
                        <i class="fas fa-lightbulb text-warning me-1"></i> <strong>Tip:</strong> 
                        คุณสามารถแก้ไขข้อมูลวันเวลาในตารางได้โดยตรง (Inline Edit) และระบบจะคำนวณสถานะใหม่ให้ทันที
                    </small>
                </div>

            </div>
            
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-secondary btn-sm px-4" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>