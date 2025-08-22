// script/OEE_piechart.js (เวอร์ชันแก้ไข Bug และทำให้ Loss มีความหมาย)
"use strict";

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
            centerTextColor: '#dee2e6', lossBgColor: '#495057',
            successColor: '#66bb6a', warningColor: '#ffa726',
            secondaryTextColor: '#adb5bd' // << เพิ่มสีสำหรับข้อความรอง
        };
    } else {
        return {
            centerTextColor: '#212529', lossBgColor: '#e9ecef',
            successColor: '#198754', warningColor: '#dc3545',
            secondaryTextColor: '#6c757d' // << เพิ่มสีสำหรับข้อความรอง
        };
    }
}

function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${h}h ${m}m`;
}

function updateInfoBox(elementId, lines, targetValue) {
    const infoBox = document.getElementById(elementId);
    if (!infoBox) return;
    let content = '<div class="info-grid">';
    lines.forEach(line => {
        const parts = line.split(':');
        content += `<div class="info-label">${parts[0] ? parts[0].trim() : ''}</div>`;
        content += `<div class="info-value">${parts[1] ? parts[1].trim() : ''}</div>`;
    });
    if (targetValue !== undefined) {
        content += `<div class="info-label">Target</div>`;
        content += `<div class="info-value"><b>${targetValue.toFixed(1)} %</b></div>`;
    }
    content += '</div>';
    infoBox.innerHTML = content;
}

/**
 * --- แก้ไข: ฟังก์ชันวาดกราฟ ให้รับ "ข้อมูลรอง" มาแสดง ---
 * @param {string} secondaryText - ข้อความรองที่จะแสดงตรงกลาง
 */
function renderSimplePieChart(chartName, ctx, labels, data, colors, targetValue, secondaryText = '') {
    if (!ctx) return;
    const themeColors = getChartThemeColors();
    const value = data[0];
    const centerTextColor = value >= targetValue ? themeColors.successColor : themeColors.warningColor;

    if (charts[chartName]) {
        charts[chartName].data.labels = labels;
        charts[chartName].data.datasets[0].data = data;
        charts[chartName].options.plugins.centerText.color = centerTextColor;
        charts[chartName].options.plugins.centerText.secondaryText = secondaryText; // << อัปเดตข้อความรอง
        charts[chartName].update();
        return;
    }

    charts[chartName] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, cutout: '80%', borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: true, animation: { duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%` } },
                centerText: { // << ส่งข้อมูลทั้งหมดที่ plugin ต้องการ
                    color: centerTextColor,
                    secondaryColor: themeColors.secondaryTextColor,
                    secondaryText: secondaryText
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                const opts = chart.options.plugins.centerText;
                ctx.restore();

                // Main Text (Percentage)
                const mainFontSize = (height / 140).toFixed(2);
                ctx.font = `bold ${mainFontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                const mainText = `${chart.data.datasets[0].data[0].toFixed(1)}%`;
                const mainTextX = Math.round((width - ctx.measureText(mainText).width) / 2);
                const mainTextY = height / 2 - (opts.secondaryText ? 10 : 0); // << ขยับขึ้นถ้ามีข้อความรอง
                ctx.fillStyle = opts.color || '#000';
                ctx.fillText(mainText, mainTextX, mainTextY);

                // --- ส่วนที่เพิ่มเข้ามา: วาดข้อความรอง ---
                if (opts.secondaryText) {
                    const secondaryFontSize = (height / 300).toFixed(2);
                    ctx.font = `${secondaryFontSize}em sans-serif`;
                    const secondaryText = opts.secondaryText;
                    const secondaryTextX = Math.round((width - ctx.measureText(secondaryText).width) / 2);
                    const secondaryTextY = mainTextY + (height * 0.15); // << ตำแหน่งใต้ข้อความหลัก
                    ctx.fillStyle = opts.secondaryColor || '#888';
                    ctx.fillText(secondaryText, secondaryTextX, secondaryTextY);
                }
                ctx.save();
            }
        }]
    });
}


async function fetchAndRenderCharts() {
    try {
        const response = await fetch(`api/get_oee_piechart.php?${new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        }).toString()}`);
        if (!response.ok) throw new Error(`Network response was not ok`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "API error");

        const themeColors = getChartThemeColors();

        // --- 1. OEE Card (ภาพรวม) ---
        const totalLoss = 100 - (data.oee || 0);
        const qualityLossRatio = Math.max(0, 1 - ((data.quality || 0) / 100));
        const performanceLossRatio = Math.max(0, 1 - ((data.performance || 0) / 100));
        const availabilityLossRatio = Math.max(0, 1 - ((data.availability || 0) / 100));
        const totalRatio = qualityLossRatio + performanceLossRatio + availabilityLossRatio;

        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"), 
            ['OEE', 'Loss'], [data.oee || 0, totalLoss], 
            ['#2979ff', themeColors.lossBgColor], OEE_TARGETS.oee
        );
        updateInfoBox("oeeInfo", [
            `OEE Loss: <b>${totalLoss.toFixed(1)} %</b>`,
            `Q Contrib: <b>${(totalRatio > 0 ? (qualityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `P Contrib: <b>${(totalRatio > 0 ? (performanceLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `A Contrib: <b>${(totalRatio > 0 ? (availabilityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`
        ], OEE_TARGETS.oee);


        // --- 2. Quality Card (เจาะลึก) ---
        const totalDefects = (data.ng || 0) + (data.rework || 0) + (data.hold || 0) + (data.scrap || 0) + (data.etc || 0);
        const qualityPercent = ((data.fg || 0) + totalDefects) > 0 ? ((data.fg || 0) / ((data.fg || 0) + totalDefects)) * 100 : 100;
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"), 
            ['Good (FG)', 'Defects'], [qualityPercent, 100 - qualityPercent], 
            ['#ab47bc', themeColors.lossBgColor], OEE_TARGETS.quality,
            `FG: ${(data.fg || 0).toLocaleString()} pcs`
        );
        updateInfoBox("qualityInfo", [
            `Good (FG): <b>${(data.fg || 0).toLocaleString()}</b> pcs`,
            `Defects: <b>${totalDefects.toLocaleString()}</b> pcs`
        ], OEE_TARGETS.quality);


        // --- 3. Performance Card (เจาะลึก) ---
        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"), 
            ['Performance', 'Loss'], [data.performance || 0, 100 - (data.performance || 0)], 
            ['#7e57c2', themeColors.lossBgColor], OEE_TARGETS.performance,
            `Actual: ${(data.actual_output || 0).toLocaleString()} pcs`
        );
        updateInfoBox("performanceInfo", [
            `Actual: <b>${(data.actual_output || 0).toLocaleString()}</b> pcs`,
            `Theo. Time: <b>${formatMinutes(data.debug_info?.total_theoretical_minutes || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.performance);


        // --- 4. Availability Card (เจาะลึก) ---
        const runtimePercent = (data.planned_time || 0) > 0 ? ((data.runtime || 0) / data.planned_time) * 100 : 100;
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"), 
            ['Runtime', 'Downtime'], [runtimePercent, 100 - runtimePercent], 
            ['#42a5f5', themeColors.lossBgColor], OEE_TARGETS.availability,
            `Downtime: ${formatMinutes(data.downtime || 0)}`
        );
        updateInfoBox("availabilityInfo", [
            `Planned: <b>${formatMinutes(data.planned_time || 0)}</b>`,
            `Downtime: <b>${formatMinutes(data.downtime || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
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