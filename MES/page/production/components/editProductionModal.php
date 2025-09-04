<div class="modal fade" id="editProductionModal" tabindex="-1" aria-labelledby="editProductionModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="editProductionForm" data-action="editProduction">
                <div class="modal-header">
                    <h5 class="modal-title" id="editProductionModalLabel">แก้ไขรายการของออก (OUT)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit_production_transaction_id" name="transaction_id">

                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="edit_production_log_date" class="form-label">วันที่ผลิต</label>
                            <input type="date" class="form-control" id="edit_production_log_date" name="log_date" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="edit_production_start_time" class="form-label">เวลาเริ่ม</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" id="edit_production_start_time" name="start_time" class="form-control">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="edit_production_end_time" class="form-label">เวลาสิ้นสุด</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" id="edit_production_end_time" name="end_time" class="form-control">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">ชิ้นส่วน</label>
                        <input type="text" class="form-control form-control-readonly" id="edit_production_item_display" readonly>
                    </div>

                    <div class="mb-3">
                        <label for="edit_production_location_id" class="form-label">สถานที่ผลิต</label>
                        <select class="form-select" id="edit_production_location_id" name="location_id" required></select>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_quantity" class="form-label">จำนวน</label>
                            <input type="number" class="form-control" id="edit_production_quantity" name="quantity" min="1" step="1" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_production_count_type" class="form-label">ประเภท</label>
                            <select id="edit_production_count_type" name="count_type" class="form-select" required>
                                <option value="FG">FG</option>
                                <option value="HOLD">HOLD</option>
                                <option value="SCRAP">SCRAP</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="edit_production_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                        <input type="text" class="form-control" id="edit_production_lot_no" name="lot_no">
                    </div>

                    <div class="mb-3">
                        <label for="edit_production_notes" class="form-label">หมายเหตุ</label>
                        <textarea class="form-control" id="edit_production_notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger me-auto" id="deleteProductionFromModalBtn">Delete</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>