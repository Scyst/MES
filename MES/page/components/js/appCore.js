document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.setAttribute('data-state', 'collapsed');

        sidebar.addEventListener('mouseenter', () => {
            if (sidebar.getAttribute('data-state') === 'collapsed') {
                sidebar.classList.add('hover-expand');
            }
        });

        sidebar.addEventListener('mouseleave', () => {
            sidebar.classList.remove('hover-expand');
        });

        // Auto-Active Menu & Accordion Expand
        const currentPath = window.location.pathname;
        const allMenuLinks = document.querySelectorAll('#sidebar a.dropdown-item-icon, #globalMobileMenu a.list-group-item');
        
        allMenuLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            const cleanHref = href.replace('../', '').replace('./', '');
            
            if (currentPath.includes(cleanHref)) {
                link.classList.add('active');
                
                const parentCollapse = link.closest('.collapse');
                if (parentCollapse) {
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(parentCollapse, { toggle: false });
                    bsCollapse.show();
                    
                    const toggleBtn = document.querySelector(`[data-bs-toggle="collapse"][href="#${parentCollapse.id}"] i.fa-chevron-down`);
                    if (toggleBtn) toggleBtn.style.transform = 'rotate(180deg)';
                }
            }
        });

        // Accordion Arrow Animation
        document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                const icon = e.currentTarget.querySelector('i.fa-chevron-down');
                if (icon) {
                    const isClosing = e.currentTarget.getAttribute('aria-expanded') === 'true';
                    icon.style.transition = 'transform 0.3s ease';
                    icon.style.transform = isClosing ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        });
    }

    // Live Menu Search
    const initMenuSearch = (inputId, containerId, itemSelector) => {
        const searchInput = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        if (!searchInput || !container) return;

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const items = container.querySelectorAll(itemSelector);

            items.forEach(item => {
                if (item.querySelector('input') || item.tagName === 'HR' || item.classList.contains('dropdown-divider')) return;

                const text = item.textContent.toLowerCase();
                const isMatch = term === '' || text.includes(term);
                
                item.style.display = isMatch ? '' : 'none';

                if (isMatch && term !== '') {
                    const parentCollapse = item.closest('.collapse');
                    if (parentCollapse) {
                        bootstrap.Collapse.getOrCreateInstance(parentCollapse).show();
                    }
                }
            });
        });
    };

    initMenuSearch('desktopMenuSearch', 'desktopAccordionMenu', 'li');
    initMenuSearch('mobileMenuSearch', 'mobileAccordionMenu', '.list-group-item');

    // Global Actions
    document.querySelectorAll('.logout-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); 
            ['pdTableFilters', 'inventoryUIFilters', 'sidebarState'].forEach(key => localStorage.removeItem(key));
            window.location.href = btn.getAttribute('href');
        });
    });

    const mobileThemeBtn = document.getElementById('theme-switcher-btn-mobile');
    const mainThemeBtn = document.getElementById('theme-switcher-btn');
    if (mobileThemeBtn && mainThemeBtn) {
        mobileThemeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mainThemeBtn.click(); 
        });
    }

    document.addEventListener('show.bs.modal', () => {
        document.querySelectorAll('.fab-container').forEach(fab => {
            fab.style.opacity = '0';
            fab.style.pointerEvents = 'none';
        });
    });

    document.addEventListener('hidden.bs.modal', () => {
        if (document.body.classList.contains('modal-open')) return;
        document.querySelectorAll('.fab-container').forEach(fab => {
            fab.style.opacity = '1';
            fab.style.pointerEvents = 'auto'; 
        });
    });

    const mobileToggle = document.getElementById('sidebar-toggle-mobile-top');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const el = document.getElementById('globalMobileMenu');
            if (el) bootstrap.Offcanvas.getOrCreateInstance(el).toggle();
        });
    }

    const originalFetch = window.fetch;
    window.fetch = async function() {
        try {
            const response = await originalFetch.apply(this, arguments);
            
            if (response.status === 401) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'เซสชั่นหมดอายุ',
                        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อความปลอดภัย',
                        confirmButtonText: 'ตกลง',
                        allowOutsideClick: false
                    }).then(() => {
                        window.location.href = '../../auth/logout.php';
                    });
                } else {
                    window.location.href = '../../auth/logout.php';
                }
                return Promise.reject('Unauthorized 401');
            }

            if (response.status === 500) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'System Error',
                        text: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่หรือติดต่อ IT',
                        confirmButtonText: 'ปิด'
                    });
                }
                return Promise.reject('Server Error 500'); 
            }

            return response;
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error('Network or CORS error:', error);
            }
            throw error;
        }
    };
});