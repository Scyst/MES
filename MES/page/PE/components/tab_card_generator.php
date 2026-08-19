<!-- tab_card_generator.php -->
<style>
    /* Card Generator specific styles that override or add to pe-enterprise.css */
    .cg-setup-container {
        display: flex;
        height: calc(100vh - 120px);
        overflow: hidden;
    }
    
    .cg-control-panel {
        flex: 0 0 420px;
        display: flex;
        flex-direction: column;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        padding: 24px;
        overflow-y: auto;
    }
    
    .cg-preview-panel {
        flex: 1;
        background: #e2e8f0;
        padding: 32px;
        overflow-y: auto;
        position: relative;
    }

    .cg-control-panel-title {
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;
    }

    .cg-tool-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        padding: 20px;
        margin-bottom: 20px;
        transition: all 0.2s ease;
    }
    
    .cg-tool-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border-color: #cbd5e1;
    }
    
    .cg-panel-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .cg-btn-modern {
        border-radius: 8px;
        font-weight: 600;
        padding: 10px 16px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .cg-btn-modern:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Select2 fixes for Card Generator */
    #panel-card_generator .select2-container .select2-selection--single {
        height: 42px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
    }
    #panel-card_generator .select2-container--default .select2-selection--single .select2-selection__rendered {
        line-height: 42px;
        color: #334155;
        font-weight: 500;
        padding-left: 14px;
    }
    #panel-card_generator .select2-container--default .select2-selection--single .select2-selection__arrow {
        height: 40px;
        right: 8px;
    }

    /* ------------------ PRINT & PREVIEW STYLES ------------------ */
    .cg-page {
        width: 210mm;
        min-height: 297mm;
        background: white;
        margin: 0 auto 30px;
        padding: 13.5mm 19.4mm; /* Precisely calculated to fit 5 rows x 2 cols of 85.6x54mm */
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        position: relative;
        box-sizing: border-box;
    }
    
    #cgPrintContainer .cg-page {
        display: none;
    }

    .cg-cards-grid {
        display: grid;
        grid-template-columns: repeat(2, 85.6mm);
        grid-auto-rows: 54mm;
        gap: 0; /* NO GAP for easy single-pass cutting */
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
        /* Outline instead of border to prevent double-thickness when gap is 0 */
        outline: 1px dashed #94a3b8;
        outline-offset: -1px;
    }

    /* PREVIEW GRID (A4 Scale down for screen) */
    .cg-preview-page-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .cg-preview-page {
        display: block;
        transform-origin: top center;
        transform: scale(0.75);
        margin-bottom: -60px; /* offset the scaled margin */
    }
    
    .cg-preview-page .cg-card-container:hover {
        z-index: 10;
        outline: 2px dashed #3b82f6;
        outline-offset: -2px;
    }
    
    .cg-card-remove-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.2s;
    }
    .cg-card-remove-btn:hover { background: #dc2626; transform: scale(1.1); }

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
        body { background: white !important; padding: 0 !important; margin: 0 !important; }
        .pe-sidebar, .pe-topbar, .cg-control-panel { display: none !important; }
        .pe-main { margin: 0 !important; padding: 0 !important; }
        .pe-content, .pe-tab-panel { padding: 0 !important; margin: 0 !important; }
        
        .cg-setup-container { display: none !important; }
        #cgPrintContainer { display: block !important; }
        
        .cg-page { 
            display: block !important;
            margin: 0 !important; 
            box-shadow: none !important; 
            page-break-after: always;
        }
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .cg-card-remove-btn { display: none !important; }
        .cg-card-container { outline: 1px solid #000 !important; outline-offset: -1px !important; }
    }
</style>

<div class="cg-setup-container">
    <!-- Controls -->
    <div class="cg-control-panel">
        
        <div class="cg-control-panel-title">เพิ่มการ์ดเข้าคิวพิมพ์</div>

        <div class="cg-tool-card">
            <div class="cg-panel-title text-primary"><i class="fas fa-traffic-light"></i> 1. สถานะเครื่องจักร</div>
            <div class="d-flex gap-2 mb-2">
                <button class="btn btn-outline-success cg-btn-modern flex-1 w-100" onclick="CardGeneratorModule.addStatusCard('green')">เขียว (ปกติ)</button>
                <button class="btn btn-outline-warning cg-btn-modern flex-1 w-100" onclick="CardGeneratorModule.addStatusCard('yellow')">เหลือง (ระวัง)</button>
                <button class="btn btn-outline-danger cg-btn-modern flex-1 w-100" onclick="CardGeneratorModule.addStatusCard('red')">แดง (หยุด)</button>
            </div>
            <button class="btn btn-light cg-btn-modern w-100 text-primary fw-bold mt-1" onclick="CardGeneratorModule.addStatusSet()"><i class="fas fa-plus-circle"></i> เพิ่มทั้งชุด 3 สี</button>
        </div>

        <div class="cg-tool-card">
            <div class="cg-panel-title text-info"><i class="fas fa-user-hard-hat"></i> 2. การ์ดพนักงาน (Operator)</div>
            <div class="mb-3">
                <select class="form-select select2-emp w-100" id="cgOpEmployeeSelect">
                    <option value="">-- ค้นหาชื่อพนักงาน --</option>
                    <!-- Populated via API -->
                </select>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-info text-white cg-btn-modern w-100" onclick="CardGeneratorModule.addOperatorCard()"><i class="fas fa-plus"></i> เพิ่มพนักงาน</button>
                <button class="btn btn-light text-secondary cg-btn-modern w-100" onclick="CardGeneratorModule.addBlankOperatorCard()"><i class="fas fa-file-alt"></i> การ์ดเปล่า</button>
            </div>
        </div>

        <div class="cg-tool-card">
            <div class="cg-panel-title text-danger"><i class="fas fa-tools"></i> 3. การ์ดซ่อมบำรุง (LOTO)</div>
            <div class="mb-3">
                <select class="form-select select2-emp w-100" id="cgLotoEmployeeSelect">
                    <option value="">-- ค้นหาชื่อช่าง --</option>
                    <!-- Populated via API -->
                </select>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-danger cg-btn-modern w-100" onclick="CardGeneratorModule.addLotoCard()"><i class="fas fa-plus"></i> เพิ่มช่าง</button>
                <button class="btn btn-light text-secondary cg-btn-modern w-100" onclick="CardGeneratorModule.addBlankLotoCard()"><i class="fas fa-file-alt"></i> การ์ดเปล่า</button>
            </div>
        </div>
        
        <div class="cg-tool-card border-secondary">
            <div class="cg-panel-title text-secondary"><i class="fas fa-layer-group"></i> 4. พิมพ์ยกไลน์ (Batch)</div>
            <p class="text-muted small mb-3">ดึงพนักงานทุกคนในไลน์ผลิตเป็น Operator Card</p>
            <div class="mb-3">
                <select class="form-select select2-emp w-100" id="cgBatchLineSelect">
                    <option value="">-- เลือกแผนก / ไลน์ผลิต --</option>
                    <!-- Populated via API -->
                </select>
            </div>
            <button class="btn btn-secondary cg-btn-modern w-100" onclick="CardGeneratorModule.addBatchOperatorCards()"><i class="fas fa-users"></i> ดึงข้อมูลทั้งหมด</button>
        </div>
    </div>

    <!-- Preview -->
    <div class="cg-preview-panel">
        <div class="d-flex justify-content-between align-items-center mb-4 sticky-top bg-light p-3 rounded shadow-sm" style="z-index: 20;">
            <div>
                <h4 class="mb-0 text-secondary"><i class="fas fa-eye"></i> พื้นที่พรีวิว</h4>
                <div class="text-muted small fw-medium mt-1">
                    <span id="cgPrintCountText">0</span> Cards Ready (เรียง 10 ใบต่อแผ่น A4 ชิดกันเพื่อตัดง่าย)
                </div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-light text-danger fw-bold shadow-sm" onclick="CardGeneratorModule.clearCards()" style="border-radius: 8px;">
                    <i class="fas fa-trash-alt me-1"></i> ล้างทั้งหมด
                </button>
                <button class="btn btn-success fw-bold shadow-sm px-4" onclick="CardGeneratorModule.generateAndPrint()" style="border-radius: 8px;">
                    <i class="fas fa-print me-2"></i> สั่งพิมพ์
                </button>
            </div>
        </div>
        
        <div class="cg-preview-page-wrapper" id="cgPreviewContainer">
            <!-- Cards will be added here -->
            <div class="text-center text-muted" style="margin-top: 100px;">
                <i class="fas fa-id-card fa-4x mb-3 opacity-25"></i>
                <h5>พรีวิวการ์ดว่างเปล่า</h5>
                <p>เลือกเพิ่มการ์ดจากเมนูด้านซ้ายเพื่อเตรียมพิมพ์</p>
            </div>
        </div>
    </div>
</div>

<!-- Print Output (Hidden until Print) -->
<div id="cgPrintContainer" style="display:none;"></div>
