"use strict";

const OEE_MAIN_TARGET = 85.0;
let oeeLineChart;
const charts = { oee: null, quality: null, performance: null, availability: null };

function getThemeColors() {
    return { ticksColor: '#6c757d', gridColor: '#f1f5f9', successColor: '#198754', warningColor: '#dc3545', lossBg: '#f1f5f9' };
}

// ⭐️ ฟังก์ชันใหม่สำหรับสร้างกล่องตัวเลขใต้ Gauge สไตล์ PowerBI
function createMiniMetrics(dataObj) {
    let html = '<div class="d-flex justify-content-center gap-2 w-100">';
    dataObj.forEach(item => {
        html += `
            <div class="metric-mini-box flex-fill">
                <div class="metric-mini-label">${item.label}</div>
                <div class="metric-mini-value ${item.color || ''}">${item.value}</div>
            </div>`;
    });
    html += '</div>';
    return html;
}

// ⭐️ ปรับตั้งค่า Gauge และแก้ปัญหา Closure Trap ให้ตัวเลขอัปเดตตาม Filter
function renderGaugeChart(chartName, canvasId, value, target, colorMain) {
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;
    
    const theme = getThemeColors();
    const isSuccess = value >= target;
    const txtColor = isSuccess ? theme.successColor : theme.warningColor;
    const lossValue = Math.max(0, 100 - value);

    if (charts[chartName]) {
        // ⭐️ 1. อัปเดตข้อมูลขนาดของหลอดกราฟ
        charts[chartName].data.datasets[0].data = [value, lossValue];
        
        // ⭐️ 2. อัปเดตสีของหลอดกราฟ (เผื่อเปลี่ยนสถานะจากผ่านเป้า เป็นตกเป้า)
        charts[chartName].data.datasets[0].backgroundColor = [colorMain, theme.lossBg];
        
        // ⭐️ 3. อัดค่าตัวเลขและสีใหม่เข้าไปใน Options เพื่อให้ Plugin วาดข้อความหยิบไปใช้
        charts[chartName].options.plugins.centerTextData = { val: value, color: txtColor };
        
        charts[chartName].update();
    } else {
        const config = {
            type: 'doughnut',
            data: { 
                labels: ['Value', 'Loss'], 
                datasets: [{ data: [value, lossValue], backgroundColor: [colorMain, theme.lossBg], borderWidth: 0 }] 
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                circumference: 180, rotation: 270, 
                cutout: '82%', 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: false },
                    // ⭐️ เก็บข้อมูลไว้ใน options ตั้งแต่ตอนสร้างกราฟ
                    centerTextData: { val: value, color: txtColor } 
                }
            },
            plugins: [{
                id: 'centerTextPlugin',
                beforeDraw(chart) {
                    const { width, height, ctx, chartArea } = chart;
                    
                    // ⭐️ อ่านค่าปัจจุบันจาก Options เสมอ (ลืมค่าเก่าไปเลย)
                    const currentData = chart.options.plugins.centerTextData;
                    const displayValue = currentData ? currentData.val : 0;
                    const displayColor = currentData ? currentData.color : '#000';

                    ctx.restore();
                    ctx.font = `900 1.6rem "Prompt", sans-serif`;
                    ctx.textBaseline = "bottom";
                    ctx.fillStyle = displayColor;
                    
                    const text = `${displayValue.toFixed(1)}%`;
                    const textX = Math.round((width - ctx.measureText(text).width) / 2);
                    const textY = chartArea.bottom - 5; 
                    
                    ctx.fillText(text, textX, textY);
                    ctx.save();
                }
            }]
        };
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
            const actualOut = d.actual_output || 0;
            const totalOut = (d.fg || 0) + (d.scrap || 0) + (d.hold || 0);
            
            // 1. OEE
            renderGaugeChart('oee', 'oeePieChart', d.oee || 0, 85, '#0d6efd');
            document.getElementById("oeeInfo").innerHTML = createMiniMetrics([
                { label: 'Target', value: '85%' },
                { label: 'Actual', value: `${(d.oee||0).toFixed(1)}%`, color: 'text-primary' }
            ]);

            // 2. QUALITY (โชว์ FG, Hold, Scrap)
            renderGaugeChart('quality', 'qualityPieChart', d.quality || 0, 99, '#198754');
            document.getElementById("qualityInfo").innerHTML = createMiniMetrics([
                { label: 'Good (FG)', value: (d.fg||0).toLocaleString(), color: 'text-success' },
                { label: 'Hold', value: (d.hold||0).toLocaleString(), color: 'text-warning' },
                { label: 'Scrap', value: (d.scrap||0).toLocaleString(), color: 'text-danger' }
            ]);

            // 3. PERFORMANCE
            renderGaugeChart('performance', 'performancePieChart', d.performance || 0, 90, '#ffc107');
            document.getElementById("performanceInfo").innerHTML = createMiniMetrics([
                { label: 'Total Qty', value: totalOut.toLocaleString() },
                { label: 'Target Qty', value: Math.round(d.TargetQty || d.targetqty || 0).toLocaleString() }
            ]);

            // 4. AVAILABILITY
            renderGaugeChart('availability', 'availabilityPieChart', d.availability || 0, 95, '#0dcaf0');
            document.getElementById("availabilityInfo").innerHTML = createMiniMetrics([
                { label: 'Runtime', value: `${parseFloat(d.runtime||0).toFixed(0)} m`, color: 'text-info' },
                { label: 'Downtime', value: `${parseFloat(d.downtime||0).toFixed(0)} m`, color: 'text-danger' }
            ]);
        }
    } catch (e) { console.error(e); }
}

