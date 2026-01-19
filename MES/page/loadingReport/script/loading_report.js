"use strict";

const API_URL = 'api/manage_loading.php';
let saveTimer;

$(document).ready(function() {
    loadJobList();

    // Prevent file input click propagation
    $(document).on('click', 'input[type="file"]', function(e) {
        e.stopPropagation();
    });

    // Auto-save trigger
    $('#input_location, #input_start_time, #input_end_time, #input_seal, #input_cable_seal, #input_container, #input_car_license, #input_container_type, #input_driver, #input_inspector, #input_supervisor').on('change keyup', function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveHeader, 1000); 
    });
});

// [NEW] Function to Reset Form (Fixes UI Persistence Bug)
function resetInspectionForm() {
    // 1. Clear all radio buttons
    $('input[type="radio"]').prop('checked', false);
    
    // 2. Clear text inputs (except hidden ones) & textareas
    $('textarea').val('');
    // Note: Inputs in header will be overwritten by openReport, so no need to clear explicitly except specific ones if needed
    
    // 3. Reset Topic Icons to default (Gray)
    $('[id^="topic_icon_"]').removeClass('text-success text-warning text-white').addClass('text-white-50');

    // 4. Reset Camera Boxes
    $('.camera-box').removeClass('has-image');
    $('.preview-img').remove();
    $('.camera-box i, .camera-box .camera-label').show();

    // 5. Close all accordions
    $('.collapse').removeClass('show');
}

