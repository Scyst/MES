<!-- tab_iiot.php — Live IIoT Monitor -->
<style>
.iiot-dashboard {
    padding: 0;
    background: transparent;
    min-height: 70vh;
}
.iiot-header {
    display: none;
}

.iiot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    padding: 0 20px;
}
.iiot-card {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    color: #1e293b;
    position: relative;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s, box-shadow 0.2s;
}
.iiot-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
    color: #64748b;
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
    background: #f1f5f9;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}
.iiot-metric-label {
    font-size: 0.8rem;
    color: #475569;
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
    color: #94a3b8;
}
.iiot-empty i { font-size: 3rem; margin-bottom: 15px; opacity: 0.5; }

/* 2D Floor Plan Styles */
.iiot-floorplan-wrapper {
    margin: 0 20px 20px 20px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.iiot-floorplan-title {
    color: #1e293b;
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
    min-height: 400px;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    overflow: hidden;
}
.iiot-floorplan-img {
    height: auto;
    display: block;
    max-width: none;
}
.machine-tooltip {
    position: fixed;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid #334155;
    padding: 10px;
    border-radius: 6px;
    color: #fff;
    pointer-events: none;
    z-index: 9999;
    display: none;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}
.machine-tooltip.visible {
    display: block;
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
.machine-node.offline {
    background: #64748b;
    border: 2px solid #94a3b8;
    box-shadow: 0 0 8px rgba(100, 116, 139, 0.6);
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
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #1e293b;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    z-index: 20;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    width: max-content;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    transform: translate(-50%, -120%);
}
.machine-tooltip.visible {
    opacity: 1;
}
.machine-tooltip h6 { margin: 0 0 8px 0; font-weight: bold; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 4px; }
.machine-tooltip div { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 4px; }
.machine-tooltip span.val { font-family: monospace; font-weight: bold; color: #0284c7; }

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

/* Live Indicator Styles */
.live-indicator {
    display: inline-flex;
    align-items: center;
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    border: 1px solid rgba(16, 185, 129, 0.2);
}
.live-indicator .dot {
    width: 8px;
    height: 8px;
    background-color: #10b981;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse-green 2s infinite;
}
.live-indicator.sim-mode {
    background-color: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.2);
}
.live-indicator.sim-mode .dot {
    background-color: #f59e0b;
    animation: pulse-yellow 2s infinite;
}
</style>

<div class="iiot-dashboard pe-animate-in">

    <div class="iiot-floorplan-wrapper">
        <div class="iiot-floorplan-title">
            <div class="d-flex align-items-center gap-3">
                <span>
                    <i class="fas fa-map" id="iiotSimIcon" style="cursor:pointer; transition: color 0.3s;" onclick="IIoTModule.toggleSimulation()" title="Toggle Simulation Mode"></i> 
                    2D Interactive Floor Plan
                </span>
                <div class="live-indicator" style="transform: scale(0.85); transform-origin: left center; margin-bottom: 0;">
                    <div class="dot"></div> LIVE
                </div>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-2" id="iiotMapBuilderBtn" onclick="MapBuilderModule.toggleMode()">
                    <i class="fas fa-drafting-compass"></i> Map Builder
                </button>
                <input type="file" id="iiotMapBgInput" accept="image/*" style="display: none;" onchange="IIoTModule.uploadMapBg(this)">
                <button class="btn btn-sm btn-outline-secondary" id="iiotEditMapBtn" onclick="IIoTModule.toggleEditMode()">
                    <i class="fas fa-edit"></i> Edit Nodes
                </button>
                <button class="btn btn-sm btn-secondary me-2" id="iiotUploadMapBtn" onclick="document.getElementById('iiotMapBgInput').click()" style="display: none;">
                    <i class="fas fa-upload"></i> Background
                </button>
                <button class="btn btn-sm btn-success" id="iiotSaveMapBtn" onclick="IIoTModule.saveMapPositions()" style="display: none;">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>
        <!-- Map Area -->
        <div class="iiot-floorplan" id="iiotFloorplan" style="position: relative; display: flex; justify-content: center; align-items: center; overflow: hidden; height: calc(100vh - 200px); min-height: 500px;">
            
            <!-- Map Builder Toolbar (Hidden by default) -->
            <div id="mapBuilderToolbar" class="pe-card" style="display: none; position: absolute; top: 16px; left: 16px; z-index: 100; padding: 12px; width: 440px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; border-radius: 8px;">
                <h6 style="margin-bottom: 12px; font-size: 14px; color: #1e293b;"><i class="fas fa-tools text-primary"></i> Map Builder Tools</h6>
                <div class="row">
                    <!-- Left Column: Drawing Tools -->
                    <div class="col-6">
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">Drawing</label>
                        <div class="row g-2">
                            <div class="col-6">
                                <button class="btn btn-outline-secondary btn-sm text-start w-100" onclick="MapBuilderModule.setMode('select')" id="btnDrawSelect"><i class="fas fa-mouse-pointer me-1"></i> Select</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-secondary btn-sm text-start w-100" onclick="MapBuilderModule.setMode('line')" id="btnDrawLine"><i class="fas fa-grip-lines me-1"></i> Wall</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-secondary btn-sm text-start w-100" onclick="MapBuilderModule.setMode('rect')" id="btnDrawRect"><i class="far fa-square me-1"></i> Box</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-secondary btn-sm text-start w-100" onclick="MapBuilderModule.setMode('poly')" id="btnDrawPoly" title="Double click or Enter to finish"><i class="fas fa-draw-polygon me-1"></i> Poly</button>
                            </div>
                            <div class="col-12">
                                <button class="btn btn-outline-secondary btn-sm text-start w-100" onclick="MapBuilderModule.setMode('text')" id="btnDrawText"><i class="fas fa-font me-2"></i> Add Text</button>
                            </div>
                            <div class="col-12">
                                <button class="btn btn-outline-danger btn-sm text-start w-100" onclick="MapBuilderModule.deleteSelected()"><i class="fas fa-trash me-2"></i> Delete Selected</button>
                            </div>
                        </div>
                        
                        <div id="objProperties" style="display: none; background: #f8fafc; padding: 8px; border-radius: 6px; margin-top: 8px; border: 1px solid #e2e8f0;">
                            <label style="font-size: 11px; color: #64748b;">Zone Name / Text</label>
                            <input type="text" id="objNameInput" class="form-control bg-white text-dark border-secondary form-control-sm" style="font-size: 12px;" oninput="MapBuilderModule.updateObjName(this.value)">
                        </div>
                        
                        <hr style="margin: 12px 0; border-color: #e2e8f0;">
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">Layers & Config</label>
                        <div class="form-check form-switch mt-1 mb-2">
                            <input class="form-check-input" type="checkbox" id="snapToGridToggle" onchange="MapBuilderModule.toggleSnap(this.checked)">
                            <label class="form-check-label text-dark" style="font-size: 12px;">Snap to Grid (50px)</label>
                        </div>
                        <div class="form-check form-switch mt-1">
                            <input class="form-check-input layer-toggle" type="checkbox" checked onchange="MapBuilderModule.toggleLayer('line', this.checked)">
                            <label class="form-check-label text-dark" style="font-size: 12px;">Walls</label>
                        </div>
                        <div class="form-check form-switch mt-1">
                            <input class="form-check-input layer-toggle" type="checkbox" checked onchange="MapBuilderModule.toggleLayer('zone', this.checked)">
                            <label class="form-check-label text-dark" style="font-size: 12px;">Zones</label>
                        </div>
                        <div class="form-check form-switch mt-1">
                            <input class="form-check-input layer-toggle" type="checkbox" checked onchange="MapBuilderModule.toggleLayer('text', this.checked)">
                            <label class="form-check-label text-dark" style="font-size: 12px;">Text Labels</label>
                        </div>
                        <div class="form-check form-switch mt-1 mb-2">
                            <input class="form-check-input layer-toggle" type="checkbox" checked onchange="MapBuilderModule.toggleLayer('machine', this.checked)">
                            <label class="form-check-label text-dark" style="font-size: 12px;">Machines</label>
                        </div>
                    </div>
                    
                    <!-- Right Column: Tracing & Opacity -->
                    <div class="col-6" style="border-left: 1px solid #e2e8f0;">
                        
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">Tracing Blueprint</label>
                        <input type="file" id="mapTracingUpload" class="form-control bg-white text-dark border-secondary mb-3" style="font-size: 11px; padding: 4px;" accept="image/*" onchange="MapBuilderModule.uploadTracingImage(this)">
                        
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">Trace Opacity</label>
                        <div class="d-flex align-items-center mt-1 mb-2">
                            <input type="range" class="form-range w-100" min="0" max="1" step="0.1" value="0.5" id="tracingOpacitySlider" oninput="MapBuilderModule.changeTracingOpacity(this.value)">
                        </div>
                        
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">Zone Opacity</label>
                        <div class="d-flex align-items-center mt-1 mb-2">
                            <input type="range" class="form-range w-100" min="0" max="1" step="0.1" value="0.7" id="zoneOpacitySlider" oninput="MapBuilderModule.changeZoneOpacity(this.value)">
                        </div>
                        
                        <label style="font-size: 12px; margin-bottom: 4px; color: #64748b;">2D Map Opacity</label>
                        <div class="d-flex align-items-center mt-1 mb-2">
                            <input type="range" class="form-range w-100" min="0" max="1" step="0.1" value="1" id="mapOpacitySlider" oninput="MapBuilderModule.changeMapOpacity(this.value)">
                        </div>
                        
                        <button class="btn btn-outline-warning btn-sm w-100" onclick="MapBuilderModule.clearTracing()"><i class="fas fa-eraser me-2"></i> Clear Tracing</button>
                    </div>
                </div> <!-- /row -->
                <button class="btn btn-primary btn-sm mt-3 w-100" onclick="MapBuilderModule.saveMap()"><i class="fas fa-save me-2"></i> Save Map to Server</button>
            </div>

            <div id="iiotPanzoomElement" style="position:relative; display:inline-block;">
                <img id="iiotFloorplanImg" src="../../uploads/iiot-map-bg.png" class="iiot-floorplan-img" alt="Floor plan" onerror="this.src='https://placehold.co/1200x600/0f172a/334155?text=Upload+Map+Background'">
                
                <!-- FABRIC CANVAS CONTAINER -->
                <div id="mapCanvasWrapper" class="panzoom-exclude" style="position: absolute; top:0; left:0; width: 100%; height: 100%; z-index: 1; pointer-events: none;">
                    <canvas id="iiotMapCanvas" class="panzoom-exclude"></canvas>
                </div>

                <!-- MACHINE NODES CONTAINER -->
                <div id="mapNodesContainer" style="position: absolute; top:0; left:0; width: 100%; height: 100%; z-index: 10;"></div>
            </div>
            <div id="machineTooltip" class="machine-tooltip">
                <h6 id="ttMachineName">Machine Name</h6>
                <div><span>Status:</span> <span id="ttStatus" class="val">Running</span></div>
                <div><span>OEE:</span> <span id="ttOEE" class="val">0%</span></div>
                <div><span id="ttValLabel">Cycle:</span> <span id="ttCycle" class="val">-</span></div>
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

<!-- Cropper & Panzoom -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js"></script>
<div class="modal fade" id="iiotCropModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content pe-modal">
            <div class="modal-header">
                <h5 class="modal-title">Adjust Map Image</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center bg-dark">
                <div style="max-height: 60vh; overflow: hidden;">
                    <img id="iiotCropImage" src="" style="max-width: 100%; display: block;" alt="Crop Area">
                </div>
            </div>
            <div class="modal-footer d-flex justify-content-between">
                <div>
                    <button class="btn btn-outline-secondary" onclick="IIoTModule.rotateMap(-90)"><i class="fas fa-undo"></i> Rotate Left</button>
                    <button class="btn btn-outline-secondary" onclick="IIoTModule.rotateMap(90)"><i class="fas fa-redo"></i> Rotate Right</button>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="IIoTModule.confirmMapCrop()">Apply & Upload</button>
                </div>
            </div>
        </div>
    </div>
</div>
