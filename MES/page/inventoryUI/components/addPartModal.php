<div class="modal fade" id="addPartModal" tabindex="-1" aria-labelledby="addPartModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="addPartForm" data-action="addPart">
                <div class="modal-header">
                    <h5 class="modal-title" id="addPartModalLabel">บันทึกของออก (OUT)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">

                    <div class="mb-3 position-relative">
                        <label for="out_item_search" class="form-label">ค้นหาชิ้นส่วน (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="out_item_search" name="item_search" autocomplete="off" required>
                        <input type="hidden" id="out_item_id" name="item_id">
                    </div>

                    <div class="row">
                        <div class="col-md-12 mb-3">
                            <label for="out_location_id" class="form-label">สถานที่ผลิต</label>
                            <select class="form-select" id="out_location_id" name="location_id" required></select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="out_log_date" class="form-label">วันที่ผลิต</label>
                            <input type="date" class="form-control" id="out_log_date" name="log_date" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="out_start_time" class="form-label">เวลาเริ่ม</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" id="out_start_time" name="start_time" class="form-control">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="out_end_time" class="form-label">เวลาสิ้นสุด</label>
                            <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" id="out_end_time" name="end_time" class="form-control">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="out_quantity" class="form-label">จำนวน</label>
                            <input type="number" class="form-control" id="out_quantity" name="quantity" min="1" step="1" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="out_count_type" class="form-label">ประเภท</label>
                            <select id="out_count_type" name="count_type" class="form-select" required>
                                <option value="FG">FG</option>
                                <option value="NG">NG</option>
                                <option value="SCRAP">SCRAP</option>
                                <option value="REWORK">REWORK</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="out_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                        <input type="text" class="form-control" id="out_lot_no" name="lot_no">
                    </div>

                    <div class="mb-3">
                        <label for="out_notes" class="form-label">หมายเหตุ (Optional)</label>
                        <textarea class="form-control" id="out_notes" name="notes" rows="2"></textarea>
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