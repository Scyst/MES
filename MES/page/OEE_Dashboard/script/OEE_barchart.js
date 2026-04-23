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
                const globalMax = Math.max(
                    ...partResults.map(r => Math.max(parseInt(r.FG)||0, parseInt(r.HOLD)||0, parseInt(r.SCRAP)||0)), 
                    1 
                );

                partResults.forEach(row => {
                    const fgVal = parseInt(row.FG) || 0;
                    const holdVal = parseInt(row.HOLD) || 0;
                    const scrapVal = parseInt(row.SCRAP) || 0;
                    
                    const totalVal = fgVal + holdVal + scrapVal;

                    const fgPct = totalVal > 0 ? ((fgVal / totalVal) * 100).toFixed(1) : '0.0';
                    const holdPct = totalVal > 0 ? ((holdVal / totalVal) * 100).toFixed(1) : '0.0';
                    const scrapPct = totalVal > 0 ? ((scrapVal / totalVal) * 100).toFixed(1) : '0.0';

                    const fgBar = (fgVal / globalMax) * 100;
                    const holdBar = (holdVal / globalMax) * 100;
                    const scrapBar = (scrapVal / globalMax) * 100;

                    tbody.innerHTML += `
                        <tr class="align-middle">
                            <td class="fw-bold text-primary bg-white">${row.part_no}</td>
                            <td class="text-muted small">${row.production_line} | ${row.model}</td>
                            
                            <td class="data-bar-cell ps-2 py-2">
                                <div class="position-relative mb-1 pe-2 text-end" style="z-index: 2;">
                                    <span class="fw-bold" style="color: #334155;">${fgVal.toLocaleString()}</span>
                                </div>
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-fg" style="width: ${fgBar}%;"></div>
                            </td>
                            
                            <td class="data-bar-cell ps-2 py-2">
                                <div class="position-relative mb-1 pe-2 text-end" style="z-index: 2;">
                                    <span class="fw-bold" style="color: #334155;">${holdVal.toLocaleString()}</span>
                                </div>
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-hold" style="width: ${holdBar}%;"></div>
                            </td>
                            
                            <td class="data-bar-cell ps-2 py-2">
                                <div class="position-relative mb-1 pe-2 text-end" style="z-index: 2;">
                                    <span class="fw-bold" style="color: #334155;">${scrapVal.toLocaleString()}</span>
                                </div>
                                <div class="data-bar-bg" style="width: 100%;"></div>
                                <div class="data-bar-fill fill-scrap" style="width: ${scrapBar}%;"></div>
                            </td>

                            <td class="text-end border-start pe-3 bg-light bg-opacity-50 py-2">
                                <div class="fw-bold text-dark mb-1" style="font-size: 1.1rem;">${totalVal.toLocaleString()}</div>
                                <div class="d-flex justify-content-end gap-1 flex-wrap">
                                    <span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25" style="font-size: 0.6rem;" title="FG %">${fgPct}%</span>
                                    <span class="badge rounded-pill bg-warning bg-opacity-10 border border-warning border-opacity-50" style="font-size: 0.6rem; color: #b45309;" title="Hold %">${holdPct}%</span>
                                    <span class="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="font-size: 0.6rem;" title="Scrap %">${scrapPct}%</span>
                                </div>
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