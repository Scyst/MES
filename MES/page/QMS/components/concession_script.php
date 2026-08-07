<script>
function loadConcessionList() {
    const tbody = document.getElementById('concessionBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
    
    fetch('./api/concession_api.php?action=list')
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No records found.</td></tr>';
                    return;
                }
                
                let html = '';
                res.data.forEach(req => {
                    html += `
                        <tr style="cursor: pointer;" title="View & Print">
                            <td class="text-center" onclick="event.stopPropagation()">
                                <input type="checkbox" class="form-check-input concession-checkbox" value="${req.id}" onchange="updateConcessionBulkCount()">
                            </td>
                            <td class="px-3 fw-bold text-primary" onclick="viewConcession(${req.id})">${req.request_no}</td>
                            <td onclick="viewConcession(${req.id})">${req.request_date}</td>
                            <td class="fw-bold" onclick="viewConcession(${req.id})">${req.subject || '-'}</td>
                            <td onclick="viewConcession(${req.id})" style="font-size: 0.85rem;">
                                <div class="text-muted">Name: <span class="text-dark">${req.part_name || '-'}</span></div>
                                <div class="text-muted mt-1">No: <span class="text-dark">${req.part_no || '-'}</span> | Model: <span class="text-dark">${req.model_name || '-'}</span></div>
                            </td>
                            <td onclick="viewConcession(${req.id})" style="font-size: 0.85rem;">
                                <div>Order: <span class="fw-bold text-dark">${req.order_no || '-'}</span></div>
                                <div class="mt-1">Lot: <span class="text-dark">${req.lot_no || '-'}</span></div>
                            </td>
                            <td onclick="viewConcession(${req.id})">${req.issued_by_dept || '-'}</td>
                            <td onclick="viewConcession(${req.id})">${req.request_to || '-'}</td>
                            <td onclick="viewConcession(${req.id})">${req.person_name || '-'}</td>
                            <td class="fw-bold text-center align-middle" onclick="viewConcession(${req.id})">${req.qty ? Number(req.qty).toLocaleString() : '-'}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        }).catch(err => {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Network Error</td></tr>';
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
            `;
            
            document.getElementById('concessionDetailContent').innerHTML = html;
            
            // Build footer actions
            let footerHtml = `
                <a href="print_concession.php?ids=${data.id}" target="_blank" class="btn btn-outline-secondary me-auto">
                    <i class="fas fa-print me-1"></i> Print PDF
                </a>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;
            document.getElementById('concessionDetailFooter').innerHTML = footerHtml;
            
            const modal = new bootstrap.Modal(document.getElementById('concessionDetailModal'));
            modal.show();
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

function toggleSelectAllConcession(source) {
    const checkboxes = document.querySelectorAll('.concession-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateConcessionBulkCount();
}

function updateConcessionBulkCount() {
    const checkedBoxes = document.querySelectorAll('.concession-checkbox:checked');
    const allBoxes = document.querySelectorAll('.concession-checkbox');
    
    if (allBoxes.length > 0) {
        document.getElementById('selectAllConcession').checked = (checkedBoxes.length === allBoxes.length);
    } else {
        document.getElementById('selectAllConcession').checked = false;
    }
}

function bulkPrintConcession() {
    const checkedBoxes = document.querySelectorAll('.concession-checkbox:checked');
    if (checkedBoxes.length === 0) {
        Swal.fire('No selection', 'Please select at least one request to print.', 'info');
        return;
    }
    
    const ids = Array.from(checkedBoxes).map(cb => cb.value).join(',');
    window.open(`print_concession.php?ids=${ids}`, '_blank');
}
</script>
