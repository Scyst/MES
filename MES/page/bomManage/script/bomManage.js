document.addEventListener('DOMContentLoaded', () => {
    const partNoList = document.getElementById('partNoList');
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    // --- ฟังก์ชันกลาง ---

    // 1. โหลดรายการ Part No. ทั้งหมดมาใส่ใน Datalist (ใช้ร่วมกัน)
    async function loadAllParts() {
        try {
            const response = await fetch('../../api/pdTable/pdTableManage.php?action=get_part_nos');
            const result = await response.json();
            if (result.success) {
                partNoList.innerHTML = result.data.map(part => `<option value="${part}"></option>`).join('');
            }
        } catch (error) {
            console.error('Failed to load parts list:', error);
        }
    }

    // 2. โหลดรายการ FG สำหรับไลน์ผลิตที่ระบุ
    async function loadFgPartsForLine(line) {
        const selectElement = document.querySelector(`.fg-part-select[data-line="${line}"]`);
        if (!selectElement) return;
        try {
            // เราจะใช้ API เดิม แต่เพิ่ม parameter line เข้าไป
            const response = await fetch(`../../api/pdTable/pdTableManage.php?action=get_part_nos&line=${line}`);
            const result = await response.json();
            if (result.success) {
                selectElement.innerHTML = '<option value="">-- Select a Part --</option>';
                selectElement.innerHTML += result.data.map(part => `<option value="${part}">${part}</option>`).join('');
            }
        } catch (error) {
            console.error(`Failed to load FG parts for line ${line}:`, error);
        }
    }
    
    // 3. โหลดข้อมูล BOM ของ FG ที่เลือก
    async function fetchBom(fgPartNo, line) {
        const activeTabPane = document.querySelector(`#line-pane-${line}`);
        const bomTableBody = activeTabPane.querySelector('.bom-table-body');
        const bomHeader = activeTabPane.querySelector('.bom-header');
        const selectedFgInput = activeTabPane.querySelector('.selected-fg-part-no');

        if (!fgPartNo) {
            bomHeader.textContent = 'Please select a Finished Good';
            bomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No FG selected.</td></tr>';
            return;
        }

        bomHeader.textContent = `BOM for: ${fgPartNo}`;
        selectedFgInput.value = fgPartNo;
        bomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
        
        try {
            const response = await fetch(`../../api/bomManager/bomManager.php?action=get_bom_components&fg_part_no=${fgPartNo}`);
            const result = await response.json();
            
            bomTableBody.innerHTML = '';
            if (result.success && result.data.length > 0) {
                result.data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.component_part_no}</td>
                        <td>${item.quantity_required}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteComponent(${item.bom_id}, '${line}')">Delete</button>
                        </td>
                    `;
                    bomTableBody.appendChild(tr);
                });
            } else {
                bomTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No components found for this BOM.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to fetch BOM:', error);
            bomTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load BOM data.</td></tr>';
        }
    }

    // 4. ทำให้ฟังก์ชัน Delete ใช้งานได้ (เพิ่ม parameter line)
    window.deleteComponent = async (bomId, line) => {
        if (!confirm('Are you sure you want to delete this component?')) return;
        
        const selectElement = document.querySelector(`.fg-part-select[data-line="${line}"]`);
        const fgPartNo = selectElement.value;

        try {
            const response = await fetch('../../api/bomManager/bomManager.php?action=delete_bom_component', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ bom_id: bomId })
            });
            const result = await response.json();
            showToast(result.message, result.success ? '#28a745' : '#dc3545');
            if(result.success) {
                fetchBom(fgPartNo, line); // โหลดข้อมูลใหม่
            }
        } catch (error) {
            console.error('Failed to delete component:', error);
            showToast('An error occurred.', '#dc3545');
        }
    }

    // --- ตั้งค่า Event Listeners สำหรับทุกแท็บ ---
    
    document.querySelectorAll('.tab-pane').forEach(tabPane => {
        const line = tabPane.id.replace('line-pane-', '');
        const fgSelect = tabPane.querySelector('.fg-part-select');
        const addForm = tabPane.querySelector('.add-component-form');

        // Event listener เมื่อมีการเลือก FG
        fgSelect.addEventListener('change', () => {
            fetchBom(fgSelect.value, line);
        });

        // Event listener สำหรับฟอร์มเพิ่ม Component
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());

            if (!payload.fg_part_no) {
                showToast('Please select a Finished Good first.', '#ffc107');
                return;
            }

            try {
                const response = await fetch('../../api/bomManager/bomManager.php?action=add_bom_component', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                showToast(result.message, result.success ? '#28a745' : '#dc3545');
                if(result.success) {
                    fetchBom(payload.fg_part_no, line);
                    e.target.reset();
                }
            } catch (error) {
                console.error('Failed to add component:', error);
                showToast('An error occurred.', '#dc3545');
            }
        });
    });

    // --- เริ่มต้นการทำงาน ---
    loadAllParts(); // โหลด Part No. ทั้งหมดสำหรับ Datalist

    // โหลด FG Parts สำหรับแท็บแรกที่ Active อยู่
    const activeTab = document.querySelector('#lineBomTab .nav-link.active');
    if (activeTab) {
        const initialLine = activeTab.id.replace('-tab', '');
        loadFgPartsForLine(initialLine);
    }
    
    // เพิ่ม Event Listener เพื่อโหลด FG Parts เมื่อมีการเปลี่ยนแท็บ
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const line = event.target.id.replace('-tab', '');
            loadFgPartsForLine(line);
        });
    });

});