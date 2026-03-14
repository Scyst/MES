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
                                           placeholder="e.g. [4001] + [4002]"
                                           autocomplete="off"
                                           oninput="validateFormula(this); checkFormulaAutocomplete(this);"
                                           onkeyup="checkFormulaAutocomplete(this)"
                                           onclick="checkFormulaAutocomplete(this)">
                                    <div class="invalid-feedback fw-bold" id="formulaErrorMsg">รูปแบบสูตรไม่ถูกต้อง</div>
                                    <div class="valid-feedback fw-bold"><i class="fas fa-check-circle me-1"></i>สูตรถูกต้อง</div>
                                    
                                    <div id="formulaAutocomplete" class="dropdown-menu shadow w-100" 
                                         style="max-height: 200px; overflow-y: auto; display: none; position: absolute; top: 100%; left: 0; z-index: 1050;">
                                        </div>
                                </div>

                                <div class="d-flex justify-content-between">
                                    <small class="text-muted" style="font-size: 0.75rem;">รองรับ: <code>+ - * / ( )</code> และ <code>[Code]</code></small>
                                </div>

                                <div class="mt-1 pt-2 border-top border-primary border-opacity-25">
                                    <div class="d-flex flex-wrap gap-2 mb-2">
                                        <span class="badge bg-white text-primary border border-primary hover-btn px-2 py-1" 
                                              style="cursor: pointer;" onclick="setQuickFormula('SUM_CHILDREN')" title="รวมยอดจากบัญชีลูกทั้งหมด">
                                            <i class="fas fa-sitemap me-1"></i> SUM_CHILDREN
                                        </span>
                                        <span class="badge bg-white text-success border border-success hover-btn px-2 py-1" 
                                              style="cursor: pointer;" onclick="setQuickFormula('USE_TARGET')" title="ใช้ยอดเป้าหมาย (Target) มาเป็นยอดจริง">
                                            <i class="fas fa-bullseye me-1"></i> USE_TARGET
                                        </span>
                                    </div>
                                    <div class="d-flex flex-wrap gap-1 align-items-center">
                                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold px-3 py-0" style="height: 28px;" onclick="insertSymbol(' + ')" title="บวก">+</button>
                                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold px-3 py-0" style="height: 28px;" onclick="insertSymbol(' - ')" title="ลบ">-</button>
                                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold px-3 py-0" style="height: 28px;" onclick="insertSymbol(' * ')" title="คูณ">×</button>
                                        <button type="button" class="btn btn-sm btn-outline-primary fw-bold px-3 py-0" style="height: 28px;" onclick="insertSymbol(' / ')" title="หาร">÷</button>
                                        <span class="mx-1 text-primary opacity-50">|</span>
                                        <button type="button" class="btn btn-sm btn-outline-secondary fw-bold px-2 py-0" style="height: 28px;" onclick="insertSymbol('(')" title="วงเล็บเปิด">(</button>
                                        <button type="button" class="btn btn-sm btn-outline-secondary fw-bold px-2 py-0" style="height: 28px;" onclick="insertSymbol(')')" title="วงเล็บปิด">)</button>
                                        <span class="mx-1 text-primary opacity-50">|</span>
                                        <button type="button" class="btn btn-sm btn-dark fw-bold px-3 py-0 shadow-sm" style="height: 28px;" onclick="insertSymbol('[]')" title="แทรกตัวแปรรหัสบัญชี">[ Code ]</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 d-none" id="autoOptionSection">
                            <div class="alert alert-info border-0 d-flex flex-column gap-2 mb-0 mt-2">
                                <label class="small fw-bold text-info-emphasis mb-0">
                                    <i class="fas fa-network-wired me-1"></i>Select Data Source
                                </label>
                                <div>
                                    <select class="form-select fw-bold text-dark" name="data_source_auto" id="autoSystemSelect" style="background-color: rgba(255,255,255,0.7);">
                                        <option disabled class="bg-light text-secondary small py-1">─── REVENUE ───</option>
                                        <option value="AUTO_STOCK">📦 Revenue (ยอดขายจากการผลิต FG)</option>
                                        <option disabled class="bg-light text-secondary small py-1">─── LABOR (MANPOWER) ───</option>
                                        <option value="AUTO_LABOR">👷 Direct Labor (ค่าแรงฝ่ายผลิต - Base)</option>
                                        <option value="AUTO_LABOR_OT">🕒 Overtime DL (ค่าล่วงเวลาฝ่ายผลิต - OT)</option>
                                        <option value="AUTO_INDIRECT">👨‍💼 Indirect Labor (ค่าแรงทีมซัพพอร์ต - Base)</option>
                                        <option value="AUTO_INDIRECT_OT">🌇 Indirect OT (ค่าล่วงเวลาทีมซัพพอร์ต - OT)</option>
                                        <option value="AUTO_STD_LABOR">📋 Standard DL (ค่าแรงมาตรฐานตาม BOM)</option>
                                        <option disabled class="bg-light text-secondary small py-1">─── MATERIAL & SCRAP ───</option>
                                        <option value="AUTO_MAT">🧱 Material Cost (Standard - ต้นทุนมาตรฐาน)</option>
                                        <option value="AUTO_MAT_ACTUAL">🏗️ Material Cost (Actual - เบิกจ่ายจริง)</option>
                                        <option value="AUTO_SCRAP">🗑️ Scrap Cost (มูลค่าของเสีย)</option>
                                        <option disabled class="bg-light text-secondary small py-1">─── STANDARD OVERHEADS ───</option>
                                        <option value="AUTO_OH_MACHINE">⚙️ Machine OH (ค่าโสหุ้ยเครื่องจักร)</option>
                                        <option value="AUTO_OH_UTILITY">⚡ Utilities (ค่าไฟ/น้ำ ตามมาตรฐาน)</option>
                                        <option value="AUTO_UTILITY_ACTUAL">🔌 Utility Cost (Actual - ค่าไฟ/น้ำใช้งานจริงจากมิเตอร์)</option>
                                        <option value="AUTO_UTILITY_LPG_ACTUAL">🔥 Utility Cost (LPG - ค่าแก๊สใช้งานจริง)</option>
                                        <option value="AUTO_OH_INDIRECT_STD">🏢 Indirect OH (โสหุ้ยทางอ้อม)</option>
                                        <option value="AUTO_OH_STAFF">👔 Staff Cost (ต้นทุนพนักงานรายเดือน)</option>
                                        <option value="AUTO_OH_ACCESSORY">🔩 Accessories (วัสดุสิ้นเปลือง)</option>
                                        <option value="AUTO_OH_OTHER">📦 Other OH (โสหุ้ยอื่นๆ)</option>
                                        <option disabled class="bg-light text-secondary small py-1">─── OTHERS (FUTURE) ───</option>
                                        <option value="AUTO_LOGISTICS">🚚 Logistics Cost (ค่าขนส่ง/ตู้)</option>
                                        <option value="AUTO_MAINTENANCE">🔧 Maintenance Cost (ค่าซ่อมบำรุง)</option>
                                        <option value="AUTO_FORKLIFT">🚜 Forklift Cost (ค่าเช่า/แก๊ส)</option>
                                    </select>
                                    <div class="form-text small text-muted mt-1">ระบบจะดึงข้อมูลจากแหล่งที่เลือกให้อัตโนมัติทุกสิ้นวัน</div>
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
                
                const input = document.getElementById('calculationFormula');
                if(input) {
                    input.classList.remove('is-valid', 'is-invalid');
                    input.setCustomValidity("");
                }
            });
        }
    });

    function toggleSourceOptions() {
        const isCalc = document.getElementById('srcCalculated').checked;
        const isAuto = document.getElementById('srcAuto').checked;

        const formulaSec = document.getElementById('formulaSection');
        const autoSec = document.getElementById('autoOptionSection');
        const formulaInput = document.getElementById('calculationFormula');

        if (isCalc) {
            formulaSec.classList.remove('d-none');
            if(document.getElementById('plItemModal').classList.contains('show')) {
                 setTimeout(() => formulaInput.focus(), 150);
            }
            validateFormula(formulaInput);
        } else {
            formulaSec.classList.add('d-none');
            formulaInput.classList.remove('is-invalid', 'is-valid');
            formulaInput.setCustomValidity("");
        }

        if (isAuto) {
            autoSec.classList.remove('d-none');
        } else {
            autoSec.classList.add('d-none');
        }
    }

    // 🔥 [NEW] ฟังก์ชันสำหรับปุ่ม Quick Formula
    function setQuickFormula(formula) {
        const input = document.getElementById('calculationFormula');
        input.value = formula;
        validateFormula(input);
    }

    function validateFormula(input) {
        let val = input.value.trim().toUpperCase();

        if (val === '') { 
            input.classList.remove('is-invalid', 'is-valid'); 
            input.setCustomValidity(""); 
            return true; 
        }

        // 🔥 [FIX] ยอมรับสูตรพิเศษให้เป็น Valid ทันที
        if (val === 'SUM_CHILDREN' || val === 'USE_TARGET') { 
            setValid(input); 
            return true; 
        }

        const accountMatches = val.match(/\[(.*?)\]/g);
        if (accountMatches) {
            for (let match of accountMatches) {
                let code = match.replace('[', '').replace(']', '');
                
                if (typeof allData !== 'undefined') {
                    let exists = allData.some(item => item.account_code === code);
                    if (!exists) {
                        setInvalid(input, `ไม่พบรหัสบัญชี: ${code} (ลอง Refresh หน้าเว็บ)`);
                        return false;
                    }
                }
                
                let currentMyCode = document.getElementById('accountCode').value.toUpperCase();
                if (code === currentMyCode) {
                    setInvalid(input, "ห้ามใส่รหัสของตัวเองในสูตรคำนวณ");
                    return false;
                }
            }
        }

        let testFormula = val.replace(/\[(.*?)\]/g, '1');
        
        if (/[^A-Z0-9_\[\]+\-*/(). ]/i.test(val)) { 
            setInvalid(input, "สูตรมีตัวอักษรที่ไม่ได้รับอนุญาต"); 
            return false; 
        }

        try { 
            new Function('return ' + testFormula)(); 
            setValid(input); 
            return true;
        } catch (e) { 
            setInvalid(input, "รูปแบบสูตรทางคณิตศาสตร์ไม่ถูกต้อง"); 
            return false;
        }
    }

    function setInvalid(input, msg) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        input.setCustomValidity(msg);
        let feedback = document.getElementById('formulaErrorMsg');
        if (feedback) feedback.innerText = msg;
    }

    function setValid(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        input.setCustomValidity("");
    }
    
    function insertSymbol(symbol) {
        const input = document.getElementById('calculationFormula');
        input.focus(); 
        
        if (input.selectionStart || input.selectionStart === 0) {
            let startPos = input.selectionStart;
            let endPos = input.selectionEnd;
            let currentVal = input.value;
            
            input.value = currentVal.substring(0, startPos) + symbol + currentVal.substring(endPos, currentVal.length);
            
            let newPos = startPos + symbol.length;
            if (symbol === '[]') newPos -= 1;
            
            input.setSelectionRange(newPos, newPos);
        } else {
            input.value += symbol;
        }
        
        validateFormula(input);
        checkFormulaAutocomplete(input);
    }

    function checkFormulaAutocomplete(input) {
        const dropdown = document.getElementById('formulaAutocomplete');
        if (!input || !dropdown) return;

        if (typeof allData === 'undefined' || !allData.length) {
            dropdown.style.display = 'none';
            return;
        }

        const cursorPos = input.selectionStart;
        const text = input.value;
        let startBracket = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (text[i] === ']') break;
            if (text[i] === '[') {
                startBracket = i;
                break;
            }
        }

        if (startBracket !== -1) {
            let endBracket = text.indexOf(']', startBracket);
            if (endBracket === -1) endBracket = text.length;

            if (cursorPos <= endBracket || endBracket === text.length) {
                const searchStr = text.substring(startBracket + 1, cursorPos).toUpperCase();
                const matches = allData.filter(item => 
                    item.account_code.toUpperCase().includes(searchStr) || 
                    item.item_name.toUpperCase().includes(searchStr)
                );

                if (matches.length > 0) {
                    renderAutocomplete(matches, startBracket, endBracket);
                    dropdown.style.display = 'block';
                } else {
                    dropdown.innerHTML = '<div class="p-2 text-muted small text-center"><i class="fas fa-search me-1"></i>ไม่พบรหัสบัญชีที่ค้นหา</div>';
                    dropdown.style.display = 'block';
                }
                return;
            }
        }
        
        dropdown.style.display = 'none';
    }

    function renderAutocomplete(matches, startIdx, endIdx) {
        const dropdown = document.getElementById('formulaAutocomplete');
        dropdown.innerHTML = '';
        matches.slice(0, 50).forEach(item => { 
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dropdown-item d-flex justify-content-between align-items-center py-2 border-bottom hover-btn';
            btn.innerHTML = `
                <span class="fw-bold text-primary" style="min-width: 70px;">[${item.account_code}]</span>
                <span class="small text-muted text-truncate text-end ms-2" style="max-width: 60%;">${item.item_name}</span>
            `;
            btn.onclick = () => selectAutocomplete(item.account_code, startIdx, endIdx);
            dropdown.appendChild(btn);
        });
    }

    function selectAutocomplete(code, startIdx, endIdx) {
        const input = document.getElementById('calculationFormula');
        const text = input.value;
        
        const hasClosingBracket = text[endIdx] === ']';
        const replacement = `[${code}]`;
        const newText = text.substring(0, startIdx) + replacement + text.substring(hasClosingBracket ? endIdx + 1 : endIdx);
        input.value = newText;
        const newCursorPos = startIdx + replacement.length;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        document.getElementById('formulaAutocomplete').style.display = 'none';
        validateFormula(input);
    }

    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('formulaAutocomplete');
        const input = document.getElementById('calculationFormula');
        if (dropdown && e.target !== input && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
</script>