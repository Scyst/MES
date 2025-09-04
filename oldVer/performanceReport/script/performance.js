"use strict";

// --- FIX 1: Corrected API path to match your structure ---
const API_ENDPOINT = 'api/performanceReport.php';
let debounceTimer; // Timer for debouncing

/**
 * Fetches performance data from the API and renders it.
 */
async function fetchPerformanceData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const operatorName = document.getElementById('filterOperatorName').value;
    const tableBody = document.getElementById('reportTableBody');

    if (!startDate || !endDate) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Please select both a start and end date.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Loading data...</td></tr>`;
    showSpinner();

    try {
        const params = new URLSearchParams({
            action: 'get_performance_data',
            startDate: startDate,
            endDate: endDate,
            operatorName: operatorName
        });

        const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch data.');
        }

        renderPerformanceTable(result.data);

    } catch (error) {
        console.error('Error fetching performance data:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
        showToast(error.message, '#dc3545');
    } finally {
        hideSpinner();
    }
}

/**
 * Renders the performance data into the table.
 * @param {Array} data - The array of performance data from the API.
 */
function renderPerformanceTable(data) {
    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">No performance data found for the selected period.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = `Click to see details for ${row.operator_name}`;
        
        const totalValue = parseFloat(row.total_value || 0);
        const totalFg = parseInt(row.total_fg || 0);
        const totalNg = parseInt(row.total_ng || 0);

        tr.innerHTML = `
            <td>${row.operator_name}</td>
            <td class="text-end">${totalFg.toLocaleString()}</td>
            <td class="text-end">${totalNg.toLocaleString()}</td>
            <td class="text-end text-info fw-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        
        // --- FIX 2: Add event listener AFTER setting innerHTML and BEFORE appending ---
        // This pattern is based on your wip_handler.js
        tr.addEventListener('click', () => {
            // Check if the function to open modal exists before calling it
            if (typeof openPerformanceDetailModal === 'function') {
                openPerformanceDetailModal(row);
            }
        });

        tableBody.appendChild(tr);
    });
}

/**
 * Opens the detail modal and fetches drill-down data.
 * @param {object} rowData - The data of the clicked row.
 */
async function openPerformanceDetailModal(rowData) {
    const modalEl = document.getElementById('performanceDetailModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    
    const modalTitle = document.getElementById('performanceDetailModalLabel');
    const modalBody = document.getElementById('performanceDetailTableBody');
    
    modalTitle.textContent = `Production Details for: ${rowData.operator_name}`;
    modalBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading details...</td></tr>`;
    modal.show();

    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const params = new URLSearchParams({
            action: 'get_operator_details',
            operatorId: rowData.operator_id,
            startDate: startDate,
            endDate: endDate
        });

        const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        modalBody.innerHTML = '';
        if (result.data.length === 0) {
            modalBody.innerHTML = `<tr><td colspan="6" class="text-center">No production records found.</td></tr>`;
        } else {
            result.data.forEach(detail => {
                const tr = document.createElement('tr');
                const value = parseFloat(detail.value || 0);
                tr.innerHTML = `
                    <td>${new Date(detail.log_date).toLocaleDateString('en-GB')}</td>
                    <td>${detail.part_no}</td>
                    <td>${detail.model}</td>
                    <td class="text-center">${detail.count_type}</td>
                    <td class="text-end">${parseInt(detail.count_value).toLocaleString()}</td>
                    <td class="text-end">${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                `;
                modalBody.appendChild(tr);
            });
        }
    } catch (error) {
        modalBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
    }
}


/**
 * A debounced function to trigger the API call.
 */
function debouncedFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchPerformanceData();
    }, 500); // Wait 500ms after the user stops changing filters
}

/**
 * Initializes the page and sets up event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const operatorNameInput = document.getElementById('filterOperatorName');

    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    startDateInput.value = today;
    endDateInput.value = today;

    // Add event listeners to all filter inputs
    startDateInput.addEventListener('change', debouncedFetch);
    endDateInput.addEventListener('change', debouncedFetch);
    operatorNameInput.addEventListener('input', debouncedFetch);

    // Initial data load
    fetchPerformanceData();
});