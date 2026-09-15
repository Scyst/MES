document.addEventListener('DOMContentLoaded', function() {
    const btnPreview = document.getElementById('btnPreview');
    const cameraIpInput = document.getElementById('camera_ip');
    const previewContainer = document.getElementById('previewContainer');
    const previewStatus = document.getElementById('previewStatus');
    const previewImage = document.getElementById('previewImage');
    const previewLog = document.getElementById('previewLog');
    const btnClosePreview = document.getElementById('btnClosePreview');

    // ปิดภาพ Preview
    if (btnClosePreview && previewContainer) {
        btnClosePreview.addEventListener('click', function() {
            previewContainer.style.display = 'none';
        });
    }

    // โหลดค่า IP และยี่ห้อล่าสุดที่เคยใช้งาน
    if (cameraIpInput && localStorage.getItem('lastCameraIp')) {
        cameraIpInput.value = localStorage.getItem('lastCameraIp');
    }

    // บันทึกค่า IP ทันทีที่มีการเปลี่ยนแปลง
    if (cameraIpInput) {
        cameraIpInput.addEventListener('change', function() {
            localStorage.setItem('lastCameraIp', this.value.trim());
            checkCameraStatus(this.value.trim());
        });
        
        // เช็กตอนโหลดหน้าเว็บ
        if (cameraIpInput.value.trim() !== '') {
            checkCameraStatus(cameraIpInput.value.trim());
        }
        
        // Debounce สำหรับตอนพิมพ์
        let timeout = null;
        cameraIpInput.addEventListener('keyup', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                checkCameraStatus(this.value.trim());
            }, 800);
        });
    }
    
    // คำนวณเวลาที่ใช้ดาวน์โหลดโดยประมาณ (แยกแต่ละแถว)
    function calculateRowEstimatedTime(row) {
        const startInput = row.querySelector('.start-time-input');
        const endInput = row.querySelector('.end-time-input');
        const estContainer = row.querySelector('.est-time-container');
        const estText = row.querySelector('.est-time-text');
        
        if (startInput && endInput && startInput.value && endInput.value && estContainer && estText) {
            const start = new Date(startInput.value);
            const end = new Date(endInput.value);
            const diffMs = end - start;
            
            if (diffMs > 0) {
                const diffMins = Math.floor(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                
                let timeStr = '';
                if (hours > 0) timeStr += `${hours} ชั่วโมง `;
                if (mins > 0) timeStr += `${mins} นาที`;
                if (timeStr === '') timeStr = 'น้อยกว่า 1 นาที';
                
                estText.innerHTML = `ระยะเวลาวิดีโอ <b>${timeStr}</b>`;
                estContainer.style.display = 'block';
            } else {
                estContainer.style.display = 'none';
            }
        } else if (estContainer) {
            estContainer.style.display = 'none';
        }
    }

    // Event Delegation สำหรับช่องเวลาทุกแถว
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('start-time-input') || e.target.classList.contains('end-time-input')) {
            const row = e.target.closest('.batch-row');
            if (row) calculateRowEstimatedTime(row);
        }
    });

    // ระบบเพิ่ม/ลดแถว (Batch Download)
    const btnAddRow = document.getElementById('btnAddRow');
    const batchContainer = document.getElementById('batchContainer');
    
    if (btnAddRow && batchContainer) {
        btnAddRow.addEventListener('click', function() {
            const rows = batchContainer.querySelectorAll('.batch-row');
            const firstRow = rows[0];
            const newRow = firstRow.cloneNode(true);
            
            // เคลียร์ค่าในช่องกรอกของแถวใหม่
            newRow.querySelector('.start-time-input').value = '';
            newRow.querySelector('.end-time-input').value = '';
            newRow.querySelector('.filename-input').value = '';
            newRow.querySelector('.est-time-container').style.display = 'none';
            
            // แสดงปุ่มลบในแถวใหม่
            newRow.querySelector('.btn-remove-row').style.display = 'inline-block';
            
            batchContainer.appendChild(newRow);
        });
        
        // Event Delegation สำหรับปุ่มลบแถว
        document.addEventListener('click', function(e) {
            const btnRemove = e.target.closest('.btn-remove-row');
            if (btnRemove) {
                const row = btnRemove.closest('.batch-row');
                if (row && batchContainer.querySelectorAll('.batch-row').length > 1) {
                    row.remove();
                }
            }
        });
    }
    
    function checkCameraStatus(ip) {
        const badge = document.getElementById('camStatusBadge');
        const spinner = document.getElementById('camStatusSpinner');
        const text = document.getElementById('camStatusText');
        
        if (!ip) {
            badge.className = 'badge bg-secondary ms-2';
            text.textContent = 'รอรับ IP...';
            spinner.style.display = 'none';
            return;
        }
        
        badge.className = 'badge bg-warning text-dark ms-2';
        text.textContent = 'กำลังเช็ก...';
        spinner.style.display = 'inline-block';
        
        const formData = new FormData();
        formData.append('camera_ip', ip);
        
        fetch('api/check_status.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            if (data.status === 'online') {
                badge.className = 'badge bg-success ms-2';
                text.textContent = 'Online';
            } else {
                badge.className = 'badge bg-danger ms-2';
                text.textContent = 'Offline';
            }
        })
        .catch(err => {
            spinner.style.display = 'none';
            badge.className = 'badge bg-secondary ms-2';
            text.textContent = 'เช็กไม่ได้';
        });
    }

    if (btnPreview) {
        btnPreview.addEventListener('click', function() {
            const cameraIp = cameraIpInput.value.trim();
            if (!cameraIp) {
                // M-4: ใช้ Inline message แทน alert()
                previewContainer.style.display = 'block';
                previewImage.style.display = 'none';
                previewLog.style.display = 'none';
                previewStatus.className = 'badge bg-warning text-dark mb-2';
                previewStatus.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> กรุณากรอก IP Address ของกล้องก่อนทดสอบ';
                cameraIpInput.focus();
                return;
            }

            // กำหนดสถานะกำลังโหลด
            previewContainer.style.display = 'block';
            previewImage.style.display = 'none';
            previewLog.style.display = 'none';
            previewStatus.className = 'badge bg-warning text-dark mb-2';
            previewStatus.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังเชื่อมต่อเพื่อดึงภาพ...';
            btnPreview.disabled = true;

            const formData = new FormData();
            formData.append('camera_ip', cameraIp);

            fetch('api/preview.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                btnPreview.disabled = false;
                if (data.status === 'success') {
                    previewStatus.className = 'badge bg-success mb-2';
                    previewStatus.innerHTML = '<i class="fas fa-check-circle me-1"></i> เชื่อมต่อสำเร็จ (Live Snapshot)';
                    previewImage.src = data.image;
                    previewImage.style.display = 'inline-block';
                } else {
                    previewStatus.className = 'badge bg-danger mb-2';
                    previewStatus.innerHTML = '<i class="fas fa-times-circle me-1"></i> เชื่อมต่อล้มเหลว';
                    previewLog.textContent = data.message + (data.log ? '\n\nLog Details:\n' + data.log : '');
                    previewLog.style.display = 'block';
                }
            })
            .catch(error => {
                btnPreview.disabled = false;
                previewStatus.className = 'badge bg-danger mb-2';
                previewStatus.innerHTML = '<i class="fas fa-times-circle me-1"></i> เกิดข้อผิดพลาดของระบบ';
                previewLog.textContent = error.toString();
                previewLog.style.display = 'block';
            });
        });
    }

    // จัดการการส่งฟอร์มดาวน์โหลดด้วย AJAX
    const downloadForm = document.getElementById('downloadForm');
    if (downloadForm) {
        downloadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const cameraIpInput = document.getElementById('camera_ip');
            const cameraIp = cameraIpInput.value.trim();
            if (!cameraIp) {
                const sc = document.getElementById('downloadStatusContainer');
                const st = document.getElementById('downloadStatusText');
                const sp = document.getElementById('downloadSpinner');
                sc.style.display = 'block';
                sc.className = 'alert alert-warning mt-3';
                sp.className = 'fas fa-exclamation-triangle me-2';
                st.textContent = 'กรุณากรอก IP ของกล้องก่อน';
                cameraIpInput.focus();
                return;
            }
            
            const batchContainer = document.getElementById('batchContainer');
            const rows = batchContainer.querySelectorAll('.batch-row');
            const jobs = [];
            
            for (let row of rows) {
                const start = row.querySelector('.start-time-input').value;
                const end = row.querySelector('.end-time-input').value;
                const fname = row.querySelector('.filename-input').value;
                
                if (start && end && fname) {
                    jobs.push({ start_time: start, end_time: end, filename: fname, rowNum: jobs.length + 1 });
                }
            }
            
            if (jobs.length === 0) {
                const sc = document.getElementById('downloadStatusContainer');
                const st = document.getElementById('downloadStatusText');
                const sp = document.getElementById('downloadSpinner');
                sc.style.display = 'block';
                sc.className = 'alert alert-warning mt-3';
                sp.className = 'fas fa-exclamation-triangle me-2';
                st.textContent = 'กรุณากรอกข้อมูลให้ครบอย่างน้อย 1 รายการ (เวลาเริ่ม, เวลาสิ้นสุด, ชื่อไฟล์)';
                return;
            }
            
            const btnDownload = document.getElementById('btnDownload');
            const statusContainer = document.getElementById('downloadStatusContainer');
            const statusText = document.getElementById('downloadStatusText');
            const spinner = document.getElementById('downloadSpinner');

            btnDownload.disabled = true;
            statusContainer.style.display = 'block';
            statusContainer.className = 'alert alert-info mt-3';
            
            let successCount = 0;
            let queueCount = 0;
            let errorCount = 0;
            let errorRows = [];
            
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                btnDownload.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> กำลังส่งคำสั่ง ${i+1}/${jobs.length}...`;
                statusText.textContent = `กำลังส่งคำสั่ง ${i+1}/${jobs.length} ไปยังเซิร์ฟเวอร์...`;
                spinner.className = 'fas fa-spinner fa-spin me-2';
                
                const fd = new FormData();
                fd.append('camera_ip', cameraIp);
                fd.append('start_time', job.start_time);
                fd.append('end_time', job.end_time);
                fd.append('filename', job.filename);
                
                try {
                    const response = await fetch('api/download.php', { method: 'POST', body: fd });
                    const data = await response.json();
                    
                    if (data.status === 'success' || data.status === 'fallback') {
                        if (data.method === 'rtsp_queue') queueCount++;
                        else successCount++;
                    } else {
                        errorCount++;
                        errorRows.push({ num: job.rowNum, msg: data.message || '' });
                    }
                } catch (err) {
                    console.error('Error on job', job, err);
                    errorCount++;
                    errorRows.push({ num: job.rowNum, msg: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
                }
            }
            
            // เสร็จสิ้นทุกลูป
            btnDownload.disabled = false;
            btnDownload.innerHTML = '<i class="fas fa-download me-2"></i> สั่งดาวน์โหลดวิดีโอ';
            
            if (errorCount === 0) {
                statusContainer.className = 'alert alert-success mt-3';
                spinner.className = 'fas fa-check-circle me-2';
            } else {
                statusContainer.className = 'alert alert-warning mt-3';
                spinner.className = 'fas fa-exclamation-triangle me-2';
            }
            
            let errorDetail = '';
            if (errorRows.length > 0) {
                errorDetail = '<br>' + errorRows.map(r =>
                    `รายการที่ ${r.num}: <span style="color:#b91c1c;">${r.msg || 'เกิดข้อผิดพลาด'}</span>`
                ).join('<br>');
            }
            statusText.innerHTML = `<strong>เพิ่มรายการสำเร็จ!</strong><br>เริ่มดาวน์โหลดทันที: ${successCount} ไฟล์<br>เข้าคิวรอ: ${queueCount} ไฟล์${errorDetail}`;
            
            // ไม่ต้องรีเซ็ตฟอร์ม เพื่อให้ผู้ใช้เห็นค่าที่กรอกไว้
            
            refreshFileList();
        });
    }

    // ฟังก์ชันอัปเดตตารางไฟล์แบบ Auto-Refresh
    function refreshFileList() {
        const container = document.getElementById('file-list-container');
        if (!container) return;
        
        fetch('api/list_files.php')
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;
                applyFilterAndSort();
            })
            .catch(err => console.error('Failed to refresh list', err));
    }

    // เริ่ม Polling ทุกๆ 5 วินาที
    if (document.getElementById('file-list-container')) {
        refreshFileList();
        setInterval(refreshFileList, 5000);
    }

    // Event Delegation สำหรับปุ่มลบไฟล์ เนื่องจากตารางถูกอัปเดตด้วย AJAX ตลอดเวลา
    document.addEventListener('click', function(e) {
        // หาปุ่มที่คลิกเผื่อคลิกโดนไอคอนข้างใน
        const btn = e.target.closest('.btn-delete-file');
        if (!btn) return;
        
        const filename = btn.getAttribute('data-filename');
        if (!filename) return;

        if (confirm(`คุณต้องการลบไฟล์/ยกเลิกงาน "${filename}" ใช่หรือไม่?\n(การกระทำนี้ไม่สามารถกู้คืนได้)`)) {
            
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('filename', filename);

            fetch('api/delete.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    refreshFileList();
                } else {
                    // M-4: แสดง Error แบบ Inline แทน alert()
                    const statusContainer = document.getElementById('downloadStatusContainer');
                    const statusText = document.getElementById('downloadStatusText');
                    const spinner = document.getElementById('downloadSpinner');
                    statusContainer.style.display = 'block';
                    statusContainer.className = 'alert alert-danger mt-3';
                    spinner.className = 'fas fa-times-circle me-2';
                    statusText.textContent = 'ข้อผิดพลาดในการลบ: ' + data.message;
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            })
            .catch(error => {
                // M-4: แสดง Error แบบ Inline แทน alert()
                const statusContainer = document.getElementById('downloadStatusContainer');
                const statusText = document.getElementById('downloadStatusText');
                const spinner = document.getElementById('downloadSpinner');
                statusContainer.style.display = 'block';
                statusContainer.className = 'alert alert-danger mt-3';
                spinner.className = 'fas fa-exclamation-triangle me-2';
                statusText.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            });
        }
    });

    // ฟังก์ชันสำหรับค้นหาและจัดเรียง (ฝั่ง Frontend)
    function applyFilterAndSort() {
        const container = document.getElementById('file-list-container');
        if (!container) return;
        
        const searchInput = document.getElementById('searchInput');
        const sortSelect = document.getElementById('sortSelect');
        const dateFilterInput = document.getElementById('dateFilterInput');
        if (!searchInput || !sortSelect) return;
        
        const filterText = searchInput.value.toLowerCase().trim();
        const sortValue = sortSelect.value;
        const filterDateStr = dateFilterInput ? dateFilterInput.value : '';
        
        const items = Array.from(container.querySelectorAll('li.video-item'));
        if (items.length === 0) return;
        
        // 1. กรอง (Filter)
        items.forEach(item => {
            const name = item.getAttribute('data-name') || '';
            const isNameMatch = name.includes(filterText);
            
            let isDateMatch = true;
            if (filterDateStr) {
                const dateStartTs = parseInt(item.getAttribute('data-date-start')) || 0;
                if (dateStartTs > 0) {
                    const d = new Date(dateStartTs * 1000);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const itemDateStr = `${yyyy}-${mm}-${dd}`;
                    isDateMatch = (itemDateStr === filterDateStr);
                } else {
                    isDateMatch = false; // ไม่มีวันที่ให้ตรวจสอบ
                }
            }
            
            if (isNameMatch && isDateMatch) {
                item.classList.remove('d-none');
                item.classList.add('d-flex');
            } else {
                item.classList.remove('d-flex');
                item.classList.add('d-none');
            }
        });
        
        // 2. จัดเรียง (Sort)
        items.sort((a, b) => {
            if (sortValue === 'date_dl_desc' || sortValue === 'date_dl_asc') {
                const valA = parseInt(a.getAttribute('data-date-dl')) || 0;
                const valB = parseInt(b.getAttribute('data-date-dl')) || 0;
                return sortValue === 'date_dl_desc' ? valB - valA : valA - valB;
            }
            if (sortValue === 'date_start_desc' || sortValue === 'date_start_asc') {
                const valA = parseInt(a.getAttribute('data-date-start')) || 0;
                const valB = parseInt(b.getAttribute('data-date-start')) || 0;
                return sortValue === 'date_start_desc' ? valB - valA : valA - valB;
            }
            if (sortValue === 'name_asc' || sortValue === 'name_desc') {
                const valA = a.getAttribute('data-name') || '';
                const valB = b.getAttribute('data-name') || '';
                return sortValue === 'name_asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });
        
        // แยก li ที่ไม่ใช่ video-item ออกมาก่อน (เช่น queued files หรือ loading message)
        const allNodes = Array.from(container.children);
        const nonVideoNodes = allNodes.filter(n => !n.classList.contains('video-item'));
        
        // เคลียร์ container แล้วเรียงใหม่
        container.innerHTML = '';
        nonVideoNodes.forEach(n => container.appendChild(n));
        items.forEach(n => container.appendChild(n));
    }
    
    // ผูก Event Listener กับปุ่มค้นหาและจัดเรียง
    const searchInputEl = document.getElementById('searchInput');
    const sortSelectEl = document.getElementById('sortSelect');
    const dateFilterEl = document.getElementById('dateFilterInput');
    const btnClearDateFilter = document.getElementById('btnClearDateFilter');
    
    if (searchInputEl) searchInputEl.addEventListener('input', applyFilterAndSort);
    if (sortSelectEl) sortSelectEl.addEventListener('change', applyFilterAndSort);
    if (dateFilterEl) dateFilterEl.addEventListener('change', applyFilterAndSort);
    
    if (btnClearDateFilter && dateFilterEl) {
        btnClearDateFilter.addEventListener('click', function() {
            dateFilterEl.value = '';
            applyFilterAndSort();
        });
    }
});
