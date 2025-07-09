//-- Global Variables & Constants --
let currentPage = 1;
let totalPages = 1;
const API_URL = '../../api/Stop_Cause/stopCauseManage.php';

/**
 * ฟังก์ชันหลักสำหรับดึงข้อมูล Stop Cause จาก API ตาม Filter และหน้าปัจจุบัน
 * @param {number} [page=1] - หมายเลขหน้าที่ต้องการดึงข้อมูล
 */
async function fetchStopData(page = 1) {
    currentPage = page;
    //-- รวบรวมค่า Filter ทั้งหมดจาก Input Fields --
    const filters = {
        cause: document.getElementById('filterCause')?.value,
        line: document.getElementById('filterLine')?.value,
        machine: document.getElementById('filterMachine')?.value,
        startDate: document.getElementById('filterStartDate')?.value,
        endDate: document.getElementById('filterEndDate')?.value,
    };
    const params = new URLSearchParams({ action: 'get_stop', page: currentPage, limit: 50, ...filters });

    try {
        //-- เรียก API และแปลงผลลัพธ์เป็น JSON --
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        //-- เรียกฟังก์ชันต่างๆ เพื่อแสดงผล --
        renderTable(result.data, canManage);
        renderPagination(result.page, result.total, result.limit);
        renderSummary(result.summary, result.grand_total_minutes);
    } catch (error) {
        //-- จัดการข้อผิดพลาดและแสดงในตาราง --
        console.error('Failed to fetch stop data:', error);
        document.getElementById('stopTableBody').innerHTML = `<tr><td colspan="11" class="text-center text-danger">Error loading data.</td></tr>`;
    }
}

/**
 * ฟังก์ชันสำหรับ Render ตารางข้อมูล Stop Cause
 * @param {Array<object>} data - ข้อมูลที่ได้จาก API
 * @param {boolean} canManage - ตัวแปรที่บอกว่าผู้ใช้มีสิทธิ์จัดการข้อมูลหรือไม่
 */
function renderTable(data, canManage) {
    const tbody = document.getElementById('stopTableBody');
    tbody.innerHTML = '';
    
    // กรณีไม่พบข้อมูล
    if (!data || data.length === 0) {
        // แก้ไข: ปรับ Colspan จาก 11 เป็น 10
        const colSpan = canManage ? 10 : 9;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">No records found.</td></tr>`;
        return;
    }

    // สร้างแถวและ Cell ของตารางจากข้อมูล
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        const createCell = (text) => { const td = document.createElement('td'); td.textContent = text; return td; };
        
        // แก้ไข: ลบบรรทัดที่สร้าง Cell ของ ID ออก
        // tr.appendChild(createCell(row.id));
        tr.appendChild(createCell(row.log_date));
        tr.appendChild(createCell(row.stop_begin));
        tr.appendChild(createCell(row.stop_end));
        tr.appendChild(createCell(row.duration));
        tr.appendChild(createCell(row.line));
        tr.appendChild(createCell(row.machine));
        tr.appendChild(createCell(row.cause));
        tr.appendChild(createCell(row.recovered_by));

        const noteTd = document.createElement('td');
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-truncate';
        noteDiv.title = row.note || '';
        noteDiv.textContent = row.note || '';
        noteTd.appendChild(noteDiv);
        tr.appendChild(noteTd);
        
        if (canManage) {
            const actionsTd = document.createElement('td');

            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex gap-1'; 

            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning w-100'; 
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => openEditModal(row.id));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger w-100'; 
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteStop(row.id));

            buttonWrapper.appendChild(editButton);
            buttonWrapper.appendChild(deleteButton);

            actionsTd.appendChild(buttonWrapper);
            tr.appendChild(actionsTd);
        }

        tbody.appendChild(tr);
    });
}

/**
 * ฟังก์ชันสำหรับ Render Pagination Controls
 */
function renderPagination(page, totalItems, limit) {
    totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    currentPage = parseInt(page);
    const paginationContainer = document.getElementById('paginationControls');
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    //-- ฟังก์ชันสร้าง item ของ Pagination --
    const createPageItem = (pageNum, text, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!isDisabled) {
            a.onclick = (e) => {
                e.preventDefault();
                fetchStopData(pageNum);
            };
        }
        li.appendChild(a);
        return li;
    };

    paginationContainer.appendChild(createPageItem(currentPage - 1, 'Previous', currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(createPageItem(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createPageItem(currentPage + 1, 'Next', currentPage === totalPages));
}

/**
 * ฟังก์ชันสำหรับ Render ข้อมูลสรุป (Summary)
 */
function renderSummary(summaryData, grandTotalMinutes) {
    const summaryContainer = document.getElementById('causeSummary');
    if (!summaryContainer) return;
    summaryContainer.innerHTML = '';

    const formatMins = (mins) => `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;

    const strong = document.createElement('strong');
    strong.textContent = `Total Downtime: ${formatMins(grandTotalMinutes || 0)}`;
    summaryContainer.appendChild(strong);

    //-- แสดงข้อมูลสรุปของแต่ละ Line --
    if (summaryData && summaryData.length > 0) {
        summaryData.forEach(item => {
            summaryContainer.appendChild(document.createTextNode(' | '));
            const summaryText = `${item.line}: ${item.count} stops (${formatMins(item.total_minutes)})`;
            summaryContainer.appendChild(document.createTextNode(summaryText));
        });
    }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลมาเติมใน Datalist (สำหรับ Autocomplete)
 */
async function populateDatalist(datalistId, action) {
    try {
        const response = await fetch(`${API_URL}?action=${action}`);
        const result = await response.json();
        if (result.success) {
            const datalist = document.getElementById(datalistId);
            if (datalist) {
                datalist.innerHTML = '';
                result.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    datalist.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error(`Failed to populate ${datalistId}:`, error);
    }
}

/**
 * ฟังก์ชันสำหรับจัดการการลบข้อมูล
 */
async function deleteStop(id) {
    if (!confirm(`Are you sure you want to delete Stop Cause ID ${id}?`)) return;
    try {
        const response = await fetch(`${API_URL}?action=delete_stop&id=${id}`);
        const result = await response.json();
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) fetchStopData(currentPage);
    } catch (error) {
        showToast('An error occurred while deleting.', '#dc3545');
    }
}

//-- ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงค่าใน Filter --
function handleFilterChange() {
    fetchStopData(1);
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    //-- เพิ่ม Debouncing ให้กับ Filter Inputs เพื่อลดการยิง API ขณะพิมพ์ --
    const filterInputs = ['filterCause', 'filterLine', 'filterMachine', 'filterStartDate', 'filterEndDate'];
    filterInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            clearTimeout(window.filterDebounceTimer);
            //-- รอ 500ms หลังผู้ใช้หยุดพิมพ์ จึงจะยิง API --
            window.filterDebounceTimer = setTimeout(handleFilterChange, 500);
        });
    });

    //-- โหลดข้อมูลสำหรับ Datalist --
    populateDatalist('causeListFilter', 'get_causes');
    populateDatalist('lineListFilter', 'get_lines');
    populateDatalist('machineListFilter', 'get_machines');
    
    //-- โหลดข้อมูลตารางครั้งแรก --
    fetchStopData(1);
});