<!-- modal_sparepart_tx.php -->
<div class="modal fade pe-modal" id="spTxModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="spTxModalTitle"><i class="fas fa-box"></i> Spare Parts Transaction</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="spTxType" value="RECEIVE">
                <div class="row g-3">
                    <div class="col-12">
                          <div class="mb-3">
                              <label class="pe-form-label">อะไหล่ (Item) <span class="pe-text-danger">*</span></label>
                              <input type="text" class="pe-form-input" id="spTxItemInput" list="spTxItemList" placeholder="-- พิมพ์เพื่อค้นหาอะไหล่ --" oninput="SparePartsModule.onItemInput()" required>
                              <datalist id="spTxItemList"></datalist>
                              <input type="hidden" id="spTxItem" required>
                          </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Location (คลัง) <span class="required">*</span></label>
                            <select class="pe-form-input" id="spTxLocation" required>
                                <option value="">-- เลือกคลังจัดเก็บ --</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Quantity (จำนวน) <span class="required">*</span></label>
                            <input type="number" class="pe-form-input" id="spTxQty" min="1" step="1" required>
                        </div>
                    </div>
                    
                    <div class="col-12" id="spTxWoGroup" style="display:none;">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Reference Work Order (ผูกกับใบแจ้งซ่อม)</label>
                            <select class="pe-form-input" id="spTxWoId">
                                <option value="">-- ไม่ระบุ --</option>
                            </select>
                        </div>
                    </div>

                    <div class="col-12">
                        <div class="pe-form-group">
                            <label class="pe-form-label">Notes / Remarks (หมายเหตุ)</label>
                            <textarea class="pe-form-input" id="spTxNotes" rows="2" placeholder="เหตุผลในการเบิก/รับ หรือรายละเอียดอื่นๆ"></textarea>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="pe-btn pe-btn-primary" id="spTxSaveBtn" onclick="SparePartsModule.submitTransaction()">
                    <i class="fas fa-save me-1"></i> Confirm Transaction
                </button>
            </div>
        </div>
    </div>
</div>
