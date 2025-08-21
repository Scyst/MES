// script/sidebar.js
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebar && sidebarToggleBtn && sidebarOverlay) {
        // ฟังก์ชันสำหรับเปิด/ปิด Sidebar
        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        };

        // เมื่อกดปุ่ม "แฮมเบอร์เกอร์"
        sidebarToggleBtn.addEventListener('click', toggleSidebar);

        // เมื่อกดที่พื้นหลังสีดำ (Overlay)
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
});