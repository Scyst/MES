const MT_API_URL = 'api/maintenanceManage.php';
let currentMaintenanceData = [];
let standardLines = [];
let currentUserThaiName = '';

// ==========================================
// 1. ฟังก์ชัน Helper จัดการวันที่และเวลา
// ==========================================
function getNowDateTimeLocal() {
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    return localNow.toISOString().substring(0, 16); 
}

function formatForDateTimeLocal(dbDateStr) {
    if (!dbDateStr) return '';
    return dbDateStr.replace(' ', 'T').substring(0, 16);
}

function validateTimeline(reqStr, startStr, endStr) {
    const startTime = startStr ? new Date(startStr.replace(' ', 'T')).getTime() : 0;
    const endTime = endStr ? new Date(endStr.replace(' ', 'T')).getTime() : 0;

    // ปลดล็อค: ปิดการตรวจสอบ "เวลาเริ่มซ่อม" กับ "เวลาแจ้งซ่อม" ทิ้งไปเลย 
    // เพื่อรองรับการเปิดบิลย้อนหลังตามหน้างานจริง

    // เช็คแค่ตรรกะพื้นฐาน: เวลาปิดงาน ต้องไม่เกิดก่อน เวลาเริ่มทำงาน
    if (endTime && startTime && endTime < startTime) {
        return "❌ เวลาซ่อมเสร็จ ต้องไม่เกิดก่อนเวลาที่เริ่มซ่อม";
    }
    
    if (endTime && !startTime) {
        return "❌ กรุณาระบุเวลาเริ่มซ่อมด้วย";
    }
    
    return null; // ปล่อยผ่านให้บันทึกได้เลย
}

function formatJobNo(id, dateString) {
    const reqDateObj = new Date(dateString.replace(' ', 'T')); 
    const thaiYearShort = (reqDateObj.getFullYear() + 543).toString().slice(-2);
    const monthTwoDigits = (reqDateObj.getMonth() + 1).toString().padStart(2, '0'); 
    const runNo = id.toString().padStart(4, '0');
    return `MNT-${thaiYearShort}${monthTwoDigits}-${runNo}`;
}

// ==========================================
// 2. ฟังก์ชันเรียกและแสดงผลตาราง
// ==========================================
async function fetchMaintenanceData() {
    const statusEl = document.getElementById('mtFilterStatus');
    const lineEl = document.getElementById('filterLineMt');
    
    const status = statusEl ? statusEl.value : 'Active';
    const line = lineEl ? lineEl.value : '';
    const dateType = document.getElementById('mtDateFilterType')?.value || 'request_date'; 
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';
    
    fetchMaintenanceSummary(); 

    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}&dateType=${dateType}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        
        if (result.success) {
            currentMaintenanceData = result.data; 
            const searchBox = document.getElementById('mtSearchBox');
            if(searchBox) searchBox.value = '';
            renderMaintenanceTable(currentMaintenanceData);
        }
    } catch(err) {
        showToast('Failed to load maintenance data', '#dc3545');
    } finally {
        hideSpinner();
    }
}

