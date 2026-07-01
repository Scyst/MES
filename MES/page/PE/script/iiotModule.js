const IIoTModule = (function() {
    let pollingInterval = null;
    let machinesWithIIoT = [];
    let isSimulating = false;
    let isMapEditMode = false;

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

        renderFloorplan();
    }

    function renderFloorplan() {
        const floorplan = document.getElementById('iiotFloorplan');
        if (!floorplan) return;
        
        // Remove existing nodes (except tooltip and image)
        Array.from(floorplan.children).forEach(child => {
            if (child.id !== 'machineTooltip' && child.id !== 'iiotFloorplanImg') {
                floorplan.removeChild(child);
            }
        });

        machinesWithIIoT.forEach((m, index) => {
            const x = m.map_x != null ? parseFloat(m.map_x) : 15 + ((index * 30) % 70); 
            const y = m.map_y != null ? parseFloat(m.map_y) : 20 + ((index * 25) % 60);
            
            const node = document.createElement('div');
            node.className = 'machine-node offline';
            node.id = `iiot-node-${m.machine_code}`;
            node.dataset.code = m.machine_code;
            node.style.left = `${x}%`;
            node.style.top = `${y}%`;
            
            node.addEventListener('mousedown', (e) => {
                if (!isMapEditMode) return;
                e.preventDefault();
                let isDragging = true;
                
                const moveHandler = (moveEvent) => {
                    if (!isDragging) return;
                    const rect = floorplan.getBoundingClientRect();
                    let newX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                    let newY = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                    
                    newX = Math.max(0, Math.min(100, newX));
                    newY = Math.max(0, Math.min(100, newY));
                    
                    node.style.left = `${newX}%`;
                    node.style.top = `${newY}%`;
                };
                
                const upHandler = () => {
                    isDragging = false;
                    document.removeEventListener('mousemove', moveHandler);
                    document.removeEventListener('mouseup', upHandler);
                };
                
                document.addEventListener('mousemove', moveHandler);
                document.addEventListener('mouseup', upHandler);
            });
            
            node.addEventListener('mouseenter', () => {
                const tt = document.getElementById('machineTooltip');
                if (!tt) return;
                document.getElementById('ttMachineName').innerText = m.machine_name || m.machine_code;
                
                const statusEl = document.getElementById(`iiot-status-${m.machine_code}`);
                document.getElementById('ttStatus').innerText = statusEl ? statusEl.innerText : 'OFFLINE';
                
                const powerEl = document.getElementById(`iiot-power-${m.machine_code}`);
                document.getElementById('ttTemp').innerText = powerEl && powerEl.innerText !== '-' ? powerEl.innerText : 'N/A';
                
                tt.style.left = node.style.left;
                tt.style.top = node.style.top;
                tt.classList.add('visible');
            });
            
            node.addEventListener('mouseleave', () => {
                const tt = document.getElementById('machineTooltip');
                if (tt) tt.classList.remove('visible');
            });
            
            floorplan.appendChild(node);
        });
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        
        const fetchTelemetry = async () => {
            if (isSimulating) {
                simulateData();
                return;
            }
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
    
    function simulateData() {
        const fakeData = {};
        machinesWithIIoT.forEach(m => {
            const power = (Math.random() * 40 + 20).toFixed(2); // 20-60 kW
            const flow = (Math.random() * 5 + 10).toFixed(2); // 10-15 L/min
            const isAlert = power > 55; // 55+ is alert threshold for simulation
            
            fakeData[m.machine_code] = {
                live_status: isAlert ? 'WARNING' : 'RUNNING',
                live_counter: Math.floor(Math.random() * 1000),
                live_total: 1000,
                power_kw: power,
                flow_rate: flow
            };
        });
        updateUI(fakeData);
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

            // Update Power and Check Threshold Alert
            const powerRow = document.getElementById(`iiot-row-power-${m.machine_code}`);
            const cardEl = document.getElementById(`iiot-card-${m.machine_code}`);
            let isAlert = false;
            
            if (powerRow && data.power_kw !== null) {
                powerRow.style.display = 'flex';
                powerEl.innerText = `${data.power_kw} kW`;
                if (parseFloat(data.power_kw) > 50) {
                    powerEl.style.color = 'var(--pe-danger)';
                    isAlert = true;
                    if (cardEl) cardEl.style.border = '1px solid var(--pe-danger)';
                } else {
                    powerEl.style.color = '#f59e0b';
                    if (cardEl) cardEl.style.border = '1px solid #334155';
                }
            } else if (powerRow) {
                powerRow.style.display = 'none';
            }

            // Update Floorplan Node
            const nodeEl = document.getElementById(`iiot-node-${m.machine_code}`);
            if (nodeEl) {
                nodeEl.className = 'machine-node';
                const s = (data.live_status || '').toUpperCase();
                if (s === 'WARNING' || isAlert) {
                    nodeEl.classList.add('warning');
                } else if (s.includes('RUN') || s.includes('ON')) {
                    nodeEl.classList.add('running');
                } else if (s.includes('STOP') || s.includes('OFF') || s.includes('DOWN')) {
                    nodeEl.classList.add('stopped');
                } else {
                    nodeEl.classList.add('offline');
                }
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
    
    function toggleSimulation() {
        isSimulating = document.getElementById('iiotSimToggle')?.checked || false;
        if (isSimulating) {
            PEApp.showToast('IIoT Simulation Mode Enabled', 'info');
        }
    }

    function toggleEditMode() {
        isMapEditMode = !isMapEditMode;
        const floorplan = document.getElementById('iiotFloorplan');
        const editBtn = document.getElementById('iiotEditMapBtn');
        const saveBtn = document.getElementById('iiotSaveMapBtn');
        const uploadBtn = document.getElementById('iiotUploadMapBtn');

        if (isMapEditMode) {
            floorplan.classList.add('edit-mode');
            if (editBtn) editBtn.classList.replace('btn-outline-secondary', 'btn-secondary');
            if (saveBtn) saveBtn.style.display = 'inline-block';
            if (uploadBtn) uploadBtn.style.display = 'inline-block';
        } else {
            floorplan.classList.remove('edit-mode');
            if (editBtn) editBtn.classList.replace('btn-secondary', 'btn-outline-secondary');
            if (saveBtn) saveBtn.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'none';
        }
    }

    async function saveMapPositions() {
        const positions = [];
        document.querySelectorAll('.machine-node').forEach(node => {
            const code = node.dataset.code;
            if (code) {
                positions.push({
                    machine_code: code,
                    x: parseFloat(node.style.left),
                    y: parseFloat(node.style.top)
                });
            }
        });

        try {
            const res = await PEApp.apiCall('machineAPI.php', {}, 'POST', {
                action: 'save_map_positions',
                positions: positions
            });
            if (res.success) {
                PEApp.showToast('Map layout saved successfully', 'success');
                toggleEditMode(); // Exit edit mode
                positions.forEach(p => {
                    const m = machinesWithIIoT.find(mac => mac.machine_code === p.machine_code);
                    if (m) {
                        m.map_x = p.x;
                        m.map_y = p.y;
                    }
                });
            }
        } catch (e) {
            PEApp.showToast(e.message || 'Error saving layout', 'error');
        }
    }

    async function uploadMapBg(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        
        const formData = new FormData();
        formData.append('action', 'upload_map_bg');
        formData.append('map_bg', file);
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        
        try {
            const res = await fetch('api/machineAPI.php', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const img = document.getElementById('iiotFloorplanImg');
                if (img) img.src = data.path + '?' + new Date().getTime(); // cache bust
                PEApp.showToast('Background map updated successfully', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            PEApp.showToast('Upload failed: ' + e.message, 'error');
        }
    }

    return { init, stop, toggleSimulation, toggleEditMode, saveMapPositions, uploadMapBg };
})();
