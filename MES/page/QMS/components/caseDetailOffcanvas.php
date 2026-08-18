<style>
    /* ==========================================================================
       OFFCANVAS UI/UX REFINEMENTS (Desktop & Mobile)
       ========================================================================== */
    
    /* 1. คุมความกว้างให้ Responsive */
    @media (max-width: 768px) {
        #caseDetailOffcanvas { width: 100% !important; }
    }
    @media (min-width: 769px) {
        #caseDetailOffcanvas { width: 600px !important; }
    }

    /* 2. ล็อก Header และ Tab ให้อยู่ติดขอบบนเสมอ (Sticky) */
    .offcanvas-sticky-top {
        position: sticky;
        top: 0;
        z-index: 1020;
        background-color: #fff;
    }

    /* 3. ปรับโทนสีและขนาดฟอนต์ให้ได้มาตรฐาน */
    #caseDetailOffcanvas .info-label { 
        font-size: 0.75rem; 
        color: #6c757d; /* เทาหม่นๆ ดูพรีเมียม */
        font-weight: 700; 
        margin-bottom: 3px; 
        text-transform: uppercase; 
        letter-spacing: 0.5px; 
    }
    #caseDetailOffcanvas .info-value { 
        font-size: 0.95rem; 
        color: #212529; /* ดำสนิท อ่านง่าย */
        font-weight: 600; 
        word-break: break-word; /* ป้องกันคำยาวๆ ทะลุขอบ */
    }
    #caseDetailOffcanvas .info-box { 
        background-color: #f8f9fa; 
        border: 1px solid #e9ecef; 
        border-radius: 8px; 
        padding: 12px; 
        color: #495057; 
        font-weight: 500;
        font-size: 0.9rem;
        line-height: 1.5;
    }

    /* 4. ปรับแต่ง Tab Navigation */
    #caseDetailOffcanvas .nav-tabs {
        border-bottom: 1px solid #dee2e6;
    }
    #caseDetailOffcanvas .nav-tabs .nav-link { 
        color: #6c757d; 
        border: none; 
        border-bottom: 3px solid transparent; 
        font-weight: 600; 
        font-size: 1rem; 
        padding: 12px 0;
    }
    #caseDetailOffcanvas .nav-tabs .nav-link.active { 
        color: #0d6efd; 
        border-bottom: 3px solid #0d6efd; 
        background: transparent; 
    }
    #caseDetailOffcanvas .nav-tabs .nav-link:hover:not(.active) { 
        border-bottom: 3px solid #e9ecef; 
        color: #495057; 
    }

    /* 5. ปรับแต่งแกลเลอรี่รูปภาพให้เป็นสี่เหลี่ยมสวยงาม */
    .ncr-image-wrapper {
        aspect-ratio: 1 / 1; /* บังคับเป็นกล่องจัตุรัส */
        overflow: hidden;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        background-color: #f8f9fa;
        display: block;
    }
    .ncr-image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover; /* ครอปรูปให้เต็มกล่องแบบไม่เบี้ยว */
        transition: transform 0.3s ease;
    }
    .ncr-image-wrapper:hover img {
        transform: scale(1.05); /* เอาเมาส์ชี้แล้วซูมนิดนึง */
    }

    /* 6. UI/UX Revamp: Cards & Disabled Forms */
    .offcanvas-card {
        background: #fff;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        overflow: hidden;
        margin-bottom: 1.5rem;
    }
    .offcanvas-card-header {
        background: #f8f9fa;
        padding: 12px 16px;
        border-bottom: 1px solid #e9ecef;
        font-weight: 700;
        color: #495057;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .offcanvas-card-body {
        padding: 16px;
    }
    
    /* Disabled Form Styling (View Only Mode for Claim Tab) */
    #content-claim .form-control:disabled, #content-claim .form-select:disabled,
    #content-claim .form-control[readonly], #content-claim .form-select[readonly] {
        background-color: transparent !important;
        border-color: transparent !important;
        color: #212529 !important;
        font-weight: 600;
        padding-left: 0;
        padding-right: 0;
        opacity: 1;
        background-image: none !important; /* Remove select arrows */
    }
    /* Switch Disabled */
    .form-check-input:disabled {
        opacity: 0.6;
    }
    .form-check-input:disabled ~ .form-check-label {
        opacity: 0.8;
    }
</style>

