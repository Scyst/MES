const IIoTModule = (function() {
    let pollingInterval = null;
    let machinesWithIIoT = [];
    let lastOeeData = {};
    let isSimulating = false;
    let isMapEditMode = false;
    let cropperInstance = null;
    let panzoomInstance = null;

    async function init() {
        try {
            const tt = document.getElementById('machineTooltip');
            if (tt && tt.parentNode !== document.body) {
                document.body.appendChild(tt);
            }

            // Get all machines, filter only those with mqtt_topic
            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_machines' });
            machinesWithIIoT = (res.data || []).filter(m => m.mqtt_topic && m.mqtt_topic.trim() !== '');
            // Initialize Panzoom
            const panzoomEl = document.getElementById('iiotPanzoomElement');
            if (panzoomEl && typeof Panzoom !== 'undefined') {
                panzoomInstance = Panzoom(panzoomEl, {
                    maxScale: 5,
                    minScale: 0.1,
                    excludeClass: 'panzoom-exclude'
                });
                panzoomEl.parentElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);

                const fitMap = () => {
                    setTimeout(() => {
                        const img = document.getElementById('iiotFloorplanImg');
                        const wrapper = panzoomEl.parentElement;
                        // Since we use flexbox to center the element, we can just set pan(0,0)
                        if (img && img.naturalWidth && wrapper.clientWidth > 0) {
                            const scale = Math.min(
                                wrapper.clientWidth / img.naturalWidth,
                                wrapper.clientHeight / img.naturalHeight
                            ) * 0.95;
                            panzoomInstance.zoom(scale, { animate: false });
                            panzoomInstance.pan(0, 0, { animate: false });
                        }
                    }, 100);
                };

                const img = document.getElementById('iiotFloorplanImg');
                if (img) {
                    if (img.complete && img.naturalWidth) fitMap();
                    img.addEventListener('load', fitMap);
                }
                
                // Also trigger fitMap when the tab is clicked (so container has dimensions)
                document.querySelectorAll('[data-tab="iiot"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        setTimeout(fitMap, 300);
                    });
                });
            }

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
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="text-center" style="min-width: 60px;">
                        <h3 class="mb-0 fw-bold" id="iiot-oee-text-${m.machine_code}" style="color: #0ea5e9;">0%</h3>
                        <small class="text-muted fw-bold" style="font-size: 10px; letter-spacing: 1px;">OEE</small>
                    </div>
                    <div style="flex: 1; margin-left: 15px;">
                        <div class="d-flex justify-content-between mb-1" style="font-size:10px; font-weight:bold;">
                            <span style="color:#64748b;">A: <span id="iiot-avail-text-${m.machine_code}">0%</span></span>
                            <span style="color:#64748b;">P: <span id="iiot-perf-text-${m.machine_code}">0%</span></span>
                            <span style="color:#64748b;">Q: <span id="iiot-qual-text-${m.machine_code}">0%</span></span>
                        </div>
                        <div class="progress mb-1" style="height: 4px; border-radius: 2px; background-color: #f1f5f9;">
                            <div class="progress-bar" id="iiot-avail-bar-${m.machine_code}" style="width: 0%; background-color: #10b981;"></div>
                        </div>
                        <div class="progress mb-1" style="height: 4px; border-radius: 2px; background-color: #f1f5f9;">
                            <div class="progress-bar" id="iiot-perf-bar-${m.machine_code}" style="width: 0%; background-color: #3b82f6;"></div>
                        </div>
                        <div class="progress" style="height: 4px; border-radius: 2px; background-color: #f1f5f9;">
                            <div class="progress-bar" id="iiot-qual-bar-${m.machine_code}" style="width: 0%; background-color: #8b5cf6;"></div>
                        </div>
                    </div>
                </div>

                <div class="iiot-metrics">
                    <div class="iiot-metric-row">
                        <span class="iiot-metric-label"><i class="fas fa-cube text-primary"></i> Current Output</span>
                        <span class="iiot-metric-value" id="iiot-counter-${m.machine_code}">0</span>
                    </div>
                    <div class="iiot-metric-row">
                        <span class="iiot-metric-label"><i class="fas fa-bullseye text-warning"></i> Planned Output</span>
                        <span class="iiot-metric-value" id="iiot-planned-${m.machine_code}">0</span>
                    </div>
                    <div class="iiot-metric-row">
                        <span class="iiot-metric-label"><i class="fas fa-stopwatch text-info"></i> Cycle Time</span>
                        <span class="iiot-metric-value" id="iiot-cycle-${m.machine_code}">-</span>
                    </div>
                </div>
            </div>
        `).join('');

        renderFloorplan();
    }

    function renderFloorplan() {
        const nodesContainer = document.getElementById('mapNodesContainer');
        if (!nodesContainer) return;
        
        // Remove existing nodes
        nodesContainer.innerHTML = '';

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
                e.stopPropagation(); // Prevent panzoom from triggering
                let startX = e.clientX;
                let startY = e.clientY;
                let startLeft = parseFloat(node.style.left);
                let startTop = parseFloat(node.style.top);
                
                const onMouseMove = (moveEvent) => {
                    const scale = panzoomInstance.getScale();
                    const dx = ((moveEvent.clientX - startX) / (floorplanWrapper.offsetWidth * scale)) * 100;
                    const dy = ((moveEvent.clientY - startY) / (floorplanWrapper.offsetHeight * scale)) * 100;
                    
                    let newX = Math.max(0, Math.min(100, startLeft + dx));
                    let newY = Math.max(0, Math.min(100, startTop + dy));
                    
                    node.style.left = `${newX}%`;
                    node.style.top = `${newY}%`;
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
            });
            
            node.addEventListener('mouseenter', (e) => {
                const tt = document.getElementById('machineTooltip');
                if (!tt) return;
                document.getElementById('ttMachineName').innerText = m.machine_name || m.machine_code;
                
                const statusEl = document.getElementById(`iiot-status-${m.machine_code}`);
                document.getElementById('ttStatus').innerText = statusEl ? statusEl.innerText : 'OFFLINE';
                
                const cycleEl = document.getElementById(`iiot-cycle-${m.machine_code}`);
                document.getElementById('ttCycle').innerText = cycleEl && cycleEl.innerText !== '-' ? cycleEl.innerText : 'N/A';
                
                const oeeData = lastOeeData[m.machine_code];
                document.getElementById('ttOEE').innerText = oeeData && oeeData.oee != null ? `${oeeData.oee}%` : '0%';
                
                tt.style.left = e.clientX + 15 + 'px';
                tt.style.top = e.clientY + 15 + 'px';
                tt.classList.add('visible');
            });
            
            node.addEventListener('mousemove', (e) => {
                const tt = document.getElementById('machineTooltip');
                if (tt && tt.classList.contains('visible')) {
                    tt.style.left = e.clientX + 15 + 'px';
                    tt.style.top = e.clientY + 15 + 'px';
                }
            });
            
            node.addEventListener('mouseleave', () => {
                const tt = document.getElementById('machineTooltip');
                if (tt) tt.classList.remove('visible');
            });
            
            // Allow pointer events on nodes specifically, since container is pointer-events: none
            node.style.pointerEvents = 'auto';

            nodesContainer.appendChild(node);
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

        const fetchOeeStats = async () => {
            try {
                const res = await fetch('api/iiotAPI.php?action=get_iiot_oee_stats');
                const json = await res.json();
                if (json.success && json.data) {
                    updateOeeUI(json.data);
                }
            } catch (e) {
                console.error("OEE fetch error", e);
            }
        };

        fetchTelemetry();
        fetchOeeStats();
        
        // Polling loop
        let tick = 0;
        pollingInterval = setInterval(() => {
            tick++;
            fetchTelemetry();
            
            // Initialize Panzoom
            const pzElement = document.getElementById('iiotPanzoomElement');
            const pzParent = document.getElementById('iiotFloorplan');
            if (pzElement && typeof Panzoom !== 'undefined' && !panzoomInstance) {
                panzoomInstance = Panzoom(pzElement, {
                    maxScale: 5,
                    minScale: 0.5,
                    step: 0.1,
                    contain: 'outside'
                });
                pzParent.parentElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);
            }

            // Fetch OEE every 15 seconds (5 ticks)
            if (tick % 5 === 0) {
                fetchOeeStats();
            }
        }, 3000); // 3 seconds base tick
    }

    function updateOeeUI(oeeData) {
        lastOeeData = { ...lastOeeData, ...oeeData };
        machinesWithIIoT.forEach(m => {
            const data = oeeData[m.machine_code];
            if (!data) return;

            const oeeText = document.getElementById(`iiot-oee-text-${m.machine_code}`);
            const aText = document.getElementById(`iiot-avail-text-${m.machine_code}`);
            const pText = document.getElementById(`iiot-perf-text-${m.machine_code}`);
            const qText = document.getElementById(`iiot-qual-text-${m.machine_code}`);
            const aBar = document.getElementById(`iiot-avail-bar-${m.machine_code}`);
            const pBar = document.getElementById(`iiot-perf-bar-${m.machine_code}`);
            const qBar = document.getElementById(`iiot-qual-bar-${m.machine_code}`);

            if (oeeText) oeeText.innerText = `${data.oee}%`;
            if (aText) aText.innerText = `${data.availability}%`;
            if (pText) pText.innerText = `${data.performance}%`;
            if (qText) qText.innerText = `${data.quality}%`;

            if (aBar) aBar.style.width = `${data.availability}%`;
            if (pBar) pBar.style.width = `${data.performance}%`;
            if (qBar) qBar.style.width = `${data.quality}%`;

            // Update planned and current output if elements exist (planned output comes from OEE endpoint)
            const plannedEl = document.getElementById(`iiot-planned-${m.machine_code}`);
            if (plannedEl) plannedEl.innerText = data.expected_output || 0;
            
            const counterEl = document.getElementById(`iiot-counter-${m.machine_code}`);
            if (counterEl) counterEl.innerText = data.live_counter || 0;
        });
    }
    
    function simulateData() {
        const fakeData = {};
        const fakeOeeData = {};
        machinesWithIIoT.forEach(m => {
            const isAlert = Math.random() > 0.8;
            
            fakeData[m.machine_code] = {
                live_status: isAlert ? 'WARNING' : 'RUNNING',
                live_counter: Math.floor(Math.random() * 1000),
                live_total: 1000,
                cycle_time: (Math.random() * 5 + 5).toFixed(2)
            };
            
            const avail = (Math.random() * 20 + 80).toFixed(1);
            const perf = (Math.random() * 20 + 80).toFixed(1);
            const qual = (Math.random() * 5 + 95).toFixed(1);
            const oee = ((avail/100) * (perf/100) * (qual/100) * 100).toFixed(1);
            
            fakeOeeData[m.machine_code] = {
                availability: avail,
                performance: perf,
                quality: qual,
                oee: oee,
                expected_output: 1000,
                live_counter: fakeData[m.machine_code].live_counter
            };
        });
        updateUI(fakeData);
        updateOeeUI(fakeOeeData);
    }

    function evaluateZones() {
        if (typeof MapBuilderModule === 'undefined') return;
        const canvas = MapBuilderModule.getCanvas();
        if (!canvas) return;
        const polygons = canvas.getObjects('polygon');
        if (polygons.length === 0) return;
        
        const nodes = document.querySelectorAll('.machine-node');
        const machines = [];
        nodes.forEach(n => {
            const status = n.classList.contains('running') ? 'running' :
                           n.classList.contains('stopped') ? 'stopped' :
                           n.classList.contains('warning') ? 'warning' : 'offline';
            const mapContainer = document.getElementById('mapNodesContainer');
            if(!mapContainer) return;
            
            const leftPercent = parseFloat(n.style.left) / 100;
            const topPercent = parseFloat(n.style.top) / 100;
            
            const x = leftPercent * mapContainer.offsetWidth;
            const y = topPercent * mapContainer.offsetHeight;
            
            machines.push({ x: x, y: y, status: status });
        });
        
        polygons.forEach(poly => {
            let hasStopped = false;
            let hasWarning = false;
            let hasRunning = false;
            
            machines.forEach(m => {
                const pt = new fabric.Point(m.x, m.y);
                if (poly.containsPoint(pt)) {
                    if (m.status === 'stopped') hasStopped = true;
                    else if (m.status === 'warning') hasWarning = true;
                    else if (m.status === 'running') hasRunning = true;
                }
            });
            
            let color = 'rgba(56, 189, 248, 0.2)'; // Default Blue
            if (hasStopped) color = 'rgba(239, 68, 68, 0.5)'; // Red
            else if (hasWarning) color = 'rgba(245, 158, 11, 0.5)'; // Yellow
            else if (hasRunning) color = 'rgba(16, 185, 129, 0.3)'; // Green
            
            poly.set('fill', color);
        });
        if(canvas.renderAll) canvas.renderAll();
    }

    function updateUI(telemetryData) {
        machinesWithIIoT.forEach(m => {
            const data = telemetryData[m.machine_code];
            const statusEl = document.getElementById(`iiot-status-${m.machine_code}`);
            const cycleEl = document.getElementById(`iiot-cycle-${m.machine_code}`);
            const cardEl = document.getElementById(`iiot-card-${m.machine_code}`);

            if (!data) {
                if (statusEl) {
                    statusEl.className = 'iiot-status offline';
                    statusEl.innerText = 'OFFLINE';
                }
                return;
            }

            // Update Status
            let isAlert = false;
            if (statusEl) {
                const s = (data.live_status || '').toUpperCase();
                if (s.includes('RUN') || s.includes('ON')) {
                    statusEl.className = 'iiot-status running';
                    statusEl.innerText = s;
                } else if (s.includes('STOP') || s.includes('OFF') || s.includes('DOWN')) {
                    statusEl.className = 'iiot-status stopped';
                    statusEl.innerText = s;
                    isAlert = true;
                } else {
                    statusEl.className = 'iiot-status idle';
                    statusEl.innerText = s || 'UNKNOWN';
                }
            }

            // Update Cycle Time
            if (cycleEl) {
                if (data.cycle_time != null && parseFloat(data.cycle_time) > 0) {
                    cycleEl.innerText = `${parseFloat(data.cycle_time).toFixed(1)} s`;
                } else {
                    cycleEl.innerText = '-';
                }
            }

            // Update Card Border on Stop
            if (cardEl) {
                if (isAlert) {
                    cardEl.style.border = '1px solid var(--pe-danger)';
                } else {
                    cardEl.style.border = '1px solid #e2e8f0';
                }
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
                evaluateZones();
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
        isSimulating = !isSimulating;
        const icon = document.getElementById('iiotSimIcon');
        const liveIndicator = document.querySelector('.live-indicator');
        
        if (isSimulating) {
            PEApp.showToast('IIoT Simulation Mode Enabled', 'info');
            if (icon) {
                icon.style.color = '#3b82f6';
                icon.classList.add('fa-spin');
            }
            if (liveIndicator) {
                liveIndicator.classList.add('sim-mode');
                liveIndicator.innerHTML = '<div class="dot"></div> SIMULATION';
            }
        } else {
            if (icon) {
                icon.style.color = 'inherit';
                icon.classList.remove('fa-spin');
            }
            if (liveIndicator) {
                liveIndicator.classList.remove('sim-mode');
                liveIndicator.innerHTML = '<div class="dot"></div> LIVE';
            }
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
            if (panzoomInstance) panzoomInstance.setOptions({ disablePan: true, disableZoom: true });
        } else {
            floorplan.classList.remove('edit-mode');
            if (editBtn) editBtn.classList.replace('btn-secondary', 'btn-outline-secondary');
            if (saveBtn) saveBtn.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'none';
            if (panzoomInstance) panzoomInstance.setOptions({ disablePan: false, disableZoom: false });
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

    function uploadMapBg(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const modalEl = document.getElementById('iiotCropModal');
            if (modalEl && modalEl.parentNode !== document.body) {
                document.body.appendChild(modalEl); // Fix backdrop overlay bug
            }
            
            const cropModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            const image = document.getElementById('iiotCropImage');
            image.src = e.target.result;
            
            if (cropperInstance) {
                cropperInstance.destroy();
            }
            
            cropModal.show();
            
            document.getElementById('iiotCropModal').addEventListener('shown.bs.modal', function () {
                cropperInstance = new Cropper(image, {
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                });
            }, { once: true });
        };
        reader.readAsDataURL(file);
        input.value = ''; // Reset input
    }
    
    function rotateMap(degree) {
        if (cropperInstance) {
            cropperInstance.rotate(degree);
        }
    }

    async function confirmMapCrop() {
        if (!cropperInstance) return;
        
        const canvas = cropperInstance.getCroppedCanvas({
            maxWidth: 2048,
            maxHeight: 2048
        });
        
        if (!canvas) return;
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('action', 'upload_map_bg');
            formData.append('map_bg', blob, 'map_bg.png');
            
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
                    
                    const modalEl = document.getElementById('iiotCropModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                } else {
                    throw new Error(data.message);
                }
            } catch (e) {
                PEApp.showToast('Upload failed: ' + e.message, 'error');
            }
        }, 'image/png');
    }

    function setPanzoomState(state) {
        if (panzoomInstance) {
            panzoomInstance.setOptions({ disablePan: !state, disableZoom: !state });
        }
    }

    return { init, stop, toggleSimulation, toggleEditMode, saveMapPositions, uploadMapBg, rotateMap, confirmMapCrop, setPanzoomState };
})();
