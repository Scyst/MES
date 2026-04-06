<?php
// page/loading/loading_report.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('view_production')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$pageTitle = "C-TPAT Loading Inspection";
$pageHeaderTitle = "C-TPAT Loading";
$pageHeaderSubtitle = "ตรวจสอบตู้สินค้าและบันทึกภาพถ่ายก่อนการส่งออก";
$pageIcon = "fas fa-truck-loading";

$defaultStart = date('Y-m-d', strtotime('-7 days'));
$defaultEnd = date('Y-m-d');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    <link href="css/loading_report.css?v=<?php echo filemtime(__DIR__ . '/css/loading_report.css'); ?>" rel="stylesheet">
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:2000; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2"></div>
        <div class="fw-bold text-dark">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <div class="page-container">
        <main id="main-content" class="px-2 px-lg-3 pt-3">
            
            <div class="row g-3 split-layout-height">
                
                <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100" id="left-pane">
                    <div class="bg-white border rounded-3 shadow-sm p-2 mb-2 flex-shrink-0">
                        <div class="d-flex flex-column gap-2">
                            <div class="input-group input-group-sm w-100 shadow-sm">
                                <span class="input-group-text bg-light text-secondary"><i class="fas fa-search"></i></span>
                                <input type="text" id="filter_search" class="form-control" placeholder="Search PO, Container, Inv...">
                            </div>
                            <div class="d-flex gap-1">
                                <div class="input-group input-group-sm shadow-sm" style="flex: 1;">
                                    <input type="date" id="filter_start" class="form-control text-center px-0" value="<?php echo $defaultStart; ?>" onchange="loadJobList()">
                                    <span class="input-group-text bg-light px-1 border-start-0 border-end-0">-</span>
                                    <input type="date" id="filter_end" class="form-control text-center px-0" value="<?php echo $defaultEnd; ?>" onchange="loadJobList()">
                                </div>
                                <select id="filter_status" class="form-select form-select-sm shadow-sm fw-bold border-secondary-subtle" style="width: 100px;" onchange="loadJobList()">
                                    <option value="ALL">All Status</option>
                                    <option value="DRAFT" class="text-warning">In Progress</option>
                                    <option value="COMPLETED" class="text-success">Completed</option>
                                </select>
                                <button class="btn btn-sm btn-light border shadow-sm text-secondary px-2" onclick="resetSearch()"><i class="fas fa-sync-alt"></i></button>
                            </div>
                        </div>
                    </div>

                    <div class="list-group list-group-flush border rounded-3 shadow-sm flex-grow-1 overflow-auto hide-scrollbar bg-white p-2 gap-2" id="jobListContainer">
                        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                    </div>
                </div>

                <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100" id="right-pane">
                    
                    <div class="bg-white border rounded-3 shadow-sm flex-grow-1 d-flex flex-column overflow-hidden position-relative">
                        
                        <div id="empty-state" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                            <i class="fas fa-clipboard-list fa-5x mb-3"></i>
                            <h4>Select a Job to start inspection</h4>
                        </div>

                        <div id="form-content" class="flex-grow-1 d-none flex-column overflow-hidden bg-light">
                            
                            <div class="flex-grow-1 overflow-auto hide-scrollbar p-2 px-md-3 py-md-2">
                                
                                <div class="card border-0 shadow-sm mb-3 flex-shrink-0">
                                    <div class="card-header bg-primary text-white p-3 d-flex justify-content-between align-items-center border-0 rounded-top">
                                        <div class="d-flex align-items-center gap-3">
                                            <button class="btn btn-sm btn-light text-primary d-lg-none rounded-circle shadow-sm" onclick="switchView('list')" style="width: 32px; height: 32px; padding: 0;">
                                                <i class="fas fa-arrow-left"></i>
                                            </button>
                                            <h5 class="mb-0 fw-bold" id="disp_po_head">LOADING...</h5>
                                        </div>
                                        <span class="badge bg-white text-primary fw-bold px-2 py-1 fs-6 shadow-sm d-none" id="disp_invoice_badge">INV: <span id="disp_invoice">-</span></span>
                                    </div>
                                    <div class="card-body p-2 p-md-2 bg-white rounded-bottom">
                                        <div class="row g-2 text-center">
                                            <div class="col-6 col-md-3 border-end border-bottom border-md-bottom-0 pb-2 pb-md-0"><small class="info-label d-block text-muted">Qty</small><span id="disp_qty" class="fw-bold text-dark fs-6">-</span></div>
                                            <div class="col-6 col-md-3 border-end-md border-bottom border-md-bottom-0 pb-2 pb-md-0"><small class="info-label d-block text-muted">Booking</small><span id="disp_booking" class="fw-bold text-dark fs-6 text-break">-</span></div>
                                            <div class="col-6 col-md-3 border-end"><small class="info-label d-block text-muted">Cont. Plan</small><span id="disp_container_plan" class="fw-bold text-dark fs-6">-</span></div>
                                            <div class="col-6 col-md-3"><small class="info-label d-block text-muted">Seal Plan</small><span id="disp_seal_plan" class="fw-bold text-dark fs-6">-</span></div>
                                        </div>
                                    </div>
                                </div>

                                <ul class="nav nav-pills custom-pills mb-3 w-100" id="reportTabs" role="tablist">
                                    <li class="nav-item flex-fill" role="presentation">
                                        <button class="nav-link w-100 active text-center" id="info-tab" data-bs-toggle="tab" data-bs-target="#tab-info" type="button" role="tab">ข้อมูล & ภาพถ่าย <span class="badge bg-light text-dark ms-1 border" id="badge-photo">0/12</span>
                                        </button>
                                    </li>
                                    <li class="nav-item flex-fill" role="presentation">
                                        <button class="nav-link w-100 text-center" id="check-tab" data-bs-toggle="tab" data-bs-target="#tab-check" type="button" role="tab">10-Point Checklist <span class="badge bg-light text-dark ms-1 border" id="badge-check">0/0</span></button>
                                    </li>
                                </ul>

                                <div class="tab-content flex-grow-1" id="reportTabContent">
                                    
                                    <div class="tab-pane fade show active h-100" id="tab-info" role="tabpanel">
                                        <div class="row g-3">
                                            <div class="col-12 col-md-6">
                                                <div class="card shadow-sm h-100 border-0 border-top border-secondary border-3">
                                                    <div class="card-header bg-white border-bottom fw-bold text-dark py-2"><i class="fas fa-truck text-secondary me-2"></i>Shipment Info</div>
                                                    <div class="card-body p-3">
                                                        <div class="row g-2">
                                                            <div class="col-12">
                                                                <label class="form-label small fw-bold text-muted mb-1">Container No.</label>
                                                                <input type="text" id="input_container" class="form-control form-control-sm fw-bold text-primary bg-light" placeholder="ระบุเบอร์ตู้">
                                                            </div>
                                                            <div class="col-6">
                                                                <label class="form-label small fw-bold text-muted mb-1">Size</label>
                                                                <select id="input_container_type" class="form-select form-select-sm fw-bold bg-light" onchange="toggleContainerOther()">
                                                                    <option value="">Select...</option>
                                                                    <option value="20GP">20' GP</option><option value="40GP">40' GP</option>
                                                                    <option value="40HQ">40' HQ</option><option value="45HQ">45' HQ</option>
                                                                    <option value="OTHER" class="text-primary fw-bold">-- Others --</option>
                                                                </select>
                                                                <input type="text" id="input_container_type_other" class="form-control form-control-sm mt-1 d-none text-primary bg-light" placeholder="ระบุ...">
                                                            </div>
                                                            <div class="col-6">
                                                                <label class="form-label small fw-bold text-muted mb-1">License Plate</label>
                                                                <input type="text" id="input_car_license" class="form-control form-control-sm fw-bold bg-light" placeholder="ทะเบียน">
                                                            </div>
                                                            <div class="col-12">
                                                                <label class="form-label small fw-bold text-muted mb-1">Seal No.</label>
                                                                <input type="text" id="input_seal" class="form-control form-control-sm fw-bold text-success bg-light" placeholder="เลขซีล">
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-12 col-md-6">
                                                <div class="card shadow-sm h-100 border-0 border-top border-info border-3">
                                                    <div class="card-header bg-white border-bottom fw-bold text-dark py-2"><i class="fas fa-users text-info me-2"></i>Personnel & Time</div>
                                                    <div class="card-body p-3">
                                                        <div class="row g-2">
                                                            <div class="col-12"><label class="form-label small fw-bold text-muted mb-1">Driver Name</label><input type="text" id="input_driver" class="form-control form-control-sm bg-light" placeholder="ชื่อคนขับ"></div>
                                                            <div class="col-6"><label class="form-label small fw-bold text-muted mb-1">Inspector</label><input type="text" id="input_inspector" class="form-control form-control-sm bg-light" placeholder="ผู้ตรวจ"></div>
                                                            <div class="col-6"><label class="form-label small fw-bold text-muted mb-1">Supervisor</label><input type="text" id="input_supervisor" class="form-control form-control-sm bg-light" placeholder="หัวหน้า"></div>
                                                            <div class="col-6"><label class="form-label small fw-bold text-muted mb-1">Start Time</label><input type="datetime-local" id="input_start_time" class="form-control form-control-sm bg-light"></div>
                                                            <div class="col-6"><label class="form-label small fw-bold text-muted mb-1">End Time</label><input type="datetime-local" id="input_end_time" class="form-control form-control-sm bg-light"></div>
                                                            <input type="hidden" id="input_location"><input type="hidden" id="input_cable_seal">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="card shadow-sm mt-3 border-0 border-top border-warning border-3">
                                            <div class="card-header bg-white border-bottom fw-bold text-dark py-2"><i class="fas fa-camera text-warning me-2"></i>Photo Evidence (12 Points)</div>
                                            <div class="card-body p-3 pt-0">
                                                <div class="photo-filmstrip">
                                                    <?php 
                                                    $photoPoints = [
                                                        'undercarriage' => '1. Gate Pass', 'outside_door' => '2. Seal Condition',
                                                        'right_side' => '3. Container No.', 'left_side' => '4. Empty Cont.',
                                                        'floor_moisture' => '5. Floor Moisture', 'front_wall' => '6. Half Loaded',
                                                        'cargo_moisture' => '7. Cargo Moisture', 'ceiling_roof' => '8. Full Loaded',
                                                        'floor' => '9. Right Door', 'inside_empty' => '10. All Doors',
                                                        'inside_loaded' => '11. Seal Lock', 'seal_lock' => '12. Shipping Doc'
                                                    ];
                                                    foreach ($photoPoints as $key => $label): 
                                                    ?>
                                                    <div class="camera-wrapper">
                                                        <div class="camera-box shadow-sm" id="box_<?php echo $key; ?>" onclick="triggerCamera('<?php echo $key; ?>')">
                                                            <i class="fas fa-camera fa-2x text-secondary opacity-50"></i>
                                                        </div>
                                                        <div class="camera-label"><?php echo $label; ?></div>
                                                        <input type="file" id="file_<?php echo $key; ?>" accept="image/*" capture="environment" hidden onchange="handleFileSelect(this, '<?php echo $key; ?>')">
                                                    </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="tab-pane fade" id="tab-check" role="tabpanel">
                                        
                                        <div class="d-flex justify-content-between align-items-center mb-3 bg-white p-2 border rounded shadow-sm">
                                            <span class="fw-bold text-primary ms-2"><i class="fas fa-list-check me-2"></i>Inspection Items</span>
                                            <button type="button" class="btn btn-sm btn-outline-success fw-bold rounded-pill px-3 shadow-sm me-1" id="btn_pass_all" onclick="triggerPassAll()">
                                                <i class="fas fa-check-double me-1"></i> Pass All
                                            </button>
                                        </div>

                                        <?php 
                                        require_once __DIR__ . '/loading_config.php'; 
                                        $checklist = getCtpatChecklist(); 
                                        $tCounter = 1; 
                                        foreach ($checklist as $tConfig): 
                                            $topicId = $tCounter++;
                                        ?>
                                        <div class="checklist-card shadow-sm border-0 border-top border-secondary border-3">
                                            <div class="checklist-header bg-white text-dark py-2">
                                                <i class="fas fa-check-circle me-2 text-secondary opacity-25" id="topic_icon_<?php echo $topicId; ?>"></i>
                                                <?php echo $topicId . '. ' . $tConfig['title']; ?>
                                            </div>
                                            <div class="checklist-body p-0">
                                                <?php 
                                                $iCounter = 1;
                                                foreach ($tConfig['items'] as $itemName): 
                                                    $subIndex = $iCounter++;
                                                    $itemKey = $topicId . '_' . $subIndex;
                                                ?>
                                                <div class="sub-item-row" id="row_<?php echo $itemKey; ?>">
                                                    <div class="sub-item-text"><?php echo $itemName; ?></div>
                                                    <div class="sub-item-controls">
                                                        <div class="btn-group btn-group-sm shadow-sm" role="group">
                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="pass_<?php echo $itemKey; ?>" value="PASS" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-success fw-bold" for="pass_<?php echo $itemKey; ?>">PASS</label>
                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="fail_<?php echo $itemKey; ?>" value="FAIL" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-danger fw-bold" for="fail_<?php echo $itemKey; ?>">FAIL</label>
                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="na_<?php echo $itemKey; ?>" value="N/A" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-secondary fw-bold" for="na_<?php echo $itemKey; ?>">N/A</label>
                                                        </div>
                                                        <input type="text" class="form-control form-control-sm bg-light" id="remark_<?php echo $itemKey; ?>" placeholder="Remark / หมายเหตุ..." onblur="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                    </div>
                                                </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                        <?php endforeach; ?>
                                    </div>

                                </div> 
                            </div> <div id="form-action-bar" class="bg-white border-top p-2 flex-shrink-0 position-sticky bottom-0 shadow-lg" style="z-index: 1020;">
                                </div>

                        </div> </div>
                </div> 

            </div>
        </main>
    </div>

    <input type="hidden" id="current_so_id">
    <input type="hidden" id="current_report_id">

    <script src="../../utils/libs/jquery-3.6.0.min.js"></script>
    <script src="script/loading_report.js?v=<?php echo filemtime(__DIR__ . '/script/loading_report.js'); ?>" defer></script>
</body>
</html>