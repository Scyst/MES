<div class="modal fade" id="uploadDocModal" tabindex="-1" aria-labelledby="uploadDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="uploadDocModalLabel">
                    <i class="fas fa-upload"></i> Upload New Document
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="uploadDocForm" enctype="multipart/form-data">

                    <input type="hidden" id="documentId" name="document_id">

                    <div class="mb-3">
                        <label for="docFile" class="form-label">Select File(s) <span class="text-danger">*</span></label>
                        <input class="form-control" type="file" id="docFile" name="doc_file[]" required multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg">
                        <div class="form-text">Supported formats: PDF, Word, Excel, JPG, PNG. Max size: 20MB per file.</div>
                    </div>

                    <div class="mb-3">
                        <label for="docDescription" class="form-label">Description</label>
                        <textarea class="form-control" id="docDescription" name="file_description" rows="3" placeholder="Enter a brief description of the file..."></textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label for="docCategory" class="form-label">Category</label>
                        <input type="text" class="form-control" id="docCategory" name="category" placeholder="e.g., Work Instruction, SOP, Quality Report">
                    </div>
                    
                </form>
                 <div class="progress" id="uploadProgressContainer" style="display: none;">
                    <div id="uploadProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" class="btn btn-primary" form="uploadDocForm" id="submitUploadBtn">
                    <i class="fas fa-check-circle"></i> Upload
                </button>
            </div>
        </div>
    </div>
</div>