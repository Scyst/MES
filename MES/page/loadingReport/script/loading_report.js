"use strict";

const API_URL = 'api/manage_loading.php'; 
let saveTimer;

$(document).ready(function() {
    loadJobList();
    
    // เรียกเช็ค Scroll ทันทีเผื่อหน้าจอมันสั้นจนไม่ต้องเลื่อน
    checkScrollPosition(); 

    // Prevent file input click propagation
    $(document).on('click', 'input[type="file"]', function(e) {
        e.stopPropagation();
    });

    // Auto-save trigger
    const inputSelectors = '#input_location, #input_start_time, #input_end_time, #input_seal, #input_cable_seal, #input_container, #input_car_license, #input_container_type, #input_container_type_other, #input_driver, #input_inspector, #input_supervisor';
    
    $(inputSelectors).on('change keyup', function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveHeader, 1000); 
        validateCompletion(); // เช็คปุ่ม Finish ทุกครั้งที่พิมพ์
    });

    $('#filter_search').on('keypress', function(e) {
        if(e.which == 13) loadJobList();
    });

    // Event Scroll สำหรับ Policy
    $(window).on('scroll', function() {
        checkScrollPosition();
    });

    const $footer = $('.sticky-footer');
    $('input[type="text"], input[type="number"], textarea').on('focus', function() {
        if ($(window).width() < 768) { // ทำเฉพาะบนมือถือ
            $footer.slideUp(200); // ซ่อน Footer
        }
    }).on('blur', function() {
        if ($(window).width() < 768) {
            $footer.slideDown(200); // โชว์ Footer กลับมา
        }
    });

    // [ADD] ดักจับปุ่ม Back ของ Browser
    window.onpopstate = function(event) {
        // ถ้า URL ไม่มี #report (คือย้อนกลับมาหน้าแรกแล้ว) หรือ State ว่างเปล่า
        if (!location.hash || location.hash !== '#report') {
            // ถ้าหน้า Form เปิดอยู่ ให้สลับกลับไปหน้า List
            if ($('#view-report-form').is(':visible')) {
                switchView('list');
            }
        }
    };
});

// ==========================================
// 1. SCROLL POLICY LOGIC
// ==========================================
function checkScrollPosition() {
    if ($('#btn_finish').length === 0) return;
    if ($(window).scrollTop() + $(window).height() >= $(document).height() - 50) {
        $('#confirm_all_pass').prop('disabled', false);
        $('#scroll_hint').fadeOut();
    }
}

// ==========================================
// 2. CHECKLIST LOGIC (Core)
// ==========================================
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
        if(res.success) {
            recalcTopicStatus(topicId);
        }
    }, 'json');
    
    setTimeout(validateCompletion, 100); 
}

function validateCompletion() {
    const btn = $('#btn_finish');
    const switchBtn = $('#confirm_all_pass');
    const errors = [];

    // 1. Check Mandatory Inputs
    const requiredInputs = {
        '#input_container': 'Container No.',
        '#input_seal': 'Seal No.',
        '#input_car_license': 'License Plate',
        '#input_driver': 'Driver Name',
        '#input_inspector': 'Inspector',
        '#input_supervisor': 'Supervisor',
        '#input_location': 'Location'
        // Container Size เช็คแยก เพราะมี Logic Others
    };

    let infoComplete = true;
    for (const [id, label] of Object.entries(requiredInputs)) {
        if (!$(id).val() || $(id).val().trim() === '') {
            infoComplete = false; break;
        }
    }
    
    // Check Container Size (Dropdown or Text)
    const ctnType = $('#input_container_type').val();
    if (!ctnType || (ctnType === 'OTHER' && !$('#input_container_type_other').val())) {
        infoComplete = false;
    }

    if (!infoComplete) errors.push('Info');

    // 2. Check Photos
    const totalPhotos = 12; 
    const currentPhotos = $('.camera-box.has-image').length;
    if (currentPhotos < totalPhotos) errors.push('Photos');

    // 3. Check Checklist
    const totalItems = $('.sub-item-row').length;
    let checkedCount = 0;
    let passCount = 0;
    const checkedGroups = {};

    $('input[type=radio]:checked').each(function() {
        const name = $(this).attr('name');
        if (!checkedGroups[name]) {
            checkedGroups[name] = true;
            checkedCount++;
            if ($(this).val() === 'PASS') passCount++;
        }
    });

    const isChecklistComplete = (checkedCount >= totalItems && totalItems > 0);
    if (!isChecklistComplete) errors.push('Checklist');

    // Logic 1: Switch Behavior
    const isAllPass = (passCount === totalItems && totalItems > 0);
    if (isAllPass) {
        if (!switchBtn.prop('disabled') && !switchBtn.prop('checked')) switchBtn.prop('checked', true);
    } else {
        if (switchBtn.prop('checked')) switchBtn.prop('checked', false);
    }

    // Logic 2: Button Behavior
    if (errors.length === 0) {
        btn.prop('disabled', false);
        btn.removeClass('btn-secondary').addClass('btn-success');
        btn.html('<i class="fas fa-save me-1"></i> Finish');
    } else {
        btn.prop('disabled', true);
        btn.removeClass('btn-success').addClass('btn-secondary');
        btn.html(`<i class="fas fa-lock me-1"></i> Missing: ${errors.join(', ')}`);
    }
}

