<div class="modal fade" id="adminDashboardModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header border-0 pb-0" style="background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);">
                <div>
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-users text-primary"></i> ภาพรวมทีมงาน</h5>
                    <small class="text-muted">ข้อมูลประจำวันที่ <?php echo date('d/m/Y'); ?></small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body bg-light">
                
                <div class="card border-0 shadow-sm mb-3 text-white" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                    <div class="card-body d-flex align-items-center justify-content-between px-4 py-3">
                        <div>
                            <div class="text-uppercase" style="font-size: 0.75rem; letter-spacing: 1px; opacity: 0.8;">Factory Mood</div>
                            <div class="d-flex align-items-baseline gap-2">
                                <h1 class="mb-0 fw-bold" id="factoryMoodScore" style="font-size: 2.5rem;">-</h1>
                                <span class="opacity-75">/ 5.0</span>
                            </div>
                        </div>
                        <div style="font-size: 3.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));" id="factoryMoodEmoji">
                            😐
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm" style="border-radius: 15px; overflow: hidden;">
                    <div class="card-header bg-white fw-bold py-3 border-bottom">
                        <i class="fas fa-list-ol me-2 text-secondary"></i> รายการบันทึก
                    </div>
                    <div class="card-body p-0">
                        <div id="teamLogList" class="list-group list-group-flush">
                            </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>