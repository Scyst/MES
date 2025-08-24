"use strict";

const barChartInstances = {};
// Chart.register(ChartZoom); // ปิดการใช้งานไปก่อนตามผลการทดลองของเรา

/**
 * Toggles the loading state of a chart card.
 */
function toggleLoadingState(elementId, isLoading) {
    const element = document.getElementById(elementId);
    const card = element ? element.closest('.chart-card') : null;
    if (card) {
        isLoading ? card.classList.add('is-loading') : card.classList.remove('is-loading');
    }
}

function toggleNoDataMessage(canvasId, show) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        // เคลียร์สถานะ error ก่อนเสมอ
        wrapper.classList.remove('has-error');
        // แล้วค่อยจัดการสถานะ no-data
        show ? wrapper.classList.add('has-no-data') : wrapper.classList.remove('has-no-data');
    }
}

function toggleErrorMessage(canvasId, show) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        // เคลียร์สถานะ no-data ก่อนเสมอ
        wrapper.classList.remove('has-no-data');
        // แล้วค่อยจัดการสถานะ error
        show ? wrapper.classList.add('has-error') : wrapper.classList.remove('has-error');
    }
}

/**
 * Helper function to get CSS variable values.
 */
function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getBarChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    return theme === 'dark'
        ? { ticksColor: '#ccc', gridColor: '#444', legendColor: '#ccc' }
        : { ticksColor: '#6c757d', gridColor: '#dee2e6', legendColor: '#212529' };
}

function truncateLabel(label, maxLength = 4) {
    if (typeof label !== 'string') return '';
    return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
}

function renderBarChart(canvasId, labels, datasets, options = {}) {
    const { isStacked, originalLabels, unitLabel } = options;
    const themeColors = getBarChartThemeColors();
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    let chartInstance = barChartInstances[canvasId];

    if (chartInstance && chartInstance.destroyed) {
        chartInstance = null;
    }

    if (!chartInstance) {
        console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Creating NEW chart.`);
        barChartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500 // เพิ่ม animation ตอนสร้างครั้งแรก
                },
                plugins: {
                    legend: { display: isStacked },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (tooltipItems) => {
                                if (tooltipItems.length > 0 && originalLabels) {
                                    return originalLabels[tooltipItems[0].dataIndex];
                                }
                                return '';
                            },
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString();
                                    if (unitLabel) label += ' ' + unitLabel;
                                }
                                return label;
                            },
                            footer: (tooltipItems) => {
                                if (!isStacked) return '';
                                let sum = 0;
                                tooltipItems.forEach(item => { sum += item.parsed.y || 0; });
                                let footerText = 'Total: ' + sum.toLocaleString();
                                if (unitLabel) footerText += ' ' + unitLabel;
                                return footerText;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: isStacked, ticks: { color: themeColors.ticksColor } },
                    y: { stacked: isStacked, beginAtZero: true, ticks: { color: themeColors.ticksColor } }
                }
            }
        });
    } else {
        console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Updating existing chart.`);
        
        chartInstance.data.labels = labels;

        datasets.forEach((newDataset, index) => {
            const oldDataset = chartInstance.data.datasets[index];
            if (oldDataset) {
                oldDataset.data = newDataset.data;
                oldDataset.backgroundColor = newDataset.backgroundColor;
            }
        });

        chartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
        chartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
        chartInstance.options.plugins.legend.labels.color = themeColors.legendColor;

        chartInstance.update();
    }
}

async function fetchAndRenderBarCharts() {
    toggleLoadingState("partsBarChart", true);
    toggleLoadingState("stopCauseBarChart", true);
    toggleErrorMessage("partsBarChart", false);
    toggleErrorMessage("stopCauseBarChart", false);

    try {
        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });
        
        const response = await fetch(`api/get_oee_barchart.php?${params.toString()}`);
        const responseData = await response.json();
        if (!responseData.success) throw new Error(responseData.message || "Barchart API: Failed to fetch bar chart data.");
        const data = responseData.data;

        // --- Parts Bar Chart ---
        const hasPartsData = data.parts && data.parts.labels && data.parts.labels.length > 0;
        toggleNoDataMessage("partsBarChart", !hasPartsData);

        const originalPartLabels = hasPartsData ? data.parts.labels : [];
        const truncatedPartLabels = originalPartLabels.map(label => truncateLabel(label, 8));
        const countTypes = {
            FG: getCssVar('--mes-color-success'), NG: getCssVar('--mes-color-danger'),
            HOLD: getCssVar('--mes-color-warning'), REWORK: getCssVar('--mes-chart-color-3'),
            SCRAP: getCssVar('--mes-chart-color-4'), ETC: '#adb5bd'
        };
        const partDatasets = Object.keys(countTypes).map(type => ({
            label: type, data: hasPartsData ? (data.parts[type] || []) : [], backgroundColor: countTypes[type]
        }));

        renderBarChart('partsBarChart', truncatedPartLabels, partDatasets, { isStacked: true, originalLabels: originalPartLabels, unitLabel: 'pcs' });
        
        // --- Stop Cause Bar Chart ---
        const hasStopCauseData = data.stopCause && data.stopCause.labels && data.stopCause.labels.length > 0;
        toggleNoDataMessage("stopCauseBarChart", !hasStopCauseData);

        const stopCauseLabels = hasStopCauseData ? data.stopCause.labels : [];
        const causeColors = { 
            'Man': '#42a5f5', 'Machine': '#26c6da', 'Method': '#64b5f6', 'Material': '#9e9e9e',
            'Measurement': '#78909c', 'Environment': '#546e7a', 'Other': '#bdbdbd'
        };
        const stopCauseDatasets = Object.keys(causeColors).map(cause => ({
            label: cause, data: hasStopCauseData ? (data.stopCause[cause] || []) : [], backgroundColor: causeColors[cause]
        }));
        
        renderBarChart('stopCauseBarChart', stopCauseLabels, stopCauseDatasets, { isStacked: true, unitLabel: 'min', originalLabels: stopCauseLabels });

    } catch (err) {
        console.error("Bar chart fetch failed:", err);
        toggleErrorMessage("partsBarChart", true);
        toggleErrorMessage("stopCauseBarChart", true);

        if (!barChartInstances['partsBarChart'] || barChartInstances['partsBarChart'].destroyed) {
            renderBarChart('partsBarChart', [], [], { isStacked: true, originalLabels: [], unitLabel: 'pcs' });
        }
        if (!barChartInstances['stopCauseBarChart'] || barChartInstances['stopCauseBarChart'].destroyed) {
            renderBarChart('stopCauseBarChart', [], [], { isStacked: true, unitLabel: 'min', originalLabels: [] });
        }
    } finally {
        toggleLoadingState("partsBarChart", false);
        toggleLoadingState("stopCauseBarChart", false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (Object.keys(barChartInstances).length > 0) {
                    fetchAndRenderBarCharts();
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});