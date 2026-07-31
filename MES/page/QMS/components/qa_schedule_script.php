<script>
function loadQASchedule() {
    const date = document.getElementById('scheduleDateFilter').value;
    const tbody = document.getElementById('qaScheduleBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</td></tr>';
    
    fetch(`./api/qa_schedule_api.php?action=get_schedule&date=${date}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.stats) {
                    document.getElementById('stat-total').innerText = res.stats.total;
                    document.getElementById('stat-pending').innerText = res.stats.pending;
                    document.getElementById('stat-passed').innerText = res.stats.passed;
                    document.getElementById('stat-failed').innerText = res.stats.failed;
                }

                if(res.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No schedule for this date.</td></tr>';
                    return;
                }
                
                const todayDate = new Date();
                todayDate.setHours(0,0,0,0);
                const in2Days = new Date(todayDate);
                in2Days.setDate(todayDate.getDate() + 2);

                let html = '';
                res.data.forEach(po => {
                    let statusBadge = '<span class="badge bg-secondary">WAITING</span>';
                    if (po.inspection_status === 'IN_PROGRESS') statusBadge = '<span class="badge bg-warning text-dark">IN PROGRESS</span>';
                    if (po.inspection_status === 'DONE') statusBadge = '<span class="badge bg-success">DONE</span>';
                    
                    let resultBadge = '';
                    if (po.inspection_result === 'PASS') resultBadge = '<span class="badge bg-success ms-1">PASS</span>';
                    if (po.inspection_result === 'FAIL') resultBadge = '<span class="badge bg-danger ms-1">FAIL</span>';

                    let rowClass = '';
                    if (po.inspection_status !== 'DONE' && po.loading_date) {
                        const lDate = new Date(po.loading_date);
                        lDate.setHours(0,0,0,0);
                        if (lDate <= todayDate) {
                            rowClass = 'table-danger';
                        } else if (lDate <= in2Days) {
                            rowClass = 'table-warning';
                        }
                    }

                    let inspectorCell = po.qa_inspector ? 
                        `<span class="badge bg-info text-dark shadow-sm"><i class="fas fa-user-check me-1"></i>${po.qa_inspector}</span>` :
                        `<button class="btn btn-sm btn-outline-primary py-0 px-2 shadow-sm" onclick="event.stopPropagation(); assignToMe(${po.id})" style="font-size:0.75rem;">Assign to Me</button>`;

                    html += `
                        <tr class="${rowClass}" style="cursor: pointer;" onclick='openUpdateModal(${JSON.stringify(po).replace(/'/g, "&#39;")})' title="Click to view/update">
                            <td class="px-3 fw-bold text-primary">${po.po_number}</td>
                            <td>
                                <div><strong>${po.sku}</strong></div>
                                <div class="small text-muted">${po.description} (${po.color})</div>
                            </td>
                            <td class="fw-bold">${po.quantity ? Number(po.quantity).toLocaleString() : '-'}</td>
                            <td>${po.dc_location || '-'}</td>
                            <td>${po.loading_date ? po.loading_date : '-'}</td>
                            <td onclick="event.stopPropagation()">${inspectorCell}</td>
                            <td>${statusBadge} ${resultBadge}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        }).catch(err => {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Network Error</td></tr>';
        });
}

function openAddScheduleModal() {
    document.getElementById('searchPoInput').value = '';
    document.getElementById('poSearchResult').innerHTML = '';
    const modal = new bootstrap.Modal(document.getElementById('addScheduleModal'));
    modal.show();
}

function searchPO() {
    const term = document.getElementById('searchPoInput').value.trim();
    if (!term) return;
    
    const resultDiv = document.getElementById('poSearchResult');
    resultDiv.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin text-primary"></i> Searching...</div>';
    
    fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    resultDiv.innerHTML = '<div class="text-center py-3 text-muted">No PO found.</div>';
                    return;
                }
                
                let html = '';
                res.data.forEach(po => {
                    html += `
                        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1 fw-bold text-primary">${po.po_number} <span class="badge bg-info ms-2">${po.sku}</span></h6>
                                <small class="text-muted">Qty: ${po.quantity} | Loading: ${po.loading_date || '-'}</small>
                                ${po.inspection_date ? `<br><small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Already scheduled on ${po.inspection_date}</small>` : ''}
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="schedulePO(${po.id})">
                                <i class="fas fa-calendar-plus me-1"></i> Add
                            </button>
                        </div>
                    `;
                });
                resultDiv.innerHTML = html;
            }
        });
}

