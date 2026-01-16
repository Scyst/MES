"use strict";

const API_URL = 'api/manage_loading.php';
let saveTimer;

$(document).ready(function() {
    loadJobList();

    // Auto Save Header Info
    $('#input_seal, #input_container, #input_car_license, #input_container_type').on('change keyup', function() {
        clearTimeout(saveTimer);
        // Delay save to reduce server load
        saveTimer = setTimeout(saveHeader, 1000); 
    });

    // Prevent file input click propagation
    $(document).on('click', 'input[type="file"]', function(e) {
        e.stopPropagation();
    });
});

// 1. Load Job List
function loadJobList() {
    $('#jobListContainer').html('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    
    $.getJSON(API_URL, { action: 'get_jobs' }, function(res) {
        if (!res.success) { alert(res.message); return; }
        
        let html = '';
        if (res.data.length === 0) {
            html = '<div class="col-12 text-center text-muted py-5"><i class="fas fa-check-circle fa-3x mb-3 text-success"></i><br>No loading plan for today</div>';
        } else {
            res.data.forEach(job => {
                let statusClass = 'job-card';
                let badge = '<span class="badge bg-secondary">Waiting</span>';
                let printButton = ''; // ตัวแปรเก็บปุ่ม Print
                
                if (job.report_status === 'DRAFT') {
                    statusClass += ' draft';
                    badge = '<span class="badge bg-warning text-dark">In Progress</span>';
                } else if (job.report_status === 'COMPLETED') {
                    statusClass += ' done';
                    badge = '<span class="badge bg-success">Completed</span>';
                    
                    // [ADDED] สร้างปุ่ม Print เฉพาะงานที่เสร็จแล้ว
                    // event.stopPropagation() สำคัญมาก! เพื่อกันไม่ให้คลิกปุ่ม Print แล้วมันไปเปิดหน้าแก้ไขงาน
                    printButton = `
                        <a href="print_report.php?report_id=${job.report_id}" target="_blank" 
                           class="btn btn-sm btn-outline-secondary ms-2" 
                           onclick="event.stopPropagation();" title="Print Report">
                            <i class="fas fa-print"></i>
                        </a>`;
                }

                html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card shadow-sm h-100 ${statusClass}" onclick="openReport(${job.so_id})">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="fw-bold text-primary mb-0">${job.po_number}</h5>
                                <div>
                                    ${badge}
                                    ${printButton} </div>
                            </div>
                            <div class="text-muted small mb-1">
                                <i class="fas fa-truck-loading me-1"></i> ${job.container_no || 'No Container'}
                            </div>
                             <div class="text-muted small mb-1">
                                <i class="fas fa-box me-1"></i> Qty: ${Number(job.quantity).toLocaleString()}
                            </div>
                            <div class="text-end mt-2">
                                <small class="text-primary fw-bold">Select <i class="fas fa-chevron-right ms-1"></i></small>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
        }
        $('#jobListContainer').html(html);
    });
}

// 2. Open Report Detail
function openReport(soId) {
    $('#loadingOverlay').css('display', 'flex');
    
    $.post(API_URL, { action: 'get_report_detail', so_id: soId }, function(res) {
        $('#loadingOverlay').hide();
        if (!res.success) { alert(res.message); return; }

        const h = res.header;
        
        // Setup Hidden Fields
        $('#current_so_id').val(h.so_id);
        $('#current_report_id').val(h.report_id || '');

        // === Card 1: PO Info ===
        $('#disp_po_head').text(h.po_number); 
        $('#disp_sku').text(h.sku || '-');    
        $('#disp_qty').text(Number(h.quantity).toLocaleString());
        $('#disp_booking').text(h.booking_no || '-');
        
        // === Card 2: Form Input ===
        
        // 1. Car License
        $('#input_car_license').val(h.car_license || '');
        
        // 2. Container Size
        let targetSize = h.container_type || h.ctn_size || '';
        if(targetSize === '40HQ') targetSize = "40'HC"; 
        
        // Dynamic Option Check
        if (targetSize && $(`#input_container_type option[value="${targetSize}"]`).length === 0) {
            $('#input_container_type').append(new Option(targetSize, targetSize));
        }
        $('#input_container_type').val(targetSize);

        // 3. Container No
        let showContainer = h.report_container || h.master_container || '';
        $('#input_container').val(showContainer);

        // 4. Seal No
        let showSeal = h.report_seal || h.master_seal || '';
        $('#input_seal').val(showSeal);
        
        // Reset Photo Boxes
        $('.camera-box').removeClass('has-image');
        $('.preview-img').remove();
        $('.camera-box i, .camera-box .camera-label').show(); 

        // Load Existing Photos
        if (res.photos) {
            for (const [type, path] of Object.entries(res.photos)) {
                showPreview(type, path);
            }
        }

        // Auto Init Report if New
        if (!h.report_id) {
            saveHeader(); 
        }

        switchView('form'); 

    }, 'json');
}

// 3. Save Header Info
function saveHeader() {
    const soId = $('#current_so_id').val();
    
    const data = {
        action: 'save_header',
        sales_order_id: soId,
        seal_no: $('#input_seal').val(),
        container_no: $('#input_container').val(),
        container_type: $('#input_container_type').val(),
        car_license: $('#input_car_license').val()
    };

    $.post(API_URL, data, function(res) {
        if (res.success) {
            if(res.report_id) {
                $('#current_report_id').val(res.report_id);
            }
            
            // Visual Feedback
            $('#input_seal, #input_container, #input_car_license, #input_container_type').addClass('is-valid');
            setTimeout(() => {
                $('#input_seal, #input_container, #input_car_license, #input_container_type').removeClass('is-valid');
            }, 1000);
        }
    }, 'json');
}

// 4. Photo Upload Logic
function triggerCamera(type) {
    if ($(`#box_${type}`).hasClass('has-image')) {
        if (!confirm('Replace existing photo?')) return;
    }
    $(`#file_${type}`).click();
}

function handleFileSelect(input, type) {
    if (input.files && input.files[0]) {
        uploadPhoto(input.files[0], type);
    }
}

function uploadPhoto(file, type) {
    const reportId = $('#current_report_id').val();
    
    if (!reportId) { 
        alert('System Error: Report ID Missing. Please refresh.'); 
        return; 
    }

    const $box = $(`#box_${type}`);
    const originalContent = $box.html(); 
    $box.html('<div class="spinner-border text-primary spinner-border-sm"></div>');

    const fd = new FormData();
    fd.append('action', 'upload_photo');
    fd.append('file', file);
    fd.append('report_id', reportId);
    fd.append('photo_type', type);

    $.ajax({
        url: API_URL,
        type: 'POST',
        data: fd,
        contentType: false,
        processData: false,
        success: function(res) {
            if (res.success) {
                $box.html(originalContent); 
                showPreview(type, res.path);
            } else {
                alert('Upload Failed: ' + res.message);
                $box.html(originalContent); 
            }
        },
        error: function() {
            alert('Internet Connection Error');
            $box.html(originalContent);
        }
    });
}

function showPreview(type, path) {
    const $box = $(`#box_${type}`);
    $box.find('.preview-img').remove();
    
    const img = `<img src="${path}?t=${new Date().getTime()}" class="preview-img rounded">`;
    $box.append(img);
    $box.addClass('has-image');
    
    $box.find('i').hide(); 
}

// Helper: Switch Views
function switchView(view) {
    if (view === 'list') {
        $('#view-job-list').fadeIn();
        $('#view-report-form').hide();
        loadJobList(); 
    } else {
        $('#view-job-list').hide();
        $('#view-report-form').fadeIn();
        window.scrollTo(0,0);
    }
}

// 5. Load Detailed Checklist Data (10-Point)
function loadChecklistData() {
    const reportId = $('#current_report_id').val();
    if (!reportId) return;

    $.getJSON(API_URL, { action: 'get_checklist', report_id: reportId }, function(res) {
        if (res.success) {
            const data = res.data;
            
            // data structure: { topic_id: { item_index: { result: 'PASS', ... } } }
            for (const [topicId, items] of Object.entries(data)) {
                let allPass = true;
                let hasFail = false;

                for (const [itemIndex, row] of Object.entries(items)) {
                    const itemKey = topicId + '_' + itemIndex;
                    
                    // Set Radio
                    $(`input[name="res_${itemKey}"][value="${row.result}"]`).prop('checked', true);
                    
                    // Set Remark
                    if (row.remark) {
                        $(`#remark_${itemKey}`).val(row.remark);
                        $(`#collapse_remark_${itemKey}`).addClass('show'); 
                    }

                    // Check Status
                    if (row.result === 'FAIL') hasFail = true;
                    if (row.result !== 'PASS') allPass = false;
                }
                
                // Update Topic Header Icon
                updateTopicIcon(topicId, hasFail, allPass);
            }
        }
    });
}

// 6. Save Sub-Item Checklist Result
function saveSubItem(topicId, topicName, itemIndex, itemName) {
    const reportId = $('#current_report_id').val();
    const itemKey = topicId + '_' + itemIndex;
    const result = $(`input[name="res_${itemKey}"]:checked`).val();
    const remark = $(`#remark_${itemKey}`).val();

    if (!reportId || !result) return;

    $.post(API_URL, {
        action: 'save_checklist_item',
        report_id: reportId,
        topic_id: topicId,
        topic_name: topicName,
        item_index: itemIndex,
        item_name: itemName,
        result: result,
        remark: remark
    }, function(res) {
        if(res.success && result === 'FAIL') {
            $(`#topic_icon_${topicId}`).removeClass('text-white-50 text-success').addClass('text-warning'); 
        }
    }, 'json');
}

// Helper: Update Topic Icon Style
function updateTopicIcon(topicId, hasFail, allPass) {
    const $icon = $(`#topic_icon_${topicId}`);
    $icon.removeClass('text-white-50 text-success text-warning');
    
    if (hasFail) $icon.addClass('text-warning'); 
    else if (allPass) $icon.addClass('text-white'); 
    else $icon.addClass('text-white-50'); 
}

// 7. Finish Inspection
function finishInspection() {
    const reportId = $('#current_report_id').val();
    
    if (!$('#input_seal').val()) {
        alert('Please enter Seal No. before finishing.');
        return;
    }
    
    if (!confirm('Confirm to finish inspection? This action cannot be undone.')) {
        return;
    }

    $('#loadingOverlay').css('display', 'flex'); 

    $.post(API_URL, { action: 'finish_report', report_id: reportId }, function(res) {
        $('#loadingOverlay').hide();
        
        if (res.success) {
            alert('Inspection Completed Successfully!');
            switchView('list');
            loadJobList();
        } else {
            alert('Error: ' + res.message);
        }
    }, 'json').fail(function() {
        $('#loadingOverlay').hide();
        alert('Server Error: Cannot finish inspection.');
    });
}