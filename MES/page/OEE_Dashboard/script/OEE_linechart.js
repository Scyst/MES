// script/OEE_linechart.js (เวอร์ชันอัปเกรด เพิ่มเส้นเป้าหมาย)
"use strict";

// --- 1. เพิ่ม: กำหนดค่าเป้าหมายหลัก (OEE Target) ---
const OEE_MAIN_TARGET = 85.0;
let oeeLineChart;

/**
 * Toggles the loading state of a chart card.
 * @param {string} elementId - The ID of an element inside the card (like the canvas).
 * @param {boolean} isLoading - True to show loading, false to hide.
 */
function toggleLoadingState(elementId, isLoading) {
    const element = document.getElementById(elementId);
    const card = element ? element.closest('.chart-card') : null;
    if (card) {
        if (isLoading) {
            card.classList.add('is-loading');
        } else {
            card.classList.remove('is-loading');
        }
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
        wrapper.classList.remove('has-no-data');
        show ? wrapper.classList.add('has-error') : wrapper.classList.remove('has-error');
    }
}

/**
 * Helper function to get CSS variable values.
 * @param {string} varName - The name of the CSS variable.
 * @returns {string} The color value.
 */
function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getLineChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            ticksColor: '#ccc',
            gridColor: '#495057',
            legendColor: '#ccc',
            targetLineColor: 'rgba(255, 107, 107, 0.7)',
            targetLabelBg: 'rgba(255, 107, 107, 0.7)',
            targetLabelColor: '#fff'
        };
    } else {
        return {
            ticksColor: '#6c757d',
            gridColor: '#dee2e6',
            legendColor: '#212529',
            targetLineColor: 'rgba(220, 53, 69, 0.7)',
            targetLabelBg: 'rgba(220, 53, 69, 0.7)',
            targetLabelColor: '#fff'
        };
    }
}

async function fetchAndRenderLineCharts() {
    toggleLoadingState("oeeLineChart", true);
    toggleErrorMessage("oeeLineChart", false);

    try {
        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });

        const response = await fetch(`api/get_oee_linechart.php?${params.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error("Linechart API: Data error");

        const hasData = data.records && data.records.length > 0;
        toggleNoDataMessage("oeeLineChart", !hasData);

        const labels = hasData ? data.records.map(r => r.date) : [];
        const chartData = hasData ? {
            oee: data.records.map(r => r.oee),
            quality: data.records.map(r => r.quality),
            performance: data.records.map(r => r.performance),
            availability: data.records.map(r => r.availability)
        } : { oee: [], quality: [], performance: [], availability: [] };

        const themeColors = getLineChartThemeColors();
        
        if (!oeeLineChart || oeeLineChart.destroyed) {
            initializeLineChart(labels, chartData, themeColors);
        } else {
            oeeLineChart.data.labels = labels;
            oeeLineChart.data.datasets.forEach((dataset, index) => {
                dataset.data = Object.values(chartData)[index];
            });

            oeeLineChart.options.plugins.legend.labels.color = themeColors.legendColor;
            oeeLineChart.options.scales.x.ticks.color = themeColors.ticksColor;
            oeeLineChart.options.scales.x.grid.color = themeColors.gridColor;
            oeeLineChart.options.scales.y.ticks.color = themeColors.ticksColor;
            oeeLineChart.options.scales.y.grid.color = themeColors.gridColor;
            oeeLineChart.options.plugins.annotation.annotations.targetLine.borderColor = themeColors.targetLineColor;
            oeeLineChart.options.plugins.annotation.annotations.targetLine.label.backgroundColor = themeColors.targetLabelBg;
            oeeLineChart.options.plugins.annotation.annotations.targetLine.label.color = themeColors.targetLabelColor;

            oeeLineChart.update();
        }
    } catch (err) {
        console.error("Line chart fetch failed:", err);
        toggleErrorMessage("oeeLineChart", true);

        if (!oeeLineChart || oeeLineChart.destroyed) {
            const themeColors = getLineChartThemeColors();
            initializeLineChart([], { oee: [], quality: [], performance: [], availability: [] }, themeColors);
        }
    } finally {
        toggleLoadingState("oeeLineChart", false);
    }
}

function initializeLineChart(labels, data, themeColors) {
    const ctx = document.getElementById("oeeLineChart")?.getContext("2d");
    if (!ctx) return;

    const oeeColor = getCssVar('--mes-chart-color-1');
    const qualityColor = getCssVar('--mes-chart-color-2');
    const performanceColor = getCssVar('--mes-chart-color-3');
    const availabilityColor = getCssVar('--mes-chart-color-4');

    const datasets = [
        { 
            label: "OEE (%)", 
            data: data.oee, 
            borderColor: oeeColor, 
            backgroundColor: oeeColor + '20',
            tension: 0.3, 
            fill: true 
        },
        { 
            label: "Quality (%)", 
            data: data.quality, 
            borderColor: qualityColor, 
            backgroundColor: qualityColor + '20',
            tension: 0.3, 
            fill: true 
        },
        { 
            label: "Performance (%)", 
            data: data.performance, 
            borderColor: performanceColor, 
            backgroundColor: performanceColor + '20',
            tension: 0.3, 
            fill: true 
        },
        { 
            label: "Availability (%)", 
            data: data.availability, 
            borderColor: availabilityColor, 
            backgroundColor: availabilityColor + '20',
            tension: 0.3, 
            fill: true 
        }
    ];

    oeeLineChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800 },
            plugins: {
                title: { display: false },
                legend: { 
                    display: true, 
                    labels: { color: themeColors.legendColor }
                },
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: OEE_MAIN_TARGET,
                            yMax: OEE_MAIN_TARGET,
                            borderColor: themeColors.targetLineColor,
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: `Target: ${OEE_MAIN_TARGET}%`,
                                enabled: true,
                                position: 'end',
                                backgroundColor: themeColors.targetLabelBg,
                                color: themeColors.targetLabelColor,
                                font: { weight: 'bold' }
                            }
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: { ticks: { color: themeColors.ticksColor, font: { size: 10 } }, grid: { display: false } },
                y: { beginAtZero: true, max: 100, ticks: { color: themeColors.ticksColor, font: { size: 10 } }, grid: { color: themeColors.gridColor } }
            },
            layout: { padding: 10 }
        }
    });
}

// --- (ส่วน lắng nghe การเปลี่ยนแปลงธีมเหมือนเดิม) ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (oeeLineChart) {
                    fetchAndRenderLineCharts(); 
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});