<?php
// e:\MES\MES\MES\page\PE\card_print.php
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
    <title>Print Safety Cards</title>
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

        /* Print & Preview Styles */
        .cg-page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 0 auto 30px;
            padding: 13.5mm 19.4mm;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            position: relative;
            box-sizing: border-box;
        }

        .cg-cards-grid {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-auto-rows: 54mm;
            gap: 0;
            justify-content: center;
            align-content: start;
        }

        .cg-card-container {
            width: 85.6mm;
            height: 54mm;
            box-sizing: border-box;
            display: flex;
            overflow: hidden;
            background: white;
            page-break-inside: avoid;
            position: relative;
            /* Subtle outline for cutting guide, printed as well */
            outline: 1px dashed #cbd5e1;
            outline-offset: -1px;
        }

        /* Status Cards */
        .cg-card-status { flex: 1; display: flex; flex-direction: row; justify-content: center; align-items: center; color: white; padding: 10px; }
        .cg-card-status i { font-size: 38pt; margin-right: 18px; }
        .cg-card-status-text { display: flex; flex-direction: column; align-items: flex-start; }
        .cg-card-status-text h2 { font-size: 24pt; font-weight: 800; margin: 0; line-height: 1.1; letter-spacing: -0.5px; }
        .cg-card-status-text p { font-size: 12pt; margin-top: 5px; font-weight: 600; opacity: 0.95; margin-bottom:0; letter-spacing: 1px; }
        .cg-status-green { background: #10b981; }
        .cg-status-yellow { background: #f59e0b; color: #1e293b !important; }
        .cg-status-red { background: #ef4444; }

        /* Operator Card */
        .cg-card-operator { flex: 1; display: flex; border: 2px solid #2563eb; background: #fff; }
        .cg-op-left { width: 35mm; background: #f8fafc; border-right: 2px solid #2563eb; display: flex; flex-direction: column; align-items: center; }
        .cg-op-header { background: #2563eb; color: white; width: 100%; text-align: center; padding: 4px 0; font-weight: 700; font-size: 9pt; letter-spacing: 0.5px; }
        .cg-op-photo { flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #e2e8f0; }
        .cg-op-photo img { width: 100%; height: 100%; object-fit: cover; }
        .cg-op-photo i { font-size: 32pt; color: #94a3b8; }
        .cg-op-right { flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: center; }
        .cg-op-line { border-bottom: 1.5px dotted #94a3b8; margin-bottom: 10px; padding-bottom: 2px; color: #0f172a; font-size: 10pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cg-op-line-label { color: #64748b; font-weight: 500; font-size: 8pt; display: block; margin-bottom: 2px; border: none; padding: 0; }

        /* LOTO Card */
        .cg-card-loto { flex: 1; display: flex; flex-direction: column; border: 4px solid #ef4444; background: #fff; }
        .cg-loto-header { background: #f59e0b; color: #ef4444; text-align: center; padding: 6px; font-weight: 900; font-size: 14pt; line-height: 1; border-bottom: 3px solid #ef4444; letter-spacing: 1px; }
        .cg-loto-body { display: flex; flex: 1; }
        .cg-loto-left { width: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 3px dashed #ef4444; background: #fef2f2; }
        .cg-loto-icon { font-size: 28pt; color: #ef4444; margin-bottom: 5px; }
        .cg-loto-danger { background: #ef4444; color: white; text-align: center; font-weight: 800; padding: 3px 8px; font-size: 10pt; margin-top: 5px; border-radius: 4px; }
        .cg-loto-right { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; justify-content: center; }
        .cg-loto-line { border-bottom: 1.5px dotted #ef4444; margin-bottom: 12px; padding-bottom: 3px; color: #ef4444; font-weight: 800; font-size: 11pt; }

        @media print {
            body { 
                background: white !important; 
                padding: 0 !important; 
                margin: 0 !important; 
            }
            .print-controls { 
                display: none !important; 
            }
            .cg-page { 
                margin: 0 !important; 
                box-shadow: none !important; 
                page-break-after: always;
            }
            .cg-page:last-child {
                page-break-after: avoid;
            }
            @page {
                size: A4 portrait;
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
            <h4 class="mb-0 text-primary"><i class="fas fa-print"></i> Safety Cards Print Mode</h4>
            <p class="text-muted mb-0" id="cardCountText">Loading cards...</p>
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

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const dataStr = localStorage.getItem('print_cards_data');
            const container = document.getElementById('printContainer');
            const countText = document.getElementById('cardCountText');

            if (!dataStr) {
                container.innerHTML = '<div class="alert alert-danger m-3">No cards found in queue. Please add cards from the dashboard.</div>';
                countText.innerText = '0 cards';
                return;
            }

            try {
                const cardQueue = JSON.parse(dataStr);
                countText.innerText = `${cardQueue.length} cards queued`;

                let html = '';
                const chunkSize = 10;
                
                for (let i = 0; i < cardQueue.length; i += chunkSize) {
                    const chunk = cardQueue.slice(i, i + chunkSize);
                    html += `<div class="cg-page"><div class="cg-cards-grid">`;
                    chunk.forEach(card => {
                        html += `<div class="cg-card-container">${card.html}</div>`;
                    });
                    html += `</div></div>`;
                }

                container.innerHTML = html;

                // Auto print
                setTimeout(() => {
                    window.print();
                }, 500);

            } catch (err) {
                console.error("Error parsing print data", err);
                container.innerHTML = '<div class="alert alert-danger m-3">Error rendering cards.</div>';
            }
        });
        
        window.addEventListener('afterprint', () => {
            // Optional: You can uncomment to auto close after print dialog
            // window.close(); 
        });
    </script>
</body>
</html>
