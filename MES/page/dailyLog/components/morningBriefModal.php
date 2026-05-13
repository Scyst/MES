<?php if (in_array($_SESSION['user']['role'] ?? '', ['admin', 'creator', 'supervisor'])): ?>
<div class="modal fade" id="morningBriefModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-lg"> 
        <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
            
            <div class="modal-header border-0 text-white p-4" style="background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);">
                <div class="d-flex align-items-center gap-3">
                    <div class="bg-warning rounded-circle d-flex align-items-center justify-content-center shadow" style="width: 50px; height: 50px;">
                        <i class="fas fa-sun text-dark fa-lg"></i>
                    </div>
                    <div>
                        <h5 class="modal-title fw-bold mb-0">Morning Brief</h5>
                        <small class="opacity-75">สรุปผลงานวันที่ <span id="briefDateText"></span></small>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            
            <div class="modal-body p-4 bg-light">
                <div class="row g-3">
                    
                    <div class="col-12">
                        <div class="bg-white p-3 rounded-4 shadow-sm border-start border-4 border-primary">
                            <div class="small text-muted fw-bold text-uppercase mb-2">
                                <i class="fas fa-users me-2"></i>Manpower Statistics
                            </div>
                            <div class="d-flex justify-content-around text-center mt-2">
                                <div>
                                    <h4 class="fw-bold mb-0" id="briefMpTotal">0</h4>
                                    <small class="text-muted">ทั้งหมด</small>
                                </div>
                                <div class="text-success">
                                    <h4 class="fw-bold mb-0" id="briefMpPresent">0</h4>
                                    <small>เข้างาน</small>
                                </div>
                                <div class="text-danger">
                                    <h4 class="fw-bold mb-0" id="briefMpLeave">0</h4>
                                    <small>ลา/หยุด</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-7">
                        <div class="bg-white p-3 rounded-4 shadow-sm h-100">
                            <div class="small text-muted fw-bold text-uppercase mb-3">
                                <i class="fas fa-coins me-2"></i>Labor & Utility Costs (THB)
                            </div>
                            <table class="table table-sm table-borderless mb-0">
                                <tbody>
                                    <tr>
                                        <td class="text-muted ps-0">DLOT (รวมทั้งหมด)</td>
                                        <td class="text-end fw-bold text-dark pe-0" id="briefDlotTotal">0</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted ps-0">DL (เฉพาะรายวัน)</td>
                                        <td class="text-end fw-bold pe-0" id="briefDlDaily">0</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted ps-0">OT (รวมทั้งหมด)</td>
                                        <td class="text-end fw-bold text-primary pe-0" id="briefOtTotal">0</td>
                                    </tr>
                                    <tr class="border-top">
                                        <td class="pt-2 text-muted ps-0">ค่าไฟ / ค่าแก๊ส</td>
                                        <td class="pt-2 text-end fw-bold text-danger pe-0">
                                            <span id="briefElecCost">0</span> / <span id="briefGasCost">0</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <div class="bg-white p-3 rounded-4 shadow-sm h-100 d-flex flex-column align-items-center justify-content-center text-center">
                            <div class="small text-muted fw-bold text-uppercase mb-2 align-self-start w-100 text-start">
                                <i class="fas fa-smile-beam me-2"></i>Team Mood
                            </div>
                            <div class="display-4 mb-1 mt-2" id="briefMoodEmoji">😐</div>
                            <div class="fw-bold fs-5 text-dark">
                                <span id="briefMoodScore">0.0</span> <span class="fs-6 text-muted fw-normal">/ 5.0</span>
                            </div>
                            <small class="text-muted">ความสุขเฉลี่ยพนักงาน</small>
                        </div>
                    </div>

                    <div class="col-12">
                        <div class="bg-dark text-white p-3 rounded-4 shadow-sm">
                            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-50 pb-2">
                                <span class="small fw-bold text-uppercase opacity-75">
                                    <i class="fas fa-industry me-2"></i>Production & Revenue
                                </span>
                                <span class="badge bg-success py-2 px-3" style="font-size: 1rem;">
                                    ฿ <span id="briefRevenue">0</span>
                                </span>
                            </div>
                            <div id="briefModelList" class="small px-1">
                                </div>
                        </div>
                    </div>
                    
                </div> <div class="form-check d-flex align-items-center justify-content-center mt-4">
                    <input class="form-check-input me-2 mt-0" type="checkbox" id="dontShowToday" style="transform: scale(1.2); cursor: pointer;">
                    <label class="form-check-label text-muted small user-select-none" for="dontShowToday" style="cursor: pointer;">
                        ไม่ต้องแสดงอีกในวันนี้
                    </label>
                </div>
            </div>
            
            <div class="modal-footer border-0 bg-light pt-0 pb-4 justify-content-center">
                <button type="button" class="btn btn-dark px-5 py-2 rounded-pill shadow-sm fw-bold" data-bs-dismiss="modal">
                    ปิดหน้าต่างสรุป
                </button>
            </div>
            
        </div>
    </div>
</div>
<?php endif; ?>