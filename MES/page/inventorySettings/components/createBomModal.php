<div class="modal fade" id="createBomModal" tabindex="-1" aria-labelledby="createBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title" id="createBomModalLabel">Create New BOM - Step 1: Select Finished Good</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="createBomForm">
                    <div class="mb-3 position-relative">
                        <label for="fg_item_search" class="form-label">Search Item from Master (SAP No. / Part No.)</label>
                        <input type="text" class="form-control" id="fg_item_search" name="item_search" placeholder="Start typing to search for a Finished Good..." autocomplete="off" required>
                        <input type="hidden" id="selected_fg_item_id" name="fg_item_id">
                    </div>
                    
                    <div id="selected_fg_details" class="d-none">
                        <hr>
                        <h6 class="text-info">Step 2: Select Production Parameter</h6>
                        
                        <div id="parameter_selection_area">
                            <p class="text-muted">Select the specific Line/Model for this BOM.</p>
                            <select class="form-select" id="parameter_select" name="parameter_id" required>
                                <option value="">-- Loading parameters... --</option>
                            </select>
                        </div>
                        </div>

                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="createBomForm" class="btn btn-primary" id="createBomNextBtn" disabled>Manage BOM</button>
            </div>
        </div>
    </div>
</div>