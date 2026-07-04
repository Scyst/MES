<!-- tab_workorders.php — Work Order Management -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="woKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Work Orders</div>
            <div class="pe-kpi-value" id="kpiTotalWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clipboard-list"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Open / Assigned</div>
            <div class="pe-kpi-value" id="kpiOpenWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-hourglass-half"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Completed</div>
            <div class="pe-kpi-value" id="kpiCompletedWO">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-double"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label">Avg Repair Time</div>
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
            <input type="text" id="woSearchInput" placeholder="ค้นหา WO#, Machine, Issue..." oninput="WorkOrderModule.filterTable()">
        </div>
        <button class="pe-btn pe-btn-ghost pe-mobile-filter-toggle" onclick="WorkOrderModule.openFilterModal()" title="Open Filters">
            <i class="fas fa-filter"></i>
        </button>
    </div>
    <button class="pe-btn d-none d-md-inline-flex align-items-center" onclick="WorkOrderModule.openFilterModal()" id="woFilterBtn" style="background-color: #ffffff; color: var(--pe-text-primary, #333); border: 1px solid var(--pe-border-color, #e0e0e0); box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-right: 8px;">
        <i class="fas fa-filter text-muted"></i> <span class="ms-1 fw-medium">ตัวกรอง</span>
    </button>

    <div class="pe-filter-spacer"></div>

    <div class="pe-filter-actions">
        <div class="pe-view-toggle">
            <button class="active" id="woViewTable" onclick="WorkOrderModule.setView('table')" title="Table View"><i class="fas fa-list"></i></button>
            <button id="woViewKanban" onclick="WorkOrderModule.setView('kanban')" title="Card View (Mobile)"><i class="fas fa-th-large"></i></button>
            <button class="d-none d-md-inline-block" id="woViewBoard" onclick="WorkOrderModule.setView('board')" title="Board View (Drag & Drop)"><i class="fas fa-columns"></i></button>
        </div>

        <button class="pe-btn pe-btn-ghost d-none d-md-inline-flex" onclick="WorkOrderModule.exportExcel()" title="Export Excel">
            <i class="fas fa-file-excel pe-me-1"></i> <span class="d-none d-lg-inline" style="margin-left: 4px;">Export</span>
        </button>

        <button class="pe-btn pe-btn-primary d-none d-md-inline-flex" onclick="WorkOrderModule.openModal()">
            <i class="fas fa-plus"></i> <span class="ms-2">New Work Order</span>
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
                <i class="fas fa-envelope-open text-primary"></i> รอรับงาน (Open)
            </div>
            <div class="pe-board-column-count" id="count-board-Open">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Open"></div>
    </div>
    <div class="pe-board-column" data-status="Assigned" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-user-check text-info"></i> มอบหมายแล้ว (Assigned)
            </div>
            <div class="pe-board-column-count" id="count-board-Assigned">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Assigned"></div>
    </div>
    <div class="pe-board-column" data-status="In Progress" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-cogs text-warning"></i> กำลังดำเนินการ (In Progress)
            </div>
            <div class="pe-board-column-count" id="count-board-InProgress">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-InProgress"></div>
    </div>
    <div class="pe-board-column" data-status="Completed" ondragover="WorkOrderModule.allowDrop(event)" ondrop="WorkOrderModule.drop(event)" ondragenter="WorkOrderModule.dragEnter(event)" ondragleave="WorkOrderModule.dragLeave(event)">
        <div class="pe-board-column-header">
            <div class="pe-board-column-title">
                <i class="fas fa-check-circle text-success"></i> เสร็จสิ้น (Completed)
            </div>
            <div class="pe-board-column-count" id="count-board-Completed">0</div>
        </div>
        <div class="pe-board-column-content" id="board-col-Completed"></div>
    </div>
</div>

<!-- Table View -->
<div class="pe-card" id="woTableView">
    <div class="pe-card-body p-0">
        <div style="overflow-x:auto; max-height:600px;">
            <table class="pe-table" id="woTable">
                <thead>
                    <tr>
                        <th style="width:8%;">Status</th>
                        <th style="width:10%;">WO #</th>
                        <th style="width:7%;">Type</th>
                        <th style="width:8%;">Priority</th>
                        <th style="width:12%;">Machine</th>
                        <th style="width:6%;">Line</th>
                        <th style="width:18%;">Issue</th>
                        <th style="width:8%;">Requested</th>
                        <th style="width:8%;">Assigned To</th>
                        <th style="width:8%;">Repair Time</th>
                        <th style="width:7%;" class="pe-text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="woTableBody">
                    <tr><td colspan="11" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
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
