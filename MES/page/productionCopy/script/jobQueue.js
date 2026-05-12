"use strict";

const JOB_API_URL = 'api/jobManage.php';
const INVENTORY_API_URL = 'api/inventoryManage.php'; 
let autoRefreshTimer = null;
let activeJobs = [];
let allItemsList = [];
let currentJobFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLocations();
    await loadItems();

    document.getElementById('locationSelect').addEventListener('change', (e) => {
        handleLineChange(e.target.value);
    });

    document.getElementById('createJobForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitCreateJob();
    });

    setupVanillaAutocomplete();
});

async function loadLocations() {
    try {
        const response = await fetch(`${JOB_API_URL}?action=get_locations`);
        const result = await response.json();
        const select = document.getElementById('locationSelect');
        const modalSelect = document.getElementById('modal_location');
        
        if (result.success && result.data) {
            select.innerHTML = '<option value="">-- เลือกไลน์ผลิตเพื่อดูคิวงาน --</option>';
            modalSelect.innerHTML = '<option value="">-- เลือกไลน์ผลิต --</option>';
            
            result.data.forEach(loc => {
                const opt = `<option value="${loc.location_id}">${loc.location_name}</option>`;
                select.insertAdjacentHTML('beforeend', opt);
                modalSelect.insertAdjacentHTML('beforeend', opt);
            });
        }
    } catch (e) { console.error("Error loading locations", e); }
}

async function loadItems() {
    try {
        const response = await fetch(`${JOB_API_URL}?action=get_items`);
        const result = await response.json();
        if (result.success && result.data) {
            allItemsList = result.data; 
        }
    } catch (e) { console.error("Error loading items", e); }
}

