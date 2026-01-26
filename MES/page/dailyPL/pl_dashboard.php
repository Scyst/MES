<?php
require_once __DIR__ . '/../components/init.php';
$pageHeaderTitle = "Monthly P&L Overview";
$pageHeaderSubtitle = "สรุปผลกำไร-ขาดทุนรายเดือนเทียบเป้าหมาย";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .progress-label { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 500; }
        .dashboard-card { transition: transform 0.2s; border-radius: 12px; }
        .dashboard-card:hover { transform: translateY(-5px); }
        .progress { height: 12px; border-radius: 6px; }
        .value-mtd { font-size: 1.5rem; font-weight: bold; }
        .text-target { font-size: 0.85rem; color: #6c757d; }
    </style>
</head>
<body class="layout-top-header">
    <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>
        
        <div id="main-content">
            <div class="content-wrapper p-3">
                
                <div class="card border-0 shadow-sm p-3 mb-4">
                    <div class="row g-2">
                        <div class="col-6 col-md-3">
                            <select id="monthFilter" class="form-select border-0 bg-light">
                                <?php for($m=1; $m<=12; $m++): ?>
                                    <option value="<?= $m ?>" <?= $m == date('n') ? 'selected' : '' ?>>เดือน <?= $m ?></option>
                                <?php endfor; ?>
                            </select>
                        </div>
                        <div class="col-6 col-md-3">
                            <select id="yearFilter" class="form-select border-0 bg-light">
                                <option value="2025">2025</option>
                                <option value="2026" selected>2026</option>
                            </select>
                        </div>
                        <div class="col-12 col-md-3">
                            <button onclick="loadDashboard()" class="btn btn-primary w-100 fw-bold">แสดงข้อมูล</button>
                        </div>
                    </div>
                </div>

                <div id="dashboardGrid" class="row g-3">
                    </div>

            </div>
        </div>
    </div>

    <script>
    async function loadDashboard() {
        const year = document.getElementById('yearFilter').value;
        const month = document.getElementById('monthFilter').value;
        
        try {
            const response = await fetch(`api/manage_pl_dashboard.php?year=${year}&month=${month}`);
            const res = await response.json();
            if (res.success) renderDashboard(res.data);
        } catch (err) { console.error(err); }
    }

    function renderDashboard(data) {
        const grid = document.getElementById('dashboardGrid');
        grid.innerHTML = data.map(item => {
            const color = item.Progress_Percent > 100 ? 'bg-danger' : 'bg-success';
            return `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm p-3 dashboard-card">
                        <div class="progress-label">
                            <span>${item.item_name} <small class="text-muted">(${item.account_code})</small></span>
                            <span class="${item.Progress_Percent > 100 ? 'text-danger' : 'text-primary'}">${parseFloat(item.Progress_Percent).toFixed(1)}%</span>
                        </div>
                        <div class="value-mtd mb-1">${parseFloat(item.Actual_MTD).toLocaleString()}</div>
                        <div class="text-target mb-2">Target: ${parseFloat(item.Target_Monthly).toLocaleString()}</div>
                        <div class="progress bg-light">
                            <div class="progress-bar ${color}" role="progressbar" style="width: ${Math.min(item.Progress_Percent, 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.addEventListener('DOMContentLoaded', loadDashboard);
    </script>
</body>
</html>