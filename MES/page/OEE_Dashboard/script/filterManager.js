"use strict";
let dashboardAutoUpdateInterval;
let currentLaborView = 'actual'; // 'actual' (matches Manpower/Morning Brief) or 'bom'
window.lastCostSummaryData = null;

function getWorkingDate() {
    const now = new Date();
    if (now.getHours() < 8) {
        now.setDate(now.getDate() - 1);
    }
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

let systemWorkingDate = getWorkingDate();
function initWorkingDateUI() {
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    if (startDateInput && endDateInput) {
        if (!startDateInput.value) startDateInput.value = systemWorkingDate;
        if (!endDateInput.value) endDateInput.value = systemWorkingDate;
    }
}

function checkDayShiftAndSync() {
    const currentWorkingDate = getWorkingDate();
    if (currentWorkingDate !== systemWorkingDate) {
        const oldWorkingDate = systemWorkingDate;
        systemWorkingDate = currentWorkingDate;
        
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        if (startDateInput && endDateInput && 
            startDateInput.value === oldWorkingDate && 
            endDateInput.value === oldWorkingDate) {
            
            console.log("Auto-shifting Live Monitor to new working date: " + currentWorkingDate);
            startDateInput.value = currentWorkingDate;
            endDateInput.value = currentWorkingDate;
            return true;
        }
    }
    return false;
}

function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return isPercent ? '-- %' : '--';
    return isPercent ? `${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%` 
                     : num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function renderFinancialCard(data, viewMode = 'actual') {
    if (!data) return;
    
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safeSetText('lastUpdate', new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }));
    safeSetText('prodRevenueStd', formatNumber(data.TotalStdRevenue, false, 2));
    safeSetText('prodCostMat', formatNumber(data.TotalMatCost, false, 2));
    safeSetText('prodCostPercentRM', formatNumber(data.PercentRM, true, 1));
    safeSetText('valScrapCost', formatNumber(data.ScrapCostValue, false, 2));
    safeSetText('prodCostOH', formatNumber(data.TotalOHCost, false, 2));
    safeSetText('prodCostPercentOH', formatNumber(data.PercentOH, true, 1));

    // Update Mode Toggle Buttons
    const btnActual = document.getElementById('btnLaborActual');
    const btnBom = document.getElementById('btnLaborBom');
    const modeDesc = document.getElementById('laborModeDesc');
    const laborLabel = document.getElementById('laborCardLabel');

    if (btnActual && btnBom) {
        if (viewMode === 'actual') {
            btnActual.className = "btn btn-sm btn-primary fw-bold px-2 py-0";
            btnBom.className = "btn btn-sm btn-outline-secondary fw-bold px-2 py-0";
        } else {
            btnActual.className = "btn btn-sm btn-outline-secondary fw-bold px-2 py-0";
            btnBom.className = "btn btn-sm btn-primary fw-bold px-2 py-0";
        }
    }

    const dual = data.dualViews || {};
    let laborCost = 0, totalCost = 0, gp = 0, percentGP = 0, cpu = 0, eff = 0;

    if (viewMode === 'actual') {
        const actualMetrics = dual.actual || {};
        laborCost = actualMetrics.laborCost ?? data.TotalActualDLOT ?? data.TotalDLCost ?? 0;
        totalCost = actualMetrics.totalCost ?? (data.TotalMatCost + laborCost + data.TotalOHCost);
        gp = actualMetrics.grossProfit ?? ((data.TotalStdRevenue || 0) - totalCost);
        percentGP = actualMetrics.percentGP ?? ((data.TotalStdRevenue > 0) ? (gp / data.TotalStdRevenue) * 100 : 0);
        cpu = actualMetrics.costPerUnit ?? data.CostPerUnit ?? 0;
        eff = actualMetrics.laborEfficiency ?? ((laborCost > 0) ? (data.TotalStdRevenue / laborCost) : 0);

        if (modeDesc) {
            modeDesc.innerHTML = `<i class="fas fa-check-circle text-success me-1"></i>โหมด: ค่าแรงจริง (Manpower / Morning Brief)`;
        }
        if (laborLabel) laborLabel.textContent = "Labor (DL+OT)";

        safeSetText('valDL', formatNumber(data.TotalActualDL || 0, false, 2));
        safeSetText('valOT', formatNumber(data.TotalActualOT || 0, false, 2));
    } else {
        const bomMetrics = dual.bom || {};
        laborCost = bomMetrics.laborCost ?? data.TotalStdDLCost ?? data.TotalDLCost ?? 0;
        totalCost = bomMetrics.totalCost ?? (data.TotalMatCost + laborCost + data.TotalOHCost);
        gp = bomMetrics.grossProfit ?? ((data.TotalStdRevenue || 0) - totalCost);
        percentGP = bomMetrics.percentGP ?? ((data.TotalStdRevenue > 0) ? (gp / data.TotalStdRevenue) * 100 : 0);
        cpu = bomMetrics.costPerUnit ?? data.CostPerUnit ?? 0;
        eff = bomMetrics.laborEfficiency ?? ((laborCost > 0) ? (data.TotalStdRevenue / laborCost) : 0);

        if (modeDesc) {
            modeDesc.innerHTML = `<i class="fas fa-layer-group text-primary me-1"></i>โหมด: ค่าแรงมาตรฐาน (BOM Std)`;
        }
        if (laborLabel) laborLabel.textContent = "Labor (BOM Std DL)";

        safeSetText('valDL', formatNumber(laborCost, false, 2));
        safeSetText('valOT', "0.00");
    }

    safeSetText('prodCostDL', formatNumber(laborCost, false, 2));
    safeSetText('prodCostTotal', formatNumber(totalCost, false, 2));
    safeSetText('prodGPStd', formatNumber(gp, false, 2));
    safeSetText('prodPercentGPStd', formatNumber(percentGP, true, 1));
    safeSetText('valCPU', formatNumber(cpu, false, 2));
    safeSetText('valLaborEff', (eff > 0 ? formatNumber(eff, false, 1) + 'x' : '--'));
}

