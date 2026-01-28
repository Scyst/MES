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
                            <label class="form-label small fw-bold text-secondary mb-2">Data Source</label>
                            <div class="card bg-body-tertiary border-0">
                                <div class="card-body p-3">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source" id="srcSection" value="SECTION" onchange="toggleFormulaInput()">
                                                <label class="form-check-label" for="srcSection"><span class="badge bg-secondary me-1">HEADER</span> Header Only</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source" id="srcManual" value="MANUAL" checked onchange="toggleFormulaInput()">
                                                <label class="form-check-label" for="srcManual"><span class="badge bg-light text-dark border me-1">MANUAL</span> Manual Input</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source" id="srcAutoStock" value="AUTO_STOCK" onchange="toggleFormulaInput()">
                                                <label class="form-check-label" for="srcAutoStock"><span class="badge bg-info text-dark me-1">AUTO</span> ยอดผลิต FG</label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source" id="srcAutoLabor" value="AUTO_LABOR" onchange="toggleFormulaInput()">
                                                <label class="form-check-label" for="srcAutoLabor"><span class="badge bg-info text-dark me-1">AUTO</span> ค่าแรง (Manpower)</label>
                                            </div>
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="data_source" id="srcCalculated" value="CALCULATED" onchange="toggleFormulaInput()">
                                                <label class="form-check-label" for="srcCalculated"><span class="badge bg-primary me-1">FORMULA</span> สูตรคำนวณ (Calculated)</label>
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
                                    <div class="invalid-feedback fw-bold" id="formulaErrorMsg">
                                        รูปแบบสูตรไม่ถูกต้อง
                                    </div>
                                    <div class="valid-feedback fw-bold">
                                        <i class="fas fa-check-circle me-1"></i>สูตรถูกต้อง (Valid Syntax)
                                    </div>
                                </div>

                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted" style="font-size: 0.75rem;">
                                        รองรับ: <code>+ - * / ( )</code> และ <code>[Code]</code>
                                    </small>
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
    function toggleFormulaInput() {
        const isCalc = document.getElementById('srcCalculated').checked;
        const section = document.getElementById('formulaSection');
        const input = document.getElementById('calculationFormula');
        
        if (isCalc) {
            section.classList.remove('d-none');
            setTimeout(() => input.focus(), 150);
            // ตรวจสอบทันทีที่เปิด
            validateFormula(input);
        } else {
            section.classList.add('d-none');
            // ถ้าปิดไปแล้ว ให้ถือว่าผ่าน (เอา invalid ออก)
            input.classList.remove('is-invalid');
            input.setCustomValidity("");
        }
    }

    function validateFormula(input) {
        let val = input.value.trim();
        const errorMsg = document.getElementById('formulaErrorMsg');

        // 1. ถ้าว่าง -> ให้ผ่าน (หรือจะบังคับใส่ก็ได้)
        if (val === '') {
            input.classList.remove('is-invalid', 'is-valid');
            input.setCustomValidity(""); // Reset
            return;
        }

        // 2. Keyword พิเศษ
        if (val === 'SUM_CHILDREN') {
            setValid(input);
            return;
        }

        // 3. จำลองการแทนค่า [CODE] -> 1
        // (เราแค่เช็ค Syntax ทางคณิตศาสตร์ ไม่ได้เช็คว่า Code มีจริงไหม)
        let testFormula = val.replace(/\[.*?\]/g, '1');

        // 4. ตรวจตัวอักษรต้องห้าม (อนุญาตแค่ ตัวเลข จุด และเครื่องหมาย + - * / ( ) )
        // ถ้ามีตัวหนังสือหลงเหลืออยู่ (เช่น ABC) ถือว่าผิด
        if (/[^0-9+\-*/(). ]/.test(testFormula)) {
            setInvalid(input, "มีตัวอักษรที่ไม่ได้รับอนุญาต (ใช้ได้เฉพาะ [Code], ตัวเลข และ +-*/)");
            return;
        }

        // 5. Test Run (ลองคำนวณจริง)
        try {
            // ใช้ new Function เพื่อลองรันดูว่า Crash ไหม
            new Function('return ' + testFormula)();
            setValid(input);
        } catch (e) {
            setInvalid(input, "รูปแบบคณิตศาสตร์ไม่ถูกต้อง (เช่น วงเล็บไม่ครบ)");
        }
    }

    function setValid(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        input.setCustomValidity(""); // ผ่าน
    }

    function setInvalid(input, msg) {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        document.getElementById('formulaErrorMsg').innerText = msg;
        input.setCustomValidity(msg); // Block form submission
    }
</script>