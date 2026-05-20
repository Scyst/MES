// page/storeManagement/script/scan_receive.js

document.addEventListener('DOMContentLoaded', () => {
    loadLocations();
    
    const barcodeInput = document.getElementById('barcodeInput');
    barcodeInput.focus();
    
    // Ensure focus is kept on the input field when clicking anywhere else
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
            barcodeInput.focus();
        }
    });

    barcodeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const uuid = this.value.trim();
            if (uuid) {
                processScan(uuid);
            }
        }
    });
    
    // Select the first valid location after loading locations
    document.getElementById('to_location_id').addEventListener('change', () => {
        barcodeInput.focus();
    });
});

function loadLocations() {
    // We can fetch locations from scanManage API or general location API
    fetch('../scanBarcode/api/scanManage.php?action=get_locations')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('to_location_id');
                select.innerHTML = '<option value="">-- เลือกคลังสินค้าปลายทาง --</option>';
                data.data.forEach(loc => {
                    // Filter for FG Warehouse locations if possible, otherwise list all
                    if (loc.location_name.toUpperCase().includes('WH') || loc.location_name.toUpperCase().includes('WAREHOUSE') || loc.location_name.toUpperCase().includes('FG')) {
                        const opt = document.createElement('option');
                        opt.value = loc.location_id;
                        opt.textContent = loc.location_name;
                        select.appendChild(opt);
                    }
                });
                
                // If only one option, select it auto
                if (select.options.length === 2) {
                    select.selectedIndex = 1;
                } else if (select.options.length === 1) {
                    // Fallback to all locations if no WH found
                    select.innerHTML = '<option value="">-- เลือกคลังสินค้าปลายทาง --</option>';
                    data.data.forEach(loc => {
                        const opt = document.createElement('option');
                        opt.value = loc.location_id;
                        opt.textContent = loc.location_name;
                        select.appendChild(opt);
                    });
                }
            }
        })
        .catch(err => console.error('Error loading locations:', err));
}

let scanHistory = [];

function processScan(uuid) {
    const locationId = document.getElementById('to_location_id').value;
    const barcodeInput = document.getElementById('barcodeInput');
    
    if (!locationId) {
        showStatus('error', 'กรุณาเลือกคลังสินค้าปลายทางก่อนทำการสแกน');
        barcodeInput.value = '';
        barcodeInput.focus();
        playAudio('error');
        return;
    }

    // Disable input while processing
    barcodeInput.disabled = true;
    showStatus('processing', 'กำลังตรวจสอบแท็ก...');
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    // Call API
    fetch('../production/api/transferManage.php?action=confirm_transfer', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
        },
        body: JSON.stringify({
            transfer_uuid: uuid,
            to_location_id: locationId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showStatus('success', 'รับเข้าสำเร็จ: ' + uuid);
            playAudio('success');
            
            // Extract some info if available, or just mock it since the API doesn't return full details
            // We can fetch details via get_transfer_details if needed, but let's just display success
            updateLastScanned({
                uuid: uuid,
                qty: 'N/A', // The API doesn't return the qty, we could modify the API to return it
                part: 'N/A'
            });
            
            addToHistory(uuid, 'รับเข้าสำเร็จ', true);
        } else {
            showStatus('error', data.message || 'เกิดข้อผิดพลาดในการรับเข้า');
            playAudio('error');
            addToHistory(uuid, data.message || 'Failed', false);
        }
    })
    .catch(err => {
        showStatus('error', 'ข้อผิดพลาดระบบเครือข่าย');
        playAudio('error');
        console.error(err);
    })
    .finally(() => {
        barcodeInput.disabled = false;
        barcodeInput.value = '';
        barcodeInput.focus();
    });
}

function showStatus(type, message) {
    const indicator = document.getElementById('statusIndicator');
    const icon = document.getElementById('statusIcon');
    const msg = document.getElementById('statusMessage');
    const wrapper = document.getElementById('scanWrapper');
    
    indicator.className = 'status-indicator';
    indicator.style.display = 'flex';
    
    if (type === 'success') {
        indicator.classList.add('success');
        icon.className = 'fas fa-check-circle';
        wrapper.style.borderColor = 'var(--success)';
    } else if (type === 'error') {
        indicator.classList.add('error');
        icon.className = 'fas fa-exclamation-circle';
        wrapper.style.borderColor = 'var(--danger)';
    } else {
        icon.className = 'fas fa-spinner fa-spin';
        wrapper.style.borderColor = 'var(--primary)';
    }
    
    msg.textContent = message;
    
    // Reset wrapper border after a while
    if (type !== 'processing') {
        setTimeout(() => {
            wrapper.style.borderColor = '';
        }, 3000);
    }
}

function updateLastScanned(data) {
    document.getElementById('lastScanCard').classList.remove('d-none');
    document.getElementById('lsUUID').textContent = data.uuid;
    document.getElementById('lsPartNo').textContent = data.part || '-';
    document.getElementById('lsQty').textContent = data.qty || '-';
    document.getElementById('lsTime').textContent = new Date().toLocaleTimeString('th-TH');
}

function addToHistory(uuid, statusMsg, isSuccess) {
    const tbody = document.getElementById('historyBody');
    
    // Remove "empty" row if it exists
    if (scanHistory.length === 0) {
        tbody.innerHTML = '';
    }
    
    const timeStr = new Date().toLocaleTimeString('th-TH');
    
    scanHistory.unshift({ uuid, timeStr, statusMsg, isSuccess });
    
    // Keep max 20 rows
    if (scanHistory.length > 20) {
        scanHistory.pop();
    }
    
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    scanHistory.forEach(item => {
        const tr = document.createElement('tr');
        
        const badgeClass = item.isSuccess ? 'badge-success' : 'badge-danger';
        
        tr.innerHTML = `
            <td>${item.timeStr}</td>
            <td><strong>${item.uuid}</strong></td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge-status ${badgeClass}">${item.statusMsg}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function playAudio(type) {
    try {
        const audio = document.getElementById(type + 'Sound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play prevented by browser policy'));
        }
    } catch(e) {}
}
