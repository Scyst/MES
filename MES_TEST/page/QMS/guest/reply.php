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
            
            // 5. เช็คสถานะการล็อกฟอร์ม
            if (!empty($caseData['customer_respond_date']) && $caseData['current_status'] !== 'SENT_TO_CUSTOMER') {
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
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../../utils/libs/fontawesome/css/all.min.css">
    <style>
        /* =======================================================
           MODERN CUSTOMER PORTAL UI
           ======================================================= */
        :root {
            --primary-color: #0d6efd;
            --bg-color: #f4f7f6; /* สีเทาอ่อนอมฟ้า สบายตา */
            --card-radius: 16px;
        }
        body { 
            background-color: var(--bg-color); 
            font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; 
            color: #334155;
        }

        /* การ์ดแบบ Modern (ขอบมน เงาฟุ้ง) */
        .card { 
            border: none; 
            box-shadow: 0 8px 24px rgba(149, 157, 165, 0.1); 
            border-radius: var(--card-radius); 
            margin-bottom: 1.5rem; 
            overflow: hidden; 
        }
        .card-header { 
            background-color: #ffffff; 
            border-bottom: 2px solid #f1f5f9; 
            font-weight: 700; 
            padding: 1.25rem 1.5rem; 
            font-size: 1.1rem;
        }
        .card-body { padding: 1.5rem; }

        /* ปรับแต่ง Form Inputs ให้เต็มนิ้วบนมือถือ */
        .form-label { 
            font-size: 0.9rem; 
            font-weight: 600; 
            color: #475569; 
            margin-bottom: 0.5rem;
        }
        .form-control, .form-select {
            padding: 0.75rem 1rem; /* ขยายความสูงให้กดง่าย */
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            font-size: 1rem;
            transition: all 0.2s ease;
        }
        .form-control:focus, .form-select:focus {
            background-color: #ffffff;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
        }
        /* สถานะตอนช่องถูกล็อก (Readonly) */
        .form-control[readonly] {
            background-color: #f1f5f9;
            color: #0f172a;
            border-color: transparent;
            font-weight: 500;
        }

        /* ข้อมูลฝั่งซ้าย (Issue Info) */
        .readonly-value { 
            font-weight: 700; 
            color: #1e293b; 
            font-size: 1.1rem; 
            padding: 0.5rem 0;
            border-bottom: 1px dashed #e2e8f0;
        }
        .info-box { 
            background: #eff6ff; 
            border: 1px solid #bfdbfe; 
            border-radius: 10px; 
            padding: 1rem; 
            font-size: 0.95rem; 
            color: #1d4ed8;
        }

        /* รูปภาพอัจฉริยะ (สี่เหลี่ยมจัตุรัส) */
        .evidence-img-box {
            aspect-ratio: 1 / 1;
            overflow: hidden;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            display: block;
        }
        .evidence-img-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s;
        }
        .evidence-img-box:hover img { transform: scale(1.05); }

        /* ลิสต์งานที่ค้าง (Sidebar) */
        .pending-item { 
            display: block; 
            text-decoration: none; 
            color: inherit; 
            padding: 1rem 1.5rem; 
            border-bottom: 1px solid #f1f5f9; 
            transition: background 0.2s; 
        }
        .pending-item:hover { background-color: #f8fafc; }
        .pending-item:last-child { border-bottom: none; }

        @media (min-width: 992px) {
            .card-body { padding: 2rem; }
        }
    </style>
</head>
<body>
    <header class="bg-white border-bottom shadow-sm py-2 px-3 sticky-top mb-4">
        <div class="container-fluid px-0 px-xl-4 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
                <div class="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style="width: 45px; height: 45px;">
                    <i class="fas fa-handshake fa-lg"></i>
                </div>
                <div class="d-flex flex-column justify-content-center">
                    <h5 class="fw-bold mb-0 text-dark" style="line-height: 1.2;">
                        Customer Quality Portal
                    </h5>
                    <small class="text-muted" style="font-size: 0.75rem;">
                        SNC Creativity Anthology Co.,Ltd.
                    </small>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="d-none d-md-inline text-muted small me-2">
                    <i class="far fa-clock me-1"></i> <?php echo date('d M Y'); ?>
                </span>
                <?php if($caseData): ?>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill shadow-sm">
                        <i class="fas fa-building text-primary me-1"></i> <?php echo htmlspecialchars($caseData['customer_name']); ?>
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <div class="container-fluid px-3 px-xl-5">
        <?php if ($error): ?>
            <div class="card border-danger text-center py-5 mx-auto" style="max-width: 600px;">
                <div class="card-body">
                    <i class="fas fa-exclamation-triangle fa-4x text-danger mb-3 opacity-75"></i>
                    <h4 class="text-dark fw-bold">Cannot Access Data<br><small class="text-muted fs-6">(ไม่สามารถเข้าถึงข้อมูลได้)</small></h4>
                    <p class="text-muted mt-3 bg-light p-3 rounded"><?php echo htmlspecialchars($error); ?></p>
                </div>
            </div>
        <?php else: ?>

            <div class="mb-4 bg-white p-3 p-md-4 rounded-4 shadow-sm border border-secondary border-opacity-10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style="width: 56px; height: 56px;">
                        <i class="fas fa-file-invoice fa-xl"></i>
                    </div>
                    <div>
                        <div class="text-muted small fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">Corrective Action Request</div>
                        <h3 class="fw-bold text-dark mb-0" style="letter-spacing: -0.5px;"><?php echo htmlspecialchars($caseData['car_no']); ?></h3>
                    </div>
                </div>
                <div>
                    <?php if(!$isReplied): ?>
                        <div class="badge bg-warning bg-opacity-25 text-dark px-4 py-2 rounded-pill shadow-sm fs-6 border border-warning border-opacity-50 d-inline-flex align-items-center gap-2">
                            <span class="spinner-grow text-warning" role="status" aria-hidden="true" style="width: 12px; height: 12px; animation-duration: 1.5s;"></span>
                            <span class="fw-bold">Waiting for Response</span>
                        </div>
                    <?php else: ?>
                        <div class="badge bg-success bg-opacity-10 text-success px-4 py-2 rounded-pill shadow-sm fs-6 border border-success border-opacity-50 d-inline-flex align-items-center gap-2">
                            <i class="fas fa-check-circle"></i>
                            <span class="fw-bold">Response Submitted</span>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="mb-4">
                <?php if($isReplied && !$isWaitingContainer): ?>
                    <div class="alert alert-success shadow-sm border-0 d-flex align-items-center mb-0 p-4 rounded-4" style="background-color: #ecfdf5;">
                        <i class="fas fa-check-circle fa-3x me-4 text-success"></i>
                        <div>
                            <h5 class="fw-bold mb-1 text-success">This CAR has been fully replied <span class="fs-6 fw-normal text-muted">(เอกสาร CAR นี้ตอบกลับสมบูรณ์แล้ว)</span></h5>
                            <div class="small text-secondary fw-bold">Replied on (ตอบเมื่อ): <?php echo date('d M Y, H:i', strtotime($caseData['customer_respond_date'])); ?></div>
                        </div>
                    </div>
                <?php elseif($isWaitingContainer): ?>
                    <div class="alert alert-info shadow-sm border-0 d-flex align-items-center mb-0 p-4 rounded-4" style="background-color: #eff6ff;">
                        <i class="fas fa-shipping-fast fa-3x me-4 text-primary"></i>
                        <div>
                            <h5 class="fw-bold mb-1 text-primary">Waiting for Container/Tracking No. <span class="fs-6 fw-normal text-muted">(รอการระบุหมายเลขตู้ขนส่ง)</span></h5>
                            <div class="small text-secondary">You have already submitted the root cause analysis. Please provide the container/tracking number when ready to ship.<br>(ท่านได้ตอบกลับข้อมูลวิเคราะห์ปัญหาแล้ว กรุณาระบุหมายเลขตู้ส่งคืนหากพร้อมส่ง)</div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>

            <div class="row g-4 align-items-stretch">
                <div class="col-lg-8 d-flex flex-column gap-4">
                    
                    <div class="card mb-0">
                        <div class="card-header text-primary border-bottom border-primary border-opacity-25">
                            <i class="fas fa-info-circle me-2"></i> Issue Information (รายละเอียดปัญหา)
                        </div>
                        <div class="card-body">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <div class="form-label text-muted text-uppercase mb-1"><i class="fas fa-cube me-1"></i> Product / Part</div>
                                    <div class="readonly-value"><?php echo htmlspecialchars($caseData['product_name']); ?></div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-label text-muted text-uppercase mb-1"><i class="fas fa-exclamation-triangle me-1"></i> Defect Type & Qty</div>
                                    <div class="readonly-value text-danger">
                                        <?php echo htmlspecialchars($caseData['defect_type']); ?> 
                                        <span class="badge bg-danger ms-2"><?php echo (floor($caseData['defect_qty']) == $caseData['defect_qty']) ? number_format($caseData['defect_qty']) : rtrim(rtrim(number_format($caseData['defect_qty'], 4), '0'), '.'); ?> PCS</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-label text-muted text-uppercase mb-1"><i class="fas fa-comment-dots me-1"></i> QC Message / Requirement</div>
                                    <div class="info-box fw-bold shadow-sm"><?php echo nl2br(htmlspecialchars($caseData['qa_issue_description'])); ?></div>
                                </div>
                                <?php if (!empty($images)): ?>
                                <div class="col-12 mt-4 pt-3 border-top">
                                    <div class="form-label text-muted mb-3"><i class="fas fa-camera me-1"></i> Evidence Images (รูปภาพหลักฐาน)</div>
                                    <div class="row g-3">
                                        <?php foreach($images as $img): ?>
                                            <div class="col-6 col-sm-4 col-md-3">
                                                <a href="../../../<?php echo $img['file_path']; ?>" target="_blank" class="evidence-img-box shadow-sm">
                                                    <img src="../../../<?php echo $img['file_path']; ?>" alt="Evidence">
                                                </a>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <div class="card mb-0 shadow-lg flex-grow-1" style="border: 1px solid #e2e8f0;">
                        <div class="card-header text-success border-bottom border-success border-opacity-25 bg-success bg-opacity-10">
                            <i class="fas fa-edit me-2"></i> Corrective Action Response (การชี้แจงและแนวทางแก้ไข)
                        </div>
                        <div class="card-body">
                            <form id="customerForm" class="h-100 d-flex flex-column">
                                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                                <input type="hidden" name="action" value="<?php echo ($isWaitingContainer) ? 'customer_update_container' : 'customer_reply'; ?>">

                                <div class="mb-4">
                                    <label class="form-label">1. Containment Action (การแก้ไขปัญหาเบื้องต้น) <span class="text-danger">*</span></label>
                                    <textarea class="form-control" name="containment_action" rows="3" required <?php echo $isReplied ? 'readonly' : ''; ?> placeholder="What have you done immediately to stop the problem?"><?php echo htmlspecialchars($caseData['containment_action'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">2. Root Cause Category (หมวดหมู่สาเหตุหลัก) <span class="text-danger">*</span></label>
                                    <select class="form-select fw-bold text-primary" name="root_cause_category" required <?php echo $isReplied ? 'disabled' : ''; ?>>
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
                                    <textarea class="form-control" name="root_cause" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?> placeholder="Why did the problem occur?"><?php echo htmlspecialchars($caseData['customer_root_cause'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label">4. Leak Cause (สาเหตุที่หลุดรอด)</label>
                                    <textarea class="form-control" name="leak_cause" rows="2" <?php echo $isReplied ? 'readonly' : ''; ?> placeholder="Why didn't your QC catch this defect?"><?php echo htmlspecialchars($caseData['leak_cause'] ?? ''); ?></textarea>
                                </div>

                                <div class="mb-5">
                                    <label class="form-label">5. Corrective Action Plan (แนวทางการแก้ไขป้องกันระยะยาว) <span class="text-danger">*</span></label>
                                    <textarea class="form-control border-success" name="action_plan" rows="4" required <?php echo $isReplied ? 'readonly' : ''; ?> placeholder="How will you prevent this from happening again?"><?php echo htmlspecialchars($caseData['customer_action_plan'] ?? ''); ?></textarea>
                                </div>

                                <div class="p-4 bg-light border border-secondary border-opacity-25 rounded-4 shadow-sm mt-auto">
                                    <h6 class="fw-bold text-primary mb-3"><i class="fas fa-truck-loading me-2"></i> 6. Return Shipment (ข้อมูลการส่งคืนสินค้า)</h6>
                                    <?php if(!$isReplied): ?>
                                    <div class="alert alert-secondary py-2 small mb-3 border-0 bg-white shadow-sm">
                                        <i class="fas fa-lightbulb text-warning me-1"></i> You can save the analysis data (Items 1-5) first, and return to provide the tracking number later.<br>(สามารถบันทึกข้อมูลวิเคราะห์ก่อน และกลับมาระบุเลขตู้ภายหลังได้)
                                    </div>
                                    <?php endif; ?>
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label text-dark">Container / Tracking No. <span class="text-muted fw-normal">(หมายเลขตู้)</span></label>
                                            <input type="text" class="form-control form-control-lg fs-6" name="return_container_no" placeholder='e.g., TLLU1234567 or "NO RETURN"' <?php echo $isClosed ? 'readonly' : ''; ?> value="<?php echo htmlspecialchars($caseData['return_container_no'] ?? ''); ?>">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label text-dark">Expected Return Qty <span class="text-muted fw-normal">(จำนวนที่ส่งคืน)</span></label>
                                            <input type="number" class="form-control form-control-lg fs-6 fw-bold text-danger" name="expected_return_qty" step="0.01" min="0" placeholder="0" <?php echo $isClosed ? 'readonly' : ''; ?> value="<?php echo htmlspecialchars($caseData['expected_return_qty'] ?? ''); ?>">
                                        </div>
                                    </div>
                                </div>

                                <?php if(!$isReplied || $isWaitingContainer): ?>
                                    <hr class="my-4 text-muted">
                                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                        <button type="submit" class="btn <?php echo $isWaitingContainer ? 'btn-primary' : 'btn-success'; ?> btn-lg px-5 fw-bold shadow rounded-pill">
                                            <i class="fas fa-paper-plane me-2"></i> <?php echo $isWaitingContainer ? 'Update Container Info' : 'Submit Response'; ?>
                                        </button>
                                    </div>
                                <?php endif; ?>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card h-100 mb-0">
                        <div class="card-header bg-white text-dark d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-tasks me-2 text-warning"></i> Pending Tasks</span>
                            <span class="badge bg-danger rounded-pill shadow-sm"><?php echo count($otherPending); ?></span>
                        </div>
                        <div class="card-body p-0 overflow-auto" style="max-height: calc(100vh - 150px);"> 
                            <?php if(empty($otherPending)): ?>
                                <div class="text-center text-muted py-5">
                                    <i class="fas fa-glass-cheers fa-3x mb-3 text-success opacity-50"></i>
                                    <h6 class="fw-bold text-dark">Great! No pending tasks.<br><small class="text-muted fw-normal">(ยอดเยี่ยม! ไม่มีงานค้างแล้ว)</small></h6>
                                </div>
                            <?php else: ?>
                                <?php foreach($otherPending as $p): ?>
                                    <?php $isPendingContainer = ($p['current_status'] === 'CUSTOMER_REPLIED' && empty(trim($p['return_container_no'] ?? ''))); ?>
                                    <a href="?token=<?php echo $p['access_token']; ?>" class="pending-item">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="fw-bold text-primary"><?php echo htmlspecialchars($p['car_no']); ?></span>
                                            <?php if($isPendingContainer): ?>
                                                <span class="badge bg-info text-dark shadow-sm">Wait Container</span>
                                            <?php else: ?>
                                                <span class="badge bg-warning text-dark shadow-sm">Need Reply</span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="small fw-bold text-dark text-truncate"><i class="fas fa-cube me-1 text-muted"></i> <?php echo htmlspecialchars($p['product_name']); ?></div>
                                        <div class="small text-danger mt-1"><i class="fas fa-exclamation-circle me-1"></i> <?php echo htmlspecialchars($p['defect_type']); ?></div>
                                    </a>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

            </div>
        <?php endif; ?>
        
        <div class="text-center text-muted small mt-4 mb-5 pb-3">
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
                cancelButtonColor: '#6c757d',
                cancelButtonText: 'Cancel',
                confirmButtonText: 'Yes, Submit it!'
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
                            Swal.fire('Success!', 'Data saved successfully.', 'success').then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire('Error', res.message, 'error');
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                        }
                    }).catch(err => {
                        Swal.fire('Error', 'Cannot connect to the server.', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        });
    </script>
</body>
</html>