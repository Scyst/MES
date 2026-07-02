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
            <div class="modal-body p-0 position-relative" style="height: 75vh; background: #f8fafc;" id="viewer3d-body">
                <!-- 3D Viewer Container -->
                <div id="viewer3d-container" style="width: 100%; height: 100%;"></div>
                
                <!-- Dimensions Overlay -->
                <div id="viewer3d-dimensions" class="position-absolute bottom-0 start-0 m-3 p-2 bg-dark text-white rounded opacity-75 small d-none" style="pointer-events: none; z-index: 10;">
                    <i class="fas fa-ruler-combined me-1"></i> <span id="viewer3d-size-text">Size: -</span>
                </div>
            </div>
            <div class="modal-footer border-0 bg-light d-flex justify-content-between align-items-center">
                <div class="text-muted small d-none d-md-block">
                    <i class="fas fa-mouse me-1"></i> Left Click = Rotate &nbsp;|&nbsp; 
                    <i class="fas fa-arrows-alt me-1"></i> Right Click = Pan &nbsp;|&nbsp; 
                    <i class="fas fa-search-plus me-1"></i> Scroll = Zoom
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="toggle3DTheme()" id="btn-3d-theme" title="Change Background">
                        <i class="fas fa-adjust"></i> Theme
                    </button>
                    <button type="button" class="btn btn-outline-info btn-sm" onclick="toggle3DXRay()" id="btn-3d-xray" title="Toggle X-Ray/Transparent Mode">
                        <i class="fas fa-eye"></i> X-Ray
                    </button>
                    <button type="button" class="btn btn-outline-success btn-sm" onclick="toggle3DAutoRotate()" id="btn-3d-rotate" title="Toggle Auto-Rotate">
                        <i class="fas fa-play"></i> Auto-Rotate
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm px-4" data-bs-dismiss="modal" onclick="close3DViewer()">Close</button>
                </div>
            </div>
        </div>
    </div>
</div>
