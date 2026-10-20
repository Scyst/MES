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
            window.__mesSessionRedirecting = true;
            [
                'pdTableFilters',
                'inventoryUIFilters',
                'sidebarState',
                'mes_learning_current_user',
                'mes_learning_user_grading',
                'mes_learning_active_emp_id'
            ].forEach(key => localStorage.removeItem(key));
            try {
                localStorage.setItem('mes_auth_logout_ts', String(Date.now()));
                if (typeof BroadcastChannel !== 'undefined') {
                    const ch = new BroadcastChannel('mes_auth_channel');
                    ch.postMessage({ type: 'LOGOUT', ts: Date.now() });
                    ch.close();
                }
            } catch (_) {}
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
});

// ============================================================================
// REAL-TIME SESSION GUARD & GLOBAL HTTP 401 INTERCEPTOR (Event-Driven Sync)
// ============================================================================
(function initGlobalMesSessionGuard() {
    if (window.__mesSessionGuardInstalled) return;
    window.__mesSessionGuardInstalled = true;

    const rawFetch = window.fetch.bind(window);
    let isCheckingSession = false;

    function resolveMesBaseUrl() {
        if (window.MES_AUTH_CONFIG && window.MES_AUTH_CONFIG.baseUrl) {
            return window.MES_AUTH_CONFIG.baseUrl.replace(/\/+$/, '');
        }
        if (window.location.pathname.includes('/page/')) {
            return window.location.pathname.split('/page/')[0];
        }
        return '/MES/MES';
    }

    function clearClientAuthStorage() {
        [
            'pdTableFilters',
            'inventoryUIFilters',
            'mes_learning_current_user',
            'mes_learning_user_grading',
            'mes_learning_active_emp_id'
        ].forEach(key => {
            try { localStorage.removeItem(key); } catch (_) {}
        });
    }

    window.__mesTriggerSessionLogout = function triggerSessionLogout(broadcast = true) {
        if (window.__mesSessionRedirecting) return;

        const cfg = window.MES_AUTH_CONFIG || {};
        // If page allows guest access and was already loaded as guest, do nothing
        if (cfg.allowGuest && !cfg.isAuthenticated) {
            return;
        }

        window.__mesSessionRedirecting = true;
        clearClientAuthStorage();

        if (broadcast) {
            try {
                localStorage.setItem('mes_auth_logout_ts', String(Date.now()));
                if (typeof BroadcastChannel !== 'undefined') {
                    const ch = new BroadcastChannel('mes_auth_channel');
                    ch.postMessage({ type: 'LOGOUT', ts: Date.now() });
                    ch.close();
                }
            } catch (_) {}
        }

        // If page supports Guest Mode (e.g. OEE_Shopfloor) and was loaded while logged in, reload into Guest state
        if (cfg.allowGuest && cfg.isAuthenticated) {
            window.location.reload();
            return;
        }

        const baseUrl = resolveMesBaseUrl();
        const redirectTarget = encodeURIComponent(window.location.href);
        window.location.replace(`${baseUrl}/auth/login_form.php?redirect=${redirectTarget}`);
    };

    async function verifyMesSessionLive() {
        if (window.__mesSessionRedirecting || isCheckingSession) return;
        const cfg = window.MES_AUTH_CONFIG || {};
        if (cfg.allowGuest && !cfg.isAuthenticated) return;

        isCheckingSession = true;
        try {
            const baseUrl = resolveMesBaseUrl();
            const res = await rawFetch(`${baseUrl}/auth/api_verify.php?silent=1&_t=${Date.now()}`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (res.status === 401 || (res.redirected && res.url && res.url.includes('login_form.php'))) {
                window.__mesTriggerSessionLogout(true);
                return;
            }

            if (res.ok) {
                const json = await res.json().catch(() => null);
                if (json && (json.authenticated === false || json.success === false)) {
                    window.__mesTriggerSessionLogout(true);
                }
            }
        } catch (_) {
            // Ignore transient network errors when offline
        } finally {
            isCheckingSession = false;
        }
    }

    // 1. Instant Cross-Tab Logout Sync via Storage & BroadcastChannel
    window.addEventListener('storage', (e) => {
        if (e.key === 'mes_auth_logout_ts' && e.newValue) {
            window.__mesTriggerSessionLogout(false);
        }
    });

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const authChannel = new BroadcastChannel('mes_auth_channel');
            authChannel.addEventListener('message', (e) => {
                if (e.data && e.data.type === 'LOGOUT') {
                    window.__mesTriggerSessionLogout(false);
                }
            });
        } catch (_) {}
    }

    // 2. Instant Session Check on Tab Focus, Visibility Change & BFCache Restore
    window.addEventListener('focus', verifyMesSessionLive);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            verifyMesSessionLive();
        }
    });
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            verifyMesSessionLive();
        }
    });

    // 3. Lightweight Heartbeat while page is open & visible (every 45s)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            verifyMesSessionLive();
        }
    }, 45000);

    // 4. Global Fetch Interceptor for HTTP 401 & Login Redirects
    window.fetch = async function(input, init) {
        try {
            const response = await rawFetch(input, init);

            const isLoginRedirect = response.redirected && response.url && response.url.includes('login_form.php');
            if (response.status === 401 || isLoginRedirect) {
                window.__mesTriggerSessionLogout(true);
                const authErr = new Error('เซสชันหมดอายุ กำลังนำทางไปยังหน้าเข้าสู่ระบบ...');
                authErr.isSessionExpired = true;
                return Promise.reject(authErr);
            }

            if (response.status === 500) {
                if (typeof Swal !== 'undefined' && !window.__mesSessionRedirecting) {
                    Swal.fire({
                        icon: 'error',
                        title: 'System Error',
                        text: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่หรือติดต่อ IT',
                        confirmButtonText: 'ปิด'
                    });
                }
                const srvErr = new Error('Server Error 500');
                return Promise.reject(srvErr);
            }

            return response;
        } catch (error) {
            if (error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error('Network or CORS error:', error);
            }
            throw error;
        }
    };
})();