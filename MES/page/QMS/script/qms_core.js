// MES/page/QMS/script/qms_core.js

// ==========================================
// SECURITY UTILITIES
// ==========================================
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function appendCsrfToken(formData) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    return formData;
}

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let allCasesData = []; 
let currentStatusFilter = 'ALL'; 
let searchTimer; 
let caseDetailOffcanvasInstance = null; 
let isDataReady = false;

document.addEventListener('DOMContentLoaded', function() {
    fetchCasesData();
    loadMasterData();

    const offcanvasEl = document.getElementById('caseDetailOffcanvas');
    if(offcanvasEl) {
        caseDetailOffcanvasInstance = new bootstrap.Offcanvas(offcanvasEl); 
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (!isDataReady) return; 

            const tbody = document.querySelector('#caseTable tbody');
            const mobileContainer = document.getElementById('mobileCaseContainer');
            
            if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังค้นหา...</td></tr>';
            if(mobileContainer) mobileContainer.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>กำลังค้นหา...</div>';

            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                renderTable(); 
            }, 300); 
        });
    }

    initForms();
});

// ==========================================
// 1. DATA FETCHING & FILTERING
// ==========================================
function fetchCasesData() {
    isDataReady = false; 

    const tbody = document.querySelector('#caseTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>กำลังโหลดข้อมูล...</td></tr>';

    fetch(`./api/qms_data.php?action=list`)
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            allCasesData = res.data.list.map(c => {
                c._searchStr = `${c.car_no || ''} ${c.customer_name || ''} ${c.product_name || ''}`.toLowerCase();
                return c;
            });
            
            const stats = res.data.stats;
            if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = stats.total || 0;
            if (document.getElementById('stat-ncr')) document.getElementById('stat-ncr').innerText = stats.ncr_count || 0;
            if (document.getElementById('stat-car')) document.getElementById('stat-car').innerText = stats.car_count || 0;
            if (document.getElementById('stat-reply')) document.getElementById('stat-reply').innerText = stats.reply_count || 0;
            if (document.getElementById('stat-closed')) document.getElementById('stat-closed').innerText = stats.closed_count || 0;

            renderTable(); 
            
            setTimeout(() => { isDataReady = true; }, 100); 
        } else {
            Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
        }
    })
    .catch(err => {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger"><i class="fas fa-wifi me-2"></i>ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</td></tr>';
    });
}

function loadMasterData() {
    fetch('./api/qms_data.php?action=master_data')
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            
            // 1. จัดการ Line
            const selectLine = document.getElementById('select_line');
            if(selectLine) {
                let lineHTML = '<option value="" selected disabled>-- เลือกไลน์ผลิต --</option>';
                lineHTML += `<option value="Incoming">Incoming</option>`;
                res.data.lines.forEach(l => {
                    lineHTML += `<option value="${escapeHTML(l.line_name)}">${escapeHTML(l.line_name)}</option>`;
                });
                selectLine.innerHTML = lineHTML;
            }

            // 2. จัดการ Items 
            const dataList = document.getElementById('item_list');
            if(dataList) {
                let itemHTML = '';
                res.data.items.forEach(i => {
                    itemHTML += `<option value="${escapeHTML(i.part_no)} | ${escapeHTML(i.name)}">`;
                });
                dataList.innerHTML = itemHTML; 
            }

            // 3. จัดการ Customers 
            const customerList = document.getElementById('customer_list');
            if(customerList && res.data.customers) {
                let custHTML = '';
                res.data.customers.forEach(c => {
                    custHTML += `<option value="${escapeHTML(c.customer_name)}">`;
                });
                customerList.innerHTML = custHTML;
            }
        }
    })
    .catch(err => console.error("Error loading master data:", err));
}

function setFilter(status) {
    if (!isDataReady || currentStatusFilter === status) return; 

    currentStatusFilter = status;
    
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
    
    let cardId = 'card-all';
    if(status === 'NCR_CREATED') cardId = 'card-ncr';
    if(status === 'SENT_TO_CUSTOMER') cardId = 'card-sent';
    if(status === 'CUSTOMER_REPLIED') cardId = 'card-replied';
    if(status === 'CLOSED') cardId = 'card-closed';
    
    const activeCard = document.getElementById(cardId);
    if(activeCard) activeCard.classList.add('active');
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            renderTable(); 
        }, 0);
    });
}

