<!-- tab_card_generator.php -->
<style>
    /* Card Generator Styles */
    
    .cg-tool-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--pe-border-color);
    }
    
    .cg-tool-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    
    .cg-section-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--pe-text-color);
        display: flex;
        align-items: center;
        gap: 8px;
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
    
    #cgPrintContainer .cg-page {
        display: none;
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

    /* PREVIEW GRID (A4 Scale down for screen) */
    .cg-preview-page-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0;
    }
    
    .cg-preview-page {
        display: block;
        transform-origin: top center;
        /* Scale to fit most screens, adjust if necessary */
        transform: scale(0.85);
        margin-bottom: -15%; 
    }
    
    .cg-preview-page .cg-card-container:hover {
        z-index: 10;
        outline: 2px dashed var(--pe-primary);
        outline-offset: -2px;
    }
    
    .cg-card-remove-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: var(--pe-danger);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.2s;
    }
    
    .cg-preview-page .cg-card-container:hover .cg-card-remove-btn {
        opacity: 1;
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
        body { background: white !important; padding: 0 !important; margin: 0 !important; }
        .pe-sidebar, .pe-topbar, #cgControlPanel, .pe-filter-bar { display: none !important; }
        .pe-main { margin: 0 !important; padding: 0 !important; }
        .pe-content, .pe-tab-panel { padding: 0 !important; margin: 0 !important; }
        
        #cgLayoutRow { display: none !important; }
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
    }
</style>

<div class="row gx-4 h-100" id="cgLayoutRow">
    <!-- Controls Panel -->
    <div class="col-lg-4 col-xl-3" id="cgControlPanel">
        <div class="bg-light rounded p-3 h-100" style="border: 1px solid var(--pe-border-color); overflow-y: auto;">
            <h6 class="fw-bold mb-3 pb-2 border-bottom"><i class="fas fa-sliders-h text-primary me-2"></i> เครื่องมือสร้างการ์ด</h6>
            
            <div class="cg-tool-section">
                <div class="cg-section-title text-success"><i class="fas fa-traffic-light"></i> 1. สถานะเครื่องจักร</div>
                <div class="d-flex gap-2 mb-2">
                    <button class="pe-btn pe-btn-sm btn-outline-success flex-fill" onclick="CardGeneratorModule.addStatusCard('green')">เขียว</button>
                    <button class="pe-btn pe-btn-sm btn-outline-warning flex-fill" onclick="CardGeneratorModule.addStatusCard('yellow')">เหลือง</button>
                    <button class="pe-btn pe-btn-sm btn-outline-danger flex-fill" onclick="CardGeneratorModule.addStatusCard('red')">แดง</button>
                </div>
                <button class="pe-btn pe-btn-sm pe-btn-secondary w-100" onclick="CardGeneratorModule.addStatusSet()"><i class="fas fa-layer-group"></i> เพิ่มชุด 3 สี</button>
            </div>

            <div class="cg-tool-section">
                <div class="cg-section-title text-primary"><i class="fas fa-user-hard-hat"></i> 2. การ์ดพนักงาน</div>
                <div class="mb-2">
                    <select class="form-select select2-emp w-100" id="cgOpEmployeeSelect">
                        <option value="">-- ค้นหาชื่อพนักงาน --</option>
                    </select>
                </div>
                <div class="d-flex gap-2">
                    <button class="pe-btn pe-btn-sm pe-btn-primary flex-fill" onclick="CardGeneratorModule.addOperatorCard()"><i class="fas fa-plus"></i> พนักงาน</button>
                    <button class="pe-btn pe-btn-sm pe-btn-ghost flex-fill border" onclick="CardGeneratorModule.addBlankOperatorCard()"><i class="fas fa-file-alt"></i> การ์ดเปล่า</button>
                </div>
            </div>

            <div class="cg-tool-section">
                <div class="cg-section-title text-danger"><i class="fas fa-tools"></i> 3. การ์ดซ่อมบำรุง LOTO</div>
                <div class="mb-2">
                    <select class="form-select select2-emp w-100" id="cgLotoEmployeeSelect">
                        <option value="">-- ค้นหาชื่อช่าง --</option>
                    </select>
                </div>
                <div class="d-flex gap-2">
                    <button class="pe-btn pe-btn-sm pe-btn-danger flex-fill" onclick="CardGeneratorModule.addLotoCard()"><i class="fas fa-plus"></i> ช่าง</button>
                    <button class="pe-btn pe-btn-sm pe-btn-ghost flex-fill border" onclick="CardGeneratorModule.addBlankLotoCard()"><i class="fas fa-file-alt"></i> การ์ดเปล่า</button>
                </div>
            </div>
            
            <div class="cg-tool-section border-0 mb-0">
                <div class="cg-section-title text-secondary"><i class="fas fa-users"></i> 4. พิมพ์ยกไลน์ (Batch)</div>
                <div class="mb-2">
                    <select class="form-select select2-emp w-100" id="cgBatchLineSelect">
                        <option value="">-- เลือกแผนก / ไลน์ผลิต --</option>
                    </select>
                </div>
                <button class="pe-btn pe-btn-sm pe-btn-secondary w-100" onclick="CardGeneratorModule.addBatchOperatorCards()"><i class="fas fa-download"></i> ดึงพนักงานทั้งหมด</button>
            </div>
            
        </div>
    </div>

    <!-- Preview Panel -->
    <div class="col-lg-8 col-xl-9">
        <div class="d-flex flex-column h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold m-0"><i class="fas fa-list-ol text-secondary me-2"></i> คิวรอพิมพ์ (Print Queue)</h6>
                <div class="d-flex align-items-center gap-2">
                    <span class="pe-text-xs pe-text-muted fw-bold me-2">
                        คิวทั้งหมด <span id="cgPrintCountText" class="text-primary fs-6">0</span> รายการ
                    </span>
                    <button class="btn btn-sm btn-outline-danger" onclick="CardGeneratorModule.clearCards()">
                        <i class="fas fa-trash-alt"></i> ล้าง
                    </button>
                    <button class="pe-btn pe-btn-primary pe-btn-sm" onclick="CardGeneratorModule.generateAndPrint()">
                        <i class="fas fa-print me-1"></i> พิมพ์บัตร
                    </button>
                </div>
            </div>
            
            <div class="flex-fill p-4 rounded" style="background-color: #f8fafc; overflow-y: auto; border: 1px dashed #cbd5e1; min-height: 400px;">
                <div id="cgPreviewContainer" class="d-flex flex-wrap gap-3 justify-content-start align-items-start">
                    <!-- Cards will be added here -->
                    <div class="text-center text-muted w-100" style="margin-top: 80px;">
                        <i class="fas fa-id-badge fa-4x mb-3" style="color: #e2e8f0;"></i>
                        <h6 class="fw-bold text-secondary">ยังไม่มีการ์ดในคิว</h6>
                        <p class="pe-text-sm mb-0">เพิ่มการ์ดจากเครื่องมือด้านซ้ายเพื่อสร้างแบบฟอร์ม</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
