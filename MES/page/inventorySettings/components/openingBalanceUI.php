<div class="row my-3 align-items-center sticky-bar py-3">
    <div class="col-md-8">
        <div class="filter-controls-wrapper">
            <div class="input-group">
                <label for="locationSelect" class="input-group-text">Location:</label>
                <select id="locationSelect" class="form-select"></select>
            </div>
            <input type="text" id="itemSearch" class="form-control" placeholder="Search Item to filter list..." disabled>
        </div>
    </div>
    <div class="col-md-4">
        <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-primary" id="saveStockBtn" disabled><i class="fas fa-save"></i> Save All Changes</button>
        </div>
    </div>
</div>

<div class="table-responsive" style="max-height: 65vh;">
    <table class="table table-dark table-striped table-hover table-sm">
        <thead class="sticky-top">
            <tr>
                <th style="width: 15%;">SAP No.</th>
                <th style="width: 15%;">Part No.</th>
                <th>Part Description</th>
                <th style="width: 15%;" class="text-center">Current On-Hand</th>
                <th style="width: 15%;" class="text-center">New Physical Count</th>
            </tr>
        </thead>
        <tbody id="stockTakeTableBody">
           <tr><td colspan="5" class="text-center">Please select a location to begin.</td></tr>
        </tbody>
    </table>
</div>