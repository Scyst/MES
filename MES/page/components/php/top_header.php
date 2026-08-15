<?php
if (!function_exists('getThaiDateHeader')) {
    function getThaiDateHeader() {
        $thaiMonths = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน', 5 => 'พฤษภาคม', 6 => 'มิถุนายน',
            7 => 'กรกฎาคม', 8 => 'สิงหาคม', 9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
        ];
        $day = date('j');
        $month = $thaiMonths[(int)date('n')];
        $year = date('Y') + 543;
        return "$day $month $year";
    }
}

$headerIcon     = isset($pageIcon) ? $pageIcon : 'fas fa-cube';
$headerTitle    = isset($pageHeaderTitle) ? $pageHeaderTitle : 'MES System';
$headerSubtitle = isset($pageHeaderSubtitle) ? $pageHeaderSubtitle : 'Manufacturing Execution System';
$helpModalId    = isset($pageHelpId) ? $pageHelpId : '';
$backLink       = isset($pageBackLink) ? $pageBackLink : ''; 

$userRole = $_SESSION['user']['role'] ?? 'guest';
$fullName = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Guest User';
?>

<header class="portal-top-header border-bottom shadow-sm">
    <div class="d-flex align-items-center gap-3">
        <button class="btn btn-link text-secondary d-xl-none p-0 me-2" id="sidebar-toggle-mobile-top">
            <i class="fas fa-bars fa-lg"></i>
        </button>

        <?php if($backLink): ?>
            <a href="<?php echo $backLink; ?>" class="btn btn-light bg-white border text-secondary shadow-sm rounded-circle d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;" title="กลับ">
                <i class="fas fa-arrow-left"></i>
            </a>
        <?php else: ?>
            <div class="header-logo-box bg-secondary bg-opacity-10 text-primary">
                <i class="<?php echo $headerIcon; ?> fa-lg"></i>
            </div>
        <?php endif; ?>
        
        <div class="d-flex flex-column justify-content-center">
            <h5 class="fw-bold mb-0 text-body" style="line-height: 1.2;">
                <?php echo $headerTitle; ?>
            </h5>
            <small class="text-muted" style="font-size: 0.75rem;">
                <?php echo $headerSubtitle; ?>
            </small>
        </div>
    </div>

    <div class="d-flex align-items-center gap-3">
        <?php if($helpModalId): ?>
        <button class="btn btn-link text-secondary p-0" onclick="new bootstrap.Modal(document.getElementById('<?php echo $helpModalId; ?>')).show()" title="คู่มือการใช้งาน">
            <i class="far fa-question-circle fa-lg"></i>
        </button>
        <?php endif; ?>

        <div class="d-none d-lg-flex align-items-center text-muted small pe-3 me-1 border-end">
            <span id="realTimeClock" class="me-2" style="font-variant-numeric: tabular-nums;">00:00:00</span>
            <span id="realTimeDate"><?php echo getThaiDateHeader(); ?></span>
        </div>

        <?php if (isset($_SESSION['user'])): ?>
        <div class="dropdown d-none d-md-block">
            <a href="#" class="text-decoration-none text-secondary d-flex align-items-center" data-bs-toggle="dropdown" aria-expanded="false" title="บัญชีผู้ใช้" style="transition: color 0.2s;">
                <i class="fas fa-user-circle fa-2x profile-icon-hover"></i>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border border-light mt-2 p-2" style="min-width: 260px; border-radius: 12px;">
                <li class="text-center p-3 border-bottom mb-2 bg-light rounded">
                    <i class="fas fa-user-circle fa-3x text-secondary mb-2"></i>
                    <h6 class="mb-0 fw-bold text-dark"><?php echo htmlspecialchars($fullName); ?></h6>
                    <small class="text-muted text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;"><?php echo htmlspecialchars($userRole); ?></small>
                </li>
                <!-- Performance Summary -->
                <li class="px-3 py-2 border-bottom mb-2 d-none" id="headerPerformanceCard">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-bold text-muted">ผลงานเดือนนี้</span>
                        <span class="badge bg-secondary" id="headerGradeDisplay">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small text-secondary">รายได้พิเศษ:</span>
                        <span class="small fw-bold text-primary" id="headerIncomeDisplay">฿0.00</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="small text-secondary">Ratio:</span>
                        <span class="small fw-bold text-success" id="headerRatioDisplay">0%</span>
                    </div>
                </li>
                <li>
                    <a class="dropdown-item rounded py-2 d-flex align-items-center" href="#" id="theme-switcher-btn">
                        <i class="fas fa-adjust fa-fw me-3 text-muted"></i> สลับธีมระบบ
                    </a>
                </li>
                <li>
                    <a class="dropdown-item text-danger fw-bold logout-action rounded py-2 mt-1 d-flex align-items-center" href="<?php echo defined('BASE_URL') ? BASE_URL : '/MES/MES'; ?>/auth/logout.php">
                        <i class="fas fa-sign-out-alt fa-fw me-3"></i> ออกจากระบบ
                    </a>
                </li>
            </ul>
        </div>
        <?php endif; ?>

    </div>
</header>

<?php include_once __DIR__ . '/nav_dropdown.php'; ?>

<script>
    // Script นาฬิกาและวันที่
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    function updateRealTimeClock() {
        const now = new Date();
        
        // อัปเดตเวลา
        const timeString = now.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const clockEl = document.getElementById('realTimeClock');
        if (clockEl) clockEl.textContent = timeString;

        // อัปเดตวันที่ (เผื่อกรณีเปิดทิ้งไว้ข้ามคืน)
        const dateString = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
        const dateEl = document.getElementById('realTimeDate');
        if (dateEl && dateEl.textContent !== dateString) {
            dateEl.textContent = dateString;
        }
    }
    setInterval(updateRealTimeClock, 1000);
    updateRealTimeClock();
    
    // ดึงข้อมูลผลงานพนักงาน
    document.addEventListener("DOMContentLoaded", function() {
        const baseUrl = '<?php echo defined("BASE_URL") ? BASE_URL : "/MES/MES"; ?>';
        const card = document.getElementById('headerPerformanceCard');
        if (!card) return;

        fetch(`${baseUrl}/page/manpower/api/api_my_performance.php`)
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data.has_data) {
                    card.classList.remove('d-none');
                    
                    // Grade
                    const gradeEl = document.getElementById('headerGradeDisplay');
                    const grade = json.data.grade;
                    gradeEl.textContent = grade;
                    
                    gradeEl.className = 'badge';
                    if (grade === 'A') gradeEl.classList.add('bg-success');
                    else if (grade === 'B') gradeEl.classList.add('bg-primary');
                    else if (grade === 'C') gradeEl.classList.add('bg-warning', 'text-dark');
                    else if (grade === 'D') gradeEl.classList.add('bg-danger');
                    else gradeEl.classList.add('bg-secondary');

                    // Income
                    document.getElementById('headerIncomeDisplay').textContent = '฿' + json.data.income_per_head.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    
                    // Ratio
                    document.getElementById('headerRatioDisplay').textContent = json.data.income_ratio.toFixed(1) + '%';
                }
            })
            .catch(err => console.error("Error fetching my performance:", err));
    });
</script>

<style>
    .profile-icon-hover:hover { color: var(--bs-body-color) !important; cursor: pointer; }
</style>