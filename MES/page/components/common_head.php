<?php
    // MES/page/components/common_head.php
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    require_once __DIR__ . '/php/i18n.php';

    if (!defined('BASE_URL')) {
        $configFile = __DIR__ . '/../../config/config.php';
        if (file_exists($configFile)) {
            require_once $configFile;
        }
    }

    if (!function_exists('getMesBaseUrl')) {
        function getMesBaseUrl(): string {
            if (defined('BASE_URL') && !empty(BASE_URL)) {
                return rtrim(BASE_URL, '/');
            }
            if (isset($_SERVER['SCRIPT_NAME'])) {
                if (strpos($_SERVER['SCRIPT_NAME'], '/page/') !== false) {
                    return explode('/page/', $_SERVER['SCRIPT_NAME'])[0];
                }
                if (strpos($_SERVER['SCRIPT_NAME'], '/auth/') !== false) {
                    return explode('/auth/', $_SERVER['SCRIPT_NAME'])[0];
                }
            }
            return '/iot-toolbox/sandbox-b9/MES/MES';
        }
    }
?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">

<title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) : 'TOOLBOX OS'; ?></title>

<script>
    (function() {
        const storedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = storedTheme ? storedTheme : (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-bs-theme', theme);
    })();

    // Global Auth & Session Sync Metadata
    window.MES_AUTH_CONFIG = {
        isAuthenticated: <?php echo !empty($_SESSION['user']) ? 'true' : 'false'; ?>,
        allowGuest: <?php echo (defined('ALLOW_GUEST_ACCESS') && ALLOW_GUEST_ACCESS) ? 'true' : 'false'; ?>,
        userId: <?php echo json_encode($_SESSION['user']['id'] ?? null); ?>,
        baseUrl: <?php echo json_encode(getMesBaseUrl()); ?>
    };

    // i18n Translation Engine
    window.Translations = <?php echo isset($GLOBALS['i18n_translations']) ? json_encode($GLOBALS['i18n_translations'], JSON_UNESCAPED_UNICODE) : '{}'; ?>;
    window.__ = function(keyPath, fallback = null) {
        if (!keyPath) return fallback !== null ? fallback : '';
        const keys = keyPath.split('.');
        let current = window.Translations;
        for (let k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return fallback !== null ? fallback : keyPath;
            }
        }
        return typeof current === 'string' ? current : (fallback !== null ? fallback : keyPath);
    };
</script>

<script src="../../utils/libs/bootstrap.bundle.min.js"></script>
<script src="../../utils/libs/sweetalert2.all.min.js"></script>
<script src="../../utils/libs/flatpickr.min.js"></script>

<link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
<link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
<link rel="stylesheet" href="../../utils/libs/flatpickr.min.css">

<link rel="stylesheet" href="../components/css/style.css?v=<?php echo filemtime(__DIR__ . '/../components/css/style.css'); ?>">
<link rel="stylesheet" href="../components/css/mobile.css?v=<?php echo filemtime(__DIR__ . '/../components/css/mobile.css'); ?>">
<link rel="stylesheet" href="../components/css/fonts.css?v=<?php echo filemtime(__DIR__ . '/../components/css/fonts.css'); ?>">

<script>
// Inline sendRequest to guarantee global availability before any other script runs
window.sendRequest = async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            const filteredParams = Object.entries(params)
                                    .filter(([key, value]) => value !== null && value !== '')
                                    .reduce((obj, [key, value]) => {
                                        obj[key] = value;
                                        return obj;
                                    }, {});
            if (Object.keys(filteredParams).length > 0) {
                 url += `&${new URLSearchParams(filteredParams).toString()}`;
            }
        }
        const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : null;
        const options = {
            method: method.toUpperCase(),
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        if (options.method !== 'GET' && csrfToken) { options.headers['X-CSRF-TOKEN'] = csrfToken; }
        if (body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        const result = await response.json().catch(() => ({}));
        if (response.status === 401 || result.is_expired === true || (response.redirected && response.url && response.url.includes('login_form.php'))) {
            if (typeof window.__mesTriggerSessionLogout === 'function') {
                window.__mesTriggerSessionLogout();
            } else {
                const base = (window.MES_AUTH_CONFIG && window.MES_AUTH_CONFIG.baseUrl) ? window.MES_AUTH_CONFIG.baseUrl : (window.location.pathname.includes('/page/') ? window.location.pathname.split('/page/')[0] : '/iot-toolbox/sandbox-b9/MES/MES');
                window.location.replace(`${base}/auth/login_form.php?redirect=${encodeURIComponent(window.location.href)}`);
            }
            const authErr = new Error(result.message || 'Session expired');
            authErr.isSessionExpired = true;
            throw authErr;
        }
        if (!response.ok) { throw new Error(result.message || response.statusText || `HTTP error! status: ${response.status}`); }
        if (typeof result.success === 'undefined') { result.success = false; }
        return result;
    } catch (error) {
        if (window.__mesSessionRedirecting || (error && error.isSessionExpired)) {
            return { success: false, is_expired: true, message: 'Session expired' };
        }
        const msg = (error && error.message) ? error.message : String(error || 'An unexpected error occurred.');
        console.error(`Request failed:`, error);
        if (typeof showToast === 'function') {
             showToast(`Error: ${msg}`, 'var(--bs-danger)');
        } else {
             alert(`Error: ${msg}`);
        }
        return { success: false, message: msg };
    }
}
</script>
<script src="../components/js/appCore.js?v=<?php echo filemtime(__DIR__ . '/js/appCore.js'); ?>" defer></script>
<script src="../components/js/theme-switcher.js?v=<?php echo filemtime(__DIR__ . '/js/theme-switcher.js'); ?>" defer></script>
<script src="../components/js/spinner.js?v=<?php echo filemtime(__DIR__ . '/js/spinner.js'); ?>"></script>
<script src="../components/js/datetime.js?v=<?php echo filemtime(__DIR__ . '/js/datetime.js'); ?>"></script>
<script src="../components/js/toast.js?v=<?php echo filemtime(__DIR__ . '/js/toast.js'); ?>"></script>