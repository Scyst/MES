<?php
// Path: MES/page/fleetLog/fleetLog.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Transport & Logistics";
$pageHeaderTitle = "Transport & Logistics";
$pageHeaderSubtitle = "บันทึกข้อมูลเที่ยวรถขนส่งและค่าใช้จ่ายโลจิสติกส์";
$pageIcon = "fas fa-truck-moving";

$defaultStart = date('Y-m-01');
$defaultEnd = date('Y-m-t');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .table-responsive-custom { height: calc(100vh - 270px); overflow-y: auto; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .kpi-card { transition: transform 0.2s; border-left: 4px solid; min-height: 110px; }
        .kpi-card:hover { transform: translateY(-3px); }
        
        .btn-radio-select { display: none; }
        .btn-radio-label { 
            border: 2px solid #dee2e6; border-radius: 8px; padding: 10px; 
            text-align: center; cursor: pointer; transition: all 0.2s; 
            color: #6c757d; font-weight: bold; background: white;
            font-size: 0.85rem;
        }
        .btn-radio-select:checked + .btn-radio-label { 
            border-color: #0d6efd; background-color: #f8fbff; color: #0d6efd;
            box-shadow: 0 4px 10px rgba(13,110,253,0.15);
        }
        
        .trans-badge-in { background-color: #e0f8e9; color: #198754; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem; }
        .trans-badge-out { background-color: #fff3cd; color: #fd7e14; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem; }
        .trans-badge-other { background-color: #e2e3e5; color: #495057; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem; }

        @media (max-width: 767.98px) {
            .table-responsive-custom { height: calc(100vh - 230px); }
            .table th, .table td { padding: 0.5rem 0.4rem !important; font-size: 0.8rem; }
            .date-input-group { width: 100% !important; max-width: none !important; }
        }

        .fab-btn {
            position: fixed; bottom: 25px; right: 25px; z-index: 1040;
            width: 56px; height: 56px; border-radius: 50%; display: flex;
            align-items: center; justify-content: center; font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(13, 110, 253, 0.4); transition: all 0.2s ease-in-out;
        }
        .fab-btn:active { transform: scale(0.9); }
    </style>
</head>
<body class="layout-top-header bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="w-100">
            
            <div class="px-2 px-md-3 pt-3">
                <div class="row g-2 mb-2 flex-nowrap overflow-x-auto pb-1 hide-scrollbar align-items-stretch">
                    
                    <div class="col-10 col-md-4" style="min-width: 260px;">
                        <div class="card shadow-sm kpi-card border-primary h-100">
                            <div class="card-body p-3 d-flex flex-column justify-content-center">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <div class="text-uppercase text-primary fw-bold mb-1" style="font-size: 1rem;">รวมรถทั้งหมด (เที่ยว)</div>
                                        <h3 class="text-primary fw-bold mb-0" id="kpiTotal">0</h3>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><i class="fas fa-truck fa-lg"></i></div>
                                </div>
                                <div class="mt-auto pt-2 border-top border-primary-subtle">
                                    <div id="breakdownTotal" class="d-flex flex-wrap gap-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-10 col-md-4" style="min-width: 260px;">
                        <div class="card shadow-sm kpi-card border-warning h-100">
                            <div class="card-body p-3 d-flex flex-column justify-content-center">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <div class="text-uppercase text-warning fw-bold mb-1" style="font-size: 1rem;">รถ VENDOR (จ้างนอก)</div>
                                        <h3 class="text-warning-emphasis fw-bold mb-0" id="kpiVendor">0</h3>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning-emphasis p-3 rounded-circle"><i class="fas fa-handshake fa-lg"></i></div>
                                </div>
                                <div class="mt-auto pt-2 border-top border-warning-subtle">
                                    <div id="breakdownVendor" class="d-flex flex-wrap gap-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-10 col-md-4" style="min-width: 260px;">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3 d-flex flex-column justify-content-center">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <div class="text-uppercase text-success fw-bold mb-1" style="font-size: 1rem;">รถ SNC (ภายใน)</div>
                                        <h3 class="text-success fw-bold mb-0" id="kpiSnc">0</h3>
                                    </div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle"><i class="fas fa-building fa-lg"></i></div>
                                </div>
                                <div class="mt-auto pt-2 border-top border-success-subtle">
                                    <div id="breakdownSnc" class="d-flex flex-wrap gap-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div class="content-wrapper px-2 px-md-3 pb-3 pt-0">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    <div class="card-header bg-white border-bottom p-2 p-md-3 pt-md-2">
                        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 w-100">
                            
                            <div class="d-flex flex-nowrap align-items-center gap-2 overflow-x-auto hide-scrollbar w-100 w-md-auto pb-1 pb-md-0">
                               <div class="input-group input-group-sm shadow-sm date-input-group" style="min-width: 240px; max-width: 300px;">
                                    <span class="input-group-text bg-light text-secondary border-secondary-subtle px-2"><i class="fas fa-calendar-alt"></i></span>
                                    <input type="date" id="filter_start" class="form-control border-secondary-subtle px-1 text-center" value="<?= $defaultStart ?>" onchange="loadLogs()">
                                    <span class="input-group-text bg-light text-secondary border-secondary-subtle border-start-0 border-end-0 px-0">-</span>
                                    <input type="date" id="filter_end" class="form-control border-secondary-subtle px-1 text-center" value="<?= $defaultEnd ?>" onchange="loadLogs()">
                                </div>
                                <button class="btn btn-sm btn-outline-secondary shadow-sm flex-shrink-0" onclick="loadLogs()" title="รีเฟรช"><i class="fas fa-sync-alt"></i></button>
                                <button class="btn btn-sm btn-success fw-bold shadow-sm flex-shrink-0" onclick="exportExcel()"><i class="fas fa-file-excel"></i> <span class="d-none d-sm-inline ms-1">Export</span></button>
                            </div>

                            <div class="d-none d-md-flex align-items-center gap-2 flex-shrink-0">
                                <button class="btn btn-sm btn-primary fw-bold shadow-sm px-3" data-bs-toggle="modal" data-bs-target="#manualModal">
                                    <i class="fas fa-edit me-1"></i> บันทึกข้อมูลรถ (Manual)
                                </button>
                            </div>

                        </div>
                    </div>

                    <div class="table-responsive flex-grow-1 table-responsive-custom">
                        <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                            <thead class="table-light sticky-top shadow-sm" style="z-index: 10;">
                                <tr class="text-secondary text-uppercase">
                                    <th class="px-3" style="width: 140px;">วัน/เวลา</th>
                                    <th Class="text-center">ประเภท</th>
                                    <th Class="text-center">สังกัด (Provider)</th>
                                    <th Class="text-center">ประเภทรถ/ตู้</th>
                                    <th>ทะเบียนรถ / เอกสาร</th>
                                    <th>เลขตู้ & ซีล</th>
                                    <th>หมายเหตุ</th>
                                    <th Class="text-center">ผู้บันทึก</th>
                                    <th class="text-center" style="width: 80px;"><i class="fas fa-cog"></i></th> 
                                </tr>
                            </thead>
                            <tbody id="logTbody">
                                <tr><td colspan="9" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>กำลังโหลด...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button class="btn btn-primary fab-btn d-md-none" data-bs-toggle="modal" data-bs-target="#manualModal" title="บันทึกข้อมูลรถ">
        <i class="fas fa-plus"></i>
    </button>

    <div class="modal fade" id="manualModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-primary text-white py-2 px-3">
                    <h6 class="modal-title fw-bold mb-0"><i class="fas fa-edit me-2"></i> บันทึกข้อมูลเที่ยวรถ (Manual)</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="manualForm" onsubmit="submitManual(event)">
                    <div class="modal-body p-4 bg-light">
                        
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-2">1. ประเภทรายการ (Transaction Type) <span class="text-danger">*</span></label>
                            <div class="row g-2">
                                <div class="col-4">
                                    <input type="radio" name="trans_type" id="trans_in" value="INBOUND" class="btn-radio-select" checked>
                                    <label for="trans_in" class="btn-radio-label w-100 px-1"><i class="fas fa-arrow-down me-1"></i> เข้า (IN)</label>
                                </div>
                                <div class="col-4">
                                    <input type="radio" name="trans_type" id="trans_out" value="OUTBOUND" class="btn-radio-select">
                                    <label for="trans_out" class="btn-radio-label w-100 px-1"><i class="fas fa-arrow-up me-1"></i> ออก (OUT)</label>
                                </div>
                                <div class="col-4">
                                    <input type="radio" name="trans_type" id="trans_other" value="OTHER" class="btn-radio-select">
                                    <label for="trans_other" class="btn-radio-label w-100 px-1"><i class="fas fa-exchange-alt me-1"></i> อื่นๆ</label>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-2">2. ผู้ให้บริการ (Provider) <span class="text-danger">*</span></label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="radio" name="provider_type" id="prov_vendor" value="VENDOR" class="btn-radio-select" checked>
                                    <label for="prov_vendor" class="btn-radio-label w-100"><i class="fas fa-handshake me-1"></i> VENDOR</label>
                                </div>
                                <div class="col-6">
                                    <input type="radio" name="provider_type" id="prov_snc" value="SNC" class="btn-radio-select">
                                    <label for="prov_snc" class="btn-radio-label w-100"><i class="fas fa-building me-1"></i> SNC</label>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-1">3. ประเภทรถ/ตู้ (Container/Vehicle Size) <span class="text-danger">*</span></label>
                            <div class="d-flex flex-column">
                                <select id="man_vehicle_type" class="form-select border-secondary-subtle shadow-sm fw-bold text-primary" onchange="toggleContainerOther('man')" required>
                                    <option value="">เลือกประเภท...</option>
                                    <optgroup label="ตู้คอนเทนเนอร์ (Container)">
                                        <option value="20GP">20' GP</option>
                                        <option value="40GP">40' GP</option>
                                        <option value="40HQ">40' HQ</option>
                                        <option value="45HQ">45' HQ</option>
                                    </optgroup>
                                    <optgroup label="รถบรรทุก (Trucks)">
                                        <option value="4W">รถ 4 ล้อ (กระบะ)</option>
                                        <option value="6W">รถ 6 ล้อ</option>
                                        <option value="10W">รถ 10 ล้อ</option>
                                    </optgroup>
                                    <option value="OTHER" class="text-primary fw-bold">-- อื่นๆ (ระบุเอง) --</option>
                                </select>
                                <input type="text" id="man_vehicle_type_other" class="form-control mt-2 border-primary text-primary d-none shadow-sm" placeholder="ระบุประเภทตู้/รถบรรทุก...">
                            </div>
                        </div>

                        <div class="row g-2 mb-2">
                            <div class="col-12 col-sm-12">
                                <label class="form-label small fw-bold text-secondary mb-1">ทะเบียนรถ (License Plate)</label>
                                <input type="text" id="man_car_license" class="form-control form-control-sm border-secondary-subtle shadow-sm fw-bold" placeholder="(ไม่บังคับ)">
                            </div>
                            <div class="col-12 col-sm-6">
                                <label class="form-label small fw-bold text-secondary mb-1">วันที่และเวลา</label>
                                <input type="datetime-local" id="man_log_time" class="form-control form-control-sm border-secondary-subtle shadow-sm" required>
                            </div>
                            <div class="col-12 col-sm-6">
                                <label class="form-label small fw-bold text-secondary mb-1">หมายเหตุ / DO / อ้างอิง</label>
                                <input type="text" id="man_remark" class="form-control form-control-sm border-secondary-subtle shadow-sm" placeholder="(ไม่บังคับ)">
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer bg-white border-top py-2 px-3">
                        <button type="button" class="btn btn-sm btn-light text-secondary shadow-sm fw-bold px-4" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" id="btnSubmitManual" class="btn btn-sm btn-primary shadow-sm fw-bold px-4">
                            <i class="fas fa-save me-1"></i> บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-info text-dark py-2 px-3">
                    <h6 class="modal-title fw-bold mb-0"><i class="fas fa-edit me-2"></i> แก้ไขข้อมูล (EDIT)</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="editForm" onsubmit="submitEdit(event)">
                    <input type="hidden" id="edit_log_id">
                    <div class="modal-body p-4 bg-light">
                        
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-2">1. ประเภทรายการ (Transaction Type) <span class="text-danger">*</span></label>
                            <div class="row g-2">
                                <div class="col-4">
                                    <input type="radio" name="edit_trans_type" id="edit_trans_in" value="INBOUND" class="btn-radio-select">
                                    <label for="edit_trans_in" class="btn-radio-label w-100 px-1"><i class="fas fa-arrow-down me-1"></i> เข้า</label>
                                </div>
                                <div class="col-4">
                                    <input type="radio" name="edit_trans_type" id="edit_trans_out" value="OUTBOUND" class="btn-radio-select">
                                    <label for="edit_trans_out" class="btn-radio-label w-100 px-1"><i class="fas fa-arrow-up me-1"></i> ออก</label>
                                </div>
                                <div class="col-4">
                                    <input type="radio" name="edit_trans_type" id="edit_trans_other" value="OTHER" class="btn-radio-select">
                                    <label for="edit_trans_other" class="btn-radio-label w-100 px-1"><i class="fas fa-exchange-alt me-1"></i> อื่นๆ</label>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-2">2. ผู้ให้บริการ (Provider)</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="radio" name="edit_provider_type" id="edit_prov_vendor" value="VENDOR" class="btn-radio-select">
                                    <label for="edit_prov_vendor" class="btn-radio-label w-100"><i class="fas fa-handshake me-1"></i> VENDOR</label>
                                </div>
                                <div class="col-6">
                                    <input type="radio" name="edit_provider_type" id="edit_prov_snc" value="SNC" class="btn-radio-select">
                                    <label for="edit_prov_snc" class="btn-radio-label w-100"><i class="fas fa-building me-1"></i> SNC</label>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary mb-1">3. ประเภทรถ/ตู้ (Container/Vehicle Size)</label>
                            <div class="d-flex flex-column">
                                <select id="edit_vehicle_type" class="form-select border-secondary-subtle shadow-sm fw-bold text-primary" onchange="toggleContainerOther('edit')" required>
                                    <option value="">เลือกประเภท...</option>
                                    <optgroup label="ตู้คอนเทนเนอร์ (Container)">
                                        <option value="20GP">20' GP</option>
                                        <option value="40GP">40' GP</option>
                                        <option value="40HQ">40' HQ</option>
                                        <option value="45HQ">45' HQ</option>
                                    </optgroup>
                                    <optgroup label="รถบรรทุก (Trucks)">
                                        <option value="4W">รถ 4 ล้อ (กระบะ)</option>
                                        <option value="6W">รถ 6 ล้อ</option>
                                        <option value="10W">รถ 10 ล้อ</option>
                                    </optgroup>
                                    <option value="OTHER" class="text-primary fw-bold">-- อื่นๆ (ระบุเอง) --</option>
                                </select>
                                <input type="text" id="edit_vehicle_type_other" class="form-control mt-2 border-primary text-primary d-none shadow-sm" placeholder="ระบุประเภทตู้/รถบรรทุก...">
                            </div>
                        </div>

                        <div class="row g-2 mb-2">
                            <div class="col-12 col-sm-12">
                                <label class="form-label small fw-bold text-secondary mb-1">ทะเบียนรถ (License Plate)</label>
                                <input type="text" id="edit_car_license" class="form-control form-control-sm border-secondary-subtle shadow-sm fw-bold">
                            </div>
                            <div class="col-12 col-sm-6">
                                <label class="form-label small fw-bold text-secondary mb-1">วันที่และเวลา</label>
                                <input type="datetime-local" id="edit_log_time" class="form-control form-control-sm border-secondary-subtle shadow-sm" required>
                            </div>
                            <div class="col-12 col-sm-6">
                                <label class="form-label small fw-bold text-secondary mb-1">หมายเหตุ / DO</label>
                                <input type="text" id="edit_remark" class="form-control form-control-sm border-secondary-subtle shadow-sm">
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer bg-white border-top py-2 px-3">
                        <button type="button" class="btn btn-sm btn-light text-secondary shadow-sm fw-bold px-4" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" id="btnSubmitEdit" class="btn btn-sm btn-info text-dark shadow-sm fw-bold px-4">
                            <i class="fas fa-save me-1"></i> บันทึกการแก้ไข
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="../../utils/libs/xlsx.full.min.js"></script>

    <script>
        const API_URL = 'api/apiFleetLog.php';

        document.addEventListener('DOMContentLoaded', () => {
            loadLogs();
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            document.getElementById('man_log_time').value = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
        });

        function toggleContainerOther(prefix) {
            const val = document.getElementById(prefix + '_vehicle_type').value;
            const otherInput = document.getElementById(prefix + '_vehicle_type_other');
            if (val === 'OTHER') {
                otherInput.classList.remove('d-none');
                otherInput.focus();
                otherInput.required = true;
            } else {
                otherInput.classList.add('d-none');
                otherInput.required = false;
            }
        }

        // 🟢 ฟังก์ชัน Render ป้าย Badge เข้าไปในการ์ดแต่ละใบ 🟢
        function renderBreakdownBadges(containerId, dataObj, colorClass) {
            const box = document.getElementById(containerId);
            if (!dataObj || Object.keys(dataObj).length === 0) {
                box.innerHTML = `<span class="text-muted small w-100 text-center py-1">ไม่มีข้อมูล</span>`;
                return;
            }
            let html = '';
            for (const [vType, count] of Object.entries(dataObj)) {
                html += `<span class="badge bg-${colorClass} bg-opacity-10 text-${colorClass}-emphasis border border-${colorClass}-subtle px-2 py-1" style="font-size: 0.75rem;">
                            ${vType} <span class="badge bg-${colorClass} text-white ms-1" style="font-size: 0.75rem;">${count}</span>
                         </span>`;
            }
            box.innerHTML = html;
        }

        async function loadLogs() {
            const tbody = document.getElementById('logTbody');
            const dStart = document.getElementById('filter_start').value;
            const dEnd = document.getElementById('filter_end').value;
            if(!dStart || !dEnd) return;

            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>กำลังโหลด...</td></tr>';

            try {
                const fd = new FormData(); 
                fd.append('action', 'get_logs');
                fd.append('start_date', dStart); 
                fd.append('end_date', dEnd);

                const res = await fetch(API_URL, { method: 'POST', body: fd });
                const json = await res.json();

                if (json.success) {
                    document.getElementById('kpiTotal').innerText = json.kpi.total || 0;
                    document.getElementById('kpiVendor').innerText = json.kpi.vendor || 0;
                    document.getElementById('kpiSnc').innerText = json.kpi.snc || 0;

                    // 🟢 เรียกใช้ฟังก์ชัน Render Badge ให้การ์ดทั้ง 3 ใบ 🟢
                    renderBreakdownBadges('breakdownTotal', json.kpi.breakdown.total, 'primary');
                    renderBreakdownBadges('breakdownVendor', json.kpi.breakdown.vendor, 'warning');
                    renderBreakdownBadges('breakdownSnc', json.kpi.breakdown.snc, 'success');

                    if (json.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i><br>ไม่มีเที่ยวรถในช่วงวันที่เลือก</td></tr>';
                        return;
                    }

                    let html = '';
                    json.data.forEach(r => {
                        let typeBadge = '';
                        if (r.trans_type === 'OUTBOUND') {
                            typeBadge = `<span class="trans-badge-out"><i class="fas fa-arrow-up"></i> OUT</span>`;
                        } else if (r.trans_type === 'INBOUND') {
                            typeBadge = `<span class="trans-badge-in"><i class="fas fa-arrow-down"></i> IN</span>`;
                        } else {
                            typeBadge = `<span class="trans-badge-other"><i class="fas fa-exchange-alt"></i> OTHER</span>`;
                        }
                        
                        const provIcon = r.provider_type === 'VENDOR' ? '<i class="fas fa-handshake text-warning"></i>' : '<i class="fas fa-building text-success"></i>';
                        const isAuto = r.loading_report_id !== null;
                        
                        let actionBtn = '';
                        if (!isAuto) {
                            actionBtn = `
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light border text-secondary shadow-sm" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 py-2">
                                    <li><a class="dropdown-item text-primary fw-bold py-2" href="#" onclick="editLog(${r.log_id})"><i class="fas fa-edit me-2"></i> แก้ไขข้อมูล</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold py-2" href="#" onclick="deleteLog(${r.log_id})"><i class="fas fa-trash-alt me-2"></i> ลบรายการ</a></li>
                                </ul>
                            </div>`;
                        } else {
                            actionBtn = `<span class="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1" title="ดึงข้อมูลอัตโนมัติจาก C-TPAT"><i class="fas fa-link"></i> Auto</span>`;
                        }

                        html += `
                            <tr>
                                <td class="px-3 fw-bold text-dark">${r.log_timestamp.substring(0, 16)}</td>
                                <td class="text-center">${typeBadge}</td>
                                <td class="text-center fw-bold">${provIcon} ${r.provider_type}</td>
                                <td class="text-center"><span class="badge bg-secondary bg-opacity-10 text-secondary border" style="font-size: 0.75rem;">${r.vehicle_type}</span></td>
                                <td>
                                    <div class="fw-bold text-primary">${r.car_license || '-'}</div>
                                    <small class="text-muted">${r.ref_document || ''}</small>
                                </td>
                                <td>
                                    ${r.container_no ? `<span class="d-block fw-bold">${r.container_no}</span>` : '-'}
                                    ${r.seal_no ? `<small class="text-success"><i class="fas fa-lock"></i> ${r.seal_no}</small>` : ''}
                                </td>
                                <td><small class="text-muted text-break">${r.remark || '-'}</small></td>
                                <td class="text-center"><small class="text-muted">${r.admin_name}</small></td>
                                <td class="text-center">${actionBtn}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            }
        }

        async function submitManual(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitManual');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> บันทึก...';

            const transType = document.querySelector('input[name="trans_type"]:checked').value;
            const provider = document.querySelector('input[name="provider_type"]:checked').value;
            const logTime = document.getElementById('man_log_time').value;
            const carLicense = document.getElementById('man_car_license').value;
            const remark = document.getElementById('man_remark').value;
            
            let vehicle = document.getElementById('man_vehicle_type').value;
            if (vehicle === 'OTHER') vehicle = document.getElementById('man_vehicle_type_other').value.trim();

            const fd = new FormData();
            fd.append('action', 'save_manual_log');
            fd.append('trans_type', transType);
            fd.append('log_timestamp', logTime);
            fd.append('provider_type', provider);
            fd.append('vehicle_type', vehicle);
            fd.append('car_license', carLicense);
            fd.append('remark', remark);

            try {
                const res = await fetch(API_URL, { method: 'POST', body: fd });
                const json = await res.json();
                if(json.success) {
                    bootstrap.Modal.getInstance(document.getElementById('manualModal')).hide();
                    Swal.fire({ icon: 'success', title: json.message, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                    
                    document.getElementById('man_car_license').value = '';
                    document.getElementById('man_remark').value = '';
                    document.getElementById('man_vehicle_type').value = '';
                    toggleContainerOther('man'); 
                    
                    loadLogs();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch(e) {
                Swal.fire('Error', 'Network error', 'error');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> บันทึก';
            }
        }

        async function editLog(logId) {
            try {
                const fd = new FormData();
                fd.append('action', 'get_log_detail');
                fd.append('log_id', logId);
                
                const res = await fetch(API_URL, { method: 'POST', body: fd });
                const json = await res.json();
                
                if (json.success) {
                    const r = json.data;
                    document.getElementById('edit_log_id').value = r.log_id;
                    document.getElementById('edit_log_time').value = r.log_timestamp.substring(0, 16);
                    document.getElementById('edit_car_license').value = r.car_license || '';
                    document.getElementById('edit_remark').value = r.remark || '';
                    
                    if(r.trans_type === 'OUTBOUND') document.getElementById('edit_trans_out').checked = true;
                    else if (r.trans_type === 'OTHER') document.getElementById('edit_trans_other').checked = true;
                    else document.getElementById('edit_trans_in').checked = true;

                    if(r.provider_type === 'SNC') document.getElementById('edit_prov_snc').checked = true;
                    else document.getElementById('edit_prov_vendor').checked = true;
                    
                    const vSelect = document.getElementById('edit_vehicle_type');
                    const vOther = document.getElementById('edit_vehicle_type_other');
                    let found = Array.from(vSelect.options).some(opt => opt.value === r.vehicle_type);
                    
                    if(found && r.vehicle_type !== '') {
                        vSelect.value = r.vehicle_type;
                        vOther.classList.add('d-none');
                        vOther.required = false;
                    } else {
                        vSelect.value = 'OTHER';
                        vOther.value = r.vehicle_type;
                        vOther.classList.remove('d-none');
                        vOther.required = true;
                    }
                    
                    new bootstrap.Modal(document.getElementById('editModal')).show();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch(e) {
                Swal.fire('Error', 'Network Error', 'error');
            }
        }

        async function submitEdit(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitEdit');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> บันทึก...';

            const logId = document.getElementById('edit_log_id').value;
            const transType = document.querySelector('input[name="edit_trans_type"]:checked').value;
            const provider = document.querySelector('input[name="edit_provider_type"]:checked').value;
            const logTime = document.getElementById('edit_log_time').value;
            const carLicense = document.getElementById('edit_car_license').value;
            const remark = document.getElementById('edit_remark').value;
            
            let vehicle = document.getElementById('edit_vehicle_type').value;
            if (vehicle === 'OTHER') vehicle = document.getElementById('edit_vehicle_type_other').value.trim();

            const fd = new FormData();
            fd.append('action', 'update_manual_log');
            fd.append('log_id', logId);
            fd.append('trans_type', transType);
            fd.append('log_timestamp', logTime);
            fd.append('provider_type', provider);
            fd.append('vehicle_type', vehicle);
            fd.append('car_license', carLicense);
            fd.append('remark', remark);

            try {
                const res = await fetch(API_URL, { method: 'POST', body: fd });
                const json = await res.json();
                if(json.success) {
                    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                    Swal.fire({ icon: 'success', title: json.message, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                    loadLogs();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch(e) {
                Swal.fire('Error', 'Network error', 'error');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> บันทึกการแก้ไข';
            }
        }

        function deleteLog(logId) {
            Swal.fire({
                title: 'ยืนยันการลบ?',
                text: "หากลบแล้วจะไม่สามารถกู้คืนข้อมูลได้",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: '<i class="fas fa-trash-alt"></i> ลบทิ้ง',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const fd = new FormData();
                    fd.append('action', 'delete_log');
                    fd.append('log_id', logId);

                    try {
                        const res = await fetch(API_URL, { method: 'POST', body: fd });
                        const json = await res.json();
                        if (json.success) {
                            Swal.fire({ icon: 'success', title: json.message, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                            loadLogs();
                        } else {
                            Swal.fire('ปฏิเสธการลบ', json.message, 'warning');
                        }
                    } catch(e) {
                        Swal.fire('Error', 'Network error', 'error');
                    }
                }
            });
        }

        function exportExcel() {
            const tbody = document.getElementById('logTbody');
            if (!tbody || tbody.rows.length === 0 || tbody.innerText.includes('ไม่มีข้อมูล')) {
                Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับ Export', 'warning');
                return;
            }

            let wsData = [
                ['วัน/เวลา', 'ประเภทรายการ', 'ผู้ให้บริการ', 'ประเภทรถ/ตู้', 'ทะเบียนรถ', 'เอกสารอ้างอิง', 'หมายเลขตู้', 'หมายเลขซีล', 'หมายเหตุ', 'ผู้บันทึก']
            ];

            Array.from(tbody.rows).forEach(row => {
                if (row.cells.length < 9) return;
                
                const time = row.cells[0].innerText.trim();
                let type = '';
                if (row.cells[1].innerText.includes('IN')) type = 'INBOUND';
                else if (row.cells[1].innerText.includes('OUT')) type = 'OUTBOUND';
                else type = 'OTHER';

                const provider = row.cells[2].innerText.trim();
                const vehicle = row.cells[3].innerText.trim();
                
                const docData = row.cells[4].innerText.split('\n');
                const license = docData[0].trim();
                const refDoc = (docData[1] || '').trim();

                const ctnData = row.cells[5].innerText.split('\n');
                const ctnNo = ctnData[0] === '-' ? '' : ctnData[0].trim();
                const sealNo = ctnData.length > 1 ? ctnData[1].trim() : '';

                const remark = row.cells[6].innerText.trim();
                const admin = row.cells[7].innerText.trim();

                wsData.push([time, type, provider, vehicle, license, refDoc, ctnNo, sealNo, remark, admin]);
            });

            try {
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                
                ws['!cols'] = [
                    { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, 
                    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 20 } 
                ];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Fleet_Log");
                
                const dStart = document.getElementById('filter_start').value;
                const dEnd = document.getElementById('filter_end').value;
                const dateStr = dStart === dEnd ? dStart : `${dStart}_to_${dEnd}`;
                
                XLSX.writeFile(wb, `Logistics_Fleet_Log_${dateStr}.xlsx`);
            } catch(e) {
                Swal.fire('Error', 'ไม่พบ Library XLSX สำหรับ Export', 'error');
            }
        }
    </script>
</body>
</html>