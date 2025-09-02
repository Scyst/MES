"use strict";

//-- ตัวแปรสำหรับเก็บข้อมูลทั้งหมดและหน้าปัจจุบัน --
let allStandardParams = [], allSchedules = [], allMissingParams = [], allBomFgs = [];
let paramCurrentPage = 1;
let healthCheckCurrentPage = 1;
let bomCurrentPage = 1;
let bomTabLoaded = false;
let currentEditingParam = null;
let currentEditingBom = null;
let manageBomModal;
let validatedBomImportData = [];
let validatedBulkBomImportData = [];

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
        return { success: false, message: error.message || "An unexpected client-side error occurred." };
    }
}


// --- ฟังก์ชันสำหรับ Tab "Standard Parameters" ---
function setupParameterItemAutocomplete() {
    // ... โค้ดส่วนนี้และส่วนอื่นๆ ทั้งหมดคงเดิม ...
    // ไม่มีการเปลี่ยนแปลง Logic ใดๆ ในไฟล์นี้
    // เปลี่ยนแปลงแค่ค่าคงที่ 3 บรรทัดด้านบนเท่านั้น
    const searchInput = document.getElementById('param_item_search');
    if (!searchInput) return;

    // สร้างกล่องแสดงผลลัพธ์การค้นหา
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let searchDebounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        const value = searchInput.value.toLowerCase();

        // รีเซ็ตค่าที่เลือกไว้เมื่อมีการพิมพ์ใหม่
        document.getElementById('param_item_id').value = '';
        document.getElementById('param_sap_no').value = '';
        document.getElementById('param_part_no').value = '';

        resultsWrapper.innerHTML = '';
        if (value.length < 2) return;

        searchDebounce = setTimeout(async () => {
            const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
            if (result.success) {
                const filteredItems = result.data.slice(0, 10);
                filteredItems.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no} <br><small>${item.part_description || ''}</small>`;
                    resultItem.addEventListener('click', () => {
                        searchInput.value = `${item.sap_no} | ${item.part_no}`;
                        document.getElementById('param_item_id').value = item.item_id;
                        document.getElementById('param_sap_no').value = item.sap_no;
                        document.getElementById('param_part_no').value = item.part_no;
                        document.getElementById('param_part_description').value = item.part_description || '';
                        resultsWrapper.innerHTML = '';
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = filteredItems.length > 0 ? 'block' : 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

// =================================================================
// SECTION: REFACTORED "CREATE NEW BOM" WORKFLOW
// =================================================================

function initializeCreateBomModal() {
    const modalEl = document.getElementById('createBomModal');
    if (!modalEl) return;

    // --- ดึง Element ของ Modal และ Form มาเก็บไว้ ---
    const form = document.getElementById('createBomForm');
    const searchInput = document.getElementById('fg_item_search');
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);
    const detailsDiv = document.getElementById('selected_fg_details');
    const paramSelect = document.getElementById('parameter_select');
    const nextBtn = document.getElementById('createBomNextBtn');

    // --- ตัวแปรสำหรับจัดการ State ---
    let debounce;
    let selectedItem = null;
    let bomDataForNextStep = null; // ตัวแปร "ธง" สำหรับส่งข้อมูล

    // --- Autocomplete Logic (โค้ดส่วนนี้สมบูรณ์ดีแล้ว) ---
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value.toLowerCase();
        selectedItem = null;
        detailsDiv.classList.add('d-none');
        nextBtn.disabled = true;
        resultsWrapper.innerHTML = '';
        if (value.length < 2) return;
        debounce = setTimeout(async () => {
            const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
            if (result.success) {
                resultsWrapper.innerHTML = '';
                result.data.slice(0, 10).forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}`;
                    resultItem.addEventListener('click', () => {
                        searchInput.value = `${item.sap_no} | ${item.part_no}`;
                        selectedItem = item;
                        resultsWrapper.innerHTML = '';
                        resultsWrapper.style.display = 'none';
                        loadParametersForSelectedItem();
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });

    // --- Parameter Loading Logic (โค้ดส่วนนี้สมบูรณ์ดีแล้ว) ---
    async function loadParametersForSelectedItem() {
        if (!selectedItem) return;
        detailsDiv.classList.remove('d-none');
        paramSelect.innerHTML = '<option value="">Loading...</option>';
        nextBtn.disabled = true;
        const result = await sendRequest(PARA_API_ENDPOINT, 'get_parameters_for_item', 'GET', null, { item_id: selectedItem.item_id });
        if (result.success && result.data.length > 0) {
            paramSelect.innerHTML = '<option value="">-- Select Line/Model --</option>';
            result.data.forEach(param => {
                const option = document.createElement('option');
                option.value = param.id;
                option.textContent = `Line: ${param.line} / Model: ${param.model}`;
                option.dataset.line = param.line;
                option.dataset.model = param.model;
                paramSelect.appendChild(option);
            });
        } else {
            paramSelect.innerHTML = '<option value="">-- No parameters found --</option>';
        }
    }

    paramSelect.addEventListener('change', () => {
        nextBtn.disabled = !paramSelect.value;
    });

    // ====[ **จุดควบคุมหลัก** ]====
    // 1. Event Listener เมื่อฟอร์มถูก "Submit"
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedOption = paramSelect.options[paramSelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) {
            showToast('Please select a production parameter (Line/Model).', '#ffc107');
            return; // ถ้าข้อมูลไม่ครบ จะหยุดแค่ตรงนี้ (Modal จะยังเปิดอยู่)
        }

        // ถ้าข้อมูลครบ ให้เก็บข้อมูลไว้ใน "ธง"
        bomDataForNextStep = {
            fg_item_id: selectedItem.item_id,
            fg_sap_no: selectedItem.sap_no,
            fg_part_no: selectedItem.part_no,
            line: selectedOption.dataset.line,
            model: selectedOption.dataset.model
        };

        // แล้วสั่งปิด Modal แรก *ด้วย JavaScript*
        // ใช้ getInstance เพื่อให้แน่ใจว่าเราได้ instance ที่ถูกต้องเสมอ
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        }
    });

    // 2. Event Listener ที่จะทำงาน "หลังจาก" Modal แรกปิดสนิทแล้ว
    modalEl.addEventListener('hidden.bs.modal', () => {
        // เช็ค "ธง" ของเรา
        if (bomDataForNextStep) {
            // ถ้ามีข้อมูลอยู่ แปลว่าต้องเปิด Modal ที่สอง
            manageBom(bomDataForNextStep);
        }

        // ไม่ว่าจะเกิดอะไรขึ้น ให้รีเซ็ตฟอร์มและ "ธง" เสมอ
        form.reset();
        detailsDiv.classList.add('d-none');
        nextBtn.disabled = true;
        bomDataForNextStep = null;
    });
}

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
        renderPagination('paginationControls', 0, 1, ROWS_PER_PAGE, goToStandardParamPage);
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

    renderPagination('paginationControls', filteredData.length, paramCurrentPage, ROWS_PER_PAGE, goToStandardParamPage);
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
    const tableHead = document.querySelector('#healthCheckPane thead tr');
    if (tableHead) {
        tableHead.innerHTML = `
            <th>SAP No.</th>
            <th>Part No.</th>
            <th>Part Description</th>
            <th style="width: 180px;" class="text-center">Actions</th>
        `;
    }

    if (allMissingParams.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" class="text-center text-success">Excellent! No missing data found.</td></tr>`;
    } else {
        pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.sap_no || ''}</td>
                <td>${item.part_no || ''}</td>
                <td>${item.part_description || ''}</td>
            `;

            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-center';

            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning';
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit Item';

            editButton.onclick = () => {
                const itemMasterUrl = `../inventorySettings/inventorySettings.php?tab=itemMaster&search=${encodeURIComponent(item.sap_no)}`;
                window.open(itemMasterUrl, '_blank');
            };

            actionsTd.appendChild(editButton);
            tr.appendChild(actionsTd);

            listBody.appendChild(tr);
        });
    }

    renderPagination('healthCheckPaginationControls', allMissingParams.length, healthCheckCurrentPage, ROWS_PER_PAGE, goToHealthCheckPage);
    // --- ▲▲▲▲▲ สิ้นสุดโค้ดใหม่ ▲▲▲▲▲
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

async function loadBomForModal(fg) {
    showSpinner();
    try {
        const modalTitle = document.getElementById('bomModalTitle');
        const modalBomTableBody = document.getElementById('modalBomTableBody');

        modalTitle.textContent = `Managing BOM for: ${fg.fg_part_no} (SAP: ${fg.fg_sap_no})`;
        document.getElementById('modalSelectedFgItemId').value = fg.fg_item_id;
        document.getElementById('modalSelectedFgLine').value = fg.line;
        document.getElementById('modalSelectedFgModel').value = fg.model;

        modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_item_id: fg.fg_item_id, line: fg.line, model: fg.model });

        modalBomTableBody.innerHTML = '';
        if (bomResult.success && bomResult.data.length > 0) {
            bomResult.data.forEach(comp => {
                const quantity = parseFloat(comp.quantity_required);
                const displayQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(4);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                                        <td>${comp.component_sap_no}</td> 
                                        <td>${comp.part_description || ''}</td>
                    <td class="text-center align-middle">
                        <div class="d-flex justify-content-center">
                            <input type="number" 
                                class="form-control form-control-sm text-center bom-quantity-input bom-input-readonly" 
                                style="width: 80px;" 
                                    value="${displayQuantity}"
                                data-bom-id="${comp.bom_id}" 
                                min="0.0001"
                                    step="any"
                                readonly>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="btn-group gap-2 justify-content-center">
                            <button class="btn btn-warning btn-sm" data-action="edit-comp">Edit</button>
                            <button class="btn btn-danger btn-sm" data-action="delete-comp" data-comp-id="${comp.bom_id}">Delete</button>
                        </div>
                    </td>
                `;
                modalBomTableBody.appendChild(tr);
            });
        } else {
            modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No components. Add one now!</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

function manageBom(fg) {
    const exportBomBtn = document.getElementById('exportBomBtn');
    const importBomBtn = document.getElementById('importBomBtn');

    currentEditingBom = fg;

    if (exportBomBtn) {
        exportBomBtn.disabled = false;
        exportBomBtn.title = `Export template for ${fg.fg_sap_no}`;
    }
    if (importBomBtn) {
        importBomBtn.disabled = false;
        importBomBtn.title = `Import BOM for ${fg.fg_sap_no}`;
    }

    manageBomModal.show();
    loadBomForModal(fg);
};

// =================================================================
// SECTION: BOM MANAGER REFACTORED FUNCTIONS
// =================================================================
function getFilteredBoms(searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) {
        return allBomFgs;
    }
    return allBomFgs.filter(fg =>
        (fg.fg_sap_no && String(fg.fg_sap_no).toLowerCase().includes(term)) ||
        (fg.fg_part_no && fg.fg_part_no.toLowerCase().includes(term)) ||
        (fg.line && fg.line.toLowerCase().includes(term)) ||
        (fg.model && fg.model.toLowerCase().includes(term))
    );
}

