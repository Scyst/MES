"use strict";

let dashboardAutoUpdateInterval;

/**
 * Helper function to format numbers (currency or percentage)
 */
function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return isPercent ? '-- %' : '--';
    }
    const formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return isPercent ? `${formatted} %` : formatted;
}

/**
 * Fetches and renders the production cost summary data.
 * NOTE: This function uses the date range directly from the filters.
 * It does NOT apply minimum date range logic.
 */
async function fetchAndRenderCostSummary() {
    if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
        return;
    }
    const costCardElement = document.getElementById('cost-summary-section')?.querySelector('.chart-card');
    if (!costCardElement) return;

    toggleLoadingState?.(costCardElement, true);

    // Read dates directly from filters for this specific component
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';
    const params = new URLSearchParams({ startDate, endDate, line, model });

    const elements = {
        matCost: document.getElementById('prodCostMat'),
        matPercent: document.getElementById('prodCostPercentRM'),
        dlCost: document.getElementById('prodCostDL'),
        dlPercent: document.getElementById('prodCostPercentDL'),
        ohCost: document.getElementById('prodCostOH'),
        ohPercent: document.getElementById('prodCostPercentOH'),
        totalCost: document.getElementById('prodCostTotal'),
        totalRevenue: document.getElementById('prodRevenueStd'),
        gpValue: document.getElementById('prodGPStd'),
        gpPercent: document.getElementById('prodPercentGPStd')
    };

    const resetElements = () => {
        const loadingHtml = '<span class="loading-indicator">Loading...</span>';
        const percentPlaceholder = '-- %';
        Object.values(elements).forEach(el => {
            if (el) {
                if (el.classList.contains('percentage')) {
                    el.textContent = percentPlaceholder;
                } else {
                    el.innerHTML = loadingHtml;
                }
            }
        });
    };

    resetElements();

    try {
        const response = await fetch(`api/get_production_cost_summary.php?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            const gp = (data.TotalStdRevenue || 0) - (data.TotalStdCost || 0);

            if (elements.matCost) elements.matCost.textContent = formatNumber(data.TotalMatCost, false, 2);
            if (elements.matPercent) elements.matPercent.textContent = formatNumber(data.PercentRM, true, 1);
            if (elements.dlCost) elements.dlCost.textContent = formatNumber(data.TotalDLCost, false, 2);
            if (elements.dlPercent) elements.dlPercent.textContent = formatNumber(data.PercentDL, true, 1);
            if (elements.ohCost) elements.ohCost.textContent = formatNumber(data.TotalOHCost, false, 2);
            if (elements.ohPercent) elements.ohPercent.textContent = formatNumber(data.PercentOH, true, 1);
            if (elements.totalCost) elements.totalCost.textContent = formatNumber(data.TotalStdCost, false, 2);
            if (elements.totalRevenue) elements.totalRevenue.textContent = formatNumber(data.TotalStdRevenue, false, 2);
            if (elements.gpValue) elements.gpValue.textContent = formatNumber(gp, false, 2);
            if (elements.gpPercent) elements.gpPercent.textContent = formatNumber(data.PercentGPStd, true, 1);
        } else {
             console.warn("Cost summary API failed:", result.message);
             Object.values(elements).forEach(el => {
                 if(el) el.textContent = formatNumber(0, el.classList.contains('percentage'), el.classList.contains('percentage') ? 1: 2);
             });
        }
    } catch (error) {
        console.error("Failed fetch/render cost summary:", error);
        const errorHtml = '<span class="text-danger">Error</span>';
        Object.values(elements).forEach(el => { if(el && !el.classList.contains('percentage')) el.innerHTML = errorHtml; });
    } finally {
        toggleLoadingState?.(costCardElement, false);
    }
}


function startAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        console.log('Auto-updating dashboard data...');
        handleFilterChange();
    }, 60000); // Update every 60 seconds
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
    const urlLine = params.get("line");
    const line = urlLine ? urlLine : "ASSEMBLY";
    const model = params.get("model");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    // Fetch filters once
    try {
        const response = await fetch("api/get_dashboard_filters.php");
        const result = await response.json();
        if (result.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), result.data.lines || [], "Lines", line);
            populateSelectWithOptions(document.getElementById("modelFilter"), result.data.models || [], "Models", model);
        } else {
             console.error("Failed to populate filters:", result.message);
        }
    } catch (err) {
        console.error("Error fetching filters:", err);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // Get today's date YYYY-MM-DD

    document.getElementById("startDate").value = startDate || todayStr; // Use URL value or default to today
    document.getElementById("endDate").value = endDate || todayStr;    // Use URL value or default to today

    // Trigger initial data load for all components
    handleFilterChange();
}

/**
 * Main function to trigger data fetching for all dashboard components based on current filters.
 */
function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    // Update URL without reloading
    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    console.log(`[${new Date().toLocaleTimeString()}] Fetching dashboard data (Hourly Sparklines)...`);

    // --- Call fetch/render functions from other script files ---

    // ✅ [แก้ไข] 1. เรียก Pie Charts (Real-Time)
    fetchAndRenderPieCharts?.();           // From  OEE_OEEchart.js

    // ✅ [แก้ไข] 2. เรียก Line Chart (Min 30 days)
    fetchAndRenderLineCharts?.();       // From  OEE_OEEchart.js
    
    // ✅ [แก้ไข 3/3] 3. เรียก Sparklines (Hourly 24h)
    fetchAndRenderHourlySparklines?.(); // From  OEE_OEEchart.js

    // 4. เรียกฟังก์ชันอื่นๆ (เหมือนเดิม)
    fetchAndRenderBarCharts?.();        // From OEE_barchart.js

    if (typeof isLoggedIn !== 'undefined' && isLoggedIn) {
        fetchAndRenderCostSummary();        // From this file
    }      

    fetchAndRenderDailyProductionChart?.(); // From OEE_production_chart.js
}

// ===== Event Listeners Setup =====
window.addEventListener("load", async () => {
    await applyFiltersAndInitCharts(); // Populates filters AND triggers initial data load

    // Add listeners to filter controls
    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", () => {
                console.log('Filter changed by user. Fetching new data and restarting auto-update timer...');
                clearInterval(dashboardAutoUpdateInterval); // Stop current timer
                handleFilterChange(); // Fetch new data immediately
                // Restart auto-update after a delay
                setTimeout(startAutoUpdate, 60000); // Restart timer for 60 seconds
            });
        }
    });

    // Start the initial auto-update cycle
    startAutoUpdate();

});