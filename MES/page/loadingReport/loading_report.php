<?php
// page/loading/loading_report.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Loading Inspection";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    
    <link href="css/loading_report.css?v=<?php echo time(); ?>" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

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
                <div class="container-fluid px-3 px-lg-4">
                    
                    <div id="view-job-list">
                        <div class="row align-items-center mb-2">
                            <div class="col-12"><h6 class="text-muted fw-bold mb-0"><i class="far fa-calendar-alt me-2"></i>JOB LIST & HISTORY</h6></div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-12">
                                <div class="input-group shadow-sm">
                                    <input type="date" id="filter_date" class="form-control" style="max-width: 140px;" value="<?php echo date('Y-m-d'); ?>">
                                    <input type="text" id="filter_search" class="form-control" placeholder="PO / Container / Booking...">
                                    <button class="btn btn-primary" onclick="loadJobList()" type="button"><i class="fas fa-search"></i></button>
                                    <button class="btn btn-outline-secondary" onclick="resetSearch()" type="button"><i class="fas fa-sync-alt"></i></button>
                                </div>
                            </div>
                        </div>
                        <div id="jobListContainer" class="row g-2">
                            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                        </div>
                    </div> 

                    <div id="view-report-form" style="display:none;">
        
                        <nav class="navbar navbar-light bg-white border-bottom shadow-sm sticky-top d-lg-none" style="z-index: 1020;">
                            <div class="container-fluid">
                                <button class="btn btn-link text-secondary text-decoration-none fw-bold" onclick="switchView('list')"><i class="fas fa-chevron-left me-1"></i> Back</button>
                                <span class="navbar-text fw-bold text-primary" id="disp_po_nav">PO: Loading...</span>
                            </div>
                        </nav>

                        <div class="d-none d-lg-block pt-3 pb-2">
                            <button class="btn btn-white border shadow-sm text-secondary fw-bold px-3 py-2 rounded-pill hover-scale" onclick="goBackToList()">
                                <i class="fas fa-arrow-left me-2"></i> ย้อนกลับ (Back to List)
                            </button>
                        </div>

                        <div class="row g-4">
                            
                            <div class="col-12 col-lg-8">
                                
                                <div class="info-card mb-3 shadow-sm bg-white">
                                    <div class="info-card-header bg-primary text-white p-3 rounded-top d-flex justify-content-between align-items-center">
                                        <div>
                                            <i class="fas fa-box-open me-2"></i>
                                            <span id="disp_po_head" class="fw-bold">LOADING...</span>
                                        </div>
                                        <span class="badge bg-white text-primary fw-bold">
                                            INV: <span id="disp_invoice">-</span>
                                        </span>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-2">
                                            <div class="col-6 col-md-3 border-end"><small class="text-muted d-block">Qty</small><span id="disp_qty" class="fw-bold">-</span></div>
                                            <div class="col-6 col-md-3 border-end-md"><small class="text-muted d-block">Booking</small><span id="disp_booking" class="fw-bold text-break">-</span></div>
                                            <div class="col-6 col-md-3 border-end"><small class="text-muted d-block">Cont. Plan</small><span id="disp_container_plan" class="fw-bold">-</span></div>
                                            <div class="col-6 col-md-3"><small class="text-muted d-block">Seal Plan</small><span id="disp_seal_plan" class="fw-bold">-</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div class="row g-3 mb-3">
                                    <div class="col-12 col-md-6">
                                        <div class="card shadow-sm h-100">
                                            <div class="card-header bg-light border-bottom fw-bold text-primary py-2 small"><i class="fas fa-truck me-2"></i>Shipment Info</div>
                                            <div class="card-body p-3">
                                                <div class="row g-2">
                                                    <div class="col-12">
                                                        <label class="form-label-sm mb-0">Container No.</label>
                                                        <div class="input-group input-group-sm">
                                                            <span class="input-group-text bg-white"><i class="fas fa-cube text-muted"></i></span>
                                                            <input type="text" id="input_container" class="form-control fw-bold" placeholder="ระบุเบอร์ตู้">
                                                        </div>
                                                    </div>
                                                    <div class="col-6">
                                                        <label class="form-label-sm mb-0">Size</label>
                                                        <div class="d-flex flex-column">
                                                            <select id="input_container_type" class="form-select form-select-sm fw-bold" onchange="toggleContainerOther()">
                                                                <option value="">Select...</option>
                                                                <option value="20GP">20' GP</option>
                                                                <option value="40GP">40' GP</option>
                                                                <option value="40HQ">40' HQ</option>
                                                                <option value="45HQ">45' HQ</option>
                                                                <option value="OTHER" class="text-primary fw-bold">-- Others (ระบุเอง) --</option>
                                                            </select>

                                                            <input type="text" id="input_container_type_other" 
                                                                class="form-control form-select-sm mt-1 d-none text-primary" 
                                                                placeholder="ระบุประเภทตู้...">
                                                        </div>
                                                    </div>
                                                    <div class="col-5">
                                                        <label class="form-label-sm mb-0">License</label>
                                                        <input type="text" id="input_car_license" class="form-control form-control-sm" placeholder="ทะเบียน">
                                                    </div>
                                                    <div class="col-12">
                                                        <label class="form-label-sm mb-0">Seal No.</label>
                                                        <div class="input-group input-group-sm">
                                                            <span class="input-group-text bg-white"><i class="fas fa-lock text-success"></i></span>
                                                            <input type="text" id="input_seal" class="form-control fw-bold text-success" placeholder="เลขซีล">
                                                        </div>
                                                    </div>
                                                    <div class="col-12">
                                                        <label class="form-label-sm mb-0">Cable Seal</label>
                                                        <input type="text" id="input_cable_seal" class="form-control form-control-sm" placeholder="Cable Seal">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-12 col-md-6">
                                        <div class="card shadow-sm h-100">
                                            <div class="card-header bg-light border-bottom fw-bold text-primary py-2 small"><i class="fas fa-users me-2"></i>Personnel</div>
                                            <div class="card-body p-3">
                                                <div class="row g-2">
                                                    <div class="col-12"><input type="text" id="input_driver" class="form-control form-control-sm" placeholder="Driver Name"></div>
                                                    <div class="col-6"><input type="text" id="input_inspector" class="form-control form-control-sm" placeholder="Inspector"></div>
                                                    <div class="col-6"><input type="text" id="input_supervisor" class="form-control form-control-sm" placeholder="Supervisor"></div>
                                                    <div class="col-12"><input type="text" id="input_location" class="form-control form-control-sm" placeholder="Location"></div>
                                                    <div class="col-6"><label class="small text-muted mb-0">Start</label><input type="datetime-local" id="input_start_time" class="form-control form-control-sm"></div>
                                                    <div class="col-6"><label class="small text-muted mb-0">End</label><input type="datetime-local" id="input_end_time" class="form-control form-control-sm"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card shadow-sm mb-3 border">
                                    <div class="card-header bg-white fw-bold text-primary py-2 small"><i class="fas fa-camera me-2"></i>Photo Evidence (10 Points)</div>
                                    <div class="card-body p-3">
                                        <div class="row g-3">
                                            <?php 
                                            $photoPoints = [
                                                'undercarriage' => '1. Gate Pass (ใบผ่าน รปภ.)',
                                                'outside_door' => '2. Seal Condition (สภาพซีล)',
                                                'right_side' => '3. Container No. (เบอร์ตู้)',
                                                'left_side' => '4. Empty Container (ตู้เปล่า)',
                                                'front_wall' => '5. Half Loaded (ครึ่งตู้)',
                                                'ceiling_roof' => '6. Full Loaded (เต็มตู้)',
                                                'floor' => '7. Right Door Closed (ปิดขวา)',
                                                'inside_empty' => '8. All Doors Closed (ปิด 2 ฝั่ง)',
                                                'inside_loaded' => '9. Seal Lock (ล็อคซีล)',
                                                'seal_lock' => '10. Shipping Doc (ใบของออก)'
                                            ];
                                            
                                            foreach ($photoPoints as $key => $label): 
                                            ?>
                                            <div class="col-6 col-md-4 col-lg-20"> 
                                                <div class="camera-box shadow-sm border bg-white" id="box_<?php echo $key; ?>" onclick="triggerCamera('<?php echo $key; ?>')" style="min-height: 110px; cursor:pointer;">
                                                    <i class="fas fa-camera fa-2x text-secondary mb-2 opacity-50"></i>
                                                    <div class="camera-label px-1 small text-muted" style="line-height: 1.2; font-size: 0.75rem; word-wrap: break-word;">
                                                        <?php echo $label; ?>
                                                    </div>
                                                </div>
                                                <input type="file" id="file_<?php echo $key; ?>" accept="image/*" capture="environment" hidden onchange="handleFileSelect(this, '<?php echo $key; ?>')">
                                            </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>

                            </div> <div class="col-12 col-lg-4">
                                <div class="d-flex justify-content-between align-items-center mb-2 bg-white py-2 px-3 rounded shadow-sm sticky-top-offset border d-none d-lg-flex">
                                    <div class="fw-bold text-dark"><i class="fas fa-tasks me-2 text-primary"></i>Checklist</div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="$('.collapse').collapse('show')">Expand All</button>
                                </div>
                                <div class="photo-section-title mb-2 d-lg-none">Inspection Checklist</div>

                                <div class="checklist-scroll-area"> 
                                    <?php 
                                    require_once __DIR__ . '/loading_config.php'; 
                                    $checklist = getCtpatChecklist(); 
                                    $tCounter = 1; 
                                    foreach ($checklist as $tConfig): 
                                        $topicId = $tCounter++;
                                    ?>
                                    <div class="checklist-card mb-2 border shadow-sm bg-white">
                                        <button class="checklist-header w-100 border-0 text-start d-flex justify-content-between align-items-center bg-white py-2 px-3 rounded" 
                                                type="button" onclick="toggleAccordion('collapse_topic_<?php echo $topicId; ?>')">
                                            <div class="d-flex align-items-center text-truncate">
                                                <i class="fas fa-circle me-2 text-white-50" id="topic_icon_<?php echo $topicId; ?>" style="font-size: 0.7rem; border:1px solid #ddd; border-radius:50%; padding:2px;"></i>
                                                <span class="text-dark fw-bold small text-truncate"><?php echo $topicId . '. ' . $tConfig['title']; ?></span>
                                            </div>
                                            <i class="fas fa-chevron-down text-muted small"></i>
                                        </button>

                                        <div class="collapse" id="collapse_topic_<?php echo $topicId; ?>">
                                            <div class="checklist-body border-top p-0">
                                                <?php 
                                                $iCounter = 1;
                                                foreach ($tConfig['items'] as $itemName): 
                                                    $subIndex = $iCounter++;
                                                    $itemKey = $topicId . '_' . $subIndex;
                                                ?>
                                                <div class="sub-item-row p-2 border-bottom" id="row_<?php echo $itemKey; ?>">
                                                    <div class="mb-1 text-dark" style="font-size: 0.85rem;"><?php echo $itemName; ?></div>
                                                    <div class="d-flex flex-column gap-2">
                                                        <div class="btn-group w-100 btn-group-sm" role="group">
                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="pass_<?php echo $itemKey; ?>" value="PASS" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-success py-0" for="pass_<?php echo $itemKey; ?>" style="font-size: 0.8rem;">PASS</label>

                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="fail_<?php echo $itemKey; ?>" value="FAIL" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-danger py-0" for="fail_<?php echo $itemKey; ?>" style="font-size: 0.8rem;">FAIL</label>

                                                            <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="na_<?php echo $itemKey; ?>" value="N/A" onchange="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                            <label class="btn btn-outline-secondary py-0" for="na_<?php echo $itemKey; ?>" style="font-size: 0.8rem;">N/A</label>
                                                        </div>
                                                        <div class="collapse" id="collapse_remark_<?php echo $itemKey; ?>">
                                                            <input type="text" class="form-control form-control-sm bg-light" style="font-size: 0.8rem;" id="remark_<?php echo $itemKey; ?>" placeholder="Remark..." onblur="saveSubItem(<?php echo $topicId; ?>, '...', <?php echo $subIndex; ?>, '...')">
                                                        </div>
                                                    </div>
                                                </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <?php endforeach; ?>
                                </div>
                            </div> </div> <div class="sticky-footer bg-white shadow-lg border-top px-3 py-2">
                            <div class="d-flex align-items-center justify-content-between gap-2">
                                <div class="form-check form-switch mb-0 d-flex align-items-center ps-5">
                                    <input class="form-check-input border-secondary" type="checkbox" role="switch" id="confirm_all_pass" style="width: 2.5em; height: 1.25em; margin-left: -2.5em; cursor: pointer;" onchange="toggleFinishButton(this)" disabled>
                                    <label class="form-check-label fw-bold text-dark small ms-2 lh-1" for="confirm_all_pass" style="font-size: 0.85rem; cursor: pointer;">
                                        Confirm<br>Pass All
                                    </label>
                                </div>
                                <button id="btn_finish" class="btn btn-secondary shadow-sm py-2 px-3 flex-grow-1" style="max-width: 200px; border-radius: 8px;" onclick="finishInspection()" disabled>
                                    <i class="fas fa-lock me-1"></i> Finish
                                </button>
                            </div>
                            <div id="scroll_hint" class="position-absolute top-0 start-50 translate-middle-x mt-n4 text-center w-100" style="pointer-events: none; margin-top: -20px;">
                                <span class="badge bg-dark opacity-75 shadow-sm" style="font-size: 0.7rem;"><i class="fas fa-arrow-down animate-bounce"></i> Scroll</span>
                            </div>
                        </div>

                    </div> </div> </div> </div> </div> <input type="hidden" id="current_so_id">
    <input type="hidden" id="current_report_id">

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script/loading_report.js?v=<?php echo time(); ?>"></script>
</body>
</html>