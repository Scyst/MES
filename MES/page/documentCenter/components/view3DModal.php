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
            <div class="modal-body p-0 position-relative" style="height: 75vh; background: #f8fafc;">
                <!-- 3D Viewer Container -->
                <div id="viewer3d-container" style="width: 100%; height: 100%;"></div>
                
                <!-- Loading Overlay -->
                <div id="viewer3d-loading" class="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center" style="background: rgba(255,255,255,0.8); z-index: 10;">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-3 fw-bold text-secondary">Loading 3D Model...</div>
                </div>
            </div>
            <div class="modal-footer border-0 bg-light d-flex justify-content-between align-items-center">
                <div class="text-muted small">
                    <i class="fas fa-mouse me-1"></i> Left Click = Rotate &nbsp;|&nbsp; 
                    <i class="fas fa-arrows-alt me-1"></i> Right Click = Pan &nbsp;|&nbsp; 
                    <i class="fas fa-search-plus me-1"></i> Scroll = Zoom
                </div>
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal" onclick="close3DViewer()">Close</button>
            </div>
        </div>
    </div>
</div>
