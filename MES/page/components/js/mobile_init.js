document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เชื่อมปุ่ม Theme-Switcher ในเมนู Off-canvas (มือถือ)
    const mobileThemeBtn = document.getElementById('theme-switcher-btn-mobile');
    const mainThemeBtn = document.getElementById('theme-switcher-btn'); // ปุ่มเดิมใน sidebar
    
    if (mobileThemeBtn && mainThemeBtn) {
        mobileThemeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // สั่งให้ปุ่มหลัก (ที่ซ่อนอยู่) ทำงาน
            mainThemeBtn.click(); 
        });
    }

    // 2. สร้างฟังก์ชัน manualLogout สำรองไว้ (ในกรณีที่ไฟล์ nav_dropdown.php ไม่ได้โหลด)
    if (typeof manualLogout !== 'function') {
        function manualLogout(event) {
            event.preventDefault();
            localStorage.removeItem('pdTableFilters');
            localStorage.removeItem('inventoryUIFilters');
            localStorage.removeItem('sidebarState');
            window.location.href = event.currentTarget.href;
        }
    }

    // ★★★ (3. เพิ่ม) โค้ดสำหรับปุ่ม Filter ใน productionUI.php ★★★
    const filterToggleBtn = document.getElementById('mobile-filter-toggle-btn');
    const stickyBar = document.querySelector('.sticky-bar'); // (หา .sticky-bar)
    
    if (filterToggleBtn && stickyBar) {
        filterToggleBtn.addEventListener('click', () => {
            // (สลับ class ที่ .sticky-bar)
            stickyBar.classList.toggle('filters-expanded'); 
            
            const btnSpan = filterToggleBtn.querySelector('span');
            const btnIcon = filterToggleBtn.querySelector('i');
            
            // (สลับข้อความและไอคอนบนปุ่ม)
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
    // ★★★ (จบส่วนที่เพิ่ม) ★★★

});