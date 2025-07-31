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
let currentEditingParam = null;

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
    showSpinner();
    try {
        const result = await sendRequest(PARA_API_ENDPOINT, 'read', 'GET');
        if (result?.success) {
            allStandardParams = result.data;
            filterAndRenderStandardParams();
        }
    } finally {
        hideSpinner();
        updateBulkActionsVisibility();
    }
}

function getFilteredStandardParams() {
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

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No parameters found.</td></tr>`;
        renderPagination('paginationControls', 0, 1, goToStandardParamPage);
        return;
    }

    pageData.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        
        const canEditThisRow = (currentUser.role !== 'supervisor') || (currentUser.line === row.line);
        if (canEditThisRow) {
             tr.style.cursor = 'pointer';
             tr.title = 'Click to edit';
        }
       
        tr.addEventListener('click', (event) => {
            if (event.target.tagName !== 'INPUT' && canEditThisRow) {
                openEditModal("editParamModal", row);
            }
        });

        const checkboxTd = document.createElement('td');
        checkboxTd.className = 'text-center';
        checkboxTd.innerHTML = `<input class="form-check-input row-checkbox" type="checkbox" value="${row.id}" onclick="event.stopPropagation();">`;
        tr.appendChild(checkboxTd);

        tr.innerHTML += `
            <td>${row.line || ''}</td>
            <td>${row.model || ''}</td>
            <td>${row.part_no || ''}</td>
            <td>${row.sap_no || ''}</td>
            <td>${row.part_description || ''}</td>
            <td>${row.planned_output || ''}</td>
            <td>${parseFloat(row.part_value || 0).toFixed(2)}</td>
            <td class="text-end">${row.updated_at || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    renderPagination('paginationControls', filteredData.length, paramCurrentPage, goToStandardParamPage);
    updateBulkActionsVisibility();
}

function filterAndRenderStandardParams() {
    paramCurrentPage = 1;
    document.getElementById('selectAllCheckbox').checked = false;
    renderStandardParamsTable();
}

function goToStandardParamPage(page) {
    paramCurrentPage = page;
    renderStandardParamsTable();
}

async function deleteStandardParam(id) {
    if (!confirm(`Are you sure you want to delete parameter ID ${id}?`)) return;
    showSpinner();
    try {
        const result = await sendRequest(PARA_API_ENDPOINT, 'delete', 'POST', { id });
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            await loadStandardParams();
        }
    } finally {
        hideSpinner();
    }
}

/**
 * ฟังก์ชันสำหรับควบคุมการแสดงผลของปุ่ม Bulk Actions
 */
function updateBulkActionsVisibility() {
    const container = document.getElementById('bulk-actions-container');
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    
    if (selectedCheckboxes.length > 0) {
        container.classList.remove('d-none');
        const countSpan = document.getElementById('selectedItemCount');
        if(countSpan) countSpan.textContent = selectedCheckboxes.length;
    } else {
        container.classList.add('d-none');
    }
}

/**
 * ฟังก์ชันสำหรับลบรายการที่เลือกทั้งหมด
 */
