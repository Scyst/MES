// machineModule.js — Machine Registry Module
const MachineModule = (() => {
    let allData = [];
    let currentView = 'card';

    async function loadData() {
        try {
            const line = document.getElementById('machineFilterLine')?.value || '';
            const status = document.getElementById('machineFilterStatus')?.value || '';
            const type = document.getElementById('machineFilterType')?.value || '';

            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_machines', line, status, machine_type: type });
            allData = res.data || [];

            // Update KPIs
            const stats = res.stats || {};
            PEApp.animateValue(document.getElementById('kpiTotalMachines'), 0, stats.total || 0);
            PEApp.animateValue(document.getElementById('kpiActiveMachines'), 0, stats.active_count || 0);
            PEApp.animateValue(document.getElementById('kpiRepairMachines'), 0, stats.repair_count || 0);
            PEApp.animateValue(document.getElementById('kpiInactiveMachines'), 0, stats.inactive_count || 0);

            // Populate filters
            populateFilters(res.filters || {});
            renderView();
            startTelemetryPolling();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function populateFilters(filters) {
        const lineSelect = document.getElementById('machineFilterLine');
        const typeSelect = document.getElementById('machineFilterType');
        if (!lineSelect || !typeSelect) return;

        const currentLine = lineSelect.value;
        const currentType = typeSelect.value;

        // Rebuild only options (keep first)
        while (lineSelect.options.length > 1) lineSelect.options.remove(1);
        while (typeSelect.options.length > 1) typeSelect.options.remove(1);

        (filters.lines || []).forEach(l => {
            lineSelect.add(new Option(l, l, false, l === currentLine));
        });
        (filters.types || []).forEach(t => {
            typeSelect.add(new Option(t, t, false, t === currentType));
        });
    }

    function filterTable() {
        const q = (document.getElementById('machineSearchInput')?.value || '').toLowerCase();
        renderView(q);
    }

    function renderView(searchQuery = '') {
        const filtered = searchQuery
            ? allData.filter(m =>
                (m.machine_code || '').toLowerCase().includes(searchQuery) ||
                (m.machine_name || '').toLowerCase().includes(searchQuery) ||
                (m.line || '').toLowerCase().includes(searchQuery) ||
                (m.area || '').toLowerCase().includes(searchQuery))
            : allData;

        if (currentView === 'card') renderCardView(filtered);
        else renderTableView(filtered);
    }

    function renderCardView(data) {
        const container = document.getElementById('machineCardView');
        if (!container) return;

        if (!data.length) {
            container.innerHTML = `<div class="pe-empty"><i class="fas fa-industry"></i><h6>No machines found</h6><p>Try adjusting your filters or add a new machine</p></div>`;
            return;
        }

        container.innerHTML = data.map(m => {
            const typeIcon = getTypeIcon(m.machine_type);
            
            let visualHtml = '';
            if (m.image_path) {
                visualHtml = `<img src="../../${m.image_path}" class="machine-image" onerror="this.onerror=null; this.src='../../assets/images/no-image.png';">`;
            } else {
                visualHtml = `
                    <div class="card-top">
                        <div class="machine-icon"><i class="${typeIcon}"></i></div>
                        <div class="pe-d-flex pe-gap-8 pe-align-center">
                            ${PEApp.getCriticalityBadge(m.criticality || 'Medium')}
                            ${PEApp.getMachineStatusBadge(m.status || 'Active')}
                        </div>
                    </div>`;
            }
            
            // If image is used, we still need badges but positioned differently or below image
            let topBadgesHtml = '';
            if (m.image_path) {
                topBadgesHtml = `
                    <div class="pe-d-flex pe-gap-8 pe-align-center pe-mb-3">
                        ${PEApp.getCriticalityBadge(m.criticality || 'Medium')}
                        ${PEApp.getMachineStatusBadge(m.status || 'Active')}
                    </div>`;
            }

            return `
            <div class="pe-machine-card pe-animate-in" onclick="MachineModule.viewDetail(${m.machine_id})" data-machine-code="${PEApp.escapeHtml(m.machine_code)}">
                ${visualHtml}
                ${topBadgesHtml}
                <div class="pe-d-flex pe-align-center pe-justify-between">
                    <div class="machine-code">${PEApp.escapeHtml(m.machine_code)}</div>
                    <div class="iiot-status-badge"></div>
                </div>
                <div class="machine-name">${PEApp.escapeHtml(m.machine_name)}</div>
                <div class="machine-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${PEApp.escapeHtml(m.line || '-')}</span>
                    <span><i class="fas fa-layer-group"></i> ${PEApp.escapeHtml(m.area || '-')}</span>
                    <span><i class="fas fa-cog"></i> ${PEApp.escapeHtml(m.machine_type || '-')}</span>
                    ${m.install_date ? `<span><i class="fas fa-calendar"></i> ${PEApp.formatDate(m.install_date)}</span>` : ''}
                </div>
                <div class="machine-telemetry" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--pe-border); display: none; font-size: 12px;">
                    <!-- Telemetry Data Will Be Injected Here -->
                </div>
            </div>`;
        }).join('');
    }

    function renderTableView(data) {
        const tbody = document.getElementById('machineTableBody');
        if (!tbody) return;

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="pe-text-center pe-text-muted" style="padding:60px;">No machines found</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td class="pe-fw-bold" style="color:var(--pe-primary);">${PEApp.escapeHtml(m.machine_code)}</td>
                <td>${PEApp.escapeHtml(m.machine_name)}</td>
                <td>${PEApp.escapeHtml(m.line || '-')}</td>
                <td>${PEApp.escapeHtml(m.area || '-')}</td>
                <td>${PEApp.escapeHtml(m.machine_type || '-')}</td>
                <td>${PEApp.getMachineStatusBadge(m.status)}</td>
                <td>${PEApp.getCriticalityBadge(m.criticality || 'Medium')}</td>
                <td class="pe-text-sm">${PEApp.formatDate(m.install_date)}</td>
                <td class="pe-text-center">
                    <button class="pe-btn pe-btn-ghost pe-btn-sm pe-btn-icon" onclick="event.stopPropagation(); MachineModule.openModal(${m.machine_id})" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getTypeIcon(type) {
        const map = {
            'Press': 'fas fa-compress-arrows-alt', 'Spot Weld': 'fas fa-bolt',
            'Laser Cut': 'fas fa-crosshairs', 'CNC': 'fas fa-microchip',
            'Bending': 'fas fa-arrow-turn-down', 'Paint': 'fas fa-paint-roller',
            'Assembly': 'fas fa-puzzle-piece', 'Conveyor': 'fas fa-arrows-alt-h',
            'Compressor': 'fas fa-wind', 'Chiller': 'fas fa-snowflake'
        };
        return map[type] || 'fas fa-cog';
    }

    function setView(view) {
        currentView = view;
        document.getElementById('machineViewCard')?.classList.toggle('active', view === 'card');
        document.getElementById('machineViewTable')?.classList.toggle('active', view === 'table');
        document.getElementById('machineCardView').style.display = view === 'card' ? '' : 'none';
        document.getElementById('machineTableView').style.display = view === 'table' ? '' : 'none';
        renderView();
    }

    function openModal(editId = null) {
        document.getElementById('machineEditId').value = editId || '';
        document.getElementById('machineModalTitle').textContent = editId ? 'Edit Machine' : 'Add Machine';
        
        const isDeleted = editId && allData.find(m => m.machine_id == editId && (m.is_active === 0 || m.is_active === '0'));
        
        document.getElementById('machineSaveBtn').innerHTML = editId
            ? '<i class="fas fa-save me-1"></i> Update Machine'
            : '<i class="fas fa-save me-1"></i> Save Machine';
            
        const deleteBtn = document.getElementById('machineDeleteBtn');
        const saveBtn = document.getElementById('machineSaveBtn');
        
        if (isDeleted) {
            document.getElementById('machineModalTitle').textContent = 'Restore Machine';
            saveBtn.innerHTML = '<i class="fas fa-trash-restore me-1"></i> Restore Machine';
            saveBtn.onclick = restoreItem;
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            saveBtn.onclick = save;
            if (deleteBtn) deleteBtn.style.display = editId ? 'block' : 'none';
        }

        // Clear fields
        ['machineFrmCode', 'machineFrmName', 'machineFrmMqttTopic', 'machineFrmLine', 'machineFrmArea', 
         'machineFrmManufacturer', 'machineFrmModel', 'machineFrmSerial', 'machineFrmNotes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('machineFrmType').value = '';
        document.getElementById('machineFrmStatus').value = 'Active';
        document.getElementById('machineFrmCriticality').value = 'Medium';
        document.getElementById('machineFrmInstallDate').value = '';
        
        // Reset Image
        const imgInput = document.getElementById('machineFrmImage');
        if (imgInput) imgInput.value = '';
        const previewDiv = document.getElementById('machineImagePreview');
        if (previewDiv) previewDiv.style.display = 'none';

        // Load data if editing
        if (editId) {
            const machine = allData.find(m => m.machine_id == editId);
            if (machine) {
                document.getElementById('machineFrmCode').value = machine.machine_code || '';
                document.getElementById('machineFrmName').value = machine.machine_name || '';
                document.getElementById('machineFrmMqttTopic').value = machine.mqtt_topic || '';
                document.getElementById('machineFrmLine').value = machine.line || '';
                document.getElementById('machineFrmArea').value = machine.area || '';
                document.getElementById('machineFrmType').value = machine.machine_type || '';
                document.getElementById('machineFrmManufacturer').value = machine.manufacturer || '';
                document.getElementById('machineFrmModel').value = machine.model || '';
                document.getElementById('machineFrmSerial').value = machine.serial_number || '';
                document.getElementById('machineFrmInstallDate').value = machine.install_date ? machine.install_date.substring(0, 10) : '';
                document.getElementById('machineFrmStatus').value = machine.status || 'Active';
                document.getElementById('machineFrmCriticality').value = machine.criticality || 'Medium';
                document.getElementById('machineFrmNotes').value = machine.notes || '';
                
                if (machine.image_path) {
                    const img = previewDiv.querySelector('img');
                    if (img) {
                        img.src = '../../' + machine.image_path;
                        previewDiv.style.display = 'block';
                    }
                }
            }
        }

        // Load line datalist
        loadLineDatalist();
        PEApp.showModal('machineModal');
    }

    async function loadLineDatalist() {
        try {
            const res = await PEApp.apiCall('machineAPI.php', { action: 'get_lines' });
            const dl = document.getElementById('machineLineList');
            if (dl) {
                dl.innerHTML = (res.data || []).map(l => `<option value="${PEApp.escapeHtml(l)}">`).join('');
            }
        } catch (e) { /* silent */ }
    }

    async function save() {
        const code = document.getElementById('machineFrmCode')?.value?.trim();
        const name = document.getElementById('machineFrmName')?.value?.trim();

        if (!code || !name) {
            PEApp.showToast('กรุณากรอก Machine Code และ Machine Name', 'warning');
            return;
        }

        const btn = document.getElementById('machineSaveBtn');
        btn.disabled = true;

        try {
            let imagePath = null;
            const imgInput = document.getElementById('machineFrmImage');
            if (imgInput && imgInput.files.length > 0) {
                imagePath = await PEApp.uploadFile(imgInput.files[0], 'MACHINE');
            }

            const payload = {
                action: 'save_machine',
                machine_id: document.getElementById('machineEditId')?.value || '',
                machine_code: code,
                machine_name: name,
                mqtt_topic: document.getElementById('machineFrmMqttTopic')?.value || '',
                line: document.getElementById('machineFrmLine')?.value || '',
                area: document.getElementById('machineFrmArea')?.value || '',
                machine_type: document.getElementById('machineFrmType')?.value || '',
                manufacturer: document.getElementById('machineFrmManufacturer')?.value || '',
                model: document.getElementById('machineFrmModel')?.value || '',
                serial_number: document.getElementById('machineFrmSerial')?.value || '',
                install_date: document.getElementById('machineFrmInstallDate')?.value || '',
                status: document.getElementById('machineFrmStatus')?.value || 'Active',
                criticality: document.getElementById('machineFrmCriticality')?.value || 'Medium',
                notes: document.getElementById('machineFrmNotes')?.value || ''
            };
            if (imagePath) {
                payload.image_path = imagePath;
            }

            await PEApp.apiCall('machineAPI.php', {}, 'POST', payload);

            PEApp.showToast('บันทึกเครื่องจักรเรียบร้อย', 'success');
            PEApp.hideModal('machineModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async function deleteItem() {
        const editId = document.getElementById('machineEditId')?.value;
        if (!editId) return;

        if (!confirm('ยืนยันที่จะลบเครื่องจักรนี้? (ระบบจะซ่อนข้อมูลนี้เพื่อไม่ให้กระทบประวัติแจ้งซ่อมเก่า)')) {
            return;
        }

        const btn = document.getElementById('machineDeleteBtn');
        if (btn) btn.disabled = true;

        try {
            await PEApp.apiCall('machineAPI.php', {}, 'POST', {
                action: 'delete_machine',
                machine_id: editId
            });
            PEApp.showToast('ลบเครื่องจักรเรียบร้อยแล้ว', 'success');
            PEApp.hideModal('machineModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function restoreItem() {
        const editId = document.getElementById('machineEditId')?.value;
        if (!editId) return;

        if (!confirm('ยืนยันที่จะกู้คืนเครื่องจักรนี้?')) return;

        const btn = document.getElementById('machineSaveBtn');
        if (btn) btn.disabled = true;

        try {
            await PEApp.apiCall('machineAPI.php', {}, 'POST', {
                action: 'restore_machine',
                machine_id: editId
            });
            PEApp.showToast('กู้คืนเครื่องจักรเรียบร้อยแล้ว', 'success');
            PEApp.hideModal('machineModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function viewDetail(machineId) {
        openModal(machineId);
    }

    let telemetryInterval = null;

    function startTelemetryPolling() {
        if (telemetryInterval) clearInterval(telemetryInterval);
        
        const fetchTelemetry = async () => {
            try {
                const res = await fetch('api/iiotAPI.php?action=get_live_telemetry');
                const json = await res.json();
                if (json.success && json.data) {
                    updateTelemetryUI(json.data);
                }
            } catch (e) {
                console.error('Failed to fetch telemetry', e);
            }
        };

        fetchTelemetry(); // initial fetch
        telemetryInterval = setInterval(fetchTelemetry, 5000); // poll every 5 seconds
    }

    function updateTelemetryUI(data) {
        document.querySelectorAll('.pe-machine-card[data-machine-code]').forEach(card => {
            const mCode = card.getAttribute('data-machine-code');
            const telemetry = data[mCode];
            const tContainer = card.querySelector('.machine-telemetry');
            const sBadge = card.querySelector('.iiot-status-badge');

            if (telemetry) {
                tContainer.style.display = 'block';
                
                // Status Badge
                let statusHtml = '';
                if (telemetry.live_status) {
                    const statusStr = telemetry.live_status.toUpperCase();
                    if (statusStr === 'RUN' || statusStr === 'RUNNING') {
                        statusHtml = `<span class="pe-badge pe-status-active" style="padding: 2px 6px; font-size: 10px;"><i class="fas fa-circle pe-me-1" style="font-size: 8px;"></i> RUNNING</span>`;
                    } else if (statusStr === 'STOP' || statusStr === 'STOPPED') {
                        statusHtml = `<span class="pe-badge pe-crit-critical" style="padding: 2px 6px; font-size: 10px;"><i class="fas fa-circle pe-me-1" style="font-size: 8px;"></i> STOPPED</span>`;
                    } else {
                        statusHtml = `<span class="pe-badge pe-status-inactive" style="padding: 2px 6px; font-size: 10px;">${telemetry.live_status}</span>`;
                    }
                }
                sBadge.innerHTML = statusHtml;

                // Telemetry Content
                let contentHtml = `<div class="pe-d-flex pe-flex-column pe-gap-2">`;
                if (telemetry.net_counter !== null && telemetry.net_counter !== undefined) {
                    contentHtml += `<div class="pe-d-flex pe-justify-between">
                        <span class="pe-text-muted"><i class="fas fa-sort-numeric-up-alt"></i> Output:</span>
                        <span class="pe-fw-bold">${telemetry.net_counter} / ${telemetry.live_total || '-'} pcs</span>
                    </div>`;
                }
                if (telemetry.power_kw !== null && telemetry.power_kw !== "") {
                    contentHtml += `<div class="pe-d-flex pe-justify-between">
                        <span class="pe-text-muted"><i class="fas fa-bolt"></i> Power:</span>
                        <span class="pe-fw-bold" style="color:#d97706;">${parseFloat(telemetry.power_kw).toFixed(2)} kW</span>
                    </div>`;
                }
                if (telemetry.flow_rate !== null && telemetry.flow_rate !== "") {
                    contentHtml += `<div class="pe-d-flex pe-justify-between">
                        <span class="pe-text-muted"><i class="fas fa-wind"></i> Flow:</span>
                        <span class="pe-fw-bold" style="color:#0ea5e9;">${parseFloat(telemetry.flow_rate).toFixed(2)}</span>
                    </div>`;
                }
                contentHtml += `</div>`;
                
                tContainer.innerHTML = contentHtml;
            } else {
                tContainer.style.display = 'none';
                sBadge.innerHTML = '';
            }
        });
    }

    // --- IIoT Discovery Features ---
    let discoveryModalInstance = null;
    let discoveryRawModalInstance = null;

    function openDiscoveryModal() {
        if (!discoveryModalInstance) {
            discoveryModalInstance = new bootstrap.Modal(document.getElementById('discoveryModal'));
        }
        discoveryModalInstance.show();
        loadDiscovery();
    }
    
    function closeDiscoveryModal() {
        if (discoveryModalInstance) {
            discoveryModalInstance.hide();
        }
    }
    
        async function loadDiscovery() {
        const tb = document.getElementById('discoveryTableBody');
        tb.innerHTML = '<tr><td colspan="5" class="pe-text-center pe-text-muted">Loading...</td></tr>';
        try {
            const res = await PEApp.apiCall('iiotAPI.php', { action: 'get_discovery_topics' });
            if (res.success && res.data.length > 0) {
                // store payload data globally for raw view
                window.discoveryDataRaw = res.data;
                
                let html = '';
                res.data.forEach((row, idx) => {
                    const isMapped = !!row.machine_code;
                    const statusHtml = isMapped 
                        ? `<span class="pe-badge pe-badge-success">MAPPED</span>` 
                        : `<span class="pe-badge pe-badge-danger">UNMAPPED</span>`;
                    
                    const mappedText = isMapped ? row.machine_code : '-';
                    const mapBtnHtml = !isMapped 
                        ? `<button class="pe-btn pe-btn-sm pe-btn-primary" onclick="MachineModule.mapTopic('${row.topic_name}')"><i class="fas fa-link"></i> Map</button>`
                        : '';
                        
                    
                    html += `<tr>
                        <td class="pe-fw-bold">${PEApp.escapeHtml(row.topic_name)}</td>
                        <td>${statusHtml}</td>
                        <td>${mappedText}</td>
                        <td style="font-size:12px;">${row.last_seen}</td>
                        <td class="pe-text-center">
                            <button class="pe-btn pe-btn-sm pe-btn-secondary" onclick="MachineModule.showDiscoveryRaw(${idx})" title="View Raw Data"><i class="fas fa-code"></i></button>
                            ${mapBtnHtml}
                        </td>
                    </tr>`;
                });
                tb.innerHTML = html;
            } else {
                tb.innerHTML = '<tr><td colspan="5" class="pe-text-center pe-text-muted">No telemetry data received yet.</td></tr>';
            }
        } catch (e) {
            tb.innerHTML = '<tr><td colspan="5" class="pe-text-center" style="color:var(--danger);">Failed to load discovery data</td></tr>';
        }
    }
    
    function showDiscoveryRaw(idx) {
        const data = window.discoveryDataRaw[idx];
        if (data && data.payload_obj) {
            document.getElementById('discoveryRawPre').innerText = JSON.stringify(data.payload_obj, null, 4);
            if (!discoveryRawModalInstance) {
                discoveryRawModalInstance = new bootstrap.Modal(document.getElementById('discoveryRawModal'));
            }
            discoveryRawModalInstance.show();
        } else {
            alert("No JSON payload available for this topic.");
        }
    }
    
    function closeDiscoveryRawModal() {
        if (discoveryRawModalInstance) {
            discoveryRawModalInstance.hide();
        }
    }
    
    function mapTopic(topicName) {
        closeDiscoveryModal();
        openModal();
        setTimeout(() => {
            document.getElementById('machineMqttTopic').value = topicName;
        }, 500);
    }

    return { 
        loadData, filterTable, setView, openModal, save, viewDetail, deleteItem, restoreItem, startTelemetryPolling,
        openDiscoveryModal, closeDiscoveryModal, loadDiscovery, showDiscoveryRaw, closeDiscoveryRawModal, mapTopic
    };
})();
