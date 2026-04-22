"use strict";
let stopBarChartInstance = null;

async function fetchAndRenderBarAndTable() {
    const activeToggle = document.querySelector('#stopCauseToggle .btn.active');
    const stopCauseGroupBy = activeToggle ? activeToggle.dataset.group : 'cause';

    const params = new URLSearchParams({
        action: 'getBarCharts',
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        line: document.getElementById("lineFilter").value,
        model: document.getElementById("modelFilter").value,
        stopCauseGroupBy: stopCauseGroupBy
    });

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();
        if (!result.success) return;

        // 1. วาดกราฟแนวนอน (Downtime)
        const stopData = result.data.stopCause;
        const ctx = document.getElementById("stopCauseBarChart")?.getContext("2d");
        
        const wrapper = document.getElementById("downtimeChartWrapper");
        const emptyState = document.getElementById("downtimeEmptyState");
        
        // ⭐️ ถ้าไม่มีข้อมูล Downtime ให้โชว์ Empty State
        if (!stopData || stopData.labels.length === 0) {
            wrapper.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            wrapper.style.display = 'block';
            emptyState.style.display = 'none';
            
            if (ctx) {
                if (!stopBarChartInstance) {
                    // ⭐️ สร้างกราฟแค่ครั้งแรกครั้งเดียว
                    stopBarChartInstance = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: stopData.labels,
                            datasets: [{ label: 'Downtime (min)', data: stopData.datasets[0].data, backgroundColor: '#cbd5e1', hoverBackgroundColor: '#dc3545', borderRadius: 4 }]
                        },
                        options: {
                            indexAxis: 'y', 
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
                        }
                    });
                } else {
                    // ⭐️ ครั้งต่อๆ ไปให้อัปเดตแค่ไส้ใน กราฟจะได้สมูท ไม่กระตุก
                    stopBarChartInstance.data.labels = stopData.labels;
                    stopBarChartInstance.data.datasets[0].data = stopData.datasets[0].data;
                    stopBarChartInstance.update();
                }
            }
        }

        // 2. วาดตาราง Data Bar แบบ PowerBI
        const partResults = result.data.partResults;
        const tbody = document.getElementById('productionTableBody');
        if (tbody) {
            if (!partResults || partResults.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No production data</td></tr>';
            } else {
                tbody.innerHTML = '';
                const maxFg = Math.max(...partResults.map(r => parseInt(r.FG) || 0), 1);
                const maxHold = Math.max(...partResults.map(r => parseInt(r.HOLD) || 0), 1);
                const maxScrap = Math.max(...partResults.map(r => parseInt(r.SCRAP) || 0), 1);

                partResults.forEach(row => {
                    // บังคับให้เป็นจำนวนเต็ม (Integer)
                    const fgVal = parseInt(row.FG) || 0;
                    const holdVal = parseInt(row.HOLD) || 0;
                    const scrapVal = parseInt(row.SCRAP) || 0;

                    const fgPercent = (fgVal / maxFg) * 100;
                    const holdPercent = (holdVal / maxHold) * 100;
                    const scrapPercent = (scrapVal / maxScrap) * 100;

                    tbody.innerHTML += `
                        <tr>
                            <td class="fw-bold text-primary">${row.part_no}</td>
                            <td class="text-muted small">${row.production_line} | ${row.model}</td>
                            <td class="data-bar-cell text-success">
                                ${fgVal.toLocaleString()}
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-fg" style="width: ${fgPercent}%;"></div>
                            </td>
                            <td class="data-bar-cell text-warning">
                                ${holdVal.toLocaleString()}
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-hold" style="width: ${holdPercent}%;"></div>
                            </td>
                            <td class="data-bar-cell text-danger">
                                ${scrapVal.toLocaleString()}
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-scrap" style="width: ${scrapPercent}%;"></div>
                            </td>
                        </tr>
                    `;
                });
            }
        }
    } catch (e) { console.error(e); }
}

document.getElementById('stopCauseToggle')?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('active')) return;
    document.querySelector('#stopCauseToggle .active')?.classList.remove('active');
    button.classList.add('active');
    fetchAndRenderBarAndTable();
});