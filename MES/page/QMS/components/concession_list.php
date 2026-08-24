<!-- page/QMS/components/concession_list.php -->
<div class="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
    <div class="input-group shadow-sm" style="max-width: 400px; border-radius: 6px; overflow: hidden; flex: 1; min-width: 250px;">
        <span class="input-group-text bg-white border-0"><i class="fas fa-search text-muted"></i></span>
        <input type="text" id="concessionSearch" class="form-control border-0 bg-white" placeholder="ค้นหา Request No, ลูกค้า, สินค้า..." style="font-size: 0.95rem;">
    </div>
    <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary d-none d-lg-block fw-bold shadow-sm" onclick="bulkPrintConcession()">
            <i class="fas fa-print me-1"></i> Print Selected
        </button>
        <a href="print_concession.php?mode=blank" target="_blank" class="btn btn-sm btn-outline-secondary d-none d-lg-block fw-bold shadow-sm">
            <i class="fas fa-print me-1"></i> Print Blank
        </a>
        <button class="btn btn-sm btn-primary fw-bold shadow-sm d-none d-lg-block" onclick="openConcessionModal()">
            <i class="fas fa-plus-circle me-1"></i> New Request
        </button>
    </div>
</div>

<div class="card table-card shadow-sm border-0 flex-grow-1 desktop-view h-100 d-flex flex-column">
    <div class="table-responsive-custom h-100">
        <table class="table table-hover align-middle mb-0" id="concessionTable">
                <thead class="table-light text-secondary small text-uppercase">
                    <tr>
                        <th class="px-3 py-2 text-center" style="width: 40px;"><input type="checkbox" class="form-check-input" id="selectAllConcession" onchange="toggleSelectAllConcession(this)"></th>
                        <th class="px-3 text-start">Request No.</th>
                        <th class="text-center">Date</th>
                        <th class="text-start">Subject</th>
                        <th class="text-start">Part Details</th>
                        <th class="text-start">Order / Lot</th>
                        <th class="text-center">Issued By</th>
                        <th class="text-center">Request To</th>
                        <th class="text-center">Person</th>
                        <th class="text-center">Qty</th>
                    </tr>
                </thead>
                <tbody id="concessionBody">
                    <tr><td colspan="10" class="text-center py-4 text-muted">Loading requests...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

