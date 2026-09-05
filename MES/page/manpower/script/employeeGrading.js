/**
 * page/manpower/script/employeeGrading.js
 */

const App = {
    state: {
        employees: [],
        lines: new Set(),
        currentSort: { col: 'line', dir: 'asc' },
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
                const type = e.target.value;
                document.getElementById('filterPeriodMonth').classList.toggle('d-none', type !== 'monthly');
                document.getElementById('filterPeriodDate').classList.toggle('d-none', type !== 'daily');
                document.getElementById('filterPeriodRangeGroup').classList.toggle('d-none', type !== 'range');
                
                // Hide Save Grades in range mode
                const saveBtn = document.getElementById('btnSaveGrades');
                if (saveBtn) saveBtn.style.display = (type === 'range') ? 'none' : 'block';

                this.loadData();
            });
        });
        document.getElementById('filterPeriodMonth').addEventListener('change', () => this.loadData());
        document.getElementById('filterPeriodDate').addEventListener('change', () => this.loadData());
        document.getElementById('filterPeriodDateStart').addEventListener('change', () => this.loadData());
        document.getElementById('filterPeriodDateEnd').addEventListener('change', () => this.loadData());
        document.getElementById('filterHcGroup').addEventListener('change', () => this.loadData());
        document.getElementById('filterLine').addEventListener('change', () => this.renderTable());
        
        document.getElementById('btnSaveGrades').addEventListener('click', () => this.saveGrades());
        document.getElementById('btnCriteriaSettings').addEventListener('click', () => this.openCriteriaModal());
        document.getElementById('btnSaveCriteria').addEventListener('click', () => this.saveCriteria());
        
        const btnWeightageSettings = document.getElementById('btnWeightageSettings');
        if (btnWeightageSettings) {
            btnWeightageSettings.addEventListener('click', () => this.openWeightageModal());
        }
        
        const btnSaveWeightage = document.getElementById('btnSaveWeightage');
        if (btnSaveWeightage) {
            btnSaveWeightage.addEventListener('click', () => this.saveWeightage());
        }
        
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('input', () => this.calculateWeightTotal());
        });
        
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
            let period;
            if (periodType === 'daily') {
                period = document.getElementById('filterPeriodDate').value;
            } else if (periodType === 'monthly') {
                period = document.getElementById('filterPeriodMonth').value;
            } else {
                const start = document.getElementById('filterPeriodDateStart').value;
                const end = document.getElementById('filterPeriodDateEnd').value;
                period = `${start}_${end}`;
            }
            this.state.currentPeriodType = periodType;
            this.state.currentPeriod = period;
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
            
            // Sort by Line -> Position -> Name by default
            this.state.employees.sort((a, b) => {
                const lineA = (a.line || a.department_api || '').toLowerCase();
                const lineB = (b.line || b.department_api || '').toLowerCase();
                if (lineA < lineB) return -1;
                if (lineA > lineB) return 1;

                const posA = (a.position || '').toLowerCase();
                const posB = (b.position || '').toLowerCase();
                if (posA < posB) return -1;
                if (posA > posB) return 1;

                const nameA = (a.name_th || '').toLowerCase();
                const nameB = (b.name_th || '').toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;

                return 0;
            });

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
            let col = this.state.currentSort.col;
            if (col === 'line') col = 'department_api'; // Fallback if line is missing but usually line is populated
            
            let valA = a[col] || a['line'] || a['department_api'] || '';
            let valB = b[col] || b['line'] || b['department_api'] || '';
            
            if (this.state.currentSort.col === 'income_per_head' || this.state.currentSort.col === 'ratio') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return this.state.currentSort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return this.state.currentSort.dir === 'asc' ? 1 : -1;
            
            // Secondary sort by position
            const posA = (a.position || '').toLowerCase();
            const posB = (b.position || '').toLowerCase();
            if (posA < posB) return -1;
            if (posA > posB) return 1;
            
            // Tertiary sort by name
            const nameA = (a.name_th || '').toLowerCase();
            const nameB = (b.name_th || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

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

            const renderSelect = (col, val, sysVal) => {
                let actualVal = val || '';
                let emptyText = '-';
                if (sysVal && sysVal !== 'N/A') {
                    emptyText = `(${sysVal})`;
                }
                return `
                    <div class="d-flex flex-column align-items-center justify-content-center">
                        <select class="form-select form-select-sm d-inline-block grade-select ${this.getGradeClass(actualVal)}" 
                                data-empid="${emp.emp_id}" data-col="${col}"
                                onchange="App.updateGradeState('${emp.emp_id}', '${col}', this.value, this)" style="min-width: 60px;">
                            <option value="" class="grade-empty">${emptyText}</option>
                            <option value="A" class="grade-A" ${actualVal === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" class="grade-B" ${actualVal === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" class="grade-C" ${actualVal === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" class="grade-D" ${actualVal === 'D' ? 'selected' : ''}>D</option>
                        </select>
                    </div>
                `;
            };

            html += `
                <tr>
                    <td class="fw-bold text-primary">${emp.emp_id}</td>
                    <td class="text-start px-3">
                        <div class="d-flex align-items-center justify-content-between w-100">
                            <span class="fw-bold text-dark text-truncate pe-2" style="cursor: pointer; transition: color 0.2s;" onclick="App.viewEmployeeProfile('${emp.emp_id}')" onmouseover="this.classList.replace('text-dark','text-primary')" onmouseout="this.classList.replace('text-primary','text-dark')" title="ดูข้อมูลโปรไฟล์">${emp.name_th}</span>
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
                    <td class="px-1">
                        ${renderSelect('grade_iph', emp.grade_iph, emp.system_grade_iph)}
                    </td>
                    <td class="px-1">
                        ${renderSelect('grade_5s', emp.grade_5s, null)}
                    </td>
                    <td class="px-1">
                        ${renderSelect('grade_attendance', emp.grade_attendance, emp.system_grade_attendance)}
                    </td>
                    <td class="px-1">
                        ${renderSelect('grade_learning', emp.grade_learning, null)}
                    </td>
                    <td class="px-1 border-start">
                        ${renderSelect('grade_overall', emp.grade_overall, null)}
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
            html = `<tr><td colspan="11" class="text-muted py-4">No employees found for this selection.</td></tr>`;
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
            if (emp.grade_overall && ['A','B','C','D'].includes(emp.grade_overall)) {
                grades[emp.grade_overall]++;
                lineData[line].grades[emp.grade_overall]++;
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

        // Shared: horizontal x-axis labels, trimmed aggressively to prevent overlap
        const shortLine  = (name) => {
            let n = name.replace('TOOLBOX_', 'TB_').replace('ASSEMBLY', 'ASSY').replace('ST.WELD', 'ST.W').replace('OFFICE', 'OFC');
            return n.length > 7 ? n.substring(0, 6) + '.' : n;
        };
        const shortLines = lines.map(shortLine);
        const xCatLabels = {
            rotate: 0, rotateAlways: false, trim: true,
            hideOverlappingLabels: false,
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
        setEl('analytics-stat-income',  (totalIncome / 1000).toFixed(1) + 'k ฿');
        setEl('analytics-stat-wage',    isVisible ? (totalWage / 1000).toFixed(1) + 'k ฿' : '******');
        
        // Update global toggle button in modal
        const globalToggleBtn = document.getElementById('btnGlobalWageToggle');
        if (globalToggleBtn) {
            if (isVisible) {
                globalToggleBtn.className = 'btn btn-sm border-0 rounded-pill d-flex align-items-center fw-bold px-3';
                globalToggleBtn.style.backgroundColor = '#f8d7da';
                globalToggleBtn.style.color = '#842029';
                globalToggleBtn.innerHTML = '<i class="fas fa-lock-open me-1"></i> <span>Lock Wage</span>';
            } else {
                globalToggleBtn.className = 'btn btn-sm border-0 rounded-pill d-flex align-items-center fw-bold px-3';
                globalToggleBtn.style.backgroundColor = '#fff3cd';
                globalToggleBtn.style.color = '#664d03';
                globalToggleBtn.innerHTML = '<i class="fas fa-lock me-1"></i> <span>Unlock Wage</span>';
            }
        }

        const totalGraded = grades.A + grades.B + grades.C + grades.D;
        setEl('analytics-grade-total-badge', `${totalGraded} graded / ${filtered.length} total`);
        setEl('wage-tab-total-badge', isVisible ? `Total: ${totalWage.toLocaleString(undefined,{maximumFractionDigits:0})} ฿` : '🔒 Locked');
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
            plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'center' } } },
            colors: [color],
            fill: { type: 'gradient', gradient: { gradientToColors: [gradientTo], shade: 'light', type:'horizontal', stops:[0,100] } },
            dataLabels: { enabled: true, formatter: val => (val/1000).toFixed(1)+'k ฿', style: { fontSize:'11px', colors:['#fff'] } },
            xaxis: { categories: data.map(e => sName(e.name_th)), labels: { formatter: val => (val/1000).toFixed(0)+'k' } },
            yaxis: { labels: { style: { fontSize: '11px' } } },
            tooltip: { y: { formatter: val => val.toLocaleString() + ' ฿' } },
            grid: { borderColor: '#f0f0f0', padding: { right: 10 } }
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
            chart: { type: 'scatter', height: 280, zoom: { enabled: true, type: 'xy' }, toolbar: { show: false }, animations: { speed: 400 } },
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

        // ── Chart 7: DL vs OT Stacked Bar (Labor Cost Breakdown) ──────────────
        this.charts.wageBreakdown = new ApexCharts(document.querySelector('#chart-wage-breakdown'), {
            series: [
                { name: 'DL (Base)', data: isVisible ? dlData : dlData.map(() => 0) },
                { name: 'OT',        data: isVisible ? otData : otData.map(() => 0) }
            ],
            chart: { type: 'bar', height: 380, stacked: true, toolbar: { show: false }, animations: { speed: 400 } },
            plotOptions: { bar: { horizontal: false, columnWidth: '65%', borderRadius: 2 } },
            stroke: { width: 1, colors: ['#fff'] },
            colors: ['#4e73df', '#f6c23e'],
            xaxis: { categories: shortLines, labels: { ...xCatLabels } },
            yaxis: { labels: { formatter: val => (val/1000).toFixed(0)+'k' } },
            dataLabels: { enabled: false },
            tooltip: {
                y: { formatter: (val) => isVisible ? val.toLocaleString() + ' ฿' : '🔒 Hidden' }
            },
            fill: { opacity: 1 },
            legend: { position: 'top' }
        });
        this.charts.wageBreakdown.render();

        // ── Chart 8: DL vs OT Stacked 100% Bar (Ratio) ────────────────────────
        this.charts.otRatio = new ApexCharts(document.querySelector('#chart-ot-ratio'), {
            series: [
                { name: 'DL (Base)', data: isVisible ? dlData : dlData.map(() => 0) },
                { name: 'OT',        data: isVisible ? otData : otData.map(() => 0) }
            ],
            chart: { type: 'bar', height: 380, stacked: true, stackType: '100%', toolbar: { show: false }, animations: { speed: 400 } },
            plotOptions: { bar: { horizontal: false, columnWidth: '70%', borderRadius: 2 } },
            stroke: { width: 1, colors: ['#fff'] },
            colors: ['#4e73df', '#f6c23e'],
            xaxis: { categories: shortLines, labels: { ...xCatLabels } },
            yaxis: { labels: { formatter: val => val + '%', style: { fontSize: '10px' } } },
            dataLabels: {
                enabled: true,
                formatter: (val) => val > 8 ? val.toFixed(0) + '%' : '',
                style: { fontSize: '11px', fontWeight: '700' } // removed colors:['#fff'] for smart contrast
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

        const modalEl = document.getElementById('analyticsModal');
        const isModalOpen = modalEl && modalEl.classList.contains('show');

        // Prompt for Passcode
        const { value: pin } = await Swal.fire({
            title: 'Verify Identity',
            target: isModalOpen ? modalEl : document.body,
            input: 'password',
            text: 'Please enter your login password to view sensitive wage data',
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

    updateGradeState: function(empId, col, grade, selectElement) {
        selectElement.className = `form-select form-select-sm d-inline-block grade-select ${this.getGradeClass(grade)}`;
        
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp[col] = grade;
            
            // Auto-recalculate Overall Grade if a component changes
            if (['grade_iph', 'grade_5s', 'grade_attendance', 'grade_learning'].includes(col)) {
                this.recalculateOverall(emp);
                
                // Update DOM for overall select
                const overallSelect = document.querySelector(`select[data-empid="${empId}"][data-col="grade_overall"]`);
                if (overallSelect) {
                    overallSelect.value = emp.grade_overall || '';
                    overallSelect.className = `form-select form-select-sm d-inline-block grade-select ${this.getGradeClass(emp.grade_overall)}`;
                }
            }
        }
    },
    
    recalculateOverall: function(emp) {
        // Use configured weights (percentages out of 100)
        let wIph = emp.weight_iph !== undefined ? parseInt(emp.weight_iph) : 25;
        let w5s = emp.weight_5s !== undefined ? parseInt(emp.weight_5s) : 25;
        let wAtt = emp.weight_attendance !== undefined ? parseInt(emp.weight_attendance) : 25;
        let wLrn = emp.weight_learning !== undefined ? parseInt(emp.weight_learning) : 25;

        // Make sure it adds up to 100 (fallback if data is corrupt)
        if (wIph + w5s + wAtt + wLrn === 0) {
            wIph = 25; w5s = 25; wAtt = 25; wLrn = 25;
        }

        const mapScore = (g) => {
            if (g === 'A') return 4;
            if (g === 'B') return 3;
            if (g === 'C') return 2;
            if (g === 'D') return 1;
            return 0;
        };

        const sIph = mapScore(emp.grade_iph);
        const s5s = mapScore(emp.grade_5s);
        const sAtt = mapScore(emp.grade_attendance);
        const sLrn = mapScore(emp.grade_learning);
        
        // If no grades are selected at all, keep overall as empty
        if (sIph === 0 && s5s === 0 && sAtt === 0 && sLrn === 0) {
            emp.grade_overall = null;
            return;
        }

        // Weighted sum (Max score is 4.0)
        // Note: If some grades are missing (0), they pull down the average.
        const totalScore = (sIph * wIph + s5s * w5s + sAtt * wAtt + sLrn * wLrn) / 100;
        
        if (totalScore >= 3.5) emp.grade_overall = 'A';
        else if (totalScore >= 2.5) emp.grade_overall = 'B';
        else if (totalScore >= 1.5) emp.grade_overall = 'C';
        else emp.grade_overall = 'D';
    },
    
    updateNotesState: function(empId, notes) {
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp.notes = notes;
        }
    },

    autoGrade: function() {
        Swal.fire({
            title: 'Auto Grade',
            text: "This will apply the System Recommended Grade for IPH and Attendance to all employees, and auto-calculate their Overall Grade. Overwrite existing grades?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, apply it!'
        }).then((result) => {
            if (result.isConfirmed) {
                let count = 0;
                this.state.employees.forEach(emp => {
                    let changed = false;
                    if (emp.system_grade_iph && ['A', 'B', 'C', 'D'].includes(emp.system_grade_iph)) {
                        emp.grade_iph = emp.system_grade_iph;
                        changed = true;
                    }
                    if (emp.system_grade_attendance && ['A', 'B', 'C', 'D'].includes(emp.system_grade_attendance)) {
                        emp.grade_attendance = emp.system_grade_attendance;
                        changed = true;
                    }
                    
                    if (changed) {
                        this.recalculateOverall(emp);
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
        
        // Filter out employees that have at least one grade assigned
        const gradesToSave = this.state.employees
            .filter(emp => emp.grade_overall || emp.grade_iph || emp.grade_5s || emp.grade_attendance || emp.grade_learning || emp.notes)
            .map(emp => ({
                emp_id: emp.emp_id,
                grade_iph: emp.grade_iph || null,
                grade_5s: emp.grade_5s || null,
                grade_attendance: emp.grade_attendance || null,
                grade_learning: emp.grade_learning || null,
                grade_overall: emp.grade_overall || null,
                notes: emp.notes || null
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
                        const crit = criteriaMap[line] || { threshold_a: '', threshold_b: '', threshold_c: '', att_max_late_a: '', att_max_late_b: '', att_max_late_c: '' };
                        html += `
                            <tr data-line="${line}">
                                <td class="fw-bold text-start ps-4" style="font-size: 0.9rem;">${line}</td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-a" value="${crit.threshold_a || ''}" placeholder="Ratio A"></td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-b" value="${crit.threshold_b || ''}" placeholder="Ratio B"></td>
                                <td><input type="number" step="0.1" class="form-control form-control-sm text-center crit-c" value="${crit.threshold_c || ''}" placeholder="Ratio C"></td>
                                <td><input type="number" step="1" class="form-control form-control-sm text-center att-a" value="${crit.att_max_late_a || ''}" placeholder="Lates A"></td>
                                <td><input type="number" step="1" class="form-control form-control-sm text-center att-b" value="${crit.att_max_late_b || ''}" placeholder="Lates B"></td>
                                <td><input type="number" step="1" class="form-control form-control-sm text-center att-c" value="${crit.att_max_late_c || ''}" placeholder="Lates C"></td>
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
            const att_a = row.querySelector('.att-a').value;
            const att_b = row.querySelector('.att-b').value;
            const att_c = row.querySelector('.att-c').value;

            // Only save if at least one field is filled, or if they just want to save 0
            if (a !== '' || b !== '' || c !== '' || att_a !== '' || att_b !== '' || att_c !== '') {
                criteriaArray.push({
                    line: line,
                    threshold_a: a !== '' ? parseFloat(a) : null,
                    threshold_b: b !== '' ? parseFloat(b) : null,
                    threshold_c: c !== '' ? parseFloat(c) : null,
                    att_max_late_a: att_a !== '' ? parseInt(att_a, 10) : null,
                    att_max_late_b: att_b !== '' ? parseInt(att_b, 10) : null,
                    att_max_late_c: att_c !== '' ? parseInt(att_c, 10) : null
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
    },

    openWeightageModal: function() {
        const hcGroup = document.getElementById('filterHcGroup').value;
        if (hcGroup === 'ALL') {
            Swal.fire('Warning', 'Please select a specific TEAM/GROUP to set weightages.', 'warning');
            return;
        }
        
        document.getElementById('weightageDepartment').value = hcGroup;
        
        // Find an employee in this group to read the current weights, since weights are joined per employee.
        // If no employees, we just default to 25/25/25/25
        let emp = this.state.employees.find(e => e.team_group === hcGroup);
        if (emp) {
            document.getElementById('weightIph').value = emp.weight_iph !== undefined ? emp.weight_iph : 25;
            document.getElementById('weight5s').value = emp.weight_5s !== undefined ? emp.weight_5s : 25;
            document.getElementById('weightAtt').value = emp.weight_attendance !== undefined ? emp.weight_attendance : 25;
            document.getElementById('weightLrn').value = emp.weight_learning !== undefined ? emp.weight_learning : 25;
        } else {
            document.getElementById('weightIph').value = 25;
            document.getElementById('weight5s').value = 25;
            document.getElementById('weightAtt').value = 25;
            document.getElementById('weightLrn').value = 25;
        }
        
        this.calculateWeightTotal();
        
        const myModal = new bootstrap.Modal(document.getElementById('weightageModal'));
        myModal.show();
    },

    calculateWeightTotal: function() {
        const wIph = parseInt(document.getElementById('weightIph').value) || 0;
        const w5s = parseInt(document.getElementById('weight5s').value) || 0;
        const wAtt = parseInt(document.getElementById('weightAtt').value) || 0;
        const wLrn = parseInt(document.getElementById('weightLrn').value) || 0;
        
        const total = wIph + w5s + wAtt + wLrn;
        const totalDisplay = document.getElementById('weightTotalDisplay');
        totalDisplay.textContent = total + '%';
        
        if (total === 100) {
            totalDisplay.className = 'mb-0 fw-bold text-success';
        } else {
            totalDisplay.className = 'mb-0 fw-bold text-danger';
        }
    },

    saveWeightage: async function() {
        const hcGroup = document.getElementById('weightageDepartment').value;
        const wIph = parseInt(document.getElementById('weightIph').value) || 0;
        const w5s = parseInt(document.getElementById('weight5s').value) || 0;
        const wAtt = parseInt(document.getElementById('weightAtt').value) || 0;
        const wLrn = parseInt(document.getElementById('weightLrn').value) || 0;
        
        if (wIph + w5s + wAtt + wLrn !== 100) {
            Swal.fire('Error', 'Total weightage must be exactly 100%', 'error');
            return;
        }
        
        try {
            Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const formData = new URLSearchParams();
            formData.append('action', 'save_weightage');
            formData.append('department_api', hcGroup);
            formData.append('weight_iph', wIph);
            formData.append('weight_5s', w5s);
            formData.append('weight_attendance', wAtt);
            formData.append('weight_learning', wLrn);

            const response = await fetch('api/api_employee_grading.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const result = await response.json();
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('weightageModal')).hide();
                Swal.fire('Saved', 'Team weightage updated successfully.', 'success');
                this.loadData(); // Reload data to apply new weights
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            Swal.fire('Error', e.message || 'An error occurred while saving.', 'error');
        }
    },

    exportData: async function(format) {
        try {
            // Require password verification before exporting
            const { value: pin } = await Swal.fire({
                title: 'Verify Identity',
                input: 'password',
                text: 'Please enter your login password to export data (contains sensitive wage info)',
                inputPlaceholder: 'Enter your password...',
                showCancelButton: true,
                confirmButtonText: 'Unlock & Export',
                inputValidator: (value) => {
                    if (!value) return 'You need to write something!'
                }
            });

            if (!pin) return;

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
            if (!result.success) {
                throw new Error(result.message || 'Incorrect password.');
            }
            
            Swal.close();

            switch(format) {
                case 'excel':
                    this.exportToExcel();
                    break;
                case 'csv':
                    this.exportToCSV();
                    break;
                case 'pdf':
                    await this.exportToPDF();
                    break;
            }
        } catch (e) {
            Swal.fire('Error', 'Export failed: ' + e.message, 'error');
            console.error(e);
        }
    },

    getExportFilename: function(ext) {
        const periodType = document.querySelector('input[name="periodTypeToggle"]:checked').value;
        let period;
        if (periodType === 'daily') {
            period = document.getElementById('filterPeriodDate').value;
        } else if (periodType === 'monthly') {
            period = document.getElementById('filterPeriodMonth').value;
        } else {
            const start = document.getElementById('filterPeriodDateStart').value;
            const end = document.getElementById('filterPeriodDateEnd').value;
            period = `${start}_to_${end}`;
        }
        const line = document.getElementById('filterLine').value;
        return `Grading_${line}_${period}.${ext}`;
    },

    createWorksheetFromData: function(employeesArray) {
        if (!employeesArray || employeesArray.length === 0) return null;

        const exportData = employeesArray.map(emp => {
            const dlWage = emp.dl_wage > 0 ? Number(parseFloat(emp.dl_wage).toFixed(2)) : 0;
            const otWage = emp.ot_wage > 0 ? Number(parseFloat(emp.ot_wage).toFixed(2)) : 0;
            const wage = emp.total_wage > 0 ? Number(parseFloat(emp.total_wage).toFixed(2)) : 0;
            const income = emp.income_per_head ? Number(parseFloat(emp.income_per_head).toFixed(2)) : 0;
            const ratio = emp.ratio ? Number(parseFloat(emp.ratio).toFixed(2)) : (wage > 0 ? Number((income / wage).toFixed(2)) : 0);
            
            return {
                'EMP ID': emp.emp_id,
                'Name': emp.name_th,
                'Position': emp.position || '-',
                'Line': emp.line || emp.department_api,
                'OT Hours': emp.ot_hours,
                'DL Wage': dlWage,
                'OT Wage': otWage,
                'Total Wage': wage,
                'Income': income,
                'Ratio': ratio,
                'Grade IPH': emp.grade_iph || '-',
                'Grade 5S': emp.grade_5s || '-',
                'Grade Attd': emp.grade_attendance || '-',
                'Grade Learn': emp.grade_learning || '-',
                'Grade Overall': emp.grade_overall || '-',
                'Note': emp.notes || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Apply right-align style to Grade columns and their headers (requires xlsx-js-style)
        const rightAlignHeaders = ['OT Hours', 'DL Wage', 'OT Wage', 'Total Wage', 'Income', 'Ratio', 'Grade IPH', 'Grade 5S', 'Grade Attd', 'Grade Learn', 'Grade Overall'];
        for (const cellAddress in ws) {
            if (cellAddress.startsWith('!')) continue;
            const val = ws[cellAddress].v;
            if (
                (typeof val === 'string' && ['A', 'B', 'C', 'D', '-'].includes(val)) ||
                rightAlignHeaders.includes(val)
            ) {
                ws[cellAddress].s = { alignment: { horizontal: "right" } };
            }
        }
        
        // Auto-fit columns
        const wscols = Object.keys(exportData[0]).map(key => {
            const maxLen = Math.max(
                key.length,
                ...exportData.map(row => row[key] ? row[key].toString().length : 0)
            );
            return { wch: maxLen + 5 }; // Increased padding
        });
        ws['!cols'] = wscols;

        return ws;
    },

    exportToExcel: async function() {
        if (!this.state.employees || this.state.employees.length === 0) {
            throw new Error("No data to export");
        }
        
        const wb = XLSX.utils.book_new();
        
        // 0. Get the currently filtered data for the Summary sheet
        const lineFilter = document.getElementById('filterLine').value;
        const filteredEmployees = this.state.employees.filter(emp => {
            if (lineFilter !== 'ALL') {
                const empLine = emp.line || emp.department_api;
                if (empLine !== lineFilter) return false;
            }
            return true;
        });

        // 1. Always create the Summary Sheet first
        const summaryWs = this.createWorksheetFromData(filteredEmployees);
        if (summaryWs) {
            XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
        }

        // 2. If Monthly or Range, fetch daily data and append sheets
        if (this.state.currentPeriodType === 'monthly' || this.state.currentPeriodType === 'range') {
            
            let startDate, endDate;
            if (this.state.currentPeriodType === 'monthly') {
                const [year, month] = this.state.currentPeriod.split('-');
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0); // Last day of month
            } else {
                const [startStr, endStr] = this.state.currentPeriod.split('_');
                startDate = new Date(startStr);
                endDate = new Date(endStr);
            }

            const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            
            Swal.fire({
                title: 'Fetching Daily Data...',
                text: `Downloading details for ${totalDays} days. Please wait.`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const fetchPromises = [];
                const lineFilter = document.getElementById('filterLine').value;
                const groupFilter = document.getElementById('filterHcGroup').value;

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
                    const dayNum = d.getDate();
                    const monthStr = d.toLocaleString('default', {month:'short'});
                    const sheetName = `${dayNum} ${monthStr}`;
                    
                    const url = new URL(window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'api/api_employee_grading.php');
                    url.searchParams.append('action', 'get_grading_data');
                    url.searchParams.append('period', dateStr);
                    if (lineFilter) url.searchParams.append('line', lineFilter);
                    if (groupFilter) url.searchParams.append('hcGroup', groupFilter);

                    fetchPromises.push(
                        fetch(url)
                            .then(res => res.json())
                            .then(data => ({ day: dayNum, dateStr, sheetName, data: data.success ? data.data : [] }))
                            .catch(err => ({ day: dayNum, dateStr, sheetName, data: [] }))
                    );
                }

                const results = await Promise.all(fetchPromises);
                results.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

                // 2.5 Build Trend Matrices
                const empMapIncome = new Map();
                const empMapRatio = new Map();
                
                filteredEmployees.forEach(emp => {
                    empMapIncome.set(emp.emp_id, {
                        'EMP ID': emp.emp_id,
                        'Name': emp.name_th,
                        'Position': emp.position || '-',
                        'Line': emp.line || emp.department_api
                    });
                    empMapRatio.set(emp.emp_id, {
                        'EMP ID': emp.emp_id,
                        'Name': emp.name_th,
                        'Position': emp.position || '-',
                        'Line': emp.line || emp.department_api
                    });
                });

                results.forEach(result => {
                    const colName = result.sheetName;
                    filteredEmployees.forEach(emp => {
                        empMapIncome.get(emp.emp_id)[colName] = null;
                        empMapRatio.get(emp.emp_id)[colName] = null;
                    });
                    
                    if (result.data) {
                        result.data.forEach(dailyEmp => {
                            if (empMapIncome.has(dailyEmp.emp_id)) {
                                const wage = dailyEmp.total_wage > 0 ? Number(parseFloat(dailyEmp.total_wage).toFixed(2)) : 0;
                                const income = dailyEmp.income_per_head ? Number(parseFloat(dailyEmp.income_per_head).toFixed(2)) : 0;
                                const ratio = dailyEmp.ratio ? Number(parseFloat(dailyEmp.ratio).toFixed(2)) : (wage > 0 ? Number((income / wage).toFixed(2)) : 0);
                                
                                empMapIncome.get(dailyEmp.emp_id)[colName] = income;
                                empMapRatio.get(dailyEmp.emp_id)[colName] = ratio;
                            }
                        });
                    }
                });

                const trendIncomeData = Array.from(empMapIncome.values());
                const trendRatioData = Array.from(empMapRatio.values());

                if (trendIncomeData.length > 0) {
                    const wsIncome = XLSX.utils.json_to_sheet(trendIncomeData);
                    const wsRatio = XLSX.utils.json_to_sheet(trendRatioData);
                    
                    const setMatrixStyles = (ws, isRatio) => {
                        for (const cellAddress in ws) {
                            if (cellAddress.startsWith('!')) continue;
                            const cell = ws[cellAddress];
                            
                            // Headers are strings. If it's a date header (not one of the first 4), right-align it
                            if (cellAddress.replace(/[A-Z]/g, '') === '1') {
                                if (!['EMP ID', 'Name', 'Position', 'Line'].includes(cell.v)) {
                                    cell.s = { alignment: { horizontal: "right" }, font: { bold: true } };
                                } else {
                                    cell.s = { font: { bold: true } };
                                }
                            } else if (typeof cell.v === 'number') {
                                cell.s = { alignment: { horizontal: "right" } };
                                if (isRatio) cell.z = '0.00';
                                else cell.z = '#,##0.00';
                            }
                        }
                        
                        const wscols = Object.keys(trendIncomeData[0]).map(key => {
                            if (key === 'EMP ID') return { wch: 15 };
                            if (key === 'Name') return { wch: 30 };
                            if (key === 'Position') return { wch: 25 };
                            if (key === 'Line') return { wch: 20 };
                            return { wch: 12 };
                        });
                        ws['!cols'] = wscols;
                    };

                    setMatrixStyles(wsIncome, false);
                    setMatrixStyles(wsRatio, true);

                    XLSX.utils.book_append_sheet(wb, wsIncome, "Trend - Income");
                    XLSX.utils.book_append_sheet(wb, wsRatio, "Trend - Ratio");
                }

                // 2.6 Append Daily Sheets

                for (const result of results) {
                    if (result.data && result.data.length > 0) {
                        const ws = this.createWorksheetFromData(result.data);
                        if (ws) {
                            XLSX.utils.book_append_sheet(wb, ws, result.sheetName);
                        }
                    }
                }
                
                Swal.close();
            } catch (error) {
                console.error('Export Error:', error);
                Swal.fire('Export Failed', 'An error occurred while fetching daily details.', 'error');
                return; // Stop export if failed
            }
        }
        
        XLSX.writeFile(wb, this.getExportFilename('xlsx'));
    },

    exportToCSV: function() {
        if (!this.state.employees || this.state.employees.length === 0) {
            throw new Error("No data to export");
        }
        
        const exportData = this.state.employees.map(emp => {
            const dlWage = emp.dl_wage > 0 ? Number(parseFloat(emp.dl_wage).toFixed(2)) : 0;
            const otWage = emp.ot_wage > 0 ? Number(parseFloat(emp.ot_wage).toFixed(2)) : 0;
            const wage = emp.total_wage > 0 ? Number(parseFloat(emp.total_wage).toFixed(2)) : 0;
            const income = emp.income_per_head ? Number(parseFloat(emp.income_per_head).toFixed(2)) : 0;
            const ratio = emp.ratio ? Number(parseFloat(emp.ratio).toFixed(2)) : (wage > 0 ? Number((income / wage).toFixed(2)) : 0);
            
            return {
                'EMP ID': emp.emp_id,
                'Name': emp.name_th,
                'Position': emp.position || '-',
                'Line': emp.line || emp.department_api,
                'OT Hours': emp.ot_hours,
                'DL Wage': dlWage,
                'OT Wage': otWage,
                'Total Wage': wage,
                'Income': income,
                'Ratio': ratio,
                'Grade IPH': emp.grade_iph || '-',
                'Grade 5S': emp.grade_5s || '-',
                'Grade Attd': emp.grade_attendance || '-',
                'Grade Learn': emp.grade_learning || '-',
                'Grade Overall': emp.grade_overall || '-',
                'Note': emp.notes || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        
        // Add BOM for Excel UTF-8 support
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", this.getExportFilename('csv'));
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportToPDF: async function() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF.API.autoTable === 'undefined') {
            throw new Error("PDF export libraries (jsPDF or AutoTable) are not loaded.");
        }

        if (!this.state.employees || this.state.employees.length === 0) {
            throw new Error("No data to export");
        }

        Swal.fire({ title: 'Generating PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        
        // Fetch and load Sarabun font to support Thai characters
        try {
            const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
            const fontRes = await fetch(fontUrl);
            if (fontRes.ok) {
                const buffer = await fontRes.arrayBuffer();
                let binary = '';
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const fontBase64 = window.btoa(binary);
                doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64);
                doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
                doc.setFont('Sarabun');
            }
        } catch (e) {
            console.warn("Could not load Thai font for PDF:", e);
        }
        
        const periodType = document.querySelector('input[name="periodTypeToggle"]:checked').value;
        const period = periodType === 'daily' 
            ? document.getElementById('filterPeriodDate').value 
            : document.getElementById('filterPeriodMonth').value;
        const line = document.getElementById('filterLine').value;

        doc.setFontSize(16);
        doc.text(`Income Per Head & Grading Report`, 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${period} | Line: ${line}`, 14, 22);

        const tableColumn = ["EMP ID", "Name", "Position", "Line", "OT Hrs", "DL Wage", "OT Wage", "Total Wage", "Income", "Ratio", "IPH", "5S", "Attd", "Learn", "Overall"];
        const tableRows = [];

        this.state.employees.forEach(emp => {
            const dlWage = emp.dl_wage > 0 ? Number(parseFloat(emp.dl_wage).toFixed(2)) : 0;
            const otWage = emp.ot_wage > 0 ? Number(parseFloat(emp.ot_wage).toFixed(2)) : 0;
            const wage = emp.total_wage > 0 ? Number(parseFloat(emp.total_wage).toFixed(2)) : 0;
            const income = emp.income_per_head ? Number(parseFloat(emp.income_per_head).toFixed(2)) : 0;
            const ratio = emp.ratio ? Number(parseFloat(emp.ratio).toFixed(2)) : (wage > 0 ? Number((income / wage).toFixed(2)) : 0);
            
            tableRows.push([
                emp.emp_id,
                emp.name_th,
                emp.position || '-',
                emp.line || emp.department_api,
                emp.ot_hours,
                dlWage.toFixed(2),
                otWage.toFixed(2),
                wage.toFixed(2),
                income.toFixed(2),
                ratio,
                emp.grade_iph || '-',
                emp.grade_5s || '-',
                emp.grade_attendance || '-',
                emp.grade_learning || '-',
                emp.grade_overall || '-'
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 8, font: "Sarabun" },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, font: "Sarabun" }
        });

        doc.save(this.getExportFilename('pdf'));
        Swal.close();
    },

    saveAnalysisAsImage: async function() {
        if (typeof html2canvas === 'undefined') {
            Swal.fire({ title: 'Loading Engine...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'script/html2canvas.min.js?v=1.4.1';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch (e) {
                Swal.fire('Error', 'Failed to load Image Capture Library.', 'error');
                return;
            }
            Swal.close();
        }

        const modalContent = document.querySelector('#analyticsModal .modal-content');
        if (!modalContent) return;

        Swal.fire({ title: 'Rendering Image...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const canvas = await html2canvas(modalContent, {
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const periodType = document.querySelector('input[name="periodTypeToggle"]:checked').value;
            const period = periodType === 'daily' 
                ? document.getElementById('filterPeriodDate').value 
                : document.getElementById('filterPeriodMonth').value;
            const image = canvas.toDataURL("image/jpeg", 0.9);
            const link = document.createElement('a');
            link.download = `Grading_Analytics_${period}.jpg`;
            link.href = image;
            link.click();
            Swal.close();
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to capture image', 'error');
        }
    },

    async viewEmployeeProfile(empId) {
        if (!empId) return;
        try {
            Swal.fire({
                title: 'Loading profile...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await fetch(`api/api_master_data.php?action=read_single_employee&emp_id=${empId}`);
            const json = await res.json();
            
            if (json.success && json.data) {
                const emp = json.data;
                const infoHtml = `
                    <div class="text-center mt-3" style="line-height: 1.4;">
                        <h6 class="fw-bold text-dark mb-1" style="font-size: 1.1rem;">${emp.name_th}</h6>
                        <div class="text-muted font-monospace" style="font-size: 0.85rem;"><i class="fas fa-id-badge me-1 opacity-50"></i>${emp.emp_id}</div>
                        <div class="d-flex justify-content-center flex-wrap gap-2 mt-3">
                            <span class="badge bg-light text-dark border"><i class="fas fa-user-tag me-1 text-muted"></i>${emp.position || '-'}</span>
                            <span class="badge bg-light text-dark border"><i class="fas fa-industry me-1 text-muted"></i>${emp.line || '-'}</span>
                            <span class="badge bg-light text-dark border"><i class="fas fa-users me-1 text-muted"></i>${emp.team_group || 'No Team'}</span>
                        </div>
                        <div class="mt-4 pt-3 border-top text-start px-2">
                            <div class="small mb-2 d-flex"><div style="width:25px;" class="text-center text-muted"><i class="fas fa-quote-left"></i></div><span class="text-secondary fw-semibold flex-grow-1">${emp.bio || '-'}</span></div>
                            <div class="small mb-2 d-flex"><div style="width:25px;" class="text-center text-muted"><i class="fas fa-phone-alt"></i></div><span class="text-secondary fw-semibold flex-grow-1">${emp.phone || '-'}</span></div>
                            <div class="small d-flex"><div style="width:25px;" class="text-center text-danger"><i class="fas fa-first-aid"></i></div><span class="text-danger fw-semibold flex-grow-1">${emp.emergency_contact_name ? emp.emergency_contact_name + ' (' + emp.emergency_contact_phone + ')' : (emp.emergency_contact_phone || '-')}</span></div>
                        </div>
                    </div>
                `;

                Swal.fire({
                    html: infoHtml,
                    imageUrl: emp.profile_picture || null,
                    icon: emp.profile_picture ? null : 'info',
                    imageAlt: 'Profile Picture',
                    width: '450px',
                    imageWidth: '100%',
                    padding: '1.5rem',
                    showConfirmButton: false,
                    showCloseButton: true,
                    customClass: { 
                        image: 'rounded shadow-sm m-0',
                        popup: 'rounded-4 border-0 shadow-lg'
                    },
                    didOpen: () => {
                        const container = Swal.getContainer();
                        if (container) container.style.zIndex = '1080';
                    }
                });
            } else {
                Swal.fire('Error', 'ไม่พบข้อมูลพนักงาน', 'error');
            }
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
