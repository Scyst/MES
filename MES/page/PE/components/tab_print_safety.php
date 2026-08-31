<style>
    .print-safety-menu .nav-link {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        color: #475569;
        font-weight: 600;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: all 0.2s ease;
        margin-bottom: 10px;
        text-align: left;
    }
    .print-safety-menu .nav-link:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }
    .print-safety-menu .nav-link.active {
        background: #eff6ff;
        border-color: #3b82f6;
        color: #1d4ed8;
        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
    }
    .print-safety-menu .nav-link i {
        font-size: 1.8rem;
        width: 40px;
        text-align: center;
    }
    .print-safety-menu .nav-title {
        display: block;
        font-size: 1.1rem;
        margin-bottom: 3px;
    }
    .print-safety-menu .nav-desc {
        display: block;
        font-size: 0.85rem;
        color: #64748b;
        font-weight: normal;
    }
    .print-safety-menu .nav-link.active .nav-desc {
        color: #3b82f6;
    }
    

</style>

<div class="row g-4 flex-fill w-100" style="min-height: 0; margin: 0;">
    <div class="col-lg-4 col-xl-3 ps-0">
        <div class="pe-card pe-card-fill border-0">
            <div class="pe-card-header border-0 pb-0">
                <h5 class="fw-bold mb-3"><i class="fas fa-print me-2 text-primary"></i> Print Center</h5>
            </div>
            <div class="pe-card-body pt-0">
                <div class="nav flex-column nav-pills print-safety-menu" id="printSafetyTabs" role="tablist" aria-orientation="vertical">
                    <button class="nav-link active" id="print-board-tab" data-bs-toggle="pill" data-bs-target="#print-board-panel" type="button" role="tab">
                        <i class="fas fa-chalkboard text-primary"></i>
                        <div>
                            <span class="nav-title">Visual Safety Boards</span>
                            <span class="nav-desc">Print A4 landscape safety boards for machine display</span>
                        </div>
                    </button>
                    <button class="nav-link" id="print-card-tab" data-bs-toggle="pill" data-bs-target="#print-card-panel" type="button" role="tab">
                        <i class="fas fa-id-card text-success"></i>
                        <div>
                            <span class="nav-title">LOTO Safety Cards</span>
                            <span class="nav-desc">Generate Lockout/Tagout ID cards for technicians</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-8 col-xl-9 pe-0">
        <div class="pe-card pe-card-fill border-0">
            <div class="tab-content d-flex flex-column flex-fill" id="printSafetyTabsContent" style="min-height: 0;">
                <div class="tab-pane fade show active pe-tab-pane-fill" id="print-board-panel" role="tabpanel">
                    <div class="pe-table-scroll-y p-3">
                        <?php include 'tab_visual_board.php'; ?>
                    </div>
                </div>
                <div class="tab-pane fade pe-tab-pane-fill" id="print-card-panel" role="tabpanel">
                    <div class="pe-table-scroll-y p-3">
                        <?php include 'tab_card_generator.php'; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
