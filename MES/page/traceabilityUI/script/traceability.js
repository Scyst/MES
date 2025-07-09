document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('traceabilityForm');
    const lotNoInput = document.getElementById('lotNoInput');
    const reportContainer = document.getElementById('reportContainer');
    const initialMessage = document.getElementById('initialMessage');
    const summaryCard = document.getElementById('summaryCard');
    const bomTableBody = document.getElementById('bomTableBody');
    const wipHistoryTableBody = document.getElementById('wipHistoryTableBody');
    const productionHistoryTableBody = document.getElementById('productionHistoryTableBody');
    const downtimeHistoryTableBody = document.getElementById('downtimeHistoryTableBody');

    // Populate Datalist for Lot Numbers
    async function populateLotDatalist() {
        try {
            // เราสามารถยืม API จากหน้าอื่นมาใช้ได้
            const response = await fetch('../../api/pdTable/pdTableManage.php?action=get_lot_numbers');
            const result = await response.json();
            if (result.success) {
                const datalist = document.getElementById('lotList');
                datalist.innerHTML = result.data.map(lot => `<option value="${lot}"></option>`).join('');
            }
        } catch (error) {
            console.error('Failed to populate lot datalist:', error);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const lotNo = lotNoInput.value.trim();
        if (!lotNo) {
            showToast('Please enter a Lot Number.', '#ffc107');
            return;
        }

        // แสดงสถานะ Loading และซ่อนข้อมูลเก่า
        initialMessage.classList.add('d-none');
        reportContainer.classList.add('d-none');
        showToast('Searching for Lot Number...', '#0dcaf0');

        try {
            const response = await fetch(`../../api/Traceability/traceability.php?lot_no=${lotNo}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }
            if (!result.data.summary) {
                showToast(`Lot Number '${lotNo}' not found.`, '#ffc107');
                initialMessage.classList.remove('d-none');
                return;
            }

            renderAllSections(result.data);
            reportContainer.classList.remove('d-none');
            showToast('Report generated successfully.', '#28a745');

        } catch (error) {
            console.error('Traceability search failed:', error);
            showToast(error.message, '#dc3545');
            initialMessage.classList.remove('d-none');
        }
    });

    function renderAllSections(data) {
        // Render Summary Card
        const { summary, bom_info, wip_history, production_history, downtime_history } = data;
        summaryCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Lot Summary: ${summary.part_no}</h5>
                <p class="card-text mb-1">
                    <strong>Lot No:</strong> ${lotNoInput.value} | 
                    <strong>Line:</strong> ${summary.line} | 
                    <strong>Model:</strong> ${summary.model}
                </p>
                <p class="card-text">
                    <strong>Total FG Produced:</strong> ${parseInt(summary.total_fg).toLocaleString()} pcs | 
                    <strong>Production Window:</strong> ${formatDateTime(summary.first_event_time)} to ${formatDateTime(summary.last_event_time)}
                </p>
            </div>
        `;

        // Render BOM Table
        renderTable(bomTableBody, bom_info, 
            (row) => `<td>${row.component_part_no}</td><td>${row.quantity_required}</td>`, 
            2, "This FG has no defined BOM."
        );

        // Render WIP History Table
        renderTable(wipHistoryTableBody, wip_history,
            (row) => `<td>${formatDateTime(row.entry_time)}</td><td>${row.quantity_in}</td><td>${row.operator}</td><td>${row.remark || '-'}</td>`,
            4, "No WIP entry records found for this Lot."
        );
        
        // Render Production History Table
        renderTable(productionHistoryTableBody, production_history,
            (row) => `<td>${row.log_date}</td><td>${row.log_time.substring(0,8)}</td><td>${row.count_type}</td><td>${row.count_value}</td><td>${row.note || '-'}</td>`,
            5, "No production records found for this Lot."
        );

        // Render Downtime History Table
        renderTable(downtimeHistoryTableBody, downtime_history,
            (row) => `<td>${formatDateTime(row.stop_begin)}</td><td>${formatDateTime(row.stop_end)}</td><td>${row.duration}</td><td>${row.machine}</td><td>${row.cause}</td><td>${row.recovered_by}</td>`,
            6, "No relevant downtime recorded during the production window."
        );
    }
    
    // Helper function to render any table
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

    // Initial load
    populateLotDatalist();
});