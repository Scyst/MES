<?php 
session_start(); 
$isLoggedIn = (isset($_SESSION['user']) && !empty($_SESSION['user'])) || (isset($_SESSION['username']) && !empty($_SESSION['username']));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>TOOLBOX - DASHBOARD</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="dashboard-page">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <header class="dashboard-header-sticky">

                <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
                        data-bs-toggle="offcanvas" 
                        data-bs-target="#globalMobileMenu" 
                        aria-controls="globalMobileMenu">
                    <i class="fas fa-bars"></i>
                </button>

                <div class="d-flex justify-content-between align-items-center mb-1">
                    
                    <h2 class="mb-0">TOOLBOX DASHBOARD</h2>

                    <div class="text-end d-flex align-items-center">
                        
                        <div class="me-3 d-none d-lg-block">
                            <p id="date" class="mb-0"></p>
                            <p id="time" class="mb-0"></p>
                        </div>

                        <button class="btn btn-link d-lg-none" id="oee-filter-toggle-btn" type="button" title="Toggle Filters">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>

                <div class="all-filters-container">
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
                </div>

            </header>
            
            <div class="dashboard-container">

                <section class="dashboard-section" id="kpi-section">
                    <div class="row g-4">
                        <div class="col-12 col-md-6 col-xl-3">
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
                        <div class="col-12 col-md-6 col-xl-3">
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
                        <div class="col-12 col-md-6 col-xl-3">
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
                        <div class="col-12 col-md-6 col-xl-3">
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

                <section class="dashboard-section" id="cost-summary-section">
                    <div class="chart-card cost-summary-card" style="height: 100%;">
                        <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                        <?php
                        if ($isLoggedIn): 
                        ?>
                        <h4 class="mb-3"><i class="fas fa-coins"></i> Production Cost Summary</h4>

                        <div class="row text-center gy-4">
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-cash-register"></i> Total Revenue (Production)</h5>
                                <span class="value" id="prodRevenueStd"><span class="loading-indicator">Loading...</span></span>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-boxes"></i> Material Cost (Standard)</h5>
                                <span class="value" id="prodCostMat"><span class="loading-indicator">Loading...</span></span>
                                <span class="percentage" id="prodCostPercentRM">-- %</span>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-hard-hat"></i> Total DLOT</h5>
                                <span class="value" id="prodCostDL"><span class="loading-indicator">Loading...</span></span>
                                <span class="percentage" id="prodCostPercentDL">-- %</span>
                            </div>
                        </div>

                        <hr>

                        <div class="row text-center mt-3 mb-4">
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-industry"></i> Overhead (Standard)</h5>
                                <span class="value" id="prodCostOH"><span class="loading-indicator">Loading...</span></span>
                                <span class="percentage" id="prodCostPercentOH">-- %</span>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-dollar-sign"></i> Total COGS</h5>
                                <span class="value" id="prodCostTotal"><span class="loading-indicator">Loading...</span></span>
                            </div>
                            <div class="col-12 col-md-4 mb-2">
                                <h5><i class="fas fa-percentage"></i> Gross Profit</h5>
                                <span class="value" id="prodGPStd"><span class="loading-indicator">Loading...</span></span>
                                <span class="percentage" id="prodPercentGPStd">-- %</span>
                            </div>
                        </div>
                        <hr>
                        <?php
                        endif; 
                        ?>

                        <h4 class="mt-2 mb-3"><i class="fas fa-chart-bar"></i> Daily Production Output (FG)</h4>
                        <div class="chart-wrapper" style="height: 100%;">
                            <canvas id="dailyProductionChart"></canvas>
                            <div class="no-data-message">
                                <i class="fas fa-info-circle"></i>
                                <span>No production data available for this period.</span>
                            </div>
                            <div class="error-message">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Failed to load production data.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="dashboard-section" id="charts-section"> 
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="chart-card line-chart-card px-3 py-0">
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

                    <?php
                    if ($isLoggedIn): 
                    ?>
                    <div class="row g-4">
                        <div class="col-12 col-lg-6">
                            <div class="chart-card bar-chart-card">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <h4>Stop & Cause</h4>
                                    <div class="btn-group btn-group-sm" role="group" id="stopCauseToggle">
                                        <button type="button" class="btn btn-outline-secondary active" data-group="cause">By Cause</button>
                                        <button type="button" class="btn btn-outline-secondary" data-group="line">By Line</button>
                                    </div>
                                </div>
                                <div class="chart-wrapper"><canvas id="stopCauseBarChart"></canvas>
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
                        <div class="col-12 col-lg-6">
                            <div class="chart-card bar-chart-card">
                                <div class="progress-bar-wrapper"><div class="progress-bar-indicator"></div></div>
                                <h4>Production Results</h4>
                                <div class="chart-wrapper"><canvas id="partsBarChart"></canvas>
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
                    <?php
                    endif; 
                    ?>
                </section>

            </div>
            <div id="toast"></div>
        </main>
    </div>
    
    <?php 
    if ($isLoggedIn): 
    ?>
        <?php include_once('../components/php/command_center.php'); ?>
        <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php 
    endif; 
    ?>
    
    <?php include_once('../components/php/mobile_menu.php'); ?>ป

    <script>
        const isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;
    </script>

    <script src="script/OEE_sparkline.js?v=<?php echo filemtime('script/OEE_sparkline.js'); ?>"></script>
    <script src="script/OEE_OEEchart.js?v=<?php echo filemtime('script/OEE_OEEchart.js'); ?>"></script>
    <script src="script/OEE_barchart.js?v=<?php echo filemtime('script/OEE_barchart.js'); ?>"></script>
    <script src="script/OEE_production_chart.js?v=<?php echo filemtime('script/OEE_production_chart.js'); ?>"></script>
    <script src="script/filterManager.js?v=<?php echo filemtime('script/filterManager.js'); ?>"></script>
    <script src="../components/js/mobile_init.js?v=<?php echo filemtime('../components/js/mobile_init.js'); ?>" defer></script>
</body>
</html>