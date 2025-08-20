<div class="modal fade" id="createVariantsModal" tabindex="-1" aria-labelledby="createVariantsModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content ">
            <form id="createVariantsForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="createVariantsModalLabel">Create Variants</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Create multiple variants from a source parameter. The new variants will copy data from the source and have a BOM automatically created linking back to it.</p>
                    
                    <div class="mb-3">
                        <label class="form-label">Source Parameter</label>
                        <input type="text" id="sourceParamDisplay" class="form-control" readonly />
                        <input type="hidden" id="source_param_id" name="source_param_id" />
                    </div>

                    <div class="mb-3">
                        <label for="variants" class="form-label">Variant Suffixes (comma-separated)</label>
                        <textarea class="form-control" id="variants" name="variants" rows="3" placeholder="e.g., RED, BLU, GRN, YEL" required></textarea>
                        <div class="form-text">Enter the suffixes for the new Part Numbers. For example, if the source is 'PART-100' and you enter 'RED', it will create 'PART-100-RED'.</div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-success">Create Variants</button>
                </div>
            </form>
        </div>
    </div>
</div>