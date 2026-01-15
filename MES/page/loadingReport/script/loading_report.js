"use strict";

const API_URL = 'api/manage_loading.php';
let saveTimer;

$(document).ready(function() {
    loadJobList();

    // Auto Save
    $('#input_seal, #input_cable').on('keyup', function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveHeader, 1000); 
    });

    $(document).on('click', 'input[type="file"]', function(e) {
        e.stopPropagation();
    });
});

// 1. โหลดรายการงาน
function loadJobList() {
    $('#jobListContainer').html('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    
    $.getJSON(API_URL, { action: 'get_jobs' }, function(res) {
        if (!res.success) { alert(res.message); return; }
        
        let html = '';
        if (res.data.length === 0) {
            html = '<div class="col-12 text-center text-muted py-5"><i class="fas fa-check-circle fa-3x mb-3 text-success"></i><br>ไม่มีแผนงานโหลดวันนี้</div>';
        } else {
            res.data.forEach(job => {
                // เช็คสถานะงาน
                let statusClass = 'job-card';
                let badge = '<span class="badge bg-secondary">Waiting</span>';
                
                if (job.report_status === 'DRAFT') {
                    statusClass += ' draft';
                    badge = '<span class="badge bg-warning text-dark">In Progress</span>';
                }

                html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card shadow-sm h-100 ${statusClass}" onclick="openReport(${job.so_id})">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="fw-bold text-primary mb-0">${job.po_number}</h5>
                                ${badge}
                            </div>
                            <div class="text-muted small mb-1">
                                <i class="fas fa-truck-loading me-1"></i> ${job.container_no || 'No Container'}
                            </div>
                            <div class="text-end mt-2">
                                <small class="text-primary fw-bold">ทำรายการ <i class="fas fa-chevron-right ms-1"></i></small>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
        }
        $('#jobListContainer').html(html);
    });
}

// 2. เปิดหน้า Report
function openReport(soId) {
    $('#loadingOverlay').css('display', 'flex');
    
    $.post(API_URL, { action: 'get_report_detail', so_id: soId }, function(res) {
        $('#loadingOverlay').hide();
        if (!res.success) { alert(res.message); return; }

        const h = res.header;
        $('#current_so_id').val(h.so_id);
        $('#current_report_id').val(h.report_id || '');

        // แสดงข้อมูล Header
        $('#disp_po_head').text('PO: ' + h.po_number);
        $('#disp_desc').text(h.description || '-');
        $('#disp_booking').text(h.booking_no || '-');
        $('#disp_invoice').text(h.invoice_no || '-');
        $('#disp_container').text(h.report_container || h.master_container || '-');
        
        $('#input_seal').val(h.seal_no || '');
        $('#input_cable').val(h.cable_seal || '');

        // รีเซ็ตกล่องรูปภาพ
        $('.camera-box').removeClass('has-image');
        $('.preview-img').remove();
        $('.camera-box i, .camera-box div').show(); // Show icons

        // โหลดรูปเดิม (ถ้ามี)
        if (res.photos) {
            for (const [type, path] of Object.entries(res.photos)) {
                showPreview(type, path);
            }
        }

        // ถ้ายังไม่มี report_id ให้สร้างเลย เพื่อให้พร้อมอัปโหลดรูป
        if (!h.report_id) saveHeader();

        switchView('form'); // สลับหน้าจอ

    }, 'json');
}

// 3. บันทึก Header (Seal)
function saveHeader() {
    const soId = $('#current_so_id').val();
    const seal = $('#input_seal').val();
    const cable = $('#input_cable').val();

    $.post(API_URL, { 
        action: 'save_header', 
        so_id: soId, seal_no: seal, cable_seal: cable 
    }, function(res) {
        if (res.success) {
            $('#current_report_id').val(res.report_id);
            // เทคนิค: เปลี่ยนสีขอบ Input แว้บหนึ่งเพื่อให้รู้ว่าเซฟแล้ว
            $('#input_seal, #input_cable').addClass('is-valid');
            setTimeout(() => $('#input_seal, #input_cable').removeClass('is-valid'), 1000);
        }
    }, 'json');
}

// 4. ถ่ายรูป / อัปโหลด
function triggerCamera(type) {
    // ถ้ามีรูปแล้ว ถามก่อนกันพลาด
    if ($(`#box_${type}`).hasClass('has-image')) {
        if (!confirm('ต้องการถ่ายรูปใหม่ทับรูปเดิมหรือไม่?')) return;
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
    if (!reportId) { alert('System Error: No Report ID'); return; }

    // เปลี่ยนกล่องเป็น Loading
    const $box = $(`#box_${type}`);
    const originalContent = $box.html(); // เก็บไอคอนเดิมไว้เผื่อ error
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
                // Restore box but add image
                $box.html(originalContent); 
                showPreview(type, res.path);
            } else {
                alert('Upload Failed: ' + res.message);
                $box.html(originalContent); // Revert
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
    
    // ใส่รูป + timestamp กัน cache
    const img = `<img src="${path}?t=${new Date().getTime()}" class="preview-img rounded">`;
    $box.append(img);
    $box.addClass('has-image');
    
    // ซ่อนไอคอนกล้องและข้อความ
    $box.find('i').hide();
    
    // ย้าย Label มาไว้ข้างล่างสวยๆ
    const $label = $box.find('div.small');
    $label.css({
        'position':'absolute', 'bottom':'0', 'left':'0', 'width':'100%',
        'background':'rgba(255,255,255,0.8)', 'z-index':'2', 'padding':'2px 0'
    });
}

// Helper: สลับหน้าจอ
function switchView(view) {
    if (view === 'list') {
        $('#view-job-list').fadeIn();
        $('#view-report-form').hide();
        loadJobList(); // รีโหลดรายการเผื่อสถานะเปลี่ยน
    } else {
        $('#view-job-list').hide();
        $('#view-report-form').fadeIn();
        window.scrollTo(0,0);
    }
}