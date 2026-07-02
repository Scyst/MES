<!-- e:\MES\MES\MES\page\documentCenter\components\view3DModal.php -->
<div class="modal fade" id="view3DModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0">
                <h5 class="modal-title d-flex align-items-center">
                    <i class="fas fa-cube text-info me-2"></i>
                    <span id="view3DModalTitle" class="fw-bold">3D Viewer</span>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onclick="close3DViewer()"></button>
            </div>
            <div class="modal-body p-0 position-relative overflow-hidden" style="height: 85vh; background: #f8fafc;" id="viewer3d-body">
                <!-- 3D Viewer Container -->
                <div id="viewer3d-container" style="width: 100%; height: 100%;"></div>
                
                <!-- Dimensions Overlay (Bottom Right, Below Axis) -->
                <div id="viewer3d-dimensions" class="position-absolute p-2 bg-dark text-white rounded shadow-sm opacity-75 small d-none" style="bottom: 25px; right: 25px; pointer-events: none; z-index: 10;">
                    <i class="fas fa-ruler-combined me-1"></i> <span id="viewer3d-size-text">Size: -</span>
                </div>

                <!-- Mouse Tips Overlay (Bottom Left) -->
                <div class="position-absolute bottom-0 start-0 m-3 text-muted small opacity-50" style="pointer-events: none; z-index: 10;">
                    <div class="d-none d-md-block" style="text-shadow: 1px 1px 0 rgba(255,255,255,0.7), -1px -1px 0 rgba(255,255,255,0.7), 1px -1px 0 rgba(255,255,255,0.7), -1px 1px 0 rgba(255,255,255,0.7);">
                        <i class="fas fa-mouse me-1"></i> Left Click = Rotate<br>
                        <i class="fas fa-arrows-alt me-1"></i> Right Click = Pan<br>
                        <i class="fas fa-search-plus me-1"></i> Scroll = Zoom
                    </div>
                </div>
                
                <!-- Floating Toolbar (Top Right) -->
                <div class="position-absolute top-0 end-0 m-3 z-index-10">
                    <div class="d-flex gap-2 p-2 bg-white rounded-pill shadow-lg border" style="background: rgba(255, 255, 255, 0.85) !important; backdrop-filter: blur(5px);">
                        <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="toggle3DTheme()" id="btn-3d-theme" title="Change Background">
                            <i class="fas fa-adjust me-1"></i> Theme
                        </button>
                        <button type="button" class="btn btn-outline-info btn-sm rounded-pill px-3" onclick="toggle3DXRay()" id="btn-3d-xray" title="Toggle X-Ray/Transparent Mode">
                            <i class="fas fa-eye me-1"></i> X-Ray
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3" onclick="toggle3DAutoRotate()" id="btn-3d-rotate" title="Toggle Auto-Rotate">
                            <i class="fas fa-play me-1"></i> Auto-Rotate
                        </button>
                    </div>
                </div>

                <!-- 3D Axis Helper (Bottom Right, Above Dimensions) -->
                <div id="viewer3d-axis-helper" style="position: absolute; bottom: 85px; right: 35px; width: 60px; height: 60px; pointer-events: none; z-index: 10; perspective: 300px; display: none; transform: scale(1.4); transform-origin: bottom right;">
                    <div id="axis-cube" style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transform-origin: center center;">
                        <!-- Center Dot -->
                        <div style="position: absolute; top: 27px; left: 27px; width: 6px; height: 6px; background: #333; border-radius: 50%; z-index: 20;"></div>
                        <!-- X Axis (Red) -->
                        <div style="position: absolute; top: 29px; left: 30px; width: 30px; height: 2px; background: red; transform-origin: 0 50%;"></div>
                        <div style="position: absolute; top: 20px; left: 63px; color: red; font-size: 11px; font-weight: bold; font-family: sans-serif; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; transform: translateZ(2px);">X</div>
                        <!-- Y Axis (Green) -->
                        <div style="position: absolute; top: 0px; left: 29px; width: 2px; height: 30px; background: green; transform-origin: 50% 100%;"></div>
                        <div style="position: absolute; top: -14px; left: 26px; color: green; font-size: 11px; font-weight: bold; font-family: sans-serif; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; transform: translateZ(2px);">Y</div>
                        <!-- Z Axis (Blue) -->
                        <div style="position: absolute; top: 29px; left: 30px; width: 30px; height: 2px; background: #0d6efd; transform-origin: 0 50%; transform: rotateY(-90deg);"></div>
                        <div style="position: absolute; top: 20px; left: 16px; color: #0d6efd; font-size: 11px; font-weight: bold; font-family: sans-serif; transform: translateZ(35px); text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;">Z</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
