/* script/utilityDashboard.js */
document.addEventListener('DOMContentLoaded', () => {
    
    const targetDateInput = document.getElementById('targetDate');
    const liveClockEl = document.getElementById('live-clock');
    let energyChart = null;

    // ==========================================
    // 1. ประกาศฟังก์ชันหลัก (ต้องประกาศก่อนเรียกใช้)
    // ==========================================
    window.loadUtilityData = async () => {
        if (!targetDateInput) return;
        const date = targetDateInput.value;
        
        try {
            const res = await fetch(`api/get_utility_dashboard.php?date=${date}`);
            const json = await res.json();
            
            if (json.success) {
                renderKPIs(json.summary);
                renderMeters(json.meters);
                renderChart(json.trend_elec);
            } else {
                console.error("API Error:", json.message);
            }
        } catch (e) {
            console.error("Error fetching utility data:", e);
        }
    };

    // ==========================================
    // 2. ตั้งค่าเริ่มต้น & ผูก Event Listener
    // ==========================================
    // เซ็ตวันที่ปัจจุบัน
    if (targetDateInput) {
        const offset = new Date().getTimezoneOffset();
        const date = new Date(new Date().getTime() - (offset * 60 * 1000));
        targetDateInput.value = date.toISOString().split('T')[0];
        
        // ผูก Event ให้โหลดข้อมูลใหม่เมื่อเปลี่ยนวันที่ (ใช้ window.loadUtilityData)
        targetDateInput.addEventListener('change', window.loadUtilityData);
    }

    // นาฬิกา Live
    setInterval(() => {
        if (liveClockEl) liveClockEl.textContent = new Date().toLocaleTimeString('en-GB');
    }, 1000);

    // ==========================================
    // 3. ฟังก์ชันสำหรับวาด UI
    // ==========================================
    function renderKPIs(summary) {
        document.getElementById('kpi-kw').textContent = summary.total_kw.toFixed(2);
        document.getElementById('kpi-kwh').textContent = summary.total_kwh_today.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1});
        document.getElementById('kpi-cost').textContent = summary.est_elec_cost.toLocaleString(undefined, {minimumFractionDigits: 2});
        
        const pfEl = document.getElementById('kpi-pf');
        pfEl.textContent = summary.avg_pf.toFixed(2);
        pfEl.className = summary.avg_pf >= 0.85 ? 'text-success' : 'text-danger'; // ต่ำกว่า 0.85 โดนปรับ ให้เป็นสีแดง

        document.getElementById('kpi-lpg').textContent = summary.total_lpg_flow.toFixed(2);
    }

    function renderMeters(meters) {
        const container = document.getElementById('meter-cards-container');
        if (!container) return;
        container.innerHTML = '';

        meters.forEach(m => {
            const isOnline = m.status === 'ONLINE';
            const badge = isOnline ? '<span class="badge badge-soft-success">ONLINE</span>' : '<span class="badge badge-soft-danger">OFFLINE</span>';
            const icon = m.utility_type === 'ELECTRIC' ? '<i class="fas fa-bolt text-warning"></i>' : '<i class="fas fa-fire text-danger"></i>';
            
            // ข้อมูลที่จะโชว์
            let detailsHtml = '';
            if (m.utility_type === 'ELECTRIC') {
                detailsHtml = `
                    <div class="line-details-grid mt-2">
                        <div class="detail-box"><span class="lbl">Volt</span><span class="val">${m.voltage || 0} V</span></div>
                        <div class="detail-box"><span class="lbl">Amp</span><span class="val">${m.current_amp || 0} A</span></div>
                        <div class="detail-box"><span class="lbl">Power</span><span class="val fw-bold text-dark">${m.power_kw || 0} kW</span></div>
                        <div class="detail-box"><span class="lbl">PF</span><span class="val">${m.power_factor || 0}</span></div>
                    </div>`;
            } else {
                detailsHtml = `
                    <div class="line-details-grid mt-2">
                        <div class="detail-box"><span class="lbl">Flow</span><span class="val fw-bold text-danger">${m.flow_rate || 0}</span></div>
                    </div>`;
            }

            container.innerHTML += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="exec-card p-3 ${!isOnline ? 'opacity-50' : ''}">
                        <div class="line-card-header">
                            <div class="d-flex align-items-center gap-2">${icon} <span class="line-name text-truncate">${m.meter_name}</span></div>
                            ${badge}
                        </div>
                        ${detailsHtml}
                        <div class="mt-2 text-end">
                            <small class="text-muted" style="font-size:0.6rem;">Update: ${m.log_timestamp}</small>
                        </div>
                    </div>
                </div>`;
        });
    }

    function renderChart(trendData) {
        const ctx = document.getElementById('energyTrendChart');
        if (!ctx) return;

        // Group data by hour
        const hourlyMap = Array(24).fill(0);
        trendData.forEach(d => {
            hourlyMap[parseInt(d.HourOfDay)] += parseFloat(d.ConsumptionUsed);
        });

        const labels = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0') + ':00');

        if (energyChart) {
            energyChart.data.datasets[0].data = hourlyMap;
            energyChart.update();
        } else {
            energyChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Energy (kWh)',
                        data: hourlyMap,
                        backgroundColor: '#0dcaf0',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    // ==========================================
    // 4. Initial Load & Auto Refresh
    // ==========================================
    window.loadUtilityData();
    setInterval(window.loadUtilityData, 60000); 
});