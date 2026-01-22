<div class="modal fade" id="dlotModal" tabindex="-1" aria-labelledby="dlotModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-light py-2 border-bottom">
                <div>
                    <h6 class="modal-title fw-bold text-dark" id="dlotModalLabel">
                        <i class="fas fa-coins text-warning me-2"></i>Financial Assessment
                    </h6>
                    <small class="text-muted" id="financialModalSubtitle">Date / Line / Item</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body p-0">
                
                <div class="bg-primary bg-opacity-10 p-3 text-center border-bottom">
                    <div class="text-uppercase text-secondary small fw-bold mb-1">Estimated Profit (GP)</div>
                    <h2 class="fw-bold text-primary mb-0" id="finActualProfit">฿0.00</h2>
                    <small class="text-muted" id="finPlanProfitCompare">Target: ฿0.00</small>
                </div>

                <div class="table-responsive">
                    <table class="table table-bordered mb-0" style="font-size: 0.9rem;">
                        <thead class="bg-light">
                            <tr class="text-center text-muted text-uppercase small">
                                <th style="width: 30%;">Metric</th>
                                <th style="width: 35%;">Plan (Target)</th>
                                <th style="width: 35%;">Actual (Result)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="fw-bold text-secondary ps-3">Quantity</td>
                                <td class="text-end pe-3 text-muted" id="finPlanQty">0</td>
                                <td class="text-end pe-3 fw-bold" id="finActualQty">0</td>
                            </tr>
                            
                            <tr>
                                <td class="fw-bold text-secondary ps-3">Sales</td>
                                <td class="text-end pe-3 text-muted" id="finPlanSales">฿0</td>
                                <td class="text-end pe-3 fw-bold text-success" id="finActualSales">฿0</td>
                            </tr>

                            <tr>
                                <td class="fw-bold text-secondary ps-3">Total Cost</td>
                                <td class="text-end pe-3 text-muted" id="finPlanCost">฿0</td>
                                <td class="text-end pe-3 fw-bold text-danger" id="finActualCost">฿0</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="p-3">
                    <div class="d-flex justify-content-between small mb-1">
                        <span class="text-muted">Revenue Achievement</span>
                        <span class="fw-bold" id="finProgressText">0%</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-success" id="finProgressBar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>

            </div>
            
            <div class="modal-footer bg-light py-1 justify-content-between">
                <div class="small text-muted fst-italic">
                    <i class="fas fa-tag me-1"></i>Price: <span id="finUnitPrice">-</span> | 
                    <i class="fas fa-layer-group me-1"></i>Cost: <span id="finUnitCost">-</span>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>