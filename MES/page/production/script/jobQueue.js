"use strict";

const JOB_API_URL = 'api/jobManage.php';
let autoRefreshTimer = null;
let activeJobs = [];
let allItemsList = [];
let currentJobFilter = 'ALL';
let draggedItem = null; // สำหรับ Drag & Drop

document.addEventListener('DOMContentLoaded', async () => {
    await loadLocations();
    await loadItems();

    handleLineChange(document.getElementById('locationSelect').value);

    document.getElementById('locationSelect').addEventListener('change', (e) => {
        handleLineChange(e.target.value);
    });

    const createForm = document.getElementById('createJobForm');
    if(createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitCreateJob();
        });
    }

    setupVanillaAutocomplete();
});

async function loadLocations() {
    try {
        const response = await fetch(`${JOB_API_URL}?action=get_locations`);
        const result = await response.json();
        const select = document.getElementById('locationSelect');
        const modalSelect = document.getElementById('modal_location');
        
        if (result.success && result.data) {
            select.innerHTML = '<option value="">-- แสดงคิวงานทุกไลน์การผลิต --</option>';
            if(modalSelect) modalSelect.innerHTML = '<option value="">-- เลือกสถานที่ --</option>';
            
            result.data.forEach(loc => {
                const opt = `<option value="${loc.location_id}">${loc.location_name}</option>`;
                select.insertAdjacentHTML('beforeend', opt);
                if(modalSelect) modalSelect.insertAdjacentHTML('beforeend', opt);
            });

            if (result.data.length === 1) {
                select.value = result.data[0].location_id;
                if(modalSelect) modalSelect.value = result.data[0].location_id;
            }
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
    fetchJobs();
    if(autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => fetchJobs(true), 10000); 
}

async function fetchJobs(isSilent = false) {
    const locId = document.getElementById('locationSelect').value;
    const container = document.getElementById('jobBoardContainer');

    if(!isSilent && container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <h5 class="text-secondary fw-bold">กำลังโหลดข้อมูลคิวงาน...</h5>
            </div>`;
    }

    try {
        const response = await fetch(`${JOB_API_URL}?action=get_active_jobs&location_id=${locId}`);
        const result = await response.json();
        if (result.success) {
            activeJobs = result.data;
            
            // 🟢 อัปเดตเวลาทั้ง 2 จุด (Desktop & Mobile)
            const timeStr = new Date().toLocaleTimeString('th-TH');
            document.querySelectorAll('.sync-time-display').forEach(el => el.innerText = timeStr);
            
            renderJobBoard();
        }
    } catch (e) { 
        console.error("Error fetching jobs", e); 
        if(!isSilent && container) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
        }
    }
}

function renderJobBoard() {
    const container = document.getElementById('jobBoardContainer');
    if(!container) return; 

    container.innerHTML = '';

    const searchInputEl = document.getElementById('searchInput');
    const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase().trim() : '';

    let displayJobs = activeJobs.filter(job => {
        let isQA = job.job_no.includes('-QA');
        if (currentJobFilter === 'QA' && !isQA) return false; 
        
        if (searchTerm !== '') {
            const strToSearch = `${job.job_no} ${job.part_no} ${job.part_name || ''}`.toLowerCase();
            if (!strToSearch.includes(searchTerm)) return false;
        }

        return true;
    });

    if (displayJobs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 mt-4">
                <i class="fas fa-search fa-3x text-secondary mb-3 opacity-25"></i>
                <h5 class="text-secondary fw-bold">ไม่พบข้อมูลที่ค้นหา</h5>
            </div>`;
        return;
    }

    const groupedJobs = {};
    displayJobs.forEach(job => {
        const locName = job.location_name || 'ไม่ระบุสถานที่';
        if (!groupedJobs[locName]) groupedJobs[locName] = [];
        groupedJobs[locName].push(job);
    });

    const isAllLocations = document.getElementById('locationSelect').value === "";

    for (const [locationName, jobsInLocation] of Object.entries(groupedJobs)) {
        
        if (isAllLocations) {
            container.insertAdjacentHTML('beforeend', `
                <div class="col-12 mt-4 mb-2">
                    <div class="d-flex align-items-center border-bottom border-2 border-dark pb-2">
                        <i class="fas fa-industry text-dark fs-5 me-2"></i>
                        <h5 class="fw-bold text-dark mb-0">${locationName}</h5>
                        <span class="badge bg-secondary ms-3 rounded-pill">${jobsInLocation.length} คิวงาน</span>
                    </div>
                </div>
            `);
        }

        const locationGroupId = `loc-group-${jobsInLocation[0].location_id}`;
        container.insertAdjacentHTML('beforeend', `<div class="row g-3 sortable-list" id="${locationGroupId}" data-location-id="${jobsInLocation[0].location_id}"></div>`);
        const groupContainer = document.getElementById(locationGroupId);

        jobsInLocation.forEach((job, index) => {
            let isQA = job.job_no.includes('-QA'); 

            let actualQty = parseFloat(job.actual_qty || 0);
            let scrapQty = parseFloat(job.scrap_qty || 0);
            let targetQty = parseFloat(job.target_qty);
            let processedQty = isQA ? (actualQty + scrapQty) : actualQty; 
            let progressPercent = targetQty > 0 ? Math.min(100, Math.round((processedQty / targetQty) * 100)) : 0;
            let progressColor = progressPercent >= 100 ? 'bg-primary' : 'bg-success';

            const mins = parseInt(job.minutes_running) || 0;
            const hrs = Math.floor(mins / 60);
            const remainMins = mins % 60;
            let timerDisplay = `${hrs.toString().padStart(2, '0')}:${remainMins.toString().padStart(2, '0')} h`;

            let borderLeftColor = 'secondary'; 
            let statusClass = 'bg-secondary text-white';
            let statusIcon = 'fa-clock';
            let statusText = 'WAITING';
            let actionButtons = '';
            let cardHighlight = '';
            let isDraggable = 'true'; 
            let dragHandle = `<i class="fas fa-grip-vertical text-muted cursor-grab me-2" style="opacity: 0.5;" title="ลากเพื่อสลับคิว"></i>`;

            if (job.status === 'PENDING') {
                borderLeftColor = 'secondary';
                actionButtons = `<button class="btn btn-outline-success fw-bold w-100 shadow-sm" onclick="startJob(${job.job_id})"><i class="fas fa-play me-2"></i> เริ่มงานผลิต</button>`;
            } 
            else if (job.status === 'RUNNING') {
                borderLeftColor = mins > 60 ? 'danger' : (mins > 45 ? 'warning' : 'success');
                statusClass = borderLeftColor === 'warning' ? 'bg-warning text-dark' : `bg-${borderLeftColor} text-white`;
                statusIcon = 'fa-cogs fa-spin';
                statusText = 'RUNNING';
                cardHighlight = 'row-running';

                actionButtons = `
                    <div class="d-flex gap-1 w-100">
                        <button class="btn btn-success flex-grow-1 fw-bold shadow-sm" onclick="openRecordModal(${job.job_id}, '${job.job_no}')"><i class="fas fa-edit me-1"></i> ลงยอด</button>
                        <button class="btn btn-outline-warning text-dark px-3 shadow-sm" onclick="pauseJob(${job.job_id})" title="พัก"><i class="fas fa-pause"></i></button>
                        <button class="btn btn-outline-danger px-3 shadow-sm" onclick="closeJob(${job.job_id}, '${job.job_no}')" title="ปิดงาน"><i class="fas fa-stop"></i></button>
                    </div>
                `;
            } 
            else if (job.status === 'PAUSED') {
                borderLeftColor = 'warning';
                statusClass = 'bg-warning text-dark';
                statusIcon = 'fa-pause-circle';
                statusText = 'PAUSED';

                actionButtons = `
                    <div class="d-flex gap-1 w-100">
                        <button class="btn btn-primary flex-grow-1 fw-bold shadow-sm" onclick="startJob(${job.job_id})"><i class="fas fa-play me-1"></i> ทำงานต่อ</button>
                        <button class="btn btn-outline-danger px-3 shadow-sm" onclick="closeJob(${job.job_id}, '${job.job_no}')" title="ปิดงาน"><i class="fas fa-stop"></i></button>
                    </div>
                `;
            }

            let manageMenu = '';
            if (typeof canManage !== 'undefined' && canManage) {
                manageMenu = `
                    <div class="dropdown">
                        <button class="btn btn-sm text-muted border-0 p-1" data-bs-toggle="dropdown"><i class="fas fa-ellipsis-v px-2"></i></button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                            <li><h6 class="dropdown-header">จัดการคิวงาน</h6></li>
                            <li><a class="dropdown-item fw-bold text-dark" href="#" onclick="editJob(${job.job_id}, ${job.target_qty})"><i class="fas fa-pen text-primary me-2"></i>แก้ไขเป้าหมาย</a></li>
                            ${(job.status === 'RUNNING' || job.status === 'PAUSED') ? `<li><a class="dropdown-item fw-bold text-dark" href="#" onclick="viewJobLogs('${job.job_no}', ${job.job_id}, '${job.part_no || ''}', '${(job.part_name || '').replace(/'/g, "\\'")}')"><i class="fas fa-history text-info me-2"></i>ประวัติการลงยอด</a></li>` : ''}
                            ${(job.status === 'COMPLETED' || job.status === 'CANCELLED') ? `<li><a class="dropdown-item fw-bold text-success" href="#" onclick="reopenJob(${job.job_id}, '${job.job_no}')"><i class="fas fa-redo text-success me-2"></i>เปิดงานอีกครั้ง</a></li>` : ''}
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item fw-bold text-danger" href="#" onclick="deleteJob(${job.job_id}, '${job.job_no}', '${job.status}')"><i class="fas fa-trash-alt me-2"></i>${job.status === 'PENDING' ? 'ลบจ๊อบทิ้ง' : 'บังคับยกเลิกจ๊อบ'}</a></li>
                        </ul>
                    </div>
                `;
            }

            let qaIcon = isQA ? `<i class="fas fa-search text-warning ms-1" title="งาน Rework / QA"></i>` : '';

            const cardHtml = `
                <div class="col-12 col-sm-6 col-md-6 col-lg-4 col-xl-3 col-xxl-2 drag-item" draggable="${isDraggable}" data-job-id="${job.job_id}">
                    <div class="card job-card shadow-sm h-100 border-0 ${cardHighlight}" style="border-left: 5px solid var(--bs-${borderLeftColor}) !important;">
                        <div class="card-body p-3 d-flex flex-column">
                            
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="d-flex align-items-start">
                                    <div class="mt-1 me-2">${dragHandle}</div>
                                    <div class="d-flex flex-column justify-content-center mt-1">
                                        <span class="fw-bold text-dark lh-1" style="font-size: 1.1rem;">${job.job_no}</span>
                                    </div>
                                </div>
                                ${manageMenu}
                            </div>

                            <div class="mb-2 pe-1">
                                <h5 class="fw-bold text-primary mb-1 text-truncate" style="font-size: 1.1rem;" title="${job.part_no}">
                                    ${job.part_no} 
                                    ${job.lot_no ? `<span class="text-secondary fw-normal ms-2" style="font-size: 0.85rem;">| Lot. <span class="text-dark fw-bold">${job.lot_no}</span></span>` : ''}
                                    ${qaIcon}
                                </h5>
                                <div class="text-secondary text-truncate" style="font-size: 0.85rem;" title="${job.part_name || '-'}">
                                    ${job.part_name || '-'}
                                </div>
                            </div>
                            
                            <div class="mt-auto"></div>

                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="badge ${statusClass} shadow-sm px-2 py-1" style="font-size: 0.7rem;">
                                        <i class="fas ${statusIcon} me-1"></i> ${statusText}
                                    </span>
                                    <span class="fw-bold ${job.status === 'RUNNING' ? 'text-dark' : 'text-muted'} small mb-0 text-nowrap bg-light px-2 py-1 rounded border border-light-subtle">
                                        <i class="fas fa-stopwatch text-secondary me-1"></i> ${timerDisplay}
                                    </span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="text-muted fw-bold" style="font-size: 0.8rem;">Progress</span>
                                    <div class="text-nowrap text-end">
                                        <span class="fw-bolder text-dark" style="font-size: 1.2rem;">${processedQty.toLocaleString()}</span>
                                        <span class="text-muted fw-bold" style="font-size: 0.85rem;">/ ${targetQty.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div class="progress" style="height: 6px; background-color: #f0f0f0;">
                                    <div class="progress-bar ${progressColor} ${job.status === 'RUNNING' ? 'progress-bar-striped progress-bar-animated' : ''}" style="width: ${progressPercent}%;"></div>
                                </div>
                            </div>

                            <div class="d-flex w-100 mt-1">
                                ${actionButtons}
                            </div>
                            
                        </div>
                    </div>
                </div>
            `;

            groupContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    if (typeof setupDragAndDrop === 'function') {
        setupDragAndDrop();
    }
}

// ==========================================
// DRAG & DROP LOGIC (Vanilla JS)
// ==========================================
function setupDragAndDrop() {
    const dragItems = document.querySelectorAll('.drag-item[draggable="true"]');
    
    dragItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    if(autoRefreshTimer) clearInterval(autoRefreshTimer); // หยุด Refresh ตอนกำลังลาก
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedItem && this.getAttribute('draggable') === 'true') {
        this.classList.add('drag-over-highlight');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over-highlight');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over-highlight');
    
    if (draggedItem !== this && this.getAttribute('draggable') === 'true') {
        // หาว่าลากข้ามกลุ่ม (Location) หรือไม่? ถ้าข้ามกลุ่มไม่ให้สลับ
        if(draggedItem.parentNode.id !== this.parentNode.id) return false;

        let parent = this.parentNode;
        let siblings = Array.from(parent.children);
        let draggedIndex = siblings.indexOf(draggedItem);
        let targetIndex = siblings.indexOf(this);
        
        if (draggedIndex < targetIndex) {
            parent.insertBefore(draggedItem, this.nextSibling);
        } else {
            parent.insertBefore(draggedItem, this);
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-item').forEach(item => item.classList.remove('drag-over-highlight'));
    
    // ดึงลำดับ job_id ใหม่ในกลุ่ม (Location) เดียวกัน ส่งไปให้ API
    let parent = this.parentNode;
    let locationId = parent.getAttribute('data-location-id');
    let newOrderIds = Array.from(parent.children)
                           .filter(child => child.classList.contains('drag-item'))
                           .map(child => child.getAttribute('data-job-id'));
    
    saveNewQueueOrder(locationId, newOrderIds);
}

async function saveNewQueueOrder(locationId, jobIdsArray) {
    if (!jobIdsArray || jobIdsArray.length === 0) {
        autoRefreshTimer = setInterval(() => fetchJobs(true), 10000); 
        return;
    }
    
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        const res = await fetch(`${JOB_API_URL}?action=reorder_queue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ location_id: locationId, job_ids: jobIdsArray })
        }).then(r => r.json());
        
        if (res.success) {
            fetchJobs(true); // รีเฟรชแบบเงียบ เพื่อให้เลข Q- อัปเดต
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Error', 'ไม่สามารถจัดเรียงคิวได้', 'error');
    } finally {
        autoRefreshTimer = setInterval(() => fetchJobs(true), 10000); 
    }
}

// ==========================================
// JOB MANAGEMENT FUNCTIONS
// ==========================================

function openCreateJobModal() {
    const form = document.getElementById('createJobForm');
    if(form) form.reset();
    const searchInput = document.getElementById('modal_item_search');
    const hiddenInput = document.getElementById('modal_item');
    const lotInput = document.getElementById('modal_lot_no');
    if(searchInput) searchInput.value = '';
    if(hiddenInput) hiddenInput.value = '';
    if(lotInput) lotInput.value = '';
    
    const currentLoc = document.getElementById('locationSelect').value;
    if(currentLoc) document.getElementById('modal_location').value = currentLoc;
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('createJobModal')).show();
}

async function submitCreateJob() {
    const payload = {
        location_id: document.getElementById('modal_location').value,
        item_id: document.getElementById('modal_item').value,
        lot_no: document.getElementById('modal_lot_no') ? document.getElementById('modal_lot_no').value.trim() : '',
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
            
            if(payload.location_id === document.getElementById('locationSelect').value || document.getElementById('locationSelect').value === "") {
                fetchJobs(true);
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
        confirmButtonColor: '#0d6efd',
        confirmButtonText: 'ตกลง'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            async function triggerStart(ignoreWarning = false) {
                const response = await fetch(`${JOB_API_URL}?action=start_job`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify({ job_id: jobId, ignore_sap_warning: ignoreWarning ? 1 : 0 })
                });
                const res = await response.json();
                
                if (res.is_warning) {
                    Swal.fire({
                        title: 'SAP Material Shortage',
                        text: res.message,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Start Anyway',
                        cancelButtonText: 'Cancel'
                    }).then((warnResult) => {
                        if (warnResult.isConfirmed) {
                            triggerStart(true);
                        }
                    });
                } else if (res.success) {
                    fetchJobs(true);
                    if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
                } else {
                    Swal.fire('Error', res.message || 'Failed to start job', 'error');
                }
            }

            triggerStart(false);
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
    
    if (res.success) { fetchJobs(true); }
}

function openRecordModal(jobId, jobNo) {
    if(typeof canAdd !== 'undefined' && !canAdd) return Swal.fire('เตือน', 'คุณไม่มีสิทธิ์บันทึกยอด', 'warning');

    document.getElementById('record_job_id').value = jobId;
    document.getElementById('record_job_no').textContent = jobNo;
    
    document.getElementById('input_actual_qty').value = '';
    document.getElementById('input_hold_qty').value = '';
    document.getElementById('input_scrap_qty').value = '';
    if (document.getElementById('input_scrap_reason')) document.getElementById('input_scrap_reason').value = '';

    const holdInputContainer = document.getElementById('hold_container');
    if (jobNo.includes('-QA')) {
        holdInputContainer.style.display = 'none';
    } else {
        holdInputContainer.style.display = 'block';
    }
    
    // Initialize date and time slot
    const now = new Date();
    document.getElementById('record_log_date').value = now.toISOString().split('T')[0];
    const currentHour = now.getHours().toString().padStart(2, '0');
    const recordTimeSlot = document.getElementById('record_time_slot');
    if (recordTimeSlot) {
        Array.from(recordTimeSlot.options).forEach(opt => {
            if (opt.value.startsWith(currentHour + ':')) {
                recordTimeSlot.value = opt.value;
            }
        });
    }

    // Restore or Reset team
    const overrideTeamSelect = document.getElementById('record_override_team');
    let lastData = null;
    try { lastData = JSON.parse(localStorage.getItem('jobQueueUILastEntry')); } catch(e){}
    
    if (overrideTeamSelect && !overrideTeamSelect.disabled) {
        if (lastData && lastData.override_team) {
            overrideTeamSelect.value = lastData.override_team;
        } else {
            overrideTeamSelect.value = '';
        }
    }
    loadRecordTeamUsers(true);
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('recordOutputModal')).show();
}

async function submitRecordOutput() {
    const payload = {
        job_id: document.getElementById('record_job_id').value,
        actual_qty: document.getElementById('input_actual_qty').value || 0,
        hold_qty: document.getElementById('input_hold_qty').value || 0,
        scrap_qty: document.getElementById('input_scrap_qty').value || 0,
        scrap_reason: document.getElementById('input_scrap_reason') ? document.getElementById('input_scrap_reason').value : '',
        log_date: document.getElementById('record_log_date') ? document.getElementById('record_log_date').value : '',
        time_slot: document.getElementById('record_time_slot') ? document.getElementById('record_time_slot').value : '',
        override_team: document.getElementById('record_override_team') ? document.getElementById('record_override_team').value : '',
        team_user_ids: document.getElementById('record_team_user_ids') ? document.getElementById('record_team_user_ids').value : ''
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
            localStorage.setItem('jobQueueUILastEntry', JSON.stringify({
                override_team: payload.override_team,
                team_user_ids: payload.team_user_ids ? payload.team_user_ids.split(',').map(Number) : []
            }));
            bootstrap.Modal.getInstance(document.getElementById('recordOutputModal')).hide();
            fetchJobs(true);
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            
            if (payload.hold_qty > 0) {
                Swal.fire('คิวตรวจสอบอัตโนมัติ', `ระบบสร้าง Job ตรวจสอบ (QA) จำนวน ${payload.hold_qty} ชิ้น อัตโนมัติ`, 'info');
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
                fetchJobs(true);
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
            fetchJobs(true);
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
            fetchJobs(true); 
        } else Swal.fire('Error', res.message, 'error');
    }
}

async function reopenJob(jobId, jobNo) {
    const confirm = await Swal.fire({
        title: 'ยืนยันการเปิดงานอีกครั้ง?',
        text: `ดึงจ๊อบ ${jobNo} กลับมาทำต่อ สถานะจะเปลี่ยนเป็น "พักงาน"`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'เปิดงานอีกครั้ง'
    });
    
    if (confirm.isConfirmed) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const res = await fetch(`${JOB_API_URL}?action=reopen_job`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ job_id: jobId })
        }).then(r => r.json());
        
        if (res.success) {
            if(typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            fetchJobs(true);
            openJobHistory();
        } else Swal.fire('Error', res.message, 'error');
    }
}

