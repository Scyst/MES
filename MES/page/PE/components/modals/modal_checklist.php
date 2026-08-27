<!-- modal_checklist.php — Checklist Template Manager Modal -->
<div class="modal fade" id="checklistModal" tabindex="-1" aria-labelledby="checklistModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="checklistModalLabel">
                    <i class="fas fa-clipboard-list me-2 text-primary"></i>จัดการแบบฟอร์มตรวจสอบ (Checklist Manager)
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <!-- Machine Type Selector -->
                <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded" style="background: var(--pe-bg-hover);">
                    <label class="fw-bold text-nowrap mb-0" style="font-size:13px;">ประเภทเครื่องจักร:</label>
                    <select id="configMachineType" class="form-select form-select-sm" style="max-width:250px;" onchange="SafetyModule.loadChecklistConfig()">
                        <option value="">-- Default Checklist (All Machines) --</option>
                    </select>
                    <button class="pe-btn pe-btn-primary pe-btn-sm ms-auto text-nowrap" onclick="SafetyModule.addChecklistRow()">
                        <i class="fas fa-plus"></i> เพิ่มรายการ
                    </button>
                </div>

                <!-- Checklist Table -->
                <div class="table-responsive">
                    <table class="pe-table mb-0">
                        <thead style="position: sticky; top: 0; z-index: 1; background: var(--pe-bg-table-header);">
                            <tr>
                                <th style="width:60px;" class="text-center">ลำดับ</th>
                                <th>รายการตรวจสอบ</th>
                                <th style="width:80px;" class="text-center">Critical</th>
                                <th style="width:60px;" class="text-center">ลบ</th>
                            </tr>
                        </thead>
                        <tbody id="checklistConfigBody">
                            <tr><td colspan="4" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="pe-btn pe-btn-primary pe-btn-sm" onclick="SafetyModule.saveChecklistConfig()">
                    <i class="fas fa-save me-1"></i>บันทึก
                </button>
            </div>
        </div>
    </div>
</div>
