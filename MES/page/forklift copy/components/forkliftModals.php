<div class="modal fade" id="bookingModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary bg-gradient text-white py-3">
                <h6 class="modal-title fw-bold"><i class="far fa-calendar-plus me-2"></i>จองรถโฟล์คลิฟต์ (Booking)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <form id="bookingForm">
                    <input type="hidden" id="book_forklift_id" name="forklift_id">
                    
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-2" style="width: 60px; height: 60px;">
                            <i class="fas fa-truck-loading fa-2x"></i>
                        </div>
                        <h4 id="book_forklift_name" class="fw-bold text-dark mb-0">Forklift Name</h4>
                        <span class="text-muted small">ระบุรายละเอียดเพื่อยืนยันการทำรายการ</span>
                    </div>

                    <div class="card bg-light border-0 mb-3">
                        <div class="card-body p-3">
                            <label class="form-label small fw-bold text-primary">ประเภทการจอง</label>
                            <div class="btn-group w-100 shadow-sm" role="group">
                                <input type="radio" class="btn-check" name="booking_type" id="type_instant" value="INSTANT" checked>
                                <label class="btn btn-outline-primary" for="type_instant"><i class="fas fa-bolt me-1"></i> ใช้ตอนนี้ (Instant)</label>

                                <input type="radio" class="btn-check" name="booking_type" id="type_reserve" value="RESERVE">
                                <label class="btn btn-outline-primary" for="type_reserve"><i class="far fa-clock me-1"></i> จองล่วงหน้า</label>
                            </div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
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
                        <label class="form-label small fw-bold">ลักษณะงาน / หมายเหตุ (Optional)</label>
                        <input type="text" class="form-control" name="usage_details" placeholder="เช่น ยกพาเลท FG ไป Line 2...">
                    </div>

                    <div class="alert alert-warning border-warning border-opacity-50 bg-warning bg-opacity-10 small mb-0 py-2 d-flex align-items-center">
                        <i class="fas fa-shield-alt text-warning fs-4 me-3"></i>
                        <div><strong>Safety First:</strong> ตรวจสอบน้ำมัน/แบตเตอรี่ เบรก และแตร ก่อนใช้งานทุกครั้ง</div>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-2 border-0 bg-light">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary px-4 fw-bold shadow-sm" onclick="submitBooking(this)">ยืนยันการจอง</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="startJobModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-success bg-gradient text-white py-3">
                <h6 class="modal-title fw-bold"><i class="fas fa-play-circle me-2"></i>เริ่มปฏิบัติงาน (Start Job)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <form id="startJobForm">
                    <input type="hidden" id="start_booking_id" name="booking_id">
                    <input type="hidden" id="start_forklift_id" name="forklift_id">
                    
                    <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-25 d-flex align-items-center p-3 mb-4 rounded-3">
                        <i class="fas fa-check-circle text-success fa-2x me-3"></i>
                        <div>
                            <div class="text-success fw-bold mb-1">ยืนยันการเริ่มงานรถโฟล์คลิฟต์</div>
                            <h5 id="start_forklift_name" class="mb-0 fw-bold text-dark">-</h5>
                        </div>
                    </div>

                    <div class="card bg-light border-0 mb-3">
                        <div class="card-body p-3">
                            <label class="form-label fw-bold text-dark"><i class="fas fa-battery-half text-success me-2"></i>ระดับแบตเตอรี่ก่อนเริ่มงาน (%)</label>
                            <div class="d-flex align-items-center gap-3 mt-2">
                                <input type="range" class="form-range flex-grow-1" id="start_battery_range" min="0" max="100" step="1" oninput="syncBatteryInput('start', this.value)">
                                <input type="number" class="form-control text-center fw-bold fs-5 text-success" id="start_battery_input" name="start_battery" style="width: 90px;" min="0" max="100" oninput="syncBatteryInput('start', this.value)">
                            </div>
                        </div>
                    </div>

                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label small fw-bold">จุดปฏิบัติงาน (Work Area) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="location" placeholder="เช่น Line 1, คลังสินค้า B..." required>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">รายละเอียดงาน (Task Details) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="start_usage_details" name="usage_details" placeholder="ระบุสิ่งที่ต้องการทำ..." required>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-2 border-0 bg-light">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-success px-4 fw-bold shadow-sm" onclick="submitStartJob(this)"><i class="fas fa-play me-2"></i>เริ่มทำงาน</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="returnModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-secondary bg-gradient text-white py-3">
                <h6 class="modal-title fw-bold"><i class="fas fa-undo-alt me-2"></i>คืนรถ (Return Forklift)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <form id="returnForm">
                    <input type="hidden" id="return_booking_id" name="booking_id">
                    <input type="hidden" id="return_forklift_id" name="forklift_id">
                    
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-secondary bg-opacity-10 text-secondary rounded-circle mb-2" style="width: 60px; height: 60px;">
                            <i class="fas fa-parking fa-2x"></i>
                        </div>
                        <h4 id="return_forklift_name" class="fw-bold text-dark mb-0">-</h4>
                        <span class="text-muted small">โปรดระบุข้อมูลสถานะล่าสุดเพื่อคืนรถเข้าสู่ระบบ</span>
                    </div>

                    <div class="card border-danger border-opacity-50 bg-danger bg-opacity-10 mb-4">
                        <div class="card-body p-3">
                            <label class="form-label fw-bold text-danger"><i class="fas fa-battery-quarter me-2"></i>ระดับแบตเตอรี่คงเหลือ (%) <span class="text-danger">*</span></label>
                            <div class="d-flex align-items-center gap-3 mt-2">
                                <input type="range" class="form-range flex-grow-1" id="return_battery_range" min="0" max="100" step="1" oninput="syncBatteryInput('return', this.value)">
                                <input type="number" class="form-control text-center fw-bold fs-5 text-danger border-danger" id="return_battery_input" name="end_battery" style="width: 90px;" min="0" max="100" oninput="syncBatteryInput('return', this.value)">
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold">จุดจอดรถปัจจุบัน (Parking Spot) <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="location" placeholder="เช่น ลานจอด A, แท่นชาร์จ 2..." required>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-2 border-0 bg-light">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-secondary px-4 fw-bold shadow-sm" onclick="submitReturn(this)"><i class="fas fa-check me-2"></i>ยืนยันการคืนรถ</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="manageModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white py-3">
                <h6 class="modal-title fw-bold"><i class="fas fa-cogs me-2"></i>จัดการข้อมูลคลังรถ (Fleet Master Data)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-light">
                
                <div class="p-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <form id="manageForkliftForm" class="row g-3 align-items-end">
                                <input type="hidden" name="id" id="manage_id"> 
                                <input type="hidden" name="action" id="manage_action" value="add_forklift">

                                <div class="col-md-2">
                                    <label class="form-label small fw-bold text-muted mb-1">Code</label>
                                    <input type="text" class="form-control" name="code" id="manage_code" placeholder="FL-XX" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold text-muted mb-1">Brand / Model</label>
                                    <input type="text" class="form-control" name="name" id="manage_name" placeholder="Toyota / 3-Ton" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold text-muted mb-1">Status</label>
                                    <select class="form-select fw-bold" name="status" id="manage_status">
                                        <option value="AVAILABLE" class="text-success">Available (ว่าง)</option>
                                        <option value="MAINTENANCE" class="text-secondary">Maintenance (ซ่อม)</option>
                                        <option value="IN_USE" class="text-primary">In Use (ใช้)</option>
                                        <option value="CHARGING" class="text-warning">Charging (ชาร์จ)</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold text-muted mb-1">Location</label>
                                    <input type="text" class="form-control" name="last_location" id="manage_location" placeholder="Zone A">
                                </div>
                                <div class="col-md-2">
                                    <button type="button" class="btn btn-primary w-100 fw-bold" id="btn-save-forklift" onclick="saveForklift(this)">
                                        <i class="fas fa-save me-1"></i> บันทึก
                                    </button>
                                </div>

                                <div class="col-12 mt-2 text-end">
                                    <button type="button" class="btn btn-sm btn-outline-danger" id="btn-cancel-edit" style="display:none;" onclick="resetManageForm()">
                                        <i class="fas fa-times me-1"></i> ยกเลิกการแก้ไข
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="table-responsive bg-white">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="table-light text-muted small text-uppercase">
                            <tr>
                                <th class="ps-4">Code</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Location</th>
                                <th class="text-end pe-4">Action</th>
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
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-history text-primary me-2"></i>ประวัติการใช้งาน (Audit Trail)</h5>
                <div class="d-flex align-items-center">
                    <div class="input-group input-group-sm me-3 shadow-sm" style="width: 250px;">
                        <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" id="searchHistory" class="form-control border-start-0 ps-0 bg-light" placeholder="ค้นหารถ, ชื่อผู้เบิก..." onkeyup="filterHistoryTable()">
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
            </div>
            <div class="modal-body p-0 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover mb-0 align-middle" style="font-size:0.9rem;">
                        <thead class="table-light sticky-top shadow-sm" style="top:0; z-index:5;">
                            <tr>
                                <th class="ps-4 text-muted small text-uppercase">Date/Time</th>
                                <th class="text-muted small text-uppercase">Forklift</th>
                                <th class="text-muted small text-uppercase">User</th>
                                <th class="text-muted small text-uppercase">Task Details</th>
                                <th class="text-muted small text-uppercase">Duration</th>
                                <th class="text-center text-muted small text-uppercase">Status</th>
                                <th class="text-center text-muted small text-uppercase" title="Battery Start"><i class="fas fa-battery-full text-success"></i> Start</th>
                                <th class="text-center text-muted small text-uppercase pe-4" title="Battery End"><i class="fas fa-battery-quarter text-danger"></i> End</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="apZoneModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white py-3">
                <h6 class="modal-title fw-bold"><i class="fas fa-fingerprint me-2"></i>Map Zone Setup (Wi-Fi Fingerprint)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <form id="apZoneForm">
                    <input type="hidden" name="action" value="save_zone">
                    
                    <div class="row g-3 mb-4">
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted">Grid Name</label>
                            <input type="text" class="form-control bg-white text-primary fw-bold text-center" id="zone_name" name="zone_name" readonly>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted">พิกัด X</label>
                            <input type="number" class="form-control bg-white text-center" id="zone_svg_x" name="svg_x" readonly>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted">พิกัด Y</label>
                            <input type="number" class="form-control bg-white text-center" id="zone_svg_y" name="svg_y" readonly>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-2">
                        <div class="card-body p-3">
                            <div class="row g-2 align-items-center">
                                <div class="col-8">
                                    <label class="form-label small fw-bold text-primary">BSSID #1 (Main Access Point) <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control border-primary" id="zone_bssid_1" name="bssid_1" placeholder="MAC Address (e.g. 00:1A:2B...)" required>
                                </div>
                                <div class="col-4">
                                    <label class="form-label small fw-bold text-primary">RSSI #1</label>
                                    <input type="number" class="form-control border-primary text-center" id="zone_rssi_1" name="rssi_1" placeholder="-45" required>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-2">
                        <div class="card-body p-3 bg-white">
                            <div class="row g-2 align-items-center">
                                <div class="col-8">
                                    <label class="form-label small fw-bold text-muted">BSSID #2 (Optional)</label>
                                    <input type="text" class="form-control" id="zone_bssid_2" name="bssid_2" placeholder="Secondary MAC">
                                </div>
                                <div class="col-4">
                                    <label class="form-label small fw-bold text-muted">RSSI #2</label>
                                    <input type="number" class="form-control text-center" id="zone_rssi_2" name="rssi_2" placeholder="-52">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-3 bg-white">
                            <div class="row g-2 align-items-center">
                                <div class="col-8">
                                    <label class="form-label small fw-bold text-muted">BSSID #3 (Optional)</label>
                                    <input type="text" class="form-control" id="zone_bssid_3" name="bssid_3" placeholder="Tertiary MAC">
                                </div>
                                <div class="col-4">
                                    <label class="form-label small fw-bold text-muted">RSSI #3</label>
                                    <input type="number" class="form-control text-center" id="zone_rssi_3" name="rssi_3" placeholder="-60">
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
            <div class="modal-footer py-2 border-0 bg-white">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary px-4 fw-bold shadow-sm" onclick="saveApZone(this)">
                    <i class="fas fa-save me-2"></i>บันทึก Zone
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="analyticsModal" tabindex="-1">
    <div class="modal-dialog" style="max-width: 95vw;">
        <div class="modal-content border-0 shadow-lg"> <div class="modal-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="modal-title fw-bold"><i class="fas fa-chart-pie me-2 text-info"></i>วิเคราะห์ประสิทธิภาพรถ (OEE & Utilization)</h5>
                <div class="d-flex align-items-center">
                    <select id="analytics-time-range" class="form-select form-select-sm me-3 fw-bold" style="width: 150px; cursor: pointer;" onchange="openAnalyticsModal()">
                        <option value="1">24 ชม. ล่าสุด</option>
                        <option value="7">7 วันย้อนหลัง</option>
                        <option value="30">30 วันย้อนหลัง</option>
                    </select>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
            </div>
            <div class="modal-body bg-light p-4">
                <div class="row g-4 mb-4">
                    <div class="col-md-4">
                        <div class="card shadow-sm h-100 border-0 rounded-4">
                            <div class="card-body text-center p-4">
                                <h6 class="text-muted fw-bold mb-4 text-uppercase">สัดส่วนเวลาการทำงาน (Time Breakdown)</h6>
                                <div style="position: relative; height: 250px; width: 100%;">
                                    <canvas id="utilizationChart"></canvas>
                                </div>
                                <div id="utilization-insight" class="mt-4 p-3 rounded bg-light border"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card shadow-sm h-100 border-0 rounded-4">
                            <div class="card-body p-0 table-responsive">
                                <table class="table table-hover mb-0 align-middle text-center" style="font-size: 0.9rem;">
                                    <thead class="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th class="text-start ps-4 py-3">Forklift</th>
                                            <th>Status</th>
                                            <th>Run Time (ชม.)</th>
                                            <th>Idle Time (ชม.)</th>
                                            <th class="pe-4">Utilization (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="utilizationTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm rounded-4">
                    <div class="card-header bg-white border-bottom pt-4 pb-3 d-flex justify-content-between align-items-center px-4">
                        <h6 class="fw-bold mb-0 text-dark"><i class="fas fa-stream text-primary me-2"></i>Schedule & History (Rolling 24-Hour Window)</h6>
                        <div class="text-muted small fw-bold">
                            <span class="badge ms-2 px-2 py-1" style="background-color: #0d6efd;">&nbsp;</span> Active
                            <span class="badge ms-2 px-2 py-1" style="background-color: #8b0faa;">&nbsp;</span> Booked
                            <span class="badge bg-secondary ms-2 px-2 py-1">&nbsp;</span> Completed
                        </div>
                    </div>
                    <div class="card-body py-4 px-4 bg-white overflow-auto rounded-bottom-4">
                        <div id="timeline-chart"></div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="alertsModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-danger shadow-lg">
            <div class="modal-header bg-danger text-white py-3">
                <h6 class="modal-title fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>การแจ้งเตือนระบบ (Active Alerts)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-light">
                <ul class="list-group list-group-flush" id="alertsListBody">
                    </ul>
            </div>
        </div>
    </div>
</div>

<div style="position: fixed; bottom: 30px; right: 30px; z-index: 1050; display: flex; flex-direction: column; gap: 15px;">
    
    <button class="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border-2 border-white" 
            style="width: 60px; height: 60px; transition: transform 0.2s;" 
            onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"
            onclick="openAnalyticsModal()" title="วิเคราะห์ประสิทธิภาพ (Fleet Analytics)">
        <i class="fas fa-chart-line fs-4"></i>
    </button>

    <button id="fab-alert" class="btn btn-danger rounded-circle shadow-lg d-flex align-items-center justify-content-center position-relative d-none border-2 border-white" 
            style="width: 60px; height: 60px; transition: transform 0.2s;" 
            onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"
            onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('alertsModal')).show()" title="ดูการแจ้งเตือน">
        <i class="fas fa-bell fs-4"></i>
        <span id="fab-alert-count" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark border border-2 border-white shadow-sm" style="font-size: 0.8rem; padding: 0.35em 0.6em;">0</span>
    </button>
</div>z