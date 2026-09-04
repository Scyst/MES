<?php
require_once __DIR__ . '/../components/init.php';

$pageTitle          = __('profile.title');
$pageHeaderTitle    = __('profile.title');
$pageHeaderSubtitle = 'จัดการข้อมูลส่วนตัวและความปลอดภัย';
$pageIcon           = 'fas fa-user-circle';
$pageBackLink       = '../dailyLog/dailyLogUI.php';

$currentUserId = (int)$_SESSION['user']['id'];
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?= $pageTitle ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* ═══════════════════════════════════════════════════════════
           PROFILE PAGE — Enterprise Design System
           Tokens, Layout, Components
        ═══════════════════════════════════════════════════════════ */

        /* ── Design Tokens ── */
        :root {
            --pro-radius-sm  : 6px;
            --pro-radius-md  : 10px;
            --pro-radius-lg  : 16px;
            --pro-shadow-sm  : 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
            --pro-shadow-md  : 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
            --pro-shadow-card: 0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.06);
            --pro-border     : 1px solid var(--bs-border-color);
            --pro-section-gap: 2rem;
        }

        /* ── Page Layout ── */
        .profile-content-grid {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 1.5rem;
            align-items: start;
        }
        @media (max-width: 900px) {
            .profile-content-grid { grid-template-columns: 1fr; }
            .avatar-card { position: static !important; top: auto !important; }
        }

        /* ── Skeleton Loader ── */
        @keyframes shimmer {
            0%   { background-position: -800px 0; }
            100% { background-position:  800px 0; }
        }
        .skeleton {
            background: #eef0f3;
            background-image: linear-gradient(90deg, #eef0f3 0px, #e2e5ea 40px, #eef0f3 80px);
            background-size: 800px 100%;
            animation: shimmer 1.6s infinite linear;
            color: transparent !important;
            border-radius: var(--pro-radius-sm);
            pointer-events: none;
            user-select: none;
        }
        [data-bs-theme="dark"] .skeleton {
            background: #2a2d33;
            background-image: linear-gradient(90deg, #2a2d33 0px, #35393f 40px, #2a2d33 80px);
        }

        /* ── Cards ── */
        .pro-card {
            background: var(--bs-body-bg);
            border: var(--pro-border);
            border-radius: var(--pro-radius-lg);
            box-shadow: var(--pro-shadow-card);
            min-width: 0;
        }

        /* ── Sidebar Avatar Card ── */
        .avatar-card {
            position: sticky;
            top: 1.5rem;
        }
        .avatar-wrapper {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
            cursor: pointer;
            border-radius: 50%;
            transition: transform 0.2s ease;
        }
        .avatar-wrapper:hover { transform: scale(1.04); }
        .avatar-img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--bs-border-color);
            transition: filter 0.2s;
        }
        .avatar-wrapper:hover .avatar-img { filter: brightness(0.65); }
        .avatar-overlay {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(0,0,0,.45);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            color: #fff;
            font-size: 0.7rem;
            gap: 3px;
        }
        .avatar-wrapper:hover .avatar-overlay { opacity: 1; }
        .avatar-placeholder {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: var(--bs-secondary-bg);
            border: 3px solid var(--bs-border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: var(--bs-secondary);
        }

        /* Sidebar meta rows */
        .sidebar-meta-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.55rem 0;
            border-bottom: 1px solid var(--bs-border-color-translucent);
            font-size: 0.8125rem;
        }
        .sidebar-meta-row:last-child { border-bottom: none; }
        .sidebar-meta-label {
            color: var(--bs-secondary-color);
            display: flex;
            align-items: center;
            gap: 0.45rem;
            flex-shrink: 0;
        }
        .sidebar-meta-value {
            font-weight: 600;
            color: var(--bs-body-color);
            text-align: right;
            word-break: break-word;
        }

        /* ── Tab Navigation ── */
        .pro-tab-nav {
            display: flex;
            gap: 2px;
            padding: 0.6rem 1rem;
            border-bottom: var(--pro-border);
            background: var(--bs-tertiary-bg);
            border-radius: var(--pro-radius-lg) var(--pro-radius-lg) 0 0;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
        }
        .pro-tab-nav::-webkit-scrollbar {
            display: none;
        }
        .pro-tab-btn {
            border: none;
            background: transparent;
            padding: 0.45rem 1rem;
            border-radius: var(--pro-radius-sm);
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--bs-secondary-color);
            transition: all 0.15s ease;
            white-space: nowrap;
            flex-shrink: 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .pro-tab-btn:hover {
            background: var(--bs-secondary-bg);
            color: var(--bs-body-color);
        }
        .pro-tab-btn.active {
            background: var(--bs-primary);
            color: #fff;
            box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.35);
        }

        /* ── Section Headers ── */
        .pro-section-header {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            padding-bottom: 0.6rem;
            margin-bottom: 1.25rem;
            border-bottom: 2px solid var(--bs-border-color);
            font-size: 0.875rem;
            font-weight: 700;
            letter-spacing: 0.01em;
        }
        .pro-section-header .section-tag {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--bs-secondary-color);
            background: var(--bs-secondary-bg);
            padding: 0.15rem 0.5rem;
            border-radius: 20px;
            border: var(--pro-border);
            white-space: nowrap;
        }
        .pro-section-header.danger {
            border-bottom-color: rgba(var(--bs-danger-rgb), 0.4);
            color: var(--bs-danger);
        }
        .pro-section-header.danger .section-tag {
            color: var(--bs-danger);
            background: rgba(var(--bs-danger-rgb), 0.08);
            border-color: rgba(var(--bs-danger-rgb), 0.25);
        }

        /* ── Form Controls ── */
        .pro-field-group { margin-bottom: 0; }
        .pro-field-group label.form-label {
            font-size: 0.775rem;
            font-weight: 600;
            color: var(--bs-secondary-color);
            margin-bottom: 0.35rem;
            display: block;
            letter-spacing: 0.015em;
        }
        .pro-field-group .form-control,
        .pro-field-group .form-select {
            font-size: 0.875rem;
            border-radius: var(--pro-radius-sm);
            border-color: var(--bs-border-color);
            box-shadow: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pro-field-group .form-control:focus,
        .pro-field-group .form-select:focus {
            border-color: rgba(var(--bs-primary-rgb), 0.6);
            box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.12);
        }
        .pro-field-group .form-control[readonly],
        .pro-field-group .form-control.read-only-display {
            background: var(--bs-tertiary-bg);
            color: var(--bs-secondary-color);
            cursor: default;
        }

        /* ── Info Notice Banner ── */
        .pro-notice {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            padding: 0.65rem 0.9rem;
            border-radius: var(--pro-radius-sm);
            background: var(--bs-tertiary-bg);
            border: var(--pro-border);
            font-size: 0.78rem;
            color: var(--bs-secondary-color);
            margin-bottom: 1.25rem;
            line-height: 1.5;
        }
        .pro-notice .notice-icon { flex-shrink: 0; margin-top: 1px; }

        /* ── Role Badge ── */
        .role-badge {
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            padding: 0.3em 0.75em;
            border-radius: 20px;
        }

        /* ── Password strength bar ── */
        .pwd-strength-bar {
            height: 4px;
            border-radius: 2px;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── Activity Timeline ── */
        .activity-timeline {
            border-left: 2px solid var(--bs-border-color);
            margin-left: 0.75rem;
            padding-left: 1.25rem;
            position: relative;
        }
        .activity-item {
            position: relative;
            margin-bottom: 1.25rem;
        }
        .activity-item::before {
            content: '';
            position: absolute;
            left: -1.65rem;
            top: 0.3rem;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--bs-primary);
            border: 2px solid var(--bs-body-bg);
        }
    </style>