<!-- Modal Concession Form -->
<div class="modal fade" id="concessionModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold" id="concessionModalTitle"><i class="fas fa-file-alt me-2"></i>New Customer Concession Request</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
                <form id="formConcession" class="needs-validation" novalidate>
                    <input type="hidden" name="id" id="concession_id">
                    <input type="hidden" name="action" id="concession_action" value="create">
                    <div class="row">
                        <!-- Header section -->
                        <div class="col-md-4 mb-3">
                            <label class="form-label small fw-bold">Issued By (Department)</label>
                            <input type="text" class="form-control form-control-sm" name="issued_by_dept" value="QA/QC Section" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label small fw-bold">Request To</label>
                            <input type="text" class="form-control form-control-sm" name="request_to" value="OTI" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label small fw-bold">Date</label>
                            <input type="date" class="form-control form-control-sm" name="request_date" value="<?php echo date('Y-m-d'); ?>" required>
                        </div>

                        <!-- Core info -->
                        <div class="col-md-6 mb-3">
                            <label class="form-label small fw-bold">Person Name</label>
                            <?php 
                            require_once __DIR__ . '/../../db.php';
                            $u_id = $_SESSION['user']['id'] ?? 0;
                            $stmt_name = $pdo->prepare("SELECT COALESCE(m.name_th, u.fullname, u.username) as real_name FROM USERS u LEFT JOIN MANPOWER_EMPLOYEES m ON u.username = m.emp_id WHERE u.id = ?");
                            $stmt_name->execute([$u_id]);
                            $real_name_row = $stmt_name->fetch();
                            $real_person_name = $real_name_row ? $real_name_row['real_name'] : ($_SESSION['user']['fullname'] ?? '');
                            ?>
                            <input type="text" class="form-control form-control-sm" name="person_name" value="<?php echo htmlspecialchars($real_person_name); ?>" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label small fw-bold">Subject (เรื่อง)</label>
                            <input type="text" class="form-control form-control-sm" name="subject" required>
                        </div>

                        <!-- Part info -->
                        <div class="col-12"><hr class="my-2 border-secondary border-opacity-25"></div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label small fw-bold">Part Name (ชื่อชิ้นงาน)</label>
                            <input type="text" class="form-control form-control-sm" name="part_name" required>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Part No.</label>
                            <input type="text" class="form-control form-control-sm" name="part_no" required>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Order No.</label>
                            <input type="text" class="form-control form-control-sm" name="order_no">
                        </div>

                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Quantity (จำนวน)</label>
                            <input type="number" class="form-control form-control-sm" name="qty" required>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Lot No.</label>
                            <input type="text" class="form-control form-control-sm" name="lot_no">
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Model Name</label>
                            <input type="text" class="form-control form-control-sm" name="model_name">
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label small fw-bold">Serial No.</label>
                            <input type="text" class="form-control form-control-sm" name="serial_no">
                        </div>

                        <!-- Defect info -->
                        <div class="col-12"><hr class="my-2 border-secondary border-opacity-25"></div>
                        <div class="col-12 mb-3">
                            <label class="form-label small fw-bold">Difference Regular Part and special adopt part (ข้อแตกต่างระหว่าง part ปกติกับ part ที่ขอใช้)</label>
                            <textarea class="form-control form-control-sm" name="difference_detail" rows="2" required></textarea>
                        </div>
                        <div class="col-12 mb-3">
                            <label class="form-label small fw-bold">Reason for Special Adopt (เหตุผลในการขอใช้ชิ้นงาน)</label>
                            <textarea class="form-control form-control-sm" name="reason_for_adopt" rows="2" required></textarea>
                        </div>
                        <div class="col-12 mb-3">
                            <label class="form-label small fw-bold">Cause (Write a fundamental cause - สาเหตุของปัญหา)</label>
                            <textarea class="form-control form-control-sm" name="root_cause" rows="2" required></textarea>
                        </div>

                        <!-- Measures -->
                        <div class="col-12"><hr class="my-2 border-secondary border-opacity-25"></div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label small fw-bold">How to take measure in the future (Tentative - ชั่วคราว)</label>
                            <textarea class="form-control form-control-sm border-warning" name="measure_tentative" rows="2" required></textarea>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label small fw-bold">How to take measure in the future (Permanent - ถาวร)</label>
                            <textarea class="form-control form-control-sm border-success" name="measure_permanent" rows="2" required></textarea>
                        </div>

                        <div class="col-12"><hr class="my-2 border-secondary border-opacity-25"></div>
                        <div class="col-12 mb-3">
                            <label class="form-label small fw-bold">Attach Images (แนบรูปภาพ 1-3 รูป - สูงสุด 5MB/รูป)</label>
                            <input type="file" class="form-control form-control-sm" name="images[]" id="concessionImages" accept="image/jpeg, image/png" multiple>
                            <div class="form-text text-muted small">Only JPG/PNG formats are allowed. Max 3 images.</div>
                            <div id="concessionImagePreview" class="d-flex flex-wrap gap-2 mt-2"></div>
                        </div>

                        <div class="col-12 mb-3">
                            <label class="form-label small fw-bold">Submit Report (เอกสารสนับสนุน)</label>
                            <select class="form-select form-select-sm" name="is_report_needed">
                                <option value="1">Need (ต้องการ)</option>
                                <option value="0">Not Need (ไม่ต้องการ)</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer bg-white">
                <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary rounded-pill px-4 fw-bold" id="concessionSubmitBtn" onclick="saveConcession()">
                    <i class="fas fa-paper-plane me-2"></i>Submit Request
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Approval/View Details -->
<div class="modal fade" id="concessionDetailModal" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold" id="detailModalTitle">Concession Request Details</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="concessionDetailContent">
                <!-- Content injected via JS -->
            </div>
            <div class="modal-footer bg-light" id="concessionDetailFooter">
                <!-- Approval buttons injected via JS -->
            </div>
        </div>
    </div>
</div>
