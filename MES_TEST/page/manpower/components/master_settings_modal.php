<!-- Master Settings Modal -->
<div class="modal fade" id="masterSettingsModal"  aria-hidden="true" style="z-index: 1055;">
    <div class="modal-dialog modal-fullscreen">
        <div class="modal-content bg-light">
            <div class="modal-header bg-dark text-white py-3 border-0 shadow-sm">
                <div>
                    <h5 class="modal-title fw-bold"><i class="fas fa-cogs me-2"></i>System Configuration & Master Data</h5>
                    <small class="text-white-50">Manage employees, teams, shifts, and system mappings</small>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 d-flex flex-column flex-lg-row h-100">
                <!-- Sidebar -->
                <div class="bg-white border-end shadow-sm d-flex flex-column" style="width: 280px; min-height: 100%; flex-shrink: 0; z-index: 2;">
                    <div class="p-3 border-bottom bg-light">
                        <span class="text-uppercase fw-bold text-muted small"><i class="fas fa-bars me-2"></i>Menu</span>
                    </div>
                    <div class="nav flex-column nav-pills p-3 gap-2" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                        <button class="nav-link active text-start py-3 fw-bold rounded-3" id="v-pills-emp-tab" data-bs-toggle="pill" data-bs-target="#v-pills-emp" type="button" role="tab" onclick="Actions.openEmployeeManager(true)">
                            <i class="fas fa-users-cog me-2"></i> Staff Manager
                        </button>
                        <button class="nav-link text-start py-3 fw-bold rounded-3" id="v-pills-team-tab" data-bs-toggle="pill" data-bs-target="#v-pills-team" type="button" role="tab" onclick="Actions.openTeamSettings()">
                            <i class="fas fa-users me-2"></i> Team Settings
                        </button>
                        <button class="nav-link text-start py-3 fw-bold rounded-3" id="v-pills-shift-tab" data-bs-toggle="pill" data-bs-target="#v-pills-shift" type="button" role="tab" onclick="Actions.openShiftPlanner()">
                            <i class="fas fa-calendar-alt me-2"></i> Shift Planner
                        </button>
                        <button class="nav-link text-start py-3 fw-bold rounded-3" id="v-pills-map-tab" data-bs-toggle="pill" data-bs-target="#v-pills-map" type="button" role="tab" onclick="Actions.openMappingManager()">
                            <i class="fas fa-tags me-2"></i> Position Mapping
                        </button>
                        <button class="nav-link text-start py-3 fw-bold rounded-3 bg-opacity-10 text-warning" id="v-pills-swap-tab" data-bs-toggle="pill" data-bs-target="#v-pills-swap" type="button" role="tab" onclick="Actions.openShiftSwapAudit()">
                            <i class="fas fa-exchange-alt me-2"></i> Shift Swap Audit
                        </button>
                          <button class="nav-link text-start py-3 fw-bold rounded-3 bg-opacity-10 text-primary" id="v-pills-rawscans-tab" data-bs-toggle="pill" data-bs-target="#v-pills-rawscans" type="button" role="tab" onclick="Actions.openRawScansTab()">
                              <i class="fas fa-satellite-dish me-2"></i> Central Raw Scans
                          </button>
                    </div>
                </div>
                
                <!-- Content Area -->
                <div class="tab-content flex-grow-1 p-0 px-lg-4 pb-lg-4 pt-lg-0 overflow-auto" id="v-pills-tabContent" style="background-color: #f8f9fa;">
                    
                    <!-- Central Raw Scans Tab -->
                      <div class="tab-pane fade h-100" id="v-pills-rawscans" role="tabpanel">
                          <div class="card border-0 shadow-sm h-100 d-flex flex-column mt-3">
                              <div class="card-header bg-white border-bottom py-3">
                                  <div class="d-flex justify-content-between align-items-center mb-3">
                                      <div>
                                          <h5 class="m-0 fw-bold text-dark"><i class="fas fa-satellite-dish me-2 text-primary"></i>Central Raw Scans</h5>
                                          <small class="text-muted">ตรวจสอบประวัติการสแกนหน้าจากเครื่องของส่วนกลางโดยตรง</small>
                                      </div>
                                  </div>
                                  <div class="row g-2 align-items-end">
                                      <div class="col-md-3">
                                          <label class="form-label small fw-bold text-secondary mb-1">Target Date</label>
                                          <input type="date" class="form-control form-control-sm" id="rawScanDate">
                                      </div>
                                      <div class="col-md-3">
                                          <label class="form-label small fw-bold text-secondary mb-1">Search EMP ID / Name</label>
                                          <input type="text" class="form-control form-control-sm" id="rawScanSearch" placeholder="Search..." onkeyup="Actions.filterRawScans()">
                                      </div>
                                      <div class="col-md-6 text-end">
                                          <button class="btn btn-sm btn-primary shadow-sm px-4" onclick="Actions.fetchRawCentralScans()">
                                              <i class="fas fa-sync-alt me-2"></i> Fetch Data
                                          </button>
                                      </div>
                                  </div>
                              </div>
                              <div class="card-body p-0 flex-grow-1 overflow-auto bg-light" style="max-height: calc(100vh - 300px);">
                                  <table class="table table-hover align-middle mb-0 bg-white">
                                      <thead class="bg-light text-secondary small text-uppercase" style="position: sticky; top: 0; z-index: 1;">
                                          <tr>
                                              <th class="ps-4">Scan Time</th>
                                              <th>Emp ID</th>
                                              <th>Name</th>
                                              <th>Position</th>
                                              <th class="pe-4">Department</th>
                                          </tr>
                                      </thead>
                                      <tbody id="rawScansBody">
                                          <tr><td colspan="5" class="text-center py-5 text-muted"><i class="fas fa-satellite-dish fs-1 mb-3 text-light"></i><br>Select a date and click Fetch Data</td></tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>

                      <!-- Shift Swap Audit Tab -->
                    <div class="tab-pane fade h-100" id="v-pills-swap" role="tabpanel">
                        <div class="card border-0 shadow-sm h-100 d-flex flex-column mt-3">
                            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="m-0 fw-bold text-dark"><i class="fas fa-exchange-alt text-warning me-2"></i>Shift Swap Audit</h5>
                                    <small class="text-muted">ตรวจสอบการสแกนเข้างานที่อาจมีการสลับกะ (แต่ยังไม่ได้เปลี่ยนในระบบ)</small>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <select id="swapAuditHcGroup" class="form-select form-select-sm" style="width: auto;" onchange="Actions.openShiftSwapAudit()"><option value="TEAM 1" selected>TEAM 1</option><option value="ALL">ALL GROUPS</option></select>
                                      <span class="text-muted small align-self-center">From</span>
                                    <input type="date" id="swapAuditStartDate" class="form-control form-control-sm" value="<?php echo date('Y-m-d', strtotime('-3 days')); ?>" onchange="Actions.openShiftSwapAudit()">
                                    <span class="text-muted small align-self-center">To</span>
                                    <input type="date" id="swapAuditEndDate" class="form-control form-control-sm" value="<?php echo date('Y-m-d'); ?>" onchange="Actions.openShiftSwapAudit()">
                                    <button class="btn btn-sm btn-outline-secondary" onclick="Actions.openShiftSwapAudit()"><i class="fas fa-sync-alt"></i></button>
                                      <button class="btn btn-sm btn-dark text-nowrap" onclick="Actions.batchSwapShift()"><i class="fas fa-layer-group me-1"></i>Batch Swap</button>
                                </div>
                            </div>
                            <div class="card-body p-0 flex-grow-1 overflow-auto bg-white">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary small text-uppercase" style="position: sticky; top: 0; z-index: 1;">
                                        <tr>
                                            <th style="width: 40px;" class="text-center ps-4"><input class="form-check-input" type="checkbox" id="swapAuditSelectAll" onchange="document.querySelectorAll('.swap-audit-cb').forEach(cb => cb.checked = this.checked)"></th>
                                            <th class="text-center">Date</th>
                                            <th>Employee</th>
                                            <th class="text-center">System Shift</th>
                                            <th class="text-center">Scan In</th>
                                            <th class="text-center">Scan Out</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Detection</th>
                                            <th class="text-center pe-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="swapAuditBody">
                                        <!-- Data populated by JS -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Staff Manager Tab -->
                    <div class="tab-pane fade show active h-100" id="v-pills-emp" role="tabpanel">
                        <div class="card border-0 shadow-sm h-100 d-flex flex-column">
                            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <h5 class="m-0 fw-bold text-dark"><i class="fas fa-users-cog text-primary me-2"></i>Employee Management</h5>
                                <button class="btn btn-primary btn-sm shadow-sm" onclick="Actions.openEmpEdit()"><i class="fas fa-plus me-1"></i> New Employee</button>
                            </div>
                            
                            <!-- Employee Filters -->
                            <div class="card-body bg-light border-bottom py-2 px-3 flex-shrink-0 flex-grow-0">
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
                                        <div class="input-group input-group-sm" style="width: 150px;">
                                            <span class="input-group-text bg-white text-muted border-end-0"><i class="fas fa-users"></i></span>
                                            <select id="empFilterTeam" class="form-select border-start-0" onchange="Actions.filterEmployeeList()">
                                                <option value="">All Teams</option>
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
                                            <input type="radio" class="btn-check" name="empStatusFilter" id="filterOutsider" value="OUTSIDER" onchange="Actions.filterEmployeeList()">
                                            <label class="btn btn-outline-warning px-2" for="filterOutsider" title="คนนอกแผนก / ตกหล่น"><i class="fas fa-exclamation-circle"></i> ตกหล่น</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Employee Table -->
                            <div class="card-body p-0 flex-grow-1 overflow-auto bg-white" style="max-height: calc(100vh - 250px);">
                                <table class="table table-hover align-middle mb-0" style="min-width: 1000px;">
                                    <thead class="bg-light text-secondary small text-uppercase" style="position: sticky; top: 0; z-index: 1;">
                                        <tr>
                                            <th class="ps-4" width="22%">Employee Profile</th>
                                            <th width="13%">Dept / Group</th>
                                            <th width="15%">Line / Position</th>
                                            <th class="text-center" width="8%">Shift</th>
                                            <th class="text-center" width="8%">Type</th>
                                            <th class="text-center" width="16%">Status / Timeline</th>
                                            <th width="12%">Tags / Check</th>
                                            <th class="text-end pe-4" width="6%">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="empListBody"></tbody>
                                </table>
                            </div>
                            <div class="card-footer bg-light py-2 justify-content-between d-flex flex-shrink-0 align-items-center">
                                <div class="small text-muted" id="empListCount">Loaded: 0 records</div>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="empPagination">
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <!-- Team Settings Tab -->
                    <div class="tab-pane fade h-100" id="v-pills-team" role="tabpanel">
                        <div class="card border-0 shadow-sm h-100 d-flex flex-column">
                            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="m-0 fw-bold text-dark"><i class="fas fa-users me-2 text-primary"></i>Team Settings (HC Group)</h5>
                                    <small class="text-muted">ตั้งค่าว่ากลุ่มไหนจะถูกนำไปคำนวณในหน้าจอหลัก (Main Manpower)</small>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="Actions.addTeamSettingRow()"><i class="fas fa-plus me-1"></i> Add Team</button>
                                    <button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="Actions.saveTeamSettings()"><i class="fas fa-save me-1"></i> Save Settings</button>
                                </div>
                            </div>
                            <div class="card-body bg-light border-bottom p-3 flex-shrink-0 flex-grow-0">
                                <div class="alert alert-info py-2 small mb-0">
                                    <i class="fas fa-info-circle me-1"></i> ทีมที่ถูกตั้งเป็น <strong>EXCLUDE</strong> จะไม่ถูกนำไปรวมใน HC และ Cost หลัก
                                </div>
                            </div>
                            <div class="card-body p-0 flex-grow-1 overflow-auto bg-white" style="max-height: calc(100vh - 250px);">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary" style="position: sticky; top: 0; z-index: 1;">
                                        <tr>
                                            <th class="ps-4 py-3">Department (API)</th>
                                            <th class="text-center" style="width: 250px;">HC Group</th>
                                            <th class="text-center" style="width: 80px;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="teamSettingsBody">
                                        <tr><td colspan="3" class="text-center py-4">Loading...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Shift Planner Tab -->
                    <div class="tab-pane fade h-100" id="v-pills-shift" role="tabpanel">
                        <div class="card border-0 shadow-sm h-100 d-flex flex-column">
                            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="m-0 fw-bold text-dark"><i class="fas fa-calendar-alt me-2 text-primary"></i>Shift Rotation Manager</h5>
                                    <small class="text-muted">จัดการกะการทำงานแบบยกทีม</small>
                                </div>
                            </div>
                            <div class="card-body p-0 flex-grow-1 overflow-auto bg-white" style="max-height: calc(100vh - 200px);">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary" style="position: sticky; top: 0; z-index: 1;">
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

                    <!-- Position Mapping Tab -->
                    <div class="tab-pane fade h-100" id="v-pills-map" role="tabpanel">
                        <div class="card border-0 shadow-sm h-100 d-flex flex-column">
                            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="m-0 fw-bold text-dark"><i class="fas fa-tags me-2 text-primary"></i>Position & Salary Mapping</h5>
                                    <small class="text-muted">ตั้งค่าฐานเงินเดือนและจับคู่ตำแหน่งงานให้เป็นประเทเดียวกัน</small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-success" onclick="Actions.exportSalarySettings()"><i class="fas fa-file-excel me-2"></i>Export Excel</button>
                                </div>
                            </div>
                            <div class="card-body p-0 flex-grow-1 overflow-auto bg-white" style="max-height: calc(100vh - 250px);">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary small text-uppercase" style="position: sticky; top: 0; z-index: 1;">
                                        <tr>
                                            <th class="ps-4 py-3">Keyword (คำในตำแหน่ง)</th>
                                            <th>Map to Type</th>
                                            <th class="text-end">Base Rate (THB) <i id="salaryLockIcon" class="fas fa-lock ms-1 text-danger" style="cursor:pointer;" onclick="Actions.toggleSalaryReveal()" title="Click to unlock"></i></th>
                                            <th class="text-center">Rate Type</th>
                                            <th class="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="mappingBody"></tbody>
                                    <tfoot class="bg-light border-top">
                                        <tr>
                                            <td class="ps-4">
                                                <input type="text" class="form-control form-control-sm" id="newMapKeyword" placeholder="เช่น Driver, Admin...">
                                            </td>
                                            <td>
                                                <input class="form-control form-control-sm" list="typeList" id="newMapType" placeholder="เลือกหรือพิมพ์ใหม่...">
                                                <datalist id="typeList"></datalist>
                                            </td>
                                            <td>
                                                <input type="number" class="form-control form-control-sm text-end" id="newMapRate" placeholder="0.00" step="0.01">
                                            </td>
                                            <td>
                                                <select class="form-select form-select-sm" id="newMapRateType">
                                                    <option value="MONTHLY">MONTHLY</option>
                                                    <option value="DAILY">DAILY</option>
                                                    <option value="MONTHLY_NO_OT">MONTHLY (NO OT)</option>
                                                </select>
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
                            <div class="card-footer bg-light py-2">
                                <small class="text-muted"><i class="fas fa-info-circle me-1"></i>ระบบจะเรียนรู้ประเภทใหม่ๆ จากสิ่งที่คุณพิมพ์เพิ่มเข้าไป</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>






