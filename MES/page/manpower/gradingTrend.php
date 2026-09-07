<?php
// page/manpower/gradingTrend.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('manage_manpower')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$pageTitle      = "Grading Trend";
$pageHeaderTitle = "Grading Trend Dashboard";
$pageHeaderSubtitle = "ความเป็นมาของเกรดพนักงานรายเดือน";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/manpowerUI.css?v=<?php echo filemtime(__DIR__ . '/css/manpowerUI.css'); ?>">
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body class="dashboard-page layout-top-header">
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content" class="d-flex flex-column" style="min-height: calc(100vh - 65px);">
        <div class="container-fluid p-3">

            <!-- Toolbar -->
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
                <div class="fw-bold text-dark fs-6"><i class="fas fa-chart-area me-2 text-primary"></i>Grading Trend</div>
                <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
                    <select id="trendLine" class="form-select form-select-sm" style="width:130px">
                        <option value="ALL">ALL LINES</option>
                    </select>
                    <select id="trendHcGroup" class="form-select form-select-sm" style="width:120px">
                        <option value="ALL">ALL GROUPS</option>
                        <option value="TEAM 1">TEAM 1</option>
                    </select>
                    <select id="trendDimension" class="form-select form-select-sm" style="width:130px">
                        <option value="overall">Overall</option>
                        <option value="iph">IPH</option>
                        <option value="5s">5S</option>
                        <option value="attendance">Attendance</option>
                        <option value="learning">Learning</option>
                    </select>
                    <select id="trendMonths" class="form-select form-select-sm" style="width:100px">
                        <option value="6">6 เดือน</option>
                        <option value="12" selected>12 เดือน</option>
                        <option value="24">24 เดือน</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="Trend.load()">
                        <i class="fas fa-sync-alt me-1"></i>Refresh
                    </button>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row g-3 mb-3">
                <!-- Grade A% Trend by Line -->
                <div class="col-12 col-xl-8">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-body pb-1">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">% Grade A Trend by Line</h6>
                                <span class="badge bg-success-subtle text-success border border-success-subtle small" id="trendLineCount">—</span>
                            </div>
                            <div id="chart-trend-line" style="min-height:280px;"></div>
                        </div>
                    </div>
                </div>
                <!-- Stacked Grade Distribution -->
                <div class="col-12 col-xl-4">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-body pb-1">
                            <h6 class="card-title text-secondary fw-bold small text-uppercase mb-2">Grade Distribution รายเดือน</h6>
                            <div id="chart-trend-stacked" style="min-height:280px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Comparison Table -->
            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="px-3 pt-3 pb-2">
                        <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">
                            เปรียบเทียบเดือนล่าสุด vs เดือนก่อนหน้า — <span id="trendCompareLabel">ตาม Line</span>
                        </h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0 text-center align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th class="text-start">Line</th>
                                    <th>Graded (Latest)</th>
                                    <th>Grade A (%)</th>
                                    <th>Prev Month A (%)</th>
                                    <th>Delta (%)</th>
                                    <th>A / B / C / D</th>
                                </tr>
                            </thead>
                            <tbody id="trendCompareBody">
                                <tr><td colspan="6" class="text-muted py-4">กำลังโหลด...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <script>
    const Trend = {
        charts: {},

        init() {
            ['trendLine','trendHcGroup','trendDimension','trendMonths'].forEach(id => {
                document.getElementById(id).addEventListener('change', () => this.load());
            });
            this.load();
        },

        async load() {
            const line      = document.getElementById('trendLine').value;
            const hcGroup   = document.getElementById('trendHcGroup').value;
            const dimension = document.getElementById('trendDimension').value;
            const months    = document.getElementById('trendMonths').value;

            try {
                const resp   = await fetch(`api/api_grading_trend.php?action=get_trend_data&line=${line}&hcGroup=${hcGroup}&dimension=${dimension}&months=${months}`);
                const result = await resp.json();
                if (!result.success) throw new Error(result.message);

                this.renderCharts(result);
                this.renderTable(result);
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        },

        renderCharts(data) {
            // Destroy old charts
            Object.values(this.charts).forEach(c => c && c.destroy());
            this.charts = {};

            const shortPeriod = (p) => {
                const [y, m] = p.split('-');
                return `${m}/${y.substring(2)}`;
            };
            const periodLabels = data.periods.map(shortPeriod);

            document.getElementById('trendLineCount').textContent = `${data.lines.length} lines`;

            // Chart 1: % Grade A line chart
            const lineSeries = data.line_series && data.line_series.length > 0 ? data.line_series : [{ name: 'No Data', data: [] }];
            
            this.charts.trendLine = new ApexCharts(document.getElementById('chart-trend-line'), {
                series: lineSeries,
                chart: { type: 'line', height: 280, toolbar: { show: false }, animations: { speed: 400 } },
                stroke: { width: 2, curve: 'smooth' },
                xaxis: { categories: periodLabels, labels: { style: { fontSize: '11px' } } },
                yaxis: { min: 0, max: 100, labels: { formatter: v => v + '%' }, title: { text: '% Grade A' } },
                markers: { size: 4, hover: { sizeOffset: 2 } },
                dataLabels: { enabled: false },
                tooltip: { y: { formatter: v => v !== null ? v + '%' : 'N/A' } },
                legend: { position: 'top', fontSize: '11px' },
                annotations: {
                    yaxis: [{ y: 50, borderColor: '#adb5bd', strokeDashArray: 4,
                        label: { text: '50%', style: { fontSize: '10px', background: '#f8f9fa', color: '#6c757d' } } }]
                }
            });
            this.charts.trendLine.render();

            // Chart 2: Stacked grade distribution
            this.charts.trendStacked = new ApexCharts(document.getElementById('chart-trend-stacked'), {
                series: data.stacked_grades,
                chart: { type: 'bar', height: 280, stacked: true, toolbar: { show: false }, animations: { speed: 400 } },
                plotOptions: { bar: { horizontal: false, columnWidth: '70%' } },
                colors: ['#1cc88a','#4e73df','#f6c23e','#e74a3b'],
                xaxis: { categories: periodLabels, labels: { style: { fontSize: '10px' } } },
                yaxis: { labels: { formatter: v => v } },
                dataLabels: { enabled: false },
                legend: { position: 'top', fontSize: '10px' },
                tooltip: { y: { formatter: v => v + ' คน' } }
            });
            this.charts.trendStacked.render();
        },

        renderTable(data) {
            const latestP = data.latest_period || '';
            const prevP   = data.prev_period   || '';
            document.getElementById('trendCompareLabel').textContent =
                `${latestP} vs ${prevP}`;

            const deltaColor = (d) => d === null ? '' : d > 0 ? 'text-success fw-bold' : d < 0 ? 'text-danger fw-bold' : 'text-muted';
            const deltaText  = (d) => d === null ? '—' : (d > 0 ? '+' : '') + d + '%';

            const rows = data.comparison.map(c => {
                const cur = c.cur || { A:0, B:0, C:0, D:0, total:0 };
                return `<tr>
                    <td class="text-start fw-bold">${c.line}</td>
                    <td>${cur.total}</td>
                    <td>${c.pct_a_cur !== null ? c.pct_a_cur + '%' : '—'}</td>
                    <td>${c.pct_a_prev !== null ? c.pct_a_prev + '%' : '—'}</td>
                    <td class="${deltaColor(c.delta)}">${deltaText(c.delta)}</td>
                    <td>
                        <span class="text-success">${cur.A}</span> /
                        <span class="text-primary">${cur.B}</span> /
                        <span class="text-warning">${cur.C}</span> /
                        <span class="text-danger">${cur.D}</span>
                    </td>
                </tr>`;
            }).join('');

            document.getElementById('trendCompareBody').innerHTML =
                rows || '<tr><td colspan="6" class="text-muted py-4">ยังไม่มีข้อมูล</td></tr>';
        }
    };

    document.addEventListener('DOMContentLoaded', () => Trend.init());
    </script>

</body>
</html>
