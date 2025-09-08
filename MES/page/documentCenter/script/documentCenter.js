"use strict";

document.addEventListener('DOMContentLoaded', function () {
    // ... (SECTION 1 และ 2 เหมือนเดิม) ...
    // =================================================================
    // SECTION 1: API & GLOBAL VARIABLES
    // =================================================================
    const API_ENDPOINT = 'api/';
    let currentPage = 1;
    let currentSearchTerm = '';
    let debounceTimer;
    let currentDocumentCache = [];
    const documentTableBody = document.getElementById('documentTableBody');
    const searchInput = document.getElementById('docSearchInput');
    const paginationControls = document.getElementById('paginationControls');
    const uploadDocBtn = document.getElementById('uploadDocBtn');
    const uploadDocModalEl = document.getElementById('uploadDocModal');
    const uploadDocModal = uploadDocModalEl ? new bootstrap.Modal(uploadDocModalEl) : null;
    const uploadDocForm = document.getElementById('uploadDocForm');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const viewDocModalEl = document.getElementById('viewDocModal');
    const viewDocModal = viewDocModalEl ? new bootstrap.Modal(viewDocModalEl) : null;

    // =================================================================
    // SECTION 2: CORE FUNCTIONS (API Requests, etc.)
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
    // SECTION 3: DOCUMENT LISTING & RENDERING
    // =================================================================
    async function fetchDocuments(page = 1, searchTerm = '') {
        showSpinner();
        try {
            const url = `${API_ENDPOINT}get_documents.php?page=${page}&search=${encodeURIComponent(searchTerm)}`;
            const result = await sendRequest(url);
            if (result.error) { throw new Error(result.error); }
            currentDocumentCache = result.data || [];
            renderTable(currentDocumentCache);
            setupPagination(result.pagination);
        } catch (error) {
            console.error(error); // แสดง Error จริงใน console
            documentTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load documents. Please check the console for details.</td></tr>`;
        } finally {
            hideSpinner();
        }
    }

    // ### ฟังก์ชันใหม่สำหรับเลือกไอคอน ###
    function getFileIconClass(fileName) {
        if (!fileName) return 'fa-file-alt text-secondary';
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return 'fa-file-pdf text-danger';
            case 'xls':
            case 'xlsx': return 'fa-file-excel text-success';
            case 'doc':
            case 'docx': return 'fa-file-word text-primary';
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif': return 'fa-file-image text-info';
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
            // ### ส่วนที่แก้ไข: ใช้ฟังก์ชัน getFileIconClass ###
            tr.innerHTML = `
                <td><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</td>
                <td>${escapeHTML(doc.file_description) || '<i class="text-muted">No description</i>'}</td>
                <td>${escapeHTML(doc.category) || ''}</td>
                <td>${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</td>
            `;
            documentTableBody.appendChild(tr);
        });
    }

    function setupPagination(paginationData) {
        const paginationUl = document.getElementById('paginationControls');
        if (!paginationData || paginationData.totalPages <= 1) {
            if (paginationUl) paginationUl.innerHTML = '';
            return;
        }
        
        renderPagination(
            'paginationControls',
            paginationData.totalRecords,
            paginationData.currentPage,
            15, // เรากำหนดไว้ใน get_documents.php ว่ามี 15 รายการต่อหน้า
            (page) => fetchDocuments(page, currentSearchTerm)
        );
    }
    
    // ... (SECTION 4 และ 5 เหมือนเดิมทั้งหมด) ...
    // =================================================================
    // SECTION 4: MODAL & ACTIONS (UPLOAD, VIEW, DELETE)
    // =================================================================
    function openDetailModal(docId) {
        const doc = currentDocumentCache.find(d => d.id == docId);
        if (!doc || !viewDocModal) return;
        const contentEl = document.getElementById('document-details-content');
        // ### ส่วนที่แก้ไข: ใช้ฟังก์ชัน getFileIconClass ใน Modal ด้วย ###
        contentEl.innerHTML = `
            <h5 class="mb-3"><i class="fas ${getFileIconClass(doc.file_name)} me-2"></i> ${escapeHTML(doc.file_name)}</h5>
            <dl class="row">
                <dt class="col-sm-3">Description</dt><dd class="col-sm-9">${escapeHTML(doc.file_description) || '<i class="text-muted">N/A</i>'}</dd>
                <dt class="col-sm-3">Category</dt><dd class="col-sm-9">${escapeHTML(doc.category) || '<i class="text-muted">N/A</i>'}</dd>
                <dt class="col-sm-3">Uploaded By</dt><dd class="col-sm-9">${escapeHTML(doc.uploaded_by) || '<i class="text-muted">N/A</i>'}</dd>
                <dt class="col-sm-3">Uploaded At</dt><dd class="col-sm-9">${new Date(doc.created_at).toLocaleString()}</dd>
            </dl>
        `;
        const deleteBtn = document.getElementById('deleteDocBtn');
        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            newDeleteBtn.addEventListener('click', () => handleDelete(doc.id, doc.file_name));
        }
        const viewBtn = document.getElementById('viewDocBtn');
        const newViewBtn = viewBtn.cloneNode(true); 
        viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);
        newViewBtn.addEventListener('click', () => {
            const viewUrl = `${API_ENDPOINT}view_document.php?id=${doc.id}`;
            window.open(viewUrl, '_blank');
        });
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
            fetchDocuments(currentPage, currentSearchTerm);
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
                fetchDocuments(currentPage, currentSearchTerm);
            }, 500);
        });
        documentTableBody.addEventListener('click', (event) => {
            const row = event.target.closest('tr');
            if (row && row.dataset.docId) { openDetailModal(row.dataset.docId); }
        });
        if (uploadDocBtn && uploadDocModal) {
            uploadDocBtn.addEventListener('click', () => { uploadDocModal.show(); });
        }
        if (uploadDocModalEl) {
            uploadDocModalEl.addEventListener('show.bs.modal', () => {
                if (uploadDocForm) uploadDocForm.reset();
                if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
                if (uploadProgressBar) {
                    uploadProgressBar.style.width = '0%';
                    uploadProgressBar.innerText = '0%';
                }
            });
        }
        if (uploadDocForm) {
            uploadDocForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                const fileInput = document.getElementById('docFile');
                const files = fileInput.files;
                if (!files || files.length === 0) {
                    alert('Please select one or more files to upload.');
                    return;
                }
                const description = document.getElementById('docDescription').value;
                const category = document.getElementById('docCategory').value;
                const totalFiles = files.length;
                let filesUploaded = 0;
                if (uploadProgressContainer) uploadProgressContainer.style.display = 'block';
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('doc_file', file);
                    formData.append('file_description', description);
                    formData.append('category', category);
                    try {
                        await new Promise((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.upload.addEventListener('progress', (e) => {
                                if (e.lengthComputable) {
                                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                                    const overallPercent = Math.round(((filesUploaded / totalFiles) * 100) + (percentComplete / totalFiles));
                                    if (uploadProgressBar) {
                                        uploadProgressBar.style.width = overallPercent + '%';
                                        uploadProgressBar.innerText = `Uploading ${filesUploaded + 1}/${totalFiles}... ${percentComplete}%`;
                                    }
                                }
                            });
                            xhr.addEventListener('load', () => {
                                if (xhr.status === 200) {
                                    filesUploaded++;
                                    resolve(xhr.response);
                                } else {
                                    reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
                                }
                            });
                            xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
                            xhr.open('POST', `${API_ENDPOINT}upload_document.php`, true);
                            xhr.send(formData);
                        });
                    } catch (error) {
                        alert(`Error uploading file "${file.name}": ${error.message}`);
                        if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
                        return; 
                    }
                }
                uploadDocModal.hide();
                showToast(`${totalFiles} file(s) uploaded successfully!`, 'var(--bs-success)');
                fetchDocuments(1, '');
            });
        }
        fetchDocuments();
    }
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[match]);
    }
    initialize();
});