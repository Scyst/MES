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
            }
        });
        fileInput.addEventListener('change', () => {
            if(fileInput.files.length) {
                selectedFile = fileInput.files[0];
                fileNameDisplay.textContent = selectedFile.name;
            }
        });
    }

    // --- 2. Load History Logic ---
    function loadHistory() {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

        fetch('api/api_invoice.php?action=get_history')
        .then(res => res.json())
        .then(res => {
            if(res.success && res.data.length > 0) {
                tbody.innerHTML = res.data.map(iv => `
                    <tr class="${iv.is_active == 1 ? 'table-primary' : 'text-muted'}">
                        <td class="fw-bold">${iv.invoice_no}</td>
                        <td class="text-center"><span class="badge bg-${iv.is_active == 1 ? 'primary' : 'secondary'}">v${iv.version}</span></td>
                        <td class="text-end fw-bold text-dark">$${Number(iv.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td class="small">${iv.remark || '-'}</td>
                        <td class="small">${iv.created_at}</td>
                        <td class="text-center">${iv.is_active == 1 ? '<i class="fas fa-check-circle text-success"></i> Active' : '<i class="fas fa-archive text-secondary"></i> Archived'}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-danger" onclick="window.open('print_ci.php?id=${iv.id}', '_blank')" title="Print Commercial Invoice">
                                <i class="fas fa-file-pdf"></i> CI
                            </button>
                            <button class="btn btn-sm btn-outline-primary ms-1" onclick="window.open('print_pl.php?id=${iv.id}', '_blank')" title="Print Packing List">
                                <i class="fas fa-file-pdf"></i> PL
                            </button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No data found.</td></tr>';
            }
        });
    }
    window.loadHistory = loadHistory;
    loadHistory();

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
                    
                    // แปลงเป็น 2D Array เพื่อหลบปัญหาบรรทัดขยะด้านบน
                    const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
                    
                    let invoices = {};
                    let idx = {};
                    let headerFound = false;

                    // ลูปแกะข้อมูลทีละแถว
                    for (let i = 0; i < rows.length; i++) {
                        // ทำความสะอาดข้อมูล ลบช่องว่างหัวท้าย
                        let row = rows[i].map(c => String(c).trim());
                        if (row.filter(c => c !== '').length === 0) continue; // ข้ามบรรทัดว่าง

                        // 1. สแกนหาบรรทัดที่เป็น Header อัตโนมัติ
                        if (!headerFound) {
                            let rowUpper = row.map(c => c.toUpperCase());
                            
                            // ถ้าบรรทัดนี้มีคำว่า INVOICE NO และ CUSTOMER ให้ถือว่าเป็นบรรทัด Header
                            if (rowUpper.some(c => c.includes('INVOICE NO')) && rowUpper.some(c => c.includes('CUSTOMER'))) {
                                headerFound = true;
                                
                                // Map ตำแหน่งคอลัมน์แบบยืดหยุ่น (แค่มีคำที่กำหนดก็จับคู่ให้เลย)
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
                                continue; // ได้ Header แล้วข้ามไปอ่าน Data บรรทัดถัดไป
                            }
                        }

                        // 2. ดึง Data ของจริง (เมื่อเจอ Header แล้ว)
                        if (headerFound && idx.invoice_no !== undefined && idx.invoice_no !== -1) {
                            let invNo = row[idx.invoice_no];
                            if (!invNo || invNo.toUpperCase().includes('INVOICE NO')) continue; // ข้ามถ้าไม่มีเลขบิล หรือซ้ำ Header

                            // Helper ดึงค่าแบบปลอดภัย (ถ้าไม่เจอคอลัมน์ให้คืนค่าว่าง)
                            const getVal = (index, defaultVal = '') => (index !== undefined && index !== -1 && row[index] !== undefined && row[index] !== '') ? row[index] : defaultVal;
                            
                            let qty = parseFloat(getVal(idx.qty).replace(/,/g, '')) || 0;
                            let price = parseFloat(getVal(idx.price).replace(/,/g, '')) || 0;

                            if (qty > 0 && price > 0) {
                                if (!invoices[invNo]) {
                                    // สร้างโครงสร้างบิลใหม่
                                    invoices[invNo] = {
                                        customerData: { 
                                            name: getVal(idx.customer), 
                                            incoterms: getVal(idx.incoterms),
                                            consignee: getVal(idx.consignee),
                                            notify_party: getVal(idx.notify),
                                            payment_terms: getVal(idx.payment, 'O/A 30 DAYS AFTER B/L DATE.') // ค่า Default ตาม PDF
                                        },
                                        shippingData: {
                                            port_loading: getVal(idx.port_loading, 'LAEM CHABANG, THAILAND'), // ค่า Default ตาม PDF
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

                                // ดึง Description และสกัด SKU
                                let rawDesc = getVal(idx.desc);
                                let sku = rawDesc.split(' ')[0].replace(/^#/, '');

                                // ใส่รายการสินค้า
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

                    // 3. ส่ง JSON ไปให้ Server API
                    const payload = {
                        action: 'import_invoice',
                        report_id: formImport.querySelector('[name="report_id"]').value,
                        remark: formImport.querySelector('[name="remark"]').value,
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
                            Swal.fire('Success', resData.message, 'success');
                            formImport.reset();
                            selectedFile = null;
                            fileNameDisplay.textContent = '';
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
            reader.readAsArrayBuffer(selectedFile); // เริ่มอ่านไฟล์
        });
    }
});