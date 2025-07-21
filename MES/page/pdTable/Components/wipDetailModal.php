<div class="modal fade" id="wipDetailModal" tabindex="-1" aria-labelledby="wipDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="wipDetailModalLabel">Drill-Down Detail</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">

                    <div class="col-lg-6 d-flex flex-column">
                        <h5 class="text-success text-center">Entry History (IN)</h5>
                        <div class="table-responsive flex-grow-1" style="max-height: 60vh;">
                            <table class="table table-dark table-striped table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th style="width: 20%;">Date & Time</th>
                                        <th class="text-center px-3" style="width: 50%;">Lot No.</th>
                                        <th class="text-center px-3" style="width: 30%;">Qty</th>
                                        </tr>
                                </thead>
                                <tbody id="wipDetailInTableBody"></tbody>
                            </table>
                        </div>
                        <h5 class="text-end mt-auto pt-2">Total IN: <span id="wipDetailTotalIn" class="text-success">0</span></h5>
                    </div>

                    <div class="col-lg-6 d-flex flex-column">
                        <h5 class="text-warning text-center">Production History (OUT)</h5>
                        <div class="table-responsive flex-grow-1" style="max-height: 60vh;">
                            <table class="table table-dark table-striped table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th style="width: 20%;">Date & Time</th>
                                        <th class="text-center px-3" style="width: 50%;">Lot No.</th>
                                        <th class="text-center px-3" style="width: 15%;">Qty</th>
                                        <th class="text-center px-3" style="width: 15%;">Type</th>
                                        </tr>
                                </thead>
                                <tbody id="wipDetailOutTableBody"></tbody>
                            </table>
                        </div>
                        <h5 class="text-end mt-auto pt-2">Total OUT: <span id="wipDetailTotalOut" class="text-warning">0</span></h5>
                    </div>

                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>