// ==========================================
// 1.1 วาดตารางและ Mobile Cards (XSS Secured)
// ==========================================
function renderTable() {
    const tbody = document.querySelector('#caseTable tbody');
    const mobileContainer = document.getElementById('mobileCaseContainer');
    if (!tbody || !mobileContainer) return;

    const searchTerm = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
    
    const filteredData = allCasesData.filter(c => {
        const matchStatus = (currentStatusFilter === 'ALL' || c.current_status === currentStatusFilter);
        const matchSearch = searchTerm === '' || c._searchStr.includes(searchTerm);
        return matchStatus && matchSearch;
    });

    if(filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted bg-light"><i class="fas fa-folder-open fa-2x mb-2 text-secondary opacity-50"></i><br>ไม่พบรายการที่ตรงกับเงื่อนไข</td></tr>`;
        mobileContainer.innerHTML = `<div class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-2x mb-2"></i><br>ไม่พบรายการ</div>`;
        return;
    }

    const RENDER_LIMIT = 100;
    const renderData = filteredData.slice(0, RENDER_LIMIT);

    let tableHTML = '';
    let mobileHTML = '';

    renderData.forEach(c => {
        let badgeClass = 'bg-secondary text-white';
        let cardBorder = '#6c757d'; 
        let statusText = escapeHTML(c.current_status.replace(/_/g, ' '));

        if(c.current_status === 'NCR_CREATED') { badgeClass = 'bg-danger text-white'; cardBorder = '#dc3545'; statusText = 'NEW NCR'; }
        else if(c.current_status === 'SENT_TO_CUSTOMER') { badgeClass = 'bg-warning text-dark border border-warning'; cardBorder = '#ffc107'; statusText = 'WAITING CAR'; }
        else if(c.current_status === 'CUSTOMER_REPLIED') { badgeClass = 'bg-info text-dark border border-info'; cardBorder = '#0dcaf0'; statusText = 'READY TO CLAIM'; }
        else if(c.current_status === 'CLOSED') { badgeClass = 'bg-success text-white'; cardBorder = '#198754'; }

        tableHTML += `
            <tr onclick="openCaseDetail(${c.case_id})">
                <td><span class="fw-bold text-primary">${escapeHTML(c.car_no)}</span></td>
                <td class="text-muted small">${c.case_date ? new Date(c.case_date).toLocaleDateString('th-TH') : '-'}</td>
                <td>
                    <div class="fw-bold text-dark">${escapeHTML(c.customer_name)}</div>
                    <div class="small text-muted">${escapeHTML(c.product_name)}</div>
                </td>
                <td>
                    <div class="fw-bold text-secondary">${escapeHTML(c.defect_type) || '-'}</div>
                    <div class="small text-danger">Defect Qty: ${c.defect_qty ? Number(c.defect_qty).toLocaleString() : 0}</div>
                </td>
                <td class="text-center"><span class="badge badge-status ${badgeClass}">${statusText}</span></td>
                <td><div class="small fw-bold text-secondary"><i class="fas fa-user-circle me-1"></i>${escapeHTML(c.created_by_name) || '-'}</div></td>
            </tr>
        `;

        mobileHTML += `
            <div class="mobile-case-card" style="border-left-color: ${cardBorder}" onclick="openCaseDetail(${c.case_id})">
                <div class="m-card-header">
                    <span class="fw-bold text-primary">${escapeHTML(c.car_no)}</span>
                    <span class="badge ${badgeClass}">${statusText}</span>
                </div>
                <div class="m-card-body">
                    <div class="fw-bold text-dark mb-1">${escapeHTML(c.customer_name)}</div>
                    <div class="small text-muted mb-2"><i class="fas fa-cube me-1"></i> ${escapeHTML(c.product_name)}</div>
                    <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                        <div><span class="text-danger fw-bold">${escapeHTML(c.defect_type) || '-'}</span></div>
                        <div class="small fw-bold">Qty: ${c.defect_qty ? Number(c.defect_qty).toLocaleString() : 0}</div>
                    </div>
                </div>
            </div>
        `;
    });

    if (filteredData.length > RENDER_LIMIT) {
        tableHTML += `<tr><td colspan="6" class="text-center py-3 text-muted bg-light small"><i class="fas fa-info-circle me-1"></i> แสดงผล ${RENDER_LIMIT} รายการล่าสุดจากทั้งหมด ${filteredData.length} รายการ (ค้นหาเพื่อดูเพิ่มเติม)</td></tr>`;
        mobileHTML += `<div class="text-center py-3 text-muted small"><i class="fas fa-info-circle me-1"></i> แสดง ${RENDER_LIMIT} จาก ${filteredData.length} รายการ</div>`;
    }

    tbody.innerHTML = tableHTML;
    mobileContainer.innerHTML = mobileHTML;
}

