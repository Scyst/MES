<script>
let currentFilter = 'date';
let currentUpdatePo = null;
let currentQaData = [];
let qaCalendarInstance = null;
let currentQaView = 'list';

function loadQASchedule(filterType = null) {
    if (filterType) currentFilter = filterType;
    
    // Clear check if switching to date input
    if (currentFilter === 'date' || currentFilter === 'custom_range') {
        const startStr = document.getElementById('scheduleStartDate').value;
        const endStr = document.getElementById('scheduleEndDate').value;
        const tStr = new Date().toISOString().split('T')[0];
        
        if (startStr === tStr && endStr === tStr) {
            const btnToday = document.getElementById('btnDate_today');
            if(btnToday) btnToday.checked = true;
        } else {
            document.querySelectorAll('input[name="dateFilterGroup"]').forEach(el => el.checked = false);
        }
    } else {
        const btnFilter = document.getElementById('btnDate_' + currentFilter);
        if(btnFilter) btnFilter.checked = true;
    }

    const startDate = document.getElementById('scheduleStartDate').value;
    const endDate = document.getElementById('scheduleEndDate').value;
    const tbody = document.getElementById('qaScheduleBody');
    tbody.innerHTML = '<tr><td colspan="13" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
    
    fetch(`./api/qa_schedule_api.php?action=get_schedule&start_date=${startDate}&end_date=${endDate}&range=${currentFilter}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.stats) {
                const qaTotal = document.getElementById('stat-qa-total');
                if(qaTotal) qaTotal.innerText = res.stats.total;
                    document.getElementById('stat-waiting').innerText = res.stats.waiting;
                    document.getElementById('stat-inprogress').innerText = res.stats.in_progress;
                    document.getElementById('stat-passed').innerText = res.stats.passed;
                    document.getElementById('stat-failed').innerText = res.stats.failed;
                }

                currentQaData = res.data;
                if (typeof fetchAndRenderQaCalendar === 'function') {
                    fetchAndRenderQaCalendar();
                }

                if(res.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="13" class="text-center py-4 text-muted">No schedule for this date.</td></tr>';
                    return;
                }
                
                const todayDate = new Date();
                todayDate.setHours(0,0,0,0);
                const in7Days = new Date(todayDate);
                in7Days.setDate(todayDate.getDate() + 7);

                let html = '';
                res.data.forEach(po => {
                    let statusBadge = '<span class="badge bg-secondary">WAITING</span>';
                    if (po.inspection_status === 'IN_PROGRESS') statusBadge = '<span class="badge bg-warning text-dark">IN PROGRESS</span>';
                    if (po.inspection_status === 'DONE') statusBadge = '<span class="badge bg-success">DONE</span>';
                    
                    let typeBadge = '';
                    if (po.inspect_type === 'Remote') typeBadge = '<span class="badge bg-info mt-1 d-block" style="width:fit-content; margin:0 auto;">Remote</span>';
                    if (po.inspect_type === 'On-site') typeBadge = '<span class="badge bg-primary mt-1 d-block" style="width:fit-content; margin:0 auto;">On-site</span>';

                    let resultBadge = '';
                    if (po.inspection_result === 'PASS') resultBadge = '<span class="badge bg-success ms-1">PASS</span>';
                    if (po.inspection_result === 'FAIL') resultBadge = '<span class="badge bg-danger ms-1">FAIL</span>';

                    let rowClass = '';
                    if (po.inspection_status !== 'DONE' && po.loading_date) {
                        const lDate = new Date(po.loading_date);
                        lDate.setHours(0,0,0,0);
                        if (lDate <= todayDate) {
                            rowClass = 'table-overdue';
                        } else if (lDate <= in7Days) {
                            rowClass = 'table-approaching';
                        }
                    }

                    let inspectorCell = po.qa_inspector ? 
                        `<span class="badge bg-info text-dark shadow-sm"><i class="fas fa-user-check me-1"></i>${po.qa_inspector}</span>` :
                        `<button class="btn btn-sm btn-outline-primary py-0 px-2 shadow-sm" onclick="event.stopPropagation(); assignToMe(${po.id})" style="font-size:0.75rem;">Assign to Me</button>`;

                    html += `
                        <tr class="${rowClass}" style="cursor: pointer;" onclick='openUpdateModal(${JSON.stringify(po).replace(/'/g, "&#39;")})' title="Click to view/update">
                            <td class="text-center" onclick="event.stopPropagation()">
                                <input type="checkbox" class="form-check-input po-checkbox" value="${po.id}" onchange="updateBulkCount()">
                            </td>
                            <td class="text-center text-secondary">${po.ticket_number || '-'}</td>
                            <td class="px-3 fw-bold text-primary text-center">${po.po_number}</td>
                            <td class="text-start">
                                <div><strong>${po.sku}</strong></div>
                                <div class="small text-muted">${po.description} (${po.color})</div>
                            </td>
                            <td class="fw-bold text-center">${po.quantity ? Number(po.quantity).toLocaleString() : '-'}</td>
                            <td class="text-center text-muted">-</td>
                            <td class="text-center">${po.dc_location || '-'}</td>
                            <td class="text-center fw-bold text-dark">${po.inspection_date ? po.inspection_date.substring(0, 10) : '-'}</td>
                            <td class="text-center fw-bold text-success">${po.actual_inspection_date ? po.actual_inspection_date.substring(0, 10) : '-'}</td>
                            <td class="text-center">${po.loading_date ? po.loading_date : '-'}</td>
                            <td class="text-center fw-bold text-secondary">${po.loading_week || '-'}</td>
                            <td class="text-center" onclick="event.stopPropagation()">${inspectorCell}</td>
                            <td class="text-center">${statusBadge} ${resultBadge} ${typeBadge}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        }).catch(err => {
            console.error('Network Error in loadQASchedule:', err);
            Swal.fire('Error', 'Network Error: ' + err.message, 'error');
        });
}

