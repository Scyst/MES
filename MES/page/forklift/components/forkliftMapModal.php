<div class="modal fade" id="apZoneModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white py-2">
                <h6 class="modal-title fw-bold"><i class="fas fa-fingerprint me-2"></i>Map Zone (True Fingerprint)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="apZoneForm">
                    <input type="hidden" name="action" value="save_zone">
                    
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="form-label small fw-bold">Grid Name</label>
                            <input type="text" class="form-control form-control-sm bg-light text-primary fw-bold" id="zone_name" name="zone_name" readonly>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold">พิกัด X</label>
                            <input type="number" class="form-control form-control-sm bg-light" id="zone_svg_x" name="svg_x" readonly>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold">พิกัด Y</label>
                            <input type="number" class="form-control form-control-sm bg-light" id="zone_svg_y" name="svg_y" readonly>
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-8">
                            <label class="form-label small fw-bold text-primary">BSSID #1 (แรงสุด) <span class="text-danger">*</span></label>
                            <input type="text" class="form-control form-control-sm border-primary" id="zone_bssid_1" name="bssid_1" placeholder="MAC Address" required>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-primary">RSSI #1</label>
                            <input type="number" class="form-control form-control-sm border-primary" id="zone_rssi_1" name="rssi_1" placeholder="เช่น -45" required>
                        </div>
                    </div>
                    
                    <div class="row g-2 mb-2">
                        <div class="col-8">
                            <label class="form-label small fw-bold text-muted">BSSID #2</label>
                            <input type="text" class="form-control form-control-sm" id="zone_bssid_2" name="bssid_2" placeholder="Optional">
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted">RSSI #2</label>
                            <input type="number" class="form-control form-control-sm" id="zone_rssi_2" name="rssi_2" placeholder="เช่น -52">
                        </div>
                    </div>

                    <div class="row g-2 mb-2">
                        <div class="col-8">
                            <label class="form-label small fw-bold text-muted">BSSID #3</label>
                            <input type="text" class="form-control form-control-sm" id="zone_bssid_3" name="bssid_3" placeholder="Optional">
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted">RSSI #3</label>
                            <input type="number" class="form-control form-control-sm" id="zone_rssi_3" name="rssi_3" placeholder="เช่น -60">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer py-1 border-0 bg-light">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary fw-bold" onclick="saveApZone()">
                    <i class="fas fa-save me-1"></i> บันทึกข้อมูล
                </button>
            </div>
        </div>
    </div>
</div>