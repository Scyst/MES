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

function openAddPartModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addPartModal');
    if (!modal) return;
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    const dateStr = localNow.toISOString().split('T')[0];
    const timeStr = localNow.toISOString().split('T')[1].substring(0, 8);
    
    modal.querySelector('input[name="log_date"]').value = dateStr;
    modal.querySelector('input[name="log_time"]').value = timeStr;
    showBootstrapModal('addPartModal');
}

function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;
    for (const key in rowData) {
        const input = modal.querySelector(`#edit_${key}`);
        if (input) {
            if (key === 'log_time' && typeof rowData[key] === 'string') {
                input.value = rowData[key].substring(0, 8);
            } else {
                input.value = rowData[key];
            }
        }
    }
    showBootstrapModal('editPartModal');
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
    
    // แก้ไข: เปลี่ยน Headers ของตาราง
    const headers = ["Model", "Part No.", "Line", "FG", "NG", "HOLD", "REWORK", "SCRAP", "ETC."];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    summaryData.forEach(row => {
        const tr = tbody.insertRow();
        // แก้ไข: เปลี่ยนข้อมูลในแต่ละ Cell ให้ตรงกับ Headers ใหม่
        tr.insertCell().textContent = row.model;
        tr.insertCell().textContent = row.part_no;
        tr.insertCell().textContent = row.line; // เพิ่ม Line
        tr.insertCell().textContent = row.FG || 0;
        tr.insertCell().textContent = row.NG || 0;
        tr.insertCell().textContent = row.HOLD || 0;
        tr.insertCell().textContent = row.REWORK || 0;
        tr.insertCell().textContent = row.SCRAP || 0;
        tr.insertCell().textContent = row.ETC || 0;
    });

    tableContainer.appendChild(table);
    showBootstrapModal('summaryModal');
}

function openAddEntryModal(triggerEl) {
    modalTriggerElement = triggerEl;
    showBootstrapModal('addEntryModal');
}

// ฟังก์ชันใหม่สำหรับเปิด Modal แก้ไข Entry
function openEditEntryModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('editEntryModal');
    if (!modal) return;
    
    const localDateTime = new Date(new Date(rowData.entry_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    modal.querySelector('#edit_entry_id').value = rowData.entry_id;
    modal.querySelector('#edit_entry_time').value = localDateTime;
    modal.querySelector('#edit_wipModel').value = rowData.model || ''; // เพิ่มบรรทัดนี้
    modal.querySelector('#edit_wipLine').value = rowData.line;
    modal.querySelector('#edit_wipPartNo').value = rowData.part_no;
    modal.querySelector('#edit_wipLotNo').value = rowData.lot_no || '';
    modal.querySelector('#edit_wipQuantityIn').value = rowData.quantity_in;
    modal.querySelector('#edit_wipRemark').value = rowData.remark || '';
    
    showBootstrapModal('editEntryModal');
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Summary" ของ Entry History
 */
function openHistorySummaryModal() {
    const tableContainer = document.getElementById('summaryTableContainer');
    const grandTotalContainer = document.getElementById('summaryGrandTotalContainer');
    const summaryData = window.cachedHistorySummary || [];

    if (!tableContainer || !grandTotalContainer) return;

    // ซ่อน Grand Total เพราะหน้านี้ไม่มี
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
    // เปลี่ยน Title ของ Modal
    document.querySelector('#summaryModal .modal-title').textContent = 'Entry History Summary';
    // เปลี่ยนฟังก์ชันของปุ่ม Export ใน Modal
    document.querySelector('#summaryModal button[onclick="exportSummaryToExcel()"]').setAttribute('onclick', 'exportHistorySummaryToExcel()');
    showBootstrapModal('summaryModal');
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    const handleFormSubmit = async (form, apiUrl, action, modalId, onSuccess) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
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
                    const modalElement = document.getElementById(modalId);
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            onSuccess(); 
                            if (modalTriggerElement) modalTriggerElement.focus(); 
                        }, { once: true });
                        modalInstance.hide();
                    }
                }
            } catch (error) {
                showToast(`An error occurred while processing your request.`, '#dc3545');
            }
        });
    };

    const addPartForm = document.getElementById('addPartForm');
    if (addPartForm) {
        handleFormSubmit(addPartForm, PD_API_URL, 'add_part', 'addPartModal', () => {
            addPartForm.reset();
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
});