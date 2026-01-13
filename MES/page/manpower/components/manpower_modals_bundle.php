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

<div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-white border-bottom py-3">
                <div>
                    <h5 class="modal-title fw-bold text-primary" id="detailModalTitle">
                        <i class="fas fa-list-alt me-2"></i>Employee List
                    </h5>
                    <p class="text-muted small mb-0">รายละเอียดการลงเวลา</p>
                </div>
                <div class="d-flex gap-2 align-items-center">
                    <div class="input-group input-group-sm" style="width: 250px;">
                        <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" class="form-control border-start-0" id="searchDetail" placeholder="ค้นหาชื่อ..." onfocus="Actions.initSearch()">
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
            </div>
            <div class="modal-body p-0 bg-light">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 table-striped">
                        <thead class="bg-white text-secondary sticky-top shadow-sm" style="z-index: 1;">
                            <tr class="text-center small text-muted text-uppercase">
                                <th class="text-start ps-4 py-3" style="width: 20%;">Employee</th>
                                <th style="width: 12%;">Line</th>
                                <th style="width: 8%;">Team</th>
                                <th style="width: 10%;">Shift</th>
                                
                                <th style="width: 10%;">In</th>
                                <th style="width: 10%;">Out</th>
                                <th style="width: 12%;">Status</th>
                                <th style="width: 10%;">Remark</th>
                                <th class="pe-4" style="width: 8%;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="detailModalBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-white py-2">
                <div class="me-auto text-muted small">
                    <i class="fas fa-info-circle me-1"></i> สามารถเปลี่ยนสถานะและกดปุ่ม Save ได้ทันที
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

<div class="modal fade" id="createEmpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="fas fa-user-plus me-2"></i>Add New Employee</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createEmpForm">
                    <div class="mb-3">
                        <label class="form-label">Employee ID <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="newEmpId" placeholder="10xxxxxxx" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Name (TH) <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="newEmpName" required>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label">Line / Section</label>
                            <select class="form-select" id="newEmpLine">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Position</label>
                            <input type="text" class="form-control" id="newEmpPos" value="Operator">
                        </div>
                    </div>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="form-label">Default Shift</label>
                            <select class="form-select" id="newEmpShift">
                                <option value="1">Day (08:00)</option>
                                <option value="2">Night (20:00)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Team</label>
                            <select class="form-select" id="newEmpTeam">
                                <option value="" disabled selected>Loading...</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-success" onclick="Actions.createEmployee()">
                    <i class="fas fa-check me-1"></i> Create
                </button>
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
                <div class="d-flex gap-2">
                    <div class="input-group" style="width: 300px;">
                        <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" class="form-control border-start-0" id="empSearchBox" placeholder="ค้นหาชื่อ, รหัส, แผนก..." onkeyup="Actions.filterEmployeeList()">
                    </div>
                    
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
                            <tr>
                                <th class="ps-4">ID</th>
                                <th>Name</th>
                                <th>Position</th>
                                <th>Line</th>
                                <th class="text-center">Shift</th>
                                <th class="text-center">Team</th>
                                <th class="text-center">Status</th>
                                <th class="text-center pe-4">Action</th>
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

                    <div class="form-check form-switch bg-light p-2 rounded border">
                        <input class="form-check-input ms-0 me-2" type="checkbox" id="empEditActive" checked>
                        <label class="form-check-label fw-bold" for="empEditActive">Active Status (ยังทำงานอยู่)</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary me-auto text-danger border-danger" id="btnDeleteEmp" onclick="Actions.deleteEmployee()" title="ปรับสถานะเป็นพ้นสภาพ (Inactive)">
                    <i class="fas fa-user-slash"></i> Set Inactive
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="Actions.saveEmployee()">
                    <i class="fas fa-save me-1"></i> Save Data
                </button>
            </div>
        </div>
    </div>
</div>