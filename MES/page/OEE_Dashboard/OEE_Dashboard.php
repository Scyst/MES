<?php 
//-- เริ่ม Session สำหรับการใช้งานตัวแปร Session ทั้งหมดในหน้านี้ --
session_start(); 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>OEE - DASHBOARD</title>
    
    <script src="../../utils/libs/chart.umd.js"></script>
    <script src="../../utils/libs/chartjs-plugin-zoom.min.js"></script>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
    
</head>

<body class="bg-dark text-white">
    <?php include('../components/nav_dropdown.php'); ?>

    >
    <header class="dashboard-header-sticky">
        <div class="d-flex justify-content-between align-items-center mb-1">
            <h2 class="mb-0">OEE DASHBOARD</h2>
            <div class="text-end">
                <p id="date" class="mb-0"></p>
                <p id="time" class="mb-0"></p>
            </div>
        </div>
        <div class="row">
             <div class="col-12">
                <div class="d-flex justify-content-center align-items-center gap-3">
                    <select id="lineFilter" class="form-select" style="width: auto;"><option value="">All Lines</option></select>
                    <select id="modelFilter" class="form-select" style="width: auto;"><option value="">All Models</option></select>
                    <input type="date" id="startDate" class="form-control" style="width: auto;">
                    <span>-</span>
                    <input type="date" id="endDate" class="form-control" style="width: auto;">
                </div>
            </div>
        </div>
    </header>
    
    <div class="dashboard-container">
    
        <section class="dashboard-section">
            <div class="row g-4 mb-4 pt-2">
                <div class="col-xxl-3 col-xl-6 col-lg-6 mb-2 mb-xl-0">
                    <div class="chart-card pie-chart-card">
                        <div class="pie-chart-details"><h4>OEE</h4><div class="chart-info" id="oeeInfo"></div></div>
                        <div class="chart-wrapper"><canvas id="oeePieChart"></canvas></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-lg-6 mb-2 mb-xl-0">
                    <div class="chart-card pie-chart-card">
                        <div class="pie-chart-details"><h4>Quality</h4><div class="chart-info" id="qualityInfo"></div></div>
                        <div class="chart-wrapper"><canvas id="qualityPieChart"></canvas></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-lg-6 mb-2 mb-xl-0">
                    <div class="chart-card pie-chart-card">
                        <div class="pie-chart-details"><h4>Performance</h4><div class="chart-info" id="performanceInfo"></div></div>
                        <div class="chart-wrapper"><canvas id="performancePieChart"></canvas></div>
                    </div>
                </div>
                <div class="col-xxl-3 col-xl-6 col-lg-6 mb-2 mb-xl-0">
                    <div class="chart-card pie-chart-card">
                        <div class="pie-chart-details"><h4>Availability</h4><div class="chart-info" id="availabilityInfo"></div></div>
                        <div class="chart-wrapper"><canvas id="availabilityPieChart"></canvas></div>
                    </div>
                </div>
            </div>
            <div class="row g-4">
                <div class="col-12">
                    <div class="chart-card line-chart-card" style="padding-top: 1rem;">
                        <h4 style="display: none;">OEE Trend</h4>
                        <div class="chart-wrapper"><canvas id="oeeLineChart"></canvas></div>
                    </div>
                </div>
            </div>
        </section>

        <section class="dashboard-section mt-2">
            <div class="row g-4">
                <div class="col-lg-6">
                    <div class="chart-card bar-chart-card">
                        <h4>Stop & Cause</h4>
                        <div class="chart-wrapper"><canvas id="stopCauseBarChart"></canvas></div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="chart-card bar-chart-card">
                        <h4>Production Results</h4>
                        <div class="chart-wrapper"><canvas id="partsBarChart"></canvas></div>
                    </div>
                </div>
            </div>
        </section>
        
    </div> 
    <div id="toast"></div>

    <script src="../components/datetime.js"></script>
    <script src="../components/toast.js"></script>
    <script src="script/OEE_piechart.js"></script>
    <script src="script/OEE_linechart.js"></script>
    <script src="script/OEE_barchart.js"></script>
    <script src="script/filterManager.js"></script>
</body>
</html>