// e:\MES\MES\MES\page\PE\script\peTechModule.js
window.TechModule = (function() {
    let allData = [];
    let currentFilter = 'my'; // 'my' or 'all'
    let autoRefreshTimer = null;

    async function loadData() {
        try {
            const btn = document.querySelector('.tech-fab i');
            if (btn) btn.classList.add('fa-spin');

            const res = await PEApp.apiCall('workOrderAPI.php', {
                action: 'get_work_orders',
                status: 'Active'
            });

            if (res.success) {
                allData = res.data || [];
                renderFeed();
            }
        } catch (e) {
            PEApp.showToast('ไม่สามารถดึงข้อมูลได้', 'error');
        } finally {
            const btn = document.querySelector('.tech-fab i');
            if (btn) btn.classList.remove('fa-spin');
        }
    }

    function setFilter(filter) {
        currentFilter = filter;
        document.getElementById('tabMyJobs').classList.toggle('active', filter === 'my');
        document.getElementById('tabAllJobs').classList.toggle('active', filter === 'all');
        renderFeed();
    }

    function renderFeed() {
        const container = document.getElementById('woFeedContainer');
        const myName = CURRENT_USER.fullname || CURRENT_USER.username;
        
        let filtered = allData.filter(wo => wo.status !== 'Completed' && wo.status !== 'Cancelled' && wo.status !== 'Deleted');
        
        if (currentFilter === 'my') {
            filtered = filtered.filter(wo => wo.assigned_to === myName || wo.status === 'Assigned' && wo.assigned_to === myName || wo.status === 'In Progress' && wo.assigned_to === myName);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="tech-empty">
                    <i class="fas fa-clipboard-check"></i>
                    <div>ไม่มีใบงานค้างในระบบ</div>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(wo => {
            const isMine = (wo.assigned_to === myName);
            const statusClass = 'tech-status-' + wo.status.replace(' ', '');
            
            html += `
            <div class="tech-card" id="wo-card-${wo.wo_id}" data-priority="${wo.priority}">
                <div class="tech-card-header">
                    <div class="tech-wo-num">${wo.wo_number}</div>
                    <div class="tech-status-badge ${statusClass}">${wo.status}</div>
                </div>
                <div class="tech-machine">
                    <i class="fas fa-industry me-1"></i> ${wo.machine_display_name || wo.machine_name || '-'}
                </div>
                <div class="tech-issue">${PEApp.escapeHtml(wo.issue_title)}</div>
                <div class="tech-meta">
                    <div><i class="fas fa-clock"></i> ${wo.requested_at ? wo.requested_at.substring(11, 16) : '-'}</div>
                    ${wo.assigned_to ? `<div><i class="fas fa-user"></i> ${wo.assigned_to}</div>` : ''}
                </div>
                <div class="tech-actions ${wo.status === 'Assigned' && isMine ? 'two-col' : ''}">
                    ${renderButtons(wo, isMine)}
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }

    function renderButtons(wo, isMine) {
        if (wo.status === 'Open') {
            return `<button class="tech-btn tech-btn-accept" onclick="TechModule.acceptJob(${wo.wo_id})"><i class="fas fa-hand-paper"></i> รับงานนี้</button>`;
        }
        
        if (wo.status === 'Assigned' && isMine) {
            return `
                <button class="tech-btn tech-btn-outline" onclick="TechModule.unassignJob(${wo.wo_id})">ยกเลิกรับงาน</button>
                <button class="tech-btn tech-btn-start" onclick="TechModule.startJob(${wo.wo_id})"><i class="fas fa-play"></i> เริ่มซ่อม</button>
            `;
        } else if (wo.status === 'Assigned') {
            return `<div class="pe-text-xs text-center text-muted">รับงานโดย ${wo.assigned_to}</div>`;
        }

        if (wo.status === 'In Progress' && isMine) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <button class="tech-btn tech-btn-outline" onclick="TechModule.revertStart(${wo.wo_id})"><i class="fas fa-undo"></i> ย้อนกลับ</button>
                    <button class="tech-btn tech-btn-start" style="background-color:var(--pe-primary);color:white;border:none;" onclick="TechModule.openIssuePart(${wo.wo_id})"><i class="fas fa-tools"></i> เบิกอะไหล่</button>
                </div>
                <button class="tech-btn tech-btn-close" onclick="TechModule.openQuickClose(${wo.wo_id})"><i class="fas fa-check-circle"></i> ปิดงานซ่อม</button>
            `;
        } else if (wo.status === 'In Progress') {
            return `<div class="pe-text-xs text-center text-muted">กำลังซ่อมโดย ${wo.assigned_to}</div>`;
        }

        return '';
    }

    async function acceptJob(woId) {
        const result = await Swal.fire({
            title: 'ยืนยันการรับงาน?',
            text: "คุณต้องการรับผิดชอบงานซ่อมนี้ใช่หรือไม่?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'รับงาน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await PEApp.apiCall('workOrderAPI.php', {}, 'POST', { action: 'quick_accept', wo_id: woId });
                if (res.success || res.status === 'success') {
                    PEApp.showToast('รับงานเรียบร้อย', 'success');
                    // Optimistic update
                    const card = document.getElementById(`wo-card-${woId}`);
                    if (card) {
                        card.style.opacity = '0.5';
                        card.style.pointerEvents = 'none';
                    }
                    loadData();
                }
            } catch (e) {
                PEApp.showToast(e.message || 'Error accepting job', 'error');
            }
        }
    }

    async function startJob(woId) {
        try {
            const res = await PEApp.apiCall('workOrderAPI.php', {}, 'POST', { action: 'quick_start', wo_id: woId });
            if (res.success || res.status === 'success') {
                PEApp.showToast('เริ่มงานแล้ว', 'success');
                // Optimistic update
                const card = document.getElementById(`wo-card-${woId}`);
                if (card) {
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                }
                loadData();
            }
        } catch (e) {
            PEApp.showToast(e.message || 'Error starting job', 'error');
        }
    }

    async function unassignJob(woId) {
        const result = await Swal.fire({
            title: 'ยกเลิกการรับงาน?',
            text: "ระบบจะเปลี่ยนสถานะกลับเป็น Open",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันยกเลิก',
            cancelButtonText: 'ปิด'
        });
        if (result.isConfirmed) {
            try {
                const wo = allData.find(w => w.wo_id == woId);
                const payload = {
                    action: 'update_wo',
                    wo_id: woId,
                    status: 'Open',
                    assigned_to: ''
                };
                if (wo) {
                    payload.issue_title = wo.issue_title; 
                }
                const res = await PEApp.apiCall('workOrderAPI.php', {}, 'POST', payload);
                if (res.success) {
                    PEApp.showToast('ยกเลิกรับงานเรียบร้อย', 'success');
                    const card = document.getElementById(`wo-card-${woId}`);
                    if (card) {
                        card.style.opacity = '0.5';
                        card.style.pointerEvents = 'none';
                    }
                    loadData();
                }
            } catch (e) {
                PEApp.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
            }
        }
    }

    async function revertStart(woId) {
        const result = await Swal.fire({
            title: 'ย้อนกลับสถานะ?',
            text: "ระบบจะเปลี่ยนสถานะกลับเป็น Assigned (รอเริ่มซ่อม)",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ปิด'
        });
        if (result.isConfirmed) {
            try {
                const res = await PEApp.apiCall('workOrderAPI.php', {}, 'POST', { action: 'revert_start', wo_id: woId });
                if (res.success || res.status === 'success') {
                    PEApp.showToast('ย้อนกลับสถานะเรียบร้อย', 'success');
                    const card = document.getElementById(`wo-card-${woId}`);
                    if (card) {
                        card.style.opacity = '0.5';
                        card.style.pointerEvents = 'none';
                    }
                    loadData();
                }
            } catch (e) {
                PEApp.showToast(e.message || 'Error reverting status', 'error');
            }
        }
    }

    function openQuickClose(woId) {
        const wo = allData.find(w => w.wo_id == woId);
        if (!wo) return;
        document.getElementById('qcWoId').value = woId;
        document.getElementById('qcFrmAction').value = wo.action_taken || '';
        document.getElementById('qcFrmRootCause').value = wo.root_cause || '';
        
        if (document.getElementById('qcFrmStartedAt')) {
            document.getElementById('qcFrmStartedAt').value = wo.started_at ? wo.started_at.slice(0, 16) : '';
        }
        if (document.getElementById('qcFrmCompletedAt')) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('qcFrmCompletedAt').value = now.toISOString().slice(0, 16);
        }
        
        document.getElementById('qcFrmImageAfter').value = '';
        document.getElementById('qcImageAfterPreview').style.display = 'none';
        document.getElementById('qcDropzoneAfter').classList.remove('has-image');
        window.croppedImageAfterBlob = null;
        
        const modal = new bootstrap.Modal(document.getElementById('quickCloseModal'));
        modal.show();
    }

    async function submitQuickClose() {
        const woId = document.getElementById('qcWoId').value;
        const actionTaken = document.getElementById('qcFrmAction').value.trim();
        const rootCause = document.getElementById('qcFrmRootCause').value.trim();
        const startedAt = document.getElementById('qcFrmStartedAt')?.value;
        const completedAt = document.getElementById('qcFrmCompletedAt')?.value;
        const btn = document.getElementById('qcSaveBtn');
        const imgInput = document.getElementById('qcFrmImageAfter');

        if (!actionTaken) {
            PEApp.showToast('กรุณาระบุสิ่งที่ดำเนินการแก้ไข', 'warning');
            return;
        }
        if (!window.croppedImageAfterBlob && (!imgInput || imgInput.files.length === 0)) {
            PEApp.showToast('กรุณาแนบรูปภาพหลังซ่อม (After Image)', 'warning');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

            let photoAfter = null;
            if (window.croppedImageAfterBlob) {
                const file = new File([window.croppedImageAfterBlob], "image_after.webp", { type: "image/webp" });
                photoAfter = await PEApp.uploadFile(file, 'WO');
            } else if (imgInput && imgInput.files.length > 0) {
                photoAfter = await PEApp.uploadFile(imgInput.files[0], 'WO');
            }

            await PEApp.apiCall('workOrderAPI.php', {}, 'POST', {
                action: 'quick_close',
                wo_id: woId,
                photo_after: photoAfter,
                action_taken: actionTaken,
                root_cause: rootCause,
                started_at: startedAt,
                completed_at: completedAt
            });

            PEApp.showToast('ปิดงานเรียบร้อย', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickCloseModal'));
            if (modal) modal.hide();
            loadData();
        } catch (e) {
            PEApp.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check me-1"></i> ยืนยันการปิดงาน';
        }
    }

    let availableParts = [];
    async function openIssuePart(woId) {
        document.getElementById('woIssueItemInput').value = '';
        document.getElementById('woIssueItem').value = '';
        document.getElementById('woIssueItemDesc').textContent = '';
        document.getElementById('woIssueQty').value = 1;
        document.getElementById('woIssuePrice').value = '';
        document.getElementById('woIssueNotes').value = '';
        
        window.currentIssueWoId = woId;

        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_available_parts' });
            if (res.success) {
                availableParts = res.data;
                const datalist = document.getElementById('woIssueItemList');
                datalist.innerHTML = '';
                
                const uniqueParts = [...new Map(availableParts.map(item => [item.item_code, item])).values()];
                uniqueParts.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.item_code;
                    option.textContent = p.item_name;
                    datalist.appendChild(option);
                });
            }
            
            const modal = new bootstrap.Modal(document.getElementById('woIssuePartModal'));
            modal.show();
        } catch (e) {
            PEApp.showToast('Error loading spare parts', 'error');
        }
    }

    function onSparePartChange() {
        const input = document.getElementById('woIssueItemInput').value.trim().toUpperCase();
        const locSelect = document.getElementById('woIssueLocation');
        locSelect.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
        document.getElementById('woIssueMaxQty').textContent = 'ยอดคงเหลือ: 0';
        document.getElementById('woIssueMaxQty').classList.remove('text-danger');
        document.getElementById('woIssueItem').value = '';
        document.getElementById('woIssueItemDesc').textContent = '';
        document.getElementById('woIssuePrice').value = '';
        
        if (!input) return;

        const parts = availableParts.filter(p => p.item_code.toUpperCase() === input);
        if (parts.length > 0) {
            document.getElementById('woIssueItem').value = parts[0].item_code;
            document.getElementById('woIssueItemDesc').textContent = parts[0].item_name;
            
            parts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.location_id;
                const qtyNum = Number(p.onhand_qty);
                opt.textContent = `${p.location_name} (คงเหลือ: ${qtyNum} ${p.uom})`;
                opt.dataset.qty = p.onhand_qty;
                opt.dataset.price = p.unit_price;
                locSelect.appendChild(opt);
            });
            
            locSelect.onchange = function() {
                const selected = this.options[this.selectedIndex];
                if (selected.value) {
                    const maxQty = parseFloat(selected.dataset.qty);
                    document.getElementById('woIssueMaxQty').textContent = `ยอดคงเหลือ: ${maxQty}`;
                    document.getElementById('woIssueQty').max = maxQty;
                    document.getElementById('woIssuePrice').value = selected.dataset.price;
                } else {
                    document.getElementById('woIssueMaxQty').textContent = 'ยอดคงเหลือ: 0';
                    document.getElementById('woIssuePrice').value = '';
                }
            };
            
            if (parts.length === 1) {
                locSelect.selectedIndex = 1;
                locSelect.onchange();
            }
        } else {
            document.getElementById('woIssueItemDesc').textContent = 'ไม่พบรหัสอะไหล่นี้ หรือของหมด';
            document.getElementById('woIssueItemDesc').classList.add('text-danger');
        }
    }

    async function confirmIssuePart() {
        const woId = window.currentIssueWoId;
        const itemCode = document.getElementById('woIssueItem').value;
        const location = document.getElementById('woIssueLocation').value;
        const qty = parseFloat(document.getElementById('woIssueQty').value);
        const notes = document.getElementById('woIssueNotes').value.trim();
        const locSelect = document.getElementById('woIssueLocation');
        const selectedOpt = locSelect.options[locSelect.selectedIndex];
        
        if (!woId || !itemCode || !location || !qty || qty <= 0) {
            PEApp.showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
            return;
        }

        const maxQty = parseFloat(selectedOpt.dataset.qty);
        if (qty > maxQty) {
            PEApp.showToast('จำนวนที่เบิกมากกว่ายอดคงเหลือ', 'error');
            return;
        }

        try {
            const part = availableParts.find(p => p.item_code === itemCode);
            if (!part) throw new Error("Item not found");

            const payload = {
                action: 'process_transaction',
                transaction_type: 'ISSUE',
                ref_job_id: woId,
                item_id: part.item_id,
                location_id: location,
                quantity: qty,
                notes: notes
            };
            
            const res = await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', payload);
            if (res.success) {
                PEApp.showToast('เบิกอะไหล่สำเร็จ', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('woIssuePartModal'));
                if (modal) modal.hide();
                loadData();
            }
        } catch (e) {
            PEApp.showToast(e.message || 'Error issuing part', 'error');
        }
    }

    // Export functions
    window.openQuickCloseModal = openQuickClose; 
    window.confirmIssuePart = confirmIssuePart;
    window.onSparePartChange = onSparePartChange;
    
    // Auto-refresh every 60 seconds
    function startAutoRefresh() {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(loadData, 60000);
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        startAutoRefresh();
        
        // Override the submit button in the modal
        const submitBtn = document.getElementById('qcSaveBtn');
        if (submitBtn) {
            submitBtn.onclick = submitQuickClose;
        }

        // Hook up image input handlers for Quick Close
        const qcDropzone = document.getElementById('qcDropzoneAfter');
        const qcInput = document.getElementById('qcFrmImageAfter');
        if (qcDropzone && qcInput) {
            qcDropzone.addEventListener('click', () => qcInput.click());
            qcInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        const preview = document.getElementById('qcImageAfterPreview');
                        preview.querySelector('img').src = evt.target.result;
                        preview.style.display = 'flex';
                        qcDropzone.classList.add('has-image');
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }
    });

    return {
        loadData,
        setFilter,
        acceptJob,
        startJob,
        revertStart,
        unassignJob,
        openQuickClose,
        openIssuePart,
        onSparePartChange,
        confirmIssuePart
    };
})();

window.PeTechModule = PeTechModule;
export default PeTechModule;
