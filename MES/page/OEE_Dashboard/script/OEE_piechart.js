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
            successColor: '#66bb6a', warningColor: '#ffa726'
        };
    } else {
        return {
            centerTextColor: '#212529', lossBgColor: '#e9ecef',
            successColor: '#198754', warningColor: '#dc3545'
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
 * --- ฟังก์ชันที่แก้ไขแล้ว (เวอร์ชันสมบูรณ์) ---
 */
function renderSimplePieChart(chartName, ctx, labels, data, colors, targetValue) {
    if (!ctx) return;
    const themeColors = getChartThemeColors();
    const value = data[0];
    const centerTextColor = value >= targetValue ? themeColors.successColor : themeColors.warningColor;

    if (charts[chartName]) {
        charts[chartName].data.labels = labels;
        charts[chartName].data.datasets[0].data = data;
        charts[chartName].data.datasets[0].backgroundColor = colors;
        charts[chartName].options.plugins.centerText.color = centerTextColor;
        charts[chartName].update();
        return;
    }
    
    // --- โค้ดส่วนสร้าง Chart ที่ถูกต้อง (ไม่ย่อแล้ว) ---
    charts[chartName] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels, // << ใช้ labels (Array)
            datasets: [{
                data: data, // << ใช้ data (Array)
                backgroundColor: colors, // << ใช้ colors (Array)
                cutout: '80%',
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, animation: { duration: 800 },
            layout: { padding: 5 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { // << ส่วนนี้ใช้ context.label ซึ่งถูกต้อง
                        label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`
                    }
                },
                title: { display: false },
                centerText: { color: centerTextColor }
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
                ctx.fillStyle = color;
                ctx.fillText(text, textX, textY);
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
        
        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"), 
            ['OEE', 'Loss'], [data.oee || 0, 100 - (data.oee || 0)], 
            ['#2979ff', themeColors.lossBgColor], OEE_TARGETS.oee
        );

        const totalDefects = (data.ng || 0) + (data.rework || 0) + (data.hold || 0) + (data.scrap || 0) + (data.etc || 0);
        const totalProduction = (data.fg || 0) + totalDefects;
        const qualityPercent = totalProduction > 0 ? ((data.fg || 0) / totalProduction) * 100 : 100;
        const defectsPercent = 100 - qualityPercent;
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"), 
            ['Good (FG)', 'Defects'], [qualityPercent, defectsPercent], 
            ['#ab47bc', themeColors.lossBgColor], OEE_TARGETS.quality
        );

        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"), 
            ['Performance', 'Loss'], [data.performance || 0, 100 - (data.performance || 0)], 
            ['#7e57c2', themeColors.lossBgColor], OEE_TARGETS.performance
        );

        const runtimePercent = data.planned_time > 0 ? ((data.runtime || 0) / data.planned_time) * 100 : 100;
        const downtimePercent = 100 - runtimePercent;
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"), 
            ['Runtime', 'Downtime'], [runtimePercent, downtimePercent], 
            ['#42a5f5', themeColors.lossBgColor], OEE_TARGETS.availability
        );
        
        updateInfoBox("oeeInfo", [`OEE : <b>${(data.oee || 0).toFixed(1)}</b> %`, `Quality : <b>${(data.quality || 0).toFixed(1)}</b> %`, `Performance : <b>${(data.performance || 0).toFixed(1)}</b> %`, `Availability : <b>${(data.availability || 0).toFixed(1)}</b> %`], OEE_TARGETS.oee);
        updateInfoBox("qualityInfo", [`FG : <b>${(parseFloat(data.fg) || 0).toLocaleString()}</b> pcs`, `Defects : <b>${totalDefects.toLocaleString()}</b> pcs`], OEE_TARGETS.quality);
        updateInfoBox("performanceInfo", [`Actual : <b>${(parseFloat(data.actual_output) || 0).toLocaleString()}</b> pcs`, `Theo.T : <b>${formatMinutes(data.debug_info?.total_theoretical_minutes || 0)}</b>`, `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`], OEE_TARGETS.performance);
        updateInfoBox("availabilityInfo", [`Planned : <b>${formatMinutes(data.planned_time || 0)}</b>`, `Downtime : <b>${formatMinutes(data.downtime || 0)}</b>`, `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`], OEE_TARGETS.availability);

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