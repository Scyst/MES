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
            grid-template-columns: 300px 1fr;
            gap: 1.5rem;
            align-items: start;
        }

        @media (max-width: 768px) {
            .profile-content-grid { grid-template-columns: 1fr; }
        }

        /* ─── Avatar Card ─── */
        .avatar-card {
            border-radius: 16px;
            border: none;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            position: sticky;
            top: 1rem;
        }

        .avatar-wrapper {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
            cursor: pointer;
        }

        .avatar-img {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--bs-border-color);
            transition: opacity 0.2s;
        }

        .avatar-wrapper:hover .avatar-img { opacity: 0.75; }

        .avatar-overlay {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        }

        .avatar-wrapper:hover .avatar-overlay { opacity: 1; }

        .avatar-placeholder {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: var(--bs-secondary-bg);
            border: 3px solid var(--bs-border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: var(--bs-secondary);
            transition: opacity 0.2s;
        }

        .avatar-wrapper:hover .avatar-placeholder { opacity: 0.75; }

        /* ─── Info Card ─── */
        .info-card {
            border-radius: 16px;
            border: none;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .section-tab-btn {
            border: none;
            background: transparent;
            padding: 0.6rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            color: var(--bs-secondary-color);
            transition: all 0.15s;
            white-space: nowrap;
        }

        .section-tab-btn.active,
        .section-tab-btn:hover {
            background: var(--bs-secondary-bg);
            color: var(--bs-body-color);
        }

        .section-tab-btn.active { font-weight: 600; }

        .form-label-sm {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--bs-secondary-color);
            margin-bottom: 0.3rem;
        }

        .readonly-field {
            background: var(--bs-secondary-bg);
            border-color: transparent;
            cursor: default;
        }

        #avatarUploadProgress { display: none; }

        .role-badge {
            font-size: 0.7rem;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .pwd-strength-bar {
            height: 4px;
            border-radius: 2px;
            transition: width 0.3s, background 0.3s;
        }
    </style>
</head>
<body class="layout-top-header">

<?php include_once('../components/php/top_header.php'); ?>

<main class="portal-main-content p-3 p-md-4">

    <!-- Alert zone -->
    <div id="profileAlert" class="alert d-none mb-3" role="alert"></div>

    <div class="profile-content-grid">

        <!-- ══════════ LEFT: Avatar Card ══════════ -->
        <div class="card avatar-card p-4 text-center">
            <div class="avatar-wrapper mb-3" id="avatarTrigger" title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์">
                <img id="profileAvatarImg" src="" alt="รูปโปรไฟล์"
                     class="avatar-img d-none"
                     onerror="this.classList.add('d-none'); document.getElementById('profileAvatarPlaceholder').classList.remove('d-none');">
                <div id="profileAvatarPlaceholder" class="avatar-placeholder">
                    <i class="fas fa-user"></i>
                </div>
                <div class="avatar-overlay text-white">
                    <i class="fas fa-camera fa-lg"></i>
                </div>
            </div>

            <!-- Upload Progress -->
            <div id="avatarUploadProgress" class="mb-2">
                <div class="progress" style="height: 4px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
                </div>
                <small class="text-muted">กำลังอัปโหลด...</small>
            </div>

            <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/webp" class="d-none">

            <h5 class="fw-bold mb-0" id="profileFullname">—</h5>
            <span class="badge bg-secondary role-badge mt-1" id="profileRoleBadge">—</span>
            <div class="text-muted small mt-1" id="profileLine">—</div>
            <div class="text-muted small mt-1" id="profilePosition">—</div>

            <hr class="my-3">

            <div class="text-start">
                <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>Username</span>
                    <span class="fw-bold text-body" id="sideUsername">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>รหัสพนักงาน</span>
                    <span class="fw-bold text-body" id="sideEmpId">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>ทีม</span>
                    <span class="fw-bold text-body" id="sideTeam">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>เข้าสู่ระบบล่าสุด</span>
                    <span class="fw-bold text-body" id="sideLastLogin">—</span>
                </div>
                <div class="d-flex justify-content-between small text-muted">
                    <span>เปลี่ยนรหัสผ่านล่าสุด</span>
                    <span id="sidePwdChanged" class="fw-bold text-body">—</span>
                </div>
            </div>

            <hr class="my-3">
            <small class="text-muted">
                <i class="fas fa-camera me-1"></i>คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์<br>
                <span class="text-muted">รองรับ JPG, PNG, WebP (สูงสุด 2MB)</span>
            </small>
        </div>

        <!-- ══════════ RIGHT: Info + Forms ══════════ -->
        <div class="card info-card">
            <!-- Tab Nav -->
            <div class="card-header bg-transparent border-bottom d-flex gap-1 flex-wrap p-2">
                <button class="section-tab-btn active" data-section="info">
                    <i class="fas fa-id-card me-2"></i>ข้อมูลส่วนตัว
                </button>
                <button class="section-tab-btn" data-section="security">
                    <i class="fas fa-lock me-2"></i>ความปลอดภัย
                </button>
                <button class="section-tab-btn" data-section="preferences">
                    <i class="fas fa-sliders-h me-2"></i>การตั้งค่า
                </button>
            </div>

            <div class="card-body p-4">

                <!-- ─── Section: ข้อมูลส่วนตัว ─── -->
                <div id="section-info">
                    <h6 class="fw-bold mb-4">ข้อมูลส่วนตัว</h6>
                    <form id="profileInfoForm">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label-sm">ชื่อ-นามสกุล</label>
                                <input type="text" class="form-control readonly-field" id="fieldFullname" readonly>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">ตำแหน่งงาน</label>
                                <input type="text" class="form-control readonly-field" id="fieldPosition" readonly>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">สาย / Line</label>
                                <input type="text" class="form-control readonly-field" id="fieldLine" readonly>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">แผนก</label>
                                <input type="text" class="form-control readonly-field" id="fieldDept" readonly>
                            </div>
                            <div class="col-12">
                                <label class="form-label-sm">เบอร์โทรศัพท์ <span class="text-muted fw-normal">(สามารถแก้ไขได้)</span></label>
                                <input type="tel" class="form-control" id="fieldPhone" name="phone"
                                       placeholder="ไม่ได้ระบุ" maxlength="20">
                            </div>
                            <div class="col-12">
                                <label class="form-label-sm">คำแนะนำตัว <span class="text-muted fw-normal">(ไม่บังคับ)</span></label>
                                <textarea class="form-control" id="fieldBio" name="bio" rows="3"
                                          placeholder="แนะนำตัวคุณสั้นๆ..." maxlength="500"></textarea>
                                <div class="text-end">
                                    <small class="text-muted"><span id="bioCharCount">0</span>/500</small>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4 d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary px-4" id="btnSaveInfo">
                                <i class="fas fa-save me-2"></i>บันทึกข้อมูล
                            </button>
                        </div>
                    </form>

                    <hr class="my-4">
                    <p class="text-muted small mb-0">
                        <i class="fas fa-info-circle me-1"></i>
                        ชื่อ ตำแหน่ง และสายการผลิตจะซิงค์อัตโนมัติจากระบบ HR กรุณาติดต่อ Admin หากต้องการแก้ไข
                    </p>
                </div>

                <!-- ─── Section: ความปลอดภัย ─── -->
                <div id="section-security" class="d-none">
                    <h6 class="fw-bold mb-4">เปลี่ยนรหัสผ่าน</h6>
                    <form id="changePasswordForm" autocomplete="off">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label-sm">รหัสผ่านเดิม</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldOldPwd"
                                           name="old_password" placeholder="กรอกรหัสผ่านเดิม" autocomplete="current-password">
                                    <button class="btn btn-outline-secondary" type="button" data-toggle-pwd="fieldOldPwd">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">รหัสผ่านใหม่</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldNewPwd"
                                           name="new_password" placeholder="อย่างน้อย 6 ตัวอักษร" autocomplete="new-password">
                                    <button class="btn btn-outline-secondary" type="button" data-toggle-pwd="fieldNewPwd">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="mt-2 d-flex gap-1" id="pwdStrengthBars">
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="1"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="2"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="3"></div>
                                    <div class="pwd-strength-bar flex-fill bg-secondary" data-bar="4"></div>
                                </div>
                                <small class="text-muted" id="pwdStrengthLabel"></small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label-sm">ยืนยันรหัสผ่านใหม่</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="fieldConfirmPwd"
                                           name="confirm_password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" autocomplete="new-password">
                                    <button class="btn btn-outline-secondary" type="button" data-toggle-pwd="fieldConfirmPwd">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <small id="pwdMatchHint" class="d-none"></small>
                            </div>
                        </div>

                        <div class="alert alert-warning mt-3 py-2 small">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            หลังจากเปลี่ยนรหัสผ่านสำเร็จ ระบบจะออกจากบัญชีโดยอัตโนมัติ กรุณาเข้าสู่ระบบใหม่อีกครั้ง
                        </div>

                        <div class="mt-3 d-flex justify-content-end">
                            <button type="submit" class="btn btn-warning px-4 fw-bold" id="btnChangePassword">
                                <i class="fas fa-key me-2"></i>เปลี่ยนรหัสผ่าน
                            </button>
                        </div>
                    </form>
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
</main>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const API_URL    = 'api/api_profile.php';
    const AVATAR_URL = 'api/api_avatar_upload.php';

    // ─── Helpers ─────────────────────────────────────────────
    function showAlert(msg, type = 'danger') {
        const el = document.getElementById('profileAlert');
        el.className = `alert alert-${type} mb-3`;
        el.textContent = msg;
        el.classList.remove('d-none');
        setTimeout(() => el.classList.add('d-none'), 5000);
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
    document.querySelectorAll('.section-tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.section-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.section;
            ['info', 'security', 'preferences'].forEach(s => {
                document.getElementById('section-' + s).classList.toggle('d-none', s !== target);
            });
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

                document.getElementById('profileFullname').textContent  = d.fullname || d.username;
                document.getElementById('profileRoleBadge').textContent = d.role;
                document.getElementById('profileLine').textContent      = d.line ? 'สาย: ' + d.line : '—';
                document.getElementById('profilePosition').textContent  = d.position || '';
                document.getElementById('sideUsername').textContent     = d.username;
                document.getElementById('sideEmpId').textContent        = d.emp_id || '—';
                document.getElementById('sideTeam').textContent         = d.team_group || '—';
                document.getElementById('sideLastLogin').textContent    = formatDate(d.last_login);
                document.getElementById('sidePwdChanged').textContent   = d.pwd_changed_at ? formatDate(d.pwd_changed_at) : 'ยังไม่เคยเปลี่ยน';

                document.getElementById('fieldFullname').value = d.fullname || '';
                document.getElementById('fieldPosition').value = d.position || '';
                document.getElementById('fieldLine').value     = d.line || '';
                document.getElementById('fieldDept').value     = d.department_api || '';
                document.getElementById('fieldPhone').value    = d.phone || '';
                document.getElementById('fieldBio').value      = d.bio || '';
                document.getElementById('bioCharCount').textContent = (d.bio || '').length;

                document.getElementById('fieldTheme').value = d.theme_preference || 'light';
                document.getElementById('fieldLang').value  = d.preferred_lang   || 'th';
            })
            .catch(() => showAlert('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'));
    }

    loadProfile();

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