async function openJobHistory() {
    const locId = document.getElementById('locationSelect').value;
    
    if(typeof showSpinner === 'function') showSpinner();
    try {
        const response = await fetch(`${JOB_API_URL}?action=get_all_jobs`);
        const result = await response.json();
        const tbody = document.getElementById('historyTableBody');
        if(tbody) tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            const historyJobs = result.data.filter(j => 
                (locId === '' || j.location_id == locId) && 
                (j.status === 'COMPLETED' || j.status === 'CANCELLED')
            );

            if (historyJobs.length === 0) {
                if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">ยังไม่มีประวัติการผลิต</td></tr>';
            } else {
                historyJobs.forEach(job => {
                    let badgeClass = job.status === 'COMPLETED' ? 'bg-primary' : 'bg-danger';
                    let startTime = job.start_time ? new Date(job.start_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '-';
                    let endTime = job.end_time ? new Date(job.end_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : '-';
                    let locTag = locId === '' ? `<br><span class="badge bg-light text-dark border mt-1">${job.location_name}</span>` : '';
                    let actionBtn = (typeof canManage !== 'undefined' && canManage) ? `<button class="btn btn-sm btn-outline-success border-0" onclick="reopenJob(${job.job_id}, '${job.job_no}')" title="เปิดงานอีกครั้ง"><i class="fas fa-redo"></i></button>` : '-';

                    if(tbody) {
                        let lotTag = job.lot_no ? `<br><span class="text-muted small fw-normal">Lot: ${job.lot_no}</span>` : '';
                        tbody.insertAdjacentHTML('beforeend', `
                            <tr>
                                <td class="fw-bold text-dark text-center">${job.job_no}${locTag}${lotTag}</td>
                                <td>${job.part_no}</td>
                                <td class="text-end fw-bold text-muted">${parseFloat(job.target_qty).toLocaleString()}</td>
                                <td class="text-end fw-bold text-success">${parseFloat(job.actual_qty || 0).toLocaleString()}</td>
                                <td class="text-end fw-bold text-warning">${parseFloat(job.hold_qty || 0).toLocaleString()}</td>
                                <td class="text-end fw-bold text-danger">${parseFloat(job.scrap_qty || 0).toLocaleString()}</td>
                                <td class="text-center"><span class="badge ${badgeClass}">${job.status}</span></td>
                                <td class="text-center text-muted small">${startTime} - ${endTime}</td>
                                <td class="text-center">${actionBtn}</td>
                            </tr>
                        `);
                    }
                });
            }
        } else {
            if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">ไม่พบข้อมูลประวัติ</td></tr>';
        }

        const offcanvasEl = document.getElementById('historyOffcanvas');
        if(offcanvasEl) new bootstrap.Offcanvas(offcanvasEl).show();
        
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'ไม่สามารถดึงข้อมูลประวัติได้', 'error');
    } finally {
        if(typeof hideSpinner === 'function') hideSpinner();
    }
}

