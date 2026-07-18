<!-- modal_wo_issue_part.php -->
<div class="modal fade pe-modal" id="woIssuePartModal" tabindex="-1" style="z-index: 1060;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header" style="background-color: var(--pe-primary-light); color: var(--pe-primary); border-bottom: none;">
                <h5 class="modal-title"><i class="fas fa-tools"></i> เบิกอะไหล่ (Issue Spare Part)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-12">
                          <div class="mb-3">
                              <label class="pe-form-label">อะไหล่ (Item) <span class="pe-text-danger">*</span></label>
                              <input type="text" class="pe-form-input" id="woIssueItemInput" list="woIssueItemList" placeholder="-- พิมพ์เพื่อค้นหาอะไหล่ --" oninput="typeof WorkOrderModule !== 'undefined' ? WorkOrderModule.onSparePartChange() : TechModule.onSparePartChange()" required>
                              <datalist id="woIssueItemList"></datalist>
                              <input type="hidden" id="woIssueItem" required>
                              <div class="pe-text-xs mt-1 text-muted" id="woIssueItemDesc"></div>
                          </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">คลัง (Location) <span class="required">*</span></label>
                            <select class="pe-form-input" id="woIssueLocation" required>
                                <option value="">-- เลือกคลังจัดเก็บ --</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">จำนวน (Quantity) <span class="required">*</span></label>
                            <input type="number" class="pe-form-input" id="woIssueQty" min="1" step="1" required>
                            <div class="pe-text-xs mt-1 text-info" id="woIssueMaxQty">ยอดคงเหลือ: 0</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">ราคาต่อหน่วย</label>
                            <input type="text" class="pe-form-input" id="woIssuePrice" readonly style="background-color: var(--pe-bg-hover);">
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="pe-form-group mb-0">
                            <label class="pe-form-label">หมายเหตุ (Notes)</label>
                            <input type="text" class="pe-form-input" id="woIssueNotes" placeholder="ระบุเหตุผล หรือจุดที่นำไปเปลี่ยน">
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="border-top: none;">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="pe-btn pe-btn-primary" onclick="typeof WorkOrderModule !== 'undefined' ? WorkOrderModule.confirmIssuePart() : TechModule.confirmIssuePart()">
                    <i class="fas fa-check me-1"></i> ยืนยันการเบิก
                </button>
            </div>
        </div>
    </div>
</div>
