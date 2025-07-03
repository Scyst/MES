//-- ตัวแปร Global สำหรับเก็บค่าคงที่และสถานะ --
let modalTriggerElement = null; //-- เก็บ Element ที่กดเพื่อเปิด Modal (สำหรับคืน Focus) --
const PD_API_URL = '../../api/pdTable/pdTableManage.php'; //-- API Endpoint สำหรับจัดการข้อมูล Production --
const WIP_API_URL = '../../api/wipManage/wipManage.php'; //-- API Endpoint สำหรับจัดการข้อมูล WIP --

/**
 * ฟังก์ชันกลางสำหรับเปิด Bootstrap Modal
 * @param {string} modalId - ID ของ Modal ที่จะเปิด
 */
function showBootstrapModal(modalId) { 
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        //-- ใช้ getOrCreateInstance เพื่อความปลอดภัยในการสร้างหรือดึง Instance ของ Modal --
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Add Part" และตั้งค่าวันที่/เวลาเริ่มต้น
 * @param {HTMLElement} triggerEl - Element ที่ถูกกดเพื่อเปิด Modal
 */
function openAddPartModal(triggerEl) {
    modalTriggerElement = triggerEl;
    const modal = document.getElementById('addPartModal');
    if (!modal) return;

    //-- ตั้งค่าวันที่และเวลาปัจจุบัน (ปรับเป็น Timezone +7) --
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    
    const dateStr = localNow.toISOString().split('T')[0];
    const timeStr = localNow.toISOString().split('T')[1].substring(0, 8);
    
    modal.querySelector('input[name="log_date"]').value = dateStr;
    modal.querySelector('input[name="log_time"]').value = timeStr;

    showBootstrapModal('addPartModal');
}

/**
 * ฟังก์ชันสำหรับเปิด Modal "Edit Part" และเติมข้อมูลเดิมลงในฟอร์ม
 * @param {object} rowData - ข้อมูลของแถวที่ต้องการแก้ไข
 * @param {HTMLElement} triggerEl - Element ที่ถูกกดเพื่อเปิด Modal
 */
function openEditModal(rowData, triggerEl) {
    modalTriggerElement = triggerEl; 
    const modal = document.getElementById('editPartModal');
    if (!modal) return;
    
    //-- วนลูปเพื่อเติมข้อมูลลงในทุก Input --
    for (const key in rowData) {
        const input = modal.querySelector(`#edit_${key}`);
        if (input) {
            //-- จัดการรูปแบบเวลาให้เป็น HH:mm:ss --
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
    //-- ดึงข้อมูลที่ Cache ไว้จาก Global Variable --
    const summaryData = window.cachedSummary || [];
    const grandTotalData = window.cachedGrand || {};

    if (!tableContainer || !grandTotalContainer) return;

    //-- สร้าง HTML สำหรับ Grand Total (แสดงเฉพาะค่าที่มากกว่า 0) --
    let grandTotalHTML = '<strong>Grand Total: </strong>';
    if (grandTotalData) {
        grandTotalHTML += Object.entries(grandTotalData)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => `${key.toUpperCase()}: ${value || 0}`)
            .join(' | ');
    }
    grandTotalContainer.innerHTML = grandTotalHTML;

    //-- สร้างตารางสรุปผลแบบ Dynamic --
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
    const headers = ["Model", "Part No.", "Lot No.", "FG", "NG", "HOLD", "REWORK", "SCRAP", "ETC."];
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
        tr.insertCell().textContent = row.lot_no || '';
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

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {

    /**
     * ฟังก์ชันกลางสำหรับจัดการการ Submit ฟอร์มผ่าน Fetch API
     * @param {HTMLFormElement} form - The form element.
     * @param {string} apiUrl - The API endpoint URL.
     * @param {string} action - The action parameter for the API.
     * @param {string} modalId - The ID of the modal containing the form.
     * @param {Function} onSuccess - Callback function to run on success.
     */
    const handleFormSubmit = async (form, apiUrl, action, modalId, onSuccess) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = Object.fromEntries(new FormData(form).entries());
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            try {
                //-- ส่ง Request ไปยัง API --
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
                        //-- รอให้ Animation การปิด Modal จบก่อน แล้วจึงค่อยเรียก onSuccess --
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            onSuccess(); 
                            //-- คืน Focus กลับไปที่ปุ่มที่กดเปิด Modal --
                            if (modalTriggerElement) modalTriggerElement.focus(); 
                        }, { once: true }); //-- ให้ Event Listener ทำงานแค่ครั้งเดียว --
                        modalInstance.hide();
                    }
                }
            } catch (error) {
                showToast(`An error occurred while processing your request.`, '#dc3545');
            }
        });
    };

    //-- ผูก Event Listener ให้กับฟอร์ม "Add Part" --
    const addPartForm = document.getElementById('addPartForm');
    if (addPartForm) {
        handleFormSubmit(addPartForm, PD_API_URL, 'add_part', 'addPartModal', () => {
            addPartForm.reset();
            //-- โหลดข้อมูลตารางใหม่ --
            if (typeof fetchPartsData === 'function') fetchPartsData(1); 
        });
    }

    //-- ผูก Event Listener ให้กับฟอร์ม "Edit Part" --
    const editPartForm = document.getElementById('editPartForm');
    if (editPartForm) {
        handleFormSubmit(editPartForm, PD_API_URL, 'update_part', 'editPartModal', () => {
            //-- โหลดข้อมูลตารางใหม่ในหน้าเดิม --
            if (typeof fetchPartsData === 'function') fetchPartsData(window.currentPage || 1); 
        });
    }

    //-- ผูก Event Listener ให้กับฟอร์ม "WIP Entry" --
    const wipEntryForm = document.getElementById('wipEntryForm');
    if (wipEntryForm) {
        handleFormSubmit(wipEntryForm, WIP_API_URL, 'log_wip_entry', 'addPartModal', () => {
            wipEntryForm.reset();
            //-- หากอยู่บน Tab WIP ให้โหลดข้อมูล WIP ใหม่ --
            if (document.getElementById('wip-report-pane')?.classList.contains('active')) {
                if (typeof fetchWipReport === 'function') fetchWipReport();
            }
        });
    }
});