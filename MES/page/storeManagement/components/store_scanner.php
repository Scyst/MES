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
            width: 80mm; height: 50mm; 
            border: 2px solid #000; padding: 4mm; margin-bottom: 5mm; 
            page-break-after: always; font-family: Arial, sans-serif;
            display: flex; flex-direction: row; justify-content: space-between;
            box-sizing: border-box; color: #000; background-color: #fff;
        }
        .tag-details { width: 70%; padding-right: 5px; display: flex; flex-direction: column; }
        .t-title { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 2px; margin-bottom: 3px; }
        .t-sub { font-size: 10px; font-weight: bold; color: #555; margin-bottom: 2px; }
        .t-desc { font-size: 9px; line-height: 1.2; height: 22px; overflow: hidden; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal;}
        
        .t-table { width: 100%; font-size: 9px; line-height: 1.3; }
        .t-table td { padding: 1px 0; vertical-align: top; }
        .t-hl { font-size: 14px; font-weight: bold; display: inline-block; }
        
        .tag-qr { width: 30%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .tag-qr img, .tag-qr canvas { width: 65px !important; height: 65px !important; }
        .t-serial { font-size: 9px; font-weight: bold; margin-top: 5px; text-align: center; word-break: break-all; }
    }

    /* ซ่อน Library Trash */
    #qr-reader-trace__dashboard { display: none !important; }
    #html5-qrcode-button-camera-stop { display: none !important; }
    #html5-qrcode-anchor-scan-type-change { display: none !important; }
</style>

<div id="printArea" class="d-none"></div>

<div class="modal fade" id="traceModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg bg-body-tertiary">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold"><i class="fas fa-search me-2"></i> ตรวจสอบ / สแกน (Trace Scanner)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3 p-md-4">
                
                <div class="d-flex justify-content-between align-items-center mb-3 bg-light p-2 px-3 border rounded shadow-sm">
                    <span class="fw-bold text-primary" style="font-size: 0.9rem;"><i class="fas fa-bolt text-warning me-1"></i> โหมดสแกนต่อเนื่อง (Continuous)</span>
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="continuousScanToggle" style="cursor: pointer; transform: scale(1.2); margin-right: 10px;">
                    </div>
                </div>

                <div class="scanner-box mb-4 shadow-sm">
                    <ul class="nav nav-tabs nav-fill bg-white rounded-top pt-2 px-2 border-bottom-0" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold border-bottom-0" id="trace-camera-tab" data-bs-toggle="tab" data-bs-target="#trace-camera-pane" type="button" role="tab">
                                <i class="fas fa-qrcode"></i> สแกน (กล้อง)
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold border-bottom-0 text-secondary" id="trace-manual-tab" data-bs-toggle="tab" data-bs-target="#trace-manual-pane" type="button" role="tab">
                                <i class="fas fa-keyboard"></i> พิมพ์รหัส
                            </button>
                        </li>
                    </ul>
            
                    <div class="tab-content bg-white p-3 border border-top-0 rounded-bottom">
                        <div class="tab-pane fade show active" id="trace-camera-pane" role="tabpanel">
                            <div id="qr-reader-container-trace" style="position:relative; border-radius:8px; overflow:hidden; border: 1px solid #dee2e6;">
                                <div id="qr-reader-trace" style="width: 100%;"></div>
                            </div>
                        </div>

                        <div class="qr-file-scanner-overlay" style="position: absolute; bottom: 12px; left: 0; right: 0; text-align: center; z-index: 10;">
                            <label for="trace-image-file" class="btn btn-sm px-3 rounded-pill shadow-sm cursor-pointer" style="background: rgba(255,255,255,0.8); color: #333; border: 1px solid #ccc;">
                                <i class="fas fa-image me-1"></i> อัปโหลดรูปภาพ
                            </label>
                            <input type="file" id="trace-image-file" accept="image/*" style="display: none;">
                        </div>
                
                        <div class="tab-pane fade" id="trace-manual-pane" role="tabpanel">
                            <div class="input-group input-group-lg">
                                <span class="input-group-text bg-light text-primary border-end-0"><i class="fas fa-barcode"></i></span>
                                <input type="text" id="scanInput" class="form-control border-start-0 ps-0" placeholder="กรอก Serial No. หรือ Master Pallet..." autocomplete="off">
                                <button class="btn btn-primary px-4 fw-bold" type="button" onclick="executeTraceScan()">
                                    <i class="fas fa-search"></i> ค้นหา
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="traceLoading" class="text-center py-5 d-none">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="mt-2 text-muted fw-bold">กำลังค้นหาข้อมูล...</div>
                </div>

                <div id="traceResult" class="d-none">
                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                                <div>
                                    <h4 class="fw-bold text-primary mb-1" id="traceSerial">-</h4>
                                    <span class="text-muted small">Serial Number / Pallet</span>
                                </div>
                                <span id="traceStatus" class="badge bg-secondary fs-6">-</span>
                            </div>
                            
                            <div class="row g-3 text-sm">
                                <div class="col-sm-6">
                                    <div class="text-muted small">Item No. / Description</div>
                                    <div class="fw-bold text-dark"><span id="traceItem">-</span></div>
                                    <div class="text-truncate" style="max-width: 250px;" id="traceDesc">-</div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="text-muted small">PO Number</div>
                                            <div class="fw-bold" id="tracePO">-</div>
                                        </div>
                                        <div class="col-6">
                                            <div class="text-muted small">Invoice / Location</div>
                                            <div class="fw-bold" id="traceInv">-</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-3 p-2 bg-light border rounded text-center">
                                <span class="text-muted me-2">Qty (คงเหลือ / รับเข้า):</span>
                                <span class="fw-bold fs-5 text-dark" id="traceQty">0 / 0</span>
                            </div>
                            
                            <div id="traceActionArea" class="mt-3 d-none">
                                
                                <div id="traceReceiveArea" class="p-3 bg-warning bg-opacity-10 border border-warning rounded text-center d-none">
                                    <h6 class="text-warning fw-bold mb-3"><i class="fas fa-download"></i> รอรับเข้าสต็อก (PENDING)</h6>
                                    <div class="mb-3 text-start">
                                        <label class="form-label fw-bold text-dark small mb-1">นำของไปเก็บที่ (Location):</label>
                                        <select id="receiveLocationTrace" class="form-select fw-bold border-secondary-subtle shadow-sm">
                                            <option value="1008" selected>Store (คลังวัตถุดิบหลัก)</option>
                                            <option value="1007">Warehouse (คลังสินค้า)</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-success w-100 fw-bold px-4 shadow-sm" id="btnReceiveTrace" onclick="receiveScannedTag()">
                                        <i class="fas fa-check-circle me-2"></i> ยืนยันรับเข้า (Receive)
                                    </button>
                                </div>

                                <div id="traceIssueArea" class="p-3 bg-primary bg-opacity-10 border border-primary rounded text-center d-none">
                                    <h6 class="text-primary fw-bold mb-3"><i class="fas fa-upload"></i> พร้อมเบิกจ่าย (AVAILABLE)</h6>
                                    <div class="mb-3 text-start">
                                        <label class="form-label fw-bold text-dark small mb-1">จ่ายไปที่ (Location):</label>
                                        <select id="issueLocationTrace" class="form-select fw-bold border-secondary-subtle shadow-sm">
                                            <option value="1009" selected>WIP (ไลน์ผลิต)</option>
                                            <option value="1010">Scrap (ของเสีย)</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary w-100 fw-bold px-4 shadow-sm" id="btnIssueTrace" onclick="issueScannedTag()">
                                        <i class="fas fa-share-square me-2"></i> ยืนยันเบิกจ่าย (Issue)
                                    </button>
                                </div>
                                
                            </div>
                        </div>
                    </div>

                    <h6 class="fw-bold text-secondary mb-2 mt-4"><i class="fas fa-history me-1"></i> ประวัติการเคลื่อนไหว (History)</h6>
                    <div class="card border-0 shadow-sm overflow-hidden">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0 text-nowrap" style="font-size: 0.9rem;">
                                <thead class="table-light">
                                    <tr>
                                        <th>วัน-เวลา</th>
                                        <th>ประเภท</th>
                                        <th class="text-end">จำนวน</th>
                                        <th>หมายเหตุ</th>
                                        <th>ผู้ทำรายการ</th>
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

<script src="script/storeScanner.js?v=<?php filemtime(__DIR__ . '/../script/storeScanner.js'); ?>" defer></script>