function loadQcUsers() {
    fetch('./api/qa_schedule_api.php?action=get_qc_users')
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                const selects = document.querySelectorAll('.qc-user-select');
                selects.forEach(select => {
                    select.innerHTML = '<option value="">- Select -</option>';
                    res.data.forEach(user => {
                        const name = user.aka ? `${user.fullname} (${user.aka})` : user.fullname;
                        select.innerHTML += `<option value="${user.fullname}">${name}</option>`;
                    });
                });
            }
        });
}

function toggleSelectAllPo(el) {
    const isChecked = el.checked;
    document.querySelectorAll('.po-checkbox').forEach(cb => cb.checked = isChecked);
    updateBulkCount();
}

function updateBulkCount() {
    const count = document.querySelectorAll('.po-checkbox:checked').length;
    const btn = document.getElementById('btnBulkUpdate');
    document.getElementById('bulkCount').innerText = count;
    
    if (count > 0) {
        btn.classList.remove('d-none');
    } else {
        btn.classList.add('d-none');
    }
}

function openBulkUpdateModal() {
    const count = document.querySelectorAll('.po-checkbox:checked').length;
    if (count === 0) return;
    
    document.getElementById('bulkUpdateCount').innerText = count;
    document.getElementById('bulk_ticket_number').value = '';
    document.getElementById('bulk_qa_inspector').value = '';
    document.querySelectorAll('input[name="bulk_inspect_type"]').forEach(el => el.checked = false);
    
    const modal = new bootstrap.Modal(document.getElementById('bulkUpdateModal'));
    modal.show();
}

function saveBulkUpdate() {
    const poIds = Array.from(document.querySelectorAll('.po-checkbox:checked')).map(cb => cb.value);
    if (poIds.length === 0) return;
    
    const ticket = document.getElementById('bulk_ticket_number').value;
    const inspector = document.getElementById('bulk_qa_inspector').value;
    const type = document.querySelector('input[name="bulk_inspect_type"]:checked');
    
    const btn = document.getElementById('btnSaveBulk');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    
    const formData = new FormData();
    formData.append('po_ids', JSON.stringify(poIds));
    formData.append('ticket_number', ticket);
    formData.append('qa_inspector', inspector);
    if (type) formData.append('inspect_type', type.value);
    
    fetch('./api/qa_schedule_api.php?action=bulk_update_ticket', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            bootstrap.Modal.getInstance(document.getElementById('bulkUpdateModal')).hide();
            loadQASchedule();
            const selectAll = document.getElementById('selectAllPo');
            if(selectAll) selectAll.checked = false;
            updateBulkCount();
        } else {
            alert('Error: ' + res.message);
        }
    })
    .catch(err => {
        console.error('Network Error in bulk update:', err);
        Swal.fire('Error', 'Network Error', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-1"></i> Update Selected';
    });
}

function openAddScheduleModal() {
    document.getElementById('searchPoInput').value = '';
    document.getElementById('poSearchResult').innerHTML = '';
    const modal = new bootstrap.Modal(document.getElementById('addScheduleModal'));
    modal.show();
}

