"use strict";

const API_URL = 'api/manage_loading.php'; 
let saveTimer;
window.currentErrors = [];

$(document).ready(function() {
    loadJobList();

    $(document).on('click', 'input[type="file"]', function(e) { e.stopPropagation(); });

    const inputSelectors = '#input_location, #input_start_time, #input_end_time, #input_seal, #input_cable_seal, #input_container, #input_car_license, #input_container_type, #input_container_type_other, #input_driver, #input_inspector, #input_supervisor';
    $(inputSelectors).on('change keyup', function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveHeader, 1000); 
        validateCompletion(); 
    });

    $('#filter_search').on('keypress', function(e) {
        if(e.which == 13) loadJobList();
    });

    window.onpopstate = function(event) {
        if (!location.hash || location.hash !== '#report') {
            if (window.innerWidth < 992 && !$('#left-pane').hasClass('d-flex')) {
                switchView('list');
            }
        }
    };
});

function loadJobList() {
    $('#jobListContainer').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>');
    
    const payload = {
        action: 'get_jobs',
        start_date: $('#filter_start').val(),
        end_date: $('#filter_end').val(),
        status: $('#filter_status').val(),
        search: $('#filter_search').val()
    };

    $.getJSON(API_URL, payload, function(res) {
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i><br>No jobs found</div>`;
        } else {
            let basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            res.data.forEach(job => {
                let statusClass = job.report_status === 'COMPLETED' ? 'job-card done' : 'job-card draft';
                let badge = job.report_status === 'COMPLETED' ? '<span class="badge bg-success">Completed</span>' : '<span class="badge bg-warning text-dark">In Progress</span>';
                
                let printBtn = '';
                if (job.report_status === 'COMPLETED') {
                    let encodedRef = btoa('SNC-' + job.report_id);
                    let shareUrl = window.location.origin + basePath + '/customerView.php?ref=' + encodedRef;

                    printBtn = `
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-light border text-secondary" onclick="copyToClipboard('${shareUrl}', event)" title="Copy Link For Customer">
                            <i class="fas fa-copy"></i>
                        </button>
                        <a href="print_report.php?ref=${encodedRef}" target="_blank" class="btn btn-sm btn-light border text-secondary" onclick="event.stopPropagation();" title="Internal Print">
                            <i class="fas fa-print"></i>
                        </a>
                    </div>`;
                }

                const isActive = ($('#current_so_id').val() == job.so_id) ? 'active' : '';

                html += `
                <div class="${statusClass} ${isActive} w-100 p-2 p-md-3" id="job-card-${job.so_id}" onclick="openReport(${job.so_id})">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-primary mb-0">${job.po_number}</h6>
                        <div>${badge}</div>
                    </div>
                    <div class="d-flex justify-content-between align-items-end mt-1">
                        <div>
                            <div class="small text-muted"><i class="fas fa-calendar-day me-2 text-secondary" style="width:16px;"></i>Load Date: <span class="text-dark">${job.loading_date || '-'}</span></div>
                            <div class="small text-muted"><i class="fas fa-truck-loading me-2 text-secondary" style="width:16px;"></i>Cont: ${job.container_no || '-'}</div>
                        </div>
                        ${printBtn}
                    </div>
                </div>`;
            });
        }
        $('#jobListContainer').html(html);
    });
}

function resetSearch() {
    $('#filter_search').val('');
    $('#filter_status').val('ALL');
    loadJobList();
}

async function openReport(soId) {
    resetInspectionForm();
    $('#loadingOverlay').css('display', 'flex');
    
    $('.job-card').removeClass('active');
    $(`#job-card-${soId}`).addClass('active');

    try {
        const res = await $.post(API_URL, { action: 'get_report_detail', so_id: soId }, null, 'json');
        if (!res.success) throw new Error(res.message);

        const h = res.header;
        $('#current_so_id').val(h.so_id);

        $('#disp_po_head').text(h.po_number || '-');
        $('#disp_invoice').text(h.snc_ci_no || '-'); 
        $('#disp_invoice_badge').removeClass('d-none');
        $('#disp_po_nav').text('PO: ' + (h.po_number || '-'));
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

        const dbCtnType = h.ctn_size || h.container_type || '';
        if ($(`#input_container_type option[value='${dbCtnType}']`).length > 0) {
            $('#input_container_type').val(dbCtnType);
            $('#input_container_type_other').addClass('d-none');
        } else if (dbCtnType !== '') {
            $('#input_container_type').val('OTHER');
            $('#input_container_type_other').val(dbCtnType).removeClass('d-none');
        }

        $('#info-tab').tab('show');

        if (h.report_id) {
            $('#current_report_id').val(h.report_id);
            if (res.photos) {
                for (const [type, path] of Object.entries(res.photos)) showPreview(type, path);
            }
            loadChecklistData(); 
        } else {
            const saveRes = await saveHeaderPromise(); 
            if(saveRes.success && saveRes.report_id) $('#current_report_id').val(saveRes.report_id);
            validateCompletion(); 
        }

        const currentStatus = (h.status || h.report_status || '').toString().toUpperCase().trim();
        if (currentStatus === 'COMPLETED') {
            $('#form-content input, #form-content select, #form-content textarea').prop('disabled', true);
            $('.camera-box').css('pointer-events', 'none').css('opacity', '0.7');
            $('#btn_pass_all').prop('disabled', true);
            
            $('#form-action-bar').removeClass('d-none').html(`
                <div class="d-flex align-items-center justify-content-center gap-3 w-100">
                    <div class="text-danger fw-bold fs-5"><i class="fas fa-lock me-2"></i> COMPLETED</div>
                    <button class="btn btn-outline-warning shadow-sm rounded-pill px-4 fw-bold" onclick="reopenReport()"><i class="fas fa-unlock-alt me-2"></i> Re-open</button>
                </div>
            `);
        } else {
            $('#form-content input, #form-content select, #form-content textarea').prop('disabled', false);
            $('.camera-box').css('pointer-events', 'auto').css('opacity', '1');
            $('#btn_pass_all').prop('disabled', false);
            
            $('#form-action-bar').removeClass('d-none').html(`
                <div class="d-flex align-items-center justify-content-center w-100">
                    <button id="btn_finish" class="btn btn-success shadow-sm py-2 px-5 rounded-pill fw-bold w-100 w-md-auto" style="max-width:280px;" onclick="finishInspection()">
                        <i class="fas fa-check-circle me-2"></i> Finish Inspection
                    </button>
                </div>
            `);
        }
        
        history.pushState({page: 'report'}, 'Report View', '#report');
        switchView('form'); 
    } catch (err) {
        Swal.fire('Error', 'Failed to load report', 'error');
    } finally {
        $('#loadingOverlay').hide();
    }
}

function switchView(view) {
    if (window.innerWidth < 992) { 
        if (view === 'list') {
            $('#left-pane').removeClass('d-none').addClass('d-flex');
            $('#right-pane').removeClass('d-flex').addClass('d-none');
            $('.job-card').removeClass('active'); 
            $('#current_so_id').val('');
        } else {
            $('#left-pane').removeClass('d-flex').addClass('d-none');
            $('#right-pane').removeClass('d-none').addClass('d-flex');
            window.scrollTo(0,0);
        }
    } else { 
        $('#left-pane').removeClass('d-none').addClass('d-flex');
        $('#right-pane').removeClass('d-none').addClass('d-flex');
    }

    if (view === 'form' || $('#current_so_id').val() !== '') {
        $('#empty-state').addClass('d-none').removeClass('d-flex');
        $('#form-content').removeClass('d-none').addClass('d-flex');
    } else {
        $('#empty-state').removeClass('d-none').addClass('d-flex');
        $('#form-content').addClass('d-none').removeClass('d-flex');
        $('#disp_invoice_badge').addClass('d-none');
    }
}

$(window).resize(function() {
    if (window.innerWidth >= 992) {
        $('#left-pane').removeClass('d-none').addClass('d-flex');
        $('#right-pane').removeClass('d-none').addClass('d-flex');
    } else {
        if ($('#current_so_id').val() !== '') {
            $('#left-pane').removeClass('d-flex').addClass('d-none');
        } else {
            $('#right-pane').removeClass('d-flex').addClass('d-none');
        }
    }
});

function loadChecklistData() {
    const reportId = $('#current_report_id').val();
    if (!reportId) return;

    $.getJSON(API_URL, { action: 'get_checklist', report_id: reportId }, function(res) {
        if (res.success) {
            for (const [topicId, items] of Object.entries(res.data)) {
                for (const [itemIndex, row] of Object.entries(items)) {
                    const itemKey = topicId + '_' + itemIndex;
                    $(`input[name="res_${itemKey}"][value="${row.result}"]`).prop('checked', true);
                    if (row.remark) $(`#remark_${itemKey}`).val(row.remark);
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
    let finalCtnType = $('#input_container_type').val();
    if (finalCtnType === 'OTHER') finalCtnType = $('#input_container_type_other').val();

    const data = {
        action: 'save_header',
        sales_order_id: $('#current_so_id').val(),
        loading_location: $('#input_location').val(),
        loading_start_time: $('#input_start_time').val(),
        loading_end_time: $('#input_end_time').val(),
        seal_no: $('#input_seal').val(),
        cable_seal: $('#input_cable_seal').val(),
        container_no: $('#input_container').val(),
        container_type: finalCtnType, 
        car_license: $('#input_car_license').val(),
        driver_name: $('#input_driver').val(),
        inspector_name: $('#input_inspector').val(),
        supervisor_name: $('#input_supervisor').val()
    };
    return $.post(API_URL, data, function(res) {
        if (res.success && res.report_id) { $('#current_report_id').val(res.report_id); }
    }, 'json');
}

function saveSubItem(topicId, topicName, itemIndex, itemName) {
    const reportId = $('#current_report_id').val();
    const itemKey = topicId + '_' + itemIndex;
    const result = $(`input[name="res_${itemKey}"]:checked`).val();
    const remark = $(`#remark_${itemKey}`).val();

    if (!reportId || !result) return;

    $.post(API_URL, {
        action: 'save_checklist_item', report_id: reportId, topic_id: topicId,
        topic_name: topicName, item_index: itemIndex, item_name: itemName,
        result: result, remark: remark
    }, function(res) {
        if(res.success) recalcTopicStatus(topicId);
    }, 'json');
    
    setTimeout(validateCompletion, 100); 
}

function validateCompletion() {
    const errors = [];

    const requiredInputs = {
        '#input_container': 'Container No.', '#input_seal': 'Seal No.',
        '#input_car_license': 'License Plate', '#input_driver': 'Driver Name',
        '#input_inspector': 'Inspector', '#input_supervisor': 'Supervisor'
    };
    let infoComplete = true;
    for (const id in requiredInputs) {
        if (!$(id).val() || $(id).val().trim() === '') { infoComplete = false; break; }
    }
    const ctnType = $('#input_container_type').val();
    if (!ctnType || (ctnType === 'OTHER' && !$('#input_container_type_other').val())) infoComplete = false;
    if (!infoComplete) errors.push('Info');

    const totalPhotos = 12; 
    const currentPhotos = $('.camera-box.has-image').length;
    $('#badge-photo').text(`${currentPhotos}/${totalPhotos}`);
    if (currentPhotos === totalPhotos) $('#badge-photo').removeClass('bg-light text-dark').addClass('bg-success text-white border-success');
    else $('#badge-photo').removeClass('bg-success text-white border-success').addClass('bg-light text-dark');
    if (currentPhotos < totalPhotos) errors.push('Photos');

    const totalItems = $('.sub-item-row').length;
    let checkedCount = 0;

    $('input[type=radio]:checked').each(function() {
        checkedCount++;
    });
    
    $('#badge-check').text(`${checkedCount}/${totalItems}`);
    if (checkedCount === totalItems && totalItems > 0) $('#badge-check').removeClass('bg-light text-dark').addClass('bg-success text-white border-success');
    else $('#badge-check').removeClass('bg-success text-white border-success').addClass('bg-light text-dark');

    if (checkedCount < totalItems || totalItems === 0) errors.push('Checklist');

    window.currentErrors = errors;
}

function triggerPassAll() {
    Swal.fire({
        title: 'Pass All Items?',
        text: "ยืนยันให้ผ่านทุกข้อ (ระบบจะติ๊กเฉพาะข้อที่ยังไม่ได้เลือก)",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: 'Yes, Pass All!'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex');
            const reportId = $('#current_report_id').val();
            
            $('input[value="PASS"]').prop('checked', true);
            $('[id^="topic_icon_"]').removeClass('text-white-50 text-warning text-white').addClass('text-success');
            
            $.post(API_URL, { action: 'save_all_pass', report_id: reportId }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) validateCompletion();
                else Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }, 'json');
        }
    });
}

function recalcTopicStatus(topicId) {
    const $inputs = $(`input[name^="res_${topicId}_"]:checked`);
    let hasFail = false, allPass = true;
    $inputs.each(function() {
        if ($(this).val() === 'FAIL') hasFail = true;
        if ($(this).val() !== 'PASS') allPass = false;
    });

    const $icon = $(`#topic_icon_${topicId}`);
    $icon.removeClass('text-white-50 text-success text-warning text-white');
    if (hasFail) $icon.addClass('text-warning');
    else if ($inputs.length > 0 && allPass) $icon.addClass('text-success');
    else $icon.addClass('text-white-50');
}

function finishInspection() {
    clearTimeout(saveTimer);
    
    saveHeader().then(() => {
        if (!$('#input_seal').val()) { Swal.fire('Missing Data', 'กรุณาระบุ Seal No.', 'warning'); return; }
        
        if (window.currentErrors && window.currentErrors.length > 0) {
            let errorHtml = '<div class="text-start mt-3"><ul class="mb-0">';
            if (window.currentErrors.includes('Info')) errorHtml += '<li><b class="text-danger">Shipment Info:</b> กรอกข้อมูลสำคัญให้ครบถ้วน</li>';
            if (window.currentErrors.includes('Photos')) errorHtml += '<li><b class="text-danger">Photos:</b> ถ่ายภาพให้ครบ 12 จุด</li>';
            if (window.currentErrors.includes('Checklist')) errorHtml += '<li><b class="text-danger">Checklist:</b> ตรวจสอบรายการให้ครบ 10 ข้อ</li>';
            errorHtml += '</ul></div>';

            Swal.fire({
                title: 'ข้อมูลยังไม่ครบถ้วน!',
                html: 'ระบบตรวจพบว่าคุณยังทำรายการต่อไปนี้ไม่เสร็จ:' + errorHtml,
                icon: 'warning',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        Swal.fire({
            title: 'Confirm Finish?', text: "ยืนยันการจบงาน (ระบบจะล็อคข้อมูลทันที)", icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Yes, Finish!', confirmButtonColor: '#198754'
        }).then((result) => {
            if (result.isConfirmed) {
                $('#loadingOverlay').css('display', 'flex'); 
                $.post(API_URL, { action: 'finish_report', report_id: $('#current_report_id').val() }, function(res) {
                    $('#loadingOverlay').hide();
                    if (res.success) Swal.fire('Success', 'Completed!', 'success').then(() => { loadJobList(); switchView('list'); });
                    else Swal.fire('Error', res.message, 'error');
                }, 'json');
            }
        });
    });
}

function reopenReport() {
    Swal.fire({
        title: 'Unlock?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Unlock', confirmButtonColor: '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            $.post(API_URL, { action: 'reopen_report', report_id: $('#current_report_id').val() }, function(res) {
                if (res.success) Swal.fire('Unlocked', '', 'success').then(() => { openReport($('#current_so_id').val()); });
                else Swal.fire('Error', res.message, 'error');
            }, 'json');
        }
    });
}

function triggerCamera(type) {
    if ($(`#box_${type}`).hasClass('has-image')) { if (!confirm('Replace photo?')) return; }
    $(`#file_${type}`).click();
}

function handleFileSelect(input, type) {
    if (input.files && input.files[0]) uploadPhoto(input.files[0], type);
}

function uploadPhoto(file, type) {
    const reportId = $('#current_report_id').val();
    if (!reportId) return;

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

function goBackToList() { switchView('list'); }

function toggleContainerOther() {
    const val = $('#input_container_type').val();
    if (val === 'OTHER') $('#input_container_type_other').removeClass('d-none').focus();
    else $('#input_container_type_other').addClass('d-none');
}

function resetInspectionForm() {
    $('input[type="radio"]').prop('checked', false);
    $('input[type="text"], input[type="datetime-local"], select').val(''); 
    $('[id^="topic_icon_"]').removeClass('text-success text-warning text-white').addClass('text-white-50');
    $('.camera-box').removeClass('has-image');
    $('.preview-img').remove();
    $('.camera-box i, .camera-box .camera-label').show();
    
    $('#input_container_type_other').addClass('d-none');
    $('#btn_pass_all').prop('disabled', false);
    
    $('#badge-photo').text('0/12').removeClass('bg-success text-white border-success').addClass('bg-light text-dark');
    $('#badge-check').text('0/0').removeClass('bg-success text-white border-success').addClass('bg-light text-dark');
    window.currentErrors = ['Info', 'Photos', 'Checklist'];
}

function copyToClipboard(text, e) {
    e.stopPropagation();
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied link for customer!', showConfirmButton: false, timer: 1500 });
        });
    } else {
        const tempInput = document.createElement("input");
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand("copy");
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied link for customer!', showConfirmButton: false, timer: 1500 });
        } catch (err) {
            Swal.fire('Error', 'Failed to copy link', 'error');
        }
        document.body.removeChild(tempInput);
    }
}