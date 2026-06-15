// e:\MES\MES\MES\page\PE\script\operator_portal.js

document.addEventListener('DOMContentLoaded', () => {
    // Set default date & time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('dt_start_date').value = todayStr;
    document.getElementById('dt_start_time').value = timeStr;
    document.getElementById('dt_end_time').value = timeStr;

    // Set display for request date
    const reqDisplay = document.getElementById('req_requested_at_display');
    if (reqDisplay) {
        reqDisplay.textContent = now.toLocaleString('th-TH');
    }

    // Set default dates for history filter (last 7 days to today)
    const histStartDate = document.getElementById('hist_start_date');
    const histEndDate = document.getElementById('hist_end_date');
    if (histStartDate && histEndDate) {
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        histStartDate.value = lastWeek.toISOString().split('T')[0];
        histEndDate.value = todayStr;
    }

    // Handle Machine Selection Auto-fill
    const reqMachineSelect = document.getElementById('req_machine_id');
    if (reqMachineSelect) {
        reqMachineSelect.addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const nameInput = document.getElementById('req_machine_name');
            const lineInput = document.getElementById('req_line');
            
            if (this.value !== "") {
                nameInput.value = selected.dataset.name || '';
                lineInput.value = selected.dataset.line || '';
            } else {
                nameInput.value = '';
                lineInput.value = '';
            }
        });
    }

    const dtMachineSelect = document.getElementById('dt_machine_id');
    if (dtMachineSelect) {
        dtMachineSelect.addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const nameInput = document.getElementById('dt_machine_name');
            const lineInput = document.getElementById('dt_line');
            
            if (this.value !== "") {
                nameInput.value = selected.dataset.name || '';
                lineInput.value = selected.dataset.line || '';
            } else {
                nameInput.value = '';
                lineInput.value = '';
            }
        });
    }

    // Image Compression & Cropper Logic
    let compressedImageBlob = null;
    let cropper = null;
    let originalFileSize = 0;
    
    const photoInput = document.getElementById('req_photo');
    const previewContainer = document.getElementById('photo_preview_container');
    const previewImg = document.getElementById('photo_preview');
    const sizeInfo = document.getElementById('photo_size_info');
    
    // Modal elements
    const cropModalEl = document.getElementById('cropImageModal');
    let cropModal = null;
    if (cropModalEl && typeof bootstrap !== 'undefined') {
        cropModal = new bootstrap.Modal(cropModalEl, { backdrop: 'static', keyboard: false });
    }
    const imageToCrop = document.getElementById('imageToCrop');
    const btnRotateLeft = document.getElementById('btnRotateLeft');
    const btnRotateRight = document.getElementById('btnRotateRight');
    const btnConfirmCrop = document.getElementById('btnConfirmCrop');
    const btnCancelCrop = document.getElementById('btnCancelCrop');

    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) {
                if (previewContainer) previewContainer.style.display = 'none';
                compressedImageBlob = null;
                return;
            }

            originalFileSize = file.size;

            const reader = new FileReader();
            reader.onload = function(event) {
                imageToCrop.src = event.target.result;
                
                // Show modal
                if (cropModal) cropModal.show();
                
                // Initialize or Replace cropper
                if (cropper) {
                    cropper.destroy();
                }
                
                // Timeout to allow modal rendering
                setTimeout(() => {
                    cropper = new Cropper(imageToCrop, {
                        aspectRatio: 4 / 3, // Lock aspect ratio to match standard document image placeholder
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        restore: false,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                    });
                }, 200);
            };
            reader.readAsDataURL(file);
        });
    }
    
    if (btnRotateLeft) {
        btnRotateLeft.addEventListener('click', () => {
            if (cropper) cropper.rotate(-90);
        });
    }
    
    if (btnRotateRight) {
        btnRotateRight.addEventListener('click', () => {
            if (cropper) cropper.rotate(90);
        });
    }
    
    if (btnCancelCrop) {
        btnCancelCrop.addEventListener('click', () => {
            photoInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            compressedImageBlob = null;
            if (cropper) { cropper.destroy(); cropper = null; }
        });
    }
    
    if (btnConfirmCrop) {
        btnConfirmCrop.addEventListener('click', () => {
            if (!cropper) return;
            
            // Get cropped canvas
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 1200,
                maxHeight: 1200,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            if (canvas) {
                canvas.toBlob(function(blob) {
                    compressedImageBlob = blob;
                    
                    if (previewImg && previewContainer && sizeInfo) {
                        previewImg.src = URL.createObjectURL(blob);
                        previewContainer.style.display = 'block';
                        
                        const origSize = (originalFileSize / 1024 / 1024).toFixed(2);
                        const newSize = (blob.size / 1024 / 1024).toFixed(2);
                        sizeInfo.innerHTML = `<span class="text-danger">ต้นฉบับ: ${origSize} MB</span> <i class="fas fa-arrow-right mx-1"></i> <span class="text-success">ครอปและบีบอัด: ${newSize} MB</span>`;
                    }
                    
                    if (cropModal) cropModal.hide();
                    if (cropper) { cropper.destroy(); cropper = null; }
                }, 'image/jpeg', 0.8);
            }
        });
    }

    // Navigation Logic
    const navBtns = document.querySelectorAll('.nav-item-btn');
    const sections = document.querySelectorAll('.app-section');
    const headerTitle = document.getElementById('appHeaderTitle');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.href) {
                window.location.href = btn.dataset.href;
                return;
            }

            // Update Active Tab
            navBtns.forEach(b => {
                b.classList.remove('active');
                // Reset Color class
                const defaultColor = b.dataset.color || 'text-dark';
                b.classList.remove('text-primary', 'text-danger', 'text-dark', 'text-warning');
                b.querySelector('i').className = `fas ${b.dataset.icon}`; // Reset icon class just in case
            });

            btn.classList.add('active');
            btn.classList.add(btn.dataset.color);

            // Update Header
            const iconClass = btn.dataset.icon;
            headerTitle.innerHTML = `<i class="fas ${iconClass} ${btn.dataset.color}"></i> ${btn.dataset.title}`;

            // Switch Sections
            const targetId = btn.dataset.target;
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'section-history') {
                loadCurrentHistory();
            }
        });
    });

    // Handle Form Submissions
    const formWO = document.getElementById('formMaintenanceRequest');
    formWO.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(formWO);
        const inputLine = formData.get('line');

        if (inputLine && VALID_LINES && !VALID_LINES.includes(inputLine)) {
            const confirm = await Swal.fire({
                title: 'ไม่พบไลน์ผลิตนี้ในระบบ',
                text: `คุณระบุไลน์ผลิต/แผนกเป็น "${inputLine}" ซึ่งไม่มีในฐานข้อมูล คุณต้องการที่จะแจ้งซ่อมพื้นที่นี้จริงๆใช่ไหม?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'ใช่, ยืนยัน',
                cancelButtonText: 'กลับไปแก้ไข'
            });

            if (!confirm.isConfirmed) {
                document.getElementById('req_line').focus();
                return;
            }
        }

        try {
            // Show Loading
            Swal.fire({
                title: 'กำลังส่งข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            // Handle Image Upload if selected
            if (compressedImageBlob) {
                const uploadData = new FormData();
                uploadData.append('image', compressedImageBlob, 'compressed_photo.jpg');
                uploadData.append('prefix', 'REQ');
                
                const uploadRes = await fetch('api/uploadAPI.php', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': formData.get('csrf_token') },
                    body: uploadData
                });
                const uploadResult = await uploadRes.json();
                
                if (uploadResult.success) {
                    formData.append('image_path', uploadResult.path);
                } else {
                    throw new Error("อัปโหลดรูปภาพไม่สำเร็จ: " + uploadResult.message);
                }
            }

            const res = await fetch(API_WORKORDER, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': formData.get('csrf_token') },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'แจ้งซ่อมสำเร็จ!',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                // Reset form & preview
                formWO.reset();
                if (previewContainer) previewContainer.style.display = 'none';
                compressedImageBlob = null;
                const reqDisplay = document.getElementById('req_display_time');
                if (reqDisplay) {
                    reqDisplay.textContent = new Date().toLocaleString('th-TH');
                }
            } else {
                throw new Error(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถแจ้งซ่อมได้',
                text: error.message
            });
        }
    });

    const formDT = document.getElementById('formDowntimeRequest');
    formDT.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(formDT);
        const inputLine = formData.get('line');

        if (inputLine && VALID_LINES && !VALID_LINES.includes(inputLine)) {
            const confirm = await Swal.fire({
                title: 'ไม่พบไลน์ผลิตนี้ในระบบ',
                text: `คุณระบุไลน์ผลิต/แผนกเป็น "${inputLine}" ซึ่งไม่มีในฐานข้อมูล ยืนยันที่จะบันทึกใช่ไหม?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'ใช่, ยืนยัน',
                cancelButtonText: 'กลับไปแก้ไข'
            });

            if (!confirm.isConfirmed) {
                document.getElementById('dt_line').focus();
                return;
            }
        }

        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const res = await fetch(API_DOWNTIME, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': formData.get('csrf_token') },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกเวลาหยุดเครื่องสำเร็จ!',
                    timer: 2000,
                    showConfirmButton: false
                });
                // Reset partly
                document.getElementById('dt_cause_detail').value = '';
            } else {
                throw new Error(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถบันทึกได้',
                text: error.message
            });
        }
    });

});

