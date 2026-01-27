<div class="modal fade" id="plItemModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 15px;">
            <div class="modal-header border-0 bg-light" style="border-radius: 15px 15px 0 0;">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-sitemap me-2 text-primary"></i>รายละเอียดรายการบัญชี P&L
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <form id="plItemForm">
                    <input type="hidden" id="modalAction" name="action" value="create">
                    <input type="hidden" id="itemId" name="id">

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">Account Code</label>
                            <input type="text" class="form-control bg-light border-0" id="accountCode" name="account_code" placeholder="เช่น 410001" required>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">Row Order</label>
                            <input type="number" class="form-control bg-light border-0" id="rowOrder" name="row_order" value="0">
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">ชื่อรายการ (Item Name)</label>
                            <input type="text" class="form-control bg-light border-0" id="itemName" name="item_name" placeholder="ชื่อที่แสดงในรายงาน" required>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">รายการหลัก (Parent Account)</label>
                            <select class="form-select bg-light border-0" id="parentId" name="parent_id">
                                <option value="">-- เป็นรายการหลัก (No Parent) --</option>
                                </select>
                            <div class="form-text mt-1 text-primary"><i class="fas fa-info-circle me-1"></i>ใช้สำหรับจัดกลุ่ม เช่น Revenues, Direct Labor</div>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">ประเภท (Item Type)</label>
                            <select class="form-select bg-light border-0" id="itemType" name="item_type" required>
                                <option value="REVENUE">REVENUE (รายได้)</option>
                                <option value="EXPENSE">EXPENSE (ค่าใช้จ่าย)</option>
                                <option value="OTHER">OTHER (อื่นๆ)</option>
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">แหล่งที่มา (Data Source)</label>
                            <select class="form-select bg-light border-0" id="dataSource" name="data_source" required>
                                <option value="MANUAL">MANUAL (คีย์มือรายวัน)</option>
                                <option value="AUTO_STOCK">AUTO (จากยอดผลิต FG)</option>
                                <option value="AUTO_LABOR">AUTO (จากระบบ Manpower)</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-0 p-4 pt-0">
                <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary rounded-pill px-4 shadow" onclick="saveMasterItem()">
                    <i class="fas fa-save me-2"></i>บันทึกข้อมูล
                </button>
            </div>
        </div>
    </div>
</div>