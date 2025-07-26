"use strict";

const API_ENDPOINT = '../../api/performanceReport/performanceReport.php';
let debounceTimer; // Timer for debouncing

/**
 * Fetches performance data from the API and renders it.
 */
async function fetchPerformanceData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const tableBody = document.getElementById('reportTableBody');

    if (!startDate || !endDate) {
        // Don't show a toast, just wait for user to select both dates.
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Please select both a start and end date.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Loading data...</td></tr>`;
    showSpinner();

    try {
        const params = new URLSearchParams({
            action: 'get_performance_data',
            startDate: startDate,
            endDate: endDate
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
        
        const totalValue = parseFloat(row.total_value || 0);
        const totalFg = parseInt(row.total_fg || 0);
        const totalNg = parseInt(row.total_ng || 0);

        tr.innerHTML = `
            <td>${row.operator_name}</td>
            <td class="text-end">${totalFg.toLocaleString()}</td>
            <td class="text-end">${totalNg.toLocaleString()}</td>
            <td class="text-end text-info fw-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tableBody.appendChild(tr);
    });
}

/**
 * A debounced function to trigger the API call.
 */
function debouncedFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchPerformanceData();
    }, 500); // Wait 500ms after the user stops changing the date
}

/**
 * Initializes the page and sets up event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // Set default date range to today
    const today = new Date().toISOString().split('T')[0];
    startDateInput.value = today;
    endDateInput.value = today;

    // Add event listeners to date inputs to trigger the debounced fetch
    startDateInput.addEventListener('change', debouncedFetch);
    endDateInput.addEventListener('change', debouncedFetch);

    // Initial data load
    fetchPerformanceData();
});
