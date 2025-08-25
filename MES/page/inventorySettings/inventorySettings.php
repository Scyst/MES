<?php 
    require_once __DIR__ . '/../../auth/check_auth.php';
    if (!hasRole(['admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
    $canManage = hasRole(['admin', 'creator']);
    $currentUser = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Inventory Settings</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
    
            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Inventory Settings</h2>
                </div>

                <ul class="nav nav-tabs" id="settingsTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="locations-tab" data-bs-toggle="tab" data-bs-target="#locations-pane" type="button" role="tab">Location Manager</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="transfer-tab" data-bs-toggle="tab" data-bs-target="#transfer-pane" type="button" role="tab">Stock Transfer</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="opening-balance-tab" data-bs-toggle="tab" data-bs-target="#opening-balance-pane" type="button" role="tab">Opening Balance</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="item-master-tab" data-bs-toggle="tab" data-bs-target="#item-master-pane" type="button" role="tab">Item Master</button>
                    </li>
                </ul>
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="settingsTabContent">
                    <div class="tab-pane fade show active" id="locations-pane" role="tabpanel">
                        <?php include('components/locationsUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="transfer-pane" role="tabpanel">
                        <?php include('components/stockTransferUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="opening-balance-pane" role="tabpanel">
                        <?php include('components/openingBalanceUI.php'); ?>
                    </div>
                    <div class="tab-pane fade" id="item-master-pane" role="tabpanel">
                        <?php include('components/itemMasterUI.php'); ?>
                    </div>
                </div>
            </div>
            
            <div id="toast"></div>

            <?php include('components/locationModal.php'); ?>
            <?php include('components/transferModal.php'); ?>
            <?php include('components/itemModal.php');?>
            <?php include('../components/php/autoLogoutUI.php'); ?>

            <script>
                const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
            </script>
            
            <script src="../components/js/auto_logout.js?v=<?php echo filemtime('../components/js/auto_logout.js'); ?>"></script>
            <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
            <script src="script/inventorySettings.js?v=<?php echo filemtime('script/inventorySettings.js'); ?>"></script>
        </main>
    </div>
</body>
</html>