<div class="modal fade" id="mappingModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title"><i class="fas fa-sitemap me-2"></i>ตั้งค่าการจัดกลุ่มข้อมูล (Mapping)</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-tabs mb-3" id="mappingTabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#sectionTab">กลุ่มตาราง (Sections)</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#categoryTab">ประเภทพนักงาน (Categories)</button>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="sectionTab">
                        <div class="d-flex justify-content-between mb-2">
                            <small class="text-muted">กำหนดว่า Keyword ไหนจาก API ให้ไปลงตารางอะไร</small>
                            <button class="btn btn-sm btn-primary" onclick="addMappingRow('section')"><i class="fas fa-plus"></i> เพิ่มรายการ</button>
                        </div>
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th>API Keyword</th>
                                        <th>ชื่อตารางที่จะโชว์</th>
                                        <th style="width:100px;">ประเภท</th>
                                        <th style="width:50px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="sectionMappingBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="categoryTab">
                        <div class="d-flex justify-content-between mb-2">
                            <small class="text-muted">จัดกลุ่มตำแหน่งงานเข้าสู่ Category (เช่น พนักงานประจำ, นักศึกษา)</small>
                            <button class="btn btn-sm btn-primary" onclick="addMappingRow('category')"><i class="fas fa-plus"></i> เพิ่มรายการ</button>
                        </div>
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th>ตำแหน่งจาก API (Keyword)</th>
                                        <th>ชื่อกลุ่มที่จะโชว์</th>
                                        <th style="width:50px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="categoryMappingBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                <button type="button" class="btn btn-success" onclick="saveAllMappings()"><i class="fas fa-save me-1"></i> บันทึกการตั้งค่าทั้งหมด</button>
            </div>
        </div>
    </div>
</div>