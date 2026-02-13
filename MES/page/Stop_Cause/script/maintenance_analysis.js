// script/maintenance_analysis.js
"use strict";

const MtDashboard = {
    charts: {},

    // ชุดสี (ตามที่คุณขอ Normal > Urgent > Critical)
    colors: {
        status: {
            'Pending': '#ffc107',
            'In Progress': '#0d6efd',
            'Completed': '#198754',
            'Cancelled': '#6c757d',
            'Unknown': '#adb5bd'
        },
        priority: {
            'Normal': '#198754',       // เขียว
            'Urgent': '#fd7e14',       // ส้ม
            'Critical': '#dc3545',     // แดง
            'High': '#fd7e14',         // ส้ม (Legacy)
            'Low': '#20c997',          // เขียวอ่อน
            'Unknown': '#adb5bd'
        }
    },

    init() {
        // [SIMPLE LOGIC] ดึงค่าจากหน้าหลักมาใช้เลย จบ.
        const mainStart = document.getElementById('mtStartDate')?.value;
        const mainEnd = document.getElementById('mtEndDate')?.value;
        
        // Sync ค่าลงใน Modal Input
        if (mainStart) document.getElementById('dash_startDate').value = mainStart;
        if (mainEnd) document.getElementById('dash_endDate').value = mainEnd;

        // เริ่มทำงาน
        this.setupEventListeners();
        this.loadData();
    },

    setupEventListeners() {
        const inputs = ['dash_startDate', 'dash_endDate', 'dash_filterLine'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.loadData());
            }
        });
    },

    async loadData() {
        const startDate = document.getElementById('dash_startDate').value;
        const endDate = document.getElementById('dash_endDate').value;
        const line = document.getElementById('dash_filterLine').value;

        if (!startDate || !endDate) return;

        showSpinner();
        try {
            const url = `${MT_API_URL}?action=get_integrated_maintenance_analysis&startDate=${startDate}&endDate=${endDate}&line=${line}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                this.renderKPI(data.kpi);
                this.renderCharts(data);
                this.renderTable(data.analysis_table);
            }
        } catch (err) {
            console.error("Dashboard Error:", err);
        } finally {
            hideSpinner();
        }
    },

    renderKPI(kpi) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.textContent = parseInt(val || 0).toLocaleString();
        };

        // KPI 1: Volume
        setVal('kpi_total', kpi.Total_Req);
        setVal('kpi_vol_crit', kpi.Total_Critical);
        setVal('kpi_vol_high', kpi.Total_Urgent || kpi.Total_High || 0);
        setVal('kpi_vol_norm', kpi.Total_Normal);

        // KPI 2: Status
        setVal('kpi_completed_main', kpi.Count_Completed);
        const total = parseInt(kpi.Total_Req || 0);
        const completed = parseInt(kpi.Count_Completed || 0);
        const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
        const kpiRateEl = document.getElementById('kpi_rate');
        if(kpiRateEl) kpiRateEl.textContent = rate;

        setVal('kpi_stat_done', kpi.Count_Completed);
        setVal('kpi_stat_wip', kpi.Count_WIP);
        setVal('kpi_stat_pend', kpi.Count_Pending);

        // KPI 3: Time
        setVal('kpi_mttr', parseInt(kpi.MTTR || 0));
        setVal('kpi_time_avg', parseInt(kpi.Time_Avg || 0));
        setVal('kpi_time_avg_small', parseInt(kpi.Time_Avg || 0));
        setVal('kpi_time_max', parseInt(kpi.Time_Max || 0));
        setVal('kpi_time_min', parseInt(kpi.Time_Min || 0));

        // KPI 4: Backlog
        setVal('kpi_backlog_total', kpi.Total_Backlog);
        setVal('kpi_critical', kpi.Backlog_Critical || 0);
        setVal('kpi_blog_crit', kpi.Backlog_Critical);
        setVal('kpi_blog_high', kpi.Backlog_Urgent || kpi.Backlog_High || 0);
        setVal('kpi_blog_norm', kpi.Backlog_Normal);
    },

    renderCharts(data) {
        this.destroyCharts();

        // 1. Trend
        const trendCtx = document.getElementById('chartTrend').getContext('2d');
        this.charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: data.trend.map(d => d.DateVal),
                datasets: [
                    {
                        label: 'Incoming',
                        data: data.trend.map(d => d.Incoming),
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Completed',
                        data: data.trend.map(d => d.Completed),
                        borderColor: '#198754',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' } }
            }
        });

        // 2. Status
        const statusLabels = data.status_dist.map(d => d.status);
        const statusCtx = document.getElementById('chartStatus').getContext('2d');
        this.charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: data.status_dist.map(d => d.val),
                    backgroundColor: statusLabels.map(s => this.colors.status[s] || this.colors.status['Unknown'])
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 3. Top Lines
        const topCtx = document.getElementById('chartTopMachine').getContext('2d');
        this.charts.top = new Chart(topCtx, {
            type: 'bar',
            data: {
                labels: data.top_machines.map(d => d.line),
                datasets: [{
                    label: 'Request Count',
                    data: data.top_machines.map(d => d.val),
                    backgroundColor: '#6610f2',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });

        // 4. Priority (Sorted: Normal > Urgent > Critical)
        const priorityOrder = ['Normal', 'Urgent', 'High', 'Critical']; 
        const sortedPrioData = [...data.prio_dist].sort((a, b) => {
            return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        });

        const prioLabels = sortedPrioData.map(d => d.priority);
        const prioCtx = document.getElementById('chartPrio').getContext('2d');
        this.charts.prio = new Chart(prioCtx, {
            type: 'pie',
            data: {
                labels: prioLabels,
                datasets: [{
                    data: sortedPrioData.map(d => d.val),
                    backgroundColor: prioLabels.map(p => this.colors.priority[p] || this.colors.priority['Unknown']),
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    },

    renderTable(rows) {
        const tbody = document.querySelector('#analysisTable tbody');
        if(!tbody) return;
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td class="ps-4 fw-bold text-secondary">${r.line}</td>
                <td>${r.machine}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${r.total_count}</span></td>
                <td class="text-center text-success">${r.completed_count}</td>
                <td class="text-end pe-4 fw-bold ${r.avg_mttr > 60 ? 'text-danger' : 'text-primary'}">
                    ${parseInt(r.avg_mttr)} <small class="text-muted fw-normal">min</small>
                </td>
            </tr>
        `).join('');
    },

    destroyCharts() {
        Object.values(this.charts).forEach(c => c && c.destroy());
        this.charts = {};
    },
    
    exportTable() {
       const table = document.getElementById('analysisTable');
       const wb = XLSX.utils.table_to_book(table, {sheet: "Analysis"});
       XLSX.writeFile(wb, 'Maintenance_Analysis.xlsx');
    }
};

document.getElementById('maintenanceAnalysisModal').addEventListener('shown.bs.modal', () => {
    MtDashboard.init();
});