function renderMaintenanceTable(dataList) {
    const tbody = document.getElementById('maintenanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (dataList && dataList.length > 0) {
        dataList.forEach(row => {
            let statusBadge = '';
            let rowClass = 'cursor-pointer hover-bg'; 
            
            if(row.status === 'Pending') statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2">Pending</span>';
            else if(row.status === 'In Progress') statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning px-2">Processing</span>';
            else statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success px-2">Completed</span>';

            let priorityColor = row.priority === 'Critical' ? 'text-danger fw-bold' : (row.priority === 'Urgent' ? 'text-warning fw-bold' : 'text-success fw-bold');
            
            let jobType = row.job_type || 'Repair';
            let typeBadgeColor = 'bg-secondary';
            if(jobType === 'Development') typeBadgeColor = 'bg-primary';
            else if(jobType === 'PM') typeBadgeColor = 'bg-info text-dark';
            else if(jobType === 'Other') typeBadgeColor = 'bg-dark';

            const reqName = row.requester_name || row.request_by;
            const jobNo = formatJobNo(row.id, row.request_date);

            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'I') {
                    viewMaintenanceDetails(row.id);
                }
            };

            tr.innerHTML = `
                <td class="ps-3 text-center">${statusBadge}</td>
                <td class="text-center text-primary fw-bold font-monospace small">${jobNo}</td>
                <td class="small text-nowrap text-center">${new Date(row.request_date.replace(' ', 'T')).toLocaleString('th-TH')}</td>
                <td class="text-center">
                    <div class="fw-bold text-body">${row.line}</div>
                    <small class="text-muted">${row.machine}</small>
                </td>
                <td class="text-center">
                    <span class="badge ${typeBadgeColor} mb-1" style="font-size: 0.7rem;">${jobType}</span><br>
                    <span class="${priorityColor} small">${row.priority}</span>
                </td>
                <td class="small text-body text-center">${reqName}</td>
                <td class="text-center"><span class="text-break small">${row.issue_description}</span></td>
                <td class="small text-body text-center note-truncate" title="${row.technician_note || ''}">${row.technician_note || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-folder-open fa-2x mb-2 opacity-25"></i><br>No maintenance requests found.</td></tr>';
    }
}

function filterMaintenanceTable() {
    const searchInput = document.getElementById('mtSearchBox')?.value.toLowerCase().trim() || '';
    if (searchInput === '') {
        renderMaintenanceTable(currentMaintenanceData);
        return;
    }

    const filteredData = currentMaintenanceData.filter(row => {
        const jobNo = formatJobNo(row.id, row.request_date).toLowerCase();
        const line = (row.line || '').toLowerCase();
        const machine = (row.machine || '').toLowerCase();
        const issue = (row.issue_description || '').toLowerCase();
        const techNote = (row.technician_note || '').toLowerCase();
        const reqName = (row.requester_name || row.request_by || '').toLowerCase();
        const jobType = (row.job_type || '').toLowerCase();
        const priority = (row.priority || '').toLowerCase();

        return jobNo.includes(searchInput) || line.includes(searchInput) ||
               machine.includes(searchInput) || issue.includes(searchInput) ||
               techNote.includes(searchInput) || reqName.includes(searchInput) ||
               jobType.includes(searchInput) || priority.includes(searchInput);
    });

    renderMaintenanceTable(filteredData);
}

// ==========================================
// 3. ฟังก์ชันดึง Line Master Data
// ==========================================
async function loadStandardLines() {
    try {
        const response = await fetch(`${MT_API_URL}?action=get_standard_lines`);
        const result = await response.json();
        
        if (result.success) {
            standardLines = result.data; 
            const validLines = result.data.filter(line => line && line.trim() !== '');
            
            const optionsHTML = '<option value="" disabled selected>-- เลือก Line / แผนก --</option>' + 
                                validLines.map(line => `<option value="${line.trim()}">${line.trim()}</option>`).join('');
            
            const addLineEl = document.getElementById('add_line');
            const editLineEl = document.getElementById('edit_line');
            
            if (addLineEl) addLineEl.innerHTML = optionsHTML;
            if (editLineEl) editLineEl.innerHTML = optionsHTML; 
        }
    } catch (err) {
        console.error('Failed to load standard lines:', err);
    }
}

async function loadCurrentUserName() {
    try {
        const response = await fetch(`${MT_API_URL}?action=get_current_user_name`);
        const result = await response.json();
        if (result.success) {
            currentUserThaiName = result.name; // เก็บชื่อภาษาไทยไว้ในตัวแปร
        }
    } catch (err) {
        console.error('Failed to load user name');
    }
}

// ==========================================
// Helper: ฟังก์ชันเปลี่ยน Modal อย่างปลอดภัย (ป้องกัน Backdrop ค้าง / FAB เด้ง)
// ==========================================
function switchModal(fromModalId, toModalId) {
    const fromEl = document.getElementById(fromModalId);
    const toEl = document.getElementById(toModalId);
    if (!fromEl || !toEl) return;

    const fromModal = bootstrap.Modal.getInstance(fromEl);
    const toModal = bootstrap.Modal.getOrCreateInstance(toEl);

    // เมื่อ Modal แรกปิดสนิท (Animation จบ) ให้เปิด Modal ถัดไปทันที
    const onHidden = function () {
        toModal.show();
        fromEl.removeEventListener('hidden.bs.modal', onHidden);
    };
    
    fromEl.addEventListener('hidden.bs.modal', onHidden);
    
    if (fromModal) {
        fromModal.hide();
    } else {
        toModal.show(); // กรณี Modal แรกไม่ได้เปิดอยู่แล้ว
    }
}

// ==========================================
// ฟังก์ชันเปลี่ยน Modal แบบไร้รอยต่อ (Seamless Transition)
// ==========================================
function switchModal(oldModalId, newModalId) {
    const oldModalEl = document.getElementById(oldModalId);
    const newModalEl = document.getElementById(newModalId);
    if (!oldModalEl || !newModalEl) return;

    const oldModal = bootstrap.Modal.getInstance(oldModalEl);
    const newModal = bootstrap.Modal.getOrCreateInstance(newModalEl);

    // เช็คว่าถ้า Modal แรกมันดันปิดไปแล้ว ก็ให้เปิดอันใหม่เลย
    if (!oldModalEl.classList.contains('show')) {
        newModal.show();
        return;
    }

    const onHidden = function () {
        newModal.show();
        oldModalEl.removeEventListener('hidden.bs.modal', onHidden);
        // บังคับเปิด Scrollbar คืนมา
        setTimeout(() => document.body.classList.add('modal-open'), 50);
    };

    oldModalEl.addEventListener('hidden.bs.modal', onHidden);
    oldModal.hide(); // สั่งปิดตรงนี้ที่เดียวจบ
}

async function loadMaintenanceMachines() {
    try {
        const response = await fetch(`${MT_API_URL}?action=get_machines`);
        const result = await response.json();
        
        if (result.success) {
            // สร้างหรืออัปเดต Datalist ใหม่
            let datalist = document.getElementById('mtMachineListFilter');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'mtMachineListFilter';
                document.body.appendChild(datalist);
            }
            datalist.innerHTML = result.data.map(m => `<option value="${m}">`).join('');
        }
    } catch (err) {
        console.error('Failed to load machines:', err);
    }
}

// ==========================================
// 4. ฟังก์ชันการแสดง Modal จัดการข้อมูล (View / Edit / Complete)
// ==========================================
function viewMaintenanceDetails(id) {
    const data = currentMaintenanceData.find(item => item.id == id);
    if (!data) return;

    const setText = (elmId, val) => {
        const el = document.getElementById(elmId);
        if(el) el.textContent = val || '-';
    };

    setText('view_machine_title', data.machine);
    setText('view_line_subtitle', data.line);
    setText('view_issue', data.issue_description);
    setText('view_job_type', data.job_type || 'Repair');
    
    setText('view_requested_by', data.requester_name || data.request_by);
    setText('view_request_date', new Date(data.request_date.replace(' ', 'T')).toLocaleString('th-TH'));
    setText('view_job_id', formatJobNo(data.id, data.request_date));

    const badge = document.getElementById('view_status_badge');
    if (badge) {
        badge.textContent = data.status;
        let badgeClass = 'badge rounded-pill fw-normal text-uppercase px-3 py-2 ';
        if (data.status === 'Completed') badgeClass += 'bg-success';
        else if (data.status === 'Pending') badgeClass += 'bg-danger';
        else badgeClass += 'bg-warning text-dark';
        badge.className = badgeClass;
    }
    
    const priorityEl = document.getElementById('view_priority_text');
    if (priorityEl) {
        priorityEl.textContent = data.priority;
        priorityEl.className = data.priority === 'Critical' ? 'text-danger fw-bold' : (data.priority === 'Urgent' ? 'text-warning fw-bold' : 'text-success fw-bold'); 
    }

    const imgBefore = document.getElementById('view_photo_before');
    const noImgBefore = document.getElementById('no_photo_before');
    if (imgBefore) { imgBefore.classList.add('d-none'); imgBefore.style.display = ''; }
    if (noImgBefore) noImgBefore.classList.add('d-none');

    if (data.photo_before_path) {
        if(imgBefore) { imgBefore.src = data.photo_before_path; imgBefore.classList.remove('d-none'); }
        if(noImgBefore) noImgBefore.classList.add('d-none'); 
    } else {
        if(noImgBefore) noImgBefore.classList.remove('d-none');
    }

    const completionSection = document.getElementById('view_completion_section');
    const btnStart = document.getElementById('btn_start_job');
    const btnComplete = document.getElementById('btn_complete_job');
    const actionCompleted = document.getElementById('action_buttons_completed');

    const btnEdit = document.getElementById('btn_edit_job');
    if(btnEdit) {
        // ปิดการทำงานปุ่ม Edit ชั่วคราว
        // btnEdit.classList.remove('d-none');
        // btnEdit.onclick = () => openEditModal(id);
    }

    if(btnStart) btnStart.classList.add('d-none');
    if(btnComplete) btnComplete.classList.add('d-none');
    if(actionCompleted) actionCompleted.classList.add('d-none');
    if(completionSection) completionSection.classList.add('d-none');

    if (data.status === 'Pending') {
        if(btnStart) {
            btnStart.classList.remove('d-none');
            btnStart.onclick = () => {
                 bootstrap.Modal.getInstance(document.getElementById('viewMaintenanceModal')).hide();
                 updateMtStatus(id, 'Pending'); 
            };
        }
    } 
    else if (data.status === 'In Progress') {
        if(btnComplete) {
            btnComplete.classList.remove('d-none');
            btnComplete.onclick = () => {
                 openCompleteModal(id); 
            };
        }
    }
    else if (data.status === 'Completed') {
        if(completionSection) completionSection.classList.remove('d-none');
        if(actionCompleted) actionCompleted.classList.remove('d-none');

        setText('view_tech_note', data.technician_note);
        setText('view_spare_parts', data.spare_parts_list);
        
        setText('view_started_at', data.started_at ? new Date(data.started_at.replace(' ', 'T')).toLocaleString('th-TH') : '-');
        setText('view_resolved_at', data.resolved_at ? new Date(data.resolved_at.replace(' ', 'T')).toLocaleString('th-TH') : '-');
        setText('view_resolved_by', data.resolver_name || data.resolved_by);

        const imgAfter = document.getElementById('view_photo_after');
        const noImgAfter = document.getElementById('no_photo_after');

        if (imgAfter) { imgAfter.classList.add('d-none'); imgAfter.style.display = ''; }
        if (noImgAfter) noImgAfter.classList.add('d-none');

        if (data.photo_after_path) {
            if(imgAfter) { imgAfter.src = data.photo_after_path; imgAfter.classList.remove('d-none'); }
            if(noImgAfter) noImgAfter.classList.add('d-none');
        } else {
            if(noImgAfter) noImgAfter.classList.remove('d-none');
        }

        const btnPrint = document.getElementById('btn_print_job');
        if(btnPrint) btnPrint.href = `print_job_order.php?id=${id}`;
        
        const btnEmail = document.getElementById('btn_resend_email');
        if(btnEmail) btnEmail.onclick = () => resendEmail(id);
    }

    showBootstrapModal('viewMaintenanceModal');
}

window.openCompleteModal = function(id) {
    const item = currentMaintenanceData.find(d => d.id == id);
    if (!item) return;

    // เติมข้อมูลลงฟอร์ม
    const reqIdEl = document.getElementById('complete_req_id');
    const formEl = document.getElementById('completeMaintenanceForm');
    if (reqIdEl) reqIdEl.value = item.id;
    if (formEl) formEl.dataset.reqDate = item.request_date;

    const startEl = document.getElementById('comp_started_at');
    if (startEl) startEl.value = item.started_at ? formatForDateTimeLocal(item.started_at) : getNowDateTimeLocal();
    
    const endEl = document.getElementById('comp_resolved_at');
    if (endEl) {
        endEl.value = getNowDateTimeLocal();
        endEl.dispatchEvent(new Event('change')); // กระตุ้นให้คำนวณเวลา
    }

    // 🚀 สั่งปิด Modal ตัวเก่า (View)
    const viewModalEl = document.getElementById('viewMaintenanceModal');
    if (viewModalEl) {
        const viewModal = bootstrap.Modal.getInstance(viewModalEl);
        if (viewModal) viewModal.hide();
    }

    // ⏳ รอ 400ms ให้เฟดดำหายสนิท แล้วค่อยเปิด Modal ตัวใหม่ (Complete)
    setTimeout(() => {
        const compModalEl = document.getElementById('completeMaintenanceModal');
        if (compModalEl) {
            const compModal = bootstrap.Modal.getInstance(compModalEl) || new bootstrap.Modal(compModalEl);
            compModal.show();
        }
    }, 400); 
};
window.openEditModal = function(id) {
    showToast('ปิดปรับปรุงระบบแก้ไขข้อมูลชั่วคราว', '#ffc107'); // แจ้งเตือน
    return;
    const item = currentMaintenanceData.find(d => d.id == id);
    if (!item) return;

    // 1. กำหนดค่า ID
    document.getElementById('edit_req_id').value = item.id;
    
    // 2. จัดการ Line (วิธีใหม่: สร้าง HTML String ใหม่ทั้งหมด ปลอดภัยที่สุด)
    const editLineEl = document.getElementById('edit_line');
    if (editLineEl) {
        const itemLineTrimmed = (item.line || '').trim();
        
        // กรองข้อมูลจากตัวแปร Master
        const validLines = (standardLines || []).filter(l => l && l.trim() !== '');
        
        // ตรวจสอบว่า Line ของข้อมูลเก่า มีอยู่ใน Master ไหม?
        const isExist = validLines.includes(itemLineTrimmed);
        
        // สร้าง HTML Option พื้นฐาน
        let finalOptionsHTML = '<option value="" disabled>-- เลือก Line / แผนก --</option>';
        
        // ถ้าเป็นข้อมูลเก่าที่ถูกลบไปแล้ว ให้สร้าง Option พิเศษรอไว้เลย
        if (itemLineTrimmed !== '' && !isExist) {
            finalOptionsHTML += `<option value="${itemLineTrimmed}">${itemLineTrimmed} (ข้อมูลเก่า)</option>`;
        }
        
        // เอา Master Data มาวนลูปต่อ
        finalOptionsHTML += validLines.map(line => {
            const lineTrimmed = line.trim();
            // ถ้าตรงกับค่าปัจจุบัน ให้ Selected ไว้เลย
            const selectedStr = (lineTrimmed === itemLineTrimmed) ? 'selected' : '';
            return `<option value="${lineTrimmed}" ${selectedStr}>${lineTrimmed}</option>`;
        }).join('');
        
        // ยัด HTML ใส่ Select สดๆ
        editLineEl.innerHTML = finalOptionsHTML;
        
        // บังคับ Set Value อีกครั้งเพื่อความชัวร์ (กรณีข้อมูลเก่า)
        if (itemLineTrimmed !== '' && !isExist) {
            editLineEl.value = itemLineTrimmed;
        }
    }

    // 3. เติมข้อมูลทั่วไป (ป้องกัน error หากหา ID ไม่เจอ)
    const setVal = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = val || '';
    };

    setVal('edit_machine', item.machine);
    setVal('edit_issue_description', item.issue_description);
    setVal('edit_job_type', item.job_type || 'Repair');
    setVal('edit_technician_note', item.technician_note);
    setVal('edit_spare_parts', item.spare_parts_list);

    // 4. จัดการเรื่องคนแจ้ง/คนซ่อม 
    const reqInput = document.querySelector('#editMaintenanceForm input[name="request_by"]');
    const resInput = document.querySelector('#editMaintenanceForm input[name="resolved_by"]');
    if (reqInput) reqInput.value = item.requester_name ?? item.request_by ?? '';
    if (resInput) resInput.value = item.resolver_name ?? item.resolved_by ?? '';
    
    // 5. Priority & เวลา
    const priorityValue = item.priority || 'Normal';
    const prioRadio = document.getElementById(`editPrio${priorityValue}`);
    if (prioRadio) prioRadio.checked = true;

    setVal('edit_request_date', formatForDateTimeLocal(item.request_date));
    setVal('edit_started_at', formatForDateTimeLocal(item.started_at));
    setVal('edit_resolved_at', formatForDateTimeLocal(item.resolved_at));

    // 6. เวลาซ่อมจริง
    const editMinutes = document.getElementById('edit_actual_minutes');
    if (editMinutes) {
        if (item.actual_repair_minutes !== null && item.actual_repair_minutes !== undefined) {
            editMinutes.value = item.actual_repair_minutes; 
        } else {
            editMinutes.value = ''; 
            const resolvedInput = document.getElementById('edit_resolved_at');
            if (resolvedInput) resolvedInput.dispatchEvent(new Event('change'));
        }
    }

    // เรียกฟังก์ชันเปลี่ยน Modal
    switchModal('viewMaintenanceModal', 'editMaintenanceModal');
};

// ==========================================
// 5. API Actions (Quick Start & Email)
// ==========================================
async function updateMtStatus(id, currentStatus) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    if (currentStatus === 'Pending') {
        if (!confirm('ยืนยันรับงาน (Start Repair)?')) return;

        showSpinner();
        try {
            const startISO = getNowDateTimeLocal();
            const response = await fetch(`${MT_API_URL}?action=update_status`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-CSRF-TOKEN': csrfToken 
                },
                body: JSON.stringify({ 
                    id: id, 
                    status: 'In Progress',
                    started_at: startISO,
                    technician_note: 'Job Started'
                })
            });
            
            const res = await response.json();
            if (res.success) {
                showToast('รับงานเรียบร้อย (In Progress)', '#28a745');
                fetchMaintenanceData(); 
            } else {
                showToast(res.message, '#dc3545');
            }
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการอัปเดตสถานะ', '#dc3545');
        } finally {
            hideSpinner();
        }
    }
}

async function resendEmail(id) {
    if(!confirm('ต้องการส่งอีเมลรายงานซ้ำใช่หรือไม่?')) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=resend_email`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        
        if (result.success) showToast('ส่งอีเมลเรียบร้อยแล้ว', '#28a745');
        else showToast(result.message, '#dc3545');
    } catch (error) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', '#dc3545');
    } finally {
        hideSpinner();
    }
}

