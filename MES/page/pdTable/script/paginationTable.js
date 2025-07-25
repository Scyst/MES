//-- Global Variables & Constants --
let currentPage = 1;
let totalPages = 1;
const API_URL = '../../api/pdTable/pdTableManage.php';

function saveFiltersToLocalStorage() {
    const filters = {
        part_no: document.getElementById('filterPartNo')?.value,
        lot_no: document.getElementById('filterLotNo')?.value,
        line: document.getElementById('filterLine')?.value,
        model: document.getElementById('filterModel')?.value,
        count_type: document.getElementById('filterCountType')?.value,
        startDate: document.getElementById('filterStartDate')?.value,
        endDate: document.getElementById('filterEndDate')?.value,
    };
    localStorage.setItem('pdTableFilters', JSON.stringify(filters));
}

function loadFiltersFromLocalStorage() {
    const savedFilters = localStorage.getItem('pdTableFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        document.getElementById('filterPartNo').value = filters.part_no || '';
        document.getElementById('filterLotNo').value = filters.lot_no || '';
        document.getElementById('filterLine').value = filters.line || '';
        document.getElementById('filterModel').value = filters.model || '';
        document.getElementById('filterCountType').value = filters.count_type || '';
        document.getElementById('filterStartDate').value = filters.startDate || '';
        document.getElementById('filterEndDate').value = filters.endDate || '';
    }
}

/**
 * =================================================================
 * ฟังก์ชัน Pagination ที่ปรับปรุงใหม่ (ใช้เป็นฟังก์ชันกลาง)
 * =================================================================
 */
function renderAdvancedPagination(containerId, currentPage, totalPages, callbackFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    const createPageItem = (text, page) => {
        const li = document.createElement('li');
        const isActive = page === currentPage;
        const isDisabled = !page;
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!isDisabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                callbackFunction(page);
            });
        }
        li.appendChild(a);
        return li;
    };
    
    const createEllipsis = () => {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        const span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        return li;
    };

    ul.appendChild(createPageItem('Previous', currentPage > 1 ? currentPage - 1 : null));

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            ul.appendChild(createPageItem(i, i));
        }
    } else {
        ul.appendChild(createPageItem(1, 1));
        if (currentPage > 4) {
            ul.appendChild(createEllipsis());
        }

        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 4) {
            startPage = 2;
            endPage = 4;
        }
        if (currentPage >= totalPages - 3) {
            startPage = totalPages - 3;
            endPage = totalPages - 1;
        }

        for (let i = startPage; i <= endPage; i++) {
            ul.appendChild(createPageItem(i, i));
        }

        if (currentPage < totalPages - 3) {
            ul.appendChild(createEllipsis());
        }
        
        ul.appendChild(createPageItem(totalPages, totalPages));
    }

    ul.appendChild(createPageItem('Next', currentPage < totalPages ? currentPage + 1 : null));
    container.appendChild(ul);
}

// -- Element References --
const filterLine = document.getElementById('filterLine');
const filterModel = document.getElementById('filterModel');
const filterPartNo = document.getElementById('filterPartNo');
const lineList = document.getElementById('lineList');
const modelList = document.getElementById('modelList');
const partNoList = document.getElementById('partNoList');

/**
 * ฟังก์ชันกลางสำหรับอัปเดต Datalist
 */
function updateDatalist(datalistElement, options) {
    if (datalistElement) {
        datalistElement.innerHTML = options.map(opt => `<option value="${opt}"></option>`).join('');
    }
}

async function updateModelOptions() {
    const selectedLine = filterLine.value;
    filterModel.value = '';
    filterPartNo.value = '';
    updateDatalist(partNoList, []);

    showSpinner();
    try {
        if (selectedLine) {
            const response = await fetch(`${API_URL}?action=get_models_by_line&line=${selectedLine}`);
            const result = await response.json();
            if (result.success) {
                updateDatalist(modelList, result.data);
            }
        } else {
            updateDatalist(modelList, window.allModels || []);
        }
    } finally {
        hideSpinner();
    }
}

