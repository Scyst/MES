// script/ OEE_OEEchart.js
"use strict";

// =================================================================
// ส่วนที่ 1: กราฟเส้น OEE ตัวใหญ่ (Main Line Chart)
// =================================================================
const OEE_MAIN_TARGET = 85.0;
let oeeLineChart; // ⭐️ [FIX] ลบ window. ออก

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

function initializeLineChart(labels, data, themeColors) {
    const ctx = document.getElementById("oeeLineChart")?.getContext("2d");
    if (!ctx) return;

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
            data: data.oee || [], 
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

    oeeLineChart = new Chart(ctx, { // ⭐️ [FIX] ลบ window. ออก
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
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
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

/**
 * [ฟังก์ชันใหม่] ดึงข้อมูลสำหรับ Line Chart และ Sparklines
 * โดยใช้ Logic Min 7/30 days
 */
async function fetchAndRenderLineCharts() {
    toggleLoadingState("oeeLineChart", true); 
    toggleErrorMessage("oeeLineChart", false);
    
    // 1. อ่านค่า Filter
    const userStartDateStr = document.getElementById("startDate")?.value || '';
    const userEndDateStr = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    
    // 2. คำนวณ Date Range ตาม Logic ของคุณ
    const endDate = new Date(userEndDateStr);
    
    // 2a. สำหรับ Line Chart (Min 30 days)
    const minLineStartDate = new Date(endDate);
    minLineStartDate.setDate(endDate.getDate() - 29); // 30 วันย้อนหลัง (รวม endDate)
    const userStartDate = new Date(userStartDateStr);
    
    // เลือกวันที่เริ่มต้นที่ "เก่ากว่า" ระหว่างที่ User เลือก หรือ 30 วันก่อน
    const apiStartDate = userStartDate < minLineStartDate ? userStartDate : minLineStartDate;
    const apiStartDateStr = apiStartDate.toISOString().split('T')[0];

    // 2b. สำหรับ Sparkline (Min 7 days)
    const minSparklineStartDate = new Date(endDate);
    minSparklineStartDate.setDate(endDate.getDate() - 6); // 7 วันย้อนหลัง (รวม endDate)
    const sparklineStartDateStr = minSparklineStartDate.toISOString().split('T')[0];

    // 3. เรียก API (api/get_oee_linechart.php)
    const params = new URLSearchParams({
        startDate: apiStartDateStr, // ใช้วันที่คำนวณแล้ว
        endDate: userEndDateStr,    // ใช้วันที่ User เลือก
        line: line,
        model: model
    });

    try {
        const response = await fetch(`api/get_oee_linechart.php?${params.toString()}`);
        if (!response.ok) throw new Error(`Linechart API: Network response was not ok`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.message || "Linechart API: API error");

        const records = result.records || [];
        const hasLineData = records.length > 0;
        
        toggleNoDataMessage("oeeLineChart", !hasLineData);
        
        // 4. เตรียมข้อมูลสำหรับ Chart.js
        const labels = records.map(r => r.date); // 'date' format (d-m-y) จาก API
        const chartData = {
            oee: records.map(r => r.oee),
            quality: records.map(r => r.quality),
            performance: records.map(r => r.performance),
            availability: records.map(r => r.availability)
        };
        const lineThemeColors = getLineChartThemeColors(); 

        // 5. Render กราฟเส้นตัวใหญ่ (ใช้ข้อมูลทั้งหมดที่ได้มา)
        if (!oeeLineChart || (oeeLineChart && typeof oeeLineChart.destroy === 'function' && oeeLineChart.ctx === null)) {
            initializeLineChart(labels, chartData, lineThemeColors); 
        } else {
            oeeLineChart.data.labels = labels;
            oeeLineChart.data.datasets.forEach((dataset, index) => {
                const key = Object.keys(chartData)[index];
                dataset.data = chartData[key] || [];
            });
            // (อัปเดต Theme Colors... ส่วนนี้เหมือนเดิม)
            oeeLineChart.options.plugins.legend.labels.color = lineThemeColors.legendColor;
            oeeLineChart.options.scales.x.ticks.color = lineThemeColors.ticksColor;
            oeeLineChart.options.scales.y.ticks.color = lineThemeColors.ticksColor;
            oeeLineChart.options.scales.y.grid.color = lineThemeColors.gridColor;
            if (oeeLineChart.options.plugins.annotation) {
                oeeLineChart.options.plugins.annotation.annotations.targetLine.borderColor = lineThemeColors.targetLineColor;
                oeeLineChart.options.plugins.annotation.annotations.targetLine.label.backgroundColor = lineThemeColors.targetLabelBg;
                oeeLineChart.options.plugins.annotation.annotations.targetLine.label.color = lineThemeColors.targetLabelColor;
            }
            oeeLineChart.update();
        }

        // 6. Filter ข้อมูลสำหรับ Sparklines (เฉพาะ 7 วันล่าสุด)
        // เราต้องแปลง format วันที่จาก API (d-m-y) เป็น YYYY-MM-DD เพื่อเปรียบเทียบ
        const parseApiDate = (dateStr) => {
            const parts = dateStr.split('-'); // d-m-y
            return new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`); // yyyy-mm-dd
        };

        const sparklineData = records
            .filter(r => {
                const recordDate = parseApiDate(r.date);
                return recordDate >= minSparklineStartDate && recordDate <= endDate;
            })
            .map(r => ({
                date: r.date, // 'date' (d-m-y)
                oee: r.oee,
                quality: r.quality,
                performance: r.performance,
                availability: r.availability
            }));

        // 7. Render Sparklines (ใช้ข้อมูลที่ Filter แล้ว)
        renderSparkline('oeeSparklineChart', sparklineData.map(d => ({date: d.date, value: d.oee})), getCssVar('--mes-chart-color-1'));
        renderSparkline('qualitySparklineChart', sparklineData.map(d => ({date: d.date, value: d.quality})), getCssVar('--mes-chart-color-2'));
        renderSparkline('performanceSparklineChart', sparklineData.map(d => ({date: d.date, value: d.performance})), getCssVar('--mes-chart-color-3'));
        renderSparkline('availabilitySparklineChart', sparklineData.map(d => ({date: d.date, value: d.availability})), getCssVar('--mes-chart-color-4'));

    } catch (err) {
        console.error("Line/Sparkline chart update failed:", err);
        toggleErrorMessage("oeeLineChart", true);
        // Clear sparklines on error
        ['oeeSparklineChart', 'qualitySparklineChart', 'performanceSparklineChart', 'availabilitySparklineChart'].forEach(id => {
             renderSparkline(id, [], '#ccc');
        });
        // Clear main line chart on error
        if (oeeLineChart) {
            oeeLineChart.data.labels = [];
            oeeLineChart.data.datasets.forEach(dataset => dataset.data = []);
            oeeLineChart.update();
        }
    } finally {
        toggleLoadingState("oeeLineChart", false);
    }
}


// =================================================================
// ส่วนที่ 2: กราฟวงกลม (Pie Charts / Scorecards)
// =================================================================
const OEE_TARGETS = {
    oee: 85.0,
    quality: 99.0,
    performance: 90.0,
    availability: 95.0
};

const charts = { oee: null, quality: null, performance: null, availability: null };

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

function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            centerTextColor: '#dee2e6', lossBgColor: '#495057',
            successColor: '#66bb6a', warningColor: '#ffa726',
            secondaryTextColor: '#adb5bd'
        };
    } else {
        return {
            centerTextColor: '#212529', lossBgColor: '#e9ecef',
            successColor: '#198754', warningColor: '#dc3545',
            secondaryTextColor: '#6c757d'
        };
    }
}

function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    // ✅ [FIX] ใช้ Math.round สำหรับนาที (จากครั้งก่อน)
    const m = Math.round(totalMinutes % 60);
    return `${h}h ${m}m`;
}

function updateInfoBox(infoId, lines, targetValue) {
    const infoBox = document.getElementById(infoId);
    if (!infoBox) return;
    const gridHtml = lines.map(line => {
        const parts = line.split(':');
        const label = parts[0] ? parts[0].trim() : '';
        const value = parts[1] ? parts[1].trim() : '';
        return `
            <div class="info-label">${label}</div>
            <div class="info-value">${value}</div>
        `;
    }).join('');
    infoBox.innerHTML = `<div class="info-grid">${gridHtml}</div>`;
    // (ส่วน Target vs %... เหมือนเดิม)
}

function renderSimplePieChart(chartName, ctx, labels, data, colors, targetValue, secondaryText = '', hasData = true) {
    if (!ctx) return;
    const themeColors = getChartThemeColors();
    const value = data[0];
    const centerTextColor = value >= targetValue ? themeColors.successColor : themeColors.warningColor;
    const chartConfig = {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, cutout: '80%', borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: true, animation: { duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%` } },
                centerText: {
                    color: centerTextColor,
                    secondaryColor: themeColors.secondaryTextColor,
                    secondaryText: secondaryText,
                    shouldDraw: hasData
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                // (Plugin centerText... เหมือนเดิม)
                const opts = chart.options.plugins.centerText;
                if (!opts.shouldDraw) return;
                const { width, height, ctx } = chart;
                ctx.restore();
                const mainFontSize = (height / 140).toFixed(2);
                ctx.font = `900 ${mainFontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                const mainText = `${chart.data.datasets[0].data[0].toFixed(1)}%`;
                const mainTextX = Math.round((width - ctx.measureText(mainText).width) / 2);
                const mainTextY = height / 2 - (opts.secondaryText ? 10 : 0);
                ctx.fillStyle = opts.color || '#000';
                ctx.fillText(mainText, mainTextX, mainTextY);
                if (opts.secondaryText) {
                    const secondaryFontSize = (height / 280).toFixed(2);
                    ctx.font = `400 ${secondaryFontSize}em sans-serif`;
                    const secondaryText = opts.secondaryText;
                    const secondaryTextX = Math.round((width - ctx.measureText(secondaryText).width) / 2);
                    const secondaryTextY = mainTextY + (height * 0.15);
                    ctx.fillStyle = opts.secondaryColor || '#888';
                    ctx.fillText(secondaryText, secondaryTextX, secondaryTextY);
                }
                ctx.save();
            }
        }]
    };

    if (charts[chartName]) {
        charts[chartName].data.labels = labels;
        charts[chartName].data.datasets[0].data = data;
        charts[chartName].options.plugins.centerText.color = centerTextColor;
        charts[chartName].options.plugins.centerText.secondaryText = secondaryText;
        charts[chartName].options.plugins.centerText.shouldDraw = hasData;
        charts[chartName].update();
    } else {
        charts[chartName] = new Chart(ctx, chartConfig);
    }
}

/**
 * [ฟังก์ชันที่แก้ไข] เปลี่ยนชื่อเป็น fetchAndRenderPieCharts
 * และลบ Logic ของ Line/Sparkline ออกไป
 */
async function fetchAndRenderPieCharts() {
    const chartIds = ["oeePieChart", "qualityPieChart", "performancePieChart", "availabilityPieChart"];
    chartIds.forEach(id => {
        toggleLoadingState(id, true);
        toggleErrorMessage(id, false);
    });

    const filterStartDateStr = document.getElementById("startDate")?.value || '';
    const filterEndDateStr = document.getElementById("endDate")?.value || '';
    const filterLine = document.getElementById("lineFilter")?.value || '';
    const filterModel = document.getElementById("modelFilter")?.value || '';

    try {
        console.log(`Pie Charts: Fetching data from ${filterStartDateStr} to ${filterEndDateStr}`);
        const pieParams = new URLSearchParams({
            startDate: filterStartDateStr,
            endDate: filterEndDateStr,
            line: filterLine,
            model: filterModel
        });
        
        // [แก้ไข] เรียก API ที่เราแก้ไขในขั้นตอนที่ 1
        const response = await fetch(`api/get_oee_piechart.php?${pieParams.toString()}`); 
        if (!response.ok) throw new Error(`Piechart API: Network response was not ok`);

        const data = await response.json(); // data คือ result
        if (!data.success) throw new Error(data.error || "Piechart API: API error");
        
        // --- Render Pie Charts และ Info Boxes (เหมือนเดิม) ---
        const themeColors = getChartThemeColors();
        const lossColor = themeColors.lossBgColor;
        const totalLoss = Math.max(0, 100 - (data.oee || 0));
        const qualityLossRatio = Math.max(0, 1 - ((data.quality || 0) / 100));
        const performanceLossRatio = Math.max(0, 1 - ((data.performance || 0) / 100));
        const availabilityLossRatio = Math.max(0, 1 - ((data.availability || 0) / 100));
        const totalRatio = qualityLossRatio + performanceLossRatio + availabilityLossRatio;

        const oeeHasData = data.oee !== undefined && data.oee !== null;
        toggleNoDataMessage("oeePieChart", !oeeHasData || data.oee <= 0);
        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"),
            ['OEE', 'Loss'], [data.oee || 0, totalLoss],
            [getCssVar('--mes-chart-color-1'), lossColor], OEE_TARGETS.oee,
            '', oeeHasData && data.oee > 0
        );
         updateInfoBox("oeeInfo", [
            `OEE Loss: <b>${totalLoss.toFixed(1)} %</b>`,
            `Q Contrib: <b>${(totalRatio > 0 ? (qualityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `P Contrib: <b>${(totalRatio > 0 ? (performanceLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `A Contrib: <b>${(totalRatio > 0 ? (availabilityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`
        ], OEE_TARGETS.oee);

        const qualityHasData = (data.actual_output || 0) > 0;
        toggleNoDataMessage("qualityPieChart", !qualityHasData);
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"),
            ['Good (FG)', 'Defects'], [data.quality || 0, Math.max(0, 100 - (data.quality || 0))],
            [getCssVar('--mes-chart-color-2'), lossColor], OEE_TARGETS.quality,
            `FG: ${(data.fg || 0).toLocaleString()} pcs`, qualityHasData
        );
        updateInfoBox("qualityInfo", [
             `Good (FG): <b>${(data.fg || 0).toLocaleString()}</b> pcs`,
             `Total Defects: <b>${(data.defects || 0).toLocaleString()}</b> pcs`,
             `&nbsp; └ Hold: <b>${(data.hold || 0).toLocaleString()}</b> pcs`,
             `&nbsp; └ Scrap: <b>${(data.scrap || 0).toLocaleString()}</b> pcs`
        ], OEE_TARGETS.quality);

        const performanceHasData = data.runtime !== undefined && data.runtime !== null && data.runtime >= 0;
        // [แก้ไข] ใช้ data.runtime (จาก Real-Time SP)
        toggleNoDataMessage("performancePieChart", !performanceHasData || data.runtime === 0);
        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"),
            ['Performance', 'Loss'], [data.performance || 0, Math.max(0, 100 - (data.performance || 0))],
            [getCssVar('--mes-chart-color-3'), lossColor], OEE_TARGETS.performance,
            `Actual: ${(data.actual_output || 0).toLocaleString()} pcs`, performanceHasData && (data.performance || 0) > 0
        );
         updateInfoBox("performanceInfo", [
            `Actual: <b>${(data.actual_output || 0).toLocaleString()}</b> pcs`,
            `Theo. Time: <b>${formatMinutes(data.total_theoretical_minutes || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.performance);

        const availabilityHasData = data.planned_time !== undefined && data.planned_time !== null && data.planned_time > 0;
        // [แก้ไข] ใช้ data.planned_time (จาก Real-Time SP)
        const runtimePercent = availabilityHasData ? Math.max(0, Math.min(100, ((data.runtime || 0) / data.planned_time) * 100)) : 0;
        const downtimePercent = 100 - runtimePercent;
        toggleNoDataMessage("availabilityPieChart", !availabilityHasData);
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"),
            ['Runtime', 'Downtime'], [runtimePercent, downtimePercent],
            [getCssVar('--mes-chart-color-4'), lossColor], OEE_TARGETS.availability,
            `Downtime: ${formatMinutes(data.downtime || 0)}`, availabilityHasData
        );
         updateInfoBox("availabilityInfo", [
            `Planned: <b>${formatMinutes(data.planned_time || 0)}</b>`,
            `Downtime: <b>${formatMinutes(data.downtime || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.availability);
        
        // --- [ลบออก] สิ้นสุดการ Render Pie Charts ---
        // --- [ลบออก] Logic การ Render Sparkline และ Line Chart ---

    } catch (err) {
        console.error("Pie chart update failed:", err);
        chartIds.forEach(id => toggleErrorMessage(id, true));
    } finally {
        chartIds.forEach(id => toggleLoadingState(id, false));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme change listener
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                console.log("Theme changed, re-rendering ALL charts...");
                // [แก้ไข] เรียกฟังก์ชันที่แยกกัน
                fetchAndRenderPieCharts?.(); 
                fetchAndRenderLineCharts?.();
                fetchAndRenderBarCharts?.();
                fetchAndRenderDailyProductionChart?.();
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});