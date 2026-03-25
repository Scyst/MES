let currentPage = 1;
let totalPages = 1;
const API_URL = 'api/stopCauseManage.php';

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    // แก้บั๊ก Safari (iOS) แปลงวันที่ไม่ได้
    const safeString = dateTimeString.replace(' ', 'T');
    const date = new Date(safeString);
    
    if (isNaN(date.getTime())) return dateTimeString;

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function fetchStopData(page = 1) {
    currentPage = page;

    const getValue = (id) => document.getElementById(id)?.value || '';

    const filters = {
        cause: getValue('filterCause'),
        line: getValue('filterLine'),
        machine: getValue('filterMachine'),
        startDate: getValue('filterStartDate'),
        endDate: getValue('filterEndDate'),
    };

    const params = new URLSearchParams({ 
        action: 'get_stops', 
        page: currentPage, 
        limit: 50, 
        ...filters 
    });

    if (typeof showSpinner === 'function') showSpinner();
    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        // ป้องกัน Error กรณีไม่ได้ประกาศตัวแปร canManage จากฝั่ง PHP
        const hasManageAccess = typeof canManage !== 'undefined' ? canManage : false;
        
        renderTable(result.data, hasManageAccess);
        renderPagination(result.page, result.total, result.limit);
        renderSummary(result.summary, result.grand_total_minutes);
    } catch (error) {
        console.error('Failed to fetch stop data:', error);
        const tbody = document.getElementById('stopTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error loading data.</td></tr>`;
    } finally {
        if (typeof hideSpinner === 'function') hideSpinner();
    }
}

function renderTable(data, hasManageAccess) {
    const tbody = document.getElementById('stopTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const colSpan = hasManageAccess ? 10 : 9;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted py-4">No records found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        const createCell = (text) => { 
            const td = document.createElement('td'); 
            td.textContent = text || '-'; 
            return td; 
        };
        
        tr.appendChild(createCell(row.log_date));
        tr.appendChild(createCell(formatDateTime(row.stop_begin)));
        tr.appendChild(createCell(formatDateTime(row.stop_end)));
        tr.appendChild(createCell(row.duration));
        tr.appendChild(createCell(row.line));
        tr.appendChild(createCell(row.machine));
        tr.appendChild(createCell(row.cause));
        tr.appendChild(createCell(row.recovered_by));

        const noteTd = document.createElement('td');
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-truncate';
        noteDiv.title = row.note || '';
        noteDiv.textContent = row.note || '-';
        noteTd.appendChild(noteDiv);
        tr.appendChild(noteTd);
        
        if (hasManageAccess) {
            const actionsTd = document.createElement('td');
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex gap-1 justify-content-center'; 

            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-warning'; 
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'Edit';
            editButton.addEventListener('click', () => {
                if (typeof openEditModal === 'function') openEditModal(row.id, editButton);
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger'; 
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Delete';
            deleteButton.addEventListener('click', () => deleteStop(row.id));

            buttonWrapper.appendChild(editButton);
            buttonWrapper.appendChild(deleteButton);
            actionsTd.appendChild(buttonWrapper);
            tr.appendChild(actionsTd);
        }

        tbody.appendChild(tr);
    });
}

function renderPagination(page, totalItems, limit) {
    totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    currentPage = parseInt(page);
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const createItem = (pageNum, text, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = text;
        if (!isDisabled && pageNum !== null) {
            a.onclick = (e) => {
                e.preventDefault();
                fetchStopData(pageNum);
            };
        }
        li.appendChild(a);
        return li;
    };

    container.appendChild(createItem(currentPage - 1, '&laquo;', currentPage === 1));

    // Smart Pagination (แสดงผลหน้าสูงสุด 5 หน้า เพื่อไม่ให้ล้นจอมือถือ)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        container.appendChild(createItem(1, '1'));
        if (startPage > 2) container.appendChild(createItem(null, '...', true));
    }

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createItem(i, i, false, i === currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) container.appendChild(createItem(null, '...', true));
        container.appendChild(createItem(totalPages, totalPages));
    }

    container.appendChild(createItem(currentPage + 1, '&raquo;', currentPage === totalPages));
}

function renderSummary(summaryData, grandTotalMinutes) {
    const summaryContainer = document.getElementById('causeSummary');
    if (!summaryContainer) return;
    summaryContainer.innerHTML = '';

    const formatMins = (mins) => `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;

    const strong = document.createElement('strong');
    strong.className = 'text-danger me-2';
    strong.textContent = `Total Downtime: ${formatMins(grandTotalMinutes || 0)}`;
    summaryContainer.appendChild(strong);

    if (summaryData && summaryData.length > 0) {
        let summaryTexts = summaryData.map(item => `<span class="badge bg-secondary me-1">${item.line}: ${item.count} stops (${formatMins(item.total_minutes)})</span>`);
        summaryContainer.insertAdjacentHTML('beforeend', summaryTexts.join(''));
    }
}

async function populateDatalist(datalistId, action) {
    try {
        const response = await fetch(`${API_URL}?action=${action}`);
        const result = await response.json();
        if (result.success) {
            const datalist = document.getElementById(datalistId);
            if (datalist) {
                datalist.innerHTML = result.data.map(item => `<option value="${item}"></option>`).join(''); 
            }
        }
    } catch (error) {}
}

async function deleteStop(id) {
    if (!confirm(`Are you sure you want to delete Stop Cause ID ${id}?`)) return;

    if (typeof showSpinner === 'function') showSpinner(); 
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const response = await fetch(`${API_URL}?action=delete_stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({ id: id })
        });

        const result = await response.json();
        
        if (typeof showToast === 'function') {
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
        } else {
            alert(result.message);
        }

        if (result.success) {
            const tbody = document.getElementById('stopTableBody');
            const rowCount = tbody ? tbody.rows.length : 0;
            const targetPage = (rowCount <= 1 && currentPage > 1) ? currentPage - 1 : currentPage;
            await fetchStopData(targetPage);
        }
    } catch (error) {
        if (typeof showToast === 'function') showToast('An error occurred while deleting.', '#dc3545');
    } finally {
        if (typeof hideSpinner === 'function') hideSpinner(); 
    }
}

function handleFilterChange() {
    fetchStopData(1);
}

document.addEventListener('DOMContentLoaded', () => {
    const filterInputs = ['filterCause', 'filterLine', 'filterMachine', 'filterStartDate', 'filterEndDate'];
    filterInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            clearTimeout(window.filterDebounceTimer);
            window.filterDebounceTimer = setTimeout(handleFilterChange, 500);
        });
    });

    populateDatalist('causeListFilter', 'get_causes');
    populateDatalist('lineListFilter', 'get_lines');
    populateDatalist('machineListFilter', 'get_machines');
    
    // Load initial data
    if (document.getElementById('stopTableBody')) {
        fetchStopData(1);
    }
});