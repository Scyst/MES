/**
 * iqs.js — In-process Quality System (IQS) Frontend Logic
 * Machine-First Direct Inspection Cockpit with Line-Adaptive Criteria (SPOT, BEND, PRESS),
 * Automatic Background Round Binding, and Non-backdatable Audit Compliance.
 */

const IQS = {
    csrfToken: '',
    initialData: null,
    todayRecordsMap: {},
    slotStatuses: [],
    slotSummary: null,
    isOnline: navigator.onLine,
    currentLine: 'SPOT',
    currentFilter: 'all',
    searchKeyword: '',
    activeInspectMachine: null,
    currentInspectResult: 'OK',

    init() {
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        this.bindNetworkEvents();
        this.loadInitialData();
        this.bindUIEvents();
    },

    switchTab(tabKey) {
        const activeBtn = document.getElementById('tab-active-btn');
        const historyBtn = document.getElementById('tab-history-btn');
        const activePane = document.getElementById('tab-active');
        const historyPane = document.getElementById('tab-history');

        if (tabKey === 'active') {
            if (activeBtn) activeBtn.classList.add('active');
            if (historyBtn) historyBtn.classList.remove('active');
            if (activePane) activePane.classList.add('show', 'active');
            if (historyPane) historyPane.classList.remove('show', 'active');
        } else if (tabKey === 'history') {
            if (historyBtn) historyBtn.classList.add('active');
            if (activeBtn) activeBtn.classList.remove('active');
            if (historyPane) historyPane.classList.add('show', 'active');
            if (activePane) activePane.classList.remove('show', 'active');
            this.loadHistory();
        }
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
            this.slotStatuses = data.data.slot_statuses || [];
            this.slotSummary = data.data.slot_summary || null;
            this.todayRecordsMap = data.data.today_records || {};

            // Calculate Machine Line counts
            this.updateLineCounters();

            // Render all UI components
            this.renderDailyTimeline();
            this.renderAuditMissedAlert();
            this.renderCockpitStatus();
            this.renderInteractiveGrid();
            this.renderTemplateOptions();
            this.renderCoTesterOptions();
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลเริ่มต้นได้: ' + err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    updateLineCounters() {
        if (!this.initialData?.machines) return;
        const machines = this.initialData.machines;
        const countSpot = machines.filter(m => m.line_group === 'SPOT').length;
        const countBend = machines.filter(m => m.line_group === 'BEND').length;
        const countPress = machines.filter(m => m.line_group === 'PRESS').length;

        const badgeSpot = document.getElementById('countBadgeSpot');
        const badgeBend = document.getElementById('countBadgeBend');
        const badgePress = document.getElementById('countBadgePress');

        if (badgeSpot) badgeSpot.textContent = countSpot;
        if (badgeBend) badgeBend.textContent = countBend;
        if (badgePress) badgePress.textContent = countPress;
    },

    renderCockpitStatus() {
        // Find current due slot or upcoming slot
        let currentSlotName = 'รอบมาตรฐานประจำวัน';
        if (this.slotStatuses && this.slotStatuses.length > 0) {
            const dueSlot = this.slotStatuses.find(s => s.status === 'DUE_NOW');
            const inProgSlot = this.slotStatuses.find(s => s.status === 'IN_PROGRESS');
            const activeSlot = dueSlot || inProgSlot || this.slotStatuses[0];
            if (activeSlot) {
                currentSlotName = `${activeSlot.template_name} (${activeSlot.std_time}) - กะ ${activeSlot.shift}`;
            }
        }

        const pillText = document.getElementById('cockpitSlotText');
        if (pillText) {
            pillText.textContent = `รอบปัจจุบัน: ${currentSlotName}`;
        }

        // Calculate progress for currently selected line
        if (this.initialData?.machines) {
            const lineMachines = this.initialData.machines.filter(m => m.line_group === this.currentLine);
            const total = lineMachines.length;
            const recorded = lineMachines.filter(m => !!this.todayRecordsMap[m.machine_id]).length;
            const pct = total > 0 ? Math.round((recorded / total) * 100) : 0;

            const progressTxt = document.getElementById('cockpitProgressText');
            if (progressTxt) {
                progressTxt.textContent = `${recorded} / ${total} เครื่อง (${pct}%)`;
            }
        }
    },

    renderDailyTimeline() {
        const container = document.getElementById('scheduleTimelineContainer') || document.getElementById('scheduleTimelineGrid');
        if (!container || !this.slotStatuses || this.slotStatuses.length === 0) return;

        const serverTime = this.slotSummary?.cur_server_time || '--:--';
        const serverDate = this.slotSummary?.cur_server_date || '';

        // Calculate KPI status counts
        const completedCount = this.slotStatuses.filter(s => s.status === 'COMPLETED').length;
        const dueCount = this.slotStatuses.filter(s => s.status === 'DUE_NOW').length;
        const missedCount = this.slotStatuses.filter(s => s.status === 'MISSED').length;
        const inProgCount = this.slotStatuses.filter(s => s.status === 'IN_PROGRESS').length;
        const upcomingCount = this.slotStatuses.filter(s => s.status === 'UPCOMING').length;

        // Separate slots into Day Shift vs. OT & Night Shift
        const daySlots = this.slotStatuses.filter(s => s.shift === 'Day');
        const otNightSlots = this.slotStatuses.filter(s => s.shift !== 'Day');

        // Helper to generate a single card HTML
        const renderCardHtml = (slot) => {
            const cleanName = (slot.template_name || '').replace(/\s*\(\d{2}:\d{2}\)/, '').trim() || slot.template_name;

            let cardClass = 'slot-card-upcoming';
            let pillClass = 'pill-upcoming';
            let statusIcon = '<i class="far fa-clock me-1"></i>';
            let subInfoHtml = '<span class="text-muted"><i class="far fa-hourglass me-1"></i>ยังไม่ถึงรอบ</span>';

            if (slot.status === 'COMPLETED') {
                cardClass = 'slot-card-completed';
                pillClass = 'pill-completed';
                statusIcon = '<i class="fas fa-check-circle me-1"></i>';
                subInfoHtml = '<span class="text-success"><i class="fas fa-check me-1"></i>บันทึกเรียบร้อย</span>';
            } else if (slot.status === 'IN_PROGRESS') {
                cardClass = 'slot-card-in-progress';
                pillClass = 'pill-in-progress';
                statusIcon = '<i class="fas fa-spinner fa-spin me-1"></i>';
                subInfoHtml = '<span class="text-primary"><i class="fas fa-play me-1"></i>กำลังดำเนินการ</span>';
            } else if (slot.status === 'DUE_NOW') {
                cardClass = 'slot-card-due';
                pillClass = 'pill-due iqs-pulse-badge';
                statusIcon = '<i class="fas fa-exclamation-circle me-1"></i>';
                subInfoHtml = '<span class="text-warning-emphasis fw-bold"><i class="fas fa-stopwatch me-1"></i>เปิดรับตรวจ</span>';
            } else if (slot.status === 'MISSED') {
                cardClass = 'slot-card-missed';
                pillClass = 'pill-missed';
                statusIcon = '<i class="fas fa-times-circle me-1"></i>';
                subInfoHtml = '<span class="text-danger"><i class="fas fa-lock me-1"></i>ปิดรับผล (เลยเวลา)</span>';
            }

            // Shift badge
            let shiftBadgeClass = 'slot-shift-day';
            let shiftIcon = '<i class="fas fa-sun text-warning me-1"></i>';
            if (slot.shift === 'OT') {
                shiftBadgeClass = 'slot-shift-ot';
                shiftIcon = '<i class="fas fa-bolt text-purple me-1"></i>';
            } else if (slot.shift === 'Night') {
                shiftBadgeClass = 'slot-shift-night';
                shiftIcon = '<i class="fas fa-moon text-primary me-1"></i>';
            }

            return `
            <div class="col">
                <div class="schedule-slot-card ${cardClass}">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="slot-shift-badge ${shiftBadgeClass}">
                                ${shiftIcon}กะ ${slot.shift}
                            </span>
                            <span class="badge bg-light text-secondary border-0 small" style="font-size: 0.65rem;">
                                ${slot.template_code || ''}
                            </span>
                        </div>
                        <div class="slot-card-time">${slot.std_time}<span class="slot-card-unit">น.</span></div>
                        <div class="slot-card-name" title="${slot.template_name}">${cleanName}</div>
                    </div>
                    <div class="mt-3 pt-2 border-top border-light-subtle">
                        <div class="slot-status-pill-modern ${pillClass}">
                            ${statusIcon}<span>${slot.status_label}</span>
                        </div>
                        <div class="slot-card-subinfo">
                            ${subInfoHtml}
                        </div>
                    </div>
                </div>
            </div>`;
        };

        let html = `
        <!-- KPI Server Time & Summary Bar -->
        <div class="timeline-kpi-bar">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div class="d-flex align-items-center gap-2">
                    <span class="kpi-live-dot" title="Server Live Synced"></span>
                    <div>
                        <div class="small text-muted" style="font-size: 0.72rem; line-height: 1.1;">เวลาเซิร์ฟเวอร์ปัจจุบัน (Live Server Time)</div>
                        <div class="d-flex align-items-baseline gap-2">
                            <span class="kpi-server-time">${serverTime} น.</span>
                            <span class="badge bg-secondary-subtle text-secondary small fw-normal">${serverDate}</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-1 gap-md-2">
                    <span class="kpi-badge kpi-badge-completed"><i class="fas fa-check-circle me-1"></i>ผ่าน ${completedCount}</span>
                    ${inProgCount > 0 ? `<span class="kpi-badge kpi-badge-in-prog"><i class="fas fa-spinner fa-spin me-1"></i>กำลังตรวจ ${inProgCount}</span>` : ''}
                    <span class="kpi-badge kpi-badge-due"><i class="fas fa-exclamation-circle me-1"></i>ถึงเวลา ${dueCount}</span>
                    <span class="kpi-badge kpi-badge-missed"><i class="fas fa-times-circle me-1"></i>ขาดตรวจ ${missedCount}</span>
                    <span class="kpi-badge kpi-badge-upcoming"><i class="far fa-clock me-1"></i>รอตรวจ ${upcomingCount}</span>
                </div>
            </div>
        </div>

        <!-- Group 1: กะกลางวัน (Day Shift - 4 Slots) -->
        <div class="timeline-shift-group">
            <div class="timeline-shift-header">
                <div class="d-flex align-items-center gap-2">
                    <span class="shift-header-badge shift-header-day">
                        <i class="fas fa-sun text-warning me-1"></i>กะกลางวัน (Day Shift)
                    </span>
                    <span class="text-muted small d-none d-sm-inline">ช่วงเวลาทำงาน 08:00 - 17:00 น.</span>
                </div>
                <span class="badge bg-light text-secondary border small">${daySlots.length} รอบมาตรฐาน</span>
            </div>
            <div class="row g-2 g-md-3 row-cols-2 row-cols-md-4">
                ${daySlots.map(renderCardHtml).join('')}
            </div>
        </div>

        <!-- Group 2: กะโอที & กะกลางคืน (OT & Night Shift - 3 Slots) -->
        <div class="timeline-shift-group mt-4">
            <div class="timeline-shift-header">
                <div class="d-flex align-items-center gap-2">
                    <span class="shift-header-badge shift-header-ot-night">
                        <i class="fas fa-moon text-primary me-1"></i>กะโอที & กะกลางคืน (OT & Night Shift)
                    </span>
                    <span class="text-muted small d-none d-sm-inline">ช่วงเวลาทำงานล่วงเวลาและกะดึก</span>
                </div>
                <span class="badge bg-light text-secondary border small">${otNightSlots.length} รอบมาตรฐาน</span>
            </div>
            <div class="row g-2 g-md-3 row-cols-1 row-cols-sm-3">
                ${otNightSlots.map(renderCardHtml).join('')}
            </div>
        </div>`;

        container.innerHTML = html;
    },

    renderAuditMissedAlert() {
        const banner = document.getElementById('auditMissedAlertBanner');
        if (!banner) return;

        if (this.slotSummary?.has_missed && this.slotSummary.missed_count > 0) {
            const missedNames = (this.slotSummary.missed_list || []).join(', ');
            banner.innerHTML = `
            <div class="alert alert-danger border-danger-subtle d-flex align-items-start gap-3 p-3 shadow-sm mb-0" style="border-radius: 14px;">
                <div class="bg-danger text-white p-2 rounded-circle d-flex align-items-center justify-content-center" style="width: 38px; height: 38px; min-width: 38px;">
                    <i class="fas fa-exclamation-triangle fa-lg"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-1">
                        <strong class="text-danger" style="font-size: 0.95rem;">
                            <i class="fas fa-bell me-1"></i>แจ้งเตือนรอบที่ขาดการทดสอบ (${this.slotSummary.missed_count} รอบ)
                        </strong>
                        <span class="badge bg-danger text-white" style="font-size: 0.72rem;">ห้ามบันทึกย้อนหลัง (Non-backdatable)</span>
                    </div>
                    <div class="small text-muted mt-1" style="font-size: 0.82rem;">
                        รอบที่ไม่มีการบันทึกตามกำหนด: <strong class="text-danger">${missedNames}</strong><br>
                        * ตามข้อตกลงผู้บริหาร ระบบบันทึกแบบ Real-time ณ ขณะทำการตรวจเท่านั้น จะไม่มีการเปิดให้บันทึกย้อนหลัง และถูกระบุใน Audit Trail
                    </div>
                </div>
            </div>`;
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }
    },

    switchLine(lineKey, btnElem) {
        this.currentLine = lineKey;
        document.querySelectorAll('.line-tab-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElem) btnElem.classList.add('active');

        this.renderCockpitStatus();
        this.renderInteractiveGrid();
    },

    filterByStatus(statusKey, btnElem) {
        this.currentFilter = statusKey;
        document.querySelectorAll('.iqs-filter-chip').forEach(el => el.classList.remove('active'));
        if (btnElem) btnElem.classList.add('active');

        this.applyGridFiltering();
    },

    filterMachinesBySearch(keyword) {
        this.searchKeyword = (keyword || '').toLowerCase().trim();
        this.applyGridFiltering();
    },

    getMachineZoneKey(machine) {
        const code = String(machine.machine_code || '');
        const parts = code.split('-');
        return parts.length > 1 ? parts.slice(0, -1).join('-') : (code || 'OTHER');
    },

    groupMachinesByZone(machines) {
        const zones = new Map();
        machines.forEach(machine => {
            const zoneKey = this.getMachineZoneKey(machine);
            if (!zones.has(zoneKey)) zones.set(zoneKey, []);
            zones.get(zoneKey).push(machine);
        });
        return zones;
    },

    buildZoneHeaderHtml(zoneKey, zoneMachines) {
        const inspectedCount = zoneMachines.filter(zm => this.todayRecordsMap[zm.machine_id]).length;
        return `
        <div class="machine-zone-header" data-zone="${zoneKey}">
            <span class="machine-zone-title"><i class="fas fa-layer-group"></i>${zoneKey}</span>
            <span class="machine-zone-line"></span>
            <span class="machine-zone-meta">ตรวจแล้ว ${inspectedCount} / ${zoneMachines.length}</span>
        </div>`;
    },

    syncZoneHeaderVisibility() {
        const cards = Array.from(document.querySelectorAll('.interactive-machine-card'));
        document.querySelectorAll('.machine-zone-header').forEach(header => {
            const zoneKey = header.getAttribute('data-zone');
            const hasVisibleCard = cards.some(card => card.getAttribute('data-zone') === zoneKey && card.style.display !== 'none');
            header.style.display = hasVisibleCard ? 'flex' : 'none';
        });
    },

    renderInteractiveGrid() {
        const container = document.getElementById('interactiveMachineGrid');
        if (!container || !this.initialData?.machines) return;

        const zoneGroups = this.groupMachinesByZone(this.initialData.machines.filter(m => m.line_group === this.currentLine));
        const lineMachines = Array.from(zoneGroups.values()).flat();
        let activeZoneKey = null;

        let cntAll = 0, cntPending = 0, cntOk = 0, cntNg = 0, cntSkip = 0;
        let html = '';

        lineMachines.forEach(m => {
            cntAll++;
            const zoneKey = this.getMachineZoneKey(m);
            if (zoneKey !== activeZoneKey) {
                activeZoneKey = zoneKey;
                html += this.buildZoneHeaderHtml(zoneKey, zoneGroups.get(zoneKey));
            }
            const rec = this.todayRecordsMap[m.machine_id] || null;
            let statusKey = 'pending';
            let cardStateClass = '';
            let statusHtml = '';

            // Machine Type Icon
            let iconClass = 'fa-bolt text-warning';
            if (this.currentLine === 'SPOT') {
                const isRobot = m.machine_type === 'Robot' || (m.machine_name && m.machine_name.includes('Robot'));
                iconClass = isRobot ? 'fa-robot text-primary' : 'fa-bolt text-warning';
            } else if (this.currentLine === 'BEND') {
                iconClass = 'fa-ruler-combined text-info';
            } else if (this.currentLine === 'PRESS') {
                iconClass = 'fa-industry text-primary';
            }

            if (rec) {
                if (rec.is_skipped) {
                    statusKey = 'skip';
                    cardStateClass = 'state-skip';
                    cntSkip++;
                    statusHtml = `
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge bg-secondary-subtle text-secondary px-2 py-1" style="font-size: 0.72rem;">
                            <i class="fas fa-forward me-1"></i>ข้ามเครื่องนี้
                        </span>
                        <span class="text-muted small text-truncate ms-2" style="font-size: 0.72rem; max-width: 140px;">
                            ${rec.skip_reason || 'ไม่มีคำสั่งผลิต'}
                        </span>
                    </div>`;
                } else if (rec.pull_result === 'OK') {
                    statusKey = 'ok';
                    cardStateClass = 'state-ok';
                    cntOk++;
                    let measureText = '';
                    if (this.currentLine === 'SPOT') {
                        measureText = rec.knock_check_val ? `เคาะ: ${rec.knock_check_val} mm` : 'ดึง OK';
                    } else if (this.currentLine === 'BEND') {
                        measureText = rec.custom_check_val_1 ? `มุม: ${rec.custom_check_val_1}°` : 'พับ OK';
                    } else if (this.currentLine === 'PRESS') {
                        measureText = rec.custom_check_val_1 ? `ครีบ: ${rec.custom_check_val_1} mm` : 'ชิ้นแรก OK';
                    }

                    statusHtml = `
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge bg-success-subtle text-success px-2 py-1" style="font-size: 0.72rem;">
                            <i class="fas fa-check-circle me-1"></i>ผ่าน OK
                        </span>
                        <span class="text-success small fw-bold" style="font-size: 0.75rem;">
                            ${measureText} (${rec.recorded_at ? rec.recorded_at.substring(11, 16) : ''} น.)
                        </span>
                    </div>`;
                } else if (rec.pull_result === 'NG') {
                    statusKey = 'ng';
                    cardStateClass = 'state-ng';
                    cntNg++;
                    statusHtml = `
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge bg-danger-subtle text-danger px-2 py-1" style="font-size: 0.72rem;">
                            <i class="fas fa-times-circle me-1"></i>ไม่ผ่าน NG
                        </span>
                        <span class="text-danger small text-truncate ms-2" style="font-size: 0.72rem; max-width: 140px;">
                            ${rec.ng_remark || 'พบปัญหา'}
                        </span>
                    </div>`;
                }
            } else {
                cntPending++;
                statusHtml = `
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <span class="badge bg-warning-subtle text-warning-emphasis px-2 py-1" style="font-size: 0.72rem;">
                        <i class="fas fa-hourglass-half me-1"></i>รอตรวจ
                    </span>
                    <span class="mach-action-cue">
                        ตรวจทันที <i class="fas fa-arrow-right"></i>
                    </span>
                </div>`;
            }

            html += `
            <div class="interactive-machine-card ${cardStateClass}" id="mCard_${m.machine_id}" data-zone="${zoneKey}"
                 data-status="${statusKey}" 
                 data-code="${(m.machine_code || '').toLowerCase()}" 
                 data-name="${(m.machine_name || '').toLowerCase()}"
                 onclick="IQS.openInspectModal(${m.machine_id})">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="d-flex align-items-center gap-2">
                            <i class="fas ${iconClass}"></i>
                            <span class="mach-card-code">${m.machine_code}</span>
                        </div>
                        <span class="badge bg-light text-secondary border" style="font-size: 0.68rem;">${m.area || 'B9'}</span>
                    </div>
                    <div class="mach-card-sub text-truncate">${m.machine_name || m.machine_type || '-'}</div>
                </div>
                ${statusHtml}
            </div>`;
        });

        container.innerHTML = html;

        // Update Counter Pills
        const elAll = document.getElementById('cntAll');
        const elPending = document.getElementById('cntPending');
        const elOk = document.getElementById('cntOk');
        const elNg = document.getElementById('cntNg');
        const elSkip = document.getElementById('cntSkip');

        if (elAll) elAll.textContent = cntAll;
        if (elPending) elPending.textContent = cntPending;
        if (elOk) elOk.textContent = cntOk;
        if (elNg) elNg.textContent = cntNg;
        if (elSkip) elSkip.textContent = cntSkip;

        this.applyGridFiltering();
        this.renderCockpitStatus();
    },

    applyGridFiltering() {
        this.filterMachineCards();
        this.syncZoneHeaderVisibility();
    },

    filterMachineCards() {
        const cards = document.querySelectorAll('.interactive-machine-card');
        cards.forEach(card => {
            const status = card.getAttribute('data-status');
            const code = card.getAttribute('data-code') || '';
            const name = card.getAttribute('data-name') || '';

            const statusMatch = (this.currentFilter === 'all' || status === this.currentFilter);
            const searchMatch = !this.searchKeyword || code.includes(this.searchKeyword) || name.includes(this.searchKeyword);

            if (statusMatch && searchMatch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    },

    openInspectModal(machineId) {
        const m = this.initialData?.machines?.find(x => x.machine_id == machineId);
        if (!m) return;

        this.activeInspectMachine = m;
        const rec = this.todayRecordsMap[machineId] || null;
        this.currentInspectResult = rec?.pull_result === 'NG' ? 'NG' : 'OK';

        // Setup Modal Header
        document.getElementById('inspectMachineId').value = m.machine_id;
        document.getElementById('inspectRoundId').value = rec?.round_id || '';
        document.getElementById('inspectLine').value = m.line_group;

        document.getElementById('modalInspectMachineLabel').textContent = m.machine_code;
        document.getElementById('modalLineBadge').textContent = m.line_group;
        document.getElementById('modalAreaBadge').textContent = m.area || 'Zone B9';
        document.getElementById('modalMachineSubtext').textContent = m.machine_name || m.machine_type || '-';

        // Modal Icon
        const iconElem = document.getElementById('modalLineIcon');
        if (iconElem) {
            if (m.line_group === 'SPOT') {
                const isRobot = m.machine_type === 'Robot' || (m.machine_name && m.machine_name.includes('Robot'));
                iconElem.className = `fas ${isRobot ? 'fa-robot' : 'fa-bolt'} fa-lg`;
            } else if (m.line_group === 'BEND') {
                iconElem.className = 'fas fa-ruler-combined fa-lg';
            } else if (m.line_group === 'PRESS') {
                iconElem.className = 'fas fa-industry fa-lg';
            }
        }

        // Current Slot Info
        let currentSlot = 'รอบมาตรฐาน';
        if (this.slotStatuses && this.slotStatuses.length > 0) {
            const activeSlot = this.slotStatuses.find(s => s.status === 'DUE_NOW') || 
                               this.slotStatuses.find(s => s.status === 'IN_PROGRESS') || 
                               this.slotStatuses[0];
            if (activeSlot) {
                currentSlot = `${activeSlot.template_name} (${activeSlot.std_time}) - กะ ${activeSlot.shift}`;
            }
        }
        document.getElementById('modalSlotTitle').textContent = currentSlot;

        // Pre-fill Common Form Inputs
        document.getElementById('inspectSku').value = rec?.sku || '';
        document.getElementById('inspectPoNo').value = rec?.po_no || '';
        document.getElementById('inspectThickness').value = rec?.thickness || '1.20';

        // Pre-fill Skip State
        const isSkipped = rec?.is_skipped ? true : false;
        const skipSwitch = document.getElementById('inspectIsSkipped');
        if (skipSwitch) skipSwitch.checked = isSkipped;
        document.getElementById('inspectSkipReason').value = rec?.skip_reason || '';
        this.toggleInspectSkip(isSkipped);

        // Pre-fill NG Remark
        document.getElementById('inspectNgRemark').value = rec?.ng_remark || '';
        document.getElementById('inspectNgBox').style.display = (this.currentInspectResult === 'NG') ? 'block' : 'none';

        // Render Adaptive Criteria Inputs
        this.renderAdaptiveForm(m.line_group, rec);

        // Render existing attachment previews
        const prev1 = document.getElementById('previewInspectPull');
        const prev2 = document.getElementById('previewInspectPanel');
        const tile1 = document.getElementById('tilePullPhoto');
        const tile2 = document.getElementById('tilePanelPhoto');

        if (prev1) prev1.innerHTML = this.renderAttachmentThumb(rec, 'PULL_TEST');
        if (prev2) prev2.innerHTML = this.renderAttachmentThumb(rec, 'CONTROL_PANEL');
        if (tile1) tile1.className = `photo-upload-tile ${this.hasAttachment(rec, 'PULL_TEST') ? 'has-file' : ''}`;
        if (tile2) tile2.className = `photo-upload-tile ${this.hasAttachment(rec, 'CONTROL_PANEL') ? 'has-file' : ''}`;

        // Clear file input values
        const filePull = document.getElementById('inspectPhotoPull');
        const filePanel = document.getElementById('inspectPhotoPanel');
        if (filePull) filePull.value = '';
        if (filePanel) filePanel.value = '';

        // Show Modal
        const modalEl = document.getElementById('modalInspectMachine');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    },

    renderAdaptiveForm(line, rec) {
        const container = document.getElementById('adaptiveCriteriaContainer');
        const labelPhoto1 = document.getElementById('labelPhoto1');
        const labelPhoto2 = document.getElementById('labelPhoto2');
        if (!container) return;

        const result = this.currentInspectResult;

        if (line === 'SPOT') {
            if (labelPhoto1) labelPhoto1.textContent = 'รูปชิ้นงานเทสดึง';
            if (labelPhoto2) labelPhoto2.textContent = 'รูปหน้าตู้คอนโทรล';

            container.innerHTML = `
            <label class="small text-muted fw-bold mb-1">ผลการทดสอบแรงดึง (Pull Test)</label>
            <div class="result-toggle-group mb-3">
                <button type="button" class="btn-result-choice choice-ok ${result === 'OK' ? 'active' : ''}" 
                        id="modalBtnOk" onclick="IQS.setInspectResult('OK')">
                    <i class="fas fa-check-circle"></i> ผ่าน (OK)
                </button>
                <button type="button" class="btn-result-choice choice-ng ${result === 'NG' ? 'active' : ''}" 
                        id="modalBtnNg" onclick="IQS.setInspectResult('NG')">
                    <i class="fas fa-times-circle"></i> ไม่ผ่าน (NG)
                </button>
            </div>
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-ruler-horizontal me-1 text-primary"></i>เช็คเคาะ (mm)
                    </label>
                    <input type="number" step="0.01" class="form-control" id="inspectKnock" placeholder="0.00" value="${rec?.knock_check_val || ''}">
                </div>
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-ruler-combined me-1 text-info"></i>เช็คระยะ (mm)
                    </label>
                    <input type="number" step="0.01" class="form-control" id="inspectDistance" placeholder="0.00" value="${rec?.distance_check_val || ''}">
                </div>
            </div>`;
        } else if (line === 'BEND') {
            if (labelPhoto1) labelPhoto1.textContent = 'รูปชิ้นงานหลังดัด';
            if (labelPhoto2) labelPhoto2.textContent = 'รูปหน้าตู้ / พารามิเตอร์';

            container.innerHTML = `
            <label class="small text-muted fw-bold mb-1">ผลการตรวจรอยพับและครีบ (Burr / Surface Check)</label>
            <div class="result-toggle-group mb-3">
                <button type="button" class="btn-result-choice choice-ok ${result === 'OK' ? 'active' : ''}" 
                        id="modalBtnOk" onclick="IQS.setInspectResult('OK')">
                    <i class="fas fa-check-circle"></i> ผ่านเกณฑ์ (OK)
                </button>
                <button type="button" class="btn-result-choice choice-ng ${result === 'NG' ? 'active' : ''}" 
                        id="modalBtnNg" onclick="IQS.setInspectResult('NG')">
                    <i class="fas fa-times-circle"></i> พบรอยพับแตก/ครีบคม (NG)
                </button>
            </div>
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-drafting-compass me-1 text-primary"></i>มุมดัดที่วัดได้ Bending Angle (°)
                    </label>
                    <input type="number" step="0.1" class="form-control" id="inspectBendAngle" placeholder="เช่น 90.0" value="${rec?.custom_check_val_1 || ''}">
                </div>
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-ruler me-1 text-info"></i>ความยาวปีก Flange Length (mm)
                    </label>
                    <input type="number" step="0.01" class="form-control" id="inspectFlangeLen" placeholder="เช่น 25.40" value="${rec?.custom_check_val_2 || ''}">
                </div>
            </div>`;
        } else if (line === 'PRESS') {
            if (labelPhoto1) labelPhoto1.textContent = 'รูปชิ้นงานปั๊มขึ้นรูป';
            if (labelPhoto2) labelPhoto2.textContent = 'รูปแม่พิมพ์ / หน้าตู้';

            container.innerHTML = `
            <label class="small text-muted fw-bold mb-1">ผลการตรวจชิ้นงานแรก (First Piece Stamping)</label>
            <div class="result-toggle-group mb-3">
                <button type="button" class="btn-result-choice choice-ok ${result === 'OK' ? 'active' : ''}" 
                        id="modalBtnOk" onclick="IQS.setInspectResult('OK')">
                    <i class="fas fa-check-circle"></i> ผ่านเกณฑ์ (OK)
                </button>
                <button type="button" class="btn-result-choice choice-ng ${result === 'NG' ? 'active' : ''}" 
                        id="modalBtnNg" onclick="IQS.setInspectResult('NG')">
                    <i class="fas fa-times-circle"></i> ชิ้นงานผิดรูป/มีรอยร้าว (NG)
                </button>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-stamp me-1 text-primary"></i>รหัสแม่พิมพ์ (Die No.)
                    </label>
                    <input type="text" class="form-control" id="inspectDieNo" placeholder="เช่น DIE-B9-042" value="${rec?.custom_check_text || ''}">
                </div>
                <div class="col-6">
                    <label class="form-label small fw-bold text-muted mb-1">
                        <i class="fas fa-ruler-vertical me-1 text-info"></i>ความสูงของครีบ Burr Height (mm)
                    </label>
                    <input type="number" step="0.01" class="form-control" id="inspectBurrHeight" placeholder="เช่น 0.05" value="${rec?.custom_check_val_1 || ''}">
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label small fw-bold text-muted mb-1">
                    <i class="fas fa-search me-1 text-warning"></i>การแตกลายงา/รอยร้าว (Crack Check)
                </label>
                <select class="form-select" id="inspectCrackCheck">
                    <option value="OK">ปกติ — ไม่พบรอยร้าว/แตกลายงา</option>
                    <option value="NG" ${rec?.pull_result === 'NG' ? 'selected' : ''}>พบรอยร้าว / แตกบริเวณขอบดัด</option>
                </select>
            </div>`;
        }
    },

    setInspectResult(choice) {
        this.currentInspectResult = choice;
        const btnOk = document.getElementById('modalBtnOk');
        const btnNg = document.getElementById('modalBtnNg');
        const ngBox = document.getElementById('inspectNgBox');

        if (choice === 'OK') {
            if (btnOk) btnOk.classList.add('active');
            if (btnNg) btnNg.classList.remove('active');
            if (ngBox) ngBox.style.display = 'none';
        } else {
            if (btnNg) btnNg.classList.add('active');
            if (btnOk) btnOk.classList.remove('active');
            if (ngBox) ngBox.style.display = 'block';
        }
    },

    toggleInspectSkip(isSkipped) {
        const skipBox = document.getElementById('inspectSkipBox');
        const formBody = document.getElementById('inspectFormBody');

        if (skipBox) skipBox.style.display = isSkipped ? 'block' : 'none';
        if (formBody) formBody.style.display = isSkipped ? 'none' : 'block';
    },

    previewInspectPhoto(input, containerId) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const container = document.getElementById(containerId);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (container) {
                container.innerHTML = `<img src="${e.target.result}" class="photo-preview-img mt-1">`;
            }
            input.parentElement.classList.add('has-file');
        };
        reader.readAsDataURL(file);
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

    bindUIEvents() {
        // Inspect Machine Form Submit
        const formInspect = document.getElementById('formInspectMachine');
        if (formInspect) {
            formInspect.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveInspectRecord();
            });
        }

        // Legacy/Manual Round Template Selection Change
        const templateSel = document.getElementById('newRoundTemplate');
        if (templateSel) {
            templateSel.addEventListener('change', (e) => {
                const opt = e.target.selectedOptions[0];
                const alertBox = document.getElementById('modalSlotAlert');
                if (opt && opt.value) {
                    document.getElementById('newRoundName').value = opt.getAttribute('data-name');
                    document.getElementById('newRoundShift').value = opt.getAttribute('data-shift') || 'Day';
                    const status = opt.getAttribute('data-status');
                    if (alertBox) {
                        if (status === 'MISSED') {
                            alertBox.innerHTML = `
                            <div class="alert alert-warning py-2 px-3 small mb-0 border-0" style="border-radius: 10px;">
                                <i class="fas fa-exclamation-triangle text-warning me-1"></i>
                                <strong>แจ้งเตือนข้อตกลง Audit:</strong> รอบนี้เลยกำหนดเวลามาตรฐานแล้ว ระบบจะประทับเวลาจริง (${this.slotSummary?.cur_server_time || 'Real-time'} น.) ณ ขณะบันทึกเพื่อความถูกต้อง ไม่อนุญาตให้แก้ไขเวลาย้อนหลัง
                            </div>`;
                            alertBox.style.display = 'block';
                        } else if (status === 'COMPLETED') {
                            alertBox.innerHTML = `
                            <div class="alert alert-info py-2 px-3 small mb-0 border-0" style="border-radius: 10px;">
                                <i class="fas fa-info-circle text-primary me-1"></i>
                                <strong>หมายเหตุ:</strong> รอบเวลานี้เคยทำการตรวจและปิดรอบไปแล้ว หากเริ่มรอบจะเป็นการตรวจซ้ำเพิ่มเติม
                            </div>`;
                            alertBox.style.display = 'block';
                        } else {
                            alertBox.style.display = 'none';
                        }
                    }
                } else if (alertBox) {
                    alertBox.style.display = 'none';
                }
            });
        }

        // Create Round Form (Legacy/Manual)
        const formRound = document.getElementById('formCreateRound');
        if (formRound) {
            formRound.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createRound();
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

    async saveInspectRecord() {
        if (!this.isOnline) {
            Swal.fire('ออฟไลน์', 'ไม่สามารถบันทึกข้อมูลได้เนื่องจากไม่มีการเชื่อมต่อเครือข่าย', 'warning');
            return;
        }

        const machineId = document.getElementById('inspectMachineId').value;
        const roundId = document.getElementById('inspectRoundId').value;
        const line = document.getElementById('inspectLine').value || 'SPOT';
        const isSkipped = document.getElementById('inspectIsSkipped')?.checked ? 1 : 0;
        const skipReason = document.getElementById('inspectSkipReason')?.value.trim() || '';

        const formData = new FormData();
        formData.append('action', 'save_record');
        formData.append('csrf_token', this.csrfToken);
        formData.append('machine_id', machineId);
        formData.append('round_id', roundId);
        formData.append('is_skipped', isSkipped ? '1' : '0');
        formData.append('skip_reason', skipReason);

        if (!isSkipped) {
            const pullResult = this.currentInspectResult;
            formData.append('pull_result', pullResult);
            formData.append('sku', document.getElementById('inspectSku')?.value.trim() || '');
            formData.append('po_no', document.getElementById('inspectPoNo')?.value.trim() || '');
            formData.append('thickness', document.getElementById('inspectThickness')?.value || '');
            formData.append('ng_remark', document.getElementById('inspectNgRemark')?.value.trim() || '');

            // Adaptive Line Parameters
            if (line === 'SPOT') {
                formData.append('knock_check_val', document.getElementById('inspectKnock')?.value || '');
                formData.append('distance_check_val', document.getElementById('inspectDistance')?.value || '');
            } else if (line === 'BEND') {
                formData.append('custom_check_val_1', document.getElementById('inspectBendAngle')?.value || '');
                formData.append('custom_check_val_2', document.getElementById('inspectFlangeLen')?.value || '');
            } else if (line === 'PRESS') {
                formData.append('custom_check_text', document.getElementById('inspectDieNo')?.value.trim() || '');
                formData.append('custom_check_val_1', document.getElementById('inspectBurrHeight')?.value || '');
                const crack = document.getElementById('inspectCrackCheck')?.value || 'OK';
                if (crack === 'NG') formData.append('pull_result', 'NG');
            }

            // Photo Files
            const filePull = document.getElementById('inspectPhotoPull')?.files[0];
            const filePanel = document.getElementById('inspectPhotoPanel')?.files[0];
            if (filePull) formData.append('photo_pull', filePull);
            if (filePanel) formData.append('photo_panel', filePanel);
        }

        const btnSave = document.getElementById('btnSaveInspectRecord');
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

            // Update todayRecordsMap
            this.todayRecordsMap[machineId] = json.data;

            // Re-render Interactive Grid & Cockpit Status
            this.renderInteractiveGrid();
            this.renderCockpitStatus();

            // Hide Modal
            const modalEl = document.getElementById('modalInspectMachine');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: json.message,
                showConfirmButton: false,
                timer: 2200
            });
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-check-circle me-1"></i>บันทึกผลการตรวจสอบ';
        }
    },

    openCurrentAuditSheet() {
        const today = this.slotSummary?.cur_server_date || new Date().toISOString().split('T')[0];
        const line = this.currentLine || 'SPOT';
        window.open(`print_iqs.php?date=${encodeURIComponent(today)}&line=${encodeURIComponent(line)}&view=matrix`, '_blank');
    },

    renderTemplateOptions() {
        const sel = document.getElementById('newRoundTemplate');
        if (!sel || !this.slotStatuses) return;
        sel.innerHTML = '<option value="">-- เลือกรอบเวลามาตรฐาน (หรือระบุเอง) --</option>';
        this.slotStatuses.forEach(t => {
            let tag = '';
            if (t.status === 'COMPLETED') tag = ' [ตรวจแล้ว]';
            else if (t.status === 'IN_PROGRESS') tag = ' [กำลังตรวจ]';
            else if (t.status === 'DUE_NOW') tag = ' [★ ถึงเวลาตรวจ]';
            else if (t.status === 'MISSED') tag = ' [! ขาดการตรวจ/เลยเวลา]';

            sel.innerHTML += `<option value="${t.template_id}" data-name="${t.template_name}" data-shift="${t.shift}" data-status="${t.status}">
                ${t.template_name} (${t.std_time}) - กะ ${t.shift}${tag}
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
            await this.loadInitialData();
        } catch (err) {
            Swal.fire('ไม่สามารถเปิดรอบได้', err.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    async loadHistory(page = 1) {
        const start = document.getElementById('histStartDate')?.value || '';
        const end = document.getElementById('histEndDate')?.value || '';
        const status = document.getElementById('histStatus')?.value || '';
        const line = document.getElementById('histLine')?.value || 'ALL';

        try {
            this.showLoading(true);
            const url = `api/iqs_api.php?action=get_history&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&status=${encodeURIComponent(status)}&line=${encodeURIComponent(line)}&page=${page}&limit=15`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const tbody = document.getElementById('historyTableBody');
            const feedMobile = document.getElementById('historyFeedMobile');
            const paginationEl = document.getElementById('historyPagination');
            const rounds = json.data.rounds || [];
            const pagination = json.data.pagination || { page: 1, total_pages: 1, total_rows: rounds.length };

            if (tbody) tbody.innerHTML = '';
            if (feedMobile) feedMobile.innerHTML = '';
            if (paginationEl) paginationEl.innerHTML = '';

            if (rounds.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2 d-block text-secondary opacity-50"></i>ไม่พบข้อมูลประวัติการตรวจสอบตามเงื่อนไขที่เลือก</td></tr>';
                if (feedMobile) feedMobile.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2 d-block text-secondary opacity-50"></i>ไม่พบข้อมูลประวัติการตรวจสอบตามเงื่อนไขที่เลือก</div>';
                return;
            }

            rounds.forEach(r => {
                // Unified Status Badge (Soft, readable, rounded pill)
                let statusBadge = '';
                if (r.status === 'SUBMITTED' || r.status === 'COMPLETED') {
                    statusBadge = '<span class="badge-status badge-status-submitted"><i class="fas fa-check-circle me-1"></i>สมบูรณ์</span>';
                } else if (r.status === 'COMPLETED_WITH_NG') {
                    statusBadge = '<span class="badge-status badge-status-ng"><i class="fas fa-exclamation-circle me-1"></i>พบ NG</span>';
                } else {
                    statusBadge = '<span class="badge-status badge-status-open"><i class="fas fa-clock me-1"></i>กำลังตรวจ</span>';
                }

                // Unified Line Badge (Soft, consistent height and font)
                let lineBadge = '';
                const rLine = (r.line || 'SPOT').toUpperCase();
                if (rLine === 'SPOT') {
                    lineBadge = '<span class="badge-line badge-line-spot"><i class="fas fa-bolt"></i>Spot</span>';
                } else if (rLine === 'BEND') {
                    lineBadge = '<span class="badge-line badge-line-bend"><i class="fas fa-ruler-combined"></i>Bend</span>';
                } else if (rLine === 'PRESS') {
                    lineBadge = '<span class="badge-line badge-line-press"><i class="fas fa-industry"></i>Press</span>';
                } else {
                    lineBadge = `<span class="badge-line badge-line-press">${rLine}</span>`;
                }

                // Desktop Table Row - All cells standard Prompt font (14px), balanced weights, aligned baselines
                if (tbody) {
                    tbody.innerHTML += `
                    <tr>
                        <td>
                            <span class="fw-semibold text-primary" style="font-size: 0.875rem;">${r.round_number}</span>
                        </td>
                        <td>${lineBadge}</td>
                        <td class="text-secondary" style="font-size: 0.875rem;">${r.plan_date}</td>
                        <td>
                            <span class="text-dark fw-medium" style="font-size: 0.875rem;">${r.round_name}</span>
                        </td>
                        <td class="text-secondary" style="font-size: 0.875rem;">กะ ${r.shift}</td>
                        <td class="text-secondary" style="font-size: 0.875rem;">${r.primary_tester_name ? r.primary_tester_name : '<span class="text-muted">-</span>'}</td>
                        <td>
                            <div class="d-inline-flex gap-1 align-items-center">
                                <span class="badge-metric badge-metric-ok">OK ${r.ok_count}</span>
                                ${r.ng_count > 0 ? `<span class="badge-metric badge-metric-ng">NG ${r.ng_count}</span>` : ''}
                                ${r.skip_count > 0 ? `<span class="badge-metric badge-metric-skip">ข้าม ${r.skip_count}</span>` : ''}
                            </div>
                        </td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="history-btn-group">
                                <a href="print_iqs.php?date=${encodeURIComponent(r.plan_date)}&line=${encodeURIComponent(r.line || 'SPOT')}&view=matrix" target="_blank" class="btn btn-outline-primary" title="ตารางสรุป 7 รอบประจำวัน">
                                    <i class="fas fa-table me-1"></i>สรุป 7 รอบ
                                </a>
                                <a href="print_iqs.php?round_id=${encodeURIComponent(r.round_id)}&view=log" target="_blank" class="btn btn-outline-secondary" title="บันทึกการตรวจสอบรอบนี้แบบละเอียด">
                                    <i class="fas fa-file-alt me-1"></i>รอบนี้
                                </a>
                            </div>
                        </td>
                    </tr>`;
                }

                // Mobile Card Feed - Matching typography and clean spacing
                if (feedMobile) {
                    feedMobile.innerHTML += `
                    <div class="history-card-mobile">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="hist-title">${r.round_number}</span>
                            ${statusBadge}
                        </div>
                        <div class="d-flex align-items-center gap-2 mb-2">
                            ${lineBadge}
                            <span class="text-secondary" style="font-size: 0.8rem;">กะ ${r.shift}</span>
                        </div>
                        <div class="text-secondary mb-2" style="font-size: 0.82rem; line-height: 1.5;">
                            <div><i class="fas fa-calendar-alt me-1 text-primary"></i><strong>${r.plan_date}</strong> (${r.round_name})</div>
                            <div><i class="fas fa-user-check me-1 text-info"></i>ผู้ทดสอบ: ${r.primary_tester_name ? r.primary_tester_name : '<span class="text-muted">-</span>'}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top gap-2 flex-wrap">
                            <div class="d-flex gap-1 align-items-center">
                                <span class="badge-metric badge-metric-ok">OK ${r.ok_count}</span>
                                ${r.ng_count > 0 ? `<span class="badge-metric badge-metric-ng">NG ${r.ng_count}</span>` : ''}
                                ${r.skip_count > 0 ? `<span class="badge-metric badge-metric-skip">ข้าม ${r.skip_count}</span>` : ''}
                            </div>
                            <div class="history-btn-group">
                                <a href="print_iqs.php?date=${encodeURIComponent(r.plan_date)}&line=${encodeURIComponent(r.line || 'SPOT')}&view=matrix" target="_blank" class="btn btn-outline-primary">
                                    <i class="fas fa-table me-1"></i>สรุป 7 รอบ
                                </a>
                                <a href="print_iqs.php?round_id=${encodeURIComponent(r.round_id)}&view=log" target="_blank" class="btn btn-outline-secondary">
                                    <i class="fas fa-file-alt me-1"></i>รอบนี้
                                </a>
                            </div>
                        </div>
                    </div>`;
                }
            });

            // Render Pagination
            if (paginationEl && pagination.total_pages > 1) {
                let pagHtml = `
                <div class="small text-muted">
                    แสดงหน้า <strong>${pagination.page}</strong> จากทั้งหมด <strong>${pagination.total_pages}</strong> หน้า (รวม ${pagination.total_rows} รายการ)
                </div>
                <div class="btn-group">
                    <button type="button" class="btn btn-outline-secondary btn-sm px-3" ${pagination.page <= 1 ? 'disabled' : ''} onclick="IQS.loadHistory(${pagination.page - 1})">
                        <i class="fas fa-chevron-left me-1"></i>ก่อนหน้า
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm px-3" ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="IQS.loadHistory(${pagination.page + 1})">
                        ถัดไป<i class="fas fa-chevron-right ms-1"></i>
                    </button>
                </div>`;
                paginationEl.innerHTML = pagHtml;
                paginationEl.style.display = 'flex';
            } else if (paginationEl) {
                paginationEl.innerHTML = `
                <div class="small text-muted">
                    พบทั้งหมด <strong>${pagination.total_rows || rounds.length}</strong> รายการ
                </div>`;
                paginationEl.style.display = 'flex';
            }
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