async function deleteSelectedParams() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const idsToDelete = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (idsToDelete.length === 0) {
        showToast('Please select items to delete.', '#ffc107');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} selected parameter(s)?`)) return;

    showSpinner();
    try {
        const result = await sendRequest(PARA_API_ENDPOINT, 'bulk_delete', 'POST', { ids: idsToDelete });
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            document.getElementById('selectAllCheckbox').checked = false;
            await loadStandardParams();
        }
    } finally {
        hideSpinner();
    }
}

function openCreateVariantsModal(data) {
    const modalElement = document.getElementById('createVariantsModal');
    if (!modalElement) return;

    document.getElementById('sourceParamDisplay').value = `${data.part_no} (Line: ${data.line}, Model: ${data.model})`;
    document.getElementById('source_param_id').value = data.id;
    document.getElementById('variants').value = '';

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

function openBulkCreateVariantsModal() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('Please select source parameters first.', '#ffc107');
        return;
    }

    const modalElement = document.getElementById('bulkCreateVariantsModal');
    if (!modalElement) return;

    document.getElementById('selectedItemCount').textContent = selectedCheckboxes.length;
    document.getElementById('bulk_variants').value = '';

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

async function bulkCreateVariants(event) {
    event.preventDefault();
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const idsToProcess = Array.from(selectedCheckboxes).map(cb => cb.value);
    const variants = document.getElementById('bulk_variants').value;

    if (idsToProcess.length === 0 || !variants) {
        showToast('Missing selected items or variant suffixes.', '#ffc107');
        return;
    }
    
    showSpinner();
    try {
        const payload = { ids: idsToProcess, variants: variants };
        const result = await sendRequest(PARA_API_ENDPOINT, 'bulk_create_variants', 'POST', payload);
        showToast(result.message, result.success ? '#28a745' : '#dc3545');

        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('bulkCreateVariantsModal'));
            modal.hide();
            document.getElementById('selectAllCheckbox').checked = false;
            await loadStandardParams();
        }
    } finally {
        hideSpinner();
    }
}

// --- ฟังก์ชันสำหรับ Tab "Line Schedules" ---

async function loadSchedules() {
    showSpinner();
    try {
        const result = await sendRequest(PARA_API_ENDPOINT, 'read_schedules', 'GET');
        if (result?.success) {
            allSchedules = result.data;
            renderSchedulesTable();
        } else {
            showToast(result?.message || 'Failed to load schedules.', '#dc3545');
        }
    } finally {
        hideSpinner();
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
            editButton.addEventListener('click', () => openEditModal("editScheduleModal", schedule));
            buttonWrapper.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger';
            deleteButton.textContent = 'Delete';
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

    showSpinner();
    try {
        const result = await sendRequest(PARA_API_ENDPOINT, 'delete_schedule', 'POST', { id });
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            await loadSchedules();
        }
    } finally {
        hideSpinner();
    }
}

// --- ฟังก์ชันสำหรับ Tab "Data Health Check" ---

async function loadHealthCheckData() {
    showSpinner();
    try {
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
    } finally {
        hideSpinner();
    }
}

function renderHealthCheckTable() {
    const listBody = document.getElementById('missingParamsList');
    listBody.innerHTML = '';
    
    const start = (healthCheckCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = allMissingParams.slice(start, start + ROWS_PER_PAGE);

    if (allMissingParams.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center text-success">Excellent! No missing data found.</td></tr>`;
    } else {
         pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.line}</td><td>${item.model}</td><td>${item.part_no}</td>`;
            
            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-center';
            
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-sm btn-success';
            addButton.textContent = 'Add as Parameter';
            addButton.onclick = () => openAddParamFromHealthCheck(item);
            
            actionsTd.appendChild(addButton);
            tr.appendChild(actionsTd);
            
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

    const worksheetData = dataToExport.map(row => ({
        "Line": row.line,
        "Model": row.model,
        "Part No": row.part_no,
        "SAP No": row.sap_no || '',
        "Part Description": row.part_description || '',
        "Planned Output": row.planned_output,
        "Part Value": parseFloat(row.part_value || 0).toFixed(2),
        "Updated At": row.updated_at
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Parameters");
    const fileName = `Parameters_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function triggerImport() {
    document.getElementById('importFile')?.click();
}

