"use strict";

//-- ค่าคงที่และตัวแปร Global --
const PARA_API_ENDPOINT = '../../api/paraManage/paraManage.php';
const BOM_API_ENDPOINT = '../../api/paraManage/bomManager.php';
const ROWS_PER_PAGE = 100;

//-- ตัวแปรสำหรับเก็บข้อมูลทั้งหมดและหน้าปัจจุบัน --
let allStandardParams = [], allSchedules = [], allMissingParams = [], allBomFgs = [];
let paramCurrentPage = 1;
let healthCheckCurrentPage = 1;
let bomTabLoaded = false;

/**
 * ฟังก์ชันกลางสำหรับส่ง Request ไปยัง API
 */
async function sendRequest(endpoint, action, method, body = null, urlParams = {}) {
    try {
        urlParams.action = action;
        const queryString = new URLSearchParams(urlParams).toString();
        const url = `${endpoint}?${queryString}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const options = { method, headers: {} };
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', '#dc3545');
        return { success: false, message: "Network or server error." };
    }
}

/**
 * ฟังก์ชันสำหรับสร้าง Pagination Control
 */
function renderPagination(containerId, totalItems, currentPage, callback) {
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE);
    const pagination = document.getElementById(containerId);
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const createPageItem = (page, text, isDisabled) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${page === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
        if(!isDisabled) li.querySelector('a').onclick = (e) => { e.preventDefault(); callback(page); };
        return li;
    };

    pagination.appendChild(createPageItem(currentPage - 1, 'Prev', currentPage <= 1));
    for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(createPageItem(i, i, false, i === currentPage));
    }
    pagination.appendChild(createPageItem(currentPage + 1, 'Next', currentPage >= totalPages));
}


// --- ฟังก์ชันสำหรับ Tab "Standard Parameters" ---
async function loadStandardParams() {
    const result = await sendRequest(PARA_API_ENDPOINT, 'read', 'GET');
    if (result?.success) {
        allStandardParams = result.data;
        filterAndRenderStandardParams(); // ใช้ Filter ใหม่
    }
}

function getFilteredStandardParams() {
    // แก้ไข: เพิ่มการกรองจาก filterLine และ filterModel
    const lineFilter = document.getElementById('filterLine').value.toUpperCase();
    const modelFilter = document.getElementById('filterModel').value.toUpperCase();
    const searchFilter = document.getElementById('searchInput').value.toUpperCase();

    return allStandardParams.filter(row => {
        const lineMatch = !lineFilter || (row.line || '').toUpperCase().includes(lineFilter);
        const modelMatch = !modelFilter || (row.model || '').toUpperCase().includes(modelFilter);
        const searchMatch = !searchFilter || `${row.part_no || ''} ${row.sap_no || ''}`.toUpperCase().includes(searchFilter);
        return lineMatch && modelMatch && searchMatch;
    });
}

function renderStandardParamsTable() {
    const filteredData = getFilteredStandardParams();
    const tbody = document.getElementById('paramTableBody');
    tbody.innerHTML = '';
    const start = (paramCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = filteredData.slice(start, start + ROWS_PER_PAGE);

    // แก้ไข: เพิ่ม colspan เป็น 8
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No parameters found.</td></tr>`;
        renderPagination('paginationControls', 0, 1, goToStandardParamPage);
        return;
    }

    pageData.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        // แก้ไข: เพิ่ม <td> สำหรับ part_description
        tr.innerHTML = `
            <td>${row.line || ''}</td>
            <td>${row.model || ''}</td>
            <td>${row.part_no || ''}</td>
            <td>${row.sap_no || ''}</td>
            <td>${row.part_description || ''}</td>
            <td>${row.planned_output || ''}</td>
            <td>${row.updated_at || ''}</td>
        `;

        const canEditThisRow = (currentUser.role !== 'supervisor') || (currentUser.line === row.line);
        const actionsTd = document.createElement('td');
        actionsTd.className = 'text-center';
        
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'd-flex gap-1 justify-content-center';

        if (canEditThisRow) {
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => openEditModal("editParamModal", row));
            buttonWrapper.appendChild(editButton);
        }
        
        if (canEditThisRow && canManage) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteStandardParam(row.id));
            buttonWrapper.appendChild(deleteButton);
        }
        
        actionsTd.appendChild(buttonWrapper);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });
    
    renderPagination('paginationControls', filteredData.length, paramCurrentPage, goToStandardParamPage);
}

