<div class="row my-3 align-items-end sticky-bar py-3">
    <div class="col-md-3">
        <select class="form-select" id="locationSelect">
            <option value="">-- Please select a location --</option>
        </select>
    </div>

    <div class="col-md-3">
        <div class="position-relative">
            <input type="text" id="addItemSearch" class="form-control" placeholder="Type to search SAP No. or Part No...." autocomplete="off" disabled>
        </div>
    </div>

    <div class="col-md-6">
        <div class="d-flex justify-content-end">
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