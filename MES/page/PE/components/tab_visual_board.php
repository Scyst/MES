<!-- tab_visual_board.php -->
<style>
    /* Visual Board Specific Styles */
    
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
    
    /* PREVIEW GRID (A4 Landscape Scale down for screen) */
    .vb-preview-page-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0;
    }
    
    .vb-preview-page {
        display: block;
        transform-origin: top center;
        transform: scale(0.65); /* Scale to fit A4 landscape on screen */
        margin-bottom: -70mm; 
    }
    
    .vb-board-header {
        text-align: center;
        border-bottom: 4px solid var(--pe-danger);
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
        color: var(--pe-danger);
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
        border: 2px solid var(--pe-warning);
        padding: 15px;
        text-align: center;
    }
    .vb-qr-code-box {
        border: 4px solid var(--pe-danger);
        padding: 10px;
        border-radius: 10px;
        background: #fff;
        margin-bottom: 5px;
    }
    .vb-qr-text h4 {
        font-weight: 900;
        color: var(--pe-danger);
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
        body { background: white !important; padding: 0 !important; margin: 0 !important; }
        .pe-sidebar, .pe-topbar, .pe-filter-bar, .pe-card-header { display: none !important; }
        .pe-main { margin: 0 !important; padding: 0 !important; }
        .pe-content, .pe-tab-panel { padding: 0 !important; margin: 0 !important; }
        
        .pe-card { border: none !important; box-shadow: none !important; background: transparent !important; }
        .pe-card-body { padding: 0 !important; overflow: visible !important; max-height: none !important; }
        
        .vb-preview-page-wrapper { padding: 0 !important; }
        .vb-preview-page { transform: none !important; margin-bottom: 0 !important; }
        
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

<!-- Filter Bar -->
<div class="pe-filter-bar" id="visualBoardFilterBar">
    <div class="pe-filter-header-mobile">
        <h5 class="m-0 fw-bold"><i class="fas fa-chalkboard text-primary me-2"></i>Visual Boards</h5>
    </div>
    
    <div class="pe-filter-spacer"></div>
    
    <div class="pe-filter-actions">
        <select class="form-select form-select-sm d-inline-block w-auto" id="vbLineFilter" onchange="VisualBoardModule.loadData()">
            <option value="">-- All Lines --</option>
            <!-- Loaded via JS -->
        </select>
        
        <button class="pe-btn pe-btn-ghost d-inline-flex align-items-center ms-2" onclick="VisualBoardModule.loadData()" title="Refresh">
            <i class="fas fa-sync-alt"></i>
        </button>
    </div>
</div>

<div class="pe-card h-100" style="background-color: #f1f5f9;">
    <div class="pe-card-header d-flex justify-content-between align-items-center bg-white border-bottom">
        <h5 class="pe-card-title"><i class="fas fa-print text-secondary"></i> พื้นที่พรีวิว A4 (Landscape)</h5>
        <div class="d-flex align-items-center gap-3">
            <div class="pe-text-sm pe-text-muted fw-bold">
                <span id="vbPrintCountText">0</span> Boards
            </div>
            <button class="pe-btn pe-btn-primary pe-btn-sm" onclick="window.print()">
                <i class="fas fa-print"></i> สั่งพิมพ์บอร์ด
            </button>
        </div>
    </div>
    
    <div class="pe-card-body p-0" style="overflow-y: auto; max-height: calc(100vh - 160px);">
        <div class="vb-preview-page-wrapper" id="vbPreviewContainer">
            <!-- Rendered by JS -->
            <div class="text-center text-muted" style="margin-top: 100px;">
                <i class="fas fa-spinner fa-spin fa-3x mb-3"></i>
                <h5>Loading...</h5>
            </div>
        </div>
    </div>
</div>
