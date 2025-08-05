<div class="row mb-3">
    <div class="col-md-4">
        <label for="locationSelect" class="form-label">Select Location to Adjust:</label>
        <select id="locationSelect" class="form-select"></select>
    </div>
    <div class="col-md-5">
            <label for="itemSearch" class="form-label">Search Item (SAP No. / Part No. / Description):</label>
        <input type="text" id="itemSearch" class="form-control" placeholder="Search to filter list..." disabled>
    </div>
        <div class="col-md-3 align-self-end">
        <button class="btn btn-primary w-100" id="saveStockBtn" disabled><i class="fas fa-save"></i> Save All Changes</button>
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