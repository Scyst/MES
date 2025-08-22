<?php
    // MES/page/components/common_head.php
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">

<script src="../../utils/libs/bootstrap.bundle.min.js"></script>
<link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">

<link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime(__DIR__ . '/../../style/style.css'); ?>">

<script src="../components/js/sidebar.js?v=<?php echo filemtime(__DIR__ . '/js/sidebar.js'); ?>" defer></script>
<script src="../components/js/theme-switcher.js?v=<?php echo filemtime(__DIR__ . '/js/theme-switcher.js'); ?>" defer></script>
<script src="../components/js/spinner.js?v=<?php echo filemtime(__DIR__ . '/js/spinner.js'); ?>"></script>
<script src="../components/js/datetime.js?v=<?php echo filemtime(__DIR__ . '/js/datetime.js'); ?>"></script>
<script src="../components/js/toast.js?v=<?php echo filemtime(__DIR__ . '/js/toast.js'); ?>"></script>

<script src="../../utils/libs/chart.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
<script src="../../utils/libs/chartjs-plugin-zoom.min.js"></script>