function toggleFinishButton(checkbox) {
    if (checkbox.checked) {
        $('input[value="PASS"]').each(function() {
            const groupName = $(this).attr('name');
            if (!$(`input[name="${groupName}"]:checked`).length) {
                $(this).prop('checked', true);
                $(this).trigger('change'); 
            }
        });
        $('.collapse').collapse('show');
    }
    setTimeout(validateCompletion, 200);
}

function recalcTopicStatus(topicId) {
    const $inputs = $(`input[name^="res_${topicId}_"]:checked`);
    let hasFail = false;
    let allPass = true;
    let checkedCount = $inputs.length;

    $inputs.each(function() {
        if ($(this).val() === 'FAIL') hasFail = true;
        if ($(this).val() !== 'PASS') allPass = false;
    });

    const $icon = $(`#topic_icon_${topicId}`);
    $icon.removeClass('text-white-50 text-success text-warning text-white');
    
    if (hasFail) {
        $icon.addClass('text-warning');
    } else if (checkedCount > 0 && allPass) {
        $icon.addClass('text-success');
    } else {
        $icon.addClass('text-white-50');
    }
}

function toggleAccordion(elementId) {
    $('#' + elementId).collapse('toggle');
}

// ==========================================
// 3. GENERAL FUNCTIONS
// ==========================================

function resetInspectionForm() {
    $('input[type="radio"]').prop('checked', false);
    $('textarea, input[type="text"], input[type="datetime-local"], select').val(''); // Clear all inputs
    $('[id^="topic_icon_"]').removeClass('text-success text-warning text-white').addClass('text-white-50');
    $('.camera-box').removeClass('has-image');
    $('.preview-img').remove();
    $('.camera-box i, .camera-box .camera-label').show();
    $('.collapse').removeClass('show');
    
    // Reset Logic Fields
    $('#input_container_type_other').addClass('d-none');
    
    // Reset Footer
    $('#confirm_all_pass').prop('checked', false).prop('disabled', true);
    $('#scroll_hint').show();
    $('#btn_finish').prop('disabled', true).removeClass('btn-success').addClass('btn-secondary');
}

