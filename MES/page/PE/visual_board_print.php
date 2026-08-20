<?php
// e:\MES\MES\MES\page\PE\visual_board_print.php
session_start();
if (!isset($_SESSION['user'])) {
    header("Location: ../../index.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print Safety Boards</title>
    <!-- Basic Bootstrap for utility classes (matches dashboard) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            background: #f1f5f9;
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .print-controls {
            background: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .vb-page {
            width: 297mm;
            height: 210mm;
            background: white;
            margin: 0 auto 30px auto;
            padding: 10mm 15mm;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        
        .vb-board-header {
            text-align: center;
            border-bottom: 4px solid #dc3545; /* var(--pe-danger) */
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .vb-board-title {
            font-size: 20pt;
            font-weight: 900;
            color: #212529;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .vb-board-subtitle {
            font-size: 12pt;
            color: #6c757d;
            font-weight: 700;
        }
        
        .vb-top-section {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .vb-machine-info {
            flex: 2;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 15px 25px;
            border: 2px dashed #ced4da;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .vb-machine-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .vb-machine-code {
            font-size: 38pt;
            font-weight: 900;
            color: #dc3545;
            line-height: 1;
        }
        .vb-machine-name {
            font-size: 16pt;
            font-weight: bold;
            color: #343a40;
            margin-top: 5px;
        }
        
        .vb-machine-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 15px;
            margin-top: 10px;
            font-size: 11pt;
            font-weight: 600;
            background: white;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #e9ecef;
        }
        .vb-detail-item span {
            color: #6c757d;
            font-weight: 500;
            font-size: 10pt;
            display: block;
        }
        
        .vb-qr-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #fff5f5;
            border-radius: 15px;
            border: 2px solid #ffc107; /* var(--pe-warning) */
            padding: 15px;
            text-align: center;
        }
        .vb-qr-code-box {
            border: 4px solid #dc3545;
            padding: 10px;
            border-radius: 10px;
            background: #fff;
            margin-bottom: 5px;
        }
        .vb-qr-text h4 {
            font-weight: 900;
            color: #dc3545;
            font-size: 18pt;
            margin-bottom: 0;
        }
        
        .vb-cards-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            flex: 1;
        }
        .vb-card-slot {
            border: 3px dashed #adb5bd;
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
        }
        .vb-slot-title {
            position: absolute;
            top: -12px;
            background: white;
            padding: 0 15px;
            font-weight: 900;
            font-size: 13pt;
            color: #495057;
        }
        .vb-slot-icon {
            font-size: 35pt;
            color: #ced4da;
            margin-bottom: 5px;
        }
        .vb-slot-desc {
            font-size: 10pt;
            color: #adb5bd;
            font-weight: 600;
        }

        @media print {
            body { 
                background: white !important; 
                padding: 0 !important; 
                margin: 0 !important; 
            }
            .print-controls { 
                display: none !important; 
            }
            .vb-page { 
                margin: 0 !important; 
                box-shadow: none !important; 
                page-break-after: always;
            }
            .vb-page:last-child {
                page-break-after: avoid;
            }
            @page {
                size: A4 landscape;
                margin: 0;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>

    <div class="print-controls">
        <div>
            <h4 class="mb-0 text-primary"><i class="fas fa-print"></i> Safety Boards Print Mode</h4>
            <p class="text-muted mb-0" id="boardCountText">Loading boards...</p>
        </div>
        <div>
            <button class="btn btn-secondary me-2" onclick="window.close()">
                <i class="fas fa-times"></i> ปิดหน้านี้
            </button>
            <button class="btn btn-primary btn-lg" onclick="window.print()">
                <i class="fas fa-print"></i> สั่งพิมพ์ทันที
            </button>
        </div>
    </div>

    <div id="printContainer"></div>

    <script src="../../utils/libs/qrcode.min.js"></script>
    <script>
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        document.addEventListener('DOMContentLoaded', () => {
            const dataStr = localStorage.getItem('print_machines_data');
            const container = document.getElementById('printContainer');
            const countText = document.getElementById('boardCountText');

            if (!dataStr) {
                container.innerHTML = '<div class="alert alert-danger m-3">No machine data found. Please select machines from the dashboard.</div>';
                countText.innerText = '0 boards selected';
                return;
            }

            try {
                const machines = JSON.parse(dataStr);
                countText.innerText = `${machines.length} boards selected`;

                let html = '';
                const hazardUrlBase = `${window.location.origin}/MES/MES/page/PE/quick_hazard_report.php?machine_code=`;

                machines.forEach((m, index) => {
                    const installDateStr = m.install_date ? new Date(m.install_date).toLocaleDateString('en-GB') : '-';
                    const machineUrl = hazardUrlBase + encodeURIComponent(m.machine_code);

                    html += `
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
                    
                    // Auto print after a brief delay to ensure QRCodes are rendered
                    setTimeout(() => {
                        window.print();
                    }, 500);

                }, 100);

            } catch (err) {
                console.error("Error parsing print data", err);
                container.innerHTML = '<div class="alert alert-danger m-3">Error rendering boards.</div>';
            }
        });
        
        // Close window after printing
        window.addEventListener('afterprint', () => {
            // Optional: You can remove the comment below if users want it to close immediately
            // window.close(); 
        });
    </script>
</body>
</html>
