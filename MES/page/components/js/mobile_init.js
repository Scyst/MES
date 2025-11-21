// ตำแหน่ง: js/mobile_init.js (หรือ path ที่คุณเก็บไฟล์นี้)

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // 1. ระบบ LOGOUT (ใช้ร่วมกันทั้ง Desktop และ Mobile)
    // ============================================================
    // ดักจับทุกปุ่มที่มีคลาส .logout-action
    const logoutButtons = document.querySelectorAll('.logout-action');

    if (logoutButtons.length > 0) {
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // หยุดการเปลี่ยนหน้าปกติไว้ก่อน

                // ล้างค่า LocalStorage ที่กำหนด
                const keysToRemove = ['pdTableFilters', 'inventoryUIFilters', 'sidebarState'];
                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Redirect ไปยัง URL ปลายทาง (logout.php)
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
    // เมื่อกดปุ่มในมือถือ -> ไปสั่งให้ปุ่มหลัก (Desktop) ทำงานแทน
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
});