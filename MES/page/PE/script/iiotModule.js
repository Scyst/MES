const IIoTModule = (function() {
    let pollingInterval = null;
    let machinesWithIIoT = [];

    async function init() {
        try {
            // Get all machines, filter only those with mqtt_topic
            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_machines' });
            machinesWithIIoT = (res.data || []).filter(m => m.mqtt_topic && m.mqtt_topic.trim() !== '');
            
            renderGrid();
            startPolling();
        } catch (e) {
            console.error("Failed to init IIoT Dashboard", e);
        }
    }

    function renderGrid() {
        const grid = document.getElementById('iiotGrid');
        if (!grid) return;

        if (machinesWithIIoT.length === 0) {
            grid.innerHTML = `
                <div class="iiot-empty">
                    <i class="fas fa-plug"></i>
                    <h5>No IIoT Devices Configured</h5>
                    <p>Go to Machine Registry and set MQTT Topics to see them here.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = machinesWithIIoT.map(m => `
            <div class="iiot-card" id="iiot-card-${m.machine_code}">
                <div class="iiot-card-title">
                    <span>${PEApp.escapeHtml(m.machine_code)}</span>
                    <span class="iiot-status offline" id="iiot-status-${m.machine_code}">OFFLINE</span>
                </div>
                <div class="iiot-card-subtitle">${PEApp.escapeHtml(m.machine_name)}</div>
                
                <div class="iiot-metrics">
                    <div class="iiot-metric-row" id="iiot-row-power-${m.machine_code}" style="display: none;">
                        <span class="iiot-metric-label"><i class="fas fa-bolt"></i> Power</span>
                        <span class="iiot-metric-value power" id="iiot-power-${m.machine_code}">-</span>
                    </div>
                    <div class="iiot-metric-row" id="iiot-row-output-${m.machine_code}" style="display: none;">
                        <span class="iiot-metric-label"><i class="fas fa-sort-numeric-up-alt"></i> Output</span>
                        <span class="iiot-metric-value output" id="iiot-output-${m.machine_code}">-</span>
                    </div>
                    <div class="iiot-metric-row" id="iiot-row-flow-${m.machine_code}" style="display: none;">
                        <span class="iiot-metric-label"><i class="fas fa-wind"></i> Flow</span>
                        <span class="iiot-metric-value flow" id="iiot-flow-${m.machine_code}">-</span>
                    </div>
                </div>

                <div class="iiot-oee-section mt-3 pt-2" style="border-top: 1px dashed #e2e8f0;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span style="font-size: 11px; font-weight: 600; color: var(--pe-primary);"><i class="fas fa-chart-pie"></i> Availability</span>
                        <span style="font-size: 11px; font-weight: 700; color: #1e293b;" id="iiot-avail-text-${m.machine_code}">0.0%</span>
                    </div>
                    <div class="progress" style="height: 6px; border-radius: 3px; background-color: #e2e8f0;">
                        <div class="progress-bar" id="iiot-avail-bar-${m.machine_code}" role="progressbar" style="width: 0%; background-color: #10b981;"></div>
                    </div>
                    <div class="text-end mt-1" style="font-size: 10px; color: #64748b;" id="iiot-avail-time-${m.machine_code}">
                        Online: 0h 0m
                    </div>
                </div>
            </div>
        `).join('');
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        
        const fetchTelemetry = async () => {
            try {
                const res = await fetch('api/iiotAPI.php?action=get_live_telemetry');
                const json = await res.json();
                if (json.success && json.data) {
                    updateUI(json.data);
                }
            } catch (e) {
                console.error("Telemetry fetch error", e);
            }
        };

        const fetchAvailability = async () => {
            try {
                const res = await fetch('api/iiotAPI.php?action=get_availability_stats');
                const json = await res.json();
                if (json.success && json.data) {
                    updateAvailabilityUI(json.data);
                }
            } catch (e) {
                console.error("Availability fetch error", e);
            }
        };

        fetchTelemetry();
        fetchAvailability();
        
        // Polling loop
        let tick = 0;
        pollingInterval = setInterval(() => {
            tick++;
            fetchTelemetry();
            // Fetch availability every 15 seconds (5 ticks)
            if (tick % 5 === 0) {
                fetchAvailability();
            }
        }, 3000); // 3 seconds base tick
    }

    function updateAvailabilityUI(availData) {
        machinesWithIIoT.forEach(m => {
            const data = availData[m.machine_code];
            if (!data) return;

            const textEl = document.getElementById(`iiot-avail-text-${m.machine_code}`);
            const barEl = document.getElementById(`iiot-avail-bar-${m.machine_code}`);
            const timeEl = document.getElementById(`iiot-avail-time-${m.machine_code}`);

            if (textEl && barEl && timeEl) {
                textEl.innerText = `${data.availability_percent}%`;
                barEl.style.width = `${data.availability_percent}%`;
                
                // Set color based on value
                let color = '#10b981'; // Green
                if (data.availability_percent < 50) color = '#ef4444'; // Red
                else if (data.availability_percent < 80) color = '#f59e0b'; // Yellow
                
                barEl.style.backgroundColor = color;
                
                // Format online time
                const h = Math.floor(data.total_online_seconds / 3600);
                const min = Math.floor((data.total_online_seconds % 3600) / 60);
                timeEl.innerText = `Online: ${h}h ${min}m`;
            }
        });
    }

    function updateUI(telemetryData) {
        machinesWithIIoT.forEach(m => {
            const data = telemetryData[m.machine_code];
            const statusEl = document.getElementById(`iiot-status-${m.machine_code}`);
            const powerEl = document.getElementById(`iiot-power-${m.machine_code}`);
            const outputEl = document.getElementById(`iiot-output-${m.machine_code}`);
            const flowEl = document.getElementById(`iiot-flow-${m.machine_code}`);

            if (!data) {
                if (statusEl) {
                    statusEl.className = 'iiot-status offline';
                    statusEl.innerText = 'OFFLINE';
                }
                return;
            }

            // Update Status
            if (statusEl) {
                const s = (data.live_status || '').toUpperCase();
                if (s.includes('RUN') || s.includes('ON')) {
                    statusEl.className = 'iiot-status running';
                    statusEl.innerText = s;
                } else if (s.includes('STOP') || s.includes('OFF') || s.includes('DOWN')) {
                    statusEl.className = 'iiot-status stopped';
                    statusEl.innerText = s;
                } else {
                    statusEl.className = 'iiot-status idle';
                    statusEl.innerText = s || 'UNKNOWN';
                }
            }

            // Update Power
            const powerRow = document.getElementById(`iiot-row-power-${m.machine_code}`);
            if (powerRow && data.power_kw !== null) {
                powerRow.style.display = 'flex';
                if (powerEl) powerEl.innerText = parseFloat(data.power_kw).toFixed(2) + ' kW';
            } else if (powerRow) {
                powerRow.style.display = 'none';
            }

            // Update Output
            const outputRow = document.getElementById(`iiot-row-output-${m.machine_code}`);
            if (outputRow && data.live_counter !== null) {
                outputRow.style.display = 'flex';
                if (outputEl) outputEl.innerText = `${data.live_counter} ${data.live_total ? '/ ' + data.live_total : ''} pcs`;
            } else if (outputRow) {
                outputRow.style.display = 'none';
            }

            // Update Flow
            const flowRow = document.getElementById(`iiot-row-flow-${m.machine_code}`);
            if (flowRow && data.flow_rate !== null) {
                flowRow.style.display = 'flex';
                if (flowEl) flowEl.innerText = parseFloat(data.flow_rate).toFixed(2);
            } else if (flowRow) {
                flowRow.style.display = 'none';
            }
        });
    }

    function stop() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    return { init, stop };
})();
