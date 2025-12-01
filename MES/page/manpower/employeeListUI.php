<?php
// page/manpower/employeeListUI.php
require_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
$pageTitle = "Employee Management";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="../dailyLog/css/portal.css?v=<?php echo time(); ?>"> 
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        html, body.dashboard-page { font-family: 'Sarabun', sans-serif; height: auto !important; min-height: 100vh; overflow-y: auto !important; }
        .page-container { height: auto !important; overflow: visible !important; display: block !important; }
        #main-content { margin-left: 70px !important; width: calc(100% - 70px) !important; height: auto !important; min-height: 100vh; overflow: visible !important; padding-bottom: 50px; }
        #sidebar-toggle-btn { display: inline-flex !important; }
        .report-header { background-color: var(--bs-secondary-bg); padding: 1rem 1.5rem; border-bottom: 1px solid var(--bs-border-color); position: sticky; top: 0; z-index: 1020; }
        .chart-box { background: var(--bs-secondary-bg); border: 1px solid var(--bs-border-color); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; min-height: 500px; }
        #loadingOverlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.8); z-index: 9999; display: none; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.7); }
        .spinner-custom { width: 3rem; height: 3rem; border: 5px solid #e5e7eb; border-top-color: #0d6efd; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
</head>
<body class="dashboard-page">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>
    
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>
        
        <main id="main-content">
            <div class="report-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-3">
                    <a href="manpowerUI.php" class="btn btn-outline-secondary border-0 rounded-circle p-2" title="กลับหน้า Manpower">
                        <i class="fas fa-arrow-left fa-lg"></i>
                    </a>
                    <div class="d-flex flex-column">
                        <span class="fw-bold fs-5 text-body">
                            <span class="badge bg-warning text-dark bg-opacity-25 me-2"><i class="fas fa-id-card"></i></span>
                            Employee List
                        </span>
                        <span class="text-muted small ms-1">จัดการข้อมูลพนักงาน & ทีม</span>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="d-none d-md-inline text-muted small me-3">
                        <i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?>
                    </span>
                    <button class="btn btn-link text-secondary p-0 me-3" id="page-theme-btn" title="Switch Theme">
                        <i class="fas fa-adjust fa-lg"></i>
                    </button>
                </div>
            </div>
            
            <div class="container-fluid p-4" style="max-width: 1600px;">
                <div class="card border-0 shadow-sm mb-4 bg-body" style="border-radius: 12px;">
                    <div class="card-body py-3">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted"></i></span>
                                    <div class="form-floating">
                                        <input type="text" id="searchInput" class="form-control border-0 bg-light fw-bold" placeholder="Search...">
                                        <label for="searchInput">Search by ID, Name, Team or Line</label>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end mt-2 mt-md-0">
                                <button class="btn btn-primary fw-bold px-4 w-100 w-md-auto" onclick="fetchEmployees()">
                                    <i class="fas fa-sync-alt me-2"></i>Refresh Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chart-box">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light sticky-top" style="z-index: 5;">
                                <tr class="text-uppercase small text-muted">
                                    <th class="py-3 ps-4">Emp ID</th>
                                    <th class="py-3">Name / Dept</th>
                                    <th class="py-3 text-center">Team</th> 
                                    <th class="py-3 text-center">Line (System)</th>
                                    <th class="py-3 text-center">Default Shift</th>
                                    <th class="py-3 text-center">Status</th>
                                    <th class="py-3 text-center">Edit</th>
                                </tr>
                            </thead>
                            <tbody id="empTableBody" class="border-top-0"></tbody>
                        </table>
                    </div>
                    <div class="bg-white p-3 border-top text-muted small d-flex justify-content-between">
                        <span id="countDisplay">Loading...</span>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <div class="modal fade" id="editEmpModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold"><i class="fas fa-user-edit me-2 text-primary"></i>Edit Employee</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="editEmpForm">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold">Employee Name</label>
                            <input type="text" class="form-control bg-light fw-bold" id="modalEmpName" disabled>
                            <input type="hidden" id="modalEmpId">
                        </div>
                        
                        <div class="row g-2 mb-3">
                            <div class="col-8">
                                <label class="form-label small fw-bold">Line / Section</label>
                                <select class="form-select" id="modalLine">
                                    <option value="">Loading lines...</option>
                                </select>
                            </div>
                            <div class="col-4">
                                <label class="form-label small fw-bold text-primary">Team Group</label>
                                <select class="form-select fw-bold text-primary" id="modalTeam">
                                    <option value="">-</option>
                                    <option value="A">Team A</option>
                                    <option value="B">Team B</option>
                                    <option value="C">Team C</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">Default Shift</label>
                            <select class="form-select" id="modalShift">
                                <option value="">-- Select Shift --</option>
                            </select>
                        </div>

                        <div class="form-check form-switch p-3 bg-light rounded border">
                            <input class="form-check-input ms-0 me-3" type="checkbox" id="modalActive" checked>
                            <label class="form-check-label fw-bold" for="modalActive">Active Status</label>
                            <div class="text-muted small mt-1">ปิดการใช้งานหากพนักงานลาออกหรือย้ายแผนก</div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" onclick="saveEmployee()">
                        <i class="fas fa-save me-2"></i>Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script>
        const API_URL = 'api/manage_employees.php';
        let allEmployees = [];
        let editModal;

        document.getElementById('page-theme-btn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-bs-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('theme', next);
        });

        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }

        document.addEventListener('DOMContentLoaded', () => {
            editModal = new bootstrap.Modal(document.getElementById('editEmpModal'));
            fetchEmployees();

            document.getElementById('searchInput').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allEmployees.filter(emp => 
                    (emp.name_th && emp.name_th.toLowerCase().includes(term)) || 
                    (emp.emp_id && emp.emp_id.includes(term)) || 
                    (emp.team_group && emp.team_group.toLowerCase().includes(term)) || 
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
                    
                    const lineSelect = document.getElementById('modalLine');
                    lineSelect.innerHTML = '<option value="">-- Select Line --</option>';
                    if (json.lines && json.lines.length > 0) {
                        json.lines.forEach(line => {
                            lineSelect.innerHTML += `<option value="${line}">${line}</option>`;
                        });
                    } else {
                        lineSelect.innerHTML += `<option value="TOOLBOX_POOL">TOOLBOX_POOL</option>`;
                    }

                    const shiftSelect = document.getElementById('modalShift');
                    shiftSelect.innerHTML = '<option value="">-- Select Shift --</option>';
                    json.shifts.forEach(s => {
                        shiftSelect.innerHTML += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time.substring(0,5)}-${s.end_time.substring(0,5)})</option>`;
                    });

                    renderTable(allEmployees);
                }
            } catch (err) {
                console.error(err);
                alert('Error loading data');
            } finally {
                hideSpinner();
            }
        }

        function renderTable(data) {
            const tbody = document.getElementById('empTableBody');
            document.getElementById('countDisplay').innerHTML = `<i class="fas fa-list-ol me-2"></i>Total: <strong>${data.length}</strong> records`;
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-5 text-muted"><i class="fas fa-search fa-3x mb-3 opacity-50"></i><br>No employees found matching your search.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(emp => {
                const isActive = emp.is_active == 1 
                    ? '<span class="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-3">Active</span>' 
                    : '<span class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3">Inactive</span>';
                
                const lineBadge = emp.line && emp.line.includes('POOL') 
                    ? `<span class="badge bg-warning text-dark bg-opacity-25 border border-warning">${emp.line}</span>` 
                    : `<span class="badge bg-light text-dark border font-monospace">${emp.line || '-'}</span>`;
                
                const shiftName = emp.shift_name ? `<span class="badge bg-info text-dark bg-opacity-10 border border-info">${emp.shift_name}</span>` : '<span class="text-muted">-</span>';

                // [NEW] Badge ทีม
                let teamBadge = '<span class="text-muted opacity-25">-</span>';
                if(emp.team_group === 'A') teamBadge = '<span class="badge bg-primary border border-light shadow-sm" style="width:30px;">A</span>';
                if(emp.team_group === 'B') teamBadge = '<span class="badge bg-warning text-dark border border-light shadow-sm" style="width:30px;">B</span>';
                if(emp.team_group === 'C') teamBadge = '<span class="badge bg-success border border-light shadow-sm" style="width:30px;">C</span>';

                return `
                    <tr>
                        <td class="ps-4 font-monospace text-primary fw-bold">${emp.emp_id}</td>
                        <td>
                            <div class="fw-bold text-dark">${emp.name_th || '-'}</div>
                            <small class="text-muted" style="font-size:0.75em;"><i class="fas fa-building me-1"></i>${emp.department_api || ''}</small>
                        </td>
                        <td class="text-center">${teamBadge}</td>
                        <td class="text-center">${lineBadge}</td>
                        <td class="text-center">${shiftName}</td>
                        <td class="text-center">${isActive}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:32px; height:32px;" onclick='openEdit(${JSON.stringify(emp)})' title="Edit">
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
            document.getElementById('modalLine').value = emp.line || ''; 
            document.getElementById('modalShift').value = emp.default_shift_id || '';
            document.getElementById('modalTeam').value = emp.team_group || ''; // [NEW] Load Team
            document.getElementById('modalActive').checked = (emp.is_active == 1);
            
            editModal.show();
        }

        async function saveEmployee() {
            const payload = {
                emp_id: document.getElementById('modalEmpId').value,
                line: document.getElementById('modalLine').value,
                shift_id: document.getElementById('modalShift').value || null,
                team_group: document.getElementById('modalTeam').value || null, // [NEW] Save Team
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
                    // if(typeof showToast === 'function') showToast('Saved successfully', '#198754');
                    // else alert('Saved successfully');
                    alert('Saved successfully'); // ใช้ Alert ไปก่อนเพื่อความง่าย
                    editModal.hide();
                    fetchEmployees(); 
                } else {
                    alert(json.message);
                }
            } catch (err) {
                console.error(err);
                alert('Error saving data');
            } finally {
                hideSpinner();
            }
        }
    </script>
</body>
</html>