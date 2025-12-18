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