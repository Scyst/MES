<div class="modal fade" id="varianceDetailModal" tabindex="-1" aria-labelledby="varianceDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title" id="varianceDetailModalLabel">Variance Details</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>IN Records (<span id="detailTotalIn">0</span>)</h6>
                        <div class="table-responsive" style="max-height: 40vh;">
                            <table class="table  table-sm">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Type</th>
                                        <th class="text-end">Qty</th>
                                    </tr>
                                </thead>
                                <tbody id="detailInTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>OUT Records (<span id="detailTotalOut">0</span>)</h6>
                        <div class="table-responsive" style="max-height: 40vh;">
                            <table class="table  table-sm">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Type</th>
                                        <th class="text-end">Qty</th>
                                    </tr>
                                </thead>
                                <tbody id="detailOutTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>