function filterAndRenderStandardParams() {
    paramCurrentPage = 1;
    renderStandardParamsTable();
}

function goToStandardParamPage(page) {
    paramCurrentPage = page;
    renderStandardParamsTable();
}

async function deleteStandardParam(id) {
    if (!confirm(`Are you sure you want to delete parameter ID ${id}?`)) return;
    const result = await sendRequest(PARA_API_ENDPOINT, 'delete', 'POST', { id });
    showToast(result.message, result.success ? '#28a745' : '#dc3545');
    if (result.success) loadStandardParams();
}

// --- ฟังก์ชันสำหรับ Tab "Line Schedules" ---

async function loadSchedules() {
    const result = await sendRequest(PARA_API_ENDPOINT, 'read_schedules', 'GET');
    if (result?.success) {
        allSchedules = result.data;
        renderSchedulesTable();
    } else {
        showToast(result?.message || 'Failed to load schedules.', '#dc3545');
    }
}

function renderSchedulesTable() {
    const tbody = document.getElementById('schedulesTableBody');
    tbody.innerHTML = '';

    if (allSchedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canManage ? 7 : 6}" class="text-center">No schedules found.</td></tr>`;
        return;
    }

    allSchedules.forEach(schedule => {
        const tr = document.createElement('tr');
        tr.dataset.id = schedule.id;
        tr.innerHTML = `
            <td>${schedule.line || ''}</td>
            <td>${schedule.shift_name || ''}</td>
            <td>${schedule.start_time || ''}</td>
            <td>${schedule.end_time || ''}</td>
            <td>${schedule.planned_break_minutes || ''}</td>
            <td><span class="badge ${schedule.is_active == 1 ? 'bg-success' : 'bg-secondary'}">${schedule.is_active == 1 ? 'Active' : 'Inactive'}</span></td>
        `;

        if (canManage) {
            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-center';
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex gap-1 justify-content-center';
            
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning';
            editButton.textContent = 'Edit';
            // แก้ไข: เปลี่ยนมาใช้ addEventListener
            editButton.addEventListener('click', () => openEditModal("editScheduleModal", schedule));
            buttonWrapper.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger';
            deleteButton.textContent = 'Delete';
             // แก้ไข: เปลี่ยนมาใช้ addEventListener
            deleteButton.addEventListener('click', () => deleteSchedule(schedule.id));
            buttonWrapper.appendChild(deleteButton);

            actionsTd.appendChild(buttonWrapper);
            tr.appendChild(actionsTd);
        }
        tbody.appendChild(tr);
    });
}

async function deleteSchedule(id) {
    if (!confirm(`Are you sure you want to delete schedule ID ${id}?`)) return;
    const result = await sendRequest(PARA_API_ENDPOINT, 'delete_schedule', 'POST', { id });
    showToast(result.message, result.success ? '#28a745' : '#dc3545');
    if (result.success) loadSchedules();
}

// --- ฟังก์ชันสำหรับ Tab "Data Health Check" ---

async function loadHealthCheckData() {
    const result = await sendRequest(PARA_API_ENDPOINT, 'health_check_parameters', 'GET');
    const listBody = document.getElementById('missingParamsList');
    const paginationControls = document.getElementById('healthCheckPaginationControls');
    
    listBody.innerHTML = '';
    paginationControls.innerHTML = '';

    if (result?.success) {
        allMissingParams = result.data;
        healthCheckCurrentPage = 1;
        renderHealthCheckTable();
    } else {
        listBody.innerHTML = `<tr><td colspan="3" class="text-danger">Failed to load data.</td></tr>`;
    }
}

