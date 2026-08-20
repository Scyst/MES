/**
 * Card Generator Module for PE Dashboard
 * Handles the logic for creating, previewing, and printing visual board cards.
 */

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

        // Initialize Select2 if not already done
        if ($.fn.select2) {
            $('#cgOpEmployeeSelect').select2({ width: '100%' });
            $('#cgLotoEmployeeSelect').select2({ width: '100%' });
            $('#cgBatchLineSelect').select2({ width: '100%' });
        }
        
        isInitialized = true;
    }

    function loadEmployeesData() {
        $.ajax({
            url: 'api/safetyAPI.php?action=get_employees_for_cards',
            type: 'GET',
            dataType: 'json',
            success: function(response) {
                if(response.success) {
                    allEmployees = response.data.employees;
                    populateSelects(response.data.employees, response.data.lines);
                } else {
                    console.error("Failed to load employees", response.message);
                }
            },
            error: function(err) {
                console.error("Error loading employees", err);
            }
        });
    }

    function populateSelects(employees, lines) {
        const opSelect = $('#cgOpEmployeeSelect');
        const lotoSelect = $('#cgLotoEmployeeSelect');
        const lineSelect = $('#cgBatchLineSelect');
        
        opSelect.empty().append('<option value="">-- ค้นหาชื่อพนักงาน --</option>');
        lotoSelect.empty().append('<option value="">-- ค้นหาชื่อช่าง --</option>');
        lineSelect.empty().append('<option value="">-- เลือกแผนก / ไลน์ผลิต --</option>');
        
        employees.forEach(emp => {
            const line = emp.line || emp.department_api || '';
            const option = `<option value="${emp.emp_id}" data-name="${emp.name_th}" data-dept="${line}">${emp.emp_id} - ${emp.name_th}</option>`;
            opSelect.append(option);
            lotoSelect.append(option);
        });
        
        lines.forEach(line => {
            lineSelect.append(`<option value="${line}">${line}</option>`);
        });
    }

    function renderPreview() {
        const container = $('#cgPreviewContainer');
        $('#cgPrintCountText').text(cardQueue.length);

        if (cardQueue.length === 0) {
            container.html(`
                <div class="text-center text-muted" style="margin-top: 100px;">
                    <i class="fas fa-id-card fa-4x mb-3 opacity-25"></i>
                    <h5>พรีวิวการ์ดว่างเปล่า</h5>
                    <p>เลือกเพิ่มการ์ดจากเมนูด้านซ้ายเพื่อเตรียมพิมพ์</p>
                </div>
            `);
            return;
        }

        container.empty();
        
        const chunkSize = 10;
        for (let i = 0; i < cardQueue.length; i += chunkSize) {
            const chunk = cardQueue.slice(i, i + chunkSize);
            let pageHtml = `<div class="cg-page cg-preview-page"><div class="cg-cards-grid">`;
            chunk.forEach(card => {
                pageHtml += `<div class="cg-card-container" id="cg-card-${card.id}">`;
                pageHtml += `<button class="cg-card-remove-btn no-print" onclick="CardGeneratorModule.removeCard(${card.id})" title="ลบการ์ดนี้"><i class="fas fa-times"></i></button>`;
                pageHtml += card.html;
                pageHtml += `</div>`;
            });
            pageHtml += `</div></div>`;
            container.append(pageHtml);
        }
        
        // Scroll to bottom of preview panel when adding
        const containerEl = document.getElementById('cgPreviewContainer');
        if (containerEl && containerEl.parentElement) {
            containerEl.parentElement.scrollTop = containerEl.parentElement.scrollHeight;
        }
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
        const select = $('#cgOpEmployeeSelect');
        const selected = select.find(':selected');
        if (!selected.val()) {
            alert('กรุณาเลือกพนักงานก่อน');
            return;
        }
        const empId = selected.val();
        const name = selected.data('name');
        const dept = selected.data('dept');
        const photoUrl = `../../../assets/img/employees/${empId}.jpg`; 
        
        cardQueue.push({ id: cardIdCounter++, html: getOperatorHTML(name, empId, dept, photoUrl) });
        renderPreview();
    }

    function addBlankOperatorCard() {
        cardQueue.push({ id: cardIdCounter++, html: getOperatorHTML('', '', '') });
        renderPreview();
    }
    
    function addBatchOperatorCards() {
        const select = $('#cgBatchLineSelect');
        const selectedLine = select.val();
        
        if (!selectedLine) {
            alert('กรุณาเลือกแผนก/ไลน์ผลิตก่อน');
            return;
        }
        
        let count = 0;
        allEmployees.forEach(emp => {
            const empLine = emp.line || emp.department_api;
            if (empLine === selectedLine) {
                const photoUrl = `../../../assets/img/employees/${emp.emp_id}.jpg`;
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

    function getLotoHTML(name) {
        return `<div class="cg-card-loto">
            <div class="cg-loto-header">LOCKOUT / TAGOUT</div>
            <div class="cg-loto-body">
                <div class="cg-loto-left">
                    <i class="fas fa-lock cg-loto-icon"></i>
                    <div class="cg-loto-danger">ห้ามเดินเครื่อง</div>
                </div>
                <div class="cg-loto-right">
                    <div class="cg-loto-line" style="border-bottom: 1.5px solid #ef4444; padding-bottom: 5px;">ช่าง: ${name || '................................'}</div>
                    <div class="cg-loto-line" style="border-bottom: 1.5px dotted #ef4444; color: #64748b; font-weight: 500; margin-top: 8px;">วันที่: ................................</div>
                    <div class="cg-loto-line" style="border: none; margin-bottom: 0; color: #64748b; font-weight: 500;">เวลา: ................................</div>
                </div>
            </div>
        </div>`;
    }

    function addLotoCard() {
        const select = $('#cgLotoEmployeeSelect');
        const selected = select.find(':selected');
        if (!selected.val()) {
            alert('กรุณาเลือกพนักงานก่อน');
            return;
        }
        const name = selected.data('name');
        cardQueue.push({ id: cardIdCounter++, html: getLotoHTML(name) });
        renderPreview();
    }

    function addBlankLotoCard() {
        cardQueue.push({ id: cardIdCounter++, html: getLotoHTML('') });
        renderPreview();
    }

    function generateAndPrint() {
        if (cardQueue.length === 0) {
            alert('ไม่มีการ์ดในคิว กรุณาเพิ่มการ์ดก่อนสั่งพิมพ์');
            return;
        }
        
        const printContainer = $('#cgPrintContainer');
        printContainer.empty();
        
        // Chunk cards into pages of 10
        const chunkSize = 10;
        for (let i = 0; i < cardQueue.length; i += chunkSize) {
            const chunk = cardQueue.slice(i, i + chunkSize);
            let pageHtml = `<div class="cg-page"><div class="cg-cards-grid">`;
            chunk.forEach(card => {
                pageHtml += `<div class="cg-card-container">${card.html}</div>`;
            });
            pageHtml += `</div></div>`;
            printContainer.append(pageHtml);
        }
        
        // Use browser print - CSS will handle showing cgPrintContainer and hiding everything else
        setTimeout(() => {
            window.print();
        }, 500);
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
