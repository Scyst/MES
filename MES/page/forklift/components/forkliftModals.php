<div class="modal fade" id="bookingModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white py-2">
                <h6 class="modal-title fw-bold"><i class="far fa-calendar-plus me-2"></i>จองรถ (Booking)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="bookingForm">
                    <input type="hidden" id="book_forklift_id" name="forklift_id">
                    <div class="text-center mb-3">
                        <h5 id="book_forklift_name" class="fw-bold text-primary mb-0">Forklift Name</h5>
                        <small class="text-muted">กรุณาเลือกช่วงเวลาที่ต้องการใช้</small>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold">เริ่มเวลา</label>
                            <input type="datetime-local" class="form-control" id="book_start_time" name="start_time" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold">คืนเวลา (โดยประมาณ)</label>
                            <input type="datetime-local" class="form-control" id="book_end_time" name="end_time_est" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">บันทึกช่วยจำ (Optional)</label>
                        <input type="text" class="form-control form-control-sm" name="usage_details" placeholder="เช่น จองไว้รอของเข้า...">
                    </div>
                </form>
            </div>
            <div class="modal-footer py-1 border-0">
                <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary fw-bold" onclick="submitBooking()">Confirm Booking</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="startJobModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-success text-white py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-play me-2"></i>เริ่มใช้งาน (Start Job)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="startJobForm">
                    <input type="hidden" id="start_booking_id" name="booking_id">
                    <input type="hidden" id="start_forklift_id" name="forklift_id">
                    
                    <div class="alert alert-success bg-opacity-10 border-success d-flex align-items-center small py-2 mb-3">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        <div class="text-success fw-bold">กำลังจะเริ่มงานกับรถ: <span id="start_forklift_name">-</span></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">ระดับแบตเตอรี่ปัจจุบัน (%)</label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="range" class="form-range flex-grow-1 custom-range-track" 
                                   id="start_battery_range" min="0" max="100" step="1" 
                                   oninput="syncBatteryInput('start', this.value)">
                            <input type="number" class="form-control text-center fw-bold" 
                                   id="start_battery_input" name="start_battery" 
                                   style="width: 80px;" min="0" max="100" 
                                   oninput="syncBatteryInput('start', this.value)">
                        </div>
                        <small class="text-muted" style="font-size: 0.75rem;">* ตรวจสอบว่าตรงกับเกจวัดที่ตัวรถหรือไม่</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">นำรถไปใช้ที่ไหน? (Work Area)</label>
                        <input type="text" class="form-control" name="location" placeholder="เช่น Line 1, คลังสินค้า B..." required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold">รายละเอียดงาน</label>
                        <input type="text" class="form-control" id="start_usage_details" name="usage_details" placeholder="เช่น ยกพาเลทงาน FG..." required>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-1 border-0">
                <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-success fw-bold" onclick="submitStartJob()">Confirm Start</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="returnModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-secondary text-white py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-undo me-2"></i>คืนรถ (Return)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="returnForm">
                    <input type="hidden" id="return_booking_id" name="booking_id">
                    <input type="hidden" id="return_forklift_id" name="forklift_id">
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold text-danger">ระดับแบตเตอรี่คงเหลือ (%) <span class="text-danger">*</span></label>
                        <div class="d-flex align-items-center gap-2">
                            <input type="range" class="form-range flex-grow-1 custom-range-track" 
                                   id="return_battery_range" min="0" max="100" step="1" 
                                   oninput="syncBatteryInput('return', this.value)">
                            <input type="number" class="form-control text-center fw-bold border-danger text-danger" 
                                   id="return_battery_input" name="end_battery" 
                                   style="width: 80px;" min="0" max="100" 
                                   oninput="syncBatteryInput('return', this.value)">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">นำรถมาจอดคืนที่ไหน? (Parking Spot)</label>
                        <input type="text" class="form-control" name="location" placeholder="เช่น โรงจอด A, แท่นชาร์จ..." required>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-1 border-0">
                <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-secondary fw-bold" onclick="submitReturn()">Confirm Return</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="manageModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-cog me-2"></i>จัดการข้อมูลรถ (Fleet Management)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="bg-light p-3 border-bottom">
                    <form id="manageForkliftForm" class="row g-2 align-items-end">
                        <input type="hidden" name="id" id="manage_id"> 
                        <input type="hidden" name="action" id="manage_action" value="add_forklift">

                        <div class="col-md-2">
                            <label class="small text-muted fw-bold">Code (รหัสรถ)</label>
                            <input type="text" class="form-control form-control-sm" name="code" id="manage_code" placeholder="FL-XX" required>
                        </div>
                        <div class="col-md-3">
                            <label class="small text-muted fw-bold">Name/Model (ชื่อรุ่น)</label>
                            <input type="text" class="form-control form-control-sm" name="name" id="manage_name" placeholder="Brand / Model" required>
                        </div>

                        <div class="col-md-3">
                            <label class="small text-muted fw-bold">Status (สถานะ)</label>
                            <select class="form-select form-select-sm" name="status" id="manage_status">
                                <option value="AVAILABLE" class="text-success fw-bold">Available (ว่าง)</option>
                                <option value="MAINTENANCE" class="text-secondary fw-bold">Maintenance (ซ่อม)</option>
                                <option value="IN_USE" class="text-primary">In Use (ใช้)</option>
                                <option value="CHARGING" class="text-warning">Charging (ชาร์จ)</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="small text-muted fw-bold">Current Location</label>
                            <input type="text" class="form-control form-control-sm" name="last_location" id="manage_location" placeholder="Zone A">
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-sm btn-success w-100 fw-bold" id="btn-save-forklift" onclick="saveForklift()">
                                <i class="fas fa-save me-1"></i> บันทึก
                            </button>
                        </div>

                        <div class="col-12 mt-1 text-end">
                            <button type="button" class="btn btn-xs btn-link text-danger p-0 text-decoration-none" id="btn-cancel-edit" style="display:none; font-size: 0.8rem;" onclick="resetManageForm()">
                                <i class="fas fa-times-circle me-1"></i> ยกเลิกการแก้ไข (Cancel Edit)
                            </button>
                        </div>
                    </form>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover table-sm mb-0 align-middle">
                        <thead class="table-secondary text-secondary">
                            <tr>
                                <th class="ps-3">Code</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Location</th>
                                <th class="text-end pe-3">Action</th>
                            </tr>
                        </thead>
                        <tbody id="manageTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="historyModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-history me-2"></i>ประวัติการใช้งาน (Top 200 Latest)</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-striped table-hover mb-0 align-middle" style="font-size:0.9rem;">
                        <thead class="bg-light sticky-top" style="top:0; z-index:5;">
                            <tr>
                                <th class="ps-3">Date</th>
                                <th>Forklift</th>
                                <th>User</th>
                                <th>Task / Detail</th>
                                <th>Time Used</th>
                                <th>Start Loc.</th>
                                <th>End Loc.</th>
                                <th class="text-center text-muted">Batt Start</th>
                                <th class="text-center fw-bold">Batt End</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>