<div class="modal" id="summaryModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 80%;">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Detailed Summary</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div id="summaryGrandTotalContainer" class="summary-grand-total">
                        </div>
                    <button id="summaryModalExportButton" class="btn btn-primary btn-sm" onclick="exportSummaryToExcel()">Export Summary</button>
                </div>

                <div id="summaryTableContainer">
                    </div>
            </div>
        </div>
    </div>
</div>