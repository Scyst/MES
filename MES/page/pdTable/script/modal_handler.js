"use strict";

let currentlyEditingData = null;
let wipAllItems = []; // Moved from wip_handler.js to be accessible here

// --- Central function to populate datalists needed by modals ---
async function populateModalDatalists() {
    const result = await sendRequest(PD_API_URL, 'get_datalist_options', 'GET');
    if (result.success) {
        const lineDatalist = document.getElementById('lineDatalist');
        const modelDatalist = document.getElementById('modelDatalist');
        const partNoDatalist = document.getElementById('partNoDatalist');

        if(lineDatalist) lineDatalist.innerHTML = result.lines.map(l => `<option value="${l}"></option>`).join('');
        if(modelDatalist) modelDatalist.innerHTML = result.models.map(m => `<option value="${m}"></option>`).join('');
        if(partNoDatalist) partNoDatalist.innerHTML = result.partNos.map(p => `<option value="${p}"></option>`).join('');
    }
    
    const wipResult = await sendRequest(WIP_API_URL, 'get_initial_data', 'GET');
     if (wipResult.success) {
        wipAllItems = wipResult.items;
        const locationSelect = document.getElementById('entry_location_id');
        if (locationSelect) {
            locationSelect.innerHTML = '<option value="">-- Select Location --</option>';
            wipResult.locations.forEach(loc => {
                locationSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
            });
        }
    }
}

//======================================================================
// SECTION: UTILITY & HELPER FUNCTIONS
//======================================================================

function showBootstrapModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

function updateModalDatalist(datalistId, options) {
    const datalistElement = document.getElementById(datalistId);
    if (datalistElement) {
        datalistElement.innerHTML = Array.isArray(options) 
            ? options.map(opt => `<option value="${opt}"></option>`).join('')
            : '';
    }
}

//======================================================================
// SECTION: DATALIST AND VALIDATION LOGIC FOR PART MODALS
//======================================================================

async function updateModelOptions(formType) {
    const lineInput = document.getElementById(formType === 'add' ? 'addPartLine' : 'edit_line');
    const modelListId = `${formType}ModelList`;

    if (lineInput && lineInput.value) {
        try {
            const response = await fetch(`${PD_API_URL}?action=get_models_by_line&line=${lineInput.value}`);
            const result = await response.json();
            updateModalDatalist(modelListId, result.success ? result.data : []);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            updateModalDatalist(modelListId, []);
        }
    } else {
        updateModalDatalist(modelListId, []);
    }
}

async function updatePartNoOptions(formType) {
    const lineInput = document.getElementById(formType === 'add' ? 'addPartLine' : 'edit_line');
    const modelInput = document.getElementById(formType === 'add' ? 'addPartModel' : 'edit_model');
    const partNoListId = `${formType}PartNoList`;
    
    if (lineInput && lineInput.value && modelInput && modelInput.value) {
        try {
            const params = new URLSearchParams({ 
                action: 'get_parts_by_model', 
                line: lineInput.value,
                model: modelInput.value
            });
            const response = await fetch(`${PD_API_URL}?${params.toString()}`);
            const result = await response.json();
            updateModalDatalist(partNoListId, result.success ? result.data : []);
        } catch (error) {
            console.error('Failed to fetch part numbers:', error);
            updateModalDatalist(partNoListId, []);
        }
    } else {
        updateModalDatalist(partNoListId, []);
    }
}

