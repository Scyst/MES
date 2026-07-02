"use strict";

document.addEventListener('DOMContentLoaded', function () {
    // =================================================================
    // SECTION 1: API & GLOBAL VARIABLES
    // =================================================================
    const API_ENDPOINT = 'api/documentCenterAPI.php';
    let currentPage = 1;
    let currentSearchTerm = '';
    let currentFolderPath = ''; 
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
    
    // --- Move & Revise Modal Elements ---
    const moveDocModalElement = document.getElementById('moveDocModal');
    const moveDocModal = moveDocModalElement ? new bootstrap.Modal(moveDocModalElement) : null;
    const moveDocForm = document.getElementById('moveDocForm');
    const moveDocName = document.getElementById('moveDocName');
    const moveDocId = document.getElementById('moveDocId');
    const moveDocCategory = document.getElementById('moveDocCategory');

    const reviseDocModalElement = document.getElementById('reviseDocModal');
    const reviseDocModal = reviseDocModalElement ? new bootstrap.Modal(reviseDocModalElement) : null;
    const reviseDocForm = document.getElementById('reviseDocForm');
    const reviseDocName = document.getElementById('reviseDocName');
    const reviseDocId = document.getElementById('reviseDocId');
    const reviseDocFile = document.getElementById('reviseDocFile');
    
    // --- Folder Navigation Elements ---
    const breadcrumbContainer = document.getElementById('breadcrumbContainer');

    window.navigateToFolder = function(path) {
        currentFolderPath = path;
        currentPage = 1;
        if(searchInput) searchInput.value = '';
        currentSearchTerm = '';
        fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
    };

    function updateBreadcrumbs() {
        if (!breadcrumbContainer) return;
        let html = `<span style="cursor: pointer; color: ${currentFolderPath === '' ? 'var(--text-primary)' : 'var(--primary-color)'}; font-weight: ${currentFolderPath === '' ? '600' : '400'};" onclick="navigateToFolder('')">All Files</span>`;
        if (currentFolderPath !== '') {
            const parts = currentFolderPath.split('/');
            let currentPath = '';
            parts.forEach((part, index) => {
                currentPath += (index === 0 ? part : '/' + part);
                const isLast = index === parts.length - 1;
                html += ` <span style="color: #94a3b8; margin: 0 8px;">/</span> `;
                html += `<span style="cursor: ${isLast ? 'default' : 'pointer'}; color: ${isLast ? 'var(--text-primary)' : 'var(--primary-color)'}; font-weight: ${isLast ? '600' : '400'};" ${isLast ? '' : `onclick="navigateToFolder('${escapeHTML(currentPath)}')" `}>${escapeHTML(part)}</span>`;
            });
        }
        breadcrumbContainer.innerHTML = html;
    }

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
    async function fetchDocuments(page = 1, search = '', folderPath = '') {
        documentTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>`;
        
        try {
            const result = await apiRequest('get_documents', { page, search, folderPath }, 'GET');
            currentDocumentCache = result.data || [];
            renderTable(currentDocumentCache);
            updateBreadcrumbs();
            setupPagination(result.pagination);
        } catch (error) {
            documentTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-3 opacity-50"></i><br>Failed to load documents.</td></tr>`;
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
            case 'step': case 'stp': case 'igs': case 'iges': case 'stl': case 'obj': case 'gltf': case 'glb': return 'fa-cube text-info';
            default: return 'fa-file-alt text-secondary';
        }
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function renderTable(documents) {
        documentTableBody.innerHTML = '';
        if (!documents || documents.length === 0) {
            documentTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5" style="padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📁</div>
                <div>This folder is empty</div>
            </td></tr>`;
            return;
        }
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            tr.dataset.docId = doc.id || '';
            if (doc.is_folder) {
                tr.dataset.isFolder = 'true';
                tr.dataset.folderPath = doc.category ? doc.category + '/' + doc.file_name : doc.file_name;
            }
            tr.style.cursor = 'pointer'; 

            if (doc.is_folder) {
                // FOLDER ROW
                tr.innerHTML = `
                    <td class="fw-bold" style="padding: 12px 10px; color: var(--text-primary);">
                        <span style="color: #F59E0B; margin-right: 8px; font-size: 1.2rem;">📁</span>
                        ${escapeHTML(doc.file_name)}
                    </td>
                    <td class="text-secondary small">-</td>
                    <td class="text-secondary small">-</td>
                    <td class="text-secondary small fw-medium">-</td>
                    <td>
                        <span style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #CBD5E1; display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-user" style="font-size: 0.6rem;"></i></div>
                            ${escapeHTML(doc.uploaded_by) || 'N/A'}
                        </span>
                    </td>
                    ${canManage ? `
                    <td class="action-cell text-end">
                        ${doc.id ? `
                        <button class="btn btn-sm btn-move-doc" data-doc-id="${doc.id}" title="Move Folder" style="color: #3B82F6; border: none; background: transparent; padding: 4px 8px; font-size: 1.2rem;">➡️</button>
                        <button class="btn btn-sm btn-delete-doc" data-doc-id="${doc.id}" title="Delete Folder" style="color: #ef4444; border: none; background: transparent; padding: 4px 8px; font-size: 1.2rem;">&times;</button>
                        ` : ''}
                    </td>` : ''}`;
            } else {
                // DOCUMENT ROW
                const ext = doc.file_name.split('.').pop().toLowerCase();
                const is3D = ['step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'].includes(ext);
                
                let linkHtml = '';
                if (is3D) {
                    linkHtml = `<a href="javascript:void(0)" onclick="window.open3DViewer(${doc.id}, '${escapeHTML(doc.file_name)}')" style="color: var(--primary-color); text-decoration: none;">${escapeHTML(doc.file_name)}</a>`;
                } else {
                    linkHtml = `<a href="api/view_document.php?id=${doc.id}" target="_blank" style="color: var(--primary-color); text-decoration: none;">${escapeHTML(doc.file_name)}</a>`;
                    if (doc.linked_3d_id) {
                        linkHtml += ` <button onclick="window.open3DViewer(${doc.linked_3d_id}, '${escapeHTML(doc.linked_3d_name)}')" class="btn btn-sm btn-outline-info ms-2" style="padding: 0 6px; font-size: 0.75rem; border-radius: 12px;" title="View associated 3D Model"><i class="fas fa-cube"></i> 3D Preview</button>`;
                    }
                }

                tr.innerHTML = `
                    <td class="fw-bold" style="color: var(--text-primary);">
                        <i class="fas ${getFileIconClass(doc.file_name)} fa-lg me-2" style="color: var(--primary-color);"></i> 
                        ${linkHtml}
                    </td>
                    <td class="text-secondary small">${escapeHTML(doc.file_description) || '-'}</td>
                    <td class="category-path-cell small">
                        <span style="padding: 2px 8px; background-color: #e2e8f0; color: #475569; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; font-weight: 500;">
                            ${escapeHTML(doc.category || '-')}
                        </span>
                    </td>
                    <td class="text-secondary small fw-medium">${formatBytes(doc.file_size)}</td>
                    <td>
                        <span style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #CBD5E1; display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-user" style="font-size: 0.6rem;"></i></div>
                            ${escapeHTML(doc.uploaded_by) || 'N/A'}
                        </span>
                    </td>
                    ${canManage ? `
                    <td class="action-cell text-end">
                        <button class="btn btn-sm btn-revise-doc" data-doc-id="${doc.id}" title="Revise Document" style="color: #10B981; border: none; background: transparent; padding: 4px 8px; font-size: 1.1rem;">🔄</button>
                        <button class="btn btn-sm btn-move-doc" data-doc-id="${doc.id}" title="Move Document" style="color: #3B82F6; border: none; background: transparent; padding: 4px 8px; font-size: 1.1rem;">➡️</button>
                        <button class="btn btn-sm btn-delete-doc" data-doc-id="${doc.id}" title="Delete Document" style="color: #ef4444; border: none; background: transparent; padding: 4px 8px; font-size: 1.2rem;">&times;</button>
                    </td>` : ''}`;
            }
            documentTableBody.appendChild(tr);
        });
        
        updateSelectionUI(); 
    }

    function setupPagination(paginationData) {
        const paginationUl = document.getElementById('paginationControls');
        if (!paginationData || !paginationData.totalPages) {
             if (paginationUl) paginationUl.innerHTML = '';
             return;
        }
        renderPagination('paginationControls', paginationData.totalRecords, paginationData.currentPage, 30, (page) => {
            currentPage = page;
            fetchDocuments(page, currentSearchTerm, currentFolderPath);
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
            formData.append('category', category.trim() !== '' ? category : currentFolderPath);

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
        
        fetchDocuments(1, '', currentFolderPath);
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
        const downloadBtn = viewDocModalElement.querySelector('#downloadDocBtn');
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
        newViewBtn.addEventListener('click', () => {
            const ext = doc.file_name.split('.').pop().toLowerCase();
            const is3D = ['step', 'stp', 'igs', 'iges', 'stl', 'obj', 'gltf', 'glb'].includes(ext);
            if (is3D) {
                if (viewDocModal) viewDocModal.hide();
                window.open3DViewer(doc.id, doc.file_name);
            } else {
                const link = document.createElement('a');
                link.href = `api/view_document.php?id=${doc.id}`;
                link.target = '_blank';
                // Append to body is sometimes required for Safari/Firefox
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });

        if (downloadBtn) {
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            newDownloadBtn.addEventListener('click', () => {
                // Using location.href forces Safari iOS to prompt for download instead of opening a new tab
                window.location.href = `api/view_document.php?id=${doc.id}&download=1`;
            });
        }

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
            fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
        } catch (error) {
            // Toast is shown inside apiRequest
        } finally {
            hideSpinner();
        }
    }

    function openMoveModal(docId) {
        const doc = currentDocumentCache.find(d => d.id == docId);
        if (!doc || !moveDocModalElement) return;
        if (moveDocId) moveDocId.value = doc.id;
        if (moveDocName) moveDocName.textContent = doc.file_name;
        if (moveDocCategory) moveDocCategory.value = doc.category || '';
        if (moveDocModal) moveDocModal.show();
    }

    async function handleMoveSubmit(event) {
        event.preventDefault();
        const docId = moveDocId.value;
        const currentDoc = currentDocumentCache.find(d => d.id == docId);
        const body = {
            document_id: docId,
            category: moveDocCategory.value,
            description: currentDoc ? currentDoc.file_description : ''
        };

        if(moveDocModal) moveDocModal.hide();
        showSpinner();
        try {
            const result = await apiRequest('update', body, 'POST');
            showToast('Document moved successfully.', 'var(--bs-success)');
            fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);

        } catch (error) {
            // Error toast handled in apiRequest
        } finally {
            hideSpinner();
        }
    }

    function openReviseModal(docId) {
        const doc = currentDocumentCache.find(d => d.id == docId);
        if (!doc || !reviseDocModalElement) return;
        if (reviseDocId) reviseDocId.value = doc.id;
        if (reviseDocName) reviseDocName.textContent = doc.file_name;
        if (reviseDocFile) reviseDocFile.value = '';
        if (reviseDocModal) reviseDocModal.show();
    }

    async function handleReviseSubmit(event) {
        event.preventDefault();
        const files = reviseDocFile.files;
        if (files.length === 0) return;
        
        const formData = new FormData();
        formData.append('document_id', reviseDocId.value);
        formData.append('doc_file', files[0]);
        
        if (reviseDocModal) reviseDocModal.hide();
        showSpinner();
        try {
            const result = await apiRequest('revise', formData, 'POST');
            showToast('Document revised successfully.', 'var(--bs-success)');
            fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
        } catch (error) {
            // Error toast handled
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
        
        const newFolderForm = document.getElementById('newFolderForm');
        if (newFolderForm) {
            newFolderForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const folderName = document.getElementById('newFolderName').value;
                try {
                    const result = await apiRequest('create_folder', { folder_name: folderName, parent_path: currentFolderPath }, 'POST');
                    showToast(result.message, 'var(--bs-success)');
                    document.getElementById('newFolderName').value = '';
                    const newFolderModal = bootstrap.Modal.getInstance(document.getElementById('newFolderModal'));
                    if (newFolderModal) newFolderModal.hide();
                    fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
                } catch(error) {
                }
            });
        }
        
        // 1. Search Box Event Listener
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    currentSearchTerm = searchInput.value;
                    currentPage = 1;
                    fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
                }, 300);
            });
        }

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
                    fetchDocuments(currentPage, currentSearchTerm, currentFolderPath);
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
            
            if (target.closest('.btn-delete-doc')) {
                event.stopPropagation();
                const docId = target.closest('.btn-delete-doc').dataset.docId;
                currentDeletingDocId = docId;
                deleteMessageParagraph.textContent = `Are you sure you want to delete this item? This action cannot be undone.`;
                deleteType = 'single';
                deleteConfirmationModal.show();
                return;
            }
            if (target.closest('.btn-revise-doc')) {
                event.stopPropagation();
                const docId = target.closest('.btn-revise-doc').dataset.docId;
                openReviseModal(docId);
                return;
            }
            if (target.closest('.btn-move-doc')) {
                event.stopPropagation();
                const docId = target.closest('.btn-move-doc').dataset.docId;
                openMoveModal(docId);
                return;
            }
            
            const row = event.target.closest('tr');
            if (row && !target.closest('.action-cell')) {
                if (row.dataset.isFolder === 'true') {
                    window.navigateToFolder(row.dataset.folderPath);
                } else if (row.dataset.docId) {
                    openDetailModal(row.dataset.docId);
                }
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
        
        if (moveDocForm) {
            moveDocForm.addEventListener('submit', handleMoveSubmit);
        }

        if (reviseDocForm) {
            reviseDocForm.addEventListener('submit', handleReviseSubmit);
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
        
        fetchDocuments(1, '', currentFolderPath);
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[match]);
    }

    initialize();
});

// -----------------------------------------
// 3D VIEWER GLOBALS
// -----------------------------------------
let viewer3DInstance = null;
let viewer3DModal = null;

window.open3DViewer = function(docId, fileName) {
    if (!viewer3DModal) {
        viewer3DModal = new bootstrap.Modal(document.getElementById('view3DModal'));
    }
    
    document.getElementById('view3DModalTitle').textContent = fileName;
    
    // Reset UI state
    document.getElementById('viewer3d-dimensions').classList.add('d-none');
    document.getElementById('viewer3d-size-text').textContent = 'Size: -';
    let btnXray = document.getElementById('btn-3d-xray');
    if (btnXray) {
        btnXray.classList.replace('btn-info', 'btn-outline-info');
        btnXray.classList.remove('text-white');
    }
    document.getElementById('viewer3d-body').style.background = '#f8fafc';
    window.current3DTheme = 0;
    window.is3DXRay = false;
    
    viewer3DModal.show();

    setTimeout(() => {
        const container = document.getElementById('viewer3d-container');
        
        // Fix bug where second model doesn't load by destroying old instance
        if (viewer3DInstance) {
            container.innerHTML = '';
            viewer3DInstance = null;
        }

        OV.SetExternalLibLocation('https://cdn.jsdelivr.net/npm/online-3d-viewer@0.14.0/libs');
        OV.Init3DViewerElements();
        viewer3DInstance = new OV.EmbeddedViewer(container, {
            backgroundColor : new OV.RGBAColor (248, 250, 252, 255),
            defaultColor : new OV.RGBColor (200, 200, 200),
            edgeSettings : new OV.EdgeSettings (true, new OV.RGBColor (0, 0, 0), 1)
        });

        const modelUrl = `api/view_document.php?id=${docId}&download=1`; 
        
        fetch(modelUrl)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.blob();
            })
            .then(blob => {
                const file = new File([blob], fileName);
                viewer3DInstance.LoadModelFromFileList([file]);
                
                // Poll for dimensions
                let checkDim = setInterval(() => {
                    if (!viewer3DInstance) { clearInterval(checkDim); return; }
                    let viewer = viewer3DInstance.GetViewer();
                    if (viewer && viewer.GetBoundingBox) {
                        let bb = viewer.GetBoundingBox(() => true); // Pass true callback to include all meshes
                        if (bb && bb.min && bb.max) {
                            let w = (bb.max.x - bb.min.x).toFixed(2);
                            let h = (bb.max.y - bb.min.y).toFixed(2);
                            let d = (bb.max.z - bb.min.z).toFixed(2);
                            if (w > 0 && h > 0 && d > 0) {
                                document.getElementById('viewer3d-size-text').textContent = `Size: ${w} x ${h} x ${d} mm`;
                                document.getElementById('viewer3d-dimensions').classList.remove('d-none');
                                clearInterval(checkDim);
                            }
                        }
                    }
                }, 1000);
            })
            .catch(error => {
                console.error(error);
                alert('Failed to download or load the 3D model from the server.');
            });
    }, 300);
};

window.current3DTheme = 0;
window.toggle3DTheme = function() {
    if (!viewer3DInstance) return;
    window.current3DTheme = (window.current3DTheme + 1) % 3;
    let viewer = viewer3DInstance.GetViewer();
    let body = document.getElementById('viewer3d-body');
    if (!viewer) return;
    
    let color;
    if (window.current3DTheme === 0) {
        color = new OV.RGBAColor(248, 250, 252, 255); // Light
        body.style.background = '#f8fafc';
    } else if (window.current3DTheme === 1) {
        color = new OV.RGBAColor(156, 163, 175, 255); // Gray
        body.style.background = '#9ca3af';
    } else {
        color = new OV.RGBAColor(31, 41, 55, 255); // Dark
        body.style.background = '#1f2937';
    }
    
    viewer.SetBackgroundColor(color);
    viewer.Render();
};

window.is3DXRay = false;
window.toggle3DXRay = function() {
    if (!viewer3DInstance) return;
    window.is3DXRay = !window.is3DXRay;
    let viewer = viewer3DInstance.GetViewer();
    if (!viewer || !viewer.EnumerateMeshesAndLines) return;
    
    viewer.EnumerateMeshesAndLines((child) => {
        if (child.material) {
            // Apply transparency to the material
            if (window.is3DXRay) {
                child.material.transparent = true;
                child.material.opacity = 0.35;
                child.material.depthWrite = false; // prevents weird internal occlusion
            } else {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.depthWrite = true;
            }
            child.material.needsUpdate = true;
        }
    });
    viewer.Render();
    
    let btn = document.getElementById('btn-3d-xray');
    if (window.is3DXRay) {
        btn.classList.replace('btn-outline-info', 'btn-info');
        btn.classList.add('text-white');
    } else {
        btn.classList.replace('btn-info', 'btn-outline-info');
        btn.classList.remove('text-white');
    }
};

window.close3DViewer = function() {
    if (viewer3DModal) {
        viewer3DModal.hide();
    }
    if (viewer3DInstance) {
        viewer3DInstance.Clear();
    }
};
