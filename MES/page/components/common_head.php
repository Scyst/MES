<?php
    // MES/page/components/common_head.php
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
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
        const options = { method: method.toUpperCase(), headers: {} };
        if (options.method !== 'GET' && csrfToken) { options.headers['X-CSRF-TOKEN'] = csrfToken; }
        if (body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { throw new Error(result.message || response.statusText || `HTTP error! status: ${response.status}`); }
        if (typeof result.success === 'undefined') { result.success = false; }
        return result;
    } catch (error) {
        console.error(`Request failed:`, error);
        if (typeof showToast === 'function') {
             showToast(`Error: ${error.message}` || 'An unexpected error occurred.', 'var(--bs-danger)');
        } else {
             alert(`Error: ${error.message}` || 'An unexpected error occurred.');
        }
        return { success: false, message: error.message || "Network error." };
    }
}
</script>
<script src="../components/js/appCore.js?v=<?php echo filemtime(__DIR__ . '/js/appCore.js'); ?>" defer></script>
<script src="../components/js/theme-switcher.js?v=<?php echo filemtime(__DIR__ . '/js/theme-switcher.js'); ?>" defer></script>
<script src="../components/js/spinner.js?v=<?php echo filemtime(__DIR__ . '/js/spinner.js'); ?>"></script>
<script src="../components/js/datetime.js?v=<?php echo filemtime(__DIR__ . '/js/datetime.js'); ?>"></script>
<script src="../components/js/toast.js?v=<?php echo filemtime(__DIR__ . '/js/toast.js'); ?>"></script>