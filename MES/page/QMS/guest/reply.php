<?php
// MES/page/QMS/guest/reply.php

require_once '../../../config/config.php';
require_once '../../db.php';

// 1. รับค่า Token
$token = $_GET['token'] ?? '';
$error = '';
$caseData = null;
$images = [];

if (empty($token)) {
    // ถ้าไม่มี Token แปลว่าเข้ามาดูภาพรวม (สำหรับลูกค้าที่มีระบบ Login ในอนาคต)
    // ตรงนี้สามารถเชื่อมกับ $_SESSION['guest_access'] ได้เหมือนหน้า Sales
    $error = "ACCESS DENIED: Required CAR Token to respond.";
} else {
    try {
        $sql = "SELECT 
                    c.car_no, c.product_name, c.customer_name,
                    n.defect_type, n.defect_qty, n.defect_description,
                    car.qa_issue_description, car.token_expiry, car.customer_respond_date,
                    car.customer_root_cause, car.customer_action_plan, car.containment_action, car.root_cause_category, car.leak_cause
                FROM QMS_CASES c WITH (NOLOCK)
                JOIN QMS_CAR car WITH (NOLOCK) ON c.case_id = car.case_id
                JOIN QMS_NCR n WITH (NOLOCK) ON c.case_id = n.case_id
                WHERE car.access_token = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$token]);
        $caseData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$caseData) {
            $error = "ลิงก์ไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว";
        } elseif (strtotime($caseData['token_expiry']) < time() && empty($caseData['customer_respond_date'])) {
            $error = "ลิงก์นี้หมดอายุแล้ว (Expired) กรุณาติดต่อ QA/QC";
        } else {
            // ดึงรูปภาพ
            $sqlImg = "SELECT file_path FROM QMS_FILE WITH (NOLOCK) WHERE case_id = (SELECT case_id FROM QMS_CAR WHERE access_token=?) AND doc_stage = 'NCR'";
            $stmtImg = $pdo->prepare($sqlImg);
            $stmtImg->execute([$token]);
            $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Exception $e) {
        $error = "System Error: " . $e->getMessage();
    }
}

