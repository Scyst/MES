"use strict";

document.addEventListener('DOMContentLoaded', function () {
    // =================================================================
    // SECTION 1: API & GLOBAL VARIABLES
    // =================================================================
    const API_ENDPOINT = 'api/documentCenterAPI.php';
    let currentPage = 1;
    let currentSearchTerm = '';
    let currentCategory = ''; 
    let debounceTimer;
    let currentDocumentCache = [];

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    if (!csrfToken) {
        console.error('CSRF token not found!');
    }

    let selectedDocumentIds = new Set();
    const deleteConfirmationModalElement = document.getElementById('deleteConfirmationModal');
    const deleteConfirmationModal = deleteConfirmationModalElement ? new bootstrap.Modal(deleteConfirmationModalElement) : null;
    let deleteType = null; 
    let currentDeletingDocId = null;
    
    // --- Element & Modal References ---
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const deletePasswordInput = document.getElementById('deletePassword');
    const deleteMessageParagraph = document.getElementById('deleteMessage');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const viewDocModalElement = document.getElementById('viewDocModal');
    const documentTableBody = document.getElementById('documentTableBody');
    const searchInput = document.getElementById('docSearchInput');
    const paginationControls = document.getElementById('paginationControls');
    const uploadDocBtn = document.getElementById('uploadDocBtn');
    const uploadDocModalEl = document.getElementById('uploadDocModal');
    const uploadDocModal = uploadDocModalEl ? new bootstrap.Modal(uploadDocModalEl) : null;
    const uploadDocForm = document.getElementById('uploadDocForm');
    const viewDocModal = viewDocModalElement ? new bootstrap.Modal(viewDocModalElement) : null;
    
    // --- Category Picker Elements ---
    const categoryPickerMenu = document.getElementById('categoryPickerMenu');
    const categoryPickerList = document.getElementById('categoryPickerList');
    const categoryPickerDropdownBtn = document.getElementById('categoryDropdown');
    const currentCategoryText = document.getElementById('currentCategoryText');
    const categoryPickerBreadcrumbs = document.getElementById('categoryPickerBreadcrumbs');
    const breadcrumbTextSpan = categoryPickerBreadcrumbs ? categoryPickerBreadcrumbs.querySelector('.breadcrumb-text') : null;

    let allCategoriesTree = { name: 'Root', children: {}, path: '' };
    let currentDrilldownPath = '';

    // =================================================================
    // SECTION 2: CORE HELPER FUNCTION
    // =================================================================
    async function apiRequest(action, body = {}, method = 'GET') {
        let url = API_ENDPOINT;
        const options = {
            method,
            headers: { 'X-CSRF-Token': csrfToken }
        };

        if (method.toUpperCase() === 'GET') {
            const params = new URLSearchParams(body);
            params.append('action', action);
            url += `?${params.toString()}`;
        } else { // POST
            if (body instanceof FormData) {
                body.append('action', action);
                options.body = body;
            } else {
                body.action = action;
                options.body = JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
            }
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            return result;
        } catch (error) {
            console.error(`API request failed for action "${action}":`, error);
            if (error instanceof SyntaxError) {
                 showToast('Received an invalid response from the server. (Not JSON)', 'var(--bs-danger)');
            } else {
                 showToast(error.message, 'var(--bs-danger)');
            }
            throw error;
        }
    }
    
    // =================================================================
    // SECTION 3: DATA FETCHING & UI RENDERING
    // =================================================================
    async function fetchCategoriesAndBuildTree() {
        try {
            const result = await apiRequest('get_categories', {}, 'GET');
            allCategoriesTree = buildCategoryTree(result.data || []);
            renderDrilldownCategories(currentDrilldownPath);
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

    function renderDrilldownCategories(parentPath = '') {
        if (!categoryPickerList) return;
        let currentNode = allCategoriesTree;
        if (parentPath) {
            const pathParts = parentPath.split('/');
            for (const part of pathParts) {
                if (currentNode && currentNode.children[part]) {
                    currentNode = currentNode.children[part];
                } else {
                    currentNode = null;
                    break;
                }
            }
        }
        
        // Clear only the dynamic part
        const dynamicListContainer = document.getElementById('categoryPickerList');
        if(dynamicListContainer) dynamicListContainer.innerHTML = '';

        if (!currentNode || Object.keys(currentNode.children).length === 0) {
            if (parentPath) { // Only show 'no sub-categories' if we are not at the root
                const li = document.createElement('li');
                li.className = 'p-3 text-center text-muted';
                li.textContent = 'No sub-categories.';
                if(dynamicListContainer) dynamicListContainer.appendChild(li);
            }
        } else {
            Object.values(currentNode.children).sort((a, b) => a.name.localeCompare(b.name)).forEach(childNode => {
                const hasChildren = Object.keys(childNode.children).length > 0;
                const li = document.createElement('li');
                li.innerHTML = `
                    <a class="dropdown-item category-item" href="#" 
                       data-category="${escapeHTML(childNode.path)}" 
                       data-has-children="${hasChildren ? 'true' : 'false'}">
                        <i class="fas ${hasChildren ? 'fa-folder' : 'fa-file-alt'} me-2"></i> 
                        ${escapeHTML(childNode.name)}
                        ${hasChildren ? '<i class="fas fa-chevron-right folder-arrow ms-auto"></i>' : ''}
                    </a>`;
                if(dynamicListContainer) dynamicListContainer.appendChild(li);
            });
        }
        updateCategoryPickerDisplay();
    }

    function updateCategoryPickerDisplay() {
        if (currentCategoryText) {
            let displayPath = 'All Documents';
            if (currentCategory) {
                let parts = currentCategory.split('/');
                displayPath = parts[parts.length - 1]; // Show the last part of the path
            }
            currentCategoryText.textContent = displayPath;
        }
        
        // Update active state in dropdown
        document.querySelectorAll('#categoryPickerMenu .category-item').forEach(item => {
            if (item.dataset.category === currentCategory) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        if (categoryPickerBreadcrumbs && breadcrumbTextSpan) {
            if (currentDrilldownPath) {
                categoryPickerBreadcrumbs.classList.remove('d-none');
                const pathParts = currentDrilldownPath.split('/');
                breadcrumbTextSpan.textContent = pathParts[pathParts.length - 1];
            } else {
                categoryPickerBreadcrumbs.classList.add('d-none');
            }
        }
    }

    async function fetchDocuments(page = 1, search = '', category = '') {
        showSpinner();
        try {
            const result = await apiRequest('get_documents', { page, search, category }, 'GET');
            currentDocumentCache = result.data || [];
            renderTable(currentDocumentCache);
            setupPagination(result.pagination);
        } catch (error) {
            documentTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load documents.</td></tr>`;
        } finally {
            hideSpinner();
        }
    }
    
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
            documentTableBody.innerHTML = `<tr><td colspan="5" class="text-center">No documents found.</td></tr>`;
            return;
        }
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            tr.dataset.docId = doc.id;
    
            tr.innerHTML = `
                <td class="checkbox-cell">
                    <input class="form-check-input row-checkbox" type="checkbox" data-doc-id="${doc.id}">
                </td>
                <td><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</td>
                <td>${escapeHTML(doc.file_description) || '<i class="text-muted">No description</i>'}</td>
                <td class="category-path-cell"></td>
                <td>${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</td>`;
            
            const categoryPathTd = tr.querySelector('.category-path-cell');
            if (doc.category) {
                const pathParts = doc.category.split('/');
                pathParts.forEach((part, index) => {
                    if (index > 0) {
                        categoryPathTd.append(' / ');
                    }
                    const categoryLink = document.createElement('a');
                    const fullPath = pathParts.slice(0, index + 1).join('/');
                    categoryLink.href = "#";
                    categoryLink.textContent = escapeHTML(part);
                    categoryLink.dataset.category = fullPath;
                    categoryLink.classList.add('table-category-link', 'text-primary');
                    categoryPathTd.appendChild(categoryLink);
                });
            } else {
                categoryPathTd.innerHTML = '<i class="text-muted">N/A</i>';
            }
    
            documentTableBody.appendChild(tr);
        });
    
        documentTableBody.querySelectorAll('.table-category-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const categoryToFilter = this.dataset.category;
                currentCategory = categoryToFilter;
                currentPage = 1;
                fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                currentDrilldownPath = categoryToFilter;
                updateCategoryPickerDisplay();
            });
        });
        
        updateSelectionUI();
    }

    function setupPagination(paginationData) {
        const paginationUl = document.getElementById('paginationControls');
        if (!paginationData || !paginationData.totalPages) {
             if (paginationUl) paginationUl.innerHTML = '';
             return;
        }
        renderPagination('paginationControls', paginationData.totalRecords, paginationData.currentPage, 15, (page) => {
            currentPage = page;
            fetchDocuments(page, currentSearchTerm, currentCategory);
        });
    }

    // =================================================================
    // SECTION 4: ACTIONS (UPLOAD, UPDATE, DELETE)
    // =================================================================
    async function handleUploadSubmit(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('docFile');
        const filesToUpload = Array.from(fileInput.files); 

        if (filesToUpload.length === 0) {
            showToast('Please select at least one file to upload.', 'var(--bs-warning)');
            return;
        }
        
        uploadDocModal.hide();
        showSpinner(); 

        const description = document.getElementById('docDescription').value;
        const category = document.getElementById('docCategory').value;
        
        let filesUploaded = 0;
        let uploadErrors = 0;

        for (const file of filesToUpload) {
            const formData = new FormData();
            formData.append('doc_file', file);
            formData.append('file_description', description);
            formData.append('category', category);

            try {
                await apiRequest('upload', formData, 'POST');
                filesUploaded++;
            } catch (error) {
                uploadErrors++;
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }

        hideSpinner();

        if (uploadErrors > 0) {
            showToast(`${filesUploaded} of ${filesToUpload.length} files uploaded successfully. ${uploadErrors} failed.`, 'var(--bs-warning)');
        } else {
            showToast(`${filesToUpload.length} file(s) uploaded successfully!`, 'var(--bs-success)');
        }
        
        fetchDocuments(1, '', currentCategory);
        fetchCategoriesAndBuildTree(); 
    }

    function openDetailModal(docId) {
        const doc = currentDocumentCache.find(d => d.id == docId);
        if (!doc || !viewDocModalElement) return;

        const viewDocFileName = viewDocModalElement.querySelector('#viewDocFileName');
        const editDocId = viewDocModalElement.querySelector('#editDocId');
        const editDocDescription = viewDocModalElement.querySelector('#editDocDescription');
        const editDocCategory = viewDocModalElement.querySelector('#editDocCategory');
        const viewDocUploadedBy = viewDocModalElement.querySelector('#viewDocUploadedBy');
        const viewDocUploadedAt = viewDocModalElement.querySelector('#viewDocUploadedAt');
        
        const viewBtn = viewDocModalElement.querySelector('#viewDocBtn');
        const deleteBtn = viewDocModalElement.querySelector('#deleteDocBtn');

        if (viewDocFileName) {
            viewDocFileName.innerHTML = `<i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}`;
        }
        if (editDocId) editDocId.value = doc.id;
        if (editDocDescription) editDocDescription.value = doc.file_description || '';
        if (editDocCategory) editDocCategory.value = doc.category || '';
        if (viewDocUploadedBy) viewDocUploadedBy.textContent = doc.uploaded_by || 'N/A';
        if (viewDocUploadedAt) viewDocUploadedAt.textContent = new Date(doc.created_at).toLocaleString();

        if (editDocDescription) editDocDescription.readOnly = !canManage;
        if (editDocCategory) editDocCategory.readOnly = !canManage;

        const newViewBtn = viewBtn.cloneNode(true); 
        viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);
        newViewBtn.addEventListener('click', () => window.open(`api/view_document.php?id=${doc.id}`, '_blank'));

        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            newDeleteBtn.addEventListener('click', () => {
                currentDeletingDocId = doc.id;
                deleteMessageParagraph.textContent = `Are you sure you want to delete this document (${doc.file_name})? This action cannot be undone.`;
                deleteType = 'single';
                if (viewDocModal) viewDocModal.hide();
                deleteConfirmationModal.show();
            });
        }
        
        viewDocModal.show();
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const body = {
            document_id: form.querySelector('#editDocId').value,
            description: form.querySelector('#editDocDescription').value,
            category: form.querySelector('#editDocCategory').value
        };

        viewDocModal.hide();
        showSpinner();

        try {
            const result = await apiRequest('update', body, 'POST');
            showToast(result.message, 'var(--bs-success)');
            fetchDocuments(currentPage, currentSearchTerm, currentCategory);
        } catch (error) {
            // Toast is shown inside apiRequest
        } finally {
            hideSpinner();
        }
    }

    function updateSelectionUI() {
        if (!btnDeleteSelected) return;
        if (selectedDocumentIds.size > 0) {
            btnDeleteSelected.style.display = 'inline-flex';
            selectedCountSpan.textContent = selectedDocumentIds.size;
        } else {
            btnDeleteSelected.style.display = 'none';
        }
        if (selectAllCheckbox) {
            const rowCheckboxes = documentTableBody.querySelectorAll('.row-checkbox');
            const allOnPageSelected = rowCheckboxes.length > 0 && Array.from(rowCheckboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allOnPageSelected;
        }
    }

    // =================================================================
    // SECTION 5: INITIALIZATION & EVENT LISTENERS
    // =================================================================
    function initialize() {
        // ### START: ส่วนที่แก้ไข ###
        
        // 1. Search Box Event Listener
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearchTerm = searchInput.value;
                currentPage = 1;
                fetchDocuments(currentPage, currentSearchTerm, currentCategory);
            }, 300); // Debounce time of 300ms
        });

        // 2. Category Filter & Drilldown Event Listener
        if (categoryPickerMenu) {
            categoryPickerMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.category-item');
                const backBtn = e.target.closest('.btn-back-category');

                // Stop dropdown from closing automatically on item click
                e.stopPropagation();

                if (item) {
                    e.preventDefault();
                    const category = item.dataset.category;
                    const hasChildren = item.dataset.hasChildren === 'true';

                    if (hasChildren) {
                        currentDrilldownPath = category; // Go deeper
                        renderDrilldownCategories(currentDrilldownPath);
                    } else {
                        // This is a final selection (leaf node or "All Documents")
                        currentCategory = category;
                        currentPage = 1;
                        fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                        updateCategoryPickerDisplay();
                        // Manually hide the dropdown on final selection
                        bootstrap.Dropdown.getInstance(categoryPickerDropdownBtn).hide();
                    }
                } else if (backBtn) {
                    e.preventDefault();
                    if (currentDrilldownPath) {
                        const pathParts = currentDrilldownPath.split('/');
                        pathParts.pop();
                        currentDrilldownPath = pathParts.join('/');
                        renderDrilldownCategories(currentDrilldownPath);
                    }
                }
            });

            // Reset drilldown path when dropdown is hidden
            categoryPickerDropdownBtn.addEventListener('hide.bs.dropdown', () => {
                // If a category is selected, the drilldown should match it
                if (currentCategory) {
                    const pathParts = currentCategory.split('/');
                    pathParts.pop();
                    currentDrilldownPath = pathParts.join('/');
                } else {
                    currentDrilldownPath = '';
                }
            });
        }

        // ### END: ส่วนที่แก้ไข ###

        documentTableBody.addEventListener('change', (event) => {
            if (event.target.classList.contains('row-checkbox')) {
                const docId = event.target.dataset.docId;
                if (event.target.checked) {
                    selectedDocumentIds.add(docId);
                } else {
                    selectedDocumentIds.delete(docId);
                }
                updateSelectionUI();
            }
        });

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                documentTableBody.querySelectorAll('.row-checkbox').forEach(checkbox => {
                    checkbox.checked = isChecked;
                    const docId = checkbox.dataset.docId;
                    if (isChecked) {
                        selectedDocumentIds.add(docId);
                    } else {
                        selectedDocumentIds.delete(docId);
                    }
                });
                updateSelectionUI();
            });
        }

        if (btnDeleteSelected) {
            btnDeleteSelected.addEventListener('click', () => {
                if (selectedDocumentIds.size === 0) {
                    showToast('Please select at least one document to delete.', 'var(--bs-warning)');
                    return;
                }
                deletePasswordInput.value = '';
                deleteMessageParagraph.textContent = `Are you sure you want to delete ${selectedDocumentIds.size} selected documents? This action cannot be undone.`;
                deleteType = 'multiple';
                deleteConfirmationModal.show();
            });
        }
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                const password = deletePasswordInput.value;
                if (!password) {
                    deletePasswordInput.classList.add('is-invalid');
                    return;
                }
                deletePasswordInput.classList.remove('is-invalid');
            
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
            
                const idsToDelete = deleteType === 'multiple' ? Array.from(selectedDocumentIds) : [currentDeletingDocId];
                
                try {
                    const result = await apiRequest('delete', { docIds: idsToDelete, password }, 'POST');
                    showToast(result.message, 'var(--bs-success)');
                    
                    selectedDocumentIds.clear();
                    updateSelectionUI();

                    const docCountOnPage = Array.from(documentTableBody.querySelectorAll('tr')).filter(tr => !tr.classList.contains('d-none')).length;
                    if(docCountOnPage === idsToDelete.length && currentPage > 1){
                        currentPage--;
                    }
                    fetchDocuments(currentPage, currentSearchTerm, currentCategory);
                } catch(error) {
                    // Error toast is already shown by apiRequest
                } finally {
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Delete';
                    deleteConfirmationModal.hide();
                }
            });
        }

        if (deleteConfirmationModalElement) {
            deleteConfirmationModalElement.addEventListener('hidden.bs.modal', () => {
                deletePasswordInput.value = '';
                deletePasswordInput.classList.remove('is-invalid');
                currentDeletingDocId = null;
                deleteType = null;
            });
            deleteConfirmationModalElement.addEventListener('shown.bs.modal', () => {
                deletePasswordInput.focus();
            });
        }

        documentTableBody.addEventListener('click', (event) => {
            const target = event.target;
            if (target.closest('.checkbox-cell') || target.closest('.table-category-link')) {
                return; 
            }
            const row = event.target.closest('tr');
            if (row && row.dataset.docId) {
                openDetailModal(row.dataset.docId);
            }
        });

        if (uploadDocBtn) {
            uploadDocBtn.addEventListener('click', () => {
                if (uploadDocModal) uploadDocModal.show();
            });
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