function renderBomFgTable(fgData) {
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    fgListTableBody.innerHTML = '';
    const start = (bomCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = fgData.slice(start, start + ROWS_PER_PAGE);

    if (pageData.length > 0) {
        pageData.forEach(fg => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.title = 'Click to edit BOM';
            tr.addEventListener('click', (event) => {
                if (event.target.closest('.form-check-input')) return;
                manageBom(fg);
            });
            tr.innerHTML = `
                <td class="text-center"><input class="form-check-input bom-row-checkbox" type="checkbox" value='${JSON.stringify(fg).replace(/'/g, "&apos;")}'></td>
                <td>${fg.fg_sap_no || 'N/A'}</td>
                <td>${fg.fg_part_no || ''}</td>
                <td>${fg.line || 'N/A'}</td>
                <td>${fg.model || 'N/A'}</td>
                <td>${fg.fg_part_description || ''}</td>
                <td>${fg.updated_by || 'N/A'}</td>
                <td class="text-end">${fg.updated_at || 'N/A'}</td>
            `;
            fgListTableBody.appendChild(tr);
        });
    } else {
        fgListTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No BOMs found.</td></tr>`;
    }

    const deleteBtn = document.getElementById('deleteSelectedBomBtn');
    const exportSelectedMenuItem = document.getElementById('exportSelectedDetailedBtn');
    const selected = document.querySelectorAll('.bom-row-checkbox:checked');
    if (deleteBtn && exportSelectedMenuItem) {
        if (selected.length > 0) {
            deleteBtn.classList.remove('d-none');
            exportSelectedMenuItem.classList.remove('disabled');
        } else {
            deleteBtn.classList.add('d-none');
            exportSelectedMenuItem.classList.add('disabled');
        }
    }

    renderPagination('bomPaginationControls', fgData.length, bomCurrentPage, ROWS_PER_PAGE, goToBomPage);
}

function goToBomPage(page) {
    bomCurrentPage = page;
    const searchInput = document.getElementById('bomSearchInput');
    const filteredData = getFilteredBoms(searchInput.value);
    renderBomFgTable(filteredData);
}

async function handleBomImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    showSpinner();
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileData = e.target.result;
                const workbook = XLSX.read(fileData, { type: 'binary' });
                const sheetName = workbook.SheetNames.includes('BOM_EDIT') ? 'BOM_EDIT' : workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                if (rows.length === 0) {
                    showToast('The selected file is empty or has an invalid format.', '#ffc107');
                    return;
                }

                const result = await sendRequest(BOM_API_ENDPOINT, 'validate_bom_import', 'POST', { rows });

                if (result.success) {
                    displayImportPreview(result.data);
                } else {
                    showToast(result.message || 'Validation failed on the server.', '#dc3545');
                }

            } catch (error) {
                console.error("BOM Import process failed:", error);
                showToast('Failed to process file. Check console for details.', '#dc3545');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error("File reader failed:", error);
        showToast('Could not read the selected file.', '#dc3545');
    } finally {
        // Spinner will be hidden in displayImportPreview or in catch block
    }
}


function displayImportPreview(validationData) {
    const { summary, rows } = validationData;
    validatedBomImportData = rows.filter(row => row.determined_action !== 'ERROR');

    const modal = new bootstrap.Modal(document.getElementById('bomImportPreviewModal'));

    document.getElementById('summary-add-count').textContent = summary.add;
    document.getElementById('summary-update-count').textContent = summary.update;
    document.getElementById('summary-delete-count').textContent = summary.delete;
    document.getElementById('summary-error-count').textContent = summary.error;
    document.getElementById('add-tab-count').textContent = summary.add;
    document.getElementById('update-tab-count').textContent = summary.update;
    document.getElementById('delete-tab-count').textContent = summary.delete;
    document.getElementById('error-tab-count').textContent = summary.error;

    const bodies = {
        ADD: document.getElementById('add-preview-body'),
        UPDATE: document.getElementById('update-preview-body'),
        DELETE: document.getElementById('delete-preview-body'),
        ERROR: document.getElementById('error-preview-body')
    };

    for (const key in bodies) {
        bodies[key].innerHTML = '';
    }

    rows.forEach(row => {
        const action = row.determined_action;
        const tr = document.createElement('tr');
        if (action === 'ADD' || action === 'UPDATE') {
            const quantity = parseFloat(row.QUANTITY_REQUIRED);
            const displayQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(4);
            tr.innerHTML = `<td>${row.LINE}</td><td>${row.MODEL}</td><td>${row.COMPONENT_SAP_NO}</td><td>${displayQuantity}</td>`;
            bodies[action].appendChild(tr);
        } else if (action === 'DELETE') {
            tr.innerHTML = `<td>${row.LINE}</td><td>${row.MODEL}</td><td>${row.COMPONENT_SAP_NO}</td>`;
            bodies.DELETE.appendChild(tr);
        } else if (action === 'ERROR') {
            tr.innerHTML = `<td>${row.row_index}</td><td>${row.COMPONENT_SAP_NO || 'N/A'}</td><td>${row.errors.join(', ')}</td>`;
            bodies.ERROR.appendChild(tr);
        }
    });

    for (const key in bodies) {
        if (bodies[key].children.length === 0) {
            const colspan = (key === 'ERROR' || key === 'DELETE') ? 3 : 4;
            bodies[key].innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted">No items for this action.</td></tr>`;
        }
    }

    const confirmBtn = document.getElementById('confirmImportBtn');
    confirmBtn.disabled = !validationData.isValid || validatedBomImportData.length === 0;

    hideSpinner();
    modal.show();
}

