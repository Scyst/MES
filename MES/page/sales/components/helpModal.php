<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
            
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="far fa-question-circle me-2"></i>คู่มือการใช้งาน Sales Dashboard</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body p-4">
                
                <div class="alert alert-primary bg-primary bg-opacity-10 border-0 mb-4">
                    <h6 class="fw-bold text-primary mb-3"><i class="fas fa-star me-2"></i>ฟีเจอร์ใหม่! Pipeline & Priority</h6>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="d-flex align-items-start">
                                <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-primary">
                                    <i class="fas fa-grip-vertical"></i>
                                </div>
                                <div>
                                    <strong>จัดลำดับเร่งด่วน (Drag & Drop)</strong><br>
                                    <span class="small text-muted">คลิกค้างที่ช่อง <strong># (ซ้ายสุด)</strong> แล้วลากขึ้น-ลงเพื่อแซงคิวผลิตได้ทันที (เฉพาะในมุมมอง Active)</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex align-items-start">
                                <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-primary">
                                    <i class="fas fa-network-wired"></i>
                                </div>
                                <div>
                                    <strong>ระบบ Pipeline (ไม่นับซ้ำ)</strong><br>
                                    <span class="small text-muted">
                                        งานจะไหลไปทีละขั้น: 
                                        <span class="badge bg-warning text-dark border">ผลิต</span> &to; 
                                        <span class="badge bg-info text-dark border">รอโหลด</span> &to; 
                                        <span class="badge bg-success border">ส่งแล้ว</span>
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
                                <span class="text-muted small">ดับเบิลคลิกช่องข้อมูลเพื่อแก้ไข -> กด Enter เพื่อบันทึก (เปลี่ยนสีเขียวเมื่อสำเร็จ)</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">2</span>
                            <div>
                                <strong>เปลี่ยนสถานะ (One Click)</strong><br>
                                <span class="text-muted small">กดปุ่มไอคอน <i class="fas fa-industry"></i> หรือ <i class="fas fa-truck-loading"></i> เพื่อขยับงานไปยังขั้นตอนถัดไป</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">3</span>
                            <div>
                                <strong>ปุ่ม "Reset Sort"</strong><br>
                                <span class="text-muted small">หากกดหัวตารางจนงง ให้กดปุ่ม <i class="fas fa-sync-alt"></i> เพื่อกลับมาเรียงตามแผนการผลิต</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">4</span>
                            <div>
                                <strong>การยืนยันจบงาน (Confirm)</strong><br>
                                <span class="text-muted small">
                                    เมื่อกด Switch <strong>"Conf."</strong> งานจะถูกซ่อนจากหน้า Active และย้ายไปเก็บใน History ถาวร
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-file-excel me-2"></i>ตารางการนำเข้าข้อมูล (Excel Logic)</h6>
                <div class="alert alert-info border-0 bg-info bg-opacity-10 py-2 mb-3">
                    <small><i class="fas fa-info-circle me-1"></i> ระบบแยกการบันทึก <strong>"วันที่"</strong> และ <strong>"สถานะ"</strong> ออกจากกัน เพื่อความยืดหยุ่น</small>
                </div>
                <div class="table-responsive mb-4">
                    <table class="table table-bordered table-sm text-center small mb-0">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 40%;">สิ่งที่คุณกรอกใน Excel</th>
                                <th style="width: 30%;">ผลลัพธ์ (ช่องวันที่)</th>
                                <th style="width: 30%;">ผลลัพธ์ (สถานะปุ่ม)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-start">ใส่วันที่ <span class="badge bg-light text-dark border">25/12/2026</span> <span class="text-muted">(อย่างเดียว)</span></td>
                                <td><i class="fas fa-check text-success"></i> บันทึกวันที่</td>
                                <td><span class="badge bg-secondary text-light">Wait (ยังไม่เสร็จ)</span></td>
                            </tr>
                            <tr>
                                <td class="text-start">ใส่คำว่า <span class="badge bg-success">Yes</span>, <span class="badge bg-success">Done</span>, <span class="badge bg-success">Shipped</span></td>
                                <td>-</td>
                                <td><span class="badge bg-success">Done (เสร็จแล้ว)</span></td>
                            </tr>
                            <tr>
                                <td class="text-start">ใส่ทั้ง <span class="badge bg-light text-dark border">วันที่</span> และ <span class="badge bg-success">Yes</span></td>
                                <td><i class="fas fa-check text-success"></i> บันทึกวันที่</td>
                                <td><span class="badge bg-success">Done (เสร็จแล้ว)</span></td>
                            </tr>
                            <tr>
                                <td class="text-start">ใส่คำว่า <span class="badge bg-danger">No</span>, <span class="badge bg-secondary">Wait</span></td>
                                <td>-</td>
                                <td><span class="badge bg-secondary text-light">Wait (ยังไม่เสร็จ)</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h6 class="fw-bold text-primary mb-3 border-bottom pb-2"><i class="fas fa-palette me-2"></i>ความหมายของสีสถานะ</h6>
                <div class="row align-items-center">
                    <div class="col-12 d-flex flex-wrap gap-3">
                        <div class="d-flex align-items-center">
                            <span class="badge bg-warning text-dark border me-2"><i class="fas fa-industry"></i> Wait Prod</span>
                            <span class="small text-muted">กำลังผลิต / รอวัสดุ</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-info text-dark border me-2"><i class="fas fa-truck-loading"></i> Ready Load</span>
                            <span class="small text-muted">ผลิตเสร็จแล้ว / รอขึ้นตู้</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-success border me-2"><i class="fas fa-check"></i> Shipped</span>
                            <span class="small text-muted">โหลดเสร็จแล้ว / จบงาน</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge text-white border me-2" style="background-color: #6f42c1;"><i class="fas fa-microscope"></i> Inspect Pass</span>
                            <span class="small text-muted">ผ่าน QC</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="text-danger fw-bold me-2"><i class="fas fa-exclamation-triangle blink"></i> PO Number</div>
                            <span class="small text-muted">งานล่าช้า (เลยกำหนดโหลด)</span>
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