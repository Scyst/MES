<div class="sticky-bar">
    <div class="container-fluid">
        <div class="row my-3 align-items-center">
            <div class="col-md-6">
                <div class="d-flex gap-3 align-items-end">
                    
                    <div class="position-relative flex-fill">
                        <input type="text" class="form-control" id="itemMasterSearch" placeholder="Search SAP No. or Part No...." autocomplete="off">
                    </div>

                    <div class="position-relative flex-fill">
                        <input type="text" id="modelFilterSearch" class="form-control" placeholder="Type to search for a Model..." autocomplete="off">
                        <input type="hidden" id="modelFilterValue">
                    </div>

                </div>
            </div>

            <div class="col-md-6">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-secondary" id="toggleInactiveBtn" title="Show/Hide Inactive Items">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-info" id="importItemsBtn" title="Import from Excel"><i class="fas fa-file-import"></i> Import</button>
                    <button class="btn btn-primary" id="exportItemsBtn" title="Export to Excel"><i class="fas fa-file-export"></i> Export</button>
                    <input type="file" id="itemImportFile" class="d-none" accept=".xlsx, .xls">
                    <button class="btn btn-success" id="addNewItemBtn"><i class="fas fa-plus"></i> Add New Item</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="table-responsive">
    <table class="table  table-striped table-hover">
        <thead>
            <tr>
                <th>SAP No.</th>
                <th>Part No.</th>
                <th>Models</th>
                <th>Description</th>                
                <th class="text-center">Planned Output</th>
                <th>Min Stock</th>
                <th>Max Stock</th>
                <th class="text-end">Created At</th>
            </tr>
        </thead>    
        <tbody id="itemsTableBody"></tbody>
    </table>
</div>
<nav class="sticky-bottom pb-1">
    <ul class="pagination justify-content-center" id="itemMasterPagination"></ul>
</nav>