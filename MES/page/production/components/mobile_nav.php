<?php
    // Logic นี้จะตรวจสอบว่าเรากำลังอยู่ที่หน้าไหน เพื่อทำให้แท็บนั้น 'active'
    $current_script = basename($_SERVER['SCRIPT_NAME']);
    
    $current_type = $_GET['type'] ?? 'production'; 

    $is_in_active = ($current_script == 'mobile_entry.php' && $current_type == 'receipt');
    $is_out_active = ($current_script == 'mobile_entry.php' && $current_type == 'production');
    $is_review_active = ($current_script == 'mobile_review.php');
    // ⭐️ เพิ่มตัวแปรสำหรับหน้าตั้งค่า ⭐️
    $is_settings_active = ($current_script == 'mobile_settings.php');
?>
<nav class="mobile-nav four-items">
    <a href="mobile_entry.php?type=receipt" class="mobile-nav-item <?php echo $is_in_active ? 'active' : ''; ?>">
        <i class="fas fa-download"></i>
        <span>รับของเข้า (IN)</span>
    </a>
    <a href="mobile_entry.php?type=production" class="mobile-nav-item <?php echo $is_out_active ? 'active' : ''; ?>">
        <i class="fas fa-upload"></i>
        <span>บันทึกออก (OUT)</span>
    </a>
    <a href="mobile_review.php" class="mobile-nav-item <?php echo $is_review_active ? 'active' : ''; ?>">
        <i class="fas fa-history"></i>
        <span>ตรวจสอบ</span>
    </a>
    <a href="mobile_settings.php" class="mobile-nav-item <?php echo $is_settings_active ? 'active' : ''; ?>">
        <i class="fas fa-user-cog"></i>
        <span>ตั้งค่า</span>
    </a>
</nav>