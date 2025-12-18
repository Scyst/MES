/* script/executiveDashboard.js (Final Version) */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. CONFIG & INITIALIZATION
    // ==========================================
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const exchangeRateInput = document.getElementById('exchangeRate');
    const liveClockEl = document.getElementById('live-clock');

    const formatDate = (date) => {
        const offset = date.getTimezoneOffset();
        date = new Date(date.getTime() - (offset * 60 * 1000));
        return date.toISOString().split('T')[0];
    };

    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);

    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(pastDate);
        endDateInput.value = formatDate(today);
    }

    let salePieChart = null;
    let costPieChart = null;
    let lineHourlyChart = null;
    let trendChart = null;
    let isAIEnabled = false;

    window.lastTrendData = [];

    // ==========================================
    // 2. EVENT LISTENERS
    // ==========================================
    [startDateInput, endDateInput, exchangeRateInput].forEach(input => {
        if (input) {
            input.addEventListener('change', () => loadDashboardData(false));
        }
    });

    // ==========================================
    // 3. CORE: Load Dashboard Data
    // ==========================================
    let isFirstLoad = true;

    // 2. แก้ไขฟังก์ชัน loadDashboardData
    window.loadDashboardData = async (isSilent = false) => {
        let start = startDateInput.value;
        let end = endDateInput.value;
        const rate = exchangeRateInput.value;

        // [LOGIC ใหม่] ถ้าเป็นการ Auto Refresh (isSilent=true) 
        // และไม่ใช่การโหลดครั้งแรก ให้โหลดเฉพาะข้อมูลของ "วันนี้"
        if (isSilent && !isFirstLoad) {
            const todayStr = new Date().toISOString().split('T')[0];
            start = todayStr;
            end = todayStr;
            console.log("Auto-refreshing only TODAY's data to save resources...");
        }

        if (!isSilent) showSpinner();

        try {
            const res = await fetch(`api/get_executive_dashboard.php?startDate=${start}&endDate=${end}&exchangeRate=${rate}`);
            const json = await res.json();

            if (json.success) {
                // ถ้าเป็นการโหลดเฉพาะวันนี้ (Silent) เราจะอัปเดตแค่ KPI บางตัว
                // แต่ถ้าเป็นการโหลดปกติ (Full Range) เราจะวาดกราฟใหม่ทั้งหมด
                if (isSilent && !isFirstLoad) {
                    updateTodayKPIsOnly(json.summary);
                } else {
                    renderKPIs(json.summary);
                    renderCharts(json.summary);
                    renderLineCards(json.lines);
                    if (json.trend) {
                        window.lastTrendData = json.trend;
                        renderTrendChart(json.trend);
                    }
                }
                
                isFirstLoad = false;
            }
        } catch (e) {
            console.error("Error loading dashboard data:", e);
        } finally {
            if (!isSilent) hideSpinner();
        }
    };

    function updateTodayKPIsOnly(todayData) {
        // ตรงนี้อาจจะเขียน Logic เพื่อเอาค่า Today ไปบวก/แทนที่ใน UI เดิม 
        // หรือสั่งโหลดเต็มรูปแบบเฉพาะถ้าวันที่ End เป็น "วันนี้" ก็ได้ครับ
    }

    // ==========================================
    // 4. AI & MATH LOGIC
    // ==========================================
    window.toggleAIForecast = function() {
        isAIEnabled = !isAIEnabled;
        const btn = document.getElementById('btnAIForecast');
        
        if(isAIEnabled) {
            btn.classList.replace('btn-outline-info', 'btn-info');
            btn.classList.add('text-white');
            if(typeof showToast === 'function') showToast('AI Prediction Activated 🤖', 'var(--bs-info)');
        } else {
            btn.classList.replace('btn-info', 'btn-outline-info');
            btn.classList.remove('text-white');
        }

        if (window.lastTrendData.length > 0) renderTrendChart(window.lastTrendData);
    };

    function calculateTrendLine(valuesY) {
        const validPoints = [];
        for (let i = 0; i < valuesY.length; i++) {
            const val = parseFloat(valuesY[i]) || 0;
            if (val > 0) validPoints.push({ x: i, y: val });
        }

        const n = validPoints.length;
        if (n < 2) return { slope: 0, intercept: 0 };

        const getSlope = (points) => {
            const m = points.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
            for (let p of points) {
                sumX += p.x; sumY += p.y;
                sumXY += (p.x * p.y); sumXX += (p.x * p.x);
            }
            const den = (m * sumXX - sumX * sumX);
            return den === 0 ? 0 : (m * sumXY - sumX * sumY) / den;
        };

        const slopeLong = getSlope(validPoints);
        const lookBack = 7;
        const shortSubset = (n > lookBack) ? validPoints.slice(n - lookBack) : validPoints;
        const slopeShort = getSlope(shortSubset);

        const finalSlope = (slopeLong * 0.6) + (slopeShort * 0.4);
        let sX = 0, sY = 0;
        validPoints.forEach(p => { sX += p.x; sY += p.y; });
        const intercept = (sY / n) - (finalSlope * (sX / n));

        return { slope: finalSlope, intercept: intercept };
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
        
        safeSetText('metric-units', data.total_units ? data.total_units.toLocaleString() : '0');
        safeSetText('metric-headcount', data.headcount);
        safeSetText('metric-lines', data.active_lines);

        const dlotIcon = document.getElementById('dlot-est-icon');
        if (endDateInput && dlotIcon) {
            const todayStr = new Date().toLocaleDateString('en-CA'); 
            dlotIcon.classList.toggle('d-none', endDateInput.value !== todayStr);
        }
    }

    function renderCharts(data) {
        const ctx1 = document.getElementById('saleCostPieChart');
        if (ctx1) {
            const newData = [Math.max(0, data.gp), data.cost];
            if (salePieChart) {
                salePieChart.data.datasets[0].data = newData;
                salePieChart.update();
            } else {
                salePieChart = new Chart(ctx1.getContext('2d'), {
                    type: 'doughnut',
                    data: { labels: ['Profit', 'Cost'], datasets: [{ data: newData, backgroundColor: ['#198754', '#dc3545'] }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
                });
            }
        }

        const ctx2 = document.getElementById('costBreakdownPieChart');
        if (ctx2) {
            const newData = [data.rm, data.dlot, data.oh, data.scrap];
            if (costPieChart) {
                costPieChart.data.datasets[0].data = newData;
                costPieChart.update();
            } else {
                costPieChart = new Chart(ctx2.getContext('2d'), {
                    type: 'pie',
                    data: { labels: ['RM', 'Labor', 'OH', 'Scrap'], datasets: [{ data: newData, backgroundColor: ['#0d6efd', '#6610f2', '#fd7e14', '#6c757d'] }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                });
            }
        }
    }

    function renderTrendChart(dailyData) {
        const placeholder = document.getElementById('trend-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const ctxEl = document.getElementById('financialTrendChart');
        if (!ctxEl) return;

        let salesData = dailyData.map(d => parseFloat(d.sale || 0));
        let costsData = dailyData.map(d => parseFloat(d.cost || 0));
        let labels = dailyData.map(d => {
            const dt = new Date(d.date);
            return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        });

        let forecastData = new Array(salesData.length).fill(null);

        if (isAIEnabled && salesData.length >= 2) {
            const lastIdx = salesData.length - 1;
            forecastData[lastIdx] = salesData[lastIdx]; 

            const { slope, intercept } = calculateTrendLine(salesData);
            const lastDate = new Date(dailyData[lastIdx].date);

            for (let i = 1; i <= 7; i++) {
                const nextDate = new Date(lastDate);
                nextDate.setDate(lastDate.getDate() + i);
                labels.push(nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' (Pred)');

                let pred = Math.max(0, (slope * (salesData.length + i - 1)) + intercept);
                salesData.push(null);
                costsData.push(null);
                forecastData.push(pred);
            }
        }

        const aiConfig = {
            label: 'AI Projection', data: forecastData, borderColor: '#0dcaf0', 
            backgroundColor: 'rgba(13, 202, 240, 0.05)', borderWidth: 2, borderDash: [3, 3],
            tension: 0.1, fill: true, pointRadius: (ctx) => (ctx.dataset.data[ctx.dataIndex] !== null && ctx.dataIndex === ctx.dataset.data.length - 1) ? 5 : 0,
            pointStyle: 'crossRot', order: 0
        };

        if (trendChart) {
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = salesData;
            trendChart.data.datasets[1].data = costsData;
            const aiIdx = trendChart.data.datasets.findIndex(ds => ds.label === 'AI Projection');
            if (aiIdx === -1) trendChart.data.datasets.push(aiConfig);
            else trendChart.data.datasets[aiIdx] = Object.assign(trendChart.data.datasets[aiIdx], aiConfig);
            trendChart.update();
        } else {
            trendChart = new Chart(ctxEl.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Revenue', data: salesData, borderColor: '#198754', backgroundColor: 'rgba(25, 135, 84, 0.1)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 2, order: 2 },
                        { label: 'Total Cost', data: costsData, borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.05)', borderWidth: 2, borderDash: [2, 2], tension: 0.3, fill: false, pointRadius: 0, order: 1 },
                        aiConfig
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                    scales: { 
                        y: { beginAtZero: true, ticks: { callback: (v) => v >= 1000000 ? '฿' + (v/1000000).toFixed(1) + 'M' : v } },
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } }
                    },
                    plugins: { 
                        legend: { position: 'top', align: 'end' },
                        tooltip: { callbacks: { 
                            label: (c) => (c.dataset.label || '') + ': ' + formatMoney(c.raw),
                            afterBody: (items) => {
                                const idx = items[0].dataIndex;
                                return (window.lastTrendData && idx < window.lastTrendData.length) ? `Net Profit: ${formatMoney(window.lastTrendData[idx].profit)}` : `(Projected Value)`;
                            }
                        }}
                    }
                }
            });
        }
    }

    function renderLineCards(lines) {
        const container = document.getElementById('line-cards-container');
        if (!container) return;
        container.innerHTML = '';

        const priorityLines = ['ASSEMBLY', 'PRESS', 'PAINT', 'SPOT', 'BEND', 'WELDING'];
        lines.sort((a, b) => {
            const nameA = a.name.toUpperCase(), nameB = b.name.toUpperCase();
            const isProdA = priorityLines.some(p => nameA.includes(p)), isProdB = priorityLines.some(p => nameB.includes(p));
            if (isProdA && !isProdB) return -1;
            if (!isProdA && isProdB) return 1;
            return b.gp - a.gp; 
        });

        lines.forEach(line => {
            const isProfit = line.gp >= 0;
            const statusBadge = line.units > 0 ? '<span class="badge badge-soft-success ms-2">Running</span>' : (line.headcount > 0 ? '<span class="badge badge-soft-warning ms-2">Setup</span>' : '<span class="badge badge-soft-secondary ms-2">Idle</span>');
            container.innerHTML += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="exec-card p-3 cursor-pointer" onclick="openLineDetailModal('${line.name}')">
                        <div class="line-card-header">
                            <div class="d-flex align-items-center"><span class="line-name text-truncate" style="max-width: 100px;">${line.name}</span>${statusBadge}</div>
                            <span class="badge ${isProfit ? 'badge-soft-success' : 'badge-soft-danger'}">GP ${line.gp_percent.toFixed(1)}%</span>
                        </div>
                        <div class="line-main-stats">
                            <div class="line-stat-item"><label>Sale</label><div class="value">${formatMoney(line.sale)}</div></div>
                            <div class="line-stat-item"><label>Cost</label><div class="value">${formatMoney(line.cost)}</div></div>
                            <div class="line-stat-item"><label>Profit</label><div class="value ${isProfit ? 'text-success' : 'text-danger'}">${formatMoney(line.gp)}</div></div>
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
        });
    }

    // ==========================================
    // 6. MODALS & SYSTEM
    // ==========================================
    window.openExplainerModal = function(metric) {
        const modal = new bootstrap.Modal(document.getElementById('explainerModal'));
        const contentMap = {
            'sale': { title: 'Total Sales Revenue', formula: 'SUM(FG_Qty × Price)', desc: 'ยอดขายจากยอดผลิตจริง คูณราคาขายรวม Ex. Rate', sources: ['PRODUCTION_FG', 'ITEMS'] },
            'cost': { title: 'Total Cost', formula: 'RM + Labor + OH + Scrap', desc: 'ต้นทุนรวมทั้งหมด', sources: ['Calculated'] },
            'gp': { title: 'Gross Profit', formula: 'Sale - Cost', desc: 'กำไรขั้นต้น', sources: ['Calculated'] },
            'rm': { title: 'Raw Material', formula: 'SUM(FG × BOM Cost)', desc: 'ต้นทุนวัตถุดิบทางทฤษฎี', sources: ['ITEMS'] },
            'labor': { title: 'Labor Cost (DL & OT)', formula: 'SUM(Hourly Rate × Work Hours)', desc: 'ค่าแรงจริงจากระบบสแกนนิ้ว', sources: ['MANUAL_COSTS'] },
            'oh': { title: 'Overhead', formula: 'SUM(FG × OH Rate)', desc: 'ค่าโสหุ้ยจัดสรร', sources: ['ITEMS'] },
            'scrap': { title: 'Scrap Loss', formula: 'SUM(Scrap Qty × Cost)', desc: 'มูลค่าความเสียหายจากงานเสีย', sources: ['PRODUCTION_SCRAP'] }
        };
        const c = contentMap[metric];
        if (c) {
            document.getElementById('explainerTitle').textContent = c.title;
            document.getElementById('explainerFormula').textContent = c.formula;
            document.getElementById('explainerDesc').textContent = c.desc;
            document.getElementById('explainerSources').innerHTML = c.sources.map(s => `<li class="list-group-item px-0 py-1 border-0 bg-transparent"><i class="fas fa-caret-right me-2 text-secondary"></i>${s}</li>`).join('');
            modal.show();
        }
    };

    window.openLineDetailModal = async function(lineName) {
        const date = endDateInput.value; 
        const modal = new bootstrap.Modal(document.getElementById('lineDetailModal'));
        document.getElementById('lineDetailTitle').textContent = lineName;
        showSpinner(); 
        try {
            const res = await fetch(`api/get_line_details.php?line=${encodeURIComponent(lineName)}&date=${date}`);
            const json = await res.json();
            if (json.success) {
                renderHourlyChart(json.hourly);
                const buildRows = (arr, fn, msg) => arr.length ? arr.map(fn).join('') : `<tr><td colspan="4" class="text-center text-muted py-3 small">${msg}</td></tr>`;
                document.getElementById('tblDowntimeBody').innerHTML = buildRows(json.downtime, d => `<tr><td><span class="badge bg-light text-dark border">${d.start_time}-${d.end_time}</span></td><td class="fw-bold">${d.machine}</td><td class="text-danger">${d.cause}</td><td class="text-end">${d.duration}</td></tr>`, 'No downtime');
                document.getElementById('tblScrapBody').innerHTML = buildRows(json.scrap, s => `<tr><td class="font-monospace small">${s.part_no}</td><td>${s.part_description}</td><td class="text-end fw-bold">${parseInt(s.qty).toLocaleString()}</td><td class="text-end">${formatMoney(s.lost_val)}</td></tr>`, 'No waste');
                document.getElementById('tblManpowerBody').innerHTML = buildRows(json.manpower, m => `<tr><td class="small">${m.emp_id}</td><td>${m.name_th}</td><td><span class="badge bg-light text-secondary">${m.position}</span></td><td class="text-end">${m.check_in}</td></tr>`, 'No scan data');
                modal.show();
            }
        } catch (e) { console.error(e); } finally { hideSpinner(); }
    };

    function renderHourlyChart(data) {
        const ctxEl = document.getElementById('lineHourlyChart');
        if (!ctxEl) return;
        if (lineHourlyChart) lineHourlyChart.destroy();
        const dataMap = {};
        data.forEach(d => { dataMap[parseInt(d.hr)] = parseFloat(d.qty); });
        const labels = [], values = [];
        for (let i = 0; i < 24; i++) {
            let h = (8 + i) % 24;
            labels.push(String(h).padStart(2, '0') + ':00');
            values.push(dataMap[h] || 0);
        }
        lineHourlyChart = new Chart(ctxEl.getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Output', data: values, backgroundColor: '#0d6efd' }] }, options: { responsive: true, maintainAspectRatio: false } });
    }

    function updateLiveClock() { if (liveClockEl) liveClockEl.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    setInterval(updateLiveClock, 1000);
    setInterval(() => loadDashboardData(true), 60000);

    // ==========================================
    // 🚀 UPDATED: Sync Labor Cost (Chunking Logic with Quick Sync Support)
    // ==========================================

    /**
     * ฟังก์ชันหลักสำหรับ Sync ข้อมูลแบบระบุวันที่ชัดเจน (เรียกใช้ร่วมกัน)
     */
    window.syncLaborCostExplicit = async function(start, end) {
        // 1. เตรียมรายการวันที่ต้องประมวลผล
        const dateList = [];
        let tempDate = new Date(start);
        const stopDate = new Date(end);
        while (tempDate <= stopDate) {
            dateList.push(tempDate.toISOString().split('T')[0]);
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 2. แสดง UI Loading Overlay (ต้องมี HTML syncLoader ในหน้า UI)
        const loader = document.getElementById('syncLoader');
        const statusText = document.getElementById('syncStatusText');
        const detailText = document.getElementById('syncProgressDetailText');
        
        if (loader) loader.style.display = 'block';

        let successCount = 0;
        let errorCount = 0;

        // 3. วนลูปเรียก API ทีละวัน (เรียกไฟล์ของ Manpower)
        for (let i = 0; i < dateList.length; i++) {
            const targetDate = dateList[i];
            
            if (statusText) statusText.innerText = `กำลังอัปเดตข้อมูล (${i + 1}/${dateList.length})`;
            if (detailText) detailText.innerText = `กำลังประมวลผลวันที่: ${targetDate}`;

            try {
                // เรียกไฟล์ข้ามโฟลเดอร์ไปหา Manpower API
                const response = await fetch(`../manpower/api/sync_from_api.php?startDate=${targetDate}&endDate=${targetDate}`);
                const result = await response.json();

                if (result.success) {
                    successCount++;
                } else {
                    console.error(`Error at ${targetDate}:`, result.message);
                    errorCount++;
                }
            } catch (err) {
                console.error(`Network Error at ${targetDate}:`, err);
                errorCount++;
            }
        }

        // 4. ปิดการโหลดและแจ้งผล
        if (loader) loader.style.display = 'none';

        if (errorCount === 0) {
            if (typeof showToast === 'function') showToast(`สำเร็จ! อัปเดตข้อมูล ${successCount} วันเรียบร้อยแล้ว`, 'var(--bs-success)');
            else alert(`สำเร็จ! อัปเดตข้อมูล ${successCount} วันเรียบร้อยแล้ว`);
        } else {
            alert(`การ Sync เสร็จสิ้น: สำเร็จ ${successCount} วัน, ล้มเหลว ${errorCount} วัน (กรุณาตรวจสอบ Console)`);
        }

        // 5. รีโหลดข้อมูล Dashboard เพื่อแสดงผลกำไร/ค่าแรงล่าสุด
        window.loadDashboardData(false);
    };

    /**
     * ปุ่ม Sync หลัก (ตามวันที่เลือกใน Input)
     */
    window.syncLaborCost = async function() {
        const startInput = document.getElementById('startDate');
        const endInput = document.getElementById('endDate');
        if (!startInput || !endInput) return;

        const start = startInput.value;
        const end = endInput.value;

        // คำนวณจำนวนวันเพื่อทำ Warning Alert
        const diffTime = Math.abs(new Date(end) - new Date(start));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        let warningMsg = `🔄 ยืนยันการประมวลผลข้อมูลค่าแรง ${diffDays} วัน?\n`;
        warningMsg += `--------------------------------------\n`;
        warningMsg += `📅 ช่วงวันที่: ${start} ถึง ${end}\n`;
        
        if (diffDays > 7) {
            warningMsg += `\n⚠️ คำเตือน: คุณเลือกช่วงวันที่ยาว (${diffDays} วัน)\n`;
            warningMsg += `คาดว่าจะใช้เวลาประมาณ ${Math.ceil(diffDays * 1.2)} - ${diffDays * 2} วินาที\n`;
            warningMsg += `กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะเสร็จสิ้น!`;
        }

        if (!confirm(warningMsg)) return;

        // เรียกใช้ฟังก์ชันหลัก
        await window.syncLaborCostExplicit(start, end);
    };

    /**
     * ปุ่ม Quick Sync (เฉพาะเมื่อวานและวันนี้)
     */
    window.quickSyncLabor = async function() {
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];
        
        if (!confirm(`⚡ Quick Sync: อัปเดตข้อมูลเฉพาะ "เมื่อวาน" และ "วันนี้" ใช่หรือไม่?\n(ประมวลผลเร็วพิเศษ)`)) return;

        await window.syncLaborCostExplicit(yesterday, today);
    };

    // ==========================================
    // 7. INITIAL LOAD (ส่วนที่คุณถามถึง - ห้ามลบ)
    // ==========================================
    const savedRate = localStorage.getItem('lastExchangeRate');
    if (savedRate && exchangeRateInput) {
        exchangeRateInput.value = savedRate;
    }
    loadDashboardData();
});