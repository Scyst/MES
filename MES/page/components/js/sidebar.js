// MES/page/components/js/sidebar.js

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // PART 1: Desktop Sidebar Logic
    // ============================================================
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn'); // ตัวนี้อาจจะหาไม่เจอ (null) เพราะเราลบออกแล้ว
    const storageKey = 'sidebarState';

    if (sidebar) {
        // ฟังก์ชันสำหรับตั้งค่าสถานะ (หุบ/ขยาย)
        const setSidebarState = (state) => {
            sidebar.setAttribute('data-state', state);
            localStorage.setItem(storageKey, state);
        };

        // ถ้ามีปุ่ม (แบบเดิม) ให้โหลดสถานะล่าสุดจาก LocalStorage
        if (sidebarToggleBtn) {
            const initialState = localStorage.getItem(storageKey) || 'collapsed';
            setSidebarState(initialState);

            sidebarToggleBtn.addEventListener('click', () => {
                const currentState = sidebar.getAttribute('data-state');
                const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
                setSidebarState(newState);
            });
        } else {
            // ★ ถ้าไม่มีปุ่ม (แบบใหม่) ให้บังคับเป็น 'collapsed' เสมอ เพื่อให้ Hover ทำงานได้
            // และป้องกันกรณี LocalStorage จำค่า 'expanded' ไว้จน Sidebar กางค้างปิดไม่ได้
            setSidebarState('collapsed');
        }

        // ขยายชั่วคราวเมื่อ Hover (ทำงานได้เสมอไม่ว่าจะมีปุ่มหรือไม่)
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

// ============================================================
// 6. ระบบ LIVE MENU SEARCH (กรองเมนูแบบ Real-time)
// ============================================================
const initMenuSearch = (inputId, itemSelector) => {
    const searchInput = document.getElementById(inputId);
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase().trim();
        const menuItems = document.querySelectorAll(itemSelector);

        menuItems.forEach(item => {
            // ข้ามการซ่อนช่องค้นหาตัวเอง และเส้นแบ่ง (Divider)
            if (item.querySelector('input') || item.tagName === 'HR' || item.classList.contains('dropdown-divider')) {
                return;
            }

            // ค้นหาจาก text ภายในเมนู
            const text = item.textContent.toLowerCase();
            
            // ถ้ายกเลิกการค้นหา (ว่างเปล่า) หรือ ค้นหาเจอ ให้แสดงผล
            if (term === '' || text.includes(term)) {
                item.style.display = '';
                item.classList.remove('d-none'); // เผื่อมีการใช้ class ของ bootstrap
            } else {
                // ถ้าค้นหาไม่เจอ ให้ซ่อน
                item.style.display = 'none';
                item.classList.add('d-none');
            }
        });
    });
};

// เปิดใช้งานทั้ง 2 จุด
initMenuSearch('desktopMenuSearch', '.custom-dropdown li');
initMenuSearch('mobileMenuSearch', '#globalMobileMenu .list-group-item');