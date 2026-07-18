<div class="card shadow-sm border-0" style="border-radius: 12px; overflow: hidden;">
    <div class="card-header bg-white border-bottom-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
        <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-stream text-info me-2"></i> Timeline Overview</h6>
        <div class="d-flex gap-2 align-items-center">
            <div class="input-group input-group-sm" style="width: auto;">
                <span class="input-group-text bg-light border-0"><i class="fas fa-calendar-alt text-muted"></i></span>
                <input type="date" id="timelineDateFilter" class="form-control form-control-sm bg-light border-0 fw-bold" style="max-width: 130px;">
            </div>
            <button class="btn btn-info btn-sm text-white px-3" onclick="MachineTimelineModule.fetchData()">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    </div>
    <div class="card-body p-0 border-top">
        <!-- Gantt Timeline Container -->
        <div id="machineTimelineContainer" class="position-relative w-100" style="min-height: 400px; overflow-x: auto; overflow-y: hidden;">
            <div class="p-5 text-center text-muted">
                <div class="spinner-border text-info" role="status"></div>
                <div class="mt-2">Rendering Timeline...</div>
            </div>
        </div>
    </div>
</div>

<style>
/* CSS for the custom HTML Timeline */
.timeline-wrapper {
    position: relative;
    width: 100%;
    min-width: 800px;
    padding-top: 40px; /* Space for header */
}
.timeline-header {
    position: absolute;
    top: 0;
    left: 150px; /* Space for machine name */
    right: 0;
    height: 40px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
}
.timeline-tick {
    position: absolute;
    top: 0;
    bottom: -1000px; /* Will be cut off by container */
    border-left: 1px dashed #e2e8f0;
    z-index: 1;
}
.timeline-tick-label {
    position: absolute;
    top: 10px;
    left: -15px;
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
}
.timeline-row {
    position: relative;
    height: 50px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
}
.timeline-row:hover {
    background-color: #f8fafc;
}
.timeline-label {
    width: 150px;
    font-weight: 600;
    font-size: 13px;
    color: #334155;
    padding-left: 15px;
    z-index: 10;
    background: inherit;
    border-right: 1px solid #e2e8f0;
}
.timeline-track {
    position: relative;
    flex: 1;
    height: 100%;
    z-index: 5;
}
.timeline-bar {
    position: absolute;
    top: 10px;
    height: 30px;
    border-radius: 4px;
    opacity: 0.85;
    transition: opacity 0.2s;
    cursor: pointer;
}
.timeline-bar:hover {
    opacity: 1;
    z-index: 20;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.timeline-bar.status-RUNNING { background-color: #10b981; } /* Emerald */
.timeline-bar.status-IDLE { background-color: #f59e0b; }    /* Amber */
.timeline-bar.status-STOP { background-color: #ef4444; }    /* Red */
.timeline-bar.status-OFFLINE { background-color: #94a3b8; } /* Slate */

/* Tooltip */
.timeline-tooltip {
    position: absolute;
    background: #1e293b;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    pointer-events: none;
    z-index: 100;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s;
}
</style>
