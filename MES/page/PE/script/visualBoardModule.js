// e:\MES\MES\MES\page\PE\script\visualBoardModule.js
const VisualBoardModule = (function() {
    let machines = [];
    let lines = [];
    
    // Config from PHP session/init
    const BASE_URL = window.location.origin + '/MES/MES'; // Adjust if needed
    
    async function loadData() {
        try {
            const container = document.getElementById('vbPreviewContainer');
            container.innerHTML = `<div class="text-center text-muted" style="margin-top: 100px;"><i class="fas fa-spinner fa-spin fa-3x mb-3"></i><h5>Loading...</h5></div>`;
            
            // Fetch machines from API
            const response = await fetch(`${PE_CONFIG.apiBase}machineAPI.php?action=get_machines`, {
                headers: { 'X-CSRF-Token': PE_CONFIG.csrfToken }
            });
            const result = await response.json();
            
            if (result.success) {
                machines = result.data.machines || [];
                
                // Extract unique lines for filter
                lines = [...new Set(machines.map(m => m.line).filter(l => l))].sort();
                
                populateFilter();
                renderBoards();
            } else {
                Swal.fire('Error', result.message || 'Failed to load machines', 'error');
            }
        } catch (error) {
            console.error('Error loading visual boards:', error);
            Swal.fire('Error', 'Connection error while loading visual boards.', 'error');
        }
    }
    
    function populateFilter() {
        const select = document.getElementById('vbLineFilter');
        const currentVal = select.value;
        
        let html = `<option value="">-- All Lines --</option>`;
        lines.forEach(line => {
            html += `<option value="${line}">${line}</option>`;
        });
        
        select.innerHTML = html;
        select.value = currentVal; // Restore selection if any
    }
    
    function renderBoards() {
        const container = document.getElementById('vbPreviewContainer');
        const filterLine = document.getElementById('vbLineFilter').value;
        const countText = document.getElementById('vbPrintCountText');
        
        let filtered = machines;
        if (filterLine) {
            filtered = machines.filter(m => m.line === filterLine);
        }
        
        countText.innerText = filtered.length;
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted" style="margin-top: 100px;">
                    <i class="fas fa-clipboard-list fa-4x mb-3 opacity-25"></i>
                    <h5>ไม่มีข้อมูลเครื่องจักร</h5>
                </div>`;
            return;
        }
        
        let html = '';
        const hazardUrlBase = `${window.location.origin}/MES/MES/page/PE/quick_hazard_report.php?machine_code=`;
        
        filtered.forEach((m, index) => {
            const installDateStr = m.install_date ? new Date(m.install_date).toLocaleDateString('en-GB') : '-';
            const machineUrl = hazardUrlBase + encodeURIComponent(m.machine_code);
            
            html += `
            <div class="vb-preview-page">
                <div class="vb-page">
                    <div class="vb-board-header">
                        <div class="vb-board-subtitle">SNC FORMER PUBLIC COMPANY LIMITED</div>
                        <div class="vb-board-title">Machine Safety & Status Board</div>
                    </div>
                    
                    <div class="vb-top-section">
                        <div class="vb-machine-info">
                            <div class="vb-machine-header">
                                <div>
                                    <div class="vb-machine-code">${escapeHtml(m.machine_code)}</div>
                                    <div class="vb-machine-name">${escapeHtml(m.machine_name)}</div>
                                </div>
                                <div>
                                    <span class="badge bg-secondary fs-4 py-2 px-3">${escapeHtml(m.line || '-')}</span>
                                </div>
                            </div>
                            
                            <div class="vb-machine-details">
                                <div class="vb-detail-item">
                                    <span>ประเภทเครื่อง (Type)</span>
                                    ${escapeHtml(m.machine_type || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>ผู้ผลิต (Manufacturer)</span>
                                    ${escapeHtml(m.manufacturer || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>รุ่น (Model)</span>
                                    ${escapeHtml(m.model || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>หมายเลขเครื่อง (Serial / Asset No)</span>
                                    ${escapeHtml(m.serial_number || m.asset_no || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>ความสำคัญ (Criticality)</span>
                                    ${escapeHtml(m.criticality || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>พื้นที่ (Area)</span>
                                    ${escapeHtml(m.area || '-')}
                                </div>
                                <div class="vb-detail-item">
                                    <span>วันที่ติดตั้ง (Install Date)</span>
                                    ${installDateStr}
                                </div>
                            </div>
                        </div>
                        
                        <div class="vb-qr-section">
                            <div class="vb-qr-text mb-2">
                                <h4><i class="fas fa-qrcode"></i> สแกนแจ้งปัญหา</h4>
                            </div>
                            <div class="vb-qr-code-box">
                                <div id="vb_qrcode_${index}" class="qrcode-render" data-url="${escapeHtml(machineUrl)}"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vb-cards-section">
                        <div class="vb-card-slot border-danger" style="background-color: #fff5f5;">
                            <div class="vb-slot-title text-danger">สถานะ (Status)</div>
                            <i class="fas fa-traffic-light vb-slot-icon text-danger opacity-50"></i>
                            <div class="vb-slot-desc">🟢 ปกติ | 🟡 ระวัง | 🔴 หยุดเครื่อง</div>
                        </div>
                        
                        <div class="vb-card-slot border-primary" style="background-color: #f0f7ff;">
                            <div class="vb-slot-title text-primary">พนักงานคุมเครื่อง (Operator)</div>
                            <i class="fas fa-id-badge vb-slot-icon text-primary opacity-50"></i>
                            <div class="vb-slot-desc">Operator ID Card</div>
                        </div>
                        
                        <div class="vb-card-slot border-warning" style="background-color: #fffdf0;">
                            <div class="vb-slot-title text-warning text-dark">ช่างซ่อมบำรุง (LOTO)</div>
                            <i class="fas fa-tools vb-slot-icon text-warning opacity-50"></i>
                            <div class="vb-slot-desc">Mechanic / LOTO Card</div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Render QR Codes
        setTimeout(() => {
            const qrElements = document.querySelectorAll('.qrcode-render');
            qrElements.forEach(el => {
                const url = el.getAttribute('data-url');
                new QRCode(el, {
                    text: url,
                    width: 200,
                    height: 200,
                    colorDark : "#dc3545",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.M
                });
            });
        }, 100);
    }
    
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    return {
        loadData
    };
})();

// Auto load if this tab is active initially
document.addEventListener('DOMContentLoaded', () => {
    // If we're using a central tab manager, we can hook into it.
    // Since peDashboard triggers initialization on tab switch, we expose the object globally.
    window.VisualBoardModule = VisualBoardModule;
});
