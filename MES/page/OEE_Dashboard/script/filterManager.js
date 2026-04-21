"use strict";

let dashboardAutoUpdateInterval;

function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return isPercent ? '-- %' : '--';
    const formatted = num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return isPercent ? `${formatted} %` : formatted;
}

// ฟังก์ชันควบคุม UI ป้องกันการกดรัว
function toggleFilterInputs(disabled) {
    ['startDate', 'endDate', 'lineFilter', 'modelFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

async function fetchAndRenderCostSummary() {
    if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) return;
    const costCardElement = document.getElementById('cost-summary-section')?.querySelector('.chart-card');
    if (!costCardElement) return;

    toggleLoadingState?.('cost-summary-section', true);

    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ action: 'getCostSummary', startDate, endDate, line, model });

    const elements = {
        matCost: document.getElementById('prodCostMat'), matPercent: document.getElementById('prodCostPercentRM'),
        dlCost: document.getElementById('prodCostDL'), valDL: document.getElementById('valDL'), valOT: document.getElementById('valOT'),
        ohCost: document.getElementById('prodCostOH'), ohPercent: document.getElementById('prodCostPercentOH'),
        totalCost: document.getElementById('prodCostTotal'), totalRevenue: document.getElementById('prodRevenueStd'),
        gpValue: document.getElementById('prodGPStd'), gpPercent: document.getElementById('prodPercentGPStd')
    };

    const resetElements = () => {
        Object.entries(elements).forEach(([key, el]) => {
            if (el) {
                if (key === 'valDL' || key === 'valOT') el.textContent = '--';
                else if (el.classList.contains('percentage')) el.textContent = '-- %';
                else el.innerHTML = '<span class="loading-indicator">Loading...</span>';
            }
        });
    };
    resetElements();

    try {
        const response = await fetch(`api/oeeDashboardApi.php?${params.toString()}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            const gp = (data.TotalStdRevenue || 0) - (data.TotalStdCost || 0);

            if (elements.matCost) elements.matCost.textContent = formatNumber(data.TotalMatCost, false, 2);
            if (elements.matPercent) elements.matPercent.textContent = formatNumber(data.PercentRM, true, 1);
            if (elements.dlCost) elements.dlCost.textContent = formatNumber(data.TotalDLCost, false, 2);
            if (elements.valDL) elements.valDL.textContent = formatNumber(data.TotalActualDL || 0, false, 0);
            if (elements.valOT) elements.valOT.textContent = formatNumber(data.TotalActualOT || 0, false, 0);
            if (elements.ohCost) elements.ohCost.textContent = formatNumber(data.TotalOHCost, false, 2);
            if (elements.ohPercent) elements.ohPercent.textContent = formatNumber(data.PercentOH, true, 1);
            if (elements.totalCost) elements.totalCost.textContent = formatNumber(data.TotalStdCost, false, 2);
            if (elements.totalRevenue) elements.totalRevenue.textContent = formatNumber(data.TotalStdRevenue, false, 2);
            if (elements.gpValue) elements.gpValue.textContent = formatNumber(gp, false, 2);
            if (elements.gpPercent) elements.gpPercent.textContent = formatNumber(data.PercentGPStd, true, 1);
        } else {
             resetElements(); // Clear logic error
        }
    } catch (error) {
        console.error("Cost summary error:", error);
        Object.values(elements).forEach(el => { if(el && !el.classList.contains('percentage')) el.innerHTML = '<span class="text-danger">Error</span>'; });
    } finally {
        toggleLoadingState?.('cost-summary-section', false);
    }
}

function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">All ${label}</option>`;
    if (Array.isArray(optionsArray)) {
        optionsArray.forEach(optionText => {
            if (!optionText) return;
            const opt = document.createElement("option");
            opt.value = optionText;
            opt.textContent = optionText;
            if (optionText === selectedValue) opt.selected = true;
            selectElement.appendChild(opt);
        });
    }
}

async function applyFiltersAndInitCharts() {
    const params = new URLSearchParams(window.location.search);
    const line = params.get("line") || "ASSEMBLY";
    const model = params.get("model");
    
    toggleFilterInputs(true);
    try {
        const response = await fetch("api/oeeDashboardApi.php?action=getFilters");
        const result = await response.json();
        if (result.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), result.data.lines || [], "Lines", line);
            populateSelectWithOptions(document.getElementById("modelFilter"), result.data.models || [], "Models", model);
        }
    } catch (err) {
        console.error("Error fetching filters:", err);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("startDate").value = params.get("startDate") || todayStr;
    document.getElementById("endDate").value = params.get("endDate") || todayStr;

    await handleFilterChange();
}

async function handleFilterChange() {
    toggleFilterInputs(true); // ป้องกัน Double Submit
    
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    // ยิง Fetch รอตอบกลับแบบ Parallel และไม่ต้องบล็อกหากกราฟไหนพัง (Promise.allSettled)
    const promises = [
        typeof fetchAndRenderPieCharts === 'function' ? fetchAndRenderPieCharts() : Promise.resolve(),
        typeof fetchAndRenderLineCharts === 'function' ? fetchAndRenderLineCharts() : Promise.resolve(),
        typeof fetchAndRenderHourlySparklines === 'function' ? fetchAndRenderHourlySparklines() : Promise.resolve(),
        typeof fetchAndRenderBarCharts === 'function' ? fetchAndRenderBarCharts() : Promise.resolve(),
        typeof fetchAndRenderDailyProductionChart === 'function' ? fetchAndRenderDailyProductionChart() : Promise.resolve()
    ];

    if (typeof isLoggedIn !== 'undefined' && isLoggedIn) {
        promises.push(fetchAndRenderCostSummary());
    }      

    await Promise.allSettled(promises);
    toggleFilterInputs(false); // ปลดล็อกการแก้ไข Filter
}

function startAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        handleFilterChange();
    }, 60000);
}

window.addEventListener("load", async () => {
    await applyFiltersAndInitCharts();
    
    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", () => {
                clearInterval(dashboardAutoUpdateInterval);
                handleFilterChange().then(() => {
                    startAutoUpdate();
                });
            });
        }
    });
    startAutoUpdate();
});