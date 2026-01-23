<div class="modal fade" id="replyModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            
            <div class="modal-header border-0 pb-0 bg-primary bg-opacity-10">
                <h6 class="modal-title fw-bold text-primary">
                    <i class="fas fa-reply me-2"></i>ตอบกลับพนักงาน (Admin Reply)
                </h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body">
                <div class="alert alert-light border mb-3">
                    <small class="text-muted d-block fw-bold mb-1">
                        <i class="fas fa-quote-left me-1"></i>ข้อความจากพนักงาน:
                    </small>
                    <span id="replyUserMessage" class="fst-italic text-secondary d-block ps-2">...</span>
                </div>
                
                <form id="replyForm">
                    <input type="hidden" name="action" value="save_reply">
                    <input type="hidden" name="log_date" id="replyLogDate">
                    <input type="hidden" name="target_user_id" id="replyUserId">
                    <input type="hidden" name="period_id" id="replyPeriodId">

                    <div class="form-floating">
                        <textarea class="form-control" 
                                  placeholder="พิมพ์ข้อความตอบกลับที่นี่..." 
                                  id="replyInputMessage" 
                                  name="reply_message" 
                                  style="height: 120px" required></textarea>
                        <label for="replyInputMessage">ข้อความตอบกลับ (Feedback)</label>
                    </div>
                    <div class="form-text text-end" id="replyCharCount">0 chars</div>
                </form>
            </div>

            <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary btn-sm px-4" onclick="submitReply()">
                    <i class="fas fa-paper-plane me-1"></i> ส่งข้อความ
                </button>
            </div>

        </div>
    </div>
</div>  