function loadJobList() {
    $('#jobListContainer').html('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    $.getJSON(API_URL, { action: 'get_jobs', date: $('#filter_date').val(), search: $('#filter_search').val() }, function(res) {
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="col-12 text-center text-muted py-5">No jobs found</div>`;
        } else {
            res.data.forEach(job => {
                let statusClass = job.report_status === 'COMPLETED' ? 'job-card done' : 'job-card draft';
                let badge = job.report_status === 'COMPLETED' ? '<span class="badge bg-success">Completed</span>' : '<span class="badge bg-warning text-dark">In Progress</span>';
                let printBtn = job.report_status === 'COMPLETED' ? `<a href="print_report.php?report_id=${job.report_id}" target="_blank" class="btn btn-sm btn-outline-secondary ms-2" onclick="event.stopPropagation();"><i class="fas fa-print"></i></a>` : '';
                
                html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card shadow-sm h-100 ${statusClass}" onclick="openReport(${job.so_id})">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="fw-bold text-primary mb-0">${job.po_number}</h5>
                                <div>${badge}${printBtn}</div>
                            </div>
                            <div class="small text-muted"><i class="fas fa-truck-loading me-1"></i> ${job.container_no || '-'}</div>
                            <div class="small text-muted"><i class="fas fa-box me-1"></i> Qty: ${Number(job.quantity).toLocaleString()}</div>
                        </div>
                    </div>
                </div>`;
            });
        }
        $('#jobListContainer').html(html);
    });
}

function resetSearch() {
    $('#filter_search').val('');
    loadJobList();
}

