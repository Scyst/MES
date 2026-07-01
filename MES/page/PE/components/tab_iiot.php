<!-- tab_iiot.php — Live IIoT Monitor -->
<style>
.iiot-dashboard {
    padding: 20px 0;
    background: #0f172a; /* Darker background for control room feel */
    border-radius: 12px;
    min-height: 70vh;
}
.iiot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px 20px 20px;
    border-bottom: 1px solid #334155;
    margin-bottom: 20px;
    color: #f8fafc;
}
.iiot-header h4 { margin: 0; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.iiot-header .live-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #ef4444;
    font-weight: 600;
}
.iiot-header .live-indicator .dot {
    width: 10px; height: 10px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse-red 1.5s infinite;
}
@keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.iiot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    padding: 0 20px;
}
.iiot-card {
    background: #1e293b;
    border-radius: 12px;
    border: 1px solid #334155;
    padding: 20px;
    color: #e2e8f0;
    position: relative;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    transition: transform 0.2s, box-shadow 0.2s;
}
.iiot-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
}
.iiot-card-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.iiot-card-subtitle {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 20px;
}
.iiot-status {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.iiot-status.running { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
.iiot-status.stopped { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #dc2626; }
.iiot-status.offline { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid #64748b; }

.iiot-metrics {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.iiot-metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.2);
    padding: 10px 15px;
    border-radius: 8px;
}
.iiot-metric-label {
    font-size: 0.85rem;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 8px;
}
.iiot-metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Consolas', monospace;
}
.iiot-metric-value.power { color: #f59e0b; }
.iiot-metric-value.output { color: #38bdf8; }
.iiot-metric-value.flow { color: #818cf8; }

.iiot-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
}
.iiot-empty i { font-size: 3rem; margin-bottom: 15px; opacity: 0.5; }

/* 2D Floor Plan Styles */
.iiot-floorplan-wrapper {
    margin: 0 20px 20px 20px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
}
.iiot-floorplan-title {
    color: #f8fafc;
    font-weight: 600;
    margin-bottom: 15px;
    font-size: 1.1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.iiot-floorplan {
    position: relative;
    width: 100%;
    height: 400px;
    background-color: #0f172a;
    background-image: 
        linear-gradient(rgba(51, 65, 85, 0.4) 1px, transparent 1px),
        linear-gradient(90deg, rgba(51, 65, 85, 0.4) 1px, transparent 1px);
    background-size: 40px 40px;
    border-radius: 8px;
    border: 1px solid #475569;
}
.machine-node {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
}
.machine-node:hover {
    transform: translate(-50%, -50%) scale(1.3);
}
.machine-node.running {
    background: #10b981;
    box-shadow: 0 0 15px 5px rgba(16, 185, 129, 0.4);
    animation: pulse-green 2s infinite;
}
.machine-node.stopped {
    background: #ef4444;
    box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.4);
    animation: pulse-red 1s infinite;
}
.machine-node.warning {
    background: #f59e0b;
    box-shadow: 0 0 15px 5px rgba(245, 158, 11, 0.4);
    animation: pulse-yellow 1.5s infinite;
}
@keyframes pulse-green {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
@keyframes pulse-yellow {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

/* Glassmorphism Tooltip */
.machine-tooltip {
    position: absolute;
    background: rgba(30, 41, 59, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    z-index: 20;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    width: max-content;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    transform: translate(-50%, -120%);
}
.machine-tooltip.visible {
    opacity: 1;
}
.machine-tooltip h6 { margin: 0 0 8px 0; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; }
.machine-tooltip div { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 4px; }
.machine-tooltip span.val { font-family: monospace; font-weight: bold; color: #38bdf8; }

/* Edit Mode */
.iiot-floorplan.edit-mode .machine-node {
    cursor: grab;
    border: 1px dashed white;
}
.iiot-floorplan.edit-mode .machine-node:active {
    cursor: grabbing;
}
.iiot-floorplan.edit-mode .machine-node:hover {
    transform: translate(-50%, -50%) scale(1.1); /* less scale while dragging */
}
</style>

<div class="iiot-dashboard pe-animate-in">
    <div class="iiot-header">
        <h4><i class="fas fa-satellite-dish"></i> Live IIoT Monitor</h4>
        <div class="d-flex align-items-center gap-4">
            <div class="form-check form-switch m-0 d-flex align-items-center gap-2">
                <input class="form-check-input mt-0" type="checkbox" id="iiotSimToggle" onchange="IIoTModule.toggleSimulation()">
                <label class="form-check-label text-white small" for="iiotSimToggle" style="font-size:0.8rem; opacity:0.8;">Simulation Mode</label>
            </div>
            <div class="live-indicator">
                <div class="dot"></div> LIVE
            </div>
        </div>
    </div>

    <div class="iiot-floorplan-wrapper">
        <div class="iiot-floorplan-title">
            <span><i class="fas fa-map"></i> 2D Interactive Floor Plan</span>
            <div>
                <input type="file" id="iiotMapBgInput" accept="image/*" style="display: none;" onchange="IIoTModule.uploadMapBg(this)">
                <button class="btn btn-sm btn-outline-secondary" id="iiotEditMapBtn" onclick="IIoTModule.toggleEditMode()">
                    <i class="fas fa-edit"></i> Edit Layout
                </button>
                <button class="btn btn-sm btn-secondary me-2" id="iiotUploadMapBtn" onclick="document.getElementById('iiotMapBgInput').click()" style="display: none;">
                    <i class="fas fa-upload"></i> Background
                </button>
                <button class="btn btn-sm btn-success" id="iiotSaveMapBtn" onclick="IIoTModule.saveMapPositions()" style="display: none;">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>
        <div class="iiot-floorplan" id="iiotFloorplan" style="background-image: url('assets/img/iiot-map-bg.png'); background-size: cover; background-position: center;">
            <!-- Machine Nodes will be injected here -->
            <div id="machineTooltip" class="machine-tooltip">
                <h6 id="ttMachineName">Machine Name</h6>
                <div><span>Status:</span> <span id="ttStatus" class="val">Running</span></div>
                <div><span>OEE:</span> <span id="ttOEE" class="val">85%</span></div>
                <div><span>Temp:</span> <span id="ttTemp" class="val">45 °C</span></div>
            </div>
        </div>
    </div>

    <div class="iiot-grid" id="iiotGrid">
        <div class="iiot-empty">
            <i class="fas fa-spinner fa-spin"></i>
            <h5>Connecting to Telemetry Stream...</h5>
        </div>
    </div>
</div>
