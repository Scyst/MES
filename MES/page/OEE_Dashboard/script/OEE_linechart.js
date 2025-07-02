let oeeLineChart;

function hideErrors() {
    const el = document.getElementById("oeeLineError");
    if (el) el.style.display = "none";
    const canvas = document.getElementById("oeeLineChart");
    if (canvas) canvas.style.opacity = "1";
}

function showError(chartId, messageId) {
    const canvas = document.getElementById(chartId);
    const errorMsg = document.getElementById(messageId);
    if (canvas) canvas.style.opacity = "1";
    if (errorMsg) errorMsg.style.display = "block";
}

function renderCombinedLineChart(labels, datasets) {
    const ctx = document.getElementById("oeeLineChart").getContext("2d");
    if (oeeLineChart) oeeLineChart.destroy();

    oeeLineChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false,
                    text: "OEE Trends (Daily Average)",
                    font: { size: 16, weight: "bold" },
                    color: "#fff"
                },
                legend: {
                    display: true,
                    labels: { color: "#ccc" }
                },
                tooltip: {
                    backgroundColor: "#333",
                    titleColor: "#fff",
                    bodyColor: "#fff"
                }
            },
            scales: {
                x: {
                    ticks: { color: "#ccc", font: { size: 10 } },
                    grid: { display: false, color: "#444" }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: "#ccc", font: { size: 10 } },
                    grid: { color: "#444" }
                }
            },
            layout: {
                padding: 10
            }
        }
    });
}

async function fetchAndRenderLineCharts() {
    try {
        hideErrors();

        const params = new URLSearchParams({
            startDate: document.getElementById("startDate")?.value || '',
            endDate: document.getElementById("endDate")?.value || '',
            line: document.getElementById("lineFilter")?.value || '',
            model: document.getElementById("modelFilter")?.value || ''
        });

        const response = await fetch(`https://oem.sncformer.com/iot-toolbox/sandbox-b9/oee_dashboard/oee_dashboard-main/OEE_Dashboard/api/OEE_Dashboard/get_oee_linechart.php?${params.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error("Data error");

        const labels = data.records.map(r => r.date);
        const datasets = [
            {
                label: "OEE (%)",
                data: data.records.map(r => r.oee),
                borderColor: "#66bb6a",
                backgroundColor: "rgba(102, 187, 106, 0.3)",
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#66bb6a"
            },
            {
                label: "Quality (%)",
                data: data.records.map(r => r.quality),
                borderColor: "#ab47bc",
                backgroundColor: "rgba(171, 71, 188, 0.3)",
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#ab47bc"
            },
            {
                label: "Performance (%)",
                data: data.records.map(r => r.performance),
                borderColor: "#ffa726",
                backgroundColor: "rgba(255, 167, 38, 0.3)",
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#ffa726"
            },
            {
                label: "Availability (%)",
                data: data.records.map(r => r.availability),
                borderColor: "#42a5f5",
                backgroundColor: "rgba(66, 165, 245, 0.3)",
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#42a5f5"
            }
        ];

        renderCombinedLineChart(labels, datasets);
    } catch (err) {
        console.error("Line chart fetch failed:", err);
        showError("oeeLineChart", "oeeLineError");
    }
} 
