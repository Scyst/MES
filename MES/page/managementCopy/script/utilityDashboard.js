/* script/utilityDashboard.js */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เปลี่ยนตัวแปรมารับค่า Start Date และ End Date
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const liveClockEl = document.getElementById('live-clock');
    let energyChart = null;

    window.loadUtilityData = async () => {
        if (document.hidden) return; // ประหยัดโหลด
        if (!startDateInput || !endDateInput) return;
        
        try {
            const sd = startDateInput.value;
            const ed = endDateInput.value;

            // 2. อัปเดต API ให้ส่ง startDate และ endDate
            const res = await fetch(`api/api_utility.php?action=get_dashboard&startDate=${sd}&endDate=${ed}`);
            const json = await res.json();
            
            if (json.success) {
                renderKPIs(json.data.summary);
                renderMeters(json.data.meters);
                // 3. ส่งข้อมูลกราฟและสถานะ (is_range) ไปให้ฟังก์ชันวาดกราฟ
                renderChart(json.data.trend, json.data.is_range);
            } else {
                if(typeof showToast === 'function') showToast(json.message, 'danger');
            }
        } catch (e) {
            console.error("Error fetching data:", e);
        }
    };

    function renderKPIs(summary) {
        // อัปเดตการเงิน (Cost) โดยใช้ตัวแปรแบบ period (ช่วงเวลา)
        document.getElementById('kpi-cost').textContent = summary.period_elec_cost.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('kpi-kwh').textContent = summary.period_kwh.toLocaleString(undefined, {minimumFractionDigits: 0});
        
        document.getElementById('kpi-lpg-cost').textContent = summary.period_lpg_cost.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('kpi-lpg-usage').textContent = summary.period_lpg_usage.toLocaleString(undefined, {minimumFractionDigits: 2});

        // อัปเดตสถานะวิศวกรรม
        document.getElementById('kpi-kw').textContent = summary.total_kw.toFixed(2);
        
        const pfEl = document.getElementById('kpi-pf');
        pfEl.textContent = summary.avg_pf.toFixed(2);
        pfEl.className = summary.avg_pf >= 0.85 ? 'text-success' : 'text-danger fw-bold blink-text';
    }

    function renderMeters(meters) {
        const container = document.getElementById('meter-cards-container');
        if (!container) return;
        container.innerHTML = '';

        // Logic การจัดเรียงการ์ด
        meters.sort((a, b) => {
            if (a.utility_type === 'LPG' && b.utility_type !== 'LPG') return -1;
            if (a.utility_type !== 'LPG' && b.utility_type === 'LPG') return 1;

            // เรียงตามยอดเงิน (Cost) จากมากไปน้อยตามช่วงเวลาที่เลือก
            const costA = parseFloat(a.period_cost || 0);
            const costB = parseFloat(b.period_cost || 0);
            
            if (costB === costA) {
                return parseFloat(b.power_kw || 0) - parseFloat(a.power_kw || 0);
            }
            return costB - costA;
        });

        meters.forEach(m => {
            const isOnline = m.status === 'ONLINE';
            const isElectric = m.utility_type === 'ELECTRIC';
            
            const statusBadge = isOnline 
                ? '<span class="badge badge-soft-success ms-2">Online</span>' 
                : '<span class="badge badge-soft-danger ms-2 blink-text">Offline</span>';
            
            const icon = isElectric ? '<i class="fas fa-bolt text-warning me-1"></i>' : '<i class="fas fa-fire text-danger me-1"></i>';
            const unit = isElectric ? 'kWh' : 'm³';
            
            // ใช้ period_usage และ period_cost แทน today
            const usage = parseFloat(m.period_usage || 0).toLocaleString(undefined, {maximumFractionDigits: 1});
            const cost = parseFloat(m.period_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
            
            const isMDB = m.meter_name === 'MDB';
            const alertClass = isMDB ? 'border-danger border-2' : '';
            const mdbWarning = isMDB ? '<i class="fas fa-exclamation-triangle text-danger" title="Hardware Check Required"></i>' : '';

            let mainStatsHtml = `
                <div class="line-main-stats">
                    <div class="line-stat-item">
                        <label>Cost (฿)</label>
                        <div class="value text-primary">${cost}</div>
                    </div>
                    <div class="line-stat-item border-start border-end">
                        <label>Usage (${unit})</label>
                        <div class="value">${usage}</div>
                    </div>
                    <div class="line-stat-item">
                        <label>${isElectric ? 'Power' : 'Flow Rate'}</label>
                        <div class="value ${isElectric ? 'text-dark' : 'text-danger'}">${isElectric ? (m.power_kw || 0) + '<small> kW</small>' : (m.flow_rate || 0) + '<small> m³/h</small>'}</div>
                    </div>
                </div>`;

            let detailsHtml = '';
            if (isElectric) {
                let pfClass = (m.power_factor < 0.85 && isOnline) ? 'text-danger blink-text' : 'text-success';
                detailsHtml = `
                    <div class="line-details-grid mt-auto">
                        <div class="detail-box"><span class="lbl">Volt</span><span class="val">${m.voltage || 0}</span></div>
                        <div class="detail-box"><span class="lbl">Amp</span><span class="val">${m.current_amp || 0}</span></div>
                        <div class="detail-box"><span class="lbl">PF</span><span class="val ${pfClass}">${m.power_factor || 0}</span></div>
                    </div>`;
            } else {
                detailsHtml = `
                    <div class="line-details-grid mt-auto" style="grid-template-columns: 1fr;">
                        <div class="detail-box border-0 bg-transparent text-end">
                            <small class="text-muted" style="font-size:0.65rem;">Updated: ${m.log_timestamp}</small>
                        </div>
                    </div>`;
            }

            container.innerHTML += `
                <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                    <div class="exec-card p-3 ${alertClass} ${!isOnline ? 'bg-light opacity-75' : ''}">
                        <div class="line-card-header">
                            <div class="d-flex align-items-center">
                                <span class="line-name text-truncate" style="max-width: 150px;">${icon}${m.meter_name}</span>
                                ${statusBadge}
                            </div>
                            ${mdbWarning}
                        </div>
                        ${mainStatsHtml}
                        ${detailsHtml}
                        ${isElectric ? `<div class="text-end mt-2"><small class="text-muted" style="font-size:0.6rem;">Update: ${m.log_timestamp}</small></div>` : ''}
                    </div>
                </div>`;
        });
    }

    // 🚀 Logic วาดกราฟใหม่ (รองรับการเริ่มที่ 08:00 และรองรับการดูรายเดือน)
    function renderChart(trendData, isRange) {
        const ctx = document.getElementById('energyTrendChart');
        if (!ctx) return;

        let labels = [];
        let costData = [];

        if (!isRange) {
            // โหมดวันเดียว: แกน X ต้องเรียงจาก 08:00 ถึง 07:00 (รวม 24 ชม.)
            for (let i = 8; i < 32; i++) {
                let hr = i % 24;
                let hrStr = hr.toString().padStart(2, '0') + ':00';
                labels.push(hrStr);
                
                let found = trendData.find(d => parseInt(d.label_key) === hr);
                costData.push(found ? parseFloat(found.val_cost) : 0);
            }
        } else {
            // โหมดหลายวัน (Range): แกน X เป็นวันที่ (YYYY-MM-DD)
            trendData.forEach(d => {
                labels.push(d.label_key);
                costData.push(parseFloat(d.val_cost));
            });
        }

        const barColors = !isRange 
            ? labels.map(l => { let h = parseInt(l); return (h >= 9 && h <= 21) ? 'rgba(253, 126, 20, 0.8)' : 'rgba(13, 110, 253, 0.6)'; })
            : 'rgba(25, 135, 84, 0.8)'; // โหมดหลายวันให้เป็นสีเขียวล้วนไปเลย

        if (energyChart) {
            energyChart.data.labels = labels;
            energyChart.data.datasets[0].data = costData;
            energyChart.data.datasets[0].backgroundColor = barColors;
            energyChart.update();
        } else {
            energyChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ label: 'Cost (THB)', data: costData, backgroundColor: barColors, borderRadius: 4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, title: { display: true, text: 'Baht (฿)' } } 
                    }
                }
            });
        }
    }

    window.exportToCSV = async () => {
        const sd = startDateInput.value;
        const ed = endDateInput.value;
        const res = await fetch(`api/api_utility.php?action=get_dashboard&startDate=${sd}&endDate=${ed}`);
        const json = await res.json();
        if (json.success && json.data.trend.length > 0) {
            let csv = "\uFEFFPeriod,Usage,Cost(THB)\n";
            json.data.trend.forEach(r => {
                csv += `${r.label_key},${r.val_usage},${r.val_cost}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Utility_Cost_${sd}_to_${ed}.csv`;
            link.click();
        } else {
            alert("No data to export");
        }
    };

    // 🚀 การตั้งค่าวันที่เริ่มต้น: ถอยไป 8 ชั่วโมงอัตโนมัติ (Production Date)
    if (startDateInput && endDateInput) {
        const prodDate = new Date(new Date().getTime() - (8 * 60 * 60 * 1000)).toISOString().split('T')[0];
        startDateInput.value = prodDate;
        endDateInput.value = prodDate;
        
        startDateInput.addEventListener('change', window.loadUtilityData);
        endDateInput.addEventListener('change', window.loadUtilityData);
    }
    
    setInterval(() => { if (liveClockEl) liveClockEl.textContent = new Date().toLocaleTimeString('en-GB'); }, 1000);
    window.loadUtilityData();
    setInterval(window.loadUtilityData, 60000); 

    // ==========================================
    // TOU Settings (Dynamic UI & Validation)
    // ==========================================
    let currentTourates = [];

    window.openTOUSettings = async () => {
        const modal = new bootstrap.Modal(document.getElementById('touModal'));
        document.getElementById('tou-error-msg').textContent = '';
        modal.show();

        const res = await fetch(`api/api_utility.php?action=get_tou_rates`);
        const json = await res.json();
        
        if(json.success) {
            currentTourates = json.data.map(r => ({
                id: Math.random().toString(36).substr(2, 9), 
                type: r.utility_type,
                day: r.day_type,
                start: r.start_time.substring(0, 5), 
                end: r.end_time.substring(0, 5),
                price: parseFloat(r.rate_price).toFixed(4)
            }));
            renderTOUForm();
        }
    };

    function renderTOUForm() {
        renderGroup('ELECTRIC', 'elec-rates-container');
        renderGroup('LPG', 'lpg-rates-container');
    }

    function renderGroup(utilityType, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        const dayTypes = ['NORMAL', 'SUNDAY', 'HOLIDAY'];
        
        dayTypes.forEach(day => {
            const rates = currentTourates.filter(r => r.type === utilityType && r.day === day);
            
            let rowsHtml = rates.map(r => `
                <div class="row g-2 align-items-center mb-2" id="row-${r.id}">
                    <div class="col-4">
                        <input type="time" class="form-control form-control-sm rate-input" data-id="${r.id}" data-field="start" value="${r.start}" required>
                    </div>
                    <div class="col-auto text-muted"><i class="fas fa-arrow-right" style="font-size:0.7rem;"></i></div>
                    <div class="col-4">
                        <input type="time" class="form-control form-control-sm rate-input" data-id="${r.id}" data-field="end" value="${r.end}" required>
                    </div>
                    <div class="col">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-light text-muted">฿</span>
                            <input type="number" step="0.0001" class="form-control form-control-sm rate-input text-end" data-id="${r.id}" data-field="price" value="${r.price}" required>
                        </div>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="removeTOURow('${r.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');

            container.innerHTML += `
                <div class="card mb-3 border-0 shadow-sm">
                    <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
                        <h6 class="mb-0 fw-bold text-secondary" style="font-size:0.85rem;">
                            <i class="fas fa-calendar-day me-1"></i> ${day}
                        </h6>
                        <button class="btn btn-sm btn-light border text-primary" onclick="addTOURow('${utilityType}', '${day}')">
                            <i class="fas fa-plus"></i> Add Period
                        </button>
                    </div>
                    <div class="card-body p-3">
                        ${rowsHtml || '<div class="text-center text-muted small py-2">No periods defined.</div>'}
                    </div>
                </div>
            `;
        });

        document.querySelectorAll('.rate-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const field = e.target.getAttribute('data-field');
                const record = currentTourates.find(r => r.id === id);
                if(record) record[field] = e.target.value;
            });
        });
    }

    window.addTOURow = (type, day) => {
        currentTourates.push({
            id: Math.random().toString(36).substr(2, 9),
            type: type, day: day, start: '00:00', end: '23:59', price: '0.0000'
        });
        renderTOUForm();
    };

    window.removeTOURow = (id) => {
        currentTourates = currentTourates.filter(r => r.id !== id);
        renderTOUForm();
    };

    function validateOverlap(rates) {
        const timeToMins = (t) => { let [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
        
        const groups = {};
        rates.forEach(r => {
            const key = `${r.type}_${r.day}`;
            if(!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        for (const key in groups) {
            let intervals = [];
            const groupName = key.replace('_', ' ');

            for (let r of groups[key]) {
                if(!r.start || !r.end || !r.price) return `กรุณากรอกข้อมูลให้ครบในกลุ่ม ${groupName}`;
                if(parseFloat(r.price) < 0) return `ราคา Rate (฿) ห้ามติดลบ ในกลุ่ม ${groupName}`;

                let s = timeToMins(r.start);
                let e = timeToMins(r.end);
                
                if (s === e) return `เวลาเริ่มต้นและสิ้นสุดต้องไม่ซ้ำกัน ในกลุ่ม ${groupName}`;
                
                if (s < e) {
                    intervals.push({ s: s, e: e });
                } else {
                    intervals.push({ s: s, e: 1440 }); 
                    intervals.push({ s: 0, e: e });    
                }
            }

            intervals.sort((a, b) => a.s - b.s);
            let totalMinutes = 0;

            for (let i = 0; i < intervals.length; i++) {
                totalMinutes += (intervals[i].e - intervals[i].s);
                if (i < intervals.length - 1 && intervals[i].e > intervals[i+1].s) {
                    return `ตรวจพบการตั้ง "เวลาทับซ้อนกัน" ในกลุ่ม ${groupName}`;
                }
            }

            if (totalMinutes < 1439) {
                let missingHours = ((1440 - totalMinutes) / 60).toFixed(1);
                return `เวลาในกลุ่ม ${groupName} ไม่ครบ 24 ชั่วโมง (ขาดไป ${missingHours} ชม.) กรุณาตั้งค่าให้ครอบคลุมทั้งวัน`;
            }
        }
        return null; 
    }

    window.saveAllTOURates = async () => {
        const errorEl = document.getElementById('tou-error-msg');
        errorEl.textContent = '';

        const validationError = validateOverlap(currentTourates);
        if(validationError) {
            errorEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${validationError}`;
            return;
        }

        const payload = currentTourates.map(r => ({
            utility_type: r.type, day_type: r.day,
            start_time: r.start + ':00', end_time: r.end + ':00',
            rate_price: r.price
        }));

        try {
            const btn = document.querySelector('button[onclick="saveAllTOURates()"]');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const res = await fetch(`api/api_utility.php`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'save_tou_rates', rates: payload })
            });
            const json = await res.json();
            
            if(json.success) {
                if(typeof showToast === 'function') showToast(json.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('touModal')).hide();
                loadUtilityData();
            } else {
                errorEl.textContent = json.message;
            }
        } catch (e) {
            errorEl.textContent = "Connection error.";
        } finally {
            const btn = document.querySelector('button[onclick="saveAllTOURates()"]');
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Save Changes';
            btn.disabled = false;
        }
    };
});