// 1. Load Job List
function loadJobList() {
    $('#jobListContainer').html('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    
    const selectedDate = $('#filter_date').val();

    $.getJSON(API_URL, { action: 'get_jobs', date: selectedDate }, function(res) {
        if (!res.success) { alert(res.message); return; }
        
        let html = '';
        if (res.data.length === 0) {
            html = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-search fa-3x mb-3 text-secondary opacity-50"></i><br>
                No jobs found on ${selectedDate}
            </div>`;
        } else {
            res.data.forEach(job => {
                let statusClass = 'job-card';
                let badge = '<span class="badge bg-secondary">Waiting</span>';
                let printButton = ''; 
                
                if (job.report_status === 'DRAFT') {
                    statusClass += ' draft';
                    badge = '<span class="badge bg-warning text-dark">In Progress</span>';
                } else if (job.report_status === 'COMPLETED') {
                    statusClass += ' done';
                    badge = '<span class="badge bg-success">Completed</span>';
                    
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
                                    ${printButton} 
                                </div>
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

// 2. Open Report Detail [FIXED & ROBUST]
async function openReport(soId) {
    // 1. Reset Form First
    resetInspectionForm();

    $('#loadingOverlay').css('display', 'flex');
    
    try {
        const res = await $.post(API_URL, { action: 'get_report_detail', so_id: soId }, null, 'json');
        
        if (!res.success) throw new Error(res.message);

        const h = res.header;
        
        // [DEBUG] เช็คค่าจริงที่ได้จาก Server (กด F12 ดูใน Console ได้เลย)
        console.log('API Header Data:', h); 

        // Setup Header Fields
        $('#current_so_id').val(h.so_id);

        // ... (ส่วนแสดงผล PO Info / Form Input เหมือนเดิม ไม่ต้องแก้) ...
        $('#disp_po_head').text(h.po_number); 
        $('#disp_sku').text(h.sku || '-');    
        $('#disp_qty').text(Number(h.quantity).toLocaleString());
        $('#disp_booking').text(h.booking_no || '-');
        
        $('#input_car_license').val(h.car_license || '');
        $('#input_container_type').val(h.container_type || h.ctn_size || '');
        $('#input_container').val(h.report_container || h.master_container || '');
        $('#input_seal').val(h.report_seal || h.master_seal || '');
        $('#input_cable_seal').val(h.cable_seal || '');
        $('#input_driver').val(h.driver_name || '');
        $('#input_inspector').val(h.inspector_name || '');
        $('#input_supervisor').val(h.supervisor_name || '');
        
        let targetSize = h.container_type || h.ctn_size || '';
        if(targetSize === '40HQ') targetSize = "40'HC"; 
        if (targetSize && $(`#input_container_type option[value="${targetSize}"]`).length === 0) {
            $('#input_container_type').append(new Option(targetSize, targetSize));
        }
        $('#input_container_type').val(targetSize);

        $('#input_location').val(h.loading_location || 'SNC Creativity Anthology Company (WH-B10)');
        if (h.loading_start_time) $('#input_start_time').val(h.loading_start_time.replace(' ', 'T').substring(0, 16));
        else $('#input_start_time').val('');
        
        if (h.loading_end_time) $('#input_end_time').val(h.loading_end_time.replace(' ', 'T').substring(0, 16));
        else $('#input_end_time').val('');

        // Handle Report ID & Photos
        if (h.report_id) {
            $('#current_report_id').val(h.report_id);
            if (res.photos) {
                for (const [type, path] of Object.entries(res.photos)) {
                    showPreview(type, path);
                }
            }
            loadChecklistData();
        } else {
            const saveRes = await saveHeaderPromise(); 
            if(saveRes.success && saveRes.report_id) {
                $('#current_report_id').val(saveRes.report_id);
            }
        }

        // ------------------------------------------------------------------
        // [CRITICAL FIX] จุดแก้ไขสำคัญ: ตรวจสอบสถานะแบบครอบคลุม
        // ------------------------------------------------------------------
        
        // 1. ดึงค่าสถานะมา (รองรับทั้ง key 'status' และ 'report_status' และค่า null)
        const rawStatus = h.status || h.report_status || '';
        const currentStatus = rawStatus.toString().toUpperCase().trim();

        console.log('Checked Status:', currentStatus); // ดูว่าสถานะจริงๆ คืออะไร

        if (currentStatus === 'COMPLETED') {
            $('#view-report-form input, #view-report-form select, #view-report-form textarea').prop('disabled', true);
            $('button[onclick="finishInspection()"]').hide();
            $('.camera-box').css('pointer-events', 'none').css('opacity', '0.7');

            $('#locked_badge').remove(); 
            $('#btn_reopen').remove();

            const badgeHtml = '<span class="badge bg-danger ms-2 shadow-sm" id="locked_badge"><i class="fas fa-lock me-1"></i> LOCKED (Completed)</span>';
            
            // สร้างปุ่ม Unlock (เรียกฟังก์ชัน reopenReport)
            const unlockBtnHtml = `
                <button id="btn_reopen" class="btn btn-sm btn-outline-warning ms-2" onclick="reopenReport()">
                    <i class="fas fa-unlock-alt me-1"></i> Re-open
                </button>`;

            $('#view-report-form .card-header').first().append(badgeHtml + unlockBtnHtml);
            
        } else {
            $('#view-report-form input, #view-report-form select, #view-report-form textarea').prop('disabled', false);
            $('button[onclick="finishInspection()"]').show();
            $('.camera-box').css('pointer-events', 'auto').css('opacity', '1');
            $('#current_so_id, #current_report_id').prop('readonly', true); 

            // เอาป้ายและปุ่มออก
            $('#locked_badge').remove();
            $('#btn_reopen').remove();
        }

        switchView('form'); 

    } catch (err) {
        console.error(err); // ดู Error เต็มๆ
        alert('Error loading report: ' + err.message);
    } finally {
        $('#loadingOverlay').hide();
    }
}

// [NEW] ฟังก์ชันสำหรับปลดล็อกงาน
function reopenReport() {
    const reportId = $('#current_report_id').val();
    
    // ถามย้ำให้แน่ใจ
    if (!confirm('Warning: Re-opening this report will allow modifications.\nAre you sure you want to unlock it?')) {
        return;
    }

    // เรียกรหัสลับ (ถ้าไม่อยากเช็ค Role ฝั่ง Server ก็ใช้ Password ง่ายๆ ตรงนี้แทนได้ แต่ไม่แนะนำ)
    // let pwd = prompt("Enter Supervisor Password:");
    // if (pwd !== "1234") return alert("Wrong Password");

    $('#loadingOverlay').css('display', 'flex');

    $.post(API_URL, { action: 'reopen_report', report_id: reportId }, function(res) {
        if (res.success) {
            alert('Report Unlocked!');
            // โหลดหน้าใหม่เพื่อให้สถานะเปลี่ยนกลับเป็น DRAFT
            const soId = $('#current_so_id').val();
            openReport(soId); 
        } else {
            $('#loadingOverlay').hide();
            alert('Cannot Unlock: ' + res.message);
        }
    }, 'json').fail(function() {
        $('#loadingOverlay').hide();
        alert('Server Error');
    });
}

// [NEW] Wrapper for SaveHeader to work with Await
function saveHeaderPromise() {
    return new Promise((resolve, reject) => {
        saveHeader().then(resolve).fail(reject);
    });
}

// 3. Save Header Info (Returns jQuery Promise)
function saveHeader() {
    const soId = $('#current_so_id').val();
    
    const data = {
        action: 'save_header',
        sales_order_id: soId,
        loading_location: $('#input_location').val(),
        loading_start_time: $('#input_start_time').val(),
        loading_end_time: $('#input_end_time').val(),
        seal_no: $('#input_seal').val(),
        cable_seal: $('#input_cable_seal').val(),
        container_no: $('#input_container').val(),
        container_type: $('#input_container_type').val(),
        car_license: $('#input_car_license').val(),
        driver_name: $('#input_driver').val(),
        inspector_name: $('#input_inspector').val(),
        supervisor_name: $('#input_supervisor').val()
    };

    // Return the AJAX object so we can use .then() or await
    return $.post(API_URL, data, function(res) {
        if (res.success) {
            if(res.report_id) { $('#current_report_id').val(res.report_id); }
            
            // Visual Feedback
            const inputs = '#input_seal, #input_cable_seal, #input_container, #input_car_license, #input_container_type, #input_driver, #input_inspector, #input_supervisor';
            $(inputs).addClass('is-valid');
            setTimeout(() => { $(inputs).removeClass('is-valid'); }, 1000);
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
        alert('Report ID not ready. Please wait a moment or refresh.'); 
        return; 
    }

    const $box = $(`#box_${type}`);
    const originalContent = $box.html(); 
    $box.html('<div class="spinner-border text-primary spinner-border-sm"></div><div class="small text-muted mt-1">Compressing...</div>');

    resizeImage(file, 1280, 0.7, function(compressedBlob) {
        $box.html('<div class="spinner-border text-primary spinner-border-sm"></div><div class="small text-muted mt-1">Uploading...</div>');

        const fd = new FormData();
        fd.append('action', 'upload_photo');
        fd.append('file', compressedBlob, file.name.replace(/\.[^/.]+$/, "") + ".jpg"); 
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
                alert('Connection Error.');
                $box.html(originalContent);
            }
        });
    });
}

function resizeImage(file, maxWidth, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(function(blob) {
                callback(blob);
            }, 'image/jpeg', quality);
        };
    };
    reader.onerror = function() { callback(file); };
}

