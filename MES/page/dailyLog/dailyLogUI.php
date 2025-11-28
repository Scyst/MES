<?php
// MES/page/dailyLog/dailyLogUI.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../auth/check_auth.php';

$pageTitle = "SNC ONE WAY - MES Portal";
$userId = $_SESSION['user']['id'];
$userRole = $_SESSION['user']['role'];
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <title><?php echo $pageTitle; ?></title>
    <style>
        /* === GLOBAL LAYOUT === */
        body.dashboard-page { 
            background-color: #f8f9fa;
            overflow: hidden; /* ยังคง concept ไม่ให้ scroll ทั้งหน้า */
            font-size: 16px; /* ขยาย Base Font */
        }

        #main-content {
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 0;
        }

        /* Header Style */
        .portal-header {
            height: 70px; /* เพิ่มความสูง Header */
            background-color: #fff;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            flex-shrink: 0;
        }

        /* Grid Layout */
        .portal-container {
            display: grid;
            grid-template-columns: 40% 60%;
            height: calc(100vh - 70px); /* ลบความสูง Header ใหม่ */
            background-color: #fff;
            border-top: 1px solid #e5e7eb;
        }

        .portal-col {
            overflow-y: auto;
            border-right: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            /* เพิ่ม Padding ให้เนื้อหาหายใจสะดวก */
            padding: 1.5rem; 
        }
        .portal-col:last-child { border-right: none; background-color: #f9fafb; } /* ขวาเป็นสีเทาอ่อน */

        /* Section Styling */
        .section-header {
            font-size: 1rem; /* ใหญ่ขึ้น */
            font-weight: 700;
            color: #374151;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #f3f4f6;
        }

        /* === LEFT PANE COMPONENTS === */
        
        /* 1. Welcome Box */
        .welcome-box { margin-bottom: 1rem; }
        .welcome-box h1 { font-size: 1.75rem; font-weight: 800; color: #111827; margin-bottom: 0.5rem; }
        .welcome-info { font-size: 1rem; color: #6b7280; }

        /* 2. Pulse Cards (Bigger) */
        .pulse-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem; /* เพิ่มช่องว่าง */
            margin-bottom: 1rem;
        }
        .pulse-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.25rem 0.5rem; /* เพิ่ม Padding แนวตั้ง */
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .pulse-card:hover { 
            border-color: var(--bs-primary); 
            transform: translateY(-3px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
        }
        .pulse-card .card-icon { font-size: 2rem; margin-bottom: 0.5rem; display: block; }
        .pulse-card .card-label { font-size: 0.95rem; font-weight: 600; color: #4b5563; margin-bottom: 0.5rem; }
        .pulse-card .card-status { font-size: 0.8rem; color: #9ca3af; }
        
        .pulse-card.done { background-color: #f0fdf4; border-color: #86efac; }
        .pulse-card.done .card-status { color: #15803d; font-weight: 600; }
        .pulse-card.pending { border-style: dashed; border-width: 2px; }

        /* 3. Calendar (Bigger & Clearer) */
        .calendar-wrapper { margin-top: 0; } /* ดันลงล่าง */
        .snc-calendar {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
        }
        .snc-cal-head {
            background-color: #f3f4f6;
            font-size: 0.85rem; /* ใหญ่ขึ้น */
            font-weight: 600;
            text-align: center;
            padding: 8px 0;
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            color: #4b5563;
        }
        .snc-cal-day {
            height: 65px; /* สูงขึ้นชัดเจน (จาก 45px) */
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            padding: 4px;
            position: relative;
            cursor: pointer;
            transition: 0.1s;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
        }
        .snc-cal-day span { font-size: 0.9rem; font-weight: 500; color: #374151; }
        .snc-cal-day:hover { background-color: #eff6ff; }
        .snc-cal-day.today { background-color: #eff6ff; box-shadow: inset 0 0 0 2px var(--bs-primary); }
        .snc-cal-day.today span { color: var(--bs-primary); font-weight: 700; }
        .snc-cal-day.empty { background-color: #f9fafb; cursor: default; }
        
        .cal-dots { 
            display: flex; gap: 3px; margin-top: auto; margin-bottom: 6px;
        }
        .c-dot { width: 8px; height: 8px; border-radius: 50%; background: #e5e7eb; } /* จุดใหญ่ขึ้น */
        .c-dot.done { background: #10b981; }

        /* === RIGHT PANE COMPONENTS === */
        
        .service-group { margin-bottom: 2rem; }
        .service-group-title {
            font-size: 0.85rem; font-weight: 700; color: #9ca3af; 
            text-transform: uppercase; letter-spacing: 0.05em;
            margin-bottom: 1rem; padding-left: 0.5rem;
            border-left: 3px solid #d1d5db;
        }
        
        .service-grid {
            display: grid;
            /* ปรับให้ Column กว้างขึ้น อย่างน้อย 220px */
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
            gap: 1rem;
        }
        
        .service-item {
            display: flex; align-items: center; gap: 1rem;
            padding: 1rem; /* เพิ่ม Padding */
            background-color: #fff;
            border: 1px solid #e5e7eb; border-radius: 10px;
            text-decoration: none; color: #1f2937; 
            transition: all 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .service-item:hover { 
            border-color: var(--bs-primary); 
            transform: translateY(-2px); 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
        }
        
        .service-icon {
            width: 48px; height: 48px; flex-shrink: 0; /* ไอคอนใหญ่ขึ้น */
            background-color: #f3f4f6; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem; color: #6b7280; transition: 0.2s;
        }
        .service-item:hover .service-icon { background-color: #dbeafe; color: var(--bs-primary); }
        
        .service-text h4 { font-size: 1rem; font-weight: 600; margin: 0 0 2px 0; color: #111827; }
        .service-text p { font-size: 0.85rem; color: #6b7280; margin: 0; }

        /* Responsive */
        @media (max-width: 992px) { 
            .portal-container { grid-template-columns: 1fr; height: auto; display: block; } 
            .portal-col { border-right: none; height: auto; overflow: visible; } 
            body.dashboard-page { overflow: auto; } 
        }
        
        /* Modal Style */
        .emoji-select-wrapper { display: flex; justify-content: center; gap: 15px; margin: 20px 0; }
        .emoji-option { font-size: 3rem; cursor: pointer; opacity: 0.4; filter: grayscale(1); transition: 0.2s; } /* Emoji ใหญ่บึ้ม */
        .emoji-option:hover, .emoji-option.active { opacity: 1; transform: scale(1.2); filter: grayscale(0); }
    </style>
</head>
<body class="dashboard-page">
    <?php include __DIR__ . '/../components/php/nav_dropdown.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <div id="main-content">
        <div class="portal-header">
            <div class="d-flex align-items-center gap-3">
                <div style="width: 45px; height: 45px; background: #eee; border-radius: 8px; display: grid; place-items: center; font-weight: bold; color: #888; font-size: 0.8rem;">LOGO</div>
                <div class="d-flex flex-column" style="line-height: 1.2;">
                    <span class="fw-bold text-dark" style="font-size: 1.1rem;">MES TOOLBOX</span>
                    <span class="text-muted" style="font-size: 0.85rem;">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)</span>
                </div>
            </div>
            <div class="d-none d-md-flex align-items-center gap-2">
                <span class="text-muted small me-3"><i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?></span>
                <a href="../../auth/logout.php" class="btn btn-light text-danger fw-bold px-3"><i class="fas fa-sign-out-alt me-2"></i>Logout</a>
            </div>
        </div>

        <div class="portal-container">
            
            <div class="portal-col">
                
                <div class="welcome-box">
                    <h1>สวัสดี, <?php echo htmlspecialchars($_SESSION['user']['fullname'] ?? $_SESSION['user']['username']); ?> 👋</h1>
                    
                    <div class="welcome-info mt-2">
                        <span class="badge bg-light text-secondary border me-1 fw-normal">
                            <i class="fas fa-id-badge me-1"></i> 
                            <?php echo htmlspecialchars($_SESSION['user']['emp_id'] ?? '-'); ?>
                        </span>

                        <span class="badge bg-light text-secondary border me-1 fw-normal">
                            <i class="fas fa-industry me-1"></i> 
                            Line: <?php echo htmlspecialchars($_SESSION['user']['line'] ?? '-'); ?>
                        </span>

                        <span class="badge bg-primary bg-opacity-10 text-primary border">
                            <?php echo htmlspecialchars($_SESSION['user']['position'] ?? $_SESSION['user']['role']); ?>
                        </span>
                    </div>
                </div>

                <button id="btnOpenAdminDash" class="btn w-100 mb-4 d-none shadow-sm" style="background: linear-gradient(to right, #667eea, #764ba2); color: white; border: none; padding: 12px; border-radius: 10px;" onclick="adminDashboardModal.show()">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="fas fa-chart-pie me-2"></i> ภาพรวมทีมงาน (Dashboard)</span>
                        <i class="fas fa-chevron-right opacity-50"></i>
                    </div>
                </button>

                <div class="section-header"><i class="fas fa-heartbeat text-danger"></i> DAILY PULSE (บันทึกประจำวัน)</div>
                <div id="todayCardsContainer" class="pulse-grid">
                    <div class="text-center w-100 py-4 text-muted col-span-3"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
                </div>

                <div class="calendar-wrapper">
                    <div class="section-header d-flex justify-content-between border-0 pb-2">
                        <span><i class="far fa-calendar-alt"></i> ปฏิทินงาน (<?php echo date('M Y'); ?>)</span>
                    </div>
                    
                    <div class="snc-calendar">
                        <div class="snc-cal-head text-danger">อา</div>
                        <div class="snc-cal-head">จ</div>
                        <div class="snc-cal-head">อ</div>
                        <div class="snc-cal-head">พ</div>
                        <div class="snc-cal-head">พฤ</div>
                        <div class="snc-cal-head">ศ</div>
                        <div class="snc-cal-head text-primary">ส</div>
                        
                        <div id="calendarGrid" style="display: contents;"></div>
                    </div>
                </div>
            </div>

            <div class="portal-col">
                <div class="section-header">เว็บไซต์บริการ (Service Desk)</div>
                
                <div class="service-group">
                    <div class="service-group-title">OPERATIONS (ฝ่ายผลิต)</div>
                    <div class="service-grid">
                        <a href="../production/productionUI.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-boxes"></i></div>
                            <div class="service-text"><h4>Production Entry</h4><p>บันทึกผลผลิตประจำวัน</p></div>
                        </a>
                        <a href="../production/mobile_entry.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-mobile-alt"></i></div>
                            <div class="service-text"><h4>Mobile Entry</h4><p>ลงยอดผ่านมือถือ (QR)</p></div>
                        </a>
                        <a href="../Stop_Cause/Stop_Cause.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-ban"></i></div>
                            <div class="service-text"><h4>Stop Causes</h4><p>บันทึกเครื่องจักรหยุด</p></div>
                        </a>
                        <?php if (in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
                        <a href="../storeManagement/storeRequest.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-dolly-flatbed"></i></div>
                            <div class="service-text"><h4>Store Request</h4><p>เบิก/คืน วัตถุดิบ</p></div>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title">MONITORING (ติดตามผล)</div>
                    <div class="service-grid">
                        <a href="../OEE_Dashboard/OEE_Dashboard.php" class="service-item">
                            <div class="service-icon text-primary bg-primary bg-opacity-10"><i class="fas fa-chart-line"></i></div>
                            <div class="service-text"><h4>OEE Dashboard</h4><p>ประสิทธิภาพเครื่องจักร</p></div>
                        </a>
                        <?php if (in_array($userRole, ['admin', 'creator'])): ?>
                        <a href="../management/managementDashboard.php" class="service-item">
                            <div class="service-icon text-success bg-success bg-opacity-10"><i class="fas fa-tachometer-alt"></i></div>
                            <div class="service-text"><h4>Management</h4><p>แดชบอร์ดผู้บริหาร</p></div>
                        </a>
                        <?php endif; ?>
                        <a href="../documentCenter/documentCenterUI.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-folder-open"></i></div>
                            <div class="service-text"><h4>Document Center</h4><p>คู่มือและเอกสาร</p></div>
                        </a>
                    </div>
                </div>

                <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
                <div class="service-group">
                    <div class="service-group-title">SYSTEM TOOLS (ผู้ดูแล)</div>
                    <div class="service-grid">
                        <a href="../inventorySettings/inventorySettings.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-cogs"></i></div>
                            <div class="service-text"><h4>System Settings</h4><p>ตั้งค่าระบบ/Inventory</p></div>
                        </a>
                        <?php if (in_array($userRole, ['admin', 'creator'])): ?>
                        <a href="../production/print_location_qr.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-qrcode"></i></div>
                            <div class="service-text"><h4>QR Printer</h4><p>พิมพ์ Location Tag</p></div>
                        </a>
                        <a href="../maintenanceStock/maintenanceStockUI.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-tools"></i></div>
                            <div class="service-text"><h4>MT Stock</h4><p>คลังอะไหล่ซ่อมบำรุง</p></div>
                        </a>
                        <a href="../userManage/userManageUI.php" class="service-item">
                            <div class="service-icon"><i class="fas fa-users-cog"></i></div>
                            <div class="service-text"><h4>User Manager</h4><p>จัดการผู้ใช้งาน</p></div>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </div>
    </div>

    <?php include __DIR__ . '/components/logModals.php'; ?>
    <?php include __DIR__ . '/components/avgMoodModal.php'; ?>

    <script src="script/dailyLog.js?v=<?php echo time(); ?>"></script>
</body>
</html>