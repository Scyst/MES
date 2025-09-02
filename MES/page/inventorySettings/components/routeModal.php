<div class="modal fade" id="routeModal" tabindex="-1" aria-labelledby="routeModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="routeModalLabel">Add New Route</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="routeForm">
                    <input type="hidden" id="route_id" name="route_id" value="0">
                    <input type="hidden" id="route_item_id" name="route_item_id" value="">

                    <div class="mb-3">
                        <label for="route_line" class="form-label">Production Line</label>
                        <input type="text" class="form-control" id="route_line" name="route_line" required>
                    </div>
                    <div class="mb-3">
                        <label for="route_model" class="form-label">Model</label>
                        <input type="text" class="form-control" id="route_model" name="route_model" required>
                    </div>
                    <div class="mb-3">
                        <label for="route_planned_output" class="form-label">Planned Output (UPH)</label>
                        <input type="number" class="form-control" id="route_planned_output" name="route_planned_output" min="0" required>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>