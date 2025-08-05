<?php 
    require_once __DIR__ . '/../../auth/check_auth.php'; 
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
    <title>Location Manager</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime('../../style/style.css'); ?>">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>
    
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">Location Manager</h2>
            <button class="btn btn-success" id="addLocationBtn"><i class="fas fa-plus"></i> Add New Location</button>
        </div>

        <div class="table-responsive">
            <table class="table table-dark table-striped table-hover">
                <thead>
                    <tr>
                        <th>Location Name</th>
                        <th>Description</th>
                        <th class="text-center">Status</th>
                    </tr>
                </thead>
                <tbody id="locationsTableBody">
                    </tbody>
            </table>
        </div>
    </div>
    
    <div id="toast"></div>

    <?php include('components/locationModal.php'); ?>
    <?php include('../components/autoLogoutUI.php'); ?>

    <script>
        const currentUser = <?php echo json_encode($_SESSION['user']); ?>;
    </script>
    
    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="script/locations.js?v=<?php echo filemtime('script/locations.js'); ?>"></script>
</body>
</html>