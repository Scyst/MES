<div class="modal fade" id="completeMaintenanceModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered"> <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="fas fa-check-circle me-2"></i>Complete Job (ปิดงานซ่อม)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="completeMaintenanceForm" enctype="multipart/form-data">
                    <input type="hidden" name="id" id="complete_req_id">
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">วันที่/เวลา เริ่มซ่อม</label>
                            <input type="datetime-local" name="started_at" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">วันที่/เวลา เสร็จสิ้น</label>
                            <input type="datetime-local" name="resolved_at" class="form-control" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Work Detail (รายละเอียดการซ่อม)</label>
                        <textarea name="technician_note" class="form-control" rows="3" placeholder="อธิบายสิ่งที่ทำไป..." required></textarea>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">Spare Parts (รายการอะไหล่ที่ใช้)</label>
                        <textarea name="spare_parts_list" class="form-control" rows="2" placeholder="- สายไฟ 2 เมตร&#10;- เบรคเกอร์ 1 ตัว"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <label class="form-label fw-bold text-success">
                                <i class="fas fa-camera me-1"></i>หลังซ่อม (After)
                            </label>
                            <input type="file" name="photo_after" class="form-control" accept="image/*" required>
                            <div class="form-text">ถ่ายให้เห็นผลลัพธ์การซ่อม</div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="completeMaintenanceForm" class="btn btn-success">
                    <i class="fas fa-save me-1"></i> Save & Close Job
                </button>
            </div>
        </div>
    </div>
</div>