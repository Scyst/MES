<div class="modal fade" id="hourlySummaryModal" tabindex="-1" aria-labelledby="hourlySummaryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="hourlySummaryModalLabel">Hourly Production Summary (OEE)</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p class="text-muted">
                    แสดงผล 24 ชั่วโมงย้อนหลังจากวันที่สิ้นสุด (End Date) ที่คุณเลือกในฟิลเตอร์
                </p>
                <div class="table-responsive" style="max-height: 60vh;">
                    <table class="table table-striped table-hover table-sm">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th class="text-center">Hour</th>
                                <th class="text-end">Availability</th>
                                <th class="text-end">Performance</th>
                                <th class="text-end">Quality</th>
                                <th class="text-end">OEE</th>
                            </tr>
                        </thead>
                        <tbody id="hourlySummaryTableBody">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>