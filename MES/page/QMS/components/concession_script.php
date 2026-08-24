<script>
function loadConcessionList() {
    const tbody = document.getElementById('concessionBody');
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
    
    fetch('./api/concession_api.php?action=list')
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">No records found.</td></tr>';
                    return;
                }
                
                let html = '';
                res.data.forEach(req => {
                    html += `
                        <tr style="cursor: pointer;" title="View & Print">
                            <td class="text-center" onclick="event.stopPropagation()">
                                <input type="checkbox" class="form-check-input concession-checkbox" value="${req.id}" onchange="updateConcessionBulkCount()">
                            </td>
                            <td class="px-3 fw-bold text-primary text-start" onclick="viewConcession(${req.id})">${req.request_no}</td>
                            <td class="text-center" onclick="viewConcession(${req.id})">${req.request_date}</td>
                            <td class="fw-bold text-start" onclick="viewConcession(${req.id})">${req.subject || '-'}</td>
                            <td class="text-start" onclick="viewConcession(${req.id})" style="font-size: 0.85rem;">
                                <div class="text-muted">Name: <span class="text-dark">${req.part_name || '-'}</span></div>
                                <div class="text-muted mt-1">No: <span class="text-dark">${req.part_no || '-'}</span> | Model: <span class="text-dark">${req.model_name || '-'}</span></div>
                            </td>
                            <td class="text-start" onclick="viewConcession(${req.id})" style="font-size: 0.85rem;">
                                <div>Order: <span class="fw-bold text-dark">${req.order_no || '-'}</span></div>
                                <div class="mt-1">Lot: <span class="text-dark">${req.lot_no || '-'}</span></div>
                            </td>
                            <td class="text-center" onclick="viewConcession(${req.id})">${req.issued_by_dept || '-'}</td>
                            <td class="text-center" onclick="viewConcession(${req.id})">${req.request_to || '-'}</td>
                            <td class="text-center" onclick="viewConcession(${req.id})">${req.person_name || '-'}</td>
                            <td class="fw-bold text-center align-middle" onclick="viewConcession(${req.id})">${req.qty ? Number(req.qty).toLocaleString() : '-'}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        }).catch(err => {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-danger">Network Error</td></tr>';
        });
}

function openConcessionModal() {
    document.getElementById('formConcession').reset();
    document.getElementById('formConcession').classList.remove('was-validated');
    document.getElementById('concession_id').value = '';
    document.getElementById('concession_action').value = 'create';
    document.getElementById('concessionModalTitle').innerHTML = '<i class="fas fa-file-alt me-2"></i>New Customer Concession Request';
    document.getElementById('concessionSubmitBtn').innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Request';
    
    const imageInput = document.getElementById('concessionImages');
    if (imageInput) imageInput.value = '';
    const preview = document.getElementById('concessionImagePreview');
    if (preview) preview.innerHTML = '';
    
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
    const action = document.getElementById('concession_action').value;
    fetch('./api/concession_api.php?action=' + action, {
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
                `;
                
            const images = [data.attached_image_1, data.attached_image_2, data.attached_image_3].filter(Boolean);
            if (images.length > 0) {
                html += `<tr><th class="bg-light">Attachments</th><td><div class="d-flex flex-wrap gap-2">`;
                images.forEach(img => {
                    html += `<a href="../../${img}" target="_blank"><img src="../../${img}" class="img-thumbnail shadow-sm" style="height: 100px; object-fit: cover; border-radius: 4px;" alt="Attachment"></a>`;
                });
                html += `</div></td></tr>`;
            }
            
            html += `</table>`;
            
            document.getElementById('concessionDetailContent').innerHTML = html;
            
            // Build footer actions
            let footerHtml = `
                <a href="print_concession.php?ids=${data.id}" target="_blank" class="btn btn-outline-secondary me-auto">
                    <i class="fas fa-print me-1"></i> Print PDF
                </a>
                <button type="button" class="btn btn-primary" onclick="editConcession(${data.id})"><i class="fas fa-edit me-1"></i> Edit</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;
            document.getElementById('concessionDetailFooter').innerHTML = footerHtml;
            
            const modal = new bootstrap.Modal(document.getElementById('concessionDetailModal'));
            modal.show();
        }
    });
}

function editConcession(id) {
    bootstrap.Modal.getInstance(document.getElementById('concessionDetailModal')).hide();
    
    fetch(`./api/concession_api.php?action=get&id=${id}`)
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            const data = res.data;
            document.getElementById('formConcession').reset();
            document.getElementById('formConcession').classList.remove('was-validated');
            
            document.getElementById('concession_id').value = data.id;
            document.getElementById('concession_action').value = 'update';
            document.getElementById('concessionModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Concession Request';
            document.getElementById('concessionSubmitBtn').innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
            
            const imageInput = document.getElementById('concessionImages');
            if (imageInput) imageInput.value = '';
            
            const preview = document.getElementById('concessionImagePreview');
            if (preview) {
                preview.innerHTML = '';
                ['attached_image_1', 'attached_image_2', 'attached_image_3'].forEach(key => {
                    if (data[key]) {
                        const img = document.createElement('img');
                        // Use base path for images
                        img.src = '../../' + data[key]; 
                        img.className = 'img-thumbnail shadow-sm';
                        img.style = 'height: 80px; object-fit: cover; border-radius: 4px;';
                        preview.appendChild(img);
                    }
                });
            }
            
            const form = document.getElementById('formConcession');
            for (const key in data) {
                if (form.elements[key]) {
                    form.elements[key].value = data[key];
                }
            }
            
            const modal = new bootstrap.Modal(document.getElementById('concessionModal'));
            modal.show();
        } else {
            Swal.fire('Error', res.message, 'error');
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

    const concessionImages = document.getElementById('concessionImages');
    if(concessionImages) {
        concessionImages.addEventListener('change', function(e) {
            const preview = document.getElementById('concessionImagePreview');
            preview.innerHTML = '';
            const files = Array.from(e.target.files);
            
            if (files.length > 3) {
                Swal.fire('Warning', 'You can only upload a maximum of 3 images.', 'warning');
                e.target.value = '';
                return;
            }
            
            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    Swal.fire('Warning', 'Image size must be less than 5MB.', 'warning');
                    e.target.value = '';
                    preview.innerHTML = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'img-thumbnail shadow-sm';
                    img.style = 'height: 80px; object-fit: cover; border-radius: 4px;';
                    preview.appendChild(img);
                }
                reader.readAsDataURL(file);
            });
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
