"use strict";

/**
 * ฟังก์ชันสำหรับสร้าง Pagination Control ที่สามารถนำไปใช้ได้ทุกที่
 * @param {string} containerId - ID ของ <ul> ที่จะใส่ pagination
 * @param {number} totalItems - จำนวนรายการทั้งหมด
 * @param {number} currentPage - หน้าปัจจุบัน
 * @param {number} rowsPerPage - จำนวนรายการต่อหน้า
 * @param {function} callback - ฟังก์ชันที่จะถูกเรียกเมื่อมีการคลิกเปลี่ยนหน้า (จะส่งหมายเลขหน้ากลับไป)
 */
function renderPagination(containerId, totalItems, currentPage, rowsPerPage, callback) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const pagination = document.getElementById(containerId);
    
    if (!pagination) {
        console.error(`Pagination container with ID "${containerId}" not found.`);
        return;
    }
    
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const createPageItem = (page, text, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = text;
        if (!isDisabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (callback && typeof callback === 'function') {
                    callback(page);
                }
            });
        }
        li.appendChild(a);
        return li;
    };

    pagination.appendChild(createPageItem(currentPage - 1, '«', currentPage <= 1));

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
        endPage = Math.min(5, totalPages);
    }
    if (currentPage > totalPages - 3) {
        startPage = Math.max(1, totalPages - 4);
    }

    if (startPage > 1) {
        pagination.appendChild(createPageItem(1, '1'));
        if (startPage > 2) {
            pagination.appendChild(createPageItem(0, '...', true));
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageItem(i, i, false, i === currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.appendChild(createPageItem(0, '...', true));
        }
        pagination.appendChild(createPageItem(totalPages, totalPages));
    }

    pagination.appendChild(createPageItem(currentPage + 1, '»', currentPage >= totalPages));
}