<script>
function loadConcessionList() {
    const tbody = document.getElementById('concessionBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
    
    fetch('./api/concession_api.php?action=list')
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No records found.</td></tr>';
                    return;
                }
                
                let html = '';
                res.data.forEach(req => {
                    let statusBadge = '<span class="badge bg-secondary">PENDING</span>';
                    if (req.status === 'PENDING_APPROVAL') statusBadge = '<span class="badge bg-warning text-dark">WAITING APPROVAL</span>';
                    if (req.status === 'APPROVED') statusBadge = '<span class="badge bg-success">APPROVED</span>';
                    if (req.status === 'REJECTED') statusBadge = '<span class="badge bg-danger">REJECTED</span>';

                    html += `
                        <tr>
                            <td class="px-3 fw-bold text-primary">${req.request_no}</td>
                            <td>${req.request_date}</td>
                            <td>
                                <div><strong>${req.subject}</strong></div>
                                <div class="small text-muted">${req.part_name}</div>
                            </td>
                            <td class="fw-bold">${req.qty ? Number(req.qty).toLocaleString() : '-'}</td>
                            <td>${statusBadge}</td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-outline-primary" onclick="viewConcession(${req.id})" title="View Details">
                                    <i class="fas fa-search"></i>
                                </button>
                                <a class="btn btn-sm btn-outline-secondary ms-1" href="print_concession.php?id=${req.id}" target="_blank" title="Print PDF">
                                    <i class="fas fa-print"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        }).catch(err => {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Network Error</td></tr>';
        });
}

function openConcessionModal() {
    document.getElementById('formConcession').reset();
    document.getElementById('formConcession').classList.remove('was-validated');
    const modal = new bootstrap.Modal(document.getElementById('concessionModal'));
    modal.show();
}

function saveConcession() {
    const form = document.getElementById('formConcession');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const formData = new FormData(form);
    fetch('./api/concession_api.php?action=create', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            Swal.fire({icon:'success', title:'Success', text: res.message, timer:2000, showConfirmButton:false});
            bootstrap.Modal.getInstance(document.getElementById('concessionModal')).hide();
            loadConcessionList();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function viewConcession(id) {
    fetch(`./api/concession_api.php?action=get&id=${id}`)
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            const data = res.data;
            document.getElementById('detailModalTitle').innerText = 'Request No: ' + data.request_no;
            
            let html = `
                <table class="table table-bordered table-sm mb-3">
                    <tr><th width="30%" class="bg-light">Issued By</th><td>${data.issued_by_dept}</td></tr>
                    <tr><th class="bg-light">Request To</th><td>${data.request_to}</td></tr>
                    <tr><th class="bg-light">Date</th><td>${data.request_date}</td></tr>
                    <tr><th class="bg-light">Subject</th><td><strong>${data.subject}</strong></td></tr>
                    <tr><th class="bg-light">Part Name</th><td>${data.part_name} (${data.part_no})</td></tr>
                    <tr><th class="bg-light">Qty</th><td>${data.qty}</td></tr>
                    <tr><th class="bg-light">Difference</th><td>${data.difference_detail}</td></tr>
                    <tr><th class="bg-light">Reason</th><td>${data.reason_for_adopt}</td></tr>
                    <tr><th class="bg-light">Root Cause</th><td>${data.root_cause}</td></tr>
                    <tr><th class="bg-light">Tentative Measure</th><td class="text-warning">${data.measure_tentative}</td></tr>
                    <tr><th class="bg-light">Permanent Measure</th><td class="text-success">${data.measure_permanent}</td></tr>
                </table>
                
                <h6 class="fw-bold mt-4">Approvals</h6>
                <table class="table table-bordered text-center">
                    <thead class="bg-light">
                        <tr>
                            <th>Approver 1</th>
                            <th>Approver 2</th>
                            <th>Approver 3</th>
                            <th>Approver 4</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${renderApproval(data.approver_1_name, data.approver_1_status, data.approver_1_date)}</td>
                            <td>${renderApproval(data.approver_2_name, data.approver_2_status, data.approver_2_date)}</td>
                            <td>${renderApproval(data.approver_3_name, data.approver_3_status, data.approver_3_date)}</td>
                            <td>${renderApproval(data.approver_4_name, data.approver_4_status, data.approver_4_date)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
            
            document.getElementById('concessionDetailContent').innerHTML = html;
            
            // Build footer actions (Approve buttons) based on status
            let footerHtml = `
                <a href="print_concession.php?id=${data.id}" target="_blank" class="btn btn-outline-secondary me-auto">
                    <i class="fas fa-print me-1"></i> Print PDF
                </a>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;
            if(data.status !== 'APPROVED' && data.status !== 'REJECTED') {
                // Find next pending approver level
                let nextLevel = 1;
                if(data.approver_1_status === 'Approve') nextLevel = 2;
                if(data.approver_2_status === 'Approve') nextLevel = 3;
                if(data.approver_3_status === 'Approve') nextLevel = 4;
                
                footerHtml += `
                    <button type="button" class="btn btn-danger" onclick="approveConcession(${data.id}, ${nextLevel}, 'Not Approve')"><i class="fas fa-times me-1"></i> Reject (L${nextLevel})</button>
                    <button type="button" class="btn btn-success" onclick="approveConcession(${data.id}, ${nextLevel}, 'Approve')"><i class="fas fa-check me-1"></i> Approve (L${nextLevel})</button>
                `;
            }
            document.getElementById('concessionDetailFooter').innerHTML = footerHtml;
            
            const modal = new bootstrap.Modal(document.getElementById('concessionDetailModal'));
            modal.show();
        }
    });
}

function renderApproval(name, status, date) {
    if (!status) return '<span class="text-muted small">Pending...</span>';
    let icon = status === 'Approve' ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-times-circle text-danger"></i>';
    return `
        <div>${icon} ${status}</div>
        <div class="small fw-bold">${name}</div>
        <div class="small text-muted">${date}</div>
    `;
}

function approveConcession(id, level, status) {
    Swal.fire({
        title: 'Confirm Action',
        text: `Are you sure you want to ${status} this request?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, proceed'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', id);
            formData.append('level', level);
            formData.append('status', status);
            
            fetch('./api/concession_api.php?action=approve', {
                method: 'POST',
                body: formData
            }).then(r => r.json()).then(res => {
                if(res.success) {
                    Swal.fire({icon:'success', title:'Updated', timer:1500, showConfirmButton:false});
                    bootstrap.Modal.getInstance(document.getElementById('concessionDetailModal')).hide();
                    loadConcessionList();
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // We bind tab shown event to load data
    const scheduleTab = document.getElementById('schedule-tab');
    if(scheduleTab) {
        scheduleTab.addEventListener('shown.bs.tab', function (e) {
            loadQASchedule();
        });
    }
    
    const concessionTab = document.getElementById('concession-tab');
    if(concessionTab) {
        concessionTab.addEventListener('shown.bs.tab', function (e) {
            loadConcessionList();
        });
    }
});
</script>
