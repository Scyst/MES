// iiotAnalyticsModule.js - Handles Historical IIoT Analytics Data
const IIoTAnalyticsModule = (() => {
    let oeeTrendChart = null;
    let outputTrendChart = null;
    
    // Default to last 7 days
    function init() {
        if (!document.getElementById('iiotAnalyticsStartDate').value) {
            setPeriod('week', false);
        }
        loadMachines();
        fetchData();
    }
    let allMachines = [];

    async function loadMachines() {
        try {
            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_machines', iiot_only: 1 });
            if (res.success && res.data) {
                allMachines = res.data;
                const lines = [...new Set(res.data.map(m => m.line).filter(Boolean))].sort();
                
                const lineSelect = document.getElementById('iiotAnalyticsFilterLine');
                const currentLine = lineSelect.value;
                lineSelect.innerHTML = '<option value="">All Lines</option>';
                lines.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l;
                    opt.textContent = l; // Removed 'Line ' prefix
                    lineSelect.appendChild(opt);
                });
                lineSelect.value = currentLine;
                
                onLineChange(false);
            }
        } catch (e) {
            console.error('Failed to load machines', e);
        }
    }

    function onLineChange(autoFetch = true) {
        const line = document.getElementById('iiotAnalyticsFilterLine').value;
        const select = document.getElementById('iiotAnalyticsFilterMachine');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">All Machines</option>';
        
        const filteredMachines = line ? allMachines.filter(m => m.line === line) : allMachines;
        
        filteredMachines.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.machine_code;
            opt.textContent = `${m.machine_code} - ${m.machine_name}`;
            select.appendChild(opt);
        });
        
        if (filteredMachines.some(m => m.machine_code === currentValue)) {
            select.value = currentValue;
        } else {
            select.value = '';
        }
        
        if (autoFetch) fetchData();
    }
    
    function setPeriod(period, autoFetch = true) {
        const today = new Date();
        let start = new Date();
        let end = new Date();
        
        switch (period) {
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'week':
                start.setDate(today.getDate() - 7);
                break;
            case 'month':
                start.setDate(1);
                break;
            case 'last_month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
        }
        
        const formatDate = d => {
            const tzOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
        };
        document.getElementById('iiotAnalyticsStartDate').value = formatDate(start);
        document.getElementById('iiotAnalyticsEndDate').value = formatDate(end);
        
        // Update chip active state
        document.querySelectorAll('#panel-iiot_analytics .pe-chip').forEach(c => c.classList.remove('active'));
        const activeChip = document.querySelector(`#panel-iiot_analytics .pe-chip[onclick*="'${period}'"]`);
        if (activeChip) activeChip.classList.add('active');
        
        if (autoFetch) fetchData();
    }

    async function fetchData() {
        const startDate = document.getElementById('iiotAnalyticsStartDate').value;
        const endDate = document.getElementById('iiotAnalyticsEndDate').value;
        const line = document.getElementById('iiotAnalyticsFilterLine').value;
        const machine = document.getElementById('iiotAnalyticsFilterMachine').value;

        if (!startDate || !endDate) return;

        const kpiElements = ['kpiAvgOee', 'kpiAvgAvailability', 'kpiAvgPerformance', 'kpiAvgQuality', 'kpiTotalOutput'];
        kpiElements.forEach(id => {
            document.getElementById(id).innerHTML = '<i class="fas fa-spinner fa-spin pe-text-muted"></i>';
        });
        document.getElementById('iiotMachineSummaryBody').innerHTML = '<tr><td colspan="9" class="pe-text-center">Loading Data...</td></tr>';
        
        try {
            const res = await PEApp.apiCall('iiotAPI.php', { 
                action: 'get_historical_iiot_analytics',
                start_date: startDate,
                end_date: endDate,
                line: line,
                machine: machine
            });
            
            if (res.success && res.data) {
                updateKpis(res.data.summary);
                updateCharts(res.data.trend);
                updateTable(res.data.machines);
            }
        } catch (e) {
            console.error(e);
            PEApp.showToast('Failed to load historical data', 'error');
            document.getElementById('iiotMachineSummaryBody').innerHTML = '<tr><td colspan="9" class="pe-text-center pe-text-danger">Failed to load data</td></tr>';
        }
    }
    
    function updateKpis(summary) {
        document.getElementById('kpiAvgOee').innerHTML = `${summary.oee.toFixed(1)} <span class="unit">%</span>`;
        document.getElementById('kpiAvgAvailability').innerHTML = `${summary.availability.toFixed(1)} <span class="unit">%</span>`;
        document.getElementById('kpiAvgPerformance').innerHTML = `${summary.performance.toFixed(1)} <span class="unit">%</span>`;
        document.getElementById('kpiAvgQuality').innerHTML = `${summary.quality.toFixed(1)} <span class="unit">%</span>`;
        document.getElementById('kpiTotalOutput').innerHTML = `${summary.total_output.toLocaleString()} <span class="unit">pcs</span>`;
        document.getElementById('kpiDefectsSub').textContent = `${summary.total_defects.toLocaleString()} Defects`;
    }
    
    function updateCharts(trendData) {
        const labels = trendData.map(d => d.date);
        
        // 1. OEE Trend
        const ctxOee = document.getElementById('chartOeeTrend').getContext('2d');
        if (oeeTrendChart) oeeTrendChart.destroy();
        
        oeeTrendChart = new Chart(ctxOee, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'OEE %',
                        data: trendData.map(d => d.oee),
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Availability %',
                        data: trendData.map(d => d.availability),
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        hidden: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
        
        // 2. Output Trend (Stacked Bar)
        const ctxOut = document.getElementById('chartOutputTrend').getContext('2d');
        if (outputTrendChart) outputTrendChart.destroy();
        
        outputTrendChart = new Chart(ctxOut, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Output Strokes',
                        data: trendData.map(d => d.output),
                        backgroundColor: '#3b82f6',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Defects',
                        data: trendData.map(d => d.defects),
                        backgroundColor: '#ef4444',
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }
    
    function updateTable(machines) {
        const tbody = document.getElementById('iiotMachineSummaryBody');
        tbody.innerHTML = '';
        
        if (!machines || machines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="pe-text-center">No machine data for this period</td></tr>';
            return;
        }
        
        machines.sort((a, b) => b.oee - a.oee); // Sort by OEE descending
        
        machines.forEach(m => {
            const isUnassigned = m.machine_code.includes('(Unassigned)');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="pe-fw-bold ${isUnassigned ? 'text-gray-400 italic' : ''}">${m.machine_code}</td>
                <td class="pe-text-end text-success">${isUnassigned ? '-' : (m.online_seconds / 3600).toFixed(1)}</td>
                <td class="pe-text-end text-danger">${isUnassigned ? '-' : (m.offline_seconds / 3600).toFixed(1)}</td>
                <td class="px-6 py-4 text-right font-bold text-gray-700 dark:text-gray-200">${isUnassigned ? '-' : Number(m.output).toLocaleString()}</td>
                <td class="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">${Number(m.erp_output || 0).toLocaleString()}</td>
                <td class="px-6 py-4 text-right font-bold text-red-500">${Number(m.defects).toLocaleString()}</td>
                <td class="pe-text-end">
                    ${isUnassigned ? '-' : `
                    <div class="progress" style="height: 6px; background-color: #e2e8f0; margin-bottom: 2px;">
                        <div class="progress-bar bg-success" style="width: ${m.availability}%"></div>
                    </div>
                    <small>${m.availability.toFixed(1)}%</small>
                    `}
                </td>
                <td class="pe-text-end">
                    ${isUnassigned ? '-' : `
                    <div class="progress" style="height: 6px; background-color: #e2e8f0; margin-bottom: 2px;">
                        <div class="progress-bar bg-warning" style="width: ${m.performance}%"></div>
                    </div>
                    <small>${m.performance.toFixed(1)}%</small>
                    `}
                </td>
                <td class="pe-text-end">
                    ${isUnassigned ? '-' : `
                    <div class="progress" style="height: 6px; background-color: #e2e8f0; margin-bottom: 2px;">
                        <div class="progress-bar" style="width: ${m.quality}%; background-color: #6366f1;"></div>
                    </div>
                    <small>${m.quality.toFixed(1)}%</small>
                    `}
                </td>
                <td class="pe-text-end">
                    ${isUnassigned ? '-' : `
                    <h5 class="pe-m-0 ${m.oee >= 80 ? 'text-success' : (m.oee >= 60 ? 'text-warning' : 'text-danger')}">
                        ${m.oee.toFixed(1)}%
                    </h5>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    return {
        init,
        setPeriod,
        fetchData,
        onLineChange
    };
})();

window.IIoTAnalyticsModule = IIoTAnalyticsModule;
export default IIoTAnalyticsModule;