// ==========================================
// 2. CASE DETAIL (Offcanvas)
// ==========================================
function openCaseDetail(caseId) {
    if(caseDetailOffcanvasInstance) {
        caseDetailOffcanvasInstance.show();
    }

    document.getElementById('offcanvas_car_no').innerText = 'Loading...';
    document.getElementById('offcanvas_status').innerText = '...';
    document.getElementById('offcanvas_status').className = 'badge bg-secondary text-white border';

    fetch(`./api/qms_data.php?action=detail&case_id=${caseId}`)
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            const data = res.data;
            
            document.getElementById('offcanvas_car_no').innerText = data.car_no;
            
            let badgeClass = 'bg-secondary text-white';
            let statusText = escapeHTML(data.current_status.replace(/_/g, ' '));
            if(data.current_status === 'NCR_CREATED') { badgeClass = 'bg-danger text-white'; statusText = 'NEW NCR'; }
            else if(data.current_status === 'SENT_TO_CUSTOMER') { badgeClass = 'bg-warning text-dark'; statusText = 'WAITING CAR'; }
            else if(data.current_status === 'CUSTOMER_REPLIED') { badgeClass = 'bg-info text-dark'; statusText = 'READY TO CLAIM'; }
            else if(data.current_status === 'CLOSED') { badgeClass = 'bg-success text-white'; }
            
            document.getElementById('offcanvas_status').innerText = statusText;
            document.getElementById('offcanvas_status').className = `badge ${badgeClass} border`;

            if(document.getElementById('issue_case_id')) document.getElementById('issue_case_id').value = data.case_id;
            if(document.getElementById('claim_case_id')) document.getElementById('claim_case_id').value = data.case_id;

            // innerText ปลอดภัยจาก XSS อยู่แล้ว แต่คลุมไว้เพื่อความชัวร์
            const setText = (id, text) => { if(document.getElementById(id)) document.getElementById(id).innerText = text || '-'; };
            
            setText('view_customer', data.customer_name);
            setText('view_product', data.product_name);
            setText('view_line', data.production_line);
            setText('view_model', data.product_model);
            setText('view_defect', data.defect_type);
            setText('view_qty', data.defect_qty ? Number(data.defect_qty).toLocaleString() + ' PCS' : '-');
            setText('view_desc', data.defect_description);
            setText('view_prod_date', data.production_date);
            setText('view_shift', data.found_shift);
            setText('view_lot', data.lot_no);
            setText('view_return_container', data.return_container_no);
            setText('view_expected_qty', data.expected_return_qty ? Number(data.expected_return_qty).toLocaleString() + ' PCS' : '-');
            setText('view_invoice_no', data.invoice_no);
            setText('view_found_by', data.found_by_type);
            setText('view_issuer_name', data.issue_by_name);
            setText('view_issuer_position', data.issuer_position);

            const gallery = document.getElementById('gallery_ncr');
            if (gallery) {
                let imgHTML = '';
                if (data.images && data.images.length > 0) {
                    data.images.forEach(img => {
                        const safeUrl = encodeURI('../../' + img.file_path);
                        imgHTML += `
                            <div class="col-4">
                                <a href="${safeUrl}" target="_blank" class="ncr-image-wrapper">
                                    <img src="${safeUrl}" alt="Evidence">
                                </a>
                            </div>`;
                    });
                } else {
                    imgHTML = '<div class="col-12 text-muted small text-center py-4 bg-light rounded border border-dashed">- ไม่มีการแนบรูปภาพ -</div>';
                }
                gallery.innerHTML = imgHTML;
            }

            setText('view_rc_category', data.root_cause_category);
            setText('view_root_cause', data.customer_root_cause);
            setText('view_action_plan', data.customer_action_plan);
            
            setText('view_disposition', data.disposition);
            setText('view_final_qty', data.final_qty ? Number(data.final_qty).toLocaleString() : '-');
            setText('view_cost', data.cost_estimation > 0 ? Number(data.cost_estimation).toLocaleString(undefined, {minimumFractionDigits: 2}) + ' THB' : '-');
            if (data.closed_at) setText('claim_closed_date', new Date(data.closed_at).toLocaleString('th-TH'));

            manageUIZones(data);

        } else {
            Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
            if(caseDetailOffcanvasInstance) caseDetailOffcanvasInstance.hide();
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    });
}

