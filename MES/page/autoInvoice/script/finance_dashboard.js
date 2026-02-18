document.addEventListener('DOMContentLoaded', function() {
    // --- 1. Drag & Drop Logic ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    let selectedFile = null;

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
                document.getElementById('btnSubmit').disabled = false; // เปิดปุ่มเมื่อมีไฟล์
            }
        });
        fileInput.addEventListener('change', () => {
            if(fileInput.files.length) {
                selectedFile = fileInput.files[0];
                fileNameDisplay.textContent = selectedFile.name;
                document.getElementById('btnSubmit').disabled = false; // เปิดปุ่มเมื่อมีไฟล์
            }
        });
    }

    // --- 2. Load History Logic ---
    function loadHistory() {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;
        
        const start = document.getElementById('filterStartDate')?.value || '';
        const end = document.getElementById('filterEndDate')?.value || '';
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลด...</td></tr>';

        fetch(`api/api_invoice.php?action=get_history&start=${start}&end=${end}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success && resData.data.length > 0) {
                    tbody.innerHTML = ''; // ล้างข้อความโหลด
                    
                    resData.data.forEach(inv => {
                        const tr = document.createElement('tr');
                        let statusBadge = '';
                        if (inv.doc_status === 'Pending') statusBadge = `<span class="badge bg-warning text-dark" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-clock"></i> Pending</span>`;
                        else if (inv.doc_status === 'Exported') statusBadge = `<span class="badge bg-info text-dark" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-plane-departure"></i> Exported</span>`; // <--- เพิ่มบรรทัดนี้ครับ
                        else if (inv.doc_status === 'Paid') statusBadge = `<span class="badge bg-success" style="cursor:pointer;" onclick="changeStatus('${inv.invoice_no}', '${inv.doc_status}')"><i class="fas fa-check-circle"></i> Paid</span>`;
                        else if (inv.doc_status === 'Voided') statusBadge = `<span class="badge bg-danger"><i class="fas fa-ban"></i> Voided</span>`;
                        
                        const rowClass = (inv.doc_status === 'Voided') ? 'table-danger text-muted text-decoration-line-through' : '';

                        tr.className = rowClass;
                        tr.innerHTML = `
                            <td class="fw-bold text-primary">${inv.invoice_no}</td>
                            <td>
                                <div class="text-truncate fw-bold" style="max-width: 250px;" title="${inv.customer_name}">${inv.customer_name}</div>
                            </td>
                            <td>
                                <div class="small"><i class="fas fa-box text-muted me-1"></i> ${inv.container_no}</div>
                                <div class="small"><i class="fas fa-ship text-muted me-1"></i> ${inv.vessel}</div>
                            </td>
                            <td class="text-center small">
                                <span class="text-success" title="ETD">D: ${inv.etd_date}</span><br>
                                <span class="text-danger" title="ETA">A: ${inv.eta_date}</span>
                            </td>
                            <td class="text-end fw-bold">${inv.total_amount}</td>
                            <td class="text-center">
                                ${statusBadge}<br>
                                <span class="badge bg-secondary mt-1">v.${inv.version}</span>
                            </td>
                            <td class="text-center text-muted small">${inv.created_at}</td>
                            <td class="text-center">
                                <div class="btn-group btn-group-sm">
                                    <button type="button" class="btn btn-outline-info" onclick="viewVersions('${inv.invoice_no}')" title="ประวัติ"><i class="fas fa-history"></i></button>
                                    ${inv.doc_status !== 'Voided' ? `<button type="button" class="btn btn-outline-warning" onclick="openWebEdit(${inv.id})" title="แก้ไข"><i class="fas fa-edit"></i></button>` : ''}
                                    <a href="print_ci.php?id=${inv.id}" target="_blank" class="btn btn-outline-primary" title="Print CI">CI</a>
                                    ${inv.doc_status !== 'Voided' ? `<button type="button" class="btn btn-outline-danger" onclick="voidInvoice('${inv.invoice_no}')" title="ยกเลิกบิล"><i class="fas fa-trash-alt"></i></button>` : ''}
                                </div>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">ยังไม่มีข้อมูล Invoice ในระบบ</td></tr>';
                }
            })
            .catch(err => {
                console.error('Fetch History Error:', err);
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            });
    }

    window.loadHistory = loadHistory;
    loadHistory();

    // --- 5. View Versions Logic (ดูประวัติการแก้ไข) ---
    window.viewVersions = function(invoiceNo) {
        const modalEl = document.getElementById('versionModal');
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('modalInvoiceNo').textContent = invoiceNo;
        
        const tbody = document.querySelector('#versionTable tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดประวัติ...</td></tr>';
        
        // เปิดหน้าต่าง Modal ขึ้นมาก่อน
        modal.show();

        // ดึงข้อมูลเวอร์ชันจาก API
        fetch(`api/api_invoice.php?action=get_versions&invoice_no=${encodeURIComponent(invoiceNo)}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success && resData.data.length > 0) {
                    tbody.innerHTML = '';
                    
                    resData.data.forEach(v => {
                        // แยกสถานะ Latest กับ Old
                        const isLatest = v.is_active == 1;
                        const badge = isLatest ? '<span class="badge bg-success">Latest (ล่าสุด)</span>' : '<span class="badge bg-secondary">Old</span>';
                        const rowClass = isLatest ? '' : 'table-light text-muted'; // ให้เวอร์ชันเก่าสีจางลงนิดนึง
                        
                        const tr = document.createElement('tr');
                        tr.className = rowClass;
                        tr.innerHTML = `
                            <td class="text-center fw-bold">v.${v.version}</td>
                            <td class="text-center">${v.created_at}</td>
                            <td class="text-end">${v.total_amount}</td>
                            <td>${v.remark}</td>
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
                console.error('Fetch Versions Error:', err);
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

            // ใช้ FileReader อ่านไฟล์ Excel
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

                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i].map(c => String(c).trim());
                        if (row.filter(c => c !== '').length === 0) continue; 

                        if (!headerFound) {
                            let rowUpper = row.map(c => c.toUpperCase());
                            
                            if (rowUpper.some(c => c.includes('INVOICE NO')) && rowUpper.some(c => c.includes('CUSTOMER'))) {
                                headerFound = true;
                                
                                const findIdx = (keyword) => rowUpper.findIndex(c => c.includes(keyword));
                                
                                idx.invoice_no = findIdx('INVOICE NO');
                                idx.customer = findIdx('CUSTOMER');
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
                                idx.marks = findIdx('MARKS');
                                idx.desc = findIdx('DESCRIPTION');
                                continue; 
                            }
                        }

                        if (headerFound && idx.invoice_no !== undefined && idx.invoice_no !== -1) {
                            let invNo = row[idx.invoice_no];
                            if (!invNo || invNo.toUpperCase().includes('INVOICE NO')) continue; 

                            const getVal = (index, defaultVal = '') => (index !== undefined && index !== -1 && row[index] !== undefined && row[index] !== '') ? row[index] : defaultVal;
                            
                            let qty = parseFloat(getVal(idx.qty).replace(/,/g, '')) || 0;
                            let price = parseFloat(getVal(idx.price).replace(/,/g, '')) || 0;

                            if (qty > 0 && price > 0) {
                                if (!invoices[invNo]) {
                                    invoices[invNo] = {
                                        customerData: { 
                                            name: getVal(idx.customer), 
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
                                            invoice_date: getVal(idx.invoice_date),
                                            etd_date: getVal(idx.etd),
                                            eta_date: getVal(idx.eta),
                                            container_qty: getVal(idx.container_qty),
                                            tare: getVal(idx.tare)
                                        },
                                        details: []
                                    };
                                }

                                let rawDesc = getVal(idx.desc);
                                let sku = rawDesc.split(' ')[0].replace(/^#/, '');

                                invoices[invNo].details.push({ 
                                    sku: sku, 
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
                        throw new Error("ไม่พบข้อมูล Invoice ตรวจสอบว่าคอลัมน์ Quantity และ Price มีตัวเลขที่ถูกต้องหรือไม่");
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
                            btnSubmit.disabled = true; // ปิดปุ่มกลับ
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

    // ==========================================================
    // --- 4. สร้างและดาวน์โหลด Excel Template ผ่าน SheetJS ---
    // ==========================================================
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', function() {
            
            // 1. กำหนดข้อมูล: แถวแรกคือหัวคอลัมน์, แถวที่สองคือข้อมูลตัวอย่าง (Dummy Data)
            const templateData = [
                [
                    // แก้ไขหัวตารางให้ตรงกับที่ Parser กวาดหา (เอา _ ออก และใช้ชื่อเต็ม)
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

            // สร้าง Sheet และกำหนดความกว้างคอลัมน์
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

            // สร้างไฟล์แล้วสั่งดาวน์โหลด
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Upload_Template");
            XLSX.writeFile(wb, "Invoice_Upload_Template.xlsx");
        });
    }

    // ==========================================================
    // --- 5. แก้ไข Invoice บนเว็บ (Web Edit) ---
    // ==========================================================
    
    // 5.1 เปิด Modal และดึงข้อมูลมาเติม
    window.openWebEdit = function(id) {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        fetch(`api/api_invoice.php?action=get_invoice_detail&id=${id}`)
            .then(res => res.json())
            .then(resData => {
                Swal.close();
                if (resData.success) {
                    const inv = resData;
                    // เติมข้อมูล Header
                    document.getElementById('editInvoiceNoTxt').textContent = inv.header.invoice_no;
                    document.getElementById('editInvoiceNo').value = inv.header.invoice_no;
                    
                    document.getElementById('editCustName').value = inv.customer.name || '';
                    document.getElementById('editConsignee').value = inv.customer.consignee || '';
                    document.getElementById('editNotify').value = inv.customer.notify_party || '';
                    document.getElementById('editIncoterms').value = inv.customer.incoterms || '';
                    document.getElementById('editPayment').value = inv.customer.payment_terms || '';
                    
                    document.getElementById('editInvDate').value = inv.shipping.invoice_date || '';
                    document.getElementById('editContainer').value = inv.shipping.container_no || '';
                    document.getElementById('editVessel').value = inv.shipping.feeder_vessel || '';
                    document.getElementById('editSeal').value = inv.shipping.seal_no || '';
                    document.getElementById('editRemark').value = ''; // ว่างไว้บังคับให้พิมพ์สาเหตุ
                    
                    // เติมข้อมูล Items
                    const tbody = document.querySelector('#editItemsTable tbody');
                    tbody.innerHTML = '';
                    inv.details.forEach(item => addEditItemRow(item));

                    // โชว์ Modal
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

    // 5.2 ฟังก์ชันสร้างแถวสินค้าในตาราง
    window.addEditItemRow = function(item = {}) {
        const tbody = document.querySelector('#editItemsTable tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm i-sku" value="${item.sku || ''}" required></td>
            <td><input type="text" class="form-control form-control-sm i-desc" value="${item.description || ''}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-qty" value="${item.qty_carton || 1}" required></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-price" value="${item.unit_price || 0}" required></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-nw" value="${item.net_weight || 0}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-gw" value="${item.gross_weight || 0}"></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm i-cbm" value="${item.cbm || 0}"></td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    // 5.3 รวบรวมข้อมูลแปลงเป็น JSON แล้วยิง API เดียวกับตอนอัปโหลด Excel
    window.saveWebEdit = function() {
        const invNo = document.getElementById('editInvoiceNo').value;
        const remark = document.getElementById('editRemark').value;
        
        if (!remark) return Swal.fire('แจ้งเตือน', 'กรุณาระบุหมายเหตุการแก้ไข (เพื่อให้รู้ว่าสร้าง Version ใหม่ทำไม)', 'warning');

        // รวบรวมรายการสินค้า
        const rows = document.querySelectorAll('#editItemsTable tbody tr');
        if (rows.length === 0) return Swal.fire('แจ้งเตือน', 'ต้องมีสินค้าอย่างน้อย 1 รายการ', 'warning');
        
        const details = [];
        rows.forEach(tr => {
            details.push({
                sku: tr.querySelector('.i-sku').value,
                description: tr.querySelector('.i-desc').value,
                qty: parseFloat(tr.querySelector('.i-qty').value) || 0,
                price: parseFloat(tr.querySelector('.i-price').value) || 0,
                nw: parseFloat(tr.querySelector('.i-nw').value) || 0,
                gw: parseFloat(tr.querySelector('.i-gw').value) || 0,
                cbm: parseFloat(tr.querySelector('.i-cbm').value) || 0,
                po: '', carton: '', marks: '' // ฟิลด์เสริม สามารถเพิ่มใน UI ภายหลังได้
            });
        });

        // จัดโครงสร้าง Payload ให้เหมือนการ Import จาก Excel เป๊ะๆ
        const invoices = {};
        invoices[invNo] = {
            customerData: {
                name: document.getElementById('editCustName').value,
                consignee: document.getElementById('editConsignee').value,
                notify_party: document.getElementById('editNotify').value,
                incoterms: document.getElementById('editIncoterms').value,
                payment_terms: document.getElementById('editPayment').value
            },
            shippingData: {
                invoice_date: document.getElementById('editInvDate').value,
                container_no: document.getElementById('editContainer').value,
                feeder_vessel: document.getElementById('editVessel').value,
                seal_no: document.getElementById('editSeal').value
            },
            details: details
        };

        const payload = {
            action: 'import_invoice',
            report_id: 0,
            remark: '[Web Edit] ' + remark, // พ่วงคำว่า Web Edit ให้รู้ว่าแก้ผ่านเว็บ
            invoices: invoices
        };

        // ยิงเข้า API เดียวกับตอนอัปโหลด Excel เลย!
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
                loadHistory(); // รีเฟรชตารางหน้าเว็บ
            } else {
                Swal.fire('Error', resData.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        });
    };

    // ==========================================================
    // --- 6. Live Search Filter (ค้นหาในตาราง) ---
    // ==========================================================
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#historyTable tbody tr');
            
            rows.forEach(row => {
                // ข้ามแถวที่เขียนว่า "กำลังโหลด..." หรือ "ไม่มีข้อมูล"
                if(row.cells.length < 2) return; 
                
                // ดึงข้อความทั้งแถวมาตรวจสอบ
                const rowText = row.textContent.toLowerCase();
                if (rowText.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // ==========================================================
    // --- 7. Status, Void, and Filters ---
    // ==========================================================
    
    // ล้างตัวกรอง
    window.clearFilter = function() {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('searchInput').value = '';
        loadHistory();
    };

    // เปลี่ยนสถานะบิล (คลิกที่ Badge สถานะ)
    window.changeStatus = function(invoiceNo, currentStatus) {
        if (currentStatus === 'Voided') return; // ยกเลิกแล้วแก้ไม่ได้

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

    // ยกเลิกบิล (Void)
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

    // ฟังก์ชันหลักยิง API เปลี่ยนสถานะ
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
                loadHistory(); // รีเฟรชตาราง
            } else {
                Swal.fire('Error', resData.message, 'error');
            }
        });
    }
});