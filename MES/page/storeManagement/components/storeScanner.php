<script src="../../utils/libs/html5-qrcode.min.js"></script>
<script src="../../utils/libs/qrcode.min.js"></script>
<link href="../../utils/libs/cropper.min.css" rel="stylesheet">
<script src="../../utils/libs/cropper.min.js"></script>

<div class="modal fade" id="cropModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-crop-alt me-2"></i> ครอบตัดเฉพาะ QR Code</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center bg-light p-3">
                <p class="text-muted small mb-2">เลื่อนและขยายกรอบให้พอดีกับ QR Code</p>
                <div style="max-height: 60vh; overflow: hidden; border: 1px dashed #ccc; background: #fff;">
                    <img id="imageToCrop" src="" style="max-width: 100%; display: block;">
                </div>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="button" class="btn btn-primary fw-bold px-4" id="btnConfirmCrop">
                    <i class="fas fa-check me-1"></i> ยืนยันและสแกน
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    @media print {
        @page {
            font-family: 'Arial', 'Tahoma', sans-serif !important;
            size: 4in 2in landscape;
            margin: 0;
        }

        body * { visibility: hidden !important; }
        body, html { margin: 0; padding: 0; background: #fff; }
        body.desktop-only-page::before, body.desktop-only-page::after { display: none !important; }
        .portal-top-header, .sidebar, .page-container, .modal-backdrop, .modal, .toast-container { display: none !important; }
        
        #printArea, #printArea * { visibility: visible !important; }
        #printArea { 
            display: block !important; 
            position: absolute; 
            left: 0; top: 0; width: 100%; margin: 0; padding: 0;
        }
        
        .tag-card { 
            width: 4in; 
            height: 2in; 
            box-sizing: border-box;
            padding: 2mm 2mm 2mm 6mm; 
            page-break-after: always;
            font-family: 'Arial', sans-serif;
            color: #000;
            background-color: #fff;
            display: flex;
            flex-direction: row;
            align-items: center;
            overflow: hidden;
        }

        .tag-details {
            width: 75%;
            padding-right: 4px;
            display: flex;
            flex-direction: column;
            justify-content: center; 
            height: 100%;
        }

        .t-title { font-size: 18px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; }
        .t-sub { font-size: 11px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; }
        
        .t-desc { 
            font-size: 11px; 
            line-height: 1.2; 
            margin-bottom: 4px; 
            border-bottom: 1px solid #000; 
            padding-bottom: 4px; 
            display: -webkit-box;
            -webkit-line-clamp: 2; 
            line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            white-space: normal; 
        }
        
        .t-table { width: 100%; font-size: 11px; line-height: 1.15; }
        .t-table td { padding: 2px 0 2px 0; vertical-align: middle; }
        .t-hl { font-size: 16px; font-weight: bold; line-height: 0.8; display: inline-block; }

        .tag-qr {
            width: 26%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .tag-qr canvas, .tag-qr img { width: 85px !important; height: 85px !important; }
        .t-serial { font-size: 11px; font-weight: bold; margin-top: 5px; text-align: center; word-break: break-all; }
    }

    #qr-reader-trace__dashboard { display: none !important; }
    #html5-qrcode-button-camera-stop { display: none !important; }
    #html5-qrcode-anchor-scan-type-change { display: none !important; }
    
    #qr-reader-container-trace {
        width: 100%;
        min-height: 260px;
    }
    #qr-reader-trace video {
        width: 100% !important;
        height: auto !important;
        min-height: 250px;
        object-fit: cover;
        border-radius: 8px;
    }
</style>

<div id="printArea" class="d-none"></div>

