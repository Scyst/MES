<!-- tab_workorders.php — Work Order Management -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="woKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_total_wo'); ?></div>
            <div class="pe-kpi-value" id="kpiTotalWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clipboard-list"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_open_assigned'); ?></div>
            <div class="pe-kpi-value" id="kpiOpenWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-hourglass-half"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_completed'); ?></div>
            <div class="pe-kpi-value" id="kpiCompletedWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-double"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_avg_repair'); ?></div>
            <div class="pe-kpi-value" id="kpiAvgRepair">0 <span class="unit">min</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-stopwatch"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar" id="woFilterBar">
    <div class="pe-filter-header-mobile">
        <div class="pe-search">
            <i class="fas fa-search"></i>
            <input type="search" id="woSearchInput" placeholder="<?php _e('pe.search_wo'); ?>" oninput="WorkOrderModule.filterTable()" autocomplete="new-password">
        </div>
        <button class="pe-btn pe-btn-ghost pe-mobile-filter-toggle" onclick="WorkOrderModule.openFilterModal()" title="Open Filters">
            <i class="fas fa-filter"></i>
        </button>
    </div>
    <button class="pe-btn d-none d-md-inline-flex align-items-center" onclick="WorkOrderModule.openFilterModal()" id="woFilterBtn" style="background-color: #ffffff; color: var(--pe-text-primary, #333); border: 1px solid var(--pe-border-color, #e0e0e0); box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-right: 8px;">
        <i class="fas fa-filter text-muted"></i> <span class="ms-1 fw-medium"><?php _e('pe.btn_filter'); ?></span>
    </button>

    <div class="pe-filter-spacer"></div>

    <div class="pe-filter-actions">
        <div class="pe-view-toggle">
            <button class="active" id="woViewTable" onclick="WorkOrderModule.setView('table')" title="<?php _e('pe.view_table'); ?>"><i class="fas fa-list"></i></button>
            <button id="woViewKanban" onclick="WorkOrderModule.setView('kanban')" title="<?php _e('pe.view_card'); ?>"><i class="fas fa-th-large"></i></button>
            <button class="d-none d-md-inline-block" id="woViewBoard" onclick="WorkOrderModule.setView('board')" title="<?php _e('pe.view_board'); ?>"><i class="fas fa-columns"></i></button>
        </div>

        <button class="pe-btn pe-btn-ghost d-none d-md-inline-flex" onclick="WorkOrderModule.exportExcel()" title="Export Excel">
            <i class="fas fa-file-excel pe-me-1"></i> <span class="d-none d-lg-inline" style="margin-left: 4px;"><?php _e('pe.btn_export'); ?></span>
        </button>

        <button class="pe-btn pe-btn-primary pe-btn-outline d-none d-md-inline-flex" id="woBulkPrintBtn" style="display:none !important;" onclick="WorkOrderModule.bulkPrintPDF()">
            <i class="fas fa-print"></i> <span class="ms-2"><?php _e('pe.btn_bulk_print'); ?></span>
        </button>

        <button class="pe-btn pe-btn-primary d-none d-md-inline-flex" onclick="WorkOrderModule.openModal()">
            <i class="fas fa-plus"></i> <span class="ms-2"><?php _e('pe.btn_new_wo'); ?></span>
        </button>
    </div>
</div>

<!-- Kanban View (Single Column for Mobile) -->
<div class="pe-card" id="woKanbanView" style="display:none;">
    <div class="pe-card-body" id="woCardContainer">
        <!-- Rendered by JS -->
    </div>
</div>

<!-- Board View (4-Column Drag and Drop for Desktop) -->
<div class="pe-board-container" id="woBoardView" style="display:none;">
    <div class="pe-board-column" data-status="Open" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-envelope-open text-primary"></i> <?php _e('pe.board_open'); ?>
            </div>
            <div class="pe-board-column-count" id="count-board-Open">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Open"></div>
    </div>
    <div class="pe-board-column" data-status="Assigned" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-user-check text-info"></i> <?php _e('pe.board_assigned'); ?>
            </div>
            <div class="pe-board-column-count" id="count-board-Assigned">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Assigned"></div>
    </div>
    <div class="pe-board-column" data-status="In Progress" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-cogs text-warning"></i> <?php _e('pe.board_in_progress'); ?>
            </div>
            <div class="pe-board-column-count" id="count-board-InProgress">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-InProgress"></div>
    </div>
    <div class="pe-board-column" data-status="Completed" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-check-circle text-success"></i> <?php _e('pe.board_completed'); ?>
            </div>
            <div class="pe-board-column-count" id="count-board-Completed">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Completed"></div>
    </div>
</div>

<!-- Table View -->
<div class="pe-card pe-card-fill" id="woTableView">
    <div class="pe-card-body p-0">
        <div class="pe-table-scroll-y">
            <table class="pe-table" id="woTable">
                <thead>
                    <tr>
                        <th style="width:3%;" class="pe-text-center">
                            <input type="checkbox" id="woCheckAll" onchange="WorkOrderModule.toggleAllBulkChecks(this)">
                        </th>
                        <th style="width:7%;"><?php _e('pe.th_status'); ?></th>
                        <th style="width:9%;"><?php _e('pe.th_wo_no'); ?></th>
                        <th style="width:6%;"><?php _e('pe.th_type'); ?></th>
                        <th style="width:7%;"><?php _e('pe.th_priority'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_machine'); ?></th>
                        <th style="width:5%;"><?php _e('pe.th_line'); ?></th>
                        <th style="width:16%;"><?php _e('pe.th_issue'); ?></th>
                        <th style="width:9%;"><?php _e('pe.th_requested_by'); ?></th>
                        <th style="width:7%;"><?php _e('pe.th_date_time'); ?></th>
                        <th style="width:7%;"><?php _e('pe.th_assigned_to'); ?></th>
                        <th style="width:6%;"><?php _e('pe.th_time'); ?></th>
                        <th style="width:8%;" class="pe-text-center"><?php _e('pe.th_actions'); ?></th>
                    </tr>
                </thead>
                <tbody id="woTableBody">
                    <tr><td colspan="13" class="pe-text-center pe-text-muted" style="padding:60px;"><?php _e('pe.txt_loading'); ?></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Card View (hidden by default) -->
<div class="pe-card-view mt-3" id="woKanbanView" style="display:none; max-width: 800px; margin: 0 auto; padding-bottom: 24px;">
    <div class="pe-kanban-cards" id="woCardContainer" style="overflow-y: visible;"></div>
</div>

<!-- Mobile FAB (Floating Action Button) -->
<button class="pe-fab d-md-none" onclick="WorkOrderModule.openModal()" title="New Work Order">
    <i class="fas fa-plus"></i>
</button>
