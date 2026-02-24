<?php
    // MES/page/components/common_head.php
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">

<title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) : 'MES TOOLBOX'; ?></title>

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

<script src="../components/js/sidebar.js?v=<?php echo filemtime(__DIR__ . '/js/sidebar.js'); ?>" defer></script>
<script src="../components/js/theme-switcher.js?v=<?php echo filemtime(__DIR__ . '/js/theme-switcher.js'); ?>" defer></script>
<script src="../components/js/mobile_init.js?v=<?php echo filemtime(__DIR__ . '/js/mobile_init.js'); ?>" defer></script>
<script src="../components/js/spinner.js?v=<?php echo filemtime(__DIR__ . '/js/spinner.js'); ?>"></script>
<script src="../components/js/datetime.js?v=<?php echo filemtime(__DIR__ . '/js/datetime.js'); ?>"></script>
<script src="../components/js/toast.js?v=<?php echo filemtime(__DIR__ . '/js/toast.js'); ?>"></script>
<script src="../components/js/docking_sidebar_manager.js?v=<?php echo filemtime(__DIR__ . '/js/docking_sidebar_manager.js'); ?>"></script>