async function viewJobLogs(jobNo, jobId, partNo = '', partName = '') {
    document.getElementById('jobLogsJobNo').textContent = jobNo;
    
    const partInfoEl = document.getElementById('jobLogsPartInfo');
    if(partInfoEl) {
        if(partNo || partName) {
            partInfoEl.innerHTML = `<span class="badge bg-primary text-white ms-2 px-2 py-1" style="font-size: 0.8rem;">${partNo}</span> <span class="text-secondary ms-1 fw-bold" style="font-size: 0.85rem;">${partName}</span>`;
        } else {
            partInfoEl.innerHTML = '';
        }
    }

    const res = await fetch(`${JOB_API_URL}?action=get_job_logs&job_no=${jobNo}`).then(r => r.json());
    const tbody = document.getElementById('jobLogsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (res.success && res.data && res.data.length > 0) {
        res.data.forEach(log => {
            const timeStr = log.txn_time; 
            let badgeColor = 'secondary';
            if(log.txn_type === 'FG') badgeColor = 'success';
            if(log.txn_type === 'HOLD') badgeColor = 'warning text-dark';
            if(log.txn_type === 'SCRAP') badgeColor = 'danger';

            let cleanNotes = log.notes ? log.notes.replace(/\[Job:.*?\]/g, '').trim() : '';
            if (cleanNotes === '') cleanNotes = '-';
            
            let notesHtml = cleanNotes !== '-' ? `<span class="text-muted" style="font-size: 0.85rem; white-space: normal; display: block; line-height: 1.4;">${cleanNotes}</span>` : '<span class="text-black-50 small">-</span>';
            
            let teamUsersHtml = '';
            if (log.team_users) {
                try {
                    let tuArr = typeof log.team_users === 'string' ? JSON.parse(log.team_users) : log.team_users;
                    if (Array.isArray(tuArr) && tuArr.length > 0) {
                        let namesHtml = tuArr.map(t => `<div class="p-2 border-bottom text-start"><i class="fas fa-user-circle me-2 text-primary"></i>${t.name}</div>`).join('');
                        let encodedHtml = btoa(encodeURIComponent(`<div class="fs-5 mb-3 fw-bold text-dark border-bottom pb-2">รายชื่อพนักงานในทีม</div><div class="text-start" style="max-height: 250px; overflow-y: auto;">${namesHtml}</div>`));
                        
                        teamUsersHtml = `<span class="badge bg-info text-dark ms-2 shadow-sm" style="cursor:pointer; transition: 0.2s; font-size: 0.7rem;" onmouseover="this.classList.add('bg-primary', 'text-white'); this.classList.remove('bg-info', 'text-dark');" onmouseout="this.classList.add('bg-info', 'text-dark'); this.classList.remove('bg-primary', 'text-white');" onclick="Swal.fire({html: decodeURIComponent(atob('${encodedHtml}')), width: '400px', showCloseButton: true, showConfirmButton: false})" title="คลิกดูรายชื่อพนักงานในทีม"><i class="fas fa-users me-1"></i>Team (${tuArr.length})</span>`;
                    }
                } catch(e){}
            }

            let creatorHtml = log.creator_name ? `<div class="text-dark fw-bold d-flex align-items-center" style="font-size: 0.85rem;"><i class="fas fa-user-circle me-1 text-secondary"></i><span>${log.creator_name}</span>${teamUsersHtml}</div>` : '<span class="text-black-50 small">-</span>';

            tbody.insertAdjacentHTML('beforeend', `
                <tr style="transition: all 0.2s;">
                    <td class="p-3 align-middle text-muted ps-4" style="font-size: 0.9rem; font-family: 'Inter', sans-serif;">${timeStr}</td>
                    <td class="p-3 align-middle"><span class="badge bg-${badgeColor} bg-opacity-10 text-${badgeColor === 'warning text-dark' ? 'warning' : badgeColor} border border-${badgeColor === 'warning text-dark' ? 'warning' : badgeColor} px-3 py-2 rounded-pill" style="font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px;">${log.txn_type}</span></td>
                    <td class="p-3 align-middle text-end fw-bolder text-dark" style="font-size: 1.15rem; font-family: 'Inter', sans-serif;">${parseFloat(log.qty).toLocaleString()}</td>
                    <td class="p-3 align-middle ps-4">${creatorHtml}</td>
                    <td class="p-3 align-middle" style="max-width: 250px;">${notesHtml}</td>
                    <td class="p-3 align-middle text-center pe-4">
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-light border rounded-circle text-primary shadow-sm d-flex align-items-center justify-content-center" style="width:34px;height:34px; transition: all 0.2s;" onmouseover="this.classList.add('bg-primary', 'text-white')" onmouseout="this.classList.remove('bg-primary', 'text-white')" onclick="editTxn(${log.txn_id}, '${log.txn_type}', ${log.qty}, ${jobId})" title="แก้ไขยอดนี้">
                                <i class="fas fa-pencil-alt" style="font-size: 0.8rem;"></i>
                            </button>
                            <button class="btn btn-sm btn-light border rounded-circle text-danger shadow-sm d-flex align-items-center justify-content-center" style="width:34px;height:34px; transition: all 0.2s;" onmouseover="this.classList.add('bg-danger', 'text-white')" onmouseout="this.classList.remove('bg-danger', 'text-white')" onclick="deleteTxn(${log.txn_id}, ${jobId})" title="ลบรายการนี้">
                                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-inbox fs-2 mb-3 text-light"></i><br><span style="font-size: 0.9rem;">ยังไม่มีประวัติการลงยอดสำหรับ Job นี้</span></td></tr>`;
    }
    const modalEl = document.getElementById('jobLogsModal');
    if(modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function editTxn(txnId, txnType, currentQty, jobId) {
    const { value: newQty } = await Swal.fire({
        title: 'แก้ไขยอดที่บันทึก',
        text: `ยอดเดิมที่ลงไว้คือ ${currentQty}`,
        input: 'number',
        inputValue: currentQty,
        target: document.getElementById('jobLogsModal'),
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
            body: JSON.stringify({ txn_id: txnId, job_id: jobId })
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
                const modalEl = document.getElementById('jobLogsModal');
                if(modalEl) bootstrap.Modal.getInstance(modalEl).hide();
                fetchJobs(true);
            }
        } else {
            Swal.fire('Error', resDel.message, 'error');
        }
        if(typeof hideSpinner === 'function') hideSpinner();
    }
}

async function deleteTxn(txnId, jobId) {
    if(!confirm('ยืนยันลบรายการนี้? ยอดจะถูกหักออกจากจ๊อบและคืนสต็อกอัตโนมัติ')) return;
    const res = await fetch(`${JOB_API_URL}?action=delete_txn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify({ txn_id: txnId, job_id: jobId })
    }).then(r => r.json());
    
    if(res.success) {
        Swal.fire({
            title: 'สำเร็จ', 
            text: res.message, 
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        const modalEl = document.getElementById('jobLogsModal');
        if(modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        fetchJobs(true);
    } else {
        Swal.fire('Error', res.message, 'error');
    }
}
// =================================================================================================
// TEAM USER SELECTION FOR RECORD MODAL
// =================================================================================================
async function loadRecordTeamUsers(isInit = false) {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="text-center small text-muted">กำลังโหลด...</div>';
    
    let team = document.getElementById('record_override_team')?.value || '';
    
    try {
        const response = await fetch(`../production/api/inventoryManage.php?action=get_team_users&team=${team}`);
        const result = await response.json();
        
        if (result.success) {
            populateRecordTeamUserDropdown(result.users);
            
            let lastData = null;
            try { lastData = JSON.parse(localStorage.getItem('jobQueueUILastEntry')); } catch(e){}

            // Auto-select logged-in user if no override and users array has length 1
            if (isInit && lastData && lastData.team_user_ids && lastData.team_user_ids.length > 0) {
                setRecordTeamUserSelection(lastData.team_user_ids);
            } else if (!team && typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
                setRecordTeamUserSelection([currentUser.id]);
            } else {
                setRecordTeamUserSelection([]);
            }
        } else {
            listEl.innerHTML = '<div class="text-center small text-danger"></div>';
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center small text-danger">เกิดข้อผิดพลาด</div>';
    }
}

function populateRecordTeamUserDropdown(users) {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Add Search Input and Clear Button and Select All Line Button
    const searchLi = document.createElement('li');
    searchLi.className = 'px-2 pb-2 mb-2 border-bottom sticky-top bg-white';
    searchLi.innerHTML = `
        <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" placeholder="ค้นหาชื่อ..." id="record_team_user_search">
            <button type="button" class="btn btn-sm btn-outline-primary" id="record_team_user_select_line" title="เลือกทั้งไลน์">
                <i class="fas fa-users"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" id="record_team_user_clear" title="ล้างผู้ใช้งานทั้งหมด">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    listEl.appendChild(searchLi);

    const searchInput = searchLi.querySelector('input');
    searchInput.addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const items = listEl.querySelectorAll('.team-user-item');
        items.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(term) ? '' : 'none';
        });
    });

    const clearBtn = searchLi.querySelector('#record_team_user_clear');
    clearBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // prevent closing dropdown
        const checkboxes = listEl.querySelectorAll('.team-user-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        updateRecordTeamUserUI();
    });

    const selectLineBtn = searchLi.querySelector('#record_team_user_select_line');
    selectLineBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectActiveLineUsers();
    });

    users.forEach(u => {
        const li = document.createElement('li');
        li.className = 'dropdown-item p-1 team-user-item';

        const div = document.createElement('div');
        div.className = 'form-check m-0';

        const input = document.createElement('input');
        input.className = 'form-check-input ms-0 me-2 team-user-checkbox';
        input.type = 'checkbox';
        input.value = u.id;
        input.id = `record_team_user_${u.id}`;

        const label = document.createElement('label');
        label.className = 'form-check-label w-100 d-block small';
        label.htmlFor = `record_team_user_${u.id}`;
        label.textContent = u.fullname ? `${u.fullname} (${u.username})` : u.username;

        input.addEventListener('change', () => updateRecordTeamUserUI());

        div.appendChild(input);
        div.appendChild(label);
        li.appendChild(div);
        listEl.appendChild(li);
    });
}

