//-- Object สำหรับเก็บ Instance ของ Chart ทั้งหมด --
const charts = {
    oee: null,
    quality: null,
    performance: null,
    availability: null
};

//-- ฟังก์ชันสำหรับแปลงนาทีเป็นรูปแบบ "Xh Ym" --
function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) {
        return '0h 0m';
    }
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${h}h ${m}m`;
}

//-- ฟังก์ชันสำหรับซ่อนข้อความ Error ทั้งหมด --
function hideErrors() {
    ['oee', 'quality', 'performance', 'availability'].forEach(type => {
        const errorEl = document.getElementById(`${type}Error`);
        const chartEl = document.getElementById(`${type}PieChart`);
        if (errorEl) errorEl.style.display = 'none';
        if (chartEl) chartEl.style.opacity = '1';
    });
}

//-- ฟังก์ชันสำหรับแสดงข้อความ Error สำหรับ Chart ที่กำหนด --
function showError(type) {
    const errorEl = document.getElementById(`${type}Error`);
    const chartEl = document.getElementById(`${type}PieChart`);
    if (errorEl) errorEl.style.display = 'block';
    if (chartEl) chartEl.style.opacity = '0.2';
}

//-- ฟังก์ชันสำหรับอัปเดตข้อมูลใน Info Box --
function updateInfoBox(elementId, lines) {
    const infoBox = document.getElementById(elementId);
    if (!infoBox) return;
    const content = lines.map(line => `<span>${line}</span>`).join('<br>');
    infoBox.innerHTML = `<small>${content}</small>`;
}

/**
 * ฟังก์ชันสำหรับ Render หรือ Update Doughnut Chart
 * @param {string} chartName - Key สำหรับเก็บ Instance ใน Object `charts`
 * @param {CanvasRenderingContext2D} ctx - Context ของ Canvas ที่จะวาดกราฟ
 * @param {string} label - Label ของข้อมูลหลัก
 * @param {number} rawValue - ค่าเปอร์เซ็นต์ (0-100)
 * @param {string} mainColor - สีหลักของกราฟ
 */
function renderSimplePieChart(chartName, ctx, label, rawValue, mainColor) {
    if (!ctx) return;

    const value = Math.max(0, Math.min(rawValue, 100));
    const loss = 100 - value;

    // ถ้า Chart มีอยู่แล้ว ให้อัปเดตข้อมูลแล้วเรียก .update()
    if (charts[chartName]) {
        charts[chartName].data.datasets[0].data = [value, loss];
        charts[chartName].update(); // .update() จะจัดการทุกอย่างให้เอง
        return; 
    }

    // ถ้า Chart ยังไม่มี (โหลดครั้งแรก) ให้สร้างใหม่
    charts[chartName] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [label, 'Loss'],
            datasets: [{
                data: [value, loss],
                backgroundColor: [mainColor, '#424242'],
                cutout: '80%',
                borderWidth: 0.5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 800
            },
            layout: { padding: 5 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`
                    }
                },
                title: { display: false },
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                const fontSize = (height / 150).toFixed(2);
                ctx.font = `bold ${fontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                const text = `${chart.data.datasets[0].data[0].toFixed(1)}%`;
                const textX = Math.round((width - ctx.measureText(text).width) / 2);
                const textY = height / 2;
                ctx.fillStyle = "#ffffff";
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}


/**
 * ฟังก์ชันหลักสำหรับดึงข้อมูลและ Render Pie Chart และ Info Box ทั้งหมด
 */
async function fetchAndRenderCharts() {
    try {
        hideErrors();

        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);

        const response = await fetch(`../../api/OEE_Dashboard/get_oee_piechart.php?${params.toString()}`);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "API returned an error.");

        //-- Render Pie Chart ทั้ง 4 ตัว --
        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"), 'OEE', data.oee || 0, '#00BF63');
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"), 'Quality', data.quality || 0, '#ab47bc');
        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"), 'Performance', data.performance || 0, '#ffa726');
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"), 'Availability', data.availability || 0, '#42a5f5');

        //-- ประมวลผลและอัปเดตข้อมูลใน Info Box --
        const { oee, quality, performance, availability } = data;
        let oeeInfoLines = [];

        if ((oee || 0) > 0 && oee < 100) {
            const totalLoss = 100 - oee;
            const qualityLossRatio = Math.max(0, 1 - (quality / 100));
            const performanceLossRatio = Math.max(0, 1 - (performance / 100));
            const availabilityLossRatio = Math.max(0, 1 - (availability / 100));
            const totalRatio = qualityLossRatio + performanceLossRatio + availabilityLossRatio;

            const qualityLossContrib = totalRatio > 0 ? (qualityLossRatio / totalRatio) * 100 : 0;
            const performanceLossContrib = totalRatio > 0 ? (performanceLossRatio / totalRatio) * 100 : 0;
            const availabilityLossContrib = totalRatio > 0 ? (availabilityLossRatio / totalRatio) * 100 : 0;
            
            oeeInfoLines = [
                `OEE Loss: <b>${totalLoss.toFixed(1)}%</b>`,
                `Q Contrib: <b>${qualityLossContrib.toFixed(1)}%</b>`,
                `P Contrib: <b>${performanceLossContrib.toFixed(1)}%</b>`,
                `A Contrib: <b>${availabilityLossContrib.toFixed(1)}%</b>`
            ];
        } else {
            oeeInfoLines = [
                `OEE : <b>${(oee || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</b> %`,
                `Quality : <b>${(quality || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</b> %`,
                `Performance : <b>${(performance || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</b> %`,
                `Availability : <b>${(availability || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</b> %`
            ];
        }
        updateInfoBox("oeeInfo", oeeInfoLines);
        
        const qualityLines = [`FG : <b>${(parseFloat(data.fg) || 0).toLocaleString()}</b> pcs`];
        if (data.ng > 0) qualityLines.push(`NG : <b>${(parseFloat(data.ng) || 0).toLocaleString()}</b> pcs`);
        if (data.rework > 0) qualityLines.push(`Rework : <b>${(parseFloat(data.rework) || 0).toLocaleString()}</b> pcs`);
        if (data.hold > 0) qualityLines.push(`Hold : <b>${(parseFloat(data.hold) || 0).toLocaleString()}</b> pcs`);
        if (data.scrap > 0) qualityLines.push(`Scrap : <b>${(parseFloat(data.scrap) || 0).toLocaleString()}</b> pcs`);
        if (data.etc > 0) qualityLines.push(`Etc : <b>${(parseFloat(data.etc) || 0).toLocaleString()}</b> pcs`);
        updateInfoBox("qualityInfo", qualityLines);

        updateInfoBox("performanceInfo", [
            `Actual : <b>${(parseFloat(data.actual_output) || 0).toLocaleString()}</b> pcs`,
            `Theo.T : <b>${formatMinutes(data.debug_info?.total_theoretical_minutes || 0)}</b>`,
            `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`
        ]);

        updateInfoBox("availabilityInfo", [
            `Planned : <b>${formatMinutes(data.planned_time || 0)}</b>`,
            `Downtime : <b>${formatMinutes(data.downtime || 0)}</b>`,
            `Runtime : <b>${formatMinutes(data.runtime || 0)}</b>`
        ]);

    } catch (err) {
        console.error("Pie chart update failed:", err);
        ['oee', 'quality', 'performance', 'availability'].forEach(showError);
    }
}