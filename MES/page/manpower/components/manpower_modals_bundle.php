<?php 
// MES/page/manpower/components/manpower_modals_bundle.php 
// รวม Modal ทั้งหมดไว้ที่นี่ (Cleaned & ID Fixed)
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
                            <input type="datetime-local" class="form-control" id="editScanInTime"> 
                        </div>
                        <div class="col-6">
                            <label class="form-label">Scan Out</label>
                            <input type="datetime-local" class="form-control" id="editScanOutTime"> 
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

                    <div class="input-group input-group-lg mb-3 shadow-sm">
                        <span class="input-group-text bg-light border-end-0 ps-3"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" class="form-control bg-light border-start-0" id="searchDetail" placeholder="ค้นหาชื่อพนักงาน, รหัส, หรือสถานะ..." style="font-size: 0.95rem;">
                    </div>
                </div>
            </div>

            <div class="modal-body p-0 bg-light">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 table-striped" id="detailModalTable">
                        <tbody id="detailModalBody">
                            <tr><td colspan="10" class="text-center py-5 text-muted">Loading data...</td></tr>
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

<div class="modal fade" id="shiftPlannerModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-warning bg-opacity-10">
                <div>
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-users-cog me-2"></i>Shift Rotation Manager</h5>
                    <small class="text-muted">จัดการกะการทำงานแบบยกทีม</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-secondary">
                            <tr>
                                <th class="ps-4 py-3">Line / Section</th>
                                <th class="text-center">Current Shift</th>
                                <th class="text-center">Shift ID</th>
                                <th class="text-center pe-4">Action</th>
                            </tr>
                        </thead>
                        <tbody id="shiftPlannerBody"></tbody>
                    </table>
                </div>
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

