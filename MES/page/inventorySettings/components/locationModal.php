<div class="modal fade" id="locationModal" tabindex="-1" aria-labelledby="locationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <form id="locationForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="locationModalLabel">Add New Location</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="location_id" name="location_id" value="0">
                    
                    <div class="mb-3">
                        <label for="location_name" class="form-label">Location Name</label>
                        <input type="text" class="form-control" id="location_name" name="location_name" required>
                        <div class="form-text">e.g., WAREHOUSE-RAW-MAT, LINE-PRESS, WIP-PAINT</div>
                    </div>

                    <div class="mb-3">
                        <label for="location_description" class="form-label">Description</label>
                        <textarea class="form-control" id="location_description" name="location_description" rows="3"></textarea>
                    </div>

                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" role="switch" id="is_active" name="is_active" checked>
                        <label class="form-check-label" for="is_active">Is Active</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger me-auto d-none" id="deleteLocationBtn">Delete</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>
</div>