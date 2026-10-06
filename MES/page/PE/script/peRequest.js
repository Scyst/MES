// e:\MES\MES\MES\page\PE\script\operator_portal.js

document.addEventListener('DOMContentLoaded', () => {
    // Set default date & time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('dt_start_date').value = todayStr;
    document.getElementById('dt_end_date').value = todayStr; // Auto-fill End Date
    document.getElementById('dt_start_time').value = timeStr;

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
        
        // Trigger change to auto-fill if pre-selected
        if(reqMachineSelect.value !== "") {
            reqMachineSelect.dispatchEvent(new Event('change'));
        }
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
        
        // Trigger change to auto-fill if pre-selected
        if(dtMachineSelect.value !== "") {
            dtMachineSelect.dispatchEvent(new Event('change'));
        }
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
                        aspectRatio: NaN,
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
        document.getElementById('btnRotateRight')?.addEventListener('click', () => {
            if (cropper) cropper.rotate(90);
        });

        // Aspect Ratio buttons
        document.querySelectorAll('.btn-aspect').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!cropper) return;
                document.querySelectorAll('.btn-aspect').forEach(b => b.classList.remove('active', 'btn-light'));
                document.querySelectorAll('.btn-aspect').forEach(b => b.classList.add('btn-outline-light'));
                this.classList.remove('btn-outline-light');
                this.classList.add('active', 'btn-light');
                
                const ratio = parseFloat(this.getAttribute('data-ratio'));
                cropper.setAspectRatio(ratio);
            });
        });

        // Confirm Crop
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
        
        if (!photoInput.files || photoInput.files.length === 0) {
            Swal.fire({
                title: 'กรุณาแนบรูปภาพ',
                text: 'จำเป็นต้องแนบรูปถ่ายปัญหาทุกครั้งเพื่อประกอบการซ่อม',
                icon: 'warning',
                confirmButtonText: 'ตกลง'
            });
            return;
        }

        if (photoInput.files.length > 0 && !compressedImageBlob) {
            Swal.fire({
                title: 'กรุณายืนยันรูปภาพ',
                text: 'คุณแนบรูปภาพแล้ว แต่ยังไม่ได้กดยืนยันการตัดรูปภาพ (Crop) กรุณากดยืนยันก่อนบันทึก',
                icon: 'warning',
                confirmButtonText: 'ตกลง'
            });
            return;
        }

        const formData = new FormData(formWO);
        
        // Remove raw uncompressed photo from form data to prevent exceeding max upload limits
        formData.delete('photo');
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
            if (error.message === 'CSRF token validation failed.' || error.message?.includes('CSRF')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'เซสชันหมดอายุ',
                    text: 'ระบบกำลังรีเฟรชหน้าจอเพื่อดึงข้อมูลเซสชันใหม่...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => window.location.reload());
                return;
            }
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
            if (error.message === 'CSRF token validation failed.' || error.message?.includes('CSRF')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'เซสชันหมดอายุ',
                    text: 'ระบบกำลังรีเฟรชหน้าจอเพื่อดึงข้อมูลเซสชันใหม่...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => window.location.reload());
                return;
            }
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
        const formatDt = (dtStr) => {
            if (!dtStr) return '-';
            const d = new Date(dtStr);
            if (isNaN(d)) return dtStr.substring(0, 16);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        const startDate = formatDt(item.start_time);
        const endDate = formatDt(item.end_time);
        const duration = item.end_time ? `${item.duration_min || 0} นาที` : 'กำลังหยุด';
        const badgeColor = item.end_time ? 'bg-secondary' : 'bg-danger';
        let endBtnHtml = '';
        if (!item.end_time) {
            endBtnHtml = `
            <div class="mt-2 text-end">
                <button class="btn btn-sm btn-danger rounded-pill px-3 shadow-sm" onclick="endDowntime(${item.downtime_id})">
                    <i class="fas fa-power-off"></i> จบการหยุดเครื่อง
                </button>
            </div>`;
        }

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
                ${endBtnHtml}
            </div>
        `;
    });
    container.innerHTML = html;
}

async function endDowntime(id) {
    if (!confirm('ยืนยันจบการหยุดเครื่องสำหรับรายการนี้? (จะบันทึกเวลาจบเป็นเวลาปัจจุบัน)')) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'end_downtime');
        formData.append('downtime_id', id);
        
        // Add CSRF token
        const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;
        if (csrfToken) formData.append('csrf_token', csrfToken);
        
        const res = await fetch(API_DOWNTIME, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            alert('บันทึกเวลาจบเรียบร้อย');
            loadCurrentHistory();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// e:\MES\MES\MES\page\PE\script\quick_hazard.js
document.addEventListener('DOMContentLoaded', () => {
    const cameraBtn = document.getElementById('hazard_cameraBtn');
    const cameraInput = document.getElementById('hazard_cameraInput');
    const previewContainer = document.getElementById('hazard_previewContainer');
    const imagePreview = document.getElementById('hazard_imagePreview');
    const removeImgBtn = document.getElementById('hazard_removeImgBtn');
    const imageBase64 = document.getElementById('hazard_imageBase64');
    const hazardForm = document.getElementById('hazardForm');

    // Trigger file input when clicking the nice button
    cameraBtn.addEventListener('click', () => {
        cameraInput.click();
    });

    // Handle image selection
    cameraInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Compress image using Canvas
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 1200; // max width/height

                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                imagePreview.src = dataUrl;
                imageBase64.value = dataUrl;
                
                cameraBtn.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Remove image
    removeImgBtn.addEventListener('click', () => {
        cameraInput.value = '';
        imageBase64.value = '';
        imagePreview.src = '';
        previewContainer.style.display = 'none';
        cameraBtn.style.display = 'block';
    });

    // Form Submission
    hazardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!imageBase64.value) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาถ่ายรูป',
                text: 'การแจ้งเหตุฉุกเฉินจำเป็นต้องมีรูปถ่ายเพื่อประเมินสถานการณ์เบื้องต้น',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        Swal.fire({
            title: 'กำลังส่งข้อมูล...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const formData = new FormData(hazardForm);

        try {
            const response = await fetch('api/publicHazardAPI.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'ส่งข้อมูลสำเร็จ!',
                    text: `ระบบได้รับแจ้งปัญหาของคุณแล้ว (รหัส: ${result.wo_number}) ทีมงานกำลังเร่งดำเนินการ`,
                    confirmButtonColor: '#198754',
                    confirmButtonText: 'รับทราบ'
                }).then(() => {
                    // Reset form but keep machine code if it was prefilled
                    const machineCode = document.getElementById('hazard_machineCode').value;
                    const isReadonly = document.getElementById('hazard_machineCode').hasAttribute('readonly');
                    hazardForm.reset();
                    removeImgBtn.click();
                    if (isReadonly) {
                        document.getElementById('hazard_machineCode').value = machineCode;
                    }
                });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถส่งข้อมูลได้', 'error');
            }
        } catch (error) {
            console.error('Error submitting hazard report:', error);
            Swal.fire('การเชื่อมต่อล้มเหลว', 'กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', 'error');
        }
    });
});


window.removeImage = function(itemId) {
    document.getElementById(`cam_${itemId}`).value = '';
    document.getElementById(`img_b64_${itemId}`).value = '';
    document.getElementById(`preview_img_${itemId}`).src = '';
    document.getElementById(`preview_cont_${itemId}`).style.display = 'none';
    document.getElementById(`cam_btn_${itemId}`).style.display = 'block';
};

document.addEventListener('DOMContentLoaded', () => {
    const failActionArea = document.getElementById('failActionArea');
    const submitBtn = document.getElementById('submitBtn');
    
    // Auto-fill audited_by if previously saved and no session user
    const auditedByInput = document.getElementById('auditedByInput');
    if (!auditedByInput.value) {
        const savedName = localStorage.getItem('preop_audited_by');
        if(savedName) {
            auditedByInput.value = savedName;
        }
    }
    
    // Check if any "no" is selected
    function checkFailures() {
        let hasFailure = false;
        
        document.querySelectorAll('.checklist-item').forEach(itemDiv => {
            const radio = itemDiv.querySelector('input[type="radio"]');
            if (!radio) return;
            const itemId = radio.dataset.itemId;
            const noRadio = document.getElementById(`q${itemId}_no`);
            const failArea = document.getElementById(`fail_area_${itemId}`);
            
            if (noRadio && noRadio.checked) {
                failArea.style.display = 'block';
                hasFailure = true;
            } else {
                failArea.style.display = 'none';
            }
        });
        
        if (hasFailure) {
            failActionArea.style.display = 'block';
            submitBtn.className = 'btn-app-danger mt-4 w-100';
            submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i> แจ้งเหตุฉุกเฉิน (เครื่องจักรมีปัญหา)';
            document.getElementById('failRemarks').required = true;
        } else {
            failActionArea.style.display = 'none';
            submitBtn.className = 'btn-app-primary mt-4 w-100';
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i> บันทึกผลการตรวจสอบ (ปกติ)';
            document.getElementById('failRemarks').required = false;
        }
    }
    
    // Load dynamic checklist
    async function loadChecklist(machineCode) {
        const container = document.getElementById('checklistContainer');
        if (!machineCode) {
            container.innerHTML = '<div class="alert alert-warning">กรุณาระบุรหัสเครื่องจักร</div>';
            return;
        }
        
        try {
            const response = await fetch('api/preopAPI.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_checklist', machine_code: machineCode })
            });
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                container.innerHTML = ''; 
                
                result.data.forEach((item, index) => {
                    const i = index + 1;
                    const html = `
                        <div class="checklist-item" id="item${i}">
                            <div class="checklist-question mb-2" style="font-size: 0.9rem; font-weight: 500;">${i}. ${item.item_text}</div>
                            <div class="d-flex w-100" style="gap: 10px;">
                                <input type="radio" class="btn-check btn-check-custom checklist-radio" 
                                    name="q${item.item_id}" id="q${item.item_id}_yes" value="yes" 
                                    data-item-id="${item.item_id}" data-item-text="${item.item_text}" required>
                                <label class="btn btn-outline-success w-50 fw-bold rounded-3 py-2" for="q${item.item_id}_yes" style="font-size: 0.85rem;"><i class="fas fa-check me-1"></i> YES</label>
                                
                                <input type="radio" class="btn-check btn-check-custom checklist-radio" 
                                    name="q${item.item_id}" id="q${item.item_id}_no" value="no" 
                                    data-item-id="${item.item_id}" data-item-text="${item.item_text}" required>
                                <label class="btn btn-outline-danger w-50 fw-bold rounded-3 py-2" for="q${item.item_id}_no" style="font-size: 0.85rem;"><i class="fas fa-times me-1"></i> NO</label>
                            </div>
                            
                            <div class="item-failure-area" id="fail_area_${item.item_id}" style="display: none; background: #fff5f5; border: 1px dashed #ef4444; padding: 10px; border-radius: 8px; margin-top: 10px;">
                                <label class="small text-danger fw-bold mb-1"><i class="fas fa-camera"></i> ถ่ายรูปจุดที่มีปัญหา <span class="required">*</span></label>
                                <input type="hidden" id="img_b64_${item.item_id}" value="">
                                <input type="file" id="cam_${item.item_id}" accept="image/*" capture="environment" style="display: none;">
                                
                                <div class="camera-btn shadow-sm" id="cam_btn_${item.item_id}" onclick="document.getElementById('cam_${item.item_id}').click();">
                                    <i class="fas fa-camera mb-1"></i>
                                    <div class="small fw-bold">ถ่ายรูป</div>
                                </div>

                                <div class="preview-container" id="preview_cont_${item.item_id}" style="display: none; position: relative;">
                                    <button type="button" class="remove-img-btn" onclick="removeImage(${item.item_id})"><i class="fas fa-times"></i></button>
                                    <img id="preview_img_${item.item_id}" src="" alt="Preview" style="width: 100%; border-radius: 8px; border: 1px solid #ef4444;">
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', html);
                });
                
                // Attach file input listeners and radio listeners
                result.data.forEach((item) => {
                    // Radio listener
                    document.getElementById(`q${item.item_id}_yes`).addEventListener('change', checkFailures);
                    document.getElementById(`q${item.item_id}_no`).addEventListener('change', checkFailures);

                    // Camera listener
                    const camInput = document.getElementById(`cam_${item.item_id}`);
                    camInput.addEventListener('change', function(e) {
                        if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            if (file.size > 5 * 1024 * 1024) {
                                Swal.fire('ขนาดไฟล์เกิน', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5MB', 'warning');
                                camInput.value = '';
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = function(evt) {
                                const img = new Image();
                                img.onload = function() {
                                    const canvas = document.createElement('canvas');
                                    let width = img.width; let height = img.height;
                                    const MAX = 1200;
                                    if(width > height && width > MAX) { height *= MAX/width; width = MAX; }
                                    else if(height > MAX) { width *= MAX/height; height = MAX; }
                                    canvas.width = width; canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                    
                                    document.getElementById(`preview_img_${item.item_id}`).src = dataUrl;
                                    document.getElementById(`img_b64_${item.item_id}`).value = dataUrl;
                                    document.getElementById(`cam_btn_${item.item_id}`).style.display = 'none';
                                    document.getElementById(`preview_cont_${item.item_id}`).style.display = 'block';
                                }
                                img.src = evt.target.result;
                            }
                            reader.readAsDataURL(file);
                        }
                    });
                });
            } else {
                container.innerHTML = '<div class="alert alert-danger">ไม่พบแบบฟอร์ม หรือรหัสเครื่องจักรไม่ถูกต้อง</div>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม</div>';
        }
    }
    
    // Load immediately if machineCode exists
    const initialMachineCode = document.getElementById('preop_machineCode').value.trim();
    if (initialMachineCode) {
        loadChecklist(initialMachineCode);
    }
    
    // Allow reloading if user types machine code manually
    document.getElementById('preop_machineCode').addEventListener('blur', function(e) {
        if(e.target.value.trim() !== '') {
            document.getElementById('checklistContainer').innerHTML = '<div class="text-center py-4 text-secondary"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><p class="mb-0">กำลังโหลดรายการตรวจสอบ...</p></div>';
            loadChecklist(e.target.value.trim());
        }
    });

    // Form Submission
    document.getElementById('preopForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machineCode = document.getElementById('machineCode').value.trim();
        if(!machineCode) {
            Swal.fire('Error', 'กรุณาระบุรหัสเครื่องจักร', 'error');
            return;
        }

        const failAreaVisible = failActionArea.style.display === 'block';
        
        const checklistData = [];
        let missingPhotos = false;

        document.querySelectorAll('.checklist-item').forEach(itemDiv => {
            const radio = itemDiv.querySelector('input[type="radio"]:checked');
            if (radio) {
                const itemId = radio.dataset.itemId;
                let imageB64 = '';
                if (radio.value === 'no') {
                    imageB64 = document.getElementById(`img_b64_${itemId}`).value;
                    if (!imageB64) missingPhotos = true;
                }
                
                checklistData.push({
                    item_id: itemId,
                    text: radio.dataset.itemText,
                    answer: radio.value,
                    image_base64: imageB64
                });
            }
        });

        if (failAreaVisible && missingPhotos) {
            Swal.fire('ถ่ายรูปหลักฐาน', 'กรุณาถ่ายรูปในจุดที่คุณตรวจสอบไม่ผ่าน (ที่มีปัญหา)', 'warning');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังส่งข้อมูล...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.checklist_data = checklistData;

        try {
            const response = await fetch('api/preopAPI.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'submit_preop', ...data })
            });

            const result = await response.json();
            
            if (result.success) {
                // Save audited_by to local storage for future auto-fill
                localStorage.setItem('preop_audited_by', data.audited_by);
                
                Swal.fire({
                    title: 'บันทึกสำเร็จ!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    // Reset form but keep machine code and user name
                    const mc = machineCode;
                    const auditedBy = data.audited_by;
                    document.getElementById('preopForm').reset();
                    document.getElementById('machineCode').value = mc;
                    document.querySelector('input[name="audited_by"]').value = auditedBy;
                    
                    checkFailures();
                    loadChecklist(mc);
                });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Network Error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
