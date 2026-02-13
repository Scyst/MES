<?php 
// MES/page/manpower/components/manpower_modals_bundle.php 
// รวม Modal ทั้งหมดไว้ที่นี่ (Updated: Added Start/Resign Date to Employee Edit)
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
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-white border-bottom py-2 pe-3">
                <div class="d-flex flex-column me-3">
                    <h5 class="modal-title fw-bold text-dark">
                        <i class="fas fa-users-cog text-primary me-2"></i>Employee Management
                    </h5>
                </div>
                
                <div class="ms-auto d-flex align-items-center gap-2">
                    <button class="btn btn-primary btn-sm shadow-sm text-nowrap" onclick="Actions.openEmpEdit()">
                        <i class="fas fa-plus me-1"></i> New
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
            </div>

            <div class="modal-body bg-light border-bottom py-2 px-3">
                
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    
                    <div class="d-flex align-items-center gap-2">
                        
                        <div class="input-group input-group-sm" style="width: 200px;">
                            <span class="input-group-text bg-white border-end-0 text-muted ps-2"><i class="fas fa-search"></i></span>
                            <input type="text" id="empSearchBox" class="form-control border-start-0 py-1" placeholder="Search..." onkeyup="Actions.filterEmployeeList()">
                        </div>

                        <div class="input-group input-group-sm" style="width: 150px;">
                            <span class="input-group-text bg-white text-muted border-end-0"><i class="fas fa-industry"></i></span>
                            <select id="empFilterLine" class="form-select border-start-0" onchange="Actions.filterEmployeeList()">
                                <option value="">All Lines</option>
                                </select>
                        </div>

                        <div class="d-flex align-items-center bg-white rounded border shadow-sm p-0 overflow-hidden">
                            
                            <select id="empDateType" class="form-select form-select-sm border-0 fw-bold text-primary" style="width: 130px; background-color: transparent;" onchange="Actions.toggleDateInputs(); Actions.filterEmployeeList();">
                                <option value="">📅 Any Date</option>
                                <option value="JOIN">Joined Date</option>
                                <option value="RESIGN">Resigned Date</option>
                            </select>

                            <div id="empDateWrapper" class="d-none d-flex align-items-center border-start ps-2 pe-2 gap-1 bg-light animate__animated animate__fadeInLeft animate__fast">
                                <input type="date" id="empDateFrom" class="form-control form-control-sm border-0 bg-transparent p-0" style="width: 110px;" onchange="Actions.filterEmployeeList()">
                                <span class="text-muted small">-</span>
                                <input type="date" id="empDateTo" class="form-control form-control-sm border-0 bg-transparent p-0" style="width: 110px;" onchange="Actions.filterEmployeeList()">
                            </div>

                        </div>

                        <button class="btn btn-sm btn-link text-secondary text-decoration-none" onclick="Actions.resetEmployeeFilters()" title="Reset Filters">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>

                    <div class="d-flex flex-wrap align-items-center gap-2 justify-content-end">

                        <div class="btn-group btn-group-sm shadow-sm me-2" role="group">
                            <input type="radio" class="btn-check" name="empStatusFilter" id="filterStatusActive" value="1" checked onchange="Actions.filterEmployeeList()">
                            <label class="btn btn-outline-success px-2" for="filterStatusActive">Active</label>

                            <input type="radio" class="btn-check" name="empStatusFilter" id="filterStatusInactive" value="0" onchange="Actions.filterEmployeeList()">
                            <label class="btn btn-outline-secondary px-2" for="filterStatusInactive">Resigned</label>

                            <input type="radio" class="btn-check" name="empStatusFilter" id="filterStatusAll" value="ALL" onchange="Actions.filterEmployeeList()">
                            <label class="btn btn-outline-primary px-2" for="filterStatusAll">All</label>
                        </div>

                    </div>

                </div>

            </div>

            <div class="modal-body p-0 bg-white">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" style="min-width: 1000px;">
                        <thead class="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th class="ps-4" width="25%">Employee Profile</th>
                                <th width="15%">Line / Section</th>
                                <th class="text-center" width="10%">Shift</th>
                                <th class="text-center" width="10%">Type</th>
                                <th class="text-center" width="18%">Status / Timeline</th>
                                <th width="15%">Tags / Data Check</th>
                                <th class="text-end pe-4" width="10%">Action</th>
                            </tr>
                        </thead>
                        <tbody id="empListBody">
                            </tbody>
                    </table>
                </div>
            </div>
            
            <div class="modal-footer bg-light py-2 justify-content-between">
                <div class="small text-muted" id="empListCount">Loaded: 0 records</div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="empEditModal" tabindex="-1" style="z-index: 1065;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title">
                    <i class="fas fa-user-edit me-2"></i><span id="empEditTitle">Edit Employee</span>
                    <span id="empStatusBadge" class="badge bg-secondary ms-3 border border-light" style="font-size: 0.7rem;">Loading...</span>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
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