async function fetchAndRenderLineCharts() {
    const activeToggle = document.querySelector('#oeeTrendToggle .btn.active');
    const viewType = activeToggle ? activeToggle.dataset.view : 'daily';
    const actionUrl = viewType === 'hourly' ? 'getHourlySparklines' : 'getLineChart';

    const params = new URLSearchParams({
        action: actionUrl,
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
            console.log("Chart Data:", records);
            const labels = records.map(r => 
                r.Hour || r.hour || r.Time || r.time || r.Period || r.date || r.Date || 
                r.HourInterval || r.HourRange || r.time_label || 'N/A'
            );
            
            const data = { 
                oee: records.map(r => parseFloat(r.OEE || r.oee || 0)), 
                quality: records.map(r => parseFloat(r.Quality || r.quality || 0)), 
                performance: records.map(r => parseFloat(r.Performance || r.performance || 0)), 
                availability: records.map(r => parseFloat(r.Availability || r.availability || 0)) 
            };
            
            const ctx = document.getElementById("oeeLineChart")?.getContext("2d");

            if (!oeeLineChart) {
                oeeLineChart = new Chart(ctx, {
                    type: "line", 
                    data: { 
                        labels: labels,
                        datasets: [
                            { label: "OEE", data: data.oee, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', tension: 0.4, fill: true, borderWidth: 3 },
                            { label: "Availability", data: data.availability, borderColor: '#0dcaf0', tension: 0.4, borderDash: [5, 5], borderWidth: 2 },
                            { label: "Performance", data: data.performance, borderColor: '#ffc107', tension: 0.4, borderDash: [5, 5], borderWidth: 2 },
                            { label: "Quality", data: data.quality, borderColor: '#198754', tension: 0.4, borderDash: [5, 5], borderWidth: 2 }
                        ]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        scales: { 
                            y: { min: 0, max: 100, ticks: { callback: (val) => val + '%' } }, 
                            x: { 
                                grid: { display: false },
                                ticks: {
                                    autoSkip: true,
                                    maxTicksLimit: 10,
                                    maxRotation: 0,
                                    minRotation: 0
                                }
                            } 
                        }
                    }
                });
            } else {
                oeeLineChart.data.labels = labels;
                oeeLineChart.data.datasets[0].data = data.oee;
                oeeLineChart.data.datasets[1].data = data.availability;
                oeeLineChart.data.datasets[2].data = data.performance;
                oeeLineChart.data.datasets[3].data = data.quality;
                oeeLineChart.update();
            }
        }
    } catch(e) { console.error(e); }
}

document.getElementById('oeeTrendToggle')?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('active')) return;
    document.querySelector('#oeeTrendToggle .active')?.classList.remove('active');
    button.classList.add('active');
    fetchAndRenderLineCharts(); // เรียกโหลดข้อมูลกราฟใหม่ทันที
});