async function openReport(soId) {
    resetInspectionForm();
    $('#loadingOverlay').css('display', 'flex');
    
    try {
        const res = await $.post(API_URL, { action: 'get_report_detail', so_id: soId }, null, 'json');
        if (!res.success) throw new Error(res.message);

        const h = res.header;
        $('#current_so_id').val(h.so_id);

        // Map Data
        $('#disp_po_head').text(h.po_number || '-');
        
        // [UPDATE] แสดง SNC Invoice
        $('#disp_invoice').text(h.snc_ci_no || '-'); 

        $('#disp_po_nav').text('PO: ' + (h.po_number || '-'));
        $('#disp_sku').text(h.sku || '-');    
        $('#disp_qty').text(Number(h.quantity).toLocaleString());
        $('#disp_booking').text(h.booking_no || '-');
        $('#disp_container_plan').text(h.master_container || '-');
        $('#disp_seal_plan').text(h.master_seal || '-');

        $('#input_car_license').val(h.car_license || '');
        $('#input_container').val(h.report_container || h.master_container || '');
        $('#input_seal').val(h.report_seal || h.master_seal || '');
        $('#input_cable_seal').val(h.cable_seal || '');
        $('#input_driver').val(h.driver_name || '');
        $('#input_inspector').val(h.inspector_name || '');

        const DEFAULT_SUPERVISOR = 'ลลิต์ภัทร สุทธิธรรมสกุล'; 
        $('#input_supervisor').val(h.supervisor_name || DEFAULT_SUPERVISOR);
        $('#input_location').val(h.loading_location || 'SNC Creativity Anthology Company (WH-B10)');
        
        if (h.loading_start_time) $('#input_start_time').val(h.loading_start_time.replace(' ', 'T').substring(0, 16));
        if (h.loading_end_time) $('#input_end_time').val(h.loading_end_time.replace(' ', 'T').substring(0, 16));

        // [UPDATE] Logic โหลดข้อมูล Container Type (รองรับ Others)
        const dbCtnType = h.ctn_size || h.container_type || '';
        
        // เช็คว่าค่าใน DB มีอยู่ใน Dropdown ไหม?
        if ($(`#input_container_type option[value='${dbCtnType}']`).length > 0) {
            $('#input_container_type').val(dbCtnType);
            $('#input_container_type_other').addClass('d-none');
        } else if (dbCtnType !== '') {
            // ไม่มีใน Dropdown -> เลือก Others แล้วใส่ค่าจริง
            $('#input_container_type').val('OTHER');
            $('#input_container_type_other').val(dbCtnType).removeClass('d-none');
        } else {
            $('#input_container_type').val('');
            $('#input_container_type_other').addClass('d-none');
        }

        // Photos & ID
        if (h.report_id) {
            $('#current_report_id').val(h.report_id);
            if (res.photos) {
                for (const [type, path] of Object.entries(res.photos)) showPreview(type, path);
            }
            loadChecklistData(); 
        } else {
            const saveRes = await saveHeaderPromise(); 
            if(saveRes.success && saveRes.report_id) $('#current_report_id').val(saveRes.report_id);
        }

        // Handle Status
        const currentStatus = (h.status || h.report_status || '').toString().toUpperCase().trim();
        if (currentStatus === 'COMPLETED') {
            $('#view-report-form input, #view-report-form select, #view-report-form textarea').prop('disabled', true);
            $('.camera-box').css('pointer-events', 'none').css('opacity', '0.7');
            $('.sticky-footer').html(`
                <div class="text-danger fw-bold mb-2 text-center"><i class="fas fa-lock"></i> COMPLETED</div>
                <button class="btn btn-outline-warning w-100 shadow-sm" onclick="reopenReport()"><i class="fas fa-unlock-alt me-2"></i> Re-open</button>
            `);
        } else {
            $('#view-report-form input, #view-report-form select, #view-report-form textarea').prop('disabled', false);
            $('.camera-box').css('pointer-events', 'auto').css('opacity', '1');
            $('#input_container_readonly, #input_seal_readonly').prop('readonly', true);
            $('#input_location').prop('readonly', false);
            
            // Render Footer with Checkbox (Slim Version)
            $('.sticky-footer').html(`
                <div class="d-flex align-items-center justify-content-between gap-2">
                    <div class="form-check form-switch mb-0 d-flex align-items-center" style="padding-left: 2.5em;">
                        <input class="form-check-input border-secondary" type="checkbox" role="switch" 
                               id="confirm_all_pass" 
                               style="width: 2.5em; height: 1.25em; margin-left: -2.5em; cursor: pointer;" 
                               onchange="toggleFinishButton(this)" disabled>
                        <label class="form-check-label fw-bold text-dark small ms-2 lh-1" for="confirm_all_pass" style="font-size: 0.85rem; cursor: pointer;">
                            Confirm<br>Pass All
                        </label>
                    </div>
                    <button id="btn_finish" class="btn btn-secondary shadow-sm py-2 px-3 flex-grow-1" 
                            style="max-width: 200px; border-radius: 8px;" 
                            onclick="finishInspection()" disabled>
                        <i class="fas fa-lock me-1"></i> Finish
                    </button>
                </div>
                <div id="scroll_hint" class="position-absolute top-0 start-50 translate-middle-x text-center w-100" style="margin-top: -20px; pointer-events: none;">
                    <span class="badge bg-dark opacity-75 shadow-sm" style="font-size: 0.7rem;"><i class="fas fa-arrow-down animate-bounce"></i> Scroll</span>
                </div>
            `);
            
            setTimeout(checkScrollPosition, 500);
        }
        
        // [ADD] สร้างประวัติการเข้าชม (History State)
        history.pushState({page: 'report'}, 'Report View', '#report');
        
        switchView('form'); 
    } catch (err) {
        Swal.fire('Error', 'Failed to load report: ' + err.message, 'error');
    } finally {
        $('#loadingOverlay').hide();
    }
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

function loadChecklistData() {
    const reportId = $('#current_report_id').val();
    if (!reportId) return;

    $.getJSON(API_URL, { action: 'get_checklist', report_id: reportId }, function(res) {
        if (res.success) {
            for (const [topicId, items] of Object.entries(res.data)) {
                for (const [itemIndex, row] of Object.entries(items)) {
                    const itemKey = topicId + '_' + itemIndex;
                    $(`input[name="res_${itemKey}"][value="${row.result}"]`).prop('checked', true);
                    if (row.remark) {
                        $(`#remark_${itemKey}`).val(row.remark);
                        $(`#collapse_remark_${itemKey}`).addClass('show'); 
                    }
                }
                recalcTopicStatus(topicId);
            }
            validateCompletion();
        }
    });
}

function saveHeaderPromise() {
    return new Promise((resolve, reject) => {
        saveHeader().then(resolve).fail(reject);
    });
}

function saveHeader() {
    // [UPDATE] Logic เลือกค่าที่จะบันทึก (Container Type)
    let finalCtnType = $('#input_container_type').val();
    if (finalCtnType === 'OTHER') {
        finalCtnType = $('#input_container_type_other').val();
    }

    const data = {
        action: 'save_header',
        sales_order_id: $('#current_so_id').val(),
        loading_location: $('#input_location').val(),
        loading_start_time: $('#input_start_time').val(),
        loading_end_time: $('#input_end_time').val(),
        seal_no: $('#input_seal').val(),
        cable_seal: $('#input_cable_seal').val(),
        container_no: $('#input_container').val(),
        container_type: finalCtnType, // ใช้ค่าที่คำนวณใหม่
        car_license: $('#input_car_license').val(),
        driver_name: $('#input_driver').val(),
        inspector_name: $('#input_inspector').val(),
        supervisor_name: $('#input_supervisor').val()
    };
    return $.post(API_URL, data, function(res) {
        if (res.success && res.report_id) { $('#current_report_id').val(res.report_id); }
    }, 'json');
}

function finishInspection() {
    clearTimeout(saveTimer);
    if (!$('#input_seal').val()) { Swal.fire('Missing Data', 'Please enter Seal No.', 'warning'); return; }
    
    Swal.fire({
        title: 'Confirm Finish?', text: "This will lock the report.", icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Yes, Finish!', confirmButtonColor: '#198754'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex'); 
            saveHeader().then(() => {
                $.post(API_URL, { action: 'finish_report', report_id: $('#current_report_id').val() }, function(res) {
                    $('#loadingOverlay').hide();
                    if (res.success) {
                        Swal.fire('Success', 'Completed!', 'success').then(() => { switchView('list'); });
                    } else {
                        Swal.fire('Error', res.message, 'error');
                    }
                }, 'json');
            });
        }
    });
}

