<?php
// MES/page/autoInvoice/print_ci.php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../components/init.php';

$invoice_id = $_GET['id'] ?? 0;

try {
    global $pdo;
    $stmt = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICES WITH (NOLOCK) WHERE id = ?");
    $stmt->execute([$invoice_id]);
    $header = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$header) die("Invoice not found.");

    $customer = json_decode($header['customer_data_json'], true) ?: [];
    $shipping = json_decode($header['shipping_data_json'], true) ?: [];

    $stmtDetails = $pdo->prepare("SELECT * FROM dbo.FINANCE_INVOICE_DETAILS WITH (NOLOCK) WHERE invoice_id = ? ORDER BY detail_id ASC");
    $stmtDetails->execute([$invoice_id]);
    $details = $stmtDetails->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    die("Database Error: " . $e->getMessage());
}

// Helper: Convert Number to Words (USD)
function numberToWordsUsd($num) {
    $f = new NumberFormatter("en", NumberFormatter::SPELLOUT);
    $num = round($num, 2);
    $parts = explode('.', number_format($num, 2, '.', ''));
    $dollars = intval($parts[0]);
    $cents = intval($parts[1]);
    
    $words = strtoupper($f->format($dollars)) . " USD";
    if ($cents > 0) {
        $words .= " AND " . strtoupper($f->format($cents)) . " CENTS";
    }
    return str_replace('-', ' ', $words);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Commercial Invoice - <?= htmlspecialchars($header['invoice_no']) ?></title>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <style>
        /* Reset & Base */
        body { 
            font-family: 'Arial', Helvetica, sans-serif; 
            font-size: 10px; 
            background: #525659; 
            margin: 0; 
            padding: 20px 0; 
            color: #000; 
            -webkit-print-color-adjust: exact !important; /* บังคับให้สีและกรอบพิมพ์ออกมาเหมือนหน้าจอเป๊ะ */
            print-color-adjust: exact !important;
        }
        * { box-sizing: border-box; }
        
        /* A4 Page Setup */
        .a4-page { 
            width: 210mm; 
            min-height: 297mm; 
            background: white; 
            margin: auto; 
            padding: 12mm 15mm; 
            box-shadow: 0 0 10px rgba(0,0,0,0.5); 
            position: relative; 
            line-height: 1.3; /* ล็อคระยะห่างบรรทัดให้หน้าเว็บกับตอนพิมพ์เท่ากัน ไม่โดน Bootstrap กวน */
        }
        
        /* Typography & Alignment */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .fw-bold { font-weight: bold; }
        .pre-line { white-space: pre-line; }
        
        /* Header Section */
        .company-header { text-align: center; margin-bottom: 20px; line-height: 1.2; font-size: 10px; }
        .company-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.5px; }
        .doc-title { font-size: 18px; font-weight: bold; text-align: center; text-decoration: underline; margin-bottom: 20px; letter-spacing: 1px; }
        
        /* Top Box Table */
        table.border-box-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 10px; border: 1px solid #000; }
        table.border-box-table > tbody > tr > td { padding: 3px 8px; vertical-align: middle; border: 1px solid #000; }
        
        /* Inner Table (ตารางซ้อนด้านในต้องไม่มีเส้นขอบ) */
        table.inner-table { width: 100%; border-collapse: collapse; }
        table.inner-table td { padding: 2px 0; vertical-align: top; border: none !important; }
        .lbl-col { display: inline-block; font-weight: bold; }
        
        /* --------------------------------------------------- */
        /* Items Table (ตารางรายการสินค้า) */
        /* --------------------------------------------------- */
        table.items-table { 
            width: 100%; 
            border-collapse: collapse;
            font-size: 10px; 
            border: 2px solid #000; /* กรอบหนานอกสุด */
        }
        
        table.items-table th { 
            text-align: center; 
            border: 1px solid #000; 
            border-bottom: 2px solid #000;
            padding: 3px 5px; 
            font-weight: bold; 
        }
        
        table.items-table td { 
            border-left: 1px solid #000; 
            border-right: 1px solid #000; 
            padding: 3px 8px; 
        }
        
        /* ลบเส้นแนวนอนด้านในระหว่างแถวสินค้า (ทะลุยาวลงมา) */
        table.items-table tbody tr td { 
            border-bottom: none; 
            border-top: none; 
        }
        
        /* ตีเส้นคั่นเฉพาะคอลัมน์ Qty, Price, Amount เพื่อใส่ยอดรวม */
        table.items-table tr.sub-total-row td:nth-child(3),
        table.items-table tr.sub-total-row td:nth-child(4),
        table.items-table tr.sub-total-row td:nth-child(5) {
            border-top: 1px solid #000; 
            vertical-align: bottom; /* ให้ตัวเลขลงมาเสมอกับขอบล่าง */
            padding-top: 5px;
            padding-bottom: 10px;
        }

        /* แถว Total Amount ล่างสุด ยาวทะลุกรอบ */
        table.items-table tr.total-text-row td { 
            border-top: 1px solid #000; 
            padding: 8px 10px; 
        }
        
        /* เส้นขอบสำหรับแถวพิเศษท้ายตาราง */
        table.items-table tr.total-row td,
        table.items-table tr.footer-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; }
        
        .signature-box { margin-top: 40px; text-align: center; float: right; width: 300px; }
        
        /* Print Settings */
        @media print {
            body { background: none; margin: 0; padding: 0; }
            .a4-page { width: 100%; min-height: auto; margin: 0; padding: 0; box-shadow: none; border: none; }
            @page { size: A4 portrait; margin: 10mm; }
        }
    </style>