function manageUIZones(data) {
    const status = data.current_status;
    const hide = (id) => { if(document.getElementById(id)) document.getElementById(id).classList.add('d-none'); };
    const show = (id) => { if(document.getElementById(id)) document.getElementById(id).classList.remove('d-none'); };

    hide('zone_issue_car');
    hide('zone_waiting_customer');
    hide('zone_customer_replied');
    hide('claim_locked');
    hide('claim_form_zone');
    hide('claim_closed_zone');

    if (status === 'NCR_CREATED') {
        show('zone_issue_car');
        show('claim_locked');
    } 
    else if (status === 'SENT_TO_CUSTOMER') {
        show('zone_waiting_customer');
        show('claim_locked');
        if(document.getElementById('customer_link')) {
            const currentHost = window.location.origin + window.location.pathname.replace('qmsDashboard.php', '');
            document.getElementById('customer_link').value = `${currentHost}guest/reply.php?token=${data.access_token}`;
        }
    } 
    else if (status === 'CUSTOMER_REPLIED') {
        show('zone_customer_replied');
        show('claim_form_zone');
        
        // เช็คว่าลูกค้ากรอกตู้มาหรือยัง
        const hasContainer = (data.return_container_no && data.return_container_no.trim() !== '');
        const alertMissing = document.getElementById('missing_container_alert');
        const btnClose = document.getElementById('btnCloseClaimBtn');
        
        if (!hasContainer) {
            // ถ้ายังไม่กรอก -> โชว์ Alert สีเหลือง และล็อกปุ่มปิดงาน
            if(alertMissing) alertMissing.classList.remove('d-none');
            if(btnClose) btnClose.disabled = true;
        } else {
            // ถ้ากรอกแล้ว -> ซ่อน Alert และปลดล็อกปุ่มปิดงาน
            if(alertMissing) alertMissing.classList.add('d-none');
            if(btnClose) btnClose.disabled = false;
        }

        if(document.getElementById('claim_final_qty')) document.getElementById('claim_final_qty').value = Number(data.defect_qty); 
    }
    else if (status === 'CLOSED') {
        show('zone_customer_replied');
        show('claim_closed_zone');
    }
}

