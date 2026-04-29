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
        model: document.getElementById("modelFilter")?.value || '' 
    });

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

async function applyFiltersAndInitCharts() {
    try {
        const res = await fetch("api/oeeDashboardApi.php?action=getFilters");
        const json = await res.json();
        if (json.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), json.data.lines, "Lines", "");
            populateSelectWithOptions(document.getElementById("modelFilter"), json.data.models, "Models", "");

            const lineSelect = document.getElementById("lineFilter");
            if (lineSelect) {
                for (let i = 0; i < lineSelect.options.length; i++) {
                    if (lineSelect.options[i].value.toLowerCase().includes("assembly")) {
                        lineSelect.selectedIndex = i;
                        break; 
                    }
                }
            }
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
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        line: document.getElementById("lineFilter").value,
        model: document.getElementById("modelFilter").value
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
    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", () => {
            handleFilterChange();
            startDashboardAutoUpdate(); 
        });
    });
    
    startDashboardAutoUpdate();
});