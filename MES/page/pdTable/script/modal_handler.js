"use strict";

let modalTriggerElement = null;
const PD_API_URL = '../../api/pdTable/pdTableManage.php';
const WIP_API_URL = '../../api/pdTable/wipManage.php';

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

async function openAddPartModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addPartModal');
    if (!modal) return;

    // 1. รีเซ็ตฟอร์มและสถานะ
    document.getElementById('addPartForm')?.reset();
    document.getElementById('addPartNoValidationIcon').innerHTML = '';
    document.getElementById('addPartNoHelp').textContent = '';
    updateModalDatalist('addModelList', []);
    updateModalDatalist('addPartNoList', []);

    // 2. ตั้งค่าวันที่และเวลา
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    modal.querySelector('input[name="log_date"]').value = localNow.toISOString().split('T')[0];
    modal.querySelector('input[name="start_time"]').value = localNow.toISOString().split('T')[1].substring(0, 8);
    modal.querySelector('input[name="end_time"]').value = modal.querySelector('input[name="start_time"]').value;

    // 3. กรอกข้อมูลล่าสุด (ถ้ามี)
    const lastData = JSON.parse(localStorage.getItem('lastEntryData'));
    if (lastData) {
        modal.querySelector('#addPartLine').value = lastData.line || '';
        modal.querySelector('#addPartModel').value = lastData.model || '';
        modal.querySelector('#addPartPartNo').value = lastData.part_no || '';
    }

    // 4. แสดง Modal
    showBootstrapModal('addPartModal');
    
    // 5. โหลด Datalist ทั้งหมดตามลำดับ อย่างถูกต้อง
    await updateModelOptions('add');
    await updatePartNoOptions('add');
    handlePartNoValidation('add');
}

async function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;

    // 1. รีเซ็ตฟอร์มและสถานะ
    document.getElementById('editPartForm')?.reset();
    document.getElementById('editPartNoValidationIcon').innerHTML = '';
    document.getElementById('editPartNoHelp').textContent = '';
    updateModalDatalist('editModelList', []);
    updateModalDatalist('editPartNoList', []);

    // 2. กรอกข้อมูลจากแถวที่เลือก
    for (const key in rowData) {
        const inputKey = key === 'log_time' ? 'end_time' : key;
        const input = modal.querySelector(`#edit_${inputKey}`);
        if (input) {
            input.value = (key === 'log_time' || key === 'start_time') && typeof rowData[key] === 'string'
                ? rowData[key].substring(0, 8)
                : rowData[key];
        }
    }

    // 3. แสดง Modal
    showBootstrapModal('editPartModal');
    
    // 4. โหลด Datalist ทั้งหมดตามลำดับ อย่างถูกต้อง
    await updateModelOptions('edit');
    await updatePartNoOptions('edit');
    handlePartNoValidation('edit');
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
        
        if (!line || !model || !partNo) {
            return; 
        }

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

