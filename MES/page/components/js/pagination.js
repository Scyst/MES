"use strict";

/**
 * Creates and manages pagination controls for a table.
 * @param {string} paginationId - The ID of the <ul> element for pagination.
 * @param {number} currentPage - The current active page.
 * @param {number} totalPages - The total number of pages.
 * @param {function(number): void} onPageClick - Callback function to execute when a page number is clicked.
 */
function setupPagination(paginationId, currentPage, totalPages, onPageClick) {
    const paginationUl = document.getElementById(paginationId);
    if (!paginationUl) return;

    paginationUl.innerHTML = ''; // Clear old pagination

    if (totalPages <= 1) return; // Don't show pagination if there's only one page

    const createPageItem = (pageNumber, text, isActive = false, isDisabled = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!isDisabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                onPageClick(pageNumber);
            });
        }
        li.appendChild(a);
        return li;
    };

    // "Previous" button
    paginationUl.appendChild(createPageItem(currentPage - 1, '«', false, currentPage === 1));

    // Page numbers
    const MAX_VISIBLE_PAGES = 5;
    let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

    if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
        startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
    }
    
    if (startPage > 1) {
        paginationUl.appendChild(createPageItem(1, '1'));
        if (startPage > 2) {
            paginationUl.appendChild(createPageItem(0, '...', false, true));
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationUl.appendChild(createPageItem(i, i.toString(), i === currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationUl.appendChild(createPageItem(0, '...', false, true));
        }
        paginationUl.appendChild(createPageItem(totalPages, totalPages.toString()));
    }

    // "Next" button
    paginationUl.appendChild(createPageItem(currentPage + 1, '»', false, currentPage === totalPages));
}


// --- ★★★ ส่วนที่เพิ่มเข้ามาใหม่ทั้งหมด ★★★ ---

/**
 * Initializes and manages the visibility of paginations within a tabbed interface.
 */
function initializeTabbedPagination() {
    // 1. ค้นหาองค์ประกอบที่จำเป็น
    const mainTabContainer = document.getElementById('mainTab');
    const mainContentContainer = document.getElementById('main-content');

    // 2. ถ้าไม่เจอ Tab Container ให้ออกจากฟังก์ชัน (หมายความว่าหน้านี้ไม่มี Tab)
    if (!mainTabContainer || !mainContentContainer) {
        return;
    }

    // 3. ค้นหาปุ่ม Tab และแถบ Pagination ทั้งหมด
    const tabButtons = mainTabContainer.querySelectorAll('.nav-link');
    const paginations = mainContentContainer.querySelectorAll('.sticky-bottom');

    // 4. ฟังก์ชันสำหรับซ่อน/แสดง Pagination ที่ถูกต้อง
    function showCorrectPagination(activeTabId) {
        paginations.forEach(pagination => {
            // ตรวจสอบจาก 'data-tab-target' ที่เราตั้งไว้ใน HTML
            if (pagination.dataset.tabTarget === activeTabId) {
                pagination.style.display = 'block';
            } else {
                pagination.style.display = 'none';
            }
        });
    }

    // 5. แสดง Pagination ที่ถูกต้องเมื่อหน้าโหลดครั้งแรก
    const initialActiveTab = mainTabContainer.querySelector('.nav-link.active');
    if (initialActiveTab) {
        showCorrectPagination(initialActiveTab.getAttribute('data-bs-target'));
    }

    // 6. เพิ่ม Event Listener ให้กับทุกปุ่ม Tab
    tabButtons.forEach(button => {
        // ใช้ Event 'shown.bs.tab' ของ Bootstrap ซึ่งจะทำงานหลังจาก Tab แสดงผลแล้ว
        button.addEventListener('shown.bs.tab', function (event) {
            const activeTabId = event.target.getAttribute('data-bs-target');
            showCorrectPagination(activeTabId);
        });
    });
}

// --- ★★★ เรียกใช้งานฟังก์ชันใหม่เมื่อหน้าเว็บโหลดเสร็จ ★★★ ---
document.addEventListener('DOMContentLoaded', initializeTabbedPagination);