function renderHealthCheckTable() {
    const listBody = document.getElementById('missingParamsList');
    listBody.innerHTML = '';
    
    const start = (healthCheckCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = allMissingParams.slice(start, start + ROWS_PER_PAGE);

    // แก้ไข: ปรับ colspan เป็น 4
    if (allMissingParams.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center text-success">Excellent! No missing data found.</td></tr>`;
    } else {
         pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.line}</td><td>${item.model}</td><td>${item.part_no}</td>`;
            
            // --- เพิ่ม Cell และปุ่ม "Add" ---
            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-center';
            
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-sm btn-success';
            addButton.textContent = 'Add as Parameter';
            // กำหนดให้ปุ่มเรียกฟังก์ชันใหม่พร้อมส่งข้อมูลของแถวนั้นๆ ไปด้วย
            addButton.onclick = () => openAddParamFromHealthCheck(item);
            
            actionsTd.appendChild(addButton);
            tr.appendChild(actionsTd);
            // -----------------------------
            
            listBody.appendChild(tr);
        });
    }
    
    renderPagination('healthCheckPaginationControls', allMissingParams.length, healthCheckCurrentPage, goToHealthCheckPage);
}

function goToHealthCheckPage(page) {
    healthCheckCurrentPage = page;
    renderHealthCheckTable();
}

// --- ฟังก์ชันสำหรับ Import/Export ---

function exportToExcel() {
    showToast('Exporting data... Please wait.', '#0dcaf0');
    
    const dataToExport = getFilteredStandardParams();

    if (!dataToExport || dataToExport.length === 0) {
        showToast("No data to export based on the current filter.", '#ffc107');
        return;
    }

    // ========== แก้ไขโค้ดส่วนนี้ ==========
    // เพิ่ม "Part Description" ในข้อมูลที่จะ Export
    const worksheetData = dataToExport.map(row => ({
        "Line": row.line,
        "Model": row.model,
        "Part No": row.part_no,
        "SAP No": row.sap_no || '',
        "Part Description": row.part_description || '', // <-- เพิ่มฟิลด์นี้
        "Planned Output": row.planned_output,
        "Updated At": row.updated_at
    }));
    // ===================================
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Parameters");
    const fileName = `Parameters_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

//-- ฟังก์ชันสำหรับกดปุ่ม <input type="file"> ที่ซ่อนอยู่ --
function triggerImport() {
    document.getElementById('importFile')?.click();
}

/**
 * ฟังก์ชันสำหรับเปิด Modal 'Add Parameter' และเติมข้อมูลจาก Health Check
 * @param {object} item - ข้อมูลของแถวที่เลือก (line, model, part_no)
 */
function openAddParamFromHealthCheck(item) {
    const modalElement = document.getElementById('addParamModal');
    if (!modalElement) return;

    // เติมข้อมูลลงในฟอร์มของ Modal
    modalElement.querySelector('#addParamLine').value = item.line || '';
    modalElement.querySelector('#addParamModel').value = item.model || '';
    modalElement.querySelector('#addParamPartNo').value = item.part_no || '';
    
    // เรียกใช้ฟังก์ชันเปิด Modal ที่มีอยู่แล้ว
    openModal('addParamModal');
}

//-- ฟังก์ชันสำหรับจัดการไฟล์ Excel ที่ถูกเลือก --
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const fileData = e.target.result;
            const workbook = XLSX.read(fileData, { type: "binary" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            // เพิ่มการอ่าน part_description จากไฟล์
            const rowsToImport = rawRows.map(row => ({
                line: String(row["Line"] || row["line"] || '').trim().toUpperCase(),
                model: String(row["Model"] || row["model"] || '').trim().toUpperCase(),
                part_no: String(row["Part No"] || row["part_no"] || '').trim().toUpperCase(),
                sap_no: String(row["SAP No"] || row["sap_no"] || '').trim().toUpperCase(),
                part_description: String(row["Part Description"] || row["part_description"] || '').trim(),
                planned_output: parseInt(row["Planned Output"] || row["planned_output"] || 0)
            }));

            if (rowsToImport.length > 0 && confirm(`Import ${rowsToImport.length} records?`)) {
                const result = await sendRequest(PARA_API_ENDPOINT, 'bulk_import', 'POST', rowsToImport);
                if (result.success) {
                    showToast(result.message || "Import successful!", '#0d6efd');
                    loadStandardParams(); 
                } else {
                    showToast(result.message || "Import failed.", '#dc3545');
                }
            }
        } catch (error) {
            console.error("Import process failed:", error);
            showToast('Failed to process file.', '#dc3545');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
}

async function populateLineDatalist() {
    const result = await sendRequest(PARA_API_ENDPOINT, 'get_lines', 'GET');
    if (result?.success) {
        const datalist = document.getElementById('lineDatalist');
        if (datalist) {
            datalist.innerHTML = result.data.map(line => `<option value="${line}"></option>`).join('');
        }
    }
}

// ในไฟล์ paraManage.js ของคุณ
// ให้ลบฟังก์ชัน initializeBomManager เดิมทิ้งทั้งหมด แล้วใช้ฟังก์ชันนี้แทนที่

function initializeBomManager() {
    // --- Element References (เหมือนเดิม) ---
    const searchInput = document.getElementById('bomSearchInput');
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    const createNewBomBtn = document.getElementById('createNewBomBtn');
    const importBomBtn = document.getElementById('importBomBtn');
    const bomImportFile = document.getElementById('bomImportFile');
    const exportBomBtn = document.getElementById('exportBomBtn');
    const createBomModalEl = document.getElementById('createBomModal');
    const createBomModal = new bootstrap.Modal(createBomModalEl);
    const createBomForm = document.getElementById('createBomForm');
    const createBomSapInput = document.getElementById('createBomSapNo');
    const createBomLineInput = document.getElementById('createBomLine');
    const createBomModelInput = document.getElementById('createBomModel');
    const createBomPartNoInput = document.getElementById('createBomPartNo');
    const manageBomModalEl = document.getElementById('manageBomModal');
    const manageBomModal = new bootstrap.Modal(manageBomModalEl);
    const modalTitle = document.getElementById('bomModalTitle');
    const modalBomTableBody = document.getElementById('modalBomTableBody');
    const modalAddComponentForm = document.getElementById('modalAddComponentForm');
    const modalSelectedFgPartNo = document.getElementById('modalSelectedFgPartNo');
    const modalSelectedFgModel = document.getElementById('modalSelectedFgModel');
    const modalSelectedFgLine = document.getElementById('modalSelectedFgLine'); // ** NEW: อ้างอิง input ใหม่ **
    const modalPartDatalist = document.getElementById('bomModalPartDatalist');

    manageBomModalEl.addEventListener('hidden.bs.modal', () => {
        loadAndRenderBomFgTable();
    });

    // --- Helper Functions ---
    function renderBomFgTable(fgData) {
        fgListTableBody.innerHTML = '';
        if (fgData && fgData.length > 0) {
            fgData.forEach(fg => {
                const tr = document.createElement('tr');
                // ** FIXED: เพิ่ม data-fg-line เข้าไปในปุ่ม **
                tr.innerHTML = `
                    <td>${fg.sap_no || 'N/A'}</td>
                    <td>${fg.fg_part_no || ''}</td>
                    <td>${fg.line || 'N/A'}</td>
                    <td>${fg.model || 'N/A'}</td>
                    <td>${fg.updated_by || 'N/A'}</td>
                    <td>${fg.updated_at || 'N/A'}</td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" data-action="manage" data-fg-part="${fg.fg_part_no}" data-fg-line="${fg.line}" data-fg-model="${fg.model || ''}">Edit</button> 
                        <button class="btn btn-danger btn-sm" data-action="delete" data-fg-part="${fg.fg_part_no}" data-fg-line="${fg.line}" data-fg-model="${fg.model}">Delete</button>
                    </td>`;
                fgListTableBody.appendChild(tr);
            });
        } else {
            fgListTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No BOMs found.</td></tr>`;
        }
    }

    async function fetchParameterData(key, value) {
        if (!value) return;
        const result = await sendRequest(PARA_API_ENDPOINT, 'get_parameter_by_key', 'GET', null, {[key]: value});
        if (result.success && result.data) {
            // กรอกข้อมูลที่ได้ลงในช่องอื่นๆ
            createBomSapInput.value = result.data.sap_no || '';
            createBomLineInput.value = result.data.line || '';
            createBomModelInput.value = result.data.model || '';
            createBomPartNoInput.value = result.data.part_no || '';
        }
    }

    async function loadAndRenderBomFgTable() {
        const result = await sendRequest(BOM_API_ENDPOINT, 'get_all_fgs', 'GET');
        if (result.success) {
            allBomFgs = result.data;
            renderBomFgTable(allBomFgs);
        }
    }

    async function loadBomForModal(fgPartNo, fgLine, fgModel) {
        modalTitle.textContent = `Managing BOM for: ${fgPartNo} (Line: ${fgLine}, Model: ${fgModel})`;
        modalSelectedFgPartNo.value = fgPartNo;
        modalSelectedFgLine.value = fgLine; // ** NEW: เก็บค่า line **
        modalSelectedFgModel.value = fgModel; // ** NEW: เก็บค่า model **

        modalBomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
        const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_part_no: fgPartNo, line: fgLine, model: fgModel });
        
        modalBomTableBody.innerHTML = '';
        if (bomResult.success && bomResult.data.length > 0) {
            bomResult.data.forEach(comp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${comp.component_part_no}</td><td>${comp.quantity_required}</td><td class="text-center"><button class="btn btn-danger btn-sm" data-action="delete-comp" data-comp-id="${comp.bom_id}">Delete</button></td>`;
                modalBomTableBody.appendChild(tr);
            });
        } else {
            modalBomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No components. Add one now!</td></tr>';
        }

        const componentResult = await sendRequest(PARA_API_ENDPOINT, 'get_parts_by_model', 'GET', null, { model: fgModel });
        if (componentResult.success) {
            modalPartDatalist.innerHTML = componentResult.data.map(p => `<option value="${p.part_no}"></option>`).join('');
        }
    }
    
    async function populateCreateBomDatalists() {
        const result = await sendRequest(PARA_API_ENDPOINT, 'read', 'GET');
        if (result.success) {
            const lines = [...new Set(result.data.map(item => item.line))];
            const models = [...new Set(result.data.map(item => item.model))];
            const partNos = [...new Set(result.data.map(item => item.part_no))];
            document.getElementById('lineDatalist').innerHTML = lines.map(l => `<option value="${l}"></option>`).join('');
            document.getElementById('modelDatalist').innerHTML = models.map(m => `<option value="${m}"></option>`).join('');
            document.getElementById('partNoDatalist').innerHTML = partNos.map(p => `<option value="${p}"></option>`).join('');
        }
    }

    async function handleBomImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        showToast('Processing BOM file...', '#0dcaf0');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileData = e.target.result;
                const workbook = XLSX.read(fileData, { type: "binary" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // แปลงข้อมูลให้เป็นโครงสร้างที่ API ต้องการ
                const bomData = rawRows.reduce((acc, row) => {
                    // อ่านค่าจากคอลัมน์ โดยไม่สนใจว่าเป็นตัวพิมพ์เล็กหรือใหญ่
                    const fg_part_no = String(row["FG_PART_NO"] || row["fg_part_no"] || '').trim();
                    const line = String(row["LINE"] || row["line"] || '').trim().toUpperCase();
                    const model = String(row["MODEL"] || row["model"] || '').trim().toUpperCase();
                    const component_part_no = String(row["COMPONENT_PART_NO"] || row["component_part_no"] || '').trim();
                    const quantity_required = parseInt(row["QUANTITY_REQUIRED"] || row["quantity_required"] || 0);

                    // ตรวจสอบข้อมูลสำคัญ
                    if (fg_part_no && line && model && component_part_no && quantity_required > 0) {
                        const fgKey = `${fg_part_no}|${line}|${model}`;
                        if (!acc[fgKey]) {
                            acc[fgKey] = {
                                fg_part_no,
                                line,
                                model,
                                components: []
                            };
                        }
                        acc[fgKey].components.push({ component_part_no, quantity_required });
                    }
                    return acc;
                }, {});

                const payload = Object.values(bomData);

                if (payload.length > 0 && confirm(`This will overwrite existing BOMs. Import BOM for ${payload.length} Finished Good(s)?`)) {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'bulk_import_bom', 'POST', payload);
                    showToast(result.message, result.success ? '#28a745' : '#dc3545');
                    if (result.success) {
                        loadAndRenderBomFgTable(); // โหลดข้อมูลตารางใหม่
                    }
                } else {
                    showToast('No valid BOM data found in the file or import was cancelled.', '#ffc107');
                }

            } catch (error) {
                console.error("BOM Import process failed:", error);
                showToast('Failed to process file. Check console for details.', '#dc3545');
            } finally {
                event.target.value = ''; // ล้างค่า input file เพื่อให้เลือกไฟล์เดิมซ้ำได้
            }
        };
        reader.readAsBinaryString(file);
    }

    async function exportBomToExcel() {
        showToast('Exporting all BOM data... Please wait.', '#0dcaf0');

        const result = await sendRequest(BOM_API_ENDPOINT, 'get_full_bom_export', 'GET');

        if (!result.success || !result.data || result.data.length === 0) {
            showToast('No BOM data available to export.', '#ffc107');
            return;
        }

        // จัดรูปแบบข้อมูลสำหรับไฟล์ Excel
        const worksheetData = result.data.map(row => ({
            "FG_SAP_NO": row.fg_sap_no || '',
            "FG_PART_NO": row.fg_part_no,
            "LINE": row.line,
            "MODEL": row.model,
            "COMPONENT_PART_NO": row.component_part_no,
            "QUANTITY_REQUIRED": row.quantity_required
        }));

        // ใช้ Library SheetJS (XLSX) เพื่อสร้างไฟล์ Excel
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BOM_Export");
        const fileName = `BOM_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        showToast('BOM data exported successfully!', '#28a745');
    }

    // --- Event Listeners ---
    let debounceTimer;
    createBomSapInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchParameterData('sap_no', createBomSapInput.value);
        }, 500); // หน่วงเวลา 0.5 วินาที
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        // กรองข้อมูลจาก Array ที่เก็บไว้ โดยค้นหาจากทุก field ที่แสดงในตาราง
        const filteredData = allBomFgs.filter(fg => 
            (fg.sap_no && fg.sap_no.toLowerCase().includes(searchTerm)) ||
            (fg.fg_part_no && fg.fg_part_no.toLowerCase().includes(searchTerm)) || 
            (fg.line && fg.line.toLowerCase().includes(searchTerm)) ||
            (fg.model && fg.model.toLowerCase().includes(searchTerm))
        );
        // แสดงผลตารางด้วยข้อมูลที่กรองแล้ว
        renderBomFgTable(filteredData);
    });

    createNewBomBtn?.addEventListener('click', () => { createBomModal.show(); });
    importBomBtn?.addEventListener('click', () => bomImportFile?.click());
    bomImportFile?.addEventListener('change', handleBomImport);
    exportBomBtn?.addEventListener('click', exportBomToExcel);

    createBomForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchCriteria = Object.fromEntries(new FormData(createBomForm).entries());
        const result = await sendRequest(PARA_API_ENDPOINT, 'find_parameter_for_bom', 'POST', searchCriteria);
        if (result.success && result.data) {
            showToast('Finished Good found! Proceeding to Step 2.', '#28a745');
            createBomModal.hide();
            createBomForm.reset();
            manageBomModal.show();
            // ** FIXED: ส่งพารามิเตอร์ให้ครบ **
            loadBomForModal(result.data.part_no, result.data.line, result.data.model);
        } else {
            showToast(result.message || 'Could not find a matching part.', '#dc3545');
        }
    });

    fgListTableBody.addEventListener('click', async (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const action = e.target.dataset.action;
        const fgPartNo = e.target.dataset.fgPart;
        const fgLine = e.target.dataset.fgLine;   // ** NEW **
        const fgModel = e.target.dataset.fgModel; // ** NEW **

        if (action === 'manage') {
            manageBomModal.show();
            // ** FIXED: ส่งพารามิเตอร์ให้ครบ **
            loadBomForModal(fgPartNo, fgLine, fgModel);
        } else if (action === 'delete') {
            if (confirm(`Are you sure you want to delete the BOM for ${fgPartNo} on Line ${fgLine}?`)) {
                // ** FIXED: ส่งพารามิเตอร์ให้ครบ **
                const result = await sendRequest(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', { fg_part_no: fgPartNo, line: fgLine, model: fgModel });
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) loadAndRenderBomFgTable();
            }
        }
    });
    
    modalAddComponentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        const result = await sendRequest(BOM_API_ENDPOINT, 'add_bom_component', 'POST', payload);
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            // ** FIXED: ส่งพารามิเตอร์ให้ครบ **
            loadBomForModal(payload.fg_part_no, payload.line, payload.model);
            e.target.reset();
        }
    });

    modalBomTableBody.addEventListener('click', async (e) => {
        if (e.target.dataset.action !== 'delete-comp') return;
        const bomId = parseInt(e.target.dataset.compId);
        if (confirm('Delete this component?')) {
            const result = await sendRequest(BOM_API_ENDPOINT, 'delete_bom_component', 'POST', { bom_id: bomId });
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            if (result.success) {
                const fgPartNo = modalSelectedFgPartNo.value;
                const fgLine = modalSelectedFgLine.value;
                const fgModel = modalSelectedFgModel.value;
                // ** FIXED: ส่งพารามิเตอร์ให้ครบ **
                loadBomForModal(fgPartNo, fgLine, fgModel);
            }
        }
    });
    
    // --- Initial Load ---
    loadAndRenderBomFgTable();
    populateCreateBomDatalists();
}

/**
 * ฟังก์ชันสำหรับเปิด Modal แก้ไขและเติมข้อมูลลงในฟอร์ม
 * @param {string} modalId - ID ของ Modal
 * @param {object} data - ข้อมูลของแถวที่ต้องการแก้ไข
 */
function openEditModal(modalId, data) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    // เติมข้อมูลลงในฟอร์ม (ส่วนนี้ทำงานได้ปกติ)
    for (const key in data) {
        const input = modalElement.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = (data[key] == 1);
            } else {
                input.value = data[key];
            }
        }
    }

    // --- เพิ่ม: Logic สำหรับ Supervisor ---
    if (currentUser.role === 'supervisor') {
        if (modalId === 'editParamModal') {
            const lineInput = modalElement.querySelector('#edit_line');
            if (lineInput) lineInput.disabled = true;
        }
    } else {
        // ถ้าเป็น Admin/Creator ให้แน่ใจว่าช่องไม่ถูกปิดไว้
        if (modalId === 'editParamModal') {
            const lineInput = modalElement.querySelector('#edit_line');
            if (lineInput) lineInput.disabled = false;
        }
    }
    
    // แสดง Modal
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    // โหลดข้อมูลครั้งแรก
    loadStandardParams();
    populateLineDatalist(); // <<<< เพิ่มการเรียกใช้ฟังก์ชันนี้กลับเข้ามา

    // --- Logic สำหรับ Supervisor ---
    if (currentUser.role === 'supervisor') {
        const lineFilter = document.getElementById('filterLine');
        if (lineFilter) {
            lineFilter.value = currentUser.line;
            lineFilter.disabled = true;
            filterAndRenderStandardParams(); 
        }
    }

    // Event Listeners สำหรับ Filter
    ['filterLine', 'filterModel', 'searchInput'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(filterAndRenderStandardParams, 500);
        });
    });

    const importInput = document.getElementById('importFile');
    if (importInput) {
        importInput.addEventListener('change', handleImport);
    }
    
    // Logic การสลับ Tab
    let bomTabLoaded = false;
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabElm => {
        tabElm.addEventListener('shown.bs.tab', event => {
            const targetTabId = event.target.getAttribute('data-bs-target');
            if (targetTabId === '#lineSchedulesPane') {
                if (currentUser.role !== 'supervisor') loadSchedules();
            } else if (targetTabId === '#healthCheckPane') {
                if (currentUser.role !== 'supervisor') loadHealthCheckData();
            } else if (targetTabId === '#bomManagerPane' && !bomTabLoaded) {
                initializeBomManager();
                bomTabLoaded = true;
            }
        });
    });
});