<div class="offcanvas offcanvas-end shadow-lg" tabindex="-1" id="caseDetailOffcanvas">
    
    <div class="offcanvas-sticky-top border-bottom shadow-sm">
        <div class="offcanvas-header py-3 px-3 px-md-4 align-items-start d-flex justify-content-between">
            <div style="min-width: 0;" class="pe-2 flex-grow-1"> 
                <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
                    <h4 class="mb-0 fw-bold text-dark font-monospace text-truncate" id="offcanvas_car_no" style="max-width: 100%;">CAR-xxxx-xxx</h4>
                    <span id="offcanvas_status" class="badge bg-secondary text-white border flex-shrink-0">...</span>
                </div>
                <div class="small text-secondary fw-bold text-truncate"><i class="fas fa-file-alt me-1"></i> Quality Case Details</div>
            </div>
            <div class="d-flex align-items-center gap-2 mt-1 flex-shrink-0">
                <button type="button" class="btn btn-sm btn-outline-danger fw-bold rounded-pill shadow-sm" id="btnCancelCase" onclick="cancelQmsCase()" title="Void / Cancel this Case">
                    <i class="fas fa-ban"></i><span class="d-none d-md-inline ms-1">Void</span>
                </button>
                <button type="button" class="btn-close fs-4 bg-light rounded-circle p-2 shadow-sm" aria-label="Close" onclick="closeCaseDetail()"></button>
            </div>
        </div>

        <ul class="nav nav-tabs nav-justified px-3" id="qmsTabs" role="tablist">
            <li class="nav-item">
                <button class="nav-link active" id="tab-ncr" data-bs-toggle="tab" data-bs-target="#content-ncr" type="button">1. NCR</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="tab-car" data-bs-toggle="tab" data-bs-target="#content-car" type="button">2. CAR</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="tab-claim" data-bs-toggle="tab" data-bs-target="#content-claim" type="button">3. Claim</button>
            </li>
        </ul>
    </div>
    
    <div class="offcanvas-body p-0 bg-white">
        <div class="tab-content p-4" id="qmsTabContent">
            
            <div class="tab-pane fade show active" id="content-ncr">
                
                <div class="offcanvas-card">
                    <div class="offcanvas-card-header bg-primary bg-opacity-10 text-primary d-flex justify-content-between align-items-center">
                        <div><i class="fas fa-file-invoice me-1"></i> ข้อมูลรับแจ้งปัญหา (NCR Info)</div>
                        <div>
                            <button class="btn btn-sm btn-primary fw-bold shadow-sm me-1" id="btnEditNCR" onclick="editNcr()">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-light border fw-bold text-secondary shadow-sm" onclick="printDoc('ncr')">
                                <i class="fas fa-print text-primary"></i> Print
                            </button>
                        </div>
                    </div>
                    <div class="offcanvas-card-body">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="info-label"><i class="fas fa-building me-1"></i> Customer</div>
                                <div class="info-value text-primary fs-5" id="view_customer">-</div>
                            </div>
                            <div class="col-12">
                                <div class="info-label"><i class="fas fa-box me-1"></i> Product</div>
                                <div class="info-value" id="view_product">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-tag me-1"></i> Model</div>
                                <div class="info-value" id="view_model">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-industry me-1"></i> Line</div>
                                <div class="info-value text-success" id="view_line">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="offcanvas-card border-danger border-opacity-25">
                    <div class="offcanvas-card-header bg-danger bg-opacity-10 text-danger">
                        <i class="fas fa-exclamation-triangle"></i> รายละเอียดปัญหา (Defect Details)
                    </div>
                    <div class="offcanvas-card-body">
                        <div class="row g-3">
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-bug me-1"></i> Defect Type</div>
                                <div class="info-value text-danger" id="view_defect">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-sort-amount-down me-1"></i> Defect Qty</div>
                                <div class="info-value fs-5 fw-bold text-dark" id="view_qty">-</div>
                            </div>
                            <div class="col-12">
                                <div class="info-label"><i class="fas fa-align-left me-1"></i> Description</div>
                                <div class="info-box mt-1 border-danger border-opacity-25 bg-white" id="view_desc">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-file-invoice-dollar me-1"></i> Invoice No.</div>
                                <div class="info-value" id="view_invoice_no">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-map-marker-alt me-1"></i> Found By</div>
                                <div class="info-value" id="view_found_by">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="offcanvas-card border-secondary border-opacity-25">
                    <div class="offcanvas-card-header bg-secondary bg-opacity-10 text-secondary">
                        <i class="fas fa-history me-1"></i> ข้อมูลย้อนกลับ (Traceability)
                    </div>
                    <div class="offcanvas-card-body p-0">
                        <div class="row g-0 text-center">
                            <div class="col-4 p-3 border-end">
                                <div class="info-label">Prod Date</div>
                                <div class="info-value fs-6" id="view_prod_date">-</div>
                            </div>
                            <div class="col-4 p-3 border-end">
                                <div class="info-label">Shift</div>
                                <div class="info-value fs-6" id="view_shift">-</div>
                            </div>
                            <div class="col-4 p-3">
                                <div class="info-label">Lot No.</div>
                                <div class="info-value fs-6 text-primary" id="view_lot">-</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-light border-top p-3">
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="info-label text-primary"><i class="fas fa-user-edit me-1"></i> Issuer Name</div>
                                <div class="info-value text-primary" id="view_issuer_name">-</div>
                            </div>
                            <div class="col-6">
                                <div class="info-label"><i class="fas fa-id-badge me-1"></i> Issuer Position</div>
                                <div class="info-value" id="view_issuer_position">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="offcanvas-card">
                    <div class="offcanvas-card-header">
                        <i class="fas fa-camera text-secondary"></i> รูปภาพหน้างาน (Evidence)
                    </div>
                    <div class="offcanvas-card-body">
                        <div id="gallery_ncr" class="row g-3"></div>
                    </div>
                </div>
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
                            <textarea class="form-control border-primary bg-primary bg-opacity-10" name="qa_issue_description" rows="5" required placeholder="อธิบายปัญหาที่ต้องการให้ลูกค้าชี้แจง..."></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label info-label">Link Expiry (Days) <span class="text-danger">*</span></label>
                            <input type="number" class="form-control border-primary bg-light" name="expire_days" value="7" min="1" required>
                        </div>
                        <button type="submit" class="btn btn-primary fw-bold w-100 fs-5 py-2 shadow-sm rounded-pill">สร้างลิงก์ (Generate Link)</button>
                    </form>
                </div>

                <div id="zone_waiting_customer" class="d-none">
                    <div class="offcanvas-card border-warning border-opacity-50">
                        <div class="offcanvas-card-body text-center py-5 bg-warning bg-opacity-10">
                            <i class="fas fa-paper-plane fa-3x text-warning mb-3"></i>
                            <h5 class="fw-bold text-dark mb-1">รอการชี้แจงจากลูกค้า</h5>
                            <p class="text-secondary fw-bold small mb-4">ส่งลิงก์ด้านล่างนี้ให้ลูกค้าเพื่อเข้าสู่ระบบตอบกลับ</p>
                            <div class="input-group px-4 mb-3">
                                <input type="text" class="form-control border-warning text-dark fw-bold bg-white shadow-sm" id="customer_link" readonly>
                                <button class="btn btn-warning fw-bold text-dark shadow-sm" onclick="copyLink()"><i class="fas fa-copy"></i> Copy</button>
                            </div>
                            <div class="px-4 d-flex justify-content-center align-items-center gap-3">
                                <span class="small text-danger fw-bold"><i class="fas fa-hourglass-half me-1"></i> หมดอายุ: <span id="view_token_expiry">-</span></span>
                                <button class="btn btn-sm btn-outline-danger fw-bold rounded-pill px-3 bg-white" onclick="extendCarLink()"><i class="fas fa-plus-circle me-1"></i> ขยายเวลา 7 วัน</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="zone_customer_replied" class="d-none">
                    <div class="offcanvas-card">
                        <div class="offcanvas-card-header bg-success bg-opacity-10 text-success d-flex justify-content-between align-items-center">
                            <div><i class="fas fa-clipboard-check me-1"></i> การตอบกลับจากลูกค้า (CAR Response)</div>
                            <button class="btn btn-sm btn-light border fw-bold text-secondary shadow-sm" onclick="printDoc('car')"><i class="fas fa-print text-primary"></i> Print</button>
                        </div>
                        <div class="offcanvas-card-body">
                            <div class="row g-3">
                                <div class="col-12">
                                    <div class="info-label"><i class="fas fa-tags me-1"></i> Root Cause Category</div>
                                    <div class="info-value text-danger fs-5 bg-danger bg-opacity-10 px-3 py-2 rounded border border-danger border-opacity-25" id="view_rc_category">-</div>
                                </div>
                                <div class="col-12">
                                    <div class="info-label"><i class="fas fa-search me-1"></i> Root Cause Analysis (วิเคราะห์สาเหตุ)</div>
                                    <div class="info-box mt-1 border border-danger border-opacity-25 bg-danger bg-opacity-10" id="view_root_cause">-</div>
                                </div>
                                <div class="col-12">
                                    <div class="info-label"><i class="fas fa-tools me-1"></i> Corrective Action (แผนแก้ไข)</div>
                                    <div class="info-box mt-1 border border-success border-opacity-25 bg-success bg-opacity-10" id="view_action_plan">-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="tab-pane fade" id="content-claim">
    
                <div id="claim_locked" class="d-none text-center py-5 border rounded bg-light shadow-sm">
                    <i class="fas fa-lock fa-3x text-secondary opacity-50 mb-3"></i>
                    <h5 class="text-dark fw-bold">รอดำเนินการ</h5>
                    <p class="text-secondary fw-bold small mb-0">ต้องรอให้ลูกค้าส่งแนวทางแก้ไข(8D) <br>ก่อนถึงจะสามารถปิดเคลมได้</p>
                </div>

                <div id="claim_closed_zone" class="d-none">
                    <div class="offcanvas-card">
                        <div class="offcanvas-card-header bg-success bg-opacity-10 text-success d-flex justify-content-between align-items-center">
                            <div><i class="fas fa-check-circle me-1"></i> ข้อมูลการปิดงาน (Claim Closed)</div>
                            <button class="btn btn-sm btn-light border fw-bold text-secondary shadow-sm" onclick="printDoc('claim')"><i class="fas fa-print text-primary"></i> Print</button>
                        </div>
                        <div class="offcanvas-card-body text-center p-4">
                            <i class="fas fa-check-circle fa-4x text-success mb-3 opacity-75"></i>
                            <h5 class="fw-bold text-success mb-2">เคสนี้ถูกปิดสมบูรณ์แล้ว</h5>
                            <div class="text-secondary fw-bold bg-light d-inline-block px-3 py-1 rounded shadow-sm border"><i class="far fa-clock me-1"></i><span id="claim_closed_date">-</span></div>
                        </div>
                    </div>
                </div>

                <div id="claim_form_zone" class="d-none">
                    <div class="offcanvas-card border-warning border-opacity-50 mb-4">
                        <div class="offcanvas-card-header bg-warning bg-opacity-10 text-dark">
                            <i class="fas fa-box-open text-warning me-1"></i> ตรวจสอบและรับของ (Review & Receive)
                        </div>
                        <div class="offcanvas-card-body">
                            <div id="missing_container_alert" class="alert alert-warning py-2 mb-4 shadow-sm border-warning" style="font-size: 0.85rem;">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-exclamation-triangle fa-2x me-3 opacity-75"></i>
                                    <div>
                                        <strong class="text-dark">ลูกค้าส่งการวิเคราะห์ปัญหาแล้ว แต่ยังไม่ระบุข้อมูลการส่งคืน</strong><br>
                                        คุณสามารถอ่านข้อมูล 8D ได้ แต่ยังไม่สามารถปิดเคสได้จนกว่าข้อมูลขนส่งจะครบ
                                    </div>
                                </div>
                            </div>

                            <div class="row g-2 px-2">
                                <div class="col-6">
                                    <div class="info-label text-primary">ตู้คอนเทนเนอร์จากลูกค้า</div>
                                    <div class="info-value font-monospace bg-light border px-3 py-2 rounded text-center shadow-sm" id="view_return_container">-</div>
                                </div>
                                <div class="col-6">
                                    <div class="info-label text-danger">จำนวนที่ลูกค้าแจ้งส่งคืน</div>
                                    <div class="info-value font-monospace bg-light border px-3 py-2 rounded text-center text-danger shadow-sm" id="view_expected_qty">-</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form id="formCloseClaim" class="needs-validation" novalidate>
                        <input type="hidden" name="case_id" id="claim_case_id">
                        
                        <div class="offcanvas-card mb-4">
                            <div class="offcanvas-card-header bg-info bg-opacity-10 text-dark">
                                <i class="fas fa-clipboard-list text-info me-1"></i> การประเมินและการทำมาตรฐาน (Verification)
                            </div>
                            <div class="offcanvas-card-body p-0">

                        <div class="table-responsive">
                            <table class="table table-borderless align-middle text-center mb-0" style="min-width: 400px;">
                                <thead class="table-light text-muted small border-bottom border-top">
                                    <tr>
                                        <th style="width: 15%;">ครั้งที่</th>
                                        <th>วันที่ประเมิน</th>
                                        <th>ผลการประเมิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-bottom">
                                        <td class="fw-bold text-secondary">1</td>
                                        <td><input type="date" class="form-control form-control-sm bg-light" name="verify_date_1"></td>
                                        <td>
                                            <select class="form-select form-select-sm bg-light" name="verify_result_1">
                                                <option value="">- รอประเมิน -</option>
                                                <option value="1" class="text-success fw-bold">Accept (ผ่าน)</option>
                                                <option value="0" class="text-danger fw-bold">Reject (ไม่ผ่าน)</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="fw-bold text-secondary">2</td>
                                        <td><input type="date" class="form-control form-control-sm bg-light" name="verify_date_2"></td>
                                        <td>
                                            <select class="form-select form-select-sm bg-light" name="verify_result_2">
                                                <option value="">- รอประเมิน -</option>
                                                <option value="1" class="text-success fw-bold">Accept (ผ่าน)</option>
                                                <option value="0" class="text-danger fw-bold">Reject (ไม่ผ่าน)</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold text-secondary">3</td>
                                        <td><input type="date" class="form-control form-control-sm bg-light" name="verify_date_3"></td>
                                        <td>
                                            <select class="form-select form-select-sm bg-light" name="verify_result_3">
                                                <option value="">- รอประเมิน -</option>
                                                <option value="1" class="text-success fw-bold">Accept (ผ่าน)</option>
                                                <option value="0" class="text-danger fw-bold">Reject (ไม่ผ่าน)</option>
                                            </select>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="offcanvas-card-body border-top bg-light">
                            <div class="row g-3">
                                <div class="col-12 mb-1"><span class="info-label text-dark fw-bold"><i class="fas fa-file-signature me-1"></i> อัปเดตมาตรฐาน (Standardization)</span></div>
                                <div class="col-12 col-md-4">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="std_fmea" name="std_fmea" value="1">
                                        <label class="form-check-label small fw-bold text-secondary" for="std_fmea">Update FMEA</label>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="std_control_plan" name="std_control_plan" value="1">
                                        <label class="form-check-label small fw-bold text-secondary" for="std_control_plan">Control Plan</label>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="std_wi" name="std_wi" value="1">
                                        <label class="form-check-label small fw-bold text-secondary" for="std_wi">Update WI</label>
                                    </div>
                                </div>
                                <div class="col-12 mt-3">
                                    <input type="text" class="form-control form-control-sm bg-white" name="std_others" placeholder="มาตรฐานอื่นๆ ระบุ (ถ้ามี)...">
                                </div>
                            </div>
                        </div>
                        </div>

                        <div class="offcanvas-card mb-4">
                            <div class="offcanvas-card-body p-4">
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label class="form-label info-label"><i class="fas fa-recycle me-1"></i> Disposition (การจัดการของเสีย) <span class="text-danger">*</span></label>
                                        <select class="form-select border-secondary fw-bold text-dark" name="disposition" required>
                                            <option value="" selected disabled>-- เลือกผลการตรวจสอบ --</option>
                                            <option value="RETURN">รับของคืนแล้ว (Return & Rework)</option>
                                            <option value="SCRAP">ทำลายทิ้งที่ลูกค้า (Scrap at site)</option>
                                            <option value="ACCEPT">ยอมรับสภาพ (Accept as is)</option>
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label info-label text-success"><i class="fas fa-box-open me-1"></i> ยอดรับเข้าจริง <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control border-success text-center fw-bold text-success fs-5 bg-white" name="actual_received_qty" required>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label info-label text-danger"><i class="fas fa-coins me-1"></i> ค่าใช้จ่าย/CN (THB)</label>
                                        <input type="number" class="form-control border-danger text-end fw-bold text-danger fs-5 bg-white" name="cost_estimation" placeholder="0.00" step="0.01">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-outline-danger w-50 fw-bold rounded-pill" id="btnRejectCAR" onclick="rejectCAR()">
                                <i class="fas fa-reply me-1"></i> ตีกลับ CAR
                            </button>
                            <button type="submit" class="btn btn-success w-50 fw-bold shadow-sm rounded-pill" id="btnCloseClaimBtn">
                                <i class="fas fa-clipboard-check me-1"></i> ปิดเคลม
                            </button>
                        </div>
                    </form>
                </div>

                </div>

            </div>

        </div>
    </div>
</div>