<div class="modal fade" id="uploadDocModal" tabindex="-1" aria-labelledby="uploadDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg"> 
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="uploadDocModalLabel"><i class="fas fa-upload"></i> Upload Documents</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="uploadDocForm" enctype="multipart/form-data">
                    
                    <input class="d-none" type="file" id="docFile" name="doc_file" multiple>
                    <input class="d-none" type="file" id="docFolder" webkitdirectory directory>
                    
                    <div id="drop-zone" class="drop-zone-area">
                        <div class="drop-zone-text">
                            <i class="fas fa-cloud-upload-alt fa-3x"></i>
                            <p>Drag & drop files here</p>
                            <p class="drop-zone-or">or</p>
                            <div>
                                <button type="button" class="btn btn-primary btn-sm me-2" id="select-files-btn">
                                    <i class="fas fa-file-medical"></i> Select Files
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm" id="select-folder-btn">
                                    <i class="fas fa-folder-plus"></i> Select Folder
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3" id="file-preview-container" style="display: none;">
                        <h6>Selected Files:</h6>
                        <div class="file-preview-list" id="file-preview-list">
                        </div>
                    </div>
                    <div class="mb-3 mt-3">
                        <label for="docDescription" class="form-label">Description (optional)</label>
                        <textarea class="form-control" id="docDescription" name="file_description" rows="2" placeholder="Description will be applied to all uploaded files..."></textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label for="docCategory" class="form-label">Category (optional)</label>
                        <input type="text" class="form-control" id="docCategory" name="category" placeholder="e.g., Work Instruction, SOP, Quality Report">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn btn-primary" form="uploadDocForm" id="submitUploadBtn">
                    <i class="fas fa-check-circle"></i> Upload
                </button>
            </div>
        </div>
    </div>
</div>