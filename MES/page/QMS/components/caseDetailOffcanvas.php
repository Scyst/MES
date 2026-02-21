<style>
    /* ปรับ Contrast ให้เข้มและอ่านง่ายขึ้น */
    #caseDetailOffcanvas .nav-tabs .nav-link { color: #495057; border: none; border-bottom: 2px solid transparent; font-weight: 600; font-size: 1.05rem; }
    #caseDetailOffcanvas .nav-tabs .nav-link.active { color: #0d6efd; border-bottom: 3px solid #0d6efd; background: transparent; }
    #caseDetailOffcanvas .nav-tabs .nav-link:hover:not(.active) { border-bottom: 3px solid #dee2e6; color: #212529; }
    
    #caseDetailOffcanvas .info-label { font-size: 0.75rem; color: #343a40; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    #caseDetailOffcanvas .info-value { font-size: 0.95rem; color: #000000; font-weight: 600; }
    #caseDetailOffcanvas .info-box { background-color: #f8f9fa; border: 1px solid #ced4da; border-radius: 6px; padding: 12px; color: #212529; font-weight: 500; }
</style>

<div class="offcanvas offcanvas-end shadow" tabindex="-1" id="caseDetailOffcanvas" style="width: 600px;">
    
    <div class="offcanvas-header bg-white border-bottom py-3">
        <div>
            <div class="d-flex align-items-center gap-2 mb-1">
                <h4 class="mb-0 fw-bold text-dark font-monospace" id="offcanvas_car_no">Loading...</h4>
                <span id="offcanvas_status" class="badge bg-secondary text-white border">...</span>
            </div>
            <div class="small text-secondary fw-bold">Quality Case Details</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
    </div>
    
    <div class="offcanvas-body p-0 bg-white">
        <ul class="nav nav-tabs nav-justified bg-white" id="qmsTabs" role="tablist">
            <li class="nav-item">
                <button class="nav-link active py-3" id="tab-ncr" data-bs-toggle="tab" data-bs-target="#content-ncr" type="button">1. NCR</button>
            </li>
            <li class="nav-item">
                <button class="nav-link py-3" id="tab-car" data-bs-toggle="tab" data-bs-target="#content-car" type="button">2. CAR</button>
            </li>
            <li class="nav-item">
                <button class="nav-link py-3" id="tab-claim" data-bs-toggle="tab" data-bs-target="#content-claim" type="button">3. Claim</button>
            </li>
        </ul>

        <div class="tab-content p-4" id="qmsTabContent">
            
            <div class="tab-pane fade show active" id="content-ncr">
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold text-dark mb-0 border-start border-4 border-danger ps-2">ข้อมูลรับแจ้งปัญหา</h6>
                    <button class="btn btn-sm btn-outline-secondary fw-bold" onclick="printDoc('ncr')"><i class="fas fa-print"></i> Print</button>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-12">
                        <div class="info-label">Customer</div>
                        <div class="info-value text-primary" id="view_customer">-</div>
                    </div>
                    <div class="col-6">
                        <div class="info-label">Product</div>
                        <div class="info-value" id="view_product">-</div>
                    </div>
                    <div class="col-6">
                        <div class="info-label">Model</div>
                        <div class="info-value" id="view_model">-</div>
                    </div>
                    <div class="col-6">
                        <div class="info-label">Line</div>
                        <div class="info-value" id="view_line">-</div>
                    </div>
                    <div class="col-6">
                        <div class="info-label">Defect Type</div>
                        <div class="info-value text-danger" id="view_defect">-</div>
                    </div>
                    <div class="col-12">
                        <div class="info-label">Defect Qty</div>
                        <div class="info-value" id="view_qty">-</div>
                    </div>
                    <div class="col-12">
                        <div class="info-label">Description</div>
                        <div class="info-box mt-1" id="view_desc">-</div>
                    </div>
                </div>

                <h6 class="fw-bold text-dark mb-3 border-start border-4 border-danger ps-2">ข้อมูลย้อนกลับ (Traceability)</h6>
                <div class="row g-3 mb-4 text-center border rounded py-2 bg-light mx-0">
                    <div class="col-4">
                        <div class="info-label">Prod Date</div>
                        <div class="info-value" id="view_prod_date">-</div>
                    </div>
                    <div class="col-4 border-start border-end border-secondary border-opacity-25">
                        <div class="info-label">Shift</div>
                        <div class="info-value" id="view_shift">-</div>
                    </div>
                    <div class="col-4">
                        <div class="info-label">Lot No.</div>
                        <div class="info-value" id="view_lot">-</div>
                    </div>
                </div>

                <h6 class="fw-bold text-dark mb-3 border-start border-4 border-danger ps-2">รูปภาพหน้างาน (Evidence)</h6>
                <div id="gallery_ncr" class="row g-2"></div>
            </div>

            <div class="tab-pane fade" id="content-car">
                
                <div id="zone_issue_car" class="d-none">
                    <div class="mb-3">
                        <h6 class="fw-bold text-dark mb-1 border-start border-4 border-primary ps-2">ส่งเรื่องให้ลูกค้า (Issue CAR)</h6>
                        <small class="text-secondary fw-bold">กรุณาระบุรายละเอียดเบื้องต้นก่อนสร้างลิงก์ตอบกลับให้ลูกค้า</small>
                    </div>
                    <form id="formIssueCAR" class="needs-validation" novalidate>
                        <input type="hidden" name="case_id" id="issue_case_id">
                        <div class="mb-3">
                            <label class="form-label info-label">Issue Description <span class="text-danger">*</span></label>
                            <textarea class="form-control form-control-sm border-secondary" name="qa_issue_description" rows="5" required></textarea>
                        </div>
                        <button type="submit" class="btn btn-sm btn-primary fw-bold w-100 fs-6 py-2">สร้างลิงก์ (Generate Link)</button>
                    </form>
                </div>

                <div id="zone_waiting_customer" class="d-none text-center py-5 border rounded bg-light">
                    <i class="fas fa-paper-plane fa-3x text-primary mb-3"></i>
                    <h5 class="fw-bold text-dark mb-1">รอการชี้แจงจากลูกค้า</h5>
                    <p class="text-secondary fw-bold small mb-4">ส่งลิงก์ด้านล่างนี้ให้ลูกค้าเพื่อเข้าสู่ระบบตอบกลับ</p>
                    <div class="input-group input-group-sm px-4">
                        <input type="text" class="form-control border-primary text-dark fw-bold" id="customer_link" readonly>
                        <button class="btn btn-primary fw-bold" onclick="copyLink()"><i class="fas fa-copy"></i> Copy</button>
                    </div>
                </div>

                <div id="zone_customer_replied" class="d-none">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="fw-bold text-dark mb-0 border-start border-4 border-success ps-2">การตอบกลับจากลูกค้า (CAR Response)</h6>
                        <button class="btn btn-sm btn-outline-secondary fw-bold" onclick="printDoc('car')"><i class="fas fa-print"></i> Print</button>
                    </div>
                    <div class="row g-3">
                        <div class="col-12">
                            <div class="info-label">Root Cause Category</div>
                            <div class="info-value text-primary fs-5" id="view_rc_category">-</div>
                        </div>
                        <div class="col-12">
                            <div class="info-label">Root Cause Analysis</div>
                            <div class="info-box mt-1" id="view_root_cause">-</div>
                        </div>
                        <div class="col-12">
                            <div class="info-label">Corrective Action</div>
                            <div class="info-box mt-1" id="view_action_plan">-</div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="tab-pane fade" id="content-claim">
    
                <div id="claim_locked" class="d-none text-center py-5 border rounded bg-light">
                    <i class="fas fa-lock fa-3x text-secondary mb-3"></i>
                    <h5 class="text-dark fw-bold">รอดำเนินการ</h5>
                    <p class="text-secondary fw-bold small">ต้องรอให้ลูกค้าส่งแนวทางแก้ไขก่อนทำการปิดเคลม</p>
                </div>

                <div id="claim_form_zone" class="d-none">
                    <div class="mb-2 border-start border-4 border-warning ps-2">
                        <h6 class="fw-bold text-dark mb-0">ตรวจสอบและรับของ (Review & Receive)</h6>
                    </div>

                    <div id="missing_container_alert" class="alert alert-warning py-2 mb-3 d-none" style="font-size: 0.85rem;">
                        <i class="fas fa-exclamation-triangle me-1"></i> ลูกค้าส่งการวิเคราะห์ปัญหาแล้ว <b>แต่ยังไม่ระบุข้อมูลการส่งคืน</b><br>
                        (คุณสามารถอ่านข้อมูล 8D ได้ แต่ยังไม่สามารถปิดเคสได้จนกว่าข้อมูลขนส่งจะครบ)
                    </div>

                    <div class="row g-2 mb-3 px-2">
                        <div class="col-6">
                            <div class="info-label text-primary">ตู้คอนเทนเนอร์จากลูกค้า</div>
                            <div class="info-value font-monospace bg-light border px-2 py-1 rounded" id="view_return_container">-</div>
                        </div>
                        <div class="col-6">
                            <div class="info-label text-primary">จำนวนที่ลูกค้าแจ้งส่งคืน</div>
                            <div class="info-value text-danger font-monospace bg-light border px-2 py-1 rounded" id="view_expected_qty">-</div>
                        </div>
                    </div>

                    <form id="formCloseClaim" class="needs-validation" novalidate>
                        <input type="hidden" name="case_id" id="claim_case_id">
                        
                        <div class="row g-3 mb-4 p-3 bg-light border border-secondary rounded mx-0">
                            <div class="col-12">
                                <label class="form-label info-label">Disposition <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm border-secondary fw-bold text-dark" name="disposition" required>
                                    <option value="" selected disabled>-- เลือกผลการตรวจสอบ --</option>
                                    <option value="RETURN">รับของคืนแล้ว (Return & Rework)</option>
                                    <option value="SCRAP">ทำลายทิ้งที่ลูกค้า (Scrap at site)</option>
                                    <option value="ACCEPT">ยอมรับสภาพ (Accept as is)</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label info-label text-success">ยอดรับเข้าจริง <span class="text-danger">*</span></label>
                                <input type="number" class="form-control form-control-sm border-success text-center fw-bold text-success" name="actual_received_qty" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label info-label text-danger">ค่าใช้จ่าย/CN (THB)</label>
                                <input type="number" class="form-control form-control-sm border-danger text-end fw-bold text-danger" name="cost_estimation" placeholder="0.00" step="0.01">
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-sm btn-outline-danger w-50 fw-bold" id="btnRejectCAR" onclick="rejectCAR()">
                                <i class="fas fa-reply me-1"></i> ตีกลับ CAR
                            </button>
                            <button type="submit" class="btn btn-sm btn-success w-50 fw-bold shadow-sm" id="btnCloseClaimBtn">
                                <i class="fas fa-clipboard-check me-1"></i> รับของ & ปิดเคส
                            </button>
                        </div>
                    </form>
                </div>

                <div id="claim_closed_zone" class="d-none">
                    <div class="d-flex justify-content-between align-items-center mb-3 border-start border-4 border-success ps-2">
                        <h6 class="fw-bold text-dark mb-0">ข้อมูลการปิดงาน (Claim Closed)</h6>
                        <button class="btn btn-sm btn-outline-secondary fw-bold" onclick="printDoc('claim')"><i class="fas fa-print"></i> Print</button>
                    </div>
                    
                    <div class="border rounded bg-light p-3 text-center mb-4">
                        <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                        <h5 class="fw-bold text-success mb-1">เคสนี้ถูกปิดสมบูรณ์แล้ว</h5>
                        <div class="small text-secondary fw-bold" id="claim_closed_date">-</div>
                    </div>

                    <div class="row g-3 px-2">
                        <div class="col-6">
                            <div class="info-label">Disposition</div>
                            <div class="info-value text-primary fs-5" id="view_disposition">-</div>
                        </div>
                        <div class="col-6 text-end">
                            <div class="info-label">Final Qty</div>
                            <div class="info-value fs-5" id="view_final_qty">-</div>
                        </div>
                        <div class="col-12 mt-4 text-center border-top pt-3">
                            <div class="info-label">Total Cost Estimation</div>
                            <div class="info-value text-danger display-6 fw-bold" id="view_cost">-</div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>