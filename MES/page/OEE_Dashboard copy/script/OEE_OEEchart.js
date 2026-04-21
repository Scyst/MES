"use strict";

const OEE_MAIN_TARGET = 85.0;
let oeeLineChart;
const charts = { oee: null, quality: null, performance: null, availability: null };

function getThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    return theme === 'dark' 
        ? { ticksColor: '#ccc', gridColor: '#495057', successColor: '#20c997', warningColor: '#ffcd39', lossBg: '#495057' }
        : { ticksColor: '#6c757d', gridColor: '#dee2e6', successColor: '#198754', warningColor: '#dc3545', lossBg: '#e9ecef' };
}

function updateInfoBox(infoId, lines) {
    const infoBox = document.getElementById(infoId);
    if (!infoBox) return;
    infoBox.innerHTML = `<div class="info-grid">` + lines.map(line => {
        const parts = line.split(':');
        return `<div class="info-label">${parts[0] || ''}</div><div class="info-value">${parts[1] || ''}</div>`;
    }).join('') + `</div>`;
}

// ⭐️ แกะหัวใจสำคัญ: ทำกราฟครึ่งวงกลม (Gauge)
function renderGaugeChart(chartName, canvasId, value, target, colorMain) {
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;
    
    const theme = getThemeColors();
    const isSuccess = value >= target;
    const txtColor = isSuccess ? theme.successColor : theme.warningColor;
    const lossValue = Math.max(0, 100 - value);

    const config = {
        type: 'doughnut',
        data: { labels: ['Value', 'Loss'], datasets: [{ data: [value, lossValue], backgroundColor: [colorMain, theme.lossBg], borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            circumference: 180, rotation: 270, // ⭐️ บิดให้เป็นครึ่งวงกลม
            aspectRatio: 2, // ⭐️ บังคับสัดส่วนให้เป็น 2:1 (ป้องกันกราฟสูงทะลุจอ)
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx, chartArea } = chart;
                ctx.restore();
                const fontSize = (height / 60).toFixed(2); // ปรับขนาดฟอนต์ให้พอดี
                ctx.font = `900 ${fontSize}em sans-serif`;
                ctx.textBaseline = "bottom";
                ctx.fillStyle = txtColor;
                const text = `${value.toFixed(1)}%`;
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = chartArea.bottom - 5; // ชิดขอบล่าง
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    };

    if (charts[chartName]) {
        charts[chartName].data.datasets[0].data = [value, lossValue];
        charts[chartName].update();
    } else {
        charts[chartName] = new Chart(ctx, config);
    }
}

async function fetchAndRenderPieCharts() {
    const params = new URLSearchParams({
        action: 'getPieChart',
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        line: document.getElementById("lineFilter").value,
        model: document.getElementById("modelFilter").value
    });

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();
        if (result.success) {
            const d = result.data;
            renderGaugeChart('oee', 'oeePieChart', d.oee || 0, 85, '#0d6efd');
            updateInfoBox("oeeInfo", [`OEE Target: 85%`, `Actual OEE: ${(d.oee||0).toFixed(1)}%`]);

            renderGaugeChart('quality', 'qualityPieChart', d.quality || 0, 99, '#198754');
            updateInfoBox("qualityInfo", [`Good (FG): ${(d.fg||0).toLocaleString()} pcs`, `Scrap: ${(d.scrap||0).toLocaleString()} pcs`]);

            renderGaugeChart('performance', 'performancePieChart', d.performance || 0, 90, '#ffc107');
            updateInfoBox("performanceInfo", [`Actual Output: ${(d.actual_output||0).toLocaleString()} pcs`]);

            renderGaugeChart('availability', 'availabilityPieChart', d.availability || 0, 95, '#0dcaf0');
            updateInfoBox("availabilityInfo", [`Downtime: ${d.downtime||0} min`, `Runtime: ${d.runtime||0} min`]);
        }
    } catch (e) { console.error(e); }
}

async function fetchAndRenderLineCharts() {
    // โค้ดเดิมที่คุณเคยดึง getLineChart... (เพื่อความกระชับ สามารถก๊อปโค้ดเก่าใน OEE_OEEchart.js ส่วน Linechart มาใส่ตรงนี้ได้เลยครับ)
    const params = new URLSearchParams({
        action: 'getLineChart',
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        line: document.getElementById("lineFilter").value,
        model: document.getElementById("modelFilter").value
    });

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();
        if (result.success) {
            const records = result.data || [];
            const labels = records.map(r => r.date);
            const data = { oee: records.map(r=>r.oee), quality: records.map(r=>r.quality), performance: records.map(r=>r.performance), availability: records.map(r=>r.availability) };
            
            // Initialize Line Chart (เหมือนเดิม)
            const ctx = document.getElementById("oeeLineChart")?.getContext("2d");
            if (!oeeLineChart) {
                oeeLineChart = new Chart(ctx, {
                    type: "line", data: { labels, datasets: [
                        { label: "OEE", data: data.oee, borderColor: '#0d6efd', tension: 0.3 },
                        { label: "Quality", data: data.quality, borderColor: '#198754', tension: 0.3 }
                    ]},
                    options: { responsive: true, maintainAspectRatio: false }
                });
            } else {
                oeeLineChart.data.labels = labels;
                oeeLineChart.data.datasets[0].data = data.oee;
                oeeLineChart.data.datasets[1].data = data.quality;
                oeeLineChart.update();
            }
        }
    } catch(e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        if (oeeLineChart) oeeLineChart.update('none');
    });
    observer.observe(document.documentElement, { attributes: true });
});