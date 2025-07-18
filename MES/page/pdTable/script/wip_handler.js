function renderGenericPagination(containerId, page, totalItems, limit, callbackFunction) {
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    const currentPage = parseInt(page);
    const paginationContainer = document.getElementById(containerId);
    if (!paginationContainer) return;

    paginationContainer.innerHTML = ''; 

    if (totalPages <= 1) return;

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
                callbackFunction(pageNum);
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
 * =================================================================
 * ฟังก์ชันที่ถูกปรับปรุง
 * =================================================================
 */

async function fetchWipReport(page = 1) {
    const reportBody = document.getElementById('wipReportTableBody');
    if (!reportBody) return;
    reportBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading Report...</td></tr>';
    
    const params = new URLSearchParams({
        page: page, // เพิ่ม page
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_wip_report&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.cachedWipReport = result.data; // แก้ไข: ใช้ result.data

        reportBody.innerHTML = '';
        if (result.data.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="6" class="text-center">No WIP data found.</td></tr>';
        } else {
            result.data.forEach(item => {
                // ... (ส่วน render ตารางเหมือนเดิม) ...
                 const variance = parseInt(item.variance);
                 let textColorClass = '';
                 let varianceText = variance.toLocaleString();

                 if (variance > 0) {
                     textColorClass = 'text-warning';
                 } else if (variance < 0) {
                     textColorClass = 'text-danger';
                 }

                 const tr = document.createElement('tr');
                 tr.innerHTML = `
                     <td>${item.part_no}</td>
                     <td>${item.line}</td>
                     <td>${item.model}</td>
                     <td style="text-align: center;">${parseInt(item.total_in).toLocaleString()}</td>
                     <td style="text-align: center;">${parseInt(item.total_out).toLocaleString()}</td>
                     <td class="fw-bold ${textColorClass}" style="text-align: center;">${varianceText}</td>
                 `;
                 reportBody.appendChild(tr);
            });
        }
        // เรียกใช้ฟังก์ชัน render pagination
        renderGenericPagination('wipReportPagination', result.page, result.total, result.limit, fetchWipReport);

    } catch (error) {
        console.error('Failed to fetch WIP report:', error);
        window.cachedWipReport = [];
        reportBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function fetchWipReportByLot(page = 1) {
    const reportBody = document.getElementById('wipReportByLotTableBody');
    if (!reportBody) return;
    reportBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading Report by Lot...</td></tr>';
    
    const params = new URLSearchParams({
        page: page, // เพิ่ม page
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || '',
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_wip_report_by_lot&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.cachedWipReportByLot = result.data; // แก้ไข: ใช้ result.data

        reportBody.innerHTML = '';
        if (result.data.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="7" class="text-center">No active WIP Lot found.</td></tr>';
        } else {
            result.data.forEach(item => {
                // ... (ส่วน render ตารางเหมือนเดิม) ...
                const variance = parseInt(item.variance);
                let textColorClass = '';
                let varianceText = variance.toLocaleString();

                if (variance > 0) {
                    textColorClass = 'text-warning';
                } else if (variance < 0) {
                    textColorClass = 'text-danger';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.lot_no}</td>
                    <td>${item.part_no}</td>
                    <td>${item.line}</td>
                    <td>${item.model}</td>
                    <td style="text-align: center;">${parseInt(item.total_in).toLocaleString()}</td>
                    <td style="text-align: center;">${parseInt(item.total_out).toLocaleString()}</td>
                    <td class="fw-bold ${textColorClass}" style="text-align: center;">${varianceText}</td>
                `;
                reportBody.appendChild(tr);
            });
        }
        // เรียกใช้ฟังก์ชัน render pagination
        renderGenericPagination('wipReportByLotPagination', result.page, result.total, result.limit, fetchWipReportByLot);

    } catch (error) {
        console.error('Failed to fetch WIP report by lot:', error);
        window.cachedWipReportByLot = [];
        reportBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function fetchHistoryData(page = 1) {
    const historyBody = document.getElementById('wipHistoryTableBody');
    if (!historyBody) return;
    historyBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading History...</td></tr>';

    const params = new URLSearchParams({
        page: page, // เพิ่ม page
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_wip_history&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
        window.cachedHistorySummary = result.history_summary || [];
        
        historyBody.innerHTML = '';
        if (result.data.length === 0) { // แก้ไข: ใช้ result.data
            historyBody.innerHTML = '<tr><td colspan="9" class="text-center">No entry history found.</td></tr>';
        } else {
            result.data.forEach(item => {
                // ... (ส่วน render ตารางเหมือนเดิม) ...
                 const tr = document.createElement('tr');
                 const entryDate = new Date(item.entry_time);
                 const formattedDate = entryDate.toLocaleDateString('en-GB');
                 const formattedTime = entryDate.toTimeString().substring(0, 8);
                 const noteTd = document.createElement('td');
                 const noteDiv = document.createElement('div');
                 noteDiv.className = 'note-truncate';
                 noteDiv.title = item.remark || '';
                 noteDiv.textContent = item.remark || '';
                 noteTd.appendChild(noteDiv);

                 tr.innerHTML = `
                     <td>${formattedDate}</td>
                     <td>${formattedTime}</td>
                     <td>${item.line}</td>
                     <td>${item.model || '-'}</td>
                     <td>${item.part_no}</td>
                     <td>${item.lot_no || '-'}</td>
                     <td style="text-align: center;">${parseInt(item.quantity_in).toLocaleString()}</td>
                 `;
                 tr.appendChild(noteTd);
                 
                 if (canManage) {
                     const actionsTd = document.createElement('td');
                     actionsTd.className = 'text-center';
                     const buttonWrapper = document.createElement('div');
                     buttonWrapper.className = 'd-flex gap-1';
                     const editButton = document.createElement('button');
                     editButton.className = 'btn btn-sm btn-warning w-100';
                     editButton.textContent = 'Edit';
                     editButton.onclick = () => openEditEntryModal(item, editButton);
                     const deleteButton = document.createElement('button');
                     deleteButton.className = 'btn btn-sm btn-danger w-100';
                     deleteButton.textContent = 'Delete';
                     deleteButton.onclick = () => handleDeleteEntry(item.entry_id);
                     buttonWrapper.appendChild(editButton);
                     buttonWrapper.appendChild(deleteButton);
                     actionsTd.appendChild(buttonWrapper);
                     tr.appendChild(actionsTd);
                 }
                 historyBody.appendChild(tr);
            });
        }
        // เรียกใช้ฟังก์ชัน render pagination
        renderGenericPagination('entryHistoryPagination', result.page, result.total, result.limit, fetchHistoryData);

    } catch (error) {
        console.error('Failed to fetch entry history:', error);
        historyBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function handleDeleteEntry(entryId) {
    if (!confirm(`Are you sure you want to delete Entry ID ${entryId}?`)) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    try {
        const response = await fetch('../../api/pdTable/wipManage.php?action=delete_wip_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
            body: JSON.stringify({ entry_id: entryId })
        });
        const result = await response.json();
        showToast(result.message, result.success ? '#28a745' : '#dc3545');
        if (result.success) {
            fetchHistoryData();
        }
    } catch (error) {
        showToast('An error occurred while deleting the entry.', '#dc3545');
    }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลและแสดงผลรายงาน Stock Count
 */
async function fetchStockCountReport(page = 1) {
    const tableBody = document.getElementById('stockCountTableBody');
    if (!tableBody) return;

    const tableHead = tableBody.previousElementSibling;
    if (tableHead) {
        tableHead.innerHTML = `
            <tr>
                <th>Line</th>
                <th>Model</th>
                <th>Part No.</th>
                <th class="text-end">Total IN</th>
                <th class="text-end">Total OUT</th>
                <th class="text-end">On-Hand</th>
                ${canManage ? '<th class="text-center">Actions</th>' : ''}
            </tr>
        `;
    }
    
    const colspan = canManage ? 7 : 6;
    tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">Loading Stock Count...</td></tr>`;

    const params = new URLSearchParams({
        page: page, // เพิ่ม page
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || ''
    });

    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_stock_count&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        tableBody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">No parts found in parameters.</td></tr>`;
        } else {
            result.data.forEach(row => {
                // ... (ส่วน render ตารางเหมือนเดิม) ...
                const tr = document.createElement('tr');
                const variance = parseInt(row.variance, 10);
                let varianceClass = '';
                if (variance < 0) {
                    varianceClass = 'text-danger';
                } else if (variance > 0) {
                    varianceClass = 'text-success';
                }
                let actionsHtml = '';
                if (canManage) {
                    actionsHtml = `
                        <td class="text-center">
                            <button class="btn btn-sm btn-warning" onclick='openAdjustStockModal(${JSON.stringify(row)})'>
                                Adjust
                            </button>
                        </td>
                    `;
                }
                tr.innerHTML = `
                    <td>${row.line}</td>
                    <td>${row.model}</td>
                    <td>${row.part_no}</td>
                    <td class="text-end">${parseInt(row.total_in).toLocaleString()}</td>
                    <td class="text-end">${parseInt(row.total_out).toLocaleString()}</td>
                    <td class="text-end fw-bold ${varianceClass}">${variance.toLocaleString()}</td>
                    ${actionsHtml}
                `;
                tableBody.appendChild(tr);
            });
        }
        // เรียกใช้ฟังก์ชัน render pagination
        renderGenericPagination('stockCountPagination', result.page, result.total, result.limit, fetchStockCountReport);

    } catch (error) {
        console.error("Failed to fetch Stock Count report:", error);
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-danger">Failed to load report.</td></tr>`;
    }
}