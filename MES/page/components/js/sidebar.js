// MES/page/components/js/sidebar.js

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // PART 1: Desktop Sidebar Logic (จัดการการยืด/หดของ Sidebar หลัก)
    // ============================================================
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const storageKey = 'sidebarState';

    if (sidebar && sidebarToggleBtn) {
        // ฟังก์ชันสำหรับตั้งค่าสถานะ (หุบ/ขยาย)
        const setSidebarState = (state) => {
            sidebar.setAttribute('data-state', state);
            localStorage.setItem(storageKey, state);
        };

        // โหลดสถานะที่บันทึกไว้ หรือใช้ 'collapsed' เป็นค่าเริ่มต้น
        const initialState = localStorage.getItem(storageKey) || 'collapsed';
        setSidebarState(initialState);

        // เมื่อกดปุ่ม "แฮมเบอร์เกอร์" (Desktop)
        sidebarToggleBtn.addEventListener('click', () => {
            const currentState = sidebar.getAttribute('data-state');
            const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
            setSidebarState(newState);
        });

        // ขยายชั่วคราวเมื่อ Hover (เฉพาะตอนที่หุบอยู่)
        sidebar.addEventListener('mouseenter', () => {
            if (sidebar.getAttribute('data-state') === 'collapsed') {
                sidebar.classList.add('hover-expand');
            }
        });

        sidebar.addEventListener('mouseleave', () => {
            sidebar.classList.remove('hover-expand');
        });
    }

    // ============================================================
    // PART 2: Mobile Menu Logic (จัดการปุ่มบน Top Header)
    // ============================================================
    const mobileToggleBtn = document.getElementById('sidebar-toggle-mobile-top');
    
    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // ป้องกัน event ชนกัน
            
            const mobileMenuEl = document.getElementById('globalMobileMenu');
            if (mobileMenuEl) {
                // เรียกใช้ Bootstrap Offcanvas API เพื่อเปิดเมนู
                const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(mobileMenuEl);
                bsOffcanvas.toggle();
            } else {
                console.warn("Global mobile menu element (#globalMobileMenu) not found!");
            }
        });
    }
});