</head>
<body class="layout-top-header">

<?php include_once('../components/php/top_header.php'); ?>

<main id="main-content">
    <div class="container-fluid py-4">

    <div class="profile-content-grid">

        <!-- ══════════ LEFT: Avatar Card ══════════ -->
        <div class="pro-card avatar-card p-4 text-center">
            <div class="avatar-wrapper mb-3" id="avatarTrigger" title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์">
                <img id="profileAvatarImg" src="" alt="รูปโปรไฟล์"
                     class="avatar-img d-none"
                     onerror="this.classList.add('d-none'); document.getElementById('profileAvatarPlaceholder').classList.remove('d-none');">
                <div id="profileAvatarPlaceholder" class="avatar-placeholder skeleton">
                    <i class="fas fa-user"></i>
                </div>
                <div class="avatar-overlay">
                    <i class="fas fa-camera"></i>
                    <span>เปลี่ยนรูป</span>
                </div>
            </div>

            <!-- Upload Progress -->
            <div id="avatarUploadProgress" class="mb-2" style="display: none;">
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" style="width: 100%"></div>
                </div>
                <small class="text-muted mt-1 d-block">กำลังอัปโหลด...</small>
            </div>

            <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/webp" class="d-none">

            <h5 class="fw-bold mb-0 skeleton" id="profileFullname" style="min-height: 24px;">—</h5>
            <div><span class="badge bg-primary role-badge mt-2 skeleton" id="profileRoleBadge" style="min-height: 18px;">—</span></div>
            <p class="text-muted small mb-3" id="sideRole"><?= htmlspecialchars($userRole) ?></p>

            <hr class="text-muted opacity-25">

            <!-- Performance Widget -->
            <div class="p-3 mb-3 rounded border text-start" id="sidebarPerformanceCard" style="background-color: var(--bs-tertiary-bg);">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small fw-bold text-muted"><i class="fas fa-star text-warning me-1"></i>เกรดประเมิน</span>
                    <span class="badge bg-secondary" id="sidebarGradeDisplay">รอประเมิน</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small text-secondary">ค่าผลงาน</span>
                    <span class="small fw-bold text-primary" id="sidebarIncomeDisplay">฿0.00</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small text-secondary">Ratio</span>
                    <span class="small fw-bold text-success" id="sidebarRatioDisplay">0.00</span>
                </div>
            </div>

            <div class="text-start mt-3">
                <div class="sidebar-meta-row">
                    <span class="sidebar-meta-label"><i class="fas fa-user-tag"></i> Username</span>
                    <span class="sidebar-meta-value skeleton" id="sideUsername">—</span>
                </div>
                <div class="sidebar-meta-row">
                    <span class="sidebar-meta-label"><i class="fas fa-id-badge"></i> รหัสพนักงาน</span>
                    <span class="sidebar-meta-value skeleton" id="sideEmpId">—</span>
                </div>
                <div class="sidebar-meta-row">
                    <span class="sidebar-meta-label"><i class="fas fa-users"></i> ทีม</span>
                    <span class="sidebar-meta-value skeleton" id="sideTeam">—</span>
                </div>
                <div class="sidebar-meta-row">
                    <span class="sidebar-meta-label"><i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบล่าสุด</span>
                    <span class="sidebar-meta-value skeleton" id="sideLastLogin">—</span>
                </div>
                <div class="sidebar-meta-row">
                    <span class="sidebar-meta-label"><i class="fas fa-key"></i> เปลี่ยน Password</span>
                    <span class="sidebar-meta-value skeleton" id="sidePwdChanged">—</span>
                </div>
            </div>
        </div>

        <!-- ══════════ RIGHT: Info + Forms ══════════ -->
        <div class="pro-card">
            <!-- Tab Nav -->
            <div class="pro-tab-nav">
                <button class="pro-tab-btn active" data-section="info">
                    <i class="fas fa-id-card"></i><?= __('profile.tab_info'); ?>
                </button>
                <button class="pro-tab-btn" data-section="security">
                    <i class="fas fa-lock"></i><?= __('profile.tab_security'); ?>
                </button>
                <button class="pro-tab-btn" data-section="activity">
                    <i class="fas fa-history"></i><?= __('profile.tab_activity'); ?>
                </button>
                <button class="pro-tab-btn" data-section="preferences">
                    <i class="fas fa-sliders-h"></i><?= __('profile.tab_preferences'); ?>
                </button>
            </div>

            <div class="card-body p-3 p-md-4">

                <!-- ─── Section: ข้อมูลส่วนตัว ─── -->
                <div id="section-info">
                    <form id="profileInfoForm">
                        
                        <!-- 1. ข้อมูลพื้นฐาน -->
                        <div class="mb-4">
                            <div class="pro-section-header mb-3">
                                <i class="fas fa-user-circle text-primary"></i>
                                <span>ข้อมูลพื้นฐาน <span class="d-none d-md-inline text-muted fw-normal" style="font-size:0.75rem;">(Basic Info)</span></span>
                            </div>

                            <div class="row g-3">
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">ชื่อ-นามสกุล <i class="fas fa-info-circle text-secondary ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ข้อมูลส่วนนี้อ้างอิงจากระบบ HR หากต้องการแก้ไข โปรดแจ้งหัวหน้างานหรือ Admin"></i></label>
                                    <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldFullname" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                                </div>
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">ตำแหน่งงาน <i class="fas fa-info-circle text-secondary ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ข้อมูลส่วนนี้อ้างอิงจากระบบ HR หากต้องการแก้ไข โปรดแจ้งหัวหน้างานหรือ Admin"></i></label>
                                    <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldPosition" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                                </div>
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">สาย / Line <i class="fas fa-info-circle text-secondary ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ข้อมูลส่วนนี้อ้างอิงจากระบบ HR หากต้องการแก้ไข โปรดแจ้งหัวหน้างานหรือ Admin"></i></label>
                                    <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldLine" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                                </div>
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">แผนก <i class="fas fa-info-circle text-secondary ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ข้อมูลส่วนนี้อ้างอิงจากระบบ HR หากต้องการแก้ไข โปรดแจ้งหัวหน้างานหรือ Admin"></i></label>
                                    <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldDept" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">วันเกิด</label>
                                    <input type="date" class="form-control" id="fieldDOB" name="date_of_birth">
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">สถานภาพสมรส</label>
                                    <select class="form-select" id="fieldMarital" name="marital_status">
                                        <option value="">-- เลือกสถานภาพ --</option>
                                        <option value="โสด">โสด (Single)</option>
                                        <option value="สมรส">สมรส (Married)</option>
                                        <option value="หย่าร้าง">หย่าร้าง (Divorced)</option>
                                        <option value="หม้าย">หม้าย (Widowed)</option>
                                    </select>
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">จำนวนบุตร (คน)</label>
                                    <input type="number" class="form-control" id="fieldChildren" name="children_count" min="0" placeholder="0">
                                </div>
                                <div class="col-12 pro-field-group">
                                    <label class="form-label">คำแนะนำตัว (ไม่บังคับ)</label>
                                    <div class="position-relative">
                                        <textarea class="form-control" id="fieldBio" name="bio" rows="3"
                                                  placeholder="แนะนำตัวคุณสั้นๆ..." maxlength="500"
                                                  style="padding-bottom: 1.6rem;"></textarea>
                                        <small class="text-muted position-absolute" style="bottom: 0.4rem; right: 0.6rem; font-size: 0.7rem; pointer-events: none; line-height:1;">
                                            <span id="bioCharCount">0</span>/500
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- สวัสดิการและอุปกรณ์ -->
                        <div class="mb-4">
                            <div class="pro-section-header">
                                <i class="fas fa-tshirt text-primary"></i>
                                <span>สวัสดิการและอุปกรณ์ <span class="d-none d-md-inline text-muted fw-normal" style="font-size:0.75rem;">(Welfare &amp; Equipment)</span></span>
                                <span class="section-tag">ระบุตามความสมัครใจ</span>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">ขนาดเสื้อยูนิฟอร์ม (Shirt Size)</label>
                                    <select class="form-select" id="fieldShirt" name="shirt_size">
                                        <option value="">-- เลือกขนาดเสื้อ --</option>
                                        <option value="S">S</option>
                                        <option value="M">M</option>
                                        <option value="L">L</option>
                                        <option value="XL">XL</option>
                                        <option value="2XL">2XL</option>
                                        <option value="3XL">3XL</option>
                                    </select>
                                </div>
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">ขนาดรองเท้าเซฟตี้ (Shoe Size)</label>
                                    <input type="text" class="form-control" id="fieldShoe" name="shoe_size" placeholder="เช่น 39, 40, 42" maxlength="10">
                                </div>
                            </div>
                        </div>

                        <!-- 2. ข้อมูลการติดต่อ & โซเชียล -->
                        <div class="mb-4">
                            <div class="pro-section-header">
                                <i class="fas fa-address-book text-primary"></i>
                                <span>ข้อมูลการติดต่อ <span class="d-none d-md-inline text-muted fw-normal" style="font-size:0.75rem;">(Contact Info)</span></span>
                                <span class="section-tag">ระบุตามความสมัครใจ</span>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">เบอร์โทรศัพท์</label>
                                    <input type="tel" class="form-control" id="fieldPhone" name="phone" placeholder="08X-XXX-XXXX" maxlength="20">
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">Line ID</label>
                                    <input type="text" class="form-control" id="fieldLineId" name="social_line_id" placeholder="Line ID" maxlength="100">
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">Facebook</label>
                                    <input type="text" class="form-control" id="fieldFacebook" name="social_facebook" placeholder="Facebook Name/URL" maxlength="200">
                                </div>
                                <div class="col-12 pro-field-group">
                                    <label class="form-label">ที่อยู่ปัจจุบัน</label>
                                    <textarea class="form-control" id="fieldAddress" name="current_address" rows="2" placeholder="ที่อยู่สำหรับติดต่อ..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- 3. การเดินทาง -->
                        <div class="mb-4">
                            <div class="pro-section-header">
                                <i class="fas fa-car text-primary"></i>
                                <span>การเดินทาง <span class="d-none d-md-inline text-muted fw-normal" style="font-size:0.75rem;">(Commute)</span></span>
                                <span class="section-tag">ระบุตามความสมัครใจ</span>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">วิธีการเดินทางมาทำงาน</label>
                                    <select class="form-select" id="fieldCommute" name="commute_method">
                                        <option value="">-- เลือกวิธีการเดินทาง --</option>
                                        <option value="รถรับส่งบริษัท">รถรับส่งบริษัท (Company Bus)</option>
                                        <option value="รถยนต์ส่วนตัว">รถยนต์ส่วนตัว (Personal Car)</option>
                                        <option value="รถจักรยานยนต์ส่วนตัว">รถจักรยานยนต์ส่วนตัว (Motorcycle)</option>
                                        <option value="รถโดยสารประจำทาง">รถโดยสารประจำทาง (Public Transport)</option>
                                        <option value="เดิน">เดิน (Walk)</option>
                                        <option value="อื่นๆ">อื่นๆ (Others)</option>
                                    </select>
                                </div>
                                <div class="col-md-6 pro-field-group">
                                    <label class="form-label">ทะเบียนรถ (ถ้ามี)</label>
                                    <input type="text" class="form-control" id="fieldVehicle" name="vehicle_registration" placeholder="เช่น กข 1234 กทม" maxlength="50">
                                </div>
                            </div>
                        </div>

                        <!-- 4. ข้อมูลฉุกเฉิน -->
                        <div class="mb-4">
                            <div class="pro-section-header danger">
                                <i class="fas fa-heartbeat"></i>
                                <span>ผู้ติดต่อฉุกเฉิน <span class="d-none d-md-inline fw-normal" style="font-size:0.75rem; opacity: 0.7;">(Emergency Contact)</span></span>
                                <span class="section-tag">แนะนำให้ระบุ</span>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">ชื่อผู้ติดต่อฉุกเฉิน</label>
                                    <input type="text" class="form-control" id="fieldEmergName" name="emergency_contact_name" placeholder="ชื่อ - นามสกุล" maxlength="200">
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">ความสัมพันธ์</label>
                                    <input type="text" class="form-control" id="fieldEmergRel" name="emergency_contact_relation" placeholder="เช่น บิดา, มารดา, พี่น้อง" maxlength="100">
                                </div>
                                <div class="col-md-4 pro-field-group">
                                    <label class="form-label">เบอร์โทรศัพท์ฉุกเฉิน</label>
                                    <input type="tel" class="form-control" id="fieldEmergPhone" name="emergency_contact_phone" placeholder="08X-XXX-XXXX" maxlength="50">
                                </div>
                            </div>
                        </div>

                        <div class="mt-4 d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary px-4 py-2 fw-bold rounded" id="btnSaveInfo">
                                <i class="fas fa-save me-2"></i>บันทึกข้อมูลส่วนตัว
                            </button>
                        </div>
                    </form>
                </div>

                <!-- ─── Section: ความปลอดภัย ─── -->
                <div id="section-security" class="d-none">
                    <div class="pro-section-header">
                        <i class="fas fa-lock text-primary"></i>
                        ความปลอดภัยบัญชี
                    </div>

                    <div class="pro-notice" style="border-color: rgba(var(--bs-info-rgb),.25); background: rgba(var(--bs-info-rgb),.05);">
                        <i class="fas fa-shield-alt notice-icon text-info"></i>
                        <span><strong>เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</strong> — แนะนำให้รหัสผ่านมีอย่างน้อย 8 ตัวอักษร ผสมตัวอักษรใหญ่-เล็ก และตัวเลข</span>
                    </div>

                    <form id="changePasswordForm" autocomplete="off">
                        <div class="row g-3">
                            <div class="col-12 pro-field-group">
                                <label class="form-label">รหัสผ่านเดิม</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldOldPwd"
                                           name="old_password" placeholder="กรอกรหัสผ่านเดิม" autocomplete="current-password">
                                    <button class="btn btn-light border" type="button" data-toggle-pwd="fieldOldPwd">
                                        <i class="fas fa-eye text-muted"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6 pro-field-group">
                                <label class="form-label">รหัสผ่านใหม่</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldNewPwd"
                                           name="new_password" placeholder="อย่างน้อย 6 ตัวอักษร" autocomplete="new-password">
                                    <button class="btn btn-light border" type="button" data-toggle-pwd="fieldNewPwd">
                                        <i class="fas fa-eye text-muted"></i>
                                    </button>
                                </div>
                                <div class="mt-2 d-flex gap-1" id="pwdStrengthBars">
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="1"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="2"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="3"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="4"></div>
                                </div>
                                <div class="d-flex justify-content-between mt-1">
                                    <small class="text-muted fw-bold" id="pwdStrengthLabel"></small>
                                    <small class="text-muted" id="pwdSuggestionLabel" style="font-size: 0.7rem;"></small>
                                </div>
                            </div>
                            <div class="col-md-6 pro-field-group">
                                <label class="form-label">ยืนยันรหัสผ่านใหม่</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldConfirmPwd"
                                           name="confirm_password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" autocomplete="new-password">
                                    <button class="btn btn-light border" type="button" data-toggle-pwd="fieldConfirmPwd">
                                        <i class="fas fa-eye text-muted"></i>
                                    </button>
                                </div>
                                <div class="mt-2 text-end">
                                    <small id="pwdMatchHint" class="d-none fw-bold"></small>
                                </div>
                            </div>
                        </div>

                        <div class="mt-4 d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary px-4 py-2 fw-bold" id="btnChangePassword">
                                <i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน
                            </button>
                        </div>
                    </form>
                </div>

                <!-- ─── Section: ประวัติกิจกรรม ─── -->
                <div id="section-activity" class="d-none">
                    <div class="pro-section-header">
                        <i class="fas fa-history text-primary"></i>
                        ประวัติกิจกรรมล่าสุด
                        <button class="btn btn-sm btn-outline-secondary ms-auto" style="font-size:0.75rem; padding: 0.2rem 0.6rem;" onclick="loadActivityLog()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div id="activityLogContainer" class="activity-timeline">
                        <div class="text-center text-muted py-4 skeleton" style="min-height: 100px;">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- ─── Section: การตั้งค่า ─── -->
                <div id="section-preferences" class="d-none">
                    <div class="pro-section-header">
                        <i class="fas fa-sliders-h text-primary"></i>
                        การตั้งค่าส่วนตัว
                    </div>
                    <form id="preferencesForm">
                        <div class="row g-3">
                            <div class="col-md-6 pro-field-group">
                                <label class="form-label">ธีมที่ใช้งาน (Theme) <i class="fas fa-info-circle text-warning ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ฟีเจอร์นี้อยู่ระหว่างการพัฒนา"></i></label>
                                <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldThemeDisplay" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                            </div>
                            <div class="col-md-6 pro-field-group">
                                <label class="form-label">ภาษาที่ใช้งาน (Language) <i class="fas fa-info-circle text-warning ms-1" style="cursor:help;" data-bs-toggle="tooltip" title="ฟีเจอร์นี้อยู่ระหว่างการพัฒนา"></i></label>
                                <div><span class="form-control read-only-display border-0 d-inline-block w-auto px-3 py-1 skeleton" id="fieldLangDisplay" style="min-height: 32px; min-width: 200px; font-size: 0.85rem; font-weight: 500;">—</span></div>
                            </div>
                        </div>
                    </form>
                </div>

            </div><!-- end card-body -->
        </div><!-- end info-card -->

    </div><!-- end grid -->
    </div><!-- end container-fluid -->
