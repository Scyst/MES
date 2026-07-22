<!-- modal_sparepart_tx.php -->
<div class="modal fade pe-modal" id="spTxModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="spTxModalTitle"><i class="fas fa-box"></i> Spare Parts Transaction</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="spTxType" value="RECEIVE">
                
                <div class="row g-3">
                    <!-- ADD ITEM SECTION -->
                    <div class="col-md-5">
                        <div class="card shadow-sm h-100 border-0" style="background:#f8f9fa;">
                            <div class="card-body">
                                <h6 class="text-primary mb-3"><i class="fas fa-plus-circle me-1"></i> Add Item</h6>
                                <div class="mb-3">
                                    <label class="pe-form-label">อะไหล่ (Item) <span class="pe-text-danger">*</span></label>
                                    <div class="d-flex gap-2 mb-2 align-items-center">
                                        <div id="spTxItemImageWrapper" style="width: 50px; height: 50px; flex-shrink: 0; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
                                            <i class="fas fa-image text-muted"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <input type="text" class="pe-form-input" id="spTxItemInput" list="spTxItemList" placeholder="-- พิมพ์เพื่อค้นหาอะไหล่ --" onchange="SparePartsModule.onItemInput()">
                                            <datalist id="spTxItemList"></datalist>
                                        </div>
                                    </div>
                                    <input type="hidden" id="spTxItem">
                                </div>
                                <div class="mb-3">
                                    <label class="pe-form-label">Location (คลัง) <span class="required">*</span></label>
                                    <select class="pe-form-input" id="spTxLocation">
                                        <option value="">-- เลือกคลังจัดเก็บ --</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="pe-form-label">Quantity (จำนวน) <span class="required">*</span></label>
                                    <input type="number" class="pe-form-input" id="spTxQty" min="1" step="1">
                                </div>
                                <button type="button" class="pe-btn pe-btn-primary w-100" onclick="SparePartsModule.addToCart()">
                                    <i class="fas fa-arrow-right me-1"></i> Add to List
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CART SECTION -->
                    <div class="col-md-7">
                        <div class="card shadow-sm h-100 border-0">
                            <div class="card-body d-flex flex-column">
                                <h6 class="text-primary mb-3"><i class="fas fa-list me-1"></i> Transaction List <span class="badge bg-secondary ms-2" id="spTxCartCount">0</span></h6>
                                <div class="table-responsive flex-grow-1" style="max-height: 250px; overflow-y: auto;">
                                    <table class="table pe-table pe-table-sm align-middle">
                                        <thead>
                                            <tr>
                                                <th width="50">Img</th>
                                                <th>Item</th>
                                                <th>Location</th>
                                                <th class="text-end">Qty</th>
                                                <th class="text-center" width="50">Act</th>
                                            </tr>
                                        </thead>
                                        <tbody id="spTxCartBody">
                                            <tr><td colspan="5" class="text-center text-muted py-4">No items added yet</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <hr>
                                <!-- TRANSACTION DETAILS -->
                                <div id="spTxWoGroup" style="display:none;" class="mb-3">
                                    <label class="pe-form-label text-sm fw-bold">Reference Work Order (ผูกกับใบแจ้งซ่อม)</label>
                                    <select class="pe-form-input form-select-sm" id="spTxWoId">
                                        <option value="">-- ไม่ระบุ --</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="pe-form-label text-sm fw-bold">Notes / Remarks (หมายเหตุ)</label>
                                    <textarea class="pe-form-input form-control-sm" id="spTxNotes" rows="1" placeholder="เหตุผลในการเบิก/รับ หรือรายละเอียดอื่นๆ"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="pe-btn pe-btn-success" id="spTxSaveBtn" onclick="SparePartsModule.submitTransaction()">
                    <i class="fas fa-check-circle me-1"></i> Confirm Transaction
                </button>
            </div>
        </div>
    </div>
</div>
