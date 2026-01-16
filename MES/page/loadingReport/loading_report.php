<?php
// page/loading/loading_report.php
require_once __DIR__ . '/../components/init.php';

// กำหนดค่า Header
$pageTitle = "Loading Inspection";
$pageIcon = "fas fa-truck-loading";
$pageHeaderTitle = "Loading Toolbox";
$pageHeaderSubtitle = "ใบตรวจสอบสภาพตู้สินค้า (6-Point & C-TPAT)";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    <link href="css/loading_report.css?v=<?php echo time(); ?>" rel="stylesheet">
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:2000; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2"></div>
        <div class="fw-bold text-dark">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>
    <?php include __DIR__ . '/../components/php/docking_sidebar.php'; ?>

    <div class="page-container">
        <div id="main-content">
            <div class="content-wrapper pt-3">
                <div class="container-fluid">
                    
                    <div id="view-job-list">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="text-muted fw-bold mb-0"><i class="far fa-calendar-alt me-2"></i>PLAN TODAY (<?php echo date('d/m/Y'); ?>)</h6>
                            <button class="btn btn-sm btn-outline-secondary" onclick="loadJobList()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        
                        <div id="jobListContainer" class="row g-2">
                            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                        </div>
                    </div>

                    <div id="view-report-form" style="display:none;">
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <button class="btn btn-outline-secondary rounded-pill px-3 btn-sm" onclick="switchView('list')">
                                <i class="fas fa-arrow-left me-1"></i> Back
                            </button>
                            <div class="fw-bold text-primary" id="disp_po_head">PO: -</div>
                        </div>

                        <ul class="nav nav-pills nav-fill mb-3 bg-white p-1 rounded shadow-sm">
                            <li class="nav-item">
                                <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-photos">
                                    <i class="fas fa-camera me-1"></i> Photo & Info
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-checklist" onclick="loadChecklistData()">
                                    <i class="fas fa-clipboard-check me-1"></i> 10-Point Check
                                </button>
                            </li>
                        </ul>

                        <div class="tab-content">
                            
                            <div class="tab-pane fade show active" id="tab-photos">
                                
                                <div class="card shadow-sm mb-3 border-start border-4 border-primary">
                                    <div class="card-body py-2">
                                        <div class="row align-items-center">
                                            <div class="col-7">
                                                <small class="text-muted d-block">SKU / Item:</small>
                                                <span class="fw-bold text-dark" id="disp_sku">-</span>
                                            </div>
                                            <div class="col-5 text-end border-start">
                                                <small class="text-muted d-block">Qty:</small>
                                                <span class="fw-bold text-primary fs-5" id="disp_qty">0</span>
                                            </div>
                                            <div class="col-12 mt-2 pt-2 border-top">
                                                <small class="text-muted me-2"><i class="fas fa-ticket-alt"></i> Booking:</small>
                                                <span class="fw-bold" id="disp_booking">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card shadow-sm mb-3">
                                    <div class="card-header info-card-header py-1">
                                        <i class="fas fa-truck me-1"></i> Truck & Container Info
                                    </div>
                                    <div class="card-body">
                                        <form id="headerForm">
                                            <div class="row g-2">
                                                <div class="col-6">
                                                    <label class="form-label-sm">Car License *</label>
                                                    <input type="text" id="input_car_license" class="form-control form-control-sm fw-bold" placeholder="e.g. 70-1234">
                                                </div>
                                                <div class="col-6">
                                                    <label class="form-label-sm">Size *</label>
                                                    <select class="form-select form-select-sm fw-bold" id="input_container_type">
                                                        <option value="" disabled selected>- Select -</option>
                                                        <option value="20'">20' FT</option>
                                                        <option value="40'">40' ST</option>
                                                        <option value="40'HC">40' HC</option>
                                                    </select>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label-sm">Container No. *</label>
                                                    <div class="input-group input-group-sm">
                                                        <span class="input-group-text input-group-text-icon"><i class="fas fa-barcode"></i></span>
                                                        <input type="text" id="input_container" class="form-control fw-bold text-uppercase" placeholder="ABCD 1234567">
                                                    </div>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label-sm">Seal No. *</label>
                                                    <div class="input-group input-group-sm">
                                                        <span class="input-group-text input-group-text-icon text-danger"><i class="fas fa-lock"></i></span>
                                                        <input type="text" id="input_seal" class="form-control fw-bold text-uppercase" placeholder="Enter Seal No.">
                                                    </div>
                                                </div>
                                                
                                                <div class="col-12 text-end">
                                                    <small class="text-muted fst-italic" style="font-size:0.7rem;"><i class="fas fa-save me-1"></i> Auto-saving...</small>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                <h6 class="text-secondary fw-bold mb-2 small"><i class="fas fa-camera me-1"></i> 6-Point Evidence</h6>
                                <div class="row g-2 mb-5">
                                    <?php 
                                    $photos = [
                                        'EMPTY' => '1. Empty Container',
                                        'STUFF50' => '2. Stuffing 50%',
                                        'STUFF100' => '3. Stuffing 100%',
                                        'DOOR50' => '4. Door (Left Closed)',
                                        'DOOR100' => '5. Door (Fully Closed)',
                                        'SEAL' => '6. Seal Lock'
                                    ];
                                    foreach ($photos as $key => $label): 
                                    ?>
                                    <div class="col-6 col-md-4">
                                        <div class="camera-box shadow-sm" id="box_<?php echo $key; ?>" onclick="triggerCamera('<?php echo $key; ?>')">
                                            <i class="fas fa-camera fa-2x text-muted mb-2" id="icon_<?php echo $key; ?>"></i>
                                            <span class="camera-label"><?php echo $label; ?></span>
                                        </div>
                                        <input type="file" id="file_<?php echo $key; ?>" accept="image/*" capture="environment" style="display:none;" onchange="handleFileSelect(this, '<?php echo $key; ?>')">
                                    </div>
                                    <?php endforeach; ?>
                                </div>

                            </div>

                            <div class="tab-pane fade" id="tab-checklist">
                                <div class="alert alert-info py-2 small mb-3">
                                    <i class="fas fa-info-circle me-1"></i> Strictly follow C-TPAT standards.
                                </div>

                                <?php 
                                // เรียกข้อมูลจากไฟล์ Config (ต้องสร้างไฟล์ loading_config.php ก่อนนะ)
                                require_once __DIR__ . '/loading_config.php'; 
                                $checklist = getCtpatChecklist(); 
                                
                                foreach ($checklist as $topicId => $topic): 
                                ?>
                                
                                <div class="card shadow-sm mb-4 border-0">
                                    <div class="card-header bg-primary text-white py-2">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="fw-bold"><i class="fas fa-check-square me-2"></i><?php echo $topicId . '. ' . $topic['title']; ?></span>
                                            <i class="fas fa-circle text-white-50 topic-status-icon" id="topic_icon_<?php echo $topicId; ?>"></i>
                                        </div>
                                    </div>
                                    
                                    <div class="list-group list-group-flush">
                                        <?php foreach ($topic['items'] as $index => $itemName): 
                                            $itemKey = $topicId . '_' . ($index + 1); // Key เช่น 1_1
                                            $subIndex = $index + 1;
                                        ?>
                                        <div class="list-group-item py-3">
                                            <div class="mb-2 fw-bold text-dark small">
                                                <?php echo $topicId . '.' . $subIndex . ' ' . $itemName; ?>
                                            </div>
                                            
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div class="btn-group btn-group-sm w-75" role="group">
                                                    <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="pass_<?php echo $itemKey; ?>" value="PASS" 
                                                           onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo $topic['title']; ?>', <?php echo $subIndex; ?>, '<?php echo $itemName; ?>')">
                                                    <label class="btn btn-outline-success" for="pass_<?php echo $itemKey; ?>">Pass</label>

                                                    <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="fail_<?php echo $itemKey; ?>" value="FAIL" 
                                                           onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo $topic['title']; ?>', <?php echo $subIndex; ?>, '<?php echo $itemName; ?>')">
                                                    <label class="btn btn-outline-danger" for="fail_<?php echo $itemKey; ?>">Fail</label>

                                                    <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="na_<?php echo $itemKey; ?>" value="N/A" 
                                                           onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo $topic['title']; ?>', <?php echo $subIndex; ?>, '<?php echo $itemName; ?>')">
                                                    <label class="btn btn-outline-secondary" for="na_<?php echo $itemKey; ?>">N/A</label>
                                                </div>
                                                
                                                <button class="btn btn-sm btn-light text-muted border" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_remark_<?php echo $itemKey; ?>">
                                                    <i class="fas fa-comment-alt"></i>
                                                </button>
                                            </div>

                                            <div class="collapse mt-2" id="collapse_remark_<?php echo $itemKey; ?>">
                                                <input type="text" class="form-control form-control-sm" id="remark_<?php echo $itemKey; ?>" 
                                                       placeholder="Remark (if any)..." 
                                                       onblur="saveSubItem(<?php echo $topicId; ?>, '<?php echo $topic['title']; ?>', <?php echo $subIndex; ?>, '<?php echo $itemName; ?>')">
                                            </div>
                                        </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                                <?php endforeach; ?>

                                <div class="d-grid gap-2 mt-4 mb-5">
                                    <button class="btn btn-primary btn-lg shadow" onclick="finishInspection()">
                                        <i class="fas fa-save me-2"></i> Finish Inspection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div> 
                </div> 
            </div> 
        </div> 
    </div> 
    
    <input type="hidden" id="current_so_id">
    <input type="hidden" id="current_report_id">

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script/loading_report.js?v=<?php echo time(); ?>"></script>
</body>
</html>