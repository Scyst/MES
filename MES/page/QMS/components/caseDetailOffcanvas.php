<div class="offcanvas offcanvas-end" tabindex="-1" id="caseDetailOffcanvas" style="width: 600px;">
    <div class="offcanvas-header bg-light border-bottom">
        <div>
            <h5 class="offcanvas-title fw-bold text-primary" id="offcanvas_car_no">Loading...</h5>
            <small class="text-muted">Status: <span id="offcanvas_status">-</span></small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
    </div>
    
    <div class="offcanvas-body p-0">
        <ul class="nav nav-tabs nav-justified" id="qmsTabs" role="tablist">
            <li class="nav-item">
                <button class="nav-link active" id="tab-ncr" data-bs-toggle="tab" data-bs-target="#content-ncr" type="button">
                    <i class="fas fa-exclamation-circle me-1"></i> NCR (ผลิต)
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="tab-car" data-bs-toggle="tab" data-bs-target="#content-car" type="button">
                    <i class="fas fa-paper-plane me-1"></i> CAR (ลูกค้า)
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="tab-claim" data-bs-toggle="tab" data-bs-target="#content-claim" type="button">
                    <i class="fas fa-file-invoice-dollar me-1"></i> Claim (ปิดจบ)
                </button>
            </li>
        </ul>

        <div class="tab-content p-3" id="qmsTabContent">
            
            <div class="tab-pane fade show active" id="content-ncr">
                <h6 class="fw-bold text-secondary">ข้อมูลรับแจ้งปัญหา (Defect Info)</h6>
                <table class="table table-sm table-borderless small mb-3">
                    <tr><td class="text-muted w-25">ลูกค้า:</td><td class="fw-bold" id="view_customer">-</td></tr>
                    <tr><td class="text-muted">สินค้า:</td><td id="view_product">-</td></tr>
                    <tr><td class="text-muted">อาการเสีย:</td><td class="text-danger fw-bold" id="view_defect">-</td></tr>
                    <tr><td class="text-muted">จำนวน:</td><td id="view_qty">-</td></tr>
                    <tr><td class="text-muted">รายละเอียด:</td><td id="view_desc">-</td></tr>
                </table>

                <h6 class="fw-bold text-secondary mt-4">Traceability</h6>
                <div class="bg-light p-2 rounded small">
                    Prod Date: <span id="view_prod_date">-</span> | 
                    Shift: <span id="view_shift">-</span> | 
                    Lot: <span id="view_lot">-</span>
                </div>

                <h6 class="fw-bold text-secondary mt-4">รูปภาพหน้างาน (Evidence)</h6>
                <div id="gallery_ncr" class="row g-2 mt-2"></div>
                <div class="d-grid mt-3">
                    <button class="btn btn-outline-secondary btn-sm" onclick="printDoc('ncr')">
                        <i class="fas fa-print me-1"></i> Print NCR
                    </button>
                </div>
            </div>

            <div class="tab-pane fade" id="content-car">
                
                <div id="zone_issue_car" class="d-none">
                    <div class="alert alert-warning border-0 small">
                        <i class="fas fa-info-circle me-1"></i> QC ต้องวิเคราะห์เบื้องต้นก่อนส่งลิงก์ให้ลูกค้า
                    </div>
                    <form id="formIssueCAR">
                        <input type="hidden" name="case_id" id="issue_case_id">
                        <div class="mb-3">
                            <label class="form-label fw-bold small">ระบุปัญหา (Issue Description for Customer)</label>
                            <textarea class="form-control" name="qa_issue_description" rows="3" placeholder="อธิบายปัญหาเป็นภาษาอังกฤษ หรือภาษาที่ลูกค้าเข้าใจ..." required></textarea>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-link me-1"></i> สร้างลิงก์ส่งลูกค้า (Generate Link)
                            </button>
                        </div>
                    </form>
                </div>

                <div id="zone_waiting_customer" class="d-none">
                    <div class="text-center py-4 bg-light rounded border border-primary border-opacity-25">
                        <h1 class="text-primary display-4"><i class="fas fa-envelope-open-text"></i></h1>
                        <h6 class="fw-bold mt-2">รอการตอบกลับจากลูกค้า</h6>
                        <p class="text-muted small mb-3">สถานะ: SENT_TO_CUSTOMER</p>
                        
                        <div class="input-group px-4">
                            <input type="text" class="form-control form-control-sm text-center bg-white" id="customer_link" readonly value="https://...">
                            <button class="btn btn-outline-secondary btn-sm" onclick="copyLink()">Copy</button>
                        </div>
                        <div class="mt-2 small text-muted">ส่งลิงก์นี้ให้ลูกค้าทาง Email หรือ Line</div>
                    </div>
                </div>

                <div id="zone_customer_replied" class="d-none">
                    <div class="alert alert-success border-0">
                        <i class="fas fa-check-circle me-1"></i> ลูกค้าตอบกลับแล้ว
                    </div>
                    <h6 class="fw-bold">สาเหตุ (Root Cause):</h6>
                    <div class="bg-light p-3 rounded mb-3" id="view_root_cause">-</div>
                    
                    <h6 class="fw-bold">การแก้ไข (Action Plan):</h6>
                    <div class="bg-light p-3 rounded" id="view_action_plan">-</div>
                    <div class="d-grid mt-3">
                        <button class="btn btn-outline-primary btn-sm" onclick="printDoc('car')">
                            <i class="fas fa-print me-1"></i> Print CAR Form
                        </button>
                    </div>
                </div>

            </div>

            <div class="tab-pane fade" id="content-claim">
    
                <div id="claim_locked" class="text-center py-5 text-muted d-none">
                    <i class="fas fa-lock fa-3x mb-3 opacity-25"></i>
                    <h6>ยังไม่สามารถปิดงานได้</h6>
                    <small>ต้องรอให้ลูกค้าตอบกลับ (CAR) ก่อน</small>
                </div>

                <div id="claim_form_zone" class="d-none">
                    <div class="alert alert-info border-0 small">
                        <i class="fas fa-info-circle me-1"></i> ลูกค้าตอบกลับแล้ว กรุณาสรุปผลเพื่อปิดงาน
                    </div>

                    <form id="formCloseClaim">
                        <input type="hidden" name="case_id" id="claim_case_id">
                        
                        <h6 class="fw-bold text-primary border-bottom pb-2 mb-3">สรุปผลการดำเนินการ (Final Disposition)</h6>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold small">การดำเนินการกับสินค้า (Disposition)</label>
                            <select class="form-select" name="disposition" id="claim_disposition" required>
                                <option value="" selected disabled>-- เลือกการดำเนินการ --</option>
                                <option value="RETURN">ส่งคืนลูกค้า (Return to Customer)</option>
                                <option value="SCRAP">ทำลายทิ้ง / ของเสีย (Scrap)</option>
                                <option value="REWORK">ซ่อมแซม / คัดแยก (Rework/Sort)</option>
                                <option value="ACCEPT">ยอมรับสภาพพิเศษ (Special Accept)</option>
                            </select>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label fw-bold small">จำนวนตัดเคลม (Final Qty)</label>
                                <input type="number" class="form-control" name="final_qty" id="claim_final_qty" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small">หน่วย (Unit)</label>
                                <input type="text" class="form-control" value="PCS" readonly>
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label fw-bold small">ประมาณการค่าเสียหาย (Cost Estimation)</label>
                            <div class="input-group">
                                <span class="input-group-text">฿</span>
                                <input type="number" class="form-control" name="cost_estimation" id="claim_cost" placeholder="0.00" step="0.01">
                            </div>
                            <div class="form-text">รวมค่าขนส่ง, ค่าแรง rework, หรือมูลค่าสินค้า</div>
                        </div>

                        <div class="d-grid gap-2">
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-check-circle me-1"></i> ยืนยันปิดงาน (Close Case)
                            </button>
                        </div>
                    </form>
                </div>

                <div id="claim_closed_zone" class="d-none">
                    <div class="text-center py-4 bg-success bg-opacity-10 rounded border border-success mb-3">
                        <h1 class="text-success"><i class="fas fa-check-circle"></i></h1>
                        <h5 class="fw-bold text-success">ปิดงานเรียบร้อยแล้ว</h5>
                        <small class="text-muted" id="claim_closed_date">-</small>
                    </div>

                    <ul class="list-group list-group-flush small">
                        <li class="list-group-item d-flex justify-content-between">
                            <span class="text-muted">การดำเนินการ:</span>
                            <span class="fw-bold" id="view_disposition">-</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <span class="text-muted">จำนวนตัดเคลม:</span>
                            <span class="fw-bold" id="view_final_qty">-</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <span class="text-muted">ค่าเสียหายรวม:</span>
                            <span class="fw-bold text-danger" id="view_cost">-</span>
                        </li>
                    </ul>

                    <div class="d-grid mt-3">
                        <button class="btn btn-outline-success btn-sm" onclick="printDoc('claim')">
                            <i class="fas fa-print me-1"></i> Print Claim Note
                        </button>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>