document.addEventListener('DOMContentLoaded', function() {
    // --- 1. Drag & Drop Logic ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileNameDisplay.textContent = e.dataTransfer.files[0].name;
            }
        });

        fileInput.addEventListener('change', () => {
            if(fileInput.files.length) fileNameDisplay.textContent = fileInput.files[0].name;
        });
    }

    // --- 2. Load History Logic ---
    function loadHistory() {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

        // URL เทียบจากหน้าต่างที่รัน (finance_dashboard.php)
        fetch('api/api_get_invoice_history.php')
        .then(res => res.json())
        .then(res => {
            if(res.success && res.data.length > 0) {
                tbody.innerHTML = res.data.map(iv => `
                    <tr class="${iv.is_active == 1 ? 'table-primary' : 'text-muted'}">
                        <td class="fw-bold">${iv.invoice_no}</td>
                        <td class="text-center"><span class="badge bg-${iv.is_active == 1 ? 'primary' : 'secondary'}">v${iv.version}</span></td>
                        <td class="text-end fw-bold text-dark">$${Number(iv.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td class="small">${iv.remark || '-'}</td>
                        <td class="small">${iv.created_at}</td>
                        <td class="text-center">
                            ${iv.is_active == 1 ? '<i class="fas fa-check-circle text-success"></i> Active' : '<i class="fas fa-archive text-secondary"></i> Archived'}
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No data found.</td></tr>';
            }
        }).catch(err => {
            console.error('Error fetching history:', err);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
    }

    // Make loadHistory globally accessible if needed for refresh button
    window.loadHistory = loadHistory;

    // Initial Load
    loadHistory();

    // --- 3. Submit Logic ---
    const formImport = document.getElementById('formImport');
    if (formImport) {
        formImport.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btnSubmit = document.getElementById('btnSubmit');
            const btnSpinner = document.getElementById('btnSpinner');
            btnSubmit.disabled = true;
            btnSpinner.classList.remove('d-none');

            // ดึง CSRF Token จาก Meta Tag
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            fetch('api/api_import_invoice.php', {
                method: 'POST',
                body: new FormData(this),
                headers: {
                    'X-CSRF-Token': csrfToken // ส่ง Token ป้องกันการปลอมแปลง Request
                }
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    Swal.fire('Success', data.message, 'success');
                    this.reset();
                    fileNameDisplay.textContent = '';
                    loadHistory(); // Reload table ทันที
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            })
            .catch(err => {
                console.error('Upload Error:', err);
                Swal.fire('Error', 'Network or server error occurred.', 'error');
            })
            .finally(() => {
                btnSubmit.disabled = false;
                btnSpinner.classList.add('d-none');
            });
        });
    }
});