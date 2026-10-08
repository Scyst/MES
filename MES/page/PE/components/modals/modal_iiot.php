<!-- IIoT Modals -->
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

<!-- Asset Selection Modal -->
<div class="modal fade" id="iiotAssetSelectModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content pe-modal">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-link text-primary me-2"></i>Link Node to Asset</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p class="text-muted small">Select an existing asset to link to this node.</p>
                <select id="iiotAssetSelect" class="form-select mb-3">
                    <option value="">-- Choose Asset --</option>
                </select>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="IIoTModule.confirmLinkAsset()">Link Asset</button>
            </div>
        </div>
    </div>
</div>

<!-- Advanced Filter Modal -->
<div class="modal fade" id="iiotFilterModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content pe-modal">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-filter text-primary me-2"></i>Advanced Filter</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label text-muted small">Global Search</label>
                    <input type="search" class="form-control" id="iiotFilterSearch" placeholder="Search name, code, model, asset no..." autocomplete="new-password">
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label text-muted small">Machine Type</label>
                        <select id="iiotFilterType" class="form-select">
                            <option value="">All Types</option>
                        </select>
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label text-muted small">Production Line</label>
                        <select id="iiotFilterLine" class="form-select">
                            <option value="">All Lines</option>
                        </select>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label text-muted small">Status</label>
                        <select id="iiotFilterStatus" class="form-select">
                            <option value="">All Statuses</option>
                            <option value="Running">Running</option>
                            <option value="Idle">Idle</option>
                            <option value="Stopped">Stopped</option>
                            <option value="Offline">Offline</option>
                            <option value="Warning">Warning</option>
                        </select>
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label text-muted small">Criticality</label>
                        <select id="iiotFilterCriticality" class="form-select">
                            <option value="">All Criticalities</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer d-flex justify-content-between">
                <button type="button" class="btn btn-outline-danger" onclick="IIoTModule.clearFilter()">Clear All</button>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="IIoTModule.applyAdvancedFilter()">Apply Filter</button>
                </div>
            </div>
        </div>
    </div>
</div>
