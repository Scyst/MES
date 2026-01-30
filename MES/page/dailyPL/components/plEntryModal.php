<div class="modal fade" id="targetModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            
            <div class="modal-header bg-info-subtle text-info-emphasis border-bottom-0">
                <div>
                    <h5 class="modal-title fw-bold"><i class="fas fa-bullseye me-2"></i>Set Monthly Budget</h5>
                    <p class="mb-0 small opacity-75">กำหนดงบประมาณรายเดือน (ระบบจะหารเป็นรายวันให้อัตโนมัติ)</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body bg-light p-0 d-flex flex-column overflow-hidden">
                
                <div class="p-3 bg-white border-bottom shadow-sm z-2 flex-shrink-0">
                    <div class="row g-2 align-items-center">
                        <div class="col-auto">
                            <label class="small fw-bold text-muted text-uppercase">Target Month:</label>
                        </div>
                        <div class="col-auto">
                            <input type="month" id="budgetMonth" class="form-control form-control-sm fw-bold border-info" 
                                style="width: 160px;" value="<?php echo date('Y-m'); ?>">
                        </div>
                        
                        <div class="col-auto ms-auto">
                            <span class="badge bg-success text-white shadow-sm user-select-none position-relative" 
                                id="workingDaysBadge"
                                onclick="openCalendarModal()"
                                title="Click to manage holiday calendar"
                                style="cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;"
                                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';"
                                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                
                                <i class="far fa-calendar-check me-1"></i>Working Days: --
                            </span>
                        </div>
                    </div>
                </div>

                <div class="flex-grow-1 overflow-auto custom-scrollbar bg-white">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.9rem;">
                        <thead class="table-light border-bottom sticky-top" style="top: 0; z-index: 10;">
                            <tr>
                                <th class="ps-4 py-2" style="width: 50%;">Account Item</th>
                                <th class="text-end py-2" style="width: 150px;">Monthly Budget</th>
                                <th class="text-end pe-4 py-2 text-muted" style="width: 120px;">~ Daily</th>
                            </tr>
                        </thead>
                        <tbody id="budgetTableBody">
                            </tbody>
                    </table>
                </div>

            </div>

            <div class="modal-footer border-top bg-light">
                <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-info text-white rounded-pill px-4 shadow-sm fw-bold" onclick="saveTarget()">
                    <i class="fas fa-save me-1"></i> Save Budget
                </button>
            </div>

        </div>
    </div>
</div>

<div class="modal fade" id="calendarModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4" style="height: 80vh;">
            <div class="modal-header bg-primary text-white border-bottom-0">
                <h5 class="modal-title fw-bold"><i class="fas fa-calendar-alt me-2"></i>Holiday Calendar</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3 bg-white" style="overflow: hidden;">
                <div id="fullCalendarEl" style="height: 100%;"></div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="holidayEditorModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content shadow rounded-4 border-0">
            <div class="modal-header bg-light border-bottom-0 pb-0">
                <h6 class="modal-title fw-bold" id="editorTitle">Edit Holiday</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pt-2">
                <form id="holidayForm">
                    <input type="hidden" id="hDate">
                    <div class="mb-2">
                        <label class="small text-muted fw-bold">Date</label>
                        <div id="hDateDisplay" class="fw-bold text-primary"></div>
                    </div>
                    <div class="mb-2">
                        <label class="small text-muted fw-bold">Description</label>
                        <input type="text" class="form-control form-control-sm" id="hDesc" required>
                    </div>
                    <div class="mb-2">
                        <label class="small text-muted fw-bold">Type</label>
                        <select class="form-select form-select-sm" id="hType">
                            <option value="HOLIDAY">🔴 Holiday (นักขัตฤกษ์)</option>
                            <option value="OFFDAY">🟡 Off-day (หยุดบริษัท)</option>
                            <option value="NORMAL">🟢 Normal Day (วันทำงานปกติ)</option>
                        </select>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <label class="small text-muted fw-bold">Work Rate</label>
                            <input type="number" class="form-control form-control-sm" id="hWorkRate" value="2.0" step="0.5">
                        </div>
                        <div class="col-6">
                            <label class="small text-muted fw-bold">OT Rate</label>
                            <input type="number" class="form-control form-control-sm" id="hOtRate" value="3.0" step="0.5">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 pt-0">
                <button type="button" class="btn btn-outline-danger btn-sm me-auto" id="btnDeleteHoliday" style="display:none;">
                    <i class="fas fa-trash"></i>
                </button>
                <button type="button" class="btn btn-primary btn-sm rounded-pill px-4" onclick="saveHoliday()">Save</button>
            </div>
        </div>
    </div>
</div>