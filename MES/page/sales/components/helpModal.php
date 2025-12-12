<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="far fa-question-circle me-2"></i>คู่มือการใช้งาน Sales Dashboard</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                
                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-mouse-pointer me-2"></i>การใช้งานพื้นฐาน</h6>
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">1</span>
                            <div>
                                <strong>แก้ไขข้อมูล (Inline Edit)</strong><br>
                                <span class="text-muted small">ดับเบิลคลิกช่องข้อมูลเพื่อแก้ไข เมื่อพิมพ์เสร็จกด Enter เพื่อบันทึก</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">2</span>
                            <div>
                                <strong>เปลี่ยนสถานะ (Quick Toggle)</strong><br>
                                <span class="text-muted small">คลิก Checkbox ในช่อง Done, Loaded หรือ Pass เพื่ออัปเดตสถานะ</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">3</span>
                            <div>
                                <strong>การค้นหา (Smart Search)</strong><br>
                                <span class="text-muted small">ค้นหาได้ทั้ง PO, SKU, Status หรือคำอื่นๆ ที่ต้องการ</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">4</span>
                            <div>
                                <strong>คำนวณเงินบาท</strong><br>
                                <span class="text-muted small">แก้ไขเรทเงินในช่อง "1$ =" ระบบจะคำนวณยอดรวมให้อัตโนมัติ</span>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-file-import me-2"></i>การนำเข้าข้อมูล (Smart Import)</h6>
                <div class="alert alert-light border mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="small text-muted">ระบบรองรับชื่อหัวข้อ (Header) ที่หลากหลาย คุณสามารถใช้ไฟล์จากลูกค้าได้ทันทีหากมีหัวข้อเหล่านี้:</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="downloadTemplate()">
                            <i class="fas fa-download me-1"></i> โหลด Template
                        </button>
                    </div>
                    <div class="row g-2 small font-monospace">
                        <div class="col-md-4">
                            <ul class="list-unstyled text-secondary">
                                <li>• PO / PO Number</li>
                                <li>• SKU / Item Code</li>
                                <li>• Qty / Quantity</li>
                                <li>• Order Date</li>
                                <li>• Description</li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <ul class="list-unstyled text-secondary">
                                <li>• Original Loading week</li>
                                <li>• Original Shipping week</li>
                                <li>• Color / Colour</li>
                                <li>• DC / Location</li>
                                <li>• Remark / Notes</li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <ul class="list-unstyled text-secondary">
                                <li>• PRD Completed date</li>
                                <li>• Load / Loading Date</li>
                                <li>• Inspection Information</li>
                                <li>• Ticket Number</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-star me-2"></i>ฟีเจอร์อื่นๆ</h6>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <strong><i class="fas fa-sort text-muted me-1"></i> Multi-Sort</strong>
                        <p class="text-muted small mt-1 mb-0">กด <strong>Shift + คลิกหัวตาราง</strong> เพื่อเรียงข้อมูลหลายเงื่อนไขพร้อมกัน</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong><i class="fas fa-palette text-muted me-1"></i> แถบสีสถานะ</strong>
                        <div class="d-flex gap-2 mt-1">
                            <span class="badge bg-danger bg-opacity-75">Late</span>
                            <span class="badge bg-warning text-dark bg-opacity-75">Warning (3 Days)</span>
                            <span class="badge bg-success bg-opacity-75">Confirmed</span>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-secondary btn-sm px-4" data-bs-dismiss="modal">ปิดหน้าต่าง</button>
            </div>
        </div>
    </div>
</div>