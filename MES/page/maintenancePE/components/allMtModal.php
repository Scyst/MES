<div class="modal fade" id="modalIssue" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form id="formIssue" class="modal-content border-0 rounded-1 shadow border-start border-5 border-dark">
            <div class="modal-header bg-light py-2">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-tools me-2"></i>เบิกอะไหล่เพื่อซ่อมบำรุง</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">ผูกกับใบแจ้งซ่อม (Maintenance Job)</label>
                    <input type="hidden" name="ref_job_id" id="iss_hidden_job_id">
                    <input class="form-control form-control-sm border-secondary-subtle" list="issJobOptions" id="iss_job_input" placeholder="-- พิมพ์ค้นหาเลข Job หรือ ชื่อเครื่องจักร --" autocomplete="off">
                    <datalist id="issJobOptions"></datalist>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold small">รหัส/ชื่ออะไหล่ <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="iss_hidden_item_id">
                    <input class="form-control form-control-sm bg-light" list="issItemOptions" id="iss_item_input" placeholder="-- พิมพ์รหัส หรือ ชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="issItemOptions"></datalist>
                    <div id="issue_onhand_hint" class="form-text text-end mt-1 small">คงเหลือในคลัง: <span class="fw-bold">-</span></div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold small">เบิกจากคลัง <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select form-select-sm bg-light" required>
                        <option value="">-- เลือกคลังที่ตัดยอด --</option>
                    </select>
                </div>

                <div class="row g-2">
                    <div class="col-8">
                        <label class="form-label fw-bold small">จำนวนที่เบิก <span class="text-danger">*</span></label>
                        <input type="number" name="quantity" class="form-control form-control-sm bg-light" step="0.01" min="0.01" required>
                    </div>
                    <div class="col-4">
                        <label class="form-label fw-bold small">หน่วย</label>
                        <input type="text" id="issue_uom_display" class="form-control form-control-sm bg-body-tertiary" readonly placeholder="-">
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-sm btn-dark fw-bold px-4">ยืนยันการเบิกออก</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="modalReceive" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form id="formReceive" class="modal-content border-0 rounded-1 shadow border-start border-5 border-success">
            <div class="modal-header bg-light py-2">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-file-import text-success me-2"></i>รับอะไหล่เข้าสต๊อก</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">รหัส/ชื่ออะไหล่ <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="rcv_hidden_item_id">
                    <input class="form-control form-control-sm bg-light" list="rcvItemOptions" id="rcv_item_input" placeholder="-- พิมพ์รหัส หรือ ชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="rcvItemOptions"></datalist>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold small">คลังเก็บสินค้า <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select form-select-sm bg-light" required>
                        <option value="">-- เลือกสถานที่เก็บ --</option>
                    </select>
                </div>

                <div class="row g-2">
                    <div class="col-8 mb-3">
                        <label class="form-label fw-bold small">จำนวนที่รับเข้า <span class="text-danger">*</span></label>
                        <input type="number" name="quantity" class="form-control form-control-sm bg-light" step="0.01" min="0.01" required>
                    </div>
                    <div class="col-4 mb-3">
                        <label class="form-label fw-bold small">หน่วย</label>
                        <input type="text" id="receive_uom_display" class="form-control form-control-sm bg-body-tertiary" readonly placeholder="-">
                    </div>
                </div>

                <div class="mb-0">
                    <label class="form-label fw-bold small">หมายเหตุ / เลขที่ใบสั่งซื้อ</label>
                    <textarea name="notes" class="form-control form-control-sm bg-light" rows="2" placeholder="ระบุเหตุผลการรับเข้า..."></textarea>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-sm btn-success fw-bold px-4">ยืนยันการรับเข้า</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="modalMtAdjust" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form id="formMtAdjust" class="modal-content border-0 rounded-1 shadow border-start border-5 border-warning">
            <div class="modal-header bg-light py-2">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-sliders-h text-warning me-2"></i>ปรับปรุงยอดสต๊อก (Stock Take)</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">รหัส/ชื่ออะไหล่ <span class="text-danger">*</span></label>
                    <input type="hidden" name="item_id" id="adj_hidden_item_id">
                    <input class="form-control form-control-sm bg-light fw-bold" list="adjItemOptions" id="adj_item_input" placeholder="-- พิมพ์รหัสหรือชื่ออะไหล่ --" autocomplete="off" required>
                    <datalist id="adjItemOptions"></datalist>
                    <div id="adj_onhand_hint" class="form-text text-end mt-1 small">ยอดปัจจุบันในระบบ: <span class="fw-bold text-primary">-</span></div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold small text-muted">คลังที่ต้องการปรับ <span class="text-danger">*</span></label>
                    <select name="location_id" class="form-select form-select-sm bg-light" required>
                        <option value="">-- เลือกสถานที่เก็บ --</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold small">ยอดที่นับได้จริง (Actual Count) <span class="text-danger">*</span></label>
                    <div class="input-group input-group-sm">
                        <input type="number" id="adj_actual_qty" class="form-control bg-light fw-bold text-primary fs-6" step="0.01" required placeholder="ใส่จำนวนที่นับได้...">
                        <span class="input-group-text bg-light part-uom small">Unit</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 px-1">
                        <span class="small text-muted">ส่วนต่าง (Diff):</span>
                        <span id="adj_diff_value" class="fw-bold">-</span>
                    </div>
                    <input type="hidden" name="quantity" id="adj_final_diff">
                </div>

                <div class="mb-0">
                    <label class="form-label fw-bold small text-muted">เหตุผลการปรับปรุง <span class="text-danger">*</span></label>
                    <textarea name="notes" class="form-control form-control-sm bg-light" rows="2" placeholder="เหตุผล..." required></textarea>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-sm btn-warning fw-bold px-4">ยืนยันการปรับยอด</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="modalMtItem" data-bs-backdrop="static" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <form id="formMtItem" class="modal-content border-0 rounded-1 shadow border-start border-5 border-primary">
            <div class="modal-header bg-light py-2">
                <h6 class="modal-title fw-bold text-primary"><i class="fas fa-cog me-2"></i>จัดการข้อมูลอะไหล่ (Item Master)</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <input type="hidden" name="item_id" id="mt_item_id">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label fw-bold small mb-1">รหัสอะไหล่ <span class="text-danger">*</span></label>
                        <input type="text" name="item_code" id="mt_item_code" class="form-control form-control-sm fw-bold" required>
                    </div>
                    <div class="col-md-8">
                        <label class="form-label fw-bold small mb-1">ชื่ออะไหล่ <span class="text-danger">*</span></label>
                        <input type="text" name="item_name" id="mt_item_name" class="form-control form-control-sm" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label fw-bold small mb-1">รายละเอียด / สเปค</label>
                        <input type="text" name="description" id="mt_description" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small mb-1">ผู้จัดจำหน่าย (Supplier)</label>
                        <input type="text" name="supplier" id="mt_supplier" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold small mb-1">ราคาประเมิน (฿)</label>
                        <input type="number" name="unit_price" id="mt_unit_price" class="form-control form-control-sm" step="0.01">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold small mb-1">หน่วยนับ <span class="text-danger">*</span></label>
                        <select name="uom" id="mt_uom" class="form-select form-select-sm fw-bold" required>
                            <option value="PCS">PCS</option>
                            <option value="SET">SET</option>
                            <option value="M">Meters</option>
                            <option value="KG">KG</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small mb-1">Min Stock (แจ้งเตือน)</label>
                        <input type="number" name="min_stock" id="mt_min_stock" class="form-control form-control-sm text-danger fw-bold" step="0.01">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small mb-1">Max Stock</label>
                        <input type="number" name="max_stock" id="mt_max_stock" class="form-control form-control-sm text-success fw-bold" step="0.01">
                    </div>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-sm btn-primary fw-bold px-4"><i class="fas fa-save me-1"></i> บันทึกข้อมูล</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="importMtItemModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 rounded-1 shadow">
            <div class="modal-header bg-light py-2 border-bottom">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-file-import text-primary me-2"></i>นำเข้าข้อมูล Item Master</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3">
                <div class="d-flex align-items-center justify-content-between mb-3 bg-body-tertiary p-2 rounded border">
                    <input type="file" id="mtExcelFile" class="form-control form-control-sm w-50" accept=".xlsx, .xls, .csv" onchange="MtImportCtrl.processExcel()">
                    <div>
                        <span class="text-primary fw-bold small me-3" id="mtPreviewCount">พบข้อมูล: 0 รายการ</span>
                        <button type="button" class="btn btn-outline-success btn-sm fw-bold" onclick="MtImportCtrl.downloadTemplate()">
                            <i class="fas fa-download me-1"></i> Template
                        </button>
                    </div>
                </div>
                <div class="table-responsive border rounded hide-scrollbar" style="max-height: 400px;">
                    <table class="table table-sm table-striped table-hover align-middle mb-0 small">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th>Item Code</th><th>Item Name</th><th>Price</th><th>UOM</th><th>Min/Max</th>
                            </tr>
                        </thead>
                        <tbody id="mtPreviewTbody">
                            <tr><td colspan="5" class="text-center py-5 text-muted">กรุณาเลือกไฟล์เพื่อดูตัวอย่าง</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-sm btn-primary d-none fw-bold px-4" id="btnSaveMtImport" onclick="MtImportCtrl.submitToDatabase()">บันทึกข้อมูล</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="importStockTakeModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 rounded-1 shadow border-start border-5 border-warning">
            <div class="modal-header bg-light py-2 border-bottom">
                <h6 class="modal-title fw-bold text-dark"><i class="fas fa-clipboard-check text-warning me-2"></i>อัปเดตยอดนับสต๊อก (Bulk Stock Take)</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3">
                <div class="d-flex align-items-center justify-content-between mb-3 bg-body-tertiary p-2 rounded border">
                    <div class="d-flex align-items-center w-75">
                        <input type="file" id="stExcelFile" class="form-control form-control-sm w-50 me-2" accept=".xlsx, .xls, .csv" onchange="MtStockTakeCtrl.processExcel()">
                        <span class="text-warning fw-bold small" id="stPreviewCount">พบรายการปรับปรุง: 0</span>
                    </div>
                    <button type="button" class="btn btn-outline-warning btn-sm fw-bold" onclick="MtStockTakeCtrl.exportCountSheet()">
                        <i class="fas fa-download me-1"></i> Load Template
                    </button>
                </div>
                <div class="table-responsive border rounded hide-scrollbar" style="max-height: 400px;">
                    <table class="table table-sm table-striped table-hover align-middle mb-0 small">
                        <thead class="table-light sticky-top">
                            <tr class="text-center">
                                <th class="text-start">Item Code</th><th>คลัง</th><th>ยอดเดิม</th><th>ยอดจริง</th><th>Diff</th>
                            </tr>
                        </thead>
                        <tbody id="stPreviewTbody">
                            <tr><td colspan="5" class="text-center py-5 text-muted">กรุณาเลือกไฟล์ผลการนับสต๊อก</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-sm btn-warning d-none fw-bold px-4" id="btnSaveStockTake" onclick="MtStockTakeCtrl.submitToDatabase()">ยืนยันการปรับยอดทั้งหมด</button>
            </div>
        </div>
    </div>
</div>