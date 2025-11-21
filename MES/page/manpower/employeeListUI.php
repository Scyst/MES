<?php
// page/manpower/employeeListUI.php
require_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Employee Management</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .emp-view { display: flex; flex-direction: column; height: calc(100vh - 80px); overflow: hidden; }
        .emp-content { flex-grow: 1; min-height: 0; display: flex; flex-direction: column; }
        .table-scroll { flex-grow: 1; overflow-y: auto; position: relative; border: 1px solid var(--bs-border-color); border-radius: .375rem; }
        .table-scroll thead { position: sticky; top: 0; z-index: 10; background-color: var(--bs-tertiary-bg); }
    </style>
</head>
<body class="dashboard-page">
    
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu"><i class="fas fa-bars"></i></button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>
        
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="container-fluid pt-3 emp-view">
                <div class="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
                    <h2 class="mb-0"><i class="fas fa-id-card me-2"></i>Employee List</h2>
                    <div class="d-flex gap-2">
                        <input type="text" id="searchInput" class="form-control" placeholder="Search Name, ID or Line...">
                        <button class="btn btn-primary" onclick="fetchEmployees()"><i class="fas fa-sync-alt"></i> Refresh</button>
                    </div>
                </div>

                <div class="emp-content">
                    <div class="table-scroll bg-white shadow-sm">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Position</th>
                                    <th>Line (System)</th>
                                    <th>Shift</th>
                                    <th>Status</th>
                                    <th class="text-center">Edit</th>
                                </tr>
                            </thead>
                            <tbody id="empTableBody"></tbody>
                        </table>
                    </div>
                    <div class="mt-2 text-muted small" id="countDisplay">Loading...</div>
                </div>
            </div>
        </main>
    </div>

    <div class="modal fade" id="editEmpModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Employee</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="editEmpForm">
                        <div class="mb-3">
                            <label class="form-label">Employee</label>
                            <input type="text" class="form-control" id="modalEmpName" disabled>
                            <input type="hidden" id="modalEmpId">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Line / Section</label>
                            <select class="form-select" id="modalLine">
                                <option value="">Loading lines...</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Shift</label>
                            <select class="form-select" id="modalShift">
                                <option value="">-- Select Shift --</option>
                            </select>
                        </div>

                        <div class="mb-3 form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="modalActive" checked>
                            <label class="form-check-label" for="modalActive">Active Status</label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="saveEmployee()">Save Changes</button>
                </div>
            </div>
        </div>
    </div>

    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script>
        const API_URL = 'api/manage_employees.php';
        let allEmployees = [];
        let editModal;

        document.addEventListener('DOMContentLoaded', () => {
            editModal = new bootstrap.Modal(document.getElementById('editEmpModal'));
            fetchEmployees();

            // Search Logic
            document.getElementById('searchInput').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allEmployees.filter(emp => 
                    (emp.name_th && emp.name_th.toLowerCase().includes(term)) || 
                    (emp.emp_id && emp.emp_id.includes(term)) || 
                    (emp.line && emp.line.toLowerCase().includes(term))
                );
                renderTable(filtered);
            });
        });

        async function fetchEmployees() {
            showSpinner();
            try {
                const res = await fetch(`${API_URL}?action=read`);
                const json = await res.json();
                
                if (json.success) {
                    allEmployees = json.data;
                    
                    // ★★★ NEW: Populate Line Dropdown (ดึงจาก DB แล้ว) ★★★
                    const lineSelect = document.getElementById('modalLine');
                    lineSelect.innerHTML = '<option value="">-- Select Line --</option>';
                    
                    if (json.lines && json.lines.length > 0) {
                        json.lines.forEach(line => {
                            lineSelect.innerHTML += `<option value="${line}">${line}</option>`;
                        });
                    } else {
                        // Fallback เผื่อไม่มีข้อมูล
                        lineSelect.innerHTML += `<option value="TOOLBOX_POOL">TOOLBOX_POOL</option>`;
                    }

                    // Populate Shift Dropdown
                    const shiftSelect = document.getElementById('modalShift');
                    shiftSelect.innerHTML = '<option value="">-- Select Shift --</option>';
                    json.shifts.forEach(s => {
                        shiftSelect.innerHTML += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time}-${s.end_time})</option>`;
                    });

                    renderTable(allEmployees);
                }
            } catch (err) {
                console.error(err);
                showToast('Error loading data', '#dc3545');
            } finally {
                hideSpinner();
            }
        }

        function renderTable(data) {
            const tbody = document.getElementById('empTableBody');
            document.getElementById('countDisplay').textContent = `Total: ${data.length} records`;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No employees found.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(emp => {
                const isActive = emp.is_active == 1 
                    ? '<span class="badge bg-success">Active</span>' 
                    : '<span class="badge bg-secondary">Inactive</span>';
                
                const lineBadge = emp.line && emp.line.includes('POOL') 
                    ? `<span class="badge bg-warning text-dark">${emp.line}</span>` 
                    : `<span class="badge bg-primary">${emp.line || '-'}</span>`;
                
                const shiftName = emp.shift_name || '-';

                return `
                    <tr>
                        <td>${emp.emp_id}</td>
                        <td>${emp.name_th || '-'} <div class="text-muted small" style="font-size:0.75em;">${emp.department_api || ''}</div></td>
                        <td>${emp.position || '-'}</td>
                        <td>${lineBadge}</td>
                        <td>${shiftName}</td>
                        <td>${isActive}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary" onclick='openEdit(${JSON.stringify(emp)})'>
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function openEdit(emp) {
            document.getElementById('modalEmpName').value = `${emp.emp_id} - ${emp.name_th}`;
            document.getElementById('modalEmpId').value = emp.emp_id;
            document.getElementById('modalLine').value = emp.line || ''; // Auto Select Line
            document.getElementById('modalShift').value = emp.default_shift_id || '';
            document.getElementById('modalActive').checked = (emp.is_active == 1);
            
            editModal.show();
        }

        async function saveEmployee() {
            const payload = {
                emp_id: document.getElementById('modalEmpId').value,
                line: document.getElementById('modalLine').value,
                shift_id: document.getElementById('modalShift').value || null,
                is_active: document.getElementById('modalActive').checked ? 1 : 0
            };

            showSpinner();
            try {
                const res = await fetch(`${API_URL}?action=update`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                
                if (json.success) {
                    showToast('Saved successfully', '#198754');
                    editModal.hide();
                    fetchEmployees(); // Reload table
                } else {
                    showToast(json.message, '#dc3545');
                }
            } catch (err) {
                console.error(err);
                showToast('Error saving data', '#dc3545');
            } finally {
                hideSpinner();
            }
        }
    </script>
</body>
</html>