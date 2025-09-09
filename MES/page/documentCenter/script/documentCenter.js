"use strict";

document.addEventListener('DOMContentLoaded', function () {
    // =================================================================
    // SECTION 1: API & GLOBAL VARIABLES
    // =================================================================
    const API_ENDPOINT = 'api/';
    let currentPage = 1;
    let currentSearchTerm = '';
    let currentCategory = ''; 
    let debounceTimer;
    let currentDocumentCache = [];
    
    // --- Element & Modal References ---
    const documentTableBody = document.getElementById('documentTableBody');
    const searchInput = document.getElementById('docSearchInput');
    const paginationControls = document.getElementById('paginationControls');
    const uploadDocBtn = document.getElementById('uploadDocBtn');
    const uploadDocModalEl = document.getElementById('uploadDocModal');
    const uploadDocModal = uploadDocModalEl ? new bootstrap.Modal(uploadDocModalEl) : null;
    const uploadDocForm = document.getElementById('uploadDocForm');
    const viewDocModalEl = document.getElementById('viewDocModal');
    const viewDocModal = viewDocModalEl ? new bootstrap.Modal(viewDocModalEl) : null;
    
    // --- New elements for Category Picker ---
    const categoryPickerMenu = document.getElementById('categoryPickerMenu');
    const categoryPickerList = document.getElementById('categoryPickerList');
    const categoryPickerDropdownBtn = document.getElementById('categoryDropdown');
    const currentCategoryText = document.getElementById('currentCategoryText');
    const categoryPickerBreadcrumbs = document.getElementById('categoryPickerBreadcrumbs');
    const categoryPickerBackBtn = categoryPickerBreadcrumbs ? categoryPickerBreadcrumbs.querySelector('.btn-back-category') : null;
    const breadcrumbTextSpan = categoryPickerBreadcrumbs ? categoryPickerBreadcrumbs.querySelector('.breadcrumb-text') : null;

    let allCategoriesTree = { name: 'Root', children: {}, path: '' }; // Store the full category tree
    let currentDrilldownPath = ''; // Track current path in the dropdown picker

    // =================================================================
    // SECTION 2: CORE FUNCTIONS
    // =================================================================
    async function sendRequest(url, method = 'GET', body = null) {
        try {
            const options = { method, headers: {} };
            if (body) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(errorResult.error || 'An unknown error occurred.');
            }
            return await response.json();
        } catch (error) {
            console.error(`Request failed: ${method} ${url}`, error);
            showToast(error.message, 'var(--bs-danger)');
            return { success: false, error: error.message };
        }
    }
    
    // =================================================================
    // SECTION 3: CATEGORY TREE & DOCUMENT FETCHING (ปรับปรุงใหม่สำหรับ Drilldown)
    // =================================================================
    async function fetchCategoriesAndBuildTree() {
        try {
            if (categoryPickerList) {
                categoryPickerList.innerHTML = `<li class="p-3 text-center text-muted">
                                                    <div class="spinner-border spinner-border-sm" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <span class="ms-2">Loading Categories...</span>
                                                </li>`;
            }
            const result = await sendRequest(`${API_ENDPOINT}get_categories.php`);
            if (result.success && result.data) {
                allCategoriesTree = buildCategoryTree(result.data); // Store the full tree
                renderDrilldownCategories(currentDrilldownPath); // Render initial level
            } else {
                if (categoryPickerList) categoryPickerList.innerHTML = '<li class="p-3 text-center text-muted">No categories found.</li>';
            }
        } catch (error) {
            if (categoryPickerList) categoryPickerList.innerHTML = '<li class="p-3 text-center text-danger">Failed to load categories.</li>';
        }
    }

    function buildCategoryTree(paths) {
        const tree = { name: 'Root', children: {}, path: '' };
        paths.forEach(path => {
            let currentLevel = tree;
            path.split('/').forEach((part, index, arr) => {
                if (!currentLevel.children[part]) {
                    const currentPath = arr.slice(0, index + 1).join('/');
                    currentLevel.children[part] = { name: part, children: {}, path: currentPath };
                }
                currentLevel = currentLevel.children[part];
            });
        });
        return tree;
    }

    // ### New Function: Render Categories for Drilldown Picker ###
    function renderDrilldownCategories(parentPath = '') {
        if (!categoryPickerList) return;

        let currentNode = allCategoriesTree;
        if (parentPath) {
            const pathParts = parentPath.split('/');
            for (const part of pathParts) {
                if (currentNode && currentNode.children[part]) {
                    currentNode = currentNode.children[part];
                } else {
                    currentNode = null; // Path not found
                    break;
                }
            }
        }

        categoryPickerList.innerHTML = ''; // Clear previous list

        if (!currentNode || Object.keys(currentNode.children).length === 0) {
            categoryPickerList.innerHTML = '<li class="p-3 text-center text-muted">No sub-categories.</li>';
        } else {
            // Render sub-categories
            Object.values(currentNode.children)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .forEach(childNode => {
                      const hasChildren = Object.keys(childNode.children).length > 0;
                      const li = document.createElement('li');
                      li.innerHTML = `
                          <a class="dropdown-item category-item ${currentCategory === childNode.path ? 'active' : ''}" href="#" 
                             data-category="${escapeHTML(childNode.path)}" 
                             data-has-children="${hasChildren ? 'true' : 'false'}">
                              <i class="fas ${hasChildren ? 'fa-folder' : 'fa-file-alt'}"></i> 
                              ${escapeHTML(childNode.name)}
                              ${hasChildren ? '<i class="fas fa-chevron-right folder-arrow ms-auto"></i>' : ''}
                          </a>
                      `;
                      categoryPickerList.appendChild(li);
                  });
        }
        
        updateCategoryPickerDisplay(); // Update dropdown button text and breadcrumbs
    }

    // New Function: Update dropdown button text and breadcrumbs
    function updateCategoryPickerDisplay() {
        if (currentCategoryText) {
            // Find the active node to display in the button
            let displayPath = 'All Documents';
            if (currentCategory) {
                let parts = currentCategory.split('/');
                displayPath = parts[parts.length - 1]; // Last part of the path
            }
            currentCategoryText.textContent = displayPath;
        }

        if (categoryPickerBreadcrumbs && breadcrumbTextSpan) {
            if (currentDrilldownPath) {
                categoryPickerBreadcrumbs.classList.remove('d-none');
                const pathParts = currentDrilldownPath.split('/');
                breadcrumbTextSpan.textContent = pathParts[pathParts.length - 1]; // Show last part of current drilldown path
            } else {
                categoryPickerBreadcrumbs.classList.add('d-none');
            }
        }
    }

    async function fetchDocuments(page = 1, searchTerm = '', category = '') {
        showSpinner();
        try {
            const params = new URLSearchParams({ page, search: searchTerm, category });
            const url = `${API_ENDPOINT}get_documents.php?${params.toString()}`;
            const result = await sendRequest(url);
            if (result.error) { throw new Error(result.error); }
            currentDocumentCache = result.data || [];
            renderTable(currentDocumentCache);
            setupPagination(result.pagination);
        } catch (error) {
            console.error(error);
            documentTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load documents.</td></tr>`;
        } finally {
            hideSpinner();
        }
    }
    
    // =================================================================
    // SECTION 4: MODAL & ACTIONS
    // =================================================================
    function getFileIconClass(fileName) {
        if (!fileName) return 'fa-file-alt text-secondary';
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return 'fa-file-pdf text-danger';
            case 'xls': case 'xlsx': return 'fa-file-excel text-success';
            case 'doc': case 'docx': return 'fa-file-word text-primary';
            case 'png': case 'jpg': case 'jpeg': case 'gif': return 'fa-file-image text-info';
            case 'zip': case 'rar': case '7z': return 'fa-file-archive text-warning';
            case 'txt': return 'fa-file-alt text-muted';
            default: return 'fa-file-alt text-secondary';
        }
    }
    function renderTable(documents) {
        documentTableBody.innerHTML = '';
        if (!documents || documents.length === 0) {
            documentTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No documents found.</td></tr>`;
            return;
        }
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.dataset.docId = doc.id;

            // --- สร้าง Category Path แบบ Breadcrumbs ในตาราง ---
            const categoryPathTd = document.createElement('td');
            if (doc.category) {
                const pathParts = doc.category.split('/');
                pathParts.forEach((part, index) => {
                    if (index > 0) {
                        const slash = document.createElement('span');
                        slash.textContent = ' / ';
                        categoryPathTd.appendChild(slash);
                    }
                    const categoryLink = document.createElement('a');
                    const fullPath = pathParts.slice(0, index + 1).join('/');
                    categoryLink.href = "#";
                    categoryLink.textContent = escapeHTML(part);
                    categoryLink.dataset.category = fullPath;
                    categoryLink.classList.add('table-category-link', 'text-primary'); // เพิ่ม class สำหรับ style
                    categoryPathTd.appendChild(categoryLink);
                });
            } else {
                categoryPathTd.innerHTML = '<i class="text-muted">N/A</i>';
            }
            // ---------------------------------------------------

            tr.innerHTML = `<td><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</td><td>${escapeHTML(doc.file_description) || '<i class="text-muted">No description</i>'}</td><td id="category-path-${doc.id}"></td><td>${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</td>`;
            tr.querySelector(`#category-path-${doc.id}`).appendChild(categoryPathTd); // ใส่ Breadcrumbs ที่สร้างเข้าไป
            documentTableBody.appendChild(tr);
        });

        // Add event listener for category links in the table
        documentTableBody.querySelectorAll('.table-category-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation to row click (open detail modal)
                const categoryToFilter = this.dataset.category;
                
                // Set the current category and fetch documents
                currentCategory = categoryToFilter;
                currentPage = 1;
                fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                
                // Also update the dropdown picker's display to reflect this category
                currentDrilldownPath = categoryToFilter; // Sync drilldown path
                updateCategoryPickerDisplay(); // Update button text and breadcrumbs
                renderDrilldownCategories(currentDrilldownPath); // Re-render dropdown list
            });
        });
    }
    function setupPagination(paginationData) {
        const paginationUl = document.getElementById('paginationControls');
        if (!paginationData || paginationData.totalPages <= 1) {
            if (paginationUl) paginationUl.innerHTML = '';
            return;
        }
        renderPagination('paginationControls', paginationData.totalRecords, paginationData.currentPage, 15, (page) => fetchDocuments(page, currentSearchTerm, currentCategory));
    }
    async function handleUploadSubmit(event) {
        event.preventDefault();
        const fileInput = document.getElementById('docFile');
        const filesToUpload = Array.from(fileInput.files); 
        if (filesToUpload.length === 0) {
            alert('Please select one or more files to upload.');
            return;
        }
        uploadDocModal.hide();
        showSpinner(); 
        const description = document.getElementById('docDescription').value;
        const category = document.getElementById('docCategory').value;
        let filesUploaded = 0, uploadErrors = 0;
        for (const file of filesToUpload) {
            const formData = new FormData();
            formData.append('doc_file', file);
            formData.append('file_description', description);
            formData.append('category', category);
            try {
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.addEventListener('load', () => xhr.status === 200 ? resolve(xhr.response) : reject(new Error(JSON.parse(xhr.responseText).error)));
                    xhr.addEventListener('error', () => reject(new Error('Network error')));
                    xhr.open('POST', `${API_ENDPOINT}upload_document.php`, true);
                    xhr.send(formData);
                });
                filesUploaded++;
            } catch (error) {
                uploadErrors++;
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }
        hideSpinner();
        if (uploadErrors > 0) {
            showToast(`${filesUploaded} of ${filesToUpload.length} files uploaded. ${uploadErrors} failed.`, 'var(--bs-warning)');
        } else {
            showToast(`${filesToUpload.length} file(s) uploaded successfully!`, 'var(--bs-success)');
        }
        fetchDocuments(1, '', currentCategory);
        fetchCategoriesAndBuildTree(); 
    }

    function openDetailModal(docId) {
        const doc = currentDocumentCache.find(d => d.id == docId);
        if (!doc || !viewDocModalEl) return;
        
        const documentDetailsContent = viewDocModalEl.querySelector('#document-details-content');
        const editDocForm = viewDocModalEl.querySelector('#editDocForm');
        const viewBtn = viewDocModalEl.querySelector('#viewDocBtn');
        const deleteBtn = viewDocModalEl.querySelector('#deleteDocBtn');
        const editDocBtn = viewDocModalEl.querySelector('#editDocBtn');

        documentDetailsContent.innerHTML = `<h5 class="mb-3"><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</h5><dl class="row"><dt class="col-sm-3">Description</dt><dd class="col-sm-9">${escapeHTML(doc.file_description) || '<i class="text-muted">N/A</i>'}</dd><dt class="col-sm-3">Category</dt><dd class="col-sm-9">${escapeHTML(doc.category) || '<i class="text-muted">N/A</i>'}</dd><dt class="col-sm-3">Uploaded By</dt><dd class="col-sm-9">${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</dd><dt class="col-sm-3">Uploaded At</dt><dd class="col-sm-9">${new Date(doc.created_at).toLocaleString()}</dd></dl>`;
        
        const newViewBtn = viewBtn.cloneNode(true); 
        viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);
        newViewBtn.addEventListener('click', () => window.open(`${API_ENDPOINT}view_document.php?id=${doc.id}`, '_blank'));

        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            newDeleteBtn.addEventListener('click', () => handleDelete(doc.id, doc.file_name));
        }
        if (editDocBtn) {
            const newEditDocBtn = editDocBtn.cloneNode(true);
            editDocBtn.parentNode.replaceChild(newEditDocBtn, editDocBtn);
            newEditDocBtn.addEventListener('click', () => {
                documentDetailsContent.style.display = 'none';
                editDocForm.style.display = 'block';
                editDocForm.querySelector('#editDocId').value = doc.id;
                editDocForm.querySelector('#editDocDescription').value = doc.file_description || '';
                editDocForm.querySelector('#editDocCategory').value = doc.category || '';
            });
        }
        
        viewDocModal.show();
    }
    async function handleDelete(docId, docName) {
        if (!confirm(`Are you sure you want to delete the file "${docName}"?`)) return;
        showSpinner();
        const result = await sendRequest(`${API_ENDPOINT}delete_document.php`, 'POST', { document_id: docId });
        hideSpinner();
        if (result.success) {
            viewDocModal.hide();
            showToast('Document deleted successfully.', 'var(--bs-success)');
            fetchDocuments(currentPage, currentSearchTerm, currentCategory);
            fetchCategoriesAndBuildTree();
        }
    }
    async function handleEditSubmit(event) {
        event.preventDefault();
        showSpinner();
        const form = event.target;
        const result = await sendRequest(`${API_ENDPOINT}update_document.php`, 'POST', {
            document_id: form.querySelector('#editDocId').value,
            description: form.querySelector('#editDocDescription').value,
            category: form.querySelector('#editDocCategory').value
        });
        hideSpinner();
        if (result.success) {
            showToast('Document updated successfully!', 'var(--bs-success)');
            viewDocModal.hide();
            fetchDocuments(currentPage, currentSearchTerm, currentCategory);
            fetchCategoriesAndBuildTree();
        }
    }

    // =================================================================
    // SECTION 5: INITIALIZATION & EVENT LISTENERS
    // =================================================================
    function initialize() {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearchTerm = searchInput.value;
                currentPage = 1;
                fetchDocuments(currentPage, currentSearchTerm, currentCategory);
            }, 500);
        });

        // Event Listener for Category Picker (Drilldown Logic)
        if (categoryPickerMenu) {
            categoryPickerMenu.addEventListener('click', (e) => {
                e.stopPropagation(); // <<< เพิ่มตรงนี้: หยุดการ propagation ของ click event
                const item = e.target.closest('.category-item');
                const backBtn = e.target.closest('.btn-back-category');

                if (item) {
                    const category = item.dataset.category;
                    const hasChildren = item.dataset.hasChildren === 'true';

                    if (hasChildren) {
                        e.preventDefault(); // <<< เพิ่มตรงนี้: ป้องกันลิงก์ทำงาน (ซึ่งจะทำให้ dropdown ปิด)
                        currentDrilldownPath = category; // Move deeper
                        renderDrilldownCategories(currentDrilldownPath);
                        // ไม่ปิด dropdown แต่เปลี่ยนเนื้อหา
                    } else {
                        // เลือก Category (ไม่มีลูก) หรือ All Documents
                        e.preventDefault(); // <<< ยังคงป้องกันลิงก์ทำงาน
                        currentCategory = category;
                        currentPage = 1;
                        fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                        // Update the button text right away for immediate feedback
                        updateCategoryPickerDisplay(); 
                        bootstrap.Dropdown.getInstance(categoryPickerDropdownBtn).hide(); // ปิด dropdown
                    }
                } else if (backBtn) {
                    e.preventDefault(); // <<< ป้องกันลิงก์ทำงาน
                    // Go back up one level
                    if (currentDrilldownPath) {
                        const pathParts = currentDrilldownPath.split('/');
                        pathParts.pop(); // Remove last part
                        currentDrilldownPath = pathParts.join('/'); // New parent path
                        renderDrilldownCategories(currentDrilldownPath);
                    } else {
                        // ถ้าอยู่ root แล้ว กด Back (ไม่ควรเกิดขึ้นถ้า Breadcrumbs ถูกซ่อน) ให้เลือก All Documents
                        currentCategory = ''; 
                        currentPage = 1;
                        fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                        updateCategoryPickerDisplay();
                        bootstrap.Dropdown.getInstance(categoryPickerDropdownBtn).hide();
                    }
                }
            });
            // Handle when the dropdown is shown to re-render to the current drilldown path
            categoryPickerDropdownBtn.addEventListener('show.bs.dropdown', () => {
                renderDrilldownCategories(currentDrilldownPath);
            });
        }

        documentTableBody.addEventListener('click', (event) => {
            const row = event.target.closest('tr');
            if (row && row.dataset.docId) { openDetailModal(row.dataset.docId); }
        });
        if (uploadDocBtn) {
            uploadDocBtn.addEventListener('click', () => { if (uploadDocModal) uploadDocModal.show(); });
        }
        if (uploadDocModalEl) {
            uploadDocModalEl.addEventListener('show.bs.modal', () => {
                if (uploadDocForm) uploadDocForm.reset();
                const previewContainer = document.getElementById('file-preview-container');
                const previewList = document.getElementById('file-preview-list');
                if(previewContainer) previewContainer.style.display = 'none';
                if(previewList) previewList.innerHTML = '';
            });
        }
        if (uploadDocForm) {
            uploadDocForm.addEventListener('submit', handleUploadSubmit);
        }
        
        const localEditDocForm = document.getElementById('editDocForm');
        if (localEditDocForm) {
            localEditDocForm.addEventListener('submit', handleEditSubmit);
            localEditDocForm.querySelector('#cancelEditDocBtn')?.addEventListener('click', () => {
                localEditDocForm.style.display = 'none';
                viewDocModalEl.querySelector('#document-details-content').style.display = 'block';
            });
        }
        if (viewDocModalEl) {
             viewDocModalEl.addEventListener('hide.bs.modal', () => {
                const detailsContent = viewDocModalEl.querySelector('#document-details-content');
                const editForm = viewDocModalEl.querySelector('#editDocForm');
                if (detailsContent) detailsContent.style.display = 'block';
                if (editForm) editForm.style.display = 'none';
            });
        }
        
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('docFile');
        const folderInput = document.getElementById('docFolder');
        const selectFilesBtn = document.getElementById('select-files-btn');
        const selectFolderBtn = document.getElementById('select-folder-btn');
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false));
            ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false));
            ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false));
            dropZone.addEventListener('drop', (e) => {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection(fileInput);
            }, false);
            selectFilesBtn?.addEventListener('click', () => fileInput.click());
            selectFolderBtn?.addEventListener('click', () => folderInput.click());
        }
        function handleFileSelection(inputElement) {
            const files = inputElement.files;
            const previewContainer = document.getElementById('file-preview-container');
            const previewList = document.getElementById('file-preview-list');
            if (!previewContainer || !previewList) return;
            previewList.innerHTML = '';
            if (files.length > 0) {
                previewContainer.style.display = 'block';
                Array.from(files).forEach(file => {
                    const item = document.createElement('div');
                    item.className = 'file-preview-item';
                    item.innerHTML = `<i class="fas ${getFileIconClass(file.name)}"></i> ${escapeHTML(file.name)}`;
                    previewList.appendChild(item);
                });
            } else {
                previewContainer.style.display = 'none';
            }
        }
        fileInput?.addEventListener('change', () => handleFileSelection(fileInput));
        folderInput?.addEventListener('change', () => {
            fileInput.files = folderInput.files;
            handleFileSelection(folderInput);
        });
        
        fetchDocuments();
        fetchCategoriesAndBuildTree();
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[match]);
    }

    initialize();
});