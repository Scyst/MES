<div class="modal fade" id="bomImportPreviewModal" tabindex="-1" aria-labelledby="bomImportPreviewModalLabel" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="bomImportPreviewModalLabel"><i class="fas fa-file-import"></i> BOM Import Preview</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="import-summary-container" class="mb-3">
                    <p>Please review the changes below. Rows with errors will be ignored.</p>
                    <div class="d-flex justify-content-around text-center">
                        <div>
                            <h4 class="text-success mb-0" id="summary-add-count">0</h4>
                            <small class="text-muted">TO ADD</small>
                        </div>
                        <div>
                            <h4 class="text-warning mb-0" id="summary-update-count">0</h4>
                            <small class="text-muted">TO UPDATE</small>
                        </div>
                        <div>
                            <h4 class="text-info mb-0" id="summary-delete-count">0</h4>
                            <small class="text-muted">TO DELETE</small>
                        </div>
                        <div>
                            <h4 class="text-danger mb-0" id="summary-error-count">0</h4>
                            <small class="text-muted">ERRORS</small>
                        </div>
                    </div>
                </div>
                <hr>

                <ul class="nav nav-tabs" id="importPreviewTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active text-success" id="add-tab" data-bs-toggle="tab" data-bs-target="#add-pane" type="button" role="tab">
                            Add (<span id="add-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-warning" id="update-tab" data-bs-toggle="tab" data-bs-target="#update-pane" type="button" role="tab">
                            Update (<span id="update-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-info" id="delete-tab" data-bs-toggle="tab" data-bs-target="#delete-pane" type="button" role="tab">
                            Delete (<span id="delete-tab-count">0</span>)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link text-danger" id="error-tab" data-bs-toggle="tab" data-bs-target="#error-pane" type="button" role="tab">
                            Errors (<span id="error-tab-count">0</span>)
                        </button>
                    </li>
                </ul>

                <div class="tab-content" id="importPreviewTabContent">
                    <div class="tab-pane fade show active" id="add-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th><th>Quantity</th></tr>
                                </thead>
                                <tbody id="add-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="update-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th><th>Quantity</th></tr>
                                </thead>
                                <tbody id="update-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="delete-pane" role="tabpanel">
                         <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Line</th><th>Model</th><th>Component SAP</th></tr>
                                </thead>
                                <tbody id="delete-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="error-pane" role="tabpanel">
                        <div class="table-responsive mt-2">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr><th>Row</th><th>Component SAP</th><th>Reason</th></tr>
                                </thead>
                                <tbody id="error-preview-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmImportBtn" disabled>
                    <i class="fas fa-check-circle"></i> Confirm Import
                </button>
            </div>
        </div>
    </div>
</div>