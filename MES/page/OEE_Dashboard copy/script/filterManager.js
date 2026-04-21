"use strict";
let dashboardAutoUpdateInterval;

function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return isPercent ? '-- %' : '--';
    return isPercent ? `${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %` 
                     : num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

async function fetchAndRenderCostSummary() {
    if (!isLoggedIn) return;
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ action: 'getCostSummary', startDate, endDate, line, model });

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();
        if (result.success && result.data) {
            const d = result.data;
            const gp = (d.TotalStdRevenue || 0) - (d.TotalStdCost || 0);
            document.getElementById('prodCostMat').textContent = formatNumber(d.TotalMatCost, false, 2);
            document.getElementById('prodCostPercentRM').textContent = formatNumber(d.PercentRM, true, 1);
            document.getElementById('prodCostDL').textContent = formatNumber(d.TotalDLCost, false, 2);
            document.getElementById('valDL').textContent = formatNumber(d.TotalActualDL || 0, false, 0);
            document.getElementById('valOT').textContent = formatNumber(d.TotalActualOT || 0, false, 0);
            document.getElementById('prodCostTotal').textContent = formatNumber(d.TotalStdCost, false, 2);
            document.getElementById('prodRevenueStd').textContent = formatNumber(d.TotalStdRevenue, false, 2);
            document.getElementById('prodGPStd').textContent = formatNumber(gp, false, 2);
            document.getElementById('prodPercentGPStd').textContent = formatNumber(d.PercentGPStd, true, 1);
        }
    } catch (error) { console.error("Cost fetch failed:", error); }
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
    const params = new URLSearchParams(window.location.search);
    try {
        const res = await fetch("api/oeeDashboardApi.php?action=getFilters");
        const json = await res.json();
        if (json.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), json.data.lines, "Lines", params.get("line"));
            populateSelectWithOptions(document.getElementById("modelFilter"), json.data.models, "Models", params.get("model"));
        }
    } catch (err) { console.error(err); }

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("startDate").value = params.get("startDate") || todayStr;
    document.getElementById("endDate").value = params.get("endDate") || todayStr;

    handleFilterChange();
}

function handleFilterChange() {
    const params = new URLSearchParams({
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        line: document.getElementById("lineFilter").value,
        model: document.getElementById("modelFilter").value
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    // Call renders
    fetchAndRenderPieCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarAndTable?.(); // ฟังก์ชันใหม่ที่เราจะทำใน OEE_barchart.js
    if (isLoggedIn) fetchAndRenderCostSummary();
}

window.addEventListener("load", () => {
    applyFiltersAndInitCharts();
    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", () => {
            clearInterval(dashboardAutoUpdateInterval);
            handleFilterChange();
            dashboardAutoUpdateInterval = setInterval(handleFilterChange, 60000);
        });
    });
    dashboardAutoUpdateInterval = setInterval(handleFilterChange, 60000);
});