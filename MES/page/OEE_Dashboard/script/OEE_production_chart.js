"use strict";

// ===== MES: Use a local variable for this chart's instance =====
let dailyProductionChartInstance = null;
// ===== END MES =====
const DAILY_PROD_CHART_ID = 'dailyProductionChart';

// ===== Helper Functions (Copied/Adapted for this file) =====

function toggleLoadingState_ProdChart(elementOrId, isLoading) { // Renamed slightly to avoid conflicts if helpers are not truly shared
    let card = null;
    const chartCanvas = document.getElementById(DAILY_PROD_CHART_ID); // Target specifically
    if (chartCanvas) {
         card = chartCanvas.closest('.chart-card');
    }
    if (card) {
        isLoading ? card.classList.add('is-loading') : card.classList.remove('is-loading');
    }
}

function toggleNoDataMessage_ProdChart(canvasId, show) { // Renamed slightly
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        wrapper.classList.remove('has-error');
        show ? wrapper.classList.add('has-no-data') : wrapper.classList.remove('has-no-data');
    }
}

function toggleErrorMessage_ProdChart(canvasId, show) { // Renamed slightly
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        wrapper.classList.remove('has-no-data');
        show ? wrapper.classList.add('has-error') : wrapper.classList.remove('has-error');
    }
}

function getCssVar_ProdChart(varName) { // Renamed slightly
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Gets theme-specific colors specifically for this bar chart.
 */
function getDailyProdChartThemeColors() { // Renamed to be specific
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    // Using colors suitable for a bar chart context
    return theme === 'dark'
        ? { ticksColor: '#ccc', gridColor: 'rgba(204, 204, 204, 0.2)', legendColor: '#ccc', labelColor: '#ccc', titleColor: '#eee' }
        : { ticksColor: '#6c757d', gridColor: 'rgba(0, 0, 0, 0.1)', legendColor: '#212529', labelColor: '#212529', titleColor: '#444' };
}

// ===== Data Processing Function =====

function processProductionDataForChart(data) {
    // ... (no changes needed) ...
     if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
    }
    const dates = [...new Set(data.map(item => item.ProductionDate))].sort();
    const items = [...new Set(data.map(item => item.ItemIdentifier))].sort();
    // Using a standard color palette
    const colors = ['#0d6efd', '#6f42c1', '#fd7e14', '#17a2b8', '#198754', '#ffc107', '#dc3545', '#6c757d'];
    const itemColorMap = items.reduce((map, item, index) => {
        map[item] = colors[index % colors.length];
        return map;
    }, {});

    const datasets = items.map(item => {
        const itemData = dates.map(date => {
            const entry = data.find(d => d.ProductionDate === date && d.ItemIdentifier === item);
            return entry ? entry.TotalQuantity : 0;
        });
        return {
            label: item,
            data: itemData,
            backgroundColor: itemColorMap[item]
        };
    });
    return { labels: dates, datasets: datasets };
}

// ===== Main Fetch and Render Function =====