function openAddParamFromHealthCheck(item) {
    const modalElement = document.getElementById('addParamModal');
    if (!modalElement) return;

    modalElement.querySelector('#addParamLine').value = item.line || '';
    modalElement.querySelector('#addParamModel').value = item.model || '';
    modalElement.querySelector('#addParamPartNo').value = item.part_no || '';
    
    openModal('addParamModal');
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        showSpinner();
        try {
            const fileData = e.target.result;
            const workbook = XLSX.read(fileData, { type: "binary" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            const rowsToImport = rawRows.map(row => ({
                line: String(row["Line"] || row["line"] || '').trim().toUpperCase(),
                model: String(row["Model"] || row["model"] || '').trim().toUpperCase(),
                part_no: String(row["Part No"] || row["part_no"] || '').trim().toUpperCase(),
                sap_no: String(row["SAP No"] || row["sap_no"] || '').trim().toUpperCase(),
                part_description: String(row["Part Description"] || row["part_description"] || '').trim(),
                planned_output: parseInt(row["Planned Output"] || row["planned_output"] || 0),
                part_value: parseFloat(row["Part Value"] || row["part_value"] || 0)
            }));

            if (rowsToImport.length > 0 && confirm(`Import ${rowsToImport.length} records?`)) {
                const result = await sendRequest(PARA_API_ENDPOINT, 'bulk_import', 'POST', rowsToImport);
                if (result.success) {
                    showToast(result.message || "Import successful!", '#0d6efd');
                    await loadStandardParams();
                } else {
                    showToast(result.message || "Import failed.", '#dc3545');
                }
            }
        } catch (error) {
            console.error("Import process failed:", error);
            showToast('Failed to process file.', '#dc3545');
        } finally {
            event.target.value = '';
            hideSpinner();
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

function initializeBomManager() {
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
    const manageBomModalEl = document.getElementById('manageBomModal');
    const manageBomModal = new bootstrap.Modal(manageBomModalEl);
    const copyBomModalEl = document.getElementById('copyBomModal');
    const copyBomModal = new bootstrap.Modal(copyBomModalEl);
    const modalTitle = document.getElementById('bomModalTitle');
    const modalBomTableBody = document.getElementById('modalBomTableBody');
    const modalAddComponentForm = document.getElementById('modalAddComponentForm');
    const modalSelectedFgPartNo = document.getElementById('modalSelectedFgPartNo');
    const modalSelectedFgModel = document.getElementById('modalSelectedFgModel');
    const modalSelectedFgLine = document.getElementById('modalSelectedFgLine');
    const modalPartDatalist = document.getElementById('bomModalPartDatalist');
    const copyBomForm = document.getElementById('copyBomForm');


    manageBomModalEl.addEventListener('hidden.bs.modal', () => {
        loadAndRenderBomFgTable();
    });
    
    // --- Helper Functions ---
    function renderBomFgTable(fgData) {
        fgListTableBody.innerHTML = '';
        if (fgData && fgData.length > 0) {
            fgData.forEach(fg => {
                const tr = document.createElement('tr');
                const fgDataString = JSON.stringify(fg).replace(/"/g, '&quot;');
                tr.innerHTML = `
                    <td>${fg.sap_no || 'N/A'}</td>
                    <td>${fg.fg_part_no || ''}</td>
                    <td>${fg.line || 'N/A'}</td>
                    <td>${fg.model || 'N/A'}</td>
                    <td>${fg.updated_by || 'N/A'}</td>
                    <td>${fg.updated_at || 'N/A'}</td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-primary btn-sm" onclick='initializeBomManager.openCopyBomModal(${fgDataString})'>Copy</button>
                            <button class="btn btn-warning btn-sm" onclick='initializeBomManager.manageBom(${fgDataString})'>Edit</button> 
                            <button class="btn btn-danger btn-sm" onclick='initializeBomManager.deleteBom(${fgDataString})'>Delete</button>
                        </div>
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
            createBomSapInput.value = result.data.sap_no || '';
            createBomLineInput.value = result.data.line || '';
            createBomModelInput.value = result.data.model || '';
            createBomPartNoInput.value = result.data.part_no || '';
        }
    }

    async function loadAndRenderBomFgTable() {
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'get_all_fgs', 'GET');
            if (result.success) {
                allBomFgs = result.data;
                renderBomFgTable(allBomFgs);
            }
        } finally {
            hideSpinner();
        }
    }

    async function loadBomForModal(fg) {
        showSpinner();
        try {
            const partNo = fg.fg_part_no || fg.part_no; 

            modalTitle.textContent = `Managing BOM for: ${partNo} (Line: ${fg.line}, Model: ${fg.model})`;
            modalSelectedFgPartNo.value = partNo;
            modalSelectedFgLine.value = fg.line;
            modalSelectedFgModel.value = fg.model;

            modalBomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
            const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_part_no: partNo, line: fg.line, model: fg.model });
            
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

            const componentResult = await sendRequest(PARA_API_ENDPOINT, 'get_parts_by_model', 'GET', null, { model: fg.model, line: fg.line });
            if (componentResult.success) {
                modalPartDatalist.innerHTML = componentResult.data.map(p => `<option value="${p.part_no}"></option>`).join('');
            }
        } finally {
            hideSpinner();
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
            showSpinner();
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
                        await loadAndRenderBomFgTable(); // ใช้ await
                    }
                } else {
                    showToast('No valid BOM data found in the file or import was cancelled.', '#ffc107');
                }

            } catch (error) {
                console.error("BOM Import process failed:", error);
                showToast('Failed to process file. Check console for details.', '#dc3545');
            } finally {
                event.target.value = '';
                hideSpinner();
            }
        };
        reader.readAsBinaryString(file);
    }

    async function exportBomToExcel() {
        showToast('Exporting all BOM data... Please wait.', '#0dcaf0');
        showSpinner();

        try {
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
        } finally {
            hideSpinner();
        }
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

    createNewBomBtn?.addEventListener('click', () => createBomModal.show());
    importBomBtn?.addEventListener('click', () => bomImportFile?.click());
    bomImportFile?.addEventListener('change', handleBomImport);
    exportBomBtn?.addEventListener('click', exportBomToExcel);

    createBomForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchCriteria = Object.fromEntries(new FormData(createBomForm).entries());
        
        showSpinner();
        try {
            const result = await sendRequest(PARA_API_ENDPOINT, 'find_parameter_for_bom', 'POST', searchCriteria);
            if (result.success && result.data) {
                showToast('Finished Good found! Proceeding to Step 2.', '#28a745');
                createBomModal.hide();
                createBomForm.reset();
                await loadBomForModal(result.data);
                manageBomModal.show();
            } else {
                showToast(result.message || 'Could not find a matching part.', '#dc3545');
            }
        } finally {
            hideSpinner();
        }
    });

    fgListTableBody.addEventListener('click', async (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const action = e.target.dataset.action;
        const fgPartNo = e.target.dataset.fgPart;
        const fgLine = e.target.dataset.fgLine;
        const fgModel = e.target.dataset.fgModel;

        if (action === 'manage') {
            manageBomModal.show();
            await loadBomForModal(fgPartNo, fgLine, fgModel);
        } else if (action === 'delete') {
            if (confirm(`Are you sure you want to delete the BOM for ${fgPartNo} on Line ${fgLine}?`)) {
                showSpinner();
                try {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', { fg_part_no: fgPartNo, line: fgLine, model: fgModel });
                    showToast(result.message, result.success ? '#28a745' : '#dc3545');
                    if (result.success) await loadAndRenderBomFgTable();
                } finally {
                    hideSpinner();
                }
            }
        }
    });
    
    modalAddComponentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'add_bom_component', 'POST', payload);
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            if (result.success) {
                await loadBomForModal(payload);
                e.target.reset();
                document.getElementById('modalComponentPartNo').focus(); 
            }
        } finally {
            hideSpinner();
        }
    });

    modalBomTableBody.addEventListener('click', async (e) => {
        if (e.target.dataset.action !== 'delete-comp') return;
        const bomId = parseInt(e.target.dataset.compId);
        if (confirm('Delete this component?')) {
            showSpinner();
            try {
                const result = await sendRequest(BOM_API_ENDPOINT, 'delete_bom_component', 'POST', { bom_id: bomId });
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) {
                    const currentBom = {
                        fg_part_no: modalSelectedFgPartNo.value,
                        line: modalSelectedFgLine.value,
                        model: modalSelectedFgModel.value
                    };
                    await loadBomForModal(currentBom);
                }
            } finally {
                hideSpinner();
            }
        }
    });

    copyBomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'copy_bom', 'POST', payload);
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            if (result.success) {
                copyBomModal.hide();
                await loadAndRenderBomFgTable();
            }
        } finally {
            hideSpinner();
        }
    });
    
    initializeBomManager.manageBom = (fg) => {
        manageBomModal.show();
        loadBomForModal(fg);
    };

    initializeBomManager.deleteBom = async (fg) => {
        if (confirm(`Are you sure you want to delete the BOM for ${fg.fg_part_no} on Line ${fg.line}?`)) {
            showSpinner();
            try {
                const result = await sendRequest(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', { fg_part_no: fg.fg_part_no, line: fg.line, model: fg.model });
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) await loadAndRenderBomFgTable();
            } finally {
                hideSpinner();
            }
        }
    };
    
    initializeBomManager.openCopyBomModal = (fg) => {
        document.getElementById('copySourceBomDisplay').value = `${fg.fg_part_no} (Line: ${fg.line})`;
        document.getElementById('copy_source_fg_part_no').value = fg.fg_part_no;
        document.getElementById('copy_source_line').value = fg.line;
        document.getElementById('copy_source_model').value = fg.model;
        document.getElementById('target_fg_part_no').value = '';
        copyBomModal.show();
    };

    loadAndRenderBomFgTable();
    populateCreateBomDatalists();
}

/**
 * ฟังก์ชันสำหรับเปิด Modal แก้ไขและเติมข้อมูลลงในฟอร์ม
 * @param {string} modalId - ID ของ Modal
 * @param {object} data - ข้อมูลของแถวที่ต้องการแก้ไข
 */
function openEditModal(modalId, data) {
    currentEditingParam = data; // ** NEW: เก็บข้อมูลที่กำลังแก้ไขไว้ในตัวแปร global
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    for (const key in data) {
        const input = modalElement.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = data[key];
        }
    }
    
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    loadStandardParams();
    populateLineDatalist();

    if (currentUser.role === 'supervisor') {
        const lineFilter = document.getElementById('filterLine');
        if (lineFilter) {
            lineFilter.value = currentUser.line;
            lineFilter.disabled = true;
            filterAndRenderStandardParams(); 
        }
    }

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

    const createVariantsForm = document.getElementById('createVariantsForm');
    if (createVariantsForm) {
        createVariantsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                source_param_id: document.getElementById('source_param_id').value,
                variants: document.getElementById('variants').value
            };
            
            if (!payload.variants) {
                showToast('Please enter variant suffixes.', '#ffc107');
                return;
            }

            showSpinner();
            try {
                const result = await sendRequest(PARA_API_ENDPOINT, 'create_variants', 'POST', payload);
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('createVariantsModal'));
                    modal.hide();
                    await loadStandardParams();
                }
            } finally {
                hideSpinner();
            }
        });
    }
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const paramTableBody = document.getElementById('paramTableBody');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const bulkCreateVariantsBtn = document.getElementById('bulkCreateVariantsBtn');
    const bulkCreateVariantsForm = document.getElementById('bulkCreateVariantsForm');

    // Event listener สำหรับปุ่ม "เลือกทั้งหมด"
    selectAllCheckbox.addEventListener('change', (event) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = event.target.checked;
        });
        updateBulkActionsVisibility();
    });

    // Event listener สำหรับ checkbox ในแต่ละแถว (ใช้ event delegation)
    paramTableBody.addEventListener('change', (event) => {
        if (event.target.classList.contains('row-checkbox')) {
            updateBulkActionsVisibility();
            if (!event.target.checked) {
                selectAllCheckbox.checked = false;
            }
        }
    });;

    // Event listener สำหรับปุ่ม "ลบรายการที่เลือก"
    deleteSelectedBtn.addEventListener('click', deleteSelectedParams);
    bulkCreateVariantsBtn.addEventListener('click', openBulkCreateVariantsModal);
    bulkCreateVariantsForm.addEventListener('submit', bulkCreateVariants);

    const deleteFromModalBtn = document.getElementById('deleteFromModalBtn');
    const variantsFromModalBtn = document.getElementById('variantsFromModalBtn');

    // Event Listener สำหรับปุ่ม Delete ใน Modal
    deleteFromModalBtn.addEventListener('click', () => {
        if (currentEditingParam && currentEditingParam.id) {
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editParamModal'));
            editModal.hide(); // ซ่อน Modal แก้ไขก่อน
            deleteStandardParam(currentEditingParam.id);
        }
    });

    // Event Listener สำหรับปุ่ม Create Variants ใน Modal
    variantsFromModalBtn.addEventListener('click', () => {
        if (currentEditingParam) {
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editParamModal'));
            editModal.hide();
            editModal._element.addEventListener('hidden.bs.modal', () => {
                openCreateVariantsModal(currentEditingParam);
            }, { once: true });
        }
    });
});