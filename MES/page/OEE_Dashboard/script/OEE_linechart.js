// script/OEE_linechart.js
"use strict";

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
        // --- [แก้ไข] คำนวณและปรับ startDate สำหรับ API ---
        const minLineChartDays = 30; // <== กำหนดขั้นต่ำ 30 วัน
        let filterStartDateStr = document.getElementById("startDate")?.value || '';
        const filterEndDateStr = document.getElementById("endDate")?.value || '';
        const filterLine = document.getElementById("lineFilter")?.value || '';
        const filterModel = document.getElementById("modelFilter")?.value || '';

        let apiStartDateStr = filterStartDateStr; // เริ่มต้นด้วยค่าจาก filter
        try { // ใช้ try-catch เผื่อวันที่ใน filter ไม่ถูกต้อง
            const endDate = new Date(filterEndDateStr);
            const startDate = new Date(filterStartDateStr);

            const diffTime = Math.abs(endDate - startDate);
            // +1 เพื่อรวมวันเริ่มและวันสิ้นสุด
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays < minLineChartDays && !isNaN(endDate.getTime())) { // เช็คด้วยว่า endDate ถูกต้อง
                console.log(`LineChart: Date range (${diffDays} days) is less than minimum ${minLineChartDays} days. Adjusting start date for API call.`);
                const adjustedStartDate = new Date(endDate);
                // endDate - 29 วัน = 30 วันรวม endDate
                adjustedStartDate.setDate(endDate.getDate() - (minLineChartDays - 1));
                apiStartDateStr = adjustedStartDate.toISOString().split('T')[0];
            }
        } catch(e) {
            console.error("LineChart: Error parsing dates for minimum range check:", e);
            // ถ้า parse วันที่ไม่ได้ ก็ใช้ค่าจาก filter ไปตามเดิม
            apiStartDateStr = filterStartDateStr;
        }
        // --- [สิ้นสุดการแก้ไข] ---


        // ใช้ apiStartDateStr และ filterEndDateStr ในการเรียก API
        const params = new URLSearchParams({
            startDate: apiStartDateStr, // <== ใช้ค่าที่อาจปรับแล้ว
            endDate: filterEndDateStr,  // <== ใช้ค่า endDate เดิมจาก filter
            line: filterLine,
            model: filterModel
        });

        console.log(`LineChart: Fetching data from ${apiStartDateStr} to ${filterEndDateStr}`); // Log วันที่ที่ใช้จริง
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
                // Ensure data exists before assigning
                const key = Object.keys(chartData)[index];
                dataset.data = chartData[key] || [];
            });

            // Update theme colors
            oeeLineChart.options.plugins.legend.labels.color = themeColors.legendColor;
            oeeLineChart.options.scales.x.ticks.color = themeColors.ticksColor;
            oeeLineChart.options.scales.x.grid.color = themeColors.gridColor;
            oeeLineChart.options.scales.y.ticks.color = themeColors.ticksColor;
            oeeLineChart.options.scales.y.grid.color = themeColors.gridColor;
            // Update annotation colors if annotation plugin is available
            if (oeeLineChart.options.plugins.annotation) {
                oeeLineChart.options.plugins.annotation.annotations.targetLine.borderColor = themeColors.targetLineColor;
                oeeLineChart.options.plugins.annotation.annotations.targetLine.label.backgroundColor = themeColors.targetLabelBg;
                oeeLineChart.options.plugins.annotation.annotations.targetLine.label.color = themeColors.targetLabelColor;
            }

            oeeLineChart.update();
        }
    } catch (err) {
        console.error("Line chart fetch failed:", err);
        toggleErrorMessage("oeeLineChart", true);

        // Attempt to initialize an empty chart on error to prevent issues
        if (!oeeLineChart || oeeLineChart.destroyed) {
            try {
                const themeColors = getLineChartThemeColors();
                initializeLineChart([], { oee: [], quality: [], performance: [], availability: [] }, themeColors);
            } catch (initError) {
                console.error("Failed to initialize empty line chart after error:", initError);
            }
        } else {
             // Clear existing chart data on error
             oeeLineChart.data.labels = [];
             oeeLineChart.data.datasets.forEach(dataset => dataset.data = []);
             oeeLineChart.update();
        }
    } finally {
        toggleLoadingState("oeeLineChart", false);
    }
}


function initializeLineChart(labels, data, themeColors) {
    const ctx = document.getElementById("oeeLineChart")?.getContext("2d");
    if (!ctx) return;

    // Destroy previous instance if it exists
    if (oeeLineChart && typeof oeeLineChart.destroy === 'function') {
        oeeLineChart.destroy();
    }

    const oeeColor = getCssVar('--mes-chart-color-1');
    const qualityColor = getCssVar('--mes-chart-color-2');
    const performanceColor = getCssVar('--mes-chart-color-3');
    const availabilityColor = getCssVar('--mes-chart-color-4');

    const datasets = [
        {
            label: "OEE (%)",
            data: data.oee || [], // Default to empty array
            borderColor: oeeColor,
            backgroundColor: oeeColor + '20',
            tension: 0.3,
            fill: true
        },
        {
            label: "Quality (%)",
            data: data.quality || [],
            borderColor: qualityColor,
            backgroundColor: qualityColor + '20',
            tension: 0.3,
            fill: true
        },
        {
            label: "Performance (%)",
            data: data.performance || [],
            borderColor: performanceColor,
            backgroundColor: performanceColor + '20',
            tension: 0.3,
            fill: true
        },
        {
            label: "Availability (%)",
            data: data.availability || [],
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
                // Ensure annotation plugin is registered globally or passed via config if needed
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
                zoom: { // Ensure zoom plugin is registered
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

// Theme change listener remains the same
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (oeeLineChart) {
                    console.log("Theme changed, re-fetching line chart data...");
                    fetchAndRenderLineCharts(); // Re-fetch will also apply new theme colors
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
    // Note: Initial fetch is triggered by dashboard_filters.js
});