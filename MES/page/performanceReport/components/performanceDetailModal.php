<div class="modal fade" id="performanceDetailModal" tabindex="-1" aria-labelledby="performanceDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="performanceDetailModalLabel">Production Details</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Part No</th>
                                <th>Model</th>
                                <th class="text-center">Type</th>
                                <th class="text-end">Quantity</th>
                                <th class="text-end">Value</th>
                            </tr>
                        </thead>
                        <tbody id="performanceDetailTableBody">
                            <!-- Details will be loaded here by JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