async function fetchAndRenderDailyProductionChart() {
    const canvasId = DAILY_PROD_CHART_ID;
    toggleLoadingState_ProdChart(canvasId, true); // Use renamed helper
    toggleNoDataMessage_ProdChart(canvasId, false); // Use renamed helper
    toggleErrorMessage_ProdChart(canvasId, false); // Use renamed helper

    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ startDate, endDate, line, model });

    try {
        const response = await fetch(`api/get_daily_production.php?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        const hasData = result.success && result.data && result.data.length > 0;
        toggleNoDataMessage_ProdChart(canvasId, !hasData); // Use renamed helper

        let chartData = { labels: [], datasets: [] };
        if (hasData) {
            chartData = processProductionDataForChart(result.data);
        }

        const themeColors = getDailyProdChartThemeColors(); // Use specific theme function
        const ctx = document.getElementById(canvasId)?.getContext("2d");
        if (!ctx) return;

        // ===== MES: Use the local instance variable =====
        if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx === null) {
             console.warn(`Chart instance for ${canvasId} was destroyed. Recreating.`);
             dailyProductionChartInstance = null;
        }

        if (!dailyProductionChartInstance) {
        // ===== END MES =====
            console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Creating NEW chart.`);
            // ===== MES: Assign to local instance variable =====
            dailyProductionChartInstance = new Chart(ctx, {
            // ===== END MES =====
                type: 'bar',
                data: chartData,
                options: { // Update options to use themeColors correctly
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 500 },
                    plugins: { /* ... options ... */
                         legend: {
                            display: chartData.datasets.length > 1 && chartData.datasets.length < 15,
                            position: 'bottom',
                            labels: { color: themeColors.legendColor }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                             callbacks: {
                                label: (context) => {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed.y !== null) label += context.parsed.y.toLocaleString();
                                    return label;
                                },
                                footer: (tooltipItems) => {
                                    let sum = 0;
                                    tooltipItems.forEach(item => { sum += item.parsed.y || 0; });
                                    return 'Total: ' + sum.toLocaleString();
                                }
                            }
                        },
                         title: { display: false }
                    },
                    scales: { /* ... options ... */
                        x: {
                            stacked: true,
                            ticks: { color: themeColors.ticksColor },
                            grid: { display: false }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: { color: themeColors.ticksColor },
                            grid: { color: themeColors.gridColor },
                            title: { display: true, text: 'Quantity Produced', color: themeColors.labelColor }
                        }
                     }
                }
            });
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Updating existing chart.`);
             // ===== MES: Use the local instance variable =====
            dailyProductionChartInstance.data.labels = chartData.labels;

            // Use robust dataset update logic
             dailyProductionChartInstance.data.datasets.forEach((oldDataset, index) => {
             // ===== END MES =====
                 const newDataset = chartData.datasets[index];
                 if (newDataset) {
                     oldDataset.label = newDataset.label;
                     oldDataset.data = newDataset.data;
                     oldDataset.backgroundColor = newDataset.backgroundColor;
                 }
             });
             // ===== MES: Use the local instance variable =====
             if (chartData.datasets.length > dailyProductionChartInstance.data.datasets.length) {
                 for (let i = dailyProductionChartInstance.data.datasets.length; i < chartData.datasets.length; i++) {
                     dailyProductionChartInstance.data.datasets.push(chartData.datasets[i]);
                 }
             } else if (chartData.datasets.length < dailyProductionChartInstance.data.datasets.length) {
                  dailyProductionChartInstance.data.datasets.length = chartData.datasets.length;
             }

            // Update theme colors
            dailyProductionChartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
            dailyProductionChartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
            dailyProductionChartInstance.options.scales.y.title.color = themeColors.labelColor;
            dailyProductionChartInstance.options.scales.y.grid.color = themeColors.gridColor;
            dailyProductionChartInstance.options.plugins.legend.labels.color = themeColors.legendColor;
            dailyProductionChartInstance.options.plugins.legend.display = chartData.datasets.length > 1 && chartData.datasets.length < 15;

            dailyProductionChartInstance.update();
            // ===== END MES =====
        }

    } catch (error) {
        console.error(`Failed fetch/render ${canvasId}:`, error);
        toggleErrorMessage_ProdChart(canvasId, true); // Use renamed helper
        // ===== MES: Use the local instance variable =====
        if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx !== null) {
            dailyProductionChartInstance.data.labels = [];
            dailyProductionChartInstance.data.datasets = [];
            dailyProductionChartInstance.update();
        }
        // ===== END MES =====
    } finally {
        toggleLoadingState_ProdChart(canvasId, false); // Use renamed helper
    }
}

// ===== Theme Change Listener (Specific to this chart) =====
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                // ===== MES: Use the local instance variable =====
                if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx !== null) {
                // ===== END MES =====
                    console.log('Theme changed, updating daily production chart colors...');
                    const themeColors = getDailyProdChartThemeColors(); // Use specific theme function
                    dailyProductionChartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
                    dailyProductionChartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
                    dailyProductionChartInstance.options.scales.y.title.color = themeColors.labelColor;
                    dailyProductionChartInstance.options.scales.y.grid.color = themeColors.gridColor;
                    dailyProductionChartInstance.options.plugins.legend.labels.color = themeColors.legendColor;
                    dailyProductionChartInstance.update('none');
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});