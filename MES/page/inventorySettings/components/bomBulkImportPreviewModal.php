<div class="modal fade" id="bomBulkImportPreviewModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-file-import"></i> Bulk BOM Import Preview</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Please review the summary of changes from the imported file. Skipped sheets will be ignored.</p>
                <div class="d-flex justify-content-around text-center border rounded p-3 mb-3">
                    <div>
                        <h4 class="text-success mb-0" id="bulk-summary-create-count">0</h4>
                        <small class="text-muted">NEW BOMs TO CREATE</small>
                    </div>
                    <div>
                        <h4 class="text-warning mb-0" id="bulk-summary-overwrite-count">0</h4>
                        <small class="text-muted">BOMs TO OVERWRITE</small>
                    </div>
                    <div>
                        <h4 class="text-danger mb-0" id="bulk-summary-skipped-count">0</h4>
                        <small class="text-muted">SKIPPED SHEETS (Errors)</small>
                    </div>
                </div>

                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-success" data-bs-toggle="tab" data-bs-target="#create-pane" type="button" role="tab">Create (<span id="create-tab-count">0</span>)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" data-bs-toggle="tab" data-bs-target="#overwrite-pane" type="button" role="tab">Overwrite (<span id="overwrite-tab-count">0</span>)</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-danger" data-bs-toggle="tab" data-bs-target="#skipped-pane" type="button" role="tab">Skipped (<span id="skipped-tab-count">0</span>)</button>
                    </li>
                </ul>

                <div class="tab-content pt-2">
                    <div class="tab-pane fade show active" id="create-pane" role="tabpanel">
                        <ul id="create-preview-list" class="list-group"></ul>
                    </div>
                    <div class="tab-pane fade" id="overwrite-pane" role="tabpanel">
                        <ul id="overwrite-preview-list" class="list-group"></ul>
                    </div>
                    <div class="tab-pane fade" id="skipped-pane" role="tabpanel">
                        <div id="skipped-preview-accordion" class="accordion"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="confirmBulkImportBtn" disabled>
                    <i class="fas fa-check-circle"></i> Confirm and Process Import
                </button>
            </div>
        </div>
    </div>
</div>