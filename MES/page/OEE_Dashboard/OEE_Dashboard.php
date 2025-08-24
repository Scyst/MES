<?php 
session_start(); 
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>OEE - DASHBOARD</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

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
                        <div class="d-flex flex-wrap justify-content-center align-items-center gap-3">
                            <select id="lineFilter" class="form-select" style="width: auto; min-width: 150px;"><option value="">All Lines</option></select>
                            <select id="modelFilter" class="form-select" style="width: auto; min-width: 150px;"><option value="">All Models</option></select>
                            <div class="d-flex align-items-center gap-2">
                                <input type="date" id="startDate" class="form-control" style="width: auto;">
                                <span>-</span>
                                <input type="date" id="endDate" class="form-control" style="width: auto;">
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="dashboard-container">

                <section class="dashboard-section" id="kpi-section">
                    <div class="row">
                        <div class="col-xl-3 col-md-6">
                            <div class="chart-card kpi-scorecard">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="scorecard-header">
                                    <h4><i class="fas fa-tachometer-alt"></i> OEE</h4>
                                    <div class="chart-wrapper pie-chart-wrapper">
                                        <canvas id="oeePieChart"></canvas>
                                        <div class="no-data-message">
                                            <i class="fas fa-info-circle"></i>
                                            <span>No data available for the selected period.</span>
                                        </div>
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>Failed to load data.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="scorecard-body">
                                    <div class="chart-wrapper sparkline-wrapper">
                                        <canvas id="oeeSparklineChart"></canvas>
                                    </div>
                                    <div class="chart-info" id="oeeInfo"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="chart-card kpi-scorecard">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="scorecard-header">
                                    <h4><i class="fas fa-check-circle"></i> Quality</h4>
                                    <div class="chart-wrapper pie-chart-wrapper">
                                        <canvas id="qualityPieChart"></canvas>
                                        <div class="no-data-message">
                                            <i class="fas fa-info-circle"></i>
                                            <span>No data available for the selected period.</span>
                                        </div>
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>Failed to load data.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="scorecard-body">
                                    <div class="chart-wrapper sparkline-wrapper">
                                        <canvas id="qualitySparklineChart"></canvas>
                                    </div>
                                    <div class="chart-info" id="qualityInfo"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="chart-card kpi-scorecard">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="scorecard-header">
                                    <h4><i class="fas fa-running"></i> Performance</h4>
                                    <div class="chart-wrapper pie-chart-wrapper">
                                        <canvas id="performancePieChart"></canvas>
                                        <div class="no-data-message">
                                            <i class="fas fa-info-circle"></i>
                                            <span>No data available for the selected period.</span>
                                        </div>
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>Failed to load data.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="scorecard-body">
                                    <div class="chart-wrapper sparkline-wrapper"><canvas id="performanceSparklineChart"></canvas></div>
                                    <div class="chart-info" id="performanceInfo"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="chart-card kpi-scorecard">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="scorecard-header">
                                    <h4><i class="fas fa-clock"></i> Availability</h4>
                                    <div class="chart-wrapper pie-chart-wrapper">
                                        <canvas id="availabilityPieChart"></canvas>
                                        <div class="no-data-message">
                                            <i class="fas fa-info-circle"></i>
                                            <span>No data available for the selected period.</span>
                                        </div>
                                        <div class="error-message">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>Failed to load data.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="scorecard-body">
                                    <div class="chart-wrapper sparkline-wrapper"><canvas id="availabilitySparklineChart"></canvas></div>
                                    <div class="chart-info" id="availabilityInfo"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="dashboard-section" id="charts-section"> 
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="chart-card line-chart-card">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="chart-wrapper">
                                    <canvas id="oeeLineChart"></canvas>
                                    <div class="no-data-message">
                                        <i class="fas fa-info-circle"></i>
                                        <span>No data available for the selected period.</span>
                                    </div>
                                    <div class="error-message">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>Failed to load data.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row g-4">
                        <div class="col-lg-6 mt-0">
                            <div class="chart-card bar-chart-card">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <h4>Stop & Cause</h4>
                                <div class="chart-wrapper"><canvas id="stopCauseBarChart"></canvas>
                                <div class="no-data-message" style="margin-top: 1.5rem;">
                                    <i class="fas fa-info-circle"></i>
                                    <span>No data available for the selected period.</span>
                                </div>
                                <div class="error-message" style="margin-top: 1.5rem;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>Failed to load data.</span>
                                </div>
                            </div>
                            </div>
                        </div>
                        <div class="col-lg-6 mt-0">
                            <div class="chart-card bar-chart-card">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <h4>Production Results</h4>
                                <div class="chart-wrapper"><canvas id="partsBarChart"></canvas>
                                <div class="no-data-message" style="margin-top: 1.5rem;">
                                    <i class="fas fa-info-circle"></i>
                                    <span>No data available for the selected period.</span>
                                </div>
                                <div class="error-message" style="margin-top: 1.5rem;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>Failed to load data.</span>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
            <div id="toast"></div>

            <script src="script/OEE_piechart.js?v=<?php echo filemtime('script/OEE_piechart.js'); ?>"></script>
            <script src="script/OEE_sparkline.js?v=<?php echo filemtime('script/OEE_sparkline.js'); ?>"></script>
            <script src="script/OEE_linechart.js?v=<?php echo filemtime('script/OEE_linechart.js'); ?>"></script>
            <script src="script/OEE_barchart.js?v=<?php echo filemtime('script/OEE_barchart.js'); ?>"></script>
            <script src="script/filterManager.js?v=<?php echo filemtime('script/filterManager.js'); ?>"></script>
        </main>
    </div>
</body>
</html>