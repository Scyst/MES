<?php
require_once '../../components/init.php';
$targetCode = $_GET['code'] ?? '';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php require_once '../../components/common_head.php'; ?>
    <title>Mobile Forklift Scan</title>
    <style>
        body { background-color: #f0f2f5; font-family: 'Lexend', sans-serif; }
        .mobile-container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .status-card { border-radius: 20px; padding: 30px; text-align: center; border: none; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .action-btn { height: 70px; border-radius: 15px; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; width: 100%; border: none; transition: transform 0.1s; }
        .action-btn:active { transform: scale(0.98); }
        .battery-indicator { height: 10px; border-radius: 5px; background: #e0e0e0; overflow: hidden; margin: 15px 0; }
        .battery-fill { height: 100%; transition: width 0.5s; }
    </style>
</head>
<body>
    <div class="mobile-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold mb-0">Forklift Scan</h5>
            <a href="../forkliftDashboard.php" class="btn btn-sm btn-light rounded-pill"><i class="fas fa-home"></i></a>
        </div>

        <div id="mobile-loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">กำลังตรวจสอบสถานะรถ...</p>
        </div>

        <div id="mobile-ui" class="d-none">
            <div class="status-card bg-white mb-4">
                <div class="d-inline-flex p-3 bg-primary bg-opacity-10 text-primary rounded-circle mb-3">
                    <i class="fas fa-truck-loading fa-3x"></i>
                </div>
                <h2 id="m-code" class="fw-bold mb-1">-</h2>
                <p id="m-name" class="text-muted small mb-3">-</p>
                <div id="m-badge" class="badge p-2 px-3 rounded-pill mb-3">สถานะปกติ</div>
                
                <div class="text-start">
                    <div class="d-flex justify-content-between small fw-bold">
                        <span>ระดับแบตเตอรี่</span>
                        <span id="m-bat-text">0%</span>
                    </div>
                    <div class="battery-indicator">
                        <div id="m-bat-fill" class="battery-fill"></div>
                    </div>
                </div>
            </div>

            <div id="m-actions"></div>
            
            <button class="action-btn btn-outline-danger border-2 mt-2" onclick="reportIssue()">
                <i class="fas fa-exclamation-triangle me-2"></i>แจ้งซ่อม / รถมีปัญหา
            </button>
        </div>
    </div>

    <?php include '../components/forkliftModals.php'; ?>

    <script src="../script/forkliftDashboard.js?v=<?php echo time(); ?>"></script>
    <script>
        const targetCode = "<?php echo $targetCode; ?>";
        
        document.addEventListener('DOMContentLoaded', async () => {
            if(!targetCode) {
                Swal.fire('ผิดพลาด', 'ไม่พบรหัสรถใน QR Code', 'error');
                return;
            }
            await refreshMobileStatus();
        });

        async function refreshMobileStatus() {
            try {
                const fd = new FormData();
                fd.append('action', 'get_dashboard');
                const res = await fetch('../api/forkliftManage.php', { method: 'POST', body: fd });
                const json = await res.json();
                
                const fl = json.data.find(f => f.code === targetCode);
                if(!fl) throw new Error("ไม่พบรถรหัสนี้ในระบบ");

                renderMobileUI(fl);
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        }

        function renderMobileUI(fl) {
            document.getElementById('mobile-loading').classList.add('d-none');
            const ui = document.getElementById('mobile-ui');
            ui.classList.remove('d-none');

            document.getElementById('m-code').innerText = fl.code;
            document.getElementById('m-name').innerText = fl.name;
            
            const bat = fl.current_battery || 0;
            document.getElementById('m-bat-text').innerText = bat + '%';
            const fill = document.getElementById('m-bat-fill');
            fill.style.width = bat + '%';
            fill.style.backgroundColor = bat < 20 ? '#dc3545' : (bat < 50 ? '#ffc107' : '#198754');

            const badge = document.getElementById('m-badge');
            const actions = document.getElementById('m-actions');
            let btnHtml = '';

            if(fl.status === 'MAINTENANCE') {
                badge.className = 'badge p-2 px-3 rounded-pill bg-secondary';
                badge.innerText = 'ปิดปรับปรุง (Maintenance)';
                btnHtml = `<button class="action-btn btn-light text-muted" disabled>รถไม่พร้อมใช้งาน</button>`;
            } else if(fl.status === 'IN_USE') {
                if(fl.current_driver === CURRENT_USER_NAME) {
                    badge.className = 'badge p-2 px-3 rounded-pill bg-primary';
                    badge.innerText = 'คุณกำลังใช้งานคันนี้';
                    btnHtml = `<button class="action-btn btn-warning shadow" onclick="checkAction(${fl.id})"><i class="fas fa-undo me-2"></i>คืนรถทันที</button>`;
                } else {
                    badge.className = 'badge p-2 px-3 rounded-pill bg-danger';
                    badge.innerText = 'กำลังถูกใช้งานโดย ' + fl.current_driver;
                    btnHtml = `<button class="action-btn btn-primary shadow" onclick="openBookingModal(${fl.id}, '${fl.code}', '${fl.name}')"><i class="far fa-clock me-2"></i>จองคิวต่อ</button>`;
                }
            } else {
                badge.className = 'badge p-2 px-3 rounded-pill bg-success';
                badge.innerText = 'ว่าง (Available)';
                btnHtml = `<button class="action-btn btn-success shadow" onclick="checkAction(${fl.id})"><i class="fas fa-key me-2"></i>เบิกใช้รถคันนี้</button>`;
            }

            actions.innerHTML = btnHtml;
        }

        function reportIssue() {
            Swal.fire({
                title: 'แจ้งปัญหารถ',
                input: 'textarea',
                inputPlaceholder: 'ระบุอาการเสียที่พบ...',
                showCancelButton: true,
                confirmButtonText: 'ส่งรายงาน',
                confirmButtonColor: '#dc3545'
            }).then((result) => {
                if(result.isConfirmed) {
                    Swal.fire('สำเร็จ', 'ส่งรายงานแจ้งซ่อมเรียบร้อยแล้ว', 'success');
                }
            });
        }
    </script>
</body>
</html>