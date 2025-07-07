<?php 
    include_once("../../auth/check_auth.php"); 
    
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>BOM Manager</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>

    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <h2 class="mb-4">Bill of Materials (BOM) Manager</h2>
        <div class="row">
            <div class="col-lg-4">
                <div class="card bg-secondary p-3">
                    <div class="mb-3">
                        <label for="fgPartNoSelect" class="form-label">เลือกสินค้าสำเร็จรูป (FG Part No.)</label>
                        <input list="partNoList" id="fgPartNoSelect" class="form-control" placeholder="Select or type FG Part No...">
                        <datalist id="partNoList"></datalist>
                    </div>
                    <hr>
                    <h5>Add New Component</h5>
                    <form id="addComponentForm">
                        <input type="hidden" id="selectedFgPartNo" name="fg_part_no">
                        <div class="mb-3">
                            <label for="componentPartNo" class="form-label">ชิ้นส่วนประกอบ (Component Part No.)</label>
                            <input list="partNoList" id="componentPartNo" name="component_part_no" class="form-control" placeholder="Select or type component..." required>
                        </div>
                        <div class="mb-3">
                            <label for="quantityRequired" class="form-label">จำนวนที่ต้องใช้ (Qty Required)</label>
                            <input type="number" id="quantityRequired" name="quantity_required" class="form-control" min="1" required>
                        </div>
                        <div class="text-end">
                            <button type="submit" class="btn btn-success">Add Component</button>
                        </div>
                    </form>
                </div>
            </div>
            <div class="col-lg-8">
                <h4 id="bom-header">Please select a Finished Good to see its BOM</h4>
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Component Part No.</th>
                                <th>Quantity Required</th>
                                <th style="width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="bomTableBody">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div id="toast"></div>
    <script src="../components/auto_logout.js"></script>
    <script src="../components/datetime.js"></script>
    <script src="../components/toast.js"></script>
    <script src="script/bomManager.js"></script>
</body>
</html>