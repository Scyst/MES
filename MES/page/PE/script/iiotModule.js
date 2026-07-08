const IIoTModule = (function() {
    let pollingInterval = null;
    let machinesWithIIoT = [];
    let lastOeeData = {};
    let isSimulating = false;
    let isMapEditMode = false;
    let isAddAssetMode = false;
    let isPlacingAssetMode = false;
    let placingMachineId = null;
    let currentFilterState = { search: '', type: '', line: '', status: '', criticality: '' };
    let cropperInstance = null;
    let panzoomInstance = null;

    async function init() {
        try {
            const tt = document.getElementById('machineTooltip');
            if (tt && tt.parentNode !== document.body) {
                document.body.appendChild(tt);
            }

            const initialArea = document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1;
            await loadArea(initialArea);
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

            // Zone Analytics Click Handler
            const mapNodesContainer = document.getElementById('mapNodesContainer');
            if (mapNodesContainer) {
                mapNodesContainer.addEventListener('click', (e) => {
                    if (e.target.id === 'mapNodesContainer' && !isMapEditMode && !isAddAssetMode) {
                        if (typeof MapBuilderModule === 'undefined') return;
                        const canvas = MapBuilderModule.getCanvas();
                        if (!canvas) return;

                        const rect = mapNodesContainer.getBoundingClientRect();
                        const scale = panzoomInstance ? panzoomInstance.getScale() : 1;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        
                        const pt = new fabric.Point(x, y);
                        let clickedZone = null;

                        const polygons = canvas.getObjects('polygon');
                        const rects = canvas.getObjects('rect');
                        [...polygons, ...rects].forEach(shape => {
                            if (shape.containsPoint(pt)) clickedZone = shape;
                        });

                        if (clickedZone) {
                            showZoneAnalytics(clickedZone);
                        }
                    }
                });
            }

            renderGrid();
            startPolling();
            animateAlerts();
            
            // Listen for Tab Changes to handle Polling Lifecycle
            document.addEventListener('peTabChanged', (e) => {
                if (e.detail.tab === 'iiot') {
                    startPolling();
                } else {
                    stop();
                }
            });
            
        } catch (e) {
            console.error("Failed to init IIoT Dashboard", e);
        }
    }

    function stop() {
        if (pollingInterval) clearInterval(pollingInterval);
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
            
            node.addEventListener('click', async (e) => {
                if (!isMapEditMode && !isAddAssetMode) {
                    if (typeof MachineModule !== 'undefined' && MachineModule.openModal) {
                        try {
                            const prevHTML = node.innerHTML;
                            node.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:12px; color:white;"></i>';
                            await MachineModule.loadData();
                            MachineModule.openModal(m.machine_id);
                            node.innerHTML = prevHTML;
                        } catch(err) {
                            console.error(err);
                            PEApp.showToast('Failed to open machine details', 'error');
                        }
                    } else {
                        PEApp.showToast('Machine Registry module not loaded.', 'warning');
                    }
                }
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

        if (typeof updateHeatmapData === 'function') updateHeatmapData();
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
            poly.alert_state = 'idle';

            if (hasStopped) {
                color = 'rgba(239, 68, 68, 0.5)'; // Red
                poly.alert_state = 'stopped';
            }
            else if (hasWarning) {
                color = 'rgba(245, 158, 11, 0.5)'; // Yellow
                poly.alert_state = 'warning';
            }
            else if (hasRunning) {
                color = 'rgba(16, 185, 129, 0.3)'; // Green
                poly.alert_state = 'running';
            }
            
            poly.set('fill', color);
            if (poly.alert_state === 'idle' || poly.alert_state === 'running') {
                poly.opacity = 1; // Reset opacity
            }
        });
        if(canvas.renderAll) canvas.renderAll();
    }

    let animationReq = null;
    function animateAlerts() {
        if (typeof MapBuilderModule !== 'undefined') {
            const canvas = MapBuilderModule.getCanvas();
            if (canvas) {
                let renderNeeded = false;
                const objects = canvas.getObjects('polygon');
                objects.forEach(obj => {
                    if (obj.alert_state === 'stopped' || obj.alert_state === 'warning') {
                        if (obj.opacity === undefined) obj.opacity = 1;
                        if (obj._dir === undefined) obj._dir = -0.02;

                        obj.opacity += obj._dir;
                        if (obj.opacity <= 0.2) {
                            obj.opacity = 0.2;
                            obj._dir = 0.02;
                        } else if (obj.opacity >= 1) {
                            obj.opacity = 1;
                            obj._dir = -0.02;
                        }
                        renderNeeded = true;
                    }
                });
                if (renderNeeded) canvas.renderAll();
            }
        }
        animationReq = requestAnimationFrame(animateAlerts);
    }

    async function showZoneAnalytics(zone) {
        const nodes = document.querySelectorAll('.machine-node');
        const container = document.getElementById('mapNodesContainer');
        if (!container) return;

        let totalOutput = 0;
        let expectedOutput = 0;
        let sumAvail = 0, sumPerf = 0, sumQual = 0, sumOee = 0;
        let machineCount = 0;
        let machineCodes = [];

        const lines = new Set();

        nodes.forEach(n => {
            const leftPercent = parseFloat(n.style.left) / 100;
            const topPercent = parseFloat(n.style.top) / 100;
            const x = leftPercent * container.offsetWidth;
            const y = topPercent * container.offsetHeight;
            
            if (zone.containsPoint(new fabric.Point(x, y))) {
                const mc = n.dataset.code;
                machineCodes.push(mc);
                const mObj = machinesWithIIoT.find(x => x.machine_code === mc);
                if (mObj && mObj.line) lines.add(mObj.line);

                const d = lastOeeData[mc]; 
                if (d) {
                    machineCount++;
                    sumAvail += parseFloat(d.availability || 0);
                    sumPerf += parseFloat(d.performance || 0);
                    sumQual += parseFloat(d.quality || 0);
                    sumOee += parseFloat(d.oee || 0);
                    totalOutput += parseInt(d.live_counter || 0);
                    expectedOutput += parseFloat(d.expected_output || 0);
                } else {
                    machineCount++;
                }
            }
        });
        let locationNameStr = '';
        if (zone.location_id && typeof MapBuilderModule !== 'undefined') {
            const locs = MapBuilderModule.getLocations();
            const loc = locs.find(l => l.location_id == zone.location_id);
            if (loc) {
                locationNameStr = `<p class="mb-2 text-primary" style="font-size: 12px;"><i class="fas fa-map-marker-alt me-1"></i> Bound Location: <strong>${loc.location_name}</strong></p>`;
                if (loc.production_line) {
                    lines.add(loc.production_line);
                }
            }
        }

        let stockHtml = '';
        /* 
        // [INCOMPLETE FEATURE: Inventory Integration] 
        // Commented out temporarily due to performance issues and inaccurate data summation (BOM explosion causes negative billions).
        // To be developed later when the data structure is refined.
        if (zone.location_id) {
            try {
                const res = await fetch(`api/mapAPI.php?action=get_inventory_balance&location_id=${zone.location_id}`);
                const data = await res.json();
                if (data.success && data.total_stock !== null) {
                    stockHtml = `
                    <div class="d-flex justify-content-between mb-2 pb-2 border-bottom">
                        <span class="text-secondary"><i class="fas fa-boxes me-2"></i>Current Stock (WIP)</span>
                        <strong class="text-warning">${parseFloat(data.total_stock).toLocaleString()} units</strong>
                    </div>`;
                }
            } catch (e) {
                console.error("Failed to fetch inventory", e);
            }
        }
        */

        let unassignedOutput = 0;
        lines.forEach(line => {
            const unassignedCode = `${line} (Unassigned)`;
            const d = lastOeeData[unassignedCode];
            if (d) {
                const out = parseInt(d.live_counter || 0);
                if (out > 0) {
                    totalOutput += out;
                    unassignedOutput += out;
                    expectedOutput += parseFloat(d.expected_output || 0);
                }
            }
        });

        if (machineCodes.length === 0 && lines.size === 0) {
            PEApp.showToast('No active machines or bound locations found in this zone', 'warning');
            return;
        }

        let avgAvail = machineCount ? (sumAvail / machineCount).toFixed(1) : 0;
        let avgPerf = machineCount ? (sumPerf / machineCount).toFixed(1) : 0;
        let avgQual = machineCount ? (sumQual / machineCount).toFixed(1) : 0;
        let avgOee = machineCount ? (sumOee / machineCount).toFixed(1) : 0;

        // If we have totalOutput (including unassigned) and expectedOutput, recalculate Zone Performance
        if (expectedOutput > 0) {
            avgPerf = Math.min(100, (totalOutput / expectedOutput) * 100).toFixed(1);
            if (parseFloat(avgQual) === 0 && totalOutput > 0) {
                avgQual = '100.0';
            }
            // Recompute OEE based on new performance
            avgOee = ((parseFloat(avgAvail) / 100) * (avgPerf / 100) * (parseFloat(avgQual) / 100) * 100).toFixed(1);
        } else if (totalOutput > 0) {
            // Edge case: Zone has output but no expected output (e.g. manual line without targets)
            avgPerf = 100.0;
            // Also assume 100% availability if it was 0, since it must have been available to produce
            if (parseFloat(avgAvail) === 0) {
                avgAvail = '100.0';
            }
            if (parseFloat(avgQual) === 0) {
                avgQual = '100.0';
            }
            avgOee = ((parseFloat(avgAvail) / 100) * (avgPerf / 100) * (parseFloat(avgQual) / 100) * 100).toFixed(1);
        }

        const machineBadges = machineCodes.map(mc => `<span class="badge bg-secondary me-1 mb-1">${mc}</span>`).join('');
        
        const html = `
            <div style="text-align:left; font-size: 14px;">
                ${locationNameStr}
                <div style="margin-bottom: 15px;">
                    <p style="margin-bottom: 5px;" class="text-muted"><strong>Machines (${machineCodes.length}):</strong></p>
                    <div style="max-height: 80px; overflow-y: auto;">
                        ${machineCodes.length > 0 ? machineBadges : 'None'}
                    </div>
                </div>
                <div class="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span class="text-secondary"><i class="fas fa-cube me-2"></i>Total Output</span>
                    <strong class="text-primary">${totalOutput.toLocaleString()} ${unassignedOutput > 0 ? `<br><small class="text-muted" style="font-size:10px;">(+${unassignedOutput.toLocaleString()} Unassigned)</small>` : ''}</strong>
                </div>
                <div class="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span class="text-secondary"><i class="fas fa-bullseye me-2"></i>Expected Output</span>
                    <strong>${expectedOutput.toLocaleString()}</strong>
                </div>
                ${stockHtml}
                <div class="d-flex justify-content-between mb-3">
                    <span class="text-secondary"><i class="fas fa-chart-pie me-2"></i>Avg Availability</span>
                    <strong style="color: #10b981;">${avgAvail}%</strong>
                </div>
                <div class="d-flex justify-content-between mb-3">
                    <span class="text-secondary"><i class="fas fa-chart-line me-2"></i>Avg Performance</span>
                    <strong style="color: #3b82f6;">${avgPerf}%</strong>
                </div>
                <div class="d-flex justify-content-between mb-3 border-bottom pb-3">
                    <span class="text-secondary"><i class="fas fa-check-circle me-2"></i>Avg Quality</span>
                    <strong style="color: #8b5cf6;">${avgQual}%</strong>
                </div>
                <div class="text-center mt-3 p-3 bg-light rounded">
                    <small class="text-muted text-uppercase fw-bold d-block mb-1">Zone OEE</small>
                    <h2 class="mb-0 fw-bold" style="color: #0ea5e9;">${avgOee}%</h2>
                </div>
            </div>
        `;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: `<i class="fas fa-chart-area me-2 text-primary"></i> Zone Analytics`,
                html: html,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Close',
                width: '400px'
            });
        } else {
            alert(`Zone Analytics\nMachines: ${machineCodes.join(', ')}\nOEE: ${avgOee}%`);
        }
    }

    function updateUI(telemetryData) {
        let activeCount = 0;
        let repairCount = 0;
        
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
                if (m.status === 'Under Repair' || m.status === 'Maintenance') {
                    repairCount++;
                }
                
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
                if (s === 'WARNING' || s.includes('ALARM') || s.includes('ERROR') || isAlert || nodeEl.dataset.simulatedAlert) {
                    nodeEl.classList.add('warning', 'pulsate-alert');
                } else if (s.includes('RUN') || s.includes('ON')) {
                    nodeEl.classList.add('running');
                } else if (s.includes('STOP') || s.includes('OFF') || s.includes('DOWN')) {
                    nodeEl.classList.add('stopped');
                } else {
                    nodeEl.classList.add('offline');
                }
            }
        });
        
        // Update Overview KPIs
        const elTotal = document.getElementById('iiotKpiTotal');
        const elActive = document.getElementById('iiotKpiActive');
        const elRepair = document.getElementById('iiotKpiRepair');
        const elConnected = document.getElementById('iiotKpiConnected');
        
        if (elTotal) elTotal.innerText = allMachinesCache.length || machinesWithIIoT.length;
        if (elActive) elActive.innerText = activeCount;
        if (elRepair) elRepair.innerText = repairCount;
        if (elConnected) elConnected.innerText = machinesWithIIoT.length;

        // Evaluate zones once after all machines are updated
        evaluateZones();
    }

    function stop() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    function applyFilter() {
        let activeFilterCount = 0;
        if (currentFilterState.search) activeFilterCount++;
        if (currentFilterState.type) activeFilterCount++;
        if (currentFilterState.line) activeFilterCount++;
        if (currentFilterState.status) activeFilterCount++;
        if (currentFilterState.criticality) activeFilterCount++;
        
        const badge = document.getElementById('iiotFilterActiveBadge');
        if (badge) {
            badge.style.display = activeFilterCount > 0 ? 'block' : 'none';
        }
        
        const s = currentFilterState.search;
        
        machinesWithIIoT.forEach(m => {
            const nodeEl = document.getElementById(`iiot-node-${m.machine_code}`);
            if (nodeEl) {
                let match = true;
                
                if (s) {
                    const combined = `${m.machine_name} ${m.machine_code} ${m.asset_no} ${m.manufacturer} ${m.model}`.toLowerCase();
                    if (!combined.includes(s)) match = false;
                }
                if (currentFilterState.type && m.machine_type !== currentFilterState.type) match = false;
                if (currentFilterState.line && m.line !== currentFilterState.line) match = false;
                if (currentFilterState.status && m.status !== currentFilterState.status) match = false;
                if (currentFilterState.criticality && m.criticality !== currentFilterState.criticality) match = false;
                
                nodeEl.style.display = match ? 'flex' : 'none';
            }
        });
    }

    function openFilterModal() {
        const modalEl = document.getElementById('iiotFilterModal');
        if (modalEl && modalEl.parentNode !== document.body) {
            document.body.appendChild(modalEl);
        }
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        
        // Ensure dropdowns are populated
        const types = [...new Set(machinesWithIIoT.map(m => m.machine_type).filter(Boolean))];
        const lines = [...new Set(machinesWithIIoT.map(m => m.line).filter(Boolean))];
        
        const typeSelect = document.getElementById('iiotFilterType');
        if (typeSelect) {
            while(typeSelect.options.length > 1) typeSelect.options.remove(1);
            types.forEach(t => typeSelect.add(new Option(t, t)));
            typeSelect.value = currentFilterState.type;
        }
        
        const lineSelect = document.getElementById('iiotFilterLine');
        if (lineSelect) {
            while(lineSelect.options.length > 1) lineSelect.options.remove(1);
            lines.forEach(l => lineSelect.add(new Option(l, l)));
            lineSelect.value = currentFilterState.line;
        }
        
        document.getElementById('iiotFilterSearch').value = currentFilterState.search;
        document.getElementById('iiotFilterStatus').value = currentFilterState.status;
        document.getElementById('iiotFilterCriticality').value = currentFilterState.criticality;
        
        modal.show();
    }
    
    function applyAdvancedFilter() {
        currentFilterState.search = document.getElementById('iiotFilterSearch').value.toLowerCase();
        currentFilterState.type = document.getElementById('iiotFilterType').value;
        currentFilterState.line = document.getElementById('iiotFilterLine').value;
        currentFilterState.status = document.getElementById('iiotFilterStatus').value;
        currentFilterState.criticality = document.getElementById('iiotFilterCriticality').value;
        
        applyFilter();
        
        // Hide modal
        const modalEl = document.getElementById('iiotFilterModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
    
    function clearFilter() {
        document.getElementById('iiotFilterSearch').value = '';
        document.getElementById('iiotFilterType').value = '';
        document.getElementById('iiotFilterLine').value = '';
        document.getElementById('iiotFilterStatus').value = '';
        document.getElementById('iiotFilterCriticality').value = '';
        
        currentFilterState = { search: '', type: '', line: '', status: '', criticality: '' };
        applyFilter();
    }

    let allMachinesCache = [];

    function toggleInventoryPanel() {
        const panel = document.getElementById('iiotInventoryPanel');
        if (panel) {
            if (panel.style.display === 'none' || panel.style.display === '') {
                renderInventory();
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
                isPlacingAssetMode = false;
                placingMachineId = null;
                document.getElementById('iiotFloorplan').style.cursor = 'default';
            }
        }
    }

    function renderInventory() {
        const unplaced = allMachinesCache.filter(m => m.map_x == null || m.map_x === '' || m.map_y == null || m.map_y === '');
        
        const badge = document.getElementById('iiotUnplacedBadge');
        if (badge) {
            badge.innerText = unplaced.length;
            badge.style.display = unplaced.length > 0 ? 'inline-block' : 'none';
        }
        
        const listEl = document.getElementById('iiotInventoryList');
        if (!listEl) return;
        
        if (unplaced.length === 0) {
            listEl.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-check-circle mb-2" style="font-size: 24px; opacity: 0.5;"></i><br><small>All assets are placed</small></div>';
            return;
        }
        
        listEl.innerHTML = unplaced.map(m => `
            <div class="pe-card p-2 d-flex justify-content-between align-items-center" style="border: 1px solid #e2e8f0; margin-bottom: 8px;">
                <div>
                    <div class="fw-bold" style="font-size: 13px;">${PEApp.escapeHtml(m.machine_code)}</div>
                    <div class="text-muted" style="font-size: 11px;">${PEApp.escapeHtml(m.machine_name)}</div>
                </div>
                <button class="btn btn-sm btn-primary-soft" onclick="IIoTModule.startPlacingAsset(${m.machine_id})" title="Place on Map">
                    <i class="fas fa-map-pin"></i>
                </button>
            </div>
        `).join('');
    }

    function startPlacingAsset(machineId) {
        isPlacingAssetMode = true;
        placingMachineId = machineId;
        document.getElementById('iiotFloorplan').style.cursor = 'crosshair';
        
        // Hide panel so they can click the map
        const panel = document.getElementById('iiotInventoryPanel');
        if (panel) panel.style.display = 'none';
        
        const mapNodesContainer = document.getElementById('mapNodesContainer');
        if (mapNodesContainer) {
            mapNodesContainer.addEventListener('click', handlePlaceAssetClick);
        }
        
        PEApp.showToast('Click on the map to place the asset.', 'info');
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

    let heatmapInstance = null;
    let isHeatmapActive = false;

    function toggleHeatmap() {
        isHeatmapActive = !isHeatmapActive;
        const btn = document.getElementById('iiotHeatmapBtn');
        if (!btn) return;
        if (isHeatmapActive) {
            btn.classList.replace('btn-outline-warning', 'btn-warning');
            initHeatmap();
            updateHeatmapData(); // Initial draw
        } else {
            btn.classList.replace('btn-warning', 'btn-outline-warning');
            const c = document.getElementById('heatmapCanvas');
            if (c) c.style.display = 'none';
        }
    }

    function initHeatmap() {
        let c = document.getElementById('heatmapCanvas');
        const container = document.getElementById('iiotPanzoomElement');
        if (!container) return;
        
        if (!c) {
            c = document.createElement('canvas');
            c.id = 'heatmapCanvas';
            c.style.position = 'absolute';
            c.style.top = '0';
            c.style.left = '0';
            c.style.pointerEvents = 'none';
            c.style.zIndex = '50';
            c.style.opacity = '0.7';
            c.width = container.offsetWidth || 1200;
            c.height = container.offsetHeight || 600;
            container.appendChild(c);
        }
        c.width = container.offsetWidth;
        c.height = container.offsetHeight;
        c.style.display = 'block';

        if (typeof simpleheat !== 'undefined') {
            heatmapInstance = simpleheat(c);
            heatmapInstance.max(100); // 100% OEE
            heatmapInstance.radius(50, 30); // Adjusted to normal size
        }
    }

    function updateHeatmapData() {
        if (!isHeatmapActive || !heatmapInstance) return;
        
        const container = document.getElementById('iiotPanzoomElement');
        const c = document.getElementById('heatmapCanvas');
        if (c.width !== container.offsetWidth || c.height !== container.offsetHeight) {
            c.width = container.offsetWidth;
            c.height = container.offsetHeight;
            if (heatmapInstance.resize) heatmapInstance.resize();
        }

        const nodes = document.querySelectorAll('.machine-node');
        const points = [];
        
        nodes.forEach(n => {
            const mc = n.dataset.code;
            const leftPercent = parseFloat(n.style.left) / 100;
            const topPercent = parseFloat(n.style.top) / 100;
            const x = leftPercent * container.offsetWidth;
            const y = topPercent * container.offsetHeight;
            
            const oee = lastOeeData[mc] ? parseFloat(lastOeeData[mc].oee || 0) : 0;
            
            // simpleheat expects [x, y, value]
            if (oee > 0) {
                points.push([x, y, oee]);
            }
        });

        console.log("Heatmap updated, drawing points:", points.length);
        heatmapInstance.data(points);
        heatmapInstance.draw();
    }

    async function loadArea(areaId) {
        if (!areaId) areaId = document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1;
        
        // Fetch all machines to get unplaced items
        const resAll = await PEApp.apiCall('machineAPI.php', { action: 'get_machines' });
        allMachinesCache = resAll.data || [];
        
        // Update unplaced badge immediately
        const unplaced = allMachinesCache.filter(m => m.map_x == null || m.map_x === '' || m.map_y == null || m.map_y === '');
        const badge = document.getElementById('iiotUnplacedBadge');
        if (badge) {
            badge.innerText = unplaced.length;
            badge.style.display = unplaced.length > 0 ? 'inline-block' : 'none';
        }
        
        machinesWithIIoT = allMachinesCache.filter(m => m.area_id == areaId && ((m.mqtt_topic && m.mqtt_topic.trim() !== '') || (m.map_x != null && m.map_y != null)));
        
        renderGrid(); // this calls renderFloorplan inside it
        
        // Ensure filter is applied if one is selected
        applyFilter();
        
        if (typeof MapBuilderModule !== 'undefined') {
            MapBuilderModule.loadMap(areaId);
        }

        // Calculate KPI metrics
        const activeCount = allMachinesCache.filter(m => m.status === 'running').length;
        const repairCount = allMachinesCache.filter(m => m.status === 'repair').length;

        // Update Overview KPIs
        const elTotal = document.getElementById('iiotKpiTotal');
        const elActive = document.getElementById('iiotKpiActive');
        const elRepair = document.getElementById('iiotKpiRepair');
        const elConnected = document.getElementById('iiotKpiConnected');
        
        if (elTotal) elTotal.innerText = allMachinesCache.length;
        if (elActive) elActive.innerText = activeCount;
        if (elRepair) elRepair.innerText = repairCount;
        if (elConnected) elConnected.innerText = machinesWithIIoT.length;
        
        if (isHeatmapActive) updateHeatmapData();
    }

    function simulateAlert() {
        const nodes = document.querySelectorAll('.machine-node');
        if (nodes.length > 0) {
            const node = nodes[0];
            node.dataset.simulatedAlert = 'true';
            node.className = 'machine-node warning pulsate-alert';
            PEApp.showToast('Simulated ALARM on ' + node.dataset.code, 'warning');
            setTimeout(() => {
                delete node.dataset.simulatedAlert;
                PEApp.showToast('Alert cleared', 'info');
                node.classList.remove('warning', 'pulsate-alert');
            }, 10000); 
        } else {
            PEApp.showToast('No machines available on map to simulate alert.', 'info');
        }
    }

    function toggleAddAssetMode() {
        isAddAssetMode = !isAddAssetMode;
        const btn = document.getElementById('iiotAddAssetBtn');
        const floorplan = document.getElementById('iiotFloorplan');
        
        if (isAddAssetMode) {
            PEApp.showToast('Click on the map to pin a new asset.', 'info');
            if (btn) {
                btn.style.backgroundColor = '#10b981';
                btn.style.color = 'white';
            }
            if (floorplan) floorplan.style.cursor = 'crosshair';
            if (panzoomInstance) panzoomInstance.setOptions({ disablePan: true, disableZoom: true });
            
            // Add click listener
            const mapNodesContainer = document.getElementById('mapNodesContainer');
            if (mapNodesContainer) {
                mapNodesContainer.addEventListener('click', handleAddAssetClick);
            }
        } else {
            if (btn) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#10b981';
            }
            if (floorplan) floorplan.style.cursor = 'default';
            if (panzoomInstance) panzoomInstance.setOptions({ disablePan: false, disableZoom: false });
            
            const mapNodesContainer = document.getElementById('mapNodesContainer');
            if (mapNodesContainer) {
                mapNodesContainer.removeEventListener('click', handleAddAssetClick);
            }
        }
    }

    function handleAddAssetClick(e) {
        if (!isAddAssetMode) return;
        
        const mapNodesContainer = document.getElementById('mapNodesContainer');
        const rect = mapNodesContainer.getBoundingClientRect();
        
        // Calculate percentages
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        
        const activeArea = document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1;
        
        // Open full MachineModal FIRST
        if (typeof MachineModule !== 'undefined' && MachineModule.openModal) {
            MachineModule.openModal(null);
            
            // Populate hidden fields in machineModal AFTER it opens (so it doesn't get cleared)
            const xInput = document.getElementById('machineFrmMapX');
            const yInput = document.getElementById('machineFrmMapY');
            const areaInput = document.getElementById('machineFrmAreaId');
            
            if (xInput) xInput.value = xPercent.toFixed(2);
            if (yInput) yInput.value = yPercent.toFixed(2);
            if (areaInput) areaInput.value = activeArea;
        } else {
            PEApp.showToast('Machine Registry module not loaded', 'warning');
        }
        
        // Exit add mode
        toggleAddAssetMode();
    }

    async function handlePlaceAssetClick(e) {
        if (!isPlacingAssetMode || !placingMachineId) return;
        
        const mapNodesContainer = document.getElementById('mapNodesContainer');
        const rect = mapNodesContainer.getBoundingClientRect();
        
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        
        const activeArea = document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1;
        
        try {
            const res = await PEApp.apiCall('machineAPI.php', {}, 'POST', {
                action: 'update_location',
                machine_id: placingMachineId,
                map_x: xPercent.toFixed(2),
                map_y: yPercent.toFixed(2),
                area_id: activeArea
            });
            if (res.success) {
                PEApp.showToast('Asset placed successfully!', 'success');
                // Cleanup mode
                isPlacingAssetMode = false;
                placingMachineId = null;
                document.getElementById('iiotFloorplan').style.cursor = 'default';
                mapNodesContainer.removeEventListener('click', handlePlaceAssetClick);
                
                // Refresh map and inventory
                await loadArea(activeArea);
                if (document.getElementById('iiotInventoryPanel').style.display === 'block') {
                    renderInventory();
                }
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            PEApp.showToast(err.message, 'error');
            isPlacingAssetMode = false;
            placingMachineId = null;
            document.getElementById('iiotFloorplan').style.cursor = 'default';
            mapNodesContainer.removeEventListener('click', handlePlaceAssetClick);
        }
    }

    document.addEventListener('peMachineSaved', () => {
        // Reload area to show the new/updated asset if IIoT tab is active
        const iiotPanel = document.getElementById('panel-iiot');
        if (iiotPanel && iiotPanel.classList.contains('active')) {
            const activeArea = document.getElementById('iiotAreaSelect') ? document.getElementById('iiotAreaSelect').value : 1;
            loadArea(activeArea);
        }
    });

    return { init, stop, toggleSimulation, toggleEditMode, saveMapPositions, uploadMapBg, rotateMap, confirmMapCrop, setPanzoomState, toggleHeatmap, loadArea, simulateAlert, toggleAddAssetMode, toggleInventoryPanel, applyFilter, startPlacingAsset, openFilterModal, applyAdvancedFilter, clearFilter };
})();

window.IIoTModule = IIoTModule;
export default IIoTModule;
