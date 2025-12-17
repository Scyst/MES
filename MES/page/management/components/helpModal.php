<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-info text-white">
                <h5 class="modal-title fw-bold"><i class="far fa-question-circle me-2"></i>คู่มือการใช้งาน Planning Dashboard</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                
                <div class="alert alert-info bg-info bg-opacity-10 border-0 mb-4">
                    <h6 class="fw-bold text-info mb-2"><i class="fas fa-bolt me-2"></i>ฟีเจอร์สำคัญ: ระบบคำนวณค่าแรงอัตโนมัติ</h6>
                    <div class="d-flex align-items-start">
                        <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-info">
                            <i class="fas fa-users-cog"></i>
                        </div>
                        <div>
                            <strong>ปุ่ม "Sync Labor"</strong><br>
                            <span class="small text-muted">
                                ใช้สำหรับดึงข้อมูลการสแกนนิ้วจากระบบ Manpower มาคำนวณ <strong>ค่าแรงจริง (Actual DL/OT)</strong> ย้อนหลัง 
                                ระบบจะคำนวณตามกฎบริษัท (3 แรง, กะดึก, วันหยุด) และบันทึกลงฐานข้อมูลให้อัตโนมัติ เพื่อความแม่นยำของรายงาน
                            </span>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-dark mb-3 border-bottom pb-2"><i class="fas fa-mouse-pointer me-2 text-primary"></i>ขั้นตอนการวางแผน</h6>
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-primary me-2">1</span>
                            <div>
                                <strong>สร้าง/แก้ไขแผน</strong><br>
                                <span class="text-muted small">กดปุ่ม <strong>"New Plan"</strong> หรือคลิกที่รายการในตารางเพื่อแก้ไขจำนวนแผน (Plan Qty) และหมายเหตุ</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-warning text-dark me-2">2</span>
                            <div>
                                <strong>คำนวณยอดค้างส่ง (Calc C/O)</strong><br>
                                <span class="text-muted small">กดปุ่ม <strong>"C/O"</strong> เพื่อให้ระบบคำนวณยอดที่ผลิตไม่ทันจากวันก่อนหน้า มาทบเป็นยอดเป้าหมาย (Target) ของวันนี้</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-success me-2">3</span>
                            <div>
                                <strong>วิเคราะห์งบประมาณ</strong><br>
                                <span class="text-muted small">ดูช่อง <strong>Est. Sales</strong> (ยอดขายคาดการณ์) และ <strong>Budget</strong> (ต้นทุนมาตรฐาน) เพื่อคุมกำไรก่อนเริ่มผลิต</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex align-items-start">
                            <span class="badge bg-secondary me-2">4</span>
                            <div>
                                <strong>ค้นหาสินค้า (Smart Search)</strong><br>
                                <span class="text-muted small">
                                    ระบบจะจำข้อมูลสินค้าไว้ในเครื่อง (Cache 1 ชม.) เพื่อความเร็ว หากเพิ่มสินค้าใหม่ใน Master แล้วไม่เจอ ให้กด Refresh หน้าจอ 1 ครั้ง
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold text-dark mb-3 border-bottom pb-2"><i class="fas fa-info-circle me-2 text-primary"></i>ความหมายของข้อมูลในตาราง</h6>
                <div class="row align-items-center g-2">
                    <div class="col-6 col-md-4">
                        <div class="p-2 border rounded bg-light">
                            <span class="fw-bold text-primary">Target</span>
                            <div class="small text-muted">= Plan + Carry Over</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-2 border rounded bg-light">
                            <span class="fw-bold text-success">Est. Sales</span>
                            <div class="small text-muted">Target × ราคาขาย (USD/THB)</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4">
                        <div class="p-2 border rounded bg-light">
                            <span class="fw-bold text-danger">Budget</span>
                            <div class="small text-muted">Target × ต้นทุนมาตรฐาน (Std Cost)</div>
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