let validationDebounceTimer;
function handlePartNoValidation(formType) {
    clearTimeout(validationDebounceTimer);
    validationDebounceTimer = setTimeout(async () => {
        const idPrefix = formType === 'add' ? 'addPart' : 'edit_';
        const lineId = formType === 'add' ? `${idPrefix}Line` : `${idPrefix}line`;
        const modelId = formType === 'add' ? `${idPrefix}Model` : `${idPrefix}model`;
        const partNoId = formType === 'add' ? `${idPrefix}PartNo` : `${idPrefix}part_no`;

        const line = document.getElementById(lineId)?.value;
        const model = document.getElementById(modelId)?.value;
        const partNo = document.getElementById(partNoId)?.value;
        const iconElement = document.getElementById(`${formType}PartNoValidationIcon`);
        const helpTextElement = document.getElementById(`${formType}PartNoHelp`);

        if (!iconElement || !helpTextElement) return;
        iconElement.innerHTML = '';
        helpTextElement.textContent = '';
        
        if (!line || !model || !partNo) return; 

        iconElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        try {
            const params = new URLSearchParams({ action: 'validate_part_no', line, model, part_no: partNo });
            const response = await fetch(`${PD_API_URL}?${params.toString()}`);
            const result = await response.json();
            if (result.success && result.exists) {
                iconElement.innerHTML = '<span class="text-success">✔</span>';
                helpTextElement.textContent = 'Part No. is valid for this model.';
                helpTextElement.className = 'form-text text-success';
            } else {
                iconElement.innerHTML = '<span class="text-danger">✖</span>';
                helpTextElement.textContent = 'Part No. not found for this Line/Model.';
                helpTextElement.className = 'form-text text-danger';
            }
        } catch (error) {
            console.error('Validation failed:', error);
            iconElement.innerHTML = '<span class="text-warning">?</span>';
        }
    }, 500);
}

//======================================================================
// SECTION: MODAL OPENING FUNCTIONS
//======================================================================

function openAddPartModal() {
    document.getElementById('addPartForm')?.reset();
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    document.querySelector('#addPartModal input[name="log_date"]').value = localNow.toISOString().split('T')[0];
    document.querySelector('#addPartModal input[name="start_time"]').value = localNow.toISOString().split('T')[1].substring(0, 8);
    document.querySelector('#addPartModal input[name="end_time"]').value = document.querySelector('#addPartModal input[name="start_time"]').value;
    new bootstrap.Modal(document.getElementById('addPartModal')).show();
}

function openEditPartModal(data) {
    currentlyEditingData = data;
    const modal = document.getElementById('editPartModal');
    for (const key in data) {
        const input = modal.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key];
    }
    new bootstrap.Modal(modal).show();
}