function setupVanillaAutocomplete() {
    const searchInput = document.getElementById('modal_item_search');
    const hiddenInput = document.getElementById('modal_item');
    const resultsList = document.getElementById('item_autocomplete_list');

    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        resultsList.innerHTML = '';
        hiddenInput.value = ''; 

        if (!val) {
            resultsList.classList.add('d-none');
            return;
        }

        const filtered = allItemsList.filter(item => 
            (item.part_no && item.part_no.toLowerCase().includes(val)) ||
            (item.sap_no && item.sap_no.toLowerCase().includes(val)) ||
            (item.part_description && item.part_description.toLowerCase().includes(val))
        ).slice(0, 30); 

        if (filtered.length > 0) {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.part_no} : ${item.part_description || '-'}`;
                li.addEventListener('click', () => {
                    searchInput.value = item.part_no;
                    hiddenInput.value = item.item_id;
                    resultsList.classList.add('d-none');
                });
                resultsList.appendChild(li);
            });
            resultsList.classList.remove('d-none');
        } else {
            const li = document.createElement('li');
            li.textContent = 'ไม่พบข้อมูลสินค้า';
            li.classList.add('text-muted', 'pe-none');
            resultsList.appendChild(li);
            resultsList.classList.remove('d-none');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== resultsList) {
            resultsList.classList.add('d-none');
        }
    });
}

function handleLineChange(locId) {
    if (locId) {
        fetchJobs();
        if(autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(fetchJobs, 10000); 
    } else {
        document.getElementById('jobBoardContainer').innerHTML = `
            <div class="col-12 text-center text-muted py-5" id="emptyState">
                <i class="fas fa-tv fa-4x mb-3 text-secondary opacity-50"></i>
                <h5>กรุณาเลือกไลน์ผลิตเพื่อแสดงคิวงาน</h5>
            </div>`;
        if(autoRefreshTimer) clearInterval(autoRefreshTimer);
    }
}

function setJobFilter(type) {
    currentJobFilter = type;
    renderJobBoard();
}

async function fetchJobs() {
    const locId = document.getElementById('locationSelect').value;
    if (!locId) return;

    try {
        const response = await fetch(`${JOB_API_URL}?action=get_active_jobs&location_id=${locId}`);
        const result = await response.json();
        if (result.success) {
            activeJobs = result.data;
            renderJobBoard();
        }
    } catch (e) { console.error("Error fetching jobs", e); }
}

function renderJobBoard() {
    const container = document.getElementById('jobBoardContainer');
    container.innerHTML = '';

    let displayJobs = activeJobs.filter(job => {
        let isQA = job.job_no.includes('-QA');
        if (currentJobFilter === 'QA' && !isQA) return false; 
        return true;
    });

    if (displayJobs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-clipboard-check fa-4x text-success mb-3 opacity-50"></i>
                <h4 class="text-secondary fw-bold">คิวงานว่าง (ไม่มีออเดอร์ค้าง)</h4>
            </div>`;
        return;
    }

    displayJobs.forEach((job) => {
        let isQA = job.job_no.includes('-QA'); 

        // 🟢 1. คืนค่าสี Status แบบมาตรฐาน (เขียว/เทา/แดง) ให้ทำงานได้ปกติ
        let statusClass = 'status-pending';
        let statusIcon = 'fa-clock';
        let statusText = 'WAITING';
        let timerDisplay = '--:--';
        let actionButton = `<button class="btn btn-outline-success btn-action" onclick="startJob(${job.job_id})"><i class="fas fa-play-circle me-2"></i>เริ่มการผลิต (START)</button>`;

        // 🟢 2. ปรับ Logic การนับยอด Progress (ถ้าเป็น QA ให้นับ FG + Scrap)
        let actualQty = parseFloat(job.actual_qty || 0);
        let scrapQty = parseFloat(job.scrap_qty || 0);
        let targetQty = parseFloat(job.target_qty);
        
        let processedQty = isQA ? (actualQty + scrapQty) : actualQty; // QA นับรวมของเสียด้วย
        
        let progressPercent = targetQty > 0 ? (processedQty / targetQty) * 100 : 0;
        let progressColor = progressPercent >= 100 ? 'bg-success' : 'bg-primary';

        let queueBtns = '';
        if (job.status === 'PENDING') {
            queueBtns = `
                <div class="queue-controls ms-2 d-flex flex-column gap-1">
                    <button class="btn btn-sm btn-secondary py-0 px-2" style="font-size:0.6rem;" onclick="moveQueue(${job.job_id}, 'up')"><i class="fas fa-chevron-up"></i></button>
                    <button class="btn btn-sm btn-secondary py-0 px-2" style="font-size:0.6rem;" onclick="moveQueue(${job.job_id}, 'down')"><i class="fas fa-chevron-down"></i></button>
                </div>`;
        }

        let editHistoryBtn = '';
        const mins = parseInt(job.minutes_running) || 0;
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        timerDisplay = `${hrs.toString().padStart(2, '0')}:${remainMins.toString().padStart(2, '0')} <span style="font-size:1rem">Hrs</span>`;

        if (job.status === 'RUNNING') {
            statusIcon = 'fa-cogs fa-spin';
            statusText = 'RUNNING';
            if (mins > 60) statusClass = 'status-danger';
            else if (mins > 45) statusClass = 'status-warning';
            else statusClass = 'status-running';
            
            actionButton = `
                <div class="d-flex gap-2">
                    <button class="btn btn-success btn-action flex-grow-1 shadow-sm" onclick="openRecordModal(${job.job_id}, '${job.job_no}')"><i class="fas fa-edit"></i> ลงยอด</button>
                    <button class="btn btn-warning btn-action shadow-sm text-dark" style="width: 80px;" onclick="pauseJob(${job.job_id})"><i class="fas fa-pause"></i> พัก</button>
                    <button class="btn btn-danger btn-action shadow-sm" style="width: 80px;" onclick="closeJob(${job.job_id}, '${job.job_no}')"><i class="fas fa-stop"></i> ปิด</button>
                </div>
            `;
            editHistoryBtn = `<div class="mt-2 text-end"><button class="btn btn-sm btn-link text-muted p-0 text-decoration-none fw-bold" onclick="viewJobLogs('${job.job_no}', ${job.job_id})"><i class="fas fa-history me-1"></i>ดู/แก้ไขรายการที่ลงแล้ว</button></div>`;
        } 
        else if (job.status === 'PAUSED') {
            statusIcon = 'fa-pause-circle';
            statusText = 'PAUSED';
            statusClass = 'status-warning'; 
            actionButton = `
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-action flex-grow-1 shadow-sm" onclick="startJob(${job.job_id})"><i class="fas fa-play"></i> ทำงานต่อ</button>
                    <button class="btn btn-danger btn-action shadow-sm" style="width: 80px;" onclick="closeJob(${job.job_id}, '${job.job_no}')"><i class="fas fa-stop"></i> ปิด</button>
                </div>
            `;
            editHistoryBtn = `<div class="mt-2 text-end"><button class="btn btn-sm btn-link text-muted p-0 text-decoration-none fw-bold" onclick="viewJobLogs('${job.job_no}', ${job.job_id})"><i class="fas fa-history me-1"></i>ดู/แก้ไขรายการ</button></div>`;
        }

        let cardMenu = '';
        if (typeof canManage !== 'undefined' && canManage) {
            const deleteText = job.status === 'PENDING' ? 'ลบจ๊อบ' : 'ยกเลิกจ๊อบ';
            cardMenu = `
                <div class="dropdown">
                    <button class="btn btn-sm text-white border-0" type="button" data-bs-toggle="dropdown"><i class="fas fa-ellipsis-v"></i></button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                        <li><a class="dropdown-item fw-bold" href="#" onclick="editJob(${job.job_id}, ${job.target_qty})"><i class="fas fa-edit text-primary me-2"></i>แก้ไขยอดเป้าหมาย</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item fw-bold text-danger" href="#" onclick="deleteJob(${job.job_id}, '${job.job_no}', '${job.status}')"><i class="fas fa-trash-alt me-2"></i>${deleteText}</a></li>
                    </ul>
                </div>`;
        }

        // 🟢 3. แก้ไขเรื่อง UI Rework (ใช้แถบ Ribbon คาดใต้ Header แทนที่จะทำ Header เหลือง)
        let qaRibbon = isQA ? `<div class="bg-warning text-dark text-center fw-bold small py-1" style="border-bottom: 1px solid #e0a800;"><i class="fas fa-search me-1"></i> งานตรวจสอบ (QA / REWORK)</div>` : '';
        let cardBorder = isQA ? 'border-warning border-2' : '';

        const cardHtml = `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="job-card ${statusClass} ${cardBorder}">
                    <div class="job-header">
                        <div class="d-flex align-items-center">
                            <span class="fs-5">${job.job_no}</span>
                            <span class="badge bg-white text-dark ms-2"><i class="fas ${statusIcon} me-1"></i> ${statusText}</span>
                            ${queueBtns}
                        </div>
                        ${cardMenu}
                    </div>
                    ${qaRibbon} <div class="job-body">
                        <div class="job-title">${job.part_no}</div>
                        <div class="job-details text-truncate" title="${job.part_name || '-'}">${job.part_name || '-'}</div>
                        
                        <div class="job-target-box">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="small fw-bold text-muted">Processed / Target</span>
                                <span class="small fw-bold text-dark">${processedQty.toLocaleString()} / ${targetQty.toLocaleString()}</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${progressPercent}%;"></div>
                            </div>
                            ${editHistoryBtn}
                        </div>

                        <div class="timer-display text-muted ${job.status === 'RUNNING' ? 'text-dark' : ''}">
                            <i class="fas fa-stopwatch me-1"></i> ${timerDisplay}
                        </div>
                    </div>
                    <div class="job-footer">
                        ${actionButton}
                    </div>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// ==========================================
// JOB MANAGEMENT FUNCTIONS
// ==========================================

function openCreateJobModal() {
    document.getElementById('createJobForm').reset();
    const searchInput = document.getElementById('modal_item_search');
    const hiddenInput = document.getElementById('modal_item');
    if(searchInput) searchInput.value = '';
    if(hiddenInput) hiddenInput.value = '';
    
    const currentLoc = document.getElementById('locationSelect').value;
    if(currentLoc) document.getElementById('modal_location').value = currentLoc;
    
    new bootstrap.Modal(document.getElementById('createJobModal')).show();
}

async function submitCreateJob() {
    const payload = {
        location_id: document.getElementById('modal_location').value,
        item_id: document.getElementById('modal_item').value,
        target_qty: document.getElementById('modal_target_qty').value
    };

    if (!payload.item_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสินค้าจากรายการ', 'warning');

    if(typeof showSpinner === 'function') showSpinner();
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const response = await fetch(`${JOB_API_URL}?action=create_job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('createJobModal')).hide();
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            
            if(payload.location_id === document.getElementById('locationSelect').value) {
                fetchJobs();
            } else {
                document.getElementById('locationSelect').value = payload.location_id;
                handleLineChange(payload.location_id);
            }
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'การเชื่อมต่อขัดข้อง', 'error');
    } finally {
        if(typeof hideSpinner === 'function') hideSpinner();
    }
}

