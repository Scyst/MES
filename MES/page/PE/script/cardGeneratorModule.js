const CardGeneratorModule = (function() {
    let cardQueue = [];
    let cardIdCounter = 0;
    let allEmployees = [];
    let isInitialized = false;

    // Initialize module when tab is opened
    function init() {
        if (isInitialized) return;
        
        console.log("CardGeneratorModule initialized");
        loadEmployeesData();
        
        isInitialized = true;
    }

    async function loadEmployeesData() {
        try {
            const response = await fetch('api/safetyAPI.php?action=get_employees_for_cards');
            const json = await response.json();
            if(json.success) {
                allEmployees = json.data.employees;
                populateSelects(json.data.employees, json.data.lines);
            } else {
                console.error("Failed to load employees", json.message);
            }
        } catch(err) {
            console.error("Error loading employees", err);
        }
    }

    function populateSelects(employees, lines) {
        const opSelect = document.getElementById('cgOpEmployeeSelect');
        const lotoSelect = document.getElementById('cgLotoEmployeeSelect');
        const lineSelect = document.getElementById('cgBatchLineSelect');
        
        if (opSelect) opSelect.innerHTML = '<option value="">-- ค้นหาชื่อพนักงาน --</option>';
        if (lotoSelect) lotoSelect.innerHTML = '<option value="">-- ค้นหาชื่อช่าง --</option>';
        if (lineSelect) lineSelect.innerHTML = '<option value="">-- เลือกแผนก / ไลน์ผลิต --</option>';
        
        employees.forEach(emp => {
            const line = emp.line || emp.department_api || '';
            const photo = emp.profile_picture || '';
            const option = `<option value="${emp.emp_id}" data-name="${emp.name_th}" data-dept="${line}" data-photo="${photo}">${emp.emp_id} - ${emp.name_th}</option>`;
            if (opSelect) opSelect.insertAdjacentHTML('beforeend', option);
            if (lotoSelect) lotoSelect.insertAdjacentHTML('beforeend', option);
        });
        
        lines.forEach(line => {
            if (lineSelect) lineSelect.insertAdjacentHTML('beforeend', `<option value="${line}">${line}</option>`);
        });
    }

    function renderPreview() {
        const container = document.getElementById('cgPreviewContainer');
        const countText = document.getElementById('cgPrintCountText');
        if (countText) countText.innerText = cardQueue.length;

        if (!container) return;
        
        if (cardQueue.length === 0) {
            container.innerHTML = `
                <div class="cg-page cg-preview-page cg-cards-grid" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 297mm;">
                    <div class="text-center text-muted w-100" style="margin-top: 80px;">
                        <i class="fas fa-id-badge fa-4x mb-3" style="color: #e2e8f0;"></i>
                        <h6 class="fw-bold text-secondary">ยังไม่มีการ์ดในคิว</h6>
                        <p class="pe-text-sm mb-0">เพิ่มการ์ดจากเครื่องมือด้านซ้ายเพื่อสร้างแบบฟอร์ม</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const cardsPerPage = 10;
        const totalPages = Math.ceil(cardQueue.length / cardsPerPage);
        
        let allHtml = '';
        for (let i = 0; i < totalPages; i++) {
            const pageCards = cardQueue.slice(i * cardsPerPage, (i + 1) * cardsPerPage);
            let pageHtml = `<div class="cg-page cg-preview-page cg-cards-grid">`;
            
            pageCards.forEach(card => {
                pageHtml += `<div class="cg-card-container position-relative" style="box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px;" id="cg-card-${card.id}">`;
                pageHtml += `<button class="cg-card-remove-btn" style="opacity: 1;" onclick="CardGeneratorModule.removeCard(${card.id})" title="ลบการ์ดนี้"><i class="fas fa-times"></i></button>`;
                pageHtml += card.html;
                pageHtml += `</div>`;
            });
            
            pageHtml += `</div>`;
            allHtml += pageHtml;
        }
        
        container.innerHTML = allHtml;
        
        // Scroll to bottom of preview panel when adding (container is wrapper now)
        container.scrollTop = container.scrollHeight;
    }

    function removeCard(id) {
        cardQueue = cardQueue.filter(c => c.id !== id);
        renderPreview();
    }

    function clearCards() {
        if(cardQueue.length === 0) return;
        if(confirm('ต้องการล้างการ์ดทั้งหมดในคิวพิมพ์ใช่หรือไม่?')) {
            cardQueue = [];
            renderPreview();
        }
    }

    function addStatusCard(color) {
        let html = '';
        if (color === 'green') {
            html = `<div class="cg-card-status cg-status-green"><i class="fas fa-check-circle"></i><div class="cg-card-status-text"><h2>ปกติ</h2><p>NORMAL</p></div></div>`;
        } else if (color === 'yellow') {
            html = `<div class="cg-card-status cg-status-yellow"><i class="fas fa-exclamation-triangle"></i><div class="cg-card-status-text"><h2>ระวัง</h2><p>WARNING</p></div></div>`;
        } else if (color === 'red') {
            html = `<div class="cg-card-status cg-status-red"><i class="fas fa-times-circle"></i><div class="cg-card-status-text"><h2>หยุดเครื่อง</h2><p>STOP / DANGER</p></div></div>`;
        }
        cardQueue.push({ id: cardIdCounter++, html: html });
        renderPreview();
    }

    function addStatusSet() {
        addStatusCard('green');
        addStatusCard('yellow');
        addStatusCard('red');
    }

    function getOperatorHTML(name, empId, dept, photoUrl = '') {
        let photoHtml = photoUrl ? `<img src="${photoUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"> <i class="fas fa-user" style="display:none; font-size:32pt; color:#94a3b8;"></i>` : `<i class="fas fa-user" style="font-size:32pt; color:#94a3b8;"></i>`;
        if(name === '' && empId === '') {
            photoHtml = `<div style="text-align:center; font-size:9pt; color:#94a3b8; width:100%; font-weight:500;">ติดรูปถ่าย<br>1 นิ้ว</div>`;
        }
        
        return `<div class="cg-card-operator">
            <div class="cg-op-left">
                <div class="cg-op-header"><i class="fas fa-user-hard-hat"></i> OPERATOR</div>
                <div class="cg-op-photo">${photoHtml}</div>
            </div>
            <div class="cg-op-right">
                <div class="cg-op-line-label">ชื่อ-นามสกุล</div>
                <div class="cg-op-line">${name || '................................'}</div>
                <div class="cg-op-line-label">รหัสพนักงาน</div>
                <div class="cg-op-line">${empId || '................................'}</div>
                <div class="cg-op-line-label">แผนก / ไลน์</div>
                <div class="cg-op-line" style="border: none; margin-bottom: 0;">${dept || '................................'}</div>
            </div>
        </div>`;
    }

    function addOperatorCard() {
        const select = document.getElementById('cgOpEmployeeSelect');
        if (!select || !select.options[select.selectedIndex] || !select.value) {
            alert('กรุณาเลือกพนักงานก่อน');
            return;
        }
        const selected = select.options[select.selectedIndex];
        const empId = select.value;
        const name = selected.getAttribute('data-name');
        const dept = selected.getAttribute('data-dept');
        const dbPhoto = selected.getAttribute('data-photo');
        const photoUrl = dbPhoto ? dbPhoto : `../../../assets/img/employees/${empId}.jpg`; 
        
        cardQueue.push({ id: cardIdCounter++, html: getOperatorHTML(name, empId, dept, photoUrl) });
        renderPreview();
    }

    function addBlankOperatorCard() {
        cardQueue.push({ id: cardIdCounter++, html: getOperatorHTML('', '', '') });
        renderPreview();
    }
    
    function addBatchOperatorCards() {
        const select = document.getElementById('cgBatchLineSelect');
        if (!select) return;
        const selectedLine = select.value;
        
        if (!selectedLine) {
            alert('กรุณาเลือกแผนก/ไลน์ผลิตก่อน');
            return;
        }
        
        let count = 0;
        allEmployees.forEach(emp => {
            const empLine = emp.line || emp.department_api;
            if (empLine === selectedLine) {
                const photoUrl = emp.profile_picture ? emp.profile_picture : `../../../assets/img/employees/${emp.emp_id}.jpg`;
                cardQueue.push({ 
                    id: cardIdCounter++, 
                    html: getOperatorHTML(emp.name_th, emp.emp_id, empLine, photoUrl) 
                });
                count++;
            }
        });
        
        if (count > 0) {
            renderPreview();
            alert(`เพิ่มการ์ดพนักงานสำเร็จจำนวน ${count} ใบ`);
        } else {
            alert('ไม่พบพนักงานในแผนก/ไลน์ที่เลือก');
        }
    }

    function getLotoHTML(name, empId, photoUrl = '') {
        let photoHtml = photoUrl ? `<img style="width: 100%; height: 100%; object-fit: cover;" src="${photoUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"> <i class="fas fa-lock cg-loto-icon" style="display:none;"></i>` : `<i class="fas fa-lock cg-loto-icon"></i>`;
        if(name === '' && (!empId || empId === '')) {
            photoHtml = `<i class="fas fa-lock cg-loto-icon"></i>`;
        }
        
        return `<div class="cg-card-loto">
            <div class="cg-loto-header">LOCKOUT / TAGOUT</div>
            <div class="cg-loto-body">
                <div class="cg-loto-left" style="padding: 0; justify-content: space-between;">
                    <div style="flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${photoHtml}
                    </div>
                    <div class="cg-loto-danger" style="margin-top: 0; border-radius: 0; width: 100%; padding: 4px 0;">ห้ามเดินเครื่อง</div>
                </div>
                <div class="cg-loto-right">
                    <div class="cg-loto-line" style="border-bottom: 1.5px solid #ef4444; padding-bottom: 5px;">ช่าง: ${name || '................................'}</div>
                    <div class="cg-loto-line" style="border-bottom: 1.5px dotted #ef4444; color: #64748b; font-weight: 500; margin-top: 8px;">รหัส: ${empId || '................................'}</div>
                    <div class="cg-loto-line" style="border: none; margin-bottom: 0; color: #64748b; font-weight: 500;">วันที่: .................. เวลา: ..................</div>
                </div>
            </div>
        </div>`;
    }

    function addLotoCard() {
        const select = document.getElementById('cgLotoEmployeeSelect');
        if (!select || !select.options[select.selectedIndex] || !select.value) {
            alert('กรุณาเลือกพนักงานก่อน');
            return;
        }
        const selected = select.options[select.selectedIndex];
        const empId = select.value;
        const name = selected.getAttribute('data-name');
        const dbPhoto = selected.getAttribute('data-photo');
        const photoUrl = dbPhoto ? dbPhoto : `../../../assets/img/employees/${empId}.jpg`; 
        
        cardQueue.push({ id: cardIdCounter++, html: getLotoHTML(name, empId, photoUrl) });
        renderPreview();
    }

    function addBlankLotoCard() {
        cardQueue.push({ id: cardIdCounter++, html: getLotoHTML('', '') });
        renderPreview();
    }

    function generateAndPrint() {
        if (cardQueue.length === 0) {
            alert('ไม่มีการ์ดในคิว กรุณาเพิ่มการ์ดก่อนสั่งพิมพ์');
            return;
        }
        
        // Serialize queue to localStorage
        localStorage.setItem('print_cards_data', JSON.stringify(cardQueue));
        
        // Use a hidden iframe to print card_print.php without leaving the dashboard
        let printFrame = document.getElementById('cgHiddenPrintFrame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'cgHiddenPrintFrame';
            printFrame.name = 'cgHiddenPrintFrame';
            printFrame.style.position = 'absolute';
            printFrame.style.top = '-9999px';
            printFrame.style.left = '-9999px';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            document.body.appendChild(printFrame);
        }
        
        // Load the print page in the iframe. The page will auto-trigger window.print()
        printFrame.src = 'card_print.php';
    }

    // Public API
    return {
        init: init,
        addStatusCard: addStatusCard,
        addStatusSet: addStatusSet,
        addOperatorCard: addOperatorCard,
        addBlankOperatorCard: addBlankOperatorCard,
        addBatchOperatorCards: addBatchOperatorCards,
        addLotoCard: addLotoCard,
        addBlankLotoCard: addBlankLotoCard,
        removeCard: removeCard,
        clearCards: clearCards,
        generateAndPrint: generateAndPrint
    };
})();
window.CardGeneratorModule = CardGeneratorModule;