function updateRecordTeamUserUI() {
    const listEl = document.getElementById('record_team_user_list');
    const btnTextEl = document.getElementById('record_team_user_text');
    const countEl = document.getElementById('record_team_user_count');
    const hiddenInput = document.getElementById('record_team_user_ids');

    if (!listEl || !hiddenInput) return;

    const checkboxes = listEl.querySelectorAll('.team-user-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    hiddenInput.value = ids.join(',');

    if (ids.length === 0) {
        btnTextEl.textContent = '-- ไม่ระบุ --';
        countEl.textContent = '1';
        countEl.className = 'badge bg-secondary';
    } else {
        const names = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent.split(' ')[0]);
        btnTextEl.textContent = names.join(', ');
        countEl.textContent = ids.length;
        countEl.className = 'badge bg-primary';
    }

    // Sort items so checked ones are at the top
    const items = Array.from(listEl.querySelectorAll('.team-user-item'));
    items.sort((a, b) => {
        const aChecked = a.querySelector('.team-user-checkbox').checked ? -1 : 1;
        const bChecked = b.querySelector('.team-user-checkbox').checked ? -1 : 1;
        if (aChecked !== bChecked) return aChecked - bChecked;
        const aLabel = a.querySelector('label').textContent;
        const bLabel = b.querySelector('label').textContent;
        return aLabel.localeCompare(bLabel, 'th');
    });
    items.forEach(item => listEl.appendChild(item));
}