function startJob(jobId) {
    if(typeof canAdd !== 'undefined' && !canAdd) return Swal.fire('เตือน', 'คุณไม่มีสิทธิ์เริ่มงาน', 'warning');

    Swal.fire({
        title: 'เริ่มงานผลิต?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ตกลง'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`${JOB_API_URL}?action=start_job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ job_id: jobId })
            });
            const res = await response.json();
            if (res.success) {
                fetchJobs();
                if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            }
        }
    });
}

async function pauseJob(jobId) {
    if(typeof canAdd !== 'undefined' && !canAdd) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const res = await fetch(`${JOB_API_URL}?action=pause_job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ job_id: jobId })
    }).then(r => r.json());
    
    if (res.success) { fetchJobs(); }
}

function openRecordModal(jobId, jobNo) {
    if(typeof canAdd !== 'undefined' && !canAdd) return Swal.fire('เตือน', 'คุณไม่มีสิทธิ์บันทึกยอด', 'warning');

    document.getElementById('record_job_id').value = jobId;
    document.getElementById('record_job_no').textContent = jobNo;
    
    document.getElementById('input_actual_qty').value = '';
    document.getElementById('input_hold_qty').value = '';
    document.getElementById('input_scrap_qty').value = '';

    // ถ้าเป็นจ๊อบ QA ให้ซ่อนช่องกรอก "ยอดรอตรวจสอบเพิ่ม (Hold)" ป้องกันการ Hold ซ้อน Hold
    const holdInputContainer = document.getElementById('input_hold_qty').parentElement;
    if (jobNo.includes('-QA')) {
        holdInputContainer.style.display = 'none';
    } else {
        holdInputContainer.style.display = 'block';
    }
    
    new bootstrap.Modal(document.getElementById('recordOutputModal')).show();
}