function schedulePO(id) {
    const date = document.getElementById('scheduleDateFilter').value;
    const formData = new FormData();
    formData.append('id', id);
    formData.append('schedule_date', date);
    
    fetch('./api/qa_schedule_api.php?action=schedule_po', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            Swal.fire({icon:'success', title:'Scheduled!', timer:1500, showConfirmButton:false});
            bootstrap.Modal.getInstance(document.getElementById('addScheduleModal')).hide();
            loadQASchedule();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function removeSchedule(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will remove the PO from the QA schedule.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove it'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', id);
            fetch('./api/qa_schedule_api.php?action=remove_schedule', {
                method: 'POST',
                body: formData
            }).then(r => r.json()).then(res => {
                if(res.success) {
                    Swal.fire({icon: 'success', title: 'Removed', timer: 1500, showConfirmButton: false});
                    const modalEl = document.getElementById('updateInspectionModal');
                    const modalInst = bootstrap.Modal.getInstance(modalEl);
                    if (modalInst) modalInst.hide();
                    loadQASchedule();
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            });
        }
    });
}

function openUpdateModal(po) {
    document.getElementById('inspect_po_id').value = po.id;
    document.getElementById('inspect_po_number').value = po.po_number + ' - ' + po.sku;
    document.getElementById('inspect_status').value = po.inspection_status || '';
    document.getElementById('inspect_result').value = po.inspection_result || '';
    document.getElementById('inspect_remark').value = po.remark || '';
    
    // Bind remove button inside the modal
    document.getElementById('btnRemoveScheduleModal').onclick = function() { removeSchedule(po.id); };
    
    const modal = new bootstrap.Modal(document.getElementById('updateInspectionModal'));
    modal.show();
}

function saveInspectionResult() {
    const form = document.getElementById('formUpdateInspection');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    fetch('./api/qa_schedule_api.php?action=update_result', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            Swal.fire({icon:'success', title:'Saved', timer:1500, showConfirmButton:false});
            bootstrap.Modal.getInstance(document.getElementById('updateInspectionModal')).hide();
            loadQASchedule();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    });
}

function assignToMe(poId) {
    const username = '<?php echo $_SESSION['username'] ?? "QA Staff"; ?>'; // Using session username
    
    Swal.fire({
        title: 'Assign to Me?',
        text: "You will be marked as the inspector for this PO.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, assign to me'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', poId);
            formData.append('qa_inspector', username);
            
            fetch('./api/qa_schedule_api.php?action=assign_inspector', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    Swal.fire({icon:'success', title:'Assigned', timer:1500, showConfirmButton:false});
                    loadQASchedule();
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            });
        }
    });
}

// Auto load on tab show or page load if needed. We will trigger it when tab is clicked.
document.addEventListener('DOMContentLoaded', () => {
    // If it's the active tab, load it.
    if(document.getElementById('qaScheduleBody')) {
        loadQASchedule();
    }
});

function changeScheduleDate(days) {
    const input = document.getElementById('scheduleDateFilter');
    if (!input.value) input.value = new Date().toISOString().split('T')[0];
    
    const date = new Date(input.value);
    date.setDate(date.getDate() + days);
    
    // Format YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    input.value = `${yyyy}-${mm}-${dd}`;
    loadQASchedule();
}

function setScheduleDateToday() {
    const input = document.getElementById('scheduleDateFilter');
    
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    input.value = `${yyyy}-${mm}-${dd}`;
    loadQASchedule();
}

// ---- INLINE ADD PO LOGIC ----
let inlineSearchTimeout = null;

function showInlineSearch() {
    document.getElementById('qaScheduleAddBtnRow').classList.add('d-none');
    document.getElementById('qaScheduleSearchRow').classList.remove('d-none');
    document.getElementById('inlineSearchPo').focus();
}

