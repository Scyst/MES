// js/mobile_init.js (ห้ามลบเด็ดขาด เพราะใช้ร่วมกันทั้ง Desktop และ Mobile โดยเฉพาะปุ่ม FAB)

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // 1. ระบบ LOGOUT (ใช้ร่วมกันทั้ง Desktop และ Mobile)
    // ============================================================
    const logoutButtons = document.querySelectorAll('.logout-action');
    if (logoutButtons.length > 0) {
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); 
                const keysToRemove = ['pdTableFilters', 'inventoryUIFilters', 'sidebarState'];
                keysToRemove.forEach(key => localStorage.removeItem(key));

                const targetUrl = btn.getAttribute('href');
                if (targetUrl) {
                    window.location.href = targetUrl;
                }
            });
        });
    }

    // ============================================================
    // 2. ระบบ THEME SWITCHER (Mobile Proxy)
    // ============================================================
    const mobileThemeBtn = document.getElementById('theme-switcher-btn-mobile');
    const mainThemeBtn = document.getElementById('theme-switcher-btn');
    
    if (mobileThemeBtn && mainThemeBtn) {
        mobileThemeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mainThemeBtn.click(); 
        });
    }

    // ============================================================
    // 3. ระบบ FILTER TOGGLE (Production UI)
    // ============================================================
    const filterToggleBtn = document.getElementById('mobile-filter-toggle-btn');
    const stickyBar = document.querySelector('.sticky-bar');
    
    if (filterToggleBtn && stickyBar) {
        filterToggleBtn.addEventListener('click', () => {
            const isExpanded = stickyBar.classList.toggle('filters-expanded'); 
            
            const btnSpan = filterToggleBtn.querySelector('span');
            const btnIcon = filterToggleBtn.querySelector('i');
            
            if (btnSpan) btnSpan.textContent = isExpanded ? 'Hide Filters' : 'Show Filters';
            
            if (btnIcon) {
                if (isExpanded) {
                    btnIcon.classList.replace('fa-filter', 'fa-chevron-up');
                } else {
                    btnIcon.classList.replace('fa-chevron-up', 'fa-filter');
                }
            }
        });
    }

    // ============================================================
    // 4. ระบบ FILTER TOGGLE (OEE Dashboard)
    // ============================================================
    const oeeFilterBtn = document.getElementById('oee-filter-toggle-btn');
    const oeeHeader = document.querySelector('.dashboard-header-sticky');

    if (oeeFilterBtn && oeeHeader) {
        oeeFilterBtn.addEventListener('click', () => {
            oeeHeader.classList.toggle('filters-expanded');
        });
    }

    // ============================================================
    // 5. ระบบจัดการปุ่มลอย (FAB) ให้สัมพันธ์กับ Modal (ป้องกันการเด้งทับ)
    // ============================================================
    
    // 5.1 เมื่อมี Modal ใดๆ กำลังจะถูกเปิด (ซ่อน FAB)
    document.addEventListener('show.bs.modal', function () {
        const fabs = document.querySelectorAll('.fab-container');
        fabs.forEach(fab => {
            fab.style.transition = 'opacity 0.2s, transform 0.2s';
            fab.style.opacity = '0';
            fab.style.transform = 'scale(0) translateY(20px)';
            fab.style.pointerEvents = 'none';
        });
    });

    // 5.2 เมื่อ Modal ใดๆ ถูกปิดลง 
    document.addEventListener('hidden.bs.modal', function () {
        // 🔥 [CRITICAL FIX]: ตรวจสอบว่ายังมี Modal อื่นเปิดค้างอยู่ (ซ้อนกัน) หรือไม่
        // ถ้า body ยังมี class 'modal-open' อยู่ แปลว่ามีการเปิด Modal อื่นรอไว้แล้ว ห้ามแสดง FAB กลับมาเด็ดขาด!
        if (document.body.classList.contains('modal-open')) {
            return; 
        }

        // ถ้าไม่มี Modal ไหนเปิดอยู่แล้ว ถึงจะอนุญาตให้โชว์ FAB กลับมา
        const fabs = document.querySelectorAll('.fab-container');
        fabs.forEach(fab => {
            if(window.getComputedStyle(fab).display !== 'none') {
                fab.style.opacity = '1';
                fab.style.transform = 'scale(1) translateY(0)';
                fab.style.pointerEvents = 'auto'; 
            }
        });
    });

});