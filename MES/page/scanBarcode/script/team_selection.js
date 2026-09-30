
// ===== Team User Selection =====
async function loadRecordTeamUsers() {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center small text-muted">กำลังโหลด...</div>';
    
    try {
        const response = await fetch(../production/api/inventoryManage.php?action=get_team_users);
        const result = await response.json();
        
        if (result.success) {
            populateRecordTeamUserDropdown(result.users);
            
            // Auto-select line users if location is already selected, else leave empty
            const locationId = document.getElementById('locationSelect').value;
            if (locationId) {
                selectActiveLineUsers();
            } else {
                setRecordTeamUserSelection([]);
            }
        } else {
            listEl.innerHTML = '<div class="text-center small text-danger"></div>';
        }
    } catch (e) {
        listEl.innerHTML = '<div class="text-center small text-danger">เกิดข้อผิดพลาด</div>';
    }
}

function populateRecordTeamUserDropdown(users) {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const searchLi = document.createElement('li');
    searchLi.className = 'px-2 pb-2 mb-2 border-bottom sticky-top bg-white';
    searchLi.innerHTML = \
        <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" placeholder="ค้นหาชื่อ..." id="record_team_user_search">
            <button type="button" class="btn btn-sm btn-outline-primary" id="record_team_user_select_line" title="เลือกทั้งไลน์">
                <i class="fas fa-users"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" id="record_team_user_clear" title="ล้างผู้ใช้งานทั้งหมด">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    \;
    listEl.appendChild(searchLi);

    const searchInput = searchLi.querySelector('input');
    searchInput.addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const items = listEl.querySelectorAll('.team-user-item');
        items.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(term) ? '' : 'none';
        });
    });

    const clearBtn = searchLi.querySelector('#record_team_user_clear');
    clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkboxes = listEl.querySelectorAll('.team-user-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        updateRecordTeamUserUI();
    });

    const selectLineBtn = searchLi.querySelector('#record_team_user_select_line');
    selectLineBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectActiveLineUsers();
    });

    users.forEach(u => {
        const li = document.createElement('li');
        li.className = 'dropdown-item p-1 team-user-item';

        const div = document.createElement('div');
        div.className = 'form-check m-0';

        const input = document.createElement('input');
        input.className = 'form-check-input ms-0 me-2 team-user-checkbox';
        input.type = 'checkbox';
        input.value = u.id;
        input.id = \ecord_team_user_\\;

        const label = document.createElement('label');
        label.className = 'form-check-label w-100 d-block small';
        label.htmlFor = \ecord_team_user_\\;
        label.textContent = u.fullname ? \\ (\)\ : u.username;

        input.addEventListener('change', () => updateRecordTeamUserUI());

        div.appendChild(input);
        div.appendChild(label);
        li.appendChild(div);
        listEl.appendChild(li);
    });
}

function updateRecordTeamUserUI() {
    const listEl = document.getElementById('record_team_user_list');
    const btnTextEl = document.getElementById('record_team_user_text');
    const countEl = document.getElementById('record_team_user_count');
    const hiddenInput = document.getElementById('record_team_user_ids');

    if (!listEl || !hiddenInput) return;

    const checkboxes = listEl.querySelectorAll('.team-user-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    hiddenInput.value = selectedIds.join(',');
    countEl.textContent = selectedIds.length;

    if (selectedIds.length === 0) {
        btnTextEl.textContent = '-- อิงตามผู้ล็อกอิน --';
        btnTextEl.classList.add('text-secondary');
        btnTextEl.classList.remove('text-dark', 'fw-bold');
    } else if (selectedIds.length === 1) {
        const label = listEl.querySelector(\#record_team_user_\\)?.nextElementSibling?.textContent;
        btnTextEl.textContent = label || \เลือก 1 คน\;
        btnTextEl.classList.remove('text-secondary');
        btnTextEl.classList.add('text-dark', 'fw-bold');
    } else {
        btnTextEl.textContent = \เลือก \ คน\;
        btnTextEl.classList.remove('text-secondary');
        btnTextEl.classList.add('text-dark', 'fw-bold');
    }
}

function setRecordTeamUserSelection(userIds) {
    const listEl = document.getElementById('record_team_user_list');
    if (!listEl) return;
    
    const checkboxes = listEl.querySelectorAll('.team-user-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = userIds.includes(cb.value);
    });
    updateRecordTeamUserUI();
}

async function selectActiveLineUsers() {
    const locationId = document.getElementById('locationSelect').value;
    if (!locationId) {
        if(typeof Swal !== 'undefined') Swal.fire('Error', 'กรุณาเลือก Location ก่อน', 'error');
        return;
    }
    
    const btn = document.getElementById('record_team_user_select_line');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังโหลด...';
    btn.disabled = true;
    
    try {
        const response = await fetch(../production/api/inventoryManage.php?action=get_active_line_users&location_id=\);
        const result = await response.json();
        
        if (result.success && result.users) {
            if (result.users.length === 0) {
                if(typeof Swal !== 'undefined') Swal.fire('Info', 'ไม่พบพนักงานในไลน์นี้ที่ยังไม่สแกนออกในกะปัจจุบัน', 'info');
            } else {
                const listEl = document.getElementById('record_team_user_list');
                // Inject any user not already in the dropdown
                result.users.forEach(u => {
                    if (listEl && !listEl.querySelector(\.team-user-checkbox[value="\"]\)) {
                        const li = document.createElement('li');
                        li.className = 'dropdown-item p-1 team-user-item';
                        const div = document.createElement('div');
                        div.className = 'form-check m-0';
                        const input = document.createElement('input');
                        input.className = 'form-check-input ms-0 me-2 team-user-checkbox';
                        input.type = 'checkbox';
                        input.value = u.id;
                        input.id = \ecord_team_user_\\;
                        input.addEventListener('change', () => updateRecordTeamUserUI());
                        const label = document.createElement('label');
                        label.className = 'form-check-label w-100 d-block small';
                        label.htmlFor = \ecord_team_user_\\;
                        label.textContent = u.fullname ? \\ (\)\ : u.username;
                        div.appendChild(input); div.appendChild(label); li.appendChild(div);
                        listEl.appendChild(li);
                    }
                });
                setRecordTeamUserSelection(result.users.map(u => String(u.id)));
                if(typeof showToast === 'function') showToast(เลือกพนักงาน \ คน เรียบร้อย, 'var(--bs-success)');
            }
        } else {
            if(typeof Swal !== 'undefined') Swal.fire('Error', result.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้', 'error');
        }
    } catch (e) {
        if(typeof Swal !== 'undefined') Swal.fire('Error', 'การเชื่อมต่อขัดข้อง', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

