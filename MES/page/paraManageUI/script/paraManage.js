"use strict";

const API_ENDPOINT = '../../api/paraManage/paraManage.php';
const ROWS_PER_PAGE = 25;

let allStandardParams = [], allSchedules = [], allMissingParams = [];
let paramCurrentPage = 1;
let healthCheckCurrentPage = 1;

async function sendRequest(action, method, body = null, urlParams = {}) {
    try {
        urlParams.action = action;
        const queryString = new URLSearchParams(urlParams).toString();
        const url = `${API_ENDPOINT}?${queryString}`;
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast('An unexpected error occurred.', '#dc3545');
        return { success: false, message: "Network or server error." };
    }
}

function openEditModal(modalId, data) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    for (const key in data) {
        const input = modalElement.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = !!parseInt(data[key]);
            } else {
                input.value = data[key];
            }
        }
    }
    openModal(modalId);
}

function renderPagination(containerId, totalItems, currentPage, callback) {
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE);
    const pagination = document.getElementById(containerId);
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const createPageItem = (page, text, isDisabled) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${page === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
        li.querySelector('a').onclick = (e) => { e.preventDefault(); if (!isDisabled) callback(page); };
        return li;
    };

    pagination.appendChild(createPageItem(currentPage - 1, 'Prev', currentPage <= 1));
    for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(createPageItem(i, i, false));
    }
    pagination.appendChild(createPageItem(currentPage + 1, 'Next', currentPage >= totalPages));
}

// --- Standard Parameters Tab Functions ---
async function loadStandardParams() {
    const result = await sendRequest('read', 'GET');
    if (result?.success) {
        allStandardParams = result.data;
        filterAndRenderStandardParams();
    } else {
        showToast(result?.message || 'Failed to load parameters.', '#dc3545');
    }
}

function getFilteredStandardParams() {
    const searchTerm = document.getElementById('searchInput').value.toUpperCase();
    if (!searchTerm) return allStandardParams;
    return allStandardParams.filter(row => `${row.line || ''} ${row.model || ''} ${row.part_no || ''} ${row.sap_no || ''}`.toUpperCase().includes(searchTerm));
}

function renderStandardParamsTable() {
    const filteredData = getFilteredStandardParams();
    const tbody = document.getElementById('paramTableBody');
    tbody.innerHTML = '';
    const start = (paramCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = filteredData.slice(start, start + ROWS_PER_PAGE);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canManage ? 7 : 6}" class="text-center">No parameters found.</td></tr>`;
        renderPagination('paginationControls', 0, 1, goToStandardParamPage);
        return;
    }

    pageData.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        tr.innerHTML = `
            <td>${row.line || ''}</td>
            <td>${row.model || ''}</td>
            <td>${row.part_no || ''}</td>
            <td>${row.sap_no || ''}</td>
            <td>${row.planned_output || ''}</td>
            <td>${row.updated_at || ''}</td>
            ${canManage ? `
            <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-warning" onclick='openEditModal("editParamModal", ${JSON.stringify(row)})'>Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStandardParam(${row.id})">Delete</button>
                </div>
            </td>` : ''}
        `;
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
    const result = await sendRequest('delete', 'DELETE', { id });
    showToast(result.message, result.success ? '#28a745' : '#dc3545');
    if (result.success) loadStandardParams();
}

// --- Line Schedules Tab Functions ---
async function loadSchedules() {
    const result = await sendRequest('read_schedules', 'GET');
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
            <td><span class="badge ${schedule.is_active ? 'bg-success' : 'bg-secondary'}">${schedule.is_active ? 'Active' : 'Inactive'}</span></td>
            ${canManage ? `
            <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-warning" onclick='openEditModal("editScheduleModal", ${JSON.stringify(schedule)})'>Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${schedule.id})">Delete</button>
                </div>
            </td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

async function deleteSchedule(id) {
    if (!confirm(`Are you sure you want to delete schedule ID ${id}?`)) return;
    const result = await sendRequest('delete_schedule', 'DELETE', { id });
    showToast(result.message, result.success ? '#28a745' : '#dc3545');
    if (result.success) loadSchedules();
}

// --- Data Health Check Tab Functions ---
async function loadHealthCheckData() {
    const result = await sendRequest('health_check_parameters', 'GET');
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

    if (allMissingParams.length === 0) {
        listBody.innerHTML = `<tr><td colspan="3" class="text-success">Excellent! No missing data found.</td></tr>`;
    } else {
         pageData.forEach(item => {
            listBody.innerHTML += `<tr><td>${item.line}</td><td>${item.model}</td><td>${item.part_no}</td></tr>`;
        });
    }
    
    renderPagination('healthCheckPaginationControls', allMissingParams.length, healthCheckCurrentPage, goToHealthCheckPage);
}

function goToHealthCheckPage(page) {
    healthCheckCurrentPage = page;
    renderHealthCheckTable();
}

// --- Import/Export Functions ---
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
        "Planned Output": row.planned_output,
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
            const rowsToImport = rawRows.map(row => ({
                line: String(row["Line"] || row["line"] || '').trim().toUpperCase(),
                model: String(row["Model"] || row["model"] || '').trim().toUpperCase(),
                part_no: String(row["Part No"] || row["part_no"] || '').trim().toUpperCase(),
                sap_no: String(row["SAP No"] || row["sap_no"] || '').trim().toUpperCase(),
                planned_output: parseInt(row["Planned Output"] || row["planned_output"] || 0)
            }));

            if (rowsToImport.length > 0 && confirm(`Import ${rowsToImport.length} records?`)) {
                const result = await sendRequest('bulk_import', 'POST', rowsToImport);
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

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadStandardParams();
    document.getElementById('searchInput')?.addEventListener('input', filterAndRenderStandardParams);

    const importInput = document.getElementById('importFile');
    if (importInput) {
        importInput.addEventListener('change', handleImport);
    }

    const tabElms = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElms.forEach(tabElm => {
        tabElm.addEventListener('shown.bs.tab', event => {
            const targetTabId = event.target.getAttribute('data-bs-target');
            
            if (targetTabId === '#standardParamsPane') {
                loadStandardParams();
            } else if (targetTabId === '#lineSchedulesPane') {
                loadSchedules();
            } else if (targetTabId === '#healthCheckPane') {
                loadHealthCheckData();
            }
        });
    });
});
