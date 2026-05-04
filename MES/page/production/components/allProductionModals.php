<?php
// =========================================================================
// ALL PRODUCTION & INVENTORY MODALS (COMPACT & ENTERPRISE UI UPGRADED)
// =========================================================================
?>

<?php if ($canAdd): ?>
    
    <!-- 1. Modal บันทึกของเข้า (IN) -->
    <div class="modal fade" id="addEntryModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <form id="addEntryForm" data-action="addEntry">
                    <div class="modal-header bg-success text-white py-3">
                        <h5 class="modal-title fw-bold" id="addEntryModalLabel"><i class="fas fa-download me-2"></i>บันทึกของเข้า (IN)</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body bg-light p-3">
                        <div class="mb-3 p-3 rounded border border-success border-opacity-25 bg-white shadow-sm">
                            <label for="entry_transfer_id_input" class="form-label fw-bold small text-success mb-1"><i class="fas fa-qrcode me-1"></i> Scan / Enter Transfer ID</label>
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control fw-bold text-success border-success" id="entry_transfer_id_input" placeholder="T-A7B9C1..." style="text-transform: uppercase;">
                                <button class="btn btn-success fw-bold" type="button" id="entry_load_transfer_btn"><i class="fas fa-search me-1"></i> Load</button>
                            </div>
                            <input type="hidden" id="entry_transfer_uuid" name="transfer_uuid" value="">
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">วันที่</label>
                                    <input type="date" class="form-control form-control-sm" id="entry_log_date" name="log_date" required>
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">เวลา</label>
                                    <input type="time" class="form-control form-control-sm" id="entry_log_time" name="log_time" step="1" required>
                                </div>
                                <div class="col-12 position-relative mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">ชิ้นส่วน (SAP No. / Part No.)</label>
                                    <input type="text" class="form-control form-control-sm fw-bold border-success" id="entry_item_search" name="item_search" autocomplete="off" required placeholder="ค้นหา...">
                                    <input type="hidden" id="entry_item_id" name="item_id" required>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">จาก (From)</label>
                                    <select class="form-select form-select-sm" id="entry_from_location_id" name="from_location_id"></select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">ไปยัง (To)</label>
                                    <select class="form-select form-select-sm border-success fw-bold text-success" id="entry_to_location_id" name="to_location_id"></select>
                                </div>
                                <div class="col-7 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">จำนวน <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control form-control-sm fw-bold text-success border-success" id="entry_quantity_in" name="confirmed_quantity" min="1" step="1" required>
                                </div>
                                <div class="col-5 mt-2 d-flex flex-column justify-content-end pb-1 border-start px-3">
                                    <span class="form-label fw-bold small text-muted mb-0">สต็อกต้นทาง</span>
                                    <div id="entry_available_stock" class="fw-bold text-dark fs-6 mt-1">--</div>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border">
                            <div class="row g-2">
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">ล็อต / เลขอ้างอิง</label>
                                    <input type="text" class="form-control form-control-sm bg-light" id="entry_lot_no" name="lot_no" placeholder="Optional">
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">หมายเหตุ</label>
                                    <textarea class="form-control form-control-sm" id="entry_notes" name="notes" rows="1" placeholder="..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-success fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> ยืนยันรับเข้า</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 2. Modal บันทึกผลิต (OUT) -->
    <?php
        date_default_timezone_set('Asia/Bangkok');
        $current_hour = (int)date('H');
    ?>
    <div class="modal fade" id="addPartModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title fw-bold" id="addPartModalLabel"><i class="fas fa-upload me-2"></i>บันทึกผลิต (OUT)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="addPartForm" data-action="addPart">
                    <div class="modal-body bg-light p-3">
                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">วันที่ <span class="text-danger">*</span></label>
                                    <input type="date" id="out_log_date" name="log_date" class="form-control form-control-sm" required>
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">ช่วงเวลาผลิต <span class="text-danger">*</span></label>
                                    <select id="out_time_slot" name="time_slot" class="form-select form-select-sm border-primary fw-bold text-primary">
                                        <?php
                                            for ($h = 0; $h < 24; $h++) {
                                                $start_h = str_pad($h, 2, '0', STR_PAD_LEFT);
                                                $end_h = str_pad(($h + 1) % 24, 2, '0', STR_PAD_LEFT);
                                                $slot_value = "{$start_h}:00:00|{$end_h}:00:00";
                                                $selected = ($h == $current_hour) ? 'selected' : '';
                                                echo "<option value=\"{$slot_value}\" {$selected}>{$start_h}:00 - {$end_h}:00</option>";
                                            }
                                        ?>
                                    </select>
                                </div>
                                <div class="col-12 position-relative mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">ชิ้นส่วน (SAP No.) <span class="text-danger">*</span></label>
                                    <input type="text" id="out_item_search" class="form-control form-control-sm border-primary fw-bold" name="item_search" autocomplete="off" required placeholder="ค้นหา...">
                                    <input type="hidden" id="out_item_id" name="item_id" required>
                                </div>
                                <div class="col-12 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">ไปยังจุดจัดเก็บ (To) <span class="text-danger">*</span></label>
                                    <select id="out_location_id" name="location_id" class="form-select form-select-sm border-primary fw-bold text-primary"></select>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <label class="form-label text-dark fw-bold mb-2"><i class="fas fa-boxes me-1 text-primary"></i> ระบุจำนวน (ชิ้น)</label>
                            <div class="row g-2">
                                <div class="col-4 text-center">
                                    <label class="form-label fw-bold small text-success mb-1">FG (ดี)</label>
                                    <input type="number" id="out_qty_fg" name="quantity_fg" class="form-control form-control-sm text-center fw-bold border-success text-success" min="0" step="1" placeholder="0">
                                </div>
                                <div class="col-4 text-center">
                                    <label class="form-label fw-bold small text-warning mb-1">HOLD</label>
                                    <input type="number" id="out_qty_hold" name="quantity_hold" class="form-control form-control-sm text-center fw-bold border-warning text-warning" min="0" step="1" placeholder="0">
                                </div>
                                <div class="col-4 text-center">
                                    <label class="form-label fw-bold small text-danger mb-1">SCRAP</label>
                                    <input type="number" id="out_qty_scrap" name="quantity_scrap" class="form-control form-control-sm text-center fw-bold border-danger text-danger" min="0" step="1" placeholder="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-3 bg-white rounded shadow-sm border">
                            <div class="row g-2">
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">ล็อต / อ้างอิง</label>
                                    <input type="text" id="out_lot_no" name="lot_no" class="form-control form-control-sm bg-light" placeholder="Optional">
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">หมายเหตุ</label>
                                    <textarea id="out_notes" name="notes" class="form-control form-control-sm" rows="1" placeholder="..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <a href="label_printer.php" target="_blank" class="btn btn-sm btn-outline-secondary me-auto fw-bold shadow-sm">
                            <i class="fas fa-print me-1"></i> Print
                        </a>
                        <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-primary fw-bold px-4 shadow-sm"><i class="fas fa-save me-1"></i> บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 3. Modal แก้ไขประวัติ (IN) -->
    <div class="modal fade" id="editEntryModal" tabindex="-1" aria-labelledby="editEntryModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <form id="editEntryForm" data-action="editEntry">
                    <div class="modal-header bg-warning text-dark py-3">
                        <h5 class="modal-title fw-bold" id="editEntryModalLabel"><i class="fas fa-edit me-2"></i>แก้ไขประวัติ (IN)</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body bg-light p-3">
                        
                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <label class="form-label fw-bold small text-muted mb-1">ชิ้นส่วน (Item)</label>
                            <input type="text" class="form-control form-control-sm fw-bold border-0 bg-light text-primary" id="edit_entry_item_display" disabled>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">วันที่</label>
                                    <input type="date" class="form-control form-control-sm text-dark" id="edit_entry_log_date" name="log_date" required>
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-bold small text-muted mb-1">เวลา</label>
                                    <input type="time" class="form-control form-control-sm text-dark" id="edit_entry_log_time" name="log_time" step="1" required>
                                </div>
                                <div class="col-6 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">จาก (From)</label>
                                    <select class="form-select form-select-sm bg-light text-dark" id="edit_entry_from_location_id" name="from_location_id" disabled></select>
                                </div>
                                <div class="col-6 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">ไปยัง (To)</label>
                                    <select class="form-select form-select-sm border-warning fw-bold text-dark" id="edit_entry_to_location_id" name="to_location_id"></select>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border">
                            <div class="row g-2 align-items-center">
                                <div class="col-5">
                                    <label class="form-label fw-bold small text-muted mb-1">จำนวน <span class="text-danger">*</span></label>
                                </div>
                                <div class="col-7">
                                    <input type="number" class="form-control form-control-sm fw-bold border-warning text-end text-dark" id="edit_entry_quantity" name="quantity" min="0" step="1" required>
                                </div>
                                <div class="col-12 mt-2">
                                    <input type="text" class="form-control form-control-sm bg-light text-dark" id="edit_entry_lot_no" name="lot_no" placeholder="Lot / Ref No.">
                                </div>
                                <div class="col-12 mt-2">
                                    <textarea class="form-control form-control-sm text-dark" id="edit_entry_notes" name="notes" rows="1" placeholder="หมายเหตุ..."></textarea>
                                </div>
                            </div>
                        </div>

                        <input type="hidden" id="edit_entry_transaction_id" name="transaction_id">
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-sm btn-danger fw-bold shadow-sm me-auto px-3" id="deleteEntryFromModalBtn" data-action="delete"><i class="fas fa-trash-alt me-1"></i> ลบ</button>
                        <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-warning fw-bold px-4 shadow-sm text-dark" data-action="save"><i class="fas fa-save me-1"></i> บันทึกการแก้ไข</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 4. Modal แก้ไขประวัติ (OUT) -->
    <div class="modal fade" id="editProductionModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <form id="editProductionForm" data-action="editProduction">
                    <div class="modal-header bg-warning text-dark py-3">
                        <h5 class="modal-title fw-bold" id="editProductionModalLabel"><i class="fas fa-edit me-2"></i>แก้ไขประวัติ (OUT)</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body bg-light p-3">
                        <input type="hidden" id="edit_production_transaction_id" name="transaction_id">
                        
                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <label class="form-label fw-bold small text-muted mb-1">ชิ้นส่วน (Item)</label>
                            <input type="text" class="form-control form-control-sm fw-bold border-0 bg-light text-primary" id="edit_production_item_display" disabled>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2">
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted mb-1">จุดจัดเก็บ (Location)</label>
                                    <select id="edit_production_location_id" name="location_id" class="form-select form-select-sm border-warning fw-bold text-dark" required></select>
                                </div>
                                <div class="col-4 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">วันที่</label>
                                    <input type="date" class="form-control form-control-sm px-1 text-dark" id="edit_production_log_date" name="log_date" required>
                                </div>
                                <div class="col-4 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">เวลาเริ่ม</label>
                                    <input type="time" class="form-control form-control-sm px-1 text-dark" id="edit_production_start_time" name="start_time" required>
                                </div>
                                <div class="col-4 mt-2">
                                    <label class="form-label fw-bold small text-muted mb-1">เวลาจบ</label>
                                    <input type="time" class="form-control form-control-sm px-1 text-dark" id="edit_production_end_time" name="end_time" required>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border">
                            <div class="row g-2 align-items-center">
                                <div class="col-5">
                                    <select id="edit_production_count_type" name="count_type" class="form-select form-select-sm border-warning fw-bold text-dark" required>
                                        <option value="FG">FG (ดี)</option>
                                        <option value="HOLD">HOLD (รอตรวจสอบ)</option>
                                        <option value="SCRAP">SCRAP (เสีย)</option>
                                    </select>
                                </div>
                                <div class="col-7">
                                    <input type="number" class="form-control form-control-sm fw-bold border-warning text-end text-dark" id="edit_production_quantity" name="quantity" min="0" step="1" required>
                                </div>
                                <div class="col-12 mt-2">
                                    <input type="text" class="form-control form-control-sm bg-light text-dark" id="edit_production_lot_no" name="lot_no" placeholder="Lot / Ref No.">
                                </div>
                                <div class="col-12 mt-2">
                                    <textarea class="form-control form-control-sm text-dark" id="edit_production_notes" name="notes" rows="1" placeholder="หมายเหตุ..."></textarea>
                                </div>
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-sm btn-danger fw-bold shadow-sm me-auto px-3" id="deleteProductionFromModalBtn"><i class="fas fa-trash-alt me-1"></i> ลบ</button>
                        <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-warning fw-bold px-4 shadow-sm text-dark"><i class="fas fa-save me-1"></i> บันทึกการแก้ไข</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

