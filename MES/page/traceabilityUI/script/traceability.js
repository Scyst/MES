document.addEventListener('DOMContentLoaded', () => {
    const lotNoInput = document.getElementById('lotNoInput');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const reportContainer = document.getElementById('reportContainer');
    const initialMessage = document.getElementById('initialMessage');
    let searchDebounceTimer;

    // --- Search Logic ---
    if (lotNoInput) {
        lotNoInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                const searchTerm = lotNoInput.value.trim();
                if (searchTerm.length >= 3) {
                    searchForLots(searchTerm);
                } else {
                    searchResultsContainer.innerHTML = ''; 
                }
            }, 500);
        });
    }
    
    async function searchForLots(term) {
        searchResultsContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-action disabled">Searching...</a>';
        showSpinner(); // <-- เพิ่ม: แสดง Spinner
        try {
            const response = await fetch(`../../api/pdTable/pdTableManage.php?action=search_lots&term=${term}`);
            const result = await response.json();
            if (result.success) {
                renderSearchResults(result.data);
            } else {
                searchResultsContainer.innerHTML = `<a href="#" class="list-group-item list-group-item-danger">${result.message}</a>`;
            }
        } catch (error) {
            console.error('Lot search failed:', error);
            searchResultsContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-danger">Search failed.</a>';
        } finally {
            hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
        }
    }

    function renderSearchResults(lots) {
        searchResultsContainer.innerHTML = '';
        if (lots.length === 0) {
            searchResultsContainer.innerHTML = '<a href="#" class="list-group-item list-group-item-action disabled">No matching lots found.</a>';
            return;
        }
        lots.forEach(lot => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action list-group-item-dark';
            item.textContent = lot;
            item.onclick = (e) => {
                e.preventDefault();
                lotNoInput.value = lot; // เติม Lot ที่เลือกในช่องค้นหา
                searchResultsContainer.innerHTML = ''; // ซ่อนผลการค้นหา
                generateTraceabilityReport(lot);
            };
            searchResultsContainer.appendChild(item);
        });
    }

    // --- Report Generation Logic ---
    async function generateTraceabilityReport(lotNo) {
        initialMessage.classList.add('d-none');
        reportContainer.classList.add('d-none');
        showToast('Generating report for ' + lotNo, '#0dcaf0');

        showSpinner(); // <-- เพิ่ม: แสดง Spinner
        try {
            const response = await fetch(`../../api/Traceability/traceability.php?lot_no=${lotNo}`);
            const result = await response.json();

            if (!result.success) throw new Error(result.message);
            if (!result.data.summary) {
                showToast(`Data for Lot Number '${lotNo}' not found.`, '#ffc107');
                initialMessage.classList.remove('d-none'); // แสดงข้อความเริ่มต้นอีกครั้ง
                return;
            }

            renderAllSections(result.data, lotNo);
            reportContainer.classList.remove('d-none');
            showToast('Report generated successfully.', '#28a745');

        } catch (error) {
            console.error('Traceability report failed:', error);
            showToast(error.message, '#dc3545');
            initialMessage.classList.remove('d-none'); // แสดงข้อความเริ่มต้นอีกครั้ง
        } finally {
            hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
        }
    }

    function renderAllSections(data, lotNo) {
        const { summary, bom_info, wip_history, production_history, downtime_history } = data;
        const summaryCard = document.getElementById('summaryCard');
        
        summaryCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Lot Summary: ${summary.part_no}</h5>
                <p class="card-text mb-1">
                    <strong>Lot No:</strong> ${lotNo} | 
                    <strong>Line:</strong> ${summary.line} | 
                    <strong>Model:</strong> ${summary.model}
                </p>
                <p class="card-text">
                    <strong>Total FG Produced:</strong> ${parseInt(summary.total_fg).toLocaleString()} pcs | 
                    <strong>Production Window:</strong> ${formatDateTime(summary.first_event_time)} to ${formatDateTime(summary.last_event_time)}
                </p>
            </div>
        `;

        renderTable(document.getElementById('productionHistoryTableBody'), production_history, (row) => `<td>${row.log_date}</td><td>${row.log_time.substring(0,8)}</td><td>${row.count_type}</td><td>${row.count_value}</td><td>${row.note || '-'}</td>`, 5, "No production records found for this Lot.");
        renderTable(document.getElementById('bomTableBody'), bom_info, (row) => `<td>${row.component_part_no}</td><td>${row.quantity_required}</td>`, 2, "This FG has no defined BOM.");
        renderTable(document.getElementById('wipHistoryTableBody'), wip_history, (row) => `<td>${formatDateTime(row.entry_time)}</td><td>${row.quantity_in}</td><td>${row.operator}</td><td>${row.remark || '-'}</td>`, 4, "No WIP entry records found for this Lot.");
        renderTable(document.getElementById('downtimeHistoryTableBody'), downtime_history, (row) => `<td>${formatDateTime(row.stop_begin)}</td><td>${formatDateTime(row.stop_end)}</td><td>${row.duration}</td><td>${row.machine}</td><td>${row.cause}</td><td>${row.recovered_by}</td>`, 6, "No relevant downtime recorded.");
    }

    function renderTable(tbody, data, rowTemplate, colspan, emptyMessage) {
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">${emptyMessage}</td></tr>`;
            return;
        }
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = rowTemplate(row);
            tbody.appendChild(tr);
        });
    }
    
    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        return new Date(dateTimeString).toLocaleString('th-TH', { hour12: false });
    }
});