// page/manpower/script/manpower_ui.js
"use strict";

const UI = {
    charts: {},

    // =========================================================================
    // 1. KPI CARDS
    // =========================================================================
    renderKPI(data) {
        let totalPlan = 0, totalActual = 0, totalLate = 0, totalAbsent = 0, totalLeave = 0;
        let totalCost = 0;

        data.forEach(row => {
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            const absent = parseInt(row.absent || 0);
            const leave = parseInt(row.leave || 0); 
            const cost = parseFloat(row.total_cost || 0);

            totalPlan += plan;
            totalActual += (present + late);
            totalLate += late;
            totalAbsent += absent;
            totalLeave += leave;
            totalCost += cost;
        });

        this.animateNumber('kpi-plan', totalPlan);
        this.animateNumber('kpi-actual', totalActual);
        this.animateNumber('kpi-cost', Math.round(totalCost));
        this.animateNumber('kpi-absent', totalAbsent);
        
        const elLate = document.getElementById('kpi-late');
        if(elLate) elLate.innerText = totalLate;
        
        const elLeave = document.getElementById('kpi-leave');
        if(elLeave) elLeave.innerText = totalLeave;

        const rate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : 0;
        const elRate = document.getElementById('kpi-rate');
        if(elRate) elRate.innerText = `${rate}% Rate`;
        
        // 1. Plan Card
        const cardPlan = document.getElementById('card-plan');
        if(cardPlan) cardPlan.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ALL');

        // 2. Actual Card
        const cardActual = document.getElementById('card-actual'); 
        if(cardActual) cardActual.onclick = () => Actions.openDetailModal('', '', 'ALL', 'PRESENT_AND_LATE');

        // 3. Absent Card (Parent)
        const cardAbsent = document.getElementById('card-absent');
        if(cardAbsent) cardAbsent.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ABSENT');

        // 4. Late Button (Child) - Stop Propagation
        const cardLate = document.getElementById('card-late');
        if(cardLate) {
            cardLate.onclick = (e) => {
                e.stopPropagation();
                Actions.openDetailModal('', '', 'ALL', 'LATE');
            };
        }

        // 5. Leave Button (Child) - Stop Propagation
        const cardLeave = document.getElementById('card-leave');
        if(cardLeave) {
            cardLeave.onclick = (e) => {
                e.stopPropagation(); 
                Actions.openDetailModal('', '', 'ALL', 'LEAVE');
            };
        }
    },

    animateNumber(elementId, endValue) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        // ใช้ toLocaleString ให้มีลูกน้ำคั่นหลักพัน
        obj.innerText = endValue.toLocaleString();
    },

    // =========================================================================
    // 2. CHARTS
    // =========================================================================
    renderCharts(data) {
        const labels = [];
        const dataPlan = [];
        const dataActual = [];
        const actualColors = []; // 🔥 เพิ่ม Array สำหรับเก็บสีของแท่ง Actual แต่ละแท่ง
        const grouped = {};
        let sumPresent = 0, sumLate = 0, sumAbsent = 0, sumLeave = 0;

        data.forEach(row => {
            const line = row.line_name || 'Other';
            if (!grouped[line]) grouped[line] = { plan: 0, actual: 0 };
            
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            
            grouped[line].plan += plan;
            grouped[line].actual += (present + late);

            sumPresent += present;
            sumLate += late;
            sumAbsent += parseInt(row.absent || 0);
            sumLeave += parseInt(row.leave || 0);
        });

        // 🔥 วนลูปเพื่อนำข้อมูลเข้า Array และคำนวณสี
        for (const [line, val] of Object.entries(grouped)) {
            labels.push(line);
            dataPlan.push(val.plan);
            dataActual.push(val.actual);

            // คำนวณ % Working Rate ของไลน์นั้นๆ
            const rate = val.plan > 0 ? (val.actual / val.plan) * 100 : 0;

            // กำหนดสีตามเงื่อนไขเดียวกับ Donut Chart
            if (rate >= 95) {
                actualColors.push('#1cc88a'); // เขียว (>= 95%)
            } else if (rate < 90) {
                actualColors.push('#e74a3b'); // แดง (< 90%)
            } else {
                actualColors.push('#f6c23e'); // เหลือง (90% - 94.99%)
            }
        }

        const ctxBar = document.getElementById('barChart').getContext('2d');
        if (this.charts.bar) this.charts.bar.destroy();

        const scrollContainer = document.querySelector('.chart-scroll-container');
        const chartWrapper = document.getElementById('barChartInnerWrapper');
        if(scrollContainer && chartWrapper) {
            const minWidthPerBar = 50; 
            const calculatedWidth = Math.max(scrollContainer.clientWidth, labels.length * minWidthPerBar);
            chartWrapper.style.width = `${calculatedWidth}px`;
        }

        this.charts.bar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Plan', 
                        data: dataPlan, 
                        backgroundColor: '#4e73df', 
                        borderRadius: 4, 
                        barPercentage: 0.6, 
                        categoryPercentage: 0.8 
                    },
                    { 
                        label: 'Actual', 
                        data: dataActual, 
                        backgroundColor: actualColors, // 🔥 ใช้ Array สีที่คำนวณไว้
                        borderRadius: 4, 
                        barPercentage: 0.6, 
                        categoryPercentage: 0.8 
                    }
                ]
            },
            options: {
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const lineName = labels[index]; 
                        if(lineName) Actions.openDetailModal(lineName, '', 'ALL', 'ALL'); 
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 12 } } },
                    tooltip: { bodyFont: { size: 13 }, titleFont: { size: 13 } },
                },
                scales: { 
                    y: { beginAtZero: true, border: { display: false }, grid: { color: '#f3f6f9' }, ticks: { font: { family: 'Prompt', size: 11 } } },
                    x: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 11, weight: 'bold' } } }
                }
            }
        });

        const newData = [sumPresent, sumLate, sumAbsent, sumLeave];
        
        if (this.charts.pie) {
            this.charts.pie.data.datasets[0].data = newData;
            this.charts.pie.update(); 
        } else {
            const ctxPie = document.getElementById('pieChart').getContext('2d');
            this.charts.pie = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Late', 'Absent', 'Leave'],
                    datasets: [{
                        data: newData,
                        backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'],
                        borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4
                    }]
                },
                options: {
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const statuses = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE']; 
                            Actions.openDetailModal('', '', 'ALL', statuses[index]);
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { 
                        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 11 } } }
                    },
                    layout: { padding: 0 }
                }
            });
        }
    },

    renderTrendChart(data) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        // 1. เตรียมข้อมูล
        const labels = data.map(r => r.display_date);
        const planData = data.map(r => parseInt(r.total_plan));
        const actualData = data.map(r => parseInt(r.total_actual));
        const absentData = data.map(r => parseInt(r.total_absent) + parseInt(r.total_leave));

        // 2. เช็คว่ามีกราฟเดิมอยู่ไหม?
        if (this.charts.trend) {
            const chart = this.charts.trend;
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = planData;   // Plan
            chart.data.datasets[1].data = actualData; // Actual
            chart.data.datasets[2].data = absentData; // Absent & Leave
            
            chart.update();
        } else {
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Plan',
                            data: planData,
                            borderColor: '#4e73df', // Blue
                            backgroundColor: 'rgba(78, 115, 223, 0.05)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Actual',
                            data: actualData,
                            borderColor: '#1cc88a', // Green
                            backgroundColor: 'rgba(28, 200, 138, 0.05)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Absent & Leave',
                            data: absentData,
                            borderColor: '#e74a3b', // Red
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5], // เส้นประ
                            tension: 0.3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 800
                    },
                    plugins: {
                        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 12 } } },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f3f6f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    // =========================================================================
    // 3. MAIN TABLE LOGIC (FIXED INTEGRITY & PAYMENT UI)
    // =========================================================================
    processGroupedData(rawData = [], viewMode) {
        const groups = {};
        const grandTotal = this._initStats(); 

        rawData.forEach(row => {
            let mainKey, subKeyName, itemKeyName;
            let metaLine = '', metaShift = '', metaType = '';
            let shiftId = (row.shift_name && row.shift_name.includes('Day')) ? '1' : '2';

            if (viewMode === 'PAYMENT') {
                const rType = (row.rate_type || 'DAILY').toUpperCase();
                mainKey = rType.includes('MONTHLY') ? 'Monthly Staff (รายเดือน)' : 'Daily Staff (รายวัน)';
                metaType = rType.includes('MONTHLY') ? 'Monthly' : 'Daily';
                subKeyName = row.emp_type || 'General';
                itemKeyName = `${row.line_name} (${row.shift_name})`;
                metaLine = row.line_name; 
                metaShift = shiftId;
            } 
            else if (viewMode === 'TYPE') {
                 mainKey = row.emp_type || 'Uncategorized'; subKeyName = row.line_name || '-'; itemKeyName = `${row.shift_name} (${row.team_group})`; metaLine = row.line_name; metaType = mainKey;
            } else if (viewMode === 'SHIFT') {
                 mainKey = row.shift_name || 'Unassigned'; subKeyName = row.line_name || '-'; itemKeyName = row.emp_type || 'General'; metaLine = row.line_name; metaShift = shiftId;
            } else { 
                 mainKey = row.line_name || 'Unassigned'; subKeyName = `${row.shift_name} ${row.team_group ? '('+row.team_group+')' : ''}`; itemKeyName = row.emp_type || 'General'; metaLine = mainKey; metaShift = shiftId;
            }

            const stats = {
                hc: parseInt(row.total_hc || 0), 
                plan: parseInt(row.plan || 0),
                present: parseInt(row.present || 0), 
                late: parseInt(row.late || 0),
                absent: parseInt(row.absent || 0), 
                leave: parseInt(row.leave || 0),
                dl: parseFloat(row.normal_cost || 0), 
                ot: parseFloat(row.ot_cost || 0), 
                cost: parseFloat(row.total_cost || row.dlot || 0),
                dl_count: parseInt(row.dl_count || 0),
                ot_count: parseInt(row.ot_headcount || row.ot_count || 0),
                ot_hours: parseFloat(row.ot_hours || 0)
            };
            
            stats.actual = stats.present + stats.late;
            stats.dlot = stats.dl + stats.ot;

            // 💡 [Smart Fallback] ถ้าหลังบ้านยังไม่ส่ง dl_count มา ให้เดาจากคนที่มาและลา (เพราะคนที่ลาบางประเภทก็ได้ค่าแรง)
            if (!row.dl_count && stats.dl > 0) {
                stats.dl_count = stats.present + stats.late + stats.leave;
            }

            if (!groups[mainKey]) groups[mainKey] = { name: mainKey, subs: {}, total: this._initStats() };
            this._accumulateStats(groups[mainKey].total, stats);

            if (!groups[mainKey].subs[subKeyName]) { 
                groups[mainKey].subs[subKeyName] = { 
                    name: subKeyName, items: {}, total: this._initStats(),
                    meta: { line: metaLine, shift: metaShift, type: metaType }
                };
            }
            this._accumulateStats(groups[mainKey].subs[subKeyName].total, stats);

            if (!groups[mainKey].subs[subKeyName].items[itemKeyName]) {
                groups[mainKey].subs[subKeyName].items[itemKeyName] = { 
                    name: itemKeyName, meta: { line: row.line_name, shift: shiftId, type: row.emp_type },
                    ...stats 
                };
            } else {
                this._accumulateStats(groups[mainKey].subs[subKeyName].items[itemKeyName], stats);
            }
            this._accumulateStats(grandTotal, stats);
        });

        const allItems = [grandTotal, ...Object.values(groups).map(g => g.total)];
        Object.values(groups).forEach(g => {
            allItems.push(...Object.values(g.subs).map(s => s.total));
            Object.values(g.subs).forEach(s => allItems.push(...Object.values(s.items)));
        });
        allItems.forEach(item => { if(item) item.diff = (item.actual || 0) - (item.plan || 0); });

        return { groups, grandTotal };
    },

    _initStats() { 
        // 🔥 [NEW] เพิ่ม dl_count, ot_count, ot_hours เข้าไปในโครงสร้างเริ่มต้น
        return { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, dl: 0, ot: 0, dlot: 0, cost: 0, dl_count: 0, ot_count: 0, ot_hours: 0 }; 
    },

    _accumulateStats(target, source) {
        if (!target || !source) return;
        target.hc += (Number(source.hc) || 0);
        target.plan += (Number(source.plan) || 0);
        target.present += (Number(source.present) || 0);
        target.late += (Number(source.late) || 0);
        target.absent += (Number(source.absent) || 0);
        target.leave += (Number(source.leave) || 0);
        target.actual += (Number(source.actual) || 0);
        target.dl += (Number(source.dl) || 0);
        target.ot += (Number(source.ot) || 0);
        target.dlot += (Number(source.dlot) || 0);
        target.cost += (Number(source.cost) || 0);
        // 🔥 [NEW] บวกทบยอด Detail
        target.dl_count += (Number(source.dl_count) || 0);
        target.ot_count += (Number(source.ot_count) || 0);
        target.ot_hours += (Number(source.ot_hours) || 0);
    },

    _createRowHtml(label, stats, options = {}) {
        const { isGrand, isParent, isChild, isGrandChild, viewMode, rawName, meta, toggleTarget, rowClass, isHidden } = options;
        const fmt = (n) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(n) || 0);
        // Helper สำหรับโชว์จำนวนคน/ชั่วโมง
        const fmtNum = (n) => Number(n) > 0 ? Number(n).toLocaleString() : '-';
        
        let rowStyle = isHidden ? 'display: none;' : ''; 
        let rowBg = isGrand ? 'table-dark fw-bold border-bottom-0' : (isParent ? 'table-secondary fw-bold border-top border-white cursor-pointer' : (isChild ? 'bg-light fw-bold cursor-pointer' : 'bg-white'));
        let nameHtml = label;
        let tLine = '', tShift = '', tType = 'ALL';
        let canClick = false;
        let toggleAttr = toggleTarget ? `onclick="UI.toggleRows('${toggleTarget}', this)"` : '';
        const chevron = `<i class="fas fa-chevron-right me-2 text-muted transition-icon" style="font-size: 0.8em;"></i>`;

        if (isGrand) {
            nameHtml = `<i class="fas fa-chart-pie me-2"></i>${label}`;
            canClick = true; 
        } else if (isParent) {
            let icon = (viewMode === 'PAYMENT') ? 'fa-coins text-warning' : (viewMode === 'TYPE' ? 'fa-user-tag' : (viewMode === 'SHIFT' ? 'fa-clock' : 'fa-layer-group'));
            nameHtml = `${chevron}<i class="fas ${icon} me-2 opacity-50"></i>${label}`;
            if (viewMode === 'LINE') { tLine = rawName; canClick = true; }
            else if (viewMode === 'TYPE') { tType = rawName; canClick = true; }
        } else if (isChild) {
            nameHtml = `<div style="padding: 0 0 0 25px; margin: 0; border-left: 3px solid #dee2e6; line-height: 1.2;">${chevron}${label}</div>`;
            if (meta) { tLine = meta.line || ''; tShift = meta.shift || ''; tType = meta.type || 'ALL'; canClick = true; }
        } else if (isGrandChild) {
            nameHtml = `<div style="padding: 0 0 0 55px; margin: 0; border-left: 3px solid #dee2e6; line-height: 1.2; font-size: 0.85rem;"><span class="text-secondary">• ${label}</span></div>`;
            if (meta) { tLine = meta.line; tShift = meta.shift; tType = meta.type; canClick = true; }
        }

        const clickAttr = (status) => canClick ? `onclick="event.stopPropagation(); Actions.openDetailModal('${tLine}', '${tShift}', '${tType}', '${status}')" title="Filter: ${status}" style="cursor: pointer;"` : '';
        const hoverClass = canClick ? 'cursor-pointer-cell' : '';

        let columnsHtml = '';
        if (viewMode === 'PAYMENT') {
            const cellClass = "text-end align-middle font-monospace";
            const payableCount = (stats.present || 0) + (stats.late || 0) + (stats.leave || 0);

            // 🔥 [NEW UI] แบ่ง 2 บรรทัด บนคือตัวเงิน(ตัวหนา) ล่างคือจำนวนคน/ชั่วโมง(ตัวเล็ก)
            columnsHtml = `
                <td class="text-center text-primary border-end border-light opacity-75 small align-middle">${stats.hc || '-'}</td>
                <td class="text-center text-success ${hoverClass} align-middle" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning ${hoverClass} align-middle" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass} align-middle" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info ${hoverClass} align-middle" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold bg-light border-start ${hoverClass} align-middle" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                
                <td class="text-center fw-bold text-primary bg-white border-start border-end align-middle" title="ยอดที่ต้องจ่ายเงิน (มา + ลา)">
                    ${payableCount > 0 ? payableCount : '-'}
                </td>
                
                <td class="${cellClass}">
                    <div class="text-primary fw-bold">฿ ${fmt(stats.dl)}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;"><i class="fas fa-user opacity-50 me-1"></i>${fmtNum(stats.dl_count)} คน</div>
                </td>
                <td class="${cellClass}">
                    <div class="text-danger fw-bold">฿ ${fmt(stats.ot)}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;">${fmtNum(stats.ot_count)} คน | ${fmtNum(stats.ot_hours)} ชม.</div>
                </td>
                <td class="${cellClass} pe-4 bg-light border-start">
                    <div class="text-dark fw-bold" style="font-size: 1.1em;">฿ ${fmt(stats.dlot)}</div>
                </td>
            `;
        } else {
            let diffClass = stats.diff < 0 ? 'text-danger fw-bold' : (stats.diff > 0 ? 'text-warning fw-bold text-dark' : 'text-success fw-bold');
            columnsHtml = `
                <td class="text-center text-primary border-end border-light opacity-75 small align-middle">${stats.hc || '-'}</td>
                <td class="text-center fw-bold align-middle" style="display: none;" ${clickAttr('ALL')}>${stats.plan}</td>
                <td class="text-center text-success ${hoverClass} align-middle" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning ${hoverClass} align-middle" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass} align-middle" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info ${hoverClass} align-middle" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end bg-light ${hoverClass} align-middle" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                <td class="text-center ${diffClass} align-middle">${stats.diff > 0 ? '+' : ''}${stats.diff}</td>
                <td class="text-end pe-4 text-secondary small align-middle font-monospace">${fmt(stats.cost)}</td>
            `;
        }

        return `
            <tr class="${rowBg} ${rowClass || ''}" style="${rowStyle}" ${toggleAttr}>
                <td class="ps-3 text-truncate align-middle" style="max-width: 300px;">
                    ${(isParent || isChild) ? nameHtml : (isGrand ? nameHtml : `<span ${clickAttr('ALL')} class="cursor-pointer text-decoration-underline">${nameHtml}</span>`)}
                </td>
                ${columnsHtml}
            </tr>`;
    },

    _calculateDiff(obj) { obj.diff = obj.actual - obj.plan; },

    getSkeletonRow(colCount = 10) {
        let html = '';
        for(let i=0; i<5; i++) {
            html += `
                <tr>
                    <td class="ps-4"><span class="skeleton-box" style="width: 150px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 40px;"></span></td>
                    <td><span class="skeleton-box" style="width: 80px;"></span></td>
                </tr>
            `;
        }
        return html;
    },
    
    renderTable(data, viewMode = 'LINE') {
        const tbody = document.getElementById('tableBody');
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <div class="d-flex flex-column align-items-center justify-content-center opacity-50">
                            <i class="fas fa-folder-open fa-3x mb-3 text-gray-300"></i>
                            <h6 class="fw-bold text-secondary">ไม่พบข้อมูล</h6>
                        </div>
                    </td>
                </tr>
            `;
            return; // จบการทำงานทันที ไม่ให้ไปต่อ
        }
        // ----------------------------------------

        const thead = document.querySelector('#manpowerTable thead tr');
        
        // 1. ปรับ Header ตาม View Mode
        if (viewMode === 'PAYMENT') {
            thead.innerHTML = `
                <th class="ps-3">Payment / Line</th>
                <th class="text-center">HC</th>
                <th class="text-center text-success">Present</th>
                <th class="text-center text-warning">Late</th>
                <th class="text-center text-danger">Absent</th>
                <th class="text-center text-info">Leave</th>
                <th class="text-center bg-light border-start">Actual (มา)</th>
                <th class="text-center text-primary bg-white border-start border-end">Payable (จ่าย)</th>
                
                <th class="text-end text-primary">DL (ปกติ)</th>
                <th class="text-end text-danger">OT (ล่วงเวลา)</th>
                <th class="text-end fw-bold border-end pe-3">Total (รวม)</th>
            `;
        } else {
            // Header เดิม
            thead.innerHTML = `
                <th class="ps-3">Group / Line</th>
                <th class="text-center">HC</th>
                <th class="text-center" style="display: none;">Plan</th>
                <th class="text-center text-success">Present</th>
                <th class="text-center text-warning">Late</th>
                <th class="text-center text-danger">Absent</th>
                <th class="text-center text-info">Leave</th>
                <th class="text-center border-start bg-light">Actual</th>
                <th class="text-center">Diff</th>
                <th class="text-end pe-3">Cost</th>
            `;
        }
        
        // เรียก Process Data (ตอนนี้ data จะไม่เป็น undefined แล้ว)
        const { groups, grandTotal } = this.processGroupedData(data, viewMode);
        
        tbody.innerHTML = ''; // เคลียร์ของเก่า
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true, viewMode }); // ส่ง viewMode ไปด้วย
        
        const sortedKeys = Object.keys(groups).sort();
        
        sortedKeys.forEach((key, gIndex) => {
            const group = groups[key];
            const groupId = `lvl1-${gIndex}`;
            const groupTarget = `target-${groupId}`;

            tbody.innerHTML += this._createRowHtml(group.name, group.total, { 
                isParent: true, 
                viewMode, 
                rawName: group.name,
                toggleTarget: groupTarget
            });
            
            const sortedSubs = Object.values(group.subs).sort((a, b) => a.name.localeCompare(b.name));
            sortedSubs.forEach((sub, sIndex) => {
                const subId = `lvl2-${gIndex}-${sIndex}`;
                const subTarget = `target-${subId}`;
                tbody.innerHTML += this._createRowHtml(sub.name, sub.total, { 
                    isChild: true, 
                    viewMode, // ส่ง viewMode
                    meta: sub.meta,
                    rowClass: groupTarget,
                    isHidden: true,
                    toggleTarget: subTarget
                });
                
                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                sortedItems.forEach(item => {
                    tbody.innerHTML += this._createRowHtml(item.name, item, { 
                        isGrandChild: true, 
                        viewMode, // ส่ง viewMode
                        meta: item.meta,
                        rowClass: subTarget,
                        isHidden: true 
                    });
                });
            });
        });
    },

    toggleRows(targetClass, btnElement) {
        const rows = document.getElementsByClassName(targetClass);
        const icon = btnElement.querySelector('.fa-chevron-right');
        
        if (rows.length === 0) return;

        const isCurrentlyHidden = rows[0].style.display === 'none';
        
        for (let row of rows) {
            if (isCurrentlyHidden) {
                row.style.display = 'table-row';
            } else {
                row.style.display = 'none';
                
                const nextTarget = row.getAttribute('onclick')?.match(/UI\.toggleRows\('([^']+)'/);
                if (nextTarget && nextTarget[1]) {
                    const subIcon = row.querySelector('.fa-chevron-right');
                    if(subIcon) subIcon.style.transform = 'rotate(0deg)';
                    
                    const grandChildren = document.getElementsByClassName(nextTarget[1]);
                    for(let gc of grandChildren) gc.style.display = 'none';
                }
            }
        }

        if (icon) {
            icon.style.transition = 'transform 0.2s';
            icon.style.transform = isCurrentlyHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
    },

    showToast(message, type) { alert(message); },
    showLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'block'; },
    hideLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'none'; },

    switchChartView(mode) {
        const btnDaily = document.getElementById('btn-chart-daily');
        const btnTrend = document.getElementById('btn-chart-trend');
        
        const viewDaily = document.getElementById('view-chart-daily');
        const viewTrend = document.getElementById('view-chart-trend');
        
        const footerDaily = document.getElementById('footer-daily');
        const footerTrend = document.getElementById('footer-trend');

        if (!btnDaily || !viewDaily) return;

        if (mode === 'daily') {
            btnDaily.classList.add('active');
            btnTrend.classList.remove('active');
            
            viewDaily.style.display = 'block';
            viewTrend.style.display = 'none';
            
            if(footerDaily) footerDaily.style.display = 'block';
            if(footerTrend) footerTrend.style.setProperty('display', 'none', 'important');

        } else {
            btnDaily.classList.remove('active');
            btnTrend.classList.add('active');
            
            viewDaily.style.display = 'none';
            viewTrend.style.display = 'block';
            
            if(footerDaily) footerDaily.style.display = 'none';
            if(footerTrend) footerTrend.style.setProperty('display', 'flex', 'important');
            
            if (this.charts && this.charts.trend) {
                this.charts.trend.resize();
            }
        }
    },

    // ✅ [MOVED] ย้ายมาไว้ตรงนี้ (ใน UI Object)
    renderReportChart(data) {
        const canvas = document.getElementById('reportChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (window.reportChartObj instanceof Chart) {
            window.reportChartObj.destroy();
        }

        window.reportChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth()+1}`;
                }),
                datasets: [
                    {
                        label: 'Actual (มา)',
                        data: data.map(d => d.Daily_Actual),
                        backgroundColor: '#1cc88a',
                        borderRadius: 4,
                        stack: 'Stack 0',
                        order: 1
                    },
                    {
                        label: 'Leave (ลา)',
                        data: data.map(d => d.Daily_Leave),
                        backgroundColor: '#36b9cc',
                        borderRadius: 4,
                        stack: 'Stack 0',
                        order: 2
                    },
                    {
                        label: 'Absent (ขาด)',
                        data: data.map(d => d.Daily_Absent),
                        backgroundColor: '#e74a3b',
                        borderRadius: 4,
                        stack: 'Stack 0',
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const dayData = data[dataIndex];
                                let totalStack = 0;
                                tooltipItems.forEach(item => totalStack += item.parsed.y);

                                return `----------------\n` +
                                       `Total Accounted: ${totalStack} คน\n` +
                                       `New Joiners: +${dayData.Daily_New || 0}\n` +
                                       `Resigned: -${dayData.Daily_Resigned || 0}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, grid: { borderDash: [2, 4] } }
                }
            }
        });
    },

    renderIntegratedFinancialTable(data, targetId) {
        const tbody = document.getElementById(targetId);
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">ไม่พบข้อมูลต้นทุนในช่วงวันที่เลือก</td></tr>`;
            return;
        }

        const fmt = (n) => Math.round(n || 0).toLocaleString();

        tbody.innerHTML = data.map(row => {
            const diff = row.cost_actual - row.cost_standard;
            const diffClass = diff > 0 ? 'text-danger fw-bold' : (diff < 0 ? 'text-success fw-bold' : 'text-muted');
            const pct = row.cost_standard > 0 ? ((diff / row.cost_standard) * 100).toFixed(1) + '%' : '0%';

            return `
                <tr>
                    <td class="fw-bold text-dark ps-3">${row.section_name}</td>
                    <td class="text-end text-muted small border-start">${fmt(row.cost_standard)}</td>
                    <td class="text-end bg-primary bg-opacity-10 fw-bold text-primary">${fmt(row.cost_actual)}</td>
                    <td class="text-end text-secondary font-monospace border-start">${fmt(row.actual_dl)}</td>
                    <td class="text-end text-secondary font-monospace">${fmt(row.actual_ot)}</td>
                    <td class="text-end ${diffClass} border-start">${diff > 0 ? '+' : ''}${fmt(diff)}</td>
                    <td class="text-center small text-muted">${pct}</td>
                </tr>`;
        }).join('');
    },

    

    renderIntegratedTrendChart(trendData) {
        const ctx = document.getElementById('ia_trendChart')?.getContext('2d');
        if (!ctx) return;

        // เปลี่ยนจาก this.charts เป็น UI.charts
        if (UI.charts.iaTrend) UI.charts.iaTrend.destroy();

        UI.charts.iaTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'Actual Present',
                        data: trendData.map(d => d.Act_Present),
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Absence/Leave',
                        data: trendData.map(d => d.Act_Absent + d.Act_Leave),
                        borderColor: '#e74a3b',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderIntegratedStackedChart(data) {
        const ctx = document.getElementById('ia_trendChart')?.getContext('2d');
        if (!ctx) return;

        if (UI.charts.iaTrend) UI.charts.iaTrend.destroy();

        UI.charts.iaTrend = new Chart(ctx, {
            type: 'bar', // เปลี่ยนเป็น Bar
            data: {
                labels: data.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'Present (มา)',
                        data: data.map(d => d.Act_Present),
                        backgroundColor: '#1cc88a', // เขียว
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Leave (ลา)',
                        data: data.map(d => d.Act_Leave),
                        backgroundColor: '#36b9cc', // ฟ้า
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Absent (ขาด)',
                        data: data.map(d => d.Act_Absent),
                        backgroundColor: '#e74a3b', // แดง
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                // Logic: ดึงข้อมูล New Joiner / Resigned ของวันนั้นมาโชว์
                                const index = tooltipItems[0].dataIndex;
                                const dayData = data[index];
                                let total = 0;
                                tooltipItems.forEach(t => total += t.parsed.y);
                                
                                let footerText = `Total: ${total} คน`;
                                if (dayData.Daily_New > 0) footerText += `\nNew: +${dayData.Daily_New}`;
                                if (dayData.Daily_Resigned > 0) footerText += `\nResign: -${dayData.Daily_Resigned}`;
                                return footerText;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    },
    
    renderIntegratedDistribution(distData) {
        const ctx = document.getElementById('ia_distributionChart')?.getContext('2d');
        if (!ctx) return;

        // เปลี่ยนจาก this.charts เป็น UI.charts
        if (UI.charts.iaDist) UI.charts.iaDist.destroy();

        UI.charts.iaDist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: distData.map(d => d.category),
                datasets: [{
                    data: distData.map(d => d.head_count),
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                },
                cutout: '70%'
            }
        });
    },

    renderIntegratedLineChart(data) {
        const ctx = document.getElementById('ia_trendLineChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaLine) this.charts.iaLine.destroy();

        this.charts.iaLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => this.formatDate(d.log_date)),
                datasets: [
                    {
                        label: 'Total HC (Plan)',
                        data: data.map(d => d.Daily_HC),
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Actual Present',
                        data: data.map(d => d.Act_Present),
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderIntegratedDonutChart(values) {
        const ctx = document.getElementById('ia_distributionChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaDonut) this.charts.iaDonut.destroy();

        this.charts.iaDonut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent', 'Leave'],
                datasets: [{
                    data: values,
                    backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } }
                }
            }
        });
    },

    renderIntegratedComboChart(data) {
        const ctx = document.getElementById('ia_comboChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaCombo) this.charts.iaCombo.destroy();

        // 🔥 1. เตรียม Array สำหรับเก็บสีและความหนาของตัวหนังสือแกน X
        const tickColors = [];
        const tickWeights = [];

        data.forEach(d => {
            const planHc = parseInt(d.Daily_HC || 0); 
            const present = parseInt(d.Act_Present || 0);
            const late = parseInt(d.Act_Late || 0);
            
            const totalActual = present + late; 
            // คำนวณ % การมาทำงานเทียบกับแผน
            const rate = planHc > 0 ? (totalActual / planHc) * 100 : 100;

            // ตรวจสอบเงื่อนไขการทำสีวันที่ (X-Axis Label)
            if (planHc === 0) {
                // วันที่ไม่มีแผน (เช่น วันอาทิตย์)
                tickColors.push('#858796'); 
                tickWeights.push('normal');
            } else if (rate < 90) {
                // ตกเกณฑ์หนัก (< 90%) -> แดง ตัวหนา
                tickColors.push('#e74a3b');  
                tickWeights.push('bold');
            } else if (rate < 95) {
                // ต่ำกว่าเป้าหมาย (90% - 94.99%) -> เหลืองอมส้ม ตัวหนา (ใช้อ่านง่ายกว่าเหลืองสด)
                tickColors.push('#f39c12');  
                tickWeights.push('bold');
            } else {
                // ผ่านเกณฑ์ (>= 95%) -> สีเทาปกติ
                tickColors.push('#858796');  
                tickWeights.push('normal');
            }
        });

        this.charts.iaCombo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => this.formatDate(d.log_date)),
                datasets: [
                    {
                        type: 'line',
                        label: 'Capacity (HC)',
                        data: data.map(d => d.Daily_HC),
                        borderColor: '#858796',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0, // ซ่อนจุดบนเส้น
                        pointHoverRadius: 0, 
                        order: 0
                    },
                    // 🌈 2. สีแท่งกราฟกลับมาใช้สีมาตรฐานให้ตรงกับ Donut Chart
                    { label: 'Present', data: data.map(d => d.Act_Present), backgroundColor: '#1cc88a', stack: 'combined', order: 1 },
                    { label: 'Late', data: data.map(d => d.Act_Late), backgroundColor: '#f6c23e', stack: 'combined', order: 1 },
                    { label: 'Leave', data: data.map(d => d.Act_Leave), backgroundColor: '#36b9cc', stack: 'combined', order: 1 },
                    { label: 'Absent', data: data.map(d => d.Act_Absent), backgroundColor: '#e74a3b', stack: 'combined', order: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            footer: (items) => {
                                const d = data[items[0].dataIndex];
                                let txt = ``;
                                if(d.Daily_New > 0) txt += `New: +${d.Daily_New} `;
                                if(d.Daily_Resigned > 0) txt += `Resign: -${d.Daily_Resigned}`;
                                return txt;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        stacked: true, 
                        grid: { display: false },
                        ticks: {
                            // 🔥 3. ดึงค่าสีจากเงื่อนไขที่เราคำนวณไว้มาใส่ให้แกน X
                            color: tickColors,
                            font: function(context) {
                                return {
                                    family: 'Prompt',
                                    weight: tickWeights[context.index] || 'normal'
                                };
                            }
                        }
                    },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    },

    // --- 3.2 Donut 1: Workforce Structure (โครงสร้างพนักงาน) ---
    renderIntegratedStructureDonut(data) {
        const ctx = document.getElementById('ia_structureDonut')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaStructDonut) this.charts.iaStructDonut.destroy();

        if (!data || data.length === 0) return;

        // คำนวณยอดรวม
        const totalHeadCount = data.reduce((acc, cur) => acc + parseInt(cur.head_count || 0), 0);

        this.charts.iaStructDonut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.category),
                datasets: [{
                    data: data.map(d => d.head_count),
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#858796'], 
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                layout: { padding: 10 },
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { boxWidth: 10, usePointStyle: true, font: { size: 11, family: 'Prompt' }, padding: 15 } 
                    },
                    // แสดงตัวเลขจำนวนคนบนกราฟ
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 11, family: 'Prompt' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(1);
                            // แสดงเฉพาะถ้าพื้นที่พอ (> 5%)
                            return (percentage > 5) ? value : null;
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerTextStruct',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();
                    
                    var shiftX = -65; // ขยับซ้ายนิดนึง
                    var shiftY = 0; // ขยับลงล่างนิดนึง

                    // 1. ยอดรวม (ตัวใหญ่)
                    ctx.font = "bold 26px 'Prompt', sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#4e73df"; 
                    var text = totalHeadCount.toLocaleString();
                    var textX = Math.round((width - ctx.measureText(text).width) / 2) + shiftX;
                    var textY = (height / 2) + 10 + shiftY;
                    ctx.fillText(text, textX, textY);

                    // 2. ป้าย Total
                    ctx.font = "normal 12px 'Prompt', sans-serif";
                    ctx.fillStyle = "#858796";
                    var label = "Total HC";
                    var labelX = Math.round((width - ctx.measureText(label).width) / 2) + shiftX;
                    var labelY = (height / 2) - 15 + shiftY;
                    ctx.fillText(label, labelX, labelY);
                    
                    ctx.save();
                }
            }]
        });
    },

    // --- 3.4 Donut 2: Attendance Ratio (สัดส่วนการมาทำงาน) ---
    renderIntegratedAttendanceDonut(values) {
        const ctx = document.getElementById('ia_attendanceDonut')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaAttDonut) this.charts.iaAttDonut.destroy();

        // ตรวจสอบข้อมูลก่อนวาด
        const totalVal = values.reduce((a, b) => a + (parseInt(b)||0), 0);
        if (totalVal === 0) return; // ถ้าไม่มีข้อมูลเลย ไม่ต้องวาด (กัน Error หาร 0)

        this.charts.iaAttDonut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent', 'Leave'],
                datasets: [{
                    data: values,
                    backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'], 
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                layout: { padding: 10 },
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { boxWidth: 10, usePointStyle: true, font: { size: 11, family: 'Prompt' }, padding: 15 } 
                    },
                    // แสดง % บนกราฟ
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 11, family: 'Prompt' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(1);
                            return (percentage > 4) ? Math.round(percentage) + '%' : null;
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerTextAtt',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();

                    // คำนวณ % Working Rate สดๆ จากกราฟ
                    var d = chart.config.data.datasets[0].data;
                    var present = d[0] || 0;
                    var late    = d[1] || 0;
                    var total   = d.reduce((a, b) => a + b, 0);
                    var rate    = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;

                    var shiftX = -40;
                    var shiftY = 0;

                    // 1. ตัวเลข %
                    ctx.font = "bold 26px 'Prompt', sans-serif";
                    ctx.textBaseline = "middle";
                    // เปลี่ยนสีตามเกณฑ์
                    ctx.fillStyle = rate >= 95 ? "#1cc88a" : (rate >= 90 ? "#f6c23e" : "#e74a3b");
                    
                    var text = rate + "%";
                    var textX = Math.round((width - ctx.measureText(text).width) / 2) + shiftX;
                    var textY = (height / 2) + 10 + shiftY;
                    ctx.fillText(text, textX, textY);

                    // 2. ป้าย Working Rate
                    ctx.font = "normal 12px 'Prompt', sans-serif";
                    ctx.fillStyle = "#858796";
                    var label = "Working Rate";
                    var labelX = Math.round((width - ctx.measureText(label).width) / 2) + shiftX;
                    var labelY = (height / 2) - 15 + shiftY;
                    ctx.fillText(label, labelX, labelY);

                    ctx.save();
                }
            }]
        });
    },

    formatCurrency(val) {
        return new Intl.NumberFormat('th-TH', { 
            style: 'decimal', 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(val || 0);
    },

    formatDate(dateStr) {
        if(!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    },

    populateAnalysisDropdown: async function() {
        const selectEl = document.getElementById('superLineSelect');
        if (!selectEl) return;

        try {
            const response = await fetch('api/api_master_data.php?action=read_structure');
            const json = await response.json();

            // ✅ FIX 1: แก้จาก json.data.lines เป็น json.lines ตาม API
            if (json.success && json.lines) { 
                const currentValue = selectEl.value;

                selectEl.innerHTML = '<option value="ALL">All Lines (Overview)</option>';

                // ✅ FIX 1: แก้ Loop ให้ใช้ json.lines
                json.lines.forEach(line => {
                    const option = document.createElement('option');
                    option.value = line;
                    option.textContent = line;
                    selectEl.appendChild(option);
                });

                if (currentValue && Array.from(selectEl.options).some(o => o.value === currentValue)) {
                    selectEl.value = currentValue;
                }
                
                // ✅ เพิ่ม Event Listener ให้เปลี่ยนแล้วโหลดข้อมูลทันที (เผื่อไว้)
                selectEl.onchange = () => Actions.runSuperAnalysis();
            }
        } catch (error) {
            console.error("Failed to load analysis lines:", error);
        }
    },

    renderFinancialAnalysis(financials) {
        if (!financials || financials.length === 0) {
            document.getElementById('financialTableBody').innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No data available for comparison</td></tr>`;
            return;
        }

        let sumOld = 0, sumNew = 0;
        financials.forEach(f => {
            sumOld += parseFloat(f.cost_standard || 0);
            sumNew += parseFloat(f.cost_actual || 0);
        });

        // 🔥 FIX: ปัดเศษให้เป็นจำนวนเต็มก่อนเทียบ เพื่อแก้ปัญหาทศนิยมเพี้ยน
        const sumDiff = sumNew - sumOld;
        const sumDiffRounded = Math.round(sumDiff); 
        
        const sumPct = sumOld > 0 ? ((sumDiff / sumOld) * 100) : 0;

        this.animateNumber('fin_old_total', Math.round(sumOld));
        this.animateNumber('fin_new_total', Math.round(sumNew));
        
        const diffEl = document.getElementById('fin_diff_total');
        const diffTxt = document.getElementById('fin_impact_text');
        const percentEl = document.getElementById('fin_diff_percent');
        
        // 1. จัดการตัวเลขและสี (Header)
        if (diffEl) {
            if (sumDiffRounded > 0) {
                diffEl.innerText = '+' + sumDiffRounded.toLocaleString();
                diffEl.className = 'h5 mb-0 font-weight-bold text-danger'; // แดง
            } else if (sumDiffRounded < 0) {
                diffEl.innerText = sumDiffRounded.toLocaleString(); 
                diffEl.className = 'h5 mb-0 font-weight-bold text-success'; // เขียว
            } else {
                diffEl.innerText = '0';
                diffEl.className = 'h5 mb-0 font-weight-bold text-secondary'; // ✅ เทา (เมื่อเท่ากัน)
            }
        }
        
        // 2. จัดการ % Badge
        if (percentEl) {
            if (sumDiffRounded === 0) {
                percentEl.innerText = '0%';
                percentEl.className = 'badge bg-light text-muted border'; // สีจางๆ
            } else {
                percentEl.innerText = (sumDiffRounded > 0 ? '+' : '') + sumPct.toFixed(2) + '%';
                percentEl.className = `badge ${sumDiffRounded > 0 ? 'bg-danger' : 'bg-success'} text-white`;
            }
        }

        // 3. จัดการข้อความ (Context Text)
        if (diffTxt) {
            if (sumDiffRounded > 0) {
                diffTxt.innerHTML = `<i class="fas fa-arrow-up"></i> Cost เพิ่มขึ้น (Overrun)`;
                diffTxt.className = "small text-danger mt-1 fw-bold";
            } else if (sumDiffRounded < 0) {
                diffTxt.innerHTML = `<i class="fas fa-arrow-down"></i> Cost ลดลง (Saving)`;
                diffTxt.className = "small text-success mt-1 fw-bold";
            } else {
                // ✅ เพิ่มเคสเท่ากัน
                diffTxt.innerHTML = `<i class="fas fa-check-circle"></i> No Variance (เท่าเดิม)`;
                diffTxt.className = "small text-muted mt-1";
            }
        }

        this.renderFinancialChart(financials);
        this.renderFinancialTable(financials);
    },

    renderFinancialChart(data) {
        const ctx = document.getElementById('financialImpactChart')?.getContext('2d');
        if (!ctx) return;

        if (UI.charts.finImpact) UI.charts.finImpact.destroy();

        // Prepare Data
        const labels = data.map(d => d.section_name);
        const dataOld = data.map(d => d.cost_standard);
        const dataNew = data.map(d => d.cost_actual);

        UI.charts.finImpact = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Old Formula',
                        data: dataOld,
                        backgroundColor: '#858796', // สีเทา (เดิม)
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'New Formula',
                        data: dataNew,
                        backgroundColor: '#4e73df', // สีน้ำเงิน (ใหม่)
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            footer: (items) => {
                                const oldVal = items[0].parsed.y;
                                const newVal = items[1].parsed.y;
                                const diff = newVal - oldVal;
                                return `Diff: ${(diff > 0 ? '+' : '') + diff.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderFinancialTable(data) {
        const tbody = document.getElementById('financialTableBody');
        if (!tbody) return;

        let html = '';
        const fmt = (n) => Math.round(parseFloat(n || 0)).toLocaleString();

        data.forEach(row => {
            const oldCost = parseFloat(row.cost_standard || 0);
            const newCost = parseFloat(row.cost_actual || 0);
            const diff = newCost - oldCost;
            
            // 🔥 FIX: ปัดเศษก่อนเทียบ
            const diffRounded = Math.round(diff);
            const pct = oldCost > 0 ? ((diff / oldCost) * 100).toFixed(1) : '0.0';
            
            // Logic สี และ Badge
            let diffClass = 'text-muted font-weight-normal'; // Default (0)
            let badgeHtml = `<span class="badge bg-light text-muted border" style="min-width:50px;">0%</span>`; // Default (0)
            let sign = '';

            if (diffRounded > 0) {
                diffClass = 'text-danger fw-bold';
                badgeHtml = `<span class="badge-var bad">${pct}%</span>`;
                sign = '+';
            } else if (diffRounded < 0) {
                diffClass = 'text-success fw-bold';
                badgeHtml = `<span class="badge-var good">${pct}%</span>`;
                // เครื่องหมายลบ (-) มากับตัวเลขอยู่แล้ว
            }

            // Highlight แถวเฉพาะที่มีผลต่างเยอะๆ (> 1000)
            const rowClass = Math.abs(diffRounded) > 1000 ? 'bg-warning bg-opacity-10' : '';

            html += `
                <tr class="${rowClass}">
                    <td class="ps-3 fw-bold text-dark border-end" style="font-size: 0.85rem;">
                        ${row.section_name}
                    </td>
                    <td class="num-cell text-secondary">
                        ${fmt(oldCost)}
                    </td>
                    <td class="num-cell text-primary fw-bold bg-primary bg-opacity-10">
                        ${fmt(newCost)}
                    </td>
                    <td class="num-cell ${diffClass}">
                        ${sign}${fmt(diff)}
                    </td>
                    <td class="text-center align-middle border-start">
                        ${badgeHtml}
                    </td>
                    <td class="num-cell text-muted border-start opacity-75">
                        ${fmt(row.actual_dl)}
                    </td>
                    <td class="num-cell text-muted opacity-75">
                        ${fmt(row.actual_ot)}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }
};

// =============================================================================
// 4. ACTIONS
// =============================================================================

const Actions = {
    _structureCache: { lines: [], teams: [] },
    _lastDetailParams: { line: '', shiftId: '', empType: '', filterStatus: 'ALL' },
    _cachedAnalysisData: null,

    async openDetailModal(line, shiftId, empType = 'ALL', filterStatus = 'ALL') {
        if (arguments.length === 3 && (empType === 'ALL' || empType === 'PRESENT' || empType === 'LATE' || empType === 'ABSENT')) {
             filterStatus = empType; empType = 'ALL';
        }
        this._lastDetailParams = { line, shiftId, empType, filterStatus };
        
        const modalEl = document.getElementById('detailModal');
        
        // Setup Title
        let title = line ? `${line}` : 'รายละเอียดทั้งหมด';
        if (shiftId) title += ` (${shiftId == 1 ? 'กะเช้า ☀️' : 'กะดึก 🌙'})`;
        if (empType !== 'ALL') title += ` [${empType}]`;
        if (filterStatus !== 'ALL') title += ` - ${filterStatus}`;
        
        document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-users me-2"></i> ${title}`;

        // Set Skeleton
        document.getElementById('detailModalTable').innerHTML = `
            <thead>
                <tr class="table-light text-secondary small text-center">
                    <th>พนักงาน</th><th width="10%">ไลน์</th><th width="8%">ทีม</th><th width="8%">กะ</th>
                    <th width="10%">เข้า</th><th width="10%">ออก</th><th width="10%">สถานะ</th>
                    <th width="15%">หมายเหตุ</th><th width="10%" class="text-end">Cost</th><th width="8%">Action</th>
                </tr>
            </thead>
            <tbody id="detailModalBody">
                ${UI.getSkeletonRow(10)}
            </tbody>`;
        
        // Reset Search Input
        const searchInput = document.getElementById('searchDetail');
        if(searchInput) {
            searchInput.value = '';
            this.initSearch(); 
        }

        if (!modalEl.classList.contains('show')) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } 

        // โหลดข้อมูล
        setTimeout(() => {
            this.fetchDetailData();
        }, 300);
    },

    async fetchDetailData() {
        const { line, shiftId, empType, filterStatus } = this._lastDetailParams;
        const date = document.getElementById('filterDate').value;
        if (this._structureCache.lines.length === 0) await this.initDropdowns();

        try {
            const url = `api/api_daily_operations.php?action=read_daily&date=${date}&line=${encodeURIComponent(line)}&type=${encodeURIComponent(empType)}`;
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.success) {
                let filteredData = json.data;
                if (filterStatus !== 'ALL') {
                    if (filterStatus === 'PRESENT_AND_LATE') filteredData = json.data.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
                    else if (filterStatus === 'LEAVE') {
                        const nonLeaveStatus = ['PRESENT', 'LATE', 'ABSENT', 'WAITING'];
                        filteredData = json.data.filter(r => !nonLeaveStatus.includes(r.status));
                    } else filteredData = json.data.filter(r => r.status === filterStatus);
                }
                if (shiftId) filteredData = filteredData.filter(r => r.shift_id == shiftId || r.default_shift_id == shiftId);

                filteredData.sort((a, b) => {
                    const score = (row) => {
                        if (parseInt(row.is_forgot_out) === 1) return 0;
                        if (row.status === 'ABSENT') return 1;
                        if (row.status === 'LATE') return 2;
                        return 3;
                    };
                    return score(a) - score(b);
                });

                this.renderDetailTable(filteredData);
            } else {
                document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">${json.message}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load data</td></tr>`;
        }
    },

    async deleteLog(logId, empName) {
        if (!logId || logId == '0') {
            alert('รายการนี้ยังไม่มีในระบบ (เป็นแค่ Plan ลอยๆ) ไม่สามารถลบได้\n(หากต้องการลบถาวร ให้ไปปิด Active ที่ตัวพนักงาน)');
            return;
        }

        if (!confirm(`⚠️ ยืนยันการลบรายการของ: ${empName}?\n\nการกระทำนี้จะลบ Log ของวันนั้นทิ้ง และทำให้ยอด Plan ลดลง`)) {
            return;
        }

        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_log',
                    log_id: logId
                })
            });

            const json = await res.json();
            
            if (json.success) {
                // รีโหลดตารางใน Modal และ Dashboard
                await Actions.fetchDetailData(); 
                App.loadData();
                // UI.showToast("ลบรายการเรียบร้อย", "success"); // ถ้ามี function showToast
            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            alert('Failed: ' + err.message);
        }
    },

    async deleteEmployee() {
        const empId = document.getElementById('empEditId').value;
        const name = document.getElementById('empEditName').value;

        if (!confirm(`⚠️ ยืนยันการปิดสถานะพนักงาน: ${name}?\n\n(ระบบจะลบข้อมูล Plan/Log ในอนาคตทิ้ง เพื่อไม่ให้นับยอดเกิน)`)) {
            return;
        }

        try {
            const payload = {
                action: 'update_employee',
                emp_id: empId,
                name_th: name,
                position: document.getElementById('empEditPos').value,
                line: document.getElementById('empEditLine').value,
                shift_id: document.getElementById('empEditShift').value,
                team_group: document.getElementById('empEditTeam').value,
                is_active: 0 // ❌ Force Inactive
            };

            const res = await fetch('api/api_master_data.php', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload) 
            });
            
            const json = await res.json();
            
            if(json.success) { 
                bootstrap.Modal.getInstance(document.getElementById('empEditModal')).hide(); 
                App.loadData(); 
                if(document.getElementById('empListModal').classList.contains('show')) {
                    Actions.openEmployeeManager();
                }
                alert('✅ ปิดใช้งานเรียบร้อย (ลบ Plan วันนี้ออกแล้ว)');
            } else { 
                alert('Error: ' + json.message); 
            }
        } catch(e) { 
            alert('Failed: ' + e.message); 
        }
    },

    async terminateStaff(empId, name) {
        const resignDate = prompt(`ระบุวันที่ลาออกของ [${name}] (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
        if (!resignDate) return;

        if (confirm(`⚠️ ยืนยันการแจ้งลาออกของ ${name}?\nระบบจะปิดพนักงานและลบข้อมูลหลังจากวันที่ ${resignDate} ทั้งหมด`)) {
            try {
                const res = await fetch('api/api_master_data.php', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        action: 'terminate_employee', 
                        emp_id: empId, 
                        resign_date: resignDate 
                    })
                });
                const json = await res.json();
                if(json.success) { 
                    // 1. ปิด Modal แก้ไขพนักงาน (ถ้าเปิดค้างอยู่)
                    const editModalEl = document.getElementById('empEditModal');
                    const editModal = bootstrap.Modal.getInstance(editModalEl);
                    if (editModal) editModal.hide();

                    // 2. อัปเดตข้อมูลหน้าจอ
                    await App.loadData(); 
                    await Actions.fetchDetailData(); 
                    if(document.getElementById('empListModal').classList.contains('show')) {
                        Actions.openEmployeeManager(); 
                    }
                    alert('✅ แจ้งลาออกและปิดสถานะพนักงานเรียบร้อย'); 
                } else {
                    alert('❌ Error: ' + json.message);
                }
            } catch (err) {
                alert('❌ Failed to connect API');
            }
        }
    },

    async setLeaveRecord(empId, date, type) {
        if (!confirm(`บันทึกสถานะการลา [${type}] สำหรับพนักงาน ${empId} วันที่ ${date}?`)) return;
        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'update_log', 
                    log_id: 0, 
                    emp_id: empId, 
                    log_date: date,
                    status: type,
                    remark: `ลา${type} (บันทึกโดย Admin)`
                })
            });
            const json = await res.json();
            if (json.success) {
                await App.loadData();
                await Actions.fetchDetailData();
            }
        } catch (err) { console.error(err); }
    },

    async viewEmployeeHistory(empId, name) {
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date();
        lastMonth.setDate(lastMonth.getDate() - 30);
        const startDate = lastMonth.toISOString().split('T')[0];

        const modalEl = document.getElementById('detailModal');
        const isAlreadyOpen = modalEl.classList.contains('show');
        
        const titleEl = document.getElementById('detailModalTitle');
        
        if (isAlreadyOpen) {
            if (!this._originalTitle) this._originalTitle = titleEl.innerHTML;
            
            titleEl.innerHTML = `
                <button class="btn btn-sm btn-outline-secondary me-2 rounded-circle" 
                        onclick="Actions.backToDailyList()" title="Back">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <i class="fas fa-history me-2 text-muted"></i> ประวัติ: ${name}
            `;
        } else {
            titleEl.innerHTML = `<i class="fas fa-history me-2"></i> ประวัติ 30 วัน: ${name}`;
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

        // แสดง Loading Skeleton
        document.getElementById('detailModalBody').innerHTML = UI.getSkeletonRow(10);

        try {
            const url = `api/api_daily_operations.php?action=read_daily&startDate=${startDate}&endDate=${today}&emp_id=${empId}`;
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.success) {
                const history = json.data.filter(r => r.emp_id === empId);
                // เรียงวันที่ล่าสุดขึ้นก่อน
                history.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
                
                this.renderDetailTable(history); 
            }
        } catch (err) {
            console.error(err);
            document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load history</td></tr>`;
        }
    },

    backToDailyList() {
        // คืนค่า Title เดิม (ถ้ามี) หรือ Default
        const titleEl = document.getElementById('detailModalTitle');
        // รีเซ็ต Title กลับเป็นแบบ Daily List (ดึงจาก function openDetailModal เดิมแบบ manual)
        // หรือเรียก openDetailModal ซ้ำด้วย Params ล่าสุดที่ cached ไว้
        this.openDetailModal(
            this._lastDetailParams.line, 
            this._lastDetailParams.shiftId, 
            this._lastDetailParams.empType, 
            this._lastDetailParams.filterStatus
        );
    },

    renderDetailTable(list) {
        const tbody = document.getElementById('detailModalBody');
        
        if (!list || list.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`; 
            return; 
        }

        // Helper สร้าง Option (อยู่นอก Loop เพื่อความเร็ว)
        const createOptions = (items, selectedVal) => items.map(val => `<option value="${val}" ${val == selectedVal ? 'selected' : ''}>${val}</option>`).join('');
        
        // Status Options Map (สร้างครั้งเดียวพอ)
        const statusMap = {
            'WAITING': '⏳ รอเข้างาน', 'PRESENT': '✅ มา (Present)', 'LATE': '⏰ สาย (Late)',
            'ABSENT': '❌ ขาด (Absent)', 'SICK': '🤢 ลาป่วย (Sick)', 'BUSINESS': '👜 ลากิจ (Business)',
            'VACATION': '🏖️ พักร้อน (Vacation)', 'OTHER': '⚪ อื่นๆ (Other)'
        };
        const statusOptionsArr = Object.entries(statusMap).map(([val, label]) => ({val, label}));

        // 🔥 [PERFORMANCE] ใช้ Array.map สร้าง String ก้อนใหญ่แทนการ Loop แปะ DOM
        const rowsHTML = list.map(row => {
            const uid = row.emp_id;
            
            // Dropdowns (string operation is fast)
            const lineOpts = createOptions(this._structureCache.lines, row.actual_line || row.line);
            const teamOpts = createOptions(this._structureCache.teams, row.actual_team || row.team_group);
            const shift1Sel = (row.shift_id == 1 || (!row.shift_id && row.default_shift_id == 1)) ? 'selected' : '';
            const shift2Sel = (row.shift_id == 2 || (!row.shift_id && row.default_shift_id == 2)) ? 'selected' : '';

            // Status Select
            const statusOptsHtml = statusOptionsArr.map(opt => `<option value="${opt.val}" ${row.status === opt.val ? 'selected' : ''}>${opt.label}</option>`).join('');

            // Logic เดิม
            const costVal = parseFloat(row.est_cost || 0);
            const costHtml = costVal > 0 ? `<span class="fw-bold ${costVal > 1000 ? 'text-primary' : 'text-dark'}">${costVal.toLocaleString()}</span>` : '<span class="text-muted">-</span>';
            
            let outTimeDisplay = row.out_time;
            let trClass = '';
            let forgotOutHtml = '';
            
            if (parseInt(row.is_forgot_out) === 1) {
                trClass = 'table-danger bg-opacity-10';
                outTimeDisplay = `<span class="text-danger fw-bold small"><i class="fas fa-exclamation-circle"></i> ลืมรูด</span>`;
                forgotOutHtml = `<a href="#" class="small text-decoration-none" onclick="this.previousElementSibling.classList.remove('d-none'); this.previousElementSibling.previousElementSibling.style.display='none'; this.style.display='none'; return false;">แก้</a>`;
            }

            const masterJson = encodeURIComponent(JSON.stringify({ 
                emp_id: row.emp_id, 
                name_th: row.name_th, 
                position: row.position, 
                line: row.line, 
                team_group: row.team_group, 
                default_shift_id: row.default_shift_id, 
                is_active: row.is_active
            }));
            // Return HTML String of ONE row
            return `
                <tr class="${trClass}">
                    <td class="ps-4">
                        <div class="fw-bold text-dark text-truncate" style="max-width: 150px;">${row.name_th}</div>
                        <small class="text-muted font-monospace" style="font-size:0.75rem;">${row.emp_id}</small>
                    </td>
                    <td class="p-1"><select class="form-select form-select-sm border-0 bg-transparent small shadow-none" id="line_${uid}" style="font-size: 0.8rem;">${lineOpts}</select></td>
                    <td class="p-1"><select class="form-select form-select-sm border-0 bg-transparent small shadow-none" id="team_${uid}" style="font-size: 0.8rem;"><option value="-">-</option>${teamOpts}</select></td>
                    <td class="p-1">
                        <select class="form-select form-select-sm border-0 bg-transparent small fw-bold text-primary shadow-none" id="shift_${uid}" style="font-size: 0.8rem;">
                            <option value="1" ${shift1Sel}>Day</option><option value="2" ${shift2Sel}>Night</option>
                        </select>
                    </td>
                    <td class="p-1 text-center cursor-pointer-cell">
                        <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0" id="in_${uid}" value="${row.in_time || ''}">
                    </td>
                    <td class="p-1 text-center cursor-pointer-cell">
                        ${parseInt(row.is_forgot_out) === 1 ? outTimeDisplay : ''}
                        <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0 ${parseInt(row.is_forgot_out) === 1 ? 'd-none' : ''}" id="out_${uid}" value="${row.out_time || ''}">
                        ${forgotOutHtml}
                    </td>
                    <td class="p-1">
                        <select class="form-select form-select-sm border-0 bg-transparent fw-bold shadow-none text-uppercase" id="status_${uid}" style="font-size: 0.75rem;">${statusOptsHtml}</select>
                    </td>
                    <td class="p-1"><input type="text" class="form-control form-control-sm border-0 border-bottom rounded-0 bg-transparent shadow-none" id="remark_${uid}" value="${row.remark || ''}" placeholder="..."></td>
                    <td class="text-end pe-3 align-middle">${costHtml}</td>
                    
                    <td class="text-center text-nowrap align-middle">
                        
                        <button class="btn btn-sm btn-primary rounded-circle shadow-sm me-1" 
                                style="width: 32px; height: 32px;" 
                                onclick="Actions.saveLogStatus('${row.log_id}', '${uid}')" 
                                title="บันทึกข้อมูล">
                            <i class="fas fa-save"></i>
                        </button>

                        <div class="btn-group">
                            <button class="btn btn-sm btn-light text-secondary rounded-circle" 
                                    style="width: 32px; height: 32px;" 
                                    data-bs-toggle="dropdown" 
                                    data-bs-boundary="viewport"  aria-expanded="false">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="font-size: 0.85rem; min-width: 180px;">
                                
                                <li><h6 class="dropdown-header text-uppercase small my-0">Quick Actions</h6></li>
                                
                                <li><a class="dropdown-item" href="#" onclick="Actions.setLeaveRecord('${uid}', '${row.log_date}', 'SICK')"><i class="fas fa-procedures text-warning me-2"></i>ลาป่วย (Sick)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.setLeaveRecord('${uid}', '${row.log_date}', 'BUSINESS')"><i class="fas fa-briefcase text-info me-2"></i>ลากิจ (Business)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.setLeaveRecord('${uid}', '${row.log_date}', 'VACATION')"><i class="fas fa-umbrella-beach text-success me-2"></i>พักร้อน (Vacation)</a></li>
                                
                                <li><hr class="dropdown-divider"></li>
                                
                                <li><a class="dropdown-item" href="#" onclick="Actions.viewEmployeeHistory('${uid}', '${row.name_th}')"><i class="fas fa-history text-secondary me-2"></i>ดูประวัติย้อนหลัง</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmpEdit('${row.emp_id}')"><i class="fas fa-user-edit text-secondary me-2"></i>แก้ไขข้อมูลหลัก</a></li>

                                <li><hr class="dropdown-divider"></li>
                                
                                <li><a class="dropdown-item text-danger" href="#" onclick="Actions.deleteLog('${row.log_id}', '${row.name_th}')"><i class="fas fa-trash-alt me-2"></i>ลบรายการวันนี้</a></li>
                            </ul>
                        </div>

                    </td>
                </tr>`;
        }).join('');
        tbody.innerHTML = rowsHTML;
    },

    async saveLogStatus(logId, empId) {
        const elStatus = document.getElementById(`status_${empId}`);
        const elLine = document.getElementById(`line_${empId}`);
        const elTeam = document.getElementById(`team_${empId}`);
        const elShift = document.getElementById(`shift_${empId}`);
        const elRemark = document.getElementById(`remark_${empId}`);
        const elIn = document.getElementById(`in_${empId}`);
        const elOut = document.getElementById(`out_${empId}`);
        
        if (!elStatus || !elLine) return;

        const dateStr = document.getElementById('filterDate').value;
        const timeIn = elIn.value;
        const timeOut = elOut.value;

        let scanInFull = timeIn ? `${dateStr} ${timeIn}:00` : null;
        let scanOutFull = null;

        if (timeOut) {
            let outDate = dateStr;
            const hourOut = parseInt(timeOut.split(':')[0]);
            
            if ((timeIn && timeOut < timeIn) || (hourOut >= 0 && hourOut <= 7)) {
                const d = new Date(dateStr + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                outDate = d.toISOString().split('T')[0];
            }
            scanOutFull = `${outDate} ${timeOut}:00`;
        }

        const btn = event.currentTarget; 
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_log', log_id: logId, emp_id: empId, log_date: dateStr,
                    actual_line: elLine.value, actual_team: elTeam.value, shift_id: elShift.value,
                    status: elStatus.value, remark: elRemark.value,
                    scan_in_time: scanInFull, scan_out_time: scanOutFull
                })
            });
            const json = await res.json();
            if (json.success) {
                btn.classList.replace('btn-primary', 'btn-success'); 
                btn.innerHTML = '<i class="fas fa-check"></i>';
                
                setTimeout(async () => {
                    btn.classList.replace('btn-success', 'btn-primary'); 
                    btn.innerHTML = originalIcon; 
                    btn.disabled = false;

                    // 1. อัปเดตตัวเลขหน้า Dashboard หลัง
                    if(typeof App !== 'undefined') App.loadData(true);

                    // 2. 🔥 เพิ่มบรรทัดนี้: สั่งให้ Modal ดึงข้อมูลใหม่และวาดตารางใหม่
                    // หากพนักงานถูกย้ายไลน์ไปแล้ว เขาจะหายไปจากตารางใน Modal นี้ทันที
                    await Actions.fetchDetailData(); 

                }, 1000);
            } else { 
                alert('Error: ' + json.message); 
                btn.innerHTML = originalIcon; 
                btn.disabled = false; 
            }
        } catch (err) { alert('Failed: ' + err.message); btn.innerHTML = originalIcon; btn.disabled = false; }
    },

    async initDropdowns() {
        try {
            const res = await fetch('api/api_master_data.php?action=read_structure');
            const json = await res.json();
            if (json.success) {
                this._structureCache.lines = json.lines;
                this._structureCache.teams = json.teams;
                
                ['editLogLine', 'filterLine', 'empEditLine', 'newEmpLine'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.innerHTML = '<option value="">-- Select --</option>' + (id==='filterLine'?'<option value="ALL">All Lines</option>':'') + json.lines.map(l => `<option value="${l}">${l}</option>`).join('');
                    }
                });
                ['editLogTeam', 'empEditTeam', 'newEmpTeam'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerHTML = '<option value="">-</option>' + json.teams.map(t => `<option value="${t}">Team ${t}</option>`).join('');
                });
            }
        } catch (err) { console.error('Failed to load dropdowns:', err); }
    },

    initSearch() {
        const input = document.getElementById('searchDetail');
        if (!input) return;

        let debounceTimer;

        // ล้าง Event เก่า (ถ้ามี)
        input.onkeyup = null;

        input.onkeyup = function() {
            clearTimeout(debounceTimer);
            
            const searchTerm = this.value.toLowerCase().trim();
            const tbody = document.getElementById('detailModalBody');
            
            // 1. ถ้าลบจนว่าง ให้โชว์หมดแบบปกติ (ไม่ต้อง Anime เยอะเดี๋ยวตาลาย)
            if (searchTerm === '') {
                const rows = tbody.querySelectorAll('tr');
                requestAnimationFrame(() => {
                    rows.forEach(r => {
                        r.style.display = '';
                        r.classList.remove('search-reveal'); // เอา Animation ออก
                    });
                });
                return;
            }

            // 2. ถ้ามีคำค้นหา -> รอ User หยุดพิมพ์ 0.3 วิ
            debounceTimer = setTimeout(() => {
                const rows = tbody.querySelectorAll('tr');
                
                requestAnimationFrame(() => {
                    rows.forEach(row => {
                        const text = row.innerText.toLowerCase();
                        // เก็บ status เดิมไว้เปรียบเทียบ
                        const isCurrentlyVisible = row.style.display !== 'none';
                        
                        // Logic การค้นหา
                        const isMatch = text.includes(searchTerm) || text.includes('loading');

                        if (isMatch) {
                            if (!isCurrentlyVisible) {
                                // ถ้าของเดิมซ่อนอยู่ แล้วกำลังจะโชว์ -> ใส่ Animation
                                row.style.display = '';
                                row.classList.remove('search-reveal'); // Reset Class
                                void row.offsetWidth; // 🔥 เทคนิค Trigger Reflow เพื่อให้เล่น Animation ใหม่
                                row.classList.add('search-reveal');
                            }
                        } else {
                            row.style.display = 'none';
                            row.classList.remove('search-reveal');
                        }
                    });
                });
                
            }, 300); // Delay 300ms
        };
    },

    async exportTrendExcel(days) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        const sStr = start.toISOString().split('T')[0];
        const eStr = end.toISOString().split('T')[0];

        UI.showLoader();
        try {
            const res = await fetch(`api/api_daily_operations.php?action=export_history&startDate=${sStr}&endDate=${eStr}`);
            const json = await res.json();

            if (json.success && json.data.length > 0) {
                const wb = XLSX.utils.book_new();
                const rawData = json.data;
                const autoFitColumns = (jsonArray, worksheet) => {
                    if (!jsonArray || jsonArray.length === 0) return;
                    
                    const objectMaxLength = []; 
                    const keys = Object.keys(jsonArray[0]);
                    
                    // 1. วนลูปหาความกว้างของ Header
                    keys.forEach(col => {
                        objectMaxLength.push({ wch: col.length + 5 });
                    });

                    // 2. วนลูปข้อมูลทุกแถว เพื่อหาคำที่ยาวที่สุดในคอลัมน์นั้น
                    jsonArray.forEach(row => {
                        keys.forEach((key, i) => {
                            const value = (row[key] || '').toString();
                            if (value.length > objectMaxLength[i].wch - 5) {
                                objectMaxLength[i].wch = value.length + 5;
                            }
                        });
                    });

                    // 3. กำหนดค่าความกว้างให้ Worksheet
                    worksheet['!cols'] = objectMaxLength;
                };

                // =========================================================
                // 1. FACTORY SUMMARY
                // =========================================================
                const summaryMap = {};
                rawData.forEach(row => {
                    const date = row['Date'];
                    if (!summaryMap[date]) {
                        summaryMap[date] = { 'Date': date, 'Plan (Total)': 0, 'Present': 0, 'Late': 0, 'Actual (Total)': 0, 'Absent': 0, 'Leave': 0, 'Diff': 0, 'Est. Cost (THB)': 0 };
                    }
                    const item = summaryMap[date];
                    item['Plan (Total)'] += parseInt(row['Plan (HC)'] || 0);
                    item['Present'] += parseInt(row['Present'] || 0);
                    item['Late'] += parseInt(row['Late'] || 0);
                    item['Actual (Total)'] += parseInt(row['Actual (Present+Late)'] || 0);
                    item['Absent'] += parseInt(row['Absent'] || 0);
                    item['Leave'] += parseInt(row['Leave'] || 0);
                    item['Est. Cost (THB)'] += parseFloat(row['Est_Cost'] || 0);
                });
                const summaryData = Object.values(summaryMap).map(d => { d['Diff'] = d['Actual (Total)'] - d['Plan (Total)']; return d; });
                summaryData.sort((a, b) => new Date(b.Date) - new Date(a.Date));

                const wsSummary = XLSX.utils.json_to_sheet(summaryData);
                autoFitColumns(summaryData, wsSummary);
                XLSX.utils.book_append_sheet(wb, wsSummary, "Factory_Summary");

                // =========================================================
                // 2. SHIFT TABS
                // =========================================================
                const dayData = rawData.filter(r => r['Shift'] && r['Shift'].toUpperCase().includes('DAY'));
                if (dayData.length > 0) {
                    const wsDay = XLSX.utils.json_to_sheet(dayData);
                    autoFitColumns(dayData, wsDay);
                    XLSX.utils.book_append_sheet(wb, wsDay, "Only_Day");
                }

                const nightData = rawData.filter(r => r['Shift'] && r['Shift'].toUpperCase().includes('NIGHT'));
                if (nightData.length > 0) {
                    const wsNight = XLSX.utils.json_to_sheet(nightData);
                    autoFitColumns(nightData, wsNight);
                    XLSX.utils.book_append_sheet(wb, wsNight, "Only_Night");
                }

                // =========================================================
                // 3. LINE TABS
                // =========================================================
                const uniqueLines = [...new Set(rawData.map(item => item['Line']))].sort();
                uniqueLines.forEach(lineName => {
                    if (lineName) {
                        const lineData = rawData.filter(item => item['Line'] === lineName);
                        const ws = XLSX.utils.json_to_sheet(lineData);
                        autoFitColumns(lineData, ws);
                        
                        let safeName = lineName.toString().replace(/[\/\\\?\*\[\]]/g, '_').substring(0, 30);
                        XLSX.utils.book_append_sheet(wb, ws, safeName || "Unknown");
                    }
                });

                // =========================================================
                // 4. RAW DATA ALL
                // =========================================================
                const wsAll = XLSX.utils.json_to_sheet(rawData);
                autoFitColumns(rawData, wsAll);
                XLSX.utils.book_append_sheet(wb, wsAll, "Raw_Data_All");

                // SAVE FILE
                const fileName = `Manpower_Report_${days}Days_${eStr}.xlsx`;
                XLSX.writeFile(wb, fileName);

            } else {
                alert("ไม่พบข้อมูลในช่วงเวลาที่เลือก");
            }
        } catch (err) {
            console.error(err);
            alert("Export Failed: " + err.message);
        } finally {
            UI.hideLoader();
        }
    },

    async exportDailyRaw() {
        const date = document.getElementById('filterDate').value;
        UI.showLoader();
        
        try {
            const res = await fetch(`api/api_daily_operations.php?action=read_daily&date=${date}&line=ALL`);
            const json = await res.json();

            if (json.success && json.data.length > 0) {
                const exportData = json.data.map(row => ({
                    'Date': row.log_date,
                    'Emp ID': row.emp_id,
                    'Name': row.name_th,
                    'Position': row.position,
                    'Line': row.actual_line || row.line,
                    'Team': row.actual_team || row.team_group,
                    'Shift': row.shift_id == 1 ? 'Day' : 'Night',
                    'Time In': row.in_time || '',
                    'Time Out': row.out_time || '',
                    'Status': row.status,
                    'Remark': row.remark,
                    'Cost (Est)': parseFloat(row.est_cost || 0)
                }));

                // สร้าง Excel
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Daily_Raw_Data");

                XLSX.writeFile(wb, `Manpower_Daily_${date}.xlsx`);
            } else {
                alert("ไม่พบข้อมูลสำหรับวันที่เลือก");
            }
        } catch (err) {
            console.error(err);
            alert("Export Error: " + err.message);
        } finally {
            UI.hideLoader();
        }
    },
    
    // -------------------------------------------------------------------------
    // 6. EMPLOYEE MANAGER V2 (IMPROVED)
    // -------------------------------------------------------------------------
    _employeeCache: [],
    
    // เพิ่ม parameter keepFilters = false (ค่าเริ่มต้นคือไม่จำ)
    async openEmployeeManager(keepFilters = false) {
        
        // 1. 💾 SAVE STATE: ถ้าสั่งให้จำค่า ให้เก็บค่าปัจจุบันใส่ตัวแปรไว้ก่อน
        let savedState = null;
        if (keepFilters) {
            // เช็คว่า Element มีอยู่จริงไหมก่อนดึงค่า
            const statusEl = document.querySelector('input[name="empStatusFilter"]:checked');
            savedState = {
                term: document.getElementById('empSearchBox')?.value || '',
                line: document.getElementById('empFilterLine')?.value || '',
                status: statusEl ? statusEl.value : '1', // Default Active if not found
                dateType: document.getElementById('empDateType')?.value || '',
                dFrom: document.getElementById('empDateFrom')?.value || '',
                dTo: document.getElementById('empDateTo')?.value || ''
            };
        }

        const modal = new bootstrap.Modal(document.getElementById('empListModal'));
        
        // แสดง Skeleton Loading เฉพาะตอนเปิดใหม่ (ถ้า keepFilters ไม่ต้องโชว์โหลดให้วูบวาบ)
        if (!keepFilters) {
            document.getElementById('empListBody').innerHTML = UI.getSkeletonRow(7);
        }
        
        // Populate Line Filter (ถ้ายังไม่มี option)
        const filterSelect = document.getElementById('empFilterLine');
        if (filterSelect && filterSelect.options.length <= 1 && this._structureCache.lines.length > 0) {
            filterSelect.innerHTML = '<option value="">All Lines</option>' + 
                this._structureCache.lines.map(l => `<option value="${l}">${l}</option>`).join('');
        }

        if(!document.getElementById('empListModal').classList.contains('show')) modal.show();
        
        try {
            // Fetch ข้อมูลใหม่
            const res = await fetch(`api/api_master_data.php?action=read_employees&show_all=true`);
            const json = await res.json();
            
            if (json.success) { 
                this._employeeCache = json.data;
                
                // 2. 🔄 RESTORE STATE: คืนค่าเดิมกลับไป
                if (keepFilters && savedState) {
                    // คืนค่า Search & Line
                    document.getElementById('empSearchBox').value = savedState.term;
                    document.getElementById('empFilterLine').value = savedState.line;
                    
                    // คืนค่า Status Radio
                    const rad = document.querySelector(`input[name="empStatusFilter"][value="${savedState.status}"]`);
                    if(rad) rad.checked = true;

                    // คืนค่า Date
                    document.getElementById('empDateType').value = savedState.dateType;
                    document.getElementById('empDateFrom').value = savedState.dFrom;
                    document.getElementById('empDateTo').value = savedState.dTo;
                    
                    // สั่งเปิดกล่องวันที่ ถ้าเดิมมันเปิดอยู่
                    this.toggleDateInputs(); 

                } else {
                    // 🧹 RESET DEFAULT: กรณีเปิดใหม่ปกติ
                    if(document.getElementById('filterStatusActive')) {
                        document.getElementById('filterStatusActive').checked = true;
                    }
                    if (document.getElementById('empDateType')) {
                        document.getElementById('empDateType').value = '';
                        this.toggleDateInputs();
                    }
                    if (document.getElementById('empSearchBox')) document.getElementById('empSearchBox').value = '';
                    if (document.getElementById('empFilterLine')) document.getElementById('empFilterLine').value = '';
                }

                // สั่งกรองข้อมูลทันที
                this.filterEmployeeList();
            }
        } catch (e) { 
            console.error(e); 
            document.getElementById('empListBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>`;
        }
    },

    filterEmployeeList() {
        if (this._employeeCache && this._employeeCache.length > 0) {
            console.log("🔥 CHECK DATA STRUCTURE:", this._employeeCache[0]);
        }

        // 1. ดึงค่าจาก Input
        const term = document.getElementById('empSearchBox').value.toLowerCase().trim();
        const lineFilter = document.getElementById('empFilterLine').value;
        
        // อ่านค่า Status (รองรับทั้ง Radio และ Select เผื่อคุณเปลี่ยนไปมา)
        let statusVal = 'ALL';
        const radioActive = document.querySelector('input[name="empStatusFilter"]:checked');
        const selectActive = document.getElementById('empFilterStatus');
        if (radioActive) statusVal = radioActive.value;
        else if (selectActive) statusVal = selectActive.value;

        // อ่านค่าวันที่
        const dateType = document.getElementById('empDateType').value; // 'JOIN', 'RESIGN', ''
        const dateFrom = document.getElementById('empDateFrom').value;
        const dateTo = document.getElementById('empDateTo').value;

        // 2. กรองข้อมูล
        const filtered = this._employeeCache.filter(emp => {
            // [A] Status Filter
            const isActive = parseInt(emp.is_active);
            if (statusVal !== 'ALL') {
                if (isActive != parseInt(statusVal)) return false;
            }

            // [B] Line Filter
            if (lineFilter && emp.line !== lineFilter) return false;

            // [C] Search Term
            if (term) {
                const searchStr = `${emp.emp_id} ${emp.name_th} ${emp.position} ${emp.line}`.toLowerCase();
                if (!searchStr.includes(term)) return false;
            }

            // [D] Date Filter (Logic ใหม่: ยืดหยุ่นกว่าเดิม)
            if (dateType && dateType !== '') {
                // เลือกฟิลด์ที่จะเช็ค
                const rawDate = (dateType === 'JOIN') ? emp.start_date : emp.resign_date;

                // ถ้าคนนี้ไม่มีวันที่บันทึกไว้ -> ตกไปเลย
                if (!rawDate) return false;

                // ตัดเวลาทิ้งเอาแค่ YYYY-MM-DD
                const targetDate = rawDate.split(' ')[0];

                // ถ้ามี 'จากวันที่' -> วันที่เป้าหมายต้อง มากกว่าหรือเท่ากับ
                if (dateFrom && targetDate < dateFrom) return false;

                // ถ้ามี 'ถึงวันที่' -> วันที่เป้าหมายต้อง น้อยกว่าหรือเท่ากับ
                if (dateTo && targetDate > dateTo) return false;
            }

            return true;
        });

        // 3. แสดงผล
        console.log(`🔍 Found: ${filtered.length} items`);
        this.renderEmployeeTable(filtered);
    },

    resetEmployeeFilters() {
        document.getElementById('empSearchBox').value = '';
        document.getElementById('empFilterLine').value = '';
        if(document.getElementById('filterStatusActive')) {
            document.getElementById('filterStatusActive').checked = true;
        }
        
        document.getElementById('empDateType').value = '';
        this.toggleDateInputs(); // ซ่อนวัน
        
        this.filterEmployeeList();
    },

    toggleDateInputs() {
        const type = document.getElementById('empDateType').value;
        const wrapper = document.getElementById('empDateWrapper');
        if (!wrapper) return;

        if (type === '') {
            wrapper.classList.remove('d-flex');
            wrapper.classList.add('d-none');
            
            // Clear Dates
            document.getElementById('empDateFrom').value = '';
            document.getElementById('empDateTo').value = '';
        } else {
            wrapper.classList.remove('d-none');
            wrapper.classList.add('d-flex');
            
            // 🔥 AUTO-SWITCH LOGIC:
            if (type === 'RESIGN') {
                // ถ้าหาคนลาออก -> ปรับ Status เป็น Inactive หรือ All
                // แนะนำ 'ALL' เผื่อบางคนลาออกล่วงหน้า (แต่ยัง Active อยู่)
                document.getElementById('filterStatusAll').checked = true;
            } else if (type === 'JOIN') {
                // ถ้าหาคนเข้าใหม่ -> ปรับเป็น All (เผื่อเข้าใหม่แล้วออกไปแล้ว)
                document.getElementById('filterStatusAll').checked = true;
            }
            
            // สั่งกรองใหม่ทันที
            this.filterEmployeeList();
        }
    },

    renderEmployeeTable(list) {
         const tbody = document.getElementById('empListBody'); 
         tbody.innerHTML = '';
         
         document.getElementById('empListCount').innerText = `Showing: ${list.length} records`;

         if (!list || list.length === 0) { 
             tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted opacity-50"><i class="fas fa-search fa-3x mb-3"></i><br>ไม่พบข้อมูลพนักงานตามเงื่อนไข</td></tr>`; 
             return; 
         }
         
         const displayList = list.slice(0, 100); 

         // Helper Date Format (DD/MM/YY)
         const dFmt = (dStr) => {
             if (!dStr) return '<span class="text-muted opacity-50">-</span>';
             const d = new Date(dStr);
             return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().substr(-2)}`;
         };

         displayList.forEach(emp => {
             const isActive = parseInt(emp.is_active) === 1;
             
             // 1. Profile Section
             const profileHtml = `
                <div class="d-flex align-items-center">
                    <div class="avatar-initial rounded bg-light text-primary fw-bold me-3 d-flex align-items-center justify-content-center" style="width:40px; height:40px; font-size:1.2rem;">
                        ${emp.name_th.charAt(0)}
                    </div>
                    <div>
                        <div class="fw-bold text-dark">${emp.name_th}</div>
                        <div class="small text-muted font-monospace"><i class="fas fa-id-badge me-1 opacity-50"></i>${emp.emp_id}</div>
                    </div>
                </div>
             `;

             // 2. Type Badge
             let typeBadge = '';
             if (emp.emp_type === 'Monthly') typeBadge = '<span class="badge badge-soft-primary">Monthly</span>';
             else if (emp.emp_type === 'Daily') typeBadge = '<span class="badge badge-soft-success">Daily</span>';
             else if (emp.emp_type === 'Subcontract') typeBadge = '<span class="badge badge-soft-warning text-dark">Sub</span>';
             else typeBadge = `<span class="badge bg-secondary">${emp.emp_type || '?'}</span>`;

             // 3. Status Badge & Timeline (ปรับใหม่)
             let statusHtml = '';
             if (isActive) {
                 statusHtml = `
                    <div class="d-flex flex-column align-items-center">
                        <span class="badge bg-success bg-opacity-10 text-success border border-success mb-1" style="min-width: 70px;">ACTIVE</span>
                        <div class="small font-monospace text-muted" style="font-size: 0.7rem;" title="Start Date">
                            <i class="fas fa-sign-in-alt text-success me-1"></i>${dFmt(emp.start_date)}
                        </div>
                    </div>`;
             } else {
                 statusHtml = `
                    <div class="d-flex flex-column align-items-center">
                        <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary mb-1" style="min-width: 70px;">RESIGNED</span>
                        <div class="d-flex align-items-center small font-monospace bg-light rounded px-1 border" style="font-size: 0.7rem;">
                            <span class="text-success" title="Joined">${dFmt(emp.start_date)}</span>
                            <i class="fas fa-arrow-right mx-1 text-muted" style="font-size: 0.6rem;"></i>
                            <span class="text-danger fw-bold" title="Resigned">${dFmt(emp.resign_date)}</span>
                        </div>
                    </div>`;
             }

             // 4. Data Quality Check
             let tagsHtml = '';
             if (!emp.line) tagsHtml += `<span class="badge bg-danger mb-1 me-1">No Line</span>`;
             if (!emp.default_shift_id) tagsHtml += `<span class="badge bg-warning text-dark mb-1 me-1">No Shift</span>`;
             if (!emp.team_group) tagsHtml += `<span class="badge bg-info text-dark mb-1 me-1">No Team</span>`;
             if (tagsHtml === '') tagsHtml = `<span class="text-muted small"><i class="fas fa-check-circle text-success me-1"></i>Data OK</span>`;

             // 5. Shift Info
             const shiftText = emp.shift_name ? (emp.shift_name.includes('Day') ? '<i class="fas fa-sun text-warning me-1"></i>Day' : '<i class="fas fa-moon text-indigo me-1"></i>Night') : '-';

             // Row HTML
             tbody.innerHTML += `
                <tr class="${!isActive ? 'bg-light text-muted' : ''}"> <td class="ps-4">${profileHtml}</td>
                    <td>
                        <div class="fw-bold ${isActive ? 'text-dark' : 'text-secondary'}">${emp.line || '-'}</div>
                        <div class="small text-muted">${emp.position || ''}</div>
                    </td>
                    <td class="text-center small">${shiftText}</td>
                    <td class="text-center">${typeBadge}</td>
                    <td class="text-center">${statusHtml}</td>
                    <td>${tagsHtml}</td>
                    <td class="text-end pe-4">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary rounded-circle" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmpEdit('${encodeURIComponent(JSON.stringify(emp))}')"><i class="fas fa-pen text-primary me-2"></i>Edit Details</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.viewEmployeeHistory('${emp.emp_id}', '${emp.name_th}')"><i class="fas fa-history text-info me-2"></i>View History</a></li>
                                ${isActive ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-danger" href="#" onclick="Actions.terminateStaff('${emp.emp_id}', '${emp.name_th}')"><i class="fas fa-user-times me-2"></i>Resign User</a></li>` : ''}
                            </ul>
                        </div>
                    </td>
                </tr>`;
         });
         
         if (list.length > 100) {
             tbody.innerHTML += `<tr><td colspan="7" class="text-center text-muted small py-2">... and ${list.length - 100} more (Use search to find specific user) ...</td></tr>`;
         }
    },

    openEmpEdit: async function(dataOrEmpId) {
        const modalEl = document.getElementById('empEditModal');
        const modal = new bootstrap.Modal(modalEl);
        
        let empId = null;
        let isEdit = false;

        document.getElementById('empEditForm').reset();
        document.getElementById('empEditStartDate').value = ''; 
        document.getElementById('empEditResignDate').value = '';

        document.getElementById('divRetroUpdate').style.display = 'none'; 
        document.getElementById('retroDateBox').style.display = 'none';
        
        this._originalWorkData = { line: '', team: '', shift: '' };

        if (dataOrEmpId) {
            isEdit = true;
            if (typeof dataOrEmpId === 'string' && dataOrEmpId.length < 20) { empId = dataOrEmpId; } 
            else { try { const t = JSON.parse(decodeURIComponent(dataOrEmpId)); empId = t.emp_id; } catch(e) { return; } }
        }

        // Setup Header
        document.getElementById('isEditMode').value = isEdit ? '1' : '0';
        document.getElementById('empEditTitle').innerText = isEdit ? 'Edit Employee' : 'New Employee';
        document.getElementById('empEditId').readOnly = isEdit;

        // Load Dropdowns
        if(this._structureCache.lines.length === 0) await this.initDropdowns();

        if (isEdit) {
            UI.showLoader();
            try {
                const res = await fetch(`api/api_master_data.php?action=read_single_employee&emp_id=${encodeURIComponent(empId)}`);
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
                const emp = json.data;

                // Populate Data
                document.getElementById('empEditId').value = emp.emp_id;
                document.getElementById('empEditName').value = emp.name_th || '';
                document.getElementById('empEditPos').value = emp.position || '';
                document.getElementById('empEditStartDate').value = emp.start_date || '';
                
                // Work Info
                setTimeout(() => {
                    document.getElementById('empEditLine').value = emp.line || '';
                    document.getElementById('empEditShift').value = emp.default_shift_id || emp.shift_id || '';
                    document.getElementById('empEditTeam').value = emp.team_group || '';
                    
                    // Cache ค่าเดิมไว้เทียบ
                    this._originalWorkData = { 
                        line: emp.line, 
                        shift: (emp.default_shift_id || emp.shift_id), 
                        team: emp.team_group 
                    };
                }, 50);

                // --- 🔥 SMART STATUS LOGIC ---
                const isActive = parseInt(emp.is_active) === 1;
                document.getElementById('currentActiveStatus').value = isActive ? '1' : '0';
                
                const badge = document.getElementById('empStatusBadge');
                const btnResign = document.getElementById('btnResign');
                const btnReactivate = document.getElementById('btnReactivate');
                const resignCard = document.getElementById('resignInfoCard');

                if (isActive) {
                    badge.className = 'badge bg-success ms-3 border border-light';
                    badge.innerText = 'ACTIVE';
                    btnResign.style.display = 'inline-block';
                    btnReactivate.style.display = 'none';
                    resignCard.style.display = 'none';
                } else {
                    badge.className = 'badge bg-secondary ms-3 border border-light';
                    badge.innerText = 'RESIGNED / INACTIVE';
                    btnResign.style.display = 'none';
                    btnReactivate.style.display = 'inline-block';
                    
                    resignCard.style.display = 'block';
                    document.getElementById('empEditResignDate').value = emp.resign_date || '';
                }

            } catch (e) {
                alert("Error: " + e.message);
                return;
            } finally {
                UI.hideLoader();
            }
        } else {
            // New Mode
            document.getElementById('currentActiveStatus').value = '1';
            document.getElementById('empStatusBadge').innerText = 'NEW';
            document.getElementById('empStatusBadge').className = 'badge bg-primary ms-3';
            document.getElementById('btnResign').style.display = 'none';
            document.getElementById('btnReactivate').style.display = 'none';
            document.getElementById('resignInfoCard').style.display = 'none';
        }

        modal.show();
    },

    detectWorkChange() {
        const newLine = document.getElementById('empEditLine').value;
        const newTeam = document.getElementById('empEditTeam').value;
        const newShift = document.getElementById('empEditShift').value;

        // ถ้าค่าใหม่ ไม่ตรงกับค่าเดิม -> โชว์ Retroactive Box
        const isChanged = (newLine != this._originalWorkData.line) || 
                          (newTeam != this._originalWorkData.team) || 
                          (newShift != this._originalWorkData.shift);
        
        const retroDiv = document.getElementById('divRetroUpdate');
        
        if (isChanged && document.getElementById('isEditMode').value === '1') {
            if (retroDiv.style.display === 'none') {
                retroDiv.style.display = 'block'; // Slide Down
                retroDiv.classList.add('animate__animated', 'animate__fadeIn'); // ถ้ามี Animate.css
                // Auto-set effective date to Today
                document.getElementById('editMaster_EffectiveDate').value = new Date().toISOString().split('T')[0];
            }
        } else {
            retroDiv.style.display = 'none';
            document.getElementById('editMaster_UpdateLogs').checked = false;
        }
    },

    handleResignClick() {
        const id = document.getElementById('empEditId').value;
        const name = document.getElementById('empEditName').value;
        if(!id) return;
        this.terminateStaff(id, name);
    },

    async handleReactivateClick() {
        if(!confirm('ต้องการปรับสถานะพนักงานนี้กลับเป็น Active ใช่หรือไม่?')) return;
        
        // แค่เซ็ตสถานะใน UI เป็น 1 แล้วกด Save เอง หรือจะยิง API เลยก็ได้
        // วิธีง่ายสุด: เปลี่ยนค่าใน Hidden แล้วสั่ง Save
        document.getElementById('currentActiveStatus').value = '1';
        document.getElementById('empEditResignDate').value = ''; // เคลียร์วันลาออก
        await this.saveEmployee(); // Reuse Save Logic
    },

    // 5. Save Function (Updated to use hidden status)
    async saveEmployee() {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;
        
        // 1. ป้องกัน Double Submit
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

        try {
            // 2. ดึง Element แบบปลอดภัย (Defensive Check)
            const elRetroCheck = document.getElementById('editMaster_UpdateLogs');
            const elRetroDate = document.getElementById('editMaster_EffectiveDate');
            const elActiveStatus = document.getElementById('currentActiveStatus');
            const elIsEdit = document.getElementById('isEditMode');

            // 3. ตรวจสอบเงื่อนไขการอัปเดตย้อนหลัง
            const needRetroUpdate = elRetroCheck ? elRetroCheck.checked : false;
            const retroDate = elRetroDate ? elRetroDate.value : null;

            if (needRetroUpdate && !retroDate) {
                throw new Error('กรุณาระบุ "มีผลตั้งแต่วันที่" หากต้องการอัปเดตย้อนหลัง');
            }

            // 4. เตรียม Payload
            const payload = {
                action: (elIsEdit && elIsEdit.value === '1') ? 'update_employee' : 'create_employee',
                emp_id: document.getElementById('empEditId').value.trim(),
                name_th: document.getElementById('empEditName').value.trim(),
                position: document.getElementById('empEditPos').value.trim(),
                line: document.getElementById('empEditLine').value,
                shift_id: document.getElementById('empEditShift').value,
                team_group: document.getElementById('empEditTeam').value,
                is_active: elActiveStatus ? parseInt(elActiveStatus.value) : 1,
                start_date: document.getElementById('empEditStartDate').value,
                resign_date: document.getElementById('empEditResignDate').value,
                update_logs: needRetroUpdate ? 1 : 0,
                effective_date: needRetroUpdate ? retroDate : null, 
            };

            // 5. Validation เบื้องต้น
            if(!payload.emp_id || !payload.name_th) {
                throw new Error('กรุณากรอกรหัสพนักงานและชื่อให้ครบถ้วน');
            }

            // 6. ยิง API ไปที่ api_master_data.php
            const res = await fetch('api/api_master_data.php', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload) 
            });
            
            const json = await res.json();
            
            if(json.success) { 
                // 7. ปิด Modal และรีโหลดข้อมูล
                const editModalEl = document.getElementById('empEditModal');
                const editModal = bootstrap.Modal.getInstance(editModalEl);
                if (editModal) editModal.show(); // บางครั้งเรียก hide ไม่ไป ให้ลองเช็ค instance
                editModal.hide();

                // รีเฟรชตารางเบื้องหลัง
                if (typeof App !== 'undefined') await App.loadData(true); 
                
                // ถ้าเปิดหน้า Employee Manager ค้างไว้ให้รีโหลดด้วย
                const empListModal = document.getElementById('empListModal');
                if(empListModal && empListModal.classList.contains('show')) {
                    this.openEmployeeManager(true); 
                }
                
                // ถ้ามาจากหน้า Detail Modal ให้รีโหลดข้อมูลคนในไลน์นั้น
                if (typeof this.fetchDetailData === 'function' && document.getElementById('detailModal').classList.contains('show')) {
                    await this.fetchDetailData(); 
                }
                
                alert('✅ บันทึกข้อมูลเรียบร้อย');
            } else { 
                throw new Error(json.message);
            }

        } catch(e) {
            console.error("Save Error:", e);
            alert('❌ Failed: ' + e.message);
        } finally {
            // 8. คืนค่าสถานะปุ่ม
            btn.disabled = false; 
            btn.innerHTML = originalHtml;
        }
    },

    // =========================================================================
    // OPEN REPORT MODAL (FIXED)
    // =========================================================================
    openReportModal() {
        const modalEl = document.getElementById('reportRangeModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // 1. Set Default Dates (Current Week)
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + 1; 
        const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        document.getElementById('reportStartDate').value = firstDay;
        document.getElementById('reportEndDate').value = today;

        // 2. Populate Line Dropdown (FIXED UNDEFINED ISSUE)
        const lineSelect = document.getElementById('rpt_line');
        if (this._structureCache && this._structureCache.lines) {
            lineSelect.innerHTML = '<option value="ALL">All Lines</option>';
            
            this._structureCache.lines.forEach(item => {
                // แก้บั๊ก: ตรวจสอบว่า item เป็น object ({line: 'A'}) หรือ string ('A')
                const lineName = (typeof item === 'object' && item.line) ? item.line : item;
                
                if (lineName) {
                    lineSelect.innerHTML += `<option value="${lineName}">${lineName}</option>`;
                }
            });
        }

        // 3. Attach Auto-Load Events
        const filters = ['rpt_line', 'rpt_shift', 'rpt_type', 'reportStartDate', 'reportEndDate'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // ลบ Event เก่า (ถ้ามี) แล้วใส่ใหม่
                el.onchange = null; 
                el.onchange = () => this.loadExecutiveReport();
            }
        });

        modal.show();
        this.loadExecutiveReport(); 
    },

    // =========================================================================
    // LOAD DATA & CALCULATE STATS
    // =========================================================================
    async loadExecutiveReport() {
        // 1. ดึงค่าจาก Input
        const sDate = document.getElementById('reportStartDate').value;
        const eDate = document.getElementById('reportEndDate').value;
        const line  = document.getElementById('rpt_line').value;
        const shift = document.getElementById('rpt_shift').value;
        const type  = document.getElementById('rpt_type').value;

        // Validation
        if(!sDate || !eDate) return alert("Please select dates");

        // 2. แสดงสถานะ Loading UI (...)
        const loadingIds = ['rpt_hc', 'rpt_actual', 'rpt_absent', 'rpt_leave', 
                            'hc_max', 'hc_min', 'hc_avg', 
                            'act_max', 'act_min', 'act_avg',
                            'abs_max', 'abs_min', 'abs_avg',
                            'lev_max', 'lev_min', 'lev_avg'];
        
        loadingIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = '...';
        });

        try {
            // 3. ยิง API พร้อม Parameter ครบชุด
            // ใช้ encodeURIComponent เพื่อป้องกันปัญหากรณีชื่อไลน์มีช่องว่างหรืออักขระพิเศษ
            const url = `api/api_daily_operations.php?action=read_range_report` +
                        `&startDate=${sDate}` +
                        `&endDate=${eDate}` +
                        `&line=${encodeURIComponent(line)}` +
                        `&shift=${encodeURIComponent(shift)}` +
                        `&type=${encodeURIComponent(type)}`;
            
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                const h = json.header; // ข้อมูล Header (ยอดรวม)
                const t = json.trend;  // ข้อมูล Trend (รายวัน)

                // ---------------------------------------------------------
                // ส่วนที่ 1: อัปเดตตัวเลขการ์ดใหญ่ (Big Numbers)
                // ---------------------------------------------------------
                // ใช้ Total_Headcount ตามที่ SQL ส่งมา (ไม่ต้องแปลงชื่อ)
                UI.animateNumber('rpt_hc', h.Total_Headcount || 0);
                
                // แสดงยอด เข้าใหม่ / ลาออก
                document.getElementById('rpt_new').innerText = `+${h.New_Joiners || 0} / -${h.Total_Resigned || 0}`; 
                const elNew = document.getElementById('rpt_new');
                if (elNew) {
                    // แต่งสีหน่อย: เข้าเขียว / ออกแดง
                    elNew.innerHTML = `<span class="text-success">+${h.New_Joiners || 0}</span> / <span class="text-danger">-${h.Total_Resigned || 0}</span>`;
                }
                
                UI.animateNumber('rpt_actual', h.Total_Present_ManDays || 0);
                UI.animateNumber('rpt_absent', h.Total_Absent || 0);
                UI.animateNumber('rpt_leave', h.Total_Leave || 0);

                // ---------------------------------------------------------
                // ส่วนที่ 2: คำนวณค่าสถิติ (Max/Min/Avg) สำหรับตารางเล็ก
                // ---------------------------------------------------------
                const calcStats = (data, key) => {
                    // Default Structure
                    const res = { max: 0, min: 0, avg: 0, last: 0 };
                    
                    if (!data || data.length === 0) return res;
                    
                    let max = -Infinity, min = Infinity, sum = 0, count = 0;

                    data.forEach(d => {
                        const val = parseInt(d[key] || 0);
                        if (val >= 0) { // นับเฉพาะค่าที่เป็นบวก
                            if (val > max) max = val;
                            if (val < min && val > 0) min = val; // Min ไม่นับ 0 (ถ้าต้องการนับให้ลบ && val > 0)
                            sum += val;
                            count++;
                        }
                    });

                    // Handle Infinity
                    if (min === Infinity) min = 0;
                    if (max === -Infinity) max = 0;

                    res.max = max;
                    res.min = min;
                    res.avg = count > 0 ? (sum / count).toFixed(1) : 0;
                    
                    // 🔥 [NEW] ค่าล่าสุด (ตัวสุดท้ายของ Array)
                    const lastItem = data[data.length - 1];
                    res.last = lastItem ? parseInt(lastItem[key] || 0) : 0;

                    return res;
                };

                // Helper: Render ลง HTML
                const renderStats = (prefix, stats) => {
                    const setVal = (suffix, val) => {
                        const el = document.getElementById(`${prefix}_${suffix}`);
                        if(el) el.innerText = val;
                    };
                    setVal('max', stats.max);
                    setVal('min', stats.min);
                    setVal('avg', stats.avg);
                    setVal('last', stats.last);
                };

                // เรียกใช้งาน
                renderStats('hc',  calcStats(t, 'Daily_HC'));
                renderStats('act', calcStats(t, 'Daily_Actual'));
                renderStats('abs', calcStats(t, 'Daily_Absent'));
                renderStats('lev', calcStats(t, 'Daily_Leave'));
                // ---------------------------------------------------------
                // ส่วนที่ 3: วาดกราฟ (Chart)
                // ---------------------------------------------------------
                this.renderReportChart(t);
            }
        } catch (err) {
            console.error("Error loading report:", err);
            // alert("Failed to load report data"); // ปิดไว้ก็ได้ถ้าไม่อยากให้เด้งรบกวน
        }
    },

    // =========================================================================
    // RENDER CHART (Stacked Bar with Advanced Tooltip)
    // =========================================================================
    renderReportChart(data) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        
        // ทำลายกราฟเก่าทิ้งก่อนวาดใหม่ (ป้องกันกราฟซ้อนกัน)
        if (window.reportChartObj) {
            window.reportChartObj.destroy();
        }

        window.reportChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                // แกน X: วันที่ (แปลงเป็น วว/ดด)
                labels: data.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth()+1}`;
                }),
                datasets: [
                    {
                        label: 'Actual (มา)',
                        data: data.map(d => d.Daily_Actual),
                        backgroundColor: '#1cc88a', // สีเขียว
                        borderRadius: 4,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Leave (ลา)',
                        data: data.map(d => d.Daily_Leave),
                        backgroundColor: '#36b9cc', // สีฟ้า
                        borderRadius: 4,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Absent (ขาด)',
                        data: data.map(d => d.Daily_Absent),
                        backgroundColor: '#e74a3b', // สีแดง
                        borderRadius: 4,
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index', // Hover จุดเดียว แสดงข้อมูลทุกแท่งในวันนั้น
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            // 🔥 เพิ่ม Footer แสดงยอดรวม และยอด Movement (เข้า/ออก)
                            footer: function(tooltipItems) {
                                // 1. หา index ของข้อมูลที่ Hover อยู่
                                const dataIndex = tooltipItems[0].dataIndex;
                                
                                // 2. ดึงข้อมูลดิบของวันนั้นจาก Array 'data'
                                const dayData = data[dataIndex];

                                // 3. คำนวณยอดรวม Stack (มา+ลา+ขาด)
                                let totalStack = 0;
                                tooltipItems.forEach(function(tooltipItem) {
                                    totalStack += tooltipItem.parsed.y;
                                });

                                // 4. สร้างข้อความที่จะแสดง
                                return `----------------\n` +
                                       `Total Accounted: ${totalStack} คน\n` +
                                       `New Joiners: +${dayData.Daily_New || 0}\n` +
                                       `Resigned: -${dayData.Daily_Resigned || 0}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        stacked: true, // กราฟแท่งแบบซ้อน
                        grid: { display: false } 
                    },
                    y: { 
                        stacked: true, 
                        beginAtZero: true 
                    }
                }
            }
        });
    },

    openSimulationModal() {
        const modal = new bootstrap.Modal(document.getElementById('costCompareModal'));
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const toLocalISO = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().split('T')[0];
        };

        const mainDateVal = document.getElementById('filterDate').value;
        
        document.getElementById('simStartDate').value = toLocalISO(firstDay); 
        document.getElementById('simEndDate').value = mainDateVal || toLocalISO(today);

        document.getElementById('simSummarySection').style.display = 'none';
        document.getElementById('simTableBody').innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Ready to analyze range...</td></tr>`;
        
        modal.show();
    },

    async runSimulation() {
        const sDate = document.getElementById('simStartDate').value;
        const eDate = document.getElementById('simEndDate').value;
        
        if(!sDate || !eDate) {
            alert("Please select both Start and End dates.");
            return;
        }

        const tbody = document.getElementById('simTableBody');
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;

        // 1. UI State: Loading
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary"></div><br>Calculating...</td></tr>`;
        
        try {
            const res = await fetch(`api/api_daily_operations.php?action=compare_cost&startDate=${sDate}&endDate=${eDate}`);
            const json = await res.json();

            if(json.success) {
                // 2. Render Summary Cards (3 กล่องบน)
                const sum = json.summary;
                document.getElementById('simSummarySection').style.display = 'flex';
                
                this.animateNumber('sim_old_total', Math.round(sum.total_old));
                this.animateNumber('sim_new_total', Math.round(sum.total_new));
                
                const diffEl = document.getElementById('sim_diff_total');
                const diffCard = document.getElementById('sim_diff_card');
                const percentEl = document.getElementById('sim_diff_percent');
                
                if(diffEl) diffEl.innerText = (sum.diff > 0 ? '+' : '') + Math.round(sum.diff).toLocaleString();
                if(percentEl) percentEl.innerText = (sum.diff > 0 ? '+' : '') + sum.percent.toFixed(2) + '%';

                if(diffCard) {
                    diffCard.className = 'card h-100 shadow-sm text-white';
                    if(sum.diff > 0) diffCard.classList.add('bg-danger'); 
                    else if(sum.diff < 0) diffCard.classList.add('bg-success');
                    else diffCard.classList.add('bg-secondary');
                }

                // 3. Render Table Body (วาดตารางใหม่ทั้งหมด)
                let html = '';
                const fmt = (n) => Math.round(parseFloat(n || 0)).toLocaleString();

                if (!json.data || json.data.length === 0) {
                    html = `<tr><td colspan="9" class="text-center py-4">No data found</td></tr>`;
                } else {
                    json.data.forEach(row => {
                        const oldT = parseFloat(row.old_total || 0);
                        const newT = parseFloat(row.new_total || 0);
                        const diffVal = parseFloat(row.diff_amount || 0);
                        const diffClass = diffVal > 0 ? 'text-danger fw-bold' : (diffVal < 0 ? 'text-success fw-bold' : 'text-muted');
                        
                        html += `
                            <tr>
                                <td class="fw-bold text-dark ps-3">${row.line_name}</td>
                                <td class="text-end text-secondary small font-monospace">${fmt(row.old_dl)}</td>
                                <td class="text-end text-secondary small font-monospace">${fmt(row.old_ot)}</td>
                                <td class="text-end bg-light fw-bold text-secondary font-monospace border-end">${fmt(oldT)}</td>
                                <td class="text-end text-primary small font-monospace">${fmt(row.new_dl)}</td>
                                <td class="text-end text-primary small font-monospace">${fmt(row.new_ot)}</td>
                                <td class="text-end bg-light fw-bold text-primary font-monospace border-end">${fmt(newT)}</td>
                                <td class="text-end ${diffClass} font-monospace">${diffVal > 0 ? '+' : ''}${fmt(diffVal)}</td>
                                <td class="text-center small text-muted">${oldT > 0 ? ((diffVal/oldT)*100).toFixed(1) : 0}%</td>
                            </tr>`;
                    });
                }
                tbody.innerHTML = html;

            } else {
                alert('Error: ' + json.message);
            }
        } catch(err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-5">Analysis Failed</td></tr>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    },

    // -------------------------------------------------------------------------
    // 7. MAPPING & SHIFT PLANNER
    // -------------------------------------------------------------------------
    async openShiftPlanner() {
        const modal = new bootstrap.Modal(document.getElementById('shiftPlannerModal'));
        document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>`;
        modal.show();
        try {
            const res = await fetch('api/api_master_data.php?action=read_team_shifts');
            const json = await res.json();
            if (json.success) this.renderShiftPlannerTable(json.data);
        } catch (err) { console.error(err); }
    },
    renderShiftPlannerTable(teams) {
        const tbody = document.getElementById('shiftPlannerBody'); tbody.innerHTML = '';
        let currentLine = null;
        teams.forEach(t => {
            if (t.line !== currentLine) { currentLine = t.line; tbody.innerHTML += `<tr class="table-secondary fw-bold"><td colspan="4">${currentLine}</td></tr>`; }
            const isDay = (t.default_shift_id == 1);
            const shiftBadge = isDay ? `<span class="badge bg-info text-dark">DAY</span>` : `<span class="badge bg-dark">NIGHT</span>`;
            const btnClass = isDay ? 'btn-outline-dark' : 'btn-outline-info';
            const btnLabel = isDay ? 'To Night' : 'To Day';
            tbody.innerHTML += `<tr><td class="ps-4 fw-bold text-primary">${t.team_group || '-'}</td><td class="text-center">${shiftBadge}</td><td class="text-center">${t.default_shift_id}</td><td class="text-center pe-4"><button class="btn btn-sm ${btnClass}" onclick="Actions.switchTeamShift('${t.line}', '${t.team_group}', ${isDay ? 2 : 1})">${btnLabel}</button></td></tr>`;
        });
    },
    async switchTeamShift(line, team, newShiftId) {
        if (!confirm(`Switch [${line} - ${team}] to ${newShiftId==1?'DAY':'NIGHT'}?`)) return;
        try {
            const res = await fetch('api/api_master_data.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_team_shift', line, team, new_shift_id: newShiftId }) });
            const json = await res.json();
            if (json.success) { this.openShiftPlanner(); } else alert(json.message);
        } catch (err) { alert(err.message); }
    },

    _mappingCache: [],
    async openMappingManager() {
        const modal = new bootstrap.Modal(document.getElementById('mappingModal'));
        modal.show();
        const res = await fetch('api/api_master_data.php?action=read_mappings');
        const json = await res.json();
        if (json.success) this.renderMappingTable(json.categories);
    },
    renderMappingTable(list) {
        const tbody = document.getElementById('mappingBody'); tbody.innerHTML = '';
        list.forEach((item, index) => {
            tbody.innerHTML += `<tr><td class="ps-4 fw-bold">${item.keyword}</td><td><span class="badge bg-light text-dark border">${item.category_name}</span></td><td class="text-center"><button class="btn btn-sm text-danger" onclick="Actions.deleteMapping(${index})"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        });
        this._mappingCache = list;
    },
    async addMapping() {
        const key = document.getElementById('newMapKeyword').value.trim();
        const type = document.getElementById('newMapType').value.trim();
        if (!key || !type) return alert('Required fields missing');
        this._mappingCache.push({ keyword: key, category_name: type });
        await this.saveMappings();
        this.renderMappingTable(this._mappingCache);
        document.getElementById('newMapKeyword').value = '';
    },
    async deleteMapping(index) {
        if(!confirm('Delete mapping?')) return;
        this._mappingCache.splice(index, 1);
        await this.saveMappings();
        this.renderMappingTable(this._mappingCache);
    },
    async saveMappings() {
        await fetch('api/api_master_data.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_mappings', categories: this._mappingCache }) });
    },

    // Internal Logic for Tab 1: Operation
    async runExecutiveReportInternal(sDate, eDate, line) {
        try {
            const url = `api/api_daily_operations.php?action=read_range_report` +
                        `&startDate=${sDate}&endDate=${eDate}` +
                        `&line=${encodeURIComponent(line)}&shift=ALL&type=ALL`; // Default shift/type to ALL
            
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                const h = json.header;
                const t = json.trend;

                // 1. Big Cards
                UI.animateNumber('rpt_hc', h.Total_Headcount || 0);
                UI.animateNumber('rpt_actual', h.Total_Present_ManDays || 0);
                UI.animateNumber('rpt_absent', h.Total_Absent || 0);
                UI.animateNumber('rpt_leave', h.Total_Leave || 0);

                // 2. New/Resigned Label
                const elNew = document.getElementById('rpt_new');
                if (elNew) elNew.innerHTML = `Move: <span class="text-success">+${h.New_Joiners || 0}</span> / <span class="text-danger">-${h.Total_Resigned || 0}</span>`;

                // 3. Stats (Min/Max/Avg) Helper
                const calcStats = (data, key) => {
                    if (!data || data.length === 0) return { max: 0, min: 0, avg: 0 };
                    let max = -Infinity, min = Infinity, sum = 0, count = 0;
                    data.forEach(d => {
                        const val = parseInt(d[key] || 0);
                        if (val >= 0) {
                            if (val > max) max = val;
                            if (val < min && val > 0) min = val;
                            sum += val; count++;
                        }
                    });
                    return { 
                        max: max === -Infinity ? 0 : max, 
                        min: min === Infinity ? 0 : min, 
                        avg: count > 0 ? (sum/count).toFixed(1) : 0 
                    };
                };

                const setStats = (prefix, stats) => {
                    if(document.getElementById(`${prefix}_max`)) document.getElementById(`${prefix}_max`).innerText = stats.max;
                    if(document.getElementById(`${prefix}_min`)) document.getElementById(`${prefix}_min`).innerText = stats.min;
                    if(document.getElementById(`${prefix}_avg`)) document.getElementById(`${prefix}_avg`).innerText = stats.avg;
                };

                setStats('hc', calcStats(t, 'Daily_HC'));
                setStats('act', calcStats(t, 'Daily_Actual'));
                setStats('abs', calcStats(t, 'Daily_Absent'));
                setStats('lev', calcStats(t, 'Daily_Leave'));

                // 4. Render Chart
                UI.renderReportChart(t);
            }
        } catch(err) {
            console.error("Exec Report Error:", err);
        }
    },

    async runCostSimulationInternal(sDate, eDate, line) {
        try {
            const res = await fetch(`api/api_daily_operations.php?action=compare_cost&startDate=${sDate}&endDate=${eDate}`);
            const json = await res.json();

            if(json.success) {
                let data = json.data;
                if (line !== 'ALL') {
                    data = data.filter(r => r.line_name === line);
                }

                let totalOld = 0, totalNew = 0;
                data.forEach(r => {
                    totalOld += parseFloat(r.old_total || 0);
                    totalNew += parseFloat(r.new_total || 0);
                });
                const diff = totalNew - totalOld;
                const percent = totalOld > 0 ? ((diff / totalOld) * 100) : 0;

                UI.animateNumber('sim_old_total', Math.round(totalOld));
                UI.animateNumber('sim_new_total', Math.round(totalNew));
                
                const diffEl = document.getElementById('sim_diff_total');
                const diffCard = document.getElementById('sim_diff_card');
                const percentEl = document.getElementById('sim_diff_percent');
                
                if(diffEl) diffEl.innerText = (diff > 0 ? '+' : '') + Math.round(diff).toLocaleString();
                if(percentEl) percentEl.innerText = (diff > 0 ? '+' : '') + percent.toFixed(2) + '%';

                if(diffCard) {
                    diffCard.className = 'card border-0 h-100 shadow text-white';
                    if(diff > 0) diffCard.style.backgroundColor = '#e74a3b';
                    else if(diff < 0) diffCard.style.backgroundColor = '#1cc88a';
                    else diffCard.style.backgroundColor = '#858796';
                }

                const tbody = document.getElementById('simTableBody');
                tbody.innerHTML = '';
                const fmt = (n) => Math.round(parseFloat(n)).toLocaleString();

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No data for selected criteria</td></tr>`;
                    return;
                }

                data.forEach(row => {
                    const rDiff = parseFloat(row.diff_amount);
                    const rDiffClass = rDiff > 0 ? 'text-danger fw-bold' : (rDiff < 0 ? 'text-success fw-bold' : 'text-muted');
                    const rPrefix = rDiff > 0 ? '+' : '';
                    const rPct = parseFloat(row.old_total) > 0 ? ((rDiff / parseFloat(row.old_total)) * 100).toFixed(1) + '%' : '-';

                    tbody.innerHTML += `
                        <tr>
                            <td class="fw-bold text-dark ps-3">${row.line_name}</td>
                            
                            <td class="text-end text-secondary small font-monospace">${fmt(row.old_dl)}</td>
                            <td class="text-end text-secondary small font-monospace">${fmt(row.old_ot)}</td>
                            <td class="text-end bg-light fw-bold text-secondary font-monospace border-end">${fmt(row.old_total)}</td>
                            
                            <td class="text-end text-primary small font-monospace">${fmt(row.new_dl)}</td>
                            <td class="text-end text-primary small font-monospace">${fmt(row.new_ot)}</td>
                            <td class="text-end bg-light fw-bold text-primary font-monospace border-end">${fmt(row.new_total)}</td>
                            
                            <td class="text-end ${rDiffClass} font-monospace">${rPrefix}${fmt(rDiff)}</td>
                            <td class="text-center small text-muted">${rPct}</td>
                        </tr>
                    `;
                });
            }
        } catch(err) {
            console.error("Cost Sim Error:", err);
            document.getElementById('simTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error loading cost data</td></tr>`;
        }
    },

    exportSimTable() {
        // 1. เช็คว่ามีข้อมูลให้ Export ไหม
        if (!this._cachedAnalysisData) {
            alert("กรุณากด Run Analysis เพื่อโหลดข้อมูลก่อน Export");
            return;
        }

        const { summary, financials, trend } = this._cachedAnalysisData;
        const wb = XLSX.utils.book_new();

        // =========================================================
        // SHEET 1: Financial Impact (หน้าสรุปต้นทุน)
        // =========================================================
        if (financials && financials.length > 0) {
            // จัด Format ข้อมูลให้สวยงามสำหรับ Excel
            const finData = financials.map(row => {
                const diff = row.cost_actual - row.cost_standard;
                const pct = row.cost_standard > 0 ? ((diff / row.cost_standard) * 100).toFixed(2) + '%' : '0%';
                
                return {
                    "Section / Line": row.section_name,
                    "Old Logic (Std)": row.cost_standard,
                    "New Logic (Act)": row.cost_actual,
                    "Diff Amount": diff,
                    "% Variance": pct,
                    "Actual DL Cost": row.actual_dl,
                    "Actual OT Cost": row.actual_ot
                };
            });

            // สร้าง Sheet
            const wsFin = XLSX.utils.json_to_sheet(finData);

            // ปรับความกว้างคอลัมน์ (Auto Width แบบบ้านๆ)
            const wscols = [
                {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 15}
            ];
            wsFin['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, wsFin, "Financial Impact");
        }

        // =========================================================
        // SHEET 2: Daily Trend (ข้อมูลรายวัน) - แถมให้!
        // =========================================================
        if (trend && trend.length > 0) {
            const trendData = trend.map(t => ({
                "Date": t.log_date,
                "Total HC": t.Daily_HC,
                "Present": t.Act_Present,
                "Late": t.Act_Late || 0,
                "Absent": t.Act_Absent,
                "Leave": t.Act_Leave
            }));

            const wsTrend = XLSX.utils.json_to_sheet(trendData);
            XLSX.utils.book_append_sheet(wb, wsTrend, "Daily Trend");
        }

        // =========================================================
        // 3. SAVE FILE
        // =========================================================
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Manpower_Analysis_Report_${dateStr}.xlsx`);
    },

    renderSimulationTable(data, apiSummary, isAllLines, targetTbodyId = 'simTableBody') {
        const tbody = document.getElementById(targetTbodyId); // ใช้ ID ที่ส่งมา
        if(!tbody) return;

        let html = '';
        const fmt = (n) => Math.round(parseFloat(n || 0)).toLocaleString();

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        data.forEach(row => {
            const oldT = parseFloat(row.old_total || 0);
            const newT = parseFloat(row.new_total || 0);
            const diff = parseFloat(row.diff_amount || 0);
            const diffClass = diff > 0 ? 'text-danger fw-bold' : (diff < 0 ? 'text-success fw-bold' : 'text-muted');
            
            html += `
                <tr>
                    <td class="fw-bold text-dark ps-3">${row.line_name}</td>
                    <td class="text-end small font-monospace">${fmt(row.old_dl)}</td>
                    <td class="text-end small font-monospace">${fmt(row.old_ot)}</td>
                    <td class="text-end bg-light fw-bold border-end">${fmt(oldT)}</td>
                    <td class="text-end text-primary small font-monospace">${fmt(row.new_dl)}</td>
                    <td class="text-end text-primary small font-monospace">${fmt(row.new_ot)}</td>
                    <td class="text-end bg-primary bg-opacity-10 fw-bold text-primary border-end">${fmt(newT)}</td>
                    <td class="text-end ${diffClass}">${diff > 0 ? '+' : ''}${fmt(diff)}</td>
                    <td class="text-center small text-muted">${oldT > 0 ? ((diff / oldT) * 100).toFixed(1) : 0}%</td>
                </tr>`;
        });
        tbody.innerHTML = html;
    },

    openIntegratedAnalysis() {
        const modalEl = document.getElementById('integratedAnalysisModal');
        if (!modalEl) return;
        
        // 1. ตั้งค่า Default Date (ต้นเดือน - ปัจจุบัน)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const toLocalISO = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const startInput = document.getElementById('ia_startDate');
        const endInput = document.getElementById('ia_endDate');
        const lineSelect = document.getElementById('superLineSelect');
        
        // Set Date Values
        if(startInput) startInput.value = toLocalISO(firstDay);
        if(endInput) endInput.value = document.getElementById('filterDate').value || toLocalISO(today);

        // 2. ✅ Auto-Refresh Setup: ผูก Event Listener ให้ทำงานทันทีเมื่อค่าเปลี่ยน
        const inputs = [startInput, endInput, lineSelect];
        inputs.forEach(el => {
            if (el) {
                // ล้าง Event เก่า (ถ้ามี) แล้วใส่ใหม่
                el.onchange = null;
                el.onchange = () => {
                    // ตรวจสอบว่าวันที่ครบไหมก่อนรัน (กัน Error)
                    if (startInput.value && endInput.value) {
                        this.runSuperAnalysis();
                    }
                };
            }
        });

        // 3. โหลด Dropdown Line (ถ้ายังไม่เคยโหลด)
        UI.populateAnalysisDropdown(); 

        // 4. เปิด Modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // 5. รันครั้งแรกทันที (Initial Run)
        setTimeout(() => this.runSuperAnalysis(), 300);
    },

    async runSuperAnalysis() {
        const start = document.getElementById('ia_startDate').value;
        const end = document.getElementById('ia_endDate').value;
        const line = document.getElementById('superLineSelect')?.value || 'ALL';
        
        UI.showLoader();
        
        try {
            const response = await fetch(`api/api_daily_operations.php?action=integrated_analysis&startDate=${start}&endDate=${end}&line=${encodeURIComponent(line)}`);
            const result = await response.json();
            
            if (result.success) {
                this._cachedAnalysisData = result.data;
                const { summary, trend, financials, distribution } = result.data;

                // --- 1. KPI & Stats Calculation Helper ---
                const calcStats = (dataArray, key) => {
                    if (!dataArray || dataArray.length === 0) return { max: 0, min: 0, avg: 0 };
                    let max = -Infinity, min = Infinity, sum = 0, count = 0;
                    dataArray.forEach(d => {
                        const val = parseInt(d[key] || 0);
                        if (val > max) max = val;
                        if (val < min) min = val;
                        sum += val; count++;
                    });
                    return { max: max === -Infinity ? 0 : max, min: min === Infinity ? 0 : min, avg: count > 0 ? (sum / count).toFixed(1) : 0 };
                };

                const setCardStats = (prefix, totalVal, statsObj) => {
                    UI.animateNumber(`ia_rpt_${prefix}`, totalVal);
                    if(document.getElementById(`ia_rpt_${prefix}_max`)) document.getElementById(`ia_rpt_${prefix}_max`).innerText = statsObj.max;
                    if(document.getElementById(`ia_rpt_${prefix}_min`)) document.getElementById(`ia_rpt_${prefix}_min`).innerText = statsObj.min;
                    if(document.getElementById(`ia_rpt_${prefix}_avg`)) document.getElementById(`ia_rpt_${prefix}_avg`).innerText = statsObj.avg;
                };

                // Apply Data to Cards
                setCardStats('hc', summary.Total_Unique_HC, calcStats(trend, 'Daily_HC'));
                setCardStats('actual', summary.Total_Present_ManDays, calcStats(trend, 'Act_Present'));
                setCardStats('absent', summary.Total_Absent_ManDays, calcStats(trend, 'Act_Absent'));
                setCardStats('leave', summary.Total_Leave_ManDays, calcStats(trend, 'Act_Leave'));

                // 🔥 [ADDED] Logic สำหรับ Movement Badge (เข้า/ออก) บนการ์ด HC
                const elAttr = document.getElementById('ia_rpt_attrition');
                if (elAttr) {
                    const newJoin = parseInt(summary.New_Joiners || 0);
                    const resign  = parseInt(summary.Resigned || 0);
                    
                    if (newJoin === 0 && resign === 0) {
                        elAttr.className = "badge bg-light text-muted border";
                        elAttr.innerHTML = `<i class="fas fa-minus me-1"></i>Stable`;
                    } else {
                        elAttr.className = "badge bg-white border text-dark";
                        elAttr.innerHTML = `
                            <span class="text-success fw-bold"><i class="fas fa-plus"></i> ${newJoin}</span>
                            <span class="text-muted mx-1">|</span>
                            <span class="text-danger fw-bold"><i class="fas fa-minus"></i> ${resign}</span>
                        `;
                    }
                }

                // --- 2. Financials ---
                UI.renderIntegratedFinancialTable(financials, 'ia_simTableBody');
                
                // Calculate Variance
                const totalStd = financials.reduce((sum, row) => sum + row.cost_standard, 0);
                const totalAct = financials.reduce((sum, row) => sum + row.cost_actual, 0);
                const diffVal = totalAct - totalStd;
                const diffPct = totalStd > 0 ? ((diffVal / totalStd) * 100) : 0;
                
                UI.animateNumber('sim_old_total', Math.round(totalStd));
                UI.animateNumber('sim_new_total', Math.round(totalAct));
                
                const diffEl = document.getElementById('sim_diff_total');
                if(diffEl) diffEl.innerText = (diffVal > 0 ? '+' : '') + Math.round(diffVal).toLocaleString();
                
                const pctEl = document.getElementById('sim_diff_percent');
                if(pctEl) {
                    pctEl.innerText = (diffPct > 0 ? '+' : '') + diffPct.toFixed(2) + '%';
                    // Dynamic Color
                    pctEl.parentElement.className = `badge ${diffPct > 5 ? 'bg-danger' : (diffPct < -5 ? 'bg-success' : 'bg-secondary')} p-2`;
                }

                // --- 3. CHARTS RENDERING (4 Charts Layout) ---
                
                // A. Trend Line
                UI.renderIntegratedLineChart(trend);

                // B. Donut 1: Workforce Structure
                UI.renderIntegratedStructureDonut(distribution); 

                // C. Combo Chart
                UI.renderIntegratedComboChart(trend);

                // D. Donut 2: Attendance Ratio 
                const sumPresent = trend.reduce((s, d) => s + parseInt(d.Act_Present || 0), 0);
                const sumLate    = trend.reduce((s, d) => s + parseInt(d.Act_Late || 0), 0);
                const sumAbsent  = trend.reduce((s, d) => s + parseInt(d.Act_Absent || 0), 0);
                const sumLeave   = trend.reduce((s, d) => s + parseInt(d.Act_Leave || 0), 0);
                
                UI.renderIntegratedAttendanceDonut([sumPresent, sumLate, sumAbsent, sumLeave]);

                UI.renderFinancialAnalysis(financials);

            } else {
                alert("Analysis Error: " + result.message);
            }
        } catch (err) {
            console.error("Critical Analysis Error:", err);
        } finally {
            UI.hideLoader();
        }
    }
};
