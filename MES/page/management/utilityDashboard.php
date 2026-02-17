<?php
require_once __DIR__ . '/../components/init.php';
$pageTitle = "Energy & Utility Dashboard";
$pageIcon = "fas fa-bolt"; 
$pageHeaderTitle = "Utility Monitoring"; 
$pageHeaderSubtitle = "Real-time Power & LPG Consumption"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    <link rel="stylesheet" href="css/executiveDashboard.css"> </head>
<body class="layout-top-header">
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content" class="content-wrapper">
            
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                    <span class="position-relative d-flex h-2 w-2">
                        <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping"></span>
                        <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                    </span>
                    <span class="fw-bold">MQTT Live</span>
                    <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--</span>
                </div>

                <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                    <input type="date" id="targetDate" class="form-control form-control-sm border-0 bg-transparent fw-bold" style="width: 130px; cursor: pointer;">
                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>
                    <button class="btn btn-primary btn-sm fw-bold px-2 py-1 rounded shadow-sm" onclick="loadUtilityData()" style="height: 30px;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-warning p-3">
                        <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Real-time Power</small>
                        <h4 class="fw-bold text-dark mb-0 mt-1"><span id="kpi-kw">-</span> <small class="text-muted fs-6">kW</small></h4>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-info p-3">
                        <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Today Energy (kWh)</small>
                        <h4 class="fw-bold text-info mb-0 mt-1"><span id="kpi-kwh">-</span></h4>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-danger p-3">
                        <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Estimated Cost</small>
                        <h4 class="fw-bold text-danger mb-0 mt-1">฿<span id="kpi-cost">-</span></h4>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-secondary p-3">
                        <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Average Power Factor</small>
                        <h4 class="fw-bold text-dark mb-0 mt-1"><span id="kpi-pf">-</span></h4>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-lg-8">
                    <div class="exec-card p-3">
                        <h6 class="fw-bold text-dark mb-3"><i class="fas fa-chart-area me-2 text-warning"></i>Hourly Energy Consumption (kWh)</h6>
                        <div style="height: 300px;"><canvas id="energyTrendChart"></canvas></div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="exec-card p-3">
                        <h6 class="fw-bold text-dark mb-3"><i class="fas fa-fire me-2 text-danger"></i>LPG Flow Overview</h6>
                        <div class="text-center mt-4">
                            <h2 class="display-4 fw-bold text-danger mb-0" id="kpi-lpg">-</h2>
                            <p class="text-muted">m³/hr (Current Flow)</p>
                        </div>
                    </div>
                </div>
            </div>

            <h6 class="fw-bold text-dark mb-3"><i class="fas fa-microchip me-2 text-secondary"></i>Live Meter Status</h6>
            <div class="row g-3" id="meter-cards-container">
                </div>

        </main>
    </div>
    <script src="script/utilityDashboard.js"></script>
</body>
</html>