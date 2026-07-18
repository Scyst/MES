<?php 
// MES/page/manpower/components/manpower_modals_bundle.php
?>

<div class="modal fade" id="editLogModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title"><i class="fas fa-user-edit me-2"></i>Edit Attendance</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editLogForm">
                    <input type="hidden" id="editLogId">
                    <input type="hidden" id="editEmpIdHidden">
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Employee</label>
                        <input type="text" class="form-control form-control-plaintext fw-bold" id="editEmpName" readonly>
                    </div>

                    <div class="row g-2 mb-3 bg-warning bg-opacity-10 p-2 rounded border border-warning mx-0">
                        <div class="col-12 border-bottom border-warning pb-1 mb-1">
                            <small class="text-dark fw-bold d-block">
                                <i class="fas fa-history me-1"></i>Recorded Context (แก้ไขสังกัดของวันนั้น)
                            </small>
                        </div>
                        <div class="col-6">
                            <label class="form-label small text-secondary mb-0">Line / Section</label>
                            <select class="form-select form-select-sm fw-bold text-dark border-0 bg-white shadow-sm" id="editLogLine">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                        <div class="col-6 border-start border-warning ps-3">
                            <label class="form-label small text-secondary mb-0">Team</label>
                            <select class="form-select form-select-sm fw-bold text-dark border-0 bg-white shadow-sm" id="editLogTeam">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="editStatus">
                                <option value="PRESENT">PRESENT (มา)</option>
                                <option value="ABSENT">ABSENT (ขาด)</option>
                                <option value="LATE">LATE (สาย)</option>
                                <option value="SICK">SICK (ลาป่วย)</option>
                                <option value="BUSINESS">BUSINESS (ลากิจ)</option>
                                <option value="VACATION">VACATION (พักร้อน)</option>
                                <option value="OTHER">OTHER (อื่นๆ)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Shift</label>
                            <select class="form-select" id="editLogShift">
                                <option value="">-- Auto --</option>
                                <option value="1">DAY (08:00)</option>
                                <option value="2">NIGHT (20:00)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Scan In</label>
                            <input type="time" class="form-control" id="editScanInTime"> 
                        </div>
                        <div class="col-6">
                            <label class="form-label">Scan Out</label>
                            <input type="time" class="form-control" id="editScanOutTime"> 
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Remark</label>
                        <textarea class="form-control" id="editRemark" rows="2" placeholder="ระบุสาเหตุ..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="Actions.saveLogChanges()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true" style="z-index: 1055;">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-white border-bottom pb-0">
                <div class="w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="modal-title fw-bold text-primary" id="detailModalTitle">
                                <i class="fas fa-list-alt me-2"></i>Employee List
                            </h5>
                            <p class="text-muted small mb-0 opacity-75">รายละเอียดการลงเวลาและค่าแรง</p>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <div class="d-flex gap-2 mb-3">
                        <div class="input-group input-group-sm shadow-sm flex-grow-1">
                            <span class="input-group-text bg-light border-end-0 ps-2"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" class="form-control bg-light border-start-0 py-1" id="searchDetail" placeholder="ค้นหาชื่อพนักงาน, รหัส, หรือสถานะ...">
                        </div>
                        <select id="filterDetailTeam" class="form-select form-select-sm shadow-sm w-auto" style="min-width: 120px;" onchange="Actions.initSearch()">
                            <option value="">ทั้งหมด (All Teams)</option>
                        </select>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-primary shadow-sm px-3 dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-tasks"></i> จัดการหลายรายการ <span id="batchSelectedCount" class="badge bg-primary ms-1">0</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="min-width: 200px;">
                                <li><h6 class="dropdown-header text-uppercase small">ตั้งสถานะ (Set Status)</h6></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.batchSetStatus('PRESENT')"><i class="fas fa-check text-success me-2"></i>มา (PRESENT)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.batchSetStatus('ABSENT')"><i class="fas fa-times text-danger me-2"></i>ขาด (ABSENT)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.batchSetStatus('SICK')"><i class="fas fa-procedures text-warning me-2"></i>ลาป่วย (SICK)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.batchSetStatus('BUSINESS')"><i class="fas fa-briefcase text-info me-2"></i>ลากิจ (BUSINESS)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.batchSetStatus('VACATION')"><i class="fas fa-umbrella-beach text-primary me-2"></i>พักร้อน (VACATION)</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-body p-0 bg-light">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 table-striped" id="detailModalTable">
                        <tbody id="detailModalBody">
                            <tr><td colspan="11" class="text-center py-5 text-muted">Loading data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-footer bg-white py-2">
                <div class="me-auto text-muted small d-none d-md-block">
                    <i class="fas fa-info-circle me-1 text-primary"></i> 
                    <span class="text-secondary">สามารถเปลี่ยนสถานะและกดปุ่ม <i class="fas fa-save mx-1"></i> ได้ทันที</span>
                    <span class="mx-2 text-muted">|</span>
                    <span class="text-danger"><i class="fas fa-exclamation-circle me-1"></i>สีแดง = ลืมรูดบัตร (คิดเงิน 8 ชม.)</span>
                </div>
                <button type="button" class="btn btn-secondary btn-sm px-4" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="syncConfirmModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-0 bg-warning bg-opacity-10">
                <h6 class="modal-title fw-bold text-dark">
                    <i class="fas fa-exclamation-triangle text-warning me-2"></i>ยืนยันการ Sync ข้อมูล
                </h6>
            </div>
            <div class="modal-body p-4 text-center">
                <div class="mb-3"><i class="fas fa-sync fa-spin fa-3x text-primary opacity-50"></i></div>
                <h5 class="fw-bold">ดึงข้อมูลจาก Scanner?</h5>
                <p class="text-muted small">ระบบจะคำนวณสถานะใหม่ (ใช้เวลา 1-2 นาที)</p>
            </div>
            <div class="modal-footer border-0 justify-content-center">
                <button type="button" class="btn btn-light border" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary fw-bold" onclick="App.syncNow(); bootstrap.Modal.getInstance(document.getElementById('syncConfirmModal')).hide();">
                    ยืนยัน Sync
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="empEditModal" tabindex="-1" style="z-index: 1065;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-white border-bottom py-2">
                <h5 class="modal-title fw-bold text-dark">
                    <i class="fas fa-user-edit text-primary me-2"></i><span id="empEditTitle">Edit Employee</span>
                    <span id="empStatusBadge" class="badge bg-secondary ms-2" style="font-size: 0.7rem;">Loading...</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="empEditForm">
                    <input type="hidden" id="isEditMode">
                    <input type="hidden" id="currentActiveStatus" value="1"> 
                    
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="form-label small">Emp ID <span class="text-danger">*</span></label>
                            <input type="text" class="form-control fw-bold" id="empEditId" required>
                        </div>
                        <div class="col-8">
                            <label class="form-label small">Name (TH) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="empEditName" required>
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small">Position</label>
                            <input type="text" class="form-control" id="empEditPos">
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Line / Section</label>
                            <select class="form-select" id="empEditLine">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small">Default Shift</label>
                            <select class="form-select" id="empEditShift">
                                <option value="1">Day (08:00)</option>
                                <option value="2">Night (20:00)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small">Team</label>
                            <select class="form-select" id="empEditTeam">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                    </div>

                    <div id="resignInfoCard" class="alert alert-danger py-2 mb-3" style="display: none;">
                        <small><i class="fas fa-info-circle me-1"></i> พนักงานนี้พ้นสภาพแล้ว</small>
                    </div>

                    <div class="row g-2 mb-3 bg-light p-2 rounded border">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-success">
                                <i class="fas fa-calendar-check me-1"></i>Start Date
                            </label>
                            <input type="date" class="form-control form-control-sm" id="empEditStartDate">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-danger">
                                <i class="fas fa-calendar-times me-1"></i>Resign Date
                            </label>
                            <input type="date" class="form-control form-control-sm" id="empEditResignDate">
                        </div>
                    </div>

                    <div id="divRetroUpdate" style="display:none;">
                        <hr class="border-secondary opacity-10 my-3">
                        
                        <div class="bg-warning bg-opacity-10 p-2 rounded border border-warning position-relative">
                            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                NEW
                            </span>
                            
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="editMaster_UpdateLogs" onchange="document.getElementById('retroDateBox').style.display = this.checked ? 'block' : 'none'">
                                <label class="form-check-label fw-bold text-dark small cursor-pointer" for="editMaster_UpdateLogs">
                                    <i class="fas fa-history text-warning me-1"></i> ต้องการอัปเดตย้อนหลังด้วยหรือไม่?
                                </label>
                            </div>
                            
                            <div id="retroDateBox" style="display: none;" class="mt-2 ps-4">
                                <label class="form-label small text-muted mb-1 fw-bold">มีผลตั้งแต่วันที่ (Effective Date):</label>
                                <input type="date" class="form-control form-control-sm border-warning text-primary fw-bold" id="editMaster_EffectiveDate">
                                <div class="text-muted small mt-1 lh-sm" style="font-size: 0.75rem;">
                                    <i class="fas fa-info-circle me-1"></i> ระบบจะเปลี่ยน <u>Line/Team/Shift</u> ในประวัติการเข้างานตั้งแต่วันที่เลือกจนถึงปัจจุบันให้ทันที (ไม่ต้องแก้ทีละวัน)
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-outline-danger me-auto" id="btnResign" 
                        onclick="Actions.handleResignClick()" 
                        title="ปรับสถานะเป็นพ้นสภาพ">
                    <i class="fas fa-user-slash me-1"></i> แจ้งลาออก
                </button>

                <button type="button" class="btn btn-outline-success me-auto" id="btnReactivate" 
                        style="display: none;"
                        onclick="Actions.handleReactivateClick()">
                    <i class="fas fa-trash-restore me-1"></i> รับกลับเข้าทำงาน
                </button>

                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary px-4" onclick="Actions.saveEmployee()">
                    <i class="fas fa-save me-1"></i> Save Data
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="integratedAnalysisModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-fullscreen modal-dialog-scrollable">
        <div class="modal-content border-0">
            
            <div class="modal-header bg-dark text-white py-2 border-bottom-0 d-flex justify-content-between align-items-center">
                <h5 class="modal-title small text-uppercase fw-bold mb-0">
                    <i class="fas fa-chart-network me-2 text-info"></i>Integrated Manpower Analysis
                </h5>
                <div>
                    <button type="button" class="btn btn-sm btn-outline-success me-2" onclick="Actions.exportSimTable()">
                        <i class="fas fa-file-excel me-1"></i> Export Full Report
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="Actions.saveAnalysisAsImage()">
                        <i class="fas fa-camera-retro me-1 text-warning"></i> Save as Image
                    </button>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
            </div>

            <div class="bg-light border-bottom p-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range Start</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-alt text-primary"></i></span>
                            <input type="date" id="ia_startDate" class="form-control border-start-0 ps-0" value="<?php echo date('Y-m-01'); ?>">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range End</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-check text-primary"></i></span>
                            <input type="date" id="ia_endDate" class="form-control border-start-0 ps-0" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Team / Group</label>
                        <select id="ia_hcGroupSelect" class="form-select form-select-sm">
                            <option value="ALL">All Teams</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Focus Line</label>
                        <select id="superLineSelect" class="form-select form-select-sm">
                            <option value="ALL">All Lines (Overview)</option>
                            </select>
                    </div>
                </div>
            </div>

            <div class="modal-body p-0 bg-white">
                <ul class="nav nav-tabs nav-tabs-bordered px-3 pt-3" id="iaTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active fw-bold" id="tab-overview-btn" data-bs-toggle="tab" data-bs-target="#tab-overview" type="button" role="tab">
                            <i class="fas fa-chart-line me-2 text-success"></i>Operations & Trends
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link fw-bold" id="tab-executive-btn" data-bs-toggle="tab" data-bs-target="#tab-executive" type="button" role="tab">
                            <i class="fas fa-users-cog me-2 text-primary"></i>Employee KPIs
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link fw-bold" id="tab-financial-btn" data-bs-toggle="tab" data-bs-target="#tab-financial" type="button" role="tab">
                            <i class="fas fa-coins me-2 text-warning"></i>Financial Analysis
                        </button>
                    </li>
                </ul>

                <div class="tab-content p-3" id="iaTabContent">
                    
                    <div class="tab-pane fade show active" id="tab-overview" role="tabpanel">
                        <div class="row g-2 mb-3">
                            <div class="col-md-2">
                                <div class="p-2 bg-gradient-primary text-white border rounded shadow-sm h-100 position-relative overflow-hidden" style="background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);">
                                    <div class="d-flex justify-content-between align-items-center mb-1 position-relative z-index-1">
                                        <span class="text-uppercase fw-bold small opacity-75">Total HC</span>
                                        <span id="ia_rpt_attrition" class="badge bg-white text-primary rounded-pill shadow-sm" style="font-size: 0.7rem;">--</span>
                                    </div>
                                    <h3 id="ia_rpt_hc" class="mb-2 fw-bold text-center position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <table class="table table-borderless table-sm mb-0 small text-center text-white opacity-75 position-relative z-index-1" style="font-size: 0.7rem;">
                                        <thead><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_hc_max" class="fw-bold">0</td><td id="ia_rpt_hc_min">0</td><td id="ia_rpt_hc_avg">0</td></tr></tbody>
                                    </table>
                                    <i class="fas fa-users position-absolute opacity-25" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="p-2 bg-gradient-success text-white border rounded shadow-sm h-100 position-relative overflow-hidden" style="background: linear-gradient(135deg, #1cc88a 0%, #13855c 100%);">
                                    <div class="text-uppercase fw-bold small opacity-75 mb-1 position-relative z-index-1">Actual Present</div>
                                    <h3 id="ia_rpt_actual" class="mb-2 fw-bold text-center position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <table class="table table-borderless table-sm mb-0 small text-center text-white opacity-75 position-relative z-index-1" style="font-size: 0.7rem;">
                                        <thead><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_actual_max" class="fw-bold">0</td><td id="ia_rpt_actual_min">0</td><td id="ia_rpt_actual_avg">0</td></tr></tbody>
                                    </table>
                                    <i class="fas fa-user-check position-absolute opacity-25" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="p-2 bg-gradient-danger text-white border rounded shadow-sm h-100 position-relative overflow-hidden" style="background: linear-gradient(135deg, #e74a3b 0%, #be2617 100%);">
                                    <div class="text-uppercase fw-bold small opacity-75 mb-1 position-relative z-index-1">Total Absent</div>
                                    <h3 id="ia_rpt_absent" class="mb-2 fw-bold text-center position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <table class="table table-borderless table-sm mb-0 small text-center text-white opacity-75 position-relative z-index-1" style="font-size: 0.7rem;">
                                        <thead><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_absent_max" class="fw-bold">0</td><td id="ia_rpt_absent_min">0</td><td id="ia_rpt_absent_avg">0</td></tr></tbody>
                                    </table>
                                    <i class="fas fa-user-times position-absolute opacity-25" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="p-2 bg-gradient-info text-white border rounded shadow-sm h-100 position-relative overflow-hidden" style="background: linear-gradient(135deg, #36b9cc 0%, #258391 100%);">
                                    <div class="text-uppercase fw-bold small opacity-75 mb-1 position-relative z-index-1">Total Leave</div>
                                    <h3 id="ia_rpt_leave" class="mb-2 fw-bold text-center position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <table class="table table-borderless table-sm mb-0 small text-center text-white opacity-75 position-relative z-index-1" style="font-size: 0.7rem;">
                                        <thead><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_leave_max" class="fw-bold">0</td><td id="ia_rpt_leave_min">0</td><td id="ia_rpt_leave_avg">0</td></tr></tbody>
                                    </table>
                                    <i class="fas fa-user-injured position-absolute opacity-25" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="p-2 bg-white border rounded shadow-sm h-100 position-relative overflow-hidden">
                                    <div class="text-uppercase fw-bold small text-success mb-1 position-relative z-index-1">New Joiners</div>
                                    <h3 id="ia_rpt_new_joiners" class="mb-2 fw-bold text-center text-success position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <div class="text-center small text-muted mt-3 pt-2 border-top">In selected range</div>
                                    <i class="fas fa-user-plus position-absolute text-success opacity-10" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="p-2 bg-white border rounded shadow-sm h-100 position-relative overflow-hidden">
                                    <div class="text-uppercase fw-bold small text-danger mb-1 position-relative z-index-1">Resigned</div>
                                    <h3 id="ia_rpt_resigned" class="mb-2 fw-bold text-center text-danger position-relative z-index-1" style="font-size: 1.8rem;">0</h3>
                                    <div class="text-center small text-muted mt-3 pt-2 border-top">In selected range</div>
                                    <i class="fas fa-user-minus position-absolute text-danger opacity-10" style="font-size: 4rem; right: -10px; bottom: -10px;"></i>
                                </div>
                            </div>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-lg-8">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-chart-line me-2 text-primary"></i>Performance Trend (Plan vs Actual)
                                    </div>
                                    <div class="card-body p-2">
                                        <div style="height: 220px; width: 100%;">
                                            <canvas id="ia_trendLineChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-users-cog me-2 text-dark"></i>Workforce Structure
                                    </div>
                                    <div class="card-body p-2 d-flex align-items-center justify-content-center">
                                        <div style="height: 220px; width: 100%;">
                                            <canvas id="ia_structureDonut"></canvas> </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row g-2">
                            <div class="col-lg-8">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-layer-group me-2 text-success"></i>Daily Breakdown & Capacity</span>
                                        <span class="badge bg-light text-dark border">Combo Chart</span>
                                    </div>
                                    <div class="card-body p-2">
                                        <div style="height: 250px; width: 100%;">
                                            <canvas id="ia_comboChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card border shadow-sm h-100">
                                    <div class="card-header bg-white py-1 fw-bold small text-uppercase text-secondary">
                                        <i class="fas fa-chart-pie me-2 text-warning"></i>Attendance Ratio
                                    </div>
                                    <div class="card-body p-2 d-flex align-items-center justify-content-center">
                                        <div style="height: 250px; width: 100%;">
                                            <canvas id="ia_attendanceDonut"></canvas> </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="tab-financial" role="tabpanel"> 
    
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <div class="card border-0 shadow-sm h-100 bg-warning bg-opacity-10" style="border-radius: 12px;">
                                    <div class="card-body p-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <div class="fw-bold text-warning small text-uppercase" style="filter: brightness(0.8);">
                                                <i class="fas fa-calculator me-1"></i> Current Logic (สูตรเดิม)
                                            </div>
                                        </div>
                                        <div class="h4 mb-0 fw-bold text-dark" id="fin_old_total">-</div>
                                        <div class="small text-muted mt-2"><i class="fas fa-info-circle me-1"></i>Standard Calculation</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4">
                                <div class="card border-0 shadow-sm h-100 bg-success bg-opacity-10" style="border-radius: 12px;">
                                    <div class="card-body p-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <div class="fw-bold text-success small text-uppercase">
                                                <i class="fas fa-magic me-1"></i> New Logic (สูตรใหม่)
                                            </div>
                                        </div>
                                        <div class="h4 mb-0 fw-bold text-success" id="fin_new_total">-</div>
                                        <div class="small text-success text-opacity-75 mt-2"><i class="fas fa-calendar-check me-1"></i>Adj. Sat/Sun & Holiday</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4">
                                <div class="card border-0 shadow-sm h-100 bg-info bg-opacity-10" id="fin_impact_card" style="border-radius: 12px; transition: all 0.3s ease;">
                                    <div class="card-body p-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <div class="fw-bold text-info small text-uppercase">
                                                <i class="fas fa-balance-scale me-1"></i> Net Impact (ผลต่าง)
                                            </div>
                                            <span class="badge bg-white text-dark shadow-sm" id="fin_diff_percent" style="font-size: 0.8rem;">0%</span>
                                        </div>
                                        <div class="h4 mb-0 fw-bold text-dark" id="fin_diff_total">-</div>
                                        <div class="small text-muted mt-2" id="fin_impact_text"><i class="fas fa-chart-pie me-1"></i>Variance Analysis</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-lg-12">
                                <div class="card border-0 shadow-sm mb-3">
                                    <div class="card-header py-3 bg-white border-bottom-0 d-flex justify-content-between align-items-center">
                                        <h6 class="m-0 fw-bold text-primary text-uppercase" style="letter-spacing: 0.5px;">
                                            <i class="fas fa-chart-bar me-1"></i> Cost Impact by Line
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-area" style="height: 300px;">
                                            <canvas id="financialImpactChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-12">
                                <div class="card border-0 shadow-sm">
                                    <div class="card-header py-3 bg-white border-bottom-0">
                                        <h6 class="m-0 fw-bold text-primary text-uppercase" style="letter-spacing: 0.5px;">
                                            <i class="fas fa-table me-1"></i> Detailed Breakdown
                                        </h6>
                                    </div>
                                    <div class="card-body p-0">
                                        <div class="table-responsive">
                                            <table class="table table-sm table-hover mb-0 align-middle" style="font-size: 0.85rem;">
                                                <thead class="bg-primary bg-gradient text-white shadow-sm">
                                                    <tr>
                                                        <th class="ps-3" width="20%">Line</th>
                                                        <th class="text-end" width="15%">Old (Std)</th>
                                                        <th class="text-end" width="15%">New (Act)</th>
                                                        <th class="text-end" width="15%">Diff</th>
                                                        <th class="text-center" width="10%">% Var</th>
                                                        <th class="text-end text-muted" width="12%">New DL</th>
                                                        <th class="text-end text-muted" width="12%">New OT</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="financialTableBody">
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="tab-executive" role="tabpanel">
                        <div class="card border shadow-sm">
                            <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-uppercase text-secondary">
                                    <i class="fas fa-users-cog me-2 text-primary"></i>Individual Employee KPIs
                                </span>
                                <div>
                                    <input type="text" class="form-control form-control-sm border-secondary" id="execReportSearch" placeholder="Search Employee..." onkeyup="Actions.renderExecReport()" style="width: 250px;">
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive" style="max-height: calc(100vh - 250px); min-height: 50vh; display: block !important;">
                                    <table class="table table-hover table-striped align-middle mb-0 bg-white w-100" id="execReportTable" style="margin-top: 0 !important; margin-bottom: auto !important;">
                                        <thead class="bg-light text-secondary shadow-sm" style="position: sticky; top: 0; z-index: 10;">
                                            <tr class="text-center small">
                                                <th class="text-start ps-3 py-3">Employee</th>
                                                <th width="10%">Line</th>
                                                <th width="10%">Team</th>
                                                <th width="10%">Total Working Days</th>
                                                <th width="10%">Present</th>
                                                <th width="10%">Late</th>
                                                <th width="10%">Leave</th>
                                                <th width="10%">Absent</th>
                                                <th width="10%">Attendance %</th>
                                            </tr>
                                        </thead>
                                        <tbody id="execReportBody">
                                            <tr><td colspan="9" class="text-center py-5">Loading...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>

