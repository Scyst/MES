<div class="modal fade" id="uploadDocModal" tabindex="-1" aria-labelledby="uploadDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg"> 
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold d-flex align-items-center" id="uploadDocModalLabel" style="color: var(--text-primary); font-size: 1.25rem;">
                    <i class="fas fa-cloud-upload-alt text-primary me-2"></i>Upload Documents
                    <i class="fas fa-info-circle text-muted ms-2" style="font-size: 0.9rem; cursor: help;" title="Supported files: PDF, Word (doc, docx), Excel (xls, xlsx), Images (png, jpg, gif), Archives (zip, rar, 7z), Text (txt), and 3D CAD (step, stp, igs, iges, stl, obj, gltf, glb)."></i>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body px-4 py-4">
                <form id="uploadDocForm" enctype="multipart/form-data">
                    
                    <input class="d-none" type="file" id="docFile" name="doc_file" multiple>
                    <input class="d-none" type="file" id="docFolder" webkitdirectory directory>
                    
                    <div id="drop-zone" class="drop-zone-area bg-light" style="border: 2px dashed #CBD5E1; border-radius: 12px;">
                        <div class="drop-zone-text text-secondary py-4">
                            <div class="mb-3">
                                <div class="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm" style="width: 80px; height: 80px;">
                                    <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
                                </div>
                            </div>
                            <h6 class="fw-bold text-dark mb-1">Drag & drop files here</h6>
                            <p class="small mb-3">or</p>
                            <div class="d-flex justify-content-center gap-2">
                                <button type="button" class="btn btn-outline-primary btn-sm shadow-sm" id="select-files-btn" style="border-radius: 8px;">
                                    <i class="fas fa-file-medical"></i> Select Files
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm shadow-sm" id="select-folder-btn" style="border-radius: 8px;">
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
                    <div class="mb-4 mt-4">
                        <label for="docDescription" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Description (optional)</label>
                        <textarea class="form-control bg-white shadow-sm" id="docDescription" name="file_description" rows="2" placeholder="Description will be applied to all uploaded files..." style="border-radius: 8px; border-color: #CBD5E1;"></textarea>
                    </div>
                    
                    <div class="mb-2">
                        <label for="docCategory" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">Category Path (optional)</label>
                        <div class="input-group shadow-sm" style="border-radius: 8px;">
                            <span class="input-group-text bg-light text-secondary border-end-0" style="border-color: #CBD5E1;"><i class="fas fa-folder-open"></i></span>
                            <input type="text" class="form-control border-start-0 ps-0" id="docCategory" name="category" placeholder="e.g., Drawing/MachineA" style="border-color: #CBD5E1;">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Cancel</button>
                <button type="submit" class="btn btn-primary px-4 py-2 shadow-sm" form="uploadDocForm" id="submitUploadBtn" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                    <i class="fas fa-upload me-1"></i> Upload
                </button>
            </div>
        </div>
    </div>
</div>