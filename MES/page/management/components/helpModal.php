<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-book-reader me-2"></i>คู่มือการวางแผน (Planning Guide)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-secondary">
                
                <h6 class="fw-bold text-dark border-bottom pb-2"><i class="fas fa-calculator me-2 text-primary"></i>สูตรการคำนวณ (Calculation)</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <ul class="small mb-0 mt-2 list-unstyled">
                            <li class="mb-1">🔹 <strong>Original Plan:</strong> แผนผลิตตั้งต้น</li>
                            <li class="mb-1">🔸 <strong>Carry Over:</strong> ยอดค้างส่งจากวันก่อน</li>
                            <li class="text-primary fw-bold mt-2">🎯 Target (เป้าหมาย) = Original Plan + Carry Over</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <p class="small fw-bold mb-1">ความหมายของสี (Actual vs Target):</p>
                        <ul class="small mb-0 list-unstyled">
                            <li><i class="fas fa-circle text-success small me-1"></i> <strong>สีเขียว:</strong> ผลิตได้ตามเป้า (Actual ≥ Target)</li>
                            <li><i class="fas fa-circle text-primary small me-1"></i> <strong>สีฟ้า:</strong> กำลังผลิต (0 < Actual < Target)</li>
                            <li><i class="fas fa-circle text-dark small me-1"></i> <strong>สีดำ:</strong> ยังไม่เริ่มผลิต (Actual = 0)</li>
                        </ul>
                    </div>
                </div>

                <h6 class="fw-bold text-dark border-bottom pb-2 mt-4"><i class="fas fa-file-excel me-2 text-success"></i>การนำเข้าข้อมูล (Excel Import)</h6>
                <p class="small mb-2">
                    คุณสามารถกดปุ่ม <strong><i class="fas fa-file-export"></i> Export</strong> เพื่อนำไฟล์ออกมาแก้ไข แล้ว Import กลับเข้าไปใหม่ได้ทันที ระบบจะทำการ <strong>อัปเดตข้อมูลเดิม (Override)</strong> ตามวันที่และไลน์ที่ระบุ
                </p>
                <div class="alert alert-light border small">
                    <strong>📋 คอลัมน์ที่จำเป็น (Required Columns):</strong>
                    <table class="table table-bordered table-sm mt-2 mb-0 bg-white text-center">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Line</th>
                                <th>Shift</th>
                                <th>SAP_No <span class="text-muted fw-normal">or</span> Part_No</th>
                                <th>Original_Plan</th>
                            </tr>
                        </thead>
                    </table>
                    <div class="mt-2 text-muted fst-italic ms-1">
                        * ระบบจะละเว้นคอลัมน์อื่นๆ (เช่น Actual, Cost) โดยอัตโนมัติ
                    </div>
                </div>

            </div>
            <div class="modal-footer bg-light py-1">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>