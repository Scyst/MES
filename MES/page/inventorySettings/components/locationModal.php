<div class="modal fade" id="locationModal" tabindex="-1" aria-labelledby="locationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="locationModalLabel">จัดการสถานที่</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="locationForm">
                <div class="modal-body">
                    <input type="hidden" id="location_id" name="location_id" value="0">
                    
                    <div class="mb-3">
                        <label for="location_name" class="form-label">ชื่อสถานที่</label>
                        <input type="text" class="form-control" id="location_name" name="location_name" required>
                    </div>

                    <div class="mb-3">
                        <label for="location_production_line" class="form-label">ไลน์ผลิต (Production Line)</label>
                        <select class="form-select" id="location_production_line" name="production_line">
                            <option value="">-- ไม่ใช่พื้นที่การผลิต --</option>
                            </select>
                        <div class="form-text">
                            เลือกไลน์ผลิตที่สถานที่นี้สังกัดอยู่ (หากเป็นพื้นที่การผลิต)
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="location_description" class="form-label">คำอธิบาย</label>
                        <textarea class="form-control" id="location_description" name="location_description" rows="2"></textarea>
                    </div>

                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="location_is_active" name="is_active" checked>
                        <label class="form-check-label" for="location_is_active">
                            เปิดใช้งาน
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>