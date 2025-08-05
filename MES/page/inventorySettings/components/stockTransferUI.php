<?php 
    require_once __DIR__ . '/../../../auth/check_auth.php';
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
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
    <title>Stock Transfer</title>
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
            <button class="btn btn-success" id="addTransferBtn"><i class="fas fa-plus"></i> New Transfer</button>
        </div>

        <div class="row g-2 mb-3">
            <div class="col-md">
                <input type="text" class="form-control" id="filterPartNo" placeholder="Filter by Part No...">
            </div>
            <div class="col-md">
                <input type="text" class="form-control" id="filterFromLocation" placeholder="Filter by From Location...">
            </div>
            <div class="col-md">
                <input type="text" class="form-control" id="filterToLocation" placeholder="Filter by To Location...">
            </div>
            <div class="col-md">
                <input type="date" class="form-control" id="filterStartDate">
            </div>
            <div class="col-md">
                <input type="date" class="form-control" id="filterEndDate">
            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-dark table-striped table-hover">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Part No.</th>
                        <th>Part Description</th>
                        <th class="text-end">Quantity</th>
                        <th>From Location</th>
                        <th>To Location</th>
                        <th>Created By</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody id="transferTableBody"></tbody>
            </table>
        </div>
        <nav>
            <ul class="pagination justify-content-center" id="paginationControls"></ul>
        </nav>
    </div>
    
    <div id="toast"></div>

    <?php include('components/transferModal.php'); ?>
    <?php include('../components/autoLogoutUI.php'); ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
    </script>
    
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="../components/pagination.js?v=<?php echo filemtime('../components/pagination.js'); ?>"></script>
    <script src="script/stockTransfer.js?v=<?php echo filemtime('script/stockTransfer.js'); ?>"></script>
</body>
</html>