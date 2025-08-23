// script/OEE_barchart.js (เวอร์ชันอัปเกรดสำหรับ Theme)
"use strict";

// ตัวแปรสำหรับเก็บ Instance ของ Chart
const barChartInstances = {}; 
Chart.register(ChartZoom);

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

/**
 * Helper function to get CSS variable values.
 * @param {string} varName - The name of the CSS variable (e.g., '--mes-color-success').
 * @returns {string} The color value.
 */
function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// --- 1. ฟังก์ชันใหม่: สำหรับดึงชุดสีตามธีมปัจจุบัน ---
function getBarChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            ticksColor: '#ccc',
            gridColor: '#444',
            legendColor: '#ccc'
        };
    } else {
        return {
            ticksColor: '#6c757d',
            gridColor: '#dee2e6',
            legendColor: '#212529'
        };
    }
}

function truncateLabel(label, maxLength = 4) {
    if (typeof label !== 'string') return '';
    return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
}

// --- Start: ★★★ VERSION FOR DEBUGGING ★★★ ---
function renderBarChart(canvasId, labels, datasets, options = {}) {
    const { isStacked, originalLabels, unitLabel } = options;
    const themeColors = getBarChartThemeColors();
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const chartInstance = barChartInstances[canvasId];

    // ======================================================
    // ★★★ จุดตรวจสอบ ★★★
    // ======================================================
    if (!chartInstance) {
        console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Instance NOT found. Creating NEW chart.`);

        // (โค้ดสำหรับ new Chart(...) ทั้งหมดเหมือนเดิม)
        barChartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
        console.log(`[${new Date().toLocaleTimeString()}] Chart '${canvasId}': Instance FOUND. Updating existing chart.`);

        // (โค้ดสำหรับอัปเดตทั้งหมดเหมือนเดิม)
        chartInstance.data.labels = labels;
        chartInstance.data.datasets = datasets;
        chartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
        chartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
        chartInstance.update();
    }
}
// --- End: ★★★ VERSION FOR DEBUGGING ★★★ ---

async function fetchAndRenderBarCharts() {
    toggleLoadingState("partsBarChart", true);
    toggleLoadingState("stopCauseBarChart", true);
    try {
        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });
        const response = await fetch(`api/get_oee_barchart.php?${params.toString()}`);
        const responseData = await response.json();
        if (!responseData.success) throw new Error(responseData.message || "Failed to fetch bar chart data.");
        const data = responseData.data;

        // Render "Parts Bar Chart"
        const originalPartLabels = data.parts.labels || [];
        const truncatedPartLabels = originalPartLabels.map(label => truncateLabel(label, 8));
        const countTypes = {
            FG: getCssVar('--mes-color-success'),
            NG: getCssVar('--mes-color-danger'),
            HOLD: getCssVar('--mes-color-warning'),
            REWORK: getCssVar('--mes-chart-color-3'),
            SCRAP: getCssVar('--mes-chart-color-4'),
            ETC: '#adb5bd'
        };
        const partDatasets = Object.keys(countTypes).map(type => ({
            label: type,
            data: data.parts[type] || [],
            backgroundColor: countTypes[type]
        }));

        renderBarChart('partsBarChart', truncatedPartLabels, partDatasets,
            { isStacked: true, originalLabels: originalPartLabels, unitLabel: 'pcs' }
        );

        // Render "Stop Cause Bar Chart"
        const stopCauseLabels = data.stopCause.labels || [];
        const causeColors = { 
            'Man': '#42a5f5', 'Machine': '#26c6da', 'Method': '#64b5f6', 'Material': '#9e9e9e',
            'Measurement': '#78909c', 'Environment': '#546e7a', 'Other': '#bdbdbd'
        };
        const stopCauseDatasets = Object.keys(causeColors).map(cause => ({
            label: cause,
            data: data.stopCause[cause] || [],
            backgroundColor: causeColors[cause]
        }));
        
        renderBarChart('stopCauseBarChart', stopCauseLabels, stopCauseDatasets,
            { isStacked: true, unitLabel: 'min', originalLabels: stopCauseLabels } // ส่ง originalLabels ไปด้วย
        );

    } catch (err) {
        console.error("Bar chart fetch failed:", err);
    } finally {
        toggleLoadingState("partsBarChart", false);
        toggleLoadingState("stopCauseBarChart", false);
    }
}

// --- 3. ส่วนที่เพิ่มเข้ามา: lắng nghe (listen) การเปลี่ยนแปลงธีม ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                // ต้อง Destroy กราฟทิ้งเมื่อเปลี่ยนธีม เพื่อให้ Tooltip สร้าง Callbacks ใหม่
                Object.values(barChartInstances).forEach(instance => instance?.destroy());
                barChartInstances.partsBarChart = null;
                barChartInstances.stopCauseBarChart = null;
                fetchAndRenderBarCharts();
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});