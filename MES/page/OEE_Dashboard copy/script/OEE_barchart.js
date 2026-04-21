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
        
        if (stopBarChartInstance) stopBarChartInstance.destroy();
        
        if (ctx && stopData.labels.length > 0) {
            stopBarChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stopData.labels,
                    datasets: [{ label: 'Downtime (min)', data: stopData.datasets[0].data, backgroundColor: 'rgba(54, 162, 235, 0.8)' }]
                },
                options: {
                    indexAxis: 'y', // ⭐️ กราฟแนวนอน!
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 2. วาดตาราง Data Bar แบบ PowerBI
        const partResults = result.data.partResults;
        const tbody = document.getElementById('productionTableBody');
        if (tbody) {
            if (!partResults || partResults.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No data</td></tr>';
            } else {
                tbody.innerHTML = '';
                const maxFg = Math.max(...partResults.map(r => r.FG || 0), 1);
                const maxHold = Math.max(...partResults.map(r => r.HOLD || 0), 1);
                const maxScrap = Math.max(...partResults.map(r => r.SCRAP || 0), 1);

                partResults.forEach(row => {
                    const fgPercent = ((row.FG || 0) / maxFg) * 100;
                    const holdPercent = ((row.HOLD || 0) / maxHold) * 100;
                    const scrapPercent = ((row.SCRAP || 0) / maxScrap) * 100;

                    tbody.innerHTML += `
                        <tr>
                            <td class="fw-bold text-primary">${row.part_no}</td>
                            <td class="text-muted small">${row.production_line} | ${row.model}</td>
                            <td class="data-bar-cell text-success">
                                ${(row.FG || 0).toLocaleString()}
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-fg" style="width: ${fgPercent}%;"></div>
                            </td>
                            <td class="data-bar-cell text-warning">
                                ${(row.HOLD || 0).toLocaleString()}
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-hold" style="width: ${holdPercent}%;"></div>
                            </td>
                            <td class="data-bar-cell text-danger">
                                ${(row.SCRAP || 0).toLocaleString()}
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