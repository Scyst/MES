// analyticsModule.js — Analytics Dashboard Module
const AnalyticsModule = (() => {
    let chartTrend = null;
    let chartPareto = null;
    let chartWOStatus = null;

    async function loadAll() {
        await Promise.all([
            loadKPI(),
            loadTrend(),
            loadPareto(),
            loadTopMachines(),
            loadWOStatus()
        ]);
    }

    function getFilters() {
        return {
            startDate: document.getElementById('analyticsStartDate')?.value || '',
            endDate: document.getElementById('analyticsEndDate')?.value || '',
            line: document.getElementById('analyticsFilterLine')?.value || ''
        };
    }

    function setPeriod(period) {
        const now = new Date();
        let start;

        switch (period) {
            case 'today':
                start = new Date(now); break;
            case 'week':
                start = new Date(now);
                start.setDate(now.getDate() - now.getDay() + 1); break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarter':
                const q = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), q * 3, 1); break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        document.getElementById('analyticsStartDate').value = start.toISOString().slice(0, 10);
        document.getElementById('analyticsEndDate').value = now.toISOString().slice(0, 10);

        // Update chip active state
        document.querySelectorAll('#panel-analytics .pe-chip').forEach(c => c.classList.remove('active'));
        document.querySelector(`#panel-analytics .pe-chip[onclick*="${period}"]`)?.classList.add('active');

        loadAll();
    }

    async function loadKPI() {
        try {
            const f = getFilters();
            const res = await PEApp.apiCall('analyticsAPI.php', { action: 'get_kpi_overview', ...f });
            const d = res.data || {};

            const mtbfEl = document.getElementById('kpiMTBF');
            if (mtbfEl) mtbfEl.innerHTML = `${d.mtbf || 0} <span class="unit">hrs</span>`;

            const mttrEl = document.getElementById('kpiMTTR');
            if (mttrEl) mttrEl.innerHTML = `${d.mttr || 0} <span class="unit">min</span>`;

            const availEl = document.getElementById('kpiAvailability');
            if (availEl) availEl.innerHTML = `${d.availability || 0} <span class="unit">%</span>`;

            const dtEl = document.getElementById('kpiAnalyticsDT');
            if (dtEl) dtEl.innerHTML = `${d.total_downtime_hrs || 0} <span class="unit">hrs</span>`;

            const costEl = document.getElementById('kpiMtCost');
            if (costEl) costEl.textContent = PEApp.formatCurrency(d.total_cost || 0);
        } catch (e) { console.error('KPI Error:', e); }
    }

    async function loadTrend() {
        try {
            const f = getFilters();
            const res = await PEApp.apiCall('analyticsAPI.php', { action: 'get_downtime_trend', ...f });
            const data = res.data || [];

            const labels = data.map(d => {
                const dt = new Date(d.log_date);
                return dt.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
            });
            const values = data.map(d => Number(d.total_min) || 0);
            const events = data.map(d => Number(d.event_count) || 0);

            const ctx = document.getElementById('chartDowntimeTrend');
            if (!ctx) return;

            if (chartTrend) chartTrend.destroy();
            chartTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Downtime (min)',
                            data: values,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 3,
                            pointBackgroundColor: '#ef4444',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Events',
                            data: events,
                            borderColor: '#3b82f6',
                            borderDash: [4, 4],
                            borderWidth: 1.5,
                            pointRadius: 2,
                            pointBackgroundColor: '#3b82f6',
                            fill: false,
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { 
                        datalabels: { display: false },
                        legend: { labels: { font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } } 
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Minutes', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Events', font: { size: 11 } }, grid: { display: false } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        } catch (e) { console.error('Trend Error:', e); }
    }

    async function loadPareto() {
        try {
            const f = getFilters();
            const res = await PEApp.apiCall('analyticsAPI.php', { action: 'get_downtime_pareto', ...f });
            const data = res.data || [];

            const labels = data.map(d => d.cause_category || 'N/A');
            const values = data.map(d => Number(d.total_min) || 0);
            const total = values.reduce((s, v) => s + v, 0);

            // Cumulative %
            let cumul = 0;
            const cumulPct = values.map(v => {
                cumul += v;
                return total > 0 ? Math.round((cumul / total) * 100) : 0;
            });

            const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#6366f1', '#84cc16'];

            const ctx = document.getElementById('chartPareto');
            if (!ctx) return;

            if (chartPareto) chartPareto.destroy();
            chartPareto = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Downtime (min)',
                            data: values,
                            backgroundColor: colors.slice(0, labels.length),
                            borderRadius: 6,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Cumulative %',
                            data: cumulPct,
                            type: 'line',
                            borderColor: '#0f172a',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#0f172a',
                            fill: false,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        datalabels: { display: false },
                        legend: { labels: { font: { size: 11 }, usePointStyle: true } } 
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Minutes', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        y1: { beginAtZero: true, max: 100, position: 'right', title: { display: true, text: '%', font: { size: 11 } }, grid: { display: false } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                }
            });
        } catch (e) { console.error('Pareto Error:', e); }
    }

    async function loadTopMachines() {
        try {
            const f = getFilters();
            const res = await PEApp.apiCall('analyticsAPI.php', { action: 'get_top_machines', ...f });
            const data = res.data || [];

            const tbody = document.getElementById('topMachineBody');
            if (!tbody) return;

            if (!data.length) {
                tbody.innerHTML = `<tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:40px;">No data</td></tr>`;
                return;
            }

            const maxMin = Math.max(...data.map(d => Number(d.total_min) || 0), 1);
            tbody.innerHTML = data.map((d, i) => {
                const pct = Math.round(((d.total_min || 0) / maxMin) * 100);
                return `
                <tr>
                    <td class="pe-text-muted pe-fw-bold">${i + 1}</td>
                    <td class="pe-fw-bold">${PEApp.escapeHtml(d.machine_name || '-')}</td>
                    <td>${PEApp.escapeHtml(d.line || '-')}</td>
                    <td class="pe-text-center">${d.event_count || 0}</td>
                    <td class="pe-text-end pe-fw-bold" style="color:var(--pe-danger);">${PEApp.formatNumber(Number(d.total_min) || 0)}</td>
                    <td class="pe-text-end">${Math.round(Number(d.avg_min) || 0)}</td>
                    <td>
                        <div style="background:var(--pe-border-light);border-radius:4px;height:8px;overflow:hidden;">
                            <div style="background:linear-gradient(90deg,var(--pe-danger),var(--pe-warning));width:${pct}%;height:100%;border-radius:4px;transition:width 0.6s ease;"></div>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) { console.error('Top Machines Error:', e); }
    }

    async function loadWOStatus() {
        try {
            const f = getFilters();
            const res = await PEApp.apiCall('analyticsAPI.php', { action: 'get_wo_status_dist', ...f });
            const data = res.data || [];

            const labels = data.map(d => d.status);
            const values = data.map(d => Number(d.count) || 0);
            const colorMap = {
                'Open': '#3b82f6', 'Assigned': '#8b5cf6', 'In Progress': '#f59e0b',
                'Completed': '#10b981', 'Cancelled': '#94a3b8'
            };
            const colors = labels.map(s => colorMap[s] || '#64748b');

            const ctx = document.getElementById('chartWOStatus');
            if (!ctx) return;

            if (chartWOStatus) chartWOStatus.destroy();
            chartWOStatus = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, cutout: '65%' }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        datalabels: { display: false },
                        legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 12 } }
                    }
                }
            });
        } catch (e) { console.error('WO Status Error:', e); }
    }

    // Init date defaults
    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const startEl = document.getElementById('analyticsStartDate');
        const endEl = document.getElementById('analyticsEndDate');
        if (startEl && !startEl.value) startEl.value = first.toISOString().slice(0, 10);
        if (endEl && !endEl.value) endEl.value = now.toISOString().slice(0, 10);
    });

    return { loadAll, setPeriod };
})();
