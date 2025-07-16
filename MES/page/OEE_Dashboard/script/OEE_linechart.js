//-- ตัวแปรสำหรับเก็บ Instance ของ Line Chart --
let oeeLineChart;

//-- ฟังก์ชันสำหรับซ่อนข้อความ Error และทำให้กราฟแสดงผลปกติ --
function hideErrors() {
    const el = document.getElementById("oeeLineError");
    if (el) el.style.display = "none";
    const canvas = document.getElementById("oeeLineChart");
    if (canvas) canvas.style.opacity = "1";
}

//-- ฟังก์ชันสำหรับแสดงข้อความ Error บนพื้นที่ของกราฟ --
function showError(chartId, messageId) {
    const canvas = document.getElementById(chartId);
    const errorMsg = document.getElementById(messageId);
    if (canvas) canvas.style.opacity = "1";
    if (errorMsg) errorMsg.style.display = "block";
}

/**
 * ฟังก์ชันหลักสำหรับดึงข้อมูลและ Render/Update Line Chart
 */
async function fetchAndRenderLineCharts() {
    try {
        hideErrors();

        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });

        const response = await fetch(`../../api/OEE_Dashboard/get_oee_linechart.php?${params.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error("Data error");

        const labels = data.records.map(r => r.date);
        const chartData = {
            oee: data.records.map(r => r.oee),
            quality: data.records.map(r => r.quality),
            performance: data.records.map(r => r.performance),
            availability: data.records.map(r => r.availability)
        };

        // --- ส่วนที่แก้ไข ---
        // ถ้า Chart ยังไม่มี (โหลดครั้งแรก) ให้สร้างใหม่
        if (!oeeLineChart) {
            initializeLineChart(labels, chartData);
        } else {
            // ถ้ามีอยู่แล้ว ให้อัปเดตข้อมูลแล้วเรียก .update()
            oeeLineChart.data.labels = labels;
            oeeLineChart.data.datasets[0].data = chartData.oee;
            oeeLineChart.data.datasets[1].data = chartData.quality;
            oeeLineChart.data.datasets[2].data = chartData.performance;
            oeeLineChart.data.datasets[3].data = chartData.availability;
            oeeLineChart.update();
        }
        // --- สิ้นสุดส่วนที่แก้ไข ---

    } catch (err) {
        console.error("Line chart fetch failed:", err);
        showError("oeeLineChart", "oeeLineError");
    }
}

/**
 * ฟังก์ชันสำหรับสร้าง Line Chart ครั้งแรก
 * @param {string[]} labels - Array ของ Label แกน X (วันที่)
 * @param {object} data - Object ที่มี بياناتของแต่ละเส้น
 */
function initializeLineChart(labels, data) {
    const ctx = document.getElementById("oeeLineChart").getContext("2d");
    const datasets = [
        { label: "OEE (%)", data: data.oee, borderColor: "#66bb6a", backgroundColor: "rgba(102, 187, 106, 0.3)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#66bb6a" },
        { label: "Quality (%)", data: data.quality, borderColor: "#ab47bc", backgroundColor: "rgba(171, 71, 188, 0.3)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#ab47bc" },
        { label: "Performance (%)", data: data.performance, borderColor: "#ffa726", backgroundColor: "rgba(255, 167, 38, 0.3)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#ffa726" },
        { label: "Availability (%)", data: data.availability, borderColor: "#42a5f5", backgroundColor: "rgba(66, 165, 245, 0.3)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#42a5f5" }
    ];

    oeeLineChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800 },
            plugins: {
                title: { display: false, text: "OEE Trends (Daily Average)", font: { size: 16, weight: "bold" }, color: "#fff" },
                legend: { display: true, labels: { color: "#ccc" } },
                tooltip: { backgroundColor: "#333", titleColor: "#fff", bodyColor: "#fff" }
            },
            scales: {
                x: { ticks: { color: "#ccc", font: { size: 10 } }, grid: { display: false, color: "#444" } },
                y: { beginAtZero: true, max: 100, ticks: { color: "#ccc", font: { size: 10 } }, grid: { color: "#444" } }
            },
            layout: { padding: 10 }
        }
    });
}