<?php endif; ?>

<?php if ($canManage): ?>

    <!-- 5. Modal ปรับสต็อก (Adjustment) -->
    <div class="modal fade" id="adjustStockModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <form id="adjustStockForm">
                    <div class="modal-header bg-danger text-white py-3">
                        <h5 class="modal-title fw-bold" id="adjustStockModalLabel"><i class="fas fa-sliders-h me-2"></i>ปรับสต็อก (Adjustment)</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body bg-light p-3">
                        <input type="hidden" id="adjust_item_id" name="item_id">
                        <input type="hidden" id="adjust_location_id" name="location_id">

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <label class="form-label fw-bold small text-muted mb-1">ชิ้นส่วน (Item)</label>
                            <input type="text" id="adjust_item_display" class="form-control form-control-sm fw-bold bg-light border-0 mb-2 text-primary" disabled>
                            <label class="form-label fw-bold small text-muted mb-1">จุดจัดเก็บ (Location)</label>
                            <input type="text" id="adjust_location_display" class="form-control form-control-sm bg-light border-0" disabled>
                        </div>

                        <div class="p-3 bg-white rounded shadow-sm border mb-3">
                            <div class="row g-2 align-items-center">
                                <div class="col-6 border-end text-center">
                                    <label class="form-label fw-bold small text-muted mb-1">ยอดปัจจุบัน</label>
                                    <input type="text" id="adjust_current_onhand" class="form-control form-control-sm text-center fw-bold fs-5 text-muted border-0 bg-transparent" disabled>
                                </div>
                                <div class="col-6 text-center">
                                    <label for="adjust_physical_count" class="form-label fw-bold small text-danger mb-1">ยอดใหม่ที่นับได้ <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control text-center fw-bold border-danger text-danger fs-5 shadow-sm" id="adjust_physical_count" name="physical_count" required step="1">
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-3 bg-white rounded shadow-sm border">
                            <label for="adjust_notes" class="form-label fw-bold small text-muted mb-1">เหตุผลในการปรับสต็อก</label>
                            <textarea class="form-control form-control-sm" id="adjust_notes" name="notes" rows="2" placeholder="ระบุสาเหตุ..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-sm btn-secondary fw-bold px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-danger fw-bold px-4 shadow-sm"><i class="fas fa-check-circle me-1"></i> ยืนยันการปรับสต็อก</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