<div class="modal fade" id="integratedAnalysisModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-dark text-white py-2 border-bottom-0">
                <h5 class="modal-title small text-uppercase fw-bold">
                    <i class="fas fa-chart-network me-2 text-info"></i>Integrated Manpower Analysis
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
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
                        <button class="nav-link fw-bold" id="tab-financial-btn" data-bs-toggle="tab" data-bs-target="#tab-financial" type="button" role="tab">
                            <i class="fas fa-coins me-2 text-warning"></i>Financial Analysis
                        </button>
                    </li>
                </ul>

                <div class="tab-content p-3" id="iaTabContent">
                    
                    <div class="tab-pane fade show active" id="tab-overview" role="tabpanel">
                        <div class="row g-2 mb-3">
                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="text-uppercase fw-bold small text-secondary">Total HC</span>
                                        <span id="ia_rpt_attrition" class="badge bg-light text-muted border" style="font-size: 0.7rem;">--</span>
                                    </div>
                                    <h3 id="ia_rpt_hc" class="mb-2 fw-bold text-primary text-center">0</h3>
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted"><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_hc_max" class="fw-bold">0</td><td id="ia_rpt_hc_min">0</td><td id="ia_rpt_hc_avg">0</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Actual Present</div>
                                    <h3 id="ia_rpt_actual" class="mb-2 fw-bold text-success text-center">0</h3>
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted"><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_actual_max" class="fw-bold">0</td><td id="ia_rpt_actual_min">0</td><td id="ia_rpt_actual_avg">0</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Total Absent</div>
                                    <h3 id="ia_rpt_absent" class="mb-2 fw-bold text-danger text-center">0</h3>
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted"><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_absent_max" class="fw-bold">0</td><td id="ia_rpt_absent_min">0</td><td id="ia_rpt_absent_avg">0</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="p-2 bg-white border rounded shadow-sm h-100">
                                    <div class="text-uppercase fw-bold small text-secondary mb-1">Total Leave</div>
                                    <h3 id="ia_rpt_leave" class="mb-2 fw-bold text-info text-center">0</h3>
                                    <table class="table table-bordered table-sm mb-0 small text-center" style="font-size: 0.7rem;">
                                        <thead class="bg-light text-muted"><tr><th>Max</th><th>Min</th><th>Avg</th></tr></thead>
                                        <tbody><tr><td id="ia_rpt_leave_max" class="fw-bold">0</td><td id="ia_rpt_leave_min">0</td><td id="ia_rpt_leave_avg">0</td></tr></tbody>
                                    </table>
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
                                <div class="card border-start border-4 border-secondary shadow-sm h-100">
                                    <div class="card-body py-2">
                                        <div class="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                                            Current Logic (สูตรเดิม)
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="fin_old_total">-</div>
                                        <div class="small text-muted mt-1">Standard Calculation</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4">
                                <div class="card border-start border-4 border-primary shadow-sm h-100">
                                    <div class="card-body py-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                            New Logic (สูตรใหม่)
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="fin_new_total">-</div>
                                        <div class="small text-muted mt-1">Adj. Sat/Sun & Holiday</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4">
                                <div class="card border-start border-4 border-info shadow-sm h-100" id="fin_impact_card">
                                    <div class="card-body py-2">
                                        <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                            Net Impact (ผลต่าง)
                                        </div>
                                        <div class="row no-gutters align-items-center">
                                            <div class="col mr-2">
                                                <div class="h5 mb-0 font-weight-bold text-gray-800" id="fin_diff_total">-</div>
                                            </div>
                                            <div class="col-auto">
                                                <span class="badge bg-light text-dark border" id="fin_diff_percent">0%</span>
                                            </div>
                                        </div>
                                        <div class="small text-muted mt-1" id="fin_impact_text">Variance Analysis</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3">
                            <div class="col-lg-12">
                                <div class="card shadow-sm mb-3">
                                    <div class="card-header py-2 bg-light d-flex justify-content-between align-items-center">
                                        <h6 class="m-0 font-weight-bold text-dark small">
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
                                <div class="card shadow-sm">
                                    <div class="card-header py-2 bg-light">
                                        <h6 class="m-0 font-weight-bold text-dark small">
                                            <i class="fas fa-table me-1"></i> Detailed Breakdown
                                        </h6>
                                    </div>
                                    <div class="card-body p-0">
                                        <div class="table-responsive">
                                            <table class="table table-sm table-hover mb-0 align-middle" style="font-size: 0.85rem;">
                                                <thead class="bg-light text-secondary">
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

                </div>
            </div>

            <div class="modal-footer bg-light py-2">
                <div class="me-auto small text-muted">
                    <i class="fas fa-info-circle me-1"></i> Values calculated based on daily logs & master rates.
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-success btn-sm shadow-sm" onclick="Actions.exportSimTable()">
                    <i class="fas fa-file-excel me-1"></i> Export Full Report
                </button>
            </div>
        </div>
    </div>
</div>