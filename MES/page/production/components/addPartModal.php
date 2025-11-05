<?php
    date_default_timezone_set('Asia/Bangkok');
    $current_hour = (int)date('H');
?>
<div class="modal fade" id="addPartModal" tabindex="-1" aria-labelledby="addPartModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="addPartModalLabel">บันทึกของออก (OUT)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="addPartForm" data-action="addPart">
                <div class="modal-body">

                    <div class="row">
                         <div class="col-md-6 mb-3"> <label for="out_log_date" class="form-label">วันที่</label>
                              <input type="date" id="out_log_date" name="log_date" class="form-control" required>
                        </div>
                        
                        <div class="col-md-6 mb-3">
                            <label for="out_time_slot" class="form-label">ช่วงเวลาการผลิต</label>
                            <select id="out_time_slot" name="time_slot" class="form-select">
                                <?php
                                    // วน Loop สร้าง 24 ชั่วโมง
                                    for ($h = 0; $h < 24; $h++) {
                                        $start_time = sprintf('%02d:00:00', $h);
                                        $end_time = sprintf('%02d:59:59', $h);
                                        $display_text = sprintf('%02d:00 - %02d:59', $h, $h);
                                        $value = $start_time . '|' . $end_time;
                                        // (สำคัญ) เลือกชั่วโมงปัจจุบันเป็น Default
                                        $selected = ($h == $current_hour) ? 'selected' : '';
                                        
                                        echo "<option value=\"$value\" $selected>$display_text</option>";
                                    }
                                ?>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-3 position-relative">
                        <label for="out_item_search" class="form-label">ค้นหาชิ้นส่วน (SAP No. / Part No.)</label>
                        <input type="text" id="out_item_search" class="form-control" autocomplete="off" required>
                        <input type="hidden" id="out_item_id" name="item_id">
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="out_location_id" class="form-label">สถานที่ผลิต</label>
                            <select id="out_location_id" name="location_id" class="form-select" required></select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="out_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                            <input type="text" id="out_lot_no" name="lot_no" class="form-control">
                        </div>
                    </div>

                    <hr>
                    <p class="form-label fw-bold">กรอกจำนวน:</p>
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="out_qty_fg" class="form-label text-success">FG (งานดี)</label>
                            <input type="number" id="out_qty_fg" name="quantity_fg" class="form-control" min="0" placeholder="0">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="out_qty_hold" class="form-label text-warning">HOLD (งานรอซ่อม)</label>
                            <input type="number" id="out_qty_hold" name="quantity_hold" class="form-control" min="0" placeholder="0">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="out_qty_scrap" class="form-label text-danger">SCRAP (งานเสีย)</label>
                            <input type="number" id="out_qty_scrap" name="quantity_scrap" class="form-control" min="0" placeholder="0">
                        </div>
                    </div>
                    <hr>
                    
                    <div class="mb-3">
                        <label for="out_notes" class="form-label">หมายเหตุ</label>
                        <textarea id="out_notes" name="notes" class="form-control" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>