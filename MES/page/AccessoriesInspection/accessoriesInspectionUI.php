<?php
/**
 * Accessories Inspection UI
 * วางใน MES_scanBarcode/page/accessoriesInspection/
 */
require_once __DIR__ . '/cam_config.php';

// Proxy URL (HTTPS) — used by browser, avoids Mixed Content error
$_scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$_base   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
define('CAMERA_HOST', "{$_scheme}://{$_SERVER['HTTP_HOST']}{$_base}/cam_proxy.php");
require_once __DIR__ . '/../../auth/check_auth.php';

$pageTitle          = 'Accessories Inspection';
$pageIcon           = 'fas fa-camera';
$pageHeaderTitle    = 'Accessories Inspection';
$pageHeaderSubtitle = '<span style="opacity:0.55;font-size:0.7rem">v1.0.0</span>';

$products = [
    "Minibox CH1002 BLACK","Minibox CH1002 BLUE","Minibox CH1002 RED",
    "CH-2607HGBLK","CH-2607HGBLU","CH-2607HGR","CH-2607HGGRY","CH-2607HGGRE","CH-2607HGPR",
    "TC-2707TSBLK","TC-2707TSBLU","TC-2707TSR","TC-2707TSGRY","TC-2707TSGRE","TC-2707TSPR",
    "CH-4208HGBLK","CH-4208HGBLU","CH-4208HGR","CH-4208HGGRY","CH-4208HGGRE","CH-4208HGPR",
    "TC-4210TBLK", "TC-4210TBLU", "TC-4210TSR", "TC-4210TGRY", "TC-4210TSGRE","TC-4210TSPR",
    "CH-5608HGBLK","CH-5608HGBLU","CH-5608HGR","CH-5608HGGRY","CH-5608HGGRE","CH-5608HGPR",
    "TC-5608TSBLK","TC-5608TSBLU","TC-5608TSR","TC-5608TSGRY","TC-5608TSGRE","TC-5608TSPR",
];
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <link rel="stylesheet" href="css/accessoriesInspection.css?v=<?php echo filemtime(__DIR__ . '/css/accessoriesInspection.css'); ?>">
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-3">
        <div id="appContainer">

        <div class="insp-grid">

            <div class="card cam-card">
                <div class="cam-header">
                    <span id="statusBadge" class="badge bg-secondary">IDLE</span>
                    <span id="fpsBadge" class="fps-badge">FPS: —</span>
                    <span id="labelsBadge" class="labels-badge"></span>
                    <span class="ms-auto small text-secondary" id="connStatus">
                        <i class="fas fa-circle text-danger me-1" style="font-size:.6rem"></i>Offline
                    </span>
                    <button class="btn-recon ms-2" onclick="reconnectCamera()" title="Reconnect stream">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>

                <!-- Confirm progress bar -->
                <div id="confirmBarWrap" class="confirm-bar-wrap" style="display:none">
                    <div id="confirmFill" class="confirm-fill"></div>
                    <span id="confirmLabel" class="confirm-label">0.0s / 3s</span>
                </div>

                <!-- Error / Warning banner -->
                <div id="errorBanner" class="error-banner" style="display:none">
                    <i id="errorBannerIcon" class="fas fa-exclamation-triangle me-2"></i>
                    <span id="errorBannerText"></span>
                </div>

                <div class="cam-wrap">
                    <img id="camStream" src="<?= CAMERA_HOST ?>?p=/stream" alt="Camera stream">
                    <div id="camOffline" class="cam-offline">
                        <i class="fas fa-video-slash fa-3x mb-3"></i>
                        <p class="mb-2">กล้องไม่ได้เชื่อมต่อ<br>
                           <small class="text-secondary">ตรวจสอบว่า main.py รันอยู่</small>
                        </p>
                        <button class="btn btn-outline-light btn-sm" onclick="reconnectCamera()">
                            <i class="fas fa-sync-alt me-1"></i>Reconnect
                        </button>
                    </div>
                </div>

                <div class="io-bar">
                    <span class="io-item">
                        <span id="dot1" class="dot dot-off">●</span>
                        Sensor 1 <span id="badge1" class="io-badge badge-off">OFF</span>
                    </span>
                    <span class="io-item">
                        <span id="dot2" class="dot dot-off">●</span>
                        Sensor 2 <span id="badge2" class="io-badge badge-off">OFF</span>
                    </span>
                    <span class="io-item">
                        <i class="fas fa-lightbulb"></i>
                        <span id="lightVal" class="io-val">—</span>
                    </span>
                    <span class="io-item">
                        <i class="fas fa-bell"></i>
                        <span id="alarmVal" class="io-val">—</span>
                    </span>
                </div>
            </div>

            <div class="card ctrl-card">

                <h6 class="section-title">PRODUCT</h6>
                <select id="productSelect" class="form-select form-select-sm mb-2"
                        onchange="applySettings()">
                    <option value="">-- เลือกรุ่นงาน --</option>
                    <?php foreach ($products as $p):
                        $e = htmlspecialchars($p, ENT_QUOTES, 'UTF-8'); ?>
                    <option value="<?= $e ?>"><?= $e ?></option>
                    <?php endforeach; ?>
                </select>
                <div class="ctrl-sep"></div>

                <h6 class="section-title">STATUS</h6>
                <div class="kv-row mb-1">
                    <span class="kv-key">Camera</span>
                    <span id="camConnBadge" class="conn-badge conn-off">Not connected</span>
                </div>
                <div class="kv-row mb-1">
                    <span class="kv-key">IO</span>
                    <span id="ioConnBadge" class="conn-badge conn-off">Not connected</span>
                </div>
                <div class="kv-row mb-1">
                    <span class="kv-key">Database</span>
                    <span id="dbConnBadge" class="conn-badge conn-off">Not connected</span>
                </div>
                <div id="detectedStatus" class="small text-secondary mb-1">Detection: OFF</div>
                <div class="ctrl-sep"></div>

                <h6 class="section-title">MODEL</h6>
                <div class="d-flex gap-1 mb-1">
                    <select id="modelSelect" class="form-select form-select-sm flex-grow-1">
                        <option value="">-- เลือก Model --</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary px-2"
                            onclick="loadModels()" title="Refresh list">↺</button>
                </div>
                <button class="btn btn-sm btn-secondary w-100 mb-1" onclick="loadModel()">
                    โหลด Model
                </button>
                <div id="modelLoadStatus" class="model-status model-idle mb-1">● ยังไม่ได้โหลด</div>

                <div class="kv-row mb-2">
                    <span class="kv-key">Conf</span>
                    <div class="d-flex align-items-center gap-2 flex-grow-1">
                        <input type="range" class="form-range" id="confSlider"
                               min="5" max="95" value="25"
                               oninput="document.getElementById('confVal').textContent=(this.value/100).toFixed(2);applySettings()">
                        <span id="confVal" class="fw-bold" style="min-width:2.5rem;text-align:right">0.25</span>
                    </div>
                </div>
                <div class="ctrl-sep"></div>

                <h6 class="section-title">IO STATUS</h6>
                <div class="kv-row mb-1">
                    <span class="kv-key">IO Module</span>
                    <span id="ioModuleBadge" class="conn-badge conn-off ms-auto">OFF</span>
                </div>
                <div class="ctrl-sep"></div>

                <h6 class="section-title">CONTROLS</h6>
                <div class="d-grid gap-1 mb-1">
                    <button id="btnStart" class="btn btn-success btn-sm fw-bold" onclick="cmdStart()">
                        <i class="fas fa-play me-1"></i> START Detection
                    </button>
                    <button id="btnStop" class="btn btn-danger btn-sm fw-bold" onclick="cmdStop()" disabled style="opacity:0.45">
                        <i class="fas fa-stop me-1"></i> STOP Detection
                    </button>
                    <button class="btn btn-capture fw-bold" onclick="capture()">
                        <i class="fas fa-camera me-1"></i> Capture
                    </button>
                </div>
                <div class="ctrl-sep"></div>

                <div class="log-section">
                    <h6 class="section-title">RECENT LOG</h6>
                    <div class="d-flex gap-1 mb-1">
                        <input type="date" id="logDateFilter"
                               class="form-control form-control-sm"
                               onchange="pollLogs()">
                        <button class="btn btn-sm btn-outline-secondary"
                                onclick="clearDateFilter()" title="แสดงทุกรายการของวันนั้น"
                                style="white-space:nowrap; font-size:0.72rem">ทั้งหมด</button>
                    </div>
                    <div class="log-table-wrap">
                        <table class="table table-sm table-hover small mb-0">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Model</th>
                                    <th>Result</th>
                                    <th>Elapsed</th>
                                </tr>
                            </thead>
                            <tbody id="logBody">
                                <tr><td colspan="4" class="text-center text-secondary py-2">
                                    กำลังโหลด...
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

        </div>
        </div>
    </div>

<div class="modal fade" id="alertModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header" id="alertModalHeader">
                <h5 class="modal-title fw-bold">
                    <i id="alertModalIcon" class="me-2"></i>
                    <span id="alertModalTitle"></span>
                </h5>
                <button type="button" class="btn-close btn-close-white"
                        data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body fs-6" id="alertModalBody"></div>
            <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-secondary px-4"
                        data-bs-dismiss="modal">ตกลง</button>
            </div>
        </div>
    </div>
</div>

<script>const CAMERA_HOST = '<?= CAMERA_HOST ?>';</script>
<script src="../components/js/sendRequest.js?v=<?php echo filemtime(__DIR__ . '/../components/js/sendRequest.js'); ?>"></script>
<script src="script/accessoriesInspection.js?v=<?php echo filemtime(__DIR__ . '/script/accessoriesInspection.js'); ?>"></script>
</body>
</html>
