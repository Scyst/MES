"use strict";

function renderPagination(containerId, totalItems, currentPage, rowsPerPage, onPageClick) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const paginationUl = document.getElementById(containerId);

    if (!paginationUl) return;
    paginationUl.innerHTML = '';
    if (totalPages <= 1) return;

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

    paginationUl.appendChild(createPageItem(currentPage - 1, '«', false, currentPage === 1));
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
    paginationUl.appendChild(createPageItem(currentPage + 1, '»', false, currentPage === totalPages));
}

function initializeTabbedPagination() {
    const mainTabContainer = document.getElementById('mainTab');
    const mainContentContainer = document.getElementById('main-content');
    if (!mainTabContainer || !mainContentContainer) {
        return;
    }
    const tabButtons = mainTabContainer.querySelectorAll('.nav-link');
    const paginations = mainContentContainer.querySelectorAll('.sticky-bottom');
    function showCorrectPagination(activeTabId) {
        paginations.forEach(pagination => {
            if (pagination.dataset.tabTarget === activeTabId) {
                pagination.style.display = 'block';
            } else {
                pagination.style.display = 'none';
            }
        });
    }
    const initialActiveTab = mainTabContainer.querySelector('.nav-link.active');
    if (initialActiveTab) {
        showCorrectPagination(initialActiveTab.getAttribute('data-bs-target'));
    }
    tabButtons.forEach(button => {
        button.addEventListener('shown.bs.tab', function (event) {
            const activeTabId = event.target.getAttribute('data-bs-target');
            showCorrectPagination(activeTabId);
        });
    });
}

document.addEventListener('DOMContentLoaded', initializeTabbedPagination);