function openAddEntryModal() {
    const modalId = 'addEntryModal';
    const form = document.getElementById('addEntryForm');
    if(form) form.reset();
    
    wipSelectedItem = null; 
    document.getElementById('entry_item_id').value = '';
    document.getElementById('entry_item_search').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function openEditEntryModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('editEntryModal');
    if (!modal) return;
    
    const localDateTime = new Date(new Date(rowData.entry_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    modal.querySelector('#edit_entry_id').value = rowData.entry_id;
    modal.querySelector('#edit_entry_time').value = localDateTime;
    modal.querySelector('#edit_wipModel').value = rowData.model || '';
    modal.querySelector('#edit_wipLine').value = rowData.line;
    modal.querySelector('#edit_wipPartNo').value = rowData.part_no;
    modal.querySelector('#edit_wipLotNo').value = rowData.lot_no || '';
    modal.querySelector('#edit_wipQuantityIn').value = rowData.quantity_in;
    modal.querySelector('#edit_wipRemark').value = rowData.remark || '';
    
    showBootstrapModal('editEntryModal');
}

function openAdjustStockModal(rowData) {
    const modal = document.getElementById('adjustStockModal');
    if (!modal) return;

    modal.querySelector('#adjust_part_no').value = rowData.part_no;
    modal.querySelector('#adjust_line').value = rowData.line;
    modal.querySelector('#adjust_model').value = rowData.model;
    
    modal.querySelector('#display_part_no').value = `${rowData.part_no} (${rowData.model} / ${rowData.line})`;
    modal.querySelector('#adjust_system_count').value = rowData.variance;
    
    modal.querySelector('#adjust_physical_count').value = '';
    modal.querySelector('#adjust_note').value = '';

    showBootstrapModal('adjustStockModal');
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Summary" และสร้างตารางสรุปผล
 * @param {HTMLElement} triggerEl - Element ที่ถูกกดเพื่อเปิด Modal
 */
function openSummaryModal(triggerEl) {
    modalTriggerElement = triggerEl; 
    
    const grandTotalContainer = document.getElementById('summaryGrandTotalContainer');
    const tableContainer = document.getElementById('summaryTableContainer');
    const summaryData = window.cachedSummary || [];
    const grandTotalData = window.cachedGrand || {};

    if (!tableContainer || !grandTotalContainer) return;

    let grandTotalHTML = '<strong>Grand Total: </strong>';
    if (grandTotalData) {
        grandTotalHTML += Object.entries(grandTotalData)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => `${key.toUpperCase()}: ${value || 0}`)
            .join(' | ');
    }
    grandTotalContainer.innerHTML = grandTotalHTML;

    tableContainer.innerHTML = '';
    if (summaryData.length === 0) {
        tableContainer.innerHTML = '<p class="text-center mt-3">No summary data to display.</p>';
        showBootstrapModal('summaryModal');
        return;
    }

    const table = document.createElement('table');
    table.className = 'table table-dark table-striped table-hover';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    
    const headers = ["Model", "Part No.", "Line", "FG", "NG", "HOLD", "REWORK", "SCRAP", "ETC."];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    summaryData.forEach(row => {
        const tr = tbody.insertRow();
        tr.insertCell().textContent = row.model;
        tr.insertCell().textContent = row.part_no;
        tr.insertCell().textContent = row.line;
        tr.insertCell().textContent = row.FG || 0;
        tr.insertCell().textContent = row.NG || 0;
        tr.insertCell().textContent = row.HOLD || 0;
        tr.insertCell().textContent = row.REWORK || 0;
        tr.insertCell().textContent = row.SCRAP || 0;
        tr.insertCell().textContent = row.ETC || 0;
    });

    tableContainer.appendChild(table);
    document.querySelector('#summaryModal .modal-title').textContent = 'Detailed Summary';

    const exportButton = document.getElementById('summaryModalExportButton');
    if (exportButton) {
        exportButton.setAttribute('onclick', 'exportSummaryToExcel()');
    }
    showBootstrapModal('summaryModal');
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Drill-Down Detail" และดึงข้อมูลมาแสดง
 * @param {object} item - ข้อมูลของแถวที่ถูกคลิก (ต้องมี line, model, part_no)
 */
async function openWipDetailModal(item) {
    const modalElement = document.getElementById('wipDetailModal');
    if (!modalElement) return;

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const modalTitle = document.getElementById('wipDetailModalLabel');
    const inTableBody = document.getElementById('wipDetailInTableBody');
    const outTableBody = document.getElementById('wipDetailOutTableBody');
    const totalInSpan = document.getElementById('wipDetailTotalIn');
    const totalOutSpan = document.getElementById('wipDetailTotalOut');

    let titleText = `Details for: ${item.part_no} (${item.line} / ${item.model})`;
    if (item.lot_no) {
        titleText += ` | Lot: ${item.lot_no}`;
    }
    modalTitle.textContent = titleText;
    inTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading IN records...</td></tr>';
    outTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading OUT records...</td></tr>';
    totalInSpan.textContent = '...';
    totalOutSpan.textContent = '...';
    modal.show();

    const params = new URLSearchParams({
        action: 'get_wip_drilldown_details',
        line: item.line,
        model: item.model,
        part_no: item.part_no,
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    if (item.lot_no) {
        params.append('lot_no', item.lot_no);
    }
    
    showSpinner();
    try {
        const response = await fetch(`${WIP_API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        // IN records
        inTableBody.innerHTML = '';
        let totalIn = 0;
        if (result.data.in_records.length > 0) {
            result.data.in_records.forEach(rec => {
                const tr = document.createElement('tr');
                const entryDate = new Date(rec.entry_time);
                tr.innerHTML = `
                    <td>${entryDate.toLocaleDateString('en-GB')} ${entryDate.toTimeString().substring(0, 8)}</td>
                    <td class="text-center px-3">${rec.lot_no || '-'}</td>
                    <td class="text-center px-3">${parseInt(rec.quantity_in).toLocaleString()}</td>
                `;
                inTableBody.appendChild(tr);
                totalIn += parseInt(rec.quantity_in);
            });
        } else {
            inTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No IN records found.</td></tr>';
        }
        totalInSpan.textContent = totalIn.toLocaleString();
        
        // OUT records
        outTableBody.innerHTML = '';
        let totalOut = 0;
        if (result.data.out_records.length > 0) {
            result.data.out_records.forEach(rec => {
                const tr = document.createElement('tr');
                const endTime = rec.log_time ? rec.log_time.substring(0, 8) : 'N/A';
                
                tr.innerHTML = `
                    <td>${new Date(rec.log_date).toLocaleDateString('en-GB')} ${endTime}</td>
                    <td class="text-center px-3">${rec.lot_no || '-'}</td>
                    <td class="text-center px-3">${parseInt(rec.count_value).toLocaleString()}</td>
                    <td class="text-center px-3"><span class="badge bg-secondary">${rec.count_type}</span></td>
                `;
                outTableBody.appendChild(tr);
                totalOut += parseInt(rec.count_value);
            });
        } else {
            outTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No OUT records found.</td></tr>';
        }
        totalOutSpan.textContent = totalOut.toLocaleString();

    } catch (error) {
        console.error('Failed to fetch drill-down details:', error);
        inTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        outTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading data.</td></tr>`;
    } finally {
        hideSpinner();
    }
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Summary" ของ Entry History
 */
function openHistorySummaryModal() {
    const tableContainer = document.getElementById('summaryTableContainer');
    const grandTotalContainer = document.getElementById('summaryGrandTotalContainer');
    const summaryData = window.cachedHistorySummary || [];

    if (!tableContainer || !grandTotalContainer) return;

    grandTotalContainer.innerHTML = '';
    tableContainer.innerHTML = '';
    
    if (summaryData.length === 0) {
        tableContainer.innerHTML = '<p class="text-center mt-3">No summary data to display.</p>';
        showBootstrapModal('summaryModal');
        return;
    }

    const table = document.createElement('table');
    table.className = 'table table-dark table-striped table-hover';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    
    const headers = ["Line", "Model", "Part No.", "Total Quantity In"];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    summaryData.forEach(row => {
        const tr = tbody.insertRow();
        tr.insertCell().textContent = row.line;
        tr.insertCell().textContent = row.model;
        tr.insertCell().textContent = row.part_no;
        tr.insertCell().textContent = parseInt(row.total_quantity_in).toLocaleString();
    });

    tableContainer.appendChild(table);
    document.querySelector('#summaryModal .modal-title').textContent = 'Entry History Summary';

    const exportButton = document.getElementById('summaryModalExportButton');
    if (exportButton) {
        exportButton.setAttribute('onclick', 'exportHistorySummaryToExcel()');
    }
    showBootstrapModal('summaryModal');
}

//======================================================================
// SECTION: DOMCONTENTLOADED - EVENT LISTENERS & FORM SUBMISSION
//======================================================================

/**
 * ฟังก์ชันกลางสำหรับจัดการการ Submit ฟอร์มทั้งหมดในหน้านี้
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;
    let endpoint = form.dataset.endpoint;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    let apiAction = '';
    let successCallback = null;

    // ตรวจสอบ data-action ของฟอร์ม เพื่อเลือกว่าจะให้ทำงานอย่างไร
    switch(action) {
        case 'addPart':
            apiAction = 'add_part';
            endpoint = PD_API_URL;
            successCallback = fetchPartsData;
            break;
        case 'editPart':
            apiAction = 'update_part';
            endpoint = PD_API_URL;
            successCallback = () => fetchPartsData(currentPage);
            break;
        case 'addEntry':
            // ** นี่คือ Logic ใหม่สำหรับระบบสต็อกกลาง **
            apiAction = 'execute_receipt';
            endpoint = WIP_API_URL;
            if (!data.item_id) {
                showToast('Please select a valid item from the search results.', 'var(--bs-warning)');
                return;
            }
            successCallback = fetchReceiptHistory; // เรียกฟังก์ชันแสดงผลตารางใหม่
            break;
        case 'editEntry':
            // ** Logic เก่ายังคงอยู่เหมือนเดิม **
            apiAction = 'update_wip_entry';
            endpoint = WIP_API_URL;
            successCallback = () => fetchOldHistoryData(wipCurrentPage); // เรียกฟังก์ชันแสดงผลตารางเก่า
            break;
    }

    if (!apiAction || !endpoint) {
        showToast('Form configuration error.', 'var(--bs-danger)');
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(endpoint, apiAction, 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            const modalId = form.closest('.modal').id;
            bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
            if (successCallback && typeof successCallback === 'function') {
                await successCallback();
            }
        }
    } finally {
        hideSpinner();
    }
}

// --- Main Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    populateModalDatalists();
    setupEntryAutocomplete(); // เรียกใช้ฟังก์ชัน Autocomplete จาก wip_handler.js

    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
});