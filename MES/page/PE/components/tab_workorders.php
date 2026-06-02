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
<div class="pe-filter-bar">
    <div class="pe-search">
        <i class="fas fa-search"></i>
        <input type="text" id="woSearchInput" placeholder="ค้นหา WO#, Machine, Issue..." oninput="WorkOrderModule.filterTable()">
    </div>
    <select class="pe-filter-select" id="woFilterStatus" onchange="WorkOrderModule.loadData()">
        <option value="Active" selected>Active (Open + In Progress)</option>
        <option value="">All Status</option>
        <option value="Open">Open</option>
        <option value="Assigned">Assigned</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
        <option value="Deleted">Deleted (ถังขยะ)</option>
    </select>
    <select class="pe-filter-select" id="woFilterPriority" onchange="WorkOrderModule.loadData()">
        <option value="">ทุก Priority</option>
        <option value="Critical">Critical</option>
        <option value="High">High</option>
        <option value="Normal">Normal</option>
        <option value="Low">Low</option>
    </select>
    <select class="pe-filter-select" id="woFilterLine" onchange="WorkOrderModule.loadData()">
        <option value="">ทุก Line</option>
    </select>
    <div class="pe-filter-date">
        <input type="date" id="woStartDate" onchange="WorkOrderModule.loadData()">
        <span class="separator">—</span>
        <input type="date" id="woEndDate" onchange="WorkOrderModule.loadData()">
    </div>

    <div class="pe-filter-spacer"></div>

    <div class="pe-view-toggle">
        <button class="active" id="woViewTable" onclick="WorkOrderModule.setView('table')" title="Table View"><i class="fas fa-list"></i></button>
        <button id="woViewKanban" onclick="WorkOrderModule.setView('kanban')" title="Kanban Board"><i class="fas fa-columns"></i></button>
    </div>

    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="WorkOrderModule.exportExcel()" title="Export Excel">
        <i class="fas fa-file-excel"></i>
    </button>

    <button class="pe-btn pe-btn-primary" onclick="WorkOrderModule.openModal()">
        <i class="fas fa-plus"></i> New Work Order
    </button>
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

<!-- Kanban View (hidden by default) -->
<div class="pe-kanban" id="woKanbanView" style="display:none;">
    <div class="pe-kanban-column" id="kanbanOpen">
        <div class="pe-kanban-column-header">
            <span><i class="fas fa-inbox me-2" style="color:var(--pe-primary);"></i>Open</span>
            <span class="count" id="kanbanOpenCount">0</span>
        </div>
        <div class="pe-kanban-cards" id="kanbanOpenCards"></div>
    </div>
    <div class="pe-kanban-column" id="kanbanAssigned">
        <div class="pe-kanban-column-header">
            <span><i class="fas fa-user-check me-2" style="color:#7c3aed;"></i>Assigned</span>
            <span class="count" id="kanbanAssignedCount">0</span>
        </div>
        <div class="pe-kanban-cards" id="kanbanAssignedCards"></div>
    </div>
    <div class="pe-kanban-column" id="kanbanProgress">
        <div class="pe-kanban-column-header">
            <span><i class="fas fa-cog fa-spin me-2" style="color:var(--pe-warning);"></i>In Progress</span>
            <span class="count" id="kanbanProgressCount">0</span>
        </div>
        <div class="pe-kanban-cards" id="kanbanProgressCards"></div>
    </div>
    <div class="pe-kanban-column" id="kanbanCompleted">
        <div class="pe-kanban-column-header">
            <span><i class="fas fa-check-circle me-2" style="color:var(--pe-success);"></i>Completed</span>
            <span class="count" id="kanbanCompletedCount">0</span>
        </div>
        <div class="pe-kanban-cards" id="kanbanCompletedCards"></div>
    </div>
</div>