async function submitRecordOutput() {
    const payload = {
        job_id: document.getElementById('record_job_id').value,
        actual_qty: document.getElementById('input_actual_qty').value || 0,
        hold_qty: document.getElementById('input_hold_qty').value || 0,
        scrap_qty: document.getElementById('input_scrap_qty').value || 0
    };

    if (payload.actual_qty <= 0 && payload.hold_qty <= 0 && payload.scrap_qty <= 0) {
        return Swal.fire('เตือน', 'กรุณาระบุยอดอย่างน้อย 1 ประเภทที่มากกว่า 0', 'warning');
    }

    if(typeof showSpinner === 'function') showSpinner();
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const response = await fetch(`${JOB_API_URL}?action=record_output`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('recordOutputModal')).hide();
            fetchJobs();
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            
            if (payload.hold_qty > 0) {
                Swal.fire('คิวตรวจสอบอัตโนมัติ', `ระบบได้สร้าง Job ตรวจสอบ (QA) จำนวน ${payload.hold_qty} ชิ้น อัตโนมัติ`, 'info');
            }
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'การเชื่อมต่อขัดข้อง', 'error'); } 
    finally { if(typeof hideSpinner === 'function') hideSpinner(); }
}

function closeJob(jobId, jobNo) {
    if(typeof canAdd !== 'undefined' && !canAdd) return Swal.fire('เตือน', 'คุณไม่มีสิทธิ์ปิดจ๊อบ', 'warning');

    Swal.fire({
        title: `ปิดจ๊อบ ${jobNo}?`,
        text: "เมื่อปิดแล้วจะไม่สามารถบันทึกยอดเพิ่มได้อีก",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ใช่, ปิดจ๊อบ'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(`${JOB_API_URL}?action=close_job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ job_id: jobId })
            }).then(r => r.json());
            
            if (res.success) {
                fetchJobs();
                if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        }
    });
}

