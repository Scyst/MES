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
                            <li class="mb-1">🔹 <strong>Original Plan:</strong> แผนผลิตตั้งต้น (จากไฟล์ Import หรือคีย์เอง)</li>
                            <li class="mb-1">🔸 <strong>Carry Over:</strong> ยอดค้างส่งสะสมจากวันก่อนหน้า</li>
                            <li class="text-primary fw-bold mt-2 bg-light p-2 rounded border">🎯 Daily Target = Original Plan + Carry Over</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <p class="small fw-bold mb-1">สถานะสี (Actual vs Target):</p>
                        <ul class="small mb-0 list-unstyled">
                            <li><i class="fas fa-circle text-success small me-1"></i> <strong>สีเขียว:</strong> ผลิตได้ตามเป้า (Actual ≥ Target)</li>
                            <li><i class="fas fa-circle text-primary small me-1"></i> <strong>สีฟ้า:</strong> กำลังผลิต (0 < Actual < Target)</li>
                            <li><i class="fas fa-circle text-dark small me-1"></i> <strong>สีดำ:</strong> ยังไม่เริ่มผลิต (Actual = 0)</li>
                        </ul>
                    </div>
                </div>

                <h6 class="fw-bold text-dark border-bottom pb-2 mt-4"><i class="fas fa-file-excel me-2 text-success"></i>การนำเข้าข้อมูล (Excel Import)</h6>
                
                <p class="small mb-2">
                    ระบบรองรับไฟล์ <strong>.xlsx (แนะนำ)</strong> และ .csv ในรูปแบบ <strong>Matrix (ตารางขวาง)</strong>
                    <br>
                    <span class="text-muted"><i class="fas fa-lightbulb text-warning me-1"></i>Tip: กดปุ่ม Export เพื่อนำไฟล์ออกมาแก้ไข แล้ว Import กลับเข้าไปใหม่ได้ทันที</span>
                </p>

                <div class="alert alert-light border small">
                    <div class="row">
                        <div class="col-md-6">
                            <strong>1. การระบุ Line (สายการผลิต):</strong>
                            <ul class="mb-1 ps-3">
                                <li>ตั้งชื่อ <strong>Sheet (Tab)</strong> ด้านล่างให้ตรงกับชื่อ Line</li>
                                <li>เช่น <code>ASSEMBLY</code>, <code>PRESS</code></li>
                                <li>ระบบจะแยกข้อมูลแต่ละ Sheet เข้าแต่ละ Line อัตโนมัติ</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <strong>2. รูปแบบตาราง (Matrix Format):</strong>
                            <ul class="mb-0 ps-3">
                                <li><strong>แถว (Rows):</strong> รายการสินค้า (Item Code)</li>
                                <li><strong>คอลัมน์ (Cols):</strong> วันที่ (Header)</li>
                                <li><strong>ข้อมูล:</strong> ยอดผลิต (แผน DAY)</li>
                            </ul>
                        </div>
                    </div>

                    <div class="mt-2">
                        <strong class="d-block mb-1">📋 ตัวอย่างรูปแบบข้อมูลในไฟล์:</strong>
                        <table class="table table-bordered table-sm mb-0 bg-white text-center" style="font-size: 0.8rem;">
                            <thead class="table-secondary">
                                <tr>
                                    <th>Item Code</th>
                                    <th>Description</th> <th>1-ธ.ค.</th>
                                    <th>2-ธ.ค.</th>
                                    <th>...</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>30022xxx</td>
                                    <td class="text-start text-muted">Cover LH</td> <td>100</td>
                                    <td>-</td>
                                    <td>...</td>
                                </tr>
                                <tr>
                                    <td>40015xxx</td>
                                    <td class="text-start text-muted">Brkt Supp</td> <td>-</td>
                                    <td>200</td>
                                    <td>...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-2 text-muted fst-italic ms-1" style="font-size: 0.75rem;">
                        * คอลัมน์ <strong>Description</strong> มีไว้เพื่อดูง่ายเท่านั้น (แก้ไขไปก็ไม่มีผลกับระบบ)<br>
                        * รองรับวันที่แบบไทย (1-ธ.ค.) และสากล (2025-12-01)
                    </div>
                </div>

            </div>
            
            <div class="modal-footer bg-light py-1">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>