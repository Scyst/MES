<div class="modal fade" id="transferModal" tabindex="-1" aria-labelledby="transferModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <form id="transferForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="transferModalLabel">New Stock Transfer</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3 position-relative">
                        <label for="transfer_part_no" class="form-label">Search Item (SAP No. / Part No. / Description)</label>
                        <input type="text" class="form-control" id="transfer_part_no" name="item_search" autocomplete="off" required>
                        </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="from_location_id" class="form-label">From Location</label>
                            <select class="form-select" id="from_location_id" name="from_location_id" required></select>
                            <div class="form-text">Current Stock: <span id="fromStock" class="fw-bold">--</span></div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="to_location_id" class="form-label">To Location</label>
                            <select class="form-select" id="to_location_id" name="to_location_id" required></select>
                             <div class="form-text">Current Stock: <span id="toStock" class="fw-bold">--</span></div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="quantity" class="form-label">Quantity to Transfer</label>
                        <input type="number" class="form-control" id="quantity" name="quantity" min="1" step="1" required>
                    </div>

                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes (Optional)</label>
                        <textarea class="form-control" id="notes" name="notes" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Execute Transfer</button>
                </div>
            </form>
        </div>
    </div>
</div>