/**
 * iqs.js — In-process Quality System (IQS) Frontend Logic
 * Industrial mobile-first test execution, real-time sync, photo attachment with SHA-256 verification.
 */

const IQS = {
    csrfToken: '',
    initialData: null,
    activeRound: null,
    activeRecordsMap: {},
    isOnline: navigator.onLine,
    selectedTemplateId: null,
    currentFilter: 'all',

    init() {
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        this.bindNetworkEvents();
        this.loadInitialData();
        this.bindUIEvents();
    },

    bindNetworkEvents() {
        const banner = document.getElementById('offlineBanner');
        const updateOnlineStatus = () => {
            this.isOnline = navigator.onLine;
            if (banner) {
                banner.style.display = this.isOnline ? 'none' : 'block';
            }
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    },

    async loadInitialData() {
        try {
            this.showLoading(true);
            const res = await fetch('api/iqs_api.php?action=get_initial_data');
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            this.initialData = data.data;
            this.renderTemplateOptions();
            this.renderCoTesterOptions();
            await this.loadActiveRound();
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลเริ่มต้นได้: ' + err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    renderTemplateOptions() {
        const sel = document.getElementById('newRoundTemplate');
        if (!sel || !this.initialData?.templates) return;
        sel.innerHTML = '<option value="">-- เลือกรอบเวลามาตรฐาน (หรือระบุเอง) --</option>';
        this.initialData.templates.forEach(t => {
            sel.innerHTML += `<option value="${t.template_id}" data-name="${t.template_name}" data-shift="${t.shift}">
                ${t.template_name} (${t.std_time}) - กะ ${t.shift}
            </option>`;
        });
    },

    renderCoTesterOptions() {
        const u1 = document.getElementById('coTester1');
        const u2 = document.getElementById('coTester2');
        if (!this.initialData?.users) return;

        let options = '<option value="">-- ไม่มี --</option>';
        this.initialData.users.forEach(u => {
            if (u.id !== this.initialData.current_user?.id) {
                options += `<option value="${u.id}">${u.fullname} (${u.role || u.username})</option>`;
            }
        });
        if (u1) u1.innerHTML = options;
        if (u2) u2.innerHTML = options;
    },

    async loadActiveRound() {
        try {
            const res = await fetch('api/iqs_api.php?action=get_active_round');
            const json = await res.json();
            if (json.success && json.data) {
                this.activeRound = json.data.round;
                this.activeRecordsMap = {};
                (json.data.records || []).forEach(r => {
                    this.activeRecordsMap[r.machine_id] = r;
                });
                this.renderActiveRoundUI();
            } else {
                this.activeRound = null;
                this.renderNoActiveRoundUI();
            }
        } catch (err) {
            console.error('Error fetching active round:', err);
        }
    },

    renderNoActiveRoundUI() {
        document.getElementById('noRoundSection').style.display = 'block';
        document.getElementById('activeRoundSection').style.display = 'none';
        document.getElementById('bottomSubmitBar').style.display = 'none';
    },

    renderActiveRoundUI() {
        document.getElementById('noRoundSection').style.display = 'none';
        document.getElementById('activeRoundSection').style.display = 'block';
        document.getElementById('bottomSubmitBar').style.display = 'flex';

        // Update Round details
        document.getElementById('dispRoundNumber').textContent = this.activeRound.round_number;
        document.getElementById('dispRoundName').textContent = this.activeRound.round_name;
        document.getElementById('dispShift').textContent = this.activeRound.shift;
        document.getElementById('dispStartedAt').textContent = this.activeRound.started_at;
        
        const testers = [
            this.activeRound.primary_tester_name,
            this.activeRound.co_tester_name_1,
            this.activeRound.co_tester_name_2
        ].filter(Boolean).join(', ');
        document.getElementById('dispTesters').textContent = testers;

        this.renderMachineCards();
        this.updateProgress();
    },

    filterMachines(filterType, btnElem) {
        this.currentFilter = filterType;
        document.querySelectorAll('.iqs-filter-chip').forEach(el => el.classList.remove('active'));
        if (btnElem) btnElem.classList.add('active');

        const cards = document.querySelectorAll('.machine-card');
        cards.forEach(card => {
            const status = card.getAttribute('data-status');
            if (filterType === 'all') {
                card.style.display = 'flex';
            } else if (filterType === 'pending') {
                card.style.display = (status === 'pending') ? 'flex' : 'none';
            } else if (filterType === 'ok') {
                card.style.display = (status === 'ok') ? 'flex' : 'none';
            } else if (filterType === 'ng') {
                card.style.display = (status === 'ng') ? 'flex' : 'none';
            } else if (filterType === 'skip') {
                card.style.display = (status === 'skip') ? 'flex' : 'none';
            }
        });
    },

    renderMachineCards() {
        const container = document.getElementById('machineCardsGrid');
        if (!container || !this.initialData?.machines) return;

        let cntAll = 0, cntPending = 0, cntOk = 0, cntNg = 0, cntSkip = 0;
        container.innerHTML = '';

        this.initialData.machines.forEach(m => {
            cntAll++;
            const rec = this.activeRecordsMap[m.machine_id] || null;
            let cardStateClass = '';
            let statusKey = 'pending';
            let pullChoice = rec?.pull_result || '';
            let isSkipped = rec?.is_skipped ? true : false;

            if (isSkipped) {
                cardStateClass = 'state-skip';
                statusKey = 'skip';
                cntSkip++;
            } else if (pullChoice === 'OK') {
                cardStateClass = 'state-ok';
                statusKey = 'ok';
                cntOk++;
            } else if (pullChoice === 'NG') {
                cardStateClass = 'state-ng';
                statusKey = 'ng';
                cntNg++;
            } else {
                cntPending++;
            }

            const isVisible = (this.currentFilter === 'all' || this.currentFilter === statusKey);

            const html = `
            <div class="machine-card ${cardStateClass}" id="machineCard_${m.machine_id}" 
                 data-status="${statusKey}" style="display: ${isVisible ? 'flex' : 'none'};">
                <div>
                    <!-- Machine Header -->
                    <div class="machine-header-row">
                        <div class="machine-code-badge">
                            <span class="machine-status-dot"></span>
                            <span>${m.machine_code}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="machine-zone-pill"><i class="fas fa-map-marker-alt me-1"></i>${m.area || 'B9'}</span>
                            <div class="form-check form-switch mb-0">
                                <input class="form-check-input" type="checkbox" id="skipSwitch_${m.machine_id}" 
                                       ${isSkipped ? 'checked' : ''} onchange="IQS.toggleSkipMachine(${m.machine_id})">
                                <label class="form-check-label small text-muted" for="skipSwitch_${m.machine_id}">ข้าม</label>
                            </div>
                        </div>
                    </div>
                    <div class="small text-muted mb-2">${m.machine_name || '-'}</div>

                    <!-- Skip Reason Container -->
                    <div id="skipBox_${m.machine_id}" style="display: ${isSkipped ? 'block' : 'none'};" class="mb-3">
                        <div class="alert alert-secondary py-2 px-3 small mb-0 border-0" style="border-radius: 10px;">
                            <label class="small text-muted fw-bold mb-1">เหตุผลที่ข้ามเครื่องจักรนี้:</label>
                            <input type="text" class="form-control form-control-sm" id="skipReason_${m.machine_id}" 
                                   placeholder="เช่น ไม่มีคำสั่งผลิต / เครื่องหยุดซ่อม" 
                                   value="${rec?.skip_reason || 'ไม่มีคำสั่งผลิต / เครื่องหยุด'}">
                        </div>
                    </div>

                    <!-- Test Form Fields -->
                    <div id="testBox_${m.machine_id}" style="display: ${isSkipped ? 'none' : 'block'};">
                        <!-- SKU, PO, Thickness -->
                        <div class="row g-2 mb-2">
                            <div class="col-4">
                                <div class="measure-input-card">
                                    <label>โมเดล SKU</label>
                                    <input type="text" id="sku_${m.machine_id}" placeholder="56 TC" value="${rec?.sku || ''}">
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="measure-input-card">
                                    <label>เลขที่ PO</label>
                                    <input type="text" id="po_${m.machine_id}" placeholder="PO No." value="${rec?.po_no || ''}">
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="measure-input-card">
                                    <label>ความหนา T</label>
                                    <input type="number" step="0.01" id="thickness_${m.machine_id}" placeholder="1.20" value="${rec?.thickness || '1.20'}">
                                </div>
                            </div>
                        </div>

                        <!-- Result Choice (OK / NG) -->
                        <label class="small text-muted fw-bold mb-1">ผลการทดสอบแรงดึง (Pull Test)</label>
                        <div class="result-toggle-group">
                            <button type="button" class="btn-result-choice choice-ok ${pullChoice === 'OK' ? 'active' : ''}" 
                                    id="btnOk_${m.machine_id}" onclick="IQS.selectResult(${m.machine_id}, 'OK')">
                                <i class="fas fa-check-circle"></i> ผ่าน (OK)
                            </button>
                            <button type="button" class="btn-result-choice choice-ng ${pullChoice === 'NG' ? 'active' : ''}" 
                                    id="btnNg_${m.machine_id}" onclick="IQS.selectResult(${m.machine_id}, 'NG')">
                                <i class="fas fa-times-circle"></i> ไม่ผ่าน (NG)
                            </button>
                        </div>

                        <!-- NG Remarks if selected -->
                        <div id="ngBox_${m.machine_id}" style="display: ${pullChoice === 'NG' ? 'block' : 'none'};" class="mb-2">
                            <div class="alert alert-danger py-2 px-3 small border-0 mb-0" style="border-radius: 10px;">
                                <label class="small text-danger fw-bold mb-1"><i class="fas fa-exclamation-triangle me-1"></i>อาการ / สาเหตุ NG:</label>
                                <input type="text" class="form-control form-control-sm border-danger" id="ngRemark_${m.machine_id}" 
                                       placeholder="ระบุอาการชิ้นงานดึงหลุด / จุดเชื่อมไม่ติด" value="${rec?.ng_remark || ''}">
                            </div>
                        </div>

                        <!-- Knock and Distance Verification -->
                        <div class="measure-input-row">
                            <div class="measure-input-card">
                                <label><i class="fas fa-ruler-horizontal me-1 text-primary"></i>เช็คเคาะ (mm)</label>
                                <input type="number" step="0.01" id="knock_${m.machine_id}" placeholder="0.00" value="${rec?.knock_check_val || ''}">
                            </div>
                            <div class="measure-input-card">
                                <label><i class="fas fa-ruler-combined me-1 text-info"></i>เช็คระยะ (mm)</label>
                                <input type="number" step="0.01" id="distance_${m.machine_id}" placeholder="0.00" value="${rec?.distance_check_val || ''}">
                            </div>
                        </div>

                        <!-- Photo Proofs Upload -->
                        <div class="photo-upload-grid">
                            <div class="photo-box ${IQS.hasAttachment(rec, 'PULL_TEST') ? 'has-file' : ''}" 
                                 onclick="document.getElementById('filePull_${m.machine_id}').click()">
                                <i class="fas fa-camera text-primary fa-lg mb-1"></i>
                                <span class="photo-label">รูปชิ้นงานเทสดึง</span>
                                <input type="file" id="filePull_${m.machine_id}" accept="image/*" capture="environment" 
                                       style="display:none;" onchange="IQS.previewPhoto(this, 'previewPull_${m.machine_id}')">
                                <div id="previewPull_${m.machine_id}">
                                    ${IQS.renderAttachmentThumb(rec, 'PULL_TEST')}
                                </div>
                            </div>
                            <div class="photo-box ${IQS.hasAttachment(rec, 'CONTROL_PANEL') ? 'has-file' : ''}" 
                                 onclick="document.getElementById('filePanel_${m.machine_id}').click()">
                                <i class="fas fa-sliders-h text-info fa-lg mb-1"></i>
                                <span class="photo-label">รูปหน้าตู้คอนโทรล</span>
                                <input type="file" id="filePanel_${m.machine_id}" accept="image/*" capture="environment" 
                                       style="display:none;" onchange="IQS.previewPhoto(this, 'previewPanel_${m.machine_id}')">
                                <div id="previewPanel_${m.machine_id}">
                                    ${IQS.renderAttachmentThumb(rec, 'CONTROL_PANEL')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span class="small text-muted" id="recordTimestamp_${m.machine_id}">
                        ${rec ? `<i class="fas fa-check-circle text-success me-1"></i>${rec.recorded_at.substring(11, 16)} น.` : '<span class="text-secondary"><i class="far fa-circle me-1"></i>รอตรวจ</span>'}
                    </span>
                    <button class="btn btn-primary btn-sm px-3 fw-bold" onclick="IQS.saveMachineRecord(${m.machine_id})" 
                            id="btnSave_${m.machine_id}" style="border-radius: 8px;">
                        <i class="fas fa-save me-1"></i>บันทึก
                    </button>
                </div>
            </div>`;
            container.innerHTML += html;
        });

        // Update Counter Pills
        document.getElementById('cntAll').textContent = cntAll;
        document.getElementById('cntPending').textContent = cntPending;
        document.getElementById('cntOk').textContent = cntOk;
        document.getElementById('cntNg').textContent = cntNg;
        document.getElementById('cntSkip').textContent = cntSkip;
    },

    hasAttachment(rec, type) {
        if (!rec?.attachments) return false;
        return rec.attachments.some(a => a.attach_type === type);
    },

    renderAttachmentThumb(rec, type) {
        if (!rec?.attachments) return '';
        const att = rec.attachments.find(a => a.attach_type === type);
        if (!att) return '';
        return `<img src="../../${att.file_path}" class="photo-preview-img mt-1" alt="Proof">`;
    },

    selectResult(machineId, choice) {
        const btnOk = document.getElementById(`btnOk_${machineId}`);
        const btnNg = document.getElementById(`btnNg_${machineId}`);
        const card = document.getElementById(`machineCard_${machineId}`);
        const ngBox = document.getElementById(`ngBox_${machineId}`);

        if (choice === 'OK') {
            btnOk.classList.add('active');
            btnNg.classList.remove('active');
            card.classList.remove('state-ng');
            card.classList.add('state-ok');
            if (ngBox) ngBox.style.display = 'none';
        } else {
            btnNg.classList.add('active');
            btnOk.classList.remove('active');
            card.classList.remove('state-ok');
            card.classList.add('state-ng');
            if (ngBox) ngBox.style.display = 'block';
        }
    },

    toggleSkipMachine(machineId) {
        const sw = document.getElementById(`skipSwitch_${machineId}`);
        const skipBox = document.getElementById(`skipBox_${machineId}`);
        const testBox = document.getElementById(`testBox_${machineId}`);
        const card = document.getElementById(`machineCard_${machineId}`);

        if (sw.checked) {
            skipBox.style.display = 'block';
            testBox.style.display = 'none';
            card.className = 'machine-card state-skip';
        } else {
            skipBox.style.display = 'none';
            testBox.style.display = 'block';
            card.className = 'machine-card';
        }
    },

    previewPhoto(input, previewContainerId) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const container = document.getElementById(previewContainerId);
        const reader = new FileReader();
        reader.onload = (e) => {
            container.innerHTML = `<img src="${e.target.result}" class="photo-preview-img mt-1">`;
            input.parentElement.classList.add('has-file');
        };
        reader.readAsDataURL(file);
    },

    async saveMachineRecord(machineId) {
        if (!this.isOnline) {
            Swal.fire('ออฟไลน์', 'ไม่สามารถบันทึกข้อมูลได้เนื่องจากไม่มีการเชื่อมต่อเครือข่าย', 'warning');
            return;
        }

        const sw = document.getElementById(`skipSwitch_${machineId}`);
        const isSkipped = sw.checked;
        const btnOk = document.getElementById(`btnOk_${machineId}`);
        const btnNg = document.getElementById(`btnNg_${machineId}`);
        let pullResult = '';

        if (!isSkipped) {
            if (btnOk.classList.contains('active')) pullResult = 'OK';
            else if (btnNg.classList.contains('active')) pullResult = 'NG';

            if (!pullResult) {
                Swal.fire('ระบุผลทดสอบ', 'กรุณากดเลือกผลการทดสอบแรงดึง (OK หรือ NG)', 'info');
                return;
            }
        }

        const formData = new FormData();
        formData.append('action', 'save_record');
        formData.append('csrf_token', this.csrfToken);
        formData.append('round_id', this.activeRound.round_id);
        formData.append('machine_id', machineId);
        formData.append('is_skipped', isSkipped ? '1' : '0');
        formData.append('skip_reason', document.getElementById(`skipReason_${machineId}`)?.value || '');

        if (!isSkipped) {
            formData.append('pull_result', pullResult);
            formData.append('sku', document.getElementById(`sku_${machineId}`)?.value || '');
            formData.append('po_no', document.getElementById(`po_${machineId}`)?.value || '');
            formData.append('thickness', document.getElementById(`thickness_${machineId}`)?.value || '');
            formData.append('knock_check_val', document.getElementById(`knock_${machineId}`)?.value || '');
            formData.append('distance_check_val', document.getElementById(`distance_${machineId}`)?.value || '');
            formData.append('ng_remark', document.getElementById(`ngRemark_${machineId}`)?.value || '');

            const filePull = document.getElementById(`filePull_${machineId}`)?.files[0];
            const filePanel = document.getElementById(`filePanel_${machineId}`)?.files[0];

            if (filePull) formData.append('photo_pull', filePull);
            if (filePanel) formData.append('photo_panel', filePanel);
        }

        const btnSave = document.getElementById(`btnSave_${machineId}`);
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึก...';

        try {
            const res = await fetch('api/iqs_api.php', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': this.csrfToken },
                body: formData
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
            document.getElementById(`recordTimestamp_${machineId}`).innerHTML = `<i class="fas fa-check-circle text-success me-1"></i>${now.substring(11, 16)} น.`;

            // Update activeRecordsMap
            this.activeRecordsMap[machineId] = {
                pull_result: pullResult,
                is_skipped: isSkipped,
                recorded_at: now
            };

            const card = document.getElementById(`machineCard_${machineId}`);
            if (card) {
                const newStatus = isSkipped ? 'skip' : (pullChoice === 'OK' ? 'ok' : 'ng');
                card.setAttribute('data-status', newStatus);
            }

            this.updateProgress();

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: json.message,
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save me-1"></i>บันทึก';
        }
    },

    updateProgress() {
        if (!this.initialData?.machines) return;
        const total = this.initialData.machines.length;
        const recorded = Object.keys(this.activeRecordsMap).length;
        const pct = total > 0 ? Math.round((recorded / total) * 100) : 0;

        const fill = document.getElementById('progressFill');
        const countTxt = document.getElementById('progressCount');
        const dockTxt = document.getElementById('dockProgressText');

        if (fill) fill.style.width = pct + '%';
        if (countTxt) countTxt.textContent = `${recorded} / ${total} (${pct}%)`;
        if (dockTxt) dockTxt.textContent = `ตรวจแล้ว ${recorded}/${total} เครื่อง (${pct}%)`;
    },

    bindUIEvents() {
        // Template Selection Change
        const templateSel = document.getElementById('newRoundTemplate');
        if (templateSel) {
            templateSel.addEventListener('change', (e) => {
                const opt = e.target.selectedOptions[0];
                if (opt && opt.value) {
                    document.getElementById('newRoundName').value = opt.getAttribute('data-name');
                    document.getElementById('newRoundShift').value = opt.getAttribute('data-shift') || 'Day';
                }
            });
        }

        // Create Round Form
        const formRound = document.getElementById('formCreateRound');
        if (formRound) {
            formRound.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createRound();
            });
        }

        // Close Round Button
        const btnSubmitRound = document.getElementById('btnSubmitRound');
        if (btnSubmitRound) {
            btnSubmitRound.addEventListener('click', async () => {
                await this.submitRound();
            });
        }

        // History Filter Form
        const formHistory = document.getElementById('formHistoryFilter');
        if (formHistory) {
            formHistory.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.loadHistory();
            });
        }
    },

    async createRound() {
        if (!this.isOnline) {
            Swal.fire('ออฟไลน์', 'ไม่สามารถเปิดรอบใหม่ได้ขณะออฟไลน์', 'warning');
            return;
        }

        const templateId = document.getElementById('newRoundTemplate').value;
        const roundName = document.getElementById('newRoundName').value.trim();
        const shift = document.getElementById('newRoundShift').value;
        const coTester1 = document.getElementById('coTester1').value;
        const coTester2 = document.getElementById('coTester2').value;
        const notes = document.getElementById('newRoundNotes').value.trim();

        if (!roundName) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อรอบการทดสอบ', 'info');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'create_round');
        formData.append('csrf_token', this.csrfToken);
        formData.append('template_id', templateId);
        formData.append('round_name', roundName);
        formData.append('shift', shift);
        formData.append('co_tester_id_1', coTester1);
        formData.append('co_tester_id_2', coTester2);
        formData.append('notes', notes);

        try {
            this.showLoading(true);
            const res = await fetch('api/iqs_api.php', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': this.csrfToken },
                body: formData
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalStartRound'));
            if (modal) modal.hide();

            Swal.fire('สำเร็จ', json.message, 'success');
            await this.loadActiveRound();
        } catch (err) {
            Swal.fire('ไม่สามารถเปิดรอบได้', err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    async submitRound() {
        if (!this.activeRound) return;

        const total = this.initialData?.machines?.length || 0;
        const recorded = Object.keys(this.activeRecordsMap).length;

        let warningExtra = '';
        if (recorded < total) {
            warningExtra = `<br><span class="text-warning">คำเตือน: ยังมีเครื่องที่ยังไม่ได้บันทึกผลอีก ${total - recorded} เครื่อง</span>`;
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันปิดรอบการทดสอบ?',
            html: `คุณกำลังจะปิดรอบ <strong>${this.activeRound.round_number}</strong><br>เมื่อปิดแล้วจะไม่สามารถแก้ไขผลทดสอบย้อนหลังได้${warningExtra}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ยืนยันปิดรอบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        const formData = new FormData();
        formData.append('action', 'submit_round');
        formData.append('csrf_token', this.csrfToken);
        formData.append('round_id', this.activeRound.round_id);

        try {
            this.showLoading(true);
            const res = await fetch('api/iqs_api.php', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': this.csrfToken },
                body: formData
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            await Swal.fire('สำเร็จ', json.message, 'success');
            // Redirect to printable report
            window.location.href = `print_iqs.php?round_id=${this.activeRound.round_id}`;
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    async loadHistory() {
        const start = document.getElementById('histStartDate').value;
        const end = document.getElementById('histEndDate').value;
        const status = document.getElementById('histStatus').value;

        try {
            this.showLoading(true);
            const url = `api/iqs_api.php?action=get_history&start_date=${start}&end_date=${end}&status=${status}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const tbody = document.getElementById('historyTableBody');
            const feedMobile = document.getElementById('historyFeedMobile');
            const rounds = json.data.rounds || [];

            if (tbody) tbody.innerHTML = '';
            if (feedMobile) feedMobile.innerHTML = '';

            if (rounds.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">ไม่พบข้อมูลประวัติในช่วงเวลาที่เลือก</td></tr>';
                if (feedMobile) feedMobile.innerHTML = '<div class="text-center text-muted py-4">ไม่พบข้อมูลประวัติในช่วงเวลาที่เลือก</div>';
                return;
            }

            rounds.forEach(r => {
                let badgeClass = 'bg-secondary';
                if (r.status === 'SUBMITTED') badgeClass = 'bg-success';
                else if (r.status === 'COMPLETED_WITH_NG') badgeClass = 'bg-danger';
                else if (r.status === 'OPEN') badgeClass = 'bg-warning text-dark';

                // Desktop Table Row
                if (tbody) {
                    tbody.innerHTML += `
                    <tr>
                        <td><strong>${r.round_number}</strong></td>
                        <td>${r.plan_date}</td>
                        <td>${r.round_name}</td>
                        <td>${r.shift}</td>
                        <td>${r.primary_tester_name || '-'}</td>
                        <td>
                            <span class="badge bg-success me-1">OK: ${r.ok_count}</span>
                            ${r.ng_count > 0 ? `<span class="badge bg-danger me-1">NG: ${r.ng_count}</span>` : ''}
                            ${r.skip_count > 0 ? `<span class="badge bg-secondary">ข้าม: ${r.skip_count}</span>` : ''}
                        </td>
                        <td><span class="badge ${badgeClass}">${r.status}</span></td>
                        <td class="text-center">
                            <a href="print_iqs.php?round_id=${r.round_id}" target="_blank" class="btn btn-outline-primary btn-sm py-1 px-3 fw-bold" style="border-radius: 8px;">
                                <i class="fas fa-print me-1"></i>พิมพ์
                            </a>
                        </td>
                    </tr>`;
                }

                // Mobile Card Feed
                if (feedMobile) {
                    feedMobile.innerHTML += `
                    <div class="history-card-mobile">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="hist-title">${r.round_number}</span>
                            <span class="badge ${badgeClass}">${r.status}</span>
                        </div>
                        <div class="small text-muted mb-2">
                            <div><i class="fas fa-calendar-alt me-1"></i><strong>${r.plan_date}</strong> (${r.round_name}) · กะ ${r.shift}</div>
                            <div><i class="fas fa-user me-1"></i>ผู้ทดสอบ: ${r.primary_tester_name || '-'}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                            <div class="d-flex gap-1">
                                <span class="badge bg-success">OK: ${r.ok_count}</span>
                                ${r.ng_count > 0 ? `<span class="badge bg-danger">NG: ${r.ng_count}</span>` : ''}
                                ${r.skip_count > 0 ? `<span class="badge bg-secondary">ข้าม: ${r.skip_count}</span>` : ''}
                            </div>
                            <a href="print_iqs.php?round_id=${r.round_id}" target="_blank" class="btn btn-outline-primary btn-sm px-3 fw-bold" style="border-radius: 8px;">
                                <i class="fas fa-print me-1"></i>พิมพ์เอกสาร
                            </a>
                        </div>
                    </div>`;
                }
            });
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    showLoading(show) {
        const spinner = document.getElementById('iqsLoadingSpinner');
        if (spinner) spinner.style.display = show ? 'flex' : 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    IQS.init();
});
