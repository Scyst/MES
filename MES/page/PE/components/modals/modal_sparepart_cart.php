<!-- modal_sparepart_cart.php — Spare Part Issue Cart (floating button + offcanvas) -->
<style>
#spCartFab {
    position: fixed; right: 20px; bottom: 20px; z-index: 1040;
    min-width: 56px; height: 56px; border-radius: 28px; border: none;
    background: var(--pe-primary, #2563eb); color: #fff; padding: 0 20px;
    box-shadow: 0 6px 18px rgba(0,0,0,.25); display: flex; align-items: center; gap: 8px;
    font-weight: 600; transition: transform .15s ease;
}
#spCartFab:active { transform: scale(.95); }
#spCartFab .sp-cart-fab-count {
    background: #dc3545; color: #fff; border-radius: 12px; min-width: 24px; height: 24px;
    display: inline-flex; align-items: center; justify-content: center; font-size: 12px; padding: 0 6px;
}
.sp-stepper { display: flex; align-items: center; gap: 4px; }
.sp-stepper button { min-width: 44px; min-height: 44px; }
.sp-stepper input { width: 60px; min-height: 44px; text-align: center; }
.sp-stepper-full { width: 100%; }
.sp-stepper-full input { flex: 1 1 auto; width: 0; min-width: 0; font-weight: 600; }
.sp-card-action { min-height: 44px; white-space: nowrap; }
.sp-cart-line { border-bottom: 1px solid #eee; padding: 10px 0; }
</style>

<button type="button" id="spCartFab" onclick="SparePartsModule.openIssueCart()" style="display:none;" aria-label="ตะกร้าเบิกอะไหล่">
    <i class="fas fa-shopping-cart"></i>
    <span>ตะกร้าเบิก</span>
    <span class="sp-cart-fab-count" id="spCartFabCount">0</span>
</button>

<div class="offcanvas offcanvas-end" tabindex="-1" id="spCartOffcanvas" style="width: min(100vw, 440px);">
    <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title"><i class="fas fa-shopping-cart me-2 text-primary"></i>ตะกร้าเบิกอะไหล่ <span class="badge bg-secondary ms-1" id="spCartCount">0</span></h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="ปิด"></button>
    </div>
    <div class="offcanvas-body d-flex flex-column p-3">
        <div id="spCartList" class="flex-grow-1 overflow-auto mb-3">
            <div class="text-center text-muted py-5">ยังไม่มีรายการในตะกร้า</div>
        </div>
        <div class="mb-2">
            <label class="pe-form-label fw-bold" for="spCartWoId">ใบแจ้งซ่อมอ้างอิง (Work Order)</label>
            <select class="pe-form-input" id="spCartWoId">
                <option value="">-- ไม่ระบุ --</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="pe-form-label fw-bold" for="spCartNotes">หมายเหตุ</label>
            <textarea class="pe-form-input" id="spCartNotes" rows="2" maxlength="400" placeholder="เหตุผลในการเบิก หรือรายละเอียดเพิ่มเติม"></textarea>
        </div>
        <div class="d-flex gap-2">
            <button type="button" class="pe-btn pe-btn-ghost" style="min-height:44px;" onclick="SparePartsModule.clearIssueCart()">ล้างตะกร้า</button>
            <button type="button" class="pe-btn pe-btn-success flex-grow-1" style="min-height:44px;" id="spCartSubmitBtn" onclick="SparePartsModule.submitIssueCart()">
                <i class="fas fa-check-circle me-1"></i> ยืนยันการเบิก
            </button>
        </div>
    </div>
</div>
