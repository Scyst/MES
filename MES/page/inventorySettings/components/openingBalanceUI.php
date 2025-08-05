<?php 
    require_once __DIR__ . '/../../../auth/check_auth.php';
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
    <title>Opening Balance</title>
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
        </div>

        <div class="row mb-3">
            <div class="col-md-4">
                <label for="locationSelect" class="form-label">Select Location to Adjust:</label>
                <select id="locationSelect" class="form-select"></select>
            </div>
            <div class="col-md-5">
                 <label for="itemSearch" class="form-label">Search Item (SAP No. / Part No. / Description):</label>
                <input type="text" id="itemSearch" class="form-control" placeholder="Search to filter list..." disabled>
            </div>
             <div class="col-md-3 align-self-end">
                <button class="btn btn-primary w-100" id="saveStockBtn" disabled><i class="fas fa-save"></i> Save All Changes</button>
            </div>
        </div>

        <div class="table-responsive" style="max-height: 65vh;">
            <table class="table table-dark table-striped table-hover table-sm">
                <thead class="sticky-top">
                    <tr>
                        <th style="width: 15%;">SAP No.</th>
                        <th style="width: 15%;">Part No.</th>
                        <th>Part Description</th>
                        <th style="width: 15%;" class="text-center">Current On-Hand</th>
                        <th style="width: 15%;" class="text-center">New Physical Count</th>
                    </tr>
                </thead>
                <tbody id="stockTakeTableBody">
                   <tr><td colspan="5" class="text-center">Please select a location to begin.</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <div id="toast"></div>

    <?php include('../components/autoLogoutUI.php'); ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
    </script>
    
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="script/openingBalance.js?v=<?php echo filemtime('script/openingBalance.js'); ?>"></script>
</body>
</html>