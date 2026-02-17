<?php
// MES/page/autoInvoice/print_pl.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';

$invoice_id = $_GET['id'] ?? 0;

try {
    // 1. ดึงข้อมูล Header
    $stmt = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICES WHERE id = ?");
    $stmt->execute([$invoice_id]);
    $header = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$header) {
        die("Invoice not found.");
    }

    $customer = json_decode($header['customer_data_json'], true) ?: [];
    $shipping = json_decode($header['shipping_data_json'], true) ?: [];

    // 2. ดึงข้อมูล Details
    $stmtDetails = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICE_DETAILS WHERE invoice_id = ? ORDER BY detail_id ASC");
    $stmtDetails->execute([$invoice_id]);
    $details = $stmtDetails->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    die("Database Error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Packing List - <?= htmlspecialchars($header['invoice_no']) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        /* ตั้งค่ากระดาษ A4 */
        body { background: #525659; margin: 0; padding: 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; }
        .a4-page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: auto;
            padding: 15mm 15mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            position: relative;
            color: #000;
        }
        
        .doc-title { font-size: 22px; font-weight: bold; text-align: center; text-decoration: underline; margin-bottom: 20px; letter-spacing: 1px; }
        
        table.border-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.border-table td { border: 1px solid #000; padding: 6px 10px; vertical-align: top; }
        
        .lbl { font-weight: bold; font-size: 11px; display: block; margin-bottom: 2px; text-decoration: underline; }
        .val { font-size: 12px; white-space: pre-line; }

        /* ตาราง PL จะคอลัมน์เยอะกว่า CI */
        table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.items-table th, table.items-table td { border: 1px solid #000; padding: 6px; vertical-align: top; }
        table.items-table th { text-align: center; font-size: 11px; background-color: #f8f9fa; }
        
        .text-end { text-align: right; }
        .text-center { text-align: center; }
        .fw-bold { font-weight: bold; }
        
        .signature-box { margin-top: 50px; text-align: right; padding-right: 30px; }
        
        @media print {
            body { background: none; margin: 0; padding: 0; }
            .a4-page { width: 100%; min-height: auto; margin: 0; padding: 0; box-shadow: none; border: none; }
            @page { size: A4 portrait; margin: 10mm; }
        }
    </style>
</head>
<body>

<div class="a4-page">
    
    <div class="doc-title">PACKING LIST</div>

    <table class="border-table">
        <tr>
            <td style="width: 50%;">
                <span class="lbl">CUSTOMER NAME :</span>
                <span class="val fw-bold"><?= htmlspecialchars($customer['name'] ?? '-') ?></span>
            </td>
            <td style="width: 50%;">
                <table style="width: 100%; border: none;">
                    <tr>
                        <td style="border: none; padding: 0 0 5px 0; width: 40%;"><span class="lbl" style="display:inline;">INVOICE NO:</span></td>
                        <td style="border: none; padding: 0 0 5px 0;" class="fw-bold"><?= htmlspecialchars($header['invoice_no']) ?></td>
                    </tr>
                    <tr>
                        <td style="border: none; padding: 0 0 5px 0;"><span class="lbl" style="display:inline;">INVOICE DATE:</span></td>
                        <td style="border: none; padding: 0 0 5px 0;"><?= htmlspecialchars($shipping['invoice_date'] ?? '-') ?></td>
                    </tr>
                    <tr>
                        <td style="border: none; padding: 0;"><span class="lbl" style="display:inline;">CONTAINER QTY:</span></td>
                        <td style="border: none; padding: 0;"><?= htmlspecialchars($shipping['container_qty'] ?? '-') ?></td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td>
                <span class="lbl">CONSIGNEE :</span>
                <span class="val"><?= htmlspecialchars(str_replace('CONSIGNEE :-', '', $customer['consignee'] ?? '-')) ?></span>
            </td>
            <td>
                <span class="lbl">INCOTERMS:</span>
                <span class="val"><?= htmlspecialchars($customer['incoterms'] ?? '-') ?></span>
            </td>
        </tr>
    </table>

    <table class="border-table">
        <tr>
            <td style="width: 50%;">
                <span class="lbl">FEEDER VESSEL:</span>
                <span class="val"><?= htmlspecialchars($shipping['feeder_vessel'] ?? '-') ?></span>
            </td>
            <td style="width: 50%;">
                <span class="lbl">MOTHER VESSEL:</span>
                <span class="val"><?= htmlspecialchars($shipping['mother_vessel'] ?? '-') ?></span>
            </td>
        </tr>
        <tr>
            <td>
                <span class="lbl">PORT OF DISCHARGE:</span>
                <span class="val"><?= htmlspecialchars($shipping['port_discharge'] ?? '-') ?></span>
            </td>
            <td>
                <table style="width: 100%; border: none;">
                    <tr>
                        <td style="border: none; padding: 0; width: 50%;"><span class="lbl" style="display:inline;">ETD DATE:</span> <?= htmlspecialchars($shipping['etd_date'] ?? '-') ?></td>
                        <td style="border: none; padding: 0;"><span class="lbl" style="display:inline;">ETA DATE:</span> <?= htmlspecialchars($shipping['eta_date'] ?? '-') ?></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 15%;">SHIPPING MARKS</th>
                <th style="width: 10%;">CARTON NO.</th>
                <th style="width: 33%;">DESCRIPTION</th>
                <th style="width: 9%;">QTY<br>(CTN)</th>
                <th style="width: 11%;">N.W<br>(KGS)</th>
                <th style="width: 11%;">G.W<br>(KGS)</th>
                <th style="width: 11%;">MEASUREMENT<br>(CBM)</th>
            </tr>
        </thead>
        <tbody>
            <?php 
            $sumQty = 0;
            $sumNW = 0;
            $sumGW = 0;
            $sumCBM = 0;
            foreach ($details as $row): 
                $sumQty += $row['qty_carton'];
                $sumNW += $row['net_weight'];
                $sumGW += $row['gross_weight'];
                $sumCBM += $row['cbm'];
            ?>
            <tr>
                <td><?= nl2br(htmlspecialchars($row['shipping_marks'])) ?></td>
                <td class="text-center"><?= htmlspecialchars($row['carton_no']) ?></td>
                <td>
                    <b><?= htmlspecialchars($row['sku']) ?></b><br>
                    <?= htmlspecialchars($row['description']) ?><br>
                    <?php if(!empty($row['po_number'])): ?>
                        <span style="font-size: 10px; color: #555;">PO NO: <?= htmlspecialchars($row['po_number']) ?></span>
                    <?php endif; ?>
                </td>
                <td class="text-center"><?= number_format($row['qty_carton'], 0) ?></td>
                <td class="text-end"><?= number_format($row['net_weight'], 2) ?></td>
                <td class="text-end"><?= number_format($row['gross_weight'], 2) ?></td>
                <td class="text-end"><?= number_format($row['cbm'], 3) ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
        <tfoot>
            <tr class="bg-light">
                <td colspan="3" class="text-end fw-bold pe-3">TOTAL:</td>
                <td class="text-center fw-bold"><?= number_format($sumQty, 0) ?></td>
                <td class="text-end fw-bold"><?= number_format($sumNW, 2) ?></td>
                <td class="text-end fw-bold"><?= number_format($sumGW, 2) ?></td>
                <td class="text-end fw-bold" style="text-decoration: underline double;"><?= number_format($sumCBM, 3) ?></td>
            </tr>
        </tfoot>
    </table>

    <table style="width: 100%; border: none; margin-top: 20px;">
        <tr>
            <td style="vertical-align: top; width: 60%;">
                <span class="lbl">CONTAINER NAME / SEAL NO / TARE:</span>
                <span class="val fw-bold">
                    <?= htmlspecialchars($shipping['container_no'] ?? '-') ?> / 
                    <?= htmlspecialchars($shipping['seal_no'] ?? '-') ?> / 
                    <?= htmlspecialchars($shipping['tare'] ?? '-') ?>
                </span>
            </td>
            <td style="vertical-align: top; text-align: right;">
                <div class="signature-box">
                    <p>_____________________________________</p>
                    <p class="fw-bold">AUTHORIZED SIGNATURE</p>
                </div>
            </td>
        </tr>
    </table>

</div>

<script>
    window.onload = function() {
        setTimeout(() => {
            window.print();
        }, 500);
    };
</script>

</body>
</html>