function searchPO() {
    const term = document.getElementById('searchPoInput').value.trim();
    if (!term) return;
    
    const resultDiv = document.getElementById('poSearchResult');
    resultDiv.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin text-primary"></i> Searching...</div>';
    
    fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    resultDiv.innerHTML = '<div class="text-center py-3 text-muted">No PO found.</div>';
                    return;
                }
                
                let html = '';
                res.data.forEach(po => {
                    html += `
                        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1 fw-bold text-primary">${po.po_number} <span class="badge bg-info ms-2">${po.sku}</span></h6>
                                <small class="text-muted">Qty: ${po.quantity} | Loading: ${po.loading_date || '-'}</small>
                                ${po.inspection_date ? `<br><small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Already scheduled on ${po.inspection_date}</small>` : ''}
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="schedulePO(${po.id})">
                                <i class="fas fa-calendar-plus me-1"></i> Add
                            </button>
                        </div>
                    `;
                });
                resultDiv.innerHTML = html;
            }
        });
}

function schedulePO(id, date = null) {
    if (!date) {
        date = document.getElementById('scheduleStartDate').value;
    }
    const formData = new FormData();
    formData.append('id', id);
    formData.append('schedule_date', date);
    
    fetch('./api/qa_schedule_api.php?action=schedule_po', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            Swal.fire({icon:'success', title:'Scheduled!', timer:1500, showConfirmButton:false});
            const modalEl = document.getElementById('addScheduleModal');
            if (modalEl) {
                const modalInst = bootstrap.Modal.getInstance(modalEl);
                if (modalInst) modalInst.hide();
            }
            loadQASchedule();
            loadPendingJobs(); // refresh sidebar
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function removeSchedule(id, force = false) {
    let title = 'Are you sure?';
    let text = "This will remove the PO from the QA schedule.";
    if (force) {
        title = 'Reset Inspection Data?';
        text = "This PO has already been inspected or is in progress. Removing it will clear all results. Are you sure?";
    }

    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: force ? 'Yes, reset it' : 'Yes, remove it',
        confirmButtonColor: '#dc3545'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', id);
            if (force) formData.append('force', '1');

            fetch('./api/qa_schedule_api.php?action=remove_schedule', {
                method: 'POST',
                body: formData
            }).then(r => r.json()).then(res => {
                if(res.success) {
                    Swal.fire({icon: 'success', title: 'Removed', timer: 1500, showConfirmButton: false});
                    const modalEl = document.getElementById('updateInspectionModal');
                    const modalInst = bootstrap.Modal.getInstance(modalEl);
                    if (modalInst) modalInst.hide();
                    loadQASchedule();
                    loadPendingJobs();
                } else if (res.require_force) {
                    removeSchedule(id, true);
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            });
        }
    });
}

