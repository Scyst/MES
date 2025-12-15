document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Dates (ตั้งค่าวันที่เป็นวันนี้)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    // 2. Chart Instances (ประกาศตัวแปรไว้ตรงนี้ เพื่อให้ทุกฟังก์ชันในนี้มองเห็น)
    let salePieChart = null;
    let costPieChart = null;
    let lineHourlyChart = null; // ✅ แก้ไข: ประกาศไว้ใน Scope หลัก

    // ==========================================
    // NEW: ฟังก์ชันดึงค่าเงินบาทล่าสุด (Real-time)
    // ==========================================
    async function fetchLiveExchangeRate() {
        const rateInput = document.getElementById('exchangeRate');
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();

            if (data && data.rates && data.rates.THB) {
                const currentRate = data.rates.THB.toFixed(2);
                rateInput.value = currentRate;
                console.log(`Updated Exchange Rate: ${currentRate} THB/USD`);
            }
        } catch (e) {
            console.warn("Could not fetch live rate, using default:", rateInput.value);
        }
        // โหลดข้อมูล Dashboard
        loadDashboardData();
    }

    // ==========================================
    // CORE: Load Dashboard Data
    // ==========================================
    window.loadDashboardData = async (isSilent = false) => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        const rate = document.getElementById('exchangeRate').value;

        if (!isSilent) showSpinner();

        try {
            const res = await fetch(`api/get_executive_dashboard.php?startDate=${start}&endDate=${end}&exchangeRate=${rate}`);
            const json = await res.json();

            if (json.success) {
                renderKPIs(json.summary);
                renderCharts(json.summary);
                renderLineCards(json.lines);

                // อัปเดตเวลา Live
                const now = new Date();
                const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                const badge = document.getElementById('last-update-time');
                if (badge) badge.innerHTML = `<i class="fas fa-circle me-1" style="font-size: 6px;"></i>Live (${timeStr})`;
            } else {
                console.error(json.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!isSilent) hideSpinner();
        }
    };

    // ==========================================
    // UTILS & RENDERERS
    // ==========================================
    function formatMoney(amount) {
        let num = parseFloat(amount);
        if (isNaN(num)) return '-';
        if (Math.abs(num) < 0.005) num = 0;

        if (Math.abs(num) >= 1000000) return '฿' + (num / 1000000).toFixed(2) + 'M';
        if (Math.abs(num) >= 1000) return '฿' + (num / 1000).toFixed(2) + 'K';

        return '฿' + num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function renderKPIs(data) {
        document.getElementById('kpi-sale').textContent = formatMoney(data.sale);
        document.getElementById('kpi-cost').textContent = formatMoney(data.cost);

        document.getElementById('kpi-gp').textContent = formatMoney(data.gp);
        const gpPercent = data.sale > 0 ? (data.gp / data.sale * 100).toFixed(1) : 0;
        const gpEl = document.getElementById('kpi-gp-percent');
        gpEl.textContent = gpPercent + '%';
        gpEl.className = gpPercent >= 0 ? 'text-success' : 'text-danger';

        document.getElementById('kpi-rm').textContent = formatMoney(data.rm);
        document.getElementById('kpi-dlot').textContent = formatMoney(data.dlot);
        document.getElementById('kpi-oh').textContent = formatMoney(data.oh);

        // Metrics Grid
        document.getElementById('metric-units').textContent = data.total_units.toLocaleString();
        document.getElementById('metric-headcount').textContent = data.headcount;
        document.getElementById('metric-lines').textContent = data.active_lines;

        const units = data.total_units || 1;
        document.getElementById('metric-sale-unit').textContent = (data.sale / units).toFixed(2);
        document.getElementById('metric-cost-unit').textContent = (data.cost / units).toFixed(2);
        document.getElementById('metric-gp-unit').textContent = (data.gp / units).toFixed(2);

        document.getElementById('metric-rm-unit').textContent = (data.rm / units).toFixed(2);
        document.getElementById('metric-dlot-unit').textContent = (data.dlot / units).toFixed(2);
        document.getElementById('metric-oh-unit').textContent = (data.oh / units).toFixed(2);

        document.getElementById('chart-gp-percent').textContent = gpPercent + '%';
    }

    function renderCharts(data) {
        // 1. Sale vs Cost Pie
        const ctx1 = document.getElementById('saleCostPieChart').getContext('2d');
        if (salePieChart) salePieChart.destroy();
        salePieChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Profit', 'Cost'],
                datasets: [{
                    data: [Math.max(0, data.gp), data.cost],
                    backgroundColor: ['#198754', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // 2. Cost Breakdown Pie
        const ctx2 = document.getElementById('costBreakdownPieChart').getContext('2d');
        if (costPieChart) costPieChart.destroy();
        costPieChart = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['RM', 'Labor', 'OH', 'Scrap'],
                datasets: [{
                    data: [data.rm, data.dlot, data.oh, data.scrap],
                    backgroundColor: ['#0d6efd', '#6610f2', '#fd7e14', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // --- Modal Explainer ---
    window.openExplainerModal = function(metric) {
        const modal = new bootstrap.Modal(document.getElementById('explainerModal'));
        const title = document.getElementById('explainerTitle');
        const formula = document.getElementById('explainerFormula');
        const sources = document.getElementById('explainerSources');

        let content = {
            title: '',
            formula: '',
            sources: []
        };

        if (metric === 'sale') {
            content.title = 'Total Sales Revenue (Actual)';
            content.formula = 'SUM ( FG_Qty × Price_USD × ExchangeRate )';
            content.sources = ['Table: STOCK_TRANSACTIONS (Type: FG)', 'Table: ITEMS (Price USD)', 'Input: Exchange Rate'];
        } else if (metric === 'cost') {
            content.title = 'Total Production Cost';
            content.formula = 'RM + Labor(Actual) + OH + Scrap';
            content.sources = ['RM/OH: BOM Standard Cost', 'Labor: Manual Entry (Actual)', 'Scrap: Waste Qty × Cost'];
        } else if (metric === 'gp') {
            content.title = 'Gross Profit';
            content.formula = 'Total Sales - Total Cost';
            content.sources = ['Calculated'];
        } else if (metric === 'rm') {
            content.title = 'Raw Material Cost';
            content.formula = 'SUM ( Actual_Qty × (Cost_RM + Pkg + Sub) )';
            content.sources = ['Table: ITEMS'];
        } else if (metric === 'dlot') {
            content.title = 'Direct Labor & Overtime';
            content.formula = 'SUM ( Actual Paid Amount )';
            content.sources = ['Table: MES_MANUAL_DAILY_COSTS', 'Source: Manpower System'];
        } else if (metric === 'oh') {
            content.title = 'Overhead Cost';
            content.formula = 'SUM ( Actual_Qty × OH_Allocation )';
            content.sources = ['Table: ITEMS'];
        }

        title.textContent = content.title;
        formula.textContent = content.formula;
        sources.innerHTML = content.sources.map(s => `<li class="list-group-item px-0 py-1 border-0"><i class="fas fa-caret-right me-2 text-secondary"></i>${s}</li>`).join('');

        modal.show();
    };

    // --- Render Line Cards ---
    function renderLineCards(lines) {
        const container = document.getElementById('line-cards-container');
        container.innerHTML = '';

        if (lines.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">No active lines found.</div>';
            return;
        }

        lines.forEach(line => {
            const isProfit = line.gp >= 0;
            const gpColorClass = isProfit ? 'text-success' : 'text-danger';
            const gpBadgeBg = isProfit ? 'bg-success' : 'bg-danger';
            const gpBorder = isProfit ? 'border-success' : 'border-danger';

            let statusBadge = '';
            if (line.units > 0) {
                statusBadge = '<span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 ms-2" style="font-size:0.65em">Producing</span>';
            } else if (line.headcount > 0) {
                statusBadge = '<span class="badge rounded-pill bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 ms-2" style="font-size:0.65em">Setup/Manning</span>';
            } else {
                statusBadge = '<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary ms-2" style="font-size:0.65em">Idle</span>';
            }

            // ✅ แก้ไข: เพิ่ม cursor-pointer และ onclick เพื่อเรียก openLineDetailModal
            const html = `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="exec-card p-3 h-100 position-relative cursor-pointer" onclick="openLineDetailModal('${line.name}')">
                        
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="d-flex align-items-center flex-wrap">
                                <h6 class="fw-bold mb-0 text-dark me-1 text-truncate" title="${line.name}" style="max-width: 120px;">
                                    ${line.name}
                                </h6>
                                ${statusBadge}
                            </div>
                            <span class="badge ${gpBadgeBg} bg-opacity-10 ${gpColorClass} border ${gpBorder} border-opacity-25 fw-bold">
                                GP ${line.gp_percent.toFixed(1)}%
                            </span>
                        </div>

                        <div class="mini-card-grid mb-2">
                            <div class="mini-stat">
                                <div class="mini-stat-label">Sale</div>
                                <div class="mini-stat-val text-dark">${formatMoney(line.sale)}</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-label">Cost</div>
                                <div class="mini-stat-val text-dark">${formatMoney(line.cost)}</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-label">GP</div>
                                <div class="mini-stat-val ${gpColorClass}">${formatMoney(line.gp)}</div>
                            </div>
                        </div>

                        <hr class="my-2 border-secondary opacity-10">

                        <div class="mini-card-grid mb-2">
                            <div class="mini-stat">
                                <div class="mini-stat-label">RM</div>
                                <div class="mini-stat-val text-secondary small fw-normal">${formatMoney(line.rm)}</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-label">Labor</div>
                                <div class="mini-stat-val text-secondary small fw-normal">${formatMoney(line.dlot)}</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-label">OH</div>
                                <div class="mini-stat-val text-secondary small fw-normal">${formatMoney(line.oh)}</div>
                            </div>
                        </div>

                        <div class="mini-card-grid bg-light rounded p-1">
                            <div class="mini-stat">
                                <div class="mini-stat-label text-warning">Scrap</div>
                                <div class="mini-stat-val text-dark small">${formatMoney(line.scrap)}</div>
                            </div>
                            <div class="mini-stat border-start border-end">
                                <div class="mini-stat-label text-primary fw-bold">Headcount</div>
                                <div class="mini-stat-val text-primary fw-bold small">
                                    <i class="fas fa-user me-1" style="font-size:0.8em"></i>${line.headcount}
                                </div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-label text-success">Units</div>
                                <div class="mini-stat-val text-dark small">${parseInt(line.units).toLocaleString()}</div>
                            </div>
                        </div>

                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    }

    // ==========================================
    // LINE DETAIL MODAL LOGIC (Moved inside DOMContentLoaded to access lineHourlyChart)
    // ==========================================
    window.openLineDetailModal = async function(lineName) {
        const date = document.getElementById('endDate').value;

        // 1. Setup Modal UI
        const modal = new bootstrap.Modal(document.getElementById('lineDetailModal'));
        document.getElementById('lineDetailTitle').textContent = lineName;
        document.getElementById('lineDetailSubtitle').textContent = `Details for ${date}`;

        // Reset Tabs
        const triggerFirstTab = new bootstrap.Tab(document.querySelector('#lineTabs button[data-bs-target="#tabTrend"]'));
        triggerFirstTab.show();

        // 2. Fetch Data
        showSpinner(); // หมุน Spinner
        try {
            const res = await fetch(`api/get_line_details.php?line=${encodeURIComponent(lineName)}&date=${date}`);
            const json = await res.json();

            if (json.success) {
                // A. Render Hourly Chart
                renderHourlyChart(json.hourly);

                // B. Render Downtime Table
                const tbodyStop = document.getElementById('tblDowntimeBody');
                tbodyStop.innerHTML = json.downtime.length ? json.downtime.map(d => `
                    <tr>
                        <td><span class="badge bg-light text-dark border">${d.start_time}-${d.end_time}</span></td>
                        <td class="fw-bold text-secondary">${d.machine}</td>
                        <td class="text-danger">${d.cause}</td>
                        <td class="text-end fw-bold">${d.duration}</td>
                    </tr>
                `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3">No downtime recorded</td></tr>';

                // C. Render Scrap Table
                const tbodyScrap = document.getElementById('tblScrapBody');
                tbodyScrap.innerHTML = json.scrap.length ? json.scrap.map(s => `
                    <tr>
                        <td class="font-monospace small">${s.part_no}</td>
                        <td class="small text-muted text-truncate" style="max-width:150px;">${s.part_description}</td>
                        <td class="text-end text-danger fw-bold">${parseInt(s.qty).toLocaleString()}</td>
                        <td class="text-end text-danger">${formatMoney(s.lost_val)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3">No waste recorded</td></tr>';

                // D. Render Manpower Table
                const tbodyMan = document.getElementById('tblManpowerBody');
                tbodyMan.innerHTML = json.manpower.length ? json.manpower.map(m => `
                    <tr>
                        <td class="font-monospace small">${m.emp_id}</td>
                        <td>${m.name_th}</td>
                        <td><span class="badge bg-secondary bg-opacity-10 text-secondary">${m.position}</span></td>
                        <td class="text-end font-monospace">${m.check_in}</td>
                    </tr>
                `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3">No scan data found</td></tr>';

                modal.show();
            } else {
                alert('Failed to load details: ' + json.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error connecting to server.');
        } finally {
            hideSpinner();
        }
    };

    function renderHourlyChart(data) {
        const ctx = document.getElementById('lineHourlyChart').getContext('2d');
        if (lineHourlyChart) lineHourlyChart.destroy();

        const labels = [];
        const values = [];
        const dataMap = {};
        
        // Map ข้อมูล: แปลง hr เป็น Integer เพื่อความชัวร์
        data.forEach(d => {
            dataMap[parseInt(d.hr)] = parseFloat(d.qty);
        });

        // [FIXED] วนลูป 24 ชั่วโมง เริ่มที่ 08:00 จบที่ 07:00 (ของอีกวัน)
        let startHour = 8; 
        
        for (let i = 0; i < 24; i++) {
            let currentHour = (startHour + i) % 24;
            
            // สร้าง Label แกน X
            let label = String(currentHour).padStart(2, '0') + ':00';
            
            // ดึงค่าจาก Map (ถ้าไม่มีให้เป็น 0)
            let val = dataMap[currentHour] || 0;
            
            labels.push(label);
            values.push(val);
        }

        lineHourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Actual Output',
                    data: values,
                    backgroundColor: '#0d6efd',
                    borderRadius: 4,
                    barPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { autoSkip: true, maxTicksLimit: 12 }
                    },
                    y: { 
                        beginAtZero: true,
                        grid: { borderDash: [2, 4] } 
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (context) => `Time: ${context[0].label}`,
                            label: (context) => `Output: ${context.raw.toLocaleString()} pcs`
                        }
                    }
                }
            }
        });
    }

    // --- Auto Refresh ---
    function startAutoRefresh() {
        setInterval(() => {
            const today = new Date().toISOString().split('T')[0];
            if (document.getElementById('endDate').value === today) {
                loadDashboardData(true);
            }
        }, 60000);
    }

    // Start
    fetchLiveExchangeRate().then(() => startAutoRefresh());
});