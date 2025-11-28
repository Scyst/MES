<div class="modal fade" id="dayManagerModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
            <div class="modal-header border-0 pb-0">
                <h6 class="modal-title fw-bold" id="dayManagerDateTitle">-</h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pt-2">
                <div id="dayManagerList"></div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="logModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form id="logForm">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold">📝 บันทึกข้อมูล</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <input type="hidden" name="action" value="save_log">
                    <input type="hidden" name="target_date" id="inputTargetDate">
                    <input type="hidden" name="period_id" id="inputPeriodId">
                    
                    <div class="badge bg-light text-dark border mb-3 px-3 py-2" id="formPeriodLabel">-</div>

                    <div class="emoji-select-wrapper">
                        <span class="emoji-option" data-val="1">😤</span>
                        <span class="emoji-option" data-val="2">😓</span>
                        <span class="emoji-option" data-val="3">😐</span>
                        <span class="emoji-option" data-val="4">🙂</span>
                        <span class="emoji-option" data-val="5">🤩</span>
                    </div>
                    <input type="hidden" name="mood_score" id="inputMood">
                    <div id="moodError" class="text-danger small d-none mb-2">กรุณาเลือกอารมณ์</div>

                    <div class="form-floating mb-2">
                        <input type="number" class="form-control text-center fw-bold" name="production_qty" id="inputQty" placeholder="0">
                        <label>ยอดผลิต (ชิ้น)</label>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control" name="note" id="inputNote" style="height: 80px" placeholder="Note"></textarea>
                        <label>Note / ปัญหา</label>
                    </div>
                </div>
                <div class="modal-footer border-0 pt-0">
                    <button type="button" class="btn btn-light w-50" data-bs-target="#dayManagerModal" data-bs-toggle="modal">กลับ</button>
                    <button type="submit" class="btn btn-primary w-50">บันทึก</button>
                </div>
            </form>
        </div>
    </div>
</div>