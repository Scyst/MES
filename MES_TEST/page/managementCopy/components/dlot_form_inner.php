<div class="d-flex justify-content-between align-items-center mb-3">
    <h6 class="mb-0 fw-bold text-secondary"><i class="fas fa-coins me-2 text-warning"></i>Daily Labor Cost</h6>
    <button type="button" class="btn-close" aria-label="Close" id="btnCloseDlot" onclick="switchToCalendarView()"></button>
</div>

<div class="alert alert-light border small text-muted mb-3">
    <i class="fas fa-info-circle me-1"></i> 
    บันทึกค่าแรงและจำนวนคนสำหรับคำนวณต้นทุนการผลิตรายวัน
</div>

<form id="dlot-entry-form">
    <div class="mb-3">
        <label for="dlot-entry-date" class="form-label small text-muted fw-bold text-uppercase">Selected Date</label>
        <input type="date" class="form-control form-control-sm bg-light fw-bold text-dark" id="dlot-entry-date" readonly>
    </div>

    <div class="mb-3">
        <label class="form-label small text-muted fw-bold text-uppercase">Cost Breakdown</label>
        
        <div class="input-group input-group-sm mb-2">
            <span class="input-group-text bg-white text-secondary" style="width: 110px;">Headcount</span>
            <input type="number" class="form-control text-end font-monospace" id="dlot-headcount" placeholder="0" min="0" step="1">
            <span class="input-group-text bg-light text-muted">Person</span>
        </div>

        <div class="input-group input-group-sm mb-2">
            <span class="input-group-text bg-white text-secondary" style="width: 110px;">DL Cost</span>
            <input type="number" class="form-control text-end font-monospace" id="dlot-dl-cost" placeholder="0.00" min="0" step="0.01">
            <span class="input-group-text bg-light text-muted">THB</span>
        </div>

        <div class="input-group input-group-sm mb-2">
            <span class="input-group-text bg-white text-secondary" style="width: 110px;">OT Cost</span>
            <input type="number" class="form-control text-end font-monospace" id="dlot-ot-cost" placeholder="0.00" min="0" step="0.01">
            <span class="input-group-text bg-light text-muted">THB</span>
        </div>
    </div>

    <hr class="border-secondary border-opacity-10 my-3">

    <div class="d-grid gap-2">
        <button type="button" class="btn btn-outline-warning btn-sm text-dark fw-bold" onclick="autoCalculateDlotFromManpower()">
            <i class="fas fa-magic me-1"></i> Auto from Manpower
        </button>
        <button type="submit" class="btn btn-primary btn-sm fw-bold">
            <i class="fas fa-save me-1"></i> Save Daily Cost
        </button>
    </div>
</form>