<div class="modal fade" id="empListModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg" style="height: 80vh;">
            
            <div class="modal-header bg-white border-bottom py-3">
                <div>
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-address-book me-2 text-primary"></i>Employee Address Book</h5>
                    <p class="text-muted small mb-0">ค้นหาและจัดการข้อมูลพนักงาน</p>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                    
                    <div class="form-check form-switch me-2 border rounded p-1 ps-5 pe-2 bg-light">
                        <input class="form-check-input" type="checkbox" id="showInactiveToggle" onchange="Actions.openEmployeeManager()">
                        <label class="form-check-label small fw-bold text-secondary cursor-pointer" for="showInactiveToggle">Show Inactive</label>
                    </div>

                    <div class="input-group" style="width: 250px;">
                        <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" class="form-control border-start-0" id="empSearchBox" placeholder="ค้นหาชื่อ, รหัส..." onkeyup="Actions.filterEmployeeList()">
                    </div>
                    <button class="btn btn-outline-primary shadow-sm" onclick="Actions.openMappingManager()">
                        <i class="fas fa-tags me-1"></i> Mappings
                    </button>
                    <button class="btn btn-primary" onclick="Actions.openEmpEdit()">
                        <i class="fas fa-plus"></i> New
                    </button>
                    
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
            </div>

            <div class="modal-body p-0 bg-light">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 table-striped">
                        <thead class="bg-white text-secondary sticky-top shadow-sm">
                            <tr class="text-uppercase small">
                                <th class="ps-4" style="width:15%">ID</th>
                                <th style="width:25%">Name</th>
                                <th style="width:15%">Position</th>
                                <th style="width:10%">Line</th>
                                <th class="text-center" style="width:10%">Shift</th>
                                <th class="text-center" style="width:5%">Team</th>
                                <th class="text-center" style="width:10%">Active</th>
                                <th class="text-center pe-4" style="width:5%">Edit</th>
                            </tr>
                        </thead>
                        <tbody id="empListBody">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="empEditModal" tabindex="-1" style="z-index: 1065;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title" id="empEditTitle"><i class="fas fa-user-edit me-2"></i>Edit Employee</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="empEditForm">
                    <input type="hidden" id="isEditMode"> 
                    
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

                    <div class="form-check form-switch bg-light p-2 rounded border mb-3">
                        <input class="form-check-input ms-0 me-2" type="checkbox" id="empEditActive" checked>
                        <label class="form-check-label fw-bold" for="empEditActive">Active Status (ยังทำงานอยู่)</label>
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
                <button type="button" class="btn btn-outline-danger me-auto" id="btnDeleteEmp" 
                        onclick="const id=document.getElementById('empEditId').value; const name=document.getElementById('empEditName').value; Actions.terminateStaff(id, name);" 
                        title="ปรับสถานะเป็นพ้นสภาพและลบแผนงานในอนาคต">
                    <i class="fas fa-user-slash me-1"></i> แจ้งลาออก (Resign)
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary px-4" onclick="Actions.saveEmployee()">
                    <i class="fas fa-save me-1"></i> Save Data
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="mappingModal" tabindex="-1" aria-hidden="true" style="z-index: 1070;">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-indigo text-white" style="background-color: #6610f2;">
                <div>
                    <h5 class="modal-title"><i class="fas fa-tags me-2"></i>Position Mapping</h5>
                    <p class="mb-0 small opacity-75">จับคู่ "คำในตำแหน่ง" ให้เป็น "ประเภทพนักงาน"</p>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th class="ps-4">Keyword (คำในตำแหน่ง)</th>
                                <th>Map to Type</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="mappingBody">
                            </tbody>
                        <tfoot class="bg-light border-top">
                            <tr>
                                <td class="ps-4">
                                    <input type="text" class="form-control form-control-sm" id="newMapKeyword" placeholder="เช่น Driver, Admin...">
                                </td>
                                <td>
                                    <input class="form-control form-control-sm" list="typeList" id="newMapType" placeholder="เลือกหรือพิมพ์ใหม่...">
                                    <datalist id="typeList">
                                        </datalist>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-primary rounded-circle shadow-sm" onclick="Actions.addMapping()" title="Add">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <small class="text-muted me-auto"><i class="fas fa-info-circle me-1"></i>ระบบจะเรียนรู้ประเภทใหม่ๆ จากสิ่งที่คุณพิมพ์เพิ่มเข้าไป</small>
                <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="reportRangeModal" tabindex="-1" aria-hidden="true" style="z-index: 1080;">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-white border-bottom">
                <h5 class="modal-title fw-bold text-dark"><i class="fas fa-chart-line text-primary me-2"></i>Manpower Summary Report</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body py-2">
                        <div class="d-flex flex-wrap align-items-center gap-2">
                            
                            <div class="input-group input-group-sm" style="width: auto;">
                                <span class="input-group-text bg-white text-secondary fw-bold">Date</span>
                                <input type="date" id="reportStartDate" class="form-control" style="max-width: 130px;">
                                <span class="input-group-text bg-white">-</span>
                                <input type="date" id="reportEndDate" class="form-control" style="max-width: 130px;">
                            </div>

                            <select id="rpt_line" class="form-select form-select-sm" style="width: 140px;">
                                <option value="ALL">All Lines</option>
                            </select>

                            <select id="rpt_shift" class="form-select form-select-sm" style="width: 110px;">
                                <option value="ALL">All Shift</option>
                                <option value="Day">Day</option>
                                <option value="Night">Night</option>
                            </select>

                            <select id="rpt_type" class="form-select form-select-sm" style="width: 120px;">
                                <option value="ALL">All Types</option>
                                <option value="Daily">Daily</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Subcontract">Subcontract</option>
                            </select>

                            </div>
                    </div>
                </div>

                <div class="row g-2 mb-3">
    
                <style>
                    .stat-label { font-size: 0.65rem; color: #858796; text-transform: uppercase; font-weight: 700; display: block; }
                    .stat-val   { font-size: 0.9rem; font-weight: 700; color: #333; display: block; }
                    .stat-box   { text-align: center; border-right: 1px solid rgba(0,0,0,0.05); }
                    .stat-box:last-child { border-right: none; }
                    .card-stat-container { display: flex; justify-content: space-between; margin-top: 0.5rem; background: rgba(255,255,255,0.5); border-radius: 4px; padding: 4px 0; }
                </style>

                <div class="col-lg-3 col-6">
                    <div class="card h-100 border-primary border-start border-3 shadow-sm">
                        <div class="card-body p-2">
                            <div class="text-uppercase small text-primary fw-bold">Headcount</div>
                            <div class="d-flex align-items-baseline justify-content-between">
                                <div class="h3 fw-bold text-dark mb-0" id="rpt_hc">0</div>
                                <div class="small fw-bold" id="rpt_new">+0 / -0</div>
                            </div>
                            
                            <div class="card-stat-container">
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Max</span>
                                    <span class="stat-val" id="hc_max">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Min</span>
                                    <span class="stat-val" id="hc_min">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Avg</span>
                                    <span class="stat-val text-primary" id="hc_avg">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;"> <span class="stat-label text-primary">Latest</span>
                                    <span class="stat-val text-primary" id="hc_last">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-3 col-6">
                    <div class="card h-100 border-success border-start border-3 shadow-sm">
                        <div class="card-body p-2">
                            <div class="text-uppercase small text-success fw-bold">Present</div>
                            <div class="h3 fw-bold text-dark mb-0" id="rpt_actual">0</div>

                            <div class="card-stat-container">
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Max</span>
                                    <span class="stat-val" id="act_max">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Min</span>
                                    <span class="stat-val" id="act_min">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Avg</span>
                                    <span class="stat-val text-success" id="act_avg">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;"> <span class="stat-label text-success">Latest</span>
                                    <span class="stat-val text-success" id="act_last">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-3 col-6">
                    <div class="card h-100 border-danger border-start border-3 shadow-sm">
                        <div class="card-body p-2">
                            <div class="text-uppercase small text-danger fw-bold">Absent</div>
                            <div class="h3 fw-bold text-dark mb-0" id="rpt_absent">0</div>

                            <div class="card-stat-container">
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Max</span>
                                    <span class="stat-val" id="abs_max">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Min</span>
                                    <span class="stat-val" id="abs_min">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Avg</span>
                                    <span class="stat-val text-danger" id="abs_avg">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;"> <span class="stat-label text-danger">Latest</span>
                                    <span class="stat-val text-danger" id="abs_last">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-3 col-6">
                    <div class="card h-100 border-info border-start border-3 shadow-sm">
                        <div class="card-body p-2">
                            <div class="text-uppercase small text-info fw-bold">Leave</div>
                            <div class="h3 fw-bold text-dark mb-0" id="rpt_leave">0</div>

                            <div class="card-stat-container">
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Max</span>
                                    <span class="stat-val" id="lev_max">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Min</span>
                                    <span class="stat-val" id="lev_min">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;">
                                    <span class="stat-label">Avg</span>
                                    <span class="stat-val text-info" id="lev_avg">0</span>
                                </div>
                                <div class="stat-box" style="width: 25%;"> <span class="stat-label text-info">Latest</span>
                                    <span class="stat-val text-info" id="lev_last">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                <div class="card border-0 shadow-sm">
                    <div class="card-body" style="height: 250px;">
                        <canvas id="reportChart"></canvas>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>