<?php
// Path: MES/page/areaAccess/areaAccess.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Area Access Log";
$pageHeaderTitle = "Area Access Log";
$pageHeaderSubtitle = "บันทึกเข้าออกพื้นที่จำกัด (Store / Warehouse)";
$pageIcon = "fas fa-shield-alt";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .table-responsive-custom { height: calc(100vh - 280px); overflow-y: auto; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .status-in { background-color: var(--bs-success); color: white; border-radius: 12px; padding: 4px 10px; font-weight: bold; }
        .status-out { background-color: var(--bs-secondary); color: white; border-radius: 12px; padding: 4px 10px; }
        
        /* 🟢 เพิ่มความสูงให้ KPI Card ดูพรีเมียมขึ้น */
        .kpi-card { border-left: 4px solid; transition: transform 0.2s; min-height: 100px; }
        .kpi-card:hover { transform: translateY(-3px); }
        
        .fab-container {
            position: fixed;
            bottom: 80px; 
            right: 20px;
            z-index: 1040;
        }
        @media (max-width: 767.98px) {
            .table-responsive-custom { height: calc(100vh - 360px); }
            /* ขยายขนาดฟอนต์ตัวเลข KPI บนมือถือ */
            .kpi-card h3 { font-size: 1.8rem !important; } 
        }
    </style>
</head>
<body class="layout-top-header bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content" class="w-100">
            
            <div class="px-2 px-md-3 pt-3">
                <div class="row g-2 mb-1 flex-nowrap overflow-x-auto pb-1 hide-scrollbar">
                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 220px;">
                        <div class="card shadow-sm kpi-card border-secondary h-100">
                            <div class="card-body p-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-uppercase text-secondary fw-bold mb-1" style="font-size: 0.8rem;">รายการเคลื่อนไหว (วันนี้)</div>
                                    <h3 class="text-secondary fw-bold mb-0" id="kpiTotalTrans">0</h3>
                                </div>
                                <div class="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle"><i class="fas fa-exchange-alt fa-lg"></i></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 220px;">
                        <div class="card shadow-sm kpi-card border-success h-100">
                            <div class="card-body p-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-uppercase text-success fw-bold mb-1" style="font-size: 0.8rem;">บุคคลที่อยู่ในพื้นที่ (IN)</div>
                                    <h3 class="text-success fw-bold mb-0" id="kpiTotalInside">0</h3>
                                </div>
                                <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle"><i class="fas fa-users fa-lg"></i></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-8 col-sm-6 col-md-4" style="min-width: 220px;">
                        <div class="card shadow-sm kpi-card border-danger h-100">
                            <div class="card-body p-3 d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="text-uppercase text-danger fw-bold mb-1" style="font-size: 0.8rem;">ค้างในพื้นที่ > 2 ชม. (Alert)</div>
                                    <h3 class="text-danger fw-bold mb-0" id="kpiTotalOverdue">0</h3>
                                </div>
                                <div class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle"><i class="fas fa-exclamation-triangle fa-lg"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper px-2 px-md-3 pb-3 pt-0">
                <div class="card shadow-sm border-0 h-100 d-flex flex-column">
                    
                    <div class="card-header bg-white border-bottom p-2">
                        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 w-100">
                            
                            <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                                
                                <div class="input-group input-group-sm shadow-sm" style="flex: 1 1 150px; max-width: 250px;">
                                    <span class="input-group-text bg-light text-secondary border-secondary-subtle"><i class="fas fa-search"></i></span>
                                    <input type="text" id="filter_search" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="ค้นหารหัส, ชื่อ...">
                                </div>

                                <div class="input-group input-group-sm shadow-sm" style="flex: 1 1 140px; max-width: 200px;">
                                    <span class="input-group-text bg-light text-secondary border-secondary-subtle"><i class="fas fa-map-marker-alt"></i></span>
                                    <select class="form-select border-secondary-subtle fw-bold text-primary" id="filter_loc" onchange="resetPageAndLoad()">
                                        <option value="">-- ทุกสถานที่ --</option>
                                    </select>
                                </div>

                                <div class="d-flex flex-grow-1 gap-2" style="min-width: 280px; max-width: 400px;">
                                    
                                    <div class="input-group input-group-sm shadow-sm flex-grow-1">
                                        <span class="input-group-text bg-light text-secondary border-secondary-subtle"><i class="fas fa-calendar-alt"></i></span>
                                        <input type="date" id="filter_start" class="form-control border-secondary-subtle px-1" value="<?= date('Y-m-d') ?>" onchange="resetPageAndLoad()">
                                        <span class="input-group-text bg-light text-secondary border-secondary-subtle border-start-0 border-end-0 px-1">-</span>
                                        <input type="date" id="filter_end" class="form-control border-secondary-subtle px-1" value="<?= date('Y-m-d') ?>" onchange="resetPageAndLoad()">
                                    </div>
                                    
                                    <button class="btn btn-sm btn-outline-secondary shadow-sm flex-shrink-0" onclick="resetPageAndLoad()" title="รีเฟรชข้อมูล" style="width: 31px; height: 31px; padding: 0;">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="d-none d-md-flex align-items-center gap-2 justify-content-end flex-shrink-0">
                                
                                <button class="btn btn-sm btn-success fw-bold shadow-sm px-3" onclick="exportExcel()" title="ดาวน์โหลด Excel">
                                    <i class="fas fa-file-excel me-1"></i> Export
                                </button>
                                
                                <button class="btn btn-sm btn-primary fw-bold shadow-sm px-3 d-flex align-items-center" data-bs-toggle="modal" data-bs-target="#scanModal">
                                    <i class="fas fa-qrcode me-1"></i> สแกนเข้า-ออก
                                </button>

                            </div>

                        </div>
                    </div>
                    <div class="table-responsive flex-grow-1 table-responsive-custom">
                        <table class="table table-hover table-striped align-middle mb-0 text-nowrap" style="font-size: 0.85rem;">
                            <thead class="table-light sticky-top shadow-sm" style="z-index: 10;">
                                <tr class="text-secondary text-uppercase">
                                    <th class="px-3" style="width: 80px;">สถานะ</th>
                                    <th>รหัสพนักงาน</th>
                                    <th>สังกัด / แผนก</th> <th>เวลาเข้า (IN)</th>
                                    <th>เวลาออก (OUT)</th>
                                    <th>ระยะเวลา</th>
                                    <th>สถานที่</th>
                                    <th class="text-center" style="width: 60px;">Edit</th>
                                </tr>
                            </thead>
                            <tbody id="historyTbody">
                                <tr><td colspan="8" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>กำลังโหลด...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-center justify-content-md-between align-items-center px-3 rounded-bottom w-100" style="min-height: 54px; z-index: 5;">
                        <div class="d-flex align-items-center h-100">
                            <small class="text-muted fw-bold text-nowrap d-none d-md-block m-0 mt-1" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                        </div>
                        <nav class="overflow-auto hide-scrollbar d-flex align-items-center h-100 m-0" style="-webkit-overflow-scrolling: touch; max-width: 100%;">
                            <ul class="pagination pagination-sm mb-0 justify-content-center justify-content-md-end mt-1" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="fab-container d-md-none">
        <button class="btn btn-primary shadow-lg d-flex align-items-center justify-content-center" data-bs-toggle="modal" data-bs-target="#scanModal" style="width: 56px; height: 56px; border-radius: 50%;">
            <i class="fas fa-qrcode fa-xl"></i>
        </button>
    </div>

    <div class="modal fade" id="scanModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-primary text-white py-2 px-3">
                    <h6 class="modal-title fw-bold mb-0"><i class="fas fa-qrcode me-2"></i> บันทึกเข้า-ออกพื้นที่</h6>
                    <button type="button" class="btn-close btn-close-white" style="font-size: 0.8rem;" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3 bg-light">
                    
                    <form id="verifyForm" onsubmit="verifyEmployee(event)">
                        <div class="row g-2 mb-2">
                            <div class="col-12 col-sm-5">
                                <label class="form-label small fw-bold text-secondary mb-1">สถานที่ (Location) <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm border-secondary-subtle shadow-sm fw-bold text-primary" id="location_id" required>
                                    <option value="">-- โหลดข้อมูล... --</option>
                                </select>
                            </div>
                            <div class="col-12 col-sm-7">
                                <label class="form-label small fw-bold text-secondary mb-1">รหัสพนักงาน / Visitor <span class="text-danger">*</span></label>
                                <div class="input-group input-group-sm shadow-sm">
                                    <span class="input-group-text bg-white text-secondary border-secondary-subtle"><i class="fas fa-barcode"></i></span>
                                    
                                    <input type="text" class="form-control text-center fw-bold text-primary border-secondary-subtle" id="emp_id" list="empList" placeholder="สแกนหรือพิมพ์รหัส" autocomplete="off" required>
                                    
                                    <datalist id="empList"></datalist>

                                    <button type="submit" class="btn btn-secondary fw-bold px-3" id="btnVerify"><i class="fas fa-search"></i></button>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div id="previewCard" class="d-none mt-3">
                        
                        <div class="alert mb-3 py-2 px-3 d-flex align-items-center gap-3 shadow-sm border" id="previewAlert">
                            <div id="previewIcon" class="fs-2"></div>
                            <div class="flex-grow-1 overflow-hidden">
                                <h6 class="fw-bold mb-0 text-dark text-truncate" id="previewName">-</h6>
                                <div class="small text-muted text-truncate mb-1" id="previewPosition">-</div>
                                <span class="badge border" id="previewBadge">STATUS</span>
                            </div>
                        </div>

                        <div id="visitorFields" class="d-none bg-warning bg-opacity-10 p-2 rounded border border-warning-subtle mb-3 shadow-sm">
                            <div class="small fw-bold text-warning-emphasis mb-2"><i class="fas fa-user-tag me-1"></i> ข้อมูลบุคคลภายนอก (Visitor)</div>
                            <div class="row g-2">
                                <div class="col-12 col-sm-6">
                                    <input type="text" class="form-control form-control-sm border-warning-subtle" id="visitor_name" placeholder="ชื่อ-นามสกุล (บังคับ)" autocomplete="off">
                                </div>
                                <div class="col-12 col-sm-6">
                                    <input type="text" class="form-control form-control-sm border-warning-subtle" id="visitor_company" placeholder="บริษัท (ไม่บังคับ)" autocomplete="off">
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="form-label small fw-bold text-secondary mb-1">หมายเหตุ / วัตถุประสงค์</label>
                            <input type="text" class="form-control form-control-sm border-secondary-subtle shadow-sm" id="purpose" placeholder="ระบุเหตุผล (ไม่บังคับ)" autocomplete="off">
                        </div>

                    </div>
                </div>
                <div class="modal-footer bg-white border-top py-2 px-3">
                    <button type="button" class="btn btn-sm btn-light text-secondary border shadow-sm fw-bold px-3" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" id="btnSubmitAccess" class="btn btn-sm btn-primary shadow-sm fw-bold px-4" onclick="submitAccess()" disabled>
                        <i class="fas fa-save me-1"></i> ยืนยันการบันทึก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-warning">
                    <h6 class="modal-title fw-bold text-dark"><i class="fas fa-edit me-2"></i> แก้ไขประวัติ / บังคับออก</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="editForm" onsubmit="submitEdit(event)">
                    <div class="modal-body bg-light p-4">
                        <input type="hidden" id="edit_log_id">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary">เวลาเข้า (IN) <span class="text-danger">*</span></label>
                            <input type="datetime-local" id="edit_scan_in" class="form-control shadow-sm border-secondary-subtle" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary">เวลาออก (OUT)</label>
                            <input type="datetime-local" id="edit_scan_out" class="form-control shadow-sm border-secondary-subtle">
                            <small class="text-muted">ปล่อยว่างไว้หากยังไม่ออก</small>
                        </div>
                        <div class="mb-0">
                            <label class="form-label small fw-bold text-secondary">หมายเหตุ</label>
                            <input type="text" id="edit_purpose" class="form-control shadow-sm border-secondary-subtle">
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top">
                        <button type="button" class="btn btn-secondary shadow-sm fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-warning shadow-sm fw-bold"><i class="fas fa-save me-1"></i> บันทึกการแก้ไข</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        let currentPage = 1;
        const rowsPerPage = 100;
        let searchTimer;

        document.addEventListener('DOMContentLoaded', () => {
            loadLocations();
            loadAutocomplete();
        });

        const scanModalEl = document.getElementById('scanModal');
        scanModalEl.addEventListener('shown.bs.modal', function () {
            document.getElementById('emp_id').focus();
        });

        scanModalEl.addEventListener('hidden.bs.modal', function () {
            document.getElementById('emp_id').value = '';
            document.getElementById('purpose').value = '';
            document.getElementById('visitor_name').value = '';
            document.getElementById('visitor_company').value = '';
            document.getElementById('previewCard').classList.add('d-none');
            document.getElementById('visitorFields').classList.add('d-none');
            document.getElementById('btnSubmitAccess').disabled = true;
        });

        async function loadLocations() {
            try {
                const fd = new FormData(); fd.append('action', 'get_locations');
                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const data = await res.json();
                
                let modalOptions = '<option value="">-- เลือกสถานที่ --</option>';
                let filterOptions = '<option value="">-- ทุกสถานที่ --</option>';
                let defaultStoreId = '';
                
                if(data.success) {
                    data.data.forEach(l => {
                        const opt = `<option value="${l.location_id}">${l.location_name}</option>`;
                        modalOptions += opt;
                        filterOptions += opt;

                        let locName = l.location_name.toUpperCase();
                        if(locName.includes('STORE') || locName.includes('สโตร์') || locName.includes('คลัง')) {
                            defaultStoreId = l.location_id;
                        }
                    });
                }
                
                document.getElementById('location_id').innerHTML = modalOptions;
                document.getElementById('filter_loc').innerHTML = filterOptions;

                if (defaultStoreId !== '') {
                    document.getElementById('location_id').value = defaultStoreId;
                    document.getElementById('filter_loc').value = defaultStoreId;
                }

                loadHistory(); 
            } catch(e) {}
        }

        document.getElementById('filter_search').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                resetPageAndLoad();
            }, 500); 
        });

        function resetPageAndLoad() {
            currentPage = 1;
            loadHistory();
        }

        async function loadHistory(isSilent = false) {
            const tbody = document.getElementById('historyTbody');
            const dStart = document.getElementById('filter_start').value;
            const dEnd = document.getElementById('filter_end').value;
            const l = document.getElementById('filter_loc').value;
            const search = document.getElementById('filter_search').value.trim();

            if (!isSilent) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>กำลังโหลด...</td></tr>';
            }

            try {
                const fd = new FormData(); 
                fd.append('action', 'get_history');
                fd.append('start_date', dStart); 
                fd.append('end_date', dEnd); 
                fd.append('filter_loc', l);
                fd.append('search', search);
                fd.append('page', currentPage);
                fd.append('limit', rowsPerPage);

                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const json = await res.json();

                if (json.success) {
                    document.getElementById('kpiTotalTrans').innerText = json.kpi.total_trans || 0;
                    document.getElementById('kpiTotalInside').innerText = json.kpi.total_inside || 0;
                    document.getElementById('kpiTotalOverdue').innerText = json.kpi.total_overdue || 0;

                    if (json.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูลตามเงื่อนไขค้นหา</td></tr>';
                        renderPagination(0);
                        return;
                    }

                    let html = '';
                    json.data.forEach(r => {
                        const isIN = r.status === 'IN';
                        const dur = r.duration_mins > 60 ? `${Math.floor(r.duration_mins/60)}h ${r.duration_mins%60}m` : `${r.duration_mins}m`;
                        
                        let inIso = (r.scan_in && r.scan_in !== '-') ? r.scan_in.replace(' ', 'T') : '';
                        let outIso = (r.scan_out && r.scan_out !== '-') ? r.scan_out.replace(' ', 'T') : '';
                        const safePurpose = r.purpose ? r.purpose.replace(/'/g, "\\'") : '';

                        let statusBadge = '';
                        if (isIN) {
                            statusBadge = `<span class="status-in status-in-btn w-100 d-inline-block text-center py-1" onclick="forceCheckout(${r.log_id}, '${r.emp_id}', '${r.emp_name}')" title="คลิกเพื่อเช็คเอาท์ทันที"><i class="fas fa-sign-out-alt me-1"></i> ${r.status}</span>`;
                        } else {
                            statusBadge = `<span class="status-out w-100 d-inline-block text-center py-1">${r.status}</span>`;
                        }

                        html += `
                            <tr class="${isIN ? 'bg-success bg-opacity-10' : ''}">
                                <td class="px-2 px-md-3">${statusBadge}</td>
                                
                                <td class="fw-bold text-primary">
                                    ${r.emp_id}<br>
                                    <small class="text-muted fw-normal">${r.emp_name}</small>
                                </td>
                                
                                <td>
                                    <span class="fw-bold text-dark">${r.line_name}</span><br>
                                    <small class="text-muted" style="font-size: 0.7rem;">${r.department_api}</small>
                                </td>
                                
                                <td>${r.scan_in ? r.scan_in.substring(11, 16) : '-'}</td>
                                <td>${r.scan_out ? r.scan_out.substring(11, 16) : '-'}</td>
                                <td><span class="${r.duration_mins > 120 && isIN ? 'text-danger fw-bold' : 'text-muted'}">${dur}</span></td>
                                <td>${r.location_name}<br><small class="text-muted text-truncate d-inline-block" style="max-width:150px;">${r.purpose||'-'}</small></td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-light text-secondary border shadow-sm" onclick="openEditModal(${r.log_id}, '${inIso}', '${outIso}', '${safePurpose}')" title="แก้ไขเวลาย้อนหลัง">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                    renderPagination(json.total_rows);
                }
            } catch(e) {
                if(!isSilent) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            }
        }

        function renderPagination(totalRows) {
            const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
            const info = document.getElementById('paginationInfo');
            const controls = document.getElementById('paginationControls');
            
            if (totalRows === 0) {
                info.innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
                controls.innerHTML = '';
                return;
            }

            const startRow = ((currentPage - 1) * rowsPerPage) + 1;
            const endRow = Math.min(currentPage * rowsPerPage, totalRows);
            info.innerText = `แสดง ${startRow} ถึง ${endRow} จาก ${totalRows} รายการ`;

            let html = '';
            html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1})">ก่อนหน้า</a></li>`;
            
            let startP = Math.max(1, currentPage - 2);
            let endP = Math.min(totalPages, startP + 4);
            if (endP - startP < 4) startP = Math.max(1, endP - 4);

            for (let i = startP; i <= endP; i++) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i})">${i}</a></li>`;
            }

            html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1})">ถัดไป</a></li>`;
            controls.innerHTML = html;
        }

        function changePage(page) {
            if (page < 1) return;
            currentPage = page;
            loadHistory();
        }

        document.getElementById('emp_id').addEventListener('input', function() {
            document.getElementById('previewCard').classList.add('d-none');
            document.getElementById('btnSubmitAccess').disabled = true;
        });

        async function verifyEmployee(e) {
            e.preventDefault();
            
            const emp = document.getElementById('emp_id');
            const btnVerify = document.getElementById('btnVerify');
            const previewCard = document.getElementById('previewCard');
            const btnSubmit = document.getElementById('btnSubmitAccess');
            const visitorFields = document.getElementById('visitorFields');

            if (!emp.value.trim()) return;

            btnVerify.disabled = true;
            btnVerify.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const fd = new FormData(); 
            fd.append('action', 'verify_employee');
            fd.append('emp_id', emp.value.trim());

            try {
                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const data = await res.json();

                if (data.success) {
                    playBeep('success');
                    
                    const empName = data.data.emp_name;
                    const position = data.data.position || 'N/A';
                    
                    document.getElementById('previewName').innerText = empName;
                    document.getElementById('previewPosition').innerText = position;
                    
                    const alertBox = document.getElementById('previewAlert');
                    const badge = document.getElementById('previewBadge');
                    const iconEl = document.getElementById('previewIcon');
                    
                    if (data.data.next_action === 'IN') {
                        alertBox.className = 'alert mb-3 py-2 px-3 d-flex align-items-center gap-3 shadow-sm border border-success bg-success bg-opacity-10';
                        badge.className = 'badge border border-success text-success bg-white';
                        badge.innerText = 'สแกนเข้าพื้นที่ (IN)';
                        iconEl.innerHTML = '<i class="fas fa-sign-in-alt text-success"></i>';
                    } else {
                        alertBox.className = 'alert mb-3 py-2 px-3 d-flex align-items-center gap-3 shadow-sm border border-warning bg-warning bg-opacity-10';
                        badge.className = 'badge border border-warning text-warning-emphasis bg-white';
                        badge.innerText = 'สแกนออกพื้นที่ (OUT)';
                        iconEl.innerHTML = '<i class="fas fa-sign-out-alt text-warning"></i>';
                    }

                    const isVisitor = emp.value.trim().toUpperCase().startsWith('V') || 
                                      position.toLowerCase().includes('visitor') || 
                                      position.includes('บุคคลภายนอก');
                    
                    if (isVisitor) {
                        visitorFields.classList.remove('d-none');
                        document.getElementById('visitor_name').setAttribute('required', 'true');
                        setTimeout(() => document.getElementById('visitor_name').focus(), 100);
                    } else {
                        visitorFields.classList.add('d-none');
                        document.getElementById('visitor_name').removeAttribute('required');
                        btnSubmit.focus();
                    }

                    previewCard.classList.remove('d-none');
                    btnSubmit.disabled = false;
                } else {
                    playBeep('error');
                    Swal.fire({ icon: 'error', title: 'ปฏิเสธการทำรายการ', text: data.message });
                    emp.value = '';
                    emp.focus();
                }
            } catch(e) {
                Swal.fire('Error', 'Network error', 'error');
            } finally {
                btnVerify.disabled = false;
                btnVerify.innerHTML = '<i class="fas fa-search"></i>';
            }
        }

        async function submitAccess() {
            const emp = document.getElementById('emp_id');
            const loc = document.getElementById('location_id');
            const btnSubmit = document.getElementById('btnSubmitAccess');
            const visitorFields = document.getElementById('visitorFields');
            
            let finalPurpose = document.getElementById('purpose').value.trim();

            if (!emp.value.trim() || !loc.value) return;

            if (!visitorFields.classList.contains('d-none')) {
                const vName = document.getElementById('visitor_name').value.trim();
                const vComp = document.getElementById('visitor_company').value.trim();
                
                if (!vName) {
                    Swal.fire({ icon: 'warning', title: 'ระบุข้อมูลไม่ครบ', text: 'กรุณาระบุชื่อ-นามสกุล ของบุคคลภายนอก (Visitor)' });
                    document.getElementById('visitor_name').focus();
                    return;
                }
                
                let vInfo = `[Visitor: ${vName}`;
                if (vComp) vInfo += ` / ${vComp}`;
                vInfo += `]`;
                
                finalPurpose = finalPurpose ? `${vInfo} ${finalPurpose}` : vInfo;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> บันทึก...';

            const fd = new FormData(); 
            fd.append('action', 'record_access');
            fd.append('emp_id', emp.value.trim()); 
            fd.append('location_id', loc.value); 
            fd.append('purpose', finalPurpose);

            try {
                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const data = await res.json();

                if (data.success) {
                    Swal.fire({ 
                        icon: 'success', title: data.message, text: emp.value.trim(), 
                        timer: 1500, showConfirmButton: false, toast: true, position: 'top-end',
                        iconColor: data.data.action_type === 'IN' ? '#198754' : '#fd7e14'
                    });

                    emp.value = ''; 
                    document.getElementById('purpose').value = '';
                    document.getElementById('visitor_name').value = '';
                    document.getElementById('visitor_company').value = '';
                    document.getElementById('previewCard').classList.add('d-none');
                    document.getElementById('visitorFields').classList.add('d-none');
                    loadHistory();
                } else {
                    playBeep('error');
                    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: data.message });
                }
            } catch(e) {
                Swal.fire('Error', 'Network error', 'error');
            } finally {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-save me-1"></i> ยืนยันบันทึก';
                emp.focus();
            }
        }

        function openEditModal(id, scanIn, scanOut, purpose) {
            document.getElementById('edit_log_id').value = id;
            document.getElementById('edit_scan_in').value = scanIn;
            document.getElementById('edit_scan_out').value = scanOut !== 'null' ? scanOut : '';
            document.getElementById('edit_purpose').value = purpose !== 'null' ? purpose : '';
            new bootstrap.Modal(document.getElementById('editModal')).show();
        }

        async function submitEdit(e) {
            e.preventDefault();
            const btn = document.querySelector('#editForm button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> บันทึก...';

            const fd = new FormData();
            fd.append('action', 'manual_edit');
            fd.append('log_id', document.getElementById('edit_log_id').value);
            fd.append('scan_in', document.getElementById('edit_scan_in').value);
            fd.append('scan_out', document.getElementById('edit_scan_out').value);
            fd.append('purpose', document.getElementById('edit_purpose').value);

            try {
                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const json = await res.json();
                if(json.success) {
                    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                    loadHistory();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch(e) {
                Swal.fire('Error', 'Network error', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-1"></i> บันทึกการแก้ไข';
            }
        }

        function exportExcel() {
            const tbody = document.getElementById('historyTbody');
            if (!tbody || tbody.rows.length === 0 || tbody.innerText.includes('ไม่พบข้อมูล')) {
                Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับ Export', 'warning');
                return;
            }

            let wsData = [
                ['สถานะ', 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สังกัด (Line)', 'แผนก (API)', 'เวลาเข้า (IN)', 'เวลาออก (OUT)', 'ระยะเวลา', 'สถานที่', 'หมายเหตุ']
            ];

            Array.from(tbody.rows).forEach(row => {
                if (row.cells.length < 7) return;
                
                const status = row.cells[0].innerText.trim();
                const empData = row.cells[1].innerText.split('\n');
                const empId = empData[0].trim();
                const empName = (empData[1] || '').trim();
                
                const deptData = row.cells[2].innerText.split('\n');
                const lineName = deptData[0].trim();
                const deptApi = (deptData[1] || '').trim();

                const timeIn = row.cells[3].innerText.trim();
                const timeOut = row.cells[4].innerText.trim();
                const duration = row.cells[5].innerText.trim();
                
                const locData = row.cells[6].innerText.split('\n');
                const location = locData[0].trim();
                const purpose = (locData[1] || '').trim();

                wsData.push([status, empId, empName, lineName, deptApi, timeIn, timeOut, duration, location, purpose]);
            });

            try {
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Access_Log");
                
                const dStart = document.getElementById('filter_start').value;
                const dEnd = document.getElementById('filter_end').value;
                const dateRangeStr = (dStart === dEnd) ? dStart : `${dStart}_to_${dEnd}`;
                
                XLSX.writeFile(wb, `Area_Access_Log_${dateRangeStr}.xlsx`);
            } catch(e) {
                Swal.fire('Error', 'ไม่พบ Library XLSX สำหรับ Export', 'error');
            }
        }

        function playBeep(type = 'success') {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                if (type === 'success') {
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.15);
                } else {
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.4);
                }
            } catch (e) {}
        }

        function forceCheckout(logId, empId, empName) {
            Swal.fire({
                title: 'ยืนยันการเช็คเอาท์?',
                html: `คุณต้องการให้ <b>${empId} - ${empName}</b><br>เช็คเอาท์ออกจากพื้นที่ <b>"เดี๋ยวนี้"</b> ใช่หรือไม่?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fas fa-sign-out-alt me-1"></i> ยืนยัน',
                cancelButtonText: 'ยกเลิก'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const fd = new FormData();
                    fd.append('action', 'force_checkout');
                    fd.append('log_id', logId);

                    try {
                        const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (data.success) {
                            playBeep('success');
                            Swal.fire({ icon: 'success', title: data.message, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                            loadHistory();
                        } else {
                            playBeep('error');
                            Swal.fire('ผิดพลาด', data.message, 'error');
                        }
                    } catch(e) {
                        Swal.fire('Error', 'Network error', 'error');
                    }
                }
            });
        }

        async function loadAutocomplete() {
            try {
                const fd = new FormData(); 
                fd.append('action', 'get_autocomplete');
                const res = await fetch('api/apiAreaAccess.php', { method: 'POST', body: fd });
                const data = await res.json();
                
                if (data.success) {
                    const dataList = document.getElementById('empList');
                    let options = '';
                    data.data.forEach(emp => {
                        options += `<option value="${emp.emp_id}">${emp.name_th}</option>`;
                    });
                    dataList.innerHTML = options;
                }
            } catch(e) {
                console.error('Failed to load autocomplete data', e);
            }
        }

        setInterval(() => {
            const scanModal = document.getElementById('scanModal');
            const editModal = document.getElementById('editModal');
            
            if (!scanModal.classList.contains('show') && !editModal.classList.contains('show')) {
                const tmpTbody = document.getElementById('historyTbody');
                if (!tmpTbody.innerHTML.includes('กำลังโหลด')) {
                    loadHistory(true); 
                }
            }
        }, 60000);
    </script>
</body>
</html>