/* script/executiveDashboard.js (Final Version) */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. CONFIG & INITIALIZATION
    // ==========================================
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const exchangeRateInput = document.getElementById('exchangeRate');
    const liveClockEl = document.getElementById('live-clock');

    // Helper: Format Date
    const formatDate = (date) => {
        const offset = date.getTimezoneOffset();
        date = new Date(date.getTime() - (offset * 60 * 1000));
        return date.toISOString().split('T')[0];
    };

    // ตั้งค่า Default วันที่ (ย้อนหลัง 30 วัน)
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);

    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(pastDate);
        endDateInput.value = formatDate(today);
    }

    // Chart Instances
    let salePieChart = null;
    let costPieChart = null;
    let lineHourlyChart = null;
    let trendChart = null;
    let isAIEnabled = false; // สถานะ AI

    // Global Data Cache
    window.lastTrendData = [];

    // ==========================================
    // 2. EVENT LISTENERS
    // ==========================================
    [startDateInput, endDateInput, exchangeRateInput].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                loadDashboardData(false);
            });
        }
    });

    // ==========================================
    // 3. CORE: Load Dashboard Data
    // ==========================================
    window.loadDashboardData = async (isSilent = false) => {
        const start = startDateInput.value;
        const end = endDateInput.value;
        const rate = exchangeRateInput.value;

        if (!isSilent) showSpinner();

        try {
            const res = await fetch(`api/get_executive_dashboard.php?startDate=${start}&endDate=${end}&exchangeRate=${rate}`);
            const json = await res.json();

            if (json.success) {
                renderKPIs(json.summary);
                renderCharts(json.summary);
                renderLineCards(json.lines);
                
                if (json.trend) {
                    renderTrendChart(json.trend); // เรียกใช้ฟังก์ชันกราฟเส้น
                }
            } else {
                console.error(json.message);
                if (!isSilent && typeof showToast === 'function') {
                    showToast(json.message, 'var(--bs-danger)');
                }
            }
        } catch (e) {
            console.error("Error loading dashboard data:", e);
        } finally {
            if (!isSilent) hideSpinner();
        }
    };

    // ==========================================
    // 4. AI & MATH LOGIC
    // ==========================================
    
    // Toggle ปุ่ม AI
    window.toggleAIForecast = function() {
        isAIEnabled = !isAIEnabled;
        const btn = document.getElementById('btnAIForecast');
        
        if(isAIEnabled) {
            btn.classList.remove('btn-outline-info');
            btn.classList.add('btn-info', 'text-white');
            if(typeof showToast === 'function') showToast('AI Prediction Activated 🤖', 'var(--bs-info)');
        } else {
            btn.classList.remove('btn-info', 'text-white');
            btn.classList.add('btn-outline-info');
        }

        // โหลดกราฟใหม่โดยใช้ข้อมูลเดิมจาก Memory
        if (window.lastTrendData && window.lastTrendData.length > 0) {
            renderTrendChart(window.lastTrendData);
        }
    };

    // คำนวณ Linear Regression
    function calculateTrendLine(valuesY) {
        const n = valuesY.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (let i = 0; i < n; i++) {
            const y = parseFloat(valuesY[i]) || 0; 
            const x = i;
            sumX += x;
            sumY += y;
            sumXY += (x * y);
            sumXX += (x * x);
        }

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return { slope: 0, intercept: 0 };

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    // Helper Config สำหรับเส้น AI (ใช้ใน renderTrendChart)
    function getAIDatasetConfig(data) {
        return {
            label: 'AI Forecast',
            data: data,
            borderColor: '#0dcaf0', // สีฟ้า Neon
            backgroundColor: 'rgba(13, 202, 240, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],     // เส้นประ
            tension: 0.4,
            pointRadius: (ctx) => {
                const index = ctx.dataIndex;
                const val = ctx.dataset.data[index];
                // จุดขึ้นเฉพาะค่าที่มีข้อมูลและเป็นส่วน Forecast
                const actualLen = window.lastTrendData ? window.lastTrendData.length : 0;
                return (val !== null && index >= actualLen) ? 4 : 0;
            },
            pointStyle: 'rectRot',
            fill: false,
            order: 0
        };
    }

    // ==========================================
    // 5. RENDERERS
    // ==========================================

    function formatMoney(amount) {
        let num = parseFloat(amount);
        if (isNaN(num)) return '-';
        if (Math.abs(num) < 0.005) num = 0;
        if (Math.abs(num) >= 1000000000) return '฿' + (num / 1000000000).toFixed(2) + 'B';
        if (Math.abs(num) >= 1000000) return '฿' + (num / 1000000).toFixed(2) + 'M';
        return '฿' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderKPIs(data) {
        const safeSetText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        safeSetText('kpi-sale', formatMoney(data.sale));
        safeSetText('kpi-cost', formatMoney(data.cost));
        safeSetText('kpi-gp', formatMoney(data.gp));

        const gpPercent = data.sale > 0 ? (data.gp / data.sale * 100).toFixed(1) : 0;
        const gpEl = document.getElementById('kpi-gp-percent');
        if (gpEl) {
            gpEl.textContent = gpPercent + '%';
            gpEl.className = `badge mt-2 align-self-start ${gpPercent >= 0 ? 'bg-primary' : 'bg-danger'}`;
        }

        safeSetText('kpi-rm', formatMoney(data.rm));
        safeSetText('kpi-dlot', formatMoney(data.dlot));
        safeSetText('kpi-oh', formatMoney(data.oh));
        
        // Metrics
        safeSetText('metric-units', data.total_units ? data.total_units.toLocaleString() : '0');
        safeSetText('metric-headcount', data.headcount);
        safeSetText('metric-lines', data.active_lines);
    }

    function renderCharts(data) {
        // 1. Sale vs Cost Pie
        const ctx1 = document.getElementById('saleCostPieChart');
        if (ctx1) {
            const newData = [Math.max(0, data.gp), data.cost];
            if (salePieChart) {
                salePieChart.data.datasets[0].data = newData;
                salePieChart.update();
            } else {
                salePieChart = new Chart(ctx1.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Profit', 'Cost'],
                        datasets: [{ data: newData, backgroundColor: ['#198754', '#dc3545'] }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }, cutout: '70%'
                    }
                });
            }
        }

        // 2. Cost Breakdown Pie
        const ctx2 = document.getElementById('costBreakdownPieChart');
        if (ctx2) {
            const newData = [data.rm, data.dlot, data.oh, data.scrap];
            if (costPieChart) {
                costPieChart.data.datasets[0].data = newData;
                costPieChart.update();
            } else {
                costPieChart = new Chart(ctx2.getContext('2d'), {
                    type: 'pie',
                    data: {
                        labels: ['RM', 'Labor', 'OH', 'Scrap'],
                        datasets: [{ data: newData, backgroundColor: ['#0d6efd', '#6610f2', '#fd7e14', '#6c757d'] }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } }
                    }
                });
            }
        }
    }

    // ★★★ MAIN TREND CHART (With AI & Fixes) ★★★
    function renderTrendChart(dailyData) {
        window.lastTrendData = dailyData; // Cache Data

        const placeholder = document.getElementById('trend-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const ctxEl = document.getElementById('financialTrendChart');
        if (!ctxEl) return;
        const ctx = ctxEl.getContext('2d');

        // 1. Base Data
        let salesData = dailyData.map(d => parseFloat(d.sale || 0));
        let costsData = dailyData.map(d => parseFloat(d.cost || 0));
        
        let labels = dailyData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });

        // Prepare Forecast Data
        let forecastData = new Array(salesData.length).fill(null);

        // 2. AI Calculation
        if (isAIEnabled && salesData.length >= 2) {
            const lastIndex = salesData.length - 1;
            forecastData[lastIndex] = salesData[lastIndex]; // Anchor point

            // Calculate Trend
            const { slope, intercept } = calculateTrendLine(salesData);
            console.log(`AI Slope: ${slope}, Intercept: ${intercept}`);

            // Predict next 7 days
            const lastDateStr = dailyData[dailyData.length - 1].date;
            let lastDateObj = new Date(lastDateStr);

            for (let i = 1; i <= 7; i++) {
                lastDateObj.setDate(lastDateObj.getDate() + 1);
                labels.push(lastDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' (Pred)');

                let nextX = salesData.length + i - 1;
                let predictedVal = Math.max(0, (slope * nextX) + intercept);

                salesData.push(null);
                costsData.push(null);
                forecastData.push(predictedVal);
            }
        }

        // 3. Render
        if (trendChart) {
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = salesData;
            trendChart.data.datasets[1].data = costsData;

            const aiIndex = trendChart.data.datasets.findIndex(ds => ds.label === 'AI Forecast');
            if (aiIndex === -1) {
                trendChart.data.datasets.push(getAIDatasetConfig(forecastData));
            } else {
                trendChart.data.datasets[aiIndex].data = forecastData;
            }
            trendChart.update();
        } else {
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Revenue', data: salesData,
                            borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)',
                            borderWidth: 2, tension: 0.3, fill: true, pointRadius: 2, order: 2
                        },
                        {
                            label: 'Total Cost', data: costsData,
                            borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.05)',
                            borderWidth: 2, borderDash: [2, 2], tension: 0.3, fill: false, pointRadius: 0, order: 1
                        },
                        getAIDatasetConfig(forecastData)
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        y: {
                            beginAtZero: true, grid: { borderDash: [2, 2], color: '#f0f0f0' },
                            ticks: { callback: function(val) { return val >= 1000000 ? '฿' + (val/1000000).toFixed(1) + 'M' : val; } }
                        },
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } }
                    },
                    plugins: {
                        legend: { position: 'top', align: 'end' },
                        tooltip: {
                            callbacks: {
                                label: (c) => (c.dataset.label || '') + ': ' + formatMoney(c.raw),
                                afterBody: (items) => {
                                    const idx = items[0].dataIndex;
                                    // Safety Check
                                    if (window.lastTrendData && idx < window.lastTrendData.length) {
                                        return `Net Profit: ${formatMoney(window.lastTrendData[idx].profit)}`;
                                    }
                                    return `(AI Prediction)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function renderLineCards(lines) {
        const container = document.getElementById('line-cards-container');
        if (!container) return;
        container.innerHTML = '';

        if (lines.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">No active lines found.</div>';
            return;
        }

        const priorityLines = ['ASSEMBLY', 'PRESS', 'PAINT', 'SPOT', 'BEND', 'WELDING'];
        lines.sort((a, b) => {
            const nameA = a.name.toUpperCase(), nameB = b.name.toUpperCase();
            const isProdA = priorityLines.some(p => nameA.includes(p));
            const isProdB = priorityLines.some(p => nameB.includes(p));
            if (isProdA && !isProdB) return -1;
            if (!isProdA && isProdB) return 1;
            return b.gp - a.gp; 
        });

        lines.forEach(line => {
            const isProfit = line.gp >= 0;
            const gpColorClass = isProfit ? 'text-success' : 'text-danger';
            const statusBadge = line.units > 0 
                ? '<span class="badge badge-soft-success ms-2">Running</span>'
                : (line.headcount > 0 ? '<span class="badge badge-soft-warning ms-2">Setup</span>' : '<span class="badge badge-soft-secondary ms-2">Idle</span>');

            const html = `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="exec-card p-3 cursor-pointer" onclick="openLineDetailModal('${line.name}')">
                        <div class="line-card-header">
                            <div class="d-flex align-items-center">
                                <span class="line-name text-truncate" style="max-width: 100px;" title="${line.name}">${line.name}</span>
                                ${statusBadge}
                            </div>
                            <span class="badge ${isProfit ? 'badge-soft-success' : 'badge-soft-danger'}">GP ${line.gp_percent.toFixed(1)}%</span>
                        </div>
                        <div class="line-main-stats">
                            <div class="line-stat-item"><label>Sale</label><div class="value">${formatMoney(line.sale)}</div></div>
                            <div class="line-stat-item"><label>Cost</label><div class="value">${formatMoney(line.cost)}</div></div>
                            <div class="line-stat-item"><label>Profit</label><div class="value ${gpColorClass}">${formatMoney(line.gp)}</div></div>
                        </div>
                        <div class="line-details-grid">
                            <div class="detail-box"><span class="lbl">RM</span><span class="val">${formatMoney(line.rm)}</span></div>
                            <div class="detail-box"><span class="lbl">Labor</span><span class="val">${formatMoney(line.dlot)}</span></div>
                            <div class="detail-box"><span class="lbl">OH</span><span class="val">${formatMoney(line.oh)}</span></div>
                            <div class="detail-box" style="border-color:#fff3cd;"><span class="lbl text-warning">Scrap</span><span class="val text-dark">${formatMoney(line.scrap)}</span></div>
                            <div class="detail-box"><span class="lbl text-primary">HC</span><span class="val text-primary">${line.headcount}</span></div>
                            <div class="detail-box"><span class="lbl text-success">Units</span><span class="val text-success">${parseInt(line.units).toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>`;
            container.innerHTML += html;
        });
    }

    // ==========================================
    // 6. MODALS
    // ==========================================
    
    window.openExplainerModal = function(metric) {
        const modalEl = document.getElementById('explainerModal');
        const modal = new bootstrap.Modal(modalEl);
        
        const titleEl = document.getElementById('explainerTitle');
        const formulaEl = document.getElementById('explainerFormula');
        const descEl = document.getElementById('explainerDesc');
        const sourcesEl = document.getElementById('explainerSources');

        const contentMap = {
            'sale': { title: 'Total Sales Revenue', formula: 'SUM(FG_Qty × Price)', desc: 'ยอดขายคำนวณจากยอดผลิตจริง คูณด้วยราคาขาย (รวม Exchange Rate)', sources: ['Table: PRODUCTION_FG', 'Table: ITEMS'] },
            'cost': { title: 'Total Cost', formula: 'RM + Labor + OH + Scrap', desc: 'ต้นทุนการผลิตรวมทั้งหมด', sources: ['Calculated'] },
            'gp': { title: 'Gross Profit', formula: 'Sale - Cost', desc: 'กำไรขั้นต้นจากการผลิต', sources: ['Calculated'] },
            'rm': { title: 'Raw Material', formula: 'SUM(FG × BOM Cost)', desc: 'ต้นทุนวัตถุดิบทางทฤษฎี', sources: ['Table: ITEMS'] },
            'labor': { title: 'Labor Cost', formula: 'Actual DL + OT', desc: 'ค่าแรงจริงจากระบบ Manpower (Sync)', sources: ['Table: MANUAL_COSTS'] },
            'oh': { title: 'Overhead', formula: 'SUM(FG × OH Rate)', desc: 'ค่าโสหุ้ยการผลิต (จัดสรร)', sources: ['Table: ITEMS'] },
            'scrap': { title: 'Scrap Loss', formula: 'SUM(Scrap Qty × Cost)', desc: 'มูลค่าความเสียหายจากงานเสีย', sources: ['Table: PRODUCTION_SCRAP'] },
            'chart-sale-cost': { title: 'Sale vs Cost', formula: 'Chart', desc: 'เปรียบเทียบยอดขายและต้นทุน', sources: ['Summary'] },
            'chart-cost-breakdown': { title: 'Cost Structure', formula: 'Chart', desc: 'สัดส่วนโครงสร้างต้นทุน', sources: ['Summary'] }
        };

        const content = contentMap[metric];
        if (content) {
            titleEl.textContent = content.title;
            formulaEl.textContent = content.formula;
            descEl.textContent = content.desc;
            sourcesEl.innerHTML = content.sources.map(s => `<li class="list-group-item px-0 py-1 border-0 bg-transparent"><i class="fas fa-caret-right me-2 text-secondary"></i>${s}</li>`).join('');
            modal.show();
        }
    };

    window.openLineDetailModal = async function(lineName) {
        const date = endDateInput.value; 
        const modal = new bootstrap.Modal(document.getElementById('lineDetailModal'));
        document.getElementById('lineDetailTitle').textContent = lineName;
        document.getElementById('lineDetailSubtitle').textContent = `Details for ${date}`;
        
        const tabEl = document.querySelector('#lineTabs button[data-bs-target="#tabTrend"]');
        if(tabEl) bootstrap.Tab.getOrCreateInstance(tabEl).show();

        showSpinner(); 
        try {
            const res = await fetch(`api/get_line_details.php?line=${encodeURIComponent(lineName)}&date=${date}`);
            const json = await res.json();
            if (json.success) {
                renderHourlyChart(json.hourly);
                const buildRows = (arr, mapFn, emptyMsg) => arr.length ? arr.map(mapFn).join('') : `<tr><td colspan="4" class="text-center text-muted py-3 small">${emptyMsg}</td></tr>`;
                
                document.getElementById('tblDowntimeBody').innerHTML = buildRows(json.downtime, d => `<tr><td><span class="badge bg-light text-dark border">${d.start_time}-${d.end_time}</span></td><td class="fw-bold text-secondary">${d.machine}</td><td class="text-danger">${d.cause}</td><td class="text-end fw-bold">${d.duration}</td></tr>`, 'No downtime');
                document.getElementById('tblScrapBody').innerHTML = buildRows(json.scrap, s => `<tr><td class="font-monospace small">${s.part_no}</td><td class="small text-muted text-truncate" style="max-width:150px;">${s.part_description}</td><td class="text-end text-danger fw-bold">${parseInt(s.qty).toLocaleString()}</td><td class="text-end text-danger">${formatMoney(s.lost_val)}</td></tr>`, 'No waste');
                document.getElementById('tblManpowerBody').innerHTML = buildRows(json.manpower, m => `<tr><td class="font-monospace small">${m.emp_id}</td><td>${m.name_th}</td><td><span class="badge bg-secondary bg-opacity-10 text-secondary">${m.position}</span></td><td class="text-end font-monospace">${m.check_in}</td></tr>`, 'No scan data');
                
                modal.show();
            } else { alert(json.message); }
        } catch (e) { console.error(e); } finally { hideSpinner(); }
    };

    function renderHourlyChart(data) {
        const ctxEl = document.getElementById('lineHourlyChart');
        if (!ctxEl) return;
        if (lineHourlyChart) lineHourlyChart.destroy();
        
        const dataMap = {};
        data.forEach(d => { dataMap[parseInt(d.hr)] = parseFloat(d.qty); });
        
        const labels = [], values = [];
        let startHour = 8;
        for (let i = 0; i < 24; i++) {
            let currentHour = (startHour + i) % 24;
            labels.push(String(currentHour).padStart(2, '0') + ':00');
            values.push(dataMap[currentHour] || 0);
        }

        lineHourlyChart = new Chart(ctxEl.getContext('2d'), {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Output', data: values, backgroundColor: '#0d6efd', borderRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
        });
    }

    // ==========================================
    // 7. SYSTEM START
    // ==========================================
    
    function updateLiveClock() {
        if (liveClockEl) {
            const now = new Date();
            liveClockEl.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    setInterval(updateLiveClock, 1000);
    updateLiveClock(); 
    setInterval(() => { loadDashboardData(true); }, 60000);

    async function initSystem() {
        const savedRate = localStorage.getItem('lastExchangeRate');
        if (savedRate && exchangeRateInput) exchangeRateInput.value = savedRate;
        loadDashboardData();
    }
    
    // Admin Sync Action (Moved to end)
    window.syncLaborCost = async function() {
        const start = startDateInput.value;
        const end = endDateInput.value;
        if(!confirm(`Sync Labor Cost?\n${start} to ${end}`)) return;
        showSpinner();
        try {
            const res = await fetch('api/dlot_manual_manage.php', { method: 'POST', body: JSON.stringify({ action: 'sync_dlot_batch', startDate: start, endDate: end }) });
            const json = await res.json();
            if(json.success) { showToast('Synced!', 'var(--bs-success)'); loadDashboardData(); }
            else alert(json.message);
        } catch(e) { console.error(e); } finally { hideSpinner(); }
    };

    initSystem();
});