async function editJob(jobId, currentQty) {
    const { value: newQty } = await Swal.fire({
        title: 'แก้ไขเป้าหมายการผลิต',
        input: 'number',
        inputValue: currentQty,
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        inputValidator: (value) => {
            if (!value || value <= 0) return 'ระบุจำนวนที่มากกว่า 0';
        }
    });

    if (newQty) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const res = await fetch(`${JOB_API_URL}?action=edit_job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ job_id: jobId, target_qty: newQty })
        }).then(r => r.json());
        
        if (res.success) {
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            fetchJobs();
        } else Swal.fire('Error', res.message, 'error');
    }
}

async function deleteJob(jobId, jobNo, status) {
    const actionText = status === 'PENDING' ? 'ลบ' : 'ยกเลิก';
    const result = await Swal.fire({
        title: `ยืนยันการ${actionText} ${jobNo}?`,
        text: status === 'PENDING' ? "จะถูกลบออกจากระบบอย่างถาวร" : "จ๊อบนี้เริ่มไปแล้ว ระบบจะเปลี่ยนสถานะเป็น CANCELLED",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: `ใช่, ${actionText}เลย`
    });

    if (result.isConfirmed) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const res = await fetch(`${JOB_API_URL}?action=delete_job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ job_id: jobId })
        }).then(r => r.json());
        
        if (res.success) {
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            fetchJobs(); 
        } else Swal.fire('Error', res.message, 'error');
    }
}

