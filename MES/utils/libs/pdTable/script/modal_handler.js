"use strict";

let modalTriggerElement = null;
const PD_API_URL = 'api/pdTableManage.php';
const WIP_API_URL = 'api/wipManage.php';

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

async function openAddPartModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addPartModal');
    if (!modal) return;

    document.getElementById('addPartForm')?.reset();
    document.getElementById('addPartNoValidationIcon').innerHTML = '';
    document.getElementById('addPartNoHelp').textContent = '';
    updateModalDatalist('addModelList', []);
    updateModalDatalist('addPartNoList', []);

    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    modal.querySelector('input[name="log_date"]').value = localNow.toISOString().split('T')[0];
    modal.querySelector('input[name="start_time"]').value = localNow.toISOString().split('T')[1].substring(0, 8);
    modal.querySelector('input[name="end_time"]').value = modal.querySelector('input[name="start_time"]').value;

    const lastData = JSON.parse(localStorage.getItem('lastEntryData'));
    if (lastData) {
        modal.querySelector('#addPartLine').value = lastData.line || '';
        modal.querySelector('#addPartModel').value = lastData.model || '';
        modal.querySelector('#addPartPartNo').value = lastData.part_no || '';
    }

    showBootstrapModal('addPartModal');
    
    await updateModelOptions('add');
    await updatePartNoOptions('add');
    handlePartNoValidation('add');
}

async function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;

    document.getElementById('editPartForm')?.reset();
    document.getElementById('editPartNoValidationIcon').innerHTML = '';
    document.getElementById('editPartNoHelp').textContent = '';
    updateModalDatalist('editModelList', []);
    updateModalDatalist('editPartNoList', []);

    for (const key in rowData) {
        const inputKey = key === 'log_time' ? 'end_time' : key;
        const input = modal.querySelector(`#edit_${inputKey}`);
        if (input) {
            input.value = (key === 'log_time' || key === 'start_time') && typeof rowData[key] === 'string'
                ? rowData[key].substring(0, 8)
                : rowData[key];
        }
    }

    showBootstrapModal('editPartModal');
    
    await updateModelOptions('edit');
    await updatePartNoOptions('edit');
    handlePartNoValidation('edit');
}

function openAddEntryModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addEntryModal');
    if (modal) {
        const lastData = JSON.parse(localStorage.getItem('lastEntryData'));
        if (lastData) {
            modal.querySelector('input[name="line"]').value = lastData.line || '';
            modal.querySelector('input[name="model"]').value = lastData.model || '';
            modal.querySelector('input[name="part_no"]').value = lastData.part_no || '';
        }
    }
    showBootstrapModal('addEntryModal');
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
    table.className = 'table  table-striped table-hover';
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
    table.className = 'table  table-striped table-hover';
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

document.addEventListener('DOMContentLoaded', () => {

    // --- Setup for Add/Edit Part Modals ---
    const setupFormEventListeners = (formType) => {
        const isAdd = formType === 'add';
        const lineInput = document.getElementById(isAdd ? 'addPartLine' : 'edit_line');
        const modelInput = document.getElementById(isAdd ? 'addPartModel' : 'edit_model');
        const partNoInput = document.getElementById(isAdd ? 'addPartPartNo' : 'edit_part_no');

        lineInput?.addEventListener('change', async () => {
            if (modelInput) modelInput.value = '';
            if (partNoInput) partNoInput.value = '';
            await updateModelOptions(formType);
            updatePartNoOptions(formType); 
            handlePartNoValidation(formType);
        });

        modelInput?.addEventListener('change', async () => {
            if (partNoInput) partNoInput.value = '';
            await updatePartNoOptions(formType);
            handlePartNoValidation(formType);
        });

        partNoInput?.addEventListener('input', () => {
            handlePartNoValidation(formType);
        });
    };

    setupFormEventListeners('add');
    setupFormEventListeners('edit');
    
    // --- Central Form Submission Handler ---
    const handleFormSubmit = async (form, apiUrl, action, modalId, onSuccess) => {
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            showSpinner();
            try {
                const response = await fetch(`${apiUrl}?action=${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) {
                    if (modalId === 'addPartModal' || modalId === 'addEntryModal') {
                        localStorage.setItem('lastEntryData', JSON.stringify({
                            line: payload.line, model: payload.model, part_no: payload.part_no
                        }));
                    }
                    const modalElement = document.getElementById(modalId);
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                         modalElement.addEventListener('hidden.bs.modal', () => {
                            if(onSuccess) onSuccess(); 
                            if (modalTriggerElement) modalTriggerElement.focus(); 
                        }, { once: true });
                        modalInstance.hide();
                    } else {
                       if(onSuccess) onSuccess(); // Fallback
                    }
                }
            } catch (error) {
                console.error("Form submission error:", error);
                showToast(`An error occurred while processing your request.`, '#dc3545');
            } finally {
                hideSpinner();
            }
        });
    };

    // --- Link all forms to the handler ---
    handleFormSubmit(document.getElementById('addPartForm'), PD_API_URL, 'add_part', 'addPartModal', () => {
        if (typeof fetchPartsData === 'function') fetchPartsData(1);
    });

    handleFormSubmit(document.getElementById('editPartForm'), PD_API_URL, 'update_part', 'editPartModal', () => {
        if (typeof fetchPartsData === 'function') fetchPartsData(window.currentPage || 1);
    });
    
    const wipEntryForm = document.getElementById('wipEntryForm');
    handleFormSubmit(wipEntryForm, WIP_API_URL, 'log_wip_entry', 'addEntryModal', () => {
        if(wipEntryForm) wipEntryForm.reset();
        if (document.getElementById('entry-history-pane')?.classList.contains('active')) {
            if (typeof fetchHistoryData === 'function') fetchHistoryData();
        }
    });

    handleFormSubmit(document.getElementById('editWipEntryForm'), WIP_API_URL, 'update_wip_entry', 'editEntryModal', () => {
        if (typeof fetchHistoryData === 'function') fetchHistoryData();
    });

    handleFormSubmit(document.getElementById('adjustStockForm'), WIP_API_URL, 'adjust_stock', 'adjustStockModal', () => {
        if (typeof fetchStockCountReport === 'function') fetchStockCountReport();
    });
});