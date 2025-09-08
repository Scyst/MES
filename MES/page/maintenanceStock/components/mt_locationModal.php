<div class="modal fade" id="mt_locationModal" tabindex="-1" aria-labelledby="mt_locationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form id="mt_locationForm" autocomplete="off">
                <div class="modal-header">
                    <h5 class="modal-title" id="mt_locationModalLabel">Add New Location</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="mt_location_id" name="location_id" value="0">
                    <div class="mb-3">
                        <label for="mt_location_name" class="form-label">Location Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="mt_location_name" name="location_name" required>
                    </div>
                    <div class="mb-3">
                        <label for="mt_location_description" class="form-label">Description</label>
                        <textarea class="form-control" id="mt_location_description" name="description" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Save Location</button>
                </div>
            </form>
        </div>
    </div>
</div>