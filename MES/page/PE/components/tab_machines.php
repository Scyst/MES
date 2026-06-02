<!-- tab_machines.php — Machine Registry -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="machineKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label">Total Machines</div>
            <div class="pe-kpi-value" id="kpiTotalMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-industry"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label">Active</div>
            <div class="pe-kpi-value" id="kpiActiveMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label">Under Repair</div>
            <div class="pe-kpi-value" id="kpiRepairMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-wrench"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label">Inactive</div>
            <div class="pe-kpi-value" id="kpiInactiveMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-power-off"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar">
    <div class="pe-search">
        <i class="fas fa-search"></i>
        <input type="text" id="machineSearchInput" placeholder="ค้นหารหัสเครื่อง, ชื่อ, Line..." oninput="MachineModule.filterTable()">
    </div>
    <select class="pe-filter-select" id="machineFilterLine" onchange="MachineModule.loadData()">
        <option value="">ทุก Line</option>
    </select>
    <select class="pe-filter-select" id="machineFilterStatus" onchange="MachineModule.loadData()">
        <option value="">ทุกสถานะ</option>
        <option value="Active">Active</option>
        <option value="Under Repair">Under Repair</option>
        <option value="Inactive">Inactive</option>
        <option value="Deleted">Deleted (ถังขยะ)</option>
    </select>
    <select class="pe-filter-select" id="machineFilterType" onchange="MachineModule.loadData()">
        <option value="">ทุกประเภท</option>
    </select>

    <div class="pe-filter-spacer"></div>

    <div class="pe-view-toggle">
        <button class="active" id="machineViewCard" onclick="MachineModule.setView('card')" title="Card View"><i class="fas fa-th-large"></i></button>
        <button id="machineViewTable" onclick="MachineModule.setView('table')" title="Table View"><i class="fas fa-list"></i></button>
    </div>

    <?php if ($canManage): ?>
    <button class="pe-btn pe-btn-primary" onclick="MachineModule.openModal()">
        <i class="fas fa-plus"></i> Add Machine
    </button>
    <?php endif; ?>
</div>

<!-- Card View -->
<div class="pe-machine-grid" id="machineCardView">
    <div class="pe-empty">
        <i class="fas fa-industry"></i>
        <h6>No machines registered</h6>
        <p>Click "Add Machine" to register your first machine</p>
    </div>
</div>

<!-- Table View (hidden by default) -->
<div class="pe-card" id="machineTableView" style="display:none;">
    <div class="pe-card-body p-0">
        <div style="overflow-x:auto; max-height:600px;">
            <table class="pe-table" id="machineTable">
                <thead>
                    <tr>
                        <th style="width:10%;">Code</th>
                        <th style="width:18%;">Machine Name</th>
                        <th style="width:8%;">Line</th>
                        <th style="width:10%;">Area</th>
                        <th style="width:10%;">Type</th>
                        <th style="width:10%;">Status</th>
                        <th style="width:10%;">Criticality</th>
                        <th style="width:10%;">Install Date</th>
                        <th style="width:8%;" class="pe-text-center">Actions</th>
                    </tr>
                </thead>
                <tbody id="machineTableBody">
                    <tr><td colspan="9" class="pe-text-center pe-text-muted" style="padding:60px;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