function openUpdateModal(po) {
    currentUpdatePo = po;
    document.getElementById('inspect_po_id').value = po.id;
    document.getElementById('inspect_po_number').value = po.po_number + ' - ' + po.sku;
    document.getElementById('inspect_ticket_number').value = po.ticket_number || '';
    document.getElementById('inspect_qa_inspector').value = po.qa_inspector || '';

    if (po.inspect_type === 'Remote') {
        document.getElementById('type_remote').checked = true;
    } else if (po.inspect_type === 'On-site') {
        document.getElementById('type_onsite').checked = true;
    } else {
        document.querySelectorAll(`input[name="inspect_type"]`).forEach(el => el.checked = false);
    }
    
    if (po.inspection_result === 'PASS') document.getElementById('res_pass').checked = true;
    else if (po.inspection_result === 'FAIL') document.getElementById('result_fail').checked = true;
    else if (po.inspection_result === 'PENDING') document.getElementById('res_pending').checked = true;
    else document.querySelectorAll(`input[name="inspection_result"]`).forEach(el => el.checked = false);
    
    let status = po.inspection_status ? po.inspection_status.toString().trim().toUpperCase() : '';
    if (status !== 'IN_PROGRESS' && status !== 'DONE') {
        status = 'WAITING';
    }
    
    document.getElementById('inspect_status').value = status;
    document.getElementById('inspect_actual_date').value = po.actual_inspection_date ? po.actual_inspection_date.substring(0, 10) : '';
    
    let result = po.inspection_result ? po.inspection_result.toString().trim().toUpperCase() : '';
    if (result === 'NULL') result = '';
    
    if (result) {
        const resultRadio = document.getElementById('result_' + result.toLowerCase());
        if (resultRadio) resultRadio.checked = true;
    } else {
        document.querySelectorAll(`input[name="inspection_result"]`).forEach(el => el.checked = false);
    }
    
    document.getElementById('inspect_remark').value = po.inspection_remark || '';
    
    // Bind remove button inside the modal
    document.getElementById('btnRemoveScheduleModal').onclick = function() { removeSchedule(po.id); };
    
    const modalEl = document.getElementById('updateInspectionModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

function saveInspectionResult() {
    const form = document.getElementById('formUpdateInspection');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    fetch('./api/qa_schedule_api.php?action=update_result', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            Swal.fire({icon:'success', title:'Saved', timer:1500, showConfirmButton:false});
            bootstrap.Modal.getInstance(document.getElementById('updateInspectionModal')).hide();
            loadQASchedule();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function openEditPoModal() {
    if (!currentUpdatePo) return;
    const po = currentUpdatePo;
    
    document.getElementById('edit_po_id').value = po.id;
    document.getElementById('edit_po_number').value = po.po_number || '';
    document.getElementById('edit_sku').value = po.sku || '';
    document.getElementById('edit_description').value = po.description || '';
    document.getElementById('edit_color').value = po.color || '';
    document.getElementById('edit_quantity').value = po.quantity || '';
    document.getElementById('edit_dc_location').value = po.dc_location || '';
    document.getElementById('edit_loading_date').value = po.loading_date || '';
    document.getElementById('edit_loading_week').value = po.loading_week || '';
    
    // Hide update modal
    const updateModalInst = bootstrap.Modal.getInstance(document.getElementById('updateInspectionModal'));
    if (updateModalInst) updateModalInst.hide();
    
    const modal = new bootstrap.Modal(document.getElementById('editPoModal'));
    modal.show();
}

function savePoDetails() {
    const form = document.getElementById('formEditPo');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    formData.append('action', 'update_po_details');
    
    fetch('./api/qa_schedule_api.php', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            Swal.fire({icon:'success', title:'Saved', timer:1500, showConfirmButton:false});
            bootstrap.Modal.getInstance(document.getElementById('editPoModal')).hide();
            loadQASchedule();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function assignToMe(poId) {
    const username = '<?php echo $_SESSION['username'] ?? "QA Staff"; ?>'; // Using session username
    
    Swal.fire({
        title: 'Assign to Me?',
        text: "You will be marked as the inspector for this PO.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, assign to me'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', poId);
            formData.append('qa_inspector', username);
            
            fetch('./api/qa_schedule_api.php?action=assign_inspector', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    Swal.fire({icon:'success', title:'Assigned', timer:1500, showConfirmButton:false});
                    loadQASchedule();
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            });
        }
    });
}

function toggleQaView(viewType) {
    // Deprecated: Calendar is now in its own tab
}

let currentQaCalendarDate = new Date();

function buildCustomQaCalendar(eventsData) {
    const gridEl = document.getElementById('qaCustomCalendarGrid');
    if (!gridEl) return;

    gridEl.innerHTML = ''; // Clear previous

    const year = currentQaCalendarDate.getFullYear();
    const month = currentQaCalendarDate.getMonth();
    
    // Update Title
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const titleEl = document.getElementById('qa-calendar-title');
    if (titleEl) {
        titleEl.textContent = `${thaiMonths[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'qa-day-cell other-month';
        cell.innerHTML = `<div class="qa-day-number">${prevMonthDays - i}</div>`;
        gridEl.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        
        const cell = document.createElement('div');
        cell.className = `qa-day-cell ${isToday ? 'today' : ''}`;
        cell.dataset.date = dateStr;
        
        // Native Drop events
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        });
        cell.addEventListener('dragleave', (e) => {
            cell.classList.remove('drag-over');
        });
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const poId = e.dataTransfer.getData('text/plain');
            if (poId && dateStr) {
                schedulePO(poId, dateStr);
            }
        });

        const dayNumber = document.createElement('div');
        dayNumber.className = 'qa-day-number';
        dayNumber.textContent = day;
        cell.appendChild(dayNumber);

        // Filter events for this day
        const dayEvents = eventsData.filter(e => e.start === dateStr);
        
        // Desktop Events Container
        const desktopContainer = document.createElement('div');
        desktopContainer.className = 'qa-desktop-events';
        
        // Mobile Dots Container
        const mobileContainer = document.createElement('div');
        mobileContainer.className = 'qa-mobile-dots';

        if (dayEvents.length > 0) {
            // Render up to 2 on desktop
            dayEvents.slice(0, 2).forEach(evt => {
                let statusClass = 'status-waiting';
                if (evt.extendedProps.status === 'IN_PROGRESS') statusClass = 'status-progress';
                if (evt.extendedProps.status === 'DONE') statusClass = 'status-done';
                if (evt.extendedProps.result === 'FAIL') statusClass = 'result-fail';

                const pill = document.createElement('div');
                pill.className = `qa-event-pill ${statusClass}`;
                pill.title = evt.title;
                pill.innerHTML = `<b>${evt.title}</b>`;
                if (evt.extendedProps.inspector) {
                    pill.innerHTML += `<br><i class="fas fa-user-check"></i> ${evt.extendedProps.inspector}`;
                }
                pill.onclick = (e) => {
                    e.stopPropagation();
                    openUpdateModal(evt.extendedProps.poData);
                };
                desktopContainer.appendChild(pill);
                
                // Add dot
                const dot = document.createElement('div');
                dot.className = `qa-dot ${statusClass}`;
                mobileContainer.appendChild(dot);
            });

            // Extra events
            if (dayEvents.length > 2) {
                const moreLabel = document.createElement('div');
                moreLabel.className = 'qa-more-text';
                moreLabel.textContent = `+${dayEvents.length - 2} more`;
                desktopContainer.appendChild(moreLabel);
                
                for(let i = 2; i < Math.min(dayEvents.length, 5); i++) {
                    let sc = 'status-waiting';
                    if (dayEvents[i].extendedProps.status === 'IN_PROGRESS') sc = 'status-progress';
                    if (dayEvents[i].extendedProps.status === 'DONE') sc = 'status-done';
                    if (dayEvents[i].extendedProps.result === 'FAIL') sc = 'result-fail';
                    const d = document.createElement('div');
                    d.className = `qa-dot ${sc}`;
                    mobileContainer.appendChild(d);
                }
            }
        }
        
        cell.appendChild(desktopContainer);
        cell.appendChild(mobileContainer);
        
        // Click on day cell to jump to schedule list for that date
        cell.onclick = (e) => {
            // Prevent triggering if clicking on an event pill (which has e.stopPropagation())
            if (e.target.closest('.qa-event-pill')) return;

            // 1. Set filter to custom date
            const dateInputStart = document.getElementById('scheduleStartDate');
            const dateInputEnd = document.getElementById('scheduleEndDate');
            const btnDateCustom = document.getElementById('btnDate_custom');
            if (dateInputStart && dateInputEnd && btnDateCustom) {
                dateInputStart.value = dateStr;
                dateInputEnd.value = dateStr;
                btnDateCustom.checked = true;
            }

            // 2. Switch tab
            const scheduleTab = document.getElementById('schedule-tab');
            if (scheduleTab) {
                const tab = new bootstrap.Tab(scheduleTab);
                tab.show();
                if (typeof loadQASchedule === 'function') {
                    loadQASchedule('custom_range');
                }
            }
        };
        
        gridEl.appendChild(cell);
    }

    // Fill remaining cells for 6 weeks grid (42 cells total)
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'qa-day-cell other-month';
        cell.innerHTML = `<div class="qa-day-number">${i}</div>`;
        gridEl.appendChild(cell);
    }
}

function fetchAndRenderQaCalendar() {
    const year = currentQaCalendarDate.getFullYear();
    const month = currentQaCalendarDate.getMonth();
    
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    fetch(`./api/qa_schedule_api.php?action=get_schedule&start_date=${startStr}&end_date=${endStr}&range=custom_range`)
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                const events = res.data.map(po => {
                    return {
                        id: po.id,
                        title: po.po_number + (po.sku ? ' (' + po.sku + ')' : ''),
                        start: po.inspection_date ? po.inspection_date.split(' ')[0] : null,
                        extendedProps: {
                            poData: po,
                            status: po.inspection_status,
                            result: po.inspection_result,
                            inspector: po.qa_inspector
                        }
                    };
                }).filter(e => e.start);
                buildCustomQaCalendar(events);
            }
        })
        .catch(err => console.error('Calendar fetch error:', err));
}

// Auto load on tab show or page load if needed.
document.addEventListener('DOMContentLoaded', () => {
    // Bind Custom Calendar Header Buttons
    document.getElementById('qa-calendar-prev-button')?.addEventListener('click', () => {
        currentQaCalendarDate.setMonth(currentQaCalendarDate.getMonth() - 1);
        fetchAndRenderQaCalendar();
    });
    
    document.getElementById('qa-calendar-next-button')?.addEventListener('click', () => {
        currentQaCalendarDate.setMonth(currentQaCalendarDate.getMonth() + 1);
        fetchAndRenderQaCalendar();
    });
    
    document.getElementById('qa-calendar-today-button')?.addEventListener('click', () => {
        currentQaCalendarDate = new Date();
        fetchAndRenderQaCalendar();
    });
    
    // Listen to Tab change to initialize or update calendar
    document.getElementById('qa_planner-tab')?.addEventListener('shown.bs.tab', function (e) {
        fetchAndRenderQaCalendar();
        loadPendingJobs();
    });

    // If it's the active tab, load it.
    if(document.getElementById('qaScheduleBody')) {
        loadQASchedule();
    }
});

let pendingJobsData = [];

function loadPendingJobs(search = '') {
    const listEl = document.getElementById('pendingJobsList');
    if (!listEl) return;
    
    fetch(`./api/qa_schedule_api.php?action=get_pending_jobs&search=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                pendingJobsData = res.data;
                const countEl = document.getElementById('pendingJobsCount');
                if (countEl) countEl.innerText = res.data.length;
                renderPendingJobs();
            }
        })
        .catch(err => {
            listEl.innerHTML = '<div class="text-center py-4 text-danger small">Failed to load pending jobs.</div>';
        });
}

function filterPendingJobs(term) {
    loadPendingJobs(term);
}

function renderPendingJobs() {
    const listEl = document.getElementById('pendingJobsList');
    if (!listEl) return;

    if (pendingJobsData.length === 0) {
        listEl.innerHTML = '<div class="text-center py-4 text-muted small">No pending jobs found.</div>';
        return;
    }

    let html = '';
    pendingJobsData.forEach(job => {
        let title = `${job.po_number}`;
        if (job.sku) title += ` (${job.sku})`;
        
        html += `
            <div class="card mb-2 shadow-sm border-0 qa-draggable-job" data-id="${job.id}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${job.id}')" style="cursor: grab;">
                <div class="card-body p-2">
                    <div class="fw-bold text-primary mb-1" style="font-size: 0.85rem;"><i class="fas fa-arrows-alt me-1 text-muted"></i>${title}</div>
                    <div class="d-flex justify-content-between text-muted" style="font-size: 0.75rem;">
                        <span>Qty: ${job.quantity ? Number(job.quantity).toLocaleString() : '-'}</span>
                        <span>Load: ${job.loading_date || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}


function setScheduleDateToday() {
    const inputStart = document.getElementById('scheduleStartDate');
    const inputEnd = document.getElementById('scheduleEndDate');
    
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    const today = `${yyyy}-${mm}-${dd}`;
    inputStart.value = today;
    inputEnd.value = today;
    
    loadQASchedule('custom_range');
}

function changeDate(days) {
    const startInput = document.getElementById('scheduleStartDate');
    const endInput = document.getElementById('scheduleEndDate');
    
    let startDate = new Date(startInput.value);
    if(isNaN(startDate)) startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    
    let endDate = new Date(endInput.value);
    if(isNaN(endDate)) endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    startInput.value = startDate.toISOString().split('T')[0];
    endInput.value = endDate.toISOString().split('T')[0];
    
    loadQASchedule('custom_range');
}

// ---- INLINE ADD PO LOGIC ----
let inlineSearchTimeout = null;

function showInlineSearch() {
    document.getElementById('qaScheduleAddBtnRow').classList.add('d-none');
    document.getElementById('qaScheduleSearchRow').classList.remove('d-none');
    document.getElementById('inlineSearchPo').focus();
}

function hideInlineSearch() {
    document.getElementById('qaScheduleSearchRow').classList.add('d-none');
    document.getElementById('qaScheduleAddBtnRow').classList.remove('d-none');
    document.getElementById('inlineSearchPo').value = '';
    document.getElementById('inlineSuggestBox').style.display = 'none';
}

function debounceInlineSearch(event) {
    const term = event.target.value.trim();
    if (event.key === 'Enter') {
        // If Enter is pressed, try to trigger search or select first item if available
        triggerInlineSearch();
        return;
    }
    
    if (inlineSearchTimeout) {
        clearTimeout(inlineSearchTimeout);
    }
    
    if (term.length < 3) {
        document.getElementById('inlineSuggestBox').style.display = 'none';
        return;
    }
    
    inlineSearchTimeout = setTimeout(() => {
        triggerInlineSearch();
    }, 400);
}

function triggerInlineSearch() {
    const term = document.getElementById('inlineSearchPo').value.trim();
    if (term.length < 3) return;
    
    const box = document.getElementById('inlineSuggestBox');
    box.innerHTML = '<div class="list-group-item text-center"><i class="fas fa-spinner fa-spin text-primary"></i> Searching...</div>';
    box.style.display = 'block';
    
    fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    box.innerHTML = '<div class="list-group-item text-muted text-center small">No PO found.</div>';
                    return;
                }
                
                let html = '';
                res.data.forEach(po => {
                    html += `
                        <button type="button" class="list-group-item list-group-item-action text-start p-2" onclick="inlineAddPo(${po.id}, '${po.po_number}')">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>${po.po_number}</strong>
                                <span class="badge bg-light text-dark border">${po.sku}</span>
                            </div>
                            <div class="small text-muted mt-1">
                                Qty: ${po.quantity} | Loading: ${po.loading_date || '-'}
                                ${po.inspection_date ? `<span class="text-warning ms-1"><i class="fas fa-exclamation-triangle"></i> Scheduled: ${po.inspection_date}</span>` : ''}
                            </div>
                        </button>
                    `;
                });
                box.innerHTML = html;
            }
        });
}

function inlineAddPo(id, poNumber) {
    document.getElementById('inlineSearchPo').value = poNumber; // Visual feedback
    document.getElementById('inlineSuggestBox').style.display = 'none';
    
    // Disable input while adding
    document.getElementById('inlineSearchPo').disabled = true;
    
    const date = document.getElementById('scheduleStartDate').value;
    const formData = new FormData();
    formData.append('id', id);
    formData.append('schedule_date', date);
    
    fetch('./api/qa_schedule_api.php?action=schedule_po', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        document.getElementById('inlineSearchPo').disabled = false;
        
        if(res.success) {
            // Success, reload table and hide search
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `${poNumber} added to schedule`,
                showConfirmButton: false,
                timer: 2000
            });
            
            loadQASchedule();
            hideInlineSearch();
        } else {
            Swal.fire('Error', res.message, 'error');
            document.getElementById('inlineSearchPo').value = '';
        }
    })
    .catch(() => {
        document.getElementById('inlineSearchPo').disabled = false;
        Swal.fire('Error', 'Network Error', 'error');
    });
}

// Hide autocomplete box and search row when clicking outside
document.addEventListener('click', function(e) {
    const searchRow = document.getElementById('qaScheduleSearchRow');
    const btnRow = document.getElementById('qaScheduleAddBtnRow');
    const box = document.getElementById('inlineSuggestBox');
    const input = document.getElementById('inlineSearchPo');
    
    // Handle suggestion box visibility
    if (box && input && !box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
    }
    
    // Handle search row visibility
    if (searchRow && !searchRow.classList.contains('d-none')) {
        if (!searchRow.contains(e.target) && (!btnRow || !btnRow.contains(e.target))) {
            // Only hide if suggestion box is also not clicked (already handled by contains on searchRow)
            // Wait, suggestBox is inside searchRow, so clicking it won't trigger this.
            hideInlineSearch();
        }
    }
});
// Fetch QC Users
function loadQcUsers() {
    fetch('./api/qa_schedule_api.php?action=get_qc_users')
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                const datalist = document.getElementById('qc-users-list');
                if(datalist) {
                    datalist.innerHTML = '';
                    res.data.forEach(user => {
                        const name = user.aka ? `${user.fullname} (${user.aka})` : user.fullname;
                        datalist.innerHTML += `<option value="${user.fullname}">${name}</option>`;
                    });
                }
            }
        });
}

// Bulk Update Logic
function toggleSelectAllPo(el) {
    const isChecked = el.checked;
    document.querySelectorAll('.po-checkbox').forEach(cb => cb.checked = isChecked);
    updateBulkCount();
}

function updateBulkCount() {
    const count = document.querySelectorAll('.po-checkbox:checked').length;
    const btn = document.getElementById('btnBulkUpdate');
    document.getElementById('bulkCount').innerText = count;
    
    if (count > 0) {
        btn.classList.remove('d-none');
    } else {
        btn.classList.add('d-none');
    }
}

function openBulkUpdateModal() {
    const count = document.querySelectorAll('.po-checkbox:checked').length;
    if (count === 0) return;
    
    document.getElementById('bulkUpdateCount').innerText = count;
    document.getElementById('bulk_ticket_number').value = '';
    document.getElementById('bulk_qa_inspector').value = '';
    document.querySelectorAll('input[name="bulk_inspect_type"]').forEach(el => el.checked = false);
    
    const modal = new bootstrap.Modal(document.getElementById('bulkUpdateModal'));
    modal.show();
}

function saveBulkUpdate() {
    const poIds = Array.from(document.querySelectorAll('.po-checkbox:checked')).map(cb => cb.value);
    if (poIds.length === 0) return;
    
    const ticket = document.getElementById('bulk_ticket_number').value;
    const inspector = document.getElementById('bulk_qa_inspector').value;
    const type = document.querySelector('input[name="bulk_inspect_type"]:checked');
    
    const btn = document.getElementById('btnSaveBulk');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    
    const formData = new FormData();
    formData.append('po_ids', JSON.stringify(poIds));
    formData.append('ticket_number', ticket);
    formData.append('qa_inspector', inspector);
    if (type) formData.append('inspect_type', type.value);
    
    fetch('./api/qa_schedule_api.php?action=bulk_update_ticket', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            bootstrap.Modal.getInstance(document.getElementById('bulkUpdateModal')).hide();
            loadQASchedule();
            const selectAll = document.getElementById('selectAllPo');
            if(selectAll) selectAll.checked = false;
            updateBulkCount();
        } else {
            alert('Error: ' + res.message);
        }
    })
    .catch(err => {
        alert('Network Error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-1"></i> Update Selected';
    });
}

// Call on init
document.addEventListener('DOMContentLoaded', () => {
    loadQcUsers();
});
// Create Ticket Logic
let createTicketPoList = [];

function openCreateTicketModal() {
    createTicketPoList = [];
    document.getElementById('create_ticket_number').value = '';
    document.getElementById('create_qa_inspector').value = '';
    document.getElementById('create_inspection_date').value = document.getElementById('scheduleStartDate') ? document.getElementById('scheduleStartDate').value : new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[name="create_inspect_type"]').forEach(el => el.checked = false);
    document.getElementById('createTicketSearchPo').value = '';
    renderCreateTicketPoTable();
    
    const modal = new bootstrap.Modal(document.getElementById('createTicketModal'));
    modal.show();
}

function searchPoForTicket(event) {
    const term = event.target.value.trim();
    const box = document.getElementById('createTicketSuggestBox');
    
    if (term.length < 3) {
        box.style.display = 'none';
        return;
    }
    
    if (event.key === 'Enter') {
        fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
            .then(r => r.json())
            .then(res => {
                if(res.success && res.data.length > 0) {
                    addPoToTicket(res.data[0]);
                    event.target.value = '';
                    box.style.display = 'none';
                }
            });
        return;
    }
    
    box.innerHTML = '<div class="list-group-item text-center"><i class="fas fa-spinner fa-spin text-primary"></i> Searching...</div>';
    box.style.display = 'block';
    
    fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    box.innerHTML = '<div class="list-group-item text-muted text-center small">No PO found.</div>';
                    return;
                }
                
                let html = '';
                res.data.forEach(po => {
                    html += `
                        <button type="button" class="list-group-item list-group-item-action text-start p-2" onclick='addPoToTicket(${JSON.stringify(po).replace(/'/g, "&#39;")})'>
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>${po.po_number}</strong>
                                <span class="badge bg-light text-dark border">${po.sku}</span>
                            </div>
                            <div class="small text-muted mt-1">Qty: ${po.quantity}</div>
                        </button>
                    `;
                });
                box.innerHTML = html;
            }
        });
}

function addPoToTicket(po) {
    if(!createTicketPoList.find(p => p.id === po.id)) {
        createTicketPoList.push(po);
        renderCreateTicketPoTable();
    }
    document.getElementById('createTicketSearchPo').value = '';
    document.getElementById('createTicketSuggestBox').style.display = 'none';
}

function removePoFromTicket(id) {
    createTicketPoList = createTicketPoList.filter(p => p.id !== id);
    renderCreateTicketPoTable();
}

function renderCreateTicketPoTable() {
    const tbody = document.querySelector('#createTicketPoTable tbody');
    if (createTicketPoList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3 small">No PO added yet. Search above to add.</td></tr>`;
        return;
    }
    
    let html = '';
    createTicketPoList.forEach(po => {
        html += `
            <tr>
                <td class="fw-bold text-primary">${po.po_number}</td>
                <td>${po.sku}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" onclick="removePoFromTicket(${po.id})"><i class="fas fa-times"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function saveNewTicket() {
    const ticket = document.getElementById('create_ticket_number').value.trim();
    if (!ticket) {
        alert("Please enter a Ticket Number.");
        return;
    }
    if (createTicketPoList.length === 0) {
        alert("Please add at least one PO to the ticket.");
        return;
    }
    
    const inspector = document.getElementById('create_qa_inspector').value;
    const type = document.querySelector('input[name="create_inspect_type"]:checked');
    const inspectionDate = document.getElementById('create_inspection_date').value;
    
    const btn = document.getElementById('btnSaveCreateTicket');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
    
    const poIds = createTicketPoList.map(p => p.id);
    
    const formData = new FormData();
    formData.append('po_ids', JSON.stringify(poIds));
    formData.append('ticket_number', ticket);
    formData.append('qa_inspector', inspector);
    if (type) formData.append('inspect_type', type.value);
    if (inspectionDate) formData.append('inspection_date', inspectionDate);
    
    fetch('./api/qa_schedule_api.php?action=bulk_update_ticket', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            bootstrap.Modal.getInstance(document.getElementById('createTicketModal')).hide();
            loadQASchedule();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Ticket Created Successfully',
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            alert('Error: ' + res.message);
        }
    })
    .catch(err => {
        alert('Network Error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-1"></i> Create & Link';
    });
}
</script>
