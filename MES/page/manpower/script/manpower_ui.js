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
        this.animateNumber('kpi-cost', parseInt(totalCost));
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

        for (const [line, val] of Object.entries(grouped)) {
            labels.push(line);
            dataPlan.push(val.plan);
            dataActual.push(val.actual);
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
                    { label: 'Plan', data: dataPlan, backgroundColor: '#4e73df', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 },
                    { label: 'Actual', data: dataActual, backgroundColor: '#1cc88a', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 }
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
    // 3. MAIN TABLE
    // =========================================================================
    processGroupedData(rawData, viewMode) {
        const groups = {};
        const grandTotal = { name: 'GRAND TOTAL', hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 };

        rawData.forEach(row => {
            let mainKey, subKeyName, itemKeyName;
            let metaLine = '', metaShift = '', metaType = '';
            let shiftId = (row.shift_name && row.shift_name.includes('Day')) ? '1' : '2';

            if (viewMode === 'TYPE') {
                mainKey = row.emp_type || 'Uncategorized';
                subKeyName = row.line_name || '-';
                itemKeyName = `${row.shift_name} (${row.team_group})`;
                metaLine = row.line_name; metaType = mainKey;
            } else if (viewMode === 'SHIFT') {
                mainKey = row.shift_name || 'Unassigned';
                subKeyName = row.line_name || '-';
                itemKeyName = row.emp_type || 'General';
                metaLine = row.line_name; metaShift = shiftId;
            } else { // LINE (Default)
                mainKey = row.line_name || 'Unassigned';
                subKeyName = `${row.shift_name} ${row.team_group ? '('+row.team_group+')' : ''}`;
                itemKeyName = row.emp_type || 'General';
                metaLine = mainKey; metaShift = shiftId;
            }

            const stats = {
                hc: parseInt(row.total_hc || 0), plan: parseInt(row.plan || 0),
                present: parseInt(row.present || 0), late: parseInt(row.late || 0),
                absent: parseInt(row.absent || 0), leave: parseInt(row.leave || 0),
                cost: parseFloat(row.total_cost || 0)
            };
            stats.actual = stats.present + stats.late;

            // Parent
            if (!groups[mainKey]) groups[mainKey] = { name: mainKey, subs: {}, total: this._initStats() };
            this._accumulateStats(groups[mainKey].total, stats);

            // Sub
            if (!groups[mainKey].subs[subKeyName]) {
                groups[mainKey].subs[subKeyName] = { 
                    name: subKeyName, items: {}, total: this._initStats(),
                    meta: { line: metaLine, shift: metaShift, type: metaType }
                };
            }
            this._accumulateStats(groups[mainKey].subs[subKeyName].total, stats);

            // Item
            if (!groups[mainKey].subs[subKeyName].items[itemKeyName]) {
                groups[mainKey].subs[subKeyName].items[itemKeyName] = { 
                    name: itemKeyName, 
                    meta: { line: row.line_name, shift: shiftId, type: row.emp_type },
                    ...stats 
                };
            } else {
                this._accumulateStats(groups[mainKey].subs[subKeyName].items[itemKeyName], stats);
            }
            this._accumulateStats(grandTotal, stats);
        });

        this._calculateDiff(grandTotal);
        Object.values(groups).forEach(group => {
            this._calculateDiff(group.total);
            Object.values(group.subs).forEach(sub => {
                this._calculateDiff(sub.total);
                Object.values(sub.items).forEach(item => this._calculateDiff(item));
            });
        });
        return { groups, grandTotal };
    },

    _initStats() { return { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 }; },

    _accumulateStats(target, source) {
        target.hc += source.hc; target.plan += source.plan; target.present += source.present;
        target.late += source.late; target.absent += source.absent; target.leave += source.leave;
        target.actual += source.actual; target.cost += source.cost;
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
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <div class="d-flex flex-column align-items-center justify-content-center opacity-50">
                        <i class="fas fa-folder-open fa-3x mb-3 text-gray-300"></i>
                        <h6 class="fw-bold text-secondary">ไม่พบข้อมูลตามเงื่อนไข</h6>
                        <small class="text-muted">ลองเปลี่ยนวันที่ หรือตัวกรองข้อมูลใหม่</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
        
        const { groups, grandTotal } = this.processGroupedData(data, viewMode);
        
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true });
        
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
                    meta: sub.meta,
                    rowClass: groupTarget,
                    isHidden: true,
                    toggleTarget: subTarget
                });
                
                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                
                sortedItems.forEach(item => {
                    tbody.innerHTML += this._createRowHtml(item.name, item, { 
                        isGrandChild: true, 
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

    _createRowHtml(label, stats, options = {}) {
        const { isGrand, isParent, isChild, isGrandChild, viewMode, rawName, meta, toggleTarget, rowClass, isHidden } = options;
        
        let diffClass = 'text-muted opacity-50', diffPrefix = '';
        if (stats.diff < 0) diffClass = 'text-danger fw-bold';
        else if (stats.diff > 0) { diffClass = 'text-warning fw-bold text-dark'; diffPrefix = '+'; }
        else if (stats.plan > 0) diffClass = 'text-success fw-bold';

        let rowStyle = isHidden ? 'display: none;' : ''; 
        let rowHtmlClass = rowClass || ''; 
        let rowBg = '';
        let nameHtml = label;
        let tLine = '', tShift = '', tType = 'ALL';
        let canClick = false;
        let toggleAttr = ''; 

        const chevron = `<i class="fas fa-chevron-right me-2 text-muted transition-icon" style="font-size: 0.8em;"></i>`;

        if (isGrand) {
            rowBg = 'table-dark fw-bold border-bottom-0';
            nameHtml = `<i class="fas fa-chart-pie me-2"></i>${label}`;
            canClick = true; 
        } 
        else if (isParent) {
            rowBg = 'table-secondary fw-bold border-top border-white cursor-pointer'; 
            let icon = viewMode === 'TYPE' ? 'fa-user-tag' : (viewMode === 'SHIFT' ? 'fa-clock' : 'fa-layer-group');
            
            nameHtml = `${chevron}<i class="fas ${icon} me-2 opacity-50"></i>${label}`;

            if (viewMode === 'LINE') { tLine = rawName; canClick = true; }
            else if (viewMode === 'TYPE') { tType = rawName; canClick = true; }
            
            if (toggleTarget) toggleAttr = `onclick="UI.toggleRows('${toggleTarget}', this)"`;
        } 
        else if (isChild) {
            rowBg = 'bg-light fw-bold cursor-pointer';
            nameHtml = `<div style="padding-left: 25px; border-left: 3px solid #dee2e6;">${chevron}${label}</div>`;
            
            if (meta) { tLine = meta.line || ''; tShift = meta.shift || ''; tType = meta.type || 'ALL'; canClick = true; }
            
            if (toggleTarget) toggleAttr = `onclick="UI.toggleRows('${toggleTarget}', this)"`;
        } 
        else if (isGrandChild) {
            rowBg = 'bg-white';
            nameHtml = `<div style="padding-left: 55px; border-left: 3px solid #dee2e6;"><span class="text-secondary small" style="font-size: 0.85rem;">• ${label}</span></div>`;
            if (meta) { tLine = meta.line; tShift = meta.shift; tType = meta.type; canClick = true; }
        }

        const clickAttr = (status) => canClick ? `onclick="event.stopPropagation(); Actions.openDetailModal('${tLine}', '${tShift}', '${tType}', '${status}')" title="Filter: ${status}" style="cursor: pointer;"` : '';
        const hoverClass = canClick ? 'cursor-pointer-cell' : '';
        const costDisplay = stats.cost > 0 ? new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(stats.cost) : '-';

        return `
            <tr class="${rowBg} ${rowHtmlClass}" style="${rowStyle}" ${toggleAttr}>
                <td class="ps-3 text-truncate" style="max-width: 300px;">
                    ${(isParent || isChild) ? nameHtml :
                      (isGrand ? nameHtml : `<span onclick="event.stopPropagation(); Actions.openDetailModal('${tLine}', '${tShift}', '${tType}', 'ALL')" class="cursor-pointer text-decoration-underline">${nameHtml}</span>`)
                    }
                </td>
                <td class="text-center text-primary border-end border-light opacity-75 small">${stats.hc || '-'}</td>
                <td class="text-center fw-bold ${hoverClass}" style="display: none;" ${clickAttr('ALL')}>${stats.plan}</td>
                <td class="text-center text-success ${hoverClass}" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning text-dark ${hoverClass}" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass}" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info text-dark ${hoverClass}" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end ${hoverClass}" style="background-color: rgba(0,0,0,0.02);" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                <td class="text-center ${diffClass}">${diffPrefix}${stats.diff}</td>
                <td class="text-end pe-4 text-secondary small">${costDisplay}</td>
            </tr>`;
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
            if(footerTrend) footerTrend.style.setProperty('display', 'none', 'important'); // Force hide

        } else {
            btnDaily.classList.remove('active');
            btnTrend.classList.add('active');
            
            viewDaily.style.display = 'none';
            viewTrend.style.display = 'block';
            
            if(footerDaily) footerDaily.style.display = 'none';
            if(footerTrend) footerTrend.style.setProperty('display', 'flex', 'important'); // Force flex
            
            if (this.charts && this.charts.trend) {
                this.charts.trend.resize();
            }
        }
    }
};

// =============================================================================
// 4. ACTIONS
// =============================================================================

const Actions = {
    _structureCache: { lines: [], teams: [] },
    _lastDetailParams: { line: '', shiftId: '', empType: '', filterStatus: 'ALL' },

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
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmpEdit('${masterJson}')"><i class="fas fa-user-edit text-secondary me-2"></i>แก้ไขข้อมูลหลัก</a></li>

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
                const d = new Date(dateStr); d.setDate(d.getDate() + 1);
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

                    if(typeof App !== 'undefined') App.loadData(true);

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
    // 6. EMPLOYEE MANAGER
    // -------------------------------------------------------------------------
    _employeeCache: [],
    async openEmployeeManager() {
        const modal = new bootstrap.Modal(document.getElementById('empListModal'));
        document.getElementById('empListBody').innerHTML = UI.getSkeletonRow(8);
        if(!document.getElementById('empListModal').classList.contains('show')) modal.show();
        
        try {
            const showAll = document.getElementById('showInactiveToggle').checked;
            const res = await fetch(`api/api_master_data.php?action=read_employees&show_all=${showAll}`);
            const json = await res.json();
            if (json.success) { this._employeeCache = json.data; this.renderEmployeeTable(json.data); }
        } catch (e) { console.error(e); }
    },

    renderEmployeeTable(list) {
         const tbody = document.getElementById('empListBody'); tbody.innerHTML = '';
         if (!list || list.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`; return; }
         
         list.forEach(emp => {
             const statusBadge = (emp.is_active == 1) ? '<span class="badge badge-soft-success badge-pill">Active</span>' : '<span class="badge bg-light text-secondary border badge-pill">Inactive</span>';
             let typeClass = 'badge-soft-secondary';
             if (emp.emp_type === 'Monthly') typeClass = 'badge-soft-primary';
             else if (emp.emp_type === 'Daily') typeClass = 'badge-soft-success';
             else if (emp.emp_type === 'Subcontract') typeClass = 'badge-soft-warning';
             
             tbody.innerHTML += `
                <tr>
                    <td class="ps-4 font-monospace small text-muted">${emp.emp_id}</td>
                    <td class="fw-bold text-dark">${emp.name_th}</td>
                    <td><span class="badge ${typeClass} badge-pill">${emp.emp_type}</span></td> 
                    <td><span class="fw-bold text-primary small">${emp.line}</span></td>
                    <td class="text-center small">${emp.shift_name || '-'}</td>
                    <td class="text-center fw-bold text-dark">${emp.team_group || '-'}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center pe-4">
                        <button class="btn btn-sm btn-light border shadow-sm rounded-circle" style="width: 32px; height: 32px;" onclick="Actions.openEmpEdit('${encodeURIComponent(JSON.stringify(emp))}')"><i class="fas fa-pen text-secondary"></i></button>
                    </td>
                </tr>`;
         });
    },

    filterEmployeeList() {
        const term = document.getElementById('empSearchBox').value.toLowerCase();
        const filtered = this._employeeCache.filter(emp => 
            (emp.name_th && emp.name_th.toLowerCase().includes(term)) || 
            (emp.emp_id && emp.emp_id.toLowerCase().includes(term)) || 
            (emp.line && emp.line.toLowerCase().includes(term))
        );
        this.renderEmployeeTable(filtered);
    },

    openEmpEdit(data) {
        const modal = new bootstrap.Modal(document.getElementById('empEditModal'));
        const isEdit = !!data;
        document.getElementById('isEditMode').value = isEdit ? '1' : '0';
        document.getElementById('empEditTitle').innerHTML = isEdit ? 'Edit Employee' : 'New Employee';
        if(this._structureCache.lines.length === 0) this.initDropdowns();

        if(isEdit) {
            const emp = JSON.parse(decodeURIComponent(data));
            document.getElementById('empEditId').value = emp.emp_id; document.getElementById('empEditId').readOnly = true;
            document.getElementById('empEditName').value = emp.name_th; document.getElementById('empEditPos').value = emp.position;
            setTimeout(() => {
                document.getElementById('empEditLine').value = emp.line; 
                document.getElementById('empEditShift').value = emp.default_shift_id;
                document.getElementById('empEditTeam').value = emp.team_group; 
            }, 100);
            document.getElementById('empEditActive').checked = (emp.is_active==1);
            if(document.getElementById('btnDeleteEmp')) document.getElementById('btnDeleteEmp').style.display = 'block';
        } else {
            document.getElementById('empEditForm').reset(); 
            document.getElementById('empEditId').readOnly = false; 
            document.getElementById('empEditActive').checked = true;
            if(document.getElementById('btnDeleteEmp')) document.getElementById('btnDeleteEmp').style.display = 'none';
        }
        modal.show();
    },

    async saveEmployee() {
        const isActive = document.getElementById('empEditActive').checked ? 1 : 0;
        const isEdit = document.getElementById('isEditMode').value === '1';
        const payload = {
            action: isEdit ? 'update_employee' : 'create_employee',
            emp_id: document.getElementById('empEditId').value,
            name_th: document.getElementById('empEditName').value,
            position: document.getElementById('empEditPos').value,
            line: document.getElementById('empEditLine').value,
            shift_id: document.getElementById('empEditShift').value,
            team_group: document.getElementById('empEditTeam').value,
            is_active: document.getElementById('empEditActive').checked ? 1 : 0
        };
        if(!payload.emp_id || !payload.name_th) { alert('Please fill in required fields'); return; }

        try {
            const res = await fetch('api/api_master_data.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const json = await res.json();
            if(json.success) { 
                bootstrap.Modal.getInstance(document.getElementById('empEditModal')).hide(); 
                if(document.getElementById('empListModal').classList.contains('show')) Actions.openEmployeeManager();
                App.loadData(); 
            } else alert('Error: ' + json.message);
        } catch(e) { alert('Failed: ' + e.message); }
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
    }
};