document.addEventListener('DOMContentLoaded', function() {
    // 1. โหลดข้อมูลเมื่อเปิดหน้า
    loadCaseTable();

    // 2. ค้นหา
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        if(e.key === 'Enter') loadCaseTable();
    });

    // 3. จัดการฟอร์มต่างๆ
    initForms();
});

function initForms() {
    // A. Form: Issue CAR (QC สร้างลิงก์)
    const formIssueCAR = document.getElementById('formIssueCAR');
    if(formIssueCAR) {
        formIssueCAR.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            if(!confirm('ยืนยันการออกใบ CAR ให้ลูกค้า?')) return;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const formData = new FormData(this);
            formData.append('action', 'issue_car');

            fetch('./api/car_action.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('✅ ออกใบ CAR สำเร็จ!\nระบบพร้อมสำหรับส่งลิงก์ให้ลูกค้าแล้ว');
                    
                    const caseId = document.getElementById('issue_case_id').value;
                    openCaseDetail(caseId); 
                    loadCaseTable();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Connection Error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
        });
    }

    // B. Form: Close Claim (QC ปิดงาน)
    const formCloseClaim = document.getElementById('formCloseClaim');
    if(formCloseClaim) {
        formCloseClaim.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }

            if(!confirm('ยืนยันการปิดงานเคลม? \n(ข้อมูลจะถูกบันทึกและไม่สามารถแก้ไขได้)')) return;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Closing...';

            const formData = new FormData(this);
            formData.append('action', 'close_claim');

            fetch('./api/claim_action.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('✅ ปิดงานเรียบร้อยแล้ว!');
                    
                    const caseId = document.getElementById('claim_case_id').value;
                    openCaseDetail(caseId);
                    loadCaseTable();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Connection Error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
        });
    }

    // C. Form: NCR (ผลิตแจ้งปัญหา)
    const formNCR = document.getElementById('formNCR');
    if(formNCR) {
        formNCR.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                e.stopPropagation();
                this.classList.add('was-validated');
                return;
            }
            if(!confirm('ยืนยันการแจ้งปัญหาคุณภาพ?')) return;

            const btnSave = document.getElementById('btnSaveNCR');
            const originalText = btnSave.innerHTML;
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังบันทึก...';

            const formData = new FormData(this);
            formData.append('action', 'create_ncr');

            fetch('./api/ncr_action.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('ncrModal'));
                    modal.hide();
                    alert('✅ แจ้งปัญหาสำเร็จ! \nCase No: ' + data.car_no);
                    this.reset();
                    this.classList.remove('was-validated');
                    loadCaseTable(); 
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('❌ เชื่อมต่อ Server ไม่ได้');
            })
            .finally(() => {
                btnSave.disabled = false;
                btnSave.innerHTML = originalText;
            });
        });
    }
}

// ฟังก์ชันเปิด Modal NCR
function openNCRModal() {
    document.getElementById('formNCR').reset();
    document.getElementById('formNCR').classList.remove('was-validated');
    const modal = new bootstrap.Modal(document.getElementById('ncrModal'));
    modal.show();
}

// ฟังก์ชันโหลดตาราง
function loadCaseTable() {
    const search = document.getElementById('searchInput').value;
    const tbody = document.querySelector('#caseTable tbody');
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>กำลังโหลดข้อมูล...</td></tr>`;

    fetch(`./api/get_cases.php?search=${search}`)
        .then(res => res.json())
        .then(resp => {
            if(resp.status === 'success') {
                renderTable(resp.data);
                updateStats(resp.stats);
            } else {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${resp.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">โหลดข้อมูลล้มเหลว</td></tr>`;
        });
}

function renderTable(data) {
    const tbody = document.querySelector('#caseTable tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">ไม่พบข้อมูลใบแจ้งปัญหา</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        switch(row.current_status) {
            case 'NCR_CREATED': 
                statusBadge = '<span class="badge bg-danger">รอ QC ตรวจสอบ</span>'; break;
            case 'SENT_TO_CUSTOMER': 
                statusBadge = '<span class="badge bg-warning text-dark">รอลูกค้าตอบ</span>'; break;
            case 'CUSTOMER_REPLIED': 
                statusBadge = '<span class="badge bg-primary">ลูกค้าตอบแล้ว</span>'; break;
            case 'CLOSED': 
                statusBadge = '<span class="badge bg-success">ปิดงานแล้ว</span>'; break;
            default: 
                statusBadge = `<span class="badge bg-secondary">${row.current_status}</span>`;
        }

        const dateObj = new Date(row.case_date);
        const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

        tr.innerHTML = `
            <td><div class="fw-bold text-primary">${row.car_no}</div></td>
            <td>${dateStr}</td>
            <td>
                <div class="fw-bold">${row.customer_name}</div>
                <small class="text-muted">${row.product_name || '-'}</small>
            </td>
            <td>
                <span class="text-danger fw-bold">${row.defect_type || '-'}</span> 
                <span class="text-muted">(${row.defect_qty} pcs)</span>
            </td>
            <td>${statusBadge}</td>
            <td><small>${row.created_by_name}</small></td>
        `;
        tr.onclick = () => openCaseDetail(row.case_id);
        tbody.appendChild(tr);
    });
}

