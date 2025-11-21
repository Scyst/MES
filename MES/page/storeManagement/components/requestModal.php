<div class="modal fade" id="addRequestModal" tabindex="-1" aria-labelledby="addRequestModalLabel" aria-hidden="true">
    
    <div class="modal-dialog modal-dialog-centered modal-optical-center">
        
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="addRequestModalLabel">แจ้งของเสีย & ขอเบิกทดแทน</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="scrapForm" onsubmit="submitRequest(event)">
                <div class="modal-body">
                    <div class="row">
                        <div class="col-12 mb-3">
                            <label for="wip_loc" class="form-label">จุดที่พบของเสีย (WIP Line)</label>
                            <select class="form-select" id="wip_loc" required>
                                <option value="" selected disabled>Loading...</option>
                            </select>
                        </div>
                        <div class="col-12 mb-3">
                            <label for="store_loc" class="form-label">เบิกทดแทนจาก (Store)</label>
                            <select class="form-select" id="store_loc" required>
                                    <option value="" selected disabled>Loading...</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3 position-relative">
                        <label for="item_search" class="form-label">ค้นหาชิ้นงาน (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="item_search" placeholder="พิมพ์รหัส หรือชื่อเพื่อค้นหา..." autocomplete="off" required>
                        <div id="autocomplete-list" class="autocomplete-results"></div>
                        <input type="hidden" id="selected_item_id">
                    </div>

                    <div class="row">
                        <div class="col-5 mb-3">
                            <label for="qty" class="form-label">จำนวน</label>
                            <input type="number" class="form-control" id="qty" min="0.01" step="0.01" placeholder="0.00" required>
                        </div>
                        <div class="col-7 mb-3">
                            <label for="reason" class="form-label">สาเหตุ / หมายเหตุ</label>
                            <input type="text" class="form-control" id="reason" placeholder="ระบุสาเหตุ..." required>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>