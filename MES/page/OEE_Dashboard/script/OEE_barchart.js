// script/OEE_barchart.js (เวอร์ชันอัปเกรดสำหรับ Theme)
"use strict";

// ตัวแปรสำหรับเก็บ Instance ของ Chart
let partsBarChartInstance, stopCauseBarChartInstance;
Chart.register(ChartZoom);

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

// --- (ฟังก์ชัน truncateLabel และ padBarData เหมือนเดิม) ---
function truncateLabel(label, maxLength = 4) {
    if (typeof label !== 'string') return '';
    return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
}

/**
 * --- 2. แก้ไข: ฟังก์ชันสำหรับ Render หรือ Update Bar Chart ---
 */
function renderBarChart(chartInstance, ctx, labels, datasets, customOptions = {}) {
    const themeColors = getBarChartThemeColors(); // << ดึงสีธีมปัจจุบัน
    const isStacked = customOptions.isStacked || false;
    const originalLabels = customOptions.originalLabels || labels;
    const unitLabel = customOptions.unitLabel || '';

    // --- ถ้า Chart มีอยู่แล้ว ให้อัปเดตข้อมูลและสี ---
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets = datasets;

        // อัปเดตสีใน Options
        chartInstance.options.plugins.legend.labels.color = themeColors.legendColor;
        chartInstance.options.scales.x.ticks.color = themeColors.ticksColor;
        chartInstance.options.scales.y.ticks.color = themeColors.ticksColor;
        chartInstance.options.scales.y.grid.color = themeColors.gridColor;

        chartInstance.options.plugins.tooltip.callbacks.title = (tooltipItems) => {
            if (tooltipItems.length > 0) {
                const dataIndex = tooltipItems[0].dataIndex;
                return (customOptions.originalLabels || labels)[dataIndex]; 
            }
            return '';
        };
        chartInstance.update();
        return chartInstance;
    }

    // --- ถ้า Chart ยังไม่มี ให้สร้างใหม่ ---
    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800 },
            plugins: {
                legend: { display: true, labels: { color: themeColors.legendColor } }, // << ใช้สีธีม
                title: { display: false },
                tooltip: {
                    // ... (callbacks เหมือนเดิม) ...
                },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            layout: { padding: 5 },
            scales: {
                x: {
                    stacked: isStacked,
                    ticks: { color: themeColors.ticksColor, autoSkip: false, maxRotation: customOptions.rotateLabels ? 45 : 0, minRotation: customOptions.rotateLabels ? 45 : 0 },
                    grid: { display: false }
                },
                y: { 
                    beginAtZero: true, 
                    stacked: isStacked, 
                    ticks: { color: themeColors.ticksColor }, 
                    grid: { drawBorder: false, color: themeColors.gridColor } // << ใช้สีธีม
                }
            }
        }
    });
}

// --- (ฟังก์ชัน fetchAndRenderBarCharts เหมือนเดิมเกือบทั้งหมด) ---
async function fetchAndRenderBarCharts() {
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

        // --- Render "Parts Bar Chart" ---
        const partsCtx = document.getElementById("partsBarChart")?.getContext("2d");
        if (partsCtx) {
            const originalPartLabels = data.parts.labels || [];
            const truncatedPartLabels = originalPartLabels.map(label => truncateLabel(label, 8));
            const countTypes = { FG: "#00C853", NG: "#FF5252", HOLD: "#FFD600", REWORK: "#2979FF", SCRAP: "#9E9E9E", ETC: "#AA00FF" };
            const partDatasets = Object.keys(countTypes).map(type => ({
                label: type,
                data: data.parts[type] || [],
                backgroundColor: countTypes[type]
            }));

            partsBarChartInstance = renderBarChart(
                partsBarChartInstance, partsCtx, truncatedPartLabels, partDatasets,
                { isStacked: true, originalLabels: originalPartLabels, unitLabel: 'pcs' }
            );
        }

        // --- Render "Stop Cause Bar Chart" ---
        const stopCauseCtx = document.getElementById("stopCauseBarChart")?.getContext("2d");
        if (stopCauseCtx) {
            const stopCauseLabels = data.stopCause.labels || [];
            const causeColors = { 'Man': '#42A5F5', 'Machine': '#FFA726', 'Method': '#66BB6A', 'Material': '#EF5350', 'Other': '#BDBDBD' };
            const stopCauseDatasets = Object.keys(causeColors).map(cause => ({
                label: cause,
                data: data.stopCause[cause] || [],
                backgroundColor: causeColors[cause]
            }));

            stopCauseBarChartInstance = renderBarChart(
                stopCauseBarChartInstance, stopCauseCtx, stopCauseLabels, stopCauseDatasets,
                { isStacked: true, unitLabel: 'min' }
            );
        }
    } catch (err) {
        console.error("Bar chart fetch failed:", err);
    }
}

// --- 3. ส่วนที่เพิ่มเข้ามา: lắng nghe (listen) การเปลี่ยนแปลงธีม ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                // วาดกราฟใหม่เมื่อธีมเปลี่ยน
                if (partsBarChartInstance || stopCauseBarChartInstance) {
                    fetchAndRenderBarCharts(); 
                }
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});