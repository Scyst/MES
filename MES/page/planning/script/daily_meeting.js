// FILE: MES/page/planning/script/daily_meeting.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GLOBAL VARIABLES ---
    let productionData = [];
    let loadingData = [];
    
    // ตัวแปรสำหรับ Master Data (เพื่อทำ Autocomplete)
    let allLines = [];
    let allItems = []; 

    // UI Elements (Main)
    const dateInput = document.getElementById('cmdDate');
    const shiftSelect = document.getElementById('shiftSelect');
    const tableBody = document.getElementById('productionTableBody');
    const loadingList = document.getElementById('loadingList');
    const shortageContainer = document.getElementById('shortageAlertContainer');
    const btnCommit = document.getElementById('btnCommit');

    // UI Elements (Notes)
    const noteSafety = document.getElementById('noteSafety');
    const noteMachine = document.getElementById('noteMachine');
    const noteGeneral = document.getElementById('noteGeneral');

    // UI Elements (Modals)
    const addJobModal = new bootstrap.Modal(document.getElementById('addJobModal'));
    const addPlanModal = new bootstrap.Modal(document.getElementById('addPlanModal'));
    
    // UI Elements (Add Plan Form)
    const planModalLine = document.getElementById('planModalLine');
    const planModalItemSearch = document.getElementById('planModalItemSearch');
    const planModalItemResults = document.getElementById('planModalItemResults');
    const planModalItemId = document.getElementById('planModalItemId');
    const planModalQty = document.getElementById('planModalQty');
    const selectedItemDisplay = document.getElementById('selectedItemDisplay');
    const selectedItemText = document.getElementById('selectedItemText');
    const btnSavePlan = document.getElementById('btnSavePlan');

    let currentRowIndexForJob = null;

    // --- 2. INIT & MASTER DATA ---

    async function init() {
        await loadMasterData();     // 1. โหลดข้อมูล Lines/Items มาเก็บไว้ก่อน
        await loadDashboardData();  // 2. โหลดข้อมูล Dashboard
    }

    async function loadMasterData() {
        try {
            const response = await fetch('api/dailyMeetingApi.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_master_data' })
            });
            const res = await response.json();
            if(res.status === 'success') {
                allLines = res.data.lines || [];
                allItems = res.data.items || [];
                
                // Populate Line Dropdown
                planModalLine.innerHTML = '<option value="">-- Select Line --</option>';
                allLines.forEach(line => {
                    const opt = document.createElement('option');
                    opt.value = line;
                    opt.textContent = line;
                    planModalLine.appendChild(opt);
                });
            }
        } catch(e) { console.error("Load Master Data Error", e); }
    }

    // --- 3. AUTOCOMPLETE LOGIC (หัวใจสำคัญที่เพิ่มมา) ---

    planModalItemSearch.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        planModalItemResults.innerHTML = '';
        
        if (query.length < 2) {
            planModalItemResults.style.display = 'none';
            return;
        }

        // ค้นหาใน allItems
        const matches = allItems.filter(item => 
            (item.sap_no && item.sap_no.toLowerCase().includes(query)) ||
            (item.part_no && item.part_no.toLowerCase().includes(query)) ||
            (item.part_description && item.part_description.toLowerCase().includes(query))
        ).slice(0, 10); // เอาแค่ 10 ตัวแรก

        if (matches.length > 0) {
            matches.forEach(item => {
                const a = document.createElement('a');
                a.className = 'list-group-item list-group-item-action small';
                a.style.cursor = 'pointer';
                a.innerHTML = `
                    <div class="fw-bold">${item.sap_no || '-'} | <span class="text-primary">${item.part_no}</span></div>
                    <div class="text-muted" style="font-size:0.75rem;">${item.part_description || ''}</div>
                `;
                a.onclick = () => selectItem(item);
                planModalItemResults.appendChild(a);
            });
            planModalItemResults.style.display = 'block';
        } else {
            planModalItemResults.style.display = 'none';
        }
    });

    function selectItem(item) {
        // Set values
        planModalItemId.value = item.item_id;
        planModalItemSearch.value = ''; // Clear search box
        
        // Show selection
        selectedItemText.textContent = `${item.sap_no} : ${item.part_no}`;
        selectedItemDisplay.classList.remove('d-none');
        
        // Hide results
        planModalItemResults.style.display = 'none';
    }

    // ซ่อนผลการค้นหาเมื่อคลิกที่อื่น
    document.addEventListener('click', (e) => {
        if (!planModalItemSearch.contains(e.target) && !planModalItemResults.contains(e.target)) {
            planModalItemResults.style.display = 'none';
        }
    });

    // Reset Form เมื่อเปิด Modal
    document.getElementById('addPlanModal').addEventListener('show.bs.modal', () => {
        planModalItemSearch.value = '';
        planModalQty.value = '';
        planModalItemId.value = '';
        selectedItemDisplay.classList.add('d-none');
        planModalItemResults.style.display = 'none';
        
        // Default Line (ถ้ามีค่าเก่า)
        // planModalLine.value = ...
    });


    // --- 4. API FUNCTIONS (LOAD & SAVE DASHBOARD) ---

    async function loadDashboardData() {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading Data...</td></tr>';
        
        try {
            const response = await fetch('api/dailyMeetingApi.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_dashboard_data',
                    date: dateInput.value,
                    shift: shiftSelect.value
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                productionData = result.data.production_tracking || [];
                loadingData = result.data.loading_plan || [];
                noteSafety.value = result.data.notes.safety || '';
                noteMachine.value = result.data.notes.machine || '';
                noteGeneral.value = result.data.notes.general || '';

                renderProductionTable();
                renderLoadingList();
            } else {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }
        } catch (error) { console.error(error); }
    }

    async function saveMeeting() {
        const originalBtnText = btnCommit.innerHTML;
        btnCommit.disabled = true;
        btnCommit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const payload = {
                action: 'save_meeting',
                meeting_date: dateInput.value,
                shift: shiftSelect.value,
                meeting_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                safety_talk: noteSafety.value,
                machine_status: noteMachine.value,
                general_note: noteGeneral.value,
                production_tracking_json: JSON.stringify(productionData),
                loading_plan_json: JSON.stringify(loadingData)
            };

            const response = await fetch('api/dailyMeetingApi.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status === 'success') alert('✅ Saved Successfully');
            else throw new Error(result.message);

        } catch (error) { alert('❌ Error: ' + error.message); } 
        finally {
            btnCommit.disabled = false;
            btnCommit.innerHTML = originalBtnText;
        }
    }

    // --- 5. SUBMIT NEW PLAN (FUNCTION ใหม่ที่ใช้ ID แทน text) ---

    btnSavePlan.addEventListener('click', async () => {
        const line = planModalLine.value;
        const shift = document.querySelector('input[name="planModalShift"]:checked').value;
        const qty = planModalQty.value;
        const itemId = planModalItemId.value; // เอา ID ที่ได้จากการเลือก

        if(!line || !itemId || !qty) { 
            alert('กรุณากรอกข้อมูลให้ครบ (เลือก Line, Item และระบุจำนวน)'); 
            return; 
        }

        btnSavePlan.disabled = true;
        btnSavePlan.innerText = 'Saving...';

        try {
            // เราใช้ Logic "save_plan" แบบเดียวกับ planManage.php แต่ปรับ field ให้ตรง
            // หรือใช้ action "add_plan" ที่เราสร้างไว้ใน dailyMeetingApi ก็ได้ แต่ต้องแก้ให้รับ item_id
            const response = await fetch('api/dailyMeetingApi.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_plan', 
                    date: dateInput.value,
                    line: line,
                    shift: shift,
                    model: itemId, // ส่ง ID ไปเลย (แต่ต้องแก้ API ให้รองรับ ID) **ดูหมายเหตุด้านล่าง**
                    qty: qty
                })
            });
            const res = await response.json();
            
            if(res.status === 'success') {
                addPlanModal.hide();
                loadDashboardData(); 
            } else {
                alert('Error: ' + res.message);
            }
        } catch(e) { console.error(e); alert('System Error'); } 
        finally {
            btnSavePlan.disabled = false;
            btnSavePlan.innerText = 'บันทึกแผน';
        }
    });

    // --- **หมายเหตุสำหรับ API**: ต้องแก้ `action: add_plan` ใน dailyMeetingApi.php 
    // ให้รับ `model` เป็น `item_id` หรือเช็คว่าเป็น ID แล้วข้ามการค้นหาไปเลย
    // หรือให้ง่ายที่สุดใน JS นี้ ส่ง model เป็น "ชื่อ Part No" ที่ได้จาก item object ก็ได้
    // แก้ไขบรรทัด `model: itemId` เป็น `model: selectedItemText.innerText.split(' : ')[1]` ก็ได้ถ้าระบบเก่ารับ Part No
    // **แต่ทางที่ถูกคือแก้ API ให้รับ item_id ครับ**

    // --- 6. RENDER FUNCTIONS (เหมือนเดิม) ---
    window.renderProductionTable = () => {
        tableBody.innerHTML = '';
        if (productionData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No data found.</td></tr>';
            checkShortages(); return;
        }
        productionData.forEach((row, index) => {
            // (Copy Logic render เดิมมาวางตรงนี้ได้เลยครับ เพื่อความสั้นผมขอละไว้ แต่โค้ดจริงต้องมีนะ)
            // ... Logic Render Row ...
            // ที่มี input updateProdData, job chips, progress bar
            const demand = parseFloat(row.demand)||0; const stock = parseFloat(row.stock)||0; const plan = parseFloat(row.plan)||0;
            const mpAct = parseInt(row.mp_act)||0; const mpReq = parseInt(row.mp_req)||0;
            const mpPercent = mpReq > 0 ? (mpAct/mpReq)*100 : 100;
            let mpColor = mpPercent<80 ? 'bg-danger' : (mpPercent<100 ? 'bg-warning' : 'bg-success');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><i class="fas fa-circle ${plan>0?'text-primary':'text-secondary'} small"></i></td>
                <td class="fw-bold">${row.line}</td>
                <td><input type="text" class="form-control form-control-sm border-0 fw-bold bg-transparent" value="${row.model}" readonly></td>
                <td>
                    <div class="d-flex align-items-center justify-content-center gap-1 mb-1">
                        <span class="fw-bold">${mpAct}</span><span class="text-muted">/</span><span class="text-muted">${mpReq}</span>
                    </div>
                    <div class="progress" style="height:4px;"><div class="progress-bar ${mpColor}" style="width:${Math.min(mpPercent,100)}%"></div></div>
                </td>
                <td><input type="number" class="form-control form-control-sm text-end" value="${demand}" onchange="updateProdData(${index}, 'demand', this.value)"></td>
                <td><input type="number" class="form-control form-control-sm text-end fw-bold ${stock>=demand?'text-success':'text-danger'}" value="${stock}" onchange="updateProdData(${index}, 'stock', this.value)"></td>
                <td><input type="number" class="form-control form-control-sm text-end fw-bold bg-primary bg-opacity-10" value="${plan}" onchange="updateProdData(${index}, 'plan', this.value)"></td>
                <td>
                    <div class="d-flex flex-wrap gap-1">
                        ${(row.jobs||[]).map((j,i)=>`<span class="job-chip ${j.status}" onclick="toggleJobStatus(${index},${i})">${j.name}</span>`).join('')}
                        <button class="btn btn-xs btn-outline-secondary rounded-circle" onclick="openAddJobModal(${index})">+</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        checkShortages();
    };

    window.updateProdData = (index, key, value) => {
        productionData[index][key] = value;
        if(['stock','demand'].includes(key)) renderProductionTable();
    };

    window.renderLoadingList = () => {
        loadingList.innerHTML = '';
        loadingData.forEach((item, index) => {
            let statusClass = 'status-pending';
            if(item.status === 'loading') statusClass = 'status-loading';
            if(item.status === 'done') statusClass = 'status-done';

            const div = document.createElement('div');
            div.className = `list-group-item loading-item ${statusClass} p-2`;
            
            // Layout ปรับปรุงความกว้าง
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    
                    <div class="d-flex align-items-center" style="flex: 1; min-width: 0;">
                        
                        <input type="time" class="form-control form-control-sm border-0 bg-transparent fw-bold p-0 text-dark" 
                               style="width: 60px; flex-shrink: 0;"
                               value="${item.time}" onchange="updateLoadingData(${index}, 'time', this.value)">
                        
                        <input type="text" class="form-control form-control-sm border-0 bg-transparent text-primary small p-0 ms-2 text-truncate" 
                               style="font-size: 0.75rem; font-weight: 600;"
                               value="${item.po || ''}" placeholder="PO: -" onchange="updateLoadingData(${index}, 'po', this.value)">
                    </div>

                    <select class="form-select form-select-sm border-0 bg-white py-0 ps-2 pe-3 shadow-sm text-center" 
                            style="width: 110px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;"
                            onchange="updateLoadingData(${index}, 'status', this.value)">
                        <option value="pending" ${item.status==='pending'?'selected':''}>PENDING</option>
                        <option value="loading" ${item.status==='loading'?'selected':''}>LOADING</option>
                        <option value="done" ${item.status==='done'?'selected':''}>DONE</option>
                    </select>
                </div>

                <div class="d-flex justify-content-between align-items-center">
                    <input type="text" class="form-control form-control-sm border-0 bg-transparent fw-bold text-dark p-0" 
                           style="font-size: 0.9rem;"
                           value="${item.customer}" placeholder="Part No." onchange="updateLoadingData(${index}, 'customer', this.value)">
                    
                    <div class="d-flex align-items-center flex-shrink-0">
                        <input type="number" class="form-control form-control-sm border-0 bg-transparent p-0 text-end fw-bold" style="width: 60px;"
                               value="${item.qty}" onchange="updateLoadingData(${index}, 'qty', this.value)"> 
                        <span class="small text-muted ms-1 me-2">pcs</span>
                        
                        <button class="btn btn-link text-muted p-0 hover-danger" onclick="removeLoading(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            loadingList.appendChild(div);
        });
    };

    window.checkShortages = () => {
        const shortages = productionData.filter(r => (parseFloat(r.stock)||0) < (parseFloat(r.demand)||0));
        let html = '';
        if(shortages.length>0) {
            html = '<table class="table table-sm small mb-0"><thead><tr class="text-muted"><th>Item</th><th class="text-end">Diff</th></tr></thead><tbody>';
            shortages.forEach(s => {
                html += `<tr><td class="fw-bold">${s.model}</td><td class="text-end text-danger">${(parseFloat(s.stock)-parseFloat(s.demand)).toLocaleString()}</td></tr>`;
            });
            html += '</tbody></table>';
        } else {
            html = '<div class="text-center text-muted small py-2"><i class="fas fa-check-circle text-success me-1"></i>No Shortages</div>';
        }
        shortageContainer.innerHTML = html;
    };

    // Job Functions (Minimal)
    window.openAddJobModal = (i) => { currentRowIndexForJob = i; document.getElementById('newJobName').value=''; addJobModal.show(); };
    window.confirmAddJob = () => {
        const name = document.getElementById('newJobName').value;
        const status = document.getElementById('newJobStatus').value;
        if(name && currentRowIndexForJob!==null) {
            if(!productionData[currentRowIndexForJob].jobs) productionData[currentRowIndexForJob].jobs=[];
            productionData[currentRowIndexForJob].jobs.push({id:Date.now(), name, status});
            renderProductionTable(); addJobModal.hide();
        }
    };
    window.toggleJobStatus = (ri, ji) => {
        const s=['normal','urgent','done']; const job=productionData[ri].jobs[ji];
        job.status = s[(s.indexOf(job.status)+1)%3]; renderProductionTable();
    };

    // --- 7. EVENT LISTENERS ---
    dateInput.addEventListener('change', loadDashboardData);
    shiftSelect.addEventListener('change', loadDashboardData);
    btnCommit.addEventListener('click', saveMeeting);
    document.querySelector('#addJobModal .btn-primary').addEventListener('click', confirmAddJob);

    // UI Element (History)
    const btnHistory = document.getElementById('btnHistory');
    // ตรวจสอบก่อนเรียกใช้ Offcanvas เพราะบางทีอาจจะยังไม่ได้ include bootstrap bundle ในบางหน้า
    let historyOffcanvas;
    try {
        historyOffcanvas = new bootstrap.Offcanvas(document.getElementById('historyOffcanvas'));
    } catch(e) { console.warn("Offcanvas init failed"); }
    const historyList = document.getElementById('historyList');

    // ฟังก์ชันโหลดประวัติ
    async function loadHistory() {
        historyList.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            const response = await fetch('api/dailyMeetingApi.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_history_list' })
            });
            const res = await response.json();
            
            if (res.status === 'success' && res.data.length > 0) {
                historyList.innerHTML = '';
                res.data.forEach(item => {
                    const a = document.createElement('a');
                    a.className = 'list-group-item list-group-item-action py-3 border-bottom';
                    a.style.cursor = 'pointer';
                    
                    // แปลงวันที่ให้สวยงาม
                    const dateObj = new Date(item.meeting_date);
                    const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                    
                    // ไอคอนตามกะ
                    const shiftIcon = item.shift === 'DAY' ? '<i class="fas fa-sun text-warning me-1"></i>' : '<i class="fas fa-moon text-primary me-1"></i>';

                    a.innerHTML = `
                        <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                            <strong class="text-dark">${dateStr}</strong>
                            <small class="text-muted fw-bold">${item.meeting_time}</small>
                        </div>
                        <div class="small text-muted mb-1">
                            ${shiftIcon} Shift: ${item.shift}
                        </div>
                        <small class="text-secondary" style="font-size:0.75rem;">
                            <i class="fas fa-user-edit me-1"></i> Updated by User ID: ${item.created_by || '-'}
                        </small>
                    `;
                    
                    // เมื่อคลิก -> โหลดข้อมูลของวันนั้นๆ มาโชว์
                    a.onclick = () => {
                        dateInput.value = item.meeting_date;
                        shiftSelect.value = item.shift; // ปรับ Shift ให้ตรง
                        
                        // ปิดแถบ History
                        historyOffcanvas.hide();
                        
                        // โหลดข้อมูลใหม่
                        loadDashboardData();
                    };
                    
                    historyList.appendChild(a);
                });
            } else {
                historyList.innerHTML = '<div class="text-center py-4 text-muted">ไม่พบประวัติการบันทึก</div>';
            }
        } catch (e) {
            historyList.innerHTML = '<div class="text-center py-4 text-danger">Error loading history</div>';
        }
    }

    // Event Listener ปุ่ม History
    if (btnHistory) {
        btnHistory.addEventListener('click', () => {
            if(historyOffcanvas) {
                historyOffcanvas.show();
                loadHistory();
            }
        });
    }

    // Start
    init();
});