"use strict";

let dailyProductionChartInstance = null;
const DAILY_PROD_CHART_ID = 'dailyProductionChart';

// ===== Helper Functions (Copied/Adapted for this file) =====
function toggleLoadingState_ProdChart(elementOrId, isLoading) {
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
     if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
    }
    const dates = [...new Set(data.map(item => item.ProductionDate))].sort();
    const items = [...new Set(data.map(item => item.ItemIdentifier))].sort();

    const baseColors = [
        { bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' },  // 1. Blue
        { bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' },  // 2. Teal
        { bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' },  // 3. Orange
        { bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' }, // 4. Purple
        { bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' },   // 5. Red
        { bg: 'rgba(255, 205, 86, 0.7)', border: 'rgba(255, 205, 86, 1)' },   // 6. Yellow
        { bg: 'rgba(25, 135, 84, 0.7)', border: 'rgba(25, 135, 84, 1)' },   // 7. Green
        { bg: 'rgba(111, 66, 193, 0.7)', border: 'rgba(111, 66, 193, 1)' },  // 8. Indigo
        { bg: 'rgba(13, 202, 240, 0.7)', border: 'rgba(13, 202, 240, 1)' },   // 9. Cyan
        { bg: 'rgba(214, 51, 132, 0.7)', border: 'rgba(214, 51, 132, 1)' },  // 10. Pink
        { bg: 'rgba(253, 126, 20, 0.7)', border: 'rgba(253, 126, 20, 1)' },   // 11. Bright Orange
        { bg: 'rgba(108, 117, 125, 0.7)', border: 'rgba(108, 117, 125, 1)' }  // 12. Gray
    ];

    const itemColorMap = items.reduce((map, item, index) => {
        map[item] = baseColors[index % baseColors.length];
        return map;
    }, {});

    const datasets = items.map(item => {
        const itemData = dates.map(date => {
            const entry = data.find(d => d.ProductionDate === date && d.ItemIdentifier === item);
            return entry ? entry.TotalQuantity : 0;
        });
        
        const color = itemColorMap[item];
        
        return {
            label: item,
            data: itemData,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1
        };
    });
    return { labels: dates, datasets: datasets };
}

// ===== Main Fetch and Render Function =====
async function fetchAndRenderDailyProductionChart() {
    const canvasId = DAILY_PROD_CHART_ID;
    toggleLoadingState_ProdChart(canvasId, true); 
    toggleNoDataMessage_ProdChart(canvasId, false);
    toggleErrorMessage_ProdChart(canvasId, false);

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
        toggleNoDataMessage_ProdChart(canvasId, !hasData);

        let chartData = { labels: [], datasets: [] };
        if (hasData) {
            chartData = processProductionDataForChart(result.data);
        }

        const themeColors = getDailyProdChartThemeColors();
        const ctx = document.getElementById(canvasId)?.getContext("2d");
        if (!ctx) return;

        const datalabelsConfig = {
            display: true,
            anchor: 'end',
            align: 'end',
            color: themeColors.labelColor,
            font: {
                weight: 'bold'
            },
            formatter: (value, context) => {
                const datasetIndex = context.datasetIndex; const dataIndex = context.dataIndex;
                 const datasets = context.chart.data.datasets; let isTop = true;
                 for (let i = datasetIndex + 1; i < datasets.length; i++) {
                     const nextMeta = context.chart.getDatasetMeta(i);
                     if (!nextMeta.hidden && datasets[i].data[dataIndex] > 0) { isTop = false; break; }
                 }
                 if (isTop) {
                     let total = 0;
                     for (let i = 0; i < datasets.length; i++) {
                         const loopMeta = context.chart.getDatasetMeta(i);
                         if (!loopMeta.hidden) { total += datasets[i].data[dataIndex] || 0; }
                     }
                     return total > 0 ? total.toLocaleString() : '';
                 } return '';
              }, offset: -5
          };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: {
                 legend: {
                    display: chartData.datasets.length > 1 && chartData.datasets.length < 15,
                    position: 'top',
                    labels: { color: themeColors.legendColor }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                     callbacks: {
                        filter: function(tooltipItem) {
                            return tooltipItem.parsed.y > 0;
                        },
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
                 title: { display: false },
                 datalabels: datalabelsConfig
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { 
                        color: themeColors.ticksColor,
                        maxRotation: 45,
                        minRotation: 0,
                        align: 'end'
                    },
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
        };


        if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx === null) {
             console.warn(`Chart instance for ${canvasId} was destroyed. Recreating.`);
             dailyProductionChartInstance = null;
        }

        if (!dailyProductionChartInstance) {
            console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Creating NEW chart.`);
            dailyProductionChartInstance = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                plugins: [ChartDataLabels],
                options: chartOptions
            });
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Updating existing chart.`);
            
            dailyProductionChartInstance.data.labels = chartData.labels;
            dailyProductionChartInstance.data.datasets.forEach((oldDataset, index) => {
                const newDataset = chartData.datasets[index];
                if (newDataset) {
                    oldDataset.label = newDataset.label;
                    oldDataset.data = newDataset.data;
                    oldDataset.backgroundColor = newDataset.backgroundColor;
                    oldDataset.borderColor = newDataset.borderColor;
                    oldDataset.borderWidth = newDataset.borderWidth;
                }
            });
            if (chartData.datasets.length > dailyProductionChartInstance.data.datasets.length) {
                for (let i = dailyProductionChartInstance.data.datasets.length; i < chartData.datasets.length; i++) {
                    dailyProductionChartInstance.data.datasets.push(chartData.datasets[i]);
                }
            } else if (chartData.datasets.length < dailyProductionChartInstance.data.datasets.length) {
                dailyProductionChartInstance.data.datasets.length = chartData.datasets.length;
            }

            dailyProductionChartInstance.options.plugins.legend = chartOptions.plugins.legend;
            dailyProductionChartInstance.options.plugins.tooltip = chartOptions.plugins.tooltip;
            dailyProductionChartInstance.options.plugins.datalabels = chartOptions.plugins.datalabels;
            dailyProductionChartInstance.options.scales = chartOptions.scales;

            dailyProductionChartInstance.update();
        }

    } catch (error) {
        console.error(`Failed fetch/render ${canvasId}:`, error);
        toggleErrorMessage_ProdChart(canvasId, true);
        if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx !== null) {
            dailyProductionChartInstance.data.labels = [];
            dailyProductionChartInstance.data.datasets = [];
            dailyProductionChartInstance.update();
        }
    } finally {
        toggleLoadingState_ProdChart(canvasId, false);
    }
}

// ===== Theme Change Listener (Specific to this chart) =====
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (dailyProductionChartInstance && typeof dailyProductionChartInstance.destroy === 'function' && dailyProductionChartInstance.ctx !== null) {
                    console.log('Theme changed, updating daily production chart colors (including datalabels)...');
                    const themeColors = getDailyProdChartThemeColors();
                    dailyProductionChartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
                    dailyProductionChartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
                    dailyProductionChartInstance.options.scales.y.title.color = themeColors.labelColor;
                    dailyProductionChartInstance.options.scales.y.grid.color = themeColors.gridColor;
                    dailyProductionChartInstance.options.plugins.legend.labels.color = themeColors.legendColor;
                    dailyProductionChartInstance.options.plugins.datalabels.color = themeColors.labelColor;
                    dailyProductionChartInstance.update('none');
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});