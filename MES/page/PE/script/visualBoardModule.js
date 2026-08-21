const VisualBoardModule = (function() {
    let machines = [];
    let lines = [];
    let selectedMachineIds = new Set();
    
    // Config from PHP session/init
    const BASE_URL = window.location.origin + '/MES/MES';
    
    async function loadData() {
        try {
            const tbody = document.getElementById('vbMachineTbody');
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>Loading machines...</td></tr>`;
            
            // Fetch machines from API
            const response = await fetch(`${PE_CONFIG.apiBase}machineAPI.php?action=get_machines`, {
                headers: { 'X-CSRF-Token': PE_CONFIG.csrfToken }
            });
            const result = await response.json();
            
            if (result.success) {
                machines = Array.isArray(result.data) ? result.data : (result.data.machines || []);
                
                // Extract unique lines for filter
                lines = [...new Set(machines.map(m => m.line).filter(l => l))].sort();
                
                populateFilter();
                renderTable();
            } else {
                Swal.fire('Error', result.message || 'Failed to load machines', 'error');
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load data.</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading visual boards:', error);
            Swal.fire('Error', 'Connection error while loading visual boards.', 'error');
        }
    }
    
    function populateFilter() {
        const select = document.getElementById('vbLineFilter');
        if (!select) return;
        const currentVal = select.value;
        
        let html = `<option value="">-- All Lines --</option>`;
        lines.forEach(line => {
            html += `<option value="${line}">${line}</option>`;
        });
        
        select.innerHTML = html;
        select.value = currentVal;
    }
    
    function renderTable() {
        const tbody = document.getElementById('vbMachineTbody');
        const filterLine = document.getElementById('vbLineFilter') ? document.getElementById('vbLineFilter').value : '';
        const searchInput = document.getElementById('vbSearchInput') ? document.getElementById('vbSearchInput').value.toLowerCase() : '';
        
        let filtered = machines;
        
        // Filter by line
        if (filterLine) {
            filtered = filtered.filter(m => m.line === filterLine);
        }
        
        // Filter by search text
        if (searchInput) {
            filtered = filtered.filter(m => 
                (m.machine_code && m.machine_code.toLowerCase().includes(searchInput)) ||
                (m.machine_name && m.machine_name.toLowerCase().includes(searchInput))
            );
        }
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-search fa-2x mb-2 opacity-25"></i><br>ไม่พบเครื่องจักรที่ตรงกับเงื่อนไข
                    </td>
                </tr>`;
            return;
        }
        
        let html = '';
        filtered.forEach(m => {
            const isChecked = selectedMachineIds.has(m.machine_id) ? 'checked' : '';
            html += `
            <tr>
                <td class="text-center">
                    <input class="form-check-input vb-row-checkbox" type="checkbox" value="${m.machine_id}" ${isChecked} onchange="VisualBoardModule.updateSelection(this)">
                </td>
                <td class="fw-bold text-primary">
                    ${m.is_loto ? '<span class="badge bg-danger me-1" style="font-size:0.7rem;" title="LOCKED"><i class="fas fa-lock"></i></span>' : ''}
                    ${escapeHtml(m.machine_code)}
                </td>
                <td>${escapeHtml(m.machine_name)}</td>
                <td><span class="badge bg-secondary">${escapeHtml(m.line || '-')}</span></td>
                <td>${escapeHtml(m.area || '-')}</td>
                <td class="text-center">
                    ${m.status === 'Active' ? '<span class="badge bg-success">Active</span>' : `<span class="badge bg-warning text-dark">${escapeHtml(m.status)}</span>`}
                </td>
            </tr>
            `;
        });
        
        tbody.innerHTML = html;
        updateSelectedCount();
        updateSelectAllCheckboxState();
    }

    function filterTable() {
        renderTable();
    }

    function updateSelection(checkbox) {
        const id = parseInt(checkbox.value);
        if (checkbox.checked) {
            selectedMachineIds.add(id);
        } else {
            selectedMachineIds.delete(id);
        }
        updateSelectedCount();
        updateSelectAllCheckboxState();
    }

    function toggleSelectAll(masterCheckbox) {
        const isChecked = masterCheckbox.checked;
        const visibleCheckboxes = document.querySelectorAll('.vb-row-checkbox');
        
        visibleCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = parseInt(cb.value);
            if (isChecked) {
                selectedMachineIds.add(id);
            } else {
                selectedMachineIds.delete(id);
            }
        });
        updateSelectedCount();
    }

    function selectAll(state) {
        const master = document.getElementById('vbSelectAllCheckbox');
        if (master) {
            master.checked = state;
            toggleSelectAll(master);
        }
    }

    function updateSelectAllCheckboxState() {
        const master = document.getElementById('vbSelectAllCheckbox');
        if (!master) return;
        
        const visibleCheckboxes = document.querySelectorAll('.vb-row-checkbox');
        if (visibleCheckboxes.length === 0) {
            master.checked = false;
            master.indeterminate = false;
            return;
        }
        
        let checkedCount = 0;
        visibleCheckboxes.forEach(cb => {
            if (cb.checked) checkedCount++;
        });
        
        if (checkedCount === 0) {
            master.checked = false;
            master.indeterminate = false;
        } else if (checkedCount === visibleCheckboxes.length) {
            master.checked = true;
            master.indeterminate = false;
        } else {
            master.checked = false;
            master.indeterminate = true;
        }
    }
    
    function updateSelectedCount() {
        const countSpan = document.getElementById('vbSelectedCount');
        if (countSpan) {
            countSpan.innerText = selectedMachineIds.size;
        }
    }

    function printSelected() {
        if (selectedMachineIds.size === 0) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกเครื่องจักรที่ต้องการพิมพ์อย่างน้อย 1 เครื่อง', 'warning');
            return;
        }
        
        // Find full machine objects for selected IDs
        const selectedMachinesData = machines.filter(m => selectedMachineIds.has(m.machine_id));
        
        // Store in localStorage
        localStorage.setItem('print_machines_data', JSON.stringify(selectedMachinesData));
        
        // Open Print Window
        window.open('visual_board_print.php', '_blank');
    }
    
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    return {
        loadData,
        filterTable,
        updateSelection,
        toggleSelectAll,
        selectAll,
        printSelected
    };
})();

// Auto load if this tab is active initially
document.addEventListener('DOMContentLoaded', () => {
    window.VisualBoardModule = VisualBoardModule;
});
