<div class="modal fade" id="addRequestModal" tabindex="-1" aria-labelledby="addRequestModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-optical-center">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold" id="addRequestModalLabel"><i class="fas fa-plus-circle me-2"></i>แจ้งของเสีย & ขอเบิกทดแทน</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <form id="scrapForm" onsubmit="submitRequest(event)">
                <div class="modal-body p-4">
                    
                    <div class="row g-3">
                        <div class="col-12">
                            <label for="wip_loc" class="form-label fw-bold text-secondary">1. จุดที่พบของเสีย (WIP Line)</label>
                            <select class="form-select border-secondary-subtle shadow-sm" id="wip_loc" required>
                                <option value="" selected disabled>Loading...</option>
                            </select>
                        </div>

                        <div class="col-12">
                            <label class="form-label fw-bold text-secondary d-block">2. เบิกทดแทนจาก (Store)</label>
                            <div id="store_buttons_container" class="store-grid-wrapper d-flex flex-wrap gap-2">
                                <div class="text-muted small"><i class="fas fa-spinner fa-spin me-1"></i>Loading...</div>
                            </div>
                            <input type="hidden" id="store_loc" required>
                        </div>

                        <div class="col-12">
                            <label class="form-label fw-bold text-secondary d-block">3. แหล่งที่มาของเสีย</label>
                            <div class="row g-2"> 
                                <div class="col-6">
                                    <input type="radio" class="btn-check" name="defect_source" id="source_snc" value="SNC" checked>
                                    <label class="btn btn-outline-primary w-100 fw-bold" for="source_snc">SNC (ภายใน)</label>
                                </div>
                                <div class="col-6">
                                    <input type="radio" class="btn-check" name="defect_source" id="source_vendor" value="Vendor">
                                    <label class="btn btn-outline-primary w-100 fw-bold" for="source_vendor">Vendor (ภายนอก)</label>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 position-relative mt-4">
                            <label for="item_search" class="form-label fw-bold text-secondary">4. ค้นหาชิ้นงาน (SAP No. / Part No.)</label>
                            <div class="input-group shadow-sm">
                                <span class="input-group-text bg-white border-secondary-subtle text-primary"><i class="fas fa-search"></i></span>
                                <input type="text" class="form-control border-secondary-subtle border-start-0" id="item_search" placeholder="พิมพ์รหัส หรือชื่อเพื่อค้นหา..." autocomplete="off" required>
                            </div>
                            <div id="autocomplete-list" class="autocomplete-results shadow border rounded position-absolute w-100 bg-white" style="display: none; z-index: 1050; max-height: 200px; overflow-y: auto; margin-top: 2px;"></div>
                            <input type="hidden" id="selected_item_id">
                        </div>

                        <div class="col-4">
                            <label for="qty" class="form-label fw-bold text-secondary">5. จำนวน</label>
                            <input type="number" class="form-control border-secondary-subtle shadow-sm fw-bold text-danger" id="qty" min="0.01" step="0.01" placeholder="0.00" required>
                        </div>
                        <div class="col-8">
                            <label for="reason" class="form-label fw-bold text-secondary">6. สาเหตุ / หมายเหตุ</label>
                            <input type="text" class="form-control border-secondary-subtle shadow-sm" id="reason" placeholder="ระบุสาเหตุ..." required>
                        </div>
                    </div>
                    
                </div>
                
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4" id="btnSubmitRequest">
                        <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                    </button>
                </div>
            </form>
            
        </div>
    </div>
</div>