function updateStats(stats) {
    if(stats) {
        document.getElementById('stat-ncr').innerText = stats.ncr_count || 0;
        document.getElementById('stat-car').innerText = stats.car_count || 0;
        document.getElementById('stat-claim').innerText = (stats.reply_count || 0); 
        document.getElementById('stat-closed').innerText = stats.closed_count || 0;
    }
}

// ฟังก์ชันเปิดหน้ารายละเอียด (หัวใจสำคัญ)
function openCaseDetail(caseId) {
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('caseDetailOffcanvas'));
    offcanvas.show();

    // Reset UI
    document.getElementById('offcanvas_car_no').innerText = 'Loading...';
    document.getElementById('gallery_ncr').innerHTML = '';
    
    // Hide Zones
    document.getElementById('zone_issue_car').classList.add('d-none');
    document.getElementById('zone_waiting_customer').classList.add('d-none');
    document.getElementById('zone_customer_replied').classList.add('d-none');
    
    document.getElementById('claim_locked').classList.add('d-none');
    document.getElementById('claim_form_zone').classList.add('d-none');
    document.getElementById('claim_closed_zone').classList.add('d-none');

    // Fetch Data
    fetch(`./api/get_case_detail.php?case_id=${caseId}`)
        .then(res => res.json())
        .then(resp => {
            if(resp.status === 'success') {
                const data = resp.data;
                const images = resp.images;

                // 1. Header & NCR Info
                document.getElementById('offcanvas_car_no').innerText = data.car_no;
                document.getElementById('offcanvas_status').innerText = data.current_status;
                document.getElementById('view_customer').innerText = data.customer_name;
                document.getElementById('view_product').innerText = data.product_name;
                document.getElementById('view_defect').innerText = `${data.defect_type} (${data.defect_qty})`;
                document.getElementById('view_desc').innerText = data.defect_description || '-';
                document.getElementById('view_prod_date').innerText = data.production_date || '-';
                document.getElementById('view_shift').innerText = data.found_shift || '-';
                document.getElementById('view_lot').innerText = data.lot_no || '-';

                // NCR Images
                const gallery = document.getElementById('gallery_ncr');
                const ncrImages = images.filter(img => img.doc_stage === 'NCR');
                if(ncrImages.length > 0) {
                    ncrImages.forEach(img => {
                        gallery.innerHTML += `
                            <div class="col-4">
                                <a href="${img.file_path}" target="_blank">
                                    <img src="${img.file_path}" class="img-fluid rounded border" style="height:80px; object-fit:cover; width:100%;">
                                </a>
                            </div>`;
                    });
                } else {
                    gallery.innerHTML = '<span class="text-muted small">ไม่มีรูปภาพ</span>';
                }

                // 2. CAR Tab Logic
                document.getElementById('issue_case_id').value = data.case_id;

                if (data.current_status === 'NCR_CREATED') {
                    document.getElementById('zone_issue_car').classList.remove('d-none');
                } 
                else if (data.current_status === 'SENT_TO_CUSTOMER') {
                    document.getElementById('zone_waiting_customer').classList.remove('d-none');
                    // สร้าง Link แบบ Dynamic (แก้ 404)
                    const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                    const link = `${window.location.origin}${currentPath}/guest/reply.php?token=${data.access_token}`;
                    document.getElementById('customer_link').value = link;
                }
                else if (data.current_status === 'CUSTOMER_REPLIED' || data.current_status === 'CLOSED') {
                    document.getElementById('zone_customer_replied').classList.remove('d-none');
                    document.getElementById('view_root_cause').innerText = data.customer_root_cause;
                    document.getElementById('view_action_plan').innerText = data.customer_action_plan;
                }

                // 3. Claim Tab Logic
                document.getElementById('claim_case_id').value = data.case_id;

                if (data.current_status === 'CLOSED') {
                    document.getElementById('claim_closed_zone').classList.remove('d-none');
                    document.getElementById('view_disposition').innerText = data.disposition || '-';
                    document.getElementById('view_final_qty').innerText = (data.final_qty || 0) + ' PCS';
                    
                    const cost = parseFloat(data.cost_estimation || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
                    document.getElementById('view_cost').innerText = '฿' + cost;
                    
                    if(data.closed_at) {
                        const closeDate = new Date(data.closed_at);
                        document.getElementById('claim_closed_date').innerText = 'Date: ' + closeDate.toLocaleDateString('th-TH');
                    }
                } else if (data.current_status === 'CUSTOMER_REPLIED') {
                    document.getElementById('claim_form_zone').classList.remove('d-none');
                    document.getElementById('claim_final_qty').value = data.defect_qty; 
                } else {
                    document.getElementById('claim_locked').classList.remove('d-none');
                }

            } else {
                alert('Error loading case');
            }
        });
}

function copyLink() {
    const copyText = document.getElementById("customer_link");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Copied Link: " + copyText.value);
}

// ฟังก์ชัน Print เอกสารตามประเภท
function printDoc(type) {
    // ดึง ID จาก Tab ไหนก็ได้ที่มีอยู่ (เช่น issue_case_id)
    const caseId = document.getElementById('issue_case_id').value;
    
    if(!caseId) {
        alert('Error: Case ID not found');
        return;
    }

    let url = '';
    if (type === 'ncr') url = `./print_ncr.php?id=${caseId}`;
    if (type === 'car') url = `./print_car.php?id=${caseId}`;
    if (type === 'claim') url = `./print_claim.php?id=${caseId}`;

    if (url) window.open(url, '_blank');
}