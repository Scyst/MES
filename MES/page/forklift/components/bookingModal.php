<div class="modal fade" id="bookingModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title"><i class="fas fa-key me-2"></i>เบิกใช้ / จองรถโฟร์คลิฟ</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="bookingForm">
                    <input type="hidden" id="book_forklift_id" name="forklift_id">
                    
                    <div class="mb-3 text-center">
                        <h4 id="book_forklift_name" class="fw-bold text-primary">SELECT A FORKLIFT</h4>
                        <span id="book_forklift_status" class="badge bg-secondary">Status</span>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">ประเภทการจอง</label>
                        <div class="btn-group w-100" role="group">
                            <input type="radio" class="btn-check" name="booking_type" id="type_instant" value="INSTANT" checked>
                            <label class="btn btn-outline-success" for="type_instant">ใช้ตอนนี้ (Instant)</label>

                            <input type="radio" class="btn-check" name="booking_type" id="type_reserve" value="RESERVE">
                            <label class="btn btn-outline-primary" for="type_reserve">จองล่วงหน้า (Reserve)</label>
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label">เริ่มเวลา</label>
                            <input type="datetime-local" class="form-control" id="book_start_time" name="start_time" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label">คืนเวลา (โดยประมาณ)</label>
                            <input type="datetime-local" class="form-control" id="book_end_time" name="end_time_est" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">ใช้งานเพื่อ / หมายเหตุ</label>
                        <input type="text" class="form-control" name="usage_details" placeholder="เช่น ยกของ Line 1, ขนถ่ายสินค้า..." required>
                    </div>

                    <div class="alert alert-warning small mb-0">
                        <i class="fas fa-exclamation-triangle me-1"></i> กรุณาตรวจสอบ น้ำมัน/แบตเตอรี่ เบรก และแตร ก่อนใช้งานทุกครั้ง
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary fw-bold" onclick="submitBooking()">ยืนยันการจอง</button>
            </div>
        </div>
    </div>
</div>