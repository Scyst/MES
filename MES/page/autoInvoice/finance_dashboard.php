<?php
// MES/page/finance/finance_dashboard.php
require_once __DIR__ . '/../components/init.php';

$pageHeaderTitle = "Invoice Management";
$pageHeaderSubtitle = "ระบบออกบิลและจัดการเวอร์ชันอัตโนมัติ";
$pageIcon = "fas fa-file-invoice-dollar";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/finance_dashboard.css?v=<?php echo filemtime(__DIR__ . '/css/finance_dashboard.css'); ?>">
</head>
<body class="layout-top-header">
    <?php include __DIR__ . '/../components/php/top_header.php'; ?>

    <div id="main-content" class="container-fluid pt-4 px-3 px-md-4 pb-4">
        <div class="row">
            <div class="col-lg-4 mb-3">
                <div class="card shadow-sm h-100">
                    <div class="card-header bg-white border-bottom-0 pt-3">
                        <h5 class="fw-bold text-primary"><i class="fas fa-upload me-2"></i>Import Data</h5>
                    </div>
                    <div class="card-body">
                        <form id="formImport">
                            <div class="mb-3">
                                <label class="form-label text-secondary fw-bold small">Loading Report ID (ถ้ามี)</label>
                                <input type="number" class="form-control" name="report_id" placeholder="Ex: 1045">
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-secondary fw-bold small">เหตุผลการนำเข้า / แก้ไข</label>
                                <input type="text" class="form-control" name="remark" value="อัปโหลดครั้งแรก" required>
                            </div>
                            
                            <div class="mb-4">
                                <label class="form-label text-secondary fw-bold small">CSV File (จาก Excel)</label>
                                <div id="dropZone" class="drop-zone">
                                    <i class="fas fa-cloud-upload-alt fa-3x mb-2"></i>
                                    <h6>ลากไฟล์ CSV มาวางที่นี่</h6>
                                    <p class="small text-muted mb-0">หรือคลิกเพื่อเลือกไฟล์</p>
                                    <input type="file" id="fileInput" name="invoice_file" accept=".csv" class="d-none" required>
                                </div>
                                <div id="fileNameDisplay" class="mt-2 text-success fw-bold text-center small"></div>
                            </div>

                            <button type="submit" class="btn btn-primary w-100 py-2 fw-bold" id="btnSubmit">
                                <span class="spinner-border spinner-border-sm d-none" id="btnSpinner"></span>
                                <span id="btnText">Process Invoice</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-lg-8 mb-3">
                <div class="card shadow-sm h-100">
                    <div class="card-header bg-white border-bottom-0 pt-3 d-flex justify-content-between align-items-center">
                        <h5 class="fw-bold text-dark"><i class="fas fa-history me-2"></i>Version History</h5>
                        <button class="btn btn-sm btn-outline-secondary" onclick="loadHistory()"><i class="fas fa-sync-alt"></i> Refresh</button>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="historyTable">
                                <thead class="table-light text-secondary">
                                    <tr>
                                        <th>Invoice No.</th>
                                        <th class="text-center">Version</th>
                                        <th class="text-end">Total Amount</th>
                                        <th>Remark</th>
                                        <th>Date</th>
                                        <th class="text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="script/finance_dashboard.js?v=<?php echo filemtime(__DIR__ . '/script/finance_dashboard.js'); ?>"></script>
</body>
</html>