<?php endif; ?>

<!-- 6. GLOBAL Modals (ทุกคนเข้าถึงได้) -->
<div class="modal fade" id="stockDetailModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="stockDetailModalLabel"><i class="fas fa-boxes me-2 text-info"></i>รายละเอียดคลังย่อย</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top">
                            <tr class="text-secondary">
                                <th class="px-3 py-2">Location</th>
                                <th class="py-2 text-end px-3">ยอดคงเหลือ (Qty)</th>
                            </tr>
                        </thead>
                        <tbody id="stockDetailTableBody">
                            <tr><td colspan="2" class="text-center p-4">Loading details...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer bg-white border-top">
                <button type="button" class="btn btn-sm btn-secondary fw-bold px-4 shadow-sm" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="varianceDetailModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="varianceDetailModalLabel"><i class="fas fa-balance-scale me-2 text-warning"></i>เจาะลึกความเคลื่อนไหว (Variance)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-4">
                <div class="row g-4">
                    <div class="col-md-6">
                        <h6 class="fw-bold text-success border-bottom pb-2 mb-2">
                            <i class="fas fa-arrow-down me-2"></i>รับเข้า (IN) <span class="badge bg-success float-end" id="detailTotalIn">0</span>
                        </h6>
                        <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar" style="max-height: 40vh;">
                            <table class="table table-sm table-hover align-middle mb-0 table-settings">
                                <thead class="table-light sticky-top">
                                    <tr class="text-secondary"><th class="px-2 py-2">Date/Time</th><th class="py-2">Type</th><th class="py-2 text-end px-2">Qty</th></tr>
                                </thead>
                                <tbody id="detailInTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-danger border-bottom pb-2 mb-2">
                            <i class="fas fa-arrow-up me-2"></i>เบิกออก (OUT) <span class="badge bg-danger float-end" id="detailTotalOut">0</span>
                        </h6>
                        <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar" style="max-height: 40vh;">
                            <table class="table table-sm table-hover align-middle mb-0 table-settings">
                                <thead class="table-light sticky-top">
                                    <tr class="text-secondary"><th class="px-2 py-2">Date/Time</th><th class="py-2">Type</th><th class="py-2 text-end px-2">Qty</th></tr>
                                </thead>
                                <tbody id="detailOutTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="summaryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold" id="summaryModalLabel"><i class="fas fa-chart-pie me-2"></i>สรุปยอดผลิต (Production Summary)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar" style="max-height: 60vh;">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top">
                            <tr class="text-secondary">
                                <th class="px-3 py-2">Part No.</th>
                                <th class="py-2 text-center">Type</th>
                                <th class="py-2 text-end px-3">Total Qty</th>
                            </tr>
                        </thead>
                        <tbody id="summaryTableBody">
                            <tr><td colspan="3" class="text-center p-4">Loading summary...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="historySummaryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-info text-dark py-3">
                <h5 class="modal-title fw-bold" id="historySummaryModalLabel"><i class="fas fa-chart-bar me-2"></i>สรุปยอดรับเข้า (IN Summary)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar" style="max-height: 60vh;">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-light sticky-top">
                            <tr class="text-secondary">
                                <th class="px-3 py-2">Part No.</th>
                                <th class="py-2 text-center">Txn Type</th>
                                <th class="py-2 text-end px-3">Total Qty (IN)</th>
                            </tr>
                        </thead>
                        <tbody id="historySummaryTableBody">
                            <tr><td colspan="3" class="text-center p-4">Loading summary...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="hourlyProductionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="hourlyProductionModalLabel"><i class="fas fa-clock me-2 text-warning"></i>ยอดผลิตรายชั่วโมง (Hourly)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-0">
                <div class="p-3 pb-0">
                    <p class="text-muted small fw-bold mb-2" id="hourly-production-subtitle"><i class="fas fa-spinner fa-spin me-1"></i> กำลังโหลดข้อมูล...</p>
                    <nav class="mb-2">
                        <div class="nav nav-pills custom-pills flex-nowrap overflow-auto hide-scrollbar pb-1" id="hourly-production-nav" role="tablist"></div>
                    </nav>
                </div>
                
                <div class="table-responsive bg-white m-3 mt-0 border rounded shadow-sm hide-scrollbar" style="max-height: 55vh;">
                    <table class="table table-sm table-hover table-bordered align-middle mb-0 table-settings" id="hourly-production-table" style="table-layout: fixed;">
                        <thead class="table-dark sticky-top text-secondary" id="hourly-production-thead"></thead>
                        <tbody id="hourly-production-tbody">
                            <tr><td colspan="5" class="text-center p-5">Loading hourly data...</td></tr>
                        </tbody>
                        <tfoot class="table-light sticky-bottom fw-bold" id="hourly-production-tfoot"></tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="hourlySummaryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white py-3">
                <h5 class="modal-title fw-bold" id="hourlySummaryModalLabel"><i class="fas fa-chart-line me-2 text-success"></i>OEE รายชั่วโมง</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light p-3">
                <div class="table-responsive bg-white border rounded shadow-sm hide-scrollbar" style="max-height: 60vh;">
                    <table class="table table-sm table-hover align-middle mb-0 text-nowrap table-settings">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th class="px-3 py-2 text-center">Hour</th>
                                <th class="py-2 text-end">Availability</th>
                                <th class="py-2 text-end">Performance</th>
                                <th class="py-2 text-end">Quality</th>
                                <th class="py-2 text-end px-3 text-warning">OEE</th>
                            </tr>
                        </thead>
                        <tbody id="hourlySummaryTableBody">
                            <tr><td colspan="5" class="text-center p-4">Loading hourly data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>