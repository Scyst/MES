<?php 
    require_once __DIR__ . '/../../auth/check_auth.php';
    if (!hasRole(['admin', 'creator', 'supervisor'])) {
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
    <title>Operator Performance Report</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime('../../style/style.css'); ?>">
</head>

<body class=" p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>
    
    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">Operator Performance Report</h2>
        </div>

        <!-- Filter Controls (MODIFIED) -->
        <div class="row mb-3 align-items-center sticky-bar">
            <div class="col-md-8">
                <div class="d-flex align-items-center gap-2">
                    <label for="startDate" class="form-label mb-0 text-nowrap">Date From:</label>
                    <input type="date" class="form-control" id="startDate" style="width: auto;">
                    <label for="endDate" class="form-label mb-0 text-nowrap">To:</label>
                    <input type="date" class="form-control" id="endDate" style="width: auto;">
                    <!-- NEW: Operator Name Filter -->
                    <input type="text" class="form-control" id="filterOperatorName" placeholder="Search Operator Name..." style="width: 250px;">
                </div>
            </div>
        </div>

        <!-- Report Table -->
        <div class="table-responsive">
            <table class="table  table-striped table-hover">
                <thead>
                    <tr>
                        <th scope="col">Operator Name</th>
                        <th scope="col" class="text-end">Total FG Produced</th>
                        <th scope="col" class="text-end">Total NG Produced</th>
                        <th scope="col" class="text-end">Total Value Produced (THB)</th>
                    </tr>
                </thead>
                <tbody id="reportTableBody">
                    <tr>
                        <td colspan="4" class="text-center">Please select a date range to view the report.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <div id="toast"></div>

    <?php include('../components/autoLogoutUI.php'); ?>
    <?php include('components/performanceDetailModal.php'); ?>

    <script src="../components/theme-switcher.js?v=<?php echo filemtime('../components/inventorySettings.js'); ?>" defer></script>
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/datetime.js?v=<?php echo filemtime('../components/datetime.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="script/performance.js?v=<?php echo filemtime('script/performance.js'); ?>"></script>
</body>
</html>