document.addEventListener('DOMContentLoaded', () => {

    const setupFormEventListeners = (formType) => {
        const isAdd = formType === 'add';
        const lineInput = document.getElementById(isAdd ? 'addPartLine' : 'edit_line');
        const modelInput = document.getElementById(isAdd ? 'addPartModel' : 'edit_model');
        const partNoInput = document.getElementById(isAdd ? 'addPartPartNo' : 'edit_part_no');

        lineInput?.addEventListener('change', async () => {
            if (modelInput) modelInput.value = '';
            if (partNoInput) partNoInput.value = '';
            await updateModelOptions(formType);
            updatePartNoOptions(formType); // ไม่ต้อง await เพราะไม่มี model value
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
    
    // --- โค้ดส่วนจัดการ Submit Form และอื่นๆ (ไม่ต้องแก้ไข) ---
    const handleFormSubmit = async (form, apiUrl, action, modalId, onSuccess) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            showSpinner();
            try {
                const response = await fetch(`${apiUrl}?action=${action}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken 
                    },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if (result.success) {
                    if (modalId === 'addPartModal' || modalId === 'addEntryModal') {
                        const dataToStore = {
                            line: payload.line,
                            model: payload.model,
                            part_no: payload.part_no
                        };
                        localStorage.setItem('lastEntryData', JSON.stringify(dataToStore));
                    }
                    const modalElement = document.getElementById(modalId);
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                         modalElement.addEventListener('hidden.bs.modal', () => {
                            onSuccess(); 
                            if (modalTriggerElement) modalTriggerElement.focus(); 
                        }, { once: true });
                        modalInstance.hide();
                    } else {
                       onSuccess(); // Fallback
                    }
                }
            } catch (error) {
                showToast(`An error occurred while processing your request.`, '#dc3545');
            } finally {
                hideSpinner();
            }
        });
    };

    const addPartForm = document.getElementById('addPartForm');
    if (addPartForm) {
        handleFormSubmit(addPartForm, PD_API_URL, 'add_part', 'addPartModal', () => {
            if (typeof fetchPartsData === 'function') fetchPartsData(1); 
        });
    }

    const editPartForm = document.getElementById('editPartForm');
    if (editPartForm) {
        handleFormSubmit(editPartForm, PD_API_URL, 'update_part', 'editPartModal', () => {
            if (typeof fetchPartsData === 'function') fetchPartsData(window.currentPage || 1); 
        });
    }

    const wipEntryForm = document.getElementById('wipEntryForm');
    if (wipEntryForm) {
        handleFormSubmit(wipEntryForm, WIP_API_URL, 'log_wip_entry', 'addEntryModal', () => {
            wipEntryForm.reset();
            if (document.getElementById('entry-history-pane')?.classList.contains('active')) {
                if (typeof fetchHistoryData === 'function') fetchHistoryData();
            }
        });
    }

    // เพิ่ม Listener สำหรับฟอร์มแก้ไข Entry
    const editWipEntryForm = document.getElementById('editWipEntryForm');
    if (editWipEntryForm) {
        handleFormSubmit(editWipEntryForm, WIP_API_URL, 'update_wip_entry', 'editEntryModal', () => {
            if (typeof fetchHistoryData === 'function') fetchHistoryData();
        });
    }

    const adjustStockForm = document.getElementById('adjustStockForm');
    if (adjustStockForm) {
        // เราจะใช้ wipManage.php สำหรับ action นี้
        handleFormSubmit(adjustStockForm, WIP_API_URL, 'adjust_stock', 'adjustStockModal', () => {
            // โหลดข้อมูลของ On-Hand Inventory ใหม่หลังจากปรับยอดสำเร็จ
            if (typeof fetchStockCountReport === 'function') {
                fetchStockCountReport();
            }
        });
    }

    const addPartLine = document.getElementById('addPartLine');
    const addPartModel = document.getElementById('addPartModel');
    const addPartPartNo = document.getElementById('addPartPartNo');

    if(addPartLine) {
        addPartLine.addEventListener('change', async () => {
            if(addPartModel) addPartModel.value = '';
            if(addPartPartNo) addPartPartNo.value = '';
            await updateFormDependencies('add');
            handlePartNoValidation('add');
        });
    }
    if(addPartModel) {
        addPartModel.addEventListener('change', async () => {
            if(addPartPartNo) addPartPartNo.value = '';
            await updateFormDependencies('add');
            handlePartNoValidation('add');
        });
    }
    if(addPartPartNo) {
        addPartPartNo.addEventListener('input', () => handlePartNoValidation('add'));
    }

    // ===== Event Listeners สำหรับ Edit Part Modal =====
    const editLine = document.getElementById('edit_line');
    const editModel = document.getElementById('edit_model');
    const editPartNo = document.getElementById('edit_part_no');

    if(editLine) {
        editLine.addEventListener('change', async () => {
            if(editModel) editModel.value = '';
            if(editPartNo) editPartNo.value = '';
            await updateFormDependencies('edit');
            handlePartNoValidation('edit');
        });
    }
    if(editModel) {
        editModel.addEventListener('change', async () => {
            if(editPartNo) editPartNo.value = '';
            await updateFormDependencies('edit');
            handlePartNoValidation('edit');
        });
    }
    if(editPartNo) {
        editPartNo.addEventListener('input', () => handlePartNoValidation('edit'));
    }
});

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