<?php
require_once __DIR__ . '/../components/init.php';

$pageTitle          = 'โปรไฟล์ของฉัน';
$pageHeaderTitle    = 'โปรไฟล์ของฉัน';
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
        /* ─── Profile Page Layout ─── */
        .profile-content-grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 1.5rem;
            align-items: start;
        }

        @media (max-width: 768px) {
            .profile-content-grid { grid-template-columns: 1fr; }
        }

        /* ─── Skeleton Loading ─── */
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        .skeleton {
            background: #f6f7f8;
            background-image: linear-gradient(90deg, #f6f7f8 0px, #edeef1 40px, #f6f7f8 80px);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite linear forwards;
            color: transparent !important;
            border-radius: 4px;
            pointer-events: none;
            user-select: none;
        }
        [data-bs-theme="dark"] .skeleton {
            background: #2b2b2b;
            background-image: linear-gradient(90deg, #2b2b2b 0px, #3b3b3b 40px, #2b2b2b 80px);
        }

        /* ─── Glassmorphism & Cards ─── */
        .glass-card {
            background: var(--bs-body-bg);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
            backdrop-filter: blur(10px);
        }
        
        .avatar-card {
            position: sticky;
            top: 1.5rem;
        }

        .avatar-wrapper {
            position: relative;
            width: 140px;
            height: 140px;
            margin: 0 auto;
            cursor: pointer;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }

        .avatar-wrapper:hover {
            transform: scale(1.05);
        }

        .avatar-img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid var(--bs-border-color);
            transition: all 0.3s;
        }

        .avatar-wrapper:hover .avatar-img { 
            filter: brightness(0.7);
        }

        .avatar-overlay {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            color: #fff;
        }

        .avatar-wrapper:hover .avatar-overlay { opacity: 1; }

        .avatar-placeholder {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: var(--bs-secondary-bg);
            border: 4px solid var(--bs-border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
            color: var(--bs-secondary);
        }

        /* ─── Tabs ─── */
        .section-tab-btn {
            border: none;
            background: transparent;
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            font-size: 0.9rem;
            color: var(--bs-secondary-color);
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .section-tab-btn.active,
        .section-tab-btn:hover {
            background: var(--bs-primary);
            color: #fff;
            box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.3);
        }

        .form-label-sm {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--bs-secondary-color);
            margin-bottom: 0.4rem;
        }

        /* ─── Security & Badges ─── */
        .role-badge {
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            padding: 0.4em 0.8em;
            border-radius: 20px;
        }

        .pwd-strength-bar {
            height: 6px;
            border-radius: 3px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .activity-timeline {
            border-left: 2px solid var(--bs-border-color);
            margin-left: 1rem;
            padding-left: 1.5rem;
            position: relative;
        }
        .activity-item {
            position: relative;
            margin-bottom: 1.5rem;
        }
        .activity-item::before {
            content: '';
            position: absolute;
            left: -1.85rem;
            top: 0.2rem;
            width: 12px;
            height: 12px;
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
        <div class="card glass-card avatar-card p-4 text-center">
            <div class="avatar-wrapper mb-3" id="avatarTrigger" title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์">
                <img id="profileAvatarImg" src="" alt="รูปโปรไฟล์"
                     class="avatar-img d-none"
                     onerror="this.classList.add('d-none'); document.getElementById('profileAvatarPlaceholder').classList.remove('d-none');">
                <div id="profileAvatarPlaceholder" class="avatar-placeholder skeleton">
                    <i class="fas fa-user"></i>
                </div>
                <div class="avatar-overlay">
                    <i class="fas fa-camera fa-lg mb-1"></i>
                    <small style="font-size: 0.7rem;">เปลี่ยนรูป</small>
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

            <hr class="my-4">

            <div class="text-start">
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><i class="fas fa-user-tag me-2"></i>Username</span>
                    <span class="fw-bold text-body skeleton" id="sideUsername">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><i class="fas fa-id-badge me-2"></i>รหัสพนักงาน</span>
                    <span class="fw-bold text-body skeleton" id="sideEmpId">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><i class="fas fa-users me-2"></i>ทีม</span>
                    <span class="fw-bold text-body skeleton" id="sideTeam">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span><i class="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบล่าสุด</span>
                    <span class="fw-bold text-body skeleton" id="sideLastLogin">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted">
                    <span><i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่านล่าสุด</span>
                    <span id="sidePwdChanged" class="fw-bold text-body skeleton">—</span>
                </div>
            </div>
        </div>

        <!-- ══════════ RIGHT: Info + Forms ══════════ -->
        <div class="card glass-card">
            <!-- Tab Nav -->
            <div class="card-header bg-transparent border-bottom d-flex gap-2 flex-wrap p-3">
                <button class="section-tab-btn active" data-section="info">
                    <i class="fas fa-id-card me-2"></i>ข้อมูลส่วนตัว
                </button>
                <button class="section-tab-btn" data-section="security">
                    <i class="fas fa-lock me-2"></i>ความปลอดภัย
                </button>
                <button class="section-tab-btn" data-section="activity">
                    <i class="fas fa-history me-2"></i>ประวัติกิจกรรม
                </button>
                <button class="section-tab-btn" data-section="preferences">
                    <i class="fas fa-sliders-h me-2"></i>การตั้งค่า
                </button>
            </div>

            <div class="card-body p-4 p-md-5">

                <!-- ─── Section: ข้อมูลส่วนตัว ─── -->
                <div id="section-info">
                    <h5 class="fw-bold mb-4">ข้อมูลส่วนตัว</h5>
                    <form id="profileInfoForm">
                        
                        <!-- 1. ข้อมูลพื้นฐาน -->
                        <div class="mb-4">
                            <h6 class="fw-bold text-primary border-bottom pb-2 mb-3"><i class="fas fa-user-circle me-2"></i>ข้อมูลพื้นฐาน (Basic Info)</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label-sm">ชื่อ-นามสกุล</label>
                                    <div class="form-control bg-light skeleton border-0" id="fieldFullname" style="min-height: 38px;">—</div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label-sm">ตำแหน่งงาน</label>
                                    <div><span class="badge bg-info text-dark px-3 py-2 skeleton" id="fieldPosition" style="font-size: 0.85rem; min-height: 28px;">—</span></div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label-sm">สาย / Line</label>
                                    <div><span class="badge bg-success px-3 py-2 skeleton" id="fieldLine" style="font-size: 0.85rem; min-height: 28px;">—</span></div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label-sm">แผนก</label>
                                    <div><span class="badge bg-primary px-3 py-2 skeleton" id="fieldDept" style="font-size: 0.85rem; min-height: 28px;">—</span></div>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fas fa-calendar-alt me-1"></i> วันเกิด (DOB)</label>
                                    <input type="date" class="form-control" id="fieldDOB" name="date_of_birth">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fas fa-ring me-1"></i> สถานภาพสมรส</label>
                                    <select class="form-select" id="fieldMarital" name="marital_status">
                                        <option value="">-- เลือกสถานภาพ --</option>
                                        <option value="โสด">โสด (Single)</option>
                                        <option value="สมรส">สมรส (Married)</option>
                                        <option value="หย่าร้าง">หย่าร้าง (Divorced)</option>
                                        <option value="หม้าย">หม้าย (Widowed)</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fas fa-child me-1"></i> จำนวนบุตร (คน)</label>
                                    <input type="number" class="form-control" id="fieldChildren" name="children_count" min="0" placeholder="0">
                                </div>
                                <div class="col-12">
                                    <label class="form-label-sm text-primary"><i class="fas fa-edit me-1"></i> คำแนะนำตัว (ไม่บังคับ)</label>
                                    <textarea class="form-control" id="fieldBio" name="bio" rows="3"
                                              placeholder="แนะนำตัวคุณสั้นๆ..." maxlength="500"></textarea>
                                    <div class="text-end mt-1">
                                        <small class="text-muted"><span id="bioCharCount">0</span>/500</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- สวัสดิการและอุปกรณ์ -->
                        <div class="mb-4">
                            <h6 class="fw-bold text-primary border-bottom pb-2 mb-3"><i class="fas fa-tshirt me-2"></i>สวัสดิการและอุปกรณ์ (Welfare & Equipment)</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label-sm text-primary">ขนาดเสื้อยูนิฟอร์ม (Shirt Size)</label>
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
                                <div class="col-md-6">
                                    <label class="form-label-sm text-primary">ขนาดรองเท้าเซฟตี้ (Shoe Size)</label>
                                    <input type="text" class="form-control" id="fieldShoe" name="shoe_size" placeholder="เช่น 39, 40, 42 หรือเบอร์ US" maxlength="10">
                                </div>
                            </div>
                        </div>

                        <!-- 2. ข้อมูลการติดต่อ & โซเชียล -->
                        <div class="mb-4">
                            <h6 class="fw-bold text-primary border-bottom pb-2 mb-3"><i class="fas fa-address-book me-2"></i>ข้อมูลการติดต่อ (Contact Info)</h6>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fas fa-phone-alt me-1"></i> เบอร์โทรศัพท์</label>
                                    <input type="tel" class="form-control" id="fieldPhone" name="phone" placeholder="08X-XXX-XXXX" maxlength="20">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fab fa-line me-1"></i> Line ID</label>
                                    <input type="text" class="form-control" id="fieldLineId" name="social_line_id" placeholder="Line ID" maxlength="100">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-primary"><i class="fab fa-facebook-square me-1"></i> Facebook</label>
                                    <input type="text" class="form-control" id="fieldFacebook" name="social_facebook" placeholder="Facebook Name/URL" maxlength="200">
                                </div>
                                <div class="col-12">
                                    <label class="form-label-sm text-primary"><i class="fas fa-map-marker-alt me-1"></i> ที่อยู่ปัจจุบัน (Current Address)</label>
                                    <textarea class="form-control" id="fieldAddress" name="current_address" rows="2" placeholder="ที่อยู่สำหรับติดต่อ..."></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- 3. การเดินทาง -->
                        <div class="mb-4">
                            <h6 class="fw-bold text-primary border-bottom pb-2 mb-3"><i class="fas fa-car me-2"></i>การเดินทาง (Commute)</h6>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label-sm text-primary"><i class="fas fa-route me-1"></i> วิธีการเดินทางมาทำงาน</label>
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
                                <div class="col-md-6">
                                    <label class="form-label-sm text-primary"><i class="fas fa-id-card-alt me-1"></i> ทะเบียนรถ (ถ้ามี)</label>
                                    <input type="text" class="form-control" id="fieldVehicle" name="vehicle_registration" placeholder="เช่น กข 1234 กทม" maxlength="50">
                                </div>
                            </div>
                        </div>

                        <!-- 4. ข้อมูลฉุกเฉิน -->
                        <div class="mb-4">
                            <h6 class="fw-bold text-danger border-bottom pb-2 mb-3"><i class="fas fa-heartbeat me-2"></i>ผู้ติดต่อฉุกเฉิน (Emergency Contact)</h6>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label-sm text-danger"><i class="fas fa-user-shield me-1"></i> ชื่อผู้ติดต่อฉุกเฉิน</label>
                                    <input type="text" class="form-control" id="fieldEmergName" name="emergency_contact_name" placeholder="ชื่อ - นามสกุล" maxlength="200">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-danger"><i class="fas fa-users me-1"></i> ความสัมพันธ์</label>
                                    <input type="text" class="form-control" id="fieldEmergRel" name="emergency_contact_relation" placeholder="เช่น บิดา, มารดา, พี่น้อง" maxlength="100">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-sm text-danger"><i class="fas fa-phone me-1"></i> เบอร์โทรศัพท์ฉุกเฉิน</label>
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

                    <hr class="my-5">
                    <div class="alert alert-secondary border-0 d-flex align-items-center mb-0">
                        <i class="fas fa-info-circle fa-2x text-muted me-3"></i>
                        <small class="text-muted mb-0">
                            <strong>หมายเหตุ:</strong> ชื่อ ตำแหน่ง และสายการผลิต ซิงค์อัตโนมัติจากระบบ HR<br>
                            หากต้องการแก้ไขข้อมูลเหล่านี้ กรุณาติดต่อ Admin หรือฝ่ายบุคคล
                        </small>
                    </div>
                </div>

                <!-- ─── Section: ความปลอดภัย ─── -->
                <div id="section-security" class="d-none">
                    <h5 class="fw-bold mb-4">ความปลอดภัยบัญชี</h5>
                    
                    <div class="alert alert-info border-0 mb-4 d-flex align-items-center">
                        <i class="fas fa-shield-alt fa-2x me-3"></i>
                        <div>
                            <strong>เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</strong><br>
                            แนะนำให้รหัสผ่านมีอย่างน้อย 8 ตัวอักษร ผสมตัวอักษรใหญ่-เล็ก และตัวเลข
                        </div>
                    </div>

                    <form id="changePasswordForm" autocomplete="off">
                        <div class="row g-4">
                            <div class="col-12">
                                <label class="form-label-sm">รหัสผ่านเดิม</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldOldPwd"
                                           name="old_password" placeholder="กรอกรหัสผ่านเดิม" autocomplete="current-password">
                                    <button class="btn btn-light border" type="button" data-toggle-pwd="fieldOldPwd">
                                        <i class="fas fa-eye text-muted"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">รหัสผ่านใหม่</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldNewPwd"
                                           name="new_password" placeholder="อย่างน้อย 6 ตัวอักษร" autocomplete="new-password">
                                    <button class="btn btn-light border" type="button" data-toggle-pwd="fieldNewPwd">
                                        <i class="fas fa-eye text-muted"></i>
                                    </button>
                                </div>
                                <div class="mt-3 d-flex gap-1" id="pwdStrengthBars">
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
                            <div class="col-md-6">
                                <label class="form-label-sm">ยืนยันรหัสผ่านใหม่</label>
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
                            <button type="submit" class="btn btn-warning px-4 py-2 fw-bold rounded" id="btnChangePassword">
                                <i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน
                            </button>
                        </div>
                    </form>
                </div>

                <!-- ─── Section: ประวัติกิจกรรม (Activity Log) ─── -->
                <div id="section-activity" class="d-none">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5 class="fw-bold mb-0">ประวัติกิจกรรมล่าสุด</h5>
                        <button class="btn btn-sm btn-outline-secondary" onclick="loadActivityLog()">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    
                    <div id="activityLogContainer" class="activity-timeline">
                        <div class="text-center text-muted py-4 skeleton" style="min-height: 100px;">กำลังโหลด...</div>
                    </div>
                </div>

                <!-- ─── Section: การตั้งค่า ─── -->
                <div id="section-preferences" class="d-none">
                    <h6 class="fw-bold mb-4">การตั้งค่าส่วนตัว</h6>
                    <form id="preferencesForm">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label-sm">ธีมการแสดงผล</label>
                                <select class="form-select" id="fieldTheme" name="theme_preference">
                                    <option value="light">☀️ โหมดกลางวัน (Light)</option>
                                    <option value="dark">🌙 โหมดกลางคืน (Dark)</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">ภาษา (สำรองไว้สำหรับอนาคต)</label>
                                <select class="form-select" id="fieldLang" name="preferred_lang">
                                    <option value="th">🇹🇭 ภาษาไทย</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>
                        </div>
                        <div class="mt-4 d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary px-4" id="btnSavePrefs">
                                <i class="fas fa-save me-2"></i>บันทึกการตั้งค่า
                            </button>
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
    document.querySelectorAll('.section-tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.section-tab-btn').forEach(b => b.classList.remove('active'));
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

                document.getElementById('fieldTheme').value = d.theme_preference || 'light';
                document.getElementById('fieldLang').value  = d.preferred_lang   || 'th';
            })
            .catch(() => showAlert('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'));
    }

    loadProfile();

    // ─── Activity Log ─────────────────────────────────────────
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
                            <div class="d-flex justify-content-between mb-1">
                                <span class="fw-bold"><i class="${icon} me-2"></i>${log.action}</span>
                                <small class="text-muted">${formatDate(log.created_at)}</small>
                            </div>
                            <div class="small text-muted">${log.details || ''}</div>
                            <div class="small text-muted mt-1"><i class="fas fa-network-wired me-1"></i> ${log.ip_address || '—'}</div>
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
