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
            <a class="nav-link dropdown-toggle text-secondary d-flex align-items-center" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle fa-lg me-2 profile-icon-hover" style="transition: color 0.2s;"></i> 
                <span class="d-none d-md-inline small fw-bold">
                    <?php echo htmlspecialchars($fullName); ?>
                </span>
                <span id="topHeaderQuickGrade" class="badge ms-2 d-none" style="font-size: 0.7rem; border: 1px solid rgba(0,0,0,0.1);"></span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border border-light mt-2 p-2" style="min-width: 280px; border-radius: 12px;">
                <li class="text-center p-3 border-bottom mb-2 bg-light rounded">
                    <i class="fas fa-user-circle fa-3x text-secondary mb-2"></i>
                    <h6 class="mb-0 fw-bold text-dark"><?php echo htmlspecialchars($fullName); ?></h6>
                    <small class="text-muted text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;"><?php echo htmlspecialchars($userRole); ?></small>
                </li>
                <!-- Performance Summary -->
                <li class="px-3 py-2 border-bottom mb-2 d-none" id="headerPerformanceCard">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-bold text-muted">เกรดประเมิน:</span>
                        <span class="badge bg-secondary" id="headerGradeDisplay">รอประเมิน</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small text-secondary">ค่าผลงาน:</span>
                        <span class="small fw-bold text-primary" id="headerIncomeDisplay">฿0.00</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="small text-secondary">Ratio:</span>
                        <span class="small fw-bold text-success" id="headerRatioDisplay">0.00</span>
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
        <?php else: ?>
        <a href="<?php echo defined('BASE_URL') ? BASE_URL : '/MES/MES'; ?>/auth/login.php" class="btn btn-primary btn-sm rounded-pill px-3">เข้าสู่ระบบ</a>
        <?php endif; ?>
    </div>
</header>

<?php include_once __DIR__ . '/nav_dropdown.php'; ?>

