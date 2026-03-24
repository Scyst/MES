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
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || `HTTP Error: ${response.status}`);
        }
        return result;
        
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
        throw error;
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