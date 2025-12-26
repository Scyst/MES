<?php
// MES/page/components/php/top_header.php

if (function_exists('renderDevBanner')) { 
    renderDevBanner(); 
} 

// ฟังก์ชันแสดงวันที่ไทย (ถ้ายังไม่มีไฟล์ Helper กลาง ก็ใส่ไว้ตรงนี้ก่อนได้ครับ)
if (!function_exists('getThaiDateHeader')) {
    function getThaiDateHeader() {
        $thai_months = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน', 5 => 'พฤษภาคม', 6 => 'มิถุนายน',
            7 => 'กรกฎาคม', 8 => 'สิงหาคม', 9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
        ];
        $day = date('j');
        $month = $thai_months[(int)date('n')];
        $year = date('Y') + 543;
        return "$day $month $year";
    }
}

// กำหนดค่า Default หากหน้าไหนลืมประกาศตัวแปรมา
$headerIcon = isset($pageIcon) ? $pageIcon : 'fas fa-cube'; // ไอคอนเริ่มต้น
$headerTitle = isset($pageHeaderTitle) ? $pageHeaderTitle : 'MES System'; // ชื่อระบบเริ่มต้น
$headerSubtitle = isset($pageHeaderSubtitle) ? $pageHeaderSubtitle : 'Manufacturing Execution System'; // คำอธิบายเริ่มต้น
$helpModalId = isset($pageHelpId) ? $pageHelpId : ''; // ID ของ Modal คู่มือ (ถ้ามี)
?>

<header class="portal-top-header">
    
    <div class="d-flex align-items-center gap-3">
        <button class="btn btn-link text-secondary d-xl-none p-0 me-2" id="sidebar-toggle-mobile-top">
            <i class="fas fa-bars fa-lg"></i>
        </button>

        <div class="header-logo-box bg-primary bg-opacity-10 text-primary">
            <i class="<?php echo $headerIcon; ?> fa-lg"></i>
        </div>
        
        <div class="d-flex flex-column justify-content-center">
            <h5 class="fw-bold mb-0 text-body" style="line-height: 1.2;">
                <?php echo $headerTitle; ?>
            </h5>
            <small class="text-muted" style="font-size: 0.75rem;">
                <?php echo $headerSubtitle; ?>
            </small>
        </div>
    </div>

    <div class="d-flex align-items-center gap-2">
        
        <?php if($helpModalId): ?>
        <button class="btn btn-link text-secondary p-0 me-3" 
                onclick="new bootstrap.Modal(document.getElementById('<?php echo $helpModalId; ?>')).show()" 
                title="คู่มือการใช้งาน">
            <i class="far fa-question-circle fa-lg"></i>
        </button>
        <?php endif; ?>

        <span class="d-none d-lg-inline text-muted small me-3">
            <i class="far fa-clock me-1"></i> <?php echo getThaiDateHeader(); ?>
        </span>

        <?php 
            // ใช้ __DIR__ เพื่อให้อ้างอิง path ได้ถูกต้องเสมอไม่ว่าจะ include มาจากไหน
            include_once __DIR__ . '/nav_dropdown.php'; 
        ?>
    </div>
</header>