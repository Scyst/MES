<div class="modal fade" id="modalReceive" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog">
        <form id="formReceive" class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title"><i class="fas fa-file-import me-2"></i>รับอะไหล่เข้าสต๊อก</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label fw-bold">ค้นหาและเลือกอะไหล่ <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="rcv_hidden_item_id">
                    <input class="form-control border-0 bg-light" list="rcvItemOptions" id="rcv_item_input" placeholder="-- พิมพ์รหัส หรือ ชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="rcvItemOptions"></datalist>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">คลังเก็บสินค้า <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select border-0 bg-light" required>
                        <option value="">-- เลือกสถานที่เก็บ --</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-8 mb-3">
                        <label class="form-label fw-bold">จำนวนที่รับเข้า <span class="text-danger">*</span></label>
                        <input type="number" name="quantity" class="form-control border-0 bg-light" step="0.01" min="0.01" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label fw-bold">หน่วย</label>
                        <input type="text" id="receive_uom_display" class="form-control border-0 bg-light-subtle" readonly placeholder="-">
                    </div>
                </div>
                <div class="mb-0">
                    <label class="form-label fw-bold">หมายเหตุ / เลขที่ใบสั่งซื้อ</label>
                    <textarea name="notes" class="form-control border-0 bg-light" rows="2" placeholder="ระบุเหตุผลการรับเข้า..."></textarea>
                </div>
            </div>
            <div class="modal-footer bg-light border-0">
                <button type="button" class="btn btn-link text-secondary text-decoration-none" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-primary px-4 fw-bold">ยืนยันการรับเข้า</button>
            </div>
        </form>
    </div>
</div>