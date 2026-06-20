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
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="css/accessoriesInspection.css?v=<?php echo filemtime(__DIR__ . '/css/accessoriesInspection.css'); ?>">
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-3">
        <div id="appContainer">

        <div class="insp-screen">
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

                <!-- ── PRODUCT ──────────────────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title"><i class="fas fa-box-open"></i> PRODUCT</h6>
                    <select id="productSelect" class="form-select form-select-sm"
                            onchange="applySettings()">
                        <option value="">-- เลือกรุ่นงาน --</option>
                        <?php foreach ($products as $p):
                            $e = htmlspecialchars($p, ENT_QUOTES, 'UTF-8'); ?>
                        <option value="<?= $e ?>"><?= $e ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- ── STATUS ───────────────────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title"><i class="fas fa-chart-simple"></i> STATUS</h6>
                    <div class="status-grid">
                        <div class="status-cell">
                            <i class="fas fa-video status-icon"></i>
                            <span class="status-cell-lbl">Camera</span>
                            <span id="camConnBadge" class="conn-badge conn-off">Off</span>
                        </div>
                        <div class="status-cell">
                            <i class="fas fa-plug status-icon"></i>
                            <span class="status-cell-lbl">IO</span>
                            <span id="ioConnBadge" class="conn-badge conn-off">Off</span>
                        </div>
                        <div class="status-cell">
                            <i class="fas fa-database status-icon"></i>
                            <span class="status-cell-lbl">DB</span>
                            <span id="dbConnBadge" class="conn-badge conn-off">Off</span>
                        </div>
                    </div>
                    <div class="detect-box-wrap">
                        <div id="detectedStatus" class="small text-secondary">Detection: OFF</div>
                    </div>
                </div>

                <!-- ── MODEL ────────────────────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title"><i class="fas fa-brain"></i> MODEL</h6>
                    <div class="d-flex gap-1 mb-1">
                        <select id="modelSelect" class="form-select form-select-sm flex-grow-1">
                            <option value="">-- เลือก Model --</option>
                        </select>
                        <button class="btn btn-sm btn-outline-secondary px-2"
                                onclick="loadModels()" title="Refresh list">↺</button>
                    </div>
                    <button class="btn btn-sm btn-secondary w-100 mb-1" onclick="loadModel()">
                        <i class="fas fa-upload me-1"></i> โหลด Model
                    </button>
                    <div id="modelLoadStatus" class="model-status model-idle">● ยังไม่ได้โหลด</div>
                </div>

                <!-- ── CONFIDENCE + IO MODULE ────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title"><i class="fas fa-sliders"></i> CONFIDENCE</h6>
                    <div class="kv-row mb-1">
                        <span class="kv-key">Threshold</span>
                        <div class="d-flex align-items-center gap-1 flex-grow-1">
                            <input type="range" class="form-range" id="confSlider"
                                   min="5" max="95" value="25"
                                   style="flex:1;min-width:30px"
                                   oninput="onConfSlider(this.value)">
                            <button class="btn-step" onclick="stepConf(-1)">−</button>
                            <input type="number" id="confInput" class="step-input"
                                   min="0.05" max="0.95" step="0.01" value="0.25"
                                   onchange="onConfInput(this.value)">
                            <button class="btn-step" onclick="stepConf(1)">+</button>
                        </div>
                    </div>
                    <div class="kv-row">
                        <span class="kv-key">IO Module</span>
                        <span id="ioModuleBadge" class="conn-badge conn-off ms-auto">OFF</span>
                    </div>
                </div>

                <!-- ── CAMERA (collapsible) ─────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title section-title-toggle"
                        data-bs-toggle="collapse" data-bs-target="#camSection">
                        <i class="fas fa-camera"></i> CAMERA
                        <i class="fas fa-chevron-down toggle-icon ms-auto"></i>
                    </h6>
                    <div class="collapse" id="camSection">
                        <div class="kv-row mb-1">
                            <span class="kv-key">Exp. Auto</span>
                            <div class="form-check form-switch ms-auto mb-0">
                                <input class="form-check-input" type="checkbox" id="chkExpAuto"
                                       onchange="onExpAutoChange(this)" checked>
                            </div>
                        </div>
                        <div class="kv-row mb-1" id="expTimeRow" style="opacity:0.45">
                            <span class="kv-key">Exp.Time</span>
                            <div class="d-flex align-items-center gap-1 flex-grow-1">
                                <input type="range" class="form-range" id="expSlider"
                                       min="100" max="200000" step="1000" value="43000"
                                       style="flex:1;min-width:30px" disabled
                                       oninput="onExpSlider(this.value)">
                                <button class="btn-step" id="expMinus" onclick="stepExp(-1)" disabled>−</button>
                                <input type="number" id="expInput" class="step-input"
                                       min="100" max="200000" step="1000" value="43000"
                                       style="width:4rem" disabled
                                       onchange="onExpInput(this.value)">
                                <button class="btn-step" id="expPlus" onclick="stepExp(1)" disabled>+</button>
                                <span class="kv-unit">µs</span>
                            </div>
                        </div>
                        <div class="kv-row mb-1">
                            <span class="kv-key">Gain Auto</span>
                            <div class="form-check form-switch ms-auto mb-0">
                                <input class="form-check-input" type="checkbox" id="chkGainAuto"
                                       onchange="onGainAutoChange(this)" checked>
                            </div>
                        </div>
                        <div class="kv-row mb-1" id="gainRow" style="opacity:0.45">
                            <span class="kv-key">Gain</span>
                            <div class="d-flex align-items-center gap-1 flex-grow-1">
                                <input type="range" class="form-range" id="gainSlider"
                                       min="10" max="160" step="1" value="10"
                                       style="flex:1;min-width:30px" disabled
                                       oninput="onGainSlider(this.value)">
                                <button class="btn-step" id="gainMinus" onclick="stepGain(-1)" disabled>−</button>
                                <input type="number" id="gainInput" class="step-input"
                                       min="1.0" max="16.0" step="0.1" value="1.0" disabled
                                       onchange="onGainInput(this.value)">
                                <button class="btn-step" id="gainPlus" onclick="stepGain(1)" disabled>+</button>
                                <span class="kv-unit">x</span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary w-100 mb-1" onclick="applyExposure()">
                            <i class="fas fa-check me-1"></i> Apply
                        </button>
                    </div>
                </div>

                <!-- ── SETTINGS (collapsible) ────────── -->
                <div class="ctrl-section">
                    <h6 class="section-title section-title-toggle"
                        data-bs-toggle="collapse" data-bs-target="#settingsSection">
                        <i class="fas fa-gear"></i> SETTINGS
                        <i class="fas fa-chevron-down toggle-icon ms-auto"></i>
                    </h6>
                    <div class="collapse" id="settingsSection">
                        <div class="kv-row mb-1">
                            <span class="kv-key">Alarm Timeout</span>
                            <div class="d-flex align-items-center gap-1">
                                <input type="number" id="inpAlarmTimeout" class="step-input"
                                       min="0" max="300" step="5" value="30"
                                       style="width:3.5rem" onchange="onAlarmTimeoutChanged(this.value)">
                                <span class="kv-unit">s</span>
                            </div>
                        </div>
                        <div class="kv-row mb-1">
                            <span class="kv-key">Green Light Hold</span>
                            <div class="d-flex align-items-center gap-1">
                                <input type="number" id="inpOkClear" class="step-input"
                                       min="0" max="300" step="5" value="30"
                                       style="width:3.5rem" onchange="onOkClearChanged(this.value)">
                                <span class="kv-unit">s</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── CONTROLS ──────────────────────── -->
                <div class="ctrl-section ctrl-controls">
                    <h6 class="section-title"><i class="fas fa-gamepad"></i> CONTROLS</h6>
                    <button id="btnStart" class="btn-ctrl-start" onclick="cmdStart()">
                        <i class="fas fa-play"></i> START Detection
                    </button>
                    <button class="btn-ctrl-capture mt-1" onclick="capture()">
                        <i class="fas fa-camera"></i> Capture
                    </button>
                </div>

            </div>
        </div>

            <button type="button" class="scroll-hint"
                    onclick="document.getElementById('historyCard').scrollIntoView({behavior:'smooth'})">
                <i class="fas fa-chevron-down"></i> เลื่อนลงดูประวัติการตรวจสอบ
            </button>
        </div>

        <div id="historyCard" class="card history-card">
            <div class="history-header">
                <h6 class="history-title"><i class="fas fa-history"></i> ประวัติการตรวจสอบ</h6>
                <div class="log-filters">
                    <select id="logShiftFilter" class="form-control log-date-input"
                            onchange="pollLogs()">
                        <option value="all">ทุกกะ</option>
                        <option value="day">กะเช้า</option>
                        <option value="night">กะดึก</option>
                    </select>
                    <input type="date" id="logDateFilter" class="form-control log-date-input"
                           onchange="pollLogs()">
                </div>
            </div>
            <div id="logSummary" class="log-summary" style="display:none">
                <div class="summary-item summary-total">
                    <span class="summary-label">ทั้งหมด</span>
                    <span class="summary-value" id="sumTotal">0</span>
                </div>
                <div class="summary-item summary-ok">
                    <span class="summary-label">OK</span>
                    <span class="summary-value" id="sumOK">0</span>
                </div>
                <div class="summary-item summary-alarm">
                    <span class="summary-label">ALARM</span>
                    <span class="summary-value" id="sumAlarm">0</span>
                </div>
            </div>
            <div class="log-container">
                <table class="log-table">
                    <thead>
                        <tr>
                            <th class="col-ts">เวลา</th>
                            <th class="col-model">Model</th>
                            <th class="col-result">Result</th>
                            <th class="col-elapsed">Elapsed</th>
                            <th class="col-img">Image</th>
                        </tr>
                    </thead>
                    <tbody id="logBody">
                        <tr><td colspan="5" class="empty-state">กำลังโหลด...</td></tr>
                    </tbody>
                </table>
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

<div class="modal fade" id="imgModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content border-0 shadow-lg" style="background:#111;">
            <div class="modal-header border-0 py-2 px-3" style="background:#1a1a1a;">
                <small id="imgModalTitle" class="text-secondary text-truncate me-2"></small>
                <button type="button" class="btn-close btn-close-white ms-auto"
                        data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-2 text-center">
                <img id="imgModalImg" src="" alt=""
                     style="max-width:100%; max-height:80vh; object-fit:contain;">
            </div>
        </div>
    </div>
</div>

<script>const CAMERA_HOST = '<?= CAMERA_HOST ?>';</script>
<script src="../components/js/sendRequest.js?v=<?php echo filemtime(__DIR__ . '/../components/js/sendRequest.js'); ?>"></script>
<script src="script/accessoriesInspection.js?v=<?php echo filemtime(__DIR__ . '/script/accessoriesInspection.js'); ?>"></script>
</body>
</html>
