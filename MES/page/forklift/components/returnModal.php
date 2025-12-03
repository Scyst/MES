<div class="modal fade" id="returnModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="fas fa-undo me-2"></i>คืนรถ (Return)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="returnForm">
                    <input type="hidden" id="return_booking_id" name="booking_id">
                    <input type="hidden" id="return_forklift_id" name="forklift_id">
                    
                    <div class="mb-4 text-center">
                        <h5 id="return_forklift_name" class="fw-bold">Forklift Name</h5>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">ระดับแบตเตอรี่คงเหลือ (%) <span class="text-danger">*</span></label>
                        <input type="range" class="form-range" id="return_battery" name="end_battery" min="0" max="100" value="100" oninput="document.getElementById('batt_val').innerText = this.value + '%'">
                        <div class="text-center fw-bold text-primary fs-4" id="batt_val">100%</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">จุดจอดรถ (Location)</label>
                        <input type="text" class="form-control" name="location" placeholder="เช่น Zone A, แท่นชาร์จ..." required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-success fw-bold" onclick="submitReturn()">ยืนยันการคืนรถ</button>
            </div>
        </div>
    </div>
</div>