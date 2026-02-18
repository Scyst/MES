<div class="modal fade" id="versionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-light">
                <h5 class="modal-title fw-bold text-secondary">
                    <i class="fas fa-code-branch me-2 text-primary"></i>ประวัติการแก้ไข Invoice: <span id="modalInvoiceNo" class="text-primary"></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="versionTable">
                        <thead class="table-light">
                            <tr>
                                <th class="text-center">Version</th>
                                <th class="text-center">Date</th>
                                <th class="text-end">Total (USD)</th>
                                <th>Remark (หมายเหตุ)</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Print</th>
                            </tr>
                        </thead>
                        <tbody>
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-fullscreen-lg-down">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-edit me-2"></i>แก้ไข Invoice: <span id="editInvoiceNoTxt"></span>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formEditInvoice">
                    <input type="hidden" id="editInvoiceNo" value="">
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-white fw-bold">ข้อมูลลูกค้า (Customer)</div>
                                <div class="card-body">
                                    <div class="mb-2"><label class="form-label small">Customer Name</label><input type="text" id="editCustName" class="form-control form-control-sm" required></div>
                                    <div class="mb-2"><label class="form-label small">Consignee</label><textarea id="editConsignee" class="form-control form-control-sm" rows="2"></textarea></div>
                                    <div class="mb-2"><label class="form-label small">Notify Party</label><textarea id="editNotify" class="form-control form-control-sm" rows="2"></textarea></div>
                                    <div class="row">
                                        <div class="col-6 mb-2"><label class="form-label small">Incoterms</label><input type="text" id="editIncoterms" class="form-control form-control-sm"></div>
                                        <div class="col-6 mb-2"><label class="form-label small">Payment Terms</label><input type="text" id="editPayment" class="form-control form-control-sm"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6 mb-3">
                            <div class="card shadow-sm h-100">
                                <div class="card-header bg-white fw-bold">ข้อมูลขนส่ง (Shipping)</div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-6 mb-2"><label class="form-label small">Invoice Date</label><input type="date" id="editInvDate" class="form-control form-control-sm" required></div>
                                        <div class="col-6 mb-2"><label class="form-label small">Container No.</label><input type="text" id="editContainer" class="form-control form-control-sm"></div>
                                        <div class="col-6 mb-2"><label class="form-label small">Vessel</label><input type="text" id="editVessel" class="form-control form-control-sm"></div>
                                        <div class="col-6 mb-2"><label class="form-label small">Seal No.</label><input type="text" id="editSeal" class="form-control form-control-sm"></div>
                                    </div>
                                    <div class="mb-2"><label class="form-label small">หมายเหตุการแก้ไข (Remark สำหรับสร้าง Version ใหม่)</label>
                                        <input type="text" id="editRemark" class="form-control form-control-sm border-primary" placeholder="เช่น แก้ไขราคาสินค้า, เปลี่ยนเบอร์ตู้" required>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm mb-3">
                        <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                            รายการสินค้า (Items)
                            <button type="button" class="btn btn-sm btn-success" onclick="addEditItemRow()"><i class="fas fa-plus me-1"></i>เพิ่มรายการ</button>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered mb-0" id="editItemsTable" style="font-size: 0.85rem;">
                                    <thead class="table-light">
                                        <tr>
                                            <th>SKU</th>
                                            <th>Description</th>
                                            <th style="width: 100px;">Qty</th>
                                            <th style="width: 120px;">Price(USD)</th>
                                            <th style="width: 100px;">N.W</th>
                                            <th style="width: 100px;">G.W</th>
                                            <th style="width: 100px;">CBM</th>
                                            <th style="width: 50px;">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary fw-bold" onclick="saveWebEdit()"><i class="fas fa-save me-2"></i>บันทึกเป็นเวอร์ชันใหม่</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="importModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-file-import me-2"></i>อัปโหลดไฟล์ Excel</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formImport">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">รหัสอ้างอิง (Report/Booking)</label>
                            <input type="text" name="report_id" class="form-control form-control-sm" placeholder="เช่น BKG-2026-001">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">หมายเหตุ (Remark)</label>
                            <input type="text" name="remark" class="form-control form-control-sm" placeholder="โน้ตเพิ่มเติม">
                        </div>
                    </div>

                    <div class="mb-3">
                        <div id="dropZone" class="drop-zone p-4 text-center border rounded bg-white" style="border-style: dashed !important; border-width: 2px !important; border-color: #0d6efd !important; cursor: pointer;">
                            <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-2"></i>
                            <h6 class="fw-bold text-dark">ลากไฟล์มาวางที่นี่</h6>
                            <p class="text-muted small mb-0">หรือคลิกเพื่อเลือกไฟล์ (.xlsx, .csv)</p>
                            <input type="file" id="fileInput" accept=".xlsx, .csv" class="d-none">
                        </div>
                        <div id="fileNameDisplay" class="mt-2 text-success fw-bold text-center small"></div>
                    </div>

                    <button type="submit" id="btnSubmit" class="btn btn-primary w-100 fw-bold" disabled>
                        <span id="btnSpinner" class="spinner-border spinner-border-sm d-none me-2"></span>
                        <i class="fas fa-save me-2"></i>เริ่มการนำเข้า
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>