async function executeBomImport() {
    if (validatedBomImportData.length === 0) {
        showToast('No valid data to import.', '#ffc107');
        return;
    }

    showSpinner();
    const modal = bootstrap.Modal.getInstance(document.getElementById('bomImportPreviewModal'));

    try {
        const result = await sendRequest(BOM_API_ENDPOINT, 'execute_bom_import', 'POST', { rows: validatedBomImportData });
        if (result.success) {
            showToast(result.message, '#28a745');
            modal.hide();
            await new Promise(resolve => setTimeout(resolve, 400));
            const bomManagerTab = document.getElementById('bom-manager-tab');
            if (bomManagerTab.classList.contains('active')) {
                const searchInput = document.getElementById('bomSearchInput');
                searchInput.value = '';
                const bomManagerScope = getBomManagerScope();
                if(bomManagerScope) await bomManagerScope.loadAndRenderBomFgTable();
            }
        } else {
            showToast(result.message, '#dc3545');
        }
    } finally {
        hideSpinner();
    }
}

function getBomManagerScope() {
    return window.bomManagerAPI;
}

function initializeBomManager() {
    // --- 1. Element References ---
    const searchInput = document.getElementById('bomSearchInput');
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    const selectAllBomCheckbox = document.getElementById('selectAllBomCheckbox');
    const deleteSelectedBomBtn = document.getElementById('deleteSelectedBomBtn');

    // --- Bulk Operation Elements ---
    const exportAllBomsBtn = document.getElementById('exportAllBomsBtn');
    const exportSelectedBomsBtn = document.getElementById('exportSelectedBomsBtn');
    const exportAllConsolidatedBtn = document.getElementById('exportAllConsolidatedBtn');
    const exportSelectedDetailedBtn = document.getElementById('exportSelectedDetailedBtn');
    const importBomsBtn = document.getElementById('importBomsBtn');
    const importUpdateBomsBtn = document.getElementById('importUpdateBomsBtn');
    const importCreateBomsBtn = document.getElementById('importCreateBomsBtn');
    const bulkUpdateImportFile = document.getElementById('bulkUpdateImportFile');
    const initialCreateImportFile = document.getElementById('initialCreateImportFile');
    const bulkBomImportFile = document.getElementById('bulkBomImportFile');
    const confirmBulkImportBtn = document.getElementById('confirmBulkImportBtn');

    // --- Single BOM Operation Elements ---
    const createNewBomBtn = document.getElementById('createNewBomBtn');
    const manageBomModalEl = document.getElementById('manageBomModal');
    const modalAddComponentForm = document.getElementById('modalAddComponentForm');
    const modalBomTableBody = document.getElementById('modalBomTableBody');
    const copyBomModalEl = document.getElementById('copyBomModal');
    const copyBomForm = document.getElementById('copyBomForm');
    const deleteBomFromModalBtn = document.getElementById('deleteBomFromModalBtn');
    const copyBomFromModalBtn = document.getElementById('copyBomFromModalBtn');

    manageBomModal = new bootstrap.Modal(manageBomModalEl);
    const copyBomModal = new bootstrap.Modal(copyBomModalEl);
    let bomDebounceTimer;

    // --- Style Injection for read-only inputs in modal ---
    const style = document.createElement('style');
    style.innerHTML = ` .bom-input-readonly { background-color: #495057; opacity: 1; color: #fff; } `;
    document.head.appendChild(style);

    // --- 2. Helper Functions ---
    async function loadAndRenderBomFgTable() {
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'get_all_fgs_with_bom', 'GET');
            if (result.success) {
                allBomFgs = result.data;
                filterAndRenderBomFgTable();
            }
        } finally {
            hideSpinner();
        }
    }

    function filterAndRenderBomFgTable() {
        bomCurrentPage = 1;
        const filteredData = getFilteredBoms(searchInput.value);
        renderBomFgTable(filteredData);
    }

    function setupBomComponentAutocomplete() {
        const searchInput = document.getElementById('modalComponentSearch');
        if (!searchInput) return;
        const resultsWrapper = searchInput.parentNode.querySelector('.autocomplete-results') || document.createElement('div');
        resultsWrapper.className = 'autocomplete-results';
        searchInput.parentNode.appendChild(resultsWrapper);
        let componentDebounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(componentDebounce);
            const value = searchInput.value.toLowerCase();
            document.getElementById('modalComponentItemId').value = '';
            resultsWrapper.innerHTML = '';
            if (value.length < 2) return;
            componentDebounce = setTimeout(async () => {
                const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
                if (result.success) {
                    result.data.slice(0, 10).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}`;
                        resultItem.addEventListener('click', () => {
                            searchInput.value = `${item.sap_no} | ${item.part_no}`;
                            document.getElementById('modalComponentItemId').value = item.item_id;
                            resultsWrapper.innerHTML = '';
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                    resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
                }
            }, 300);
        });
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput) resultsWrapper.style.display = 'none';
        });
    }

    // --- Bulk Export ---
    async function exportAllBoms() {
        showToast('Exporting all BOMs (Consolidated)...', '#0dcaf0');
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'export_all_boms', 'GET');
            if (result.success && result.data && result.data.length > 0) {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(result.data);
                XLSX.utils.book_append_sheet(wb, ws, "All_BOMs"); // สร้างชีตเดียว

                const fileName = `BOM_Export_All_Consolidated_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);
                showToast('All BOMs exported successfully!', '#28a745');
            } else {
                showToast(result.message || 'No BOMs found to export.', '#ffc107');
            }
        } finally {
            hideSpinner();
        }
    }

    async function exportSelectedBoms() {
        const selectedCheckboxes = document.querySelectorAll('.bom-row-checkbox:checked');
        const bomsToExport = Array.from(selectedCheckboxes).map(cb => JSON.parse(cb.value));
        if (bomsToExport.length === 0) {
            showToast('Please select at least one BOM to export.', '#ffc107');
            return;
        }

        showToast(`Exporting ${bomsToExport.length} selected BOM(s)...`, '#0dcaf0');
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'export_selected_boms', 'POST', { boms: bomsToExport });
            if (result.success && Object.keys(result.data).length > 0) {
                const wb = XLSX.utils.book_new();
                for (const fgSapNo in result.data) {
                    const sheetData = result.data[fgSapNo].map(row => ({
                        LINE: row.LINE,
                        MODEL: row.MODEL,
                        COMPONENT_SAP_NO: row.COMPONENT_SAP_NO,
                        QUANTITY_REQUIRED: row.QUANTITY_REQUIRED
                    }));
                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(wb, ws, fgSapNo);
                }
                const fileName = `BOM_Export_Selected_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);
                showToast('Selected BOMs exported successfully!', '#28a745');
            } else {
                showToast(result.message || 'Could not export selected BOMs.', '#ffc107');
            }
        } finally {
            hideSpinner();
        }
    }

    // --- Bulk Import ---
    async function handleBulkBomImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        showSpinner();
        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData);
            const sheets = {};
            workbook.SheetNames.forEach(sheetName => {
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
                sheets[sheetName] = { rows };
            });

            const result = await sendRequest(BOM_API_ENDPOINT, 'validate_bulk_import', 'POST', { sheets });
            if (result.success) {
                displayBulkImportPreview(result.data);
            } else {
                showToast(result.message || 'Validation failed.', '#dc3545');
            }
        } catch (error) {
            showToast('Failed to process file.', '#dc3545');
            console.error(error);
        } finally {
            event.target.value = '';
            hideSpinner();
        }
    }

    function updateBomBulkActionsVisibility() {
        const deleteBtn = document.getElementById('deleteSelectedBomBtn');
        const exportSelectedMenuItem = document.getElementById('exportSelectedDetailedBtn');
        const selected = document.querySelectorAll('.bom-row-checkbox:checked');

        if (selected.length > 0) {
            deleteBtn.classList.remove('d-none');
            exportSelectedMenuItem.classList.remove('disabled');
        } else {
            deleteBtn.classList.add('d-none');
            exportSelectedMenuItem.classList.add('disabled');
        }
    }

    function displayBulkImportPreview(validationData) {
        const { summary, sheets } = validationData;
        validatedBulkBomImportData = sheets;

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('bomBulkImportPreviewModal'));
        document.getElementById('bulk-summary-create-count').textContent = summary.create;
        document.getElementById('bulk-summary-overwrite-count').textContent = summary.overwrite;
        document.getElementById('bulk-summary-skipped-count').textContent = summary.skipped;
        document.getElementById('create-tab-count').textContent = summary.create;
        document.getElementById('overwrite-tab-count').textContent = summary.overwrite;
        document.getElementById('skipped-tab-count').textContent = summary.skipped;

        const lists = {
            CREATE: document.getElementById('create-preview-list'),
            OVERWRITE: document.getElementById('overwrite-preview-list'),
            SKIPPED: document.getElementById('skipped-preview-accordion')
        };
        for (const key in lists) { lists[key].innerHTML = ''; }

        sheets.forEach((sheet, index) => {
            if (sheet.status === 'CREATE' || sheet.status === 'OVERWRITE') {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = sheet.sheet_name;
                lists[sheet.status].appendChild(li);
            } else if (sheet.status === 'SKIPPED') {
                const accordionItem = `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading-${index}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}">${sheet.sheet_name}</button></h2>
                        <div id="collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#skipped-preview-accordion">
                            <div class="accordion-body"><ul>${sheet.errors.map(err => `<li>${err}</li>`).join('')}</ul></div>
                        </div>
                    </div>`;
                lists.SKIPPED.innerHTML += accordionItem;
            }
        });

        if (lists.CREATE.children.length === 0) lists.CREATE.innerHTML = '<li class="list-group-item text-muted">No new BOMs to create.</li>';
        if (lists.OVERWRITE.children.length === 0) lists.OVERWRITE.innerHTML = '<li class="list-group-item text-muted">No existing BOMs to overwrite.</li>';
        if (lists.SKIPPED.children.length === 0) lists.SKIPPED.innerHTML = '<div class="p-3 text-muted">No sheets were skipped.</div>';

        confirmBulkImportBtn.disabled = !validationData.isValid;
        modal.show();
    }

    async function executeBulkBomImport() {
        const validSheets = validatedBulkBomImportData.filter(s => s.status !== 'SKIPPED');
        if (validSheets.length === 0) {
            showToast('No valid data to import.', '#ffc107');
            return;
        }

        showSpinner();
        const modal = bootstrap.Modal.getInstance(document.getElementById('bomBulkImportPreviewModal'));

        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'execute_bulk_import', 'POST', { sheets: validSheets });
            if (result.success) {
                showToast(result.message, '#28a745');
                modal.hide();
                await loadAndRenderBomFgTable();
            } else {
                showToast(result.message, '#dc3545');
            }
        } finally {
            hideSpinner();
        }
    }

    async function handleInitialBomImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm("This action will only create NEW BOMs and will SKIP any existing BOMs. Are you sure you want to proceed?")) {
            event.target.value = ''; // Reset file input
            return;
        }

        showSpinner();
        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData);
            const sheetName = workbook.SheetNames[0]; // อ่านจากชีตแรกเสมอ
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

            if (rows.length === 0) {
                showToast('The selected file is empty.', '#ffc107');
                return;
            }

            const result = await sendRequest(BOM_API_ENDPOINT, 'create_initial_boms', 'POST', { rows });

            if (result.success) {
                showToast(result.message, '#28a745');
                await loadAndRenderBomFgTable(); // โหลดข้อมูลใหม่
            } else {
                showToast(result.message || 'Failed to create initial BOMs.', '#dc3545');
            }
        } catch (error) {
            showToast('An error occurred while processing the file.', '#dc3545');
            console.error(error);
        } finally {
            event.target.value = ''; // Reset file input เสมอ
            hideSpinner();
        }
    }

    // --- Bulk Delete ---
    async function deleteSelectedBoms() {
        const selectedCheckboxes = document.querySelectorAll('.bom-row-checkbox:checked');
        const bomsToDelete = Array.from(selectedCheckboxes).map(cb => JSON.parse(cb.value));
        if (bomsToDelete.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${bomsToDelete.length} selected BOM(s)?`)) return;

        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'bulk_delete_bom', 'POST', { boms: bomsToDelete });
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            if (result.success) {
                await loadAndRenderBomFgTable();
            }
        } finally {
            hideSpinner();
        }
    }

    // --- 3. Event Listeners ---
    searchInput.addEventListener('input', () => {
        clearTimeout(bomDebounceTimer);
        bomDebounceTimer = setTimeout(filterAndRenderBomFgTable, 300);
    });

    // Bulk Operations
    exportAllBomsBtn?.addEventListener('click', exportAllBoms);
    exportSelectedBomsBtn?.addEventListener('click', exportSelectedBoms); // <-- เพิ่มบรรทัดนี้
    bulkBomImportFile?.addEventListener('change', handleBulkBomImport);
    confirmBulkImportBtn?.addEventListener('click', executeBulkBomImport);
    importUpdateBomsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        bulkUpdateImportFile.click(); // เรียก input ของตัวเอง
    });

    importCreateBomsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        initialCreateImportFile.click(); // เรียก input ของตัวเอง
    });
    exportAllConsolidatedBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        exportAllBoms();
    });
    exportSelectedDetailedBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if(!e.target.classList.contains('disabled')) {
            exportSelectedBoms();
        }
    });

    bulkUpdateImportFile?.addEventListener('change', handleBulkBomImport);
    initialCreateImportFile?.addEventListener('change', handleInitialBomImport);

    // Single BOM Operations
    createNewBomBtn?.addEventListener('click', () => {
        const createBomModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('createBomModal'));
        createBomModal.show();
    });

    selectAllBomCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.bom-row-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateBomBulkActionsVisibility();
    });
    fgListTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('bom-row-checkbox')) {
            updateBomBulkActionsVisibility();
        }
    });
    deleteSelectedBomBtn.addEventListener('click', deleteSelectedBoms);

    modalAddComponentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            fg_item_id: document.getElementById('modalSelectedFgItemId').value,
            line: document.getElementById('modalSelectedFgLine').value,
            model: document.getElementById('modalSelectedFgModel').value,
            component_item_id: document.getElementById('modalComponentItemId').value,
            quantity_required: document.getElementById('modalQuantityRequired').value
        };

        if (!data.component_item_id) {
            showToast('Please select a valid component from the search results.', '#ffc107');
            return;
        }

        const result = await sendRequest(BOM_API_ENDPOINT, 'add_bom_component', 'POST', data);
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            await loadBomForModal(currentEditingBom); // Reload modal content
            e.target.reset();
        }
    });

    modalBomTableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('bom-quantity-input')) {
            clearTimeout(bomDebounceTimer);
            const input = e.target;
            const bomId = input.dataset.bomId;
            const newQuantity = input.value;

            if (!bomId || newQuantity === '' || newQuantity < 1) return;

            bomDebounceTimer = setTimeout(async () => {
                showSpinner();
                try {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'update_bom_component', 'POST', {
                        bom_id: bomId,
                        quantity_required: newQuantity
                    });
                    if (!result.success) showToast(result.message, '#dc3545');
                } finally {
                    hideSpinner();
                }
            }, 1000);
        }
    });

    modalBomTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const tr = button.closest('tr');

        if (action === 'delete-comp') {
            const bomId = button.dataset.compId;
            if (confirm('Delete this component?')) {
                showSpinner();
                try {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'delete_bom_component', 'POST', { bom_id: bomId });
                    showToast(result.message, result.success ? '#28a745' : '#dc3545');
                    if (result.success) {
                        await loadBomForModal(currentEditingBom);
                    }
                } finally {
                    hideSpinner();
                }
            }
        } else if (action === 'edit-comp') {
            const input = tr.querySelector('.bom-quantity-input');
            if (input.readOnly) {
                input.readOnly = false;
                input.classList.remove('bom-input-readonly');
                button.textContent = 'Done';
                button.classList.replace('btn-warning', 'btn-success');
                input.focus();
                input.select();
            } else {
                input.readOnly = true;
                input.classList.add('bom-input-readonly');
                button.textContent = 'Edit';
                button.classList.replace('btn-success', 'btn-warning');
            }
        }
    });

    copyBomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            source_fg_sap_no: document.getElementById('copy_source_fg_sap_no').value,
            source_line: document.getElementById('copy_source_line').value,
            source_model: document.getElementById('copy_source_model').value,
            target_fg_sap_no: document.getElementById('target_fg_sap_no').value
        };

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

    function openCopyBomModal(fg) {
        if (!fg) return;
        document.getElementById('copySourceBomDisplay').value = `${fg.fg_part_no} (SAP: ${fg.fg_sap_no})`;
        document.getElementById('copy_source_fg_sap_no').value = fg.fg_sap_no;
        document.getElementById('copy_source_line').value = fg.line;
        document.getElementById('copy_source_model').value = fg.model;
        document.getElementById('target_fg_sap_no').value = '';
        copyBomModal.show();
    };

    deleteBomFromModalBtn.addEventListener('click', () => {
        if (!currentEditingBom) return;
        if (confirm(`Are you sure you want to delete the BOM for ${currentEditingBom.fg_part_no}?`)) {
            (async () => {
                showSpinner();
                try {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', {
                        fg_item_id: currentEditingBom.fg_item_id,
                        line: currentEditingBom.line,
                        model: currentEditingBom.model
                    });
                    showToast(result.message, result.success ? '#28a745' : '#dc3545');
                    if (result.success) {
                        manageBomModal.hide();
                        // The 'hidden.bs.modal' event will trigger the table reload.
                    }
                } finally {
                    hideSpinner();
                }
            })();
        }
    });

    copyBomFromModalBtn.addEventListener('click', () => {
        if (currentEditingBom) {
            manageBomModalEl.dataset.isCopying = 'true';
            manageBomModal.hide();
            manageBomModalEl.addEventListener('hidden.bs.modal', () => {
                openCopyBomModal(currentEditingBom);
                delete manageBomModalEl.dataset.isCopying;
            }, { once: true });
        }
    });

    // --- 4. Initial Load ---
    setupBomComponentAutocomplete();
    loadAndRenderBomFgTable();

    window.bomManagerAPI = {
        loadAndRenderBomFgTable
    };
}

