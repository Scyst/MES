/**
 * ฟังก์ชันสำหรับดึงข้อมูลและแสดงผลรายงาน WIP (Work-In-Progress)
 */
async function fetchWipReport() {
    const reportBody = document.getElementById('wipReportTableBody');
    if (!reportBody) return;
    // แก้ไข: ปรับ colspan เป็น 6
    reportBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading Report...</td></tr>';
    
    const params = new URLSearchParams({
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || '', // เพิ่ม filter model
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_wip_report&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.cachedWipReport = result.report;

        reportBody.innerHTML = '';
        if (result.report.length === 0) {
            // แก้ไข: ปรับ colspan เป็น 6
            reportBody.innerHTML = '<tr><td colspan="6" class="text-center">No WIP data found for the selected filters.</td></tr>';
        } else {
            result.report.forEach(item => {
                const variance = parseInt(item.variance);
                let textColorClass = '';
                let varianceText = '';

                if (variance > 0) {
                    textColorClass = 'text-warning';
                    varianceText = '+' + variance.toLocaleString();
                } else if (variance < 0) {
                    textColorClass = 'text-danger';
                    varianceText = variance.toLocaleString();
                } else {
                    textColorClass = 'text-success';
                    varianceText = variance.toLocaleString();
                }

                const tr = document.createElement('tr');
                // แก้ไข: เพิ่ม td สำหรับ Model
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
    } catch (error) {
        console.error('Failed to fetch WIP report:', error);
        window.cachedWipReport = [];
        // แก้ไข: ปรับ colspan เป็น 6
        reportBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลและแสดงผลประวัติการนำเข้า (Entry History)
 */
async function fetchHistoryData() {
    const historyBody = document.getElementById('wipHistoryTableBody');
    if (!historyBody) return;
    historyBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading History...</td></tr>';

    const params = new URLSearchParams({
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
        if (result.history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="9" class="text-center">No entry history found.</td></tr>';
        } else {
            result.history.forEach(item => {
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

// --- Logic ใหม่ทั้งหมดสำหรับจัดการ Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    const wipTabButton = document.getElementById('wip-report-tab');
    const historyTabButton = document.getElementById('entry-history-tab');

    if (wipTabButton) {
        wipTabButton.addEventListener('shown.bs.tab', fetchWipReport);
    }
    
    if (historyTabButton) {
        historyTabButton.addEventListener('shown.bs.tab', fetchHistoryData);
    }
    
    // ฟังก์ชันสำหรับจัดการการกรองข้อมูลในแท็บ WIP และ History
    function handleWipAndHistoryFilter() {
        if (document.getElementById('wip-report-pane')?.classList.contains('active')) {
            fetchWipReport();
        } else if (document.getElementById('entry-history-pane')?.classList.contains('active')) {
            fetchHistoryData();
        }
    }

    // เพิ่ม Event Listener ให้กับทุกช่อง Filter
    const filterInputs = ['filterPartNo', 'filterLotNo', 'filterLine', 'filterModel', 'filterCountType', 'filterStartDate', 'filterEndDate'];
    filterInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            // ใช้ Debounce เพื่อลดการยิง API ขณะพิมพ์
            clearTimeout(window.wipFilterDebounceTimer);
            window.wipFilterDebounceTimer = setTimeout(handleWipAndHistoryFilter, 500);
        });
    });
});