// MES/page/QMS/script/qms_core.js

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let allCasesData = []; // เก็บข้อมูล Master ไว้สำหรับ Filter ในหน้าจอ
let currentStatusFilter = 'ALL'; // สถานะ Filter ปัจจุบัน

document.addEventListener('DOMContentLoaded', function() {
    // 1. โหลดข้อมูลเมื่อเปิดหน้า
    fetchCasesData();

    // 2. ระบบค้นหา (Real-time Filtering - พิมพ์ปุ๊บหาปั๊บ)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderTable(); 
        });
    }

    loadMasterData();
    // 3. เริ่มต้นระบบจัดการฟอร์มทั้งหมด
    initForms();
});

// ==========================================
// 1. DATA FETCHING & FILTERING
// ==========================================
function fetchCasesData() {
    const tbody = document.querySelector('#caseTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>กำลังโหลดข้อมูล...</td></tr>';

    fetch(`./api/qms_data.php?action=list`)
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            allCasesData = res.data.list; 
            
            // อัปเดตตัวเลขบน Card
            const stats = res.data.stats;
            if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = stats.total || 0;
            if (document.getElementById('stat-ncr')) document.getElementById('stat-ncr').innerText = stats.ncr_count || 0;
            if (document.getElementById('stat-car')) document.getElementById('stat-car').innerText = stats.car_count || 0;
            if (document.getElementById('stat-reply')) document.getElementById('stat-reply').innerText = stats.reply_count || 0;
            if (document.getElementById('stat-closed')) document.getElementById('stat-closed').innerText = stats.closed_count || 0;

            renderTable(); 
        } else {
            Swal.fire('ข้อผิดพลาด', res.message, 'error');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
        }
    })
    .catch(err => {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger"><i class="fas fa-wifi me-2"></i>ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</td></tr>';
    });
}

function setFilter(status) {
    currentStatusFilter = status;
    
    // เปลี่ยนสถานะ Active ของ Card
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
    
    let cardId = 'card-all';
    if(status === 'NCR_CREATED') cardId = 'card-ncr';
    if(status === 'SENT_TO_CUSTOMER') cardId = 'card-sent';
    if(status === 'CUSTOMER_REPLIED') cardId = 'card-replied';
    if(status === 'CLOSED') cardId = 'card-closed';
    
    const activeCard = document.getElementById(cardId);
    if(activeCard) activeCard.classList.add('active');
    
    renderTable(); 
}

// ==========================================
// 1.1 วาดตารางและ Mobile Cards
// ==========================================
function renderTable() {
    const tbody = document.querySelector('#caseTable tbody');
    const mobileContainer = document.getElementById('mobileCaseContainer');
    if (!tbody || !mobileContainer) return;

    const searchTerm = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';

    const filteredData = allCasesData.filter(c => {
        const matchStatus = (currentStatusFilter === 'ALL' || c.current_status === currentStatusFilter);
        const matchSearch = searchTerm === '' || 
                            (c.car_no && c.car_no.toLowerCase().includes(searchTerm)) ||
                            (c.customer_name && c.customer_name.toLowerCase().includes(searchTerm)) ||
                            (c.product_name && c.product_name.toLowerCase().includes(searchTerm));
        return matchStatus && matchSearch;
    });

    if(filteredData.length === 0) {
        const emptyMsg = `<tr><td colspan="6" class="text-center py-5 text-muted bg-light"><i class="fas fa-folder-open fa-2x mb-2 text-secondary opacity-50"></i><br>ไม่พบรายการที่ตรงกับเงื่อนไข</td></tr>`;
        tbody.innerHTML = emptyMsg;
        mobileContainer.innerHTML = `<div class="text-center py-5 text-muted"><i class="fas fa-folder-open fa-2x mb-2"></i><br>ไม่พบรายการ</div>`;
        return;
    }

    filteredData.forEach(c => {
        // --- Badge Setup ---
        let badgeClass = 'bg-secondary text-white';
        let cardBorder = '#6c757d'; // สีขอบ Card Mobile
        let statusText = c.current_status.replace(/_/g, ' ');

        if(c.current_status === 'NCR_CREATED') { badgeClass = 'bg-danger text-white'; cardBorder = '#dc3545'; statusText = 'NEW NCR'; }
        else if(c.current_status === 'SENT_TO_CUSTOMER') { badgeClass = 'bg-warning text-dark'; cardBorder = '#ffc107'; statusText = 'WAITING CAR'; }
        else if(c.current_status === 'CUSTOMER_REPLIED') { badgeClass = 'bg-info text-dark'; cardBorder = '#0dcaf0'; statusText = 'READY TO CLAIM'; }
        else if(c.current_status === 'CLOSED') { badgeClass = 'bg-success text-white'; cardBorder = '#198754'; }

        // --- 1. วาด Desktop Table Row ---
        const tr = document.createElement('tr');
        tr.onclick = () => openCaseDetail(c.case_id);
        tr.innerHTML = `
            <td><span class="fw-bold text-primary">${c.car_no}</span></td>
            <td class="text-muted small">${c.case_date ? new Date(c.case_date).toLocaleDateString('th-TH') : '-'}</td>
            <td>
                <div class="fw-bold text-dark">${c.customer_name}</div>
                <div class="small text-muted">${c.product_name}</div>
            </td>
            <td>
                <div class="fw-bold text-secondary">${c.defect_type || '-'}</div>
                <div class="small text-danger">Defect Qty: ${c.defect_qty ? Number(c.defect_qty).toLocaleString() : 0}</div>
            </td>
            <td class="text-center"><span class="badge ${badgeClass} px-2 py-1">${statusText}</span></td>
            <td><div class="small fw-bold text-secondary"><i class="fas fa-user-circle me-1"></i>${c.created_by_name || '-'}</div></td>
        `;
        tbody.appendChild(tr);

        // --- 2. วาด Mobile Card ---
        const mCard = document.createElement('div');
        mCard.className = 'mobile-case-card';
        mCard.style.borderLeftColor = cardBorder;
        mCard.onclick = () => openCaseDetail(c.case_id);
        mCard.innerHTML = `
            <div class="m-card-header">
                <span class="fw-bold text-primary">${c.car_no}</span>
                <span class="badge ${badgeClass}">${statusText}</span>
            </div>
            <div class="m-card-body">
                <div class="fw-bold text-dark mb-1">${c.customer_name}</div>
                <div class="small text-muted mb-2"><i class="fas fa-cube me-1"></i> ${c.product_name}</div>
                <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                    <div><span class="text-danger fw-bold">${c.defect_type || '-'}</span></div>
                    <div class="small fw-bold">Qty: ${c.defect_qty ? Number(c.defect_qty).toLocaleString() : 0}</div>
                </div>
            </div>
        `;
        mobileContainer.appendChild(mCard);
    });
}