let currentHistoryType = 'wo';

function loadCurrentHistory() {
    loadHistory(currentHistoryType);
}

async function loadHistory(type) {
    currentHistoryType = type;
    const container = document.getElementById('history-container');
    container.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-primary" role="status"></div><br>กำลังโหลด...</div>';

    try {
        const sd = document.getElementById('hist_start_date')?.value || '';
        const ed = document.getElementById('hist_end_date')?.value || '';
        
        let urlParams = `&limit=50`;
        if (sd) urlParams += `&startDate=${sd}`;
        if (ed) urlParams += `&endDate=${ed}`;

        if (type === 'wo') {
            // Load Work Orders
            const res = await fetch(`${API_WORKORDER}?action=get_work_orders${urlParams}`);
            const data = await res.json();
            if (data.success) {
                renderWOHistory(data.data);
            } else throw new Error(data.message);
        } else {
            // Load Downtime
            const res = await fetch(`${API_DOWNTIME}?action=get_downtime${urlParams}`);
            const data = await res.json();
            if (data.success) {
                renderDTHistory(data.data);
            } else throw new Error(data.message);
        }
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

function renderWOHistory(items) {
    const container = document.getElementById('history-container');
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">ไม่พบประวัติแจ้งซ่อม</div>';
        return;
    }

    let html = '';
    items.forEach(item => {
        let statusClass = 'status-open';
        let statusBadge = `<span class="badge bg-danger">${item.status}</span>`;
        if (item.status === 'Assigned' || item.status === 'In Progress') {
            statusClass = 'status-inprogress';
            statusBadge = `<span class="badge bg-warning text-dark">${item.status}</span>`;
        } else if (item.status === 'Completed') {
            statusClass = 'status-completed';
            statusBadge = `<span class="badge bg-success">${item.status}</span>`;
        }

        const dateStr = item.requested_at ? item.requested_at.substring(0, 16) : '-';

        html += `
            <div class="history-card ${statusClass}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <div class="history-title text-primary">${item.issue_title || 'No Title'}</div>
                        <div class="history-meta"><i class="fas fa-industry"></i> ${item.line} - ${item.machine_display_name || item.machine_name}</div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="history-meta mb-1"><i class="fas fa-clock"></i> ${dateStr}</div>
                <div class="history-meta"><strong>ช่างที่รับผิดชอบ:</strong> ${item.assigned_to || 'รอช่างรับงาน...'}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderDTHistory(items) {
    const container = document.getElementById('history-container');
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">ไม่พบประวัติเครื่องหยุด</div>';
        return;
    }

    let html = '';
    items.forEach(item => {
        const startDate = item.start_time ? item.start_time.substring(0, 16) : '-';
        const endDate = item.end_time ? item.end_time.substring(0, 16) : '-';
        const duration = item.duration_min ? `${item.duration_min} นาที` : 'กำลังหยุด';
        const badgeColor = item.duration_min ? 'bg-secondary' : 'bg-danger';

        html += `
            <div class="history-card status-pending">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <div class="history-title text-danger">${item.cause_category || 'No Cause'}</div>
                        <div class="history-meta"><i class="fas fa-industry"></i> ${item.line} - ${item.machine_code || item.machine_name}</div>
                    </div>
                    <span class="badge ${badgeColor}">${duration}</span>
                </div>
                <div class="history-meta mb-1"><i class="fas fa-play"></i> เริ่ม: ${startDate}</div>
                <div class="history-meta mb-1"><i class="fas fa-stop"></i> จบ: ${endDate}</div>
                <div class="history-meta"><strong>Note:</strong> ${item.cause_detail || '-'}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}
