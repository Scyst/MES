<?php
// page/store/materialreq.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Material Requisition | เบิกวัสดุอุปกรณ์";
$pageHeaderTitle = "Material Requisition";
$pageHeaderSubtitle = "ระบบเบิกวัตถุดิบและวัสดุสิ้นเปลืองออนไลน์";
$pageIcon = "fas fa-shopping-cart";

$userRole = $_SESSION['user']['role'] ?? '';
$canManageImage = in_array($userRole, ['admin', 'creator', 'store']);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    <style>
        :root { --bg-light-gray: #f4f6f9; }
        body { background-color: var(--bg-light-gray); overflow-x: hidden; } 
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Compact Product Card */
        .product-card {
            border: 1px solid var(--bs-border-color); 
            background: #fff;
            transition: all 0.15s ease-in-out; 
            overflow: hidden; 
            display: flex;
            flex-direction: column; 
            height: 100%;
        }
        .product-card:hover { border-color: var(--bs-primary); box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); }
        .product-img-wrapper { position: relative; width: 100%; padding-top: 100%; background-color: #f8f9fa; border-bottom: 1px solid var(--bs-border-color); }
        .product-img, .placeholder-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .stock-badge { position: absolute; top: 5px; left: 5px; font-size: 0.7rem; font-weight: bold; z-index: 2; }
        .product-title { font-size: 0.85rem; font-weight: 600; color: #2c3e50; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2; margin-bottom: 0.25rem; }
        .card-body-flex { flex: 1 1 auto; display: flex; flex-direction: column; padding: 0.75rem; }
        
        body.hide-images .product-img-wrapper { display: none !important; }
        body.hide-images .product-card { height: auto !important; min-height: 130px; }
        body.hide-images .badge-alt-container { display: block !important; }
        .stock-badge-alt { font-size: 0.75rem; font-weight: bold; }

        /* Floating Cart Button (Restored to Original Gradient Style) */
        .cart-fab {
            position: fixed; bottom: 30px; right: 30px; width: 65px; height: 65px;
            background: linear-gradient(135deg, #0d6efd 0%, #0043a8 100%); color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(13, 110, 253, 0.4); cursor: pointer; z-index: 1040; transition: transform 0.2s;
        }
        .cart-fab:hover { transform: scale(1.05); color: white; }
        .cart-badge { position: absolute; top: -2px; right: -2px; background-color: #dc3545; font-size: 0.8rem; font-weight: bold; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; }
        
        /* Order History Tracking */
        .order-card-hist { background: #fff; border: 1px solid var(--bs-border-color); transition: transform 0.15s; cursor: pointer; }
        .order-card-hist:hover { border-color: var(--bs-primary); background-color: #f8f9fa; }
        .tracking-timeline { display: flex; justify-content: space-between; position: relative; margin: 1rem 0; padding: 0 1rem; }
        .tracking-timeline::before { content: ''; position: absolute; top: 16px; left: 10%; width: 80%; height: 2px; background: #e9ecef; z-index: 1; }
        .tracking-step { position: relative; z-index: 2; text-align: center; flex: 1; }
        .step-icon { width: 34px; height: 34px; border-radius: 50%; background: #e9ecef; color: #adb5bd; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; font-size: 1rem; border: 3px solid #fff; transition: all 0.2s; }
        .step-label { font-size: 0.8rem; font-weight: bold; color: #6c757d; }
        .step-time { font-size: 0.7rem; color: #adb5bd; display: block; min-height: 15px;}
        .tracking-step.active .step-icon { background: var(--bs-primary); color: #fff; border-color: #cce5ff; }
        .tracking-step.active .step-label { color: var(--bs-primary); }
        .tracking-step.completed .step-icon { background: var(--bs-success); color: #fff; }
        .tracking-step.completed .step-label { color: var(--bs-success); }
        .tracking-step.rejected .step-icon { background: var(--bs-danger); color: #fff; border-color: #f8d7da; }
        .tracking-step.rejected .step-label { color: var(--bs-danger); }
        .item-img-mini { width: 40px; height: 40px; object-fit: cover; border: 1px solid var(--bs-border-color); }

        /* Toolbar with Compact Glassmorphism */
        .sticky-toolbar {
            position: sticky; 
            top: 0; 
            z-index: 1020; 
            background-color: rgba(244, 246, 249, 0.85); 
            backdrop-filter: blur(12px); 
            -webkit-backdrop-filter: blur(12px); 
            
            /* บีบ Margin และ Padding ให้บางที่สุด */
            margin: -1rem -1rem 0 -1rem; 
            padding: 0 1rem 4px 1rem; 
            
            border-bottom: 1px solid rgba(200, 200, 200, 0.3);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.7); z-index:2050; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <div class="fw-bold text-dark small">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="page-container">
        <main id="main-content" class="container-fluid px-3 pt-3 pb-5">
            
            <div class="sticky-toolbar pb-1 mb-1">
                <div class="bg-white rounded shadow-sm p-2 mb-2 border">
                    
                    <div class="d-flex flex-column flex-md-row gap-2 justify-content-between">
                        
                        <div class="d-flex gap-2 align-items-center flex-grow-1">
                            <div class="input-group input-group-sm flex-grow-1" style="max-width: 400px;">
                                <span class="input-group-text bg-light text-secondary"><i class="fas fa-search"></i></span>
                                <input type="text" id="searchItem" class="form-control" placeholder="ค้นหารหัส SAP, ชื่อวัสดุ..." autocomplete="off">
                            </div>
                            
                            <select id="sortItem" class="form-select form-select-sm fw-bold border-secondary-subtle w-auto flex-shrink-0 text-dark" style="max-width: 140px;" onchange="loadCatalog()">
                                <option value="DEFAULT">✅ พร้อมเบิก</option>
                                <option value="SAP_ASC">🔤 (A-Z)</option>
                                <option value="SAP_DESC">🔤 (Z-A)</option>
                                <option value="STOCK_DESC">📦 มากสุด</option>
                            </select>
                        </div>
                        
                        <div class="d-flex gap-2 align-items-center justify-content-end flex-shrink-0">
                            <button id="toggleImageBtn" class="btn btn-sm btn-outline-secondary active" onclick="toggleImages()" title="ซ่อน/แสดงรูปภาพ" style="border-radius: 6px;">
                                <i class="fas fa-image"></i> <span class="d-none d-sm-inline">รูปภาพ</span>
                            </button>
                            
                            <button class="btn btn-sm btn-outline-primary fw-bold px-3" onclick="openHistoryModal()" title="ประวัติการเบิก">
                                <i class="fas fa-history"></i> <span class="d-none d-sm-inline ms-1">ประวัติ</span>
                            </button>
                        </div>

                    </div>
                </div>

                <div class="d-flex gap-1 overflow-auto hide-scrollbar py-1" style="scroll-snap-type: x mandatory;">
                    <button type="button" class="btn btn-sm btn-primary category-chip active text-nowrap" data-category="ALL" onclick="filterCategory('ALL', this)" style="scroll-snap-align: start;">All Items</button>
                    <button type="button" class="btn btn-sm btn-outline-primary category-chip text-nowrap" data-category="RM" onclick="filterCategory('RM', this)" style="scroll-snap-align: start;"><i class="fas fa-cubes"></i> RM</button>
                    <button type="button" class="btn btn-sm btn-outline-primary category-chip text-nowrap" data-category="PKG" onclick="filterCategory('PKG', this)" style="scroll-snap-align: start;"><i class="fas fa-box"></i> PKG</button>
                    <button type="button" class="btn btn-sm btn-outline-primary category-chip text-nowrap" data-category="CON" onclick="filterCategory('CON', this)" style="scroll-snap-align: start;"><i class="fas fa-pump-soap"></i> CON</button>
                    <button type="button" class="btn btn-sm btn-outline-primary category-chip text-nowrap" data-category="SP" onclick="filterCategory('SP', this)" style="scroll-snap-align: start;"><i class="fas fa-cogs"></i> SP</button>
                    <button type="button" class="btn btn-sm btn-outline-primary category-chip text-nowrap" data-category="TOOL" onclick="filterCategory('TOOL', this)" style="scroll-snap-align: start;"><i class="fas fa-wrench"></i> TOOL</button>
                </div>

                <div id="subCategoryContainer" class="d-none gap-1 overflow-auto hide-scrollbar pb-1 mt-1" style="scroll-snap-type: x mandatory;"></div>
            </div>

            <div class="row g-2 mt-3" id="catalogGrid"></div>
        </main>
    </div>

    <div class="cart-fab" data-bs-toggle="offcanvas" data-bs-target="#cartOffcanvas">
        <i class="fas fa-shopping-cart"></i>
        <span class="cart-badge" id="cartItemCount">0</span>
    </div>

    <div class="offcanvas offcanvas-end shadow" tabindex="-1" id="cartOffcanvas" style="width: 400px; max-width: 100vw;">
        <div class="offcanvas-header bg-dark text-white rounded-0">
            <h6 class="offcanvas-title fw-bold"><i class="fas fa-shopping-cart me-2"></i>ตะกร้าเบิก (My Cart)</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-0 d-flex flex-column bg-light">
            <div class="flex-grow-1 overflow-auto p-2" id="cartItemsContainer"></div>
            
            <div class="bg-white border-top p-3 shadow-sm">
                <div class="mb-2">
                    <label class="form-label small fw-bold text-secondary mb-1">ประเภทคำขอ</label>
                    <div class="btn-group btn-group-sm w-100" role="group">
                        <input type="radio" class="btn-check" name="reqType" id="reqTypeStock" value="STOCK" checked>
                        <label class="btn btn-outline-primary fw-bold" for="reqTypeStock"><i class="fas fa-box"></i> เบิกจากคลัง</label>
                        
                        <input type="radio" class="btn-check" name="reqType" id="reqTypeK2" value="K2">
                        <label class="btn btn-outline-warning text-dark fw-bold" for="reqTypeK2"><i class="fas fa-shopping-cart"></i> ขอสั่งซื้อ (K2)</label>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-secondary mb-1">หมายเหตุ</label>
                    <textarea id="reqRemark" class="form-control form-control-sm" rows="2" placeholder="ระบุเหตุผลการเบิก..."></textarea>
                </div>
                <button class="btn btn-success btn-sm w-100 fw-bold" onclick="submitRequisition()" disabled id="btnCheckout">
                    <i class="fas fa-paper-plane me-1"></i> ยืนยันส่งคำขอ
                </button>
            </div>
        </div>
    </div>

    <div class="modal fade" id="historyModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content rounded shadow-sm">
                <div class="modal-header bg-light py-2">
                    <h6 class="modal-title fw-bold"><i class="fas fa-history me-2 text-primary"></i>ประวัติการสั่งเบิก</h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3 bg-light">
                    <div class="row g-2 mb-3 bg-white p-2 rounded border">
                        <div class="col-5">
                            <small class="text-muted fw-bold d-block mb-1" style="font-size: 0.7rem;">ตั้งแต่ (Start)</small>
                            <input type="date" id="histStartDate" class="form-control form-control-sm">
                        </div>
                        <div class="col-5">
                            <small class="text-muted fw-bold d-block mb-1" style="font-size: 0.7rem;">ถึง (End)</small>
                            <input type="date" id="histEndDate" class="form-control form-control-sm">
                        </div>
                        <div class="col-2 d-flex align-items-end">
                            <button class="btn btn-primary btn-sm w-100" onclick="openHistoryModal()"><i class="fas fa-search"></i></button>
                        </div>
                    </div>
                    <div class="row g-2" id="orderHistoryList"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="trackingModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content rounded shadow-sm">
                <div class="modal-header bg-light py-2">
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary px-2" onclick="backToHistory()"><i class="fas fa-arrow-left"></i></button>
                        <div>
                            <h6 class="fw-bold mb-0" id="modalReqNo">REQ-XXXX</h6>
                            <small class="text-muted" style="font-size: 0.7rem;" id="modalReqTime">--/--/----</small>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0 bg-light">
                    <div class="bg-white px-3 py-2 border-bottom">
                        <div class="tracking-timeline" id="trackingTimeline"></div>
                        <div id="rejectAlert" class="alert alert-danger d-none mx-2 mb-2 py-1 px-2 small rounded-1 border-0">
                            <strong><i class="fas fa-exclamation-circle"></i> ปฏิเสธ:</strong> <span id="rejectReason"></span>
                        </div>
                    </div>
                    <div class="p-2">
                        <small class="fw-bold text-secondary d-block mb-2 ms-1">รายการวัสดุ</small>
                        <div id="modalItemsList" class="d-flex flex-column gap-1"></div>
                    </div>
                    <div id="issuerInfo" class="bg-white p-2 border-top text-center d-none small text-muted">
                        จ่ายของโดย: <span class="fw-bold text-dark" id="modalIssuerName"></span> (<span id="modalIssueTime"></span>)
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editItemModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content rounded shadow-sm">
                <div class="modal-header bg-dark text-white py-2">
                    <h6 class="modal-title fw-bold"><i class="fas fa-cog me-2"></i>แก้ไขข้อมูลสินค้า</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3">
                    <form id="quickEditForm">
                        <div class="mb-2">
                            <label class="form-label fw-bold small text-muted mb-1">SAP No.</label>
                            <input type="text" class="form-control form-control-sm bg-light" id="edit_sap_no" readonly>
                        </div>
                        <div class="mb-2">
                            <label class="form-label fw-bold small text-muted mb-1">Description</label>
                            <textarea class="form-control form-control-sm" id="edit_description" rows="2"></textarea>
                        </div>
                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted mb-1">Type</label>
                                <select class="form-select form-select-sm" id="edit_material_type">
                                    <option value="FG">FG</option>
                                    <option value="SEMI">SEMI</option>
                                    <option value="WIP">WIP</option>
                                    <option value="RM">RM</option>
                                    <option value="PKG">PKG</option>
                                    <option value="CON">CON</option>
                                    <option value="SP">SP</option>
                                    <option value="TOOL">TOOL</option>
                                    <option value="OTHER">OTHER</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted mb-1">Price (฿)</label>
                                <input type="number" class="form-control form-control-sm" id="edit_std_price" min="0" step="0.01">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light py-1 px-2 border-top">
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-sm btn-primary px-3" onclick="saveItemConfig()">บันทึก</button>
                </div>
            </div>
        </div>
    </div>

    <input type="file" id="globalImageUpload" class="d-none" accept="image/jpeg, image/png, image/webp">
    <input type="hidden" id="uploadTargetItemCode">

    <script>
        const CAN_MANAGE_IMAGE = <?php echo json_encode($canManageImage); ?>;
    </script>
    
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/materialReq.js?v=<?php echo time(); ?>"></script>
</body>
</html>