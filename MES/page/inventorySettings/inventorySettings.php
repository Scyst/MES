<?php 
    require_once __DIR__ . '/../../auth/check_auth.php'; 
    // กำหนดสิทธิ์การเข้าถึงสำหรับหน้านี้โดยเฉพาะ
    if (!hasRole(['admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>Inventory Settings</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime('../../style/style.css'); ?>">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>
    
    <div class="container-fluid">
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
        </ul>

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
        </div>
    </div>
    
    <div id="toast"></div>

    <?php include('components/locationModal.php'); ?>
    <?php include('components/transferModal.php'); ?>
    <?php include('../components/autoLogoutUI.php'); ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
    </script>
    
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="../components/pagination.js?v=<?php echo filemtime('../components/pagination.js'); ?>"></script>
    <script src="script/inventorySettings.js?v=<?php echo filemtime('script/inventorySettings.js'); ?>"></script>
</body>
</html>