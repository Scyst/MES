<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="mb-0 fw-bold"><i class="fas fa-layer-group text-primary me-2"></i>Production Overview</h3>
        <p class="text-muted mb-0">สถานะการทำงานและประสิทธิภาพการผลิตรวม แยกตามแผนก</p>
    </div>
    
    <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-primary btn-sm shadow-sm" onclick="ProductionOverviewModule.fetchData()">
            <i class="fas fa-sync-alt me-1"></i> Update
        </button>
    </div>
</div>

<div class="row g-4 mb-4" id="overviewCardsContainer">
    <!-- Cards will be dynamically injected here -->
    <div class="col-12 text-center text-muted">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2">Loading Production Data...</div>
    </div>
</div>

<style>
/* Production Overview Styles */
.overview-card {
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
}
.overview-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1) !important;
}
.stat-box {
    text-align: center;
    padding: 8px;
    background: #f8fafc;
    border-radius: 8px;
}
.stat-box-value {
    font-size: 1.25rem;
    font-weight: 700;
}
.stat-box-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
}
.progress-target-marker {
    position: absolute;
    top: -5px;
    bottom: -5px;
    width: 2px;
    background-color: #ef4444; /* Target marker color */
    z-index: 10;
}
.machine-status-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    font-weight: 700;
    font-size: 0.85rem;
}
</style>