window.switchLaborView = function(viewMode) {
    if (viewMode !== 'actual' && viewMode !== 'bom') return;
    currentLaborView = viewMode;
    
    // Update URL query parameter
    const params = new URLSearchParams(window.location.search);
    params.set('laborView', viewMode);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    if (window.lastCostSummaryData) {
        renderFinancialCard(window.lastCostSummaryData, viewMode);
    } else {
        fetchAndRenderCostSummary();
    }
};

async function fetchAndRenderCostSummary() {
    if (!isLoggedIn) return;
    const params = new URLSearchParams({ 
        action: 'getCostSummary', 
        startDate: (document.getElementById("startDate")?.value || '').trim(), 
        endDate: (document.getElementById("endDate")?.value || '').trim(), 
        line: (document.getElementById("lineFilter")?.value || '').trim(), 
        model: (document.getElementById("modelFilter")?.value || '').trim(), 
        machine: (document.getElementById("machineFilter")?.value || '').trim(), 
        team: (document.getElementById("teamFilter")?.value || '').trim(),
        laborView: currentLaborView
    });
    const finCard = document.getElementById('financialSummaryCard');
    const sfRevCol = document.getElementById('sfRevenueCol');
    const sfGoodCol = document.getElementById('sfGoodCol');
    const sfHoldCol = document.getElementById('sfHoldCol');
    const sfScrapCol = document.getElementById('sfScrapCol');

    const hasMachineFilter = !!document.getElementById("machineFilter")?.value;

    if (finCard) {
        finCard.style.display = hasMachineFilter ? 'none' : '';
    }

    if (sfRevCol && sfGoodCol && sfHoldCol && sfScrapCol) {
        if (hasMachineFilter) {
            sfRevCol.style.display = 'none';
            [sfGoodCol, sfHoldCol, sfScrapCol].forEach(col => {
                col.classList.replace('col-xl-3', 'col-xl-4');
                col.classList.replace('col-md-6', 'col-md-4');
            });
        } else {
            sfRevCol.style.display = '';
            [sfGoodCol, sfHoldCol, sfScrapCol].forEach(col => {
                col.classList.replace('col-xl-4', 'col-xl-3');
                col.classList.replace('col-md-4', 'col-md-6');
            });
        }
    }

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();
        if (result.success && result.data) {
            window.lastCostSummaryData = result.data;
            renderFinancialCard(result.data, currentLaborView);
        }
    } catch (error) { 
        console.error("Cost fetch failed:", error); 
    }
}

function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">All ${label}</option>`;
    const targetVal = (selectedValue || "").trim().toLowerCase();
    
    optionsArray?.forEach(optTxt => {
        if (!optTxt) return;
        const opt = document.createElement("option");
        opt.value = optTxt.trim(); 
        opt.textContent = optTxt.trim();
        if (targetVal && optTxt.trim().toLowerCase() === targetVal) {
            opt.selected = true;
        }
        selectElement.appendChild(opt);
    });
}

window.allMachinesData = [];

