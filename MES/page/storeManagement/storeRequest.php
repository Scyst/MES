<?php
require_once __DIR__ . '/../../auth/check_auth.php';
if (!isset($_SESSION['user'])) { header("Location: ../../auth/login_form.php"); exit; }

$userRole = $_SESSION['user']['role'];
$isStore = in_array($userRole, ['admin', 'creator']); 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Store Request & Scrap</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* --- General Styles --- */
        .badge-PENDING { background-color: #ffc107; color: #000; }
        .badge-COMPLETED { background-color: #198754; color: #fff; }
        .badge-REJECTED { background-color: #dc3545; color: #fff; }
        
        /* --- Mobile Card --- */
        .req-card {
            border-left: 5px solid #ccc;
            background-color: #fff;
            margin-bottom: 0.5rem;
            transition: transform 0.1s;
        }
        .req-card:active { transform: scale(0.98); }
        .req-card.status-PENDING { border-left-color: #ffc107; }
        .req-card.status-COMPLETED { border-left-color: #198754; }
        .req-card.status-REJECTED { border-left-color: #dc3545; }

        /* --- Autocomplete --- */
        .autocomplete-results {
            position: absolute; border: 1px solid #d4d4d4; border-top: none; z-index: 2050; 
            top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto;
            background-color: #fff; display: none;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .autocomplete-item {
            padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;
        }
        .autocomplete-item:hover { background-color: #f8f9fa; }

        /* --- FAB Button (Green Add Button Only) --- */
        @media (max-width: 991.98px) {
            .fab-container {
                position: fixed;
                bottom: 25px;
                right: 25px;
                z-index: 1060;
            }
            .fab-btn {
                border: none;
                border-radius: 50%;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: transform 0.2s;
                cursor: pointer;
            }
            .fab-btn:active { transform: scale(0.9); }
            
            #fab-add-btn {
                width: 60px; height: 60px; font-size: 1.5rem; background-color: #198754;
            }
        }
    </style>
</head>
<body class="page-with-table">
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>

    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Store Request Center</h2>
                    
                    <button class="btn btn-outline-secondary d-lg-none rounded-circle shadow-sm" 
                            style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"
                            type="button" 
                            id="mobile-filter-toggle-btn"> 
                        <i class="fas fa-filter"></i>
                    </button>
                </div>

                <ul class="nav nav-tabs">
                    <li class="nav-item">
                        <button class="nav-link active" type="button">
                            <i class="fas fa-history me-1"></i> ประวัติรายการ (Request History)
                        </button>
                    </li>
                </ul>
            </div>

            <div class="sticky-bar">
                <div class="container-fluid">
                    <div class="all-filters-container" id="mobileFilters">
                        <div class="row my-2 align-items-center">
                            <div class="col-lg-8">
                                <div class="filter-controls-wrapper d-flex gap-2 flex-wrap">
                                    <input type="text" id="filterSearch" class="form-control" placeholder="Search Part No, SAP..." style="max-width: 300px;">
                                    <select id="filterStatus" class="form-select" style="max-width: 180px;" onchange="loadRequests()">
                                        <option value="ALL">Status: All</option>
                                        <option value="PENDING">Status: Pending</option>
                                        <option value="COMPLETED">Status: Completed</option>
                                        <option value="REJECTED">Status: Rejected</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="col-lg-4 text-lg-end mt-2 mt-lg-0 d-none d-lg-block">
                                <button class="btn btn-success" onclick="openRequestModal()">
                                    <i class="fas fa-plus-circle me-2"></i> แจ้งของเสีย / เบิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fab-container d-lg-none">
                <button class="fab-btn" id="fab-add-btn" onclick="openRequestModal()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>

            <div class="content-wrapper">
                <div class="container-fluid">
                    <div class="table-responsive mt-2 d-none d-md-block">
                        <table class="table table-striped table-hover align-middle">
                            <thead>
                                <tr>
                                    <th style="width: 12%">Date</th>
                                    <th style="width: 12%">SAP No.</th>
                                    <th style="width: 15%">Part No.</th>
                                    <th style="width: 20%">Description</th>
                                    <th class="text-end" style="width: 8%">Qty</th>
                                    <th style="width: 15%">Reason</th>
                                    <th class="text-center" style="width: 8%">Status</th>
                                    <th class="text-center" style="width: 10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="reqTableBody"></tbody>
                        </table>
                    </div>
                    <div class="d-md-none mt-2" id="reqCardContainer"></div>
                </div>
            </div>

            <?php include 'components/requestModal.php'; ?>

            <div id="toast"></div>
        </main>    
    </div>

    <?php include_once('../components/php/mobile_menu.php'); ?>

    <script>
        const API_URL = 'api/scrapManage.php'; 
        const IS_STORE_ROLE = <?php echo json_encode($isStore); ?>;
    </script>
    <script src="script/storeRequest.js?v=<?php echo time(); ?>"></script>
</body>
</html>