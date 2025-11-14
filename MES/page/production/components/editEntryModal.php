<div class="modal fade" id="editEntryModal" tabindex="-1" aria-labelledby="editEntryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="editEntryForm" data-action="editEntry">
                <div class="modal-header">
                    <h5 class="modal-title" id="editEntryModalLabel">แก้ไขรายการของเข้า (IN)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">

                    <div class="mb-3">
                        <label class="form-label">ชิ้นส่วน</label>
                        <input type="text" class="form-control form-control-readonly" id="edit_entry_item_display" readonly>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_from_location_id" class="form-label">จาก (From)</label>
                            <select class="form-select form-control-readonly" id="edit_entry_from_location_id" name="from_location_id" disabled></select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_to_location_id" class="form-label">ไปยัง (To)</label>
                            <select class="form-select form-control-readonly" id="edit_entry_to_location_id" name="to_location_id" required></select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_log_date" class="form-label">วันที่</label>
                            <input type="date" class="form-control form-control-readonly" id="edit_entry_log_date" name="log_date" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_log_time" class="form-label">เวลา</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" class="form-control form-control-readonly" id="edit_entry_log_time" name="log_time" required>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                             <label for="edit_entry_quantity" class="form-label">จำนวน</label>
                            <input type="number" class="form-control form-control-readonly" id="edit_entry_quantity" name="quantity" min="1" step="1" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="edit_entry_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                            <input type="text" class="form-control form-control-readonly" id="edit_entry_lot_no" name="lot_no" readonly>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="edit_entry_notes" class="form-label">หมายเหตุ</label>
                        <textarea class="form-control" id="edit_entry_notes" name="notes" rows="2"></textarea>
                    </div>

                    <input type="hidden" id="edit_entry_transaction_id" name="transaction_id">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger me-auto" id="deleteEntryFromModalBtn" data-action="delete">Delete</button>
                    <button type="submit" class="btn btn-primary" data-action="save">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</div>