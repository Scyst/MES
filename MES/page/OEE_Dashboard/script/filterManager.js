"use strict";
let dashboardAutoUpdateInterval;

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
        startDateInput.value = systemWorkingDate;
        endDateInput.value = systemWorkingDate;
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

async function fetchAndRenderCostSummary() {
    if (!isLoggedIn) return;
    const params = new URLSearchParams({ 
        action: 'getCostSummary', 
        startDate: document.getElementById("startDate")?.value || '', 
        endDate: document.getElementById("endDate")?.value || '', 
        line: document.getElementById("lineFilter")?.value || '', 
        model: document.getElementById("modelFilter")?.value || '',
        machine: document.getElementById("machineFilter")?.value || ''
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
                col.classList.replace('col-md-6', 'col-md-4'); // optional: make it 3 cols in md
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
            const d = result.data;
            const gp = (d.TotalStdRevenue || 0) - (d.TotalStdCost || 0);
            
            const safeSetText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            safeSetText('lastUpdate', new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }));
            safeSetText('prodRevenueStd', formatNumber(d.TotalStdRevenue, false, 2));
            safeSetText('prodCostTotal', formatNumber(d.TotalStdCost, false, 2));
            safeSetText('valCPU', formatNumber(d.CostPerUnit, false, 2));
            safeSetText('prodCostMat', formatNumber(d.TotalMatCost, false, 2));
            safeSetText('prodCostPercentRM', formatNumber(d.PercentRM, true, 1));
            safeSetText('valScrapCost', formatNumber(d.ScrapCostValue, false, 2));
            safeSetText('prodCostDL', formatNumber(d.TotalDLCost, false, 2));
            safeSetText('valDL', formatNumber(d.TotalActualDL || 0, false, 2));
            safeSetText('valOT', formatNumber(d.TotalActualOT || 0, false, 2));
            safeSetText('valLaborEff', formatNumber(d.LaborEfficiency, false, 1) + 'x');
            safeSetText('prodCostOH', formatNumber(d.TotalOHCost, false, 2));
            safeSetText('prodCostPercentOH', formatNumber(d.PercentOH, true, 1));
            safeSetText('prodGPStd', formatNumber(gp, false, 2));
            safeSetText('prodPercentGPStd', formatNumber(d.PercentGPStd, true, 1));
        }
    } catch (error) { 
        console.error("Cost fetch failed:", error); 
    }
}

function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">All ${label}</option>`;
    optionsArray?.forEach(optTxt => {
        if (!optTxt) return;
        const opt = document.createElement("option");
        opt.value = optTxt; opt.textContent = optTxt;
        if (optTxt === selectedValue) opt.selected = true;
        selectElement.appendChild(opt);
    });
}

window.allMachinesData = [];

function updateMachineDropdown(selectedLine) {
    const machineSelect = document.getElementById("machineFilter");
    if (!machineSelect) return;
    
    // Store current selection to restore if it's still valid
    const currentVal = machineSelect.value;
    
    machineSelect.innerHTML = `<option value="">All Machines</option>`;
    
    const filteredMachines = window.allMachinesData.filter(m => {
        if (!selectedLine || selectedLine === "All") return true;
        // If the machine has no line assigned, it might be shared, or maybe we only show exact matches
        // For strict filtering:
        return m.line === selectedLine;
    });

    filteredMachines.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.machine_id;
        opt.textContent = m.machine_name;
        machineSelect.appendChild(opt);
    });

    // Try to restore previous selection if it still exists in the new list
    if (currentVal && Array.from(machineSelect.options).some(opt => opt.value === currentVal)) {
        machineSelect.value = currentVal;
    } else {
        machineSelect.value = "";
    }
}

async function applyFiltersAndInitCharts() {
    try {
        const res = await fetch("api/oeeDashboardApi.php?action=getFilters");
        const json = await res.json();
        if (json.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), json.data.lines, "Lines", "");
            populateSelectWithOptions(document.getElementById("modelFilter"), json.data.models, "Models", "");

            if (json.data.machines && Array.isArray(json.data.machines)) {
                window.allMachinesData = json.data.machines;
            }

            const lineSelect = document.getElementById("lineFilter");
            if (lineSelect) {
                for (let i = 0; i < lineSelect.options.length; i++) {
                    if (lineSelect.options[i].value.toLowerCase().includes("assembly")) {
                        lineSelect.selectedIndex = i;
                        break; 
                    }
                }
            }
            
            // Populate machines based on the initially selected line
            updateMachineDropdown(lineSelect ? lineSelect.value : '');

        }
    } catch (err) { console.error(err); }
    initWorkingDateUI();

    window.history.replaceState({}, '', window.location.pathname);
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
        startDate: document.getElementById("startDate")?.value || '',
        endDate: document.getElementById("endDate")?.value || '',
        line: document.getElementById("lineFilter")?.value || '',
        model: document.getElementById("modelFilter")?.value || '',
        machine: document.getElementById("machineFilter")?.value || ''
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
    ["startDate", "endDate", "lineFilter", "modelFilter", "machineFilter"].forEach(id => {
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