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
        const rawMsg = error.message;
        const friendlyMsg = translateTechnicalError(rawMsg);
        
        let htmlContent = `
            <div class="mb-2" style="font-size: 1rem; text-align: left;">
                <i class="fas fa-exclamation-circle text-danger me-1"></i> <strong>${escapeHTML(friendlyMsg)}</strong>
            </div>
        `;
        
        if (friendlyMsg !== rawMsg) {
            htmlContent += `
                <div class="text-danger p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 mt-2" style="font-size: 0.85rem; text-align: left; line-height: 1.5; max-height: 100px; overflow-y: auto; font-family: monospace;">
                    <strong>Technical Details:</strong><br/>
                    ${escapeHTML(rawMsg)}
                </div>
            `;
        }
        
        htmlContent += `<div class="small text-muted mt-3 text-start">กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง หรือถ่ายรูปหน้าจอนี้แจ้งไอที</div>`;

        Swal.fire({
            title: 'แจ้งเตือนจากระบบ',
            html: htmlContent,
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

function translateTechnicalError(errMsg) {
    if (!errMsg) return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    
    // ถ้าข้อความมีภาษาไทยอยู่แล้ว แสดงว่าเป็นข้อความที่ส่งมาจากระบบ (อ่านง่ายอยู่แล้ว)
    if (/[\u0E00-\u0E7F]/.test(errMsg)) {
        return errMsg;
    }
    
    const msg = errMsg.toLowerCase();
    
    if (msg.includes("conversion failed when converting date and/or time")) return "รูปแบบวันที่ในไฟล์ไม่ถูกต้อง (ระบบอ่านวันที่ไม่ได้)";
    if (msg.includes("string or binary data would be truncated")) return "ข้อมูลมีขนาดหรือความยาวเกินกว่าที่ระบบรองรับ";
    if (msg.includes("violation of primary key") || msg.includes("cannot insert duplicate key") || msg.includes("unique constraint")) return "พบข้อมูลซ้ำซ้อนในระบบ";
    if (msg.includes("conflicted with the foreign key constraint")) return "ข้อมูลอ้างอิงไม่ถูกต้อง หรือไม่มีรหัสนี้ใน Master Data";
    if (msg.includes("timeout expired")) return "การเชื่อมต่อใช้เวลานานเกินไป (Timeout)";
    if (msg.includes("deadlock")) return "ระบบมีการประมวลผลทับซ้อนกันชั่วคราว กรุณาลองใหม่อีกครั้ง";
    if (msg.includes("unauthorized") || msg.includes("permission denied")) return "คุณไม่มีสิทธิ์ในการทำรายการนี้";
    if (msg.includes("csrf")) return "เซสชันหมดอายุ หรือคำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ";
    if (msg.includes("network")) return "เกิดปัญหาในการเชื่อมต่อเครือข่ายอินเทอร์เน็ต";
    if (msg.includes("syntax error") || msg.includes("unexpected token")) return "พบรูปแบบข้อมูลตอบกลับจากระบบผิดปกติ";
    if (msg.includes("invalid column name")) return "โครงสร้างข้อมูลไม่ตรงกัน (พบข้อผิดพลาดที่คอลัมน์)";
    
    return "พบข้อผิดพลาดของระบบ (ดูรายละเอียดในกล่องข้อความด้านล่าง)";
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