</head>
<body>

<div class="a4-page">
    
    <div class="company-header">
        <div style="color: #c00000;" class="company-name">SNC CREATIVITY ANTHOLOGY COMPANY LIMITED</div>
        <div style="color: #002060;">88/11,21-24,28,78,81,87,89,98-99,333,555,777,888,999<br>MOO 2 MAKHAMKOO DISTRICT,<br>AMPHUR NIKOMPATTANA, RAYONG 21180 THAILAND<br>TEL:(038) 026-750-8 FAX:(038) 026-759<br>TAX NO. 0115555018001</div>
    </div>

    <div class="doc-title">COMMERCIAL INVOICE</div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
        <tr>
            <td style="width: 50%; vertical-align: top;">
                <table style="border-collapse: collapse;">
                    <tr>
                        <td class="fw-bold" style="width: 120px; padding-bottom: 4px;">INCOTERMS:</td>
                        <td style="padding-bottom: 4px;"><?= htmlspecialchars($customer['incoterms'] ?? '-') ?></td>
                    </tr>
                    <tr>
                        <td class="fw-bold">PAYMENT TERMS:</td>
                        <td><?= htmlspecialchars($customer['payment_terms'] ?? '-') ?></td>
                    </tr>
                </table>
            </td>
            <td style="width: 50%; vertical-align: top;">
                <table style="border-collapse: collapse;">
                    <tr>
                        <td class="fw-bold" style="width: 130px; padding-bottom: 4px;">INVOICE NO.:</td>
                        <td class="fw-bold" style="background: #ffff99; color: #002060; padding: 1px 4px; margin-bottom: 4px; display: inline-block;">
                            <?= htmlspecialchars($header['invoice_no']) ?>
                        </td>
                    </tr>
                    <tr>
                        <td class="fw-bold">INVOICE DATE:</td>
                        <td><?= htmlspecialchars($shipping['invoice_date'] ?? '-') ?></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div style="border: 2px solid #000;">

        <table class="border-box-table" style="margin-bottom: 0; border: none;">
            <tbody>
                <tr>
                    <td style="width: 50%; vertical-align: middle;">
                        <div class="fw-bold">BY ORDER AND ON ACCOUNT OF MESSRS.</div>
                    </td>
                    <td style="width: 50%; border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">PORT OF LOADING:</span>
                        <span><?= htmlspecialchars($shipping['port_loading'] ?? 'LAEM CHABANG, THAILAND') ?></span>
                    </td>
                </tr>

                <tr>
                    <td rowspan="6" style="width: 50%; vertical-align: top;">
                        <table class="inner-table">
                            <tr>
                                <td class="lbl-col" style="width: 120px;">CUSTOMER NAME:</td>
                                <td class="fw-bold"><?= htmlspecialchars($customer['name'] ?? '-') ?></td>
                            </tr>
                            <tr>
                                <td class="lbl-col">ADDRESS:</td>
                                <td class="pre-line"><?= htmlspecialchars($customer['address'] ?? '-') ?></td>
                            </tr>
                        </table>
                    </td>
                    
                    <td style="border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">PORT OF DISCHARGE:</span>
                        <span><?= htmlspecialchars($shipping['port_discharge'] ?? '-') ?></span>
                    </td>
                </tr>
                <tr>
                    <td style="border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">CONTAINER QTY:</span>
                        <span><?= htmlspecialchars($shipping['container_qty'] ?? '-') ?></span>
                    </td>
                </tr>
                <tr>
                    <td style="border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">ETD DATE:</span>
                        <span><?= htmlspecialchars($shipping['etd_date'] ?? '-') ?></span>
                    </td>
                </tr>
                <tr>
                    <td style="border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">ETA DATE:</span>
                        <span><?= htmlspecialchars($shipping['eta_date'] ?? '-') ?></span>
                    </td>
                </tr>
                <tr>
                    <td style="border-left: 1px solid #000; border-bottom: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">FEEDER VESSEL:</span>
                        <span><?= htmlspecialchars($shipping['feeder_vessel'] ?? '-') ?></span>
                    </td>
                </tr>
                <tr>
                    <td style="border-left: 1px solid #000;">
                        <span class="lbl-col" style="width: 130px;">MOTHER VESSEL:</span>
                        <span><?= htmlspecialchars($shipping['mother_vessel'] ?? '-') ?></span>
                    </td>
                </tr>
            </tbody>
        </table>

        <table class="items-table" style="margin-bottom: 0; border-left: none; border-right: none;">
            <thead>
                <tr style="background: #ffff99;">
                    <th style="width: 15%; border-left: none;">CARTON NO.</th>
                    <th style="width: 45%;">DESCRIPTION</th>
                    <th style="width: 12%;">QUANTITY<br>(CARTON)</th>
                    <th style="width: 14%;">UNIT PRICE<br>(USD)</th>
                    <th style="width: 14%; border-right: none;">AMOUNT PRICE<br>(USD)</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $sumQty = 0; $sumTotal = 0;
                foreach ($details as $index => $row): 
                    $sumQty += $row['qty_carton'];
                    $sumTotal += $row['line_total'];
                ?>
                <tr>
                    <td></td>
                    <td style="color: #ff0702;">
                        <b><?= htmlspecialchars($row['sku']) ?></b><br>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <?php endforeach; ?>
                
                <tr>
                    <td class="text-center pre-line" style="border-left: none;"><?= htmlspecialchars($row['carton_no']) ?></td>
                    <td> 
                        <span class="pre-line"><?= htmlspecialchars($row['description']) ?></span>
                    </td>
                    <td class="text-center"><?= number_format($row['qty_carton'], 0) ?></td>
                    <td class="text-right"><?= number_format($row['unit_price'], 2) ?></td>
                    <td class="text-right fw-bold" style="border-right: none;"><?= number_format($row['line_total'], 2) ?></td>
                </tr>

                <tr>
                    <td style="border-left: none;"></td>
                    <td style="padding-bottom: 2px;">
                        1ST,CONTAINER NO. <?= htmlspecialchars($shipping['container_no'] ?? '-') ?> SEAL NO <?= htmlspecialchars($shipping['seal_no'] ?? '-') ?>
                    </td>
                    <td></td>
                    <td></td>
                    <td style="border-right: none;"></td>
                </tr>

                <tr class="sub-total-row">
                    <td style="border-left: none;"></td>
                    <td style="padding-bottom: 5px; color: #0d1adf;">
                        "ORIGIN OF GOODS: THAILAND"
                    </td>
                    
                    <td class="text-center fw-bold" style="padding-bottom: 5px;"><?= number_format($sumQty, 0) ?></td>
                    <td style="padding-bottom: 5px;"></td>
                    <td class="text-right fw-bold" style="text-decoration: underline double; text-underline-offset: 3px; border-right: none; padding-bottom: 5px;">
                        <?= number_format($sumTotal, 2) ?>
                    </td>
                </tr>

                <tr class="total-text-row bg-light">
                    <td colspan="5" style="border-left: none; border-right: none;">
                        <span class="fw-bold">TOTAL AMOUNT:</span> &nbsp;&nbsp;&nbsp; <?= numberToWordsUsd($sumTotal) ?>
                    </td>
                </tr>
            </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; border-bottom: 1px solid #000; margin-bottom: 0;">
            <tr>
                <td style="padding: 10px 15px;">
                    <div class="fw-bold" style="margin-bottom: 3px;">
                        CURRENCY: US DOLLAR:    USD
                    </div>
                    
                    <table style="border-collapse: collapse;">
                        <tr>
                            <td class="fw-bold" style="padding-bottom: 3px; padding-right: 30px; vertical-align: top;">PURCHASE ORDER NO.:</td>
                            <td style="padding-bottom: 3px; vertical-align: top;"><?= htmlspecialchars($details[0]['po_number'] ?? '-') ?></td>
                        </tr>
                        <tr>
                            <td class="fw-bold" style="padding-right: 30px; vertical-align: top;">SHIPPING MARKS:</td>
                            <td class="pre-line" style="vertical-align: top;"><?= htmlspecialchars($details[0]['shipping_marks'] ?? '-') ?></td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding: 15px 30px 15px 80px;">
                    <div class="fw-bold" style="margin-bottom: 5px;">CONSIGNEE :-</div>
                    <div class="pre-line"><?= htmlspecialchars(trim(str_replace('CONSIGNEE :-', '', $customer['consignee'] ?? '-'))) ?></div>
                </td>
                
                <td style="width: 50%; vertical-align: top; padding: 15px 30px;">
                    
                    <div style="position: relative; width: 100%;">
                        <div class="fw-bold" style="margin-bottom: 5px;">NOTIFY PARTY:-</div>
                        <div class="pre-line" style="margin-bottom: 40px;"><?= htmlspecialchars(trim($customer['notify_party'] ?? '-')) ?></div>
                        
                        <div style="position: absolute; right: -70px; bottom: -15px; text-align: center; width: 220px; z-index: 10;">
                            <img src="../components/images/company_stamp.png" alt="Company Stamp" style="width: 150px; height: 120px; margin-bottom: 5px; mix-blend-mode: multiply;">
                        </div>
                    </div>

                </td>
            </tr>
        </table>
    </div>
</div>

<script>
    // สั่งเปิดหน้าต่าง Print อัตโนมัติเมื่อเรนเดอร์เสร็จ
    window.onload = () => setTimeout(() => window.print(), 500);
</script>
</body>
</html>