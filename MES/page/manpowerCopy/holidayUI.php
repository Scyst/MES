<?php
// page/manpower/holidayUI.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('manage_manpower')) {
    die("Access Denied: You do not have permission to manage holiday settings.");
}

$pageTitle = "Holiday Settings";
$pageHeaderTitle = "จัดการวันหยุด (Holiday Calendar)";
$pageHeaderSubtitle = "คลิกช่องวันที่เพื่อเพิ่ม หรือคลิกแถบสีเพื่อแก้ไข";
$pageIcon = "fas fa-calendar-alt";
$pageBackLink = "manpowerUI.php";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?= $pageTitle ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <script src="../../utils/libs/fullcalendar.global.min.js"></script> 
    
    <style>
        body.layout-top-header { overflow: hidden; }

        #main-content {
            height: calc(100vh - var(--header-height)); 
            display: flex;
            flex-direction: column;
            padding: 1rem;
            overflow: hidden; 
        }

        .calendar-wrapper {
            background: #fff;
            padding: 10px 15px;
            border-radius: 8px;
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
            flex: 1; 
            display: flex;
            flex-direction: column;
            overflow: hidden; 
        }

        #calendar { flex: 1; height: 100%; }
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

    <div class="modal fade" id="holidayEditorModal" tabindex="-1">
        <div class="modal-dialog modal-sm modal-dialog-centered">
            <div class="modal-content shadow rounded-4 border-0">
                <div class="modal-header bg-light border-bottom-0 pb-0">
                    <h6 class="modal-title fw-bold" id="editorTitle">Edit Holiday</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body pt-2">
                    <form id="holidayForm">
                        <input type="hidden" id="hDate">
                        <div class="mb-2">
                            <label class="small text-muted fw-bold">Date</label>
                            <div id="hDateDisplay" class="fw-bold text-primary"></div>
                        </div>
                        <div class="mb-2">
                            <label class="small text-muted fw-bold">Description</label>
                            <input type="text" class="form-control form-control-sm" id="hDesc" required>
                        </div>
                        <div class="mb-2">
                            <label class="small text-muted fw-bold">Type</label>
                            <select class="form-select form-select-sm" id="hType">
                                <option value="HOLIDAY">🔴 Holiday (นักขัตฤกษ์)</option>
                                <option value="OFFDAY">🟡 Off-day (หยุดบริษัท)</option>
                                <option value="SUNDAY">⚪ Sunday (วันอาทิตย์)</option>
                                <option value="NORMAL">🟢 Normal Day (วันทำงานปกติ)</option>
                            </select>
                        </div>
                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="small text-muted fw-bold">Work Rate</label>
                                <input type="number" class="form-control form-control-sm" id="hWorkRate" value="2.0" step="0.5">
                            </div>
                            <div class="col-6">
                                <label class="small text-muted fw-bold">OT Rate</label>
                                <input type="number" class="form-control form-control-sm" id="hOtRate" value="3.0" step="0.5">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer border-top-0 pt-0">
                    <button type="button" class="btn btn-outline-danger btn-sm me-auto" id="btnDeleteHoliday" style="display:none;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" class="btn btn-primary btn-sm rounded-pill px-4" onclick="saveHoliday()">Save</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let calendarInstance = null;
        let editorModal = null;

        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendar');
            calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                height: '100%',
                headerToolbar: { 
                    left: 'prev,next today', 
                    center: 'title', 
                    right: 'dayGridMonth,listYear' 
                },
                buttonText: {
                    today: 'วันนี้',
                    month: 'ปฏิทิน',
                    list: 'รายการ'
                },
                events: function(fetchInfo, successCallback, failureCallback) {
                    fetch(`api/api_holiday.php?action=read&start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`)
                        .then(response => response.json())
                        .then(result => {
                            if (result.success) {
                                successCallback(result.data);
                            } else {
                                console.error('Error fetching holidays:', result.message);
                                failureCallback();
                            }
                        })
                        .catch(error => {
                            console.error('Fetch error:', error);
                            failureCallback(error);
                        });
                },

                eventContent: function(info) {
                    let title = info.event.title || info.event.extendedProps.day_type;
                    let workRate = info.event.extendedProps.work_rate;
                    let otRate = info.event.extendedProps.ot_rate;
                    let type = info.event.extendedProps.day_type;
                    
                    // Main title
                    let html = `<div class="text-truncate fw-bold" style="font-size: 0.85rem;">${title}</div>`;
                    
                    // Show rates if it's not a normal day, or if rates deviate from normal
                    if (type !== 'NORMAL' || workRate != 1.0 || otRate != 1.5) {
                        let details = [];
                        if (workRate) details.push(`<span title="Work Rate"><i class="fas fa-briefcase"></i> ${parseFloat(workRate).toFixed(1)}x</span>`);
                        if (otRate) details.push(`<span title="OT Rate"><i class="fas fa-clock"></i> ${parseFloat(otRate).toFixed(1)}x</span>`);
                        
                        html += `<div style="font-size: 0.7rem; opacity: 0.9; margin-top: 3px; display:flex; gap:8px;">${details.join('')}</div>`;
                    }
                    
                    return { html: `<div class="p-1" style="line-height: 1.2;">${html}</div>` };
                },
                
                eventDidMount: function(info) {
                    const type = info.event.extendedProps.day_type;
                    if (type === 'HOLIDAY') {
                        info.el.style.backgroundColor = 'var(--bs-danger)';
                        info.el.style.borderColor = 'var(--bs-danger)';
                        info.el.style.color = '#fff';
                    } else if (type === 'OFFDAY') {
                        info.el.style.backgroundColor = 'var(--bs-warning)';
                        info.el.style.borderColor = 'var(--bs-warning)';
                        info.el.style.color = '#000';
                    } else if (type === 'SUNDAY') {
                        info.el.style.backgroundColor = 'var(--bs-secondary)';
                        info.el.style.borderColor = 'var(--bs-secondary)';
                        info.el.style.color = '#fff';
                    } else if (type === 'NORMAL') {
                        info.el.style.backgroundColor = 'var(--bs-success)';
                        info.el.style.borderColor = 'var(--bs-success)';
                        info.el.style.color = '#fff';
                    }
                    // Add a nice subtle shadow
                    info.el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    info.el.style.borderRadius = '4px';
                },

                dateClick: function(info) { 
                    const existingEvent = calendarInstance.getEvents().find(e => e.startStr === info.dateStr);
                    openHolidayEditor(info.dateStr, existingEvent || null);
                },
                eventClick: function(info) { 
                    info.jsEvent.preventDefault(); 
                    openHolidayEditor(info.event.startStr, info.event); 
                }
            });
            calendarInstance.render();
        });

        function openHolidayEditor(dateStr, eventObj) {
            if (!editorModal) editorModal = new bootstrap.Modal(document.getElementById('holidayEditorModal'));
            
            document.getElementById('hDate').value = dateStr;
            document.getElementById('hDateDisplay').innerText = dateStr;
            document.getElementById('holidayForm').reset();
            
            const btnDelete = document.getElementById('btnDeleteHoliday');

            if (eventObj) {
                document.getElementById('editorTitle').innerText = 'Edit Date: ' + dateStr;
                document.getElementById('hDesc').value = eventObj.title || '';
                document.getElementById('hType').value = eventObj.extendedProps.day_type || 'NORMAL';
                document.getElementById('hWorkRate').value = eventObj.extendedProps.work_rate || 2.0;
                document.getElementById('hOtRate').value = eventObj.extendedProps.ot_rate || 3.0;
                
                if (eventObj.extendedProps.day_type === 'NORMAL') {
                    btnDelete.style.display = 'none';
                } else {
                    btnDelete.style.display = 'block';
                    btnDelete.onclick = () => deleteHoliday(dateStr);
                }
                
            } else {
                document.getElementById('editorTitle').innerText = 'Add Config: ' + dateStr;
                document.getElementById('hType').value = 'HOLIDAY';
                document.getElementById('hWorkRate').value = 2.0;
                document.getElementById('hOtRate').value = 3.0;
                
                btnDelete.style.display = 'none';
            }
            editorModal.show();
            setTimeout(() => document.getElementById('hDesc').focus(), 500);
        }

        async function saveHoliday() {
            const dateVal = document.getElementById('hDate').value;
            const typeVal = document.getElementById('hType').value;

            let workRate = document.getElementById('hWorkRate').value;
            let otRate = document.getElementById('hOtRate').value;
            let desc = document.getElementById('hDesc').value;

            if (typeVal === 'NORMAL') {
                workRate = 1.0;
                otRate = 1.5;
                if (!desc) desc = 'Normal Working Day';
            } else {
                if (!desc) return Swal.fire('Warning', 'กรุณาระบุชื่อวันหยุด', 'warning');
            }

            const payload = {
                action: 'save',
                date: dateVal, 
                description: desc, 
                day_type: typeVal,
                work_rate: workRate, 
                ot_rate: otRate
            };
            
            await apiRequest(payload);
        }

        async function deleteHoliday(dateStr) {
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบ?',
                text: `คุณต้องการลบข้อมูลวันหยุดของวันที่ ${dateStr} ใช่หรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'ใช่, ลบเลย!',
                cancelButtonText: 'ยกเลิก'
            });

            if (!confirmResult.isConfirmed) return;
            
            await apiRequest({ action: 'delete', date: dateStr });
        }

        async function apiRequest(payload) {
            try {
                const res = await fetch('api/api_holiday.php', {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    editorModal.hide();
                    calendarInstance.refetchEvents();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'บันทึกสำเร็จ',
                        showConfirmButton: false,
                        timer: 1500
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', json.message, 'error');
                }
            } catch (e) { 
                console.error(e); 
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
            }
        }
    </script>

</body>
</html>