<div class="row my-3 align-items-center sticky-bar py-3">
    <div class="col-md-4">
        <div class="filter-controls-wrapper">
            <input type="text" class="form-control" id="itemMasterSearch" placeholder="Search SAP No. or Part No....">
        </div>
    </div>
    <div class="col-md-8">
        <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-outline-secondary" id="toggleInactiveBtn" title="Show/Hide Inactive Items">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-success" id="addNewItemBtn"><i class="fas fa-plus"></i> Add New Item</button>
        </div>
    </div>
</div>

<div class="table-responsive">
    <table class="table table-dark table-striped table-hover">
        <thead>
            <tr>
                <th>SAP No.</th>
                <th>Part No.</th>
                <th>Part Description</th>
                <th class="text-end">Part Value</th>
                <th class="text-end">Created At</th>
            </tr>
        </thead>
        <tbody id="itemsTableBody">
            </tbody>
    </table>
</div>
<nav>
    <ul class="pagination justify-content-center" id="itemMasterPagination"></ul>
</nav>