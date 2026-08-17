/**
 * page/manpower/script/employeeGrading.js
 */

const App = {
    state: {
        employees: [],
        lines: new Set(),
        currentSort: { col: 'emp_id', dir: 'asc' },
        isWageVisible: false, // Hide wage data by default
        analyticsLine: 'ALL'  // Analytics modal line filter
    },

    init: async function() {
        this.bindEvents();
        await this.loadData();
        
        // Start Live Clock
        setInterval(() => {
            const clockEl = document.getElementById('live-clock');
            if (clockEl) {
                const now = new Date();
                clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
            }
        }, 1000);
    },

    bindEvents: function() {
        document.querySelectorAll('input[name="periodTypeToggle"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isDaily = e.target.value === 'daily';
                document.getElementById('filterPeriodMonth').classList.toggle('d-none', isDaily);
                document.getElementById('filterPeriodDate').classList.toggle('d-none', !isDaily);
                this.loadData();
            });
        });
        document.getElementById('filterPeriodMonth').addEventListener('change', () => this.loadData());
        document.getElementById('filterPeriodDate').addEventListener('change', () => this.loadData());
        document.getElementById('filterHcGroup').addEventListener('change', () => this.loadData());
        document.getElementById('filterLine').addEventListener('change', () => this.renderTable());
        
        document.getElementById('btnSaveGrades').addEventListener('click', () => this.saveGrades());
        document.getElementById('btnCriteriaSettings').addEventListener('click', () => this.openCriteriaModal());
        document.getElementById('btnSaveCriteria').addEventListener('click', () => this.saveCriteria());
        
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        // Analytics Modal: re-render charts on tab switch (fix hidden-tab resize issue)
        document.getElementById('analyticsModal').addEventListener('shown.bs.modal', () => {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
        });
        document.querySelectorAll('#analyticsTabs .nav-link').forEach(tab => {
            tab.addEventListener('shown.bs.tab', () => {
                setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
            });
        });
        // Analytics line filter
        document.getElementById('analyticsLineFilter').addEventListener('change', (e) => {
            this.state.analyticsLine = e.target.value;
            this.renderCharts();
        });
    },

    loadData: async function() {
        try {
            const periodType = document.querySelector('input[name="periodTypeToggle"]:checked').value;
            const period = periodType === 'daily' 
                ? document.getElementById('filterPeriodDate').value 
                : document.getElementById('filterPeriodMonth').value;
            const hcGroup = document.getElementById('filterHcGroup').value;
            
            Swal.fire({
                title: 'Loading Data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`api/api_employee_grading.php?action=get_grading_data&period=${period}&hcGroup=${hcGroup}`);
            const result = await response.json();

            if (!result.success) throw new Error(result.message);

            this.state.employees = result.data;
            this.extractLines();
            this.renderTable();

            Swal.close();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    },

    extractLines: function() {
        const lineSelect = document.getElementById('filterLine');
        const currentVal = lineSelect.value;
        
        this.state.lines.clear();
        this.state.employees.forEach(emp => {
            if (emp.line) this.state.lines.add(emp.line);
        });

        const sortedLines = Array.from(this.state.lines).sort();
        let html = `<option value="ALL">ALL LINES</option>`;
        sortedLines.forEach(line => { html += `<option value="${line}">${line}</option>`; });
        lineSelect.innerHTML = html;
        if (this.state.lines.has(currentVal)) lineSelect.value = currentVal;

        // Also populate the analytics modal line filter
        const analyticsFilter = document.getElementById('analyticsLineFilter');
        if (analyticsFilter) {
            const curAnalytics = analyticsFilter.value;
            let aHtml = `<option value="ALL">All Lines</option>`;
            sortedLines.forEach(line => { aHtml += `<option value="${line}">${line}</option>`; });
            analyticsFilter.innerHTML = aHtml;
            if (this.state.lines.has(curAnalytics)) analyticsFilter.value = curAnalytics;
        }
    },

    renderTable: function() {
        const tbody = document.getElementById('gradingTableBody');
        const lineFilter = document.getElementById('filterLine').value;
        
        let filtered = this.state.employees;
        if (lineFilter !== 'ALL') {
            filtered = this.state.employees.filter(e => e.line === lineFilter);
        }

        // Sorting logic
        filtered.sort((a, b) => {
            let valA = a[this.state.currentSort.col];
            let valB = b[this.state.currentSort.col];
            
            if (this.state.currentSort.col === 'income_per_head' || this.state.currentSort.col === 'ratio') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return this.state.currentSort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return this.state.currentSort.dir === 'asc' ? 1 : -1;
            return 0;
        });

        // Update sort icons
        document.querySelectorAll('th.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort text-muted ms-1';
        });
        const activeTh = document.querySelector(`th[data-sort="${this.state.currentSort.col}"] i`);
        if (activeTh) {
            activeTh.className = `fas fa-sort-${this.state.currentSort.dir === 'asc' ? 'up' : 'down'} text-primary ms-1`;
        }

        let html = '';
        let totalIncome = 0;
        let totalWage = 0;
        let totalDl = 0;
        let totalOt = 0;
        
        filtered.forEach(emp => {
            totalIncome += parseFloat(emp.income_per_head) || 0;
            totalWage += parseFloat(emp.total_wage) || 0;
            totalDl += parseFloat(emp.dl_wage) || 0;
            totalOt += parseFloat(emp.ot_wage) || 0;

            let systemGradeBadge = '';
            if (emp.system_grade && emp.system_grade !== 'N/A') {
                const colors = { A: 'success', B: 'primary', C: 'warning', D: 'danger' };
                const c = colors[emp.system_grade] || 'secondary';
                systemGradeBadge = `<span class="badge bg-${c}-subtle text-${c} border border-${c}-subtle ms-2" title="System Recommended Grade">SYS: ${emp.system_grade}</span>`;
            }

            html += `
                <tr>
                    <td class="fw-bold text-primary">${emp.emp_id}</td>
                    <td class="text-start px-3">
                        <div class="d-flex align-items-center justify-content-between w-100">
                            <span class="fw-bold text-dark text-truncate pe-2">${emp.name_th}</span>
                            <span class="text-muted small text-nowrap">
                                (${emp.team_group || '-'} <span class="mx-1">|</span> ${emp.line || '-'})
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="fw-bold text-secondary">${emp.position || '-'}</span>
                    </td>
                    <td>
                        <span class="fw-bold text-success me-2">${parseFloat(emp.income_per_head || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} ฿</span>
                        <span class="small text-muted">| Ratio: <strong class="${parseFloat(emp.ratio||0) >= 1 ? 'text-primary' : 'text-danger'}">${parseFloat(emp.ratio||0).toFixed(2)}</strong></span>
                    </td>
                    <td>
                        ${this.state.isWageVisible ? `
                            <span class="fw-bold text-secondary me-2">${parseFloat(emp.total_wage || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} ฿</span>
                            <span class="small text-muted text-nowrap" style="font-size: 0.75rem;">
                                (DL: ${parseFloat(emp.dl_wage || 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                <span class="mx-1 text-secondary opacity-50">|</span>
                                OT: ${parseFloat(emp.ot_wage || 0).toLocaleString(undefined, {maximumFractionDigits:0})})
                            </span>
                        ` : `
                            <span class="fw-bold text-muted opacity-50">******</span>
                        `}
                    </td>
                    <td>
                        <div class="d-flex align-items-center justify-content-center">
                            <select class="form-select form-select-sm d-inline-block grade-select ${this.getGradeClass(emp.grade)}" 
                                    data-empid="${emp.emp_id}" 
                                    onchange="App.updateGradeState('${emp.emp_id}', this.value, this)">
                                <option value="" class="grade-empty">Select</option>
                                <option value="A" class="grade-A" ${emp.grade === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" class="grade-B" ${emp.grade === 'B' ? 'selected' : ''}>B</option>
                                <option value="C" class="grade-C" ${emp.grade === 'C' ? 'selected' : ''}>C</option>
                                <option value="D" class="grade-D" ${emp.grade === 'D' ? 'selected' : ''}>D</option>
                            </select>
                            ${systemGradeBadge}
                        </div>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center" 
                               placeholder="Add notes..." 
                               value="${emp.notes || ''}" 
                               onchange="App.updateNotesState('${emp.emp_id}', this.value)">
                    </td>
                </tr>
            `;
        });

        if (filtered.length === 0) {
            html = `<tr><td colspan="7" class="text-muted py-4">No employees found for this selection.</td></tr>`;
        }

        tbody.innerHTML = html;

        // Update KPIs
        document.getElementById('kpi-total-emp').innerText = filtered.length;
        
        const avgIncome = filtered.length > 0 ? (totalIncome / filtered.length) : 0;
        document.getElementById('kpi-avg-income').innerText = avgIncome.toLocaleString(undefined, {maximumFractionDigits: 0});

        const avgRatio = totalWage > 0 ? (totalIncome / totalWage) : 0;
        document.getElementById('kpi-avg-ratio').innerText = avgRatio.toFixed(2);
        
        document.getElementById('kpi-total-income').innerText = totalIncome.toLocaleString(undefined, {maximumFractionDigits: 0});
        
        // Update Total Wage KPI
        const totalWageEl = document.getElementById('kpi-total-wage');
        if (totalWageEl) {
            totalWageEl.innerText = this.state.isWageVisible 
                ? totalWage.toLocaleString(undefined, {maximumFractionDigits: 0}) 
                : '******';
        }

        const kpiSubtitleEl = document.getElementById('kpi-wage-subtitle');
        if (kpiSubtitleEl) {
            kpiSubtitleEl.innerHTML = this.state.isWageVisible
                ? `<span class="text-secondary fw-bold">DL: ${totalDl.toLocaleString(undefined, {maximumFractionDigits: 0})}</span> <span class="mx-1 text-secondary opacity-50">|</span> <span class="text-secondary fw-bold">OT: ${totalOt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>`
                : 'Base Wage (Hidden)';
        }
        
        // Update Eye Icons
        const icons = ['kpiWageEyeToggle', 'thWageEyeToggle'];
        icons.forEach(id => {
            const icon = document.getElementById(id);
            if (icon) {
                icon.className = this.state.isWageVisible 
                    ? 'fas fa-eye ms-2 text-primary' 
                    : 'fas fa-eye-slash ms-2 text-muted';
            }
        });

        // Render Analytics Charts (uses its own filter from state.analyticsLine)
        this.renderCharts();
    },

    renderCharts: function() {
        if (!window.ApexCharts) return;

        // Filter internally from analyticsLine state
        const analyticsLine = this.state.analyticsLine || 'ALL';
        const filtered = analyticsLine === 'ALL'
            ? [...this.state.employees]
            : this.state.employees.filter(e => e.line === analyticsLine);

        const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        setEl('analytics-filter-count', `Showing ${filtered.length} of ${this.state.employees.length} employees`);

        // --- Aggregate Data by Line ---
        const lineData = {};
        let grades = { A: 0, B: 0, C: 0, D: 0, Unassigned: 0 };
        let totalIncome = 0, totalWage = 0;

        filtered.forEach(emp => {
            const line = emp.line || 'Unknown';
            if (!lineData[line]) {
                lineData[line] = { dl: 0, ot: 0, wage: 0, income: 0, count: 0, grades: { A:0, B:0, C:0, D:0 } };
            }
            lineData[line].dl    += parseFloat(emp.dl_wage) || 0;
            lineData[line].ot    += parseFloat(emp.ot_wage) || 0;
            lineData[line].wage  += parseFloat(emp.total_wage) || 0;
            lineData[line].income+= parseFloat(emp.income_per_head) || 0;
            lineData[line].count += 1;
            totalIncome += parseFloat(emp.income_per_head) || 0;
            totalWage   += parseFloat(emp.total_wage) || 0;
            if (emp.grade && ['A','B','C','D'].includes(emp.grade)) {
                grades[emp.grade]++;
                lineData[line].grades[emp.grade]++;
            } else {
                grades.Unassigned++;
            }
        });

        const lines        = Object.keys(lineData).sort();
        const dlData       = lines.map(l => parseFloat(lineData[l].dl.toFixed(0)));
        const otData       = lines.map(l => parseFloat(lineData[l].ot.toFixed(0)));
        const avgWageData  = lines.map(l => parseFloat((lineData[l].wage / lineData[l].count).toFixed(0)));
        const avgIncomeData= lines.map(l => parseFloat((lineData[l].income/lineData[l].count).toFixed(0)));
        const ratioData    = lines.map(l => lineData[l].wage > 0 ? parseFloat((lineData[l].income / lineData[l].wage).toFixed(2)) : 0);

        // Shared: horizontal x-axis labels, trimmed
        const shortLine  = (name) => name.length > 9 ? name.substring(0, 8) + '…' : name;
        const shortLines = lines.map(shortLine);
        const xCatLabels = {
            rotate: 0, rotateAlways: false, trim: true,
            maxWidth: 60, hideOverlappingLabels: true,
            style: { fontSize: '10px' }
        };

        // --- Update Header Stats ---
        const avgRatioAll = totalWage > 0 ? (totalIncome / totalWage) : 0;
        const isVisible   = this.state.isWageVisible;
        const periodType  = document.querySelector('input[name="periodTypeToggle"]:checked')?.value;
        const periodVal   = periodType === 'daily'
            ? document.getElementById('filterPeriodDate')?.value
            : document.getElementById('filterPeriodMonth')?.value;

        setEl('analytics-period-label', `Period: ${periodVal || '—'} · ${filtered.length} employees`);
        setEl('analytics-stat-emp',     filtered.length);
        setEl('analytics-stat-ratio',   avgRatioAll.toFixed(2) + 'x');
        setEl('analytics-stat-income',  (totalIncome/1000).toLocaleString(undefined,{maximumFractionDigits:1}) + 'k ฿');
        setEl('analytics-stat-wage',    isVisible ? (totalWage/1000).toLocaleString(undefined,{maximumFractionDigits:1}) + 'k ฿' : '🔒 Hidden');

        const totalGraded = grades.A + grades.B + grades.C + grades.D;
        setEl('analytics-grade-total-badge', `${totalGraded} graded / ${filtered.length} total`);
        setEl('wage-tab-total-badge', isVisible ? `Total: ${totalWage.toLocaleString(undefined,{maximumFractionDigits:0})} ฿` : '🔒 Locked');
        const wageUnlockBanner = document.getElementById('wage-unlock-banner');
        if (wageUnlockBanner) wageUnlockBanner.classList.toggle('d-none', isVisible);

        // --- Destroy Old Charts ---
        if (this.charts) Object.values(this.charts).forEach(c => c && c.destroy());
        this.charts = {};

        // --- Toggle Overlays ---
        ['overlay-wage-breakdown','overlay-profitability','overlay-performance','overlay-ot-ratio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('d-none', isVisible);
        });

        // ── Chart 1: Grade Distribution (Donut) ────────────────────────────────
        this.charts.gradeDist = new ApexCharts(document.querySelector('#chart-grade-dist'), {
            series: [grades.A, grades.B, grades.C, grades.D, grades.Unassigned],
            labels: ['Grade A','Grade B','Grade C','Grade D','Unassigned'],
            chart: { type: 'donut', height: 260, animations: { speed: 400 } },
            colors: ['#1cc88a','#4e73df','#f6c23e','#e74a3b','#adb5bd'],
            dataLabels: {
                enabled: true,
                formatter: (val, opts) => { const c = opts.w.config.series[opts.seriesIndex]; return c > 0 ? c : ''; },
                style: { fontSize: '12px', fontWeight: '700' }
            },
            plotOptions: { pie: { donut: { size: '65%', labels: { show: true,
                total: { show: true, label: 'Total', fontSize: '13px', color: '#6c757d',
                    formatter: () => filtered.length + ' emp' }
            }}}},
            legend: { position: 'bottom', fontSize: '12px' },
            tooltip: { y: { formatter: val => val + ' employees' } }
        });
        this.charts.gradeDist.render();

        // ── Chart 2: Grade by Line (Heatmap) ───────────────────────────────────
        this.charts.gradeHeatmap = new ApexCharts(document.querySelector('#chart-grade-heatmap'), {
            series: ['A','B','C','D'].map(g => ({
                name: `Grade ${g}`,
                data: lines.map(l => ({ x: shortLine(l), y: lineData[l].grades[g] || 0 }))
            })),
            chart: { type: 'heatmap', height: 260, toolbar: { show: false }, animations: { speed: 400 } },
            colors: ['#1cc88a','#4e73df','#f6c23e','#e74a3b'],
            dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: '700' } },
            xaxis: { labels: { ...xCatLabels } },
            tooltip: { y: { formatter: val => val + ' employees' } },
            legend: { position: 'top' }
        });
        this.charts.gradeHeatmap.render();

        // ── Chart 3: Profitability Combo ───────────────────────────────────────
        this.charts.profitability = new ApexCharts(document.querySelector('#chart-profitability'), {
            series: [
                { name: 'Avg Income', type: 'column', data: avgIncomeData },
                { name: 'Avg Wage',   type: 'column', data: isVisible ? avgWageData : avgWageData.map(() => 0) },
                { name: 'Ratio (×)', type: 'line',   data: isVisible ? ratioData   : ratioData.map(() => 0) }
            ],
            chart: { height: 240, type: 'line', toolbar: { show: false }, animations: { speed: 400 } },
            stroke: { width: [0, 0, 3], curve: 'smooth' },
            colors: ['#1cc88a','#e74a3b','#4e73df'],
            xaxis: { categories: shortLines, labels: { ...xCatLabels } },
            yaxis: [
                { seriesName: 'Avg Income', labels: { formatter: val => (val/1000).toFixed(1)+'k' }, title: { text: 'THB' } },
                { seriesName: 'Avg Wage',  show: false },
                { opposite: true, seriesName: 'Ratio (×)', title: { text: 'Ratio' }, min: 0,
                  labels: { formatter: val => val.toFixed(1)+'x' } }
            ],
            annotations: { yaxis: [{ y: 1, borderColor: '#e74a3b', strokeDashArray: 4, borderWidth: 2,
                label: { text: 'Breakeven (1.0x)', style: { background: '#ffe0e0', color: '#dc3545', fontSize: '10px' }, position: 'right' }
            }]},
            dataLabels: { enabled: false },
            plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
            tooltip: {
                shared: true, intersect: false,
                y: { formatter: (y, { seriesIndex }) => {
                    if (typeof y === 'undefined') return y;
                    if (seriesIndex === 0) return y.toLocaleString() + ' ฿';
                    if (seriesIndex === 1) return isVisible ? y.toLocaleString() + ' ฿' : '🔒 Hidden';
                    return isVisible ? y.toFixed(2) + 'x' : '🔒 Hidden';
                }}
            },
            fill: { type: ['gradient','gradient','solid'],
                gradient: { shade:'light', type:'vertical', opacityFrom:0.85, opacityTo:0.35 } }
        });
        this.charts.profitability.render();

        // ── Chart 4 & 5: Top/Bottom 5 Performers (only employees with income > 0) ──
        const withIncome = filtered.filter(e => parseFloat(e.income_per_head) > 0);
        const top5    = [...withIncome].sort((a,b) => (parseFloat(b.income_per_head)||0) - (parseFloat(a.income_per_head)||0)).slice(0, 5);
        const bottom5 = [...withIncome].sort((a,b) => (parseFloat(a.income_per_head)||0) - (parseFloat(b.income_per_head)||0)).slice(0, 5);
        const sName   = (name) => name && name.length > 16 ? name.substring(0, 15) + '…' : (name || '?');

        const makeBarChart = (data, color, gradientTo) => ({
            series: [{ name: 'Income', data: data.map(e => parseFloat(e.income_per_head)||0) }],
            chart: { type: 'bar', height: 260, toolbar: { show: false }, animations: { speed: 400 } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'right' } } },
            colors: [color],
            fill: { type: 'gradient', gradient: { gradientToColors: [gradientTo], shade: 'light', type:'horizontal', stops:[0,100] } },
            dataLabels: { enabled: true, formatter: val => (val/1000).toFixed(1)+'k ฿', offsetX: 4, style: { fontSize:'11px', colors:['#333'] } },
            xaxis: { categories: data.map(e => sName(e.name_th)), labels: { formatter: val => (val/1000).toFixed(0)+'k' } },
            yaxis: { labels: { style: { fontSize: '11px' } } },
            tooltip: { y: { formatter: val => val.toLocaleString() + ' ฿' } },
            grid: { borderColor: '#f0f0f0', padding: { right: 50 } }
        });

        this.charts.topPerformers    = new ApexCharts(document.querySelector('#chart-top-performers'),    makeBarChart(top5,    '#1cc88a', '#0a9b5e'));
        this.charts.bottomPerformers = new ApexCharts(document.querySelector('#chart-bottom-performers'), makeBarChart(bottom5, '#e74a3b', '#c0392b'));
        this.charts.topPerformers.render();
        this.charts.bottomPerformers.render();

        // ── Chart 6: Performance Scatter ───────────────────────────────────────
        const avgWageAll   = filtered.length > 0 ? totalWage / filtered.length : 0;
        const avgIncomeAll = filtered.length > 0 ? totalIncome / filtered.length : 0;
        const scatterSeries = lines.map(line => {
            const data = filtered.filter(e => e.line === line && parseFloat(e.total_wage) > 0).map(e => ({
                x: isVisible ? parseFloat(e.total_wage) : 0,
                y: parseFloat(e.income_per_head) || 0,
                name: e.name_th
            }));
            return { name: line, data };
        }).filter(s => s.data.length > 0);

        this.charts.performance = new ApexCharts(document.querySelector('#chart-performance'), {
            series: scatterSeries,
            chart: { type: 'scatter', height: 260, zoom: { enabled: true, type: 'xy' }, toolbar: { show: false }, animations: { speed: 400 } },
            xaxis: { type: 'numeric', tickAmount: 5,
                title: { text: 'Total Wage (THB)' },
                labels: { rotate: 0, formatter: val => isVisible ? (parseFloat(val)/1000).toFixed(0)+'k' : '***' }
            },
            yaxis: { title: { text: 'Income (THB)' },
                labels: { formatter: val => (parseFloat(val)/1000).toFixed(0)+'k' }
            },
            annotations: isVisible ? {
                xaxis: [{ x: avgWageAll, borderColor:'#6c757d', strokeDashArray:4,
                    label: { text:'Avg Wage', style: { fontSize:'10px', background:'#f8f9fa' } } }],
                yaxis: [{ y: avgIncomeAll, borderColor:'#6c757d', strokeDashArray:4,
                    label: { text:'Avg Income', style: { fontSize:'10px', background:'#f8f9fa' } } }]
            } : {},
            markers: { size: 6, hover: { sizeOffset: 2 } },
            tooltip: {
                custom: ({ seriesIndex, dataPointIndex, w }) => {
                    const d = w.config.series[seriesIndex].data[dataPointIndex];
                    return `<div class="p-2 bg-white shadow-sm rounded border">
                        <strong class="text-primary">${d.name}</strong><br/>
                        <span class="text-success">Income: ${d.y.toLocaleString()} ฿</span><br/>
                        <span class="text-danger">Wage: ${isVisible ? d.x.toLocaleString() + ' ฿' : '🔒 Hidden'}</span>
                    </div>`;
                }
            }
        });
        this.charts.performance.render();

        // ── Chart 7: DL vs OT Stacked 100% Bar ────────────────────────────────
        this.charts.otRatio = new ApexCharts(document.querySelector('#chart-ot-ratio'), {
            series: [
                { name: 'DL (Base)', data: isVisible ? dlData : dlData.map(() => 0) },
                { name: 'OT',        data: isVisible ? otData : otData.map(() => 0) }
            ],
            chart: { type: 'bar', height: 270, stacked: true, stackType: '100%', toolbar: { show: false }, animations: { speed: 400 } },
            plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
            colors: ['#4e73df', '#f6c23e'],
            xaxis: { categories: shortLines, labels: { formatter: val => val + '%', style: { fontSize: '10px' } } },
            yaxis: { labels: { style: { fontSize: '10px' } } },
            dataLabels: {
                enabled: true,
                formatter: (val) => val > 8 ? val.toFixed(1) + '%' : '',
                style: { fontSize: '10px', fontWeight: '600' }
            },
            tooltip: {
                y: { formatter: (val, { seriesIndex, dataPointIndex }) => {
                    if (!isVisible) return '🔒 Hidden';
                    const raw = seriesIndex === 0 ? dlData[dataPointIndex] : otData[dataPointIndex];
                    return (raw || 0).toLocaleString() + ' ฿';
                }}
            },
            fill: { opacity: 1 },
            legend: { position: 'top' }
        });
        this.charts.otRatio.render();
    },

    toggleWageVisibility: async function() {
        if (this.state.isWageVisible) {
            this.state.isWageVisible = false;
            this.renderTable();
            return;
        }

        // Prompt for Passcode
        const { value: pin } = await Swal.fire({
            title: 'Verify Identity',
            target: document.getElementById('analyticsModal'),
            input: 'password',
            inputLabel: 'Please enter your login password to view sensitive wage data',
            inputPlaceholder: 'Enter your password...',
            showCancelButton: true,
            confirmButtonText: 'Unlock',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write something!'
                }
            }
        });

        if (pin) {
            try {
                Swal.fire({ title: 'Verifying...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                const formData = new URLSearchParams();
                formData.append('action', 'verify_password');
                formData.append('password', pin);

                const response = await fetch('api/api_employee_grading.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });

                const result = await response.json();
                if (result.success) {
                    Swal.close();
                    this.state.isWageVisible = true;
                    this.renderTable(this.state.employees);
                    
                    // Fix Bootstrap backdrop bug when SweetAlert closes while a Modal is open
                    setTimeout(() => {
                        if (document.getElementById('analyticsModal').classList.contains('show')) {
                            document.body.classList.add('modal-open');
                        }
                    }, 400);
                } else {
                    throw new Error(result.message || 'Incorrect password.');
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: error.message
                });
            }
        }
    },

    getGradeClass: function(grade) {
        if (!grade) return 'grade-empty';
        return `grade-${grade}`;
    },

    updateGradeState: function(empId, grade, selectElement) {
        selectElement.className = `form-select form-select-sm mx-auto grade-select ${this.getGradeClass(grade)}`;
        
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp.grade = grade;
        }
        
        // Minor re-render to update the distribution bar without resetting the inputs
        this.updateDistributionBar();
    },
    
    updateNotesState: function(empId, notes) {
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp.notes = notes;
        }
    },
    
    updateDistributionBar: function() {
        const lineFilter = document.getElementById('filterLine').value;
        let filtered = this.state.employees;
        if (lineFilter !== 'ALL') {
            filtered = this.state.employees.filter(e => e.line === lineFilter);
        }
        
        let gradeCount = { A: 0, B: 0, C: 0, D: 0 };
        filtered.forEach(emp => {
            if (emp.grade && gradeCount[emp.grade] !== undefined) {
                gradeCount[emp.grade]++;
            }
        });
        
        const totalGraded = gradeCount.A + gradeCount.B + gradeCount.C + gradeCount.D;
        const calcDist = (count) => totalGraded > 0 ? ((count / totalGraded) * 100).toFixed(0) + '%' : '0%';
        
        document.getElementById('dist-A').style.width = calcDist(gradeCount.A);
        document.getElementById('dist-A').innerText = gradeCount.A > 0 ? calcDist(gradeCount.A) : '';
        
        document.getElementById('dist-B').style.width = calcDist(gradeCount.B);
        document.getElementById('dist-B').innerText = gradeCount.B > 0 ? calcDist(gradeCount.B) : '';
        
        document.getElementById('dist-C').style.width = calcDist(gradeCount.C);
        document.getElementById('dist-C').innerText = gradeCount.C > 0 ? calcDist(gradeCount.C) : '';
        
        document.getElementById('dist-D').style.width = calcDist(gradeCount.D);
        document.getElementById('dist-D').innerText = gradeCount.D > 0 ? calcDist(gradeCount.D) : '';
    },

    autoGrade: function() {
        Swal.fire({
            title: 'Auto Grade',
            text: "This will apply the System Recommended Grade to all employees (where available). Overwrite existing grades?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, apply it!'
        }).then((result) => {
            if (result.isConfirmed) {
                let count = 0;
                this.state.employees.forEach(emp => {
                    if (emp.system_grade && ['A', 'B', 'C', 'D'].includes(emp.system_grade)) {
                        emp.grade = emp.system_grade;
                        count++;
                    }
                });
                if (count > 0) {
                    this.renderTable();
                    Swal.fire('Success', `Applied system grades to ${count} employees. Don't forget to click Save.`, 'success');
                } else {
                    Swal.fire('Info', 'No system grades available to apply.', 'info');
                }
            }
        });
    },

    saveGrades: async function() {
        const periodType = document.querySelector('input[name="periodTypeToggle"]:checked').value;
        const period = periodType === 'daily' 
            ? document.getElementById('filterPeriodDate').value 
            : document.getElementById('filterPeriodMonth').value;
        
        // Filter out employees that have a grade assigned
        const gradesToSave = this.state.employees
            .filter(emp => emp.grade && emp.grade.trim() !== '')
            .map(emp => ({
                emp_id: emp.emp_id,
                grade: emp.grade,
                notes: emp.notes
            }));

        if (gradesToSave.length === 0) {
            Swal.fire('No Changes', 'There are no grades assigned to save.', 'info');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Save Grades?',
            text: `You are about to save/update grades for ${gradesToSave.length} employees for ${period}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Save it!'
        });

        if (!confirm.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Saving...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const formData = new URLSearchParams();
            formData.append('action', 'save_grades');
            formData.append('period', period);
            formData.append('grades', JSON.stringify(gradesToSave));

            const response = await fetch('api/api_employee_grading.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            Swal.fire('Saved!', result.message, 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    },
    
    handleSort: function(col) {
        if (this.state.currentSort.col === col) {
            this.state.currentSort.dir = this.state.currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.currentSort.col = col;
            this.state.currentSort.dir = 'asc';
        }
        this.renderTable();
    },

    openCriteriaModal: async function() {
        try {
            Swal.fire({ title: 'Loading...', didOpen: () => Swal.showLoading() });
            
            const response = await fetch(`api/api_employee_grading.php?action=get_criteria`);
            const result = await response.json();
            
            if (result.success) {
                const criteriaData = result.data || [];
                // Map by line for quick lookup
                const criteriaMap = {};
                criteriaData.forEach(c => criteriaMap[c.line] = c);

                const tbody = document.getElementById('criteriaTableBody');
                let html = '';
                
                if (this.state.lines.size === 0) {
                    html = '<tr><td colspan="4" class="text-muted py-3">No lines available in the current period.</td></tr>';
                } else {
                    const sortedLines = Array.from(this.state.lines).sort();
                    sortedLines.forEach(line => {
                        const crit = criteriaMap[line] || { threshold_a: '', threshold_b: '', threshold_c: '' };
                        html += `
                            <tr data-line="${line}">
                                <td class="fw-bold text-start ps-3">${line}</td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-a" value="${crit.threshold_a || ''}" placeholder="e.g. 2.0"></td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-b" value="${crit.threshold_b || ''}" placeholder="e.g. 1.5"></td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-c" value="${crit.threshold_c || ''}" placeholder="e.g. 1.0"></td>
                            </tr>
                        `;
                    });
                }
                
                tbody.innerHTML = html;
                
                Swal.close();
                const modal = new bootstrap.Modal(document.getElementById('criteriaModal'));
                modal.show();
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    saveCriteria: async function() {
        const rows = document.querySelectorAll('#criteriaTableBody tr[data-line]');
        if (rows.length === 0) return;

        const criteriaArray = [];
        let hasError = false;

        rows.forEach(row => {
            const line = row.dataset.line;
            const a = row.querySelector('.crit-a').value;
            const b = row.querySelector('.crit-b').value;
            const c = row.querySelector('.crit-c').value;

            // Only save if at least one field is filled, or if they just want to save 0
            if (a !== '' || b !== '' || c !== '') {
                criteriaArray.push({
                    line: line,
                    threshold_a: parseFloat(a) || 0,
                    threshold_b: parseFloat(b) || 0,
                    threshold_c: parseFloat(c) || 0
                });
            }
        });

        try {
            Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const formData = new URLSearchParams();
            formData.append('action', 'save_criteria');
            formData.append('criteria', JSON.stringify(criteriaArray));

            const response = await fetch('api/api_employee_grading.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const result = await response.json();
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('criteriaModal')).hide();
                Swal.fire('Saved', 'Criteria updated successfully', 'success');
                this.loadData(); // Reload data to apply new system_grade
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
