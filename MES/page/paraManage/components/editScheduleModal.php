<div class="modal" id="editScheduleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Edit Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editScheduleForm">
                    <input type="hidden" id="editScheduleId" name="id">
                    <div class="mb-3">
                        <label for="editScheduleLine" class="form-label">Line:</label>
                        <input type="text" id="editScheduleLine" name="line" class="form-control text-uppercase" required list="lineDatalist">
                    </div>
                    <div class="mb-3">
                        <label for="editScheduleShiftName" class="form-label">Shift Name:</label>
                        <select id="editScheduleShiftName" name="shift_name" class="form-select" required>
                            <option value="DAY">DAY</option>
                            <option value="NIGHT">NIGHT</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="editScheduleStartTime" class="form-label">Start Time:</label>
                            <input type="time" id="editScheduleStartTime" name="start_time" class="form-control" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="editScheduleEndTime" class="form-label">End Time:</label>
                            <input type="time" id="editScheduleEndTime" name="end_time" class="form-control" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="editScheduleBreakMinutes" class="form-label">Planned Break (minutes):</label>
                        <input type="number" id="editScheduleBreakMinutes" name="planned_break_minutes" class="form-control" placeholder="e.g., 60" required>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="editScheduleIsActive" name="is_active" value="1">
                        <label class="form-check-label" for="editScheduleIsActive">
                            Is Active
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" form="editScheduleForm" class="btn btn-warning">Save Changes</button>
            </div>
        </div>
    </div>
</div>