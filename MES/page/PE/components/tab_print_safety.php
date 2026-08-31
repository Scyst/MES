<style>
</style>

<div class="pe-card pe-card-fill border-0">
    <div class="pe-card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="border-bottom: 1px solid var(--pe-border-color); padding-bottom: 0;">
        <ul class="nav pe-header-nav" id="printSafetyTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="print-board-tab" data-bs-toggle="pill" data-bs-target="#print-board-panel" type="button" role="tab">
                    <span class="fw-bold fs-6"><i class="fas fa-chalkboard me-2 text-primary"></i>Visual Safety Boards</span>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="print-card-tab" data-bs-toggle="pill" data-bs-target="#print-card-panel" type="button" role="tab">
                    <span class="fw-bold fs-6"><i class="fas fa-id-card me-2 text-success"></i>LOTO Safety Cards</span>
                </button>
            </li>
        </ul>
        <span class="pe-text-xs pe-text-muted pb-2"><i class="fas fa-print me-1"></i> Print Center</span>
    </div>

    <div class="pe-card-body p-0">
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
