<div class="modal fade" id="addEntryModal" tabindex="-1" aria-labelledby="addEntryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="addEntryForm" data-action="addEntry">
                <div class="modal-header">
                    <h5 class="modal-title" id="addEntryModalLabel">บันทึกของเข้า (IN)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">

                    <div class="mb-3 position-relative">
                        <label for="entry_item_search" class="form-label">ค้นหาชิ้นส่วน (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="entry_item_search" name="item_search" autocomplete="off" required>
                        <input type="hidden" id="entry_item_id" name="item_id">
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="entry_log_date" class="form-label">วันที่</label>
                            <input type="date" class="form-control" id="entry_log_date" name="log_date" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="entry_log_time" class="form-label">เวลา</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" class="form-control" id="entry_log_time" name="log_time" required>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="entry_from_location_id" class="form-label">จาก (From)</label>
                            <select class="form-select" id="entry_from_location_id" name="from_location_id"></select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="entry_to_location_id" class="form-label">ไปยัง (To)</label>
                            <select class="form-select" id="entry_to_location_id" name="to_location_id" required></select>
                        </div>
                    </div>

                    <div class="row align-items-end">
                        <div class="col-md-8 mb-3">
                            <label for="entry_quantity_in" class="form-label">จำนวน</label>
                            <input type="number" class="form-control" id="entry_quantity_in" name="quantity" min="1" step="1" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">สต็อกคงเหลือ</label>
                            <div id="entry_available_stock" class="form-control-plaintext ps-2 fw-bold text-white">--</div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="entry_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                        <input type="text" class="form-control" id="entry_lot_no" name="lot_no">
                    </div>

                    <div class="mb-3">
                        <label for="entry_notes" class="form-label">หมายเหตุ (Optional)</label>
                        <textarea class="form-control" id="entry_notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                    <button type="submit" class="btn btn-primary">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>