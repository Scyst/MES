<div class="modal fade" id="copyBomModal" tabindex="-1" aria-labelledby="copyBomModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content bg-dark text-white">
            <form id="copyBomForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="copyBomModalLabel">Copy Bill of Materials</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>This will overwrite any existing BOM for the target part.</p>
                    
                    <div class="mb-3">
                        <label class="form-label">Source BOM</label>
                        <input type="text" id="copySourceBomDisplay" class="form-control" readonly />
                        <input type="hidden" name="source_fg_part_no" id="copy_source_fg_part_no">
                        <input type="hidden" name="source_line" id="copy_source_line">
                        <input type="hidden" name="source_model" id="copy_source_model">
                    </div>

                    <div class="mb-3">
                        <label for="target_fg_part_no" class="form-label">Target Finished Good Part No.</label>
                        <input list="bomModalPartDatalist" class="form-control" id="target_fg_part_no" name="target_fg_part_no" required>
                        <div class="form-text">Select the Part No. (from the same Line/Model) to copy the components to.</div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-primary">Copy BOM</button>
                </div>
            </form>
        </div>
    </div>
</div>