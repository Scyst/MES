<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-gradient bg-indigo text-white py-2" style="background-color: #4e73df;">
                <h6 class="modal-title fw-bold">
                    <i class="fas fa-info-circle me-2"></i>คู่มือใช้งาน (Daily Command Center)
                </h6>
                <button type="button" class="btn-close btn-close-white small" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body text-secondary" style="font-size: 0.9rem;">
                
                <div class="mb-4">
                    <h6 class="fw-bold text-dark border-bottom pb-2 mb-3">
                        <i class="fas fa-traffic-light me-2 text-warning"></i>ความหมายของสี (Status Indicators)
                    </h6>
                    <div class="row g-3">
                        <div class="col-md-6 rounded border">
                            <strong class="d-block my-2 text-dark small">📦 Stock vs Demand (ช่อง Stock):</strong>
                            <ul class="list-unstyled mb-0 small bg-light pb-2">
                                <li class="mb-2 text-success fw-bold">
                                    <i class="fas fa-check-circle me-2"></i>สีเขียว (Sufficient)
                                    <div class="fw-normal text-muted ms-4">ของพอส่ง (Stock ≥ Demand)</div>
                                </li>
                                <li class="text-danger fw-bold">
                                    <i class="fas fa-exclamation-circle me-2"></i>สีแดง (Shortage)
                                    <div class="fw-normal text-muted ms-4">ของขาด! (Stock < Demand)</div>
                                </li>
                            </ul>
                        </div>
                        <div class="col-md-6 rounded border">
                            <strong class="d-block my-2 text-dark small">👥 Manpower (หลอดสี):</strong>
                            <ul class="list-unstyled mb-0 small">
                                <li class="mb-2"><span class="badge bg-success me-2">Green</span> คนมาครบ หรือเกือบครบ (100%)</li>
                                <li class="mb-2"><span class="badge bg-warning text-dark me-2">Yellow</span> คนขาดเล็กน้อย (80-99%)</li>
                                <li class="mb-2"><span class="badge bg-danger me-2">Red</span> คนขาดเยอะ หรือยังไม่ลงเวลา (< 80%)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="mb-2">
                    <h6 class="fw-bold text-dark border-bottom pb-2 mb-3">
                        <i class="fas fa-database me-2 text-primary"></i>ที่มาของข้อมูล (Data Logic)
                    </h6>
                    <div class="row">
                        <div class="col-12">
                            <ul class="list-group list-group-flush small">
                                <li class="list-group-item px-0">
                                    <strong class="text-dark">📊 Demand (ความต้องการ):</strong>
                                    รวมยอดจากแผนโหลด (Sales Order) ล่วงหน้า <span class="text-primary fw-bold">14 วัน</span> โดยเทียบจาก SAP No.
                                </li>
                                <li class="list-group-item px-0">
                                    <strong class="text-dark">🏭 Production Plan:</strong>
                                    ดึงจากแผนการผลิตที่วางไว้ (Production Plan Module) หากไม่มีแผน User สามารถกดปุ่ม <span class="badge bg-outline-primary text-primary border">+ Add Plan</span> เพิ่มเองได้
                                </li>
                                <li class="list-group-item px-0">
                                    <strong class="text-dark">🚚 Loading Plan:</strong>
                                    ดึงรายการที่ต้องโหลด <span class="text-primary fw-bold">วันนี้</span> และสถานะยังไม่เสร็จ (Pending)
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="alert alert-light border-start border-4 border-info small">
                    <h6 class="fw-bold text-info"><i class="fas fa-edit me-1"></i> ระบบ Editable & Snapshot</h6>
                    <p class="mb-0">
                        หน้านี้ออกแบบมาให้ <strong>"แก้ไขได้ทุกช่อง"</strong> (Demand, Stock, Manpower) เพื่อให้หน้างานปรับตัวเลขให้ตรงกับความจริงที่สุด<br>
                        เมื่อกดปุ่ม <strong class="text-primary"><i class="fas fa-save"></i> Save Plan</strong> ระบบจะบันทึกสิ่งที่เห็นบนหน้าจอไว้เป็น <strong>"ประวัติ (History)"</strong> ของวันนั้นๆ โดยจะไม่ถูกระบบคำนวณทับอีก
                    </p>
                </div>

                <div class="row mt-3">
                    <div class="col-12 text-muted small fst-italic">
                        <i class="fas fa-lightbulb text-warning me-1"></i> <strong>Tip:</strong> 
                        กดที่ชื่อ Job (Tag สีฟ้า) เพื่อเปลี่ยนสถานะ (Normal -> Urgent -> Done) หรือกดปุ่ม + เพื่อเพิ่มงานย่อย
                    </div>
                </div>

            </div>
            
            <div class="modal-footer bg-light py-1 border-top-0">
                <button type="button" class="btn btn-sm btn-secondary px-4" data-bs-dismiss="modal">เข้าใจแล้ว (Close)</button>
            </div>
        </div>
    </div>
</div>