function hideInlineSearch() {
    document.getElementById('qaScheduleSearchRow').classList.add('d-none');
    document.getElementById('qaScheduleAddBtnRow').classList.remove('d-none');
    document.getElementById('inlineSearchPo').value = '';
    document.getElementById('inlineSuggestBox').style.display = 'none';
}

function debounceInlineSearch(event) {
    const term = event.target.value.trim();
    if (event.key === 'Enter') {
        // If Enter is pressed, try to trigger search or select first item if available
        triggerInlineSearch();
        return;
    }
    
    if (inlineSearchTimeout) {
        clearTimeout(inlineSearchTimeout);
    }
    
    if (term.length < 3) {
        document.getElementById('inlineSuggestBox').style.display = 'none';
        return;
    }
    
    inlineSearchTimeout = setTimeout(() => {
        triggerInlineSearch();
    }, 400);
}

function triggerInlineSearch() {
    const term = document.getElementById('inlineSearchPo').value.trim();
    if (term.length < 3) return;
    
    const box = document.getElementById('inlineSuggestBox');
    box.innerHTML = '<div class="list-group-item text-center"><i class="fas fa-spinner fa-spin text-primary"></i> Searching...</div>';
    box.style.display = 'block';
    
    fetch(`./api/qa_schedule_api.php?action=search_po&search=${encodeURIComponent(term)}`)
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                if(res.data.length === 0) {
                    box.innerHTML = '<div class="list-group-item text-muted text-center small">No PO found.</div>';
                    return;
                }
                
                let html = '';
                res.data.forEach(po => {
                    html += `
                        <button type="button" class="list-group-item list-group-item-action text-start p-2" onclick="inlineAddPo(${po.id}, '${po.po_number}')">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>${po.po_number}</strong>
                                <span class="badge bg-light text-dark border">${po.sku}</span>
                            </div>
                            <div class="small text-muted mt-1">
                                Qty: ${po.quantity} | Loading: ${po.loading_date || '-'}
                                ${po.inspection_date ? `<span class="text-warning ms-1"><i class="fas fa-exclamation-triangle"></i> Scheduled: ${po.inspection_date}</span>` : ''}
                            </div>
                        </button>
                    `;
                });
                box.innerHTML = html;
            }
        });
}

function inlineAddPo(id, poNumber) {
    document.getElementById('inlineSearchPo').value = poNumber; // Visual feedback
    document.getElementById('inlineSuggestBox').style.display = 'none';
    
    // Disable input while adding
    document.getElementById('inlineSearchPo').disabled = true;
    
    const date = document.getElementById('scheduleDateFilter').value;
    const formData = new FormData();
    formData.append('id', id);
    formData.append('schedule_date', date);
    
    fetch('./api/qa_schedule_api.php?action=schedule_po', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(res => {
        document.getElementById('inlineSearchPo').disabled = false;
        
        if(res.success) {
            // Success, reload table and hide search
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `${poNumber} added to schedule`,
                showConfirmButton: false,
                timer: 2000
            });
            
            loadQASchedule();
            hideInlineSearch();
        } else {
            Swal.fire('Error', res.message, 'error');
            document.getElementById('inlineSearchPo').value = '';
        }
    })
    .catch(() => {
        document.getElementById('inlineSearchPo').disabled = false;
        Swal.fire('Error', 'Network Error', 'error');
    });
}

// Hide autocomplete box and search row when clicking outside
document.addEventListener('click', function(e) {
    const searchRow = document.getElementById('qaScheduleSearchRow');
    const btnRow = document.getElementById('qaScheduleAddBtnRow');
    const box = document.getElementById('inlineSuggestBox');
    const input = document.getElementById('inlineSearchPo');
    
    // Handle suggestion box visibility
    if (box && input && !box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
    }
    
    // Handle search row visibility
    if (searchRow && !searchRow.classList.contains('d-none')) {
        if (!searchRow.contains(e.target) && (!btnRow || !btnRow.contains(e.target))) {
            // Only hide if suggestion box is also not clicked (already handled by contains on searchRow)
            // Wait, suggestBox is inside searchRow, so clicking it won't trigger this.
            hideInlineSearch();
        }
    }
});
</script>
