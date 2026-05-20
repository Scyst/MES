// page/sales/script/scan_loading.js

document.addEventListener('DOMContentLoaded', () => {
    const barcodeInput = document.getElementById('barcodeInput');
    barcodeInput.focus();
    
    // Ensure focus is kept on the input field when clicking anywhere else
    document.body.addEventListener('click', (e) => {
        barcodeInput.focus();
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
});

let scanHistory = [];

function processScan(uuid) {
    const barcodeInput = document.getElementById('barcodeInput');

    // Disable input while processing
    barcodeInput.disabled = true;
    showStatus('processing', 'กำลังตรวจสอบแท็ก...');
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    // Call API
    fetch('../production/api/transferManage.php?action=execute_scan_sale', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
        },
        body: JSON.stringify({
            transfer_uuid: uuid
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showStatus('success', 'ตัดสต็อกโหลดขายสำเร็จ: ' + uuid);
            playAudio('success');
            addToHistory(uuid, 'โหลดขายสำเร็จ', true);
        } else {
            showStatus('error', data.message || 'เกิดข้อผิดพลาดในการโหลดขาย');
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
        wrapper.style.borderColor = 'var(--warning)';
    }
    
    msg.textContent = message;
    
    // Reset wrapper border after a while
    if (type !== 'processing') {
        setTimeout(() => {
            wrapper.style.borderColor = '';
        }, 3000);
    }
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
