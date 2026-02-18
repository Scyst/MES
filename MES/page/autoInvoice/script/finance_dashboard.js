document.addEventListener('DOMContentLoaded', function() {
    // --- 1. Drag & Drop Logic ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    let selectedFile = null;
    let allInvoiceData = [];
    let currentStatusFilter = 'ALL';

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                selectedFile = e.dataTransfer.files[0];
                fileNameDisplay.textContent = selectedFile.name;
                document.getElementById('btnSubmit').disabled = false;
            }
        });
        fileInput.addEventListener('change', () => {
            if(fileInput.files.length) {
                selectedFile = fileInput.files[0];
                fileNameDisplay.textContent = selectedFile.name;
                document.getElementById('btnSubmit').disabled = false;
            }
        });
    }

    // --- 2. Load History Logic ---
    function loadHistory() {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;
        
        const start = encodeURIComponent(document.getElementById('filterStartDate')?.value || '');
        const end = encodeURIComponent(document.getElementById('filterEndDate')?.value || '');
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>';

        fetch(`api/api_invoice.php?action=get_history&start=${start}&end=${end}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    allInvoiceData = resData.data;
                    renderTable();
                    updateKPIs();
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">ดึงข้อมูลไม่สำเร็จ</td></tr>';
                }
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            });
    }

    function renderTable() {
        const tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';

        let filteredData = allInvoiceData;
        if (currentStatusFilter !== 'ALL') {
            filteredData = allInvoiceData.filter(inv => inv.doc_status === currentStatusFilter);
        }

        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">
                <i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูลในสถานะ ${currentStatusFilter}
            </td></tr>`;
            return;
        }

        filteredData.forEach(inv => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            if (inv.doc_status === 'Pending') statusBadge = `<span class="badge bg-warning text-dark px-2 py-1" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-clock"></i> Pending</span>`;
            else if (inv.doc_status === 'Exported') statusBadge = `<span class="badge bg-info text-dark px-2 py-1" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-plane-departure"></i> Exported</span>`;
            else if (inv.doc_status === 'Paid') statusBadge = `<span class="badge bg-success px-2 py-1" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-check-circle"></i> Paid</span>`;
            else if (inv.doc_status === 'Voided') statusBadge = `<span class="badge bg-danger px-2 py-1"><i class="fas fa-ban"></i> Voided</span>`;
            
            const rowClass = (inv.doc_status === 'Voided') ? 'table-light text-muted opacity-75' : '';

            tr.className = rowClass;
            tr.innerHTML = `
                <td class="fw-bold text-primary">${inv.invoice_no}</td>
                <td>
                    <div class="text-truncate fw-bold text-dark" style="max-width: 200px;" title="${inv.customer_name}">${inv.customer_name}</div>
                </td>
                <td>
                    <div class="small text-secondary"><i class="fas fa-box w-15px"></i> ${inv.container_no}</div>
                    <div class="small text-secondary"><i class="fas fa-ship w-15px"></i> <span class="text-truncate d-inline-block" style="max-width: 150px; vertical-align: bottom;">${inv.vessel}</span></div>
                </td>
                <td class="text-center small">
                    <span class="text-success fw-bold" title="ETD"><i class="fas fa-calendar-alt"></i> ${inv.etd_date}</span><br>
                    <span class="text-danger" title="ETA"><i class="fas fa-calendar-check"></i> ${inv.eta_date}</span>
                </td>
                <td class="text-end fw-bold text-dark">${inv.total_amount}</td>
                <td class="text-center">
                    ${statusBadge}<br>
                    <span class="badge border text-secondary mt-1">v.${inv.version}</span>
                </td>
                <td class="text-center text-muted small">${inv.created_at}</td>
                <td class="text-center">
                    <div class="btn-group shadow-sm">
                        <button type="button" class="btn btn-sm btn-light border text-info" onclick="viewVersions('${inv.invoice_no}')" title="History"><i class="fas fa-history"></i></button>
                        
                        ${inv.doc_status !== 'Voided' ? `<button type="button" class="btn btn-sm btn-light border text-warning" onclick="openWebEdit(${inv.id})" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                        
                        <a href="print_ci.php?id=${inv.id}" target="_blank" class="btn btn-sm btn-primary" title="Print CI">CI</a>
                        <a href="print_pl.php?id=${inv.id}" target="_blank" class="btn btn-sm btn-secondary" title="Print PL">PL</a>
                        
                        ${inv.doc_status !== 'Voided' ? `<button type="button" class="btn btn-sm btn-light border text-danger" onclick="voidInvoice('${inv.invoice_no}')" title="Void"><i class="fas fa-trash-alt"></i></button>` : ''}
                        
                        ${inv.doc_status === 'Voided' ? `<button type="button" class="btn btn-sm btn-light border text-success" onclick="restoreInvoice('${inv.invoice_no}')" title="Restore"><i class="fas fa-undo"></i></button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateKPIs() {
        document.getElementById('kpi-all').innerText = allInvoiceData.length;
        document.getElementById('kpi-pending').innerText = allInvoiceData.filter(d => d.doc_status === 'Pending').length;
        document.getElementById('kpi-exported').innerText = allInvoiceData.filter(d => d.doc_status === 'Exported').length;
        document.getElementById('kpi-paid').innerText = allInvoiceData.filter(d => d.doc_status === 'Paid').length;
        document.getElementById('kpi-voided').innerText = allInvoiceData.filter(d => d.doc_status === 'Voided').length;
    }

    window.filterStatus = function(status) {
        currentStatusFilter = status;
        document.querySelectorAll('.kpi-card').forEach(c => {
            c.classList.remove('active');
            c.style.borderWidth = '0 0 0 4px';
        });
        const activeCard = document.getElementById('card-' + status);
        if(activeCard) activeCard.classList.add('active');
        renderTable();
    };

    window.loadHistory = loadHistory;
    loadHistory();

    // --- 5. View Versions Logic ---
    window.viewVersions = function(invoiceNo) {
        const modalEl = document.getElementById('versionModal');
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('modalInvoiceNo').textContent = invoiceNo;
        
        const tbody = document.querySelector('#versionTable tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดประวัติ...</td></tr>';
        
        modal.show();

        fetch(`api/api_invoice.php?action=get_versions&invoice_no=${encodeURIComponent(invoiceNo)}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success && resData.data.length > 0) {
                    tbody.innerHTML = '';
                    resData.data.forEach(v => {
                        const isLatest = v.is_active == 1;
                        const badge = isLatest ? '<span class="badge bg-success">Latest</span>' : '<span class="badge bg-secondary">Old</span>';
                        const rowClass = isLatest ? '' : 'table-light text-muted'; 
                        
                        const tr = document.createElement('tr');
                        tr.className = rowClass;
                        tr.innerHTML = `
                            <td class="text-center fw-bold">v.${v.version}</td>
                            <td class="text-center">${v.created_at}</td>
                            <td class="text-end">${v.total_amount}</td>
                            <td>
                                <div>${v.remark}</div>
                                ${v.void_reason ? `<small class="text-danger"><i class="fas fa-exclamation-circle"></i> ${v.void_reason}</small>` : ''}
                            </td>
                            <td class="text-center">${badge}</td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <a href="print_ci.php?id=${v.id}" target="_blank" class="btn ${isLatest ? 'btn-outline-primary' : 'btn-outline-secondary'}" title="Print CI">CI</a>
                                    <a href="print_pl.php?id=${v.id}" target="_blank" class="btn ${isLatest ? 'btn-outline-primary' : 'btn-outline-secondary'}" title="Print PL">PL</a>
                                </div>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบประวัติการแก้ไข</td></tr>';
                }
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            });
    };

    // --- 3. Process Excel & Submit Logic (Client-Side Parsing) ---
    const formImport = document.getElementById('formImport');
    if (formImport) {
        formImport.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!selectedFile) return Swal.fire('Warning', 'กรุณาเลือกไฟล์ก่อน', 'warning');

            const btnSubmit = document.getElementById('btnSubmit');
            const btnSpinner = document.getElementById('btnSpinner');
            btnSubmit.disabled = true;
            btnSpinner.classList.remove('d-none');

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
                    
                    let invoices = {};
                    let idx = {};
                    let headerFound = false;
                    let currentInvNo = null;

                    // 📌 ฟังก์ชันแปลงวันที่ครอบจักรวาล (Excel, DD/MM/YYYY, YYYY-MM-DD)
                    const formatUniversalDate = (val) => {
                        if (!val) return '';
                        let d;
                        
                        // 1. กรณีเป็นตัวเลขจาก Excel (เช่น 46072)
                        if (!isNaN(val) && Number(val) > 10000) {
                            d = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
                        } 
                        // 2. กรณีมี / (เช่น 19/2/2026 หรือ 19/02/2026)
                        else if (typeof val === 'string' && val.includes('/')) {
                            let parts = val.split('/');
                            // แปลงจาก DD/MM/YYYY เป็น YYYY-MM-DD ให้ JS เข้าใจ
                            if (parts.length === 3 && parts[2].length === 4) {
                                d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                            } else {
                                d = new Date(val);
                            }
                        } 
                        // 3. กรณีเป็นวันที่ปกติ หรือ YYYY-MM-DD (จาก Date Picker บนเว็บ)
                        else {
                            d = new Date(val);
                        }

                        // ถ้าแปลงเป็น Date สำเร็จ ให้จัด Format เป็น "MONTH DD, YYYY"
                        if (!isNaN(d.getTime())) {
                            const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = months[d.getMonth()];
                            const year = d.getFullYear();
                            return `${month} ${day}, ${year}`; // รูปแบบเป้าหมาย
                        }
                        return String(val).toUpperCase(); // ถ้ามั่วจัดๆ คืนค่าเดิมไป
                    };

                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i].map(c => String(c).trim());
                        if (row.filter(c => c !== '').length === 0) continue; 

                        if (!headerFound) {
                            let rowUpper = row.map(c => c.toUpperCase());
                            if (rowUpper.some(c => c.includes('INVOICE NO')) && rowUpper.some(c => c.includes('CUSTOMER'))) {
                                headerFound = true;
                                const findIdx = (keyword) => rowUpper.findIndex(c => c.includes(keyword));
                                
                                idx.invoice_no = findIdx('INVOICE NO');
                                idx.customer = findIdx('CUSTOMER NAME') !== -1 ? findIdx('CUSTOMER NAME') : findIdx('CUSTOMER');
                                idx.address = findIdx('CUSTOMER ADDRESS') !== -1 ? findIdx('CUSTOMER ADDRESS') : findIdx('ADDRESS'); // 📌 เพิ่มการหา Address
                                idx.incoterms = findIdx('INCOTERMS');
                                idx.consignee = findIdx('CONSIGNEE');
                                idx.notify = findIdx('NOTIFY PARTY');
                                idx.payment = findIdx('PAYMENT');
                                idx.port_loading = findIdx('PORT OF LOADING');
                                idx.port_discharge = findIdx('PORT OF DISCHARGE');
                                idx.vessel = findIdx('FEEDER VESSEL');
                                idx.mother = findIdx('MOTHER VESSEL');
                                idx.container = findIdx('CONTAINER NO') !== -1 ? findIdx('CONTAINER NO') : findIdx('CONTAINER NAME');
                                idx.seal = findIdx('SEAL');
                                idx.invoice_date = findIdx('INVOICE DATE');
                                idx.etd = findIdx('ETD');
                                idx.eta = findIdx('ETA');
                                idx.container_qty = findIdx('CONTAINER QTY');
                                idx.tare = findIdx('TARE');
                                idx.qty = findIdx('QUANTITY');
                                idx.price = findIdx('UNIT PRICE');
                                idx.nw = findIdx('N.W');
                                idx.gw = findIdx('G.W');
                                idx.cbm = findIdx('CBM') !== -1 ? findIdx('CBM') : findIdx('MEASUREMENT');
                                idx.po = findIdx('PURCHASE ORDER') !== -1 ? findIdx('PURCHASE ORDER') : findIdx('PO NO');
                                idx.carton = findIdx('CARTON NO');
                                idx.product_type = findIdx('PRODUCT TYPE');
                                idx.marks = findIdx('MARKS');
                                idx.desc = findIdx('DESCRIPTION');
                                idx.sku = findIdx('SKU');
                                continue; 
                            }
                        }

                        if (headerFound && idx.invoice_no !== undefined && idx.invoice_no !== -1) {
                            let rowInvNo = row[idx.invoice_no];
                            
                            if (rowInvNo && rowInvNo.toUpperCase().includes('INVOICE NO')) continue; 
                            
                            if (rowInvNo !== "") {
                                currentInvNo = rowInvNo;
                            }
                            
                            if (!currentInvNo) continue;

                            const getVal = (index, defaultVal = '') => (index !== undefined && index !== -1 && row[index] !== undefined && row[index] !== '') ? row[index] : defaultVal;
                            
                            let qty = parseFloat(getVal(idx.qty).replace(/,/g, '')) || 0;
                            let price = parseFloat(getVal(idx.price).replace(/,/g, '')) || 0;
                            let rawDesc = getVal(idx.desc);

                            if (rawDesc === "" && qty === 0) continue;

                            if (!invoices[currentInvNo]) {
                                invoices[currentInvNo] = {
                                    customerData: { 
                                        name: getVal(idx.customer), 
                                        address: getVal(idx.address), // 📌 ดึง Address เข้าไปเก็บแล้ว
                                        incoterms: getVal(idx.incoterms),
                                        consignee: getVal(idx.consignee),
                                        notify_party: getVal(idx.notify),
                                        payment_terms: getVal(idx.payment, 'O/A 30 DAYS AFTER B/L DATE.')
                                    },
                                    shippingData: {
                                        port_loading: getVal(idx.port_loading, 'LAEM CHABANG, THAILAND'),
                                        port_discharge: getVal(idx.port_discharge), 
                                        feeder_vessel: getVal(idx.vessel),
                                        mother_vessel: getVal(idx.mother),
                                        container_no: getVal(idx.container), 
                                        seal_no: getVal(idx.seal), 
                                        invoice_date: formatUniversalDate(getVal(idx.invoice_date)), 
                                        etd_date: formatUniversalDate(getVal(idx.etd)), 
                                        eta_date: formatUniversalDate(getVal(idx.eta)),
                                        container_qty: getVal(idx.container_qty),
                                        tare: getVal(idx.tare)
                                    },
                                    details: []
                                };
                            }

                            let sku = getVal(idx.sku);
                            if (!sku) {
                                sku = rawDesc.split(' ')[0].replace(/^#/, '');
                            }

                            if (qty > 0 || price > 0 || rawDesc !== "") {
                                invoices[currentInvNo].details.push({ 
                                    sku: sku, 
                                    product_type: getVal(idx.product_type),
                                    description: rawDesc, 
                                    qty: qty, 
                                    price: price, 
                                    nw: parseFloat(getVal(idx.nw).replace(/,/g, '')) || 0, 
                                    gw: parseFloat(getVal(idx.gw).replace(/,/g, '')) || 0, 
                                    cbm: parseFloat(getVal(idx.cbm).replace(/,/g, '')) || 0, 
                                    po: getVal(idx.po), 
                                    carton: getVal(idx.carton), 
                                    marks: getVal(idx.marks)
                                });
                            }
                        }
                    }

                    if (Object.keys(invoices).length === 0) {
                        throw new Error("ไม่พบข้อมูล Invoice ตรวจสอบว่าคอลัมน์และข้อมูลในไฟล์ถูกต้องหรือไม่");
                    }

                    const payload = {
                        action: 'import_invoice',
                        report_id: formImport.querySelector('[name="report_id"]')?.value || '',
                        remark: formImport.querySelector('[name="remark"]')?.value || '',
                        invoices: invoices
                    };

                    fetch('api/api_invoice.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                        },
                        body: JSON.stringify(payload)
                    })
                    .then(res => res.json())
                    .then(resData => {
                        if (resData.success) {
                            bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
                            Swal.fire('Success', resData.message, 'success');
                            formImport.reset();
                            selectedFile = null;
                            fileNameDisplay.textContent = '';
                            btnSubmit.disabled = true;
                            loadHistory();
                        } else {
                            Swal.fire('Error', resData.message, 'error');
                        }
                    })
                    .catch(err => {
                        console.error('API Error:', err);
                        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    })
                    .finally(() => {
                        btnSubmit.disabled = false;
                        btnSpinner.classList.add('d-none');
                    });

                } catch (error) {
                    Swal.fire('Parse Error', error.message, 'error');
                    btnSubmit.disabled = false;
                    btnSpinner.classList.add('d-none');
                }
            };
            reader.readAsArrayBuffer(selectedFile); 
        });
    }

    // --- 4. สร้างและดาวน์โหลด Excel Template ผ่าน SheetJS ---
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', function() {
            const templateData = [
                [
                    'Invoice No', 'Invoice Date', 'Customer Name', 'Customer Address', 
                    'Consignee', 'Notify Party', 'PO No', 'Incoterms', 
                    'Payment Terms', 'Port of Loading', 'Port of Discharge', 
                    'ETD Date', 'ETA Date', 'Feeder Vessel', 'Mother Vessel', 
                    'Container Qty', 'Container No', 'Seal No', 'Shipping Marks', 
                    'Carton No', 'SKU', 'Description', 'Quantity', 
                    'Unit Price', 'N.W', 'G.W', 'CBM'
                ],
                [
                    'INV-20260201', '2026-02-18', 'John Doe Co., Ltd.', '123 Main St, NY', 
                    'SAME AS BUYER', 'SAME AS CONSIGNEE', 'PO-998877', 'FOB', 
                    'T/T 30 DAYS', 'LAEM CHABANG', 'CHARLESTON', 
                    '2026-02-22', '2026-04-27', 'XIN HANG ZHOU V.211W', '-', 
                    '1X40HQ', 'TLLU1234567', 'SL998877', 'N/M', 
                    '1-50', 'ITEM-001', 'PART A DESCRIPTION', 50, 
                    15.50, 100.00, 110.00, 2.500
                ]
            ];

            const ws = XLSX.utils.aoa_to_sheet(templateData);
            ws['!cols'] = [
                {wch: 15}, {wch: 15}, {wch: 30}, {wch: 40}, 
                {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15}, 
                {wch: 20}, {wch: 20}, {wch: 20}, {wch: 15}, 
                {wch: 15}, {wch: 25}, {wch: 20}, {wch: 15}, 
                {wch: 20}, {wch: 15}, {wch: 20}, {wch: 15}, 
                {wch: 20}, {wch: 35}, {wch: 15}, {wch: 15}, 
                {wch: 15}, {wch: 15}, {wch: 15}
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Upload_Template");
            XLSX.writeFile(wb, "Invoice_Upload_Template.xlsx");
        });
    }

    // --- 5. แก้ไข Invoice บนเว็บ (Web Edit) ---
    window.openWebEdit = function(id) {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        fetch(`api/api_invoice.php?action=get_invoice_detail&id=${id}`)
            .then(res => res.json())
            .then(resData => {
                Swal.close();
                if (resData.success) {
                    const inv = resData;
                    document.getElementById('editInvoiceNoTxt').textContent = inv.header.invoice_no;
                    document.getElementById('editInvoiceNo').value = inv.header.invoice_no;
                    
                    // Customer
                    document.getElementById('editCustName').value = inv.customer.name || '';
                    document.getElementById('editAddress').value = inv.customer.address || '';
                    document.getElementById('editConsignee').value = inv.customer.consignee || '';
                    document.getElementById('editNotify').value = inv.customer.notify_party || '';
                    document.getElementById('editIncoterms').value = inv.customer.incoterms || '';
                    document.getElementById('editPayment').value = inv.customer.payment_terms || '';
                    
                    // Shipping
                    document.getElementById('editInvDate').value = inv.shipping.invoice_date || '';
                    document.getElementById('editContainerQty').value = inv.shipping.container_qty || '';
                    document.getElementById('editPortLoading').value = inv.shipping.port_loading || 'LAEM CHABANG, THAILAND';
                    document.getElementById('editPortDischarge').value = inv.shipping.port_discharge || '';
                    document.getElementById('editEtd').value = inv.shipping.etd_date || '';
                    document.getElementById('editEta').value = inv.shipping.eta_date || '';
                    document.getElementById('editVessel').value = inv.shipping.feeder_vessel || '';
                    document.getElementById('editMotherVessel').value = inv.shipping.mother_vessel || '';
                    document.getElementById('editContainer').value = inv.shipping.container_no || '';
                    document.getElementById('editSeal').value = inv.shipping.seal_no || '';
                    
                    document.getElementById('editRemark').value = ''; 
                    
                    const tbody = document.querySelector('#editItemsTable tbody');
                    tbody.innerHTML = '';
                    inv.details.forEach(item => addEditItemRow(item));

                    new bootstrap.Modal(document.getElementById('editModal')).show();
                } else {
                    Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
                }
            }).catch(err => {
                Swal.close();
                console.error(err);
                Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            });
    };

    window.addEditItemRow = function(item = {}) {
        const tbody = document.querySelector('#editItemsTable tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm i-type" value="${item.product_type || ''}" placeholder="หมวดหมู่"></td>
            <td><input type="text" class="form-control form-control-sm i-sku" value="${item.sku || ''}" required></td>
            <td><input type="text" class="form-control form-control-sm i-desc" value="${item.description || ''}"></td>
            <td><input type="text" class="form-control form-control-sm i-carton" value="${item.carton_no || ''}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-qty" value="${item.qty_carton || 1}" required></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-price" value="${item.unit_price || 0}" required></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-nw text-muted" value="${item.net_weight || 0}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-gw text-muted" value="${item.gross_weight || 0}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-cbm text-muted" value="${item.cbm || 0}"></td>
            <td><input type="text" class="form-control form-control-sm i-po" value="${item.po_number || ''}"></td>
            <td><input type="text" class="form-control form-control-sm i-marks" value="${item.shipping_marks || ''}"></td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    window.saveWebEdit = function() {
        const invNo = document.getElementById('editInvoiceNo').value;
        const remark = document.getElementById('editRemark').value;
        
        if (!remark) return Swal.fire('แจ้งเตือน', 'กรุณาระบุหมายเหตุการแก้ไข', 'warning');

        const rows = document.querySelectorAll('#editItemsTable tbody tr');
        if (rows.length === 0) return Swal.fire('แจ้งเตือน', 'ต้องมีสินค้าอย่างน้อย 1 รายการ', 'warning');
        
        const details = [];
        rows.forEach(tr => {
            details.push({
                product_type: tr.querySelector('.i-type').value,
                sku: tr.querySelector('.i-sku').value,
                description: tr.querySelector('.i-desc').value,
                carton: tr.querySelector('.i-carton').value,
                qty: parseFloat(tr.querySelector('.i-qty').value) || 0,
                price: parseFloat(tr.querySelector('.i-price').value) || 0,
                nw: parseFloat(tr.querySelector('.i-nw').value) || 0,
                gw: parseFloat(tr.querySelector('.i-gw').value) || 0,
                cbm: parseFloat(tr.querySelector('.i-cbm').value) || 0,
                po: tr.querySelector('.i-po').value,
                marks: tr.querySelector('.i-marks').value
            });
        });

        const invoices = {};
        invoices[invNo] = {
            customerData: {
                name: document.getElementById('editCustName').value,
                address: document.getElementById('editAddress').value,
                consignee: document.getElementById('editConsignee').value,
                notify_party: document.getElementById('editNotify').value,
                incoterms: document.getElementById('editIncoterms').value,
                payment_terms: document.getElementById('editPayment').value
            },
            shippingData: {
                invoice_date: formatUniversalDate(document.getElementById('editInvDate').value),
                container_qty: document.getElementById('editContainerQty').value,
                port_loading: document.getElementById('editPortLoading').value,
                port_discharge: document.getElementById('editPortDischarge').value,
                etd_date: formatUniversalDate(document.getElementById('editEtd').value),
                eta_date: formatUniversalDate(document.getElementById('editEta').value),
                feeder_vessel: document.getElementById('editVessel').value,
                mother_vessel: document.getElementById('editMotherVessel').value,
                container_no: document.getElementById('editContainer').value,
                seal_no: document.getElementById('editSeal').value
            },
            details: details
        };

        const payload = {
            action: 'import_invoice',
            report_id: 0,
            remark: '[Web Edit] ' + remark,
            invoices: invoices
        };

        Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        fetch('api/api_invoice.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.success) {
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                Swal.fire('Success', 'สร้างเวอร์ชันใหม่สำเร็จ!', 'success');
                loadHistory(); 
            } else {
                Swal.fire('Error', resData.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        });
    };

    // --- 6. Live Search Filter ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#historyTable tbody tr');
            
            rows.forEach(row => {
                if(row.cells.length < 2) return; 
                const rowText = row.textContent.toLowerCase();
                if (rowText.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- 7. Status, Void, and Filters ---
    window.clearFilter = function() {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('searchInput').value = '';
        loadHistory();
    };

    window.changeStatus = function(invoiceNo, currentStatus) {
        if (currentStatus === 'Voided') return; 

        Swal.fire({
            title: 'เปลี่ยนสถานะ Invoice',
            text: `อัปเดตสถานะของ ${invoiceNo}`,
            input: 'select',
            inputOptions: {
                'Pending': 'รอส่งมอบ (Pending)',
                'Exported': 'ส่งของแล้ว (Exported)',
                'Paid': 'จ่ายเงินแล้ว (Paid)'
            },
            inputValue: currentStatus,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
        }).then((result) => {
            if (result.isConfirmed) {
                updateInvoiceStatus(invoiceNo, result.value, '');
            }
        });
    };

    window.voidInvoice = function(invoiceNo) {
        Swal.fire({
            title: 'ยืนยันการยกเลิกบิล?',
            text: `ระบุเหตุผลที่ต้องการ Void บิล ${invoiceNo}:`,
            input: 'text',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ใช่, ยกเลิกบิล!',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุเหตุผลในการยกเลิก!';
            }
        }).then((result) => {
            if (result.isConfirmed) {
                updateInvoiceStatus(invoiceNo, 'Voided', result.value);
            }
        });
    };

    window.restoreInvoice = function(invoiceNo) {
        Swal.fire({
            title: 'ยืนยันการกู้คืนบิล?',
            text: `คุณต้องการกู้คืนบิล ${invoiceNo} ให้กลับมาสถานะ Pending ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-undo me-1"></i> ใช่, กู้คืนเลย!'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('api/api_invoice.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'restore_invoice', invoice_no: invoiceNo })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.success) {
                        Swal.fire('สำเร็จ!', resData.message, 'success');
                        loadHistory(); 
                    } else {
                        Swal.fire('Error', resData.message, 'error');
                    }
                });
            }
        });
    };

    function updateInvoiceStatus(invoiceNo, status, remark) {
        fetch('api/api_invoice.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_status', invoice_no: invoiceNo, status: status, remark: remark })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.success) {
                Swal.fire('สำเร็จ!', resData.message, 'success');
                loadHistory(); 
            } else {
                Swal.fire('Error', resData.message, 'error');
            }
        });
    }
});