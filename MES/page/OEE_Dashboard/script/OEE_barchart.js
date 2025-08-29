"use strict";

const barChartInstances = {};

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
        wrapper.classList.remove('has-error');
        show ? wrapper.classList.add('has-no-data') : wrapper.classList.remove('has-no-data');
    }
}

function toggleErrorMessage(canvasId, show) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        wrapper.classList.remove('has-no-data');
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

function truncateLabel(label, maxLength = 8) {
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
                animation: { duration: 500 },
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

        // ===== START: โค้ดที่แก้ไขกลับไปเป็นแบบเดิมของคุณ =====
        // อัปเดตข้อมูลในแต่ละ dataset เพื่อให้ animation ทำงานถูกต้อง
        chartInstance.data.datasets.forEach((oldDataset, index) => {
            const newDataset = datasets[index];
            if (newDataset) {
                oldDataset.label = newDataset.label;
                oldDataset.data = newDataset.data;
                oldDataset.backgroundColor = newDataset.backgroundColor;
            }
        });
        
        // หากจำนวน dataset ใหม่มีมากกว่าของเก่า ให้เพิ่มเข้าไป
        if (datasets.length > chartInstance.data.datasets.length) {
            for (let i = chartInstance.data.datasets.length; i < datasets.length; i++) {
                chartInstance.data.datasets.push(datasets[i]);
            }
        } 
        // หากจำนวน dataset ใหม่มีน้อยกว่าของเก่า ให้ลบออก
        else if (datasets.length < chartInstance.data.datasets.length) {
             chartInstance.data.datasets.length = datasets.length;
        }
        // ===== END: โค้ดที่แก้ไขกลับไปเป็นแบบเดิมของคุณ =====

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
        if (!responseData.success) throw new Error(responseData.error || "Barchart API: Failed to fetch bar chart data.");

        // --- Parts Bar Chart (Production Results) ---
        const partsData = responseData.data?.parts;
        const hasPartsData = partsData && partsData.labels && partsData.labels.length > 0;
        toggleNoDataMessage("partsBarChart", !hasPartsData);

        let partDatasets = [];
        if (hasPartsData) {
            const countTypes = { 
                FG: '--mes-color-success',
                HOLD: '--mes-color-warning',
                SCRAP: '--mes-color-danger'
            };
            partDatasets = Object.keys(countTypes)
                .map(type => ({
                    label: type,
                    data: partsData[type] || [],
                    backgroundColor: getCssVar(countTypes[type])
                }))
                .filter(ds => ds.data.some(val => val > 0)); 
        }
        
        renderBarChart('partsBarChart', hasPartsData ? partsData.labels.map(l => truncateLabel(l)) : [], partDatasets, { 
            isStacked: true, 
            originalLabels: hasPartsData ? partsData.labels : [], 
            unitLabel: 'pcs' 
        });
        
        // --- Stop Cause Bar Chart ---
        const stopCauseData = responseData.data?.stopCause;
        const hasStopCauseData = stopCauseData && stopCauseData.labels && stopCauseData.labels.length > 0;
        toggleNoDataMessage("stopCauseBarChart", !hasStopCauseData);

        const stopCauseDatasets = hasStopCauseData ? stopCauseData.datasets : [];
        if (hasStopCauseData) {
            // ทำให้มีสีเดียวเสมอ
            stopCauseDatasets[0].backgroundColor = getCssVar('--mes-chart-color-1');
        }

        renderBarChart('stopCauseBarChart', hasStopCauseData ? stopCauseData.labels : [], stopCauseDatasets, { 
            isStacked: true, 
            unitLabel: 'min', 
            originalLabels: hasStopCauseData ? stopCauseData.labels : [] 
        });

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