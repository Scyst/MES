<div class="modal fade" id="renameDocModal" tabindex="-1" aria-labelledby="renameDocModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
            <div class="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h5 class="modal-title fw-bold" id="renameDocModalLabel" style="color: var(--text-primary); font-size: 1.25rem;">
                    <i class="fas fa-pencil-alt text-primary me-2"></i><span id="renameModalTitle">เปลี่ยนชื่อ (Rename)</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="renameDocForm">
                <div class="modal-body px-4 py-4">
                    <input type="hidden" id="renameItemId" name="id">
                    <input type="hidden" id="renameItemType" name="item_type">
                    <input type="hidden" id="renameOldName" name="old_name">
                    <input type="hidden" id="renameCategory" name="category">
                    <input type="hidden" id="renameExtension" name="extension">
                    
                    <div class="bg-light rounded-3 p-3 mb-4 border" style="border-color: #CBD5E1;">
                        <span class="text-secondary small fw-semibold text-uppercase letter-spacing-1" id="renameCurrentLabel">ชื่อปัจจุบัน:</span>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <span id="renameCurrentIcon" style="font-size: 1.3rem;">📄</span>
                            <h6 class="fw-bold mb-0 text-dark" id="renameCurrentName" style="word-break: break-all;">FileName.pdf</h6>
                        </div>
                    </div>

                    <div class="mb-2">
                        <label for="renameNewName" class="form-label fw-semibold text-dark" style="font-size: 0.9rem;">ชื่อใหม่ <span class="text-danger">*</span></label>
                        <div class="input-group shadow-sm" style="border-radius: 8px;">
                            <input type="text" class="form-control" id="renameNewName" name="new_name" required autocomplete="off" style="border-radius: 8px 0 0 8px; border-color: #CBD5E1;">
                            <span class="input-group-text bg-light text-secondary fw-semibold d-none" id="renameExtAddon" style="border-radius: 0 8px 8px 0; border-color: #CBD5E1; border-left: 0;">.pdf</span>
                        </div>
                        <div class="form-text text-secondary mt-2">
                            <i class="fas fa-info-circle text-primary me-1"></i><span id="renameHelpText">ระบบจะคงนามสกุลไฟล์เดิมให้อัตโนมัติ</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 px-4 pb-4 pt-0 bg-white">
                    <button type="button" class="btn btn-light border px-4 py-2 shadow-sm" data-bs-dismiss="modal" style="border-radius: 8px;">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4 py-2 shadow-sm" id="renameDocSubmitBtn" style="border-radius: 8px; background-color: var(--primary-color); border: none;">
                        <i class="fas fa-check me-1"></i> บันทึกชื่อใหม่
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
