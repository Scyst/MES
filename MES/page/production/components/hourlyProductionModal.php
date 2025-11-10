<div class="modal fade" id="hourlyProductionModal" tabindex="-1" aria-labelledby="hourlyProductionModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="hourlyProductionModalLabel">Hourly Production Counts</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p class="text-muted" id="hourly-production-subtitle">
                    กำลังโหลดข้อมูล...
                </p>
                
                <nav class="mb-3">
                    <div class="nav nav-pills" id="hourly-production-nav" role="tablist">
                        </div>
                </nav>
                
                <div class="table-responsive" style="max-height: 60vh;">
                    <table class="table table-striped table-hover table-sm table-bordered" id="hourly-production-table" style="table-layout: fixed;">
                        <thead class="table-dark sticky-top" id="hourly-production-thead">
                            </thead>
                        <tbody id="hourly-production-tbody">
                            </tbody>
                        <tfoot class="table-light sticky-bottom" id="hourly-production-tfoot">
                            </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>