<!-- modal_wo_filters.php -->
<div class="modal fade" id="woFilterModal" tabindex="-1" aria-labelledby="woFilterModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="woFilterModalLabel"><i class="fas fa-filter text-primary"></i> กรองข้อมูล Work Order</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">สถานะ (Status)</label>
                    <select class="form-select" id="woFilterStatus">
                        <option value="Active" selected>Active (Open + In Progress)</option>
                        <option value="">All Status</option>
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Deleted">Deleted (ถังขยะ)</option>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ความสำคัญ (Priority)</label>
                    <select class="form-select" id="woFilterPriority">
                        <option value="">ทุก Priority</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ไลน์การผลิต (Line)</label>
                    <?php
                    require_once __DIR__ . '/../../../db.php';
                    $lineStmt = $pdo->query("SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1 AND line IS NOT NULL AND line != '' ORDER BY line ASC");
                    $lines = $lineStmt->fetchAll(PDO::FETCH_COLUMN);
                    ?>
                    <select class="form-select" id="woFilterLine">
                        <option value="">ทุก Line</option>
                        <?php foreach($lines as $l): ?>
                            <option value="<?= htmlspecialchars($l) ?>"><?= htmlspecialchars($l) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">กรองด้วยวันที่</label>
                    <select class="form-select mb-2" id="woDateFilterType">
                        <option value="requested_at">วันที่แจ้งซ่อม (Requested Date)</option>
                        <option value="assigned_at">วันที่รับงาน (Assigned Date)</option>
                        <option value="completed_at">วันที่ซ่อมเสร็จ (Completed Date)</option>
                        <option value="updated_at">อัพเดทล่าสุด (Updated Date)</option>
                    </select>
                    <div class="d-flex align-items-center">
                        <input type="date" class="form-control" id="woStartDate">
                        <span class="mx-2">—</span>
                        <input type="date" class="form-control" id="woEndDate">
                    </div>
                </div>
            </div>
            <div class="modal-footer d-flex justify-content-between">
                <button type="button" class="btn btn-outline-secondary" onclick="WorkOrderModule.resetFilters()">รีเซ็ตค่าเริ่มต้น</button>
                <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal" onclick="WorkOrderModule.loadData()">ใช้งานตัวกรอง</button>
            </div>
        </div>
    </div>
</div>
