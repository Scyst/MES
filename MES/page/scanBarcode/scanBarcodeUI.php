<?php
// Version 1.5.3
require_once __DIR__ . '/../../auth/check_auth.php';

$pageTitle          = 'Barcode Scanner';
$pageIcon           = 'fas fa-barcode';
$pageHeaderTitle    = 'Barcode Scanner';
$pageHeaderSubtitle = '<span style="opacity:0.55;font-size:0.7rem">v1.5.3</span>';

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <link rel="stylesheet" href="css/scanBarcode.css?v=<?php echo filemtime(__DIR__ . '/css/scanBarcode.css'); ?>">
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-3">
        <div id="appContainer">

            <div class="main-grid">
                <div class="card">
                    <h2 class="card-title">สแกนบาร์โค้ด</h2>

                    <form id="scanForm" onsubmit="event.preventDefault(); saveScan();" novalidate>

                        <div class="form-group">
                            <label>Barcode <span class="required">*</span> <span id="barcodeSaveOk" class="save-ok-badge"></span></label>
                            <input type="text" id="barcodeInput" class="form-control"
                                   placeholder="ยิงบาร์โค้ดที่นี่..." autocomplete="off" autofocus
                                   enterkeyhint="done"
                                   autocorrect="off" autocapitalize="none" spellcheck="false">
                            <div id="barcodeStatus" class="status-msg"></div>
                        </div>

                        <div class="form-group">
                            <label>Lot / Ref. <span class="required">*</span></label>
                            <input type="text" id="lotRefInput" class="form-control"
                                   placeholder="ระบุ Lot หรือ Reference" autocomplete="off"
                                   autocorrect="off" autocapitalize="none" spellcheck="false">
                        </div>

                        <div class="form-group">
                            <label>Location <span class="required">*</span></label>
                            <select id="locationSelect" class="form-control"
                                    onchange="document.getElementById('barcodeInput').focus()">
                                <option value="">-- เลือก Location --</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Production Type <span class="required">*</span></label>
                            <div class="type-selector">
                                <button type="button" class="type-btn active-fg" data-type="FG"    onclick="selectProductionType('FG')">FG</button>
                                <button type="button" class="type-btn"           data-type="HOLD"  onclick="selectProductionType('HOLD')">HOLD</button>
                                <button type="button" class="type-btn"           data-type="SCRAP" onclick="selectProductionType('SCRAP')">SCRAP</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Notes</label>
                            <input type="text" id="notesInput" class="form-control"
                                   placeholder="หมายเหตุ (ถ้ามี)" autocomplete="off">
                        </div>

                        <div class="button-row">
                            <button type="button" class="btn btn-secondary" onclick="clearForm()">🔄 Clear</button>
                            <button type="submit" class="btn btn-primary" id="saveBtn">💾 บันทึกข้อมูล</button>
                        </div>

                        <div id="saveStatus" class="status-msg"></div>
                    </form>
                </div>

                <div class="card">
                    <div id="lastSavedPanel" class="last-saved-panel">
                        <div class="last-saved-title">บันทึกล่าสุด</div>
                        <div class="last-saved-grid">
                            <div class="last-saved-row">
                                <span class="ls-label">Barcode</span>
                                <span class="ls-value ls-barcode" id="lsBarcode">-</span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Model</span>
                                <span class="ls-value" id="lsModel">-</span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Type</span>
                                <span class="ls-value" id="lsType"><span class="type-badge">-</span></span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Lot/Ref</span>
                                <span class="ls-value" id="lsLotRef">-</span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Location</span>
                                <span class="ls-value" id="lsLocation">-</span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Notes</span>
                                <span class="ls-value" id="lsNotes">-</span>
                            </div>
                            <div class="last-saved-row">
                                <span class="ls-label">Time</span>
                                <span class="ls-value" id="lsDate">-</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="card history-card">
                <div class="history-header">
                    <h2 class="card-title" style="margin:0">ประวัติการสแกน</h2>
                    <div class="log-filters">
                        <select id="logShiftFilter" class="form-control log-date-input"
                                onchange="loadLogs(document.getElementById('logDatePicker').value)">
                            <option value="all">ทุกกะ</option>
                            <option value="day">กะเช้า</option>
                            <option value="night">กะดึก</option>
                        </select>
                        <select id="logLocationFilter" class="form-control log-date-input"
                                onchange="loadLogs(document.getElementById('logDatePicker').value)">
                            <option value="">All Location</option>
                        </select>
                        <input type="date" id="logDatePicker" class="form-control log-date-input"
                               onchange="loadLogs(this.value)">
                    </div>
                </div>
                <div class="log-summary" id="logSummary" style="display:none">
                    <div class="summary-item summary-total">
                        <span class="summary-label">ทั้งหมด</span>
                        <span class="summary-value" id="sumTotal">0</span>
                    </div>
                    <div class="summary-item summary-fg">
                        <span class="summary-label">FG</span>
                        <span class="summary-value" id="sumFG">0</span>
                    </div>
                    <div class="summary-item summary-hold">
                        <span class="summary-label">HOLD</span>
                        <span class="summary-value" id="sumHold">0</span>
                    </div>
                    <div class="summary-item summary-scrap">
                        <span class="summary-label">SCRAP</span>
                        <span class="summary-value" id="sumScrap">0</span>
                    </div>
                </div>
                <div class="log-container">
                    <table class="log-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Barcode</th>
                                <th>Model</th>
                                <th>Type</th>
                                <th>Lot/Ref</th>
                                <th class="hide-mobile">Location</th>
                                <th class="hide-mobile">Notes</th>
                                <th>เวลา</th>
                            </tr>
                        </thead>
                        <tbody id="logTableBody">
                            <tr><td colspan="8" class="empty-state">กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
        </div>
    </div>

<script src="script/scanBarcode.js?v=<?php echo filemtime(__DIR__ . '/script/scanBarcode.js'); ?>"></script>
</body>
</html>
