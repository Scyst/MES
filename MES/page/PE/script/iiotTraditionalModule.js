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

        // 1. Machines by Line (Bar Chart)
        const ctxHourly = document.getElementById('chartTradHourlyProduction').getContext('2d');
        
        // Group by line
        const lineCount = {};
        machineData.forEach(m => {
            const l = m.line || 'Unassigned';
            lineCount[l] = (lineCount[l] || 0) + 1;
        });
        const labelsHourly = Object.keys(lineCount);
        const dataOutput = Object.values(lineCount);

        chartHourly = new Chart(ctxHourly, {
            type: 'bar',
            data: {
                labels: labelsHourly,
                datasets: [
                    {
                        label: 'Total Machines',
                        data: dataOutput,
                        backgroundColor: '#38bdf8',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // hide legend since it's just one dataset
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#334155' },
                        ticks: { color: '#cbd5e1', stepSize: 1 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#cbd5e1' }
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
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', padding: 20 }
                    }
                }
            }
        });
    }

    return {
        init,
        refreshData,
        filterTable
    };
})();
