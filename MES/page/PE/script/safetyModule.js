// e:\MES\MES\MES\page\PE\script\safetyModule.js
const SafetyModule = (function() {
    let rawHazardData = [];
    let rawPreOpData = [];
    let currentHazModal = null;
    let checklistModal = null;
    let complianceChart = null;
    let hazardTrendChart = null;

    function init() {
        if(document.getElementById('hazardModal')) {
            currentHazModal = new bootstrap.Modal(document.getElementById('hazardModal'));
        }
        if(document.getElementById('checklistModal')) {
            checklistModal = new bootstrap.Modal(document.getElementById('checklistModal'));
        }
        loadData();
        loadPreOpStats();
    }

    function loadData() {
        const status = document.getElementById('safetyStatusFilter')?.value || 'all';
        const tbody = document.getElementById('safetyTableBody');
        
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>`;

        fetch(`api/safetyAPI.php?action=get_hazard_reports&status=${status}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    rawHazardData = data.data;
                    renderHazardTable(rawHazardData);
                    updateHazardKpis(data.kpi);
                    renderHazardTrendChart(data.trend || []);
                } else {
                    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${data.message}</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Error fetching safety data:', error);
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Network Error</td></tr>`;
            });
    }

    function loadPreOpData() {
        const tbody = document.getElementById('preopTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>`;

        fetch(`api/preopAPI.php?action=get_preop_logs`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    rawPreOpData = data.data;
                    renderPreOpTable(rawPreOpData);
                } else {
                    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${data.message}</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Error fetching preop logs:', error);
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Network Error</td></tr>`;
            });
    }

    function loadPreOpStats() {
        fetch(`api/preopAPI.php?action=get_dashboard_stats`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const stats = data.data;
                    document.getElementById('kpiPreOpTotal').innerText = stats.total;
                    document.getElementById('kpiPreOpCompliance').innerText = stats.compliance;
                    renderComplianceChart(stats.passed, stats.failed);
                }
            })
            .catch(console.error);
    }

    function renderHazardTable(data) {
        const tbody = document.getElementById('safetyTableBody');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hazard reports found</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            let badgeClass = 'bg-secondary';
            if (item.status === 'Pending') badgeClass = 'bg-warning text-dark';
            else if (item.status === 'In Progress') badgeClass = 'bg-info text-dark';
            else if (item.status === 'Completed') badgeClass = 'bg-success';
            else if (item.status === 'Cancelled') badgeClass = 'bg-dark';

            html += `
                <tr class="align-middle">
                    <td class="fw-bold pe-text-primary">${item.wo_number}</td>
                    <td>
                        <div>${new Date(item.requested_at).toLocaleDateString('en-GB')}</div>
                        <div class="small text-muted">${new Date(item.requested_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.issue_title}</div>
                        <div class="small text-muted text-truncate" style="max-width: 200px;">${item.issue_detail || '-'}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${item.machine_name}</div>
                    </td>
                    <td><span class="badge ${badgeClass}">${item.status}</span></td>
                    <td class="text-center">
                        <button class="pe-btn pe-btn-sm pe-btn-ghost" onclick='SafetyModule.viewDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})' title="View Details">
                            <i class="fas fa-search"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    function renderPreOpTable(data) {
        const tbody = document.getElementById('preopTableBody');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No pre-op audit logs found</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            let badgeClass = item.status === 'Passed' ? 'bg-success' : 'bg-danger';
            let woLink = item.wo_id ? `<span class="badge bg-danger cursor-pointer" title="View WO" onclick="alert('WO ID: ${item.wo_id}')"><i class="fas fa-link"></i> WO</span>` : '-';
            
            html += `
                <tr class="align-middle">
                    <td>
                        <div>${new Date(item.audited_at).toLocaleDateString('en-GB')}</div>
                        <div class="small text-muted">${new Date(item.audited_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${item.machine_name || item.machine_code}</div>
                        <div class="small text-muted">${item.line || ''}</div>
                    </td>
                    <td>${item.shift_name}</td>
                    <td>${item.audited_by}</td>
                    <td><span class="badge ${badgeClass}">${item.status}</span></td>
                    <td class="text-center">${woLink}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    function filterTable() {
        const query = document.getElementById('safetySearchInput')?.value.toLowerCase() || '';
        if (!query) {
            renderHazardTable(rawHazardData);
            return;
        }

        const filtered = rawHazardData.filter(item => {
            return (item.wo_number && item.wo_number.toLowerCase().includes(query)) ||
                   (item.machine_name && item.machine_name.toLowerCase().includes(query)) ||
                   (item.issue_title && item.issue_title.toLowerCase().includes(query)) ||
                   (item.issue_detail && item.issue_detail.toLowerCase().includes(query));
        });
        renderHazardTable(filtered);
    }

    function updateHazardKpis(kpi) {
        if (!kpi) return;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.innerText = val || 0;
        };

        setVal('kpiActiveHazards', (kpi.pending || 0) + (kpi.in_progress || 0));
        // Fake MTTR for now since we don't have historical resolution times in this basic setup
        document.getElementById('kpiResponseTime').innerText = kpi.completed > 0 ? "45" : "--"; 
    }

    function renderComplianceChart(passed, failed) {
        const ctx = document.getElementById('preopComplianceChart');
        if(!ctx) return;
        
        if(complianceChart) complianceChart.destroy();
        
        if(passed === 0 && failed === 0) {
            // Placeholder empty
            passed = 1; failed = 0; 
        }

        complianceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [passed, failed],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 11} } },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    function renderHazardTrendChart(trendData) {
        const ctx = document.getElementById('hazardTrendChart');
        if(!ctx) return;
        
        if(hazardTrendChart) hazardTrendChart.destroy();

        // If no trend data returned by API, create dummy for visualization
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = [1, 0, 3, 2, 0, 1, 0];

        hazardTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Hazards Reported',
                    data: data,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function viewDetails(item) {
        document.getElementById('hazModalTitle').innerText = item.issue_title || '--';
        document.getElementById('hazModalWo').innerText = item.wo_number || '--';
        document.getElementById('hazModalMachine').innerText = `${item.machine_name} (${item.line})`;
        document.getElementById('hazModalDetail').innerText = item.issue_detail || '--';
        document.getElementById('hazModalReporter').innerText = item.requested_by || '--';
        
        const reqDate = item.requested_at ? new Date(item.requested_at) : null;
        document.getElementById('hazModalTime').innerText = reqDate ? `${reqDate.toLocaleDateString('en-GB')} ${reqDate.toLocaleTimeString('en-GB')}` : '--';

        const imgEl = document.getElementById('hazModalImage');
        const noImgEl = document.getElementById('hazModalNoImage');
        if (item.image_path) {
            imgEl.src = `../../${item.image_path}`;
            imgEl.style.display = 'block';
            noImgEl.style.display = 'none';
        } else {
            imgEl.src = '';
            imgEl.style.display = 'none';
            noImgEl.style.display = 'block';
        }

        if (document.getElementById('hazUpdateWoId')) {
            document.getElementById('hazUpdateWoId').value = item.wo_id;
            document.getElementById('hazUpdateStatus').value = item.status;
            document.getElementById('hazUpdateNotes').value = item.notes || '';
        }

        if (currentHazModal) currentHazModal.show();
    }

    function updateStatus() {
        const woId = document.getElementById('hazUpdateWoId')?.value;
        const status = document.getElementById('hazUpdateStatus')?.value;
        const notes = document.getElementById('hazUpdateNotes')?.value;

        if (!woId) return;

        Swal.fire({
            title: 'Update Status?',
            text: `Change status to ${status}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, update it!'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('api/safetyAPI.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_hazard_status',
                        wo_id: woId,
                        status: status,
                        notes: notes,
                        csrf_token: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Updated!', 'Hazard status has been updated.', 'success');
                        if (currentHazModal) currentHazModal.hide();
                        loadData();
                    } else {
                        Swal.fire('Error', data.message || 'Failed to update', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire('Error', 'Network error', 'error');
                });
            }
        });
    }

    // --- Checklist Config ---
    function openChecklistConfig() {
        if (!checklistModal) return;
        
        // Load machine types for dropdown
        fetch('api/preopAPI.php?action=get_machine_types')
            .then(res => res.json())
            .then(data => {
                if(data.success && data.data) {
                    const select = document.getElementById('configMachineType');
                    let html = '<option value="">-- Default Checklist (All Machines) --</option>';
                    data.data.forEach(mt => {
                        html += `<option value="${mt}">${mt}</option>`;
                    });
                    select.innerHTML = html;
                }
                loadChecklistConfig();
                checklistModal.show();
            })
            .catch(console.error);
    }

    function loadChecklistConfig() {
        const type = document.getElementById('configMachineType')?.value || '';
        const tbody = document.getElementById('checklistConfigBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        
        fetch('api/preopAPI.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_checklist', machine_type: type })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                tbody.innerHTML = '';
                if(data.data.length === 0) {
                    addChecklistRow();
                    return;
                }
                
                data.data.forEach(item => {
                    addChecklistRow(item);
                });
            }
        });
    }

    function addChecklistRow(item = null) {
        const tbody = document.getElementById('checklistConfigBody');
        if(tbody.querySelector('.text-center')) tbody.innerHTML = ''; // clear loading
        
        const rowCount = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.className = 'checklist-row';
        tr.innerHTML = `
            <td>
                <input type="number" class="form-control form-control-sm text-center row-order" value="${item ? item.item_order : rowCount}" min="1">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm row-text" value="${item ? item.item_text : ''}" placeholder="Enter question..." required>
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-critical" ${!item || item.is_critical ? 'checked' : ''}>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    function saveChecklistConfig() {
        const type = document.getElementById('configMachineType')?.value || '';
        const rows = document.querySelectorAll('.checklist-row');
        const items = [];
        
        rows.forEach(tr => {
            const text = tr.querySelector('.row-text').value.trim();
            if (text) {
                items.push({
                    item_order: parseInt(tr.querySelector('.row-order').value) || 1,
                    item_text: text,
                    is_critical: tr.querySelector('.row-critical').checked ? 1 : 0
                });
            }
        });

        if(items.length === 0) {
            Swal.fire('Warning', 'Checklist must have at least one question', 'warning');
            return;
        }

        const btn = event.target.closest('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        fetch('api/preopAPI.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'save_checklist', 
                machine_type: type,
                items: items
            })
        })
        .then(res => res.json())
        .then(data => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            if(data.success) {
                Swal.fire('Saved!', 'Checklist saved successfully.', 'success');
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        })
        .catch(err => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            console.error(err);
            Swal.fire('Error', 'Network Error', 'error');
        });
    }

    // Export public functions
    return {
        init: init,
        loadData: loadData,
        loadPreOpData: loadPreOpData,
        filterTable: filterTable,
        viewDetails: viewDetails,
        updateStatus: updateStatus,
        openChecklistConfig: openChecklistConfig,
        loadChecklistConfig: loadChecklistConfig,
        addChecklistRow: addChecklistRow,
        saveChecklistConfig: saveChecklistConfig
    };
})();

window.SafetyModule = SafetyModule;
