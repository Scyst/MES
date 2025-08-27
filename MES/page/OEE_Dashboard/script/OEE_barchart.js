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

        // --- START: ปรับปรุง Logic การอ่านข้อมูลใหม่ทั้งหมด ---
        
        // --- Parts Bar Chart (Production Results) ---
        // ตรวจสอบว่ามีข้อมูลจาก API ระบบใหม่ (parts_production) หรือ ระบบเก่า (data.parts)
        const partsData = responseData.parts_production || responseData.data?.parts;
        const hasPartsData = partsData && partsData.labels && partsData.labels.length > 0;
        toggleNoDataMessage("partsBarChart", !hasPartsData);

        let partDatasets;
        if (hasPartsData) {
            // Logic สำหรับ API ระบบใหม่
            if (partsData.datasets) {
                partDatasets = partsData.datasets.map(ds => {
                    const colorMap = {
                        'FG': getCssVar('--mes-color-success'),
                        'HOLD': getCssVar('--mes-color-warning'),
                        'SCRAP': getCssVar('--mes-color-danger')
                    };
                    return { ...ds, backgroundColor: colorMap[ds.label] || '#adb5bd' };
                });
            } 
            // Logic สำหรับ API ระบบเก่า
            else {
                const countTypes = { 
                    FG: '--mes-color-success', NG: '--mes-color-danger',
                    HOLD: '--mes-color-warning', REWORK: '--mes-chart-color-3',
                    SCRAP: '--mes-chart-color-4', ETC: '#adb5bd'
                };
                partDatasets = Object.keys(countTypes).map(type => ({
                    label: type,
                    data: partsData[type] || [],
                    backgroundColor: getCssVar(countTypes[type])
                }));
            }
        } else {
            partDatasets = [];
        }
        
        renderBarChart('partsBarChart', hasPartsData ? partsData.labels.map(l => truncateLabel(l, 8)) : [], partDatasets, { 
            isStacked: true, 
            originalLabels: hasPartsData ? partsData.labels : [], 
            unitLabel: 'pcs' 
        });
        
        
        // --- Stop Cause Bar Chart ---
        const stopCauseData = responseData.stop_causes || responseData.data?.stopCause;
        const hasStopCauseData = stopCauseData && stopCauseData.labels && stopCauseData.labels.length > 0;
        toggleNoDataMessage("stopCauseBarChart", !hasStopCauseData);

        const stopCauseDatasets = hasStopCauseData ? stopCauseData.datasets : [];

        renderBarChart('stopCauseBarChart', hasStopCauseData ? stopCauseData.labels : [], stopCauseDatasets, { 
            isStacked: true, 
            unitLabel: 'min', 
            originalLabels: hasStopCauseData ? stopCauseData.labels : [] 
        });
        // --- END ---

    } catch (err) {
        console.error("Bar chart fetch failed:", err);
        toggleErrorMessage("partsBarChart", true);
        toggleErrorMessage("stopCauseBarChart", true);
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