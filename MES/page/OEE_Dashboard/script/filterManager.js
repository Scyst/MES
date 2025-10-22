"use strict";

let dashboardAutoUpdateInterval;
let dailyProductionChartInstance = null; // MES: Added for the new chart

/**
 * Helper function to format numbers (currency or percentage)
 */
function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return isPercent ? '-- %' : '--';
    }
    const formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return isPercent ? `${formatted} %` : formatted;
}

/**
 * Fetches and renders the production cost summary data.
 */
async function fetchAndRenderCostSummary() {
    const costCard = document.getElementById('cost-summary-section')?.querySelector('.chart-card');
    if (!costCard) return;

    costCard.classList.add('is-loading');

    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ startDate, endDate, line, model });

    const elements = { /* ... selectors ... */
        matCost: document.getElementById('prodCostMat'),
        matPercent: document.getElementById('prodCostPercentRM'),
        dlCost: document.getElementById('prodCostDL'),
        dlPercent: document.getElementById('prodCostPercentDL'),
        ohCost: document.getElementById('prodCostOH'),
        ohPercent: document.getElementById('prodCostPercentOH'),
        totalCost: document.getElementById('prodCostTotal'),
        totalRevenue: document.getElementById('prodRevenueStd'),
        gpValue: document.getElementById('prodGPStd'),
        gpPercent: document.getElementById('prodPercentGPStd')
    };

    const resetElements = () => { /* ... reset logic ... */
        const loadingHtml = '<span class="loading-indicator">Loading...</span>';
        const percentPlaceholder = '-- %';
        Object.values(elements).forEach(el => {
            if (el) {
                if (el.classList.contains('percentage')) {
                    el.textContent = percentPlaceholder;
                } else {
                    el.innerHTML = loadingHtml;
                }
            }
        });
    };

    resetElements();

    try {
        const response = await fetch(`api/get_production_cost_summary.php?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            const gp = (data.TotalStdRevenue || 0) - (data.TotalStdCost || 0);

            if (elements.matCost) elements.matCost.textContent = formatNumber(data.TotalMatCost, false, 2);
            if (elements.matPercent) elements.matPercent.textContent = formatNumber(data.PercentRM, true, 1);
            if (elements.dlCost) elements.dlCost.textContent = formatNumber(data.TotalDLCost, false, 2);
            if (elements.dlPercent) elements.dlPercent.textContent = formatNumber(data.PercentDL, true, 1);
            if (elements.ohCost) elements.ohCost.textContent = formatNumber(data.TotalOHCost, false, 2);
            if (elements.ohPercent) elements.ohPercent.textContent = formatNumber(data.PercentOH, true, 1);
            if (elements.totalCost) elements.totalCost.textContent = formatNumber(data.TotalStdCost, false, 2);
            if (elements.totalRevenue) elements.totalRevenue.textContent = formatNumber(data.TotalStdRevenue, false, 2);
            if (elements.gpValue) elements.gpValue.textContent = formatNumber(gp, false, 2);
            if (elements.gpPercent) elements.gpPercent.textContent = formatNumber(data.PercentGPStd, true, 1);
        } else {
             console.warn("Cost summary API failed:", result.message);
             Object.values(elements).forEach(el => {
                 if(el) el.textContent = formatNumber(0, el.classList.contains('percentage'), el.classList.contains('percentage') ? 1: 2);
             });
        }
    } catch (error) {
        console.error("Failed fetch/render cost summary:", error);
        const errorHtml = '<span class="text-danger">Error</span>';
        Object.values(elements).forEach(el => { if(el && !el.classList.contains('percentage')) el.innerHTML = errorHtml; });
    } finally {
        costCard.classList.remove('is-loading');
    }
}

// ========== MES: Added functions for Daily Production Chart Start ==========

/**
 * Processes raw production data into Chart.js format (stacked bar).
 * @param {Array} data Raw data from API [{ProductionDate, ItemIdentifier, TotalQuantity}, ...]
 * @returns {object} { labels: [...dates], datasets: [{label, data, backgroundColor}, ...] }
 */
function processProductionDataForChart(data) {
    if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
    }

    // Get unique dates and sort them
    const dates = [...new Set(data.map(item => item.ProductionDate))].sort();
    // Get unique item identifiers
    const items = [...new Set(data.map(item => item.ItemIdentifier))].sort();
    // Assign colors to items (simple cycling for now)
    const colors = ['#0d6efd', '#6f42c1', '#fd7e14', '#17a2b8', '#198754', '#ffc107', '#dc3545', '#6c757d'];
    const itemColorMap = items.reduce((map, item, index) => {
        map[item] = colors[index % colors.length];
        return map;
    }, {});

    // Create datasets for each item
    const datasets = items.map(item => {
        const itemData = dates.map(date => {
            const entry = data.find(d => d.ProductionDate === date && d.ItemIdentifier === item);
            return entry ? entry.TotalQuantity : 0; // Quantity for this item on this date, or 0
        });
        return {
            label: item, // Item Identifier (part_no or sap_no)
            data: itemData,
            backgroundColor: itemColorMap[item]
        };
    });

    return { labels: dates, datasets: datasets };
}

/**
 * Fetches and renders the daily production bar chart.
 */
async function fetchAndRenderProductionChart() {
    const canvas = document.getElementById('dailyProductionChart');
    const chartWrapper = canvas?.parentElement; // Get the .chart-wrapper
    if (!canvas || !chartWrapper) return;

    chartWrapper.classList.remove('has-no-data', 'has-error'); // Clear previous states
    chartWrapper.closest('.chart-card')?.classList.add('is-loading'); // Show loading bar on parent card

    // Get current filter values
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ startDate, endDate, line, model });

    try {
        const response = await fetch(`api/get_daily_production.php?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            const chartData = processProductionDataForChart(result.data);

            if (dailyProductionChartInstance) {
                dailyProductionChartInstance.data.labels = chartData.labels;
                dailyProductionChartInstance.data.datasets = chartData.datasets;
                dailyProductionChartInstance.update();
            } else {
                const ctx = canvas.getContext('2d');
                dailyProductionChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top', // Or 'bottom' based on preference
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                            title: { // Optional title within the chart
                                display: false, // Set to true if you want a title here
                                text: 'Daily Production Output (FG)'
                            }
                        },
                        scales: {
                            x: {
                                stacked: true, // Stack bars for items on the same day
                                grid: { display: false }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Quantity Produced'
                                }
                            }
                        }
                    }
                });
            }
        } else {
             console.warn("Daily production API call successful but returned no data:", result.message);
             chartWrapper.classList.add('has-no-data'); // Show no-data message
             // Clear the chart if it exists
             if (dailyProductionChartInstance) {
                 dailyProductionChartInstance.data.labels = [];
                 dailyProductionChartInstance.data.datasets = [];
                 dailyProductionChartInstance.update();
             }
        }
    } catch (error) {
        console.error("Failed to fetch or render daily production chart:", error);
        chartWrapper.classList.add('has-error'); // Show error message
        // Clear the chart if it exists on error too
         if (dailyProductionChartInstance) {
             dailyProductionChartInstance.data.labels = [];
             dailyProductionChartInstance.data.datasets = [];
             dailyProductionChartInstance.update();
         }
    } finally {
        chartWrapper.closest('.chart-card')?.classList.remove('is-loading'); // Hide loading bar
    }
}
// ========== MES: Added functions for Daily Production Chart End ==========

function startAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        console.log('Auto-updating dashboard data...');
        handleFilterChange(); // This will now fetch all data including cost and production chart
    }, 60000); // Update every 60 seconds
}

function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    // ... (no changes needed here) ...
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">All ${label}</option>`;
    if (Array.isArray(optionsArray)) {
        optionsArray.forEach(optionText => {
            if (!optionText) return;
            const opt = document.createElement("option");
            opt.value = optionText;
            opt.textContent = optionText;
            if (optionText === selectedValue) opt.selected = true;
            selectElement.appendChild(opt);
        });
    }
}

async function applyFiltersAndInitCharts() {
    // ... (no changes needed here) ...
    const params = new URLSearchParams(window.location.search);
    const line = params.get("line");
    const model = params.get("model");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    try {
        const response = await fetch("api/get_dashboard_filters.php");
        const result = await response.json();
        if (result.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), result.data.lines || [], "Lines", line);
            populateSelectWithOptions(document.getElementById("modelFilter"), result.data.models || [], "Models", model);
        } else {
             console.error("Failed to populate filters:", result.message);
        }
    } catch (err) {
        console.error("Error fetching filters:", err);
    }

    document.getElementById("startDate").value = startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById("endDate").value = endDate || new Date().toISOString().split('T')[0];

    handleFilterChange();
}

function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Call all data fetching functions
    fetchAndRenderCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarCharts?.();
    fetchAndRenderCostSummary();
    fetchAndRenderProductionChart(); // <-- MES: Call the new production chart function
}

// Event Listeners Setup
window.addEventListener("load", async () => {
    await applyFiltersAndInitCharts(); // Populates filters AND triggers initial data load

    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", () => {
                console.log('Filter changed by user. Fetching new data...');
                clearInterval(dashboardAutoUpdateInterval); // Stop auto-update on manual change
                handleFilterChange(); // Fetch new data immediately
                // MES: Restart auto-update after a delay (e.g., 60 seconds)
                setTimeout(startAutoUpdate, 60000);
            });
        }
    });

    // MES: Start auto-update after initial load
    startAutoUpdate();
});