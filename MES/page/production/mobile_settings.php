<?php 
    include_once("../../auth/check_auth.php");
    $currentUserForJS = $_SESSION['user'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Settings</title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="../components/css/mobile.css?v=<?php echo filemtime(__DIR__ . '/../components/css/mobile.css'); ?>">
</head>
<body>
    <div class="container">
        <h3 class="text-center mb-4">ตั้งค่า</h3>

        <div class="list-group">
            <div class="list-group-item d-flex justify-content-between align-items-center" 
                 id="theme-switcher-btn" title="Toggle Theme" style="cursor: pointer;">
                
                <span>เปลี่ยนธีม (สว่าง/มืด)</span>
                
                <div> 
                    <i class="fas fa-moon" id="theme-icon-moon"></i>
                    <i class="fas fa-sun" id="theme-icon-sun"></i>
                </div>
            </div>
            
            </div>


        <div class="mt-5">
            <a href="../../auth/logout.php" class="btn btn-outline-danger w-100">
                <i class="fas fa-sign-out-alt me-2"></i>
                ออกจากระบบ (<?php echo htmlspecialchars($currentUserForJS['username']); ?>)
            </a>
        </div>
        
    </div>

    <?php include_once('components/mobile_nav.php'); ?>

    <script>
        // (ส่งค่าว่างๆ ไปก่อน ถ้าหน้านี้ไม่ต้องการ API)
        const INVENTORY_API_URL = ''; 
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    </body>
</html>