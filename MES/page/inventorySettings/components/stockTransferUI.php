<div class="d-flex justify-content-between align-items-center mb-3">
    <button class="btn btn-success" id="addTransferBtn"><i class="fas fa-plus"></i> New Transfer</button>
</div>

<div class="row g-2 mb-3">
    <div class="col-md">
        <input type="text" class="form-control" id="filterPartNo" placeholder="Filter by Part No...">
    </div>
    <div class="col-md">
        <input type="text" class="form-control" id="filterFromLocation" placeholder="Filter by From Location...">
    </div>
    <div class="col-md">
        <input type="text" class="form-control" id="filterToLocation" placeholder="Filter by To Location...">
    </div>
    <div class="col-md">
        <input type="date" class="form-control" id="filterStartDate">
    </div>
    <div class="col-md">
        <input type="date" class="form-control" id="filterEndDate">
    </div>
</div>

<div class="table-responsive">
    <table class="table table-dark table-striped table-hover">
        <thead>
            <tr>
                <th>Date & Time</th>
                <th>Part No.</th>
                <th>Part Description</th>
                <th class="text-end">Quantity</th>
                <th>From Location</th>
                <th>To Location</th>
                <th>Created By</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody id="transferTableBody">
            </tbody>
    </table>
</div>
<nav>
    <ul class="pagination justify-content-center" id="paginationControls"></ul>
</nav>