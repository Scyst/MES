// MES/page/storeManagement/script/storeCommon.js
"use strict";

async function fetchAPI(action, method = 'GET', bodyData = null, buttonId = null) {
    let btn = null;
    let originalHtml = '';
    
    if (buttonId) {
        btn = document.getElementById(buttonId);
        if (btn) {
            if (btn.disabled) return null; 
            originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    }

    try {
        const url = `api/api_store.php?action=${action}`;
        const options = { method: method };

        if (method === 'POST') {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
            
            if (bodyData instanceof FormData) {
                bodyData.append('csrf_token', csrfToken);
                options.body = bodyData;
            } else {
                bodyData = bodyData || {};
                bodyData.csrf_token = csrfToken;
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(bodyData);
            }
        }

        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        let result;
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            throw new Error("เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็นรูปแบบ JSON (อาจหมดเวลา Session หรือ Network ขัดข้อง)");
        }
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || `เกิดข้อผิดพลาดรหัส: ${response.status}`);
        }
        return result;
        
    } catch (error) {
        Swal.fire({
            title: 'แจ้งเตือนจากระบบ',
            html: `<div class="text-danger p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25" style="font-size: 1rem; text-align: left; line-height: 1.5;">
                     <i class="fas fa-exclamation-triangle me-1"></i> ${escapeHTML(error.message)}
                   </div>
                   <div class="small text-muted mt-3 text-start">กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง</div>`,
            icon: 'warning',
            confirmButtonText: 'รับทราบ',
            confirmButtonColor: '#6c757d',
            width: '500px'
        });
        
        return null; 
        
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

function formatDateForPrint(dateStr) {
    if (!dateStr) return '';
    const datePart = String(dateStr).split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[2].padStart(2, '0')}-${months[parseInt(parts[1], 10) - 1]}-${parts[0].substring(2)}`;
}