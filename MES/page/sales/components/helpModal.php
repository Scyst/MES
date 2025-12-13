<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="far fa-question-circle me-2"></i>คู่มือการใช้งาน Sales Dashboard</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                
                <div class="alert alert-primary bg-primary bg-opacity-10 border-0 mb-4">
                    <h6 class="fw-bold text-primary mb-2"><i class="fas fa-star me-2"></i>ฟีเจอร์ใหม่! การจัดเรียงและมุมมองข้อมูล</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="d-flex align-items-start">
                                <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-primary">
                                    <i class="fas fa-grip-vertical"></i>
                                </div>
                                <div>
                                    <strong>จัดเรียงตามใจ (Drag & Drop)</strong><br>
                                    <span class="small text-muted">คลิกค้างที่ช่อง <strong># (ซ้ายสุด)</strong> แล้วลากขึ้น-ลงเพื่อสลับลำดับการผลิตได้ทันที ระบบจะบันทึกให้อัตโนมัติ</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex align-items-start">
                                <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-primary">
                                    <i class="fas fa-filter"></i>
                                </div>
                                <div>
                                    <strong>Active vs History</strong><br>
                                    <span class="small text-muted">
                                        <strong>Active:</strong> แสดงเฉพาะงานที่ยังไม่กด Confirm<br>
                                        <strong>History:</strong> แสดงประวัติทั้งหมดรวมที่จบไปแล้ว
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-mouse-pointer me-2"></i>การใช้งานพื้นฐาน</h6>
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">1</span>
                            <div>
                                <strong>แก้ไขข้อมูล (Inline Edit)</strong><br>
                                <span class="text-muted small">ดับเบิลคลิกช่องข้อมูลเพื่อแก้ไข -> กด Enter เพื่อบันทึก</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">2</span>
                            <div>
                                <strong>เปลี่ยนสถานะ (Quick Check)</strong><br>
                                <span class="text-muted small">ติ๊กช่อง Done/Loaded เพื่อเปลี่ยนสถานะ (ช่อง Confirmed จะซ่อนงานออกจากหน้า Active)</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">3</span>
                            <div>
                                <strong>ปุ่ม "Plan Order"</strong><br>
                                <span class="text-muted small">หากเผลอไปกด Sort หัวตารางจนลากไม่ได้ ให้กดปุ่มนี้เพื่อรีเซ็ตกลับมาเรียงตามแผนการผลิต</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">4</span>
                            <div>
                                <strong>การนำเข้าข้อมูล (Smart Import)</strong><br>
                                <span class="text-muted small">
                                    ระบบจะ <strong>อัปเดต</strong> ข้อมูลหากพบรายการเดิม หรือ <strong>เพิ่มใหม่</strong> หากไม่พบ 
                                    โดยลำดับจะถูกจัดเรียงตามบรรทัดในไฟล์ Excel เสมอ
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-palette me-2"></i>ความหมายของแถบสี</h6>
                <div class="row align-items-center">
                    <div class="col-12 d-flex flex-wrap gap-3">
                        <div class="d-flex align-items-center">
                            <span class="badge bg-danger bg-opacity-75 me-2">Late</span>
                            <span class="small text-muted">เลยกำหนดโหลดตู้</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-warning text-dark bg-opacity-75 me-2">Warning</span>
                            <span class="small text-muted">เหลือเวลา < 3 วัน</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-success bg-opacity-75 me-2">Confirmed</span>
                            <span class="small text-muted">ยืนยันจบงาน (ย้ายไป History)</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge me-2" style="background-color: #e0cffc; color: #4c2f91; border: 1px solid #bfa1f7;">Inspection</span>
                            <span class="small text-muted">ขั้นตอนตรวจสอบคุณภาพ</span>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-secondary btn-sm px-4" data-bs-dismiss="modal">รับทราบ</button>
            </div>
        </div>
    </div>
</div>