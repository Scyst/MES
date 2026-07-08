const ProductionOverviewModule = (function() {
    let refreshInterval = null;

    function init() {
        document.addEventListener('peTabChanged', (e) => {
            if (e.detail.tab === 'production_overview') {
                startAutoRefresh();
                fetchData();
            } else {
                stopAutoRefresh();
            }
        });
    }

    async function fetchData() {
        const container = document.getElementById('overviewCardsContainer');
        
        try {
            const res = await fetch(PE_CONFIG.apiBase + 'iiotAPI.php?action=get_production_overview');
            const result = await res.json();
            
            if (result.success && result.data) {
                renderCards(result.data, container);
            }
        } catch (e) {
            console.error('Failed to fetch production overview', e);
            if (container.innerHTML.includes('spinner-border')) {
                container.innerHTML = `<div class="col-12 text-center text-danger">Failed to load data.</div>`;
            }
        }
    }

    function renderCards(data, container) {
        let html = '';
        const lines = Object.keys(data).sort();
        
        if (lines.length === 0) {
            container.innerHTML = `<div class="col-12 text-center text-muted">No production data available.</div>`;
            return;
        }

        lines.forEach(line => {
            const stats = data[line];
            
            // Progress Bar Logic
            let progressPct = 0;
            if (stats.total_expected > 0) {
                progressPct = (stats.total_actual / stats.total_expected) * 100;
            }
            progressPct = Math.min(100, progressPct);
            
            // Defect Alert
            let defectHtml = '';
            if (stats.total_defects > 0) {
                defectHtml = `<span class="badge bg-danger ms-2" title="Defects Found"><i class="fas fa-exclamation-triangle"></i> ${stats.total_defects} Defects</span>`;
            } else {
                defectHtml = `<span class="badge bg-success ms-2" title="Zero Defects"><i class="fas fa-check-circle"></i> Perfect</span>`;
            }

            html += `
            <div class="col-12 col-xl-6">
                <div class="card shadow-sm border-0 h-100 overview-card">
                    <div class="card-header bg-white border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                        <h5 class="text-uppercase text-dark fw-bold mb-0">${line}</h5>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-light text-dark border me-2">${stats.total_machines} M/C</span>
                            ${defectHtml}
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <!-- Machine States -->
                        <div class="d-flex justify-content-between mb-4 bg-light rounded p-2 px-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="machine-status-badge bg-success text-white">${stats.ONLINE}</div>
                                <span class="text-success fw-semibold small">ONLINE</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <div class="machine-status-badge bg-danger text-white">${stats.STOP}</div>
                                <span class="text-danger fw-semibold small">STOP</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <div class="machine-status-badge bg-secondary text-white">${stats.OFFLINE}</div>
                                <span class="text-secondary fw-semibold small">OFFLINE</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <div class="machine-status-badge text-dark" style="background:#e2e8f0;">${stats.MANUAL}</div>
                                <span class="text-muted fw-semibold small">MANUAL</span>
                            </div>
                        </div>

                        <!-- Production Progress -->
                        <div class="mb-4">
                            <div class="d-flex justify-content-between align-items-end mb-1">
                                <span class="fw-semibold text-dark">Production Output</span>
                                <span class="text-muted small">
                                    <strong class="text-primary fs-5">${stats.total_actual.toLocaleString()}</strong> / ${stats.total_expected.toLocaleString()}
                                </span>
                            </div>
                            <div class="progress position-relative" style="height: 12px; border-radius: 6px; background-color: #e2e8f0;">
                                <div class="progress-bar ${progressPct >= 100 ? 'bg-success' : 'bg-primary'} progress-bar-striped progress-bar-animated" 
                                     role="progressbar" 
                                     style="width: ${progressPct}%"></div>
                                <!-- If we wanted a target line, we could place it here based on time passed -->
                            </div>
                        </div>

                        <!-- OEE Stats -->
                        <div class="row g-2">
                            <div class="col-3">
                                <div class="stat-box" style="${stats.oee >= 85 ? 'background:#ecfdf5;' : (stats.oee >= 60 ? 'background:#fffbeb;' : 'background:#fef2f2;')}">
                                    <div class="stat-box-value ${stats.oee >= 85 ? 'text-success' : (stats.oee >= 60 ? 'text-warning' : 'text-danger')}">${stats.oee}%</div>
                                    <div class="stat-box-label">OEE</div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-box">
                                    <div class="stat-box-value text-dark">${stats.availability}%</div>
                                    <div class="stat-box-label">Avail</div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-box">
                                    <div class="stat-box-value text-dark">${stats.performance}%</div>
                                    <div class="stat-box-label">Perf</div>
                                </div>
                            </div>
                            <div class="col-3">
                                <div class="stat-box">
                                    <div class="stat-box-value text-dark">${stats.quality}%</div>
                                    <div class="stat-box-label">Qual</div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }

    function startAutoRefresh() {
        if (!refreshInterval) {
            refreshInterval = setInterval(fetchData, 5000);
        }
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    return { init, fetchData };
})();

document.addEventListener('DOMContentLoaded', () => {
    ProductionOverviewModule.init();
});

window.ProductionOverviewModule = ProductionOverviewModule;
export default ProductionOverviewModule;
