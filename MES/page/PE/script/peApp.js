// peApp.js — PE Enterprise Core Application Controller
const PEApp = (() => {
    let currentTab = 'machines';
    let sidebarCollapsed = false;
    const tabConfig = {
        machines:    { title: 'Machine Registry',   breadcrumb: 'Machines',    icon: 'fas fa-industry',        loader: () => MachineModule.loadData() },
        workorders:  { title: 'Work Orders',        breadcrumb: 'Work Orders', icon: 'fas fa-clipboard-list',   loader: () => WorkOrderModule.loadData() },
        downtime:    { title: 'Downtime Tracker',   breadcrumb: 'Downtime',    icon: 'fas fa-clock',            loader: () => DowntimeModule.loadData() },
        spareparts:  { title: 'Spare Parts',        breadcrumb: 'Spare Parts', icon: 'fas fa-boxes-stacked',    loader: () => SparePartsModule.loadData() },
        analytics:   { title: 'Analytics Dashboard', breadcrumb: 'Dashboard',  icon: 'fas fa-chart-line',       loader: () => AnalyticsModule.loadAll() },
        iiot:        { title: 'Live IIoT Monitor',   breadcrumb: 'Live IIoT',  icon: 'fas fa-satellite-dish',   loader: () => IIoTModule.init() },
        iiot_oee:    { title: 'IIoT OEE Dashboard',  breadcrumb: 'IIoT OEE',   icon: 'fas fa-chart-pie',        loader: () => IIoTOeeModule.loadData() },
        production_overview: { title: 'Production Overview', breadcrumb: 'Production Overview', icon: 'fas fa-layer-group', loader: () => ProductionOverviewModule.fetchData() },
        machine_timeline:    { title: 'Machine Timeline', breadcrumb: 'Machine Timeline', icon: 'fas fa-stream', loader: () => MachineTimelineModule.fetchData() }
    };
    const loadedTabs = new Set();

    function switchTab(tabName) {
        if (!tabConfig[tabName]) return;
        currentTab = tabName;

        // Dispatch event for modules to hook into
        document.dispatchEvent(new CustomEvent('peTabChanged', { detail: { tab: tabName } }));

        // Update nav active state
        document.querySelectorAll('.pe-nav-item[data-tab]').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Show/hide panels
        document.querySelectorAll('.pe-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tabName}`);
        });

        // Update topbar
        const cfg = tabConfig[tabName];
        document.getElementById('topbarTitle').textContent = cfg.title;
        document.getElementById('topbarBreadcrumb').textContent = cfg.breadcrumb;

        // Load data if first time
        if (!loadedTabs.has(tabName)) {
            loadedTabs.add(tabName);
            cfg.loader();
        }

        // Close mobile sidebar
        toggleSidebar(false);
    }

    function refreshCurrentTab() {
        const cfg = tabConfig[currentTab];
        if (cfg) cfg.loader();
    }

    function toggleSidebar(forceOpen) {
        const sidebar = document.getElementById('peSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const icon = document.getElementById('sidebarToggleIcon');
        const isMobile = window.innerWidth <= 991;

        if (isMobile) {
            if (forceOpen === true) {
                sidebar.classList.add('mobile-open');
                overlay.classList.add('show');
            } else if (forceOpen === false) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
            } else {
                sidebar.classList.toggle('mobile-open');
                overlay.classList.toggle('show');
            }
        } else {
            if (forceOpen !== undefined && typeof forceOpen === 'boolean') return;
            sidebarCollapsed = !sidebarCollapsed;
            sidebar.classList.toggle('collapsed', sidebarCollapsed);
            if (icon) {
                icon.className = sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            }
        }
    }

    // API helper
    async function apiCall(endpoint, params = {}, method = 'GET', body = null) {
        let url = PE_CONFIG.apiBase + endpoint;
        if (method === 'GET' && Object.keys(params).length) {
            url += '?' + new URLSearchParams(params).toString();
        }

        const options = {
            method,
            headers: {}
        };

        if (method !== 'GET' && body) {
            options.headers['Content-Type'] = 'application/json';
            options.headers['X-CSRF-TOKEN'] = PE_CONFIG.csrfToken;
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        const json = await res.json();
        if (!json.success) {
            if (json.message === 'CSRF token validation failed.' || json.message?.includes('CSRF')) {
                showToast('เซสชันมีปัญหาหรือหมดอายุ ระบบกำลังรีเฟรชหน้าจอ...', 'warning');
                setTimeout(() => window.location.reload(), 1500);
                return new Promise(() => {}); // prevent further execution
            }
            throw new Error(json.message || 'API Error');
        }
        return json;
    }

    async function uploadFile(file, prefix = 'IMG') {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('prefix', prefix);

        const res = await fetch(PE_CONFIG.apiBase + 'uploadAPI.php', {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRF-TOKEN': PE_CONFIG.csrfToken }
        });
        const json = await res.json();
        if (!json.success) {
            if (json.message === 'CSRF token validation failed.' || json.message?.includes('CSRF')) {
                showToast('เซสชันมีปัญหาหรือหมดอายุ ระบบกำลังรีเฟรชหน้าจอ...', 'warning');
                setTimeout(() => window.location.reload(), 1500);
                return new Promise(() => {});
            }
            throw new Error(json.message || 'Upload Error');
        }
        return json.path;
    }

    function showToast(message, type = 'success') {
        if (typeof Swal === 'undefined') { alert(message); return; }
        Swal.mixin({
            toast: true, position: 'top-end',
            showConfirmButton: false, timer: 3000, timerProgressBar: true,
            didOpen: (t) => { t.addEventListener('mouseenter', Swal.stopTimer); t.addEventListener('mouseleave', Swal.resumeTimer); }
        }).fire({ icon: type, title: message });
    }

    function showConfirm(title, text) {
        return Swal.fire({
            title, text, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b', confirmButtonText: 'Confirm', cancelButtonText: 'Cancel'
        });
    }

    function showModal(id) {
        const el = document.getElementById(id);
        if (el) bootstrap.Modal.getOrCreateInstance(el).show();
    }

    function hideModal(id) {
        const el = document.getElementById(id);
        if (el) bootstrap.Modal.getInstance(el)?.hide();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
             + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function formatTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function formatNumber(num, decimals = 0) {
        return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function formatCurrency(num) {
        return '฿' + formatNumber(num, 2);
    }

    function getStatusBadge(status) {
        const map = {
            'Open': 'pe-badge-open', 'Assigned': 'pe-badge-assigned',
            'In Progress': 'pe-badge-progress', 'Completed': 'pe-badge-completed',
            'Cancelled': 'pe-badge-cancelled', 'Pending': 'pe-badge-open'
        };
        return `<span class="pe-badge ${map[status] || 'pe-badge-open'}">${status}</span>`;
    }

    function getPriorityBadge(priority) {
        const map = {
            'Critical': 'pe-priority-critical', 'High': 'pe-priority-high',
            'Normal': 'pe-priority-normal', 'Low': 'pe-priority-low'
        };
        return `<span class="pe-badge ${map[priority] || 'pe-priority-normal'}">${priority}</span>`;
    }

    function getMachineStatusBadge(status) {
        const map = {
            'Active': 'pe-status-active', 'Inactive': 'pe-status-inactive', 'Under Repair': 'pe-status-repair'
        };
        return `<span class="pe-badge ${map[status] || 'pe-status-active'}">${status}</span>`;
    }

    function getCriticalityBadge(crit) {
        const map = {
            'Critical': 'pe-crit-critical', 'High': 'pe-crit-high',
            'Medium': 'pe-crit-medium', 'Low': 'pe-crit-low'
        };
        return `<span class="pe-badge ${map[crit] || 'pe-crit-medium'}">${crit}</span>`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function animateValue(el, start, end, duration = 600) {
        if (!el) return;
        const range = end - start;
        const startTime = performance.now();

        function step(timestamp) {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + range * eased);
            el.textContent = formatNumber(current);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize default tab
        switchTab('workorders');
    });

    return {
        switchTab, refreshCurrentTab, toggleSidebar,
        apiCall, uploadFile, showToast, showConfirm, showModal, hideModal,
        formatDate, formatDateTime, formatTime, formatNumber, formatCurrency,
        getStatusBadge, getPriorityBadge, getMachineStatusBadge, getCriticalityBadge,
        escapeHtml, animateValue,
        get currentTab() { return currentTab; }
    };
})();
