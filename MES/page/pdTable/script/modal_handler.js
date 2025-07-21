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
    modal.querySelector('input[name="start_time"]').value = timeStr; // ตั้งค่าเวลาเริ่มต้น
    modal.querySelector('input[name="end_time"]').value = timeStr;   // ตั้งค่าเวลาสิ้นสุด

    const lastData = JSON.parse(localStorage.getItem('lastEntryData'));
    if (lastData) {
        modal.querySelector('input[name="line"]').value = lastData.line || '';
        modal.querySelector('input[name="model"]').value = lastData.model || '';
        modal.querySelector('input[name="part_no"]').value = lastData.part_no || '';
    }
    showBootstrapModal('addPartModal');
}


function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;
    
    // ===== ส่วนที่แก้ไข: เติมข้อมูลลงในช่องที่ถูกต้อง =====
    for (const key in rowData) {
        // เปลี่ยน log_time เป็น end_time สำหรับ input field
        const inputKey = key === 'log_time' ? 'end_time' : key;
        const input = modal.querySelector(`#edit_${inputKey}`);
        
        if (input) {
            // จัดการ format ของเวลาให้เป็น HH:mm:ss
            if ((key === 'log_time' || key === 'start_time') && typeof rowData[key] === 'string') {
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

    document.querySelector('#summaryModal .modal-title').textContent = 'Detailed Summary';

    const exportButton = document.getElementById('summaryModalExportButton');
    if (exportButton) {
        exportButton.setAttribute('onclick', 'exportSummaryToExcel()');
    }

    showBootstrapModal('summaryModal');
}

function openAddEntryModal(triggerEl) {
    modalTriggerElement = triggerEl;

    // --- ส่วนที่เพิ่ม: กรอกข้อมูลล่าสุดอัตโนมัติ ---
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

/**
 * ฟังก์ชันสำหรับเปิด Modal "Stock Adjustment"
 * @param {object} rowData ข้อมูลของแถวที่ถูกเลือก (line, model, part_no, variance)
 */
function openAdjustStockModal(rowData) {
    const modal = document.getElementById('adjustStockModal');
    if (!modal) return;

    // เติมข้อมูลที่ซ่อนไว้และที่แสดงบนฟอร์ม
    modal.querySelector('#adjust_part_no').value = rowData.part_no;
    modal.querySelector('#adjust_line').value = rowData.line;
    modal.querySelector('#adjust_model').value = rowData.model;
    
    modal.querySelector('#display_part_no').value = `${rowData.part_no} (${rowData.model} / ${rowData.line})`;
    modal.querySelector('#adjust_system_count').value = rowData.variance; // 'variance' is the on-hand count
    
    // ล้างค่าที่เคยกรอกไว้
    modal.querySelector('#adjust_physical_count').value = '';
    modal.querySelector('#adjust_note').value = '';

    showBootstrapModal('adjustStockModal');
}
/**
 * ฟังก์ชันสำหรับเปิด Modal "Drill-Down Detail" และดึงข้อมูลมาแสดง
 * @param {object} item - ข้อมูลของแถวที่ถูกคลิก (ต้องมี line, model, part_no)
 */
async function openWipDetailModal(item) {
    const modalElement = document.getElementById('wipDetailModal');
    if (!modalElement) return;

    // 1. เตรียม Modal และแสดงสถานะ "Loading..."
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

    // 2. สร้าง URL และยิง API เพื่อดึงข้อมูล
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

    const WIP_API_URL = '../../api/pdTable/wipManage.php';

    try {
        const response = await fetch(`${WIP_API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        // 3. แสดงผลข้อมูลฝั่ง IN
        inTableBody.innerHTML = '';
        let totalIn = 0;
        if (result.data.in_records.length > 0) {
            result.data.in_records.forEach(rec => {
                const tr = document.createElement('tr');
                const entryDate = new Date(rec.entry_time);
                // ========== แก้ไข: ลบ Operator และเพิ่ม class ให้ Qty ==========
                tr.innerHTML = `
                    <td>${entryDate.toLocaleDateString('en-GB')} ${entryDate.toTimeString().substring(0, 8)}</td>
                    <td class="text-center px-3">${rec.lot_no || '-'}</td>
                    <td class="text-center px-3">${parseInt(rec.quantity_in).toLocaleString()}</td>
                `;
                inTableBody.appendChild(tr);
                totalIn += parseInt(rec.quantity_in);
            });
        } else {
            // แก้ไข: ปรับ colspan
            inTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No IN records found.</td></tr>';
        }
        totalInSpan.textContent = totalIn.toLocaleString();
        
        // 4. แสดงผลข้อมูลฝั่ง OUT
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
    }
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
                    }
                }
            } catch (error) {
                showToast(`An error occurred while processing your request.`, '#dc3545');
            }
        });
    };

    const addPartLotNoInput = document.getElementById('addPartLotNo');
    const activeLotList = document.getElementById('activeLotList');

    if (addPartLotNoInput && activeLotList) {
        let debounceTimer;
        addPartLotNoInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const term = addPartLotNoInput.value;
                const partNo = document.getElementById('addPartPartNo').value;
                const line = document.getElementById('addPartLine').value;

                if (term.length < 2 || !partNo || !line) {
                    activeLotList.innerHTML = '';
                    return;
                }

                try {
                    const params = new URLSearchParams({ action: 'search_active_lots', part_no: partNo, line: line, term: term });
                    const response = await fetch(`${WIP_API_URL}?${params.toString()}`);
                    const result = await response.json();
                    
                    activeLotList.innerHTML = '';
                    if (result.success && result.data) {
                        result.data.forEach(lot => {
                            const option = document.createElement('option');
                            option.value = lot;
                            activeLotList.appendChild(option);
                        });
                    }
                } catch (error) {
                    console.error('Failed to search active lots:', error);
                }
            }, 500); // Debounce 500ms
        });
    }

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
});