async function openJobHistory() {
    const locId = document.getElementById('locationSelect').value;
    if (!locId) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไลน์ผลิตก่อนดูประวัติ', 'warning');
        return;
    }

    if(typeof showSpinner === 'function') showSpinner();
    try {
        const response = await fetch(`${JOB_API_URL}?action=get_all_jobs`);
        const result = await response.json();
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            const historyJobs = result.data.filter(j => 
                j.location_id == locId && 
                (j.status === 'COMPLETED' || j.status === 'CANCELLED')
            );

            if (historyJobs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ยังไม่มีประวัติการผลิตในไลน์นี้</td></tr>';
            } else {
                historyJobs.forEach(job => {
                    let badgeClass = job.status === 'COMPLETED' ? 'bg-primary' : 'bg-danger';
                    let startTime = job.start_time ? new Date(job.start_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '-';
                    let endTime = job.end_time ? new Date(job.end_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '-';

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr>
                            <td class="fw-bold text-dark text-center">${job.job_no}</td>
                            <td>${job.part_no}</td>
                            <td class="text-end fw-bold text-muted">${parseFloat(job.target_qty).toLocaleString()}</td>
                            <td class="text-end fw-bold text-success">${parseFloat(job.actual_qty || 0).toLocaleString()}</td>
                            <td class="text-end fw-bold text-warning">${parseFloat(job.hold_qty || 0).toLocaleString()}</td>
                            <td class="text-end fw-bold text-danger">${parseFloat(job.scrap_qty || 0).toLocaleString()}</td>
                            <td class="text-center"><span class="badge ${badgeClass}">${job.status}</span></td>
                            <td class="text-center text-muted small">${startTime} - ${endTime}</td>
                        </tr>
                    `);
                });
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ไม่พบข้อมูลประวัติ</td></tr>';
        }

        new bootstrap.Offcanvas(document.getElementById('historyOffcanvas')).show();
        
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'ไม่สามารถดึงข้อมูลประวัติได้', 'error');
    } finally {
        if(typeof hideSpinner === 'function') hideSpinner();
    }
}

// ==========================================
// QUEUE & CORRECTION FUNCTIONS
// ==========================================

async function moveQueue(jobId, direction) {
    const res = await fetch(`${JOB_API_URL}?action=move_queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify({ job_id: jobId, direction: direction })
    }).then(r => r.json());
    if (res.success) fetchJobs();
}

async function viewJobLogs(jobNo, jobId) {
    const res = await fetch(`${JOB_API_URL}?action=get_job_logs&job_no=${jobNo}`).then(r => r.json());
    const tbody = document.getElementById('jobLogsTableBody');
    tbody.innerHTML = '';
    
    if (res.success && res.data && res.data.length > 0) {
        res.data.forEach(log => {
            const timeStr = log.txn_time.substring(0, 5); 
            let badgeColor = 'secondary';
            if(log.txn_type === 'FG') badgeColor = 'success';
            if(log.txn_type === 'HOLD') badgeColor = 'warning text-dark';
            if(log.txn_type === 'SCRAP') badgeColor = 'danger';

            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="p-2 align-middle text-muted">${timeStr}</td>
                    <td class="p-2 align-middle"><span class="badge bg-${badgeColor}">${log.txn_type}</span></td>
                    <td class="p-2 align-middle text-end fw-bold">${parseFloat(log.qty).toLocaleString()}</td>
                    <td class="p-2 align-middle text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="editTxn(${log.txn_id}, '${log.txn_type}', ${log.qty}, ${jobId})" title="แก้ไขยอดนี้">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteTxn(${log.txn_id})" title="ลบรายการนี้">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">ยังไม่มีรายการบันทึก</td></tr>';
    }
    new bootstrap.Modal(document.getElementById('jobLogsModal')).show();
}

async function editTxn(txnId, txnType, currentQty, jobId) {
    const { value: newQty } = await Swal.fire({
        title: 'แก้ไขยอดที่บันทึก',
        text: `ยอดเดิมที่ลงไว้คือ ${currentQty}`,
        input: 'number',
        inputValue: currentQty,
        showCancelButton: true,
        confirmButtonText: 'บันทึกยอดใหม่',
        inputValidator: (value) => {
            if (!value || value <= 0) return 'ต้องระบุตัวเลขที่มากกว่า 0';
        }
    });

    if (newQty && newQty != currentQty) {
        if(typeof showSpinner === 'function') showSpinner();
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        const resDel = await fetch(`${JOB_API_URL}?action=delete_txn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ txn_id: txnId })
        }).then(r => r.json());
        
        if(resDel.success) {
            let payload = { job_id: jobId, actual_qty: 0, hold_qty: 0, scrap_qty: 0 };
            if(txnType === 'FG') payload.actual_qty = newQty;
            if(txnType === 'HOLD') payload.hold_qty = newQty;
            if(txnType === 'SCRAP') payload.scrap_qty = newQty;

            const resRec = await fetch(`${JOB_API_URL}?action=record_output`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify(payload)
            }).then(r => r.json());
            
            if(resRec.success) {
                Swal.fire('สำเร็จ', 'แก้ไขและปรับสต็อกเรียบร้อยแล้ว', 'success');
                bootstrap.Modal.getInstance(document.getElementById('jobLogsModal')).hide();
                fetchJobs();
            }
        } else {
            Swal.fire('Error', resDel.message, 'error');
        }
        if(typeof hideSpinner === 'function') hideSpinner();
    }
}

async function deleteTxn(txnId) {
    if(!confirm('ยืนยันลบรายการนี้? ยอดจะถูกหักออกจากจ๊อบและสต็อกอัตโนมัติ')) return;
    const res = await fetch(`${JOB_API_URL}?action=delete_txn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify({ txn_id: txnId })
    }).then(r => r.json());
    
    if(res.success) {
        Swal.fire({
            title: 'สำเร็จ', 
            text: res.message, 
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        bootstrap.Modal.getInstance(document.getElementById('jobLogsModal')).hide();
        fetchJobs();
    } else {
        Swal.fire('Error', res.message, 'error');
    }
}