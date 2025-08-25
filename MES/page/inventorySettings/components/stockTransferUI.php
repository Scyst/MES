<div class="sticky-bar">
    <div class="container-fluid">
        <div class="row my-3 align-items-center">
            <div class="col-md-8">
                <div class="filter-controls-wrapper">
                    <input type="text" class="form-control" id="filterPartNo" placeholder="Filter by Part No...">
                    <input type="text" class="form-control" id="filterFromLocation" placeholder="Filter by From Location...">
                    <input type="text" class="form-control" id="filterToLocation" placeholder="Filter by To Location...">
                    <input type="date" class="form-control" id="filterStartDate">
                    <span>-</span>
                    <input type="date" class="form-control" id="filterEndDate">
                </div>
            </div>
            <div class="col-md-4">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-success" id="addTransferBtn"><i class="fas fa-plus"></i> New Transfer</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="table-responsive">
    <table class="table  table-striped table-hover">
        <thead>
            <tr>
                <tr>
                    <th>Timestamp</th>
                    <th>Part No.</th>
                    <th>Description</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-center">Transfer</th>
                    <th>User</th>
                    <th>Notes</th>
                </tr>
            </tr>
        </thead>
        <tbody id="transferTableBody">
            </tbody>
    </table>
</div>
<nav class="sticky-bottom pb-1">
    <ul class="pagination justify-content-center" id="paginationControls"></ul>
</nav>