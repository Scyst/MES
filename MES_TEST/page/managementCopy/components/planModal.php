<div class="modal fade" id="planModal" tabindex="-1" aria-labelledby="planModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered"> 
        <div class="modal-content">
            
            <div class="modal-header">
                <h5 class="modal-title" id="planModalLabel">บันทึกแผนการผลิต (Production Plan)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <form id="planForm" onsubmit="return false;">
                <div class="modal-body">
                    <input type="hidden" id="planModalPlanId" value="0">
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="planModalDate" class="form-label">วันที่ (Plan Date)</label>
                            <input type="date" class="form-control" id="planModalDate" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="planModalLine" class="form-label">ไลน์ผลิต (Line)</label>
                            <select class="form-select" id="planModalLine" required>
                                <option value="">-- เลือกไลน์ผลิต --</option>
                                </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label d-block">กะการทำงาน (Shift)</label>
                        <div class="btn-group w-100" role="group">
                            <input type="radio" class="btn-check" name="planModalShift" id="shiftDay" value="DAY" checked>
                            <label class="btn btn-outline-secondary" for="shiftDay">
                                <i class="fas fa-sun me-1"></i> DAY (กลางวัน)
                            </label>

                            <input type="radio" class="btn-check" name="planModalShift" id="shiftNight" value="NIGHT">
                            <label class="btn btn-outline-secondary" for="shiftNight">
                                <i class="fas fa-moon me-1"></i> NIGHT (กลางคืน)
                            </label>
                        </div>
                    </div>

                    <div class="mb-3 position-relative">
                        <label for="planModalItemSearch" class="form-label">ค้นหาชิ้นงาน (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="planModalItemSearch" 
                               placeholder="พิมพ์เพื่อค้นหา..." autocomplete="off" required>
                        
                        <div id="planModalItemResults" class="autocomplete-results" style="display: none;"></div>
                        
                        <div id="selectedItemContainer" class="selected-item-display d-none">
                            <i class="fas fa-check-circle me-2"></i>
                            <span id="planModalSelectedItem"></span>
                        </div>
                        
                        <input type="hidden" id="planModalItemId" required>
                        <div class="invalid-feedback" id="item-search-error">กรุณาเลือกชิ้นงานที่ถูกต้อง</div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="planModalQuantity" class="form-label">จำนวน (Qty)</label>
                            <input type="number" class="form-control" id="planModalQuantity" 
                                   min="1" placeholder="0" required>
                        </div>
                        <div class="col-md-8 mb-3">
                            <label for="planModalNote" class="form-label">หมายเหตุ (Note)</label>
                            <input type="text" class="form-control" id="planModalNote" placeholder="ระบุหมายเหตุ (ถ้ามี)">
                        </div>
                    </div>

                </div>

                <div class="modal-footer">
                    <button type="button" id="deletePlanButton" class="btn btn-outline-danger me-auto" style="display: none;">
                        <i class="fas fa-trash-alt"></i> ลบรายการ
                    </button>
                    
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" id="savePlanButton" class="btn btn-primary">บันทึกข้อมูล</button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="modal fade" id="autoPlanModal" tabindex="-1" aria-labelledby="autoPlanModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            
            <div class="modal-header bg-primary text-white py-2">
                <h6 class="modal-title fw-bold mb-0" id="autoPlanModalLabel">
                    <i class="fas fa-robot me-2"></i>APS Auto-Plan Wizard
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body bg-light p-3">
                <form id="apsPlanForm" onsubmit="return false;">
                    
                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-header bg-white border-bottom-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                            <h6 class="fw-bold text-dark mb-0 fs-6">1. กรองออเดอร์ (Source Filter)</h6>
                            <div class="btn-group btn-group-sm" role="group">
                                <input type="radio" class="btn-check" name="apsFilterType" id="filterTypeDate" value="DATE">
                                <label class="btn btn-outline-primary px-3" for="filterTypeDate">Date</label>
                                
                                <input type="radio" class="btn-check" name="apsFilterType" id="filterTypeWeek" value="WEEK" checked>
                                <label class="btn btn-outline-primary px-3" for="filterTypeWeek">Week</label>
                            </div>
                        </div>
                        <div class="card-body pt-0">
                            <div id="zoneDateFilter" class="row g-2 d-none">
                                <div class="col-md-6">
                                    <label class="form-label small text-muted mb-1">SO Date (ตั้งแต่)</label>
                                    <input type="date" class="form-control form-control-sm" id="apsSoStart">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small text-muted mb-1">SO Date (ถึง)</label>
                                    <input type="date" class="form-control form-control-sm" id="apsSoEnd">
                                </div>
                            </div>
                            
                            <div id="zoneWeekFilter" class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label small text-muted mb-1">Shipping Week (ตั้งแต่) <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="apsWeekStart" placeholder="ตัวอย่าง: 9.26">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small text-muted mb-1">Shipping Week (ถึง) <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="apsWeekEnd" placeholder="ตัวอย่าง: 13.26">
                                </div>
                            </div>
                            <div class="form-text mt-2" style="font-size: 0.75rem;">
                                * ระบบจะจัดคิวความด่วนตาม <strong>Shipping Week</strong> อัตโนมัติเสมอ
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
                            <h6 class="fw-bold text-dark mb-0 fs-6">2. ตัวแปรการผลิต (Production Factors)</h6>
                        </div>
                        <div class="card-body pt-0">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">Loss เปลี่ยนรุ่น (ชม.)</label>
                                    <input type="number" class="form-control form-control-sm text-end" id="apsSetupTime" value="0.5" min="0" step="0.5">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">เวลา OT / กะ (ชม.)</label>
                                    <input type="number" class="form-control form-control-sm text-end" id="apsOtHours" value="0" min="0" step="0.5">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">การกระจายกะ</label>
                                    <select class="form-select form-select-sm" id="apsShiftMode">
                                        <option value="DAY">เฉพาะ DAY</option>
                                        <option value="NIGHT">เฉพาะ NIGHT</option>
                                        <option value="SPLIT">กระจาย 2 กะ</option>
                                    </select>
                                </div>

                                <div class="col-12 mt-3">
                                    <label class="form-label small text-muted mb-2">อนุญาตให้แทรก OT ในวันต่อไปนี้:</label>
                                    <div class="btn-group w-100 shadow-sm" role="group">
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otMon" value="1" autocomplete="off" checked>
                                        <label class="btn btn-outline-secondary btn-sm" for="otMon">จ.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otTue" value="2" autocomplete="off" checked>
                                        <label class="btn btn-outline-secondary btn-sm" for="otTue">อ.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otWed" value="3" autocomplete="off" checked>
                                        <label class="btn btn-outline-secondary btn-sm" for="otWed">พ.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otThu" value="4" autocomplete="off" checked>
                                        <label class="btn btn-outline-secondary btn-sm" for="otThu">พฤ.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otFri" value="5" autocomplete="off" checked>
                                        <label class="btn btn-outline-secondary btn-sm" for="otFri">ศ.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otSat" value="6" autocomplete="off">
                                        <label class="btn btn-outline-danger btn-sm" for="otSat">ส.</label>
                                        
                                        <input type="checkbox" class="btn-check aps-ot-day" id="otSun" value="7" autocomplete="off">
                                        <label class="btn btn-outline-danger btn-sm" for="otSun">อา.</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
                            <h6 class="fw-bold text-dark mb-0 fs-6">3. กรอบเวลาจัดแผน (Scheduling Horizon)</h6>
                        </div>
                        <div class="card-body pt-0">
                            <div class="row g-2 align-items-end">
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">เริ่มจัดแผนตั้งแต่วันที่</label>
                                    <input type="date" class="form-control form-control-sm border-primary" id="apsPlanStart" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">โหมดการวางแผน</label>
                                    <select class="form-select form-select-sm" id="apsRangeMode">
                                        <option value="OPEN">เปิดกว้าง (จนกว่าจะหมด)</option>
                                        <option value="CLOSED">กำหนดวันสิ้นสุด (Timebox)</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small text-muted mb-1">วันสิ้นสุด (Cut-off)</label>
                                    <input type="date" class="form-control form-control-sm bg-light" id="apsPlanEnd" disabled>
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="apsWorkOnSunday">
                                    <label class="form-check-label small fw-bold text-dark" for="apsWorkOnSunday">
                                        อนุญาตให้จัดแผนลงวันอาทิตย์ (Sunday OT)
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-danger border-opacity-50 bg-danger bg-opacity-10 shadow-sm">
                        <div class="card-body py-2 px-3 d-flex align-items-center">
                            <div class="form-check form-switch mb-0 fs-5">
                                <input class="form-check-input" type="checkbox" id="apsOverwrite">
                            </div>
                            <div class="ms-2">
                                <label class="form-check-label fw-bold text-danger mb-0" style="font-size: 0.9rem;" for="apsOverwrite">
                                    ล้างแผน Auto เดิมแล้วเขียนทับ (Clear & Replace)
                                </label>
                                <div class="text-danger opacity-75" style="font-size: 0.75rem;">
                                    ระบบจะลบแผนอัตโนมัติเฉพาะช่วงเวลาที่กระทบ (ไม่ลบแผนที่เพิ่มด้วยมือ)
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            <div class="modal-footer bg-white py-2 border-top">
                <button type="button" class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-sm btn-primary fw-bold px-4" id="btnExecuteAps">
                    เริ่มประมวลผล APS
                </button>
            </div>

        </div>
    </div>
</div>