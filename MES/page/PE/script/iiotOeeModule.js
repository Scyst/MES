const IIoTOeeModule = (function() {
    let oeeChart, availChart, perfChart, qualChart;
    let refreshInterval = null;

    function loadData() {
        if (!oeeChart) {
            initCharts();
            loadMachines();
        } else {
            fetchData();
        }
        startAutoRefresh();
    }

    function init() {
        // Listen to tab changes to stop refresh when hidden
        document.addEventListener('peTabChanged', (e) => {
            if (e.detail.tab === 'iiot_oee') {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
        
        document.getElementById('iiotOeeDateFilter').addEventListener('change', fetchData);
        document.getElementById('iiotOeeMachineFilter').addEventListener('change', fetchData);
    }

    function initCharts() {
        const createDoughnut = (ctxId, color) => {
            const ctx = document.getElementById(ctxId).getContext('2d');
            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Achieved', 'Remaining'],
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: [color, '#e2e8f0'],
                        borderWidth: 0,
                        cutout: '75%',
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    animation: { animateScale: true, animateRotate: true }
                },
                plugins: [{
                    id: 'textCenter',
                    beforeDraw: function(chart) {
                        var width = chart.width, height = chart.height, ctx = chart.ctx;
                        ctx.restore();
                        var fontSize = (height / 80).toFixed(2);
                        ctx.font = "bold " + fontSize + "em sans-serif";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#334155";
                        var text = chart.data.datasets[0].data[0].toFixed(1) + "%";
                        var textX = Math.round((width - ctx.measureText(text).width) / 2);
                        var textY = height / 1.35;
                        ctx.fillText(text, textX, textY);
                        ctx.save();
                    }
                }]
            });
        };

        oeeChart = createDoughnut('iiotOeePieChart', '#0ea5e9'); // primary/blue
        availChart = createDoughnut('iiotAvailPieChart', '#06b6d4'); // info/cyan
        perfChart = createDoughnut('iiotPerfPieChart', '#f59e0b'); // warning/amber
        qualChart = createDoughnut('iiotQualPieChart', '#10b981'); // success/emerald
    }

    function updateChart(chart, value, color) {
        if (!chart) return;
        value = Math.max(0, Math.min(100, value));
        chart.data.datasets[0].data = [value, 100 - value];
        if (color) chart.data.datasets[0].backgroundColor[0] = color;
        chart.update();
    }
    
    function getColor(value) {
        if (value >= 85) return '#10b981'; // green
        if (value >= 60) return '#f59e0b'; // amber
        return '#ef4444'; // red
    }

    async function loadMachines() {
        try {
            const res = await fetch(PE_CONFIG.apiBase + 'iiotAPI.php?action=get_discovery_topics');
            const data = await res.json();
            if (data.success) {
                const select = document.getElementById('iiotOeeMachineFilter');
                select.innerHTML = '<option value="">All Machines (Average)</option>';
                
                // Get unique machine codes
                const machines = {};
                data.data.forEach(m => {
                    if (m.machine_code && !machines[m.machine_code]) {
                        machines[m.machine_code] = true;
                        select.innerHTML += `<option value="${m.machine_code}">${m.machine_code}</option>`;
                    }
                });
                fetchData();
            }
        } catch (e) {
            console.error('Failed to load machines', e);
        }
    }

    async function fetchData() {
        const date = document.getElementById('iiotOeeDateFilter').value;
        const mc = document.getElementById('iiotOeeMachineFilter').value;
        
        let url = PE_CONFIG.apiBase + 'iiotAPI.php?action=get_iiot_oee_stats';
        if (date) url += '&date=' + date;
        if (mc) url += '&machine=' + mc;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.success && data.data) {
                let stats = null;
                
                if (mc) {
                    stats = data.data[mc];
                } else {
                    // Average all machines
                    let totalAvail = 0, totalPerf = 0, totalQual = 0, totalOee = 0;
                    let tCount = 0, tOnline = 0, tDefects = 0, tExpected = 0;
                    const keys = Object.keys(data.data);
                    
                    if (keys.length > 0) {
                        keys.forEach(k => {
                            totalAvail += data.data[k].availability;
                            totalPerf += data.data[k].performance;
                            totalQual += data.data[k].quality;
                            totalOee += data.data[k].oee;
                            tCount += data.data[k].live_counter;
                            tOnline += data.data[k].total_online_seconds;
                            tDefects += data.data[k].defects;
                            tExpected += data.data[k].expected_output;
                        });
                        
                        stats = {
                            availability: totalAvail / keys.length,
                            performance: totalPerf / keys.length,
                            quality: totalQual / keys.length,
                            oee: totalOee / keys.length,
                            live_counter: tCount,
                            total_online_seconds: tOnline,
                            defects: tDefects,
                            expected_output: tExpected
                        };
                    }
                }
                
                if (stats) {
                    updateChart(oeeChart, stats.oee, getColor(stats.oee));
                    updateChart(availChart, stats.availability, getColor(stats.availability));
                    updateChart(perfChart, stats.performance, getColor(stats.performance));
                    updateChart(qualChart, stats.quality, getColor(stats.quality));
                    
                    document.getElementById('iiotMetricProduction').textContent = stats.live_counter.toLocaleString();
                    document.getElementById('iiotMetricExpected').textContent = Math.round(stats.expected_output).toLocaleString();
                    document.getElementById('iiotMetricDefects').textContent = stats.defects.toLocaleString();
                    
                    const hrs = Math.floor(stats.total_online_seconds / 3600);
                    const mins = Math.floor((stats.total_online_seconds % 3600) / 60);
                    document.getElementById('iiotMetricOnline').textContent = `${hrs}h ${mins}m`;
                } else {
                    // Reset
                    updateChart(oeeChart, 0, '#ef4444');
                    updateChart(availChart, 0, '#ef4444');
                    updateChart(perfChart, 0, '#ef4444');
                    updateChart(qualChart, 0, '#ef4444');
                }
            }
        } catch (e) {
            console.error('Failed to fetch OEE stats', e);
        }
    }

    function startAutoRefresh() {
        if (!refreshInterval) {
            refreshInterval = setInterval(() => {
                // Only refresh if date filter is today or empty
                const dateFilter = document.getElementById('iiotOeeDateFilter').value;
                if (!dateFilter || dateFilter === new Date().toISOString().split('T')[0]) {
                    fetchData();
                }
            }, 5000);
        }
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    return { init, loadData, fetchData };
})();

document.addEventListener('DOMContentLoaded', () => {
    IIoTOeeModule.init();
});