// ==========================================
// 3. FORM SUBMISSIONS & EVENT BINDINGS (CSRF Applied)
// ==========================================
function initForms() {
    
    const formNCR = document.getElementById('formNCR');
    if(formNCR) {
        formNCR.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            const btn = this.querySelector('button[type="submit"]') || document.querySelector(`button[form="${this.id}"]`);
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังบันทึก...';

            let formData = new FormData(this);
            formData.append('action', 'create_ncr');
            formData = appendCsrfToken(formData); // แทรก CSRF Token

            fetch('./api/qms_action.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(res => {
                if(res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: `${res.message} (เลขที่: ${res.data.car_no})`,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('ncrModal'));
                        if (modal) modal.hide();
                        formNCR.reset();
                        formNCR.classList.remove('was-validated');
                        
                        const previewContainer = document.getElementById('imagePreviewContainer');
                        const uploadBox = document.getElementById('uploadBox');
                        if(previewContainer) previewContainer.innerHTML = '';
                        if(uploadBox) {
                            uploadBox.classList.remove('border-success', 'bg-success', 'bg-opacity-10');
                            uploadBox.querySelector('h6').innerHTML = `แตะเพื่อถ่ายรูป หรือ เลือกรูปภาพ`;
                        }

                        fetchCasesData(); 
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
                }
            })
            .catch(err => {
                console.error(err);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
        });
    }

    const formIssueCAR = document.getElementById('formIssueCAR');
    if(formIssueCAR) {
        formIssueCAR.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            Swal.fire({
                title: 'ยืนยันการออก CAR?',
                text: "ระบบจะสร้างลิงก์ตอบกลับสำหรับส่งให้ลูกค้า",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    const btn = this.querySelector('button[type="submit"]') || document.querySelector(`button[form="${this.id}"]`);
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังดำเนินการ...';

                    let formData = new FormData(this);
                    formData.append('action', 'issue_car');
                    formData = appendCsrfToken(formData); // แทรก CSRF Token

                    fetch('./api/qms_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if(res.success) {
                            Swal.fire('สำเร็จ', res.message, 'success');
                            openCaseDetail(document.getElementById('issue_case_id').value);
                            fetchCasesData(); 
                        } else {
                            Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    })
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        });
    }

    const formClaim = document.getElementById('formCloseClaim');
    if(formClaim) {
        formClaim.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            Swal.fire({
                title: 'ยืนยันการปิดงานเคลม?',
                text: "เมื่อปิดแล้วจะไม่สามารถแก้ไขข้อมูลการเคลมได้อีก",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ยืนยันปิดงาน',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    const btn = this.querySelector('button[type="submit"]') || document.querySelector(`button[form="${this.id}"]`);
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังบันทึก...';

                    let formData = new FormData(this);
                    formData.append('action', 'close_claim');
                    formData = appendCsrfToken(formData); // แทรก CSRF Token

                    fetch('./api/qms_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if(res.success) {
                            Swal.fire('สำเร็จ', res.message, 'success');
                            openCaseDetail(document.getElementById('claim_case_id').value);
                            fetchCasesData(); 
                        } else {
                            Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    })
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        });
    }
}

// ==========================================
// 4. UTILITIES
// ==========================================
function copyLink() {
    const copyText = document.getElementById("customer_link");
    if (!copyText || !copyText.value) return;
    
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'คัดลอกลิงก์สำเร็จ',
        showConfirmButton: false,
        timer: 1500
    });
}

function printDoc(type) {
    const caseIdInput = document.getElementById('issue_case_id') || document.getElementById('claim_case_id');
    const caseId = caseIdInput ? caseIdInput.value : null;
    
    if(!caseId) {
        Swal.fire('ข้อผิดพลาด', 'ไม่พบรหัสเอกสาร', 'error');
        return;
    }

    let url = '';
    if (type === 'ncr') url = `./print_ncr.php?id=${caseId}`;
    if (type === 'car') url = `./print_car.php?id=${caseId}`;
    if (type === 'claim') url = `./print_claim.php?id=${caseId}`;

    if(url) window.open(url, '_blank');
}

function openNCRModal() {
    const formNCR = document.getElementById('formNCR');
    if (formNCR) {
        formNCR.reset(); 
        formNCR.classList.remove('was-validated'); 
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        const uploadBox = document.getElementById('uploadBox');
        if(previewContainer) previewContainer.innerHTML = '';
        if(uploadBox) {
            uploadBox.classList.remove('border-success', 'bg-success', 'bg-opacity-10');
            uploadBox.querySelector('h6').innerHTML = `แตะเพื่อถ่ายรูป หรือ เลือกรูปภาพ`;
        }
    }
    const myModal = new bootstrap.Modal(document.getElementById('ncrModal'));
    myModal.show();
}

function rejectCAR() {
    const caseId = document.getElementById('claim_case_id').value;
    Swal.fire({
        title: 'ยืนยันตีกลับให้ลูกค้าแก้ไข?',
        text: "สถานะจะเปลี่ยนกลับเป็น 'WAITING CAR' เพื่อให้ลูกค้าปรับปรุงแผน 8D หรือระบุข้อมูลเพิ่มเติม",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'ยืนยันตีกลับ (Reject)',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('action', 'reject_car');
            formData.append('case_id', caseId);
            appendCsrfToken(formData); // ดึงมาจากฟังก์ชัน Security ที่เราทำไว้รอบที่แล้ว

            fetch('./api/qms_action.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(res => {
                if(res.success) {
                    Swal.fire('สำเร็จ', res.message, 'success');
                    openCaseDetail(caseId);
                    fetchCasesData();
                } else {
                    Swal.fire('ข้อผิดพลาด', escapeHTML(res.message), 'error');
                }
            });
        }
    });
}