function showPreview(type, path) {
    const $box = $(`#box_${type}`);
    $box.find('.preview-img').remove();
    const img = `<img src="${path}?t=${new Date().getTime()}" class="preview-img rounded">`;
    $box.append(img);
    $box.addClass('has-image');
    $box.find('i, .camera-label').hide(); 
}

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

// 5. Load Checklist Data
function loadChecklistData() {
    const reportId = $('#current_report_id').val();
    if (!reportId) return;

    $.getJSON(API_URL, { action: 'get_checklist', report_id: reportId }, function(res) {
        if (res.success) {
            const data = res.data;
            for (const [topicId, items] of Object.entries(data)) {
                for (const [itemIndex, row] of Object.entries(items)) {
                    const itemKey = topicId + '_' + itemIndex;
                    $(`input[name="res_${itemKey}"][value="${row.result}"]`).prop('checked', true);
                    if (row.remark) {
                        $(`#remark_${itemKey}`).val(row.remark);
                        $(`#collapse_remark_${itemKey}`).addClass('show'); 
                    }
                }
                // Recalculate icon after loading all items for this topic
                recalcTopicStatus(topicId);
            }
        }
    });
}

// 6. Save Sub-Item & Update Icon Real-time
function saveSubItem(topicId, topicName, itemIndex, itemName) {
    const reportId = $('#current_report_id').val();
    const itemKey = topicId + '_' + itemIndex;
    const result = $(`input[name="res_${itemKey}"]:checked`).val();
    const remark = $(`#remark_${itemKey}`).val();

    if (!reportId || !result) return;

    // Visual feedback
    // Optionally: add loading spinner or highlight row
    
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
        if(res.success) {
            // [FIX] Always recalculate status to update Green/Yellow/White instantly
            recalcTopicStatus(topicId);
        }
    }, 'json');
}

