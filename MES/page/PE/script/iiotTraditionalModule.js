/**
 * iiotTraditionalModule.js
 * Logic for the Traditional KPI Dashboard (IIoT)
 */

const iiotTraditionalModule = (function () {
    let machineData = [];
    let chartHourly = null;
    let chartStatus = null;

    async function init() {
        await refreshData();
    }

    async function refreshData() {
        try {
            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_machines' });
            if (res.success) {
                machineData = res.data || [];
                
                updateKPICards();
                renderTable();
                renderCharts();
            }
        } catch (error) {
            console.error('Error loading traditional dashboard data:', error);
            PEApp.showToast('Failed to load dashboard data', 'danger');
        }
    }



    function updateKPICards() {
        if (machineData.length === 0) return;

        let active = 0, repair = 0, connected = 0;
        const lines = new Set();
        const areas = new Set();

        machineData.forEach(m => {
            if (m.status === 'Active') active++;
            if (m.status === 'Under Repair') repair++;
            if (m.mqtt_topic && m.mqtt_topic.trim() !== '') connected++;
            if (m.line) lines.add(m.line);
            if (m.area) areas.add(m.area);
        });

        document.getElementById('kpiTradTotal').innerHTML = `${machineData.length} <span class="unit">units</span>`;
        document.getElementById('kpiTradActive').innerHTML = `${active} <span class="unit">units</span>`;
        document.getElementById('kpiTradRepair').innerHTML = `${repair} <span class="unit">units</span>`;
        document.getElementById('kpiTradConnected').innerHTML = `${connected} <span class="unit">units</span>`;
        document.getElementById('kpiTradLines').innerHTML = `${lines.size} <span class="unit">lines</span>`;
        document.getElementById('kpiTradAreas').innerHTML = `${areas.size} <span class="unit">areas</span>`;
    }

    function renderTable(filterText = '') {
        const tbody = document.getElementById('tradMachineBody');
        tbody.innerHTML = '';

        if (machineData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="pe-text-center">No IIoT machines found</td></tr>';
            return;
        }

        const filtered = machineData.filter(m => {
            const name = (m.machine_name || '').toLowerCase();
            const code = (m.machine_code || '').toLowerCase();
            return name.includes(filterText) || code.includes(filterText);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="pe-text-center">No machines match the search</td></tr>';
            return;
        }

        filtered.forEach(m => {
            let statusBadge = '';
            if (m.status === 'Active') statusBadge = '<span class="pe-badge pe-badge-success">Active</span>';
            else if (m.status === 'Under Repair') statusBadge = '<span class="pe-badge pe-badge-danger">Under Repair</span>';
            else statusBadge = `<span class="pe-badge pe-badge-secondary">${m.status || 'Unknown'}</span>`;
            
            const iiotBadge = (m.mqtt_topic && m.mqtt_topic.trim() !== '') 
                ? `<span class="pe-badge pe-badge-info"><i class="fas fa-wifi"></i> ${m.mqtt_topic}</span>` 
                : `<span class="pe-badge pe-badge-secondary">Not Connected</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.machine_code || '-'}</strong></td>
                <td>${m.machine_name || '-'}</td>
                <td>${m.line || '-'} ${m.area ? `(${m.area})` : ''}</td>
                <td>${m.machine_type || '-'}</td>
                <td>${m.manufacturer || '-'}</td>
                <td class="pe-text-center">${statusBadge}</td>
                <td class="pe-text-center">${iiotBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function filterTable() {
        const val = document.getElementById('tradMachineSearch').value.toLowerCase();
        renderTable(val);
    }

    function renderCharts() {
        // Destroy existing charts if any
        if (chartHourly) chartHourly.destroy();
        if (chartStatus) chartStatus.destroy();

        // 1. Asset Health by Line (Stacked Bar Chart)
        const ctxHourly = document.getElementById('chartTradHourlyProduction').getContext('2d');
        
        // Group by line and status
        const lineStats = {};
        machineData.forEach(m => {
            const l = m.line || 'Unassigned';
            if (!lineStats[l]) {
                lineStats[l] = { active: 0, repair: 0, other: 0 };
            }
            if (m.status === 'Active') lineStats[l].active++;
            else if (m.status === 'Under Repair') lineStats[l].repair++;
            else lineStats[l].other++;
        });
        
        const labelsHourly = Object.keys(lineStats);
        const dataActive = labelsHourly.map(l => lineStats[l].active);
        const dataRepair = labelsHourly.map(l => lineStats[l].repair);
        const dataOther = labelsHourly.map(l => lineStats[l].other);

        chartHourly = new Chart(ctxHourly, {
            type: 'bar',
            data: {
                labels: labelsHourly,
                datasets: [
                    {
                        label: 'Active',
                        data: dataActive,
                        backgroundColor: '#22c55e',
                        borderRadius: 4
                    },
                    {
                        label: 'Under Repair',
                        data: dataRepair,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    },
                    {
                        label: 'Inactive/Other',
                        data: dataOther,
                        backgroundColor: '#64748b',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 0 } },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#475569', font: { size: 13 } }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: '#475569' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#475569', stepSize: 1 }
                    }
                }
            }
        });

        // 2. Machine Status Doughnut Chart
        const ctxStatus = document.getElementById('chartTradMachineStatus').getContext('2d');
        let active = 0, repair = 0, inactive = 0, other = 0;
        machineData.forEach(m => {
            if (m.status === 'Active') active++;
            else if (m.status === 'Under Repair') repair++;
            else if (m.status === 'Inactive') inactive++;
            else other++;
        });

        chartStatus = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Under Repair', 'Inactive', 'Other'],
                datasets: [{
                    data: [active, repair, inactive, other],
                    backgroundColor: ['#22c55e', '#ef4444', '#64748b', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                layout: {
                    padding: { top: 0 }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#475569', 
                            padding: 16, 
                            font: { size: 13, weight: '500' }
                        }
                    }
                }
            },
            plugins: [{
                id: 'doughnutLabel',
                afterDraw(chart) {
                    const { ctx } = chart;
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const val = dataset.data[index];
                            if (val > 0) {
                                const pos = element.tooltipPosition();
                                ctx.save();
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 15px Inter, sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(val, pos.x, pos.y);
                                ctx.restore();
                            }
                        });
                    });
                }
            }]
        });
    }

    return {
        init,
        refreshData,
        filterTable
    };
})();