async function updatePartNoOptions() {
    const selectedLine = filterLine.value;
    const selectedModel = filterModel.value;
    filterPartNo.value = '';

    showSpinner();
    try {
        if (selectedModel) {
            const params = new URLSearchParams({ action: 'get_parts_by_model', model: selectedModel, line: selectedLine });
            const response = await fetch(`${API_URL}?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                updateDatalist(partNoList, result.data);
            }
        } else {
            updateDatalist(partNoList, window.allPartNos || []);
        }
    } finally {
        hideSpinner();
    }
}

async function populateAllDatalistsOnLoad() {
    showSpinner();
    try {
        const response = await fetch(`${API_URL}?action=get_datalist_options`);
        const result = await response.json();
        if (result.success) {
            window.allModels = result.models;
            window.allPartNos = result.partNos;
            updateDatalist(lineList, result.lines);
            updateDatalist(modelList, result.models);
            updateDatalist(partNoList, result.partNos);
        }
    } catch (error) {
        console.error('Failed to populate datalists:', error);
    } finally {
        hideSpinner();
    }
}

/**
 * ฟังก์ชันหลักสำหรับดึงข้อมูล Parts จาก API
 */
async function fetchPartsData(page = 1) {
    currentPage = page;
    const filters = {
        part_no: document.getElementById('filterPartNo')?.value,
        lot_no: document.getElementById('filterLotNo')?.value,
        line: document.getElementById('filterLine')?.value,
        model: document.getElementById('filterModel')?.value,
        count_type: document.getElementById('filterCountType')?.value,
        startDate: document.getElementById('filterStartDate')?.value,
        endDate: document.getElementById('filterEndDate')?.value,
    };
    const params = new URLSearchParams({ action: 'get_parts', page: currentPage, limit: 50, ...filters });

    showSpinner(); // <-- Spinner เดิมของคุณ
    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        renderTable(result.data, canManage);
        totalPages = Math.ceil(result.total / result.limit);
        renderAdvancedPagination('paginationControls', result.page, totalPages, fetchPartsData);
        renderSummary(result.summary, result.grand_total);
    } catch (error) {
        console.error('Failed to fetch parts data:', error);
        const errorColSpan = canManage ? 11 : 10;
        document.getElementById('partTableBody').innerHTML = `<tr><td colspan="${errorColSpan}" class="text-center text-danger">Error loading data.</td></tr>`;
    } finally {
        hideSpinner(); // <-- Spinner เดิมของคุณ
    }
}

/**
 * ฟังก์ชันสำหรับ Render ตารางข้อมูล Production
 * @param {Array<object>} data - ข้อมูลที่ได้จาก API
 * @param {boolean} canManage - ตัวแปรที่บอกว่าผู้ใช้มีสิทธิ์จัดการข้อมูลหรือไม่
 */
function renderTable(data, canManage) {
    const tbody = document.getElementById('partTableBody');
    tbody.innerHTML = ''; 
    
    if (!data || data.length === 0) {
        // ===== ส่วนที่แก้ไข: ปรับตัวเลข Colspan ให้ถูกต้อง =====
        const colSpan = canManage ? 11 : 10;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">No records found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        const createCell = (text) => {
            const td = document.createElement('td');
            td.textContent = text;
            return td;
        };
        
        const formattedDate = row.log_date ? new Date(row.log_date).toLocaleDateString('en-GB') : '';
        const formattedStartTime = row.start_time ? row.start_time.substring(0, 8) : '';
        const formattedTime = row.log_time ? row.log_time.substring(0, 8) : '';
        
        tr.appendChild(createCell(formattedDate));
        tr.appendChild(createCell(formattedStartTime));
        tr.appendChild(createCell(formattedTime));
        tr.appendChild(createCell(row.line));
        tr.appendChild(createCell(row.model));
        tr.appendChild(createCell(row.part_no));
        tr.appendChild(createCell(row.lot_no || ''));

        const qtyCell = createCell(row.count_value);
        qtyCell.classList.add('text-center-col');
        tr.appendChild(qtyCell);

        const typeCell = createCell(row.count_type);
        typeCell.classList.add('text-center-col');
        tr.appendChild(typeCell);
        
        const noteTd = document.createElement('td');
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-truncate';
        noteDiv.title = row.note || '';
        noteDiv.textContent = row.note || '';
        noteTd.appendChild(noteDiv);
        tr.appendChild(noteTd);
        
        if (canManage) {
            const actionsTd = document.createElement('td');
            actionsTd.classList.add('text-center-col');
            
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex justify-content-center gap-1'; 

            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning w-100'; 
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => openEditModal(row, editButton));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger w-100'; 
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => handleDelete(row.id));

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
                fetchPartsData(pageNum);
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
 * ฟังก์ชันสำหรับ Render Grand Total และเก็บข้อมูล Summary ไว้ใน Cache
 */
function renderSummary(summaryData, grandTotalData) {
    //-- เก็บข้อมูลไว้ใน Global Variable เพื่อให้ฟังก์ชันอื่น (เช่น Export) เรียกใช้ได้ --
    window.cachedSummary = summaryData || [];
    window.cachedGrand = grandTotalData || {};
    const grandSummaryContainer = document.getElementById('grandSummary');
    if (!grandSummaryContainer) return;
    //-- สร้าง HTML สำหรับ Grand Total (แสดงเฉพาะค่าที่มากกว่า 0) --
    let grandSummaryHTML = '<strong>Grand Total: </strong>';
    if (grandTotalData) {
        grandSummaryHTML += Object.entries(grandTotalData).filter(([, value]) => value > 0).map(([key, value]) => `${key.toUpperCase()}: ${value || 0}`).join(' | ');
    }
    grandSummaryContainer.innerHTML = grandSummaryHTML;
}

/**
 * ฟังก์ชันสำหรับจัดการการลบข้อมูล
 */
async function handleDelete(id) {
    if (!confirm(`Are you sure you want to delete Part ID ${id}?`)) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    showSpinner(); // <-- Spinner เดิมของคุณ
    try {
        const response = await fetch(`${API_URL}?action=delete_part`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({ id: id })
        });

        const result = await response.json();
        showToast(result.message, result.success ? '#28a745' : '#dc3545');

        if (result.success) {
            const rowCount = document.querySelectorAll('#partTableBody tr').length;
            const newPage = (rowCount === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
            await fetchPartsData(newPage);
        }
    } catch (error) {
        showToast('An error occurred while deleting the part.', '#dc3545');
    } finally {
        hideSpinner(); // <-- Spinner เดิมของคุณ
    }
}

function handleFilterChange() {
    saveFiltersToLocalStorage(); 
    
    const activePane = document.querySelector('#mainTabContent .tab-pane.active');
    if (!activePane) return;
    switch (activePane.id) {
        case 'production-history-pane':
            fetchPartsData(1);
            break;
        case 'entry-history-pane':
            if (typeof fetchHistoryData === 'function') fetchHistoryData();
            break;
        case 'wip-report-pane':
            if (typeof fetchWipReport === 'function') fetchWipReport();
            break;
        case 'wip-report-by-lot-pane':
            if (typeof fetchWipReportByLot === 'function') fetchWipReportByLot();
            break;
        case 'stock-count-pane':
            if (typeof fetchStockCountReport === 'function') fetchStockCountReport();
            break;
    }
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {

    loadFiltersFromLocalStorage();
    populateAllDatalistsOnLoad(); // <-- เรียกใช้ฟังก์ชันใหม่

    const debouncedFilterChange = () => {
        clearTimeout(window.filterDebounceTimer);
        window.filterDebounceTimer = setTimeout(handleFilterChange, 500);
    };

    document.getElementById('filterPartNo')?.addEventListener('input', debouncedFilterChange);
    document.getElementById('filterLotNo')?.addEventListener('input', debouncedFilterChange);
    document.getElementById('filterCountType')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterStartDate')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterEndDate')?.addEventListener('change', handleFilterChange);
    
    // --- เพิ่ม Event Listener พิเศษสำหรับ Datalist อัจฉริยะ ---
    if (filterLine) {
        filterLine.addEventListener('change', () => {
            updateModelOptions().then(() => {
                handleFilterChange();
            });
        });
    }
    if (filterModel) {
        filterModel.addEventListener('change', () => {
            updatePartNoOptions().then(() => {
                handleFilterChange();
            });
        });
    }

    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', handleFilterChange);
    });

    setTimeout(() => {
        const activeTabPane = document.querySelector('#mainTabContent .tab-pane.active');
        if (activeTabPane) {
            handleFilterChange();
        }
    }, 100); 
});