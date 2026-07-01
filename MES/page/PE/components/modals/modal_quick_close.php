<!-- modal_quick_close.php — Quick Close Work Order -->
<div class="modal fade pe-modal" id="quickCloseModal" tabindex="-1">
    <div class="modal-dialog modal-md modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header" style="background-color: var(--pe-success); color: white; border-bottom: none;">
                <h5 class="modal-title"><i class="fas fa-check-circle"></i> ปิดงานซ่อม (Close Job)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="qcWoId">
                
                <!-- Quick Close Form -->
                <div class="pe-form-group mb-4">
                    <label class="pe-form-label">After <span class="required">*</span></label>
                    <input type="file" id="qcFrmImageAfter" accept="image/jpeg, image/png, image/webp" style="display:none;">
                    <div class="pe-dropzone mx-auto mt-2 mb-2" id="qcDropzoneAfter" style="aspect-ratio: 4/3; width: 100%; max-width: 400px; height: auto; min-height: 120px;">
                        <div class="pe-dropzone-content">
                            <i class="fas fa-camera"></i>
                            <p>ถ่ายรูปหรือเลือกรูปภาพหลังซ่อม</p>
                            <div class="pe-dropzone-hint">บังคับใส่รูปภาพยืนยันการซ่อม</div>
                        </div>
                        <div id="qcImageAfterPreview" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; z-index:2; align-items:center; justify-content:center;">
                            <img src="" alt="Preview After" style="max-width:100%; border-radius:var(--pe-radius-sm); object-fit:contain; cursor:pointer; width:100%; height:100%; display:block;" onclick="event.stopPropagation(); window.open(this.src, '_blank')">
                        </div>
                    </div>
                </div>

                <div class="pe-form-group mb-3">
                    <label class="pe-form-label">สิ่งที่ทำ / วิธีแก้ไข (Action Taken) <span class="required">*</span></label>
                    <textarea class="pe-form-textarea" id="qcFrmAction" rows="3" placeholder="ระบุสิ่งที่ดำเนินการแก้ไข..."></textarea>
                </div>

                <div class="pe-form-group mb-0">
                    <label class="pe-form-label">สาเหตุหลัก (Root Cause) <span class="pe-text-muted pe-text-xs fw-normal">(ถ้าทราบ)</span></label>
                    <textarea class="pe-form-textarea" id="qcFrmRootCause" rows="2" placeholder="ระบุสาเหตุของปัญหา..."></textarea>
                </div>

            </div>
            <div class="modal-footer pe-d-flex pe-justify-between bg-light pe-modal-footer-mobile">
                <button type="button" class="pe-btn pe-btn-ghost" onclick="WorkOrderModule.openModal(document.getElementById('qcWoId').value)">
                    <i class="fas fa-expand-arrows-alt me-1"></i> เปิดฟอร์มเต็ม
                </button>
                <div class="pe-d-flex pe-gap-8">
                    <button type="button" class="pe-btn pe-btn-ghost" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="pe-btn pe-btn-success" id="qcSaveBtn" onclick="WorkOrderModule.submitQuickClose()">
                        <i class="fas fa-check me-1"></i> ยืนยันการปิดงาน
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
