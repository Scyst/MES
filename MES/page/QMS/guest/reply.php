<?php
// MES/page/QMS/guest/reply.php

require_once '../../../config/config.php';
require_once '../../db.php';

// 1. รับค่า Token
$token = $_GET['token'] ?? '';
$error = '';
$caseData = null;

if (empty($token)) {
    $error = "Invalid Link (ไม่พบลิงก์เข้าใช้งาน)";
} else {
    try {
        // 2. ตรวจสอบ Token และดึงข้อมูล
        $sql = "SELECT 
                    c.case_id, c.car_no, c.product_name, c.customer_name,
                    n.defect_type, n.defect_qty, n.defect_description,
                    car.qa_issue_description, car.token_expiry, car.customer_respond_date
                FROM " . QMS_CASES_TABLE . " c
                JOIN " . QMS_CAR_TABLE . " car ON c.case_id = car.case_id
                JOIN " . QMS_NCR_TABLE . " n ON c.case_id = n.case_id
                WHERE car.access_token = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$token]);
        $caseData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$caseData) {
            $error = "ลิงก์ไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว";
        } elseif (strtotime($caseData['token_expiry']) < time()) {
            $error = "ลิงก์หมดอายุ (Expired Link) กรุณาติดต่อ SNC เพื่อขอลิงก์ใหม่";
        } elseif (!empty($caseData['customer_respond_date'])) {
            // ถ้าตอบไปแล้ว ให้แสดงหน้าขอบคุณ (หรือจะให้แก้ได้ก็แล้วแต่ logic)
            // ในที่นี้สมมติว่าตอบแล้วจบเลย
            $success_msg = "ขอบคุณครับ! ท่านได้ส่งข้อมูลตอบกลับเรียบร้อยแล้ว";
        }
        
        // 3. ดึงรูปภาพประกอบ (เฉพาะรูป NCR ที่ฝ่ายผลิตถ่ายไว้)
        if ($caseData) {
            $sqlImg = "SELECT file_path FROM " . QMS_FILE_TABLE . " WHERE case_id = ? AND doc_stage = 'NCR'";
            $stmtImg = $pdo->prepare($sqlImg);
            $stmtImg->execute([$caseData['case_id']]);
            $images = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
        }

    } catch (Exception $e) {
        $error = "System Error: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SNC Corrective Action Request</title>
    <style>
        body { background-color: #f4f6f9; font-family: 'Sarabun', sans-serif; }
        .header-bar { background: linear-gradient(135deg, #0d6efd, #0a58ca); color: white; padding: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .card-shadow { box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05); border: none; }
        .img-preview { cursor: pointer; transition: 0.2s; }
        .img-preview:hover { transform: scale(1.02); }
    </style>
</head>
<body>

    <div class="header-bar mb-4">
        <div class="container d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-0 fw-bold"><i class="fas fa-check-double me-2"></i>SNC FORMER</h4>
                <small class="opacity-75">Customer Quality Response Portal</small>
            </div>
            <div class="text-end d-none d-md-block">
                <span class="badge bg-white text-primary">CAR No: <?php echo $caseData['car_no'] ?? '-'; ?></span>
            </div>
        </div>
    </div>

    <div class="container" style="max-width: 800px;">
        
        <?php if ($error): ?>
            <div class="alert alert-danger text-center py-5 shadow-sm rounded-3">
                <i class="fas fa-exclamation-circle fa-4x mb-3 text-danger opacity-50"></i>
                <h3>ไม่สามารถเข้าถึงข้อมูลได้</h3>
                <p class="text-muted"><?php echo $error; ?></p>
            </div>
        <?php elseif (isset($success_msg)): ?>
             <div class="alert alert-success text-center py-5 shadow-sm rounded-3">
                <i class="fas fa-check-circle fa-4x mb-3 text-success opacity-50"></i>
                <h3>บันทึกข้อมูลสำเร็จ</h3>
                <p class="text-muted"><?php echo $success_msg; ?></p>
            </div>
        <?php else: ?>

            <div class="card card-shadow mb-4">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0 text-primary fw-bold">1. รายละเอียดปัญหา (Problem Details)</h5>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="text-muted small">Product / Part Name:</label>
                            <div class="fw-bold"><?php echo htmlspecialchars($caseData['product_name']); ?></div>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">Defect Type:</label>
                            <div class="fw-bold text-danger"><?php echo htmlspecialchars($caseData['defect_type']); ?> (Qty: <?php echo $caseData['defect_qty']; ?>)</div>
                        </div>
                        <div class="col-12">
                            <label class="text-muted small">Note from QA:</label>
                            <div class="alert alert-warning border-0 mb-0">
                                <i class="fas fa-comment-alt me-2"></i>
                                <?php echo nl2br(htmlspecialchars($caseData['qa_issue_description'])); ?>
                            </div>
                        </div>
                    </div>

                    <?php if (!empty($images)): ?>
                        <div class="mt-4">
                            <label class="text-muted small mb-2">Attached Images (รูปภาพประกอบ):</label>
                            <div class="row g-2">
                                <?php foreach ($images as $img): ?>
                                    <?php 
                                        // Path ใน DB: ../uploads/...
                                        // หน้า reply.php อยู่ที่ MES/page/QMS/guest/
                                        // รูปอยู่ที่ MES/page/uploads/
                                        // ดังนั้นต้องถอย ../../uploads/
                                        $displayPath = '../../' . str_replace('../', '', $img['file_path']);
                                    ?>
                                    <div class="col-4 col-md-3">
                                        <a href="<?php echo $displayPath; ?>" target="_blank">
                                            <img src="<?php echo $displayPath; ?>" class="img-fluid rounded border img-preview" style="height: 100px; width: 100%; object-fit: cover;">
                                        </a>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="card card-shadow mb-5 border-primary">
                <div class="card-header bg-primary text-white py-3">
                    <h5 class="mb-0 fw-bold">2. ส่วนตอบกลับ (Your Response)</h5>
                </div>
                <div class="card-body p-4">
                    <form id="customerForm">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                        <input type="hidden" name="action" value="customer_reply">

                        <div class="mb-3">
                            <label class="form-label fw-bold">1. Containment Action (การแก้ไขเบื้องต้น)</label>
                            <textarea class="form-control" name="containment_action" rows="2" placeholder="Immediate action taken..."></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold">2. Root Cause Category (สาเหตุหลัก)</label>
                            <div class="d-flex gap-3 flex-wrap">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="root_cause_category" value="Man"> <label class="form-check-label">Man</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="root_cause_category" value="Machine"> <label class="form-check-label">Machine</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="root_cause_category" value="Material"> <label class="form-check-label">Material</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="root_cause_category" value="Method"> <label class="form-check-label">Method</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="root_cause_category" value="Other"> <label class="form-check-label">Other</label>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold">3. Root Cause Description (รายละเอียดสาเหตุ)</label>
                            <textarea class="form-control" name="root_cause" rows="3" required placeholder="Explain why it happened..."></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold">4. Leak Cause (ทำไมถึงหลุดรอด)</label>
                            <textarea class="form-control" name="leak_cause" rows="2" placeholder="Why defect was not detected..."></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="form-label fw-bold">5. Corrective Action (การแก้ไขระยะยาว)</label>
                            <textarea class="form-control" name="action_plan" rows="3" required placeholder="Permanent fix..."></textarea>
                        </div>

                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary btn-lg shadow-sm">
                                <i class="fas fa-paper-plane me-2"></i> Submit Response (ส่งข้อมูล)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        <?php endif; ?>

        <div class="text-center text-muted small pb-4">
            &copy; <?php echo date('Y'); ?> SNC FORMER. All rights reserved.
        </div>
    </div>

    <script>
        document.getElementById('customerForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!confirm('Are you sure you want to submit this response?')) return;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            const formData = new FormData(this);

            // ยิงไปที่ API กลาง (ถอยกลับไปหา api/guest_action.php)
            fetch('../api/guest_action.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Thank you! Response submitted successfully.');
                    window.location.reload(); // รีโหลดเพื่อแสดงหน้าขอบคุณ
                } else {
                    alert('Error: ' + data.message);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            })
            .catch(err => {
                console.error(err);
                alert('Connection Error');
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
        });
    </script>
</body>
</html>