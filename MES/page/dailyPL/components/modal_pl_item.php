<div class="modal fade" id="plItemModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg rounded-4">
            
            <div class="modal-header bg-light border-bottom-0 rounded-top-4 py-3">
                <h5 class="modal-title fw-bold text-primary" id="modalTitle">
                    <i class="fas fa-sitemap me-2"></i>จัดการรายการบัญชี
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body p-4">
                <form id="plItemForm" onsubmit="return false;" novalidate>
                    <input type="hidden" id="modalAction" name="action" value="save">
                    <input type="hidden" id="itemId" name="id">

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-secondary">Account Code</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-barcode"></i></span>
                                <input type="text" class="form-control border-start-0 ps-0" id="accountCode" name="account_code" placeholder="เช่น 41001" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-secondary">Display Order</label>
                            <input type="number" class="form-control" id="rowOrder" name="row_order" value="10">
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-secondary">Item Name</label>
                            <input type="text" class="form-control" id="itemName" name="item_name" placeholder="ชื่อรายการ (P&L Item Name)" required>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-secondary">Parent Group</label>
                            <select class="form-select" id="parentId" name="parent_id">
                                <option value="">-- เป็นรายการหลัก (No Parent) --</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-secondary">Type</label>
                            <select class="form-select" id="itemType" name="item_type" required>
                                <option value="EXPENSE">EXPENSE (ค่าใช้จ่าย)</option>
                                <option value="REVENUE">REVENUE (รายได้)</option>
                                <option value="COGS">COGS (ต้นทุนขาย)</option>
                            </select>
                        </div>

                        <div class="col-12 mt-4">
                            <label class="form-label small fw-bold text-secondary mb-2">Data Source (ที่มาของข้อมูล)</label>
                            <div class="card bg-body-tertiary border-0">
                                <div class="card-body p-3">
                                    <div class="row g-3">
                                        
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source_mode" id="srcCalculated" value="CALCULATED" onchange="toggleSourceOptions()">
                                                <label class="form-check-label" for="srcCalculated">
                                                    <span class="badge bg-primary me-1">FORMULA</span> สูตรคำนวณ / ยอดรวม (Total)
                                                </label>
                                            </div>
                                        </div>

                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source_mode" id="srcAuto" value="AUTO" onchange="toggleSourceOptions()">
                                                <label class="form-check-label" for="srcAuto">
                                                    <span class="badge bg-info text-dark me-1">AUTO</span> เชื่อมต่อระบบอัตโนมัติ
                                                </label>
                                            </div>
                                        </div>

                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source_mode" id="srcManual" value="MANUAL" checked onchange="toggleSourceOptions()">
                                                <label class="form-check-label" for="srcManual">
                                                    <span class="badge bg-light text-dark border me-1">MANUAL</span> Manual Input (คีย์มือ)
                                                </label>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 d-none" id="formulaSection">
                            <div class="alert alert-primary border-0 d-flex flex-column gap-2 mb-0 mt-2">
                                <label class="small fw-bold text-primary mb-0">
                                    <i class="fas fa-calculator me-1"></i>Calculation Formula
                                </label>
                                <div class="position-relative">
                                    <input type="text" class="form-control font-monospace fw-bold" 
                                           name="calculation_formula" id="calculationFormula" 
                                           placeholder="e.g. [4001] + [4002] หรือ SUM_CHILDREN"
                                           oninput="validateFormula(this)">
                                    <div class="invalid-feedback fw-bold" id="formulaErrorMsg">รูปแบบสูตรไม่ถูกต้อง</div>
                                    <div class="valid-feedback fw-bold"><i class="fas fa-check-circle me-1"></i>สูตรถูกต้อง</div>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <small class="text-muted" style="font-size: 0.75rem;">รองรับ: <code>+ - * / ( )</code> และ <code>[Code]</code></small>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 d-none" id="autoOptionSection">
                            <div class="alert alert-info border-0 d-flex flex-column gap-2 mb-0 mt-2">
                                <label class="small fw-bold text-info-emphasis mb-0">
                                    <i class="fas fa-network-wired me-1"></i>Select Data Source
                                </label>
                                <div>
                                    <select class="form-select fw-bold text-dark" id="autoSystemSelect" style="background-color: rgba(255,255,255,0.7);">
                                        <option value="AUTO_STOCK">📦 Production FG (ยอดผลิตสินค้า)</option>
                                        <option value="AUTO_LABOR">👷 Manpower (ค่าแรง/OT)</option>
                                        <option disabled>──────────</option>
                                        <option value="AUTO_SAP" disabled>🏢 SAP Integration (Coming Soon)</option>
                                        <option value="AUTO_IOT" disabled>⚡ IoT Meter (Coming Soon)</option>
                                    </select>
                                    <div class="form-text small text-muted mt-1">
                                        ระบบจะดึงข้อมูลจากแหล่งที่เลือกให้อัตโนมัติทุกสิ้นวัน
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
            
            <div class="modal-footer border-top-0 pt-0 pb-4 px-4">
                <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="saveItem()">
                    <i class="fas fa-save me-2"></i>Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        const modalEl = document.getElementById('plItemModal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('plItemForm');
                if(form) form.reset();
                toggleSourceOptions(); 
                
                // Clear Validation
                const input = document.getElementById('calculationFormula');
                if(input) {
                    input.classList.remove('is-valid', 'is-invalid');
                    input.setCustomValidity("");
                }
            });
        }
    });

    function toggleSourceOptions() {
        // เช็คสถานะ Radio
        const isCalc = document.getElementById('srcCalculated').checked;
        const isAuto = document.getElementById('srcAuto').checked;

        // Elements
        const formulaSec = document.getElementById('formulaSection');
        const autoSec = document.getElementById('autoOptionSection');
        const formulaInput = document.getElementById('calculationFormula');

        // 1. Formula Section Control
        if (isCalc) {
            formulaSec.classList.remove('d-none');
            // Auto Focus
            if(document.getElementById('plItemModal').classList.contains('show')) {
                 setTimeout(() => formulaInput.focus(), 150);
            }
            validateFormula(formulaInput);
        } else {
            formulaSec.classList.add('d-none');
            formulaInput.classList.remove('is-invalid');
            formulaInput.setCustomValidity("");
        }

        // 2. Auto Section Control (ตอนนี้แสดงเป็น Box เหมือนกันแล้ว)
        if (isAuto) {
            autoSec.classList.remove('d-none');
        } else {
            autoSec.classList.add('d-none');
        }
    }

    // อัปเกรดตัวตรวจสอบสูตร (Advanced Validation)
    function validateFormula(input) {
        let val = input.value.trim();
        const saveBtn = document.getElementById('btnSaveItem'); // อ้างอิงปุ่ม Save

        // 1. กรณีค่าว่าง
        if (val === '') { 
            input.classList.remove('is-invalid', 'is-valid'); 
            input.setCustomValidity(""); 
            return true; 
        }

        // 2. กรณีสูตรมาตรฐาน SUM_CHILDREN
        if (val === 'SUM_CHILDREN') { 
            setValid(input); 
            return true; 
        }

        // 3. ตรวจสอบรหัสบัญชีที่อยู่ใน [ ]
        const accountMatches = val.match(/\[(.*?)\]/g);
        if (accountMatches) {
            for (let match of accountMatches) {
                let code = match.replace('[', '').replace(']', '');
                // ตรวจสอบว่า Code นี้มีตัวตนอยู่ในผังบัญชีหรือไม่ (allData คือตัวแปร Global ใน pl_setting.js)
                let exists = allData.some(item => item.account_code === code);
                if (!exists) {
                    setInvalid(input, `ไม่พบรหัสบัญชี: ${code}`);
                    return false;
                }
                
                // ตรวจสอบ Self-Reference (ห้ามอ้างอิงรหัสตัวเอง)
                let currentMyCode = document.getElementById('accountCode').value;
                if (code === currentMyCode) {
                    setInvalid(input, "ห้ามใส่รหัสของตัวเองในสูตรคำนวณ");
                    return false;
                }
            }
        }

        // 4. ตรวจสอบ Syntax คณิตศาสตร์พื้นฐาน
        // เปลี่ยน [Code] เป็นเลข 1 เพื่อทดสอบโครงสร้างสูตร
        let testFormula = val.replace(/\[.*?\\]/g, '1');
        if (/[^0-9+\-*/(). ]/.test(testFormula)) { 
            setInvalid(input, "สูตรมีตัวอักษรที่ไม่ได้รับอนุญาต (ใช้ได้เฉพาะ [Code] และเครื่องหมายคำนวณ)"); 
            return false; 
        }

        try { 
            // ทดสอบการรันสูตรจำลอง
            new Function('return ' + testFormula)(); 
            setValid(input); 
            return true;
        } catch (e) { 
            setInvalid(input, "รูปแบบสูตรทางคณิตศาสตร์ไม่ถูกต้อง"); 
            return false;
        }
    }

    // Helper เสริมสำหรับเปลี่ยนสถานะ UI
    function setInvalid(input, msg) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        input.setCustomValidity(msg);
        // แสดง Tooltip หรือ Feedback
        let feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.innerText = msg;
        }
    }

    function setValid(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        input.setCustomValidity("");
    }
</script>