// ==========================================
// 2. CASE DETAIL (Offcanvas)
// ==========================================
function openCaseDetail(caseId) {
    const bsOffcanvas = new bootstrap.Offcanvas(document.getElementById('caseDetailOffcanvas'));
    bsOffcanvas.show();

    document.getElementById('offcanvas_car_no').innerText = 'Loading...';
    document.getElementById('offcanvas_status').innerText = '...';
    document.getElementById('offcanvas_status').className = 'badge bg-secondary text-white border';

    fetch(`./api/qms_data.php?action=detail&case_id=${caseId}`)
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            const data = res.data;
            
            // Header
            document.getElementById('offcanvas_car_no').innerText = data.car_no;
            
            let badgeClass = 'bg-secondary text-white';
            let statusText = data.current_status.replace(/_/g, ' ');
            if(data.current_status === 'NCR_CREATED') { badgeClass = 'bg-danger text-white'; statusText = 'NEW NCR'; }
            else if(data.current_status === 'SENT_TO_CUSTOMER') { badgeClass = 'bg-warning text-dark'; statusText = 'WAITING CAR'; }
            else if(data.current_status === 'CUSTOMER_REPLIED') { badgeClass = 'bg-info text-dark'; statusText = 'READY TO CLAIM'; }
            else if(data.current_status === 'CLOSED') { badgeClass = 'bg-success text-white'; }
            
            document.getElementById('offcanvas_status').innerText = statusText;
            document.getElementById('offcanvas_status').className = `badge ${badgeClass} border`;

            // Hidden Inputs
            if(document.getElementById('issue_case_id')) document.getElementById('issue_case_id').value = data.case_id;
            if(document.getElementById('claim_case_id')) document.getElementById('claim_case_id').value = data.case_id;

            // Bind Data
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

            // Images
            const gallery = document.getElementById('gallery_ncr');
            if (gallery) {
                gallery.innerHTML = ''; 
                if (data.images && data.images.length > 0) {
                    data.images.forEach(img => {
                        gallery.innerHTML += `<div class="col-6"><a href="${img.file_path}" target="_blank"><img src="${img.file_path}" class="img-fluid rounded border border-secondary border-opacity-25 shadow-sm" style="height:120px; object-fit:cover; width:100%;"></a></div>`;
                    });
                } else {
                    gallery.innerHTML = '<div class="col-12 text-muted small text-center py-3 bg-light rounded border border-dashed">- ไม่มีการแนบรูปภาพ -</div>';
                }
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
            Swal.fire('ข้อผิดพลาด', res.message, 'error');
            bsOffcanvas.hide();
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
        if(document.getElementById('claim_final_qty')) document.getElementById('claim_final_qty').value = Number(data.defect_qty); 
    } 
    else if (status === 'CLOSED') {
        show('zone_customer_replied');
        show('claim_closed_zone');
    }
}

