// MES/page/components/js/sidebar.js
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const mainContent = document.getElementById('main-content');
    const storageKey = 'sidebarState';

    if (!sidebar || !sidebarToggleBtn || !mainContent) return;

    // ฟังก์ชันสำหรับตั้งค่าสถานะ (หุบ/ขยาย)
    const setSidebarState = (state) => {
        sidebar.setAttribute('data-state', state);
        localStorage.setItem(storageKey, state);
    };

    // โหลดสถานะที่บันทึกไว้ หรือใช้ 'collapsed' เป็นค่าเริ่มต้น
    const initialState = localStorage.getItem(storageKey) || 'collapsed';
    setSidebarState(initialState);

    // เมื่อกดปุ่ม "แฮมเบอร์เกอร์"
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
});