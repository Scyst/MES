document.addEventListener('DOMContentLoaded', () => {
    const rightSidebar = document.getElementById('right-sidebar');
    const toggleButton = document.getElementById('toggle-right-sidebar'); // เราจะสร้างปุ่มนี้ในขั้นตอนต่อไป

    if (!rightSidebar || !toggleButton) return;

    // สร้าง Overlay สำหรับปิด sidebar
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function openSidebar() {
        rightSidebar.classList.add('open');
        document.body.classList.add('right-sidebar-open');
        overlay.style.display = 'block';
    }

    function closeSidebar() {
        rightSidebar.classList.remove('open');
        document.body.classList.remove('right-sidebar-open');
        overlay.style.display = 'none';
    }

    toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = rightSidebar.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
    
    overlay.addEventListener('click', closeSidebar);
});