<?php
// page/QMS/index.php
require_once '../../config/config.php';
require_once '../../auth/check_auth.php';

$pageTitle = "ระบบจัดการคุณภาพ (iQMS)";
$pageHeaderTitle = "Integrated Quality Management System";
$pageHeaderSubtitle = "ระบบแจ้งปัญหาคุณภาพและบริหารจัดการ CAR/Claim";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* CSS เฉพาะกิจ */
        .status-badge { font-size: 0.85rem; padding: 0.4em 0.8em; }
        .table-hover tbody tr { cursor: pointer; transition: 0.2s; }
    </style>
</head>
<body class="layout-top-header">
    <?php include_once '../components/php/top_header.php'; ?>
    <?php include_once '../components/php/mobile_menu.php'; ?>

    <div class="page-container">
        <div id="main-content">
            <div class="dashboard-header-sticky">
                <div class="d-flex justify-content-between align-items-center gap-2">
                    <div class="d-flex gap-2 flex-grow-1" style="max-width: 500px;">
                        <input type="text" id="searchInput" class="form-control" placeholder="🔍 ค้นหา CAR No, ลูกค้า, สินค้า...">
                    </div>
                    <div>
                        <button class="btn btn-danger shadow-sm" onclick="openNCRModal()">
                            <i class="fas fa-exclamation-circle me-1"></i> แจ้งปัญหา (New NCR)
                        </button>
                    </div>
                </div>
            </div>

            <div class="content-wrapper p-3">
                <div class="row g-3 mb-4">
                    <div class="col-6 col-md-3">
                        <div class="card border-0 shadow-sm bg-danger text-white">
                            <div class="card-body">
                                <h6 class="card-title text-white-50">รอ QC ตรวจสอบ (NCR)</h6>
                                <h2 class="mb-0 fw-bold" id="stat-ncr">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="card border-0 shadow-sm bg-warning text-dark">
                            <div class="card-body">
                                <h6 class="card-title text-black-50">รอลูกค้าตอบ (CAR)</h6>
                                <h2 class="mb-0 fw-bold" id="stat-car">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="card border-0 shadow-sm bg-info text-white">
                            <div class="card-body">
                                <h6 class="card-title text-white-50">รอปิดจบ (Claim)</h6>
                                <h2 class="mb-0 fw-bold" id="stat-claim">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="card border-0 shadow-sm bg-success text-white">
                            <div class="card-body">
                                <h6 class="card-title text-white-50">ปิดงานแล้ว (Closed)</h6>
                                <h2 class="mb-0 fw-bold" id="stat-closed">0</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="table-responsive" style="min-height: 400px;">
                        <table class="table table-hover align-middle mb-0" id="caseTable">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>Case No. (CAR)</th>
                                    <th>วันที่แจ้ง</th>
                                    <th>ลูกค้า / สินค้า</th>
                                    <th>ปัญหา (Defect)</th>
                                    <th>สถานะล่าสุด</th>
                                    <th>ผู้รับผิดชอบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="text-center py-5 text-muted">กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <?php include_once './components/ncrFormModal.php'; ?>
    <?php include_once './components/caseDetailOffcanvas.php'; ?>

    <script src="./script/qms_core.js"></script>
</body>
</html>