<!-- tab_downtime.php — Downtime Tracker -->

<!-- KPI Row -->
<div class="pe-kpi-row" id="dtKpiRow">
    <div class="pe-kpi-card kpi-danger pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_total_downtime'); ?></div>
            <div class="pe-kpi-value" id="kpiTotalDowntime">0 <span class="unit">min</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-clock"></i></div>
    </div>
    <div class="pe-kpi-card kpi-primary pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_events'); ?></div>
            <div class="pe-kpi-value" id="kpiDtEvents">0</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
    </div>
    <div class="pe-kpi-card kpi-warning pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_avg_duration'); ?></div>
            <div class="pe-kpi-value" id="kpiAvgDuration">0 <span class="unit">min</span></div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-hourglass-half"></i></div>
    </div>
    <div class="pe-kpi-card kpi-info pe-animate-in">
        <div>
            <div class="pe-kpi-label"><?php _e('pe.kpi_top_cause'); ?></div>
            <div class="pe-kpi-value pe-text-sm pe-fw-bold" id="kpiTopCause" style="font-size:16px;">-</div>
        </div>
        <div class="pe-kpi-icon"><i class="fas fa-chart-bar"></i></div>
    </div>
</div>

<!-- Filter Bar -->
<div class="pe-filter-bar">
    <div class="pe-search">
        <i class="fas fa-search"></i>
        <input type="search" id="dtSearchInput" placeholder="<?php _e('pe.search_dt'); ?>" oninput="DowntimeModule.filterTable()" autocomplete="new-password">
    </div>
    <select class="pe-filter-select" id="dtFilterLine" onchange="DowntimeModule.loadData()">
        <option value=""><?php _e('pe.filter_all_lines'); ?></option>
    </select>
    <select class="pe-filter-select" id="dtFilterCause" onchange="DowntimeModule.loadData()">
        <option value=""><?php _e('pe.filter_all_cause'); ?></option>
        <option value="Mechanical">Mechanical</option>
        <option value="Electrical">Electrical</option>
        <option value="Tooling">Tooling</option>
        <option value="Quality">Quality</option>
        <option value="Material">Material</option>
        <option value="Operator">Operator</option>
        <option value="Other">Other</option>
    </select>
    <div class="pe-filter-date">
        <input type="date" id="dtStartDate" onchange="DowntimeModule.loadData()">
        <span class="separator">—</span>
        <input type="date" id="dtEndDate" onchange="DowntimeModule.loadData()">
    </div>

    <div class="pe-filter-spacer"></div>

    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="DowntimeModule.exportExcel()" title="Export Excel">
        <i class="fas fa-file-excel"></i>
    </button>

    <button class="pe-btn pe-btn-primary" onclick="DowntimeModule.openModal()">
        <i class="fas fa-plus"></i> <?php _e('pe.btn_record_downtime'); ?>
    </button>
</div>

<!-- Summary by Line -->
<div class="pe-card pe-mb-16" id="dtSummaryCard">
    <div class="pe-card-body" style="padding:12px 20px;">
        <div id="dtLineSummary" class="pe-text-sm pe-text-muted"><?php _e('pe.txt_loading_summary'); ?></div>
    </div>
</div>

<!-- Table -->
<div class="pe-card pe-card-fill">
    <div class="pe-card-header">
        <h6><i class="fas fa-history"></i> <?php _e('pe.title_dt_history'); ?></h6>
        <span class="pe-text-xs pe-text-muted"><?php _e('pe.txt_showing'); ?> <span id="dtShowing">0</span> <?php _e('pe.txt_records'); ?></span>
    </div>
    <div class="pe-card-body p-0">
        <div class="pe-table-scroll-y">
            <table class="pe-table" id="dtTable">
                <thead>
                    <tr>
                        <th style="width:10%;"><?php _e('pe.th_date'); ?></th>
                        <th style="width:8%;"><?php _e('pe.th_start'); ?></th>
                        <th style="width:8%;"><?php _e('pe.th_end'); ?></th>
                        <th style="width:8%;"><?php _e('pe.th_duration'); ?></th>
                        <th style="width:7%;"><?php _e('pe.th_line'); ?></th>
                        <th style="width:14%;"><?php _e('pe.th_machine'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_category'); ?></th>
                        <th style="width:15%;"><?php _e('pe.th_cause_detail'); ?></th>
                        <th style="width:10%;"><?php _e('pe.th_recovered_by'); ?></th>
                        <th style="width:7%;" class="pe-text-center"><?php _e('pe.th_actions'); ?></th>
                    </tr>
                </thead>
                <tbody id="dtTableBody">
                    <tr><td colspan="10" class="pe-text-center pe-text-muted" style="padding:60px;"><?php _e('pe.txt_loading'); ?></td></tr>
                </tbody>
            </table>
        </div>
    </div>
    <div class="pe-card-footer pe-d-flex pe-justify-between pe-align-center">
        <div class="pe-text-xs pe-text-muted" id="dtPaginationInfo"></div>
        <div id="dtPagination"></div>
    </div>
</div>
