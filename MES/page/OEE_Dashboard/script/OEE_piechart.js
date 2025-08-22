// script/OEE_piechart.js (เวอร์ชันอัปเกรด เพิ่ม Target และสีสถานะ)
"use strict";

// --- 1. เพิ่ม: กำหนดค่าเป้าหมาย (Target) สำหรับแต่ละ KPI ---
const OEE_TARGETS = {
    oee: 85.0,
    quality: 99.0,
    performance: 90.0,
    availability: 95.0
};

const charts = { oee: null, quality: null, performance: null, availability: null };

function getChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            centerTextColor: '#dee2e6',
            lossBgColor: '#495057',
            successColor: '#66bb6a', // สีเขียว
            warningColor: '#ffa726'  // สีส้ม/แดง
        };
    } else {
        return {
            centerTextColor: '#212529',
            lossBgColor: '#e9ecef',
            successColor: '#198754', // สีเขียว
            warningColor: '#dc3545'  // สีแดง
        };
    }
}

function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${h}h ${m}m`;
}

// --- 2. แก้ไข: ฟังก์ชัน updateInfoBox ให้รับค่า Target มาแสดง ---
function updateInfoBox(elementId, lines, targetValue) {
    const infoBox = document.getElementById(elementId);
    if (!infoBox) return;

    let content = '<div class="info-grid">';
    lines.forEach(line => {
        const parts = line.split(':');
        content += `<div class="info-label">${parts[0] ? parts[0].trim() : ''}</div>`;
        content += `<div class="info-value">${parts[1] ? parts[1].trim() : ''}</div>`;
    });
    // เพิ่มบรรทัด Target เข้าไป
    if (targetValue !== undefined) {
        content += `<div class="info-label">Target</div>`;
        content += `<div class="info-value"><b>${targetValue.toFixed(1)} %</b></div>`;
    }
    content += '</div>';
    infoBox.innerHTML = content;
}

/**
 * --- 3. แก้ไข: ฟังก์ชันวาดกราฟ ให้รับ Target และเปลี่ยนสีตามสถานะ ---
 * @param {number} targetValue - ค่าเป้าหมายสำหรับ KPI นี้
 */
function renderSimplePieChart(chartName, ctx, label, rawValue, mainColor, targetValue) {
    if (!ctx) return;

    const themeColors = getChartThemeColors();
    const value = Math.max(0, Math.min(rawValue, 100));
    const loss = 100 - value;

    // --- ตรรกะสำหรับเลือกสีตัวอักษร ---
    const centerTextColor = value >= targetValue ? themeColors.successColor : themeColors.warningColor;

    if (charts[chartName]) {
        charts[chartName].data.datasets[0].data = [value, loss];
        charts[chartName].data.datasets[0].backgroundColor = [mainColor, themeColors.lossBgColor];
        charts[chartName].options.plugins.centerText.color = centerTextColor; // อัปเดตสีตัวอักษร
        charts[chartName].update();
        return;
    }

    charts[chartName] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [label, 'Loss'],
            datasets: [{
                data: [value, loss],
                backgroundColor: [mainColor, themeColors.lossBgColor],
                cutout: '80%',
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, animation: { duration: 800 },
            layout: { padding: 5 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%` } },
                title: { display: false },
                centerText: { color: centerTextColor } // << ส่งค่าสีที่เลือกแล้ว
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                const color = chart.options.plugins.centerText.color || '#000';
                ctx.restore();
                const fontSize = (height / 150).toFixed(2);
                ctx.font = `bold ${fontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                const text = `${chart.data.datasets[0].data[0].toFixed(1)}%`;
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 2;
                ctx.fillStyle = color; // << ใช้สีตามสถานะ
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}

/**
 * --- 4. แก้ไข: ฟังก์ชันหลัก ให้ส่งค่า Target ไปยังฟังก์ชันวาดกราฟ ---
 */
async function fetchAndRenderCharts() {
    try {
        // ... (โค้ด fetch data เหมือนเดิม) ...
        const response = await fetch(`api/get_oee_piechart.php?${new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        }).toString()}`);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "API returned an error.");

        // --- แก้ไขการเรียกใช้ renderSimplePieChart ให้ส่ง Target ไปด้วย ---
        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"), 'OEE', data.oee || 0, '#00BF63', OEE_TARGETS.oee);
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"), 'Quality', data.quality || 0, '#ab47bc', OEE_TARGETS.quality);
        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"), 'Performance', data.performance || 0, '#ffa726', OEE_TARGETS.performance);
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"), 'Availability', data.availability || 0, '#42a5f5', OEE_TARGETS.availability);

        // --- แก้ไขการเรียกใช้ updateInfoBox ให้ส่ง Target ไปด้วย ---
        updateInfoBox("oeeInfo", [
            `OEE : <b>${(data.oee || 0).toFixed(1)}</b> %`, `Quality : <b>${(data.quality || 0).toFixed(1)}</b> %`,
            `Performance : <b>${(data.performance || 0).toFixed(1)}</b> %`, `Availability : <b>${(data.availability || 0).toFixed(1)}</b> %`
        ], OEE_TARGETS.oee);

        updateInfoBox("qualityInfo", [`FG : <b>${(parseFloat(data.fg) || 0).toLocaleString()}</b> pcs`], OEE_TARGETS.quality);

        updateInfoBox("performanceInfo", [
            `Actual : <b>${(parseFloat(data.actual_output) || 0).toLocaleString()}</b> pcs`,
            `Theo.T : <b>${formatMinutes(data.debug_info?.total_theoretical_minutes || 0)}</b>`,
            `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.performance);

        updateInfoBox("availabilityInfo", [
            `Planned : <b>${formatMinutes(data.planned_time || 0)}</b>`,
            `Downtime : <b>${formatMinutes(data.downtime || 0)}</b>`,
            `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.availability);

    } catch (err) {
        console.error("Pie chart update failed:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderCharts();
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                fetchAndRenderCharts(); 
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});