/**
 * ฟังก์ชันสำหรับเปิด Modal แก้ไขและเติมข้อมูลลงในฟอร์ม
 */
function openEditModal(modalId, data) {
    currentEditingParam = data;
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    for (const key in data) {
        const input = modalElement.querySelector(`[name="${key}"]`);
        const editInput = modalElement.querySelector(`#edit_${key}`);

        if (input) {
            input.value = data[key] === null ? '' : data[key];
        }
        if (editInput) {
            editInput.value = data[key] === null ? '' : data[key];
        }
    }

    document.getElementById('edit_part_description_display').value = data.part_description || '';

    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------------------------------------------
    // 1. STATE MANAGEMENT (การจัดการสถานะ)
    // -----------------------------------------------------------------
    // ติดตามว่าแต่ละแท็บเคยถูกโหลดข้อมูลแล้วหรือยัง (เพื่อประสิทธิภาพ)
    const tabLoadedState = {
        '#bom-manager-pane': false,
        '#lineSchedulesPane': false,
        '#healthCheckPane': false
    };

    // -----------------------------------------------------------------
    // 2. CORE FUNCTIONS (ฟังก์ชันหลัก)
    // -----------------------------------------------------------------

    /**
     * ฟังก์ชันกลางสำหรับโหลดข้อมูลตามแท็บที่ถูกเปิด
     * @param {string} targetTabId - ID ของ tab-pane (e.g., '#bom-manager-pane')
     */
    function loadTabData(targetTabId) {
        // ถ้าเคยโหลดแล้ว หรือไม่มี ID ให้หยุดทำงาน
        if (!targetTabId || tabLoadedState[targetTabId]) {
            return;
        }

        console.log(`Loading data for tab: ${targetTabId}`);

        // เลือกทำงานตาม ID ของแท็บ
        switch (targetTabId) {
            case '#bom-manager-pane':
                initializeBomManager();
                initializeCreateBomModal();
                setupParameterItemAutocomplete();
                break;
                
            case '#lineSchedulesPane':
                if (canManage) {
                    loadSchedules();
                }
                break;

            case '#healthCheckPane':
                if (canManage) {
                    loadHealthCheckData();
                }
                break;
        }

        // อัปเดตสถานะว่าแท็บนี้ถูกโหลดแล้ว
        tabLoadedState[targetTabId] = true;
    }

    /**
     * ฟังก์ชันสำหรับแสดง/ซ่อน Pagination ของแต่ละแท็บ
     * @param {string} activeTabId - ID ของ tab-pane ที่กำลังแสดงผล
     */
    function showCorrectPagination(activeTabId) {
        const paginations = document.querySelectorAll('.sticky-bottom[data-tab-target]');
        paginations.forEach(pagination => {
            const isVisible = pagination.dataset.tabTarget === activeTabId;
            pagination.style.display = isVisible ? 'block' : 'none';
        });
    }

    /**
     * ฟังก์ชันสำหรับตั้งค่า Event Listeners ของแท็บ Parameters โดยเฉพาะ
     * (แยกออกมาเพื่อความสะอาดของโค้ด)
     */
    function setupParameterEventListeners() {
        let debounceTimer;
        ['filterLine', 'filterModel', 'searchInput'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(filterAndRenderStandardParams, 500);
            });
        });
        document.getElementById('importFile')?.addEventListener('change', handleImport);
        document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
            document.querySelectorAll('#paramTableBody .row-checkbox').forEach(cb => cb.checked = e.target.checked);
            updateBulkActionsVisibility();
        });
        document.getElementById('paramTableBody')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                updateBulkActionsVisibility();
                if (!e.target.checked) document.getElementById('selectAllCheckbox').checked = false;
            }
        });
        document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelectedParams);
        document.getElementById('bulkCreateVariantsBtn')?.addEventListener('click', openBulkCreateVariantsModal);
        document.getElementById('bulkCreateVariantsForm')?.addEventListener('submit', bulkCreateVariants);
    }


    // -----------------------------------------------------------------
    // 3. INITIALIZATION LOGIC (การเริ่มต้นการทำงาน)
    // -----------------------------------------------------------------

    // --- จัดการการเปิดแท็บจาก URL Parameter ---
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl === 'bom') {
        const bomTabButton = document.getElementById('bom-manager-tab');
        if (bomTabButton) {
            const tab = new bootstrap.Tab(bomTabButton);
            tab.show(); // สั่งให้แสดงแท็บ BOM
        }
    }
    
    // --- ตั้งค่า Event Listener สำหรับการคลิกเปลี่ยนแท็บ ---
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabElm => {
        tabElm.addEventListener('shown.bs.tab', event => {
            const targetTabId = event.target.getAttribute('data-bs-target');
            loadTabData(targetTabId); // โหลดข้อมูลของแท็บที่เพิ่งเปิด
            showCorrectPagination(targetTabId); // แสดง Pagination ที่ถูกต้อง
        });
    });

    // --- โหลดข้อมูลและแสดง Pagination สำหรับแท็บแรกที่ Active อยู่ตอนเปิดหน้าเว็บ ---
    const initialActiveTab = document.querySelector('.nav-tabs .nav-link.active');
    if (initialActiveTab) {
        const initialTabId = initialActiveTab.getAttribute('data-bs-target');
        loadTabData(initialTabId);
        showCorrectPagination(initialTabId);
    }
});