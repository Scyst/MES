document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เชื่อมปุ่ม Theme-Switcher ในเมนู Off-canvas (มือถือ)
    const mobileThemeBtn = document.getElementById('theme-switcher-btn-mobile');
    const mainThemeBtn = document.getElementById('theme-switcher-btn');
    
    if (mobileThemeBtn && mainThemeBtn) {
        mobileThemeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mainThemeBtn.click(); 
        });
    }

    // 2. สร้างฟังก์ชัน manualLogout สำรองไว้
    if (typeof manualLogout !== 'function') {
        function manualLogout(event) {
            event.preventDefault();
            localStorage.removeItem('pdTableFilters');
            localStorage.removeItem('inventoryUIFilters');
            localStorage.removeItem('sidebarState');
            window.location.href = event.currentTarget.href;
        }
    }

    // 3. โค้ดสำหรับปุ่ม Filter ใน productionUI.php
    const filterToggleBtn = document.getElementById('mobile-filter-toggle-btn');
    const stickyBar = document.querySelector('.sticky-bar');
    
    if (filterToggleBtn && stickyBar) {
        filterToggleBtn.addEventListener('click', () => {
            stickyBar.classList.toggle('filters-expanded'); 
            
            const btnSpan = filterToggleBtn.querySelector('span');
            const btnIcon = filterToggleBtn.querySelector('i');
            
            if (stickyBar.classList.contains('filters-expanded')) {
                btnSpan.textContent = 'Hide Filters';
                btnIcon.classList.remove('fa-filter');
                btnIcon.classList.add('fa-chevron-up');
            } else {
                btnSpan.textContent = 'Show Filters';
                btnIcon.classList.remove('fa-chevron-up');
                btnIcon.classList.add('fa-filter');
            }
        });
    }
    const oeeFilterBtn = document.getElementById('oee-filter-toggle-btn');
    const oeeHeader = document.querySelector('.dashboard-header-sticky');

    if (oeeFilterBtn && oeeHeader) {
        oeeFilterBtn.addEventListener('click', () => {
            // (สลับ class ที่ตัว <header> เอง)
            oeeHeader.classList.toggle('filters-expanded');
        });

        // (ทำให้ปุ่ม "Show Filters" ของหน้า Production (ถ้ามี) ทำงานด้วย)
        // (เผื่อในอนาคตคุณอยากให้มันซ่อนเหมือนกัน)
        // oeeHeader.classList.add('filters-expanded'); // (Default to expanded)
    }
});