function setRecordTeamUserSelection(userIds) {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;

    const checkboxes = listEl.querySelectorAll('.team-user-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = userIds.includes(Number(cb.value)) || userIds.includes(String(cb.value));
    });

    updateRecordTeamUserUI();
}

async function selectActiveLineUsers() {
    const jobId = document.getElementById('record_job_id').value;
    if (!jobId) return;
    
    // Find job to get location_id
    const job = activeJobs.find(j => j.job_id == jobId);
    if (!job || !job.location_id) {
        Swal.fire('Error', 'ไม่สามารถระบุสถานที่ของจ๊อบนี้ได้', 'error');
        return;
    }
    
    const btn = document.getElementById('record_team_user_select_line');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังโหลด...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`../production/api/inventoryManage.php?action=get_active_line_users&location_id=${job.location_id}`);
        const result = await response.json();
        
        if (result.success && result.users) {
            if (result.users.length === 0) {
                Swal.fire('Info', 'ไม่พบพนักงานในไลน์นี้ที่ยังไม่สแกนออกในกะปัจจุบัน', 'info');
            } else {
                const listEl = document.getElementById('record_team_user_list');
                // Inject any user not already in the dropdown
                result.users.forEach(u => {
                    if (listEl && !listEl.querySelector(`.team-user-checkbox[value="${u.id}"]`)) {
                        const li = document.createElement('li');
                        li.className = 'dropdown-item p-1 team-user-item';
                        const div = document.createElement('div');
                        div.className = 'form-check m-0';
                        const input = document.createElement('input');
                        input.className = 'form-check-input ms-0 me-2 team-user-checkbox';
                        input.type = 'checkbox';
                        input.value = u.id;
                        input.id = `record_team_user_${u.id}`;
                        input.addEventListener('change', () => updateRecordTeamUserUI());
                        const label = document.createElement('label');
                        label.className = 'form-check-label w-100 d-block small';
                        label.htmlFor = `record_team_user_${u.id}`;
                        label.textContent = u.fullname ? `${u.fullname} (${u.username})` : u.username;
                        div.appendChild(input);
                        div.appendChild(label);
                        li.appendChild(div);
                        listEl.appendChild(li);
                    }
                });
                // Select all returned users
                const userIds = result.users.map(u => u.id);
                setRecordTeamUserSelection(userIds);
                if (typeof showToast === 'function') showToast(`เลือกพนักงาน ${userIds.length} คนสำเร็จ`, 'var(--bs-success)');
            }
        } else {
            Swal.fire('Error', result.message || 'ไม่สามารถดึงข้อมูลพนักงานได้', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

document.addEventListener('click', function (e) {
    if (e.target.closest('#record_team_user_list')) {
        e.stopPropagation();
    }
});

document.getElementById('record_override_team')?.addEventListener('change', loadRecordTeamUsers);
