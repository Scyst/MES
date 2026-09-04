<!-- tab_machines.php — Machine Registry -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="machineKpiRow">
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_total_machines'); ?></div>
            <div class="pe-kpi-value" id="kpiTotalMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-industry"></i></div>
    </div>
    <div class="pe-kpi-card kpi-success pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_active'); ?></div>
            <div class="pe-kpi-value" id="kpiActiveMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-check-circle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_under_repair'); ?></div>
            <div class="pe-kpi-value" id="kpiRepairMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-wrench"></i></div>
    </div>
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_inactive'); ?></div>
            <div class="pe-kpi-value" id="kpiInactiveMachines">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-power-off"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar">
    <div class="pe-search">
        <i class="fas fa-search"></i>
        <input type="search" id="machineSearchInput" placeholder="<?php _e('pe.search_machine'); ?>" oninput="MachineModule.filterTable()" autocomplete="new-password">
    </div>
    <select class="pe-filter-select" id="machineFilterLine" onchange="MachineModule.loadData()">
        <option value=""><?php _e('pe.filter_all_lines'); ?></option>
    </select>
    <select class="pe-filter-select" id="machineFilterStatus" onchange="MachineModule.loadData()">
        <option value=""><?php _e('pe.filter_all_status'); ?></option>
        <option value="Active">Active</option>
        <option value="Under Repair">Under Repair</option>
        <option value="Inactive">Inactive</option>
        <option value="Deleted"><?php _e('pe.filter_deleted'); ?></option>
    </select>
    <select class="pe-filter-select" id="machineFilterType" onchange="MachineModule.loadData()">
        <option value=""><?php _e('pe.filter_all_types'); ?></option>
    </select>

    <div class="pe-filter-spacer"></div>

    <div class="pe-view-toggle">
        <button class="active" id="machineViewCard" onclick="MachineModule.setView('card')" title="<?php _e('pe.view_card'); ?>"><i class="fas fa-th-large"></i></button>
        <button id="machineViewTable" onclick="MachineModule.setView('table')" title="<?php _e('pe.view_table'); ?>"><i class="fas fa-list"></i></button>
    </div>

    <?php if ($canManage): ?>
    <button class="pe-btn pe-btn-secondary" onclick="MachineModule.openDiscoveryModal()" style="margin-right: 8px;">
        <i class="fas fa-satellite-dish"></i> <?php _e('pe.btn_iiot_discovery'); ?>
    </button>
    <button class="pe-btn pe-btn-primary" onclick="MachineModule.openModal()">
        <i class="fas fa-plus"></i> <?php _e('pe.btn_add_machine'); ?>
    </button>
    <?php endif; ?>
</div>

<!-- Card View -->
<div class="pe-machine-grid" id="machineCardView">
    <div class="pe-empty">
        <i class="fas fa-industry"></i>
        <h6><?php _e('pe.empty_machine_title'); ?></h6>
        <p><?php _e('pe.empty_machine_desc'); ?></p>
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
                        <th style="width:18%;"><?php _e('pe.th_machine_name'); ?></th>
                        <th style="width:8%;"><?php _e('pe.th_line'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_area'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_type'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_status'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_criticality'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_install_date'); ?></th>
                        <th style="width:8%;" class="pe-text-center"><?php _e('pe.th_actions'); ?></th>
                    </tr>
                </thead>
                <tbody id="machineTableBody">
                    <tr><td colspan="9" class="pe-text-center pe-text-muted" style="padding:60px;"><?php _e('pe.txt_loading'); ?></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
