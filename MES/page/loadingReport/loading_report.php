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
                <div class="container-fluid">
                    
                    <div id="view-job-list">
                        <div class="row align-items-center mb-2">
                            <div class="col-12">
                                <h6 class="text-muted fw-bold mb-0">
                                    <i class="far fa-calendar-alt me-2"></i>JOB LIST & HISTORY
                                </h6>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-12">
                                <div class="input-group shadow-sm">
                                    <input type="date" id="filter_date" class="form-control" 
                                           style="max-width: 140px;" 
                                           value="<?php echo date('Y-m-d'); ?>">
                                    
                                    <input type="text" id="filter_search" class="form-control" 
                                           placeholder="PO / Container / Booking...">
                                    
                                    <button class="btn btn-primary" onclick="loadJobList()" type="button">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    
                                    <button class="btn btn-outline-secondary" onclick="resetSearch()" type="button" title="Reset / Reload">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                                <div class="form-text text-end mt-1 small text-muted">
                                    <i class="fas fa-info-circle me-1"></i>เลือกวันที่ หรือ พิมพ์คำค้นหาเพื่อดูประวัติ
                                </div>
                            </div>
                        </div>
                        
                        <div id="jobListContainer" class="row g-2">
                            <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                        </div>
                    </div> <div id="view-report-form" style="display:none;">
        
                        <nav class="navbar navbar-light bg-white border-bottom shadow-sm sticky-top d-lg-none" style="z-index: 1020;">
                            <div class="container-fluid">
                                <button class="btn btn-link text-secondary text-decoration-none fw-bold" onclick="switchView('list')">
                                    <i class="fas fa-chevron-left me-1"></i> Back
                                </button>
                                <span class="navbar-text fw-bold text-primary" id="disp_po_nav">
                                    PO: Loading...
                                </span>
                            </div>
                        </nav>

                        <div class="container mt-3">
                            
                            <div class="info-card">
                                <div class="info-card-header">
                                    <div>
                                        <i class="fas fa-box-open me-2"></i>
                                        <span id="disp_po_head">LOADING...</span>
                                    </div>
                                    <span class="badge bg-white text-primary" id="disp_sku">-</span>
                                </div>
                                <div class="card-body px-2 py-1">
                                    <div class="row g-3">
                                        <div class="col-6 col-md-3 border-end">
                                            <div class="info-label">Quantity</div>
                                            <div class="info-value" id="disp_qty">-</div>
                                        </div>
                                        <div class="col-6 col-md-3 border-end-md">
                                            <div class="info-label">Booking No.</div>
                                            <div class="info-value text-break" id="disp_booking">-</div>
                                        </div>
                                        <div class="col-6 col-md-3 border-end">
                                            <div class="info-label">Container Plan</div>
                                            <div class="info-value" id="disp_container_plan">-</div>
                                        </div>
                                        <div class="col-6 col-md-3">
                                            <div class="info-label">Seal Plan</div>
                                            <div class="info-value" id="disp_seal_plan">-</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="row g-3">
                                <div class="col-12" style="margin-top: 0.5rem;"><div class="photo-section-title">Container & Truck Info</div></div>
                                
                                <div class="col-12 col-md-6">
                                    <label class="form-label-sm">Container No. (ตู้จริง)</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white"><i class="fas fa-cube text-muted"></i></span>
                                        <input type="text" id="input_container" class="form-control fw-bold" placeholder="ระบุเบอร์ตู้">
                                    </div>
                                </div>

                                <div class="col-6 col-md-3">
                                    <label class="form-label-sm">Size / Type</label>
                                    <select id="input_container_type" class="form-select fw-bold">
                                        <option value="">Select...</option>
                                        <option value="40'HC">40' HC</option>
                                        <option value="40'ST">40' ST</option>
                                        <option value="20'">20' General</option>
                                        <option value="45'">45' High</option>
                                    </select>
                                </div>

                                <div class="col-6 col-md-3">
                                    <label class="form-label-sm">License Plate</label>
                                    <input type="text" id="input_car_license" class="form-control" placeholder="ทะเบียนรถ">
                                </div>

                                <div class="col-12 col-md-6">
                                    <label class="form-label-sm">Seal No. (เบอร์ซีลจริง)</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white"><i class="fas fa-lock text-success"></i></span>
                                        <input type="text" id="input_seal" class="form-control fw-bold text-success" placeholder="ระบุเบอร์ซีล">
                                    </div>
                                </div>

                                <div class="col-12 col-md-6">
                                    <label class="form-label-sm">Cable Seal (Optional)</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white"><i class="fas fa-link text-secondary"></i></span>
                                        <input type="text" id="input_cable_seal" class="form-control" placeholder="เบอร์ Cable Seal">
                                    </div>
                                </div>
                            </div>

                            
                            <div class="row g-3 ">
                                <div class="col-12"><div class="photo-section-title">Personnel</div></div>
                                <div class="col-12 col-md-4">
                                    <label class="form-label-sm">Driver Name</label>
                                    <input type="text" id="input_driver" class="form-control" placeholder="ชื่อคนขับรถ">
                                </div>
                                <div class="col-6 col-md-4">
                                    <label class="form-label-sm">Inspector</label>
                                    <input type="text" id="input_inspector" class="form-control" placeholder="ผู้ตรวจสอบ">
                                </div>
                                <div class="col-6 col-md-4">
                                    <label class="form-label-sm">Supervisor</label>
                                    <input type="text" id="input_supervisor" class="form-control" placeholder="หัวหน้างาน">
                                </div>
                                <div class="col-12">
                                    <label class="form-label-sm">Location</label>
                                    <input type="text" id="input_location" class="form-control text-muted" readonly>
                                </div>
                                <div class="col-6">
                                    <label class="form-label-sm">Start Time</label>
                                    <input type="datetime-local" id="input_start_time" class="form-control">
                                </div>
                                <div class="col-6">
                                    <label class="form-label-sm">End Time</label>
                                    <input type="datetime-local" id="input_end_time" class="form-control">
                                </div>
                            </div>
                            
                            <div class="row g-3 ">
                                <div class="col-12"><div class="photo-section-title">Photo Evidence (10 Points)</div></div>
                                <?php 
                                $photoPoints = [
                                    'undercarriage' => '1. Undercarriage (ใต้ท้องรถ)',
                                    'outside_door' => '2. Outside/Doors (นอก/ประตู)',
                                    'right_side' => '3. Right Side (ขวา)',
                                    'left_side' => '4. Left Side (ซ้าย)',
                                    'front_wall' => '5. Front Wall (ผนังหน้า)',
                                    'ceiling_roof' => '6. Ceiling/Roof (หลังคา)',
                                    'floor' => '7. Floor (พื้น)',
                                    'inside_empty' => '8. Inside Empty (ภายใน-เปล่า)',
                                    'inside_loaded' => '9. Inside Loaded (ภายใน-ใส่ของ)',
                                    'seal_lock' => '10. Seal/Lock (ซีลล็อค)'
                                ];
                                foreach ($photoPoints as $key => $label): 
                                ?>
                                <div class="col-6 col-md-4 col-lg-3">
                                    
                                    <div class="camera-box shadow-sm" id="box_<?php echo $key; ?>" onclick="triggerCamera('<?php echo $key; ?>')">
                                        <i class="fas fa-camera"></i>
                                        <div class="camera-label"><?php echo $label; ?></div>
                                    </div>

                                    <input type="file" id="file_<?php echo $key; ?>" accept="image/*" capture="environment" hidden onchange="handleFileSelect(this, '<?php echo $key; ?>')">
                                    
                                </div>
                                <?php endforeach; ?>
                            </div>

                            <div class="row">
                                <div class="col-12 d-flex justify-content-between align-items-center mb-2">
                                    <div class="photo-section-title mb-0">Inspection Checklist</div>
                                </div>
                                
                                <div class="col-12">
                                    <?php 
                                    require_once __DIR__ . '/loading_config.php'; 
                                    $checklist = getCtpatChecklist(); 
                                    $tCounter = 1; 
                                    foreach ($checklist as $tConfig): 
                                        $topicId = $tCounter++;
                                    ?>
                                    <div class="checklist-card">
                                        <button class="checklist-header w-100 border-0 text-start d-flex justify-content-between align-items-center bg-white" 
                                                type="button" 
                                                onclick="toggleAccordion('collapse_topic_<?php echo $topicId; ?>')">
                                            
                                            <div class="d-flex align-items-center">
                                                <i class="fas fa-circle me-3 text-white-50" id="topic_icon_<?php echo $topicId; ?>" style="font-size: 0.8rem; border:1px solid #ddd; border-radius:50%; padding:2px;"></i>
                                                <span class="checklist-title text-dark">
                                                    <?php echo $topicId . '. ' . $tConfig['title']; ?>
                                                </span>
                                            </div>
                                            <i class="fas fa-chevron-down text-muted"></i>
                                        </button>

                                        <div class="collapse" id="collapse_topic_<?php echo $topicId; ?>">
                                            <div class="checklist-body border-top">
                                                <?php 
                                                $iCounter = 1;
                                                foreach ($tConfig['items'] as $itemName): 
                                                    $subIndex = $iCounter++;
                                                    $itemKey = $topicId . '_' . $subIndex;
                                                ?>
                                                <div class="sub-item-row" id="row_<?php echo $itemKey; ?>">
                                                    <div class="mb-2 text-dark" style="font-size: 0.9rem;">
                                                        <?php echo $itemName; ?>
                                                    </div>
                                                    
                                                    <div class="btn-group w-100 btn-group-lg-custom" role="group">
                                                        
                                                        <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="pass_<?php echo $itemKey; ?>" value="PASS" 
                                                            onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo htmlspecialchars($tConfig['title']); ?>', <?php echo $subIndex; ?>, 'SubItem')">
                                                        <label class="btn btn-outline-success" for="pass_<?php echo $itemKey; ?>">PASS</label>

                                                        <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="fail_<?php echo $itemKey; ?>" value="FAIL"
                                                            onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo htmlspecialchars($tConfig['title']); ?>', <?php echo $subIndex; ?>, 'SubItem')">
                                                        <label class="btn btn-outline-danger" for="fail_<?php echo $itemKey; ?>">FAIL</label>

                                                        <input type="radio" class="btn-check" name="res_<?php echo $itemKey; ?>" id="na_<?php echo $itemKey; ?>" value="N/A"
                                                            onchange="saveSubItem(<?php echo $topicId; ?>, '<?php echo htmlspecialchars($tConfig['title']); ?>', <?php echo $subIndex; ?>, 'SubItem')">
                                                        <label class="btn btn-outline-secondary" for="na_<?php echo $itemKey; ?>">N/A</label>
                                                    </div>

                                                    <div class="mt-2 collapse" id="collapse_remark_<?php echo $itemKey; ?>">
                                                        <input type="text" class="form-control form-control-sm bg-light" 
                                                               id="remark_<?php echo $itemKey; ?>" 
                                                               placeholder="ระบุเหตุผล / Remark..."
                                                               onblur="saveSubItem(<?php echo $topicId; ?>, '<?php echo htmlspecialchars($tConfig['title']); ?>', <?php echo $subIndex; ?>, 'SubItem')">
                                                    </div>
                                                </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>

                        <div class="sticky-footer d-flex flex-column align-items-stretch">
                            
                            <div class="form-check mb-2 align-self-center">
                                <input class="form-check-input border-primary" type="checkbox" id="confirm_all_pass" 
                                       onchange="toggleFinishButton(this)" disabled> 
                                <label class="form-check-label fw-bold text-primary" for="confirm_all_pass">
                                    <i class="fas fa-check-double me-1"></i> Confirm all items Passed
                                </label>
                            </div>

                            <div class="text-muted small text-center mb-1" id="scroll_hint">
                                <i class="fas fa-arrow-down animate-bounce"></i> Scroll down to accept
                            </div>

                            <button id="btn_finish" class="btn btn-secondary w-100 btn-lg shadow-sm" onclick="finishInspection()" disabled>
                                <i class="fas fa-lock me-2"></i> Please Complete Checklist
                            </button>
                        </div>

                    </div> </div> </div> </div> </div> <input type="hidden" id="current_so_id">
    <input type="hidden" id="current_report_id">

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <script src="script/loading_report.js?v=<?php echo time(); ?>"></script>
</body>
</html>