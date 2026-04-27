<div class="modal fade" id="modalIssue" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog">
        <form id="formIssue" class="modal-content border-0 shadow-lg border-start border-5 border-dark">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title"><i class="fas fa-tools me-2"></i>เบิกอะไหล่เพื่อซ่อมบำรุง</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label fw-bold text-primary">ผูกกับใบแจ้งซ่อม (Maintenance Job)</label>
                    <input type="hidden" name="ref_job_id" id="iss_hidden_job_id">
                    <input class="form-control border-primary-subtle" list="issJobOptions" id="iss_job_input" placeholder="-- พิมพ์ค้นหาเลข Job หรือ ชื่อเครื่องจักร --" autocomplete="off">
                    <datalist id="issJobOptions"></datalist>
                </div>
                <hr>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">ค้นหาอะไหล่ที่ต้องการเบิก <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="iss_hidden_item_id">
                    <input class="form-control border-0 bg-light" list="issItemOptions" id="iss_item_input" placeholder="-- พิมพ์รหัส หรือ ชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="issItemOptions"></datalist>
                    <div id="issue_onhand_hint" class="form-text text-end mt-1">คงเหลือในคลัง: <span class="fw-bold">-</span></div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">เบิกจากคลัง <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select border-0 bg-light" required>
                        <option value="">-- เลือกคลังที่ตัดยอด --</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-8 mb-3">
                        <label class="form-label fw-bold">จำนวนที่เบิก <span class="text-danger">*</span></label>
                        <input type="number" name="quantity" class="form-control border-0 bg-light" step="0.01" min="0.01" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label fw-bold">หน่วย</label>
                        <input type="text" id="issue_uom_display" class="form-control border-0 bg-light-subtle" readonly placeholder="-">
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-link text-secondary text-decoration-none" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-dark px-4 fw-bold">ยืนยันการเบิก</button>
            </div>
        </form>
    </div>
</div>