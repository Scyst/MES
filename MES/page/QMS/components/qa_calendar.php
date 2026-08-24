<!-- page/QMS/components/qa_calendar.php -->
<style>
.qa-grid-headers {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
}
.qa-custom-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: minmax(100px, 1fr);
    background-color: #e2e8f0; /* borders */
    gap: 1px;
}
.qa-day-cell {
    background-color: #fff;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    min-width: 0; /* allows text truncation */
}
.qa-day-cell:hover {
    background-color: #f8fafc;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
}
.qa-day-cell.other-month {
    background-color: #f8fafc;
    opacity: 0.7;
}
.qa-day-cell.today {
    background-color: #fff;
    box-shadow: inset 0 0 0 2px rgba(217, 70, 239, 0.5); /* fuchsia ring */
}
.qa-day-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.85rem;
    font-weight: 500;
    color: #64748b;
    margin-bottom: 4px;
}
.qa-day-cell.today .qa-day-number {
    background-color: #d946ef; /* fuchsia */
    color: white;
    font-weight: bold;
}
.qa-day-cell.selected {
    background-color: #eef2ff; /* indigo-50 */
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.5);
}
.qa-day-cell.selected .qa-day-number {
    color: #4f46e5;
    font-weight: bold;
}
.qa-event-pill {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 3px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: transform 0.1s;
    border: 1px solid transparent;
}
.qa-event-pill:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.qa-event-pill.status-waiting {
    background-color: #f8fafc;
    color: #475569;
    border-color: #cbd5e1;
    border-left: 3px solid #94a3b8;
}
.qa-event-pill.status-progress {
    background-color: #fff7ed;
    color: #c2410c;
    border-color: #fed7aa;
    border-left: 3px solid #f97316;
}
.qa-event-pill.status-done {
    background-color: #f0fdf4;
    color: #15803d;
    border-color: #bbf7d0;
    border-left: 3px solid #22c55e;
}
.qa-event-pill.result-fail {
    background-color: #fef2f2;
    color: #b91c1c;
    border-color: #fecaca;
    border-left: 3px solid #ef4444;
}
.qa-more-text {
    font-size: 0.7rem;
    color: #64748b;
    padding-left: 4px;
}
/* mobile dots */
.qa-mobile-dots {
    display: none;
    flex-wrap: wrap;
    gap: 2px;
    justify-content: center;
    margin-top: 4px;
}
.qa-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}
.qa-dot.status-waiting { background-color: #94a3b8; }
.qa-dot.status-progress { background-color: #f97316; }
.qa-dot.status-done { background-color: #22c55e; }
.qa-dot.result-fail { background-color: #ef4444; }

.qa-desktop-events {
    flex: 1;
    overflow-y: auto;
    max-height: 140px;
}
/* Custom slim scrollbar for event lists */
.qa-desktop-events::-webkit-scrollbar {
    width: 4px;
}
.qa-desktop-events::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

@media (max-width: 768px) {
    .qa-desktop-events { display: none; }
    .qa-mobile-dots { display: flex; }
    .qa-custom-grid { grid-auto-rows: minmax(70px, 1fr); }
    .qa-day-number { margin: 0 auto 4px auto; }
}

/* Drag over style */
.qa-day-cell.drag-over {
    background-color: #e0f2fe; /* light blue */
    border: 2px dashed #38bdf8;
}
</style>
<div class="card shadow-sm border-0 flex-fill mt-0" id="calendarViewContainer" style="min-height: 500px; height: 100%; display: flex; flex-direction: column;">
    <div class="row g-0 h-100 flex-fill" style="min-height: 0;">
        <!-- Main Calendar (Now on Left) -->
        <div class="col-lg-9 d-flex flex-column h-100 bg-white border-end" style="min-height: 0;">
            <div class="card-header bg-white py-2 border-bottom d-flex align-items-center justify-content-between"> 
                <div class="d-flex gap-1">
                    <button id="qa-calendar-prev-button" class="btn btn-sm btn-light border text-muted" title="Previous">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button id="qa-calendar-today-button" class="btn btn-sm btn-light border text-dark fw-bold px-3">
                        Today
                    </button>
                </div>
                
                <div class="fw-bold text-dark text-truncate" id="qa-calendar-title" style="font-size: 1rem; letter-spacing: 0.5px;">
                    Calendar
                </div>

                <div class="d-flex align-items-center gap-1">
                    <div class="btn-group btn-group-sm me-1" role="group">
                        <button id="qa-calendar-month-view-button" class="btn btn-outline-secondary active" title="Month View">Month</button>
                    </div>
                    
                    <button id="qa-calendar-next-button" class="btn btn-sm btn-light border text-muted" title="Next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="card-body p-0 position-relative h-100 d-flex flex-column" style="background-color: #f1f5f9; min-height: 0;">
                
                <!-- Day Headers -->
                <div class="qa-grid-headers d-flex border-bottom bg-light">
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">อา</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">จ</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">อ</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">พ</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">พฤ</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">ศ</div>
                    <div class="qa-day-col text-center py-2 fw-bold text-muted" style="font-size: 0.85rem;">ส</div>
                </div>

                <!-- Custom Grid Container -->
                <div id="qaCustomCalendarGrid" class="qa-custom-grid flex-fill" style="overflow-y: auto; min-height: 0;">
                    <!-- Grid cells rendered via JS -->
                </div>

            </div>
        </div>
        
        <!-- Sidebar: Unscheduled / Pending Jobs (Now on Right) -->
        <div class="col-lg-3 bg-light d-flex flex-column h-100" id="qaCalendarSidebar">
            <div class="p-3 border-bottom bg-white d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-bold text-primary"><i class="fas fa-list-ul me-2"></i>Pending Jobs</h6>
                <span class="badge bg-secondary rounded-pill" id="pendingJobsCount">0</span>
            </div>
            <div class="p-2 border-bottom bg-white">
                 <div class="input-group input-group-sm">
                     <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                     <input type="text" class="form-control border-start-0 bg-light" id="searchPendingJobs" placeholder="Search PO..." onkeyup="filterPendingJobs(this.value)">
                 </div>
            </div>
            <div class="flex-fill overflow-auto p-2" id="pendingJobsList" style="background-color: #f8f9fa;">
                <div class="text-center py-4 text-muted small">Loading...</div>
            </div>
        </div>
    </div>
</div>
