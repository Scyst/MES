<div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable" style="margin-top: 5vh;">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-info bg-opacity-10 text-dark">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-book-open me-2 text-info"></i>คู่มือการใช้งาน (User Guide)
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                
                <div class="mb-4">
                    <h6 class="fw-bold text-primary"><i class="fas fa-search me-2"></i>1. การค้นหา (Smart Search)</h6>
                    <p class="text-muted small mb-2">พิมพ์ทุกอย่างลงไปในช่องเดียว โดยเว้นวรรคเพื่อรวมเงื่อนไข (AND Logic)</p>
                    <div class="alert alert-light border small">
                        <strong>ตัวอย่าง:</strong><br>
                        <code>Red Chicago Wait</code> = หาสีแดง ที่ส่งไป Chicago และสถานะยังรออยู่<br>
                        <code>38001 Done</code> = หาเลข PO 38001 ที่เสร็จแล้ว
                    </div>
                </div>

                <div class="mb-4">
                    <h6 class="fw-bold text-success"><i class="fas fa-edit me-2"></i>2. การแก้ไขข้อมูล (Inline Edit)</h6>
                    <ul class="small text-muted">
                        <li><strong>แก้ไขทันที:</strong> ดับเบิลคลิก (Double Click) ที่ช่องข้อมูล (เช่น จำนวน, วันที่, Remark) เพื่อแก้ไขและบันทึกทันที</li>
                        <li><strong>สถานะ (Checkbox):</strong> ติ๊กถูกเพื่อเปลี่ยนสถานะ (ระบบจะลงวันที่ให้อัตโนมัติ)</li>
                        <li><strong>ราคา (Price):</strong> แก้ไขไม่ได้ในหน้านี้ (ต้องไปแก้ที่ Item Master โดยอิงตามเลข SKU)</li>
                    </ul>
                </div>

                <div class="mb-4">
                    <h6 class="fw-bold text-warning text-dark"><i class="fas fa-file-import me-2"></i>3. การนำเข้าไฟล์ (Import Excel)</h6>
                    <p class="text-muted small">ระบบใช้ <strong>PO Number</strong> และ <strong>SKU</strong> เป็นเกณฑ์ในการตรวจสอบ:</p>
                    <ul class="small text-muted">
                        <li>ถ้า <strong>เจอ</strong> PO+SKU เดิม -> ระบบจะ <u>อัปเดต</u> ข้อมูลให้เป็นปัจจุบัน</li>
                        <li>ถ้า <strong>ไม่เจอ</strong> -> ระบบจะ <u>เพิ่มรายการใหม่</u> ต่อท้าย</li>
                        <li><i class="fas fa-exclamation-circle text-danger"></i> <strong>ข้อควรระวัง:</strong> ไฟล์ Excel ต้องมีคอลัมน์ครบตาม Template (ห้ามลบ/สลับคอลัมน์)</li>
                    </ul>
                </div>

                <div class="mb-4">
                    <h6 class="fw-bold text-danger"><i class="fas fa-tag me-2"></i>4. ราคาสินค้าหายไปไหน?</h6>
                    <p class="text-muted small">
                        ถ้าราคาขึ้นเป็น <strong>$0.00</strong> แสดงว่าเลข <strong>SKU</strong> นี้ยังไม่มีในระบบ<br>
                        ให้ไปที่เมนู <strong>System Settings > Item Master</strong> เพื่อเพิ่ม SKU และราคามาตรฐานครับ
                    </p>
                </div>

            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">เข้าใจแล้ว</button>
            </div>
        </div>
    </div>
</div>