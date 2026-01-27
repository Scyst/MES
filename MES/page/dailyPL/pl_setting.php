<?php
// page/pl_daily/pl_setting.php
require_once __DIR__ . '/../components/init.php';

// Check Permissions
if (!hasRole(['admin', 'creator'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

// Set Header Variables for top_header.php
$pageTitle = "P&L Structure Setup";
$pageIcon = "fas fa-sitemap"; 
$pageHeaderTitle = "P&L Master Data";
$pageHeaderSubtitle = "จัดการผังบัญชีและแหล่งที่มาข้อมูล";

$v = filemtime(__DIR__ . '/script/pl_setting.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* Table Styling */
        .table-custom thead th {
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.5px;
        }
        
        /* Parent Row Style (Section Header) */
        .row-section td {
            background-color: #eef2f7 !important;
            font-weight: 700;
            color: #2c3e50;
            border-top: 2px solid #fff;
        }
        
        /* Child Row Indentation & Connector */
        .row-item td:first-child {
            padding-left: 2.5rem !important; 
            position: relative;
        }
        
        /* L-shape connector line */
        .row-item td:first-child::before {
            content: '';
            position: absolute;
            left: 1.2rem;
            top: -15px;
            height: 35px; /* Adjust height to connect nicely */
            width: 12px;
            border-left: 2px solid #cbd3da;
            border-bottom: 2px solid #cbd3da;
            border-bottom-left-radius: 5px;
            opacity: 0.6;
        }

        /* Hover Effect */
        .table-hover tbody tr:hover td {
            background-color: #fff9e6 !important;
            transition: background-color 0.2s ease;
        }

        /* Action Buttons */
        .action-btn {
            width: 32px; height: 32px;
            padding: 0;
            display: inline-flex;
            align-items: center; justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .action-btn:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body class="layout-top-header">
    
    <?php include_once '../components/php/top_header.php'; ?>

    <div id="main-content">
        <div class="container-fluid py-4">
            
            <div class="card border-0 shadow-sm mb-4 rounded-3">
                <div class="card-body py-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <h6 class="fw-bold text-primary mb-0"><i class="fas fa-list-alt me-2"></i>Account List</h6>
                        <span class="text-muted small">รายการทั้งหมดในระบบ</span>
                    </div>
                    
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="openModal()">
                        <i class="fas fa-plus me-2"></i>Add New Item
                    </button>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table mb-0 align-middle table-custom table-hover">
                            <thead>
                                <tr>
                                    <th style="width: 40%; padding-left: 1.5rem;">Account Name</th>
                                    <th style="width: 15%; text-center">Code</th>
                                    <th style="width: 10%; text-center">Type</th>
                                    <th style="width: 15%; text-center">Source</th>
                                    <th style="width: 10%; text-center">Order</th>
                                    <th style="width: 10%; text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="masterTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="modal fade" id="plItemModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-header border-0 bg-light rounded-top-4">
                    <h5 class="modal-title fw-bold text-primary" id="modalTitle">
                        <i class="fas fa-edit me-2"></i>Manage Item
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <form id="plItemForm">
                        <input type="hidden" name="action" value="save">
                        <input type="hidden" name="id" id="itemId">

                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">Account Code</label>
                                <input type="text" class="form-control" name="account_code" id="accountCode" placeholder="e.g. 4001" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">Display Order</label>
                                <input type="number" class="form-control" name="row_order" id="rowOrder" value="10">
                            </div>
                            
                            <div class="col-12">
                                <label class="form-label small fw-bold text-muted">Item Name (TH/EN)</label>
                                <input type="text" class="form-control" name="item_name" id="itemName" placeholder="e.g. ค่าไฟฟ้า (Electricity)" required>
                            </div>

                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">Category Type</label>
                                <select class="form-select" name="item_type" id="itemType" required>
                                    <option value="REVENUE">Revenue (รายได้)</option>
                                    <option value="COGS">COGS (ต้นทุนขาย)</option>
                                    <option value="EXPENSE">Expense (ค่าใช้จ่าย)</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-muted">Parent Group</label>
                                <select class="form-select" name="parent_id" id="parentId">
                                    <option value="">-- Main Header --</option>
                                    </select>
                            </div>

                            <div class="col-12">
                                <label class="form-label small fw-bold text-muted">Data Source Configuration</label>
                                <div class="list-group">
                                    <label class="list-group-item d-flex gap-3">
                                        <input class="form-check-input flex-shrink-0" type="radio" name="data_source" id="srcSection" value="SECTION">
                                        <span>
                                            <strong>Header Section</strong>
                                            <small class="d-block text-muted">Just a title, no value input.</small>
                                        </span>
                                    </label>
                                    <label class="list-group-item d-flex gap-3">
                                        <input class="form-check-input flex-shrink-0" type="radio" name="data_source" id="srcManual" value="MANUAL" checked>
                                        <span>
                                            <strong>Manual Input</strong>
                                            <small class="d-block text-muted">User types value daily.</small>
                                        </span>
                                    </label>
                                    <label class="list-group-item d-flex gap-3">
                                        <input class="form-check-input flex-shrink-0" type="radio" name="data_source" id="srcAutoStock" value="AUTO_STOCK">
                                        <span>
                                            <strong>Auto: Production</strong>
                                            <small class="d-block text-muted">Calculated from FG Output x Price.</small>
                                        </span>
                                    </label>
                                    <label class="list-group-item d-flex gap-3">
                                        <input class="form-check-input flex-shrink-0" type="radio" name="data_source" id="srcAutoLabor" value="AUTO_LABOR">
                                        <span>
                                            <strong>Auto: Manpower</strong>
                                            <small class="d-block text-muted">Synced from HR/Gate system.</small>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer border-0 bg-light rounded-bottom-4">
                    <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary rounded-pill px-4" onclick="saveItem()">
                        <i class="fas fa-save me-2"></i>Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/pl_setting.js?v=<?php echo $v; ?>"></script>
</body>
</html>