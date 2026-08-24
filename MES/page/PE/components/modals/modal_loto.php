<!-- MES/page/PE/components/modals/modal_loto.php -->
<div class="modal fade pe-modal" id="lotoModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0 pe-bg-white">
                <h5 class="modal-title fw-bold" id="lotoModalTitle"><i class="fas fa-lock text-danger me-2"></i> ระบบ E-LOTO</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3 pb-4">
                <input type="hidden" id="lotoFrmMachineId">
                <input type="hidden" id="lotoFrmWoId">

                <!-- Lock UI -->
                <div id="lotoLockSection" style="display: none;">
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i> <strong>คำเตือน:</strong> เครื่องจักรกำลังจะถูกระงับการจ่ายไฟและการทำงานทั้งหมด โปรดตรวจสอบให้แน่ใจก่อนทำการล็อก
                    </div>
                    <div class="pe-form-group mb-3">
                        <label class="pe-form-label">ผู้ทำการล็อก (Technician) <span class="text-danger">*</span></label>
                        <input type="text" class="pe-form-input" id="lotoFrmLockedBy" placeholder="ระบุชื่อผู้ซ่อม" value="<?= htmlspecialchars($_SESSION['user']['username'] ?? '') ?>">
                    </div>
                    <div class="pe-form-group mb-3">
                        <label class="pe-form-label">เหตุผล / อาการเสีย</label>
                        <textarea class="pe-form-textarea" id="lotoFrmReason" placeholder="ระบุเหตุผลในการล็อกเครื่องจักร..."></textarea>
                    </div>
                    <button type="button" class="btn btn-danger w-100 fw-bold" onclick="LotoModule.applyLoto()">
                        <i class="fas fa-lock me-2"></i> ยืนยันการล็อก (APPLY LOTO)
                    </button>
                </div>

                <!-- Unlock UI -->
                <div id="lotoUnlockSection" style="display: none;">
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-info-circle me-2"></i> เครื่องจักรนี้อยู่ในสถานะ <strong>LOCKED</strong>
                        <div class="mt-2 text-dark" style="font-size: 0.85rem;">
                            <div><strong>ล็อกโดย:</strong> <span id="lotoLblLockedBy"></span></div>
                            <div><strong>เวลาล็อก:</strong> <span id="lotoLblLockedAt"></span></div>
                            <div><strong>เหตุผล:</strong> <span id="lotoLblReason"></span></div>
                        </div>
                    </div>
                    <div class="pe-form-group mb-3">
                        <label class="pe-form-label">ผู้ยืนยันการปลดล็อก (Supervisor) <span class="text-danger">*</span></label>
                        <input type="text" class="pe-form-input" id="lotoFrmUnlockedBy" placeholder="ระบุชื่อหัวหน้างานผู้ตรวจสอบ" value="<?= htmlspecialchars($_SESSION['user']['username'] ?? '') ?>">
                    </div>
                    <div class="pe-form-group mb-4">
                        <label class="pe-form-label">รหัสผ่านยืนยัน (PIN / Password) <span class="text-danger">*</span></label>
                        <input type="password" class="pe-form-input" id="lotoFrmUnlockedPin" placeholder="รหัสผ่านของระบบเพื่อยืนยันสิทธิ์">
                    </div>
                    <button type="button" class="btn btn-success w-100 fw-bold" onclick="LotoModule.removeLoto()">
                        <i class="fas fa-unlock me-2"></i> ยืนยันปลดล็อกและคืนสภาพ (REMOVE LOTO)
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
