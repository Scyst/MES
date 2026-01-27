<?php
// page/manpower/holidayUI.php
require_once __DIR__ . '/../components/init.php';

if (!isset($_SESSION['user']) || !in_array($_SESSION['user']['role'], ['admin', 'creator'])) {
    die("Access Denied");
}

// ✅ 1. กำหนดค่า Header Config ส่งให้ top_header.php
$pageTitle = "Holiday Settings";
$pageHeaderTitle = "จัดการวันหยุด (Holiday Calendar)";
$pageHeaderSubtitle = "คลิกช่องวันที่เพื่อเพิ่ม หรือคลิกแถบสีเพื่อแก้ไข";
$pageIcon = "fas fa-calendar-alt";
$pageBackLink = "manpowerUI.php"; // ส่ง Link เพื่อให้แสดงปุ่ม Back
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?= $pageTitle ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <script src="../../utils/libs/fullcalendar.global.min.js"></script> 
    
    <style>
        /* UI Clean Layout */
        body.layout-top-header { overflow: hidden; }

        #main-content {
            /* ความสูงหัก Header ออก = พอดีจอเป๊ะ */
            height: calc(100vh - var(--header-height)); 
            display: flex;
            flex-direction: column;
            padding: 1rem;
            overflow: hidden; 
        }

        .calendar-wrapper {
            background: #fff;
            padding: 10px 15px; /* ลด Padding นิดนึงเพื่อให้พื้นที่ปฏิทินเยอะขึ้น */
            border-radius: 8px;
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
            flex: 1; 
            display: flex;
            flex-direction: column;
            overflow: hidden; 
        }

        #calendar { flex: 1; height: 100%; }

        /* FullCalendar Customization */
        .fc-event { cursor: pointer; border: none; padding: 2px 4px; font-size: 0.85rem; transition: transform 0.1s; }
        .fc-event:hover { transform: scale(1.02); filter: brightness(0.9); }
        .fc-daygrid-day.fc-day-today { background-color: rgba(78, 115, 223, 0.05) !important; }
        .fc-col-header-cell-cushion { text-decoration: none; color: #4e73df; font-weight: 800; }
        .fc-toolbar-title { font-size: 1.25rem !important; }
        .fc-button { font-size: 0.85rem !important; }
    </style>
</head>

<body class="layout-top-header">
    
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="calendar-wrapper">
            <div id="calendar"></div>
        </div>
    </main>

    <div class="modal fade" id="holidayModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title fw-bold" id="modalTitle">Set Holiday</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="holidayForm">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold text-uppercase">Date</label>
                            <input type="date" class="form-control bg-light fw-bold text-primary" id="hDate" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold text-uppercase">Description</label>
                            <input type="text" class="form-control" id="hDesc" placeholder="ชื่อวันหยุด..." required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label text-muted small fw-bold text-uppercase">Work Rate</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light">x</span>
                                    <input type="number" class="form-control" id="hWorkRate" value="2.0" step="0.5">
                                </div>
                            </div>
                            <div class="col-6">
                                <label class="form-label text-muted small fw-bold text-uppercase">OT Rate</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light">x</span>
                                    <input type="number" class="form-control" id="hOtRate" value="3.0" step="0.5">
                                </div>
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="form-label text-muted small fw-bold text-uppercase">Type</label>
                            <select class="form-select" id="hType">
                                <option value="HOLIDAY">🔴 HOLIDAY (นักขัตฤกษ์)</option>
                                <option value="OFFDAY">🟡 OFFDAY (หยุดบริษัท)</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer justify-content-between bg-light">
                    <button type="button" class="btn btn-outline-danger btn-sm" id="btnDelete" style="display:none;">
                        <i class="fas fa-trash-alt me-1"></i> Delete
                    </button>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary btn-sm px-4" onclick="saveHoliday()">Save</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendar');
            var calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                height: '100%',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listYear' },
                events: 'api/api_holiday.php?action=read',
                dateClick: function(info) { openModal(info.dateStr, null); },
                eventClick: function(info) { info.jsEvent.preventDefault(); openModal(info.event.startStr, info.event); }
            });
            calendar.render();
            window.calendarInstance = calendar;
        });

        const modal = new bootstrap.Modal(document.getElementById('holidayModal'));

        function openModal(dateStr, eventObj) {
            document.getElementById('holidayForm').reset();
            document.getElementById('hDate').value = dateStr;
            const btnDelete = document.getElementById('btnDelete');
            const modalTitle = document.getElementById('modalTitle');

            if (eventObj) {
                modalTitle.innerText = '✏️ Edit Holiday';
                document.getElementById('hDesc').value = eventObj.title;
                document.getElementById('hWorkRate').value = eventObj.extendedProps?.work_rate ?? 2.0;
                document.getElementById('hOtRate').value = eventObj.extendedProps?.ot_rate ?? 3.0;
                document.getElementById('hType').value = eventObj.extendedProps?.day_type ?? 'HOLIDAY';
                btnDelete.style.display = 'block';
                btnDelete.onclick = () => deleteHoliday(dateStr);
            } else {
                modalTitle.innerText = '➕ Add Holiday';
                document.getElementById('hWorkRate').value = '2.0';
                document.getElementById('hOtRate').value = '3.0';
                btnDelete.style.display = 'none';
            }
            modal.show();
            setTimeout(() => document.getElementById('hDesc').focus(), 500);
        }

        async function saveHoliday() {
            const payload = {
                action: 'save',
                date: document.getElementById('hDate').value,
                description: document.getElementById('hDesc').value,
                work_rate: document.getElementById('hWorkRate').value,
                ot_rate: document.getElementById('hOtRate').value,
                day_type: document.getElementById('hType').value
            };
            if(!payload.description) return alert("Required description");
            
            await apiRequest(payload);
        }

        async function deleteHoliday(dateStr) {
            if (!confirm('Confirm delete?')) return;
            await apiRequest({ action: 'delete', date: dateStr });
        }

        async function apiRequest(payload) {
            try {
                const res = await fetch('api/api_holiday.php', {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    modal.hide();
                    window.calendarInstance.refetchEvents();
                } else {
                    alert(json.message);
                }
            } catch (e) { console.error(e); }
        }
    </script>

    <?php include_once __DIR__ . '/../components/php/docking_sidebar.php'; ?>
</body>
</html>