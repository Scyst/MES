/* script/executiveDashboard.js */

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
                renderCharts(json.summary);     // <-- แก้ไขฟังก์ชันนี้ด้านล่าง
                renderLineCards(json.lines);
                
                if (json.trend) {
                    renderTrendChart(json.trend); // <-- แก้ไขฟังก์ชันนี้ด้านล่าง
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
    // 4. TIMERS & INIT
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

        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.THB) {
                const currentRate = data.rates.THB.toFixed(2);
                if (exchangeRateInput) {
                    exchangeRateInput.value = currentRate;
                    localStorage.setItem('lastExchangeRate', currentRate);
                    console.log(`Updated Rate: ${currentRate}`);
                }
            }
        } catch (e) { console.warn("Using default/cached exchange rate"); }

        loadDashboardData();
    }

    // ==========================================
    // 5. RENDERERS (FIXED BLINKING)
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

        safeSetText('metric-units', data.total_units.toLocaleString());
        safeSetText('metric-headcount', data.headcount);
        safeSetText('metric-lines', data.active_lines);

        const units = data.total_units || 1;
        safeSetText('metric-sale-unit', (data.sale / units).toFixed(2));
        safeSetText('metric-cost-unit', (data.cost / units).toFixed(2));
        safeSetText('metric-gp-unit', (data.gp / units).toFixed(2));
        safeSetText('metric-rm-unit', (data.rm / units).toFixed(2));
        safeSetText('metric-dlot-unit', (data.dlot / units).toFixed(2));
        safeSetText('metric-oh-unit', (data.oh / units).toFixed(2));
    }

    // ★★★ [FIXED] อัปเดตข้อมูลกราฟแทนการสร้างใหม่ (ลดการกระพริบ) ★★★
    function renderCharts(data) {
        // 1. Sale vs Cost Pie
        const ctx1 = document.getElementById('saleCostPieChart');
        if (ctx1) {
            const newData = [Math.max(0, data.gp), data.cost];
            if (salePieChart) {
                // Update
                salePieChart.data.datasets[0].data = newData;
                salePieChart.update();
            } else {
                // Create
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
                // Update
                costPieChart.data.datasets[0].data = newData;
                costPieChart.update();
            } else {
                // Create
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

    // ★★★ [FIXED] อัปเดตกราฟ Trend แบบสมูท ★★★
    function renderTrendChart(dailyData) {
        const placeholder = document.getElementById('trend-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const ctxEl = document.getElementById('financialTrendChart');
        if (!ctxEl) return;
        const ctx = ctxEl.getContext('2d');

        const labels = dailyData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });
        const sales = dailyData.map(d => d.sale);
        const costs = dailyData.map(d => d.cost);
        // Profit สำหรับ Tooltip ไม่ต้องใส่ใน dataset หลักก็ได้
        
        if (trendChart) {
            // Update Existing Chart
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = sales;
            trendChart.data.datasets[1].data = costs;
            trendChart.update();
        } else {
            // Create New Chart
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Revenue', data: sales,
                            borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)',
                            borderWidth: 2, tension: 0.3, fill: true, pointRadius: 2, order: 2
                        },
                        {
                            label: 'Total Cost', data: costs,
                            borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.05)',
                            borderWidth: 2, borderDash: [5, 5], tension: 0.3, fill: false, pointRadius: 0, order: 1
                        }
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
                        legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } },
                        tooltip: {
                            callbacks: {
                                label: (c) => (c.dataset.label || '') + ': ' + formatMoney(c.raw),
                                afterBody: (items) => {
                                    const idx = items[0].dataIndex;
                                    const profit = dailyData[idx].profit;
                                    return `Net Profit: ${formatMoney(profit)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function renderLineCards(lines) {
        // Line cards เป็น HTML DOM ต้องสร้างใหม่เสมอ (ไม่มีวิธี update ที่คุ้มค่ากว่านี้)
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

    window.openLineDetailModal = async function(lineName) {
        const date = endDateInput.value; 
        const modal = new bootstrap.Modal(document.getElementById('lineDetailModal'));
        document.getElementById('lineDetailTitle').textContent = lineName;
        document.getElementById('lineDetailSubtitle').textContent = `Details for ${date}`;
        
        // Reset Tabs
        const tabEl = document.querySelector('#lineTabs button[data-bs-target="#tabTrend"]');
        if(tabEl) bootstrap.Tab.getOrCreateInstance(tabEl).show();

        showSpinner(); 
        try {
            const res = await fetch(`api/get_line_details.php?line=${encodeURIComponent(lineName)}&date=${date}`);
            const json = await res.json();
            if (json.success) {
                renderHourlyChart(json.hourly);
                // (Tables logic ... kept short for brevity, assumed same as previous)
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
        // Modal chart destroyed/created is fine because modal is hidden/shown
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

    window.openExplainerModal = function(metric) {
        const modalEl = document.getElementById('explainerModal');
        const modal = new bootstrap.Modal(modalEl);
        
        const titleEl = document.getElementById('explainerTitle');
        const formulaEl = document.getElementById('explainerFormula');
        const descEl = document.getElementById('explainerDesc');
        const sourcesEl = document.getElementById('explainerSources');

        // --- Dictionary เก็บคำอธิบาย ---
        const contentMap = {
            'sale': {
                title: 'Total Sales Revenue (ยอดขายรวม)',
                formula: 'SUM ( FG_Qty × Unit_Price )',
                desc: 'คำนวณจากยอดผลิต FG ที่บันทึกผ่านระบบ คูณด้วยราคาขายต่อหน่วย (ถ้ามีราคา USD จะแปลงเป็น THB ตาม Rate ที่ระบุ)',
                sources: ['Table: TRANSACTIONS (Type: PRODUCTION_FG)', 'Table: ITEMS (Price_USD, StandardPrice)', 'Input: Exchange Rate']
            },
            'cost': {
                title: 'Total Production Cost (ต้นทุนผลิตรวม)',
                formula: 'RM + Labor + Overhead + Scrap',
                desc: 'ต้นทุนการผลิตทั้งหมดที่เกิดขึ้นจริงและประมาณการ ประกอบด้วย ค่าวัตถุดิบ, ค่าแรง, ค่าโสหุ้ย และงานเสีย',
                sources: ['Calculated from Sub-components']
            },
            'gp': {
                title: 'Gross Profit (กำไรขั้นต้น)',
                formula: 'Total Sales - Total Production Cost',
                desc: 'กำไรขั้นต้นจากการผลิต (ยังไม่หัก SG&A หรือ Tax)',
                sources: ['Calculation']
            },
            'rm': {
                title: 'Raw Material Cost (ค่าวัตถุดิบ)',
                formula: 'SUM ( FG_Qty × BOM_Cost )',
                desc: 'ต้นทุนวัตถุดิบทางทฤษฎี (Standard Cost) ตามยอดที่ผลิตได้ ประกอบด้วย RM, Packaging, และ Sub-material',
                sources: ['Table: ITEMS (Cost_RM, Cost_PKG, Cost_SUB)']
            },
            'labor': {
                title: 'Actual Labor Cost (ค่าแรงทางตรง)',
                formula: 'Total Daily Wage + Overtime',
                desc: 'ค่าแรงจริงที่จ่ายให้พนักงานรายวันและรายเดือนในไลน์ผลิต (คำนวณจากระบบสแกนนิ้ว Manpower)',
                sources: ['Table: MANPOWER_DAILY_LOGS', 'Table: MANUAL_COSTS (Synced Data)']
            },
            'oh': {
                title: 'Overhead Cost (ค่าโสหุ้ยการผลิต)',
                formula: 'SUM ( FG_Qty × Std_OH_Rate )',
                desc: 'ค่าใช้จ่ายการผลิตทางอ้อม (Allocated) เช่น ค่าไฟ, ค่าเสื่อมเครื่องจักร, วัสดุสิ้นเปลือง',
                sources: ['Table: ITEMS (Cost_OH_Machine, Cost_OH_Utilities, etc.)']
            },
            'scrap': {
                title: 'Scrap Cost (มูลค่างานเสีย)',
                formula: 'SUM ( Scrap_Qty × Unit_Cost )',
                desc: 'มูลค่าความเสียหายจากงานเสียที่เกิดขึ้นในกระบวนการ',
                sources: ['Table: TRANSACTIONS (Type: PRODUCTION_SCRAP)', 'Table: ITEMS (Cost_Total)']
            },
            'chart-sale-cost': {
                title: 'Revenue vs Cost Chart',
                formula: 'Visual Comparison',
                desc: 'กราฟเปรียบเทียบสัดส่วนระหว่าง รายได้ (สีเขียว) และ ต้นทุน (สีแดง) เพื่อดู Margin ภาพรวม',
                sources: ['Dashboard Summary Data']
            },
            'chart-cost-breakdown': {
                title: 'Cost Structure Chart',
                formula: 'Proportion %',
                desc: 'กราฟวงกลมแสดงโครงสร้างต้นทุนว่าหนักไปที่ส่วนไหน (RM, Labor, OH, Scrap)',
                sources: ['Dashboard Summary Data']
            }
        };

        const content = contentMap[metric];

        if (content) {
            titleEl.innerHTML = `<i class="fas fa-info-circle me-2 text-primary"></i>${content.title}`;
            formulaEl.textContent = content.formula;
            descEl.textContent = content.desc;
            
            // Generate List
            sourcesEl.innerHTML = content.sources.map(s => 
                `<li class="list-group-item px-0 py-1 border-0 bg-transparent">
                    <i class="fas fa-caret-right me-2 text-secondary"></i>${s}
                 </li>`
            ).join('');

            modal.show();
        } else {
            console.warn('No explanation found for:', metric);
        }
    };

    // ==========================================
    // 7. RENDER TREND CHART (Sale vs Cost)
    // ==========================================
    function renderTrendChart(dailyData) {
        const placeholder = document.getElementById('trend-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const ctxEl = document.getElementById('financialTrendChart');
        if (!ctxEl) return;
        const ctx = ctxEl.getContext('2d');

        // เตรียมข้อมูลใหม่
        const labels = dailyData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });
        const sales = dailyData.map(d => d.sale);
        const costs = dailyData.map(d => d.cost);
        
        // เช็คว่ามีกราฟอยู่แล้วหรือยัง?
        if (trendChart) {
            // [CASE UPDATE] อัดข้อมูลใหม่ใส่เข้าไป แล้วสั่ง update()
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = sales;
            trendChart.data.datasets[1].data = costs;
            trendChart.update(); // อัปเดตแบบ Default animation
        } else {
            // [CASE CREATE] สร้างใหม่ครั้งแรก
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Revenue', data: sales,
                            borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)',
                            borderWidth: 2, tension: 0.3, fill: true, pointRadius: 2, order: 2
                        },
                        {
                            label: 'Total Cost', data: costs,
                            borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.05)',
                            borderWidth: 2, borderDash: [5, 5], tension: 0.3, fill: false, pointRadius: 0, order: 1
                        }
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
                        legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } },
                        tooltip: {
                            callbacks: {
                                label: (c) => (c.dataset.label || '') + ': ' + formatMoney(c.raw),
                                afterBody: (items) => {
                                    const idx = items[0].dataIndex;
                                    const profit = dailyData[idx].profit;
                                    return `Net Profit: ${formatMoney(profit)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // ==========================================
    // 8. ADMIN ACTION: SYNC LABOR COST
    // ==========================================
    window.syncLaborCost = async function() {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;

        if(!confirm(`Start Sync Actual Labor Cost from Manpower System?\n\nDate Range: ${start} to ${end}\n\n(This calculates actual DL/OT cost for Executive Report)`)) return;
        showSpinner(); 

        try {
            const res = await fetch('api/dlot_manual_manage.php', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_dlot_batch',
                    startDate: start,
                    endDate: end
                })
            });

            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("Server Error:", text);
                throw new Error("Invalid server response");
            }

            if (json.success) {
                if (typeof showToast === 'function') {
                    showToast('Sync Completed Successfully!', 'var(--bs-success)');
                } else {
                    alert('Sync Completed Successfully!');
                }
                loadDashboardData(); 
            } else {
                alert('Sync Failed: ' + (json.message || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
            alert('Error connecting to server. Check console for details.');
        } finally {
            hideSpinner();
        }
    };

    // ==========================================
    // 9. START SYSTEM
    // ==========================================
    initSystem();
});