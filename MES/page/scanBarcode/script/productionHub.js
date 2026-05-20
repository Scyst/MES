"use strict";

const HUB_API_URL = 'api/productionHubAPI.php';
let isProcessingTransaction = false;

async function submitProductionData(source, payload, submitButtonId) {
    if (isProcessingTransaction) return;

    // Client-Side Validation
    if (!payload.itemId || !payload.locationId || payload.quantity <= 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุข้อมูลให้ครบถ้วนและจำนวนต้องมากกว่า 0', 'warning');
        return;
    }

    isProcessingTransaction = true;
    const btnSubmit = document.getElementById(submitButtonId);
    let originalBtnText = '';

    // Operator Proofing: Lock Button State
    if (btnSubmit) {
        originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังบันทึก...';
    }

    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput && source === 'BARCODE') barcodeInput.disabled = true;

    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        payload.inputSource = source; // 'BARCODE', 'MANUAL', etc.

        const response = await fetch(`${HUB_API_URL}?action=record_production`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRF-TOKEN': csrfToken 
            },
            body: JSON.stringify(payload)
        });
        
        const res = await response.json();
        
        if (res.success) {
            // Success Handling
            if (source === 'BARCODE') {
                if (typeof showScanStatus === 'function') showScanStatus('success', res.message);
            } else {
                Swal.fire('สำเร็จ', res.message, 'success');
                // Hide Modal if triggered from Manual Modal
                const modalEl = document.querySelector('.modal.show');
                if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
            }
            
            // Refresh Components based on what is active on the UI
            if (typeof fetchJobs === 'function') fetchJobs(true);
            if (typeof loadTransactionLogs === 'function') loadTransactionLogs();
            
        } else {
            Swal.fire('ข้อผิดพลาด', res.message, 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('ข้อผิดพลาด', 'การเชื่อมต่อเครือข่ายล้มเหลว ไม่สามารถบันทึกได้', 'error');
    } finally {
        // Unlock State
        isProcessingTransaction = false;
        
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
        if (barcodeInput && source === 'BARCODE') {
            barcodeInput.disabled = false;
            barcodeInput.value = '';
            barcodeInput.focus();
        }
    }
}

// Example usage bindings:
// สำหรับฟอร์ม Manual
const manualForm = document.getElementById('manualProductionForm');
if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            itemId: document.getElementById('modal_item').value,
            locationId: document.getElementById('modal_location').value,
            quantity: parseFloat(document.getElementById('modal_qty').value),
            productionType: document.getElementById('modal_type').value,
            lotNo: document.getElementById('modal_lot').value || '',
            notes: document.getElementById('modal_note').value || ''
        };
        submitProductionData('MANUAL', payload, 'btnSaveManual');
    });
}