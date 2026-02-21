window.formatUniversalDate = function(val) {
    if (!val) return '';
    let d;
    
    // 1. กรณีเป็นตัวเลขจาก Excel (เช่น 46072)
    if (!isNaN(val) && Number(val) > 10000) {
        d = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
    } 
    // 2. กรณีมี / (เช่น 20/02/2026) -> ต้องแปลงเป็น YYYY-MM-DD ให้ JS เข้าใจก่อน
    else if (typeof val === 'string' && val.includes('/')) {
        let parts = val.split('/');
        if (parts.length === 3) {
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            d = new Date(`${year}-${month}-${day}`);
        }
    } 
    // 3. กรณีทั่วไป
    else {
        d = new Date(val);
    }

    // จัด Format ส่งกลับเป็น DD/MM/YYYY คืนให้ Database
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    return String(val).toUpperCase(); 
};

window.formatDateForInput = function(val) {
    if (!val) return '';
    
    if (typeof val === 'string' && val.includes('/')) {
        let parts = val.split('/');
        if (parts.length === 3) {
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return '';
};

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

    // --- 🌟 เริ่มส่วน UI/UX ใหม่ (การตั้งค่าวันที่ & คำนวณยอด) 🌟 ---
    function setDefaultDates() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
        
        const sd = document.getElementById('filterStartDate');
        const ed = document.getElementById('filterEndDate');
        
        if (sd) sd.value = `${year}-${month}-01`;
        if (ed) ed.value = `${year}-${month}-${lastDay}`;
    }
    // เรียกใช้ตอนโหลดหน้า เพื่อตั้งให้เป็นเดือนปัจจุบันเสมอ
    setDefaultDates();

    // ดักจับการเปลี่ยนวันที่ ถ้าเปลี่ยนปุ๊บให้โหลดข้อมูลใหม่ทันที
    document.getElementById('filterStartDate')?.addEventListener('change', loadHistory);
    document.getElementById('filterEndDate')?.addEventListener('change', loadHistory);
    document.getElementById('filterTeam')?.addEventListener('change', renderTable);

    function calculateToolbarSums(filteredData) {
        let totalInvoices = filteredData.length;
        let totalUsd = filteredData.reduce((sum, inv) => {
            let amount = parseFloat(String(inv.total_amount).replace(/,/g, '')) || 0;
            return sum + amount;
        }, 0);

        const elInvoices = document.getElementById('sum-invoices');
        const elUsd = document.getElementById('sum-amount-usd');
        
        if (elInvoices) elInvoices.innerText = totalInvoices.toLocaleString();
        if (elUsd) elUsd.innerText = '$' + totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        calculateTHB(totalUsd);
    }

    function calculateTHB(usdValue) {
        const elUsd = document.getElementById('sum-amount-usd');
        if (usdValue === undefined && elUsd) {
            usdValue = parseFloat(elUsd.innerText.replace(/[^0-9.-]+/g, "")) || 0;
        } else if (usdValue === undefined) {
            usdValue = 0;
        }
        
        const rateEl = document.getElementById('exchangeRate');
        let rate = rateEl ? parseFloat(rateEl.value) || 0 : 35.00;
        let thbValue = usdValue * rate;
        
        const elThb = document.getElementById('sum-amount-thb');
        if (elThb) elThb.innerText = '฿' + thbValue.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // เมื่อแก้เรทเงิน ให้คำนวณ THB ใหม่ทันที
    document.getElementById('exchangeRate')?.addEventListener('input', () => calculateTHB());
    // --- 🌍 ระบบดึงเรทเงินอัตโนมัติ (Live Exchange Rate) ---
    async function fetchExchangeRate() {
        const rateInput = document.getElementById('exchangeRate');
        try {
            // โชว์สถานะกำลังโหลดชั่วคราว (ถ้าต้องการ)
            // if (rateInput) rateInput.value = '...'; 
            
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await res.json();
            
            if (data && data.rates && data.rates.THB) {
                const thbRate = data.rates.THB;
                if (rateInput) {
                    rateInput.value = thbRate.toFixed(2);
                }
                // ดึงค่าได้ปุ๊บ สั่งให้ระบบคำนวณเงินบาทบน Toolbar ใหม่ทันที
                calculateTHB();
            }
        } catch (err) { 
            console.warn("Failed to fetch exchange rate, using default 35.00:", err); 
            // ถ้า API ล่ม หรือไม่มีเน็ต ก็จะใช้ค่า 35.00 ที่อยู่ใน HTML ต่อไป
            calculateTHB();
        }
    }
    
    // เรียกใช้งานดึงเรทเงินทันทีตอนโหลดหน้าเว็บ
    fetchExchangeRate();

    // --- 2. Load History Logic ---
    function loadHistory() {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;
        
        const start = encodeURIComponent(document.getElementById('filterStartDate')?.value || '');
        const end = encodeURIComponent(document.getElementById('filterEndDate')?.value || '');
        
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>';
        
        fetch(`api/api_invoice.php?action=get_history&start=${start}&end=${end}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    allInvoiceData = resData.data;
                    renderTable();
                    updateKPIs();
                } else {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4">ดึงข้อมูลไม่สำเร็จ</td></tr>';
                }
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            });
    }

    function renderTable() {
        const tbody = document.querySelector('#historyTable tbody');
        if(!tbody) return;
        tbody.innerHTML = '';

        let filteredData = allInvoiceData;

        // ฟิลเตอร์จากปุ่มสถานะ
        if (currentStatusFilter !== 'ALL') {
            filteredData = filteredData.filter(inv => inv.doc_status === currentStatusFilter);
        }

        // ฟิลเตอร์จากช่อง Live Search (ค้นหาพร้อมกันหลายคอลัมน์)
        const searchInput = document.getElementById('universalSearch');
        const searchText = (searchInput?.value || '').toLowerCase().trim();
        if (searchText) {
            filteredData = filteredData.filter(inv => 
                (inv.invoice_no && String(inv.invoice_no).toLowerCase().includes(searchText)) ||
                (inv.customer_name && String(inv.customer_name).toLowerCase().includes(searchText)) ||
                (inv.vessel && String(inv.vessel).toLowerCase().includes(searchText)) ||
                (inv.container_no && String(inv.container_no).toLowerCase().includes(searchText))
            );
        }

        // ฟิลเตอร์ตามทีม
        const filterTeam = document.getElementById('filterTeam')?.value || 'ALL';
        if (filterTeam !== 'ALL') {
            filteredData = filteredData.filter(inv => inv.team_name === filterTeam);
        }

        // อัปเดตยอดรวมใน Toolbar จากข้อมูลที่ผ่านการกรองแล้ว
        calculateToolbarSums(filteredData);

        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-5">
                <i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูลที่ค้นหา
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
                
                <td class="text-dark">${inv.booking_no || '-'}</td>
                
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
                    ${inv.team_name ? `<span class="badge bg-success mb-1 px-2 py-1"><i class="fas fa-users me-1"></i>${inv.team_name}</span><br>` : ''}
                    ${statusBadge}
                </td>

                <td class="text-center">
                    <span class="badge border text-secondary">v.${inv.version}</span>
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

    // --- 🌟 ระบบ Live Search (Debounce แบบไม่กระตุก) 🌟 ---
    const universalSearch = document.getElementById('universalSearch');
    if (universalSearch) {
        let debounceTimer;
        universalSearch.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            // รอ 0.4 วินาทีหลังหยุดพิมพ์ ถึงจะสั่งกรองข้อมูล
            debounceTimer = setTimeout(() => {
                renderTable(); 
            }, 400); 
        });
    }

    // --- 🌟 ปุ่ม Reset Filter รูปแบบใหม่ 🌟 ---
    window.clearFilter = function() {
        setDefaultDates(); 
        if (document.getElementById('universalSearch')) {
            document.getElementById('universalSearch').value = '';
        }
        currentStatusFilter = 'ALL';
        document.querySelectorAll('.kpi-card').forEach(c => {
            c.classList.remove('active');
            c.style.borderWidth = '0 0 0 4px';
        });
        loadHistory();
    };

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

                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i].map(c => String(c).trim());
                        if (row.filter(c => c !== '').length === 0) continue; 

                        if (!headerFound) {
                            let rowUpper = row.map(c => String(c).toUpperCase().replace(/_/g, ' '));
                            if (rowUpper.some(c => c.includes('INVOICE NO')) && rowUpper.some(c => c.includes('CUSTOMER'))) {
                                headerFound = true;
                                const findIdx = (keyword) => rowUpper.findIndex(c => c.includes(keyword));
                                
                                idx.invoice_no = findIdx('INVOICE NO');
                                idx.booking = findIdx('BOOKING NO') !== -1 ? findIdx('BOOKING NO') : findIdx('BOOKING');
                                idx.customer = findIdx('CUSTOMER NAME') !== -1 ? findIdx('CUSTOMER NAME') : findIdx('CUSTOMER');
                                idx.address = findIdx('CUSTOMER ADDRESS') !== -1 ? findIdx('CUSTOMER ADDRESS') : findIdx('ADDRESS');
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
                                idx.qty = findIdx('QUANTITY');
                                idx.price = findIdx('UNIT PRICE');
                                idx.nw = findIdx('N.W');
                                idx.gw = findIdx('G.W');
                                idx.cbm = findIdx('CBM') !== -1 ? findIdx('CBM') : findIdx('MEASUREMENT');
                                idx.po = findIdx('PURCHASE ORDER') !== -1 ? findIdx('PURCHASE ORDER') : findIdx('PO NO');
                                idx.carton = findIdx('CARTON NO');
                                idx.product_type = findIdx('PRODUCT TYPE');
                                idx.marks = findIdx('SHIPPING MARKS') !== -1 ? findIdx('SHIPPING MARKS') : findIdx('MARKS');
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
                            
                            let qty = parseFloat(String(getVal(idx.qty)).replace(/,/g, '')) || 0;
                            let price = parseFloat(String(getVal(idx.price)).replace(/,/g, '')) || 0;
                            let rawDesc = getVal(idx.desc);
                            let pType = getVal(idx.product_type);
                            let sku = getVal(idx.sku) || '';

                            if (rawDesc === '-' || rawDesc.toUpperCase() === '(AUTO)') rawDesc = '';
                            if (pType === '-' || pType.toUpperCase() === '(AUTO)') pType = '';

                            if (rawDesc === "" && qty === 0 && sku === "") continue; 

                            if (!invoices[currentInvNo]) {
                                invoices[currentInvNo] = {
                                    customerData: { 
                                        name: getVal(idx.customer), 
                                        address: getVal(idx.address), 
                                        incoterms: getVal(idx.incoterms),
                                        consignee: getVal(idx.consignee),
                                        notify_party: getVal(idx.notify),
                                        payment_terms: getVal(idx.payment, 'O/A 30 DAYS AFTER B/L DATE.')
                                    },
                                    shippingData: {
                                        team_name: getVal(idx.team),
                                        booking_no: getVal(idx.booking),
                                        port_loading: getVal(idx.port_loading, 'LAEM CHABANG, THAILAND'),
                                        port_discharge: getVal(idx.port_discharge), 
                                        feeder_vessel: getVal(idx.vessel),
                                        mother_vessel: getVal(idx.mother),
                                        container_no: getVal(idx.container), 
                                        seal_no: getVal(idx.seal), 
                                        invoice_date: window.formatUniversalDate(getVal(idx.invoice_date)), 
                                        etd_date: window.formatUniversalDate(getVal(idx.etd)), 
                                        eta_date: window.formatUniversalDate(getVal(idx.eta)),
                                        container_qty: getVal(idx.container_qty)
                                    },
                                    details: []
                                };
                            }

                            if (!sku) {
                                sku = rawDesc.split(' ')[0].replace(/^#/, '');
                            }

                            if (qty > 0 || price > 0 || rawDesc !== "" || sku !== "") {
                                invoices[currentInvNo].details.push({ 
                                    sku: sku, 
                                    product_type: pType,
                                    description: rawDesc, 
                                    qty: qty, 
                                    price: price, 
                                    nw: parseFloat(String(getVal(idx.nw)).replace(/,/g, '')) || 0, 
                                    gw: parseFloat(String(getVal(idx.gw)).replace(/,/g, '')) || 0, 
                                    cbm: parseFloat(String(getVal(idx.cbm)).replace(/,/g, '')) || 0, 
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

                    const invoiceKeys = Object.keys(invoices);
                    
                    const processUpload = async () => {
                        let successCount = 0;
                        let errorList = [];

                        for (const key of invoiceKeys) {
                            const invData = invoices[key]; 
                            
                            const payload = {
                                action: 'import_invoice',
                                invoice_no: key, 
                                report_id: formImport.querySelector('[name="report_id"]')?.value || '',
                                remark: formImport.querySelector('[name="remark"]')?.value || '',
                                customer: invData.customerData, 
                                shipping: invData.shippingData, 
                                details: invData.details        
                            };

                            try {
                                const res = await fetch('api/api_invoice.php', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                                    },
                                    body: JSON.stringify(payload)
                                });
                                const resData = await res.json();
                                
                                if (resData.success) {
                                    successCount++;
                                } else {
                                    errorList.push(`บิล ${key}: ${resData.message}`);
                                }
                            } catch (err) {
                                errorList.push(`บิล ${key}: Network Error`);
                            }
                        }

                        if (errorList.length === 0) {
                            Swal.fire('Success', `นำเข้าสำเร็จทั้งหมด ${successCount} บิล`, 'success');
                            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                            if (modalInstance) modalInstance.hide();
                            formImport.reset();
                            selectedFile = null;
                            fileNameDisplay.textContent = '';
                        } else {
                            Swal.fire({
                                title: 'นำเข้าสำเร็จบางส่วน',
                                html: `สำเร็จ ${successCount} บิล<br><br><span class="text-danger">ล้มเหลว:</span><br><div style="max-height: 150px; overflow-y: auto;" class="small text-start mt-2">${errorList.join('<br>')}</div>`,
                                icon: 'warning'
                            });
                        }
                        
                        btnSubmit.disabled = false;
                        btnSpinner.classList.add('d-none');
                        loadHistory();
                    };

                    processUpload(); 

                } catch (error) {
                    Swal.fire('Parse Error', error.message, 'error');
                    btnSubmit.disabled = false;
                    btnSpinner.classList.add('d-none');
                }
            };
            reader.readAsArrayBuffer(selectedFile); 
        });
    }

    // --- 4. ดาวน์โหลด Excel Template ---
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', function() {
            window.location.href = 'api/export_template.php'; 
        });
    }

    // --- 5. แก้ไข/สร้าง Invoice บนเว็บ (Web Edit & Create) ---
    window.openWebEdit = function(id) {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        fetch(`api/api_invoice.php?action=get_invoice_detail&id=${id}`)
            .then(res => res.json())
            .then(resData => {
                Swal.close();
                if (resData.success) {
                    fillInvoiceForm(resData); 
                    document.getElementById('editInvoiceNo').readOnly = true; 
                    new bootstrap.Modal(document.getElementById('editModal')).show();
                } else {
                    Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
                }
            })
            .catch(err => {
                Swal.close(); console.error(err); Swal.fire('Error', 'ไม่สามารถเชื่อมต่อได้', 'error');
            });
    };

    window.openCreateInvoice = function() {
        document.getElementById('formEditInvoice').reset();
        
        document.getElementById('editInvoiceNo').value = 'AUTO';
        document.getElementById('editInvoiceNo').readOnly = false;
        document.getElementById('editRemark').value = 'สร้างบิลใหม่ (Manual Entry)'; 
        
        const tbody = document.querySelector('#editItemsTable tbody');
        tbody.innerHTML = '';

        Swal.fire({ title: 'กำลังเตรียมแบบฟอร์ม...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        fetch(`api/api_invoice.php?action=get_last_invoice_defaults`)
            .then(res => res.json())
            .then(resData => {
                Swal.close();
                let defaultProductType = '';

                if (resData.success && resData.data) {
                    const defaults = resData.data;
                    
                    if (defaults.customer) {
                        document.getElementById('editCustName').value = defaults.customer.name || '';
                        document.getElementById('editAddress').value = defaults.customer.address || '';
                        document.getElementById('editConsignee').value = defaults.customer.consignee || '';
                        document.getElementById('editNotify').value = defaults.customer.notify_party || '';
                        document.getElementById('editIncoterms').value = defaults.customer.incoterms || '';
                        document.getElementById('editPayment').value = defaults.customer.payment_terms || '';
                    }

                    if (defaults.shipping) {
                        document.getElementById('editPortLoading').value = defaults.shipping.port_loading || 'LAEM CHABANG, THAILAND';
                        document.getElementById('editPortDischarge').value = defaults.shipping.port_discharge || '';
                    }

                    defaultProductType = defaults.product_type || '';
                }

                addEditItemRow({ product_type: defaultProductType });
                new bootstrap.Modal(document.getElementById('editModal')).show();
            })
            .catch(err => {
                Swal.close();
                console.error(err);
                addEditItemRow(); 
                new bootstrap.Modal(document.getElementById('editModal')).show();
            });
    };

    window.addEditItemRow = function(item = {}) {
        const tbody = document.querySelector('#editItemsTable tbody');
        const tr = document.createElement('tr');
        
        const initQty = parseFloat(item.qty_carton) || 1;
        tr.dataset.baseNw = item.net_weight ? (parseFloat(item.net_weight) / initQty) : 0;
        tr.dataset.baseGw = item.gross_weight ? (parseFloat(item.gross_weight) / initQty) : 0;
        tr.dataset.baseCbm = item.cbm ? (parseFloat(item.cbm) / initQty) : 0;

        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm i-type" value="${item.product_type || ''}" placeholder="หมวดหมู่"></td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control i-sku fw-bold text-primary" value="${item.sku || ''}" placeholder="พิมพ์ SKU" required>
                    <button class="btn btn-outline-secondary btn-search-sku" type="button" title="ค้นหาข้อมูล"><i class="fas fa-search"></i></button>
                </div>
            </td>
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
        
        const skuInput = tr.querySelector('.i-sku');
        const searchBtn = tr.querySelector('.btn-search-sku');
        const qtyInput = tr.querySelector('.i-qty'); 

        const fetchSkuInfo = () => {
            const skuVal = skuInput.value.trim();
            if (!skuVal) return;

            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            skuInput.classList.add('bg-light');

            fetch(`api/api_invoice.php?action=get_item_info&sku=${encodeURIComponent(skuVal)}`)
                .then(res => res.json())
                .then(resData => {
                    if (resData.success && resData.data) {
                        const d = resData.data;
                        const ctn = parseFloat(d.CTN) || 1;
                        
                        tr.dataset.baseNw = parseFloat(d.net_weight) || 0;
                        tr.dataset.baseGw = parseFloat(d.gross_weight) || 0;
                        tr.dataset.baseCbm = parseFloat(d.cbm) || 0;

                        tr.querySelector('.i-desc').value = d.invoice_description || d.part_description || '';
                        
                        const typeInput = tr.querySelector('.i-type');
                        if (typeInput.value === '') { typeInput.value = d.invoice_product_type || 'TOOL CABINET'; }
                        
                        qtyInput.value = ctn; 
                        qtyInput.dispatchEvent(new Event('input'));
                        
                        const priceInput = tr.querySelector('.i-price');
                        if (priceInput.value == 0 || priceInput.value == '') {
                            priceInput.value = parseFloat(d.Price_USD) || 0; 
                        }
                    } else {
                        tr.querySelector('.i-desc').value = ''; 
                        tr.querySelector('.i-desc').placeholder = 'ไม่พบ SKU นี้ในระบบ...';
                    }
                })
                .catch(err => console.error(err))
                .finally(() => {
                    searchBtn.innerHTML = '<i class="fas fa-search"></i>';
                    skuInput.classList.remove('bg-light');
                });
        };

        qtyInput.addEventListener('input', function() {
            const currentQty = parseFloat(this.value) || 0;
            const bNw = parseFloat(tr.dataset.baseNw) || 0;
            const bGw = parseFloat(tr.dataset.baseGw) || 0;
            const bCbm = parseFloat(tr.dataset.baseCbm) || 0;

            tr.querySelector('.i-nw').value = (bNw * currentQty).toFixed(2);
            tr.querySelector('.i-gw').value = (bGw * currentQty).toFixed(2);
            tr.querySelector('.i-cbm').value = (bCbm * currentQty).toFixed(4); 
        });

        skuInput.addEventListener('change', fetchSkuInfo);
        skuInput.addEventListener('blur', fetchSkuInfo);
        searchBtn.addEventListener('click', fetchSkuInfo);

        tbody.appendChild(tr);
    };

    window.saveWebEdit = function(btnElement) {
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

        const payload = {
            action: 'import_invoice',
            invoice_no: invNo,
            report_id: 0,
            remark: '[Web Edit] ' + remark,
            customer: {
                name: document.getElementById('editCustName').value,
                address: document.getElementById('editAddress').value,
                consignee: document.getElementById('editConsignee').value,
                notify_party: document.getElementById('editNotify').value,
                incoterms: document.getElementById('editIncoterms').value,
                payment_terms: document.getElementById('editPayment').value
            },
            shipping: {
                booking_no: document.getElementById('editBookingNo').value,
                team_name: document.getElementById('editTeam').value,
                invoice_date: window.formatUniversalDate(document.getElementById('editInvDate').value),
                container_qty: document.getElementById('editContainerQty').value,
                port_loading: document.getElementById('editPortLoading').value,
                port_discharge: document.getElementById('editPortDischarge').value,
                etd_date: window.formatUniversalDate(document.getElementById('editEtd').value),
                eta_date: window.formatUniversalDate(document.getElementById('editEta').value),
                feeder_vessel: document.getElementById('editVessel').value,
                mother_vessel: document.getElementById('editMotherVessel').value,
                container_no: document.getElementById('editContainer').value,
                seal_no: document.getElementById('editSeal').value
            },
            details: details
        };

        if(btnElement) btnElement.disabled = true;
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
                Swal.fire('Success', 'บันทึกข้อมูลสำเร็จ!', 'success');
                loadHistory(); 
            } else {
                Swal.fire('Error', resData.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        })
        .finally(() => {
            if(btnElement) btnElement.disabled = false;
        });
    };

    window.fillInvoiceForm = function(inv) {
        document.getElementById('editInvoiceNo').value = inv.header.invoice_no;
        document.getElementById('editBookingNo').value = inv.shipping.booking_no || '';
        document.getElementById('editTeam').value = inv.shipping.team_name || '';
        
        document.getElementById('editCustName').value = inv.customer.name || '';
        document.getElementById('editAddress').value = inv.customer.address || '';
        document.getElementById('editConsignee').value = inv.customer.consignee || '';
        document.getElementById('editNotify').value = inv.customer.notify_party || '';
        document.getElementById('editIncoterms').value = inv.customer.incoterms || '';
        document.getElementById('editPayment').value = inv.customer.payment_terms || '';
        
        document.getElementById('editInvDate').value = window.formatDateForInput(inv.shipping.invoice_date);
        document.getElementById('editContainerQty').value = inv.shipping.container_qty || '';
        document.getElementById('editPortLoading').value = inv.shipping.port_loading || 'LAEM CHABANG, THAILAND';
        document.getElementById('editPortDischarge').value = inv.shipping.port_discharge || '';
        document.getElementById('editEtd').value = window.formatDateForInput(inv.shipping.etd_date);
        document.getElementById('editEta').value = window.formatDateForInput(inv.shipping.eta_date);
        document.getElementById('editVessel').value = inv.shipping.feeder_vessel || '';
        document.getElementById('editMotherVessel').value = inv.shipping.mother_vessel || '';
        document.getElementById('editContainer').value = inv.shipping.container_no || '';
        document.getElementById('editSeal').value = inv.shipping.seal_no || '';
        
        document.getElementById('editRemark').value = ''; 
        
        const tbody = document.querySelector('#editItemsTable tbody');
        tbody.innerHTML = '';
        if (inv.details && inv.details.length > 0) {
            inv.details.forEach(item => addEditItemRow(item));
        } else {
            addEditItemRow(); 
        }
    };

    window.searchInvoiceByNo = function() {
        const inputEl = document.getElementById('editInvoiceNo');
        let invNo = inputEl.value.trim().toUpperCase();
        inputEl.value = invNo; 

        if (!invNo || invNo === 'AUTO') return; 

        const btnSearch = document.getElementById('btnSearchInvoice');
        btnSearch.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        fetch(`api/api_invoice.php?action=get_invoice_by_no&invoice_no=${encodeURIComponent(invNo)}`)
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    Swal.fire({
                        icon: 'success', title: 'พบข้อมูลบิลเดิม!', text: 'ดึงข้อมูลเวอร์ชันล่าสุดมาให้แล้ว',
                        timer: 2500, showConfirmButton: false, toast: true, position: 'top-end'
                    });
                    fillInvoiceForm(resData); 
                } else {
                    Swal.fire({
                        icon: 'info', title: 'สร้างบิลใหม่', text: 'ไม่พบเลข Invoice นี้ในระบบ',
                        timer: 2500, showConfirmButton: false, toast: true, position: 'top-end'
                    });
                }
            })
            .catch(err => {
                console.error(err); Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            })
            .finally(() => {
                btnSearch.innerHTML = '<i class="fas fa-search"></i>';
            });
    };

    const editInvInput = document.getElementById('editInvoiceNo');
    if (editInvInput) {
        editInvInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                window.searchInvoiceByNo();
            }
        });
    }

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