function reopenReport() {
    Swal.fire({
        title: 'Unlock?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Unlock', confirmButtonColor: '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            $.post(API_URL, { action: 'reopen_report', report_id: $('#current_report_id').val() }, function(res) {
                if (res.success) {
                    Swal.fire('Unlocked', '', 'success').then(() => { openReport($('#current_so_id').val()); });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            }, 'json');
        }
    });
}

function triggerCamera(type) {
    if ($(`#box_${type}`).hasClass('has-image')) {
        if (!confirm('Replace photo?')) return;
    }
    $(`#file_${type}`).click();
}

function handleFileSelect(input, type) {
    if (input.files && input.files[0]) uploadPhoto(input.files[0], type);
}

function uploadPhoto(file, type) {
    const reportId = $('#current_report_id').val();
    if (!reportId) { Swal.fire('Error', 'Report ID missing', 'error'); return; }

    const $box = $(`#box_${type}`);
    const originalContent = $box.html(); 
    $box.html('<div class="spinner-border text-primary spinner-border-sm"></div>');

    resizeImage(file, 1280, 0.7, function(compressedBlob) {
        const fd = new FormData();
        fd.append('action', 'upload_photo');
        fd.append('file', compressedBlob, file.name.replace(/\.[^/.]+$/, "") + ".jpg"); 
        fd.append('report_id', reportId);
        fd.append('photo_type', type);

        $.ajax({
            url: API_URL, type: 'POST', data: fd, contentType: false, processData: false,
            success: function(res) {
            if (res.success) {
                showPreview(type, res.path);
                setTimeout(validateCompletion, 200); 
            } else { Swal.fire('Failed', res.message, 'error'); $box.html(originalContent); }
            },
            error: function() { Swal.fire('Error', 'Connection failed', 'error'); $box.html(originalContent); }
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
            let width = img.width, height = img.height;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => callback(blob), 'image/jpeg', quality);
        };
    };
}

function showPreview(type, path) {
    const $box = $(`#box_${type}`);
    $box.empty();
    $box.append(`<img src="${path}?t=${new Date().getTime()}" class="preview-img rounded">`);
    $box.addClass('has-image');
}

function goBackToList() {
    history.back();
}

function toggleContainerOther() {
    const val = $('#input_container_type').val();
    if (val === 'OTHER') {
        $('#input_container_type_other').removeClass('d-none').focus();
    } else {
        $('#input_container_type_other').addClass('d-none');
    }
}