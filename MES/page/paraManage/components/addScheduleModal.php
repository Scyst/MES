<div class="modal" id="addScheduleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title">Add New Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addScheduleForm">
                    <div class="mb-3">
                        <label for="addScheduleLine" class="form-label">Line:</label>
                        <input type="text" id="addScheduleLine" name="line" class="form-control text-uppercase" placeholder="Enter Line" required list="lineDatalist">
                        <datalist id="lineDatalist"></datalist>
                    </div>
                    <div class="mb-3">
                        <label for="addScheduleShiftName" class="form-label">Shift Name:</label>
                        <select id="addScheduleShiftName" name="shift_name" class="form-select" required>
                            <option value="DAY">DAY</option>
                            <option value="NIGHT">NIGHT</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="addScheduleStartTime" class="form-label">Start Time:</label>
                            <input type="time" id="addScheduleStartTime" name="start_time" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="addScheduleEndTime" class="form-label">End Time:</label>
                            <input type="time" id="addScheduleEndTime" name="end_time" class="form-control" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="addScheduleBreakMinutes" class="form-label">Planned Break (minutes):</label>
                        <input type="number" id="addScheduleBreakMinutes" name="planned_break_minutes" class="form-control" placeholder="e.g., 60" required>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="addScheduleIsActive" name="is_active" value="1" checked>
                        <label class="form-check-label" for="addScheduleIsActive">
                            Is Active
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="addScheduleForm" class="btn btn-success">Add Schedule</button>
            </div>
        </div>
    </div>
</div>