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
                // Filter only IIoT connected machines
                machineData = res.data.filter(m => m.mqtt_topic && m.mqtt_topic.trim() !== '');
                
                // Simulate IIoT Data since MQTT backend isn't fully ready
                simulateIIoTData();

                updateKPICards();
                renderTable();
                renderCharts();
            }
        } catch (error) {
            console.error('Error loading traditional dashboard data:', error);
            PEApp.showToast('Failed to load dashboard data', 'danger');
        }
    }

    function simulateIIoTData() {
        machineData.forEach(m => {
            // Simulate status with weights
            const rand = Math.random();
            if (rand < 0.7) m.iiot_status = 'ONLINE';
            else if (rand < 0.85) m.iiot_status = 'IDLE';
            else if (rand < 0.95) m.iiot_status = 'ERROR';
            else m.iiot_status = 'OFFLINE';

            // Simulate OEE factors
            if (m.iiot_status === 'ONLINE') {
                m.availability = Math.floor(Math.random() * 15 + 85); // 85-100
                m.performance = Math.floor(Math.random() * 10 + 90); // 90-100
                m.quality = Math.floor(Math.random() * 5 + 95); // 95-100
                m.oee = Math.floor((m.availability * m.performance * m.quality) / 10000);
                m.good_pcs = Math.floor(Math.random() * 5000 + 1000);
                m.ng_pcs = Math.floor(Math.random() * 100);
                m.temperature = Math.floor(Math.random() * 20 + 40); // 40-60
            } else {
                m.availability = 0;
                m.performance = 0;
                m.quality = 0;
                m.oee = 0;
                m.good_pcs = 0;
                m.ng_pcs = 0;
                m.temperature = Math.floor(Math.random() * 10 + 25); // 25-35
            }
        });
    }

    function updateKPICards() {
        if (machineData.length === 0) return;

        let totalOEE = 0, totalAvail = 0, totalPerf = 0, totalQual = 0;
        let totalGood = 0, totalNG = 0;
        let onlineCount = 0;

        machineData.forEach(m => {
            if (m.iiot_status === 'ONLINE') {
                totalOEE += m.oee;
                totalAvail += m.availability;
                totalPerf += m.performance;
                totalQual += m.quality;
                onlineCount++;
            }
            totalGood += m.good_pcs;
            totalNG += m.ng_pcs;
        });

        const avgOEE = onlineCount > 0 ? Math.round(totalOEE / onlineCount) : 0;
        const avgAvail = onlineCount > 0 ? Math.round(totalAvail / onlineCount) : 0;
        const avgPerf = onlineCount > 0 ? Math.round(totalPerf / onlineCount) : 0;
        const avgQual = onlineCount > 0 ? Math.round(totalQual / onlineCount) : 0;

        document.getElementById('kpiTradOEE').innerHTML = `${avgOEE} <span class="unit">%</span>`;
        document.getElementById('kpiTradAvail').innerHTML = `${avgAvail} <span class="unit">%</span>`;
        document.getElementById('kpiTradPerf').innerHTML = `${avgPerf} <span class="unit">%</span>`;
        document.getElementById('kpiTradQual').innerHTML = `${avgQual} <span class="unit">%</span>`;
        document.getElementById('kpiTradOutput').innerHTML = `${totalGood.toLocaleString()} <span class="unit">pcs</span>`;
        document.getElementById('kpiTradDefects').innerHTML = `${totalNG.toLocaleString()} <span class="unit">pcs</span>`;
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
            if (m.iiot_status === 'ONLINE') statusBadge = '<span class="pe-badge pe-badge-success">ONLINE</span>';
            else if (m.iiot_status === 'IDLE') statusBadge = '<span class="pe-badge pe-badge-warning">IDLE</span>';
            else if (m.iiot_status === 'ERROR') statusBadge = '<span class="pe-badge pe-badge-danger">ERROR</span>';
            else statusBadge = '<span class="pe-badge pe-badge-secondary">OFFLINE</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.machine_code}</strong></td>
                <td>${m.machine_name}</td>
                <td class="pe-text-center">${statusBadge}</td>
                <td class="pe-text-end font-monospace">${m.oee}%</td>
                <td class="pe-text-end font-monospace" style="color:var(--pe-success);">${m.good_pcs.toLocaleString()}</td>
                <td class="pe-text-end font-monospace" style="color:var(--pe-danger);">${m.ng_pcs.toLocaleString()}</td>
                <td class="pe-text-end font-monospace">${m.temperature}°C</td>
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

        // 1. Hourly Production Chart (Simulated Data)
        const ctxHourly = document.getElementById('chartTradHourlyProduction').getContext('2d');
        const labelsHourly = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        const dataOutput = labelsHourly.map(() => Math.floor(Math.random() * 2000 + 5000));
        const dataTarget = labelsHourly.map(() => 6500);

        chartHourly = new Chart(ctxHourly, {
            type: 'bar',
            data: {
                labels: labelsHourly,
                datasets: [
                    {
                        label: 'Actual Output',
                        data: dataOutput,
                        backgroundColor: '#38bdf8',
                        borderRadius: 4
                    },
                    {
                        label: 'Target',
                        data: dataTarget,
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#cbd5e1' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#334155' },
                        ticks: { color: '#cbd5e1' }
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
        let online = 0, idle = 0, error = 0, offline = 0;
        machineData.forEach(m => {
            if (m.iiot_status === 'ONLINE') online++;
            else if (m.iiot_status === 'IDLE') idle++;
            else if (m.iiot_status === 'ERROR') error++;
            else offline++;
        });

        chartStatus = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Idle', 'Error', 'Offline'],
                datasets: [{
                    data: [online, idle, error, offline],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#64748b'],
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
