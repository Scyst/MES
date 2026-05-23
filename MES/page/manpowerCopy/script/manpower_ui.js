// page/manpower/script/manpower_ui.js
"use strict";

const UI = {
    charts: {},
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
        if (elLate) elLate.innerText = totalLate;

        const elLeave = document.getElementById('kpi-leave');
        if (elLeave) elLeave.innerText = totalLeave;

        const rate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : 0;
        const elRate = document.getElementById('kpi-rate');
        if (elRate) elRate.innerText = `${rate}% Rate`;

        const cardPlan = document.getElementById('card-plan');
        if (cardPlan) cardPlan.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ALL');

        const cardActual = document.getElementById('card-actual');
        if (cardActual) cardActual.onclick = () => Actions.openDetailModal('', '', 'ALL', 'PRESENT_AND_LATE');

        const cardAbsent = document.getElementById('card-absent');
        if (cardAbsent) cardAbsent.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ABSENT');

        const cardLate = document.getElementById('card-late');
        if (cardLate) {
            cardLate.onclick = (e) => {
                e.stopPropagation();
                Actions.openDetailModal('', '', 'ALL', 'LATE');
            };
        }

        const cardLeave = document.getElementById('card-leave');
        if (cardLeave) {
            cardLeave.onclick = (e) => {
                e.stopPropagation();
                Actions.openDetailModal('', '', 'ALL', 'LEAVE');
            };
        }
    },

    animateNumber(elementId, endValue) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        obj.innerText = endValue.toLocaleString();
    },

    renderCharts(data) {
        const labels = [];
        const dataPlan = [];
        const dataActual = [];
        const actualColors = [];
        const grouped = {};
        let sumPresent = 0, sumLate = 0, sumAbsent = 0, sumLeave = 0, sumPlan = 0;

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
            sumPlan += plan;
        });

        for (const [line, val] of Object.entries(grouped)) {
            labels.push(line);
            dataPlan.push(val.plan);
            dataActual.push(val.actual);
            const rate = val.plan > 0 ? (val.actual / val.plan) * 100 : 0;

            if (rate >= 95) {
                actualColors.push('#1cc88a');
            } else if (rate < 90) {
                actualColors.push('#e74a3b');
            } else {
                actualColors.push('#f6c23e');
            }
        }

        const ctxBar = document.getElementById('barChart').getContext('2d');
        if (this.charts.bar) this.charts.bar.destroy();

        const scrollContainer = document.querySelector('.chart-scroll-container');
        const chartWrapper = document.getElementById('barChartInnerWrapper');
        if (scrollContainer && chartWrapper) {
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
                        backgroundColor: actualColors,
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
                        if (lineName) Actions.openDetailModal(lineName, '', 'ALL', 'ALL');
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

        const sumOther = Math.max(0, sumPlan - (sumPresent + sumLate + sumAbsent + sumLeave));
        const newData = [sumPresent, sumLate, sumAbsent, sumLeave, sumOther];

        if (this.charts.pie) {
            this.charts.pie.data.datasets[0].data = newData;
            this.charts.pie.update();
        } else {
            const ctxPie = document.getElementById('pieChart').getContext('2d');
            this.charts.pie = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['Present', 'Late', 'Absent', 'Leave', 'Holiday/Wait'],
                    datasets: [{
                        data: newData,
                        backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc', '#858796'],
                        borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4
                    }]
                },
                options: {
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const statuses = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'HOLIDAY_WAITING'];
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

        const labels = data.map(r => r.display_date);
        const planData = data.map(r => parseInt(r.total_plan));
        const actualData = data.map(r => parseInt(r.total_actual));
        const absentData = data.map(r => parseInt(r.total_absent) + parseInt(r.total_leave));

        if (this.charts.trend) {
            const chart = this.charts.trend;

            chart.data.labels = labels;
            chart.data.datasets[0].data = planData;
            chart.data.datasets[1].data = actualData;
            chart.data.datasets[2].data = absentData;

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
                            borderColor: '#4e73df',
                            backgroundColor: 'rgba(78, 115, 223, 0.05)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Actual',
                            data: actualData,
                            borderColor: '#1cc88a',
                            backgroundColor: 'rgba(28, 200, 138, 0.05)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Absent & Leave',
                            data: absentData,
                            borderColor: '#e74a3b',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5],
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
                mainKey = row.line_name || 'Unassigned'; subKeyName = `${row.shift_name} ${row.team_group ? '(' + row.team_group + ')' : ''}`; itemKeyName = row.emp_type || 'General'; metaLine = mainKey; metaShift = shiftId;
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
        allItems.forEach(item => { if (item) item.diff = (item.actual || 0) - (item.plan || 0); });

        return { groups, grandTotal };
    },

    _initStats() {
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
        target.dl_count += (Number(source.dl_count) || 0);
        target.ot_count += (Number(source.ot_count) || 0);
        target.ot_hours += (Number(source.ot_hours) || 0);
    },

    _createRowHtml(label, stats, options = {}) {
        const { isGrand, isParent, isChild, isGrandChild, viewMode, rawName, meta, toggleTarget, rowClass, isHidden } = options;
        const fmt = (n) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(n) || 0);
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
            canClick = true;
            if (viewMode === 'LINE' || viewMode === 'GROUP') { tLine = rawName; }
            else if (viewMode === 'TYPE') { tType = rawName; }
            else if (viewMode === 'SHIFT') { tShift = (rawName.includes('Day')) ? '1' : '2'; }
            else if (viewMode === 'PAYMENT') { tType = rawName.includes('Monthly') ? 'RATE:MONTHLY' : 'RATE:DAILY'; }
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
            const cellClass = "text-end align-middle font-monospace " + hoverClass;
            const payableCount = (stats.present || 0) + (stats.late || 0) + (stats.leave || 0);

            columnsHtml = `
                <td class="text-center text-primary border-end border-light opacity-75 small align-middle ${hoverClass}" ${clickAttr('ALL')}>${stats.hc || '-'}</td>
                <td class="text-center text-success ${hoverClass} align-middle" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning ${hoverClass} align-middle" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass} align-middle" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info ${hoverClass} align-middle" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold bg-light border-start ${hoverClass} align-middle" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                
                <td class="text-center fw-bold text-primary bg-white border-start border-end align-middle ${hoverClass}" title="ยอดที่ต้องจ่ายเงิน (มา + ลา)" ${clickAttr('ALL')}>
                    ${payableCount > 0 ? payableCount : '-'}
                </td>
                
                <td class="${cellClass}" ${clickAttr('ALL')}>
                    <div class="text-primary fw-bold">฿ ${fmt(stats.dl)}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;"><i class="fas fa-user opacity-50 me-1"></i>${fmtNum(stats.dl_count)} คน</div>
                </td>
                <td class="${cellClass}" ${clickAttr('ALL')}>
                    <div class="text-danger fw-bold">฿ ${fmt(stats.ot)}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;">${fmtNum(stats.ot_count)} คน | ${fmtNum(stats.ot_hours)} ชม.</div>
                </td>
                <td class="${cellClass} pe-4 bg-light border-start" ${clickAttr('ALL')}>
                    <div class="text-dark fw-bold" style="font-size: 1.1em;">฿ ${fmt(stats.dlot)}</div>
                </td>
            `;
        } else {
            let diffClass = stats.diff < 0 ? 'text-danger fw-bold' : (stats.diff > 0 ? 'text-warning fw-bold text-dark' : 'text-success fw-bold');
            columnsHtml = `
                <td class="text-center text-primary border-end border-light opacity-75 small align-middle ${hoverClass}" ${clickAttr('ALL')}>${stats.hc || '-'}</td>
                <td class="text-center fw-bold align-middle ${hoverClass}" style="display: none;" ${clickAttr('ALL')}>${stats.plan}</td>
                <td class="text-center text-success ${hoverClass} align-middle" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning ${hoverClass} align-middle" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass} align-middle" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info ${hoverClass} align-middle" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end bg-light ${hoverClass} align-middle" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                <td class="text-center ${diffClass} align-middle ${hoverClass}" ${clickAttr('ALL')}>${stats.diff > 0 ? '+' : ''}${stats.diff}</td>
                <td class="text-end pe-4 text-secondary small align-middle font-monospace ${hoverClass}" ${clickAttr('ALL')}>${fmt(stats.cost)}</td>
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
        for (let i = 0; i < 5; i++) {
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
            return;
        }

        const thead = document.querySelector('#manpowerTable thead tr');
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

        const { groups, grandTotal } = this.processGroupedData(data, viewMode);

        tbody.innerHTML = '';
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true, viewMode });
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
                    viewMode,
                    meta: sub.meta,
                    rowClass: groupTarget,
                    isHidden: true,
                    toggleTarget: subTarget
                });

                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                sortedItems.forEach(item => {
                    tbody.innerHTML += this._createRowHtml(item.name, item, {
                        isGrandChild: true,
                        viewMode,
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
                    if (subIcon) subIcon.style.transform = 'rotate(0deg)';

                    const grandChildren = document.getElementsByClassName(nextTarget[1]);
                    for (let gc of grandChildren) gc.style.display = 'none';
                }
            }
        }

        if (icon) {
            icon.style.transition = 'transform 0.2s';
            icon.style.transform = isCurrentlyHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
    },

    showToast(message, type) { alert(message); },
    showLoader() { if (document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'block'; },
    hideLoader() { if (document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'none'; },

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

            if (footerDaily) footerDaily.style.display = 'block';
            if (footerTrend) footerTrend.style.setProperty('display', 'none', 'important');

        } else {
            btnDaily.classList.remove('active');
            btnTrend.classList.add('active');

            viewDaily.style.display = 'none';
            viewTrend.style.display = 'block';

            if (footerDaily) footerDaily.style.display = 'none';
            if (footerTrend) footerTrend.style.setProperty('display', 'flex', 'important');

            if (this.charts && this.charts.trend) {
                this.charts.trend.resize();
            }
        }
    },

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
                    return `${date.getDate()}/${date.getMonth() + 1}`;
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
                            footer: function (tooltipItems) {
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
            type: 'bar',
            data: {
                labels: data.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'Present (มา)',
                        data: data.map(d => d.Act_Present),
                        backgroundColor: '#1cc88a',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Leave (ลา)',
                        data: data.map(d => d.Act_Leave),
                        backgroundColor: '#36b9cc',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Absent (ขาด)',
                        data: data.map(d => d.Act_Absent),
                        backgroundColor: '#e74a3b',
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
                            footer: function (tooltipItems) {
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

        const tickColors = [];
        const tickWeights = [];

        data.forEach(d => {
            const planHc = parseInt(d.Daily_HC || 0);
            const present = parseInt(d.Act_Present || 0);
            const late = parseInt(d.Act_Late || 0);

            const totalActual = present + late;
            const rate = planHc > 0 ? (totalActual / planHc) * 100 : 100;

            if (planHc === 0) {
                tickColors.push('#858796');
                tickWeights.push('normal');
            } else if (rate < 90) {
                tickColors.push('#e74a3b');
                tickWeights.push('bold');
            } else if (rate < 95) {
                tickColors.push('#f39c12');
                tickWeights.push('bold');
            } else {
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
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 0
                    },
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
                                if (d.Daily_New > 0) txt += `New: +${d.Daily_New} `;
                                if (d.Daily_Resigned > 0) txt += `Resign: -${d.Daily_Resigned}`;
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
                            color: tickColors,
                            font: function (context) {
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

    renderIntegratedStructureDonut(data) {
        const ctx = document.getElementById('ia_structureDonut')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaStructDonut) this.charts.iaStructDonut.destroy();

        if (!data || data.length === 0) return;

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
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 11, family: 'Prompt' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(1);
                            return (percentage > 5) ? value : null;
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerTextStruct',
                beforeDraw: function (chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();

                    var shiftX = -65;
                    var shiftY = 0;

                    ctx.font = "bold 26px 'Prompt', sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#4e73df";
                    var text = totalHeadCount.toLocaleString();
                    var textX = Math.round((width - ctx.measureText(text).width) / 2) + shiftX;
                    var textY = (height / 2) + 10 + shiftY;
                    ctx.fillText(text, textX, textY);

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

    renderIntegratedAttendanceDonut(values) {
        const ctx = document.getElementById('ia_attendanceDonut')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.iaAttDonut) this.charts.iaAttDonut.destroy();

        const totalVal = values.reduce((a, b) => a + (parseInt(b) || 0), 0);
        if (totalVal === 0) return;

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
                beforeDraw: function (chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();
                    var d = chart.config.data.datasets[0].data;
                    var present = d[0] || 0;
                    var late = d[1] || 0;
                    var total = d.reduce((a, b) => a + b, 0);
                    var rate = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;

                    var shiftX = -40;
                    var shiftY = 0;

                    ctx.font = "bold 26px 'Prompt', sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = rate >= 95 ? "#1cc88a" : (rate >= 90 ? "#f6c23e" : "#e74a3b");

                    var text = rate + "%";
                    var textX = Math.round((width - ctx.measureText(text).width) / 2) + shiftX;
                    var textY = (height / 2) + 10 + shiftY;
                    ctx.fillText(text, textX, textY);
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
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    },

    populateAnalysisDropdown: async function (hcGroup = 'ALL') {
        const selectEl = document.getElementById('superLineSelect');
        if (!selectEl) return;

        try {
            const response = await fetch(`api/api_master_data.php?action=read_structure&hcGroup=${encodeURIComponent(hcGroup)}`);
            const json = await response.json();
            if (json.success && json.lines) {
                const currentValue = selectEl.value;

                selectEl.innerHTML = '<option value="ALL">All Lines (Overview)</option>';
                json.lines.forEach(line => {
                    const option = document.createElement('option');
                    option.value = line;
                    option.textContent = line;
                    selectEl.appendChild(option);
                });

                if (currentValue && Array.from(selectEl.options).some(o => o.value === currentValue)) {
                    selectEl.value = currentValue;
                }

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

        const sumDiff = sumNew - sumOld;
        const sumDiffRounded = Math.round(sumDiff);

        const sumPct = sumOld > 0 ? ((sumDiff / sumOld) * 100) : 0;

        this.animateNumber('fin_old_total', Math.round(sumOld));
        this.animateNumber('fin_new_total', Math.round(sumNew));

        const diffEl = document.getElementById('fin_diff_total');
        const diffTxt = document.getElementById('fin_impact_text');
        const percentEl = document.getElementById('fin_diff_percent');

        if (diffEl) {
            if (sumDiffRounded > 0) {
                diffEl.innerText = '+' + sumDiffRounded.toLocaleString();
                diffEl.className = 'h5 mb-0 font-weight-bold text-danger';
            } else if (sumDiffRounded < 0) {
                diffEl.innerText = sumDiffRounded.toLocaleString();
                diffEl.className = 'h5 mb-0 font-weight-bold text-success';
            } else {
                diffEl.innerText = '0';
                diffEl.className = 'h5 mb-0 font-weight-bold text-secondary';
            }
        }

        if (percentEl) {
            if (sumDiffRounded === 0) {
                percentEl.innerText = '0%';
                percentEl.className = 'badge bg-light text-muted border';
            } else {
                percentEl.innerText = (sumDiffRounded > 0 ? '+' : '') + sumPct.toFixed(2) + '%';
                percentEl.className = `badge ${sumDiffRounded > 0 ? 'bg-danger' : 'bg-success'} text-white`;
            }
        }

        if (diffTxt) {
            if (sumDiffRounded > 0) {
                diffTxt.innerHTML = `<i class="fas fa-arrow-up"></i> Cost เพิ่มขึ้น (Overrun)`;
                diffTxt.className = "small text-danger mt-1 fw-bold";
            } else if (sumDiffRounded < 0) {
                diffTxt.innerHTML = `<i class="fas fa-arrow-down"></i> Cost ลดลง (Saving)`;
                diffTxt.className = "small text-success mt-1 fw-bold";
            } else {
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
                        backgroundColor: '#858796',
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'New Formula',
                        data: dataNew,
                        backgroundColor: '#4e73df',
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
            const diffRounded = Math.round(diff);
            const pct = oldCost > 0 ? ((diff / oldCost) * 100).toFixed(1) : '0.0';

            let diffClass = 'text-muted font-weight-normal';
            let badgeHtml = `<span class="badge bg-light text-muted border" style="min-width:50px;">0%</span>`;
            let sign = '';

            if (diffRounded > 0) {
                diffClass = 'text-danger fw-bold';
                badgeHtml = `<span class="badge-var bad">${pct}%</span>`;
                sign = '+';
            } else if (diffRounded < 0) {
                diffClass = 'text-success fw-bold';
                badgeHtml = `<span class="badge-var good">${pct}%</span>`;
            }

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

const Actions = {
    _structureCache: { lines: [], teams: [] },
    _lastDetailParams: { line: '', shiftId: '', empType: '', filterStatus: 'ALL' },
    _cachedAnalysisData: null,
    openMasterSettingsTab(tabId) {
        const modalEl = document.getElementById('masterSettingsModal');
        if (!modalEl) return;
        
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        
        // Only show if not already shown to avoid backdrop issues
        if (!modalEl.classList.contains('show')) {
            modal.show();
        }

        const tabTrigger = document.querySelector(`button[data-bs-target="#${tabId}"]`);
        if (tabTrigger) {
            const tab = new bootstrap.Tab(tabTrigger);
            tab.show();
        }
    },

    async openTeamSettings() {
        UI.showLoader();
        this.openMasterSettingsTab('v-pills-team');
        try {
            const res = await fetch(`api/api_master_data.php?action=read_team_settings`);
            const data = await res.json();
            
            const tbody = document.getElementById('teamSettingsBody');
            if (data && data.success) {
                if (data.data && data.data.length > 0) {
                    tbody.innerHTML = '';
                    data.data.forEach(item => {
                        this.appendTeamSettingRow(item.department_api, item.hc_group);
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No configuration found. Please add teams.</td></tr>';
                }
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">API Error: ${data?.message || 'Unknown error'}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            document.getElementById('teamSettingsBody').innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error fetching data.</td></tr>';
        } finally {
            UI.hideLoader();
        }
    },

    appendTeamSettingRow(dept, hc_group) {
        const tbody = document.getElementById('teamSettingsBody');
        const emptyMsg = tbody.querySelector('td.text-muted');
        if (emptyMsg) tbody.innerHTML = '';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="text" class="form-control form-control-sm team-dept-input" value="${dept}" placeholder="Department (API)">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm team-hc-input" list="hcGroupList" value="${hc_group}" placeholder="e.g. Team 1, Exclude" autocomplete="off">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()" title="Remove Team">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    addTeamSettingRow() {
        this.appendTeamSettingRow('', 'MAIN');
    },

    async saveTeamSettings() {
        const rows = document.querySelectorAll('#teamSettingsBody tr');
        const settings = [];
        
        let isValid = true;
        rows.forEach(tr => {
            const deptInput = tr.querySelector('.team-dept-input');
            const hcInput = tr.querySelector('.team-hc-input');
            
            if (deptInput && hcInput) {
                const dept = deptInput.value.trim();
                const hc = hcInput.value.trim();
                if (!dept) isValid = false;
                
                if (dept) {
                    settings.push({
                        department_api: dept,
                        hc_group: hc || 'MAIN'
                    });
                }
            }
        });

        if (settings.length === 0) {
            UI.showToast("No settings to save", "warning");
            return;
        }

        UI.showLoader();
        try {
            const fd = new FormData();
            fd.append('action', 'save_team_settings');
            settings.forEach((s, i) => {
                fd.append(`settings[${i}][department_api]`, s.department_api);
                fd.append(`settings[${i}][hc_group]`, s.hc_group);
            });

            const res = await fetch(`api/api_master_data.php`, { method: 'POST', body: fd });
            const result = await res.json();
            
            if (result.success) {
                UI.showToast("✅ Team Settings saved successfully!", "success");
                bootstrap.Modal.getInstance(document.getElementById('teamSettingsModal')).hide();
                App.loadData();
            } else {
                UI.showToast("❌ Error: " + result.message, "danger");
            }
        } catch (err) {
            console.error(err);
            UI.showToast("❌ Failed to save settings.", "danger");
        } finally {
            UI.hideLoader();
        }
    },

    async openDetailModal(line, shiftId, empType = 'ALL', filterStatus = 'ALL') {
        if (arguments.length === 3 && (empType === 'ALL' || empType === 'PRESENT' || empType === 'LATE' || empType === 'ABSENT')) {
            filterStatus = empType; empType = 'ALL';
        }
        this._lastDetailParams = { line, shiftId, empType, filterStatus };

        const modalEl = document.getElementById('detailModal');

        let title = line ? `${line}` : 'รายละเอียดทั้งหมด';
        if (shiftId) title += ` (${shiftId == 1 ? 'กะเช้า ☀️' : 'กะดึก 🌙'})`;
        if (empType !== 'ALL') title += ` [${empType}]`;
        if (filterStatus !== 'ALL') title += ` - ${filterStatus}`;

        document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-users me-2"></i> ${title}`;
        document.getElementById('detailModalTable').innerHTML = `
            <thead>
                <tr class="table-light text-secondary small text-center">
                    <th width="4%" class="align-middle"><input type="checkbox" class="form-check-input" id="checkAllLogs" onclick="Actions.toggleAllLogs(this)"></th>
                    <th class="align-middle">พนักงาน</th><th width="10%" class="align-middle">ไลน์</th><th width="8%" class="align-middle">ทีม</th><th width="8%" class="align-middle">กะ</th>
                    <th width="8%" class="align-middle">เข้า</th><th width="8%" class="align-middle">ออก</th><th width="10%" class="align-middle">สถานะ</th>
                    <th width="15%" class="align-middle">หมายเหตุ</th><th width="10%" class="text-end align-middle">Cost</th><th width="8%" class="align-middle">Action</th>
                </tr>
            </thead>
            <tbody id="detailModalBody">
                ${UI.getSkeletonRow(11)}
            </tbody>`;

        const searchInput = document.getElementById('searchDetail');
        if (searchInput) {
            searchInput.value = '';
            this.initSearch();
        }

        if (!modalEl.classList.contains('show')) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

        setTimeout(() => {
            this.fetchDetailData();
        }, 300);
    },

    async fetchDetailData() {
        const { line, shiftId, empType, filterStatus } = this._lastDetailParams;
        const date = document.getElementById('filterDate').value;
        const hcGroup = document.getElementById('filterHcGroup')?.value || 'ALL';

        if (this._structureCache.lines.length === 0) await this.initDropdowns();
        
        const teamFilter = document.getElementById('filterDetailTeam');
        if (teamFilter && teamFilter.options.length <= 1) {
            teamFilter.innerHTML = '<option value="">ทั้งหมด (All Teams)</option>' + 
                this._structureCache.teams.map(t => `<option value="${t}">${t}</option>`).join('');
        }
        try {
            const url = `api/api_daily_operations.php?action=read_daily&date=${date}&line=${encodeURIComponent(line)}&type=${encodeURIComponent(empType)}&hcGroup=${encodeURIComponent(hcGroup)}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                let filteredData = json.data;
                if (filterStatus !== 'ALL') {
                    if (filterStatus === 'PRESENT_AND_LATE') filteredData = json.data.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
                    else if (filterStatus === 'LEAVE') {
                        const nonLeaveStatus = ['PRESENT', 'LATE', 'ABSENT', 'WAITING', 'HOLIDAY'];
                        filteredData = json.data.filter(r => !nonLeaveStatus.includes(r.status) && r.status);
                    } else if (filterStatus === 'HOLIDAY_WAITING') {
                        filteredData = json.data.filter(r => r.status === 'HOLIDAY' || r.status === 'WAITING' || r.status === 'GHOST' || !r.status);
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
                await Actions.fetchDetailData();
                App.loadData();
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
                is_active: 0
            };

            const res = await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (json.success) {
                bootstrap.Modal.getInstance(document.getElementById('empEditModal')).hide();
                App.loadData();
                if (document.getElementById('empListModal').classList.contains('show')) {
                    Actions.openEmployeeManager();
                }
                alert('✅ ปิดใช้งานเรียบร้อย (ลบ Plan วันนี้ออกแล้ว)');
            } else {
                alert('Error: ' + json.message);
            }
        } catch (e) {
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
                if (json.success) {
                    const editModalEl = document.getElementById('empEditModal');
                    const editModal = bootstrap.Modal.getInstance(editModalEl);
                    if (editModal) editModal.hide();

                    await App.loadData();
                    await Actions.fetchDetailData();
                    if (document.getElementById('empListModal').classList.contains('show')) {
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

        document.getElementById('detailModalTable').innerHTML = `
            <thead>
                <tr class="table-light text-secondary small text-center">
                    <th width="12%" class="align-middle">วันที่ (Date)</th><th class="align-middle">พนักงาน</th><th width="10%" class="align-middle">ไลน์</th><th width="8%" class="align-middle">ทีม</th><th width="8%" class="align-middle">กะ</th>
                    <th width="8%" class="align-middle">เข้า</th><th width="8%" class="align-middle">ออก</th><th width="10%" class="align-middle">สถานะ</th>
                    <th width="15%" class="align-middle">หมายเหตุ</th><th width="10%" class="text-end align-middle">Cost</th><th width="8%" class="align-middle">Action</th>
                </tr>
            </thead>
            <tbody id="detailModalBody">
                ${UI.getSkeletonRow(11)}
            </tbody>`;

        try {
            const url = `api/api_daily_operations.php?action=read_daily&startDate=${startDate}&endDate=${today}&emp_id=${empId}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                const history = json.data.filter(r => r.emp_id === empId);
                history.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

                this.renderDetailTable(history, true);
            }
        } catch (err) {
            console.error(err);
            document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load history</td></tr>`;
        }
    },

    backToDailyList() {
        const titleEl = document.getElementById('detailModalTitle');
        this.openDetailModal(
            this._lastDetailParams.line,
            this._lastDetailParams.shiftId,
            this._lastDetailParams.empType,
            this._lastDetailParams.filterStatus
        );
    },

    renderDetailTable(list, isHistoryMode = false) {
        const tbody = document.getElementById('detailModalBody');

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        const statusMap = {
            'WAITING': '⏳ รอเข้างาน', 'PRESENT': '✅ มา (Present)', 'LATE': '⏰ สาย (Late)',
            'ABSENT': '❌ ขาด (Absent)', 'SICK': '🤢 ลาป่วย (Sick)', 'BUSINESS': '👜 ลากิจ (Business)',
            'VACATION': '🏖️ พักร้อน (Vacation)', 'HOLIDAY': '🎉 วันหยุด (Holiday)', 'OTHER': '⚪ อื่นๆ (Other)'
        };
        const getStatusBadgeClass = (status) => {
            const map = { 'PRESENT': 'bg-success', 'LATE': 'bg-warning text-dark', 'ABSENT': 'bg-danger', 'SICK': 'bg-info text-dark', 'BUSINESS': 'bg-primary', 'VACATION': 'bg-purple', 'WAITING': 'bg-secondary', 'HOLIDAY': 'bg-success bg-opacity-75' };
            return map[status] || 'bg-light text-dark border';
        };

        const rowsHTML = list.map(row => {
            const uid = row.emp_id;
            const logId = row.log_id || '0';
            const costVal = parseFloat(row.est_cost || 0);
            const costHtml = costVal > 0 ? `<span class="fw-bold ${costVal > 1000 ? 'text-primary' : 'text-dark'}">${costVal.toLocaleString()}</span>` : '<span class="text-muted">-</span>';

            let outTimeDisplay = row.out_time ? row.out_time.substring(0,5) : '-';
            let trClass = '';
            
            if (parseInt(row.is_forgot_out) === 1) {
                trClass = 'table-danger bg-opacity-10';
                outTimeDisplay = `<span class="badge bg-danger"><i class="fas fa-exclamation-circle"></i> ลืมรูด</span>`;
            }

            const shiftDisplay = (row.shift_id == 1 || (!row.shift_id && row.default_shift_id == 1)) ? '<span class="badge bg-primary shadow-sm"><i class="fas fa-sun"></i> DAY</span>' : '<span class="badge bg-dark shadow-sm"><i class="fas fa-moon"></i> NIGHT</span>';

            const masterJson = encodeURIComponent(JSON.stringify(row));
            
            const dFmt = (dStr) => {
                if (!dStr) return '-';
                const d = new Date(dStr);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().substr(-2)}`;
            };

            const firstCellHtml = isHistoryMode 
                ? `<td class="text-center align-middle font-monospace text-primary fw-bold">${dFmt(row.log_date)}</td>`
                : `<td class="text-center align-middle">
                        <input type="checkbox" class="form-check-input log-checkbox" value="${uid}" onchange="Actions.updateBatchSelectedCount()">
                   </td>`;

            return `
                <tr class="${trClass}" data-uid="${uid}" data-logid="${logId}" data-team="${row.actual_team || row.team_group || ''}">
                    ${firstCellHtml}
                    <td class="ps-4">
                        <div class="fw-bold text-dark text-truncate" style="max-width: 150px;">${row.name_th}</div>
                        <small class="text-muted font-monospace" style="font-size:0.75rem;">${row.emp_id}</small>
                    </td>
                    <td class="text-center align-middle text-secondary small fw-bold">${row.actual_line || row.line || '-'}</td>
                    <td class="text-center align-middle text-secondary small fw-bold">${row.actual_team || row.team_group || '-'}</td>
                    <td class="text-center align-middle">${shiftDisplay}</td>
                    <td class="text-center align-middle font-monospace fw-bold text-primary">${row.in_time ? row.in_time.substring(0,5) : '-'}</td>
                    <td class="text-center align-middle font-monospace fw-bold text-primary">${outTimeDisplay}</td>
                    <td class="text-center align-middle">
                        <span class="badge ${getStatusBadgeClass(row.status)} shadow-sm px-2 py-1" style="font-size: 0.75rem;">${statusMap[row.status] || row.status}</span>
                    </td>
                    <td class="align-middle text-muted small text-truncate" style="max-width: 150px;" title="${row.remark || ''}">${row.remark || '-'}</td>
                    <td class="text-end pe-3 align-middle">${costHtml}</td>
                    
                    <td class="text-center text-nowrap align-middle">
                        <button class="btn btn-sm btn-light text-primary border rounded-circle shadow-sm me-1" 
                                style="width: 32px; height: 32px;" 
                                onclick="Actions.openEditLogModal('${masterJson}')" 
                                title="แก้ไขรายการ">
                            <i class="fas fa-pen"></i>
                        </button>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-light text-secondary border rounded-circle shadow-sm" 
                                    style="width: 32px; height: 32px;" 
                                    data-bs-toggle="dropdown" 
                                    data-bs-boundary="viewport"  aria-expanded="false">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="font-size: 0.85rem; min-width: 180px;">
                                <li><a class="dropdown-item" href="#" onclick="Actions.openKpiDashboard('${uid}', '${row.name_th}')"><i class="fas fa-chart-pie text-success me-2"></i>ดูผลประเมิน (KPI)</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.viewEmployeeHistory('${uid}', '${row.name_th}')"><i class="fas fa-history text-info me-2"></i>ดูประวัติย้อนหลัง</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmpEdit('${encodeURIComponent(JSON.stringify(row))}')"><i class="fas fa-user-edit text-secondary me-2"></i>แก้ไขข้อมูล Master</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="Actions.deleteLog('${logId}', '${row.name_th}')"><i class="fas fa-trash-alt me-2"></i>ลบรายการวันนี้</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>`;
        }).join('');
        tbody.innerHTML = rowsHTML;
    },

    toggleAllLogs(checkbox) {
        const checkboxes = document.querySelectorAll('.log-checkbox');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
        this.updateBatchSelectedCount();
    },

    updateBatchSelectedCount() {
        const count = document.querySelectorAll('.log-checkbox:checked').length;
        const countSpan = document.getElementById('batchSelectedCount');
        if (countSpan) countSpan.innerText = count;
    },

    async batchSetStatus(status) {
        const checkboxes = document.querySelectorAll('.log-checkbox:checked');
        if (checkboxes.length === 0) {
            UI.showToast("กรุณาเลือกพนักงานอย่างน้อย 1 คน", "warning");
            return;
        }

        if (!confirm(`ยืนยันการตั้งสถานะเป็น ${status} ให้พนักงาน ${checkboxes.length} คน?`)) return;

        UI.showLoader();
        let successCount = 0;
        let failCount = 0;

        for (const cb of checkboxes) {
            const tr = cb.closest('tr');
            const uid = tr.dataset.uid;
            const logId = tr.dataset.logid;
            const date = document.getElementById('filterDate').value;

            try {
                const res = await fetch('api/api_daily_operations.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_log',
                        log_id: logId == '0' ? '' : logId,
                        emp_id: uid,
                        log_date: date,
                        status: status,
                        remark: 'Batch Update'
                    })
                });
                const json = await res.json();
                if (json.success) successCount++;
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }

        UI.hideLoader();
        if (successCount > 0) UI.showToast(`✅ อัปเดตสำเร็จ ${successCount} รายการ`, "success");
        if (failCount > 0) UI.showToast(`❌ ล้มเหลว ${failCount} รายการ`, "danger");

        const checkAll = document.getElementById('checkAllLogs');
        if (checkAll) checkAll.checked = false;
        this.updateBatchSelectedCount();

        await this.fetchDetailData();
        App.loadData();
    },

    openEditLogModal(masterJsonString) {
        const data = JSON.parse(decodeURIComponent(masterJsonString));
        
        const createOptions = (items, selectedVal) => items.map(val => `<option value="${val}" ${val == selectedVal ? 'selected' : ''}>${val}</option>`).join('');
        
        document.getElementById('editLogLine').innerHTML = createOptions(this._structureCache.lines, data.actual_line || data.line);
        document.getElementById('editLogTeam').innerHTML = '<option value="-">-</option>' + createOptions(this._structureCache.teams, data.actual_team || data.team_group);

        document.getElementById('editLogId').value = data.log_id || '';
        document.getElementById('editEmpIdHidden').value = data.emp_id;
        document.getElementById('editEmpName').value = data.name_th + ' (' + data.emp_id + ')';
        document.getElementById('editStatus').value = data.status || 'PRESENT';
        document.getElementById('editLogShift').value = data.shift_id || data.default_shift_id || '1';
        
        const formatTime = (t) => t ? t.substring(0,5) : '';
        document.getElementById('editScanInTime').value = formatTime(data.in_time);
        document.getElementById('editScanOutTime').value = formatTime(data.out_time);
        document.getElementById('editRemark').value = data.remark || '';

        const modal = new bootstrap.Modal(document.getElementById('editLogModal'));
        modal.show();
    },

    async saveLogChanges() {
        const logId = document.getElementById('editLogId').value;
        const empId = document.getElementById('editEmpIdHidden').value;
        const dateStr = document.getElementById('filterDate').value;
        
        const timeIn = document.getElementById('editScanInTime').value;
        const timeOut = document.getElementById('editScanOutTime').value;

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

        const payload = {
            action: 'update_log',
            log_id: logId,
            emp_id: empId,
            log_date: dateStr,
            actual_line: document.getElementById('editLogLine').value,
            actual_team: document.getElementById('editLogTeam').value,
            status: document.getElementById('editStatus').value,
            shift_id: document.getElementById('editLogShift').value,
            scan_in_time: scanInFull,
            scan_out_time: scanOutFull,
            remark: document.getElementById('editRemark').value
        };

        UI.showLoader();
        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json.success) {
                bootstrap.Modal.getInstance(document.getElementById('editLogModal')).hide();
                UI.showToast("บันทึกสำเร็จ", "success");
                await this.fetchDetailData();
                App.loadData();
            } else {
                UI.showToast("Error: " + json.message, "danger");
            }
        } catch (err) {
            UI.showToast("Failed to save", "danger");
            console.error(err);
        } finally {
            UI.hideLoader();
        }
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
                        el.innerHTML = '<option value="">-- Select --</option>' + (id === 'filterLine' ? '<option value="ALL">All Lines</option>' : '') + json.lines.map(l => `<option value="${l}">${l}</option>`).join('');
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
        const teamFilter = document.getElementById('filterDetailTeam');
        if (!input) return;

        let debounceTimer;
        
        const filterFn = () => {
            clearTimeout(debounceTimer);
            const searchTerm = input.value.toLowerCase().trim();
            const teamTerm = teamFilter ? teamFilter.value.toLowerCase().trim() : '';
            const tbody = document.getElementById('detailModalBody');

            debounceTimer = setTimeout(() => {
                const rows = tbody.querySelectorAll('tr');
                requestAnimationFrame(() => {
                    rows.forEach(row => {
                        const text = row.innerText.toLowerCase();
                        const rowTeam = (row.dataset.team || '').toLowerCase();
                        
                        const isMatchSearch = searchTerm === '' || text.includes(searchTerm) || text.includes('loading');
                        const isMatchTeam = teamTerm === '' || rowTeam === teamTerm || text.includes('loading');
                        
                        const isMatch = isMatchSearch && isMatchTeam;
                        
                        if (isMatch) {
                            if (row.style.display === 'none') {
                                row.style.display = '';
                                row.classList.remove('search-reveal');
                                void row.offsetWidth;
                                row.classList.add('search-reveal');
                            }
                        } else {
                            if (row.style.display !== 'none') {
                                row.style.display = 'none';
                                row.classList.remove('search-reveal');
                            }
                        }
                    });
                });
            }, 150);
        };

        input.onkeyup = filterFn;
        if (teamFilter) teamFilter.onchange = filterFn;
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

                    keys.forEach(col => {
                        objectMaxLength.push({ wch: col.length + 5 });
                    });

                    jsonArray.forEach(row => {
                        keys.forEach((key, i) => {
                            const value = (row[key] || '').toString();
                            if (value.length > objectMaxLength[i].wch - 5) {
                                objectMaxLength[i].wch = value.length + 5;
                            }
                        });
                    });

                    worksheet['!cols'] = objectMaxLength;
                };

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

                const wsAll = XLSX.utils.json_to_sheet(rawData);
                autoFitColumns(rawData, wsAll);
                XLSX.utils.book_append_sheet(wb, wsAll, "Raw_Data_All");
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

    _employeeCache: [],
    async openEmployeeManager(keepFilters = false) {
        let savedState = null;
        if (keepFilters) {
            const statusEl = document.querySelector('input[name="empStatusFilter"]:checked');
            savedState = {
                term: document.getElementById('empSearchBox')?.value || '',
                line: document.getElementById('empFilterLine')?.value || '',
                status: statusEl ? statusEl.value : '1',
                dateType: document.getElementById('empDateType')?.value || '',
                dFrom: document.getElementById('empDateFrom')?.value || '',
                dTo: document.getElementById('empDateTo')?.value || ''
            };
        }

        this.openMasterSettingsTab('v-pills-emp-tab');

        if (!keepFilters) {
            document.getElementById('empListBody').innerHTML = UI.getSkeletonRow(7);
        }
        const filterSelect = document.getElementById('empFilterLine');
        if (filterSelect && filterSelect.options.length <= 1 && this._structureCache.lines.length > 0) {
            filterSelect.innerHTML = '<option value="">All Lines</option>' +
                this._structureCache.lines.map(l => `<option value="${l}">${l}</option>`).join('');
        }

        try {
            const res = await fetch(`api/api_master_data.php?action=read_employees&show_all=true`);
            const json = await res.json();

            if (json.success) {
                this._employeeCache = json.data;
                if (keepFilters && savedState) {
                    document.getElementById('empSearchBox').value = savedState.term;
                    document.getElementById('empFilterLine').value = savedState.line;

                    const rad = document.querySelector(`input[name="empStatusFilter"][value="${savedState.status}"]`);
                    if (rad) rad.checked = true;

                    document.getElementById('empDateType').value = savedState.dateType;
                    document.getElementById('empDateFrom').value = savedState.dFrom;
                    document.getElementById('empDateTo').value = savedState.dTo;
                    this.toggleDateInputs();

                } else {
                    if (document.getElementById('filterStatusActive')) {
                        document.getElementById('filterStatusActive').checked = true;
                    }
                    if (document.getElementById('empDateType')) {
                        document.getElementById('empDateType').value = '';
                        this.toggleDateInputs();
                    }
                    if (document.getElementById('empSearchBox')) document.getElementById('empSearchBox').value = '';
                    if (document.getElementById('empFilterLine')) document.getElementById('empFilterLine').value = '';
                }
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

        const term = document.getElementById('empSearchBox')?.value.toLowerCase().trim() || '';
        const lineFilter = document.getElementById('empFilterLine')?.value || '';

        let statusVal = 'ALL';
        const radioActive = document.querySelector('input[name="empStatusFilter"]:checked');
        const selectActive = document.getElementById('empFilterStatus');

        if (radioActive) statusVal = radioActive.value;
        else if (selectActive) statusVal = selectActive.value;

        const dateType = document.getElementById('empDateType')?.value || '';
        const dateFrom = document.getElementById('empDateFrom')?.value || '';
        const dateTo = document.getElementById('empDateTo')?.value || '';

        const filtered = this._employeeCache.filter(emp => {
            let matchStatus = false;
            const isActive = parseInt(emp.is_active) === 1;

            // 1. ตรวจสอบเงื่อนไขสถานะ (Status Filter)
            if (statusVal === 'ALL') {
                matchStatus = true;
            } else if (statusVal === '1' || statusVal === 'ACTIVE') {
                matchStatus = isActive;
            } else if (statusVal === '0' || statusVal === 'RESIGNED') {
                matchStatus = (!isActive && emp.resign_date != null);
            } else if (statusVal === 'OUTSIDER') {
                // โชว์คนที่ไม่ใช่สายการผลิตหลัก หรือยังไม่ได้เปิด Active แต่ยังไม่ลาออก
                matchStatus = (emp.line === 'OTHER_DEPT' || !isActive) && (emp.resign_date == null);
            }

            if (!matchStatus) return false;

            // 2. ตรวจสอบเงื่อนไขการค้นหารหัสหรือชื่อ
            if (term) {
                const searchStr = `${emp.emp_id} ${emp.name_th} ${emp.position} ${emp.line}`.toLowerCase();
                if (!searchStr.includes(term)) return false;
            }

            // 3. ตรวจสอบเงื่อนไขไลน์
            if (lineFilter && emp.line !== lineFilter) return false;

            // 4. ตรวจสอบช่วงวันที่
            if (dateType && dateType !== '') {
                const rawDate = (dateType === 'JOIN') ? emp.start_date : emp.resign_date;
                if (!rawDate) return false;
                const targetDate = rawDate.split(' ')[0];
                if (dateFrom && targetDate < dateFrom) return false;
                if (dateTo && targetDate > dateTo) return false;
            }

            return true;
        });

        console.log(`🔍 Found: ${filtered.length} items`);
        this.renderEmployeeTable(filtered);
    },

    resetEmployeeFilters() {
        document.getElementById('empSearchBox').value = '';
        document.getElementById('empFilterLine').value = '';
        if (document.getElementById('filterStatusActive')) {
            document.getElementById('filterStatusActive').checked = true;
        }

        document.getElementById('empDateType').value = '';
        this.toggleDateInputs();

        this.filterEmployeeList();
    },

    toggleDateInputs() {
        const type = document.getElementById('empDateType').value;
        const wrapper = document.getElementById('empDateWrapper');
        if (!wrapper) return;

        if (type === '') {
            wrapper.classList.remove('d-flex');
            wrapper.classList.add('d-none');

            document.getElementById('empDateFrom').value = '';
            document.getElementById('empDateTo').value = '';
        } else {
            wrapper.classList.remove('d-none');
            wrapper.classList.add('d-flex');

            if (type === 'RESIGN') {
                document.getElementById('filterStatusAll').checked = true;
            } else if (type === 'JOIN') {
                document.getElementById('filterStatusAll').checked = true;
            }
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
        const dFmt = (dStr) => {
            if (!dStr) return '<span class="text-muted opacity-50">-</span>';
            const d = new Date(dStr);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().substr(-2)}`;
        };

        displayList.forEach(emp => {
            const isActive = parseInt(emp.is_active) === 1;
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

            let typeBadge = '';
            if (emp.emp_type === 'Monthly') typeBadge = '<span class="badge badge-soft-primary">Monthly</span>';
            else if (emp.emp_type === 'Daily') typeBadge = '<span class="badge badge-soft-success">Daily</span>';
            else if (emp.emp_type === 'Subcontract') typeBadge = '<span class="badge badge-soft-warning text-dark">Sub</span>';
            else typeBadge = `<span class="badge bg-secondary">${emp.emp_type || '?'}</span>`;

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

            let tagsHtml = '';
            if (!emp.line) tagsHtml += `<span class="badge bg-danger mb-1 me-1">No Line</span>`;
            if (!emp.default_shift_id) tagsHtml += `<span class="badge bg-warning text-dark mb-1 me-1">No Shift</span>`;
            if (!emp.team_group) tagsHtml += `<span class="badge bg-info text-dark mb-1 me-1">No Team</span>`;
            if (tagsHtml === '') tagsHtml = `<span class="text-muted small"><i class="fas fa-check-circle text-success me-1"></i>Data OK</span>`;

            const shiftText = emp.shift_name ? (emp.shift_name.includes('Day') ? '<i class="fas fa-sun text-warning me-1"></i>Day' : '<i class="fas fa-moon text-indigo me-1"></i>Night') : '-';
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
                                <li><a class="dropdown-item" href="#" onclick="Actions.openKpiDashboard('${emp.emp_id}', '${emp.name_th}')"><i class="fas fa-chart-pie text-success me-2"></i>ดูผลประเมิน (KPI)</a></li>
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
    async openKpiDashboard(empId, name) {
        document.getElementById('empKpiSubtitle').innerText = name + ' (' + empId + ')';
        document.getElementById('empKpiRate').innerText = '--%';
        document.getElementById('empKpiTotal').innerText = '--';
        document.getElementById('empKpiPresent').innerText = '--';
        document.getElementById('empKpiLate').innerText = '--';
        document.getElementById('empKpiAbsent').innerText = '--';
        document.getElementById('empKpiLeave').innerText = '--';

        const modal = new bootstrap.Modal(document.getElementById('empKpiModal'));
        modal.show();

        try {
            const res = await fetch(`api/api_daily_operations.php?action=read_kpi_summary&emp_id=${empId}`);
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const data = json.data[0];
                const total = parseInt(data.total_working_days);
                const present = parseInt(data.count_present);
                const late = parseInt(data.count_late);
                const absent = parseInt(data.count_absent);
                const leave = parseInt(data.count_sick) + parseInt(data.count_business) + parseInt(data.count_vacation);

                document.getElementById('empKpiTotal').innerText = total;
                document.getElementById('empKpiPresent').innerText = present;
                document.getElementById('empKpiLate').innerText = late;
                document.getElementById('empKpiAbsent').innerText = absent;
                document.getElementById('empKpiLeave').innerText = leave;

                let rate = 0;
                // Exclude leaves from total expected working days? Or just Attendance = (Present + Late) / Total
                if (total > 0) {
                    rate = ((present + late) / total * 100).toFixed(1);
                }
                document.getElementById('empKpiRate').innerText = rate + '%';
            }
        } catch (e) {
            console.error(e);
        }
    },

    async openExecReport() {
        const modal = new bootstrap.Modal(document.getElementById('execReportModal'));
        modal.show();

        const tbody = document.getElementById('execReportBody');
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i><br>กำลังดึงข้อมูล...</td></tr>';

        // Populate filters if needed
        if (this._structureCache && this._structureCache.lines.length > 0) {
            const lineSelect = document.getElementById('execReportLineFilter');
            const teamSelect = document.getElementById('execReportTeamFilter');
            if (lineSelect.options.length <= 1) {
                lineSelect.innerHTML = '<option value="">ทุกแผนก (All Lines)</option>' + this._structureCache.lines.map(l => `<option value="${l}">${l}</option>`).join('');
            }
            if (teamSelect.options.length <= 1) {
                teamSelect.innerHTML = '<option value="">ทุกทีม (All Teams)</option>' + this._structureCache.teams.map(t => `<option value="${t}">${t}</option>`).join('');
            }
        }

        try {
            const res = await fetch(`api/api_daily_operations.php?action=read_kpi_summary`);
            const json = await res.json();
            if (json.success) {
                this._execReportData = json.data;
                this.renderExecReport();
            } else {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-danger">Error: ${json.message}</td></tr>`;
            }
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-danger">Failed to load data</td></tr>`;
        }
    },

    renderExecReport() {
        const tbody = document.getElementById('execReportBody');
        if (!this._execReportData || this._execReportData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5">ไม่พบข้อมูล</td></tr>';
            return;
        }

        const lineF = document.getElementById('superLineSelect')?.value || 'ALL';
        const teamF = document.getElementById('ia_hcGroupSelect')?.value || 'ALL';
        const searchF = (document.getElementById('execReportSearch')?.value || '').toLowerCase().trim();
        const cmpLine = lineF.trim().toUpperCase();
        const cmpTeam = teamF.trim().toUpperCase();

        const filtered = this._execReportData.filter(r => {
            const rLine = (r.line || '').trim().toUpperCase();
            const rTeam = (r.team_group || '').trim().toUpperCase();
            if (cmpLine !== 'ALL' && rLine !== cmpLine) return false;
            if (cmpTeam !== 'ALL' && rTeam !== cmpTeam) return false;
            if (searchF) {
                const text = ((r.emp_id || '') + ' ' + (r.name_th || '')).toLowerCase();
                if (!text.includes(searchF)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</td></tr>';
            return;
        }

        const html = filtered.map(r => {
            const total = parseInt(r.total_working_days);
            const present = parseInt(r.count_present);
            const late = parseInt(r.count_late);
            const absent = parseInt(r.count_absent);
            const leave = parseInt(r.count_sick) + parseInt(r.count_business) + parseInt(r.count_vacation);
            let rate = 0;
            if (total > 0) rate = ((present + late) / total * 100).toFixed(1);

            let rateHtml = `<span class="fw-bold ${rate >= 95 ? 'text-success' : (rate >= 80 ? 'text-warning' : 'text-danger')}">${rate}%</span>`;

            return `
                <tr>
                    <td class="ps-3">
                        <div class="fw-bold text-dark">${r.name_th}</div>
                        <div class="small text-muted font-monospace">${r.emp_id}</div>
                    </td>
                    <td class="text-center">${r.line || '-'}</td>
                    <td class="text-center">${r.team_group || '-'}</td>
                    <td class="text-center fw-bold">${total}</td>
                    <td class="text-center text-success">${present}</td>
                    <td class="text-center text-warning text-dark">${late}</td>
                    <td class="text-center text-info">${leave}</td>
                    <td class="text-center text-danger">${absent}</td>
                    <td class="text-center">${rateHtml}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    },

    openEmpEdit: async function (dataOrEmpId) {
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
            else { try { const t = JSON.parse(decodeURIComponent(dataOrEmpId)); empId = t.emp_id; } catch (e) { return; } }
        }

        document.getElementById('isEditMode').value = isEdit ? '1' : '0';
        document.getElementById('empEditTitle').innerText = isEdit ? 'Edit Employee' : 'New Employee';
        document.getElementById('empEditId').readOnly = isEdit;

        if (this._structureCache.lines.length === 0) await this.initDropdowns();

        if (isEdit) {
            UI.showLoader();
            try {
                const res = await fetch(`api/api_master_data.php?action=read_single_employee&emp_id=${encodeURIComponent(empId)}`);
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
                const emp = json.data;
                document.getElementById('empEditId').value = emp.emp_id;
                document.getElementById('empEditName').value = emp.name_th || '';
                document.getElementById('empEditPos').value = emp.position || '';
                document.getElementById('empEditStartDate').value = emp.start_date || '';

                setTimeout(() => {
                    document.getElementById('empEditLine').value = emp.line || '';
                    document.getElementById('empEditShift').value = emp.default_shift_id || emp.shift_id || '';
                    document.getElementById('empEditTeam').value = emp.team_group || '';
                    this._originalWorkData = {
                        line: emp.line,
                        shift: (emp.default_shift_id || emp.shift_id),
                        team: emp.team_group
                    };
                }, 50);
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
        const isChanged = (newLine != this._originalWorkData.line) ||
            (newTeam != this._originalWorkData.team) ||
            (newShift != this._originalWorkData.shift);

        const retroDiv = document.getElementById('divRetroUpdate');

        if (isChanged && document.getElementById('isEditMode').value === '1') {
            if (retroDiv.style.display === 'none') {
                retroDiv.style.display = 'block';
                retroDiv.classList.add('animate__animated', 'animate__fadeIn');
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
        if (!id) return;
        this.terminateStaff(id, name);
    },

    async handleReactivateClick() {
        if (!confirm('ต้องการปรับสถานะพนักงานนี้กลับเป็น Active ใช่หรือไม่?')) return;
        document.getElementById('currentActiveStatus').value = '1';
        document.getElementById('empEditResignDate').value = '';
        await this.saveEmployee();
    },

    async saveEmployee() {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

        try {
            const elRetroCheck = document.getElementById('editMaster_UpdateLogs');
            const elRetroDate = document.getElementById('editMaster_EffectiveDate');
            const elActiveStatus = document.getElementById('currentActiveStatus');
            const elIsEdit = document.getElementById('isEditMode');
            const needRetroUpdate = elRetroCheck ? elRetroCheck.checked : false;
            const retroDate = elRetroDate ? elRetroDate.value : null;

            if (needRetroUpdate && !retroDate) {
                throw new Error('กรุณาระบุ "มีผลตั้งแต่วันที่" หากต้องการอัปเดตย้อนหลัง');
            }

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

            if (!payload.emp_id || !payload.name_th) {
                throw new Error('กรุณากรอกรหัสพนักงานและชื่อให้ครบถ้วน');
            }

            const res = await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (json.success) {
                const editModalEl = document.getElementById('empEditModal');
                const editModal = bootstrap.Modal.getInstance(editModalEl);
                if (editModal) editModal.show();
                editModal.hide();
                if (typeof App !== 'undefined') await App.loadData(true);
                const empListModal = document.getElementById('empListModal');
                if (empListModal && empListModal.classList.contains('show')) {
                    this.openEmployeeManager(true);
                }

                if (typeof this.fetchDetailData === 'function' && document.getElementById('detailModal').classList.contains('show')) {
                    await this.fetchDetailData();
                }

                alert('✅ บันทึกข้อมูลเรียบร้อย');
            } else {
                throw new Error(json.message);
            }

        } catch (e) {
            console.error("Save Error:", e);
            alert('❌ Failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    },

    openReportModal() {
        const modalEl = document.getElementById('reportRangeModal');
        const modal = new bootstrap.Modal(modalEl);
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + 1;
        const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        document.getElementById('reportStartDate').value = firstDay;
        document.getElementById('reportEndDate').value = today;

        const lineSelect = document.getElementById('rpt_line');
        if (this._structureCache && this._structureCache.lines) {
            lineSelect.innerHTML = '<option value="ALL">All Lines</option>';

            this._structureCache.lines.forEach(item => {
                const lineName = (typeof item === 'object' && item.line) ? item.line : item;

                if (lineName) {
                    lineSelect.innerHTML += `<option value="${lineName}">${lineName}</option>`;
                }
            });
        }

        const filters = ['rpt_line', 'rpt_shift', 'rpt_type', 'reportStartDate', 'reportEndDate'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onchange = null;
                el.onchange = () => this.loadExecutiveReport();
            }
        });

        modal.show();
        this.loadExecutiveReport();
    },

    async loadExecutiveReport() {
        const sDate = document.getElementById('reportStartDate').value;
        const eDate = document.getElementById('reportEndDate').value;
        const line = document.getElementById('rpt_line').value;
        const shift = document.getElementById('rpt_shift').value;
        const type = document.getElementById('rpt_type').value;

        if (!sDate || !eDate) return alert("Please select dates");

        const loadingIds = ['rpt_hc', 'rpt_actual', 'rpt_absent', 'rpt_leave',
            'hc_max', 'hc_min', 'hc_avg',
            'act_max', 'act_min', 'act_avg',
            'abs_max', 'abs_min', 'abs_avg',
            'lev_max', 'lev_min', 'lev_avg'];

        loadingIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = '...';
        });

        try {
            const url = `api/api_daily_operations.php?action=read_range_report` +
                `&startDate=${sDate}` +
                `&endDate=${eDate}` +
                `&line=${encodeURIComponent(line)}` +
                `&shift=${encodeURIComponent(shift)}` +
                `&type=${encodeURIComponent(type)}`;

            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                const h = json.header;
                const t = json.trend;
                UI.animateNumber('rpt_hc', h.Total_Headcount || 0);

                document.getElementById('rpt_new').innerText = `+${h.New_Joiners || 0} / -${h.Total_Resigned || 0}`;
                const elNew = document.getElementById('rpt_new');
                if (elNew) {
                    elNew.innerHTML = `<span class="text-success">+${h.New_Joiners || 0}</span> / <span class="text-danger">-${h.Total_Resigned || 0}</span>`;
                }

                UI.animateNumber('rpt_actual', h.Total_Present_ManDays || 0);
                UI.animateNumber('rpt_absent', h.Total_Absent || 0);
                UI.animateNumber('rpt_leave', h.Total_Leave || 0);

                const calcStats = (data, key) => {
                    const res = { max: 0, min: 0, avg: 0, last: 0 };
                    if (!data || data.length === 0) return res;

                    let max = -Infinity, min = Infinity, sum = 0, count = 0;

                    data.forEach(d => {
                        if (d.Is_Work_Day !== undefined && parseInt(d.Is_Work_Day) === 0) return;

                        const val = parseInt(d[key] || 0);
                        if (val >= 0) {
                            if (val > max) max = val;
                            if (val < min && val > 0) min = val;
                            sum += val;
                            count++;
                        }
                    });

                    if (min === Infinity) min = 0;
                    if (max === -Infinity) max = 0;

                    res.max = max;
                    res.min = min;
                    res.avg = count > 0 ? (sum / count).toFixed(1) : 0;

                    const lastItem = data[data.length - 1];
                    res.last = lastItem ? parseInt(lastItem[key] || 0) : 0;

                    return res;
                };

                const renderStats = (prefix, stats) => {
                    const setVal = (suffix, val) => {
                        const el = document.getElementById(`${prefix}_${suffix}`);
                        if (el) el.innerText = val;
                    };
                    setVal('max', stats.max);
                    setVal('min', stats.min);
                    setVal('avg', stats.avg);
                    setVal('last', stats.last);
                };
                renderStats('hc', calcStats(t, 'Daily_HC'));
                renderStats('act', calcStats(t, 'Daily_Actual'));
                renderStats('abs', calcStats(t, 'Daily_Absent'));
                renderStats('lev', calcStats(t, 'Daily_Leave'));
                this.renderReportChart(t);
            }
        } catch (err) {
            console.error("Error loading report:", err);
        }
    },

    renderReportChart(data) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        if (window.reportChartObj) {
            window.reportChartObj.destroy();
        }

        window.reportChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => {
                    const date = new Date(d.log_date);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'Actual (มา)',
                        data: data.map(d => d.Daily_Actual),
                        backgroundColor: '#1cc88a',
                        borderRadius: 4,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Leave (ลา)',
                        data: data.map(d => d.Daily_Leave),
                        backgroundColor: '#36b9cc',
                        borderRadius: 4,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Absent (ขาด)',
                        data: data.map(d => d.Daily_Absent),
                        backgroundColor: '#e74a3b',
                        borderRadius: 4,
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
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            footer: function (tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const dayData = data[dataIndex];
                                let totalStack = 0;
                                tooltipItems.forEach(function (tooltipItem) {
                                    totalStack += tooltipItem.parsed.y;
                                });
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
                        stacked: true,
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

        if (!sDate || !eDate) {
            alert("Please select both Start and End dates.");
            return;
        }

        const tbody = document.getElementById('simTableBody');
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary"></div><br>Calculating...</td></tr>`;

        try {
            const res = await fetch(`api/api_daily_operations.php?action=compare_cost&startDate=${sDate}&endDate=${eDate}`);
            const json = await res.json();

            if (json.success) {
                const sum = json.summary;
                document.getElementById('simSummarySection').style.display = 'flex';

                this.animateNumber('sim_old_total', Math.round(sum.total_old));
                this.animateNumber('sim_new_total', Math.round(sum.total_new));

                const diffEl = document.getElementById('sim_diff_total');
                const diffCard = document.getElementById('sim_diff_card');
                const percentEl = document.getElementById('sim_diff_percent');

                if (diffEl) diffEl.innerText = (sum.diff > 0 ? '+' : '') + Math.round(sum.diff).toLocaleString();
                if (percentEl) percentEl.innerText = (sum.diff > 0 ? '+' : '') + sum.percent.toFixed(2) + '%';

                if (diffCard) {
                    diffCard.className = 'card h-100 shadow-sm text-white';
                    if (sum.diff > 0) diffCard.classList.add('bg-danger');
                    else if (sum.diff < 0) diffCard.classList.add('bg-success');
                    else diffCard.classList.add('bg-secondary');
                }

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
                                <td class="text-center small text-muted">${oldT > 0 ? ((diffVal / oldT) * 100).toFixed(1) : 0}%</td>
                            </tr>`;
                    });
                }
                tbody.innerHTML = html;

            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-5">Analysis Failed</td></tr>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    },

    async openShiftPlanner() {
        this.openMasterSettingsTab('v-pills-shift-tab');
        document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>`;
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
        if (!confirm(`Switch [${line} - ${team}] to ${newShiftId == 1 ? 'DAY' : 'NIGHT'}?`)) return;
        try {
            const res = await fetch('api/api_master_data.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_team_shift', line, team, new_shift_id: newShiftId }) });
            const json = await res.json();
            if (json.success) { this.openShiftPlanner(); } else alert(json.message);
        } catch (err) { alert(err.message); }
    },

    _mappingCache: [],
    async openMappingManager() {
        this.openMasterSettingsTab('v-pills-map-tab');
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
        if (!confirm('Delete mapping?')) return;
        this._mappingCache.splice(index, 1);
        await this.saveMappings();
        this.renderMappingTable(this._mappingCache);
    },
    async saveMappings() {
        await fetch('api/api_master_data.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_mappings', categories: this._mappingCache }) });
    },

    async runExecutiveReportInternal(sDate, eDate, line) {
        try {
            const url = `api/api_daily_operations.php?action=read_range_report` +
                `&startDate=${sDate}&endDate=${eDate}` +
                `&line=${encodeURIComponent(line)}&shift=ALL&type=ALL`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.success) {
                const h = json.header;
                const t = json.trend;

                UI.animateNumber('rpt_hc', h.Total_Headcount || 0);
                UI.animateNumber('rpt_actual', h.Total_Present_ManDays || 0);
                UI.animateNumber('rpt_absent', h.Total_Absent || 0);
                UI.animateNumber('rpt_leave', h.Total_Leave || 0);

                const elNew = document.getElementById('rpt_new');
                if (elNew) elNew.innerHTML = `Move: <span class="text-success">+${h.New_Joiners || 0}</span> / <span class="text-danger">-${h.Total_Resigned || 0}</span>`;

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
                        avg: count > 0 ? (sum / count).toFixed(1) : 0
                    };
                };

                const setStats = (prefix, stats) => {
                    if (document.getElementById(`${prefix}_max`)) document.getElementById(`${prefix}_max`).innerText = stats.max;
                    if (document.getElementById(`${prefix}_min`)) document.getElementById(`${prefix}_min`).innerText = stats.min;
                    if (document.getElementById(`${prefix}_avg`)) document.getElementById(`${prefix}_avg`).innerText = stats.avg;
                };

                setStats('hc', calcStats(t, 'Daily_HC'));
                setStats('act', calcStats(t, 'Daily_Actual'));
                setStats('abs', calcStats(t, 'Daily_Absent'));
                setStats('lev', calcStats(t, 'Daily_Leave'));

                UI.renderReportChart(t);
            }
        } catch (err) {
            console.error("Exec Report Error:", err);
        }
    },

    async runCostSimulationInternal(sDate, eDate, line) {
        try {
            const res = await fetch(`api/api_daily_operations.php?action=compare_cost&startDate=${sDate}&endDate=${eDate}`);
            const json = await res.json();

            if (json.success) {
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

                if (diffEl) diffEl.innerText = (diff > 0 ? '+' : '') + Math.round(diff).toLocaleString();
                if (percentEl) percentEl.innerText = (diff > 0 ? '+' : '') + percent.toFixed(2) + '%';

                if (diffCard) {
                    diffCard.className = 'card border-0 h-100 shadow text-white';
                    if (diff > 0) diffCard.style.backgroundColor = '#e74a3b';
                    else if (diff < 0) diffCard.style.backgroundColor = '#1cc88a';
                    else diffCard.style.backgroundColor = '#858796';
                }

                const tbody = document.getElementById('simTableBody');
                tbody.innerHTML = '';
                const fmt = (n) => Math.round(parseFloat(n)).toLocaleString();

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4">No data for selected criteria</td></tr>`;
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
        } catch (err) {
            console.error("Cost Sim Error:", err);
            document.getElementById('simTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error loading cost data</td></tr>`;
        }
    },

    exportSimTable() {
        if (!this._cachedAnalysisData) {
            alert("กรุณากด Run Analysis เพื่อโหลดข้อมูลก่อน Export");
            return;
        }

        const { summary, financials, trend } = this._cachedAnalysisData;
        const wb = XLSX.utils.book_new();
        if (financials && financials.length > 0) {
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

            const wsFin = XLSX.utils.json_to_sheet(finData);
            const wscols = [
                { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
            ];
            wsFin['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, wsFin, "Financial Impact");
        }

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

        if (this._execReportData && this._execReportData.length > 0) {
            const lineF = document.getElementById('superLineSelect')?.value || 'ALL';
            const teamF = document.getElementById('ia_hcGroupSelect')?.value || 'ALL';
            const searchF = (document.getElementById('execReportSearch')?.value || '').toLowerCase().trim();
            const cmpLine = lineF.trim().toUpperCase();
            const cmpTeam = teamF.trim().toUpperCase();

            const filteredExec = this._execReportData.filter(r => {
                const rLine = (r.line || '').trim().toUpperCase();
                const rTeam = (r.team_group || '').trim().toUpperCase();
                if (cmpLine !== 'ALL' && rLine !== cmpLine) return false;
                if (cmpTeam !== 'ALL' && rTeam !== cmpTeam) return false;
                if (searchF) {
                    const text = ((r.emp_id || '') + ' ' + (r.name_th || '')).toLowerCase();
                    if (!text.includes(searchF)) return false;
                }
                return true;
            });

            const kpiData = filteredExec.map(r => {
                const total = parseInt(r.total_working_days);
                const present = parseInt(r.count_present);
                const late = parseInt(r.count_late);
                const absent = parseInt(r.count_absent);
                const leave = parseInt(r.count_sick) + parseInt(r.count_business) + parseInt(r.count_vacation);
                let rate = 0;
                if (total > 0) rate = ((present + late) / total * 100).toFixed(1);

                return {
                    "EmpID": r.emp_id,
                    "Name": r.name_th,
                    "Line": r.line || '',
                    "Team": r.team_group || '',
                    "Total Working Days": total,
                    "Present": present,
                    "Late": late,
                    "Leave": leave,
                    "Absent": absent,
                    "Attendance Rate (%)": rate
                };
            });

            const wsKpi = XLSX.utils.json_to_sheet(kpiData);
            XLSX.utils.book_append_sheet(wb, wsKpi, "Employee KPIs");
        }

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Integrated_Manpower_Analysis_${dateStr}.xlsx`);
    },

    renderSimulationTable(data, apiSummary, isAllLines, targetTbodyId = 'simTableBody') {
        const tbody = document.getElementById(targetTbodyId);
        if (!tbody) return;

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

        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const toLocalISO = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const startInput = document.getElementById('ia_startDate');
        const endInput = document.getElementById('ia_endDate');
        const lineSelect = document.getElementById('superLineSelect');
        const hcGroupSelect = document.getElementById('ia_hcGroupSelect');

        if (startInput) startInput.value = toLocalISO(firstDay);
        if (endInput) endInput.value = document.getElementById('filterDate').value || toLocalISO(today);

        if (hcGroupSelect) {
            // Copy options from the main filterHcGroup
            const mainFilter = document.getElementById('filterHcGroup');
            if (mainFilter) {
                hcGroupSelect.innerHTML = mainFilter.innerHTML;
                hcGroupSelect.value = mainFilter.value;
            }
        }

        const runIfValid = () => {
            if (startInput.value && endInput.value) {
                this.runSuperAnalysis();
            }
        };

        [startInput, endInput, lineSelect].forEach(el => {
            if (el) {
                el.onchange = null;
                el.onchange = runIfValid;
            }
        });

        if (hcGroupSelect) {
            hcGroupSelect.onchange = null;
            hcGroupSelect.onchange = async () => {
                await UI.populateAnalysisDropdown(hcGroupSelect.value);
                runIfValid();
            };
        }

        UI.populateAnalysisDropdown(hcGroupSelect ? hcGroupSelect.value : 'ALL');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        setTimeout(() => this.runSuperAnalysis(), 300);
    },

    async runSuperAnalysis() {
        const start = document.getElementById('ia_startDate').value;
        const end = document.getElementById('ia_endDate').value;
        const line = document.getElementById('superLineSelect')?.value || 'ALL';
        const hcGroup = document.getElementById('ia_hcGroupSelect')?.value || 'ALL';

        UI.showLoader();

        try {
            const [analysisRes, kpiRes] = await Promise.all([
                fetch(`api/api_daily_operations.php?action=integrated_analysis&startDate=${start}&endDate=${end}&line=${encodeURIComponent(line)}&hcGroup=${encodeURIComponent(hcGroup)}`),
                fetch(`api/api_daily_operations.php?action=read_kpi_summary&startDate=${start}&endDate=${end}`)
            ]);
            
            const result = await analysisRes.json();
            const kpiResult = await kpiRes.json();

            if (result.success) {
                this._cachedAnalysisData = result.data;
                this._execReportData = kpiResult.success ? kpiResult.data : [];
                this.renderExecReport(); // Render the newly fetched KPI data
                const { summary, trend, financials, distribution } = result.data;
                const calcStats = (dataArray, key) => {
                    if (!dataArray || dataArray.length === 0) return { max: 0, min: 0, avg: 0 };
                    let max = -Infinity, min = Infinity, sum = 0, count = 0;

                    dataArray.forEach(d => {
                        if (d.Is_Work_Day !== undefined && parseInt(d.Is_Work_Day) === 0) return;

                        const val = parseInt(d[key] || 0);
                        if (val > max) max = val;
                        if (val < min) min = val;
                        sum += val;
                        count++;
                    });

                    return {
                        max: max === -Infinity ? 0 : max,
                        min: min === Infinity ? 0 : min,
                        avg: count > 0 ? (sum / count).toFixed(1) : 0
                    };
                };

                const setCardStats = (prefix, totalVal, statsObj) => {
                    UI.animateNumber(`ia_rpt_${prefix}`, totalVal);
                    if (document.getElementById(`ia_rpt_${prefix}_max`)) document.getElementById(`ia_rpt_${prefix}_max`).innerText = statsObj.max;
                    if (document.getElementById(`ia_rpt_${prefix}_min`)) document.getElementById(`ia_rpt_${prefix}_min`).innerText = statsObj.min;
                    if (document.getElementById(`ia_rpt_${prefix}_avg`)) document.getElementById(`ia_rpt_${prefix}_avg`).innerText = statsObj.avg;
                };

                const safeSummary = summary || {};
                setCardStats('hc', safeSummary.Total_Unique_HC || 0, calcStats(trend || [], 'Daily_HC'));
                setCardStats('actual', safeSummary.Total_Present_ManDays || 0, calcStats(trend || [], 'Act_Present'));
                setCardStats('absent', safeSummary.Total_Absent_ManDays || 0, calcStats(trend || [], 'Act_Absent'));
                setCardStats('leave', safeSummary.Total_Leave_ManDays || 0, calcStats(trend || [], 'Act_Leave'));
                const elAttr = document.getElementById('ia_rpt_attrition');
                const newJoin = parseInt(safeSummary.New_Joiners || 0);
                const resign = parseInt(safeSummary.Resigned || 0);

                if (elAttr) {
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
                
                // Update new dedicated KPI cards
                UI.animateNumber('ia_rpt_new_joiners', newJoin);
                UI.animateNumber('ia_rpt_resigned', resign);

                UI.renderIntegratedFinancialTable(financials, 'ia_simTableBody');
                const totalStd = financials.reduce((sum, row) => sum + row.cost_standard, 0);
                const totalAct = financials.reduce((sum, row) => sum + row.cost_actual, 0);
                const diffVal = totalAct - totalStd;
                const diffPct = totalStd > 0 ? ((diffVal / totalStd) * 100) : 0;

                UI.animateNumber('sim_old_total', Math.round(totalStd));
                UI.animateNumber('sim_new_total', Math.round(totalAct));

                const diffEl = document.getElementById('sim_diff_total');
                if (diffEl) diffEl.innerText = (diffVal > 0 ? '+' : '') + Math.round(diffVal).toLocaleString();

                const pctEl = document.getElementById('sim_diff_percent');
                if (pctEl) {
                    pctEl.innerText = (diffPct > 0 ? '+' : '') + diffPct.toFixed(2) + '%';
                    pctEl.parentElement.className = `badge ${diffPct > 5 ? 'bg-danger' : (diffPct < -5 ? 'bg-success' : 'bg-secondary')} p-2`;
                }

                UI.renderIntegratedLineChart(trend);
                UI.renderIntegratedStructureDonut(distribution);
                UI.renderIntegratedComboChart(trend);

                const sumPresent = trend.reduce((s, d) => s + parseInt(d.Act_Present || 0), 0);
                const sumLate = trend.reduce((s, d) => s + parseInt(d.Act_Late || 0), 0);
                const sumAbsent = trend.reduce((s, d) => s + parseInt(d.Act_Absent || 0), 0);
                const sumLeave = trend.reduce((s, d) => s + parseInt(d.Act_Leave || 0), 0);

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
    },

    async saveAnalysisAsImage() {
        if (typeof html2canvas === 'undefined') {
            UI.showLoader();
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'script/html2canvas.min.js?v=1.4.1';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch (e) {
                alert('Failed to dynamically load Image Capture Library. Please check your network.');
                UI.hideLoader();
                return;
            }
            UI.hideLoader();
        }

        const modalBody = document.querySelector('#integratedAnalysisModal .modal-body');
        if (!modalBody) return;

        UI.showLoader();
        try {
            // Adjust styling temporarily for better capture if needed
            const originalOverflow = modalBody.style.overflow;
            modalBody.style.overflow = 'visible';

            const canvas = await html2canvas(modalBody, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#f8f9fc',
                logging: false
            });

            // Restore styling
            modalBody.style.overflow = originalOverflow;

            // Trigger download
            const image = canvas.toDataURL("image/jpeg", 0.9);
            const link = document.createElement('a');
            
            const start = document.getElementById('ia_startDate').value;
            const end = document.getElementById('ia_endDate').value;
            link.download = `Manpower_Analysis_${start}_to_${end}.jpg`;
            link.href = image;
            link.click();
        } catch (err) {
            console.error("Error capturing image:", err);
            alert("Failed to capture image: " + err.message);
        } finally {
            UI.hideLoader();
        }
    }
};