// [NEW] Logic to calculate Topic Status Icon
function recalcTopicStatus(topicId) {
    // Select all radio buttons belonging to this topic
    // Pattern: name="res_{topicId}_{itemIndex}"
    const $inputs = $(`input[name^="res_${topicId}_"]:checked`);
    
    let hasFail = false;
    let allPass = true;
    let checkedCount = $inputs.length;

    // We can't easily know "total items" in JS without DOM lookup, 
    // so we rely on: IF any Fail -> Yellow. IF no Fail & has Checked -> Green.
    // (You can improve this if you know exactly how many items per topic)

    $inputs.each(function() {
        const val = $(this).val();
        if (val === 'FAIL') hasFail = true;
        if (val !== 'PASS') allPass = false;
    });

    const $icon = $(`#topic_icon_${topicId}`);
    $icon.removeClass('text-white-50 text-success text-warning text-white');
    
    if (hasFail) {
        $icon.addClass('text-warning'); // Priority 1: Warning
    } else if (checkedCount > 0 && allPass) {
        $icon.addClass('text-success'); // Priority 2: Success (Pass)
    } else {
        $icon.addClass('text-white-50'); // Priority 3: Default/Incomplete
    }
}

// 7. Finish Inspection
function finishInspection() {
    // [FIX] Clear Auto-save timer first to prevent collision
    clearTimeout(saveTimer);

    const reportId = $('#current_report_id').val();
    const soId = $('#current_so_id').val();
    
    if (!$('#input_seal').val()) {
        alert('Please enter Seal No. before finishing.');
        return;
    }
    
    if (!confirm('Confirm to finish inspection? This action cannot be undone.')) {
        return;
    }

    $('#loadingOverlay').css('display', 'flex'); 

    // Force Save Header one last time
    const headerData = {
        action: 'save_header',
        sales_order_id: soId,
        loading_location: $('#input_location').val(),
        loading_start_time: $('#input_start_time').val(),
        loading_end_time: $('#input_end_time').val(),
        seal_no: $('#input_seal').val(),
        cable_seal: $('#input_cable_seal').val(),
        container_no: $('#input_container').val(),
        container_type: $('#input_container_type').val(),
        car_license: $('#input_car_license').val(),
        driver_name: $('#input_driver').val(),
        inspector_name: $('#input_inspector').val(),
        supervisor_name: $('#input_supervisor').val()
    };

    $.post(API_URL, headerData, function(saveRes) {
        if (saveRes.success) {
            $.post(API_URL, { action: 'finish_report', report_id: reportId }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) {
                    alert('Inspection Completed Successfully!');
                    switchView('list');
                    loadJobList();
                } else {
                    alert('Error finishing report: ' + res.message);
                }
            }, 'json').fail(function() {
                $('#loadingOverlay').hide();
                alert('Server Error: Cannot finish inspection.');
            });
        } else {
            $('#loadingOverlay').hide();
            alert('Error saving data before finish: ' + saveRes.message);
        }
    }, 'json').fail(function() {
        $('#loadingOverlay').hide();
        alert('Server Error: Cannot save data before finish.');
    });
}