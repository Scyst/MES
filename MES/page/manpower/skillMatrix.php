<?php
// page/manpower/skillMatrix.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('manage_manpower')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$currentUser   = $_SESSION['user'];
$pageTitle     = "Skill Matrix";
$pageHeaderTitle = "Skill Matrix";
$pageHeaderSubtitle = "ตารางทักษะพนักงานรายบุคคล — Multi-skill Tracking";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/manpowerUI.css?v=<?php echo filemtime(__DIR__ . '/css/manpowerUI.css'); ?>">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .skill-cell {
            width: 52px; min-width: 52px; text-align: center;
            cursor: pointer; user-select: none;
            transition: transform 0.15s;
        }
        .skill-cell:hover { transform: scale(1.1); }
        .level-0 { background: #f8f9fa; color: #adb5bd; }
        .level-1 { background: #fff3cd; color: #856404; } /* รู้จัก */
        .level-2 { background: #cfe2ff; color: #0a58ca; } /* ทำได้ */
        .level-3 { background: #d1e7dd; color: #146c43; } /* ชำนาญ */
        .level-4 { background: #d0f0c0; color: #155724; font-weight: 700; border: 2px solid #198754; } /* สอนได้ */
        .sticky-col { position: sticky; left: 0; background: #fff; z-index: 5; box-shadow: 2px 0 4px rgba(0,0,0,0.06); }
        .sticky-col-2 { position: sticky; left: 120px; background: #fff; z-index: 5; }
        th.sticky-col { z-index: 10; background: #f8f9fa; }
        .skill-matrix-table { border-collapse: separate; border-spacing: 0; }
        .skill-header { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap;
                        font-size: 0.72rem; max-height: 90px; padding: 4px 6px; }
    </style>
</head>
<body class="dashboard-page layout-top-header">
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content" class="d-flex flex-column" style="min-height: calc(100vh - 65px);">
        <div class="container-fluid p-3">

            <!-- Toolbar -->
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                <div class="fw-bold text-dark fs-6"><i class="fas fa-th me-2 text-primary"></i>Skill Matrix</div>
                <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
                    <select id="filterLine" class="form-select form-select-sm" style="width:130px">
                        <option value="ALL">ALL LINES</option>
                    </select>
                    <select id="filterHcGroup" class="form-select form-select-sm" style="width:120px">
                        <option value="ALL">ALL GROUPS</option>
                        <option value="TEAM 1">TEAM 1</option>
                    </select>
                    <select id="filterCategory" class="form-select form-select-sm" style="width:140px">
                        <option value="ALL">ALL CATEGORIES</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="SkillMatrix.load()">
                        <i class="fas fa-sync-alt me-1"></i>Refresh
                    </button>
                    <button class="btn btn-sm btn-success rounded-pill px-3" onclick="SkillMatrix.openManageSkillsModal()">
                        <i class="fas fa-cog me-1"></i>Manage Skills
                    </button>
                </div>
            </div>

            <!-- Legend -->
            <div class="d-flex gap-2 mb-2 flex-wrap align-items-center">
                <small class="text-muted fw-bold me-1">Level:</small>
                <span class="badge level-0 px-2 py-1">0 — ยังไม่มี</span>
                <span class="badge level-1 px-2 py-1">1 — รู้จัก</span>
                <span class="badge level-2 px-2 py-1">2 — ทำได้</span>
                <span class="badge level-3 px-2 py-1">3 — ชำนาญ</span>
                <span class="badge level-4 px-2 py-1">4 — สอนได้</span>
                <span class="ms-3 text-muted small"><i class="fas fa-info-circle me-1"></i>Level &ge;3 = นับว่า Certified | คลิก cell เพื่อแก้ไข</span>
            </div>

            <!-- Table -->
            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: calc(100vh - 230px); overflow: auto;">
                        <table class="table table-bordered table-sm mb-0 skill-matrix-table" id="skillMatrixTable">
                            <thead id="skillMatrixHead"></thead>
                            <tbody id="skillMatrixBody">
                                <tr><td colspan="99" class="text-center text-muted py-4">
                                    <i class="fas fa-spinner fa-spin me-2"></i>Loading...
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <script>
    const SkillMatrix = {
        state: { skills: [], employees: [], skillData: {}, categories: [] },

        init() {
            document.getElementById('filterLine').addEventListener('change', () => this.load());
            document.getElementById('filterHcGroup').addEventListener('change', () => this.load());
            document.getElementById('filterCategory').addEventListener('change', () => this.load());
            this.load();
        },

        async load() {
            const line     = document.getElementById('filterLine').value;
            const hcGroup  = document.getElementById('filterHcGroup').value;
            const category = document.getElementById('filterCategory').value;

            try {
                const resp   = await fetch(`api/api_skill_matrix.php?action=get_skill_matrix&line=${line}&hcGroup=${hcGroup}&category=${category}`);
                const result = await resp.json();
                if (!result.success) throw new Error(result.message);

                this.state = result;

                // Populate line filter on first load
                const lineSelect = document.getElementById('filterLine');
                const curLine = lineSelect.value;
                const lines = [...new Set(result.employees.map(e => e.line).filter(Boolean))].sort();
                lineSelect.innerHTML = '<option value="ALL">ALL LINES</option>' + lines.map(l => `<option value="${l}">${l}</option>`).join('');
                if (lines.includes(curLine)) lineSelect.value = curLine;

                // Populate category filter
                const catSelect = document.getElementById('filterCategory');
                const curCat = catSelect.value;
                catSelect.innerHTML = '<option value="ALL">ALL CATEGORIES</option>' + result.categories.map(c => `<option value="${c}">${c}</option>`).join('');
                if (result.categories.includes(curCat)) catSelect.value = curCat;

                this.renderMatrix();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        },

        renderMatrix() {
            const { skills, employees, skillData } = this.state;
            const thead = document.getElementById('skillMatrixHead');
            const tbody = document.getElementById('skillMatrixBody');

            if (skills.length === 0) {
                thead.innerHTML = '';
                tbody.innerHTML = '<tr><td class="text-center text-muted py-4">ยังไม่มีทักษะที่กำหนดไว้ กรุณากด "Manage Skills" เพื่อเพิ่ม</td></tr>';
                return;
            }

            // Group skills by category for header
            const catMap = {};
            skills.forEach(s => { const c = s.category || 'ทั่วไป'; if (!catMap[c]) catMap[c] = []; catMap[c].push(s); });

            // Build header rows
            let headHtml = '<tr class="align-bottom">';
            headHtml += '<th class="sticky-col text-center align-middle" style="min-width:120px">พนักงาน</th>';
            headHtml += '<th class="sticky-col-2 text-center align-middle" style="min-width:90px">Line</th>';
            headHtml += '<th class="text-center align-middle" style="min-width:60px">Skills<br><small class="text-muted">(Level>=2)</small></th>';

            // Category group headers
            Object.entries(catMap).forEach(([cat, catSkills]) => {
                catSkills.forEach(s => {
                    headHtml += `<th class="skill-cell align-bottom px-1" title="${s.skill_name} (${s.skill_code})">`;
                    headHtml += `<div class="skill-header">${s.skill_name}</div></th>`;
                });
            });
            headHtml += '</tr>';
            thead.innerHTML = headHtml;

            // Build body rows
            let bodyHtml = '';
            employees.forEach(emp => {
                const empSkills = skillData[emp.emp_id] || {};
                const skillCount = Object.values(empSkills).filter(s => s.level >= 2).length;

                bodyHtml += `<tr>`;
                bodyHtml += `<td class="sticky-col fw-bold small text-truncate" style="max-width:120px" title="${emp.name_th}">${emp.name_th}</td>`;
                bodyHtml += `<td class="sticky-col-2 small text-muted text-center">${emp.line || '-'}</td>`;
                bodyHtml += `<td class="text-center fw-bold ${skillCount >= 5 ? 'text-success' : skillCount >= 3 ? 'text-primary' : 'text-muted'}">${skillCount}</td>`;

                skills.forEach(skill => {
                    const empSkill = empSkills[skill.skill_id];
                    const level = empSkill ? empSkill.level : 0;
                    const label = level === 0 ? '-' : level;
                    const cert  = (empSkill && empSkill.certified_at) ? ` title="Certified: ${empSkill.certified_at}"` : '';
                    bodyHtml += `<td class="skill-cell level-${level}"${cert} onclick="SkillMatrix.openLevelEdit('${emp.emp_id}', '${emp.name_th}', ${skill.skill_id}, '${skill.skill_name}', ${level})">${label}</td>`;
                });

                bodyHtml += '</tr>';
            });

            tbody.innerHTML = bodyHtml || '<tr><td colspan="99" class="text-center text-muted py-4">ไม่มีพนักงานในเงื่อนไขที่เลือก</td></tr>';
        },

        openLevelEdit(empId, empName, skillId, skillName, currentLevel) {
            const levelOptions = [
                { value: 0, label: '0 — ยังไม่มี', cls: 'secondary' },
                { value: 1, label: '1 — รู้จัก', cls: 'warning' },
                { value: 2, label: '2 — ทำได้', cls: 'primary' },
                { value: 3, label: '3 — ชำนาญ (Certified)', cls: 'success' },
                { value: 4, label: '4 — สอนคนอื่นได้', cls: 'dark' },
            ];
            const btns = levelOptions.map(opt => {
                const active = opt.value === currentLevel ? 'fw-bold border-2' : 'opacity-75';
                return `<button class="btn btn-sm btn-outline-${opt.cls} ${active} px-3 py-2" onclick="SkillMatrix.setLevel('${empId}', ${skillId}, ${opt.value})">${opt.label}</button>`;
            }).join(' ');

            Swal.fire({
                title: `<small class="text-muted">${empName}</small><br>${skillName}`,
                html: `<div class="d-flex flex-column gap-2 mt-2">${btns}</div>`,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
            });
        },

        async setLevel(empId, skillId, level) {
            Swal.close();
            try {
                const fd = new URLSearchParams({ action: 'update_emp_skill', emp_id: empId, skill_id: skillId, level });
                const resp = await fetch('api/api_skill_matrix.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
                const result = await resp.json();
                if (!result.success) throw new Error(result.message);

                // Update local state
                if (!this.state.skillData[empId]) this.state.skillData[empId] = {};
                if (level === 0) {
                    delete this.state.skillData[empId][skillId];
                } else {
                    this.state.skillData[empId][skillId] = { level, certified_at: level >= 3 ? new Date().toISOString().split('T')[0] : null };
                }
                this.renderMatrix();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        },

        async openManageSkillsModal() {
            const resp   = await fetch('api/api_skill_matrix.php?action=get_skill_definitions');
            const result = await resp.json();
            if (!result.success) { Swal.fire('Error', result.message, 'error'); return; }

            const rows = result.data.map(s => `
                <tr data-skill-id="${s.skill_id}">
                    <td>${s.skill_code}</td>
                    <td>${s.skill_name}</td>
                    <td>${s.category || '-'}</td>
                    <td>${s.line || 'ทุก Line'}</td>
                    <td>
                        <span class="badge ${s.is_active ? 'bg-success' : 'bg-secondary'}">${s.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                        <button class="btn btn-xs btn-outline-warning btn-sm me-1" onclick="SkillMatrix.toggleSkillActive(${s.skill_id})">
                            <i class="fas ${s.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button class="btn btn-xs btn-outline-danger btn-sm" onclick="SkillMatrix.deleteSkill(${s.skill_id}, '${s.skill_name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            Swal.fire({
                title: '<i class="fas fa-cog me-2"></i>จัดการทักษะ',
                width: 700,
                html: `
                    <div style="max-height:300px;overflow-y:auto;" class="mb-3">
                        <table class="table table-sm table-bordered text-start">
                            <thead class="table-light"><tr><th>Code</th><th>ชื่อทักษะ</th><th>Category</th><th>Line</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีทักษะ</td></tr>'}</tbody>
                        </table>
                    </div>
                    <hr>
                    <h6 class="text-start fw-bold">เพิ่มทักษะใหม่</h6>
                    <div class="row g-2 text-start">
                        <div class="col-6"><label class="form-label small fw-bold">Skill Code (ตัวพิมพ์ใหญ่)</label>
                            <input type="text" id="newSkillCode" class="form-control form-control-sm" placeholder="เช่น WELD_MIG"></div>
                        <div class="col-6"><label class="form-label small fw-bold">ชื่อทักษะ</label>
                            <input type="text" id="newSkillName" class="form-control form-control-sm" placeholder="เช่น เชื่อม MIG"></div>
                        <div class="col-6"><label class="form-label small fw-bold">Category</label>
                            <input type="text" id="newSkillCategory" class="form-control form-control-sm" placeholder="เช่น Machine, Process, Quality"></div>
                        <div class="col-6"><label class="form-label small fw-bold">Line (ว่าง=ทุก Line)</label>
                            <input type="text" id="newSkillLine" class="form-control form-control-sm" placeholder="เช่น LINE_A"></div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-plus me-1"></i>เพิ่มทักษะ',
                cancelButtonText: 'ปิด',
                preConfirm: () => this.saveSkillDefinition()
            });
        },

        async saveSkillDefinition() {
            const code = document.getElementById('newSkillCode')?.value.trim();
            const name = document.getElementById('newSkillName')?.value.trim();
            const cat  = document.getElementById('newSkillCategory')?.value.trim();
            const line = document.getElementById('newSkillLine')?.value.trim();

            if (!code || !name) { Swal.showValidationMessage('กรุณากรอก Skill Code และชื่อทักษะ'); return false; }

            const fd = new URLSearchParams({ action: 'save_skill_definition', skill_code: code, skill_name: name, category: cat, line });
            const resp = await fetch('api/api_skill_matrix.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
            const result = await resp.json();
            if (!result.success) { Swal.showValidationMessage(result.message); return false; }
            await this.load();
            return true;
        },

        async toggleSkillActive(skillId) {
            const fd = new URLSearchParams({ action: 'toggle_skill_active', skill_id: skillId });
            await fetch('api/api_skill_matrix.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
            Swal.close();
            await this.load();
            this.openManageSkillsModal();
        },

        async deleteSkill(skillId, skillName) {
            const conf = await Swal.fire({ title: `ลบทักษะ "${skillName}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#dc3545' });
            if (!conf.isConfirmed) return;
            const fd = new URLSearchParams({ action: 'delete_skill_definition', skill_id: skillId });
            const resp = await fetch('api/api_skill_matrix.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
            const result = await resp.json();
            if (!result.success) { Swal.fire('Error', result.message, 'error'); return; }
            Swal.close();
            await this.load();
        }
    };

    document.addEventListener('DOMContentLoaded', () => SkillMatrix.init());
    </script>

</body>
</html>