function updateMachineDropdown(selectedLine, initialMachine = "") {
    const machineSelect = document.getElementById("machineFilter");
    if (!machineSelect) return;
    
    const currentVal = (initialMachine || machineSelect.value || "").trim();
    machineSelect.innerHTML = `<option value="">All Machines</option>`;
    
    const cleanLine = (selectedLine || "").trim();
    const filteredMachines = window.allMachinesData.filter(m => {
        if (!cleanLine || cleanLine === "All") return true;
        return (m.line || "").trim() === cleanLine;
    });

    filteredMachines.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.machine_id;
        opt.textContent = m.machine_name;
        if (currentVal && String(m.machine_id) === String(currentVal)) {
            opt.selected = true;
        }
        machineSelect.appendChild(opt);
    });

    if (currentVal && Array.from(machineSelect.options).some(opt => opt.value === currentVal)) {
        machineSelect.value = currentVal;
    } else if (!initialMachine) {
        machineSelect.value = "";
    }
}

async function applyFiltersAndInitCharts() {
    // Read and respect initial URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlStart = urlParams.get('startDate')?.trim();
    const urlEnd = urlParams.get('endDate')?.trim();
    const urlLine = urlParams.get('line')?.trim();
    const urlModel = urlParams.get('model')?.trim();
    const urlMachine = urlParams.get('machine')?.trim();
    const urlTeam = urlParams.get('team')?.trim();
    const urlLaborView = urlParams.get('laborView')?.trim().toLowerCase();

    if (urlLaborView === 'bom' || urlLaborView === 'std') {
        currentLaborView = 'bom';
    } else {
        currentLaborView = 'actual';
    }

    try {
        const res = await fetch("api/oeeDashboardApi.php?action=getFilters");
        const json = await res.json();
        if (json.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), json.data.lines, "Lines", urlLine);
            populateSelectWithOptions(document.getElementById("modelFilter"), json.data.models, "Models", urlModel);
            populateSelectWithOptions(document.getElementById("teamFilter"), json.data.teams, "Teams", urlTeam);

            if (json.data.machines && Array.isArray(json.data.machines)) {
                window.allMachinesData = json.data.machines;
            }

            const lineSelect = document.getElementById("lineFilter");
            // If urlLine was not given, default to first option containing 'assembly'
            if (lineSelect && !urlLine) {
                for (let i = 0; i < lineSelect.options.length; i++) {
                    if (lineSelect.options[i].value.toLowerCase().includes("assembly")) {
                        lineSelect.selectedIndex = i;
                        break; 
                    }
                }
            }
            
            updateMachineDropdown(lineSelect ? lineSelect.value : '', urlMachine);
        }
    } catch (err) { 
        console.error(err); 
    }

    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    if (startDateInput && endDateInput) {
        startDateInput.value = urlStart || systemWorkingDate;
        endDateInput.value = urlEnd || systemWorkingDate;
    }

    // Bind Dual View Toggle Buttons
    const btnActual = document.getElementById('btnLaborActual');
    const btnBom = document.getElementById('btnLaborBom');
    if (btnActual) btnActual.onclick = () => window.switchLaborView('actual');
    if (btnBom) btnBom.onclick = () => window.switchLaborView('bom');

    handleFilterChange(); 
}

setInterval(() => {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString('th-TH', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    }
}, 1000);

function handleFilterChange() {
    const params = new URLSearchParams({
        startDate: (document.getElementById("startDate")?.value || '').trim(),
        endDate: (document.getElementById("endDate")?.value || '').trim(),
        line: (document.getElementById("lineFilter")?.value || '').trim(),
        model: (document.getElementById("modelFilter")?.value || '').trim(),
        machine: (document.getElementById("machineFilter")?.value || '').trim(),
        team: (document.getElementById("teamFilter")?.value || '').trim(),
        laborView: currentLaborView
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    if(typeof fetchAndRenderPieCharts === 'function') fetchAndRenderPieCharts();
    if(typeof fetchAndRenderLineCharts === 'function') fetchAndRenderLineCharts();
    if(typeof fetchAndRenderBarAndTable === 'function') fetchAndRenderBarAndTable();
    if (isLoggedIn) fetchAndRenderCostSummary();
}

function startDashboardAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        checkDayShiftAndSync(); 
        
        if (typeof handleFilterChange === 'function') {
            handleFilterChange();     
        }
    }, 60000);
}

window.addEventListener("load", () => {
    applyFiltersAndInitCharts();
    ["startDate", "endDate", "lineFilter", "modelFilter", "machineFilter", "teamFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", (e) => {
            if (id === "lineFilter") {
                updateMachineDropdown(e.target.value);
            }
            handleFilterChange();
            startDashboardAutoUpdate(); 
        });
    });
    
    startDashboardAutoUpdate();
});
