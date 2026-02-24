const MT_API_URL = 'api/maintenanceManage.php';
let currentMaintenanceData = [];

// ==========================================
// 1. ฟังก์ชัน Helper สำหรับแปลงวันที่
// ==========================================
function toLocalISOString(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
}

function formatJobNo(id, dateString) {
    const reqDateObj = new Date(dateString);
    const thaiYearShort = (reqDateObj.getFullYear() + 543).toString().slice(-2);
    const monthTwoDigits = (reqDateObj.getMonth() + 1).toString().padStart(2, '0'); 
    const runNo = id.toString().padStart(4, '0');
    return `MNT-${thaiYearShort}${monthTwoDigits}-${runNo}`;
}

// ==========================================
// 2. ฟังก์ชันดึงข้อมูล (Fetch Data)
// ==========================================
async function fetchMaintenanceData() {
    const statusEl = document.getElementById('mtFilterStatus');
    const lineEl = document.getElementById('filterLineMt');
    
    const status = statusEl ? statusEl.value : 'Active';
    const line = lineEl ? lineEl.value : '';
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';
    
    fetchMaintenanceSummary(); 

    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        
        if (result.success) {
            currentMaintenanceData = result.data; 
            
            // ล้างช่อง Search ก่อนโหลดข้อมูลใหม่
            const searchBox = document.getElementById('mtSearchBox');
            if(searchBox) searchBox.value = '';
            
            // เรียกฟังก์ชันวาดตาราง
            renderMaintenanceTable(currentMaintenanceData);
        }
    } catch(err) {
        console.error(err);
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
            
            // [NEW] แปลงเลข Job
            const jobNo = formatJobNo(row.id, row.request_date);

            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'I') {
                    viewMaintenanceDetails(row.id);
                }
            };

            // [NEW] เพิ่มคอลัมน์ <td class="font-monospace text-primary">...
            tr.innerHTML = `
                <td class="ps-3 text-center">${statusBadge}</td>
                <td class="text-center text-primary fw-bold font-monospace small">${jobNo}</td>
                <td class="small text-nowrap text-center">${new Date(row.request_date).toLocaleString('th-TH')}</td>
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
        // [FIXED] เพิ่ม colspan เป็น 8 เพราะมีคอลัมน์เพิ่มมา
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-folder-open fa-2x mb-2 opacity-25"></i><br>No maintenance requests found.</td></tr>';
    }
}

function filterMaintenanceTable() {
    const searchInput = document.getElementById('mtSearchBox')?.value.toLowerCase().trim() || '';
    
    // ถ้าพิมพ์ว่างๆ ให้โชว์ข้อมูลทั้งหมด
    if (searchInput === '') {
        renderMaintenanceTable(currentMaintenanceData);
        return;
    }

    // ค้นหาทุกๆ Column จาก Array หลัก
    const filteredData = currentMaintenanceData.filter(row => {
        const jobNo = formatJobNo(row.id, row.request_date).toLowerCase();
        const line = (row.line || '').toLowerCase();
        const machine = (row.machine || '').toLowerCase();
        const issue = (row.issue_description || '').toLowerCase();
        const techNote = (row.technician_note || '').toLowerCase();
        const reqName = (row.requester_name || row.request_by || '').toLowerCase();
        const jobType = (row.job_type || '').toLowerCase();
        const priority = (row.priority || '').toLowerCase();

        return jobNo.includes(searchInput) ||
               line.includes(searchInput) ||
               machine.includes(searchInput) ||
               issue.includes(searchInput) ||
               techNote.includes(searchInput) ||
               reqName.includes(searchInput) ||
               jobType.includes(searchInput) ||
               priority.includes(searchInput);
    });

    renderMaintenanceTable(filteredData);
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
        
        if (result.success) {
            showToast('ส่งอีเมลเรียบร้อยแล้ว', '#28a745');
        } else {
            showToast(result.message, '#dc3545');
        }
    } catch (error) {
        console.error(error);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', '#dc3545');
    } finally {
        hideSpinner();
    }
}

function viewMaintenanceDetails(id) {
    const data = currentMaintenanceData.find(item => item.id == id);
    if (!data) return;

    const setText = (elmId, val) => {
        const el = document.getElementById(elmId);
        if(el) el.textContent = val || '-';
    };

    const reqDateObj = new Date(data.request_date);
    const thaiYearShort = (reqDateObj.getFullYear() + 543).toString().slice(-2);
    const monthTwoDigits = (reqDateObj.getMonth() + 1).toString().padStart(2, '0'); 
    const runNo = data.id.toString().padStart(4, '0');
    const formattedJobNo = `MNT-${thaiYearShort}${monthTwoDigits}-${runNo}`;
    
    // 1. Fill Text Data
    setText('view_machine_title', data.machine);
    setText('view_line_subtitle', data.line);
    setText('view_issue', data.issue_description);
    
    // [NEW] นำค่า job_type ไปแสดงใน Modal View
    setText('view_job_type', data.job_type || 'Repair');
    
    const reqName = data.requester_name || data.request_by;
    setText('view_requested_by', reqName);
    setText('view_request_date', new Date(data.request_date).toLocaleString('th-TH'));
    setText('view_job_id', formattedJobNo);

    // 2. Status Badge & Priority
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

    // 3. Image Before Logic
    const imgBefore = document.getElementById('view_photo_before');
    const noImgBefore = document.getElementById('no_photo_before');

    if (imgBefore) {
        imgBefore.classList.add('d-none');
        imgBefore.style.display = ''; 
    }
    if (noImgBefore) noImgBefore.classList.add('d-none');

    if (data.photo_before_path) {
        if(imgBefore) {
            imgBefore.src = data.photo_before_path;
            imgBefore.classList.remove('d-none'); 
        }
        if(noImgBefore) noImgBefore.classList.add('d-none'); 
    } else {
        if(noImgBefore) noImgBefore.classList.remove('d-none');
    }

    // 4. Buttons & Completion Section Logic
    const completionSection = document.getElementById('view_completion_section');
    const btnStart = document.getElementById('btn_start_job');
    const btnComplete = document.getElementById('btn_complete_job');
    const actionCompleted = document.getElementById('action_buttons_completed');

    const btnEdit = document.getElementById('btn_edit_job');
    if(btnEdit) {
        btnEdit.classList.remove('d-none'); // ให้ปุ่มโชว์เสมอ ไม่ว่างานจะเสร็จหรือไม่
        btnEdit.onclick = () => openEditModal(id);
    }

    if(btnStart) btnStart.classList.add('d-none');
    if(btnComplete) btnComplete.classList.add('d-none');
    if(actionCompleted) actionCompleted.classList.add('d-none');
    if(completionSection) completionSection.classList.add('d-none');

    if (data.status === 'Pending') {
        if(btnStart) {
            btnStart.classList.remove('d-none');
            btnStart.onclick = null; 
            btnStart.onclick = () => {
                 bootstrap.Modal.getInstance(document.getElementById('viewMaintenanceModal')).hide();
                 updateMtStatus(id, 'Pending');
            };
        }
    } 
    else if (data.status === 'In Progress') {
        if(btnComplete) {
            btnComplete.classList.remove('d-none');
            btnComplete.onclick = null;
            btnComplete.onclick = () => {
                 bootstrap.Modal.getInstance(document.getElementById('viewMaintenanceModal')).hide();
                 openCompleteModal(id);
            };
        }
    } 
    else if (data.status === 'Completed') {
        if(completionSection) completionSection.classList.remove('d-none');
        if(actionCompleted) actionCompleted.classList.remove('d-none');

        setText('view_tech_note', data.technician_note);
        setText('view_spare_parts', data.spare_parts_list);
        
        const startStr = data.started_at ? new Date(data.started_at).toLocaleString('th-TH') : '-';
        const endStr = data.resolved_at ? new Date(data.resolved_at).toLocaleString('th-TH') : '-';
        
        setText('view_started_at', startStr);
        setText('view_resolved_at', endStr);
        
        const techName = data.resolver_name || data.resolved_by;
        setText('view_resolved_by', techName);

        // Image After Logic 
        const imgAfter = document.getElementById('view_photo_after');
        const noImgAfter = document.getElementById('no_photo_after');

        if (imgAfter) {
            imgAfter.classList.add('d-none');
            imgAfter.style.display = '';
        }
        if (noImgAfter) noImgAfter.classList.add('d-none');

        if (data.photo_after_path) {
            if(imgAfter) {
                imgAfter.src = data.photo_after_path;
                imgAfter.classList.remove('d-none');
            }
            if(noImgAfter) noImgAfter.classList.add('d-none');
        } else {
            if(noImgAfter) noImgAfter.classList.remove('d-none');
        }

        const btnPrint = document.getElementById('btn_print_job');
        if(btnPrint) btnPrint.href = `print_job_order.php?id=${id}`;
        
        const btnEmail = document.getElementById('btn_resend_email');
        if(btnEmail) {
            btnEmail.onclick = null;
            btnEmail.onclick = () => resendEmail(id);
        }
    }

    showBootstrapModal('viewMaintenanceModal');
}

// ==========================================
// 7. ฟังก์ชันเปิด Modal แก้ไขข้อมูล (Edit Job)
// ==========================================
function openEditModal(id) {
    const data = currentMaintenanceData.find(item => item.id == id);
    if (!data) return;

    // เติมค่าเดิมลงในฟอร์ม
    document.getElementById('edit_req_id').value = data.id;
    document.querySelector('#editMaintenanceForm input[name="line"]').value = data.line;
    document.querySelector('#editMaintenanceForm input[name="machine"]').value = data.machine;
    document.querySelector('#editMaintenanceForm select[name="job_type"]').value = data.job_type || 'Repair';
    document.querySelector('#editMaintenanceForm textarea[name="issue_description"]').value = data.issue_description;
    
    // [NEW] ดึงชื่อที่ประมวลผลแล้วมาให้แก้ไข (ถ้าไม่มีให้ว่างไว้)
    const reqName = data.requester_name || data.request_by || '';
    const resName = data.resolver_name || data.resolved_by || '';
    
    const reqInput = document.querySelector('#editMaintenanceForm input[name="request_by"]');
    const resInput = document.querySelector('#editMaintenanceForm input[name="resolved_by"]');
    
    if(reqInput) reqInput.value = reqName;
    if(resInput) resInput.value = resName;
    
    // เติมค่า Radio Button
    document.querySelectorAll('#editMaintenanceForm input[name="priority"]').forEach(radio => {
        if(radio.value === data.priority) radio.checked = true;
    });

    // ปิดหน้า View แล้วเปิดหน้า Edit
    bootstrap.Modal.getInstance(document.getElementById('viewMaintenanceModal')).hide();
    showBootstrapModal('editMaintenanceModal');
}

// ==========================================
// 3. ฟังก์ชันเปิด Modal ปิดงาน (Complete Job)
// ==========================================
function openCompleteModal(id) {
    const idInput = document.getElementById('complete_req_id');
    if (idInput) idInput.value = id;
    
    const jobData = currentMaintenanceData.find(j => j.id == id);
    const now = new Date();
    const endISO = toLocalISOString(now);
    
    let startISO = endISO;
    if (jobData && jobData.started_at) {
        startISO = jobData.started_at.replace(' ', 'T').substring(0, 16);
    }

    const startInput = document.querySelector('#completeMaintenanceForm input[name="started_at"]');
    const endInput = document.querySelector('#completeMaintenanceForm input[name="resolved_at"]');

    if (startInput) startInput.value = startISO;
    if (endInput) endInput.value = endISO;

    showBootstrapModal('completeMaintenanceModal');
}

// ==========================================
// 4. ฟังก์ชันหลัก: Update Status
// ==========================================
async function updateMtStatus(id, currentStatus) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    if (currentStatus === 'Pending') {
        if (!confirm('Start repair job?')) return;

        showSpinner();
        try {
            const now = new Date();
            const startISO = toLocalISOString(now);
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
                showToast('เริ่มงานเรียบร้อย (In Progress)', '#28a745');
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
    else if (currentStatus === 'In Progress') {
        openCompleteModal(id);
    }
}

// ==========================================
// 6. Maintenance Summary & Export
// ==========================================
async function fetchMaintenanceSummary() {
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';
    const line = document.getElementById('filterLineMt')?.value || '';

    try {
        const response = await fetch(`${MT_API_URL}?action=get_maintenance_summary&startDate=${startDate}&endDate=${endDate}&line=${line}`);
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
    const startDate = document.getElementById('mtStartDate')?.value || '';
    const endDate = document.getElementById('mtEndDate')?.value || '';
    const line = document.getElementById('filterLineMt')?.value || '';
    const status = document.getElementById('mtFilterStatus')?.value || '';

    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}&startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            showToast("No data to export", "#ffc107");
            return;
        }

        const exportData = result.data.map(item => ({
            "Job No": `MNT-${item.id}`,
            "Job Type": item.job_type || 'Repair', // [NEW] ส่งค่า Job Type ออก Excel
            "Status": item.status,
            "Request Date": item.request_date,
            "Line": item.line,
            "Machine": item.machine,
            "Priority": item.priority,
            "Issue": item.issue_description,
            "Requester": item.requester_name,
            "Technician": item.resolver_name || '',
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
        console.error(err);
        showToast("Export Failed", "#dc3545");
    } finally {
        hideSpinner();
    }
}

// ==========================================
// 5. DOMContentLoaded: Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const addMtForm = document.getElementById('addMaintenanceForm');
    if (addMtForm) {
        addMtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addMtForm);
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            showSpinner();
            try {
                const response = await fetch(`${MT_API_URL}?action=add_request`, {
                    method: 'POST',
                    headers: { 
                        'X-CSRF-TOKEN': csrfToken 
                    },
                    body: formData 
                });
                
                const res = await response.json();
                if (res.success) {
                    showToast('ส่งใบแจ้งซ่อมเรียบร้อย', '#28a745');
                    
                    const modalEl = document.getElementById('addMaintenanceModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    addMtForm.reset();
                    
                    fetchMaintenanceData();
                } else {
                    showToast(res.message, '#dc3545');
                }
            } catch (err) {
                console.error(err);
                showToast('เกิดข้อผิดพลาดในการส่งข้อมูล', '#dc3545');
            } finally {
                hideSpinner();
            }
        });
    }

    // --- B. จัดการ Form ปิดงานซ่อม (Complete Job) ---
    const completeForm = document.getElementById('completeMaintenanceForm');
    if (completeForm) {
        completeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(completeForm);
            formData.append('action', 'complete_job');
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
                    showToast('ปิดงานซ่อมเสร็จสมบูรณ์', '#28a745');
                    
                    const modalEl = document.getElementById('completeMaintenanceModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    modalInstance.hide();
                    completeForm.reset();
                    
                    fetchMaintenanceData();
                } else {
                    showToast(res.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', '#dc3545');
                }
            } catch (err) {
                console.error('Upload Error:', err);
                showToast('เกิดข้อผิดพลาดในการส่งข้อมูล (ตรวจสอบขนาดไฟล์รูป)', '#dc3545');
            } finally {
                hideSpinner();
            }
        });
    }

    // --- D. จัดการ Form แก้ไขข้อมูล (Edit Job) ---
    const editMtForm = document.getElementById('editMaintenanceForm');
    if (editMtForm) {
        editMtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editMtForm);
            formData.append('action', 'edit_request'); // ส่ง Action ไปให้ Backend
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
                    
                    // รีเฟรชข้อมูลในตารางใหม่
                    fetchMaintenanceData();
                } else {
                    showToast(res.message || 'เกิดข้อผิดพลาด', '#dc3545');
                }
            } catch (err) {
                console.error('Edit Error:', err);
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', '#dc3545');
            } finally {
                hideSpinner();
            }
        });
    }

    // --- C. ตรวจจับการเปลี่ยน Tab ---
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            if (event.target.id === 'maintenance-tab') {
                fetchMaintenanceData();
            }
        })
    });
    
    // [NEW] ผูก Event เข้ากับ mtStartDate แทน filterStartDate
    document.getElementById('mtStartDate')?.addEventListener('change', fetchMaintenanceData);
    document.getElementById('mtEndDate')?.addEventListener('change', fetchMaintenanceData);
});