<style>
.portal-top-header {
    background-color: var(--bs-body-bg, #fff);
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    position: sticky;
    top: 0;
    z-index: 1030;
}
.header-logo-box {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.profile-icon-hover:hover {
    color: var(--bs-primary) !important;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    function updateClock() {
        const now = new Date();
        document.getElementById('realTimeClock').textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Fetch Performance Data
    <?php if (isset($_SESSION['user']['emp_id'])): ?>
    setTimeout(() => {
        fetch('<?php echo defined('BASE_URL') ? BASE_URL : '/MES/MES'; ?>/page/manpower/api/api_my_performance.php')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    const card = document.getElementById('headerPerformanceCard');
                    const mobileCard = document.getElementById('mobilePerformanceCard');
                    
                    if (card) {
                        card.classList.remove('d-none');
                    }
                    if (mobileCard) {
                        mobileCard.classList.remove('d-none');
                    }
                    
                    if (json.data.has_data) {
                        let grade = json.data.grade;
                        const gradeEl = document.getElementById('headerGradeDisplay');
                        const mobileGradeEl = document.getElementById('mobileHeaderGradeDisplay');
                        const quickBadge = document.getElementById('topHeaderQuickGrade');
                        
                        let isSystemGrade = false;
                        if (!grade || grade === '-' || grade === 'N/A') {
                            if (json.data.system_grade && json.data.system_grade !== 'N/A') {
                                grade = json.data.system_grade;
                                isSystemGrade = true;
                            }
                        }
                        
                        if (gradeEl) gradeEl.className = 'badge';
                        if (mobileGradeEl) mobileGradeEl.className = 'badge';
                        
                        if (grade && grade !== '-' && grade !== 'N/A') {
                            const gradeText = grade + (isSystemGrade ? ' (คาดการณ์)' : '');
                            if (gradeEl) gradeEl.textContent = gradeText;
                            if (mobileGradeEl) mobileGradeEl.textContent = gradeText;
                            
                            if (quickBadge) {
                                quickBadge.classList.remove('d-none');
                                quickBadge.textContent = 'เกรด: ' + grade + (isSystemGrade ? '*' : '');
                                quickBadge.className = 'badge ms-2';
                            }
                            
                            // Desktop Colors
                            if (gradeEl && quickBadge) {
                                if (grade === 'A') {
                                    gradeEl.classList.add('bg-success');
                                    quickBadge.classList.add('bg-success');
                                } else if (grade === 'B') {
                                    gradeEl.classList.add('bg-primary');
                                    quickBadge.classList.add('bg-primary');
                                } else if (grade === 'C') {
                                    gradeEl.classList.add('bg-warning', 'text-dark');
                                    quickBadge.classList.add('bg-warning', 'text-dark');
                                } else if (grade === 'D') {
                                    gradeEl.classList.add('bg-danger');
                                    quickBadge.classList.add('bg-danger');
                                } else {
                                    gradeEl.classList.add('bg-secondary');
                                    quickBadge.classList.add('bg-secondary');
                                }
                            }
                            
                            // Mobile Colors
                            if (mobileGradeEl) {
                                if (grade === 'A') mobileGradeEl.classList.add('bg-success');
                                else if (grade === 'B') mobileGradeEl.classList.add('bg-primary');
                                else if (grade === 'C') mobileGradeEl.classList.add('bg-warning', 'text-dark');
                                else if (grade === 'D') mobileGradeEl.classList.add('bg-danger');
                                else mobileGradeEl.classList.add('bg-secondary');
                            }
                            
                        } else {
                            if (gradeEl) {
                                gradeEl.textContent = 'รอประเมิน';
                                gradeEl.classList.add('bg-secondary');
                            }
                            if (mobileGradeEl) {
                                mobileGradeEl.textContent = 'รอประเมิน';
                                mobileGradeEl.classList.add('bg-secondary');
                            }
                            if (quickBadge) quickBadge.classList.add('d-none');
                        }

                        // Income
                        const formattedIncome = '฿' + json.data.income_per_head.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        const incomeEl = document.getElementById('headerIncomeDisplay');
                        const mobileIncomeEl = document.getElementById('mobileHeaderIncomeDisplay');
                        if (incomeEl) incomeEl.textContent = formattedIncome;
                        if (mobileIncomeEl) mobileIncomeEl.textContent = formattedIncome;
                        
                        // Ratio
                        const formattedRatio = json.data.income_ratio.toFixed(2);
                        const ratioEl = document.getElementById('headerRatioDisplay');
                        const mobileRatioEl = document.getElementById('mobileHeaderRatioDisplay');
                        if (ratioEl) ratioEl.textContent = formattedRatio;
                        if (mobileRatioEl) mobileRatioEl.textContent = formattedRatio;
                        
                    } else {
                        // No Data Desktop
                        const gradeEl = document.getElementById('headerGradeDisplay');
                        const incomeEl = document.getElementById('headerIncomeDisplay');
                        const ratioEl = document.getElementById('headerRatioDisplay');
                        const quickBadge = document.getElementById('topHeaderQuickGrade');
                        
                        if (gradeEl) gradeEl.textContent = 'รอประเมิน';
                        if (incomeEl) {
                            incomeEl.textContent = 'ไม่มีข้อมูล';
                            incomeEl.classList.replace('text-primary', 'text-muted');
                        }
                        if (ratioEl) {
                            ratioEl.textContent = '-';
                            ratioEl.classList.replace('text-success', 'text-muted');
                        }
                        if (quickBadge) quickBadge.classList.add('d-none');
                        
                        // No Data Mobile
                        const mobileGradeEl = document.getElementById('mobileHeaderGradeDisplay');
                        const mobileIncomeEl = document.getElementById('mobileHeaderIncomeDisplay');
                        const mobileRatioEl = document.getElementById('mobileHeaderRatioDisplay');
                        
                        if (mobileGradeEl) mobileGradeEl.textContent = 'รอประเมิน';
                        if (mobileIncomeEl) {
                            mobileIncomeEl.textContent = 'ไม่มีข้อมูล';
                            mobileIncomeEl.classList.replace('text-primary', 'text-muted');
                        }
                        if (mobileRatioEl) {
                            mobileRatioEl.textContent = '-';
                            mobileRatioEl.classList.replace('text-success', 'text-muted');
                        }
                    }
                }
            })
            .catch(err => console.error("Error fetching my performance:", err));
    }, 1000); // slight delay
    <?php endif; ?>
});
</script>

<style>
    .profile-icon-hover:hover { color: var(--bs-body-color) !important; cursor: pointer; }
</style>