<div class="modal fade" id="traceModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            
            <div class="modal-header bg-dark text-white py-2 px-3 border-bottom-0">
                <h6 class="modal-title fw-bold mb-0"><i class="fas fa-qrcode me-2"></i> สแกนรับ / เบิก / ตรวจสอบ</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="font-size: 0.8rem;"></button>
            </div>
            
            <div class="modal-body p-2 p-md-3 bg-body-tertiary d-flex flex-column gap-2">
                
                <div class="bg-white border rounded shadow-sm p-2">
                    
                    <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                        <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
                            <input class="form-check-input mt-0" type="checkbox" id="continuousScanToggle" style="cursor: pointer; transform: scale(1.1);">
                            <label class="form-check-label fw-bold text-primary small" for="continuousScanToggle" style="cursor: pointer;">สแกนต่อเนื่อง</label>
                        </div>
                        <label for="trace-image-file" class="btn btn-sm btn-light border shadow-sm py-1 px-2 rounded cursor-pointer fw-bold text-dark" style="font-size: 0.75rem;">
                            <i class="fas fa-image text-primary me-1"></i> อัปโหลดรูป
                        </label>
                        <input type="file" id="trace-image-file" accept="image/*" class="d-none">
                    </div>

                    <div id="scannerContainer" class="position-relative bg-dark rounded-3 overflow-hidden shadow-sm" style="min-height: 250px; display: flex; align-items: center; justify-content: center;">
                        <div id="qr-reader-trace" class="w-100"></div>
                        
                        <div id="resumeScanOverlay" class="position-absolute top-0 start-0 w-100 h-100 d-none flex-column align-items-center justify-content-center bg-dark bg-opacity-75" style="z-index: 10;">
                            <button class="btn btn-outline-light rounded-circle shadow mb-2 d-flex align-items-center justify-content-center" onclick="resumeScanning()" style="width: 60px; height: 60px;">
                                <i class="fas fa-qrcode fa-2x"></i>
                            </button>
                            <span class="text-white fw-bold small">แตะเพื่อสแกนบาร์โค้ดถัดไป</span>
                        </div>
                    </div>

                    <div class="input-group input-group-sm mt-3 shadow-sm">
                        <span class="input-group-text bg-light text-primary border-secondary-subtle"><i class="fas fa-keyboard"></i></span>
                        <input type="text" id="scanInput" class="form-control border-secondary-subtle fw-bold text-primary" placeholder="สแกนด้วยปืน หรือพิมพ์ Serial No..." autocomplete="off">
                        <button class="btn btn-primary fw-bold px-3" type="button" onclick="executeTraceScan()">
                            <i class="fas fa-search me-1"></i> ค้นหา
                        </button>
                    </div>

                </div>

                <div id="traceLoading" class="text-center py-4 d-none bg-white rounded border shadow-sm">
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <span class="ms-2 text-muted fw-bold small">กำลังค้นหาข้อมูล...</span>
                </div>

                <div id="traceResult" class="d-none">
                    
                    <div class="d-flex justify-content-between align-items-center p-2 mb-2 bg-light rounded-3 border shadow-sm">
                        <h6 class="fw-bold text-primary mb-0 ms-1" id="traceSerial" style="letter-spacing: 0.5px;">-</h6>
                        <span id="traceStatus" class="badge px-3 py-2 rounded-pill shadow-sm">-</span>
                    </div>

                    <div class="bg-white border rounded p-2 shadow-sm mb-3 text-muted" style="font-size: 0.85rem;">
                        <div class="row g-2 px-1">
                            <div class="col-8 fw-bold text-dark text-truncate"><i class="fas fa-cube me-1"></i> <span id="traceItem">-</span></div>
                            <div class="col-4 text-end fw-bold text-primary fs-6" id="traceQty">-</div>
                            <div class="col-12 text-truncate border-bottom pb-2 mb-1" id="traceDesc">-</div>
                            <div class="col-6 text-truncate"><i class="fas fa-file-invoice me-1"></i> <span id="tracePO">-</span></div>
                            <div class="col-6 text-end text-truncate"><i class="fas fa-warehouse me-1"></i> <span id="traceInv">-</span></div>
                        </div>
                    </div>

                    <div id="traceActionArea" class="d-none mb-3">
                        <div id="traceReceiveArea" class="d-none">
                            <div class="input-group shadow-sm">
                                <span class="input-group-text bg-success text-white border-success"><i class="fas fa-download"></i></span>
                                <select id="receiveLocationTrace" class="form-select border-success fw-bold text-success"></select>
                                <button class="btn btn-success fw-bold px-3" id="btnReceiveTrace" onclick="receiveScannedTag()">รับเข้าสต็อก</button>
                            </div>
                        </div>
                        <div id="traceIssueArea" class="d-none">
                            <div class="input-group shadow-sm">
                                <span class="input-group-text bg-warning text-dark border-warning"><i class="fas fa-dolly"></i></span>
                                <select id="issueLocationTrace" class="form-select border-warning fw-bold text-dark"></select>
                                <button class="btn btn-warning text-dark fw-bold px-3" id="btnIssueTrace" onclick="issueScannedTag()">เบิกจ่าย</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h6 class="fw-bold text-secondary small mb-2"><i class="fas fa-history me-1"></i> ประวัติการเคลื่อนไหว</h6>
                        <div class="table-responsive bg-white border rounded-3 shadow-sm hide-scrollbar" style="max-height: 35vh;">
                            <table class="table table-sm table-hover align-middle mb-0 text-nowrap" style="font-size: 0.8rem;">
                                <thead class="table-light sticky-top">
                                    <tr class="text-secondary">
                                        <th class="py-2 px-3">เวลา</th>
                                        <th class="py-2">สถานะ</th>
                                        <th class="py-2 text-end px-3">จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody id="traceHistoryTbody"></tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>

<script src="script/storeScanner.js?v=<?php echo filemtime(__DIR__ . '/../script/storeScanner.js'); ?>" defer></script>