// ==========================================
// ระบบสะสมรูปภาพสำหรับ Mobile Camera (Max 3 รูป)
// ==========================================
let ncrPhotoArray = []; // ตัวแปรเก็บสะสมไฟล์รูปภาพ
const maxNcrPhotos = 3;

document.getElementById('ncrFileInput').addEventListener('change', function(e) {
    const fileInput = this;
    const newFiles = Array.from(fileInput.files);
    const dt = new DataTransfer();

    // 1. เช็คลิมิต (รูปเก่า + รูปใหม่ ต้องไม่เกิน 3)
    if (ncrPhotoArray.length + newFiles.length > maxNcrPhotos) {
        Swal.fire({
            icon: 'warning',
            title: 'แจ้งเตือน',
            text: `คุณสามารถแนบรูปภาพได้สูงสุด ${maxNcrPhotos} รูปเท่านั้นครับ`
        });
        
        // คืนค่า input ให้เป็นรูปเก่าก่อนกดถ่าย (ป้องกันรูปเก่าหาย)
        ncrPhotoArray.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        return;
    }

    // 2. นำไฟล์ใหม่มาต่อท้ายไฟล์เก่า
    newFiles.forEach(file => {
        ncrPhotoArray.push(file);
    });

    // 3. ยัดไฟล์ทั้งหมดกลับเข้าไปใน <input type="file"> เพื่อเตรียม Submit
    ncrPhotoArray.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;

    // 4. สั่งวาดรูปตัวอย่าง (Preview)
    renderNcrPreviews();
});

// ฟังก์ชันวาดรูป Preview พร้อมปุ่มกากบาทลบรูป
function renderNcrPreviews() {
    const previewContainer = document.getElementById('imagePreviewContainer');
    previewContainer.innerHTML = ''; // ล้างของเก่า
    
    ncrPhotoArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgBox = document.createElement('div');
            // จัดกล่องให้อยู่ในแถวเดียวกัน มีขอบ และเว้นระยะสวยงาม
            imgBox.className = 'position-relative d-inline-block me-3 mb-2 border rounded p-1 bg-white shadow-sm';
            imgBox.innerHTML = `
                <img src="${e.target.result}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                <button type="button" class="btn btn-danger btn-sm position-absolute top-0 start-100 translate-middle rounded-circle shadow" 
                        style="width: 25px; height: 25px; padding: 0; line-height: 1; border: 2px solid white;" 
                        onclick="removeNcrPhoto(${index})">
                    <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                </button>
            `;
            previewContainer.appendChild(imgBox);
        }
        reader.readAsDataURL(file);
    });
}

// ฟังก์ชันลบรูป (ทำงานเมื่อกดปุ่มกากบาท)
window.removeNcrPhoto = function(index) {
    ncrPhotoArray.splice(index, 1); // เอาออกจาก Array
    
    // อัปเดต <input type="file"> ใหม่
    const dt = new DataTransfer();
    ncrPhotoArray.forEach(file => dt.items.add(file));
    document.getElementById('ncrFileInput').files = dt.files;
    
    // วาด Preview ใหม่อีกรอบ
    renderNcrPreviews();
};

// 💡 อย่าลืมเคลียร์ Array ตอนที่กดปิด Modal หรือ Submit เสร็จแล้ว
document.getElementById('ncrModal').addEventListener('hidden.bs.modal', function () {
    ncrPhotoArray = [];
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('formNCR').reset();
});

// ==========================================
// ฟังก์ชันสำหรับปิด Offcanvas (บังคับปิด)
// ==========================================
function closeCaseDetail() {
    // 1. ถ้ามี Instance ที่เราสร้างไว้ตอนโหลดหน้าเว็บ ให้สั่ง hide()
    if (typeof caseDetailOffcanvasInstance !== 'undefined' && caseDetailOffcanvasInstance !== null) {
        caseDetailOffcanvasInstance.hide();
    } else {
        // 2. แผนสำรอง (Fallback) เผื่อหา Instance ไม่เจอ
        const offcanvasEl = document.getElementById('caseDetailOffcanvas');
        if (offcanvasEl) {
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
            bsOffcanvas.hide();
        }
    }
}