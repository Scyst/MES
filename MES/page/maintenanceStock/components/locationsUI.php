<div class="sticky-bar">
    <div class="row my-3 align-items-center">
        <div class="col-md-9">
            <input type="search" id="locationSearchInput" class="form-control" placeholder="Search by Location Name or Description...">
        </div>
        <div class="col-md-3">
            <div class="d-flex justify-content-end">
                <button class="btn btn-success" id="addLocationBtn"><i class="fas fa-plus"></i> Add New Location</button>
            </div>
        </div>
    </div>
</div>

<div class="table-responsive">
    <table class="table table-striped table-hover">
        <thead>
            <tr>
                <th style="width: 25%;">Location Name</th>
                <th style="width: 55%;">Description</th>
                <th style="width: 20%;" class="text-center">Status</th>
            </tr>
        </thead>    
        <tbody id="locationsTableBody"></tbody>
    </table>
</div>