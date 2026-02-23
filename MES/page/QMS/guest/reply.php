<?php
// MES/page/QMS/guest/reply.php

require_once '../../../config/config.php';
require_once '../../db.php';

// 1. รับค่า Token
$token = $_GET['token'] ?? '';
$error = '';
$caseData = null;
$images = [];
$otherPending = [];

// ประกาศค่าเริ่มต้น
$isReplied = false;
$isClosed = false;
$isExpired = false;
$isWaitingContainer = false;

if (empty($token)) {
    $error = "ACCESS DENIED: Document reference token not found (ไม่พบ Token อ้างอิงเอกสาร)";
} else {
    try {
        // 2. ดึงข้อมูลใบ CAR ปัจจุบัน
        $sql = "SELECT 
                    c.case_id, c.car_no, c.product_name, c.customer_name, c.current_status,
                    n.defect_type, n.defect_qty, n.defect_description,
                    car.qa_issue_description, car.token_expiry, car.customer_respond_date,
                    car.customer_root_cause, car.customer_action_plan, car.containment_action, car.root_cause_category, car.leak_cause,
                    car.return_container_no, car.expected_return_qty
                FROM QMS_CASES c WITH (NOLOCK)
                JOIN QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                WHERE car.access_token = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$token]);
        $caseData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$caseData) {
            $error = "Invalid link or link has been cancelled (ลิงก์ไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว)";
        } else {
            // 3. ดึงรูปภาพ
            $sqlImg = "SELECT file_path FROM QMS_FILE WITH (NOLOCK) WHERE case_id = ? AND doc_stage = 'NCR'";
            $stmtImg = $pdo->prepare($sqlImg);
            $stmtImg->execute([$caseData['case_id']]);
            $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);

            // 4. ดึงรายการอื่นๆ ที่ "รอการตอบกลับ" หรือ "ตอบกลับแล้วแต่ยังไม่ใส่เลขตู้"
            $sqlOther = "SELECT c.car_no, c.product_name, n.defect_type, car.access_token, car.token_expiry, c.current_status, car.return_container_no
                         FROM QMS_CASES c WITH (NOLOCK)
                         JOIN QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                         JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                         WHERE c.customer_name = ? 
                           AND (
                               c.current_status = 'SENT_TO_CUSTOMER' 
                               OR 
                               (c.current_status = 'CUSTOMER_REPLIED' AND (car.return_container_no IS NULL OR car.return_container_no = ''))
                           )
                           AND c.case_id != ?
                           AND car.token_expiry > GETDATE()";
            $stmtOther = $pdo->prepare($sqlOther);
            $stmtOther->execute([$caseData['customer_name'], $caseData['case_id']]);
            $otherPending = $stmtOther->fetchAll(PDO::FETCH_ASSOC);
            
            // 5. เช็คสถานะ
            if (!empty($caseData['customer_respond_date'])) {
                $isReplied = true;
            }
            $isClosed = ($caseData['current_status'] === 'CLOSED');
            $isWaitingContainer = ($isReplied && empty(trim($caseData['return_container_no'] ?? '')));
        }
    } catch (Exception $e) {
        $error = "System Error: " . $e->getMessage();
    }
}

