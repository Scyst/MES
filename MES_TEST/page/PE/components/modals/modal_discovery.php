<!-- modal_discovery.php -->
<div class="modal fade pe-modal" id="discoveryModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-satellite-dish" style="color:var(--pe-primary);"></i> IIoT Discovery & Mapping</h5>
                <button type="button" class="btn-close" onclick="MachineModule.closeDiscoveryModal()"></button>
            </div>
            <div class="modal-body p-0">
                <div style="padding: 16px; background: rgba(var(--pe-primary-rgb), 0.05); border-bottom: 1px solid #e2e8f0;">
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="text-muted mb-0" style="font-size:13px;">ระบบจะดักจับข้อมูลทั้งหมดที่ส่งเข้ามายังเซิร์ฟเวอร์แบบ Real-time</p>
                        <button class="pe-btn pe-btn-sm pe-btn-secondary" onclick="MachineModule.loadDiscovery()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <div style="max-height: 500px; overflow-y: auto;">
                    <table class="pe-table" id="discoveryTable">
                        <thead>
                            <tr>
                                <th>Topic / Identifier</th>
                                <th>Status</th>
                                <th>Mapped Machine</th>
                                <th>Last Seen</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="discoveryTableBody">
                            <tr><td colspan="6" class="text-center text-muted" style="padding:40px;">Loading discovery data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Raw Data View Modal (Nested) -->
<div class="modal fade pe-modal" id="discoveryRawModal" tabindex="-1" style="z-index: 1060;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-code"></i> Raw Payload</h5>
                <button type="button" class="btn-close" onclick="MachineModule.closeDiscoveryRawModal()"></button>
            </div>
            <div class="modal-body">
                <pre id="discoveryRawPre" style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; overflow-x: auto; max-height: 400px; font-family: monospace; font-size: 13px;"></pre>
            </div>
        </div>
    </div>
</div>