// ==========================================
// 3. FORM SUBMISSIONS
// ==========================================
function initForms() {
    
    // [A] Form: Create NCR
    const formNCR = document.getElementById('formNCR');
    if(formNCR) {
        formNCR.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // เช็ค Validation พื้นฐาน (รวมถึงเช็คว่าแนบรูปหรือยัง)
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            // ค้นหาปุ่ม Submit ไม่ว่าจะอยู่ในฟอร์มหรืออยู่ส่วน Footer
            const btn = this.querySelector('button[type="submit"]') || document.querySelector(`button[form="${this.id}"]`);
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังบันทึก...';

            const formData = new FormData(this);
            formData.append('action', 'create_ncr');

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
                        fetchCasesData(); // ดึงข้อมูลใหม่แทน loadCaseTable
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message, 'error');
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

    // [B] Form: Issue CAR
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

                    const formData = new FormData(this);
                    formData.append('action', 'issue_car');

                    fetch('./api/qms_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if(res.success) {
                            Swal.fire('สำเร็จ', res.message, 'success');
                            openCaseDetail(document.getElementById('issue_case_id').value);
                            fetchCasesData(); // ดึงข้อมูลใหม่แทน loadCaseTable
                        } else {
                            Swal.fire('ข้อผิดพลาด', res.message, 'error');
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

    // [C] Form: Close Claim
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

                    const formData = new FormData(this);
                    formData.append('action', 'close_claim');

                    fetch('./api/qms_action.php', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(res => {
                        if(res.success) {
                            Swal.fire('สำเร็จ', res.message, 'success');
                            openCaseDetail(document.getElementById('claim_case_id').value);
                            fetchCasesData(); // ดึงข้อมูลใหม่แทน loadCaseTable
                        } else {
                            Swal.fire('ข้อผิดพลาด', res.message, 'error');
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

// ==========================================
// 5. MODAL CONTROLLERS
// ==========================================
function openNCRModal() {
    const formNCR = document.getElementById('formNCR');
    if (formNCR) {
        formNCR.reset(); 
        formNCR.classList.remove('was-validated'); 
    }
    const myModal = new bootstrap.Modal(document.getElementById('ncrModal'));
    myModal.show();
}

// เติมฟังก์ชันนี้ต่อท้ายไฟล์ qms_core.js
function loadMasterData() {
    fetch('./api/qms_data.php?action=master_data')
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            // เติม Line
            const selectLine = document.getElementById('select_line');
            if(selectLine) {
                selectLine.innerHTML = '<option value="" selected disabled>-- เลือกไลน์ผลิต --</option>';
                res.data.lines.forEach(l => {
                    selectLine.innerHTML += `<option value="${l.line_name}">${l.line_name}</option>`;
                });
            }
            // เติม Product Datalist
            const dataList = document.getElementById('item_list');
            if(dataList) {
                dataList.innerHTML = '';
                res.data.items.forEach(i => {
                    dataList.innerHTML += `<option value="${i.part_no} | ${i.name}">`;
                });
            }
        }
    });
}

// ==========================================
// 6. IMAGE PREVIEW (Mobile Upload UX)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('ncrFileInput');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const uploadBox = document.getElementById('uploadBox');

    if(fileInput && previewContainer) {
        fileInput.addEventListener('change', function() {
            previewContainer.innerHTML = ''; // เคลียร์ของเก่า
            
            if (this.files.length > 0) {
                // เปลี่ยนสีกล่องให้รู้ว่าเลือกไฟล์แล้ว
                uploadBox.classList.add('border-success', 'bg-success', 'bg-opacity-10');
                uploadBox.classList.remove('border-primary', 'bg-light');
                uploadBox.querySelector('h6').innerHTML = `<i class="fas fa-check-circle me-1"></i> เลือกรูปแล้ว ${this.files.length} รูป`;
                
                // วนลูปวาด Preview
                Array.from(this.files).forEach(file => {
                    if(file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'preview-img-wrapper';
                            wrapper.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                            previewContainer.appendChild(wrapper);
                        }
                        reader.readAsDataURL(file);
                    }
                });
            } else {
                // Reset กล่อง
                uploadBox.classList.remove('border-success', 'bg-success', 'bg-opacity-10');
                uploadBox.classList.add('border-primary', 'bg-light');
                uploadBox.querySelector('h6').innerHTML = `แตะเพื่อถ่ายรูป หรือ เลือกรูปภาพ`;
            }
        });
    }
});

// ดักตอนเปิด Modal ให้เคลียร์รูปเก่าออกด้วย
function openNCRModal() {
    const formNCR = document.getElementById('formNCR');
    if (formNCR) {
        formNCR.reset(); 
        formNCR.classList.remove('was-validated'); 
        
        // Clear Preview
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