// ==========================================
// 6. Dashboard Summary & Export
// ==========================================
async function fetchMaintenanceSummary() {
    const dateType = document.getElementById('mtDateFilterType')?.value || 'request_date'; 
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';
    const line = document.getElementById('filterLineMt')?.value || '';

    try {
        const response = await fetch(`${MT_API_URL}?action=get_maintenance_summary&line=${line}&dateType=${dateType}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();

        if (result.success) {
            const s = result.summary;
            document.getElementById('sumTotal').textContent = s.Total_Jobs || 0;
            document.getElementById('sumCompleted').textContent = s.Completed_Jobs || 0;
            document.getElementById('sumPending').textContent = s.Pending_Jobs || 0;
            
            const avgTime = parseFloat(s.Avg_Repair_Time || 0).toFixed(0);
            document.getElementById('sumAvgTime').innerHTML = `${avgTime} <span class="fs-6 text-muted">min</span>`;
        }
    } catch (err) {
        console.error("Summary Error:", err);
    }
}

async function exportMaintenanceExcel() {
    const status = document.getElementById('mtFilterStatus')?.value || '';
    const line = document.getElementById('filterLineMt')?.value || '';
    const dateType = document.getElementById('mtDateFilterType')?.value || 'request_date'; 
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';

    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}&dateType=${dateType}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        if (!result.success || result.data.length === 0) {
            showToast("No data to export", "#ffc107");
            return;
        }

        const exportData = result.data.map(item => ({
            "Job No": formatJobNo(item.id, item.request_date),
            "Job Type": item.job_type || 'Repair',
            "Status": item.status,
            "Request Date": item.request_date,
            "Line": item.line,
            "Machine": item.machine,
            "Priority": item.priority,
            "Issue": item.issue_description,
            "Requester": item.requester_name || item.request_by,
            "Technician": item.resolver_name || item.resolved_by || '',
            "Started At": item.started_at || '',
            "Finished At": item.resolved_at || '',
            "Tech Note": item.technician_note || '',
            "Spare Parts": item.spare_parts_list || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        const wscols = [
            {wch:15}, {wch:15}, {wch:10}, {wch:20}, {wch:10}, {wch:15}, 
            {wch:10}, {wch:30}, {wch:15}, {wch:15}, {wch:20}, 
            {wch:20}, {wch:30}, {wch:30}
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Maintenance Data");
        XLSX.writeFile(wb, `Maintenance_Report_${startDate}_to_${endDate}.xlsx`);

    } catch (err) {
        showToast("Export Failed", "#dc3545");
    } finally {
        hideSpinner();
    }
}

// ==========================================
// 7. DOMContentLoaded: ผูก Event Listeners ทั้งหมด
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadStandardLines();
    loadMaintenanceMachines();
    loadCurrentUserName();

    const setButtonLoading = (btn, isLoading) => {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        }
    };

    const addModalEl = document.getElementById('addMaintenanceModal');
    if (addModalEl) {
        addModalEl.addEventListener('show.bs.modal', () => {
            // ประทับเวลา
            document.getElementById('add_request_date').value = getNowDateTimeLocal();
            
            // 💡 2. เอาชื่อภาษาไทยที่ดึงมาได้ ยัดใส่ช่องผู้แจ้งซ่อม
            const reqByInput = document.getElementById('add_request_by');
            if (reqByInput && !reqByInput.value && currentUserThaiName !== '') { 
                reqByInput.value = currentUserThaiName;
            }
        });
    }

    const addMtForm = document.getElementById('addMaintenanceForm');
    if (addMtForm) {
        addMtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addMtForm.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const formData = new FormData(addMtForm);
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            showSpinner();
            try {
                const response = await fetch(`${MT_API_URL}?action=add_request`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    body: formData 
                });
                
                const res = await response.json();
                if (res.success) {
                    showToast('ส่งใบแจ้งซ่อมเรียบร้อย', '#28a745');
                    bootstrap.Modal.getInstance(document.getElementById('addMaintenanceModal')).hide();
                    addMtForm.reset();
                    fetchMaintenanceData();
                } else {
                    showToast(res.message, '#dc3545');
                }
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการส่งข้อมูล', '#dc3545');
            } finally {
                hideSpinner();
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // 🚀 ผูก Event Submit แบบถึกทน (ป้องกันการเงียบหาย)
    const completeForm = document.getElementById('completeMaintenanceForm');
    if (completeForm) {
        // ใช้ .onsubmit แทนเพื่อบังคับทับ Event เก่าที่อาจจะค้างอยู่
        completeForm.onsubmit = async function(e) {
            e.preventDefault(); // หยุดการ Refresh หน้าเว็บ
            console.log("✅ 1. Submit button clicked!"); 

            try {
                // ดึงค่าเวลามาเช็ค
                const reqVal = completeForm.dataset.reqDate; 
                const startVal = document.getElementById('comp_started_at').value;
                const endVal = document.getElementById('comp_resolved_at').value;
                
                // ตรวจสอบเงื่อนไขเวลา (ถ้ามี)
                if (typeof validateTimeline === 'function') {
                    const errorMsg = validateTimeline(reqVal, startVal, endVal);
                    if (errorMsg) {
                        console.warn("Timeline Error:", errorMsg);
                        if (typeof showToast === 'function') showToast(errorMsg, '#dc3545');
                        else alert(errorMsg);
                        return; // หยุดการทำงานถ้าเวลาผิด
                    }
                }

                console.log("✅ 2. Validation passed. Preparing to send...");

                // เปลี่ยนปุ่มเป็นสถานะโหลด
                const submitBtn = completeForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
                }

                // เตรียมข้อมูลส่ง API
                const formData = new FormData(completeForm);
                formData.append('action', 'complete_job');
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

                console.log("✅ 3. Fetching API...");

                const response = await fetch(MT_API_URL, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    body: formData 
                });
                
                const res = await response.json();
                console.log("✅ 4. API Response:", res);

                // ตรวจสอบผลลัพธ์
                if (res.success) {
                    if (typeof showToast === 'function') showToast('ปิดงานซ่อมเสร็จสมบูรณ์', '#28a745');
                    
                    const modalInst = bootstrap.Modal.getInstance(document.getElementById('completeMaintenanceModal'));
                    if (modalInst) modalInst.hide();
                    
                    completeForm.reset();
                    if (typeof fetchMaintenanceData === 'function') fetchMaintenanceData();
                } else {
                    if (typeof showToast === 'function') showToast(res.message || 'เกิดข้อผิดพลาด', '#dc3545');
                    else alert(res.message);
                }

            } catch (err) {
                // ถ้าโค้ดพังกลางคัน มันจะมาตกตรงนี้ ไม่เงียบหายไปเฉยๆ
                console.error('❌ Crash inside submit:', err);
                alert('โปรแกรมขัดข้อง กรุณากด F12 ดูแถบ Console');
            } finally {
                // คืนค่าปุ่มกลับมาให้กดใหม่ได้
                const submitBtn = completeForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save & Close Job';
                }
            }
        };
    }

    const editMtForm = document.getElementById('editMaintenanceForm');
    if (editMtForm) {
        editMtForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const reqVal = document.getElementById('edit_request_date').value;
            const startVal = document.getElementById('edit_started_at').value;
            const endVal = document.getElementById('edit_resolved_at').value;
            
            const errorMsg = validateTimeline(reqVal, startVal, endVal);
            if (errorMsg) {
                showToast(errorMsg, '#dc3545');
                return;
            }

            const submitBtn = editMtForm.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const formData = new FormData(editMtForm);
            formData.append('action', 'edit_request'); 
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            showSpinner();
            try {
                const response = await fetch(MT_API_URL, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    body: formData 
                });
                const res = await response.json();
                
                if (res.success) {
                    showToast('อัปเดตข้อมูลเรียบร้อย', '#28a745');
                    bootstrap.Modal.getInstance(document.getElementById('editMaintenanceModal')).hide();
                    fetchMaintenanceData();
                } else {
                    showToast(res.message, '#dc3545');
                }
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', '#dc3545');
            } finally {
                hideSpinner();
                setButtonLoading(submitBtn, false);
            }
        });
    }

    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            if (event.target.id === 'maintenance-tab') fetchMaintenanceData();
        })
    });

    const calculateDiffMinutes = (startStr, endStr) => {
        if (!startStr || !endStr) return '';
        const start = new Date(startStr.replace(' ', 'T')).getTime();
        const end = new Date(endStr.replace(' ', 'T')).getTime();
        if (end > start) {
            return Math.floor((end - start) / 60000);
        }
        return 0;
    };

    const compStart = document.getElementById('comp_started_at');
    const compEnd = document.getElementById('comp_resolved_at');
    const compMinutes = document.getElementById('comp_actual_minutes');

    const updateCompMinutes = () => {
        const diff = calculateDiffMinutes(compStart.value, compEnd.value);
        if (diff !== '' && compMinutes) compMinutes.value = diff;
    };
    if (compStart) compStart.addEventListener('change', updateCompMinutes);
    if (compEnd) compEnd.addEventListener('change', updateCompMinutes);

    const editStart = document.getElementById('edit_started_at');
    const editEnd = document.getElementById('edit_resolved_at');
    const editMinutes = document.getElementById('edit_actual_minutes');

    const updateEditMinutes = () => {
        const diff = calculateDiffMinutes(editStart.value, editEnd.value);
        if (diff !== '' && editMinutes) editMinutes.value = diff;
    };
    if (editStart) editStart.addEventListener('change', updateEditMinutes);
    if (editEnd) editEnd.addEventListener('change', updateEditMinutes);
    
    document.getElementById('mtStartDate')?.addEventListener('change', fetchMaintenanceData);
    document.getElementById('mtEndDate')?.addEventListener('change', fetchMaintenanceData);
    document.getElementById('mtFilterStatus')?.addEventListener('change', fetchMaintenanceData);
    document.getElementById('mtDateFilterType')?.addEventListener('change', fetchMaintenanceData);
});