<!-- KPI Modal (Individual) -->
<div class="modal fade" id="empKpiModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-white border-bottom py-2 pe-3">
                <div class="d-flex flex-column">
                    <h5 class="modal-title fw-bold text-primary">
                        <i class="fas fa-chart-pie me-2"></i> Individual KPI Dashboard
                    </h5>
                    <div class="small text-muted" id="empKpiSubtitle">Loading...</div>
                </div>
                <div class="ms-auto">
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
            </div>
            <div class="modal-body bg-light p-4">
                <div class="row g-3">
                    <div class="col-md-5">
                        <div class="card border-0 shadow-sm h-100 rounded-4">
                            <div class="card-body text-center d-flex flex-column justify-content-center">
                                <h6 class="text-muted text-uppercase fw-bold mb-3">Attendance Rate</h6>
                                <h1 class="display-3 fw-bold text-success mb-0" id="empKpiRate">--%</h1>
                                <p class="text-muted small mt-2">เปอร์เซ็นต์การเข้างาน (ไม่รวมลากิจ/ป่วย)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="card border-0 shadow-sm rounded-4 text-center p-3">
                                    <div class="text-muted small fw-bold">วันทำงานรวม (YTD)</div>
                                    <h3 class="fw-bold mb-0 text-dark" id="empKpiTotal">--</h3>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="card border-0 shadow-sm rounded-4 text-center p-3">
                                    <div class="text-muted small fw-bold">มาทำงาน (Present)</div>
                                    <h3 class="fw-bold mb-0 text-success" id="empKpiPresent">--</h3>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="card border-0 shadow-sm rounded-4 text-center p-3">
                                    <div class="text-muted small fw-bold">มาสาย (Late)</div>
                                    <h3 class="fw-bold mb-0 text-warning" id="empKpiLate">--</h3>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="card border-0 shadow-sm rounded-4 text-center p-3">
                                    <div class="text-muted small fw-bold">ขาดงาน (Absent)</div>
                                    <h3 class="fw-bold mb-0 text-danger" id="empKpiAbsent">--</h3>
                                </div>
                            </div>
                            <div class="col-12 mt-2">
                                <div class="card border-0 shadow-sm rounded-4 text-center p-3">
                                    <div class="text-muted small fw-bold">ลางานทั้งหมด (Sick/Business/Vacation)</div>
                                    <h3 class="fw-bold mb-0 text-info" id="empKpiLeave">--</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


<?php require_once __DIR__ . '/master_settings_modal.php'; ?>
