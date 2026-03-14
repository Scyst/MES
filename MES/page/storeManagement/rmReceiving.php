<?php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "RM Receiving & Tagging";
$pageIcon = "fas fa-pallet"; 
$pageHeaderTitle = "Raw Material Receiving";
$pageHeaderSubtitle = "รับสินค้าเข้าสต็อก และสร้าง Tag สำหรับ FIFO";
$pageHelpId = ""; 
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        #printArea { display: none; }
        
        /* CSS แท็กสำหรับพิมพ์สติ๊กเกอร์ (4x2 นิ้ว) */
        @media print {
            @page {
                size: 4in 2in landscape;
                margin: 0;
            }

            body * { visibility: hidden; }
            body, html { margin: 0; padding: 0; background: #fff; }
            body.desktop-only-page::before, body.desktop-only-page::after { display: none !important; }
            .portal-top-header, .sidebar, #main-content, .modal-backdrop, .modal { display: none !important; }
            
            #printArea { 
                display: block !important; 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
                margin: 0; 
                padding: 0;
            }
            #printArea * { visibility: visible; }
            
            .tag-card { 
                width: 4in; 
                height: 2in; 
                box-sizing: border-box;
                padding: 0mm 2mm 0mm 8mm; 
                page-break-after: always;
                font-family: 'Arial', sans-serif;
                color: #000;
                background-color: #fff;
                display: flex;
                flex-direction: row;
                align-items: center;
                overflow: hidden;
            }

            /* ฝั่งซ้าย: ขยายพื้นที่ให้กว้างขึ้น */
            .tag-details {
                width: 70%;
                padding-right: 8px;
                display: flex;
                flex-direction: column;
                justify-content: center; /* ดันข้อมูลให้อยู่ตรงกลางแนวตั้ง ใช้พื้นที่ให้คุ้ม */
                height: 100%;
            }

            /* ปรับลดขนาดตัวอักษรลงมาให้พอดีขึ้น */
            .t-title { font-size: 18px; font-weight: bold; line-height: 1.1; margin-bottom: 2px; } /* ชื่อ Item No. (เดิม 20px) */
            .t-sub { font-size: 11px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; } /* Category (เดิม 12px) */
            .t-desc { 
                font-size: 11px; 
                line-height: 1.2; 
                margin-bottom: 6px; 
                border-bottom: 1px solid #000; 
                padding-bottom: 4px; 
                
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                white-space: normal;
            }
            
            .t-table { width: 100%; font-size: 11px; line-height: 1.3; }
            .t-table td { padding: 2px 0 0 0; vertical-align: bottom; }
            .t-hl { font-size: 16px; font-weight: bold; line-height: 1; display: inline-block; }

            /* ฝั่งขวา: QR Code */
            .tag-qr {
                width: 30%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            /* ขยาย QR Code ให้ใหญ่ขึ้น */
            .tag-qr canvas, .tag-qr img { width: 85px !important; height: 85px !important; }
            .t-serial { font-size: 11px; font-weight: bold; margin-top: 5px; text-align: center; word-break: break-all; }
        }
    </style>
</head>
<body class="layout-top-header desktop-only-page bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>
    
    <div id="main-content">
        <div class="content-wrapper">
            
            <div class="card mb-3 shadow-sm border-0">
                <div class="card-body d-flex align-items-center justify-content-between py-2">
                    <h6 class="mb-0 fw-bold text-secondary"><i class="fas fa-history me-2"></i> ประวัติการรับเข้าและสถานะ Tag</h6>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary" onclick="loadHistory()">
                            <i class="fas fa-sync-alt"></i> รีเฟรช
                        </button>
                        <button class="btn btn-primary fw-bold" onclick="openImportModal()">
                            <i class="fas fa-file-import me-1"></i> นำเข้าข้อมูล (Import Excel)
                        </button>
                    </div>
                </div>
            </div>

            <div class="card flex-fill shadow-sm border-0 overflow-hidden">
                <div class="card-header bg-white pb-2 pt-3 border-0 d-flex justify-content-between align-items-center">
                    <div>
                        <button class="btn btn-sm btn-dark d-none" id="btnBatchPrint" onclick="printSelectedTags()">
                            <i class="fas fa-print me-1"></i> พิมพ์ที่เลือก (<span id="selectedCount">0</span>)
                        </button>
                    </div>
                </div>
                <div class="card-body p-0 h-100 d-flex flex-column">
                    <div class="table-responsive flex-fill">
                        <table class="table table-hover table-bordered mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th class="text-center" style="width: 40px;">
                                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
                                    </th>
                                    <th>เวลาที่รับเข้า</th>
                                    <th>Serial No.</th>
                                    <th>Item No.</th>
                                    <th>PO Number</th>
                                    <th>Pallet No.</th>
                                    <th class="text-end">QTY</th>
                                    <th class="text-center">สถานะ</th>
                                    <th class="text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="historyTbody">
                                <tr><td colspan="9" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content h-100">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="importModalLabel"><i class="fas fa-file-excel text-success me-2"></i> นำเข้าข้อมูล Shipping</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body d-flex flex-column p-3">
                    
                    <div class="row g-3 mb-3 align-items-center">
                        <div class="col-md-8 d-flex gap-2">
                            <input type="file" id="excelFile" class="form-control" accept=".xlsx, .xls, .csv">
                            <button class="btn btn-dark text-nowrap" onclick="processExcel()">
                                <i class="fas fa-search"></i> แสดงตัวอย่าง
                            </button>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="text-primary fw-bold" id="previewCount">พบข้อมูล: 0 พาเลท</span>
                        </div>
                    </div>

                    <div class="table-responsive border rounded flex-fill" style="min-height: 300px;">
                        <table class="table table-sm table-hover table-bordered mb-0 text-nowrap" id="previewTable">
                            <thead class="table-secondary sticky-top">
                                <tr>
                                    <th>Item No.</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>PO Number</th>
                                    <th class="text-end">Qty/Pallet</th>
                                    <th class="text-end">Package QTY</th>
                                    <th>Warehouse</th>
                                </tr>
                            </thead>
                            <tbody id="previewTbody">
                                <tr><td colspan="7" class="text-center text-muted py-5">กรุณาเลือกไฟล์และกดแสดงตัวอย่าง</td></tr>
                            </tbody>
                        </table>
                    </div>

                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success d-none" id="btnSave" onclick="submitToDatabase()">
                        <i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="printArea"></div>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/qrcode.min.js"></script> 
    <script src="script/rmReceiving.js?v=<?php echo filemtime(__DIR__ . '/script/rmReceiving.js'); ?>"></script>
</body>
</html>