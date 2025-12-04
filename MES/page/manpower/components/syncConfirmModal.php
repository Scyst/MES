<div class="modal fade" id="syncConfirmModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-0 bg-warning bg-opacity-10">
                <h6 class="modal-title fw-bold text-dark">
                    <i class="fas fa-exclamation-triangle text-warning me-2"></i>ข้อมูลอาจไม่เป็นปัจจุบัน
                </h6>
            </div>
            <div class="modal-body p-4 text-center">
                <div class="mb-3">
                    <i class="fas fa-history fa-3x text-secondary opacity-50"></i>
                </div>
                <h5 class="fw-bold">ตรวจพบข้อมูลล่าสุดเมื่อ: <span id="modalLastUpdate" class="text-primary">-</span></h5>
                <p class="text-muted small mb-0">
                    ข้อมูลในระบบเก่ากว่า 30 นาที คุณต้องการกด "Sync" เพื่อดึงข้อมูลล่าสุดจาก Scanner หรือไม่?<br>
                    (การ Sync อาจใช้เวลา 30-60 วินาที)
                </p>
            </div>
            <div class="modal-footer border-0 justify-content-center pb-4">
                <button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">
                    <i class="fas fa-times me-2"></i>ไว้ก่อน (ดูข้อมูลเดิม)
                </button>
                <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="confirmSyncAction()">
                    <i class="fas fa-sync-alt me-2"></i>อัปเดตข้อมูลเดี๋ยวนี้
                </button>
            </div>
        </div>
    </div>
</div>