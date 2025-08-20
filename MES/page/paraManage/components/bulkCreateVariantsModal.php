<div class="modal fade" id="bulkCreateVariantsModal" tabindex="-1" aria-labelledby="bulkCreateVariantsModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content ">
            <form id="bulkCreateVariantsForm">
                <div class="modal-header">
                    <h5 class="modal-title" id="bulkCreateVariantsModalLabel">Bulk Create Variants</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Create multiple variants for all <strong id="selectedItemCount"></strong> selected parameters.</p>
                    
                    <div class="mb-3">
                        <label for="bulk_variants" class="form-label">Variant Suffixes (comma-separated)</label>
                        <textarea class="form-control" id="bulk_variants" name="variants" rows="3" placeholder="e.g., RED, BLU, GRN, YEL" required></textarea>
                        <div class="form-text">Enter suffixes to be appended to each selected Part Number.</div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-success">Create All Variants</button>
                </div>
            </form>
        </div>
    </div>
</div>