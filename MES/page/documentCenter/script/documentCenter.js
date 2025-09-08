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
    const categoryTreeContainer = document.getElementById('category-tree-container');

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
    // SECTION 3: CATEGORY TREE & DOCUMENT FETCHING
    // =================================================================
    async function fetchCategoriesAndBuildTree() {
        try {
            if (categoryTreeContainer) {
                categoryTreeContainer.innerHTML = `<div class="text-center text-muted p-3"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div><span class="ms-2">Loading Categories...</span></div>`;
            }
            const result = await sendRequest(`${API_ENDPOINT}get_categories.php`);
            if (result.success && result.data) {
                const categoryTree = buildCategoryTree(result.data);
                renderCategoryTree(categoryTree, categoryTreeContainer);
            } else {
                if (categoryTreeContainer) categoryTreeContainer.innerHTML = '<div class="text-center text-muted p-3">No categories found.</div>';
            }
        } catch (error) {
            if (categoryTreeContainer) categoryTreeContainer.innerHTML = '<div class="text-center text-danger p-3">Failed to load categories.</div>';
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
    
    // ### ส่วนที่แก้ไขทั้งหมด: renderCategoryTree ใช้ Bootstrap Collapse ###
    function renderCategoryTree(node, element) {
        element.innerHTML = ''; 
        
        const ul = document.createElement('ul');
        ul.className = 'nav flex-column category-tree'; // เพิ่ม class category-tree
        ul.setAttribute('id', 'categoryTreeRoot'); // เพิ่ม ID เพื่อใช้ในการอ้างอิง

        // Add "All Documents" link
        const allLi = document.createElement('li');
        allLi.className = 'nav-item';
        allLi.innerHTML = `<a href="#" class="nav-link ${currentCategory === '' ? 'active' : ''}" data-category="">
                                <i class="fas fa-inbox fa-fw me-2"></i> All Documents
                           </a>`;
        ul.appendChild(allLi);

        const createNodes = (parentNode, parentElement, level) => {
            Object.values(parentNode.children).sort((a, b) => a.name.localeCompare(b.name)).forEach((childNode, index) => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                const hasChildren = Object.keys(childNode.children).length > 0;
                const isActive = (currentCategory === childNode.path || (currentCategory.startsWith(childNode.path + '/') && currentCategory.length > childNode.path.length + 1));
                const collapseId = `categoryCollapse-${childNode.path.replace(/[^a-zA-Z0-9]/g, '-')}-${level}-${index}`; // สร้าง ID ที่ไม่ซ้ำกัน

                let linkContent = `<a href="#" class="nav-link ${isActive ? 'active' : ''}" data-category="${escapeHTML(childNode.path)}" style="padding-left: ${0.8 + level * 0.8}rem;">`;
                
                if (hasChildren) {
                    // ถ้ามีลูก ให้เป็นปุ่มสำหรับ Toggle Collapse
                    linkContent += `<i class="far fa-folder fa-fw me-2"></i> ${escapeHTML(childNode.name)}`;
                    linkContent += `<i class="fas fa-chevron-right folder-toggle-icon ms-auto"></i>`; // ไอคอนสำหรับ toggle
                    linkContent += `</a>`;
                    
                    // สร้าง Collapse container สำหรับรายการย่อย
                    const subUl = document.createElement('ul');
                    subUl.className = `nav flex-column collapse ${isActive ? 'show' : ''}`; // ถ้า active ให้แสดงผล
                    subUl.setAttribute('id', collapseId);
                    
                    // สร้าง Header สำหรับ Toggle
                    const headerLink = document.createElement('a');
                    headerLink.href = `#${collapseId}`;
                    headerLink.classList.add('nav-link', 'd-flex', 'align-items-center');
                    headerLink.setAttribute('data-bs-toggle', 'collapse');
                    headerLink.setAttribute('aria-expanded', isActive ? 'true' : 'false');
                    headerLink.setAttribute('aria-controls', collapseId);
                    headerLink.style.paddingLeft = `${0.8 + level * 0.8}rem`;
                    headerLink.innerHTML = `<i class="far fa-folder fa-fw me-2"></i> ${escapeHTML(childNode.name)}<i class="fas fa-chevron-right folder-toggle-icon ms-auto ${isActive ? 'rotated' : ''}"></i>`;

                    li.appendChild(headerLink);
                    li.appendChild(subUl);

                    // สร้าง Child Nodes
                    createNodes(childNode, subUl, level + 1);

                } else {
                    // ถ้าไม่มีลูก ให้เป็นลิงก์ธรรมดา
                    linkContent += `<i class="far fa-file-alt fa-fw me-2"></i> ${escapeHTML(childNode.name)}`;
                    linkContent += `</a>`;
                    li.innerHTML = linkContent;
                }
                
                parentElement.appendChild(li);
            });
        };

        createNodes(node, ul, 1);
        element.appendChild(ul);

        // ### เพิ่ม Event Listeners สำหรับ Toggle Icon และ Collapse Events ###
        ul.querySelectorAll('.folder-toggle-icon').forEach(icon => {
            icon.closest('a.nav-link').addEventListener('click', function(e) {
                // ป้องกันไม่ให้ลิงก์ Category ทำงาน หากเป็น Folder Toggle
                if (e.target.classList.contains('folder-toggle-icon')) {
                    e.preventDefault(); 
                    e.stopPropagation(); // หยุดการส่ง event ไปที่ลิงก์ parent
                }
                icon.classList.toggle('rotated');
            });
        });

        // ทำให้ Accordion/Collapse ทำงานได้
        const collapseElements = element.querySelectorAll('.collapse');
        collapseElements.forEach(collapseEl => {
            new bootstrap.Collapse(collapseEl, { toggle: false }); // สร้าง instance ของ Collapse
        });

        // Trigger collapse toggling when folder links are clicked
        element.querySelectorAll('a[data-bs-toggle="collapse"]').forEach(toggleLink => {
            toggleLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent propagation to category link handler
                const targetId = this.getAttribute('href');
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    const bsCollapse = bootstrap.Collapse.getInstance(targetEl);
                    if (bsCollapse) {
                        bsCollapse.toggle();
                    }
                }
            });
        });
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
            tr.innerHTML = `<td><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</td><td>${escapeHTML(doc.file_description) || '<i class="text-muted">No description</i>'}</td><td>${escapeHTML(doc.category) || ''}</td><td>${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</td>`;
            documentTableBody.appendChild(tr);
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
        categoryTreeContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const link = e.target.closest('a.nav-link');
            if (!link || link.getAttribute('data-bs-toggle') === 'collapse') return; // ไม่ทำงานถ้าเป็นปุ่ม toggle
            
            // Remove 'active' from all links including those in collapsed sections
            categoryTreeContainer.querySelectorAll('a.nav-link').forEach(l => l.classList.remove('active'));
            // Add 'active' to the clicked link
            link.classList.add('active');
            
            currentCategory = link.dataset.category;
            currentPage = 1; 
            fetchDocuments(currentPage, currentSearchTerm, currentCategory);
        });
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