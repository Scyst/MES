const MT_API_URL = 'api/maintenanceManage.php';
let currentMaintenanceData = [];

// ==========================================
// 1. ฟังก์ชัน Helper สำหรับแปลงวันที่
// ==========================================
function toLocalISOString(date) {
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    return localISOTime;
}

// ==========================================
// 2. ฟังก์ชันดึงข้อมูล (Fetch Data) **[ส่วนที่ขาดหายไป]**
// ==========================================
async function fetchMaintenanceData() {
    const statusEl = document.getElementById('mtFilterStatus');
    const lineEl = document.getElementById('filterLineMt');
    
    const status = statusEl ? statusEl.value : 'Active';
    const line = lineEl ? lineEl.value : '';
    
    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}`);
        const result = await response.json();
        
        if (result.success) {
            currentMaintenanceData = result.data; 
        }

        const tbody = document.getElementById('maintenanceTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if(result.success && result.data.length > 0) {
            result.data.forEach(row => {
                // Badge Logic
                let statusBadge = '';
                let rowClass = 'cursor-pointer hover-bg'; // เพิ่ม class ให้รู้ว่ากดได้
                
                if(row.status === 'Pending') statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2">Pending</span>';
                else if(row.status === 'In Progress') statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning px-2">Processing</span>';
                else statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success px-2">Completed</span>';

                let priorityColor = row.priority === 'Critical' ? 'text-danger fw-bold' : (row.priority === 'Urgent' ? 'text-warning fw-bold' : 'text-body');
                const reqName = row.requester_name || row.request_by;

                const tr = document.createElement('tr');
                tr.className = rowClass;
                
                // [NEW] ผูก Event Click ทั้งแถว
                tr.onclick = (e) => {
                    // ป้องกันการกดซ้อน (เผื่ออนาคตมีปุ่มอื่นในแถว)
                    if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'I') {
                        viewMaintenanceDetails(row.id);
                    }
                };

                // [NEW] ลบคอลัมน์ Action ออกแล้ว
                tr.innerHTML = `
                    <td class="ps-3 text-center">${statusBadge}</td>
                    <td class="small text-nowrap text-center">${new Date(row.request_date).toLocaleString('th-TH')}</td>
                    <td class="text-center">
                        <div class="fw-bold text-body">${row.line}</div>
                        <small class="text-muted">${row.machine}</small>
                    </td>
                    <td class="${priorityColor} small text-center">${row.priority}</td>
                    <td class="small text-body text-center">${reqName}</td>
                    <td class="text-center"><span class="text-break small">${row.issue_description}</span></td>
                    <td class="small text-body text-center note-truncate" title="${row.technician_note || ''}">${row.technician_note || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            // ปรับ colspan เป็น 7 (เพราะลบ Action ออกไป 1 ช่อง)
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="fas fa-folder-open fa-2x mb-2 opacity-25"></i><br>No maintenance requests found.</td></tr>';
        }
    } catch(err) {
        console.error(err);
        showToast('Failed to load maintenance data', '#dc3545');
    } finally {
        hideSpinner();
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

    // Helper: Set Text Content Safely
    const setText = (elmId, val) => {
        const el = document.getElementById(elmId);
        if(el) el.textContent = val || '-';
    };

    // Prepare Date & Job No
    const reqDateObj = new Date(data.request_date);
    const thaiYearShort = (reqDateObj.getFullYear() + 543).toString().slice(-2);
    const monthTwoDigits = (reqDateObj.getMonth() + 1).toString().padStart(2, '0'); 
    const runNo = data.id.toString().padStart(4, '0');
    const formattedJobNo = `MNT-${thaiYearShort}${monthTwoDigits}-${runNo}`;
    
    // 1. Fill Text Data
    setText('view_machine_title', data.machine);
    setText('view_line_subtitle', data.line);
    setText('view_issue', data.issue_description);
    
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
        priorityEl.className = data.priority === 'Critical' ? 'text-danger fw-bold' : ''; 
    }

    // =================================================================
    // 3. Image Before Logic (ใช้ Logic ของคุณ)
    // =================================================================
    const imgBefore = document.getElementById('view_photo_before');
    const noImgBefore = document.getElementById('no_photo_before');

    // Reset: ซ่อนทั้งคู่ก่อน และล้าง inline style ที่อาจค้างอยู่
    if (imgBefore) {
        imgBefore.classList.add('d-none');
        imgBefore.style.display = ''; 
    }
    if (noImgBefore) noImgBefore.classList.add('d-none');

    // Logic: มีรูป -> โชว์รูป / ไม่มีรูป -> โชว์ข้อความ
    if (data.photo_before_path) {
        if(imgBefore) {
            imgBefore.src = data.photo_before_path;
            imgBefore.classList.remove('d-none'); // เปิดรูป
        }
        // *เพิ่มเติม: ถ้ามีรูป ต้องซ่อน text no image แน่นอน
        if(noImgBefore) noImgBefore.classList.add('d-none'); 
    } else {
        // ไม่มีรูป -> เปิดข้อความ
        if(noImgBefore) noImgBefore.classList.remove('d-none');
    }

    // 4. Buttons & Completion Section Logic
    const completionSection = document.getElementById('view_completion_section');
    const btnStart = document.getElementById('btn_start_job');
    const btnComplete = document.getElementById('btn_complete_job');
    const actionCompleted = document.getElementById('action_buttons_completed');

    // Reset Visibility
    if(btnStart) btnStart.classList.add('d-none');
    if(btnComplete) btnComplete.classList.add('d-none');
    if(actionCompleted) actionCompleted.classList.add('d-none');
    if(completionSection) completionSection.classList.add('d-none');

    // Control Logic based on Status
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

        // =================================================================
        // Image After Logic (ใช้ Logic เดียวกัน)
        // =================================================================
        const imgAfter = document.getElementById('view_photo_after');
        const noImgAfter = document.getElementById('no_photo_after');

        // Reset
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

        // Print & Email
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

    // --- C. ตรวจจับการเปลี่ยน Tab ---
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            if (event.target.id === 'maintenance-tab') {
                fetchMaintenanceData();
            }
        })
    });
});