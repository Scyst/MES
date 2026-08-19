// e:\MES\MES\MES\page\PE\script\safetyModule.js
const SafetyModule = (function() {
    let rawData = [];
    let currentHazModal = null;

    function init() {
        if(document.getElementById('hazardModal')) {
            currentHazModal = new bootstrap.Modal(document.getElementById('hazardModal'));
        }
        loadData();
    }

    function loadData() {
        const status = document.getElementById('safetyStatusFilter')?.value || 'all';
        const tbody = document.getElementById('safetyTableBody');
        
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading data...</td></tr>`;

        fetch(`api/safetyAPI.php?action=get_hazard_reports&status=${status}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    rawData = data.data;
                    renderTable(rawData);
                    updateKpis(data.kpi);
                } else {
                    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error: ${data.message}</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Error fetching safety data:', error);
                if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Network Error</td></tr>`;
            });
    }

    function renderTable(data) {
        const tbody = document.getElementById('safetyTableBody');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hazard reports found</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            let badgeClass = 'bg-secondary';
            if (item.status === 'Pending') badgeClass = 'bg-warning text-dark';
            else if (item.status === 'In Progress') badgeClass = 'bg-info text-dark';
            else if (item.status === 'Completed') badgeClass = 'bg-success';
            else if (item.status === 'Cancelled') badgeClass = 'bg-dark';

            // Limit details text
            let shortDetail = item.issue_detail ? item.issue_detail.substring(0, 50) + (item.issue_detail.length > 50 ? '...' : '') : '-';

            html += `
                <tr class="align-middle">
                    <td class="fw-bold pe-text-primary">${item.wo_number}</td>
                    <td>
                        <div>${new Date(item.requested_at).toLocaleDateString('en-GB')}</div>
                        <div class="small text-muted">${new Date(item.requested_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${item.issue_title}</div>
                        <div class="small text-muted">${shortDetail}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${item.machine_name}</div>
                        <div class="small text-muted"><i class="fas fa-map-marker-alt me-1"></i>${item.line}</div>
                    </td>
                    <td>${item.requested_by}</td>
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

    function filterTable() {
        const query = document.getElementById('safetySearchInput')?.value.toLowerCase() || '';
        if (!query) {
            renderTable(rawData);
            return;
        }

        const filtered = rawData.filter(item => {
            return (item.wo_number && item.wo_number.toLowerCase().includes(query)) ||
                   (item.machine_name && item.machine_name.toLowerCase().includes(query)) ||
                   (item.issue_title && item.issue_title.toLowerCase().includes(query)) ||
                   (item.issue_detail && item.issue_detail.toLowerCase().includes(query));
        });
        renderTable(filtered);
    }

    function updateKpis(kpi) {
        if (!kpi) return;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.innerText = val || 0;
        };

        setVal('kpiTotalHazards', kpi.total);
        setVal('kpiPendingHazards', kpi.pending);
        setVal('kpiInProgressHazards', kpi.in_progress);
        setVal('kpiResolvedHazards', kpi.completed);
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

        // SweetAlert confirm
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
                    headers: {
                        'Content-Type': 'application/json',
                    },
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

    // Export public functions
    return {
        init: init,
        loadData: loadData,
        filterTable: filterTable,
        viewDetails: viewDetails,
        updateStatus: updateStatus
    };
})();

window.SafetyModule = SafetyModule;