</main>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const API_URL    = 'api/api_profile.php';
    const AVATAR_URL = 'api/api_avatar_upload.php';

    // Initialize Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // ─── Helpers ─────────────────────────────────────────────
    function showAlert(msg, type = 'danger') {
        if (typeof showToast === 'function') {
            const color = type === 'success' ? '#28a745' : (type === 'warning' ? '#ffc107' : '#dc3545');
            showToast(msg, color);
        } else {
            alert(msg);
        }
    }

    function apiPost(url, body) {
        return fetch(url, {
            method : 'POST',
            headers: {
                'Content-Type' : 'application/json',
                'X-CSRF-TOKEN' : CSRF_TOKEN,
            },
            body: JSON.stringify(body)
        }).then(r => r.json());
    }

    function formatDate(str) {
        if (!str) return '—';
        const d = new Date(str);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // ─── Tab Switching ────────────────────────────────────────
    let activityLoaded = false;
    document.querySelectorAll('.pro-tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.pro-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.section;
            ['info', 'security', 'activity', 'preferences'].forEach(s => {
                document.getElementById('section-' + s).classList.toggle('d-none', s !== target);
            });

            if (target === 'activity' && !activityLoaded) {
                window.loadActivityLog();
                activityLoaded = true;
            }
        });
    });

    // ─── Load Profile ─────────────────────────────────────────
    function loadProfile() {
        fetch(`${API_URL}?action=get_my_profile&_t=${Date.now()}`)
            .then(r => r.json())
            .then(json => {
                if (!json.success) { showAlert(json.message); return; }
                const d = json.data;

                if (d.profile_picture) {
                    const img = document.getElementById('profileAvatarImg');
                    img.src = d.profile_picture;
                    img.classList.remove('d-none');
                    document.getElementById('profileAvatarPlaceholder').classList.add('d-none');
                }

                const setText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.textContent = text;
                        el.classList.remove('skeleton');
                    }
                };

                setText('profileFullname', d.fullname || d.username);
                setText('profileRoleBadge', d.role);
                setText('sideUsername', d.username);
                setText('sideEmpId', d.emp_id || '—');
                setText('sideTeam', d.team_group || '—');
                setText('sideLastLogin', formatDate(d.last_login));
                setText('sidePwdChanged', d.pwd_changed_at ? formatDate(d.pwd_changed_at) : 'ยังไม่เคยเปลี่ยน');
                
                setText('fieldFullname', d.fullname || '—');
                setText('fieldPosition', d.position || '—');
                setText('fieldLine', d.line ? 'สาย: ' + d.line : '—');
                setText('fieldDept', d.department_api || '—');

                document.getElementById('fieldPhone').value    = d.phone || '';
                document.getElementById('fieldBio').value      = d.bio || '';
                document.getElementById('bioCharCount').textContent = (d.bio || '').length;

                // New Fields
                document.getElementById('fieldLineId').value   = d.social_line_id || '';
                document.getElementById('fieldFacebook').value = d.social_facebook || '';
                document.getElementById('fieldAddress').value  = d.current_address || '';
                document.getElementById('fieldCommute').value  = d.commute_method || '';
                document.getElementById('fieldVehicle').value  = d.vehicle_registration || '';
                document.getElementById('fieldEmergName').value= d.emergency_contact_name || '';
                document.getElementById('fieldEmergRel').value = d.emergency_contact_relation || '';
                document.getElementById('fieldEmergPhone').value= d.emergency_contact_phone || '';

                document.getElementById('fieldDOB').value      = d.date_of_birth || '';
                document.getElementById('fieldMarital').value  = d.marital_status || '';
                document.getElementById('fieldChildren').value = d.children_count || '';
                document.getElementById('fieldShirt').value    = d.shirt_size || '';
                document.getElementById('fieldShoe').value     = d.shoe_size || '';

                const tVal = d.theme_preference || 'light';
                const lVal = d.preferred_lang || 'th';

                const tEl = document.getElementById('fieldThemeDisplay');
                if (tEl) {
                    tEl.textContent = tVal === 'dark' ? '🌙 โหมดกลางคืน (Dark)' : '☀️ โหมดกลางวัน (Light)';
                    tEl.classList.remove('skeleton');
                }

                const lEl = document.getElementById('fieldLangDisplay');
                if (lEl) {
                    lEl.textContent = lVal === 'en' ? '🇺🇸 English' : '🇹🇭 ภาษาไทย';
                    lEl.classList.remove('skeleton');
                }
            })
            .catch(() => showAlert('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'));
    }

    loadProfile();

    // ─── Load Performance ─────────────────────────────────────
    function loadSidebarPerformance() {
        fetch('<?php echo defined('BASE_URL') ? BASE_URL : '/MES/MES'; ?>/page/manpower/api/api_my_performance.php')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data && json.data.has_data) {
                    document.getElementById('sidebarPerformanceCard').classList.remove('d-none');
                    
                    let grade = json.data.grade;
                    let isSystemGrade = false;
                    if (!grade || grade === '-' || grade === 'N/A') {
                        if (json.data.system_grade && json.data.system_grade !== 'N/A') {
                            grade = json.data.system_grade;
                            isSystemGrade = true;
                        }
                    }
                    
                    const gradeEl = document.getElementById('sidebarGradeDisplay');
                    gradeEl.className = 'badge';
                    if (grade === 'A') gradeEl.classList.add('bg-success');
                    else if (grade === 'B') gradeEl.classList.add('bg-primary');
                    else if (grade === 'C') gradeEl.classList.add('bg-warning', 'text-dark');
                    else if (grade === 'D' || grade === 'F') gradeEl.classList.add('bg-danger');
                    else gradeEl.classList.add('bg-secondary');
                    
                    gradeEl.textContent = grade + (isSystemGrade ? ' (Sys)' : '');
                    document.getElementById('sidebarIncomeDisplay').textContent = '฿' + parseFloat(json.data.total_income || 0).toFixed(2);
                    document.getElementById('sidebarRatioDisplay').textContent = parseFloat(json.data.ratio || 0).toFixed(2);
                }
            })
            .catch(err => console.error('Error fetching performance:', err));
    }
    loadSidebarPerformance();    // ─── Activity Log ─────────────────────────────────────────
    window.loadActivityLog = function() {
        const container = document.getElementById('activityLogContainer');
        container.innerHTML = '<div class="text-center text-muted py-4 skeleton" style="min-height: 100px;">กำลังโหลด...</div>';
        
        fetch(`${API_URL}?action=get_activity_log&_t=${Date.now()}`)
            .then(r => r.json())
            .then(json => {
                if (!json.success) {
                    container.innerHTML = `<div class="text-center text-danger py-4">${json.message}</div>`;
                    return;
                }
                
                if (!json.data || json.data.length === 0) {
                    container.innerHTML = '<div class="text-center text-muted py-4">ไม่มีประวัติกิจกรรมล่าสุด</div>';
                    return;
                }
                
                container.innerHTML = json.data.map(log => {
                    let icon = 'fas fa-info-circle text-primary';
                    if(log.action.includes('login')) icon = 'fas fa-sign-in-alt text-success';
                    if(log.action.includes('password')) icon = 'fas fa-key text-warning';
                    if(log.action.includes('profile')) icon = 'fas fa-user-edit text-info';
                    
                    return `
                        <div class="activity-item">
                            <div class="d-flex justify-content-between mb-1 align-items-center">
                                <span style="font-size: 0.85rem; font-weight: 600; color: var(--bs-body-color);"><i class="${icon} me-2"></i>${log.action}</span>
                                <span class="text-muted" style="font-size: 0.75rem;">${formatDate(log.created_at)}</span>
                            </div>
                            <div class="text-muted" style="font-size: 0.8rem;">${log.details || ''}</div>
                            <div class="text-muted mt-1" style="font-size: 0.75rem;"><i class="fas fa-network-wired me-1"></i> ${log.ip_address || '—'}</div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                container.innerHTML = '<div class="text-center text-danger py-4">ไม่สามารถโหลดประวัติกิจกรรมได้</div>';
            });
    };

    // ─── Bio char counter ─────────────────────────────────────
    document.getElementById('fieldBio').addEventListener('input', function () {
        document.getElementById('bioCharCount').textContent = this.value.length;
    });

    // ─── Avatar upload ────────────────────────────────────────
    document.getElementById('avatarTrigger').addEventListener('click', () => {
        document.getElementById('avatarFileInput').click();
    });

    document.getElementById('avatarFileInput').addEventListener('change', function () {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];

        if (file.size > 2 * 1024 * 1024) { showAlert('ขนาดไฟล์ต้องไม่เกิน 2MB'); return; }
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
            showAlert('รองรับเฉพาะไฟล์ JPEG, PNG, และ WebP');
            return;
        }

        const progress = document.getElementById('avatarUploadProgress');
        progress.style.display = 'block';

        const formData = new FormData();
        formData.append('avatar', file);

        fetch(AVATAR_URL, {
            method : 'POST',
            headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
            body   : formData
        })
        .then(r => r.json())
        .then(json => {
            progress.style.display = 'none';
            if (json.success) {
                const img = document.getElementById('profileAvatarImg');
                img.src = json.picture_url + '?_t=' + Date.now();
                img.classList.remove('d-none');
                document.getElementById('profileAvatarPlaceholder').classList.add('d-none');

                const headerAvatar = document.getElementById('headerAvatarImg');
                if (headerAvatar) {
                    headerAvatar.src = json.picture_url + '?_t=' + Date.now();
                    headerAvatar.classList.remove('d-none');
                    document.getElementById('headerAvatarFallback')?.classList.add('d-none');
                }

                showAlert('อัปโหลดรูปโปรไฟล์สำเร็จ', 'success');
            } else {
                showAlert(json.message);
            }
        })
        .catch(() => { progress.style.display = 'none'; showAlert('เกิดข้อผิดพลาดในการอัปโหลด'); });

        this.value = '';
    });

    // ─── Password toggle ─────────────────────────────────────
    document.querySelectorAll('[data-toggle-pwd]').forEach(btn => {
        btn.addEventListener('click', function () {
            const inp  = document.getElementById(this.dataset.togglePwd);
            const icon = this.querySelector('i');
            inp.type   = inp.type === 'password' ? 'text' : 'password';
            icon.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    });

    // ─── Password strength ────────────────────────────────────
    document.getElementById('fieldNewPwd').addEventListener('input', function () {
        const val = this.value;
        let score = 0;
        if (val.length >= 6)  score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val)) score++;

        const colors = ['bg-danger','bg-warning','bg-info','bg-success'];
        const labels = ['','อ่อน','ปานกลาง','แข็งแรง','แข็งแรงมาก'];

        document.querySelectorAll('[data-bar]').forEach((bar, i) => {
            bar.className = 'pwd-strength-bar flex-fill ' + (i < score ? colors[score - 1] : 'bg-secondary');
        });
        document.getElementById('pwdStrengthLabel').textContent = val ? labels[score] : '';
        checkPasswordMatch();
    });

    function checkPasswordMatch() {
        const np   = document.getElementById('fieldNewPwd').value;
        const cp   = document.getElementById('fieldConfirmPwd').value;
        const hint = document.getElementById('pwdMatchHint');
        if (!cp) { hint.className = 'd-none'; return; }
        if (np === cp) {
            hint.className = 'text-success small';
            hint.textContent = '✓ รหัสผ่านตรงกัน';
        } else {
            hint.className = 'text-danger small';
            hint.textContent = '✗ รหัสผ่านไม่ตรงกัน';
        }
    }

    document.getElementById('fieldConfirmPwd').addEventListener('input', checkPasswordMatch);

    // ─── Save Personal Info ───────────────────────────────────
    document.getElementById('profileInfoForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btnSaveInfo');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';

        try {
            const json = await apiPost(`${API_URL}?action=update_my_info`, {
                phone : document.getElementById('fieldPhone').value.trim(),
                bio   : document.getElementById('fieldBio').value.trim(),
                social_line_id : document.getElementById('fieldLineId').value.trim(),
                social_facebook: document.getElementById('fieldFacebook').value.trim(),
                current_address: document.getElementById('fieldAddress').value.trim(),
                commute_method : document.getElementById('fieldCommute').value.trim(),
                vehicle_registration : document.getElementById('fieldVehicle').value.trim(),
                emergency_contact_name : document.getElementById('fieldEmergName').value.trim(),
                emergency_contact_relation : document.getElementById('fieldEmergRel').value.trim(),
                emergency_contact_phone: document.getElementById('fieldEmergPhone').value.trim(),
                date_of_birth : document.getElementById('fieldDOB').value.trim(),
                marital_status : document.getElementById('fieldMarital').value.trim(),
                children_count : document.getElementById('fieldChildren').value.trim(),
                shirt_size : document.getElementById('fieldShirt').value.trim(),
                shoe_size : document.getElementById('fieldShoe').value.trim()
            });
            showAlert(json.message, json.success ? 'success' : 'danger');
        } catch { showAlert('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-2"></i>บันทึกข้อมูล';
        }
    });

    // ─── Change Password ──────────────────────────────────────
    document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btnChangePassword');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังดำเนินการ...';

        try {
            const json = await apiPost(`${API_URL}?action=change_password`, {
                old_password    : document.getElementById('fieldOldPwd').value,
                new_password    : document.getElementById('fieldNewPwd').value,
                confirm_password: document.getElementById('fieldConfirmPwd').value,
            });

            if (json.success) {
                showAlert(json.message, 'success');
                setTimeout(() => { window.location.href = '../../auth/logout.php'; }, 2000);
            } else {
                showAlert(json.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน';
            }
        } catch {
            showAlert('เกิดข้อผิดพลาด กรุณาลองใหม่');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน';
        }
    });

    // ─── Save Preferences ─────────────────────────────────────
    document.getElementById('preferencesForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn   = document.getElementById('btnSavePrefs');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';

        const theme = document.getElementById('fieldTheme').value;
        const lang  = document.getElementById('fieldLang').value;

        try {
            const json = await apiPost(`${API_URL}?action=update_my_info`, {
                theme_preference: theme,
                preferred_lang  : lang,
            });

            if (json.success) {
                document.documentElement.setAttribute('data-bs-theme', theme);
                localStorage.setItem('theme', theme);
                showAlert(json.message, 'success');
                // Reload the page to apply PHP-side translations
                setTimeout(() => window.location.reload(), 1200);
            } else {
                showAlert(json.message);
            }
        } catch { showAlert('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-2"></i>บันทึกการตั้งค่า';
        }
    });
});
</script>

</body>
</html>
