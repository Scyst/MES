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
        body { background-color: var(--bg-light-gray); overflow: hidden; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .product-card {
            border: 1px solid #eef2f6; border-radius: 12px; background: #fff;
            transition: all 0.2s ease-in-out; overflow: hidden; display: flex;
            flex-direction: column; height: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .product-card:hover { border-color: #0d6efd; box-shadow: 0 8px 25px rgba(13, 110, 253, 0.12); transform: translateY(-4px); }
        .product-img-wrapper { position: relative; width: 100%; padding-top: 100%; background-color: #f8f9fa; border-bottom: 1px solid #f1f1f1; }
        .product-img, .placeholder-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .stock-badge { position: absolute; top: 10px; left: 10px; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.15); z-index: 2; }
        .product-title { font-size: 0.9rem; font-weight: 700; color: #2c3e50; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; margin-bottom: 0.5rem; }
        .card-body-flex { flex: 1 1 auto; display: flex; flex-direction: column; padding: 1rem; }
        
        body.hide-images .product-img-wrapper { display: none !important; }
        body.hide-images .product-card { height: auto !important; min-height: 160px; }
        body.hide-images .badge-alt-container { display: block !important; }
        .stock-badge-alt { font-size: 0.75rem; font-weight: bold; }

        .cart-fab {
            position: fixed; bottom: 30px; right: 30px; width: 65px; height: 65px;
            background: linear-gradient(135deg, #0d6efd 0%, #0043a8 100%); color: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
            box-shadow: 0 4px 15px rgba(13, 110, 253, 0.4); cursor: pointer; z-index: 1040; transition: transform 0.2s;
        }
        .cart-fab:hover { transform: scale(1.05); color: white; }
        .cart-badge { position: absolute; top: -2px; right: -2px; background-color: #dc3545; font-size: 0.8rem; font-weight: bold; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; }

        .category-chip { padding: 8px 18px; border-radius: 25px; border: 1px solid #dee2e6; background: #fff; color: #495057; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 6px; }
        .category-chip:hover { background: #f8f9fa; border-color: #cbd5e0; }
        .category-chip.active { background: #0d6efd; color: #fff; border-color: #0d6efd; box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2); }
        .category-chip.active i { color: #fff !important; }

        .order-card-hist { background: #fff; border-radius: 12px; border: 1px solid #dee2e6; transition: transform 0.2s; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .order-card-hist:hover { transform: translateY(-2px); border-color: #0d6efd; box-shadow: 0 4px 10px rgba(13,110,253,0.1); }
        .tracking-timeline { display: flex; justify-content: space-between; position: relative; margin: 1.5rem 0; padding: 0 1rem; }
        .tracking-timeline::before { content: ''; position: absolute; top: 20px; left: 10%; width: 80%; height: 4px; background: #e9ecef; z-index: 1; border-radius: 2px; }
        .tracking-step { position: relative; z-index: 2; text-align: center; flex: 1; }
        .step-icon { width: 44px; height: 44px; border-radius: 50%; background: #e9ecef; color: #adb5bd; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 1.2rem; border: 4px solid #fff; transition: all 0.3s; }
        .step-label { font-size: 0.85rem; font-weight: bold; color: #6c757d; }
        .step-time { font-size: 0.7rem; color: #adb5bd; display: block; min-height: 15px;}
        .tracking-step.active .step-icon { background: #0d6efd; color: #fff; box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2); }
        .tracking-step.active .step-label { color: #0d6efd; }
        .tracking-step.completed .step-icon { background: #198754; color: #fff; }
        .tracking-step.completed .step-label { color: #198754; }
        .tracking-step.rejected .step-icon { background: #dc3545; color: #fff; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2); }
        .tracking-step.rejected .step-label { color: #dc3545; }
        .item-img-mini { width: 45px; height: 45px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }

        .sticky-toolbar {
            position: sticky; top: 0; z-index: 1020; background-color: rgba(244, 246, 249, 0.9);
            margin: -1rem -1rem -0.5rem -1rem; padding: 0 1rem 5px 1rem; 
            box-shadow: 0 10px 15px -10px rgba(0,0,0,0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.5);
        }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:2050; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2" style="width: 3rem; height: 3rem;"></div>
        <div class="fw-bold text-dark fs-5">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <div class="page-container">
        <main id="main-content" class="container-fluid px-3 px-lg-4 pt-3 pb-5">
            
            <div class="sticky-toolbar">
                <div class="bg-white rounded-3 shadow-sm p-2 mb-2 border">
                    <div class="row g-2 align-items-center">
                        <div class="col-12 col-md-6 col-lg-5">
                            <div class="input-group shadow-sm">
                                <span class="input-group-text bg-light text-primary border-end-0"><i class="fas fa-search"></i></span>
                                <input type="text" id="searchItem" class="form-control border-start-0" placeholder="ค้นหารหัส SAP, ชื่อวัสดุ..." autocomplete="off">
                            </div>
                        </div>
                        
                        <div class="col-12 col-md-6 col-lg-7 d-flex gap-2 align-items-center justify-content-md-end">
                            <select id="sortItem" class="form-select shadow-sm fw-bold border-secondary-subtle text-dark flex-grow-1 flex-md-grow-0" style="min-width: 130px; max-width: 200px; font-size: 0.85rem;" onchange="loadCatalog()">
                                <option value="DEFAULT">✅ พร้อมเบิก</option>
                                <option value="SAP_ASC">🔤 SAP (A-Z)</option>
                                <option value="SAP_DESC">🔤 SAP (Z-A)</option>
                                <option value="STOCK_DESC">📦 สต๊อกมากสุด</option>
                            </select>

                            <button id="toggleImageBtn" class="category-chip active flex-shrink-0 m-0" onclick="toggleImages()" title="ซ่อน/แสดงรูปภาพ" style="height: 38px; border-radius: 8px;">
                                <i class="fas fa-image"></i> <span class="d-none d-sm-inline">แสดงรูป</span>
                            </button>
                            
                            <button class="btn btn-outline-primary shadow-sm fw-bold rounded-pill flex-shrink-0 px-3" onclick="openHistoryModal()" title="ประวัติการเบิกของฉัน">
                                <i class="fas fa-history"></i> <span class="d-none d-sm-inline ms-1">ประวัติ</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="d-flex gap-2 overflow-auto hide-scrollbar pb-2 px-1" style="scroll-snap-type: x mandatory; margin-top: 0.6rem;">
                    <div class="category-chip active" data-category="ALL" onclick="filterCategory('ALL', this)" style="scroll-snap-align: start;">All Items</div>
                    <div class="category-chip" data-category="RM" onclick="filterCategory('RM', this)" style="scroll-snap-align: start;"><i class="fas fa-cubes text-primary"></i> RM</div>
                    <div class="category-chip" data-category="PKG" onclick="filterCategory('PKG', this)" style="scroll-snap-align: start;"><i class="fas fa-box text-warning"></i> PKG</div>
                    <div class="category-chip" data-category="CON" onclick="filterCategory('CON', this)" style="scroll-snap-align: start;"><i class="fas fa-pump-soap text-success"></i> CON (สิ้นเปลือง)</div>
                    <div class="category-chip" data-category="SP" onclick="filterCategory('SP', this)" style="scroll-snap-align: start;"><i class="fas fa-cogs text-danger"></i> SP (อะไหล่)</div>
                    <div class="category-chip" data-category="TOOL" onclick="filterCategory('TOOL', this)" style="scroll-snap-align: start;"><i class="fas fa-wrench text-info"></i> TOOL</div>
                </div>
            </div>

            <div class="row g-2 g-md-3 g-lg-4 mt-1" id="catalogGrid"></div>
        </main>
    </div>

    <div class="cart-fab" data-bs-toggle="offcanvas" data-bs-target="#cartOffcanvas">
        <i class="fas fa-shopping-cart"></i>
        <span class="cart-badge" id="cartItemCount">0</span>
    </div>

    <div class="offcanvas offcanvas-end shadow-lg" tabindex="-1" id="cartOffcanvas" style="width: 450px; max-width: 100vw;">
        <div class="offcanvas-header bg-primary text-white border-bottom border-primary border-3">
            <h5 class="offcanvas-title fw-bold"><i class="fas fa-shopping-cart me-2"></i>ตะกร้าเบิกของ (My Cart)</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-0 d-flex flex-column bg-light">
            <div class="flex-grow-1 overflow-auto p-3" id="cartItemsContainer"></div>
            <div class="bg-white border-top p-3 p-md-4 shadow-lg">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-dark mb-2"><i class="fas fa-tags me-1 text-primary"></i> เลือกประเภทคำขอ</label>
                    <div class="btn-group w-100 shadow-sm" role="group">
                        <input type="radio" class="btn-check" name="reqType" id="reqTypeStock" value="STOCK" checked>
                        <label class="btn btn-outline-primary fw-bold" for="reqTypeStock"><i class="fas fa-box me-1"></i> เบิกจากคลัง</label>
                        
                        <input type="radio" class="btn-check" name="reqType" id="reqTypeK2" value="K2">
                        <label class="btn btn-outline-warning fw-bold text-dark" for="reqTypeK2"><i class="fas fa-shopping-cart me-1"></i> ขอสั่งซื้อ (K2)</label>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-dark mb-2"><i class="fas fa-comment-dots me-1 text-primary"></i> หมายเหตุ / จุดประสงค์</label>
                    <textarea id="reqRemark" class="form-control bg-light" rows="2" placeholder="เช่น นำไปใช้ซ่อมเครื่องจักร..."></textarea>
                </div>
                <button class="btn btn-success w-100 py-3 fw-bold rounded-3 shadow-sm fs-5" onclick="submitRequisition()" disabled id="btnCheckout">
                    <i class="fas fa-paper-plane me-2"></i> ยืนยันส่งคำขอ
                </button>
            </div>
        </div>
    </div>

    <div class="modal fade" id="historyModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
                <div class="modal-header bg-white border-bottom shadow-sm z-1">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-history me-2 text-primary"></i>ประวัติการสั่งเบิก (Order History)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-light p-3 p-md-4">
                    <div class="row g-2 mb-3 bg-white p-2 rounded shadow-sm border">
                        <div class="col-5">
                            <small class="text-muted fw-bold" style="font-size: 0.7rem;">ตั้งแต่ (Start)</small>
                            <input type="date" id="histStartDate" class="form-control form-control-sm text-center fw-bold text-primary">
                        </div>
                        <div class="col-5">
                            <small class="text-muted fw-bold" style="font-size: 0.7rem;">ถึง (End)</small>
                            <input type="date" id="histEndDate" class="form-control form-control-sm text-center fw-bold text-primary">
                        </div>
                        <div class="col-2 d-flex align-items-end">
                            <button class="btn btn-primary btn-sm w-100 fw-bold shadow-sm" onclick="openHistoryModal()"><i class="fas fa-search"></i></button>
                        </div>
                    </div>
                    <div class="row g-2" id="orderHistoryList"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="trackingModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
                <div class="modal-header bg-light border-bottom-0 pb-0">
                    <div class="d-flex align-items-center gap-3">
                        <button class="btn btn-sm btn-outline-secondary rounded-circle" onclick="backToHistory()" style="width: 32px; height: 32px; padding: 0;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h5 class="modal-title fw-bold text-dark mb-0" id="modalReqNo">REQ-XXXX</h5>
                            <small class="text-muted" id="modalReqTime"><i class="far fa-clock"></i> --/--/----</small>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="bg-light px-3 pt-3 pb-3 border-bottom">
                        <div class="tracking-timeline" id="trackingTimeline"></div>
                        <div id="rejectAlert" class="alert alert-danger d-none mx-3 mb-0 border-0 shadow-sm rounded-3 py-2">
                            <h6 class="fw-bold mb-1 fs-6"><i class="fas fa-exclamation-circle me-1"></i> สโตร์ปฏิเสธการจ่ายของ</h6>
                            <span id="rejectReason" class="small">-</span>
                        </div>
                    </div>
                    <div class="p-3 bg-white">
                        <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-box-open me-2"></i>รายการวัสดุที่เบิก</h6>
                        <div id="modalItemsList" class="d-flex flex-column gap-2"></div>
                    </div>
                    <div id="issuerInfo" class="bg-light p-2 border-top text-center d-none">
                        <small class="text-muted">จ่ายของโดย: <span class="fw-bold text-dark" id="modalIssuerName"></span> (<span id="modalIssueTime"></span>)</small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="editItemModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0" style="border-radius: 12px;">
                <div class="modal-header bg-dark text-white py-3 border-0" style="border-top-left-radius: 12px; border-top-right-radius: 12px;">
                    <h5 class="modal-title fw-bold"><i class="fas fa-cog text-info me-2"></i>แก้ไขข้อมูลสินค้า (Quick Edit)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-light">
                    <form id="quickEditForm">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted mb-1">รหัส SAP No.</label>
                            <input type="text" class="form-control fw-bold text-primary bg-white" id="edit_sap_no" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted mb-1">ชื่อวัสดุ (Description)</label>
                            <textarea class="form-control" id="edit_description" rows="2"></textarea>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted mb-1">หมวดหมู่ (Type)</label>
                                <select class="form-select fw-bold text-dark" id="edit_material_type">
                                    <option value="FG">FG (Finished Good)</option>
                                    <option value="SEMI">SEMI (Semi-Finished)</option>
                                    <option value="WIP">WIP (Work in Process)</option>
                                    <option value="RM">RM (Raw Material)</option>
                                    <option value="PKG">PKG (Packaging)</option>
                                    <option value="CON">CON (Consumable)</option>
                                    <option value="SP">SP (Spare Part)</option>
                                    <option value="TOOL">TOOL (Tools)</option>
                                    <option value="OTHER">OTHER (อื่นๆ)</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted mb-1">ราคามาตรฐาน (Standard Price)</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-white text-success">฿</span>
                                    <input type="number" class="form-control fw-bold text-success" id="edit_std_price" min="0" step="0.01">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer border-top bg-white d-flex justify-content-end" style="border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                    <button type="button" class="btn btn-light fw-bold border" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" onclick="saveItemConfig()">บันทึกข้อมูล</button>
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