// เช็คหมดอายุ
if ($caseData && !$isReplied && (strtotime($caseData['token_expiry']) < time())) {
    $isExpired = true;
    $error = "This link has expired. Please contact QA/QC to request a new link (ลิงก์นี้หมดอายุแล้ว กรุณาติดต่อ QA/QC เพื่อขอลิงก์ใหม่)";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Quality Portal | SNC</title>
    <link rel="stylesheet" href="../../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../../utils/libs/fontawesome/css/all.min.css">
    <style>
        body { background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, sans-serif; }
        .portal-header { background: #001f3f; color: #fff; padding: 1.5rem 0; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .card { border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-radius: 12px; margin-bottom: 1.5rem; overflow: hidden; }
        .card-header { background-color: #fff; border-bottom: 1px solid #eee; font-weight: bold; padding: 1rem 1.5rem; }
        .form-label { font-size: 0.85rem; font-weight: 600; color: #495057; }
        .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; font-size: 0.9rem; }
        .readonly-value { font-weight: bold; color: #212529; font-size: 1.1rem; }
        .pending-item { display: block; text-decoration: none; color: inherit; padding: 1rem; border-bottom: 1px solid #f1f1f1; transition: background 0.2s; }
        .pending-item:hover { background-color: #f8fbff; }
        .pending-item:last-child { border-bottom: none; }
    </style>
</head>
<body>

    <div class="portal-header">
        <div class="container d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-0 fw-bold"><i class="fas fa-shield-alt me-2 text-warning"></i> Quality Portal</h4>
                <div class="small text-white-50">SNC Creativity Anthology Co.,Ltd.</div>
            </div>
            <?php if($caseData): ?>
                <div class="text-end">
                    <span class="badge bg-light text-dark fs-6 shadow-sm"><i class="fas fa-building me-1"></i> <?php echo htmlspecialchars($caseData['customer_name']); ?></span>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <div class="container" style="max-width: 1200px;">
        
        <?php if ($error): ?>
            <div class="card border-danger text-center py-5 mx-auto" style="max-width: 600px;">
                <div class="card-body">
                    <i class="fas fa-times-circle fa-4x text-danger mb-3"></i>
                    <h4 class="text-dark fw-bold">Cannot Access Data<br><small class="text-muted fs-6">(ไม่สามารถเข้าถึงข้อมูลได้)</small></h4>
                    <p class="text-muted mt-3"><?php echo htmlspecialchars($error); ?></p>
                </div>
            </div>
        <?php else: ?>

            <div class="row g-4">
                
                <div class="col-lg-8">
                    
                    <?php if($isReplied && !$isWaitingContainer): ?>
                        <div class="alert alert-success shadow-sm border-0 d-flex align-items-center mb-4 p-4 rounded-4">
                            <i class="fas fa-check-circle fa-3x me-4"></i>
                            <div>
                                <h5 class="fw-bold mb-1">This CAR has been fully replied <span class="fs-6 fw-normal">(เอกสาร CAR นี้ตอบกลับสมบูรณ์แล้ว)</span></h5>
                                <div class="small">Replied on (ตอบเมื่อ): <?php echo date('d/m/Y H:i', strtotime($caseData['customer_respond_date'])); ?></div>
                            </div>
                        </div>
                    <?php elseif($isWaitingContainer): ?>
                        <div class="alert alert-info shadow-sm border-0 d-flex align-items-center mb-4 p-4 rounded-4">
                            <i class="fas fa-info-circle fa-3x me-4 text-info"></i>
                            <div>
                                <h5 class="fw-bold mb-1 text-info">Waiting for Container/Tracking No. <span class="fs-6 fw-normal">(รอการระบุหมายเลขตู้ขนส่ง)</span></h5>
                                <div class="small text-muted">You have already submitted the root cause analysis. Please provide the container/tracking number when ready to ship.<br>(ท่านได้ตอบกลับข้อมูลวิเคราะห์ปัญหาแล้ว กรุณาระบุหมายเลขตู้ส่งคืนหากพร้อมส่ง)</div>
                            </div>
                        </div>
                    <?php endif; ?>

                    <div class="d-flex align-items-center mb-3">
                        <h4 class="fw-bold text-primary mb-0 me-3"><?php echo htmlspecialchars($caseData['car_no']); ?></h4>
                        <?php if(!$isReplied): ?>
                            <span class="badge bg-warning text-dark border border-warning px-3 py-2">Waiting for Response (รอการตอบกลับ)</span>
                        <?php endif; ?>
                    </div>

                    <div class="card">
                        <div class="card-header text-primary"><i class="fas fa-info-circle me-2"></i>Issue Information (รายละเอียดปัญหา)</div>
                        <div class="card-body p-4 bg-white">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <div class="form-label text-muted text-uppercase">Product / Part</div>
                                    <div class="readonly-value"><?php echo htmlspecialchars($caseData['product_name']); ?></div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-label text-muted text-uppercase">Defect Type & Qty</div>
                                    <div class="readonly-value text-danger">
                                        <?php echo htmlspecialchars($caseData['defect_type']); ?> 
                                        (<?php echo (floor($caseData['defect_qty']) == $caseData['defect_qty']) ? number_format($caseData['defect_qty']) : rtrim(rtrim(number_format($caseData['defect_qty'], 4), '0'), '.'); ?> PCS)
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-label text-muted text-uppercase">QC Message / Requirement</div>
                                    <div class="info-box bg-primary bg-opacity-10 border-primary text-primary fw-bold"><?php echo nl2br(htmlspecialchars($caseData['qa_issue_description'])); ?></div>
                                </div>
                                
                                <?php if (!empty($images)): ?>
                                <div class="col-12 mt-4 pt-3 border-top">
                                    <div class="form-label text-muted"><i class="fas fa-camera me-1"></i> Evidence Images</div>
                                    <div class="row g-2 mt-1">
                                        <?php foreach($images as $img): ?>
                                            <div class="col-4 col-md-3">
                                                <a href="../../../<?php echo $img['file_path']; ?>" target="_blank">
                                                    <img src="../../../<?php echo $img['file_path']; ?>" class="img-fluid rounded border shadow-sm" style="height: 120px; object-fit: cover; width: 100%;">
                                                </a>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header text-success"><i class="fas fa-edit me-2"></i>Corrective Action Response (การชี้แจงและแนวทางแก้ไข)</div>
                        <div class="card-body p-4 bg-white">
                            <form id="customerForm">
                                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                                <input type="hidden" name="action" value="<?php echo ($isWaitingContainer) ? 'customer_update_container' : 'customer_reply'; ?>">

                                <div class="mb-4">
                                    <label class="form-label">1. Containment Action (การแก้ไขปัญหาเบื้องต้น) <span class="text-danger">*</span></label>
                                    <textarea class="form-control" name="containment_action" rows="3" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['containment_action'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">2. Root Cause Category (หมวดหมู่สาเหตุหลัก) <span class="text-danger">*</span></label>
                                    <select class="form-select fw-bold" name="root_cause_category" required <?php echo $isReplied ? 'disabled' : ''; ?>>
                                        <option value="" disabled <?php echo empty($caseData['root_cause_category']) ? 'selected' : ''; ?>>-- Select Category (เลือกหมวดหมู่) --</option>
                                        <?php 
                                            $cats = ['Man', 'Machine', 'Material', 'Method', 'Other'];
                                            foreach($cats as $c) {
                                                $sel = ($caseData['root_cause_category'] === $c) ? 'selected' : '';
                                                echo "<option value=\"$c\" $sel>$c</option>";
                                            }
                                        ?>
                                    </select>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">3. Root Cause Analysis (วิเคราะห์สาเหตุของปัญหา) <span class="text-danger">*</span></label>
                                    <textarea class="form-control" name="root_cause" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['customer_root_cause'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">4. Leak Cause (สาเหตุที่หลุดรอด)</label>
                                    <textarea class="form-control" name="leak_cause" rows="2" <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['leak_cause'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">5. Corrective Action Plan (แนวทางการแก้ไขป้องกันระยะยาว) <span class="text-danger">*</span></label>
                                    <textarea class="form-control" name="action_plan" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['customer_action_plan'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4 p-3 bg-light border rounded">
                                    <label class="form-label text-primary"><i class="fas fa-truck-loading me-1"></i> 6. Return Shipment Information (ข้อมูลการส่งคืนสินค้า)</label>
                                    
                                    <?php if(!$isReplied): ?>
                                    <div class="alert alert-info py-2 small mb-3">
                                        <i class="fas fa-info-circle"></i> You can save the analysis data (Items 1-5) first, and return to provide the tracking number later via this link.<br>(ท่านสามารถบันทึกข้อมูลก่อน และกลับมาระบุเลขตู้ภายหลังได้)
                                    </div>
                                    <?php endif; ?>

                                    <div class="row g-3 mt-1">
                                        <div class="col-md-6">
                                            <label class="form-label small">Container / Tracking No. (หมายเลขตู้)</label>
                                            <input type="text" class="form-control" name="return_container_no" placeholder="Not specified..." <?php echo $isClosed ? 'readonly' : ''; ?> value="<?php echo htmlspecialchars($caseData['return_container_no'] ?? ''); ?>">
                                            <small class="text-muted" style="font-size: 0.7rem;">(If no return, please specify "NO RETURN" / หากไม่มีการส่งคืน ให้ระบุ "NO RETURN")</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small">Expected Return Qty (จำนวนที่ส่งคืน)</label>
                                            <input type="number" class="form-control fw-bold" name="expected_return_qty" step="0.01" min="0" <?php echo $isClosed ? 'readonly' : ''; ?> value="<?php echo htmlspecialchars($caseData['expected_return_qty'] ?? ''); ?>">
                                        </div>
                                    </div>
                                </div>

                                <?php if(!$isReplied || $isWaitingContainer): ?>
                                    <hr class="my-4">
                                    <div class="d-flex justify-content-end">
                                        <button type="submit" class="btn <?php echo $isWaitingContainer ? 'btn-primary' : 'btn-success'; ?> btn-lg px-5 fw-bold shadow">
                                            <i class="fas fa-paper-plane me-2"></i> <?php echo $isWaitingContainer ? 'Update Container Info (อัปเดตข้อมูลการส่งคืน)' : 'Submit Response (ยืนยันการตอบกลับ)'; ?>
                                        </button>
                                    </div>
                                <?php endif; ?>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header bg-warning bg-opacity-10 text-dark">
                            <i class="fas fa-clipboard-list me-2 text-warning"></i> Other Pending Responses <span class="fs-6 fw-normal">(รอตอบกลับ)</span>
                            <span class="badge bg-danger ms-2 float-end"><?php echo count($otherPending); ?></span>
                        </div>
                        <div class="card-body p-0">
                            <?php if(empty($otherPending)): ?>
                                <div class="text-center text-muted p-5">
                                    <i class="fas fa-check-circle fa-3x mb-3 text-success opacity-50"></i>
                                    <h6>Great! No pending tasks.<br><small>(ยอดเยี่ยม! ไม่มีงานค้างแล้ว)</small></h6>
                                </div>
                            <?php else: ?>
                                <?php foreach($otherPending as $p): ?>
                                    <?php $isPendingContainer = ($p['current_status'] === 'CUSTOMER_REPLIED' && empty(trim($p['return_container_no'] ?? ''))); ?>
                                    <a href="?token=<?php echo $p['access_token']; ?>" class="pending-item">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-primary"><?php echo htmlspecialchars($p['car_no']); ?></span>
                                            <?php if($isPendingContainer): ?>
                                                <span class="badge bg-info text-dark" style="font-size: 0.65rem;">Waiting Container No.</span>
                                            <?php else: ?>
                                                <small class="text-muted"><i class="fas fa-clock"></i></small>
                                            <?php endif; ?>
                                        </div>
                                        <div class="small fw-bold text-dark text-truncate"><i class="fas fa-cube me-1"></i> <?php echo htmlspecialchars($p['product_name']); ?></div>
                                        <div class="small text-danger mt-1"><?php echo htmlspecialchars($p['defect_type']); ?></div>
                                    </a>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

            </div>

        <?php endif; ?>
        
        <div class="text-center text-muted small mt-4 mb-5">
            &copy; <?php echo date('Y'); ?> SNC Creativity Anthology Co.,Ltd. All rights reserved.
        </div>
    </div>

    <script src="../../../utils/libs/bootstrap.bundle.min.js"></script>
    <script src="../../../utils/libs/sweetalert2.all.min.js"></script>
    <script>
        document.getElementById('customerForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            
            Swal.fire({
                title: 'Confirm Submission?',
                text: "The data will be submitted to our QA system. (ข้อมูลจะถูกส่งเข้าระบบ QA ของทางเรา)",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonText: 'Cancel (ยกเลิก)',
                confirmButtonText: 'Confirm (ยืนยัน)'
            }).then((result) => {
                if (result.isConfirmed) {
                    const btn = this.querySelector('button[type="submit"]');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

                    const formData = new FormData(this);

                    fetch('../api/guest_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            Swal.fire('Success', 'Data saved successfully. (บันทึกข้อมูลเรียบร้อยแล้ว)', 'success').then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire('Error', res.message, 'error');
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                        }
                    }).catch(err => {
                        Swal.fire('Error', 'Cannot connect to the server. (ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้)', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        });
    </script>
</body>
</html>