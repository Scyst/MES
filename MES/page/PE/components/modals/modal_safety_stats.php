<!-- Stats Modal (Charts) -->
<div class="modal fade" id="safetyStatsModal" tabindex="-1" aria-labelledby="safetyStatsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="safetyStatsModalLabel">
                    <i class="fas fa-chart-bar me-2 text-primary"></i><?php _e('pe.title_safety_stats'); ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row g-3">
                    <div class="col-md-5">
                        <div class="text-center mb-2 fw-bold text-muted" style="font-size:12px; text-transform:uppercase;"><?php _e('pe.chart_preop_compliance'); ?></div>
                        <div style="height: 240px; position: relative;">
                            <canvas id="preopComplianceChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="text-center mb-2 fw-bold text-muted" style="font-size:12px; text-transform:uppercase;"><?php _e('pe.chart_hazard_trend'); ?></div>
                        <div style="height: 240px; position: relative;">
                            <canvas id="hazardTrendChart"></canvas>
                        </div>
                    </div>
</div>
            </div>
        </div>
    </div>
</div>
