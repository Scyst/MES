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
    const lineEl = document.getElementById('filterLine');
    
    // ป้องกัน Error กรณีหา Element ไม่เจอ
    const status = statusEl ? statusEl.value : '';
    const line = lineEl ? lineEl.value : '';
    
    showSpinner();
    try {
        const response = await fetch(`${MT_API_URL}?action=get_requests&status=${status}&line=${line}`);
        const result = await response.json();
        
        // เก็บข้อมูลลงตัวแปร Global
        if (result.success) {
            currentMaintenanceData = result.data; // <--- บันทึกข้อมูลไว้ใช้
        }

        const tbody = document.getElementById('maintenanceTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if(result.success && result.data.length > 0) {
            result.data.forEach(row => {
                let statusBadge = '';
                if(row.status === 'Pending') statusBadge = '<span class="badge bg-danger">Pending</span>';
                else if(row.status === 'In Progress') statusBadge = '<span class="badge bg-warning text-dark">In Progress</span>';
                else if(row.status === 'Completed') statusBadge = '<span class="badge bg-success">Completed</span>';

                let priorityColor = row.priority === 'Critical' ? 'text-danger fw-bold' : (row.priority === 'Urgent' ? 'text-warning' : '');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${statusBadge}</td>
                    <td>${new Date(row.request_date).toLocaleString('th-TH')}</td>
                    <td>
                        <div class="fw-bold">${row.line}</div>
                        <small class="text-muted">${row.machine}</small>
                    </td>
                    <td>${row.issue_description}</td>
                    <td class="${priorityColor}">${row.priority}</td>
                    <td>${row.request_by}</td>
                    <td><small>${row.technician_note || '-'}</small></td>
                    <td>
                        <div class="btn-group">
                            ${row.status !== 'Completed' ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="updateMtStatus(${row.id}, '${row.status}')">
                                Update
                            </button>` : ''}
                            
                            <button class="btn btn-sm btn-info text-white" onclick="viewMaintenanceDetails(${row.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No maintenance requests found.</td></tr>';
        }
    } catch(err) {
        console.error(err);
        showToast('Failed to load maintenance data', '#dc3545');
    } finally {
        hideSpinner();
    }
}

/**
 * ฟังก์ชันสำหรับแสดงรายละเอียดงานซ่อมใน Modal และตั้งค่าปุ่ม Print
 * @param {number} id - ID ของใบงานซ่อม
 */
function viewMaintenanceDetails(id) {
    // 1. ค้นหาข้อมูลจากตัวแปร Global (currentMaintenanceData) ที่โหลดไว้ตอน fetchMaintenanceData
    // หมายเหตุ: ต้องมี let currentMaintenanceData = []; อยู่บนสุดของไฟล์
    const data = currentMaintenanceData.find(item => item.id == id);
    
    if (!data) {
        console.error("Data not found for ID:", id);
        return;
    }

    // Helper Function: ช่วยใส่ข้อความลงใน Element (ถ้าไม่มี Element ให้ข้าม)
    const setText = (elmId, text) => {
        const el = document.getElementById(elmId);
        if(el) el.textContent = text || '-';
    };

    // --- A. ส่วนข้อมูลทั่วไป (Header) ---
    setText('view_machine_line', `${data.machine} (${data.line})`);
    setText('view_issue', data.issue_description);
    setText('view_requested_by', data.request_by);
    
    // จัดรูปแบบวันที่แจ้งซ่อม
    const reqDate = new Date(data.request_date);
    setText('view_request_date', !isNaN(reqDate) ? reqDate.toLocaleString('th-TH') : '-');
    
    // จัดการ Badge สถานะ (สีและข้อความ)
    const badge = document.getElementById('view_status_badge');
    if (badge) {
        badge.textContent = data.status;
        badge.className = `badge fs-6 ${
            data.status === 'Completed' ? 'bg-success' : 
            (data.status === 'Pending' ? 'bg-danger' : 'bg-warning text-dark')
        }`;
    }

    // --- B. ส่วนข้อมูลการซ่อม (Completion Section) ---
    const completionSection = document.getElementById('view_completion_section');
    
    if (data.status === 'Completed') {
        // ถ้างานเสร็จแล้ว ให้แสดงส่วนนี้
        if(completionSection) completionSection.classList.remove('d-none');
        
        const start = data.started_at ? new Date(data.started_at) : null;
        const end = data.resolved_at ? new Date(data.resolved_at) : null;

        setText('view_started_at', start ? start.toLocaleString('th-TH') : '-');
        setText('view_resolved_at', end ? end.toLocaleString('th-TH') : '-');
        setText('view_tech_note', data.technician_note);
        setText('view_spare_parts', data.spare_parts_list);
        setText('view_resolved_by', data.resolved_by);

        // จัดการรูปภาพ Before
        const imgBefore = document.getElementById('view_photo_before');
        const noImgBefore = document.getElementById('no_photo_before');
        if (imgBefore && noImgBefore) {
            if (data.photo_before_path) {
                imgBefore.src = data.photo_before_path; // path จาก DB (มี ../ นำหน้าแล้ว)
                imgBefore.style.display = 'block';
                noImgBefore.style.display = 'none';
            } else {
                imgBefore.style.display = 'none';
                noImgBefore.style.display = 'block';
            }
        }

        // จัดการรูปภาพ After
        const imgAfter = document.getElementById('view_photo_after');
        const noImgAfter = document.getElementById('no_photo_after');
        if (imgAfter && noImgAfter) {
            if (data.photo_after_path) {
                imgAfter.src = data.photo_after_path;
                imgAfter.style.display = 'block';
                noImgAfter.style.display = 'none';
            } else {
                imgAfter.style.display = 'none';
                noImgAfter.style.display = 'block';
            }
        }

    } else {
        // ถ้างานยังไม่เสร็จ ให้ซ่อนส่วนนี้
        if(completionSection) completionSection.classList.add('d-none');
    }

    // --- C. จัดการปุ่ม Print (ส่วนที่คุณขอมา) ---
    const printBtn = document.getElementById('btn_print_job');
    if (printBtn) {
        // 1. อัปเดต Link ให้ชี้ไปที่ไฟล์ print_job_order.php พร้อมส่ง ID
        printBtn.href = `print_job_order.php?id=${id}`;
        
        // 2. ตรวจสอบสถานะเพื่อ เปิด/ปิด ปุ่ม
        if (data.status === 'Completed') {
            // ถ้าเสร็จแล้ว ให้กดได้ (ลบ class disabled)
            printBtn.classList.remove('disabled');
            printBtn.removeAttribute('aria-disabled');
        } else {
            // ถ้ายังไม่เสร็จ ให้กดไม่ได้ (ใส่ class disabled)
            // เพราะข้อมูลยังไม่ครบ ปริ้นไปก็โล่งๆ
            printBtn.classList.add('disabled');
            printBtn.setAttribute('aria-disabled', 'true');
        }
    }

    // --- D. เปิด Modal ---
    showBootstrapModal('viewMaintenanceModal');
}

// ==========================================
// 3. ฟังก์ชันเปิด Modal ปิดงาน (Complete Job)
// ==========================================
function openCompleteModal(id) {
    const idInput = document.getElementById('complete_req_id');
    if (idInput) idInput.value = id;
    
    const now = new Date();
    const timeString = toLocalISOString(now);

    const startInput = document.querySelector('#completeMaintenanceForm input[name="started_at"]');
    const endInput = document.querySelector('#completeMaintenanceForm input[name="resolved_at"]');

    if (startInput) startInput.value = timeString;
    if (endInput) endInput.value = timeString;

    showBootstrapModal('completeMaintenanceModal');
}

// ==========================================
// 4. ฟังก์ชันหลัก: Update Status
// ==========================================
async function updateMtStatus(id, currentStatus) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    if (currentStatus === 'Pending') {
        if (!confirm('ยืนยันเริ่มงานซ่อมใช่หรือไม่? (สถานะจะเปลี่ยนเป็น In Progress)')) return;

        showSpinner();
        try {
            const response = await fetch(`${MT_API_URL}?action=update_status`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-CSRF-TOKEN': csrfToken 
                },
                body: JSON.stringify({ 
                    id: id, 
                    status: 'In Progress',
                    technician_note: 'Started work'
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
    
    // --- A. จัดการ Form แจ้งซ่อม (Add Request) ---
    const addMtForm = document.getElementById('addMaintenanceForm');
    if (addMtForm) {
        addMtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addMtForm);
            const payload = Object.fromEntries(formData.entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            showSpinner();
            try {
                const response = await fetch(`${MT_API_URL}?action=add_request`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'X-CSRF-TOKEN': csrfToken 
                    },
                    body: JSON.stringify(payload)
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