$isReplied = !empty($caseData['customer_respond_date']);
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
        body { background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, sans-serif; }
        .portal-header { background: #001f3f; color: #fff; padding: 1.5rem 0; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .card { border: none; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); border-radius: 8px; margin-bottom: 1.5rem; }
        .card-header { background-color: #fff; border-bottom: 1px solid #eee; font-weight: bold; padding: 1rem 1.5rem; }
        .form-label { font-size: 0.85rem; font-weight: 600; color: #495057; text-transform: uppercase; }
        .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; font-size: 0.9rem; }
        .readonly-value { font-weight: bold; color: #212529; }
    </style>
</head>
<body>

    <div class="portal-header">
        <div class="container d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-0 fw-bold"><i class="fas fa-shield-alt me-2 text-warning"></i> Customer Quality Portal</h4>
                <div class="small text-white-50">SNC Creativity Anthology Co.,Ltd.</div>
            </div>
            <?php if($caseData): ?>
                <div class="text-end">
                    <span class="badge bg-light text-dark fs-6"><?php echo htmlspecialchars($caseData['car_no']); ?></span>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <div class="container" style="max-width: 900px;">
        
        <?php if ($error): ?>
            <div class="card border-danger text-center py-5">
                <div class="card-body">
                    <i class="fas fa-times-circle fa-4x text-danger mb-3"></i>
                    <h4 class="text-dark fw-bold">ไม่สามารถเข้าถึงข้อมูลได้</h4>
                    <p class="text-muted"><?php echo htmlspecialchars($error); ?></p>
                </div>
            </div>
        <?php else: ?>

            <?php if($isReplied): ?>
                <div class="alert alert-success shadow-sm border-0 d-flex align-items-center mb-4 p-4">
                    <i class="fas fa-check-circle fa-3x me-4"></i>
                    <div>
                        <h5 class="fw-bold mb-1">เอกสารฉบับนี้ได้รับการตอบกลับแล้ว</h5>
                        <div class="small">เมื่อ: <?php echo date('d/m/Y H:i', strtotime($caseData['customer_respond_date'])); ?></div>
                        <div class="small mt-1">หากต้องการแก้ไขข้อมูลเพิ่มเติม กรุณาติดต่อ QA/QC ประจำโรงงาน</div>
                    </div>
                </div>
            <?php endif; ?>

            <div class="card">
                <div class="card-header text-primary"><i class="fas fa-info-circle me-2"></i>รายละเอียดปัญหา (Issue Information)</div>
                <div class="card-body p-4">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="form-label text-muted">Customer Name</div>
                            <div class="readonly-value"><?php echo htmlspecialchars($caseData['customer_name']); ?></div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-label text-muted">Product / Part</div>
                            <div class="readonly-value"><?php echo htmlspecialchars($caseData['product_name']); ?></div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-label text-muted">Defect Type</div>
                            <div class="readonly-value text-danger">
                                <?php echo htmlspecialchars($caseData['defect_type']); ?> 
                                (<?php echo (floor($caseData['defect_qty']) == $caseData['defect_qty']) ? number_format($caseData['defect_qty']) : rtrim(rtrim(number_format($caseData['defect_qty'], 4), '0'), '.'); ?> PCS)
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="form-label text-muted">QC Message / Requirement</div>
                            <div class="info-box bg-primary bg-opacity-10 border-primary text-primary"><?php echo nl2br(htmlspecialchars($caseData['qa_issue_description'])); ?></div>
                        </div>
                        
                        <?php if (!empty($images)): ?>
                        <div class="col-12 mt-4">
                            <div class="form-label text-muted"><i class="fas fa-camera me-1"></i> Evidence Images</div>
                            <div class="row g-2 mt-1">
                                <?php foreach($images as $img): ?>
                                    <div class="col-4 col-md-3">
                                        <a href="../<?php echo $img['file_path']; ?>" target="_blank">
                                            <img src="../<?php echo $img['file_path']; ?>" class="img-fluid rounded border" style="height: 120px; object-fit: cover; width: 100%;">
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
                <div class="card-header text-success"><i class="fas fa-edit me-2"></i>การชี้แจงและแนวทางแก้ไข (Corrective Action Response)</div>
                <div class="card-body p-4">
                    <form id="customerForm">
                        <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                        <input type="hidden" name="action" value="customer_reply">

                        <div class="mb-4">
                            <label class="form-label">1. การแก้ไขปัญหาเบื้องต้น (Containment Action) <span class="text-danger">*</span></label>
                            <textarea class="form-control" name="containment_action" rows="3" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['containment_action'] ?? ''); ?></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="form-label">2. หมวดหมู่สาเหตุหลัก (Root Cause Category) <span class="text-danger">*</span></label>
                            <select class="form-select" name="root_cause_category" required <?php echo $isReplied ? 'disabled' : ''; ?>>
                                <option value="" disabled <?php echo empty($caseData['root_cause_category']) ? 'selected' : ''; ?>>-- เลือกหมวดหมู่ --</option>
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
                            <label class="form-label">3. วิเคราะห์สาเหตุของปัญหา (Root Cause Analysis) <span class="text-danger">*</span></label>
                            <textarea class="form-control" name="root_cause" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['customer_root_cause'] ?? ''); ?></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="form-label">4. สาเหตุที่หลุดรอด (Leak Cause)</label>
                            <textarea class="form-control" name="leak_cause" rows="2" <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['leak_cause'] ?? ''); ?></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="form-label">5. แนวทางการแก้ไขป้องกันระยะยาว (Corrective Action Plan) <span class="text-danger">*</span></label>
                            <textarea class="form-control" name="action_plan" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?>><?php echo htmlspecialchars($caseData['customer_action_plan'] ?? ''); ?></textarea>
                        </div>

                        <?php if(!$isReplied): ?>
                            <hr class="my-4">
                            <div class="d-flex justify-content-end">
                                <button type="submit" class="btn btn-success btn-lg px-5 fw-bold shadow-sm">
                                    <i class="fas fa-paper-plane me-2"></i> Submit Response
                                </button>
                            </div>
                        <?php endif; ?>
                    </form>
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
                title: 'ยืนยันการส่งข้อมูล?',
                text: "หากยืนยันแล้ว ข้อมูลจะถูกส่งไปยัง QA ทันที",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonText: 'ยกเลิก',
                confirmButtonText: 'ยืนยันส่งข้อมูล'
            }).then((result) => {
                if (result.isConfirmed) {
                    const btn = this.querySelector('button[type="submit"]');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';

                    const formData = new FormData(this);

                    fetch('../api/guest_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            Swal.fire('Success', 'ข้อมูลของท่านถูกจัดส่งเรียบร้อยแล้ว', 'success').then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire('Error', res.message, 'error');
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                        }
                    }).catch(err => {
                        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        });
    </script>
</body>
</html>