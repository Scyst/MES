// script/OEE_linechart.js (เวอร์ชันอัปเกรด เพิ่มเส้นเป้าหมาย)
"use strict";

// --- 1. เพิ่ม: กำหนดค่าเป้าหมายหลัก (OEE Target) ---
const OEE_MAIN_TARGET = 85.0;
let oeeLineChart;

function getLineChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            ticksColor: '#ccc',
            gridColor: '#495057', // ปรับให้เข้มขึ้นเล็กน้อย
            legendColor: '#ccc',
            targetLineColor: 'rgba(255, 107, 107, 0.7)', // สีแดงสำหรับเป้าหมาย
            targetLabelBg: 'rgba(255, 107, 107, 0.7)',
            targetLabelColor: '#fff'
        };
    } else {
        return {
            ticksColor: '#6c757d',
            gridColor: '#dee2e6',
            legendColor: '#212529',
            targetLineColor: 'rgba(220, 53, 69, 0.7)', // สีแดงสำหรับเป้าหมาย
            targetLabelBg: 'rgba(220, 53, 69, 0.7)',
            targetLabelColor: '#fff'
        };
    }
}

// --- (ฟังก์ชัน fetchAndRenderLineCharts เหมือนเดิม) ---
async function fetchAndRenderLineCharts() {
    try {
        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });

        const response = await fetch(`api/get_oee_linechart.php?${params.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error("Data error");

        const labels = data.records.map(r => r.date);
        const chartData = {
            oee: data.records.map(r => r.oee),
            quality: data.records.map(r => r.quality),
            performance: data.records.map(r => r.performance),
            availability: data.records.map(r => r.availability)
        };
        const themeColors = getLineChartThemeColors();

        if (!oeeLineChart) {
            initializeLineChart(labels, chartData, themeColors);
        } else {
            oeeLineChart.data.labels = labels;
            oeeLineChart.data.datasets.forEach((dataset, index) => {
                dataset.data = Object.values(chartData)[index];
            });

            // อัปเดตสีและเส้นเป้าหมาย
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
    }
}

/**
 * --- 3. แก้ไข: ฟังก์ชันสร้างกราฟ ให้เพิ่ม "Annotation" (เส้นเป้าหมาย) เข้าไป ---
 */
function initializeLineChart(labels, data, themeColors) {
    const ctx = document.getElementById("oeeLineChart")?.getContext("2d");
    if (!ctx) return;

    const datasets = [
        { label: "OEE (%)", data: data.oee, borderColor: "#00BF63", backgroundColor: "rgba(0, 191, 99, 0.3)", tension: 0.3, fill: true },
        { label: "Quality (%)", data: data.quality, borderColor: "#ab47bc", backgroundColor: "rgba(171, 71, 188, 0.3)", tension: 0.3, fill: true },
        { label: "Performance (%)", data: data.performance, borderColor: "#ffa726", backgroundColor: "rgba(255, 167, 38, 0.3)", tension: 0.3, fill: true },
        { label: "Availability (%)", data: data.availability, borderColor: "#42a5f5", backgroundColor: "rgba(66, 165, 245, 0.3)", tension: 0.3, fill: true }
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
                // --- เพิ่ม plugin "annotation" ---
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: OEE_MAIN_TARGET,
                            yMax: OEE_MAIN_TARGET,
                            borderColor: themeColors.targetLineColor,
                            borderWidth: 2,
                            borderDash: [6, 6], // ทำให้เป็นเส้นประ
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