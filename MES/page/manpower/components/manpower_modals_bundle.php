<div class="modal fade" id="editLogModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-user-edit me-2"></i>Edit Attendance
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editLogForm">
                    <input type="hidden" id="editLogId">
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Employee</label>
                        <input type="text" class="form-control form-control-plaintext fw-bold" id="editEmpName" readonly>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="editStatus">
                                <option value="PRESENT">PRESENT (มา)</option>
                                <option value="ABSENT">ABSENT (ขาด)</option>
                                <option value="LATE">LATE (สาย)</option>
                                <option value="SICK_LEAVE">SICK LEAVE (ลาป่วย)</option>
                                <option value="BUSINESS_LEAVE">BUSINESS LEAVE (ลากิจ)</option>
                                <option value="VACATION">VACATION (พักร้อน)</option>
                                <option value="OTHER">OTHER (อื่นๆ)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Actual Shift</label>
                            <select class="form-select" id="editLogShift">
                                <option value="">-- อิงตามกะปัจจุบัน --</option>
                                <option value="1">DAY SHIFT (08:00 - 20:00)</option>
                                <option value="2">NIGHT SHIFT (20:00 - 08:00)</option>
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
                        <label class="form-label">Remark / Note</label>
                        <textarea class="form-control" id="editRemark" rows="2" placeholder="ระบุสาเหตุ..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="saveLogChanges()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="editEmployeeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                    <i class="fas fa-user-cog me-2"></i>Edit Employee Info
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editEmployeeForm">
                    <input type="hidden" id="empEditId">
                    
                    <div class="mb-3">
                        <label class="form-label text-muted small">Employee Name</label>
                        <input type="text" class="form-control form-control-plaintext fw-bold" id="empEditName" readonly>
                    </div>

                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label">Line / Section</label>
                            <select class="form-select" id="empEditLine">
                                <option value="">-- Select Line --</option>
                                </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label">Main Shift</label>
                            <select class="form-select" id="empEditShift">
                                </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label">Team Group</label>
                            <select class="form-select" id="empEditTeam">
                                <option value="">-</option>
                                <option value="A">Team A</option>
                                <option value="B">Team B</option>
                                <option value="C">Team C</option>
                                <option value="D">Team D</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="saveEmployeeInfo()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
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
                    <small class="text-muted">จัดการกะการทำงานแบบยกทีม (Team A / Team B)</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="shiftPlannerTable">
                        <thead class="bg-light text-secondary">
                            <tr>
                                <th class="ps-4 py-3">Line / Section</th>
                                <th style="width: 30%;">Team A Shift</th>
                                <th style="width: 30%;">Team B Shift</th>
                                <th class="text-center pe-4">Action</th>
                            </tr>
                        </thead>
                        <tbody id="shiftPlannerBody">
                            </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="mappingModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title"><i class="fas fa-sitemap me-2"></i>ตั้งค่าการจัดกลุ่มข้อมูล (Mapping)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-tabs mb-3" id="mappingTabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#categoryTab">ประเภทพนักงาน (Categories)</button>
                    </li>
                    </ul>
                
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="categoryTab">
                        <div class="d-flex justify-content-between mb-2">
                            <small class="text-muted">จัดกลุ่มตำแหน่งงานเข้าสู่ Category (เช่น พนักงานประจำ, นักศึกษา)</small>
                            <button class="btn btn-sm btn-primary" onclick="addMappingRow('category')"><i class="fas fa-plus"></i> เพิ่มรายการ</button>
                        </div>
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th>ตำแหน่งจาก API (Keyword)</th>
                                        <th>ชื่อกลุ่มที่จะโชว์</th>
                                        <th style="width: 100px;">Rate/Hr</th>
                                        <th style="width:50px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="categoryMappingBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                <button type="button" class="btn btn-success" onclick="saveAllMappings()"><i class="fas fa-save me-1"></i> บันทึกการตั้งค่าทั้งหมด</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="syncConfirmModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-0 bg-warning bg-opacity-10">
                <h6 class="modal-title fw-bold text-dark">
                    <i class="fas fa-exclamation-triangle text-warning me-2"></i>ยืนยันการ Sync ข้อมูล
                </h6>
            </div>
            <div class="modal-body p-4 text-center">
                <div class="mb-3">
                    <i class="fas fa-sync fa-spin fa-3x text-primary opacity-50"></i>
                </div>
                <h5 class="fw-bold">คุณต้องการดึงข้อมูลจาก Scanner ใช่หรือไม่?</h5>
                <p class="text-muted small mb-0">
                    ระบบจะทำการดึงข้อมูลเวลาเข้า-ออกงานล่าสุด และคำนวณสถานะใหม่<br>
                    (อาจใช้เวลาประมาณ 1-2 นาที ขึ้นอยู่กับจำนวนวัน)
                </p>
            </div>
            <div class="modal-footer border-0 justify-content-center pb-4">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">
                    <i class="fas fa-times me-2"></i>ยกเลิก
                </button>
                <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="syncApiData(true); bootstrap.Modal.getInstance(document.getElementById('syncConfirmModal')).hide();">
                    <i class="fas fa-check me-2"></i>ยืนยัน Sync
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="editEmpModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
            <div class="modal-header bg-primary text-white py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-user-edit me-2"></i>Edit Employee Info</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <form id="editEmpForm">
                    <div class="mb-3">
                        <label class="form-label text-muted small fw-bold text-uppercase">Employee Name</label>
                        <input type="text" class="form-control form-control-lg fw-bold px-2 bg-light border-0" id="modalEmpName" readonly>
                        <input type="hidden" id="modalEmpId">
                    </div>
                    
                    <div class="row g-3 mb-3">
                        <div class="col-8">
                            <label class="form-label small fw-bold">Line / Section</label>
                            <select class="form-select" id="modalLine">
                                <option value="">Loading lines...</option>
                            </select>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-primary">Team</label>
                            <select class="form-select fw-bold text-primary" id="modalTeam">
                                <option value="">-</option>
                                <option value="A">Team A</option>
                                <option value="B">Team B</option>
                                <option value="C">Team C</option>
                                <option value="D">Team D</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label small fw-bold">Default Shift</label>
                        <select class="form-select" id="modalShift">
                            <option value="">-- Select Shift --</option>
                        </select>
                    </div>

                    <div class="form-check form-switch p-3 bg-light rounded border d-flex align-items-center">
                        <input class="form-check-input ms-0 me-3" type="checkbox" id="modalActive" checked style="width: 2.5em; height: 1.25em;">
                        <div>
                            <label class="form-check-label fw-bold d-block" for="modalActive">Active Status</label>
                            <small class="text-muted" style="font-size: 0.75rem;">ปิดการใช้งานหากพนักงานลาออก</small>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-light border-0 py-2">
                <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-sm btn-primary fw-bold px-3" onclick="saveEmployee()">
                    <i class="fas fa-save me-2"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:9999; justify-content:center; align-items:center; flex-direction:column;">
    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"></div>
    <div class="mt-2 text-muted fw-bold">Processing...</div>
</div>