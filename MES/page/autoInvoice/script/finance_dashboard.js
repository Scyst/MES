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
                    
                    // ดึงข้อมูลออกมาเป็น 2D Array
                    const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
                    
                    let invoices = {};
                    let idx = {};

                    // ลูปแกะข้อมูลทีละแถว
                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i].map(c => String(c).trim());
                        if (row.filter(c => c !== '').length === 0) continue; 

                        // 1. หาตำแหน่งคอลัมน์ Header (ดักจับตัวใหม่เพียบ)
                        if (row.includes('INVOICE NO.') && row.includes('CUSTOMER NAME :')) {
                            idx.customer = row.indexOf('CUSTOMER NAME :');
                            idx.incoterms = row.indexOf('INCOTERMS:');
                            idx.invoice_no = row.indexOf('INVOICE NO.');
                            idx.invoice_date = row.indexOf('INVOICE DATE.');
                            idx.port = row.indexOf('PORT OF DISCHARGE:');
                            idx.desc = row.indexOf('DESCRIPTION');
                            
                            // ค้นหาแบบยืดหยุ่น (ป้องกันชื่อคอลัมน์มีการเว้นบรรทัด)
                            row.forEach((v, k) => {
                                let vUp = v.toUpperCase();
                                if (vUp.includes('QUANTITY')) idx.qty = k;
                                if (vUp.includes('UNIT PRICE')) idx.price = k;
                                if (vUp.includes('CONTAINER NAME')) idx.container = k;
                                if (vUp.includes('SEAL')) idx.seal = k;
                                if (vUp.includes('FEEDER VESSEL')) idx.vessel = k;
                                if (vUp.includes('MOTHER VESSEL')) idx.mother = k;
                                if (vUp.includes('N.W')) idx.nw = k;
                                if (vUp.includes('G.W')) idx.gw = k;
                                if (vUp.includes('MEASUREMENT') || vUp.includes('CBM')) idx.cbm = k;
                                if (vUp.includes('ETD')) idx.etd = k;
                                if (vUp.includes('ETA')) idx.eta = k;
                                if (vUp.includes('CONSIGNEE')) idx.consignee = k;
                                if (vUp.includes('PURCHASE ORDER') || vUp.includes('PO NO')) idx.po = k;
                                if (vUp.includes('CARTON NO')) idx.carton = k;
                                if (vUp.includes('SHIPPING MARKS')) idx.marks = k;
                                if (vUp.includes('CONTAINER QTY')) idx.container_qty = k;
                                if (vUp.includes('TARE')) idx.tare = k;
                            });
                            continue;
                        }

                        // 2. ดึง Data 
                        if (idx.invoice_no !== undefined && row[idx.invoice_no] !== '') {
                            let invNo = row[idx.invoice_no];
                            if (invNo === 'INVOICE NO.') continue;

                            let qty = idx.qty !== undefined ? parseFloat(row[idx.qty].replace(/,/g, '')) || 0 : 0;
                            let price = idx.price !== undefined ? parseFloat(row[idx.price].replace(/,/g, '')) || 0 : 0;
                            let nw = idx.nw !== undefined ? parseFloat(row[idx.nw].replace(/,/g, '')) || 0 : 0;
                            let gw = idx.gw !== undefined ? parseFloat(row[idx.gw].replace(/,/g, '')) || 0 : 0;
                            let cbm = idx.cbm !== undefined ? parseFloat(row[idx.cbm].replace(/,/g, '')) || 0 : 0;

                            if (qty > 0 && price > 0) {
                                if (!invoices[invNo]) {
                                    // ยัดข้อมูล Header ทั้งหมดลง JSON ก้อนเดียว!
                                    invoices[invNo] = {
                                        customerData: { 
                                            name: row[idx.customer] || '', 
                                            incoterms: row[idx.incoterms] || '',
                                            consignee: row[idx.consignee] || ''
                                        },
                                        shippingData: {
                                            port_discharge: row[idx.port] || '', 
                                            feeder_vessel: row[idx.vessel] || '',
                                            mother_vessel: row[idx.mother] || '',
                                            container_no: row[idx.container] || '', 
                                            seal_no: row[idx.seal] || '', 
                                            invoice_date: row[idx.invoice_date] || '',
                                            etd_date: row[idx.etd] || '',
                                            eta_date: row[idx.eta] || '',
                                            container_qty: row[idx.container_qty] || '',
                                            tare: row[idx.tare] || ''                                         },
                                        details: []
                                    };
                                }

                                let desc = row[idx.desc] || '';
                                let sku = desc.split(' ')[0].replace(/^#/, '');
                                let po = row[idx.po] || '';
                                let carton = row[idx.carton] || '';
                                let marks = row[idx.marks] || '';
                                
                                let existingItem = invoices[invNo].details.find(d => d.sku === sku);
                                if (existingItem) {
                                    if (nw > 0) existingItem.nw = nw;
                                    if (gw > 0) existingItem.gw = gw;
                                    if (cbm > 0) existingItem.cbm = cbm;
                                } else {
                                    // เพิ่มฟิลด์ใหม่ (PO, Carton, Marks) ลงในรายการสินค้า
                                    invoices[invNo].details.push({ 
                                        sku: sku, description: desc, qty: qty, price: price, 
                                        nw: nw, gw: gw, cbm: cbm, po: po, carton: carton, marks: marks
                                    });
                                }
                            }
                        }
                    }

                    if (Object.keys(invoices).length === 0) {
                        throw new Error("ไม่พบข้อมูล Invoice หรือรูปแบบตารางไม่ถูกต้อง");
                    }

                    // 3. ส่ง JSON ไปให้ Server
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