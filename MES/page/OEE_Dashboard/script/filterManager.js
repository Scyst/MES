"use strict";

let dashboardAutoUpdateInterval;

/**
 * Helper function to format numbers (currency or percentage)
 * @param {number|string|null} value The number to format
 * @param {boolean} isPercent Whether to format as percentage (adds '%')
 * @param {number} decimals Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(value, isPercent = false, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return isPercent ? '-- %' : '--'; // Return placeholder if not a valid number
    }
    const formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return isPercent ? `${formatted} %` : formatted;
}

/**
 * Fetches and renders the production cost summary data.
 */
async function fetchAndRenderCostSummary() {
    const costCard = document.getElementById('cost-summary-section')?.querySelector('.chart-card');
    if (!costCard) return; // Exit if the cost section isn't found

    costCard.classList.add('is-loading'); // Show loading bar

    // Get current filter values
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });

    // --- Selectors for the cost summary elements ---
    const elements = {
        matCost: document.getElementById('prodCostMat'),
        matPercent: document.getElementById('prodCostPercentRM'),
        dlCost: document.getElementById('prodCostDL'),
        dlPercent: document.getElementById('prodCostPercentDL'),
        ohCost: document.getElementById('prodCostOH'),
        ohPercent: document.getElementById('prodCostPercentOH'),
        totalCost: document.getElementById('prodCostTotal'),
        totalRevenue: document.getElementById('prodRevenueStd'),
        gpValue: document.getElementById('prodGPStd'), // For Gross Profit value
        gpPercent: document.getElementById('prodPercentGPStd') // For Gross Profit percentage
    };

    // --- Function to reset elements to loading state ---
    const resetElements = () => {
        const loadingHtml = '<span class="loading-indicator">Loading...</span>';
        const percentPlaceholder = '-- %';
        if (elements.matCost) elements.matCost.innerHTML = loadingHtml;
        if (elements.matPercent) elements.matPercent.textContent = percentPlaceholder;
        if (elements.dlCost) elements.dlCost.innerHTML = loadingHtml;
        if (elements.dlPercent) elements.dlPercent.textContent = percentPlaceholder;
        if (elements.ohCost) elements.ohCost.innerHTML = loadingHtml;
        if (elements.ohPercent) elements.ohPercent.textContent = percentPlaceholder;
        if (elements.totalCost) elements.totalCost.innerHTML = loadingHtml;
        if (elements.totalRevenue) elements.totalRevenue.innerHTML = loadingHtml;
        if (elements.gpValue) elements.gpValue.innerHTML = loadingHtml;
        if (elements.gpPercent) elements.gpPercent.textContent = percentPlaceholder;
    };

    resetElements(); // Reset before fetching

    try {
        const response = await fetch(`api/get_production_cost_summary.php?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            // Calculate Gross Profit value
            const gp = (data.TotalStdRevenue || 0) - (data.TotalStdCost || 0);

            // Update DOM elements with formatted values
            if (elements.matCost) elements.matCost.textContent = formatNumber(data.TotalMatCost, false, 2);
            if (elements.matPercent) elements.matPercent.textContent = formatNumber(data.PercentRM, true, 1); // Percentage usually 1 decimal
            if (elements.dlCost) elements.dlCost.textContent = formatNumber(data.TotalDLCost, false, 2);
            if (elements.dlPercent) elements.dlPercent.textContent = formatNumber(data.PercentDL, true, 1);
            if (elements.ohCost) elements.ohCost.textContent = formatNumber(data.TotalOHCost, false, 2);
            if (elements.ohPercent) elements.ohPercent.textContent = formatNumber(data.PercentOH, true, 1);
            if (elements.totalCost) elements.totalCost.textContent = formatNumber(data.TotalStdCost, false, 2);
            if (elements.totalRevenue) elements.totalRevenue.textContent = formatNumber(data.TotalStdRevenue, false, 2);
            if (elements.gpValue) elements.gpValue.textContent = formatNumber(gp, false, 2); // Display calculated GP
            if (elements.gpPercent) elements.gpPercent.textContent = formatNumber(data.PercentGPStd, true, 1);

        } else {
             console.warn("Cost summary API call failed or returned no data:", result.message);
             // Show placeholders or zero values on failure/no data
             if (elements.matCost) elements.matCost.textContent = formatNumber(0, false, 2);
             if (elements.matPercent) elements.matPercent.textContent = formatNumber(0, true, 1);
             if (elements.dlCost) elements.dlCost.textContent = formatNumber(0, false, 2);
             if (elements.dlPercent) elements.dlPercent.textContent = formatNumber(0, true, 1);
             if (elements.ohCost) elements.ohCost.textContent = formatNumber(0, false, 2);
             if (elements.ohPercent) elements.ohPercent.textContent = formatNumber(0, true, 1);
             if (elements.totalCost) elements.totalCost.textContent = formatNumber(0, false, 2);
             if (elements.totalRevenue) elements.totalRevenue.textContent = formatNumber(0, false, 2);
             if (elements.gpValue) elements.gpValue.textContent = formatNumber(0, false, 2);
             if (elements.gpPercent) elements.gpPercent.textContent = formatNumber(0, true, 1);
        }
    } catch (error) {
        console.error("Failed to fetch or render cost summary:", error);
        // Show error indication in the UI
        const errorHtml = '<span class="text-danger">Error</span>';
        if (elements.matCost) elements.matCost.innerHTML = errorHtml;
        if (elements.dlCost) elements.dlCost.innerHTML = errorHtml;
        if (elements.ohCost) elements.ohCost.innerHTML = errorHtml;
        if (elements.totalCost) elements.totalCost.innerHTML = errorHtml;
        if (elements.totalRevenue) elements.totalRevenue.innerHTML = errorHtml;
        if (elements.gpValue) elements.gpValue.innerHTML = errorHtml;
        // Keep percentages as placeholders on error
    } finally {
        costCard.classList.remove('is-loading'); // Hide loading bar
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
    selectElement.innerHTML = `<option value="">All ${label}</option>`; // Keep "All" option
    optionsArray.forEach(optionText => {
        if (!optionText) return; // Skip empty options
        const opt = document.createElement("option");
        opt.value = optionText;
        opt.textContent = optionText;
        if (optionText === selectedValue) opt.selected = true;
        selectElement.appendChild(opt);
    });
}

async function applyFiltersAndInitCharts() {
    const params = new URLSearchParams(window.location.search);
    const line = params.get("line");
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
    
    // Set dates from URL or default
    document.getElementById("startDate").value = startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default to 7 days ago
    document.getElementById("endDate").value = endDate || new Date().toISOString().split('T')[0]; // Default to today

    // Trigger initial data load for all components
    handleFilterChange();
}

function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Call all data fetching functions
    fetchAndRenderCharts?.();       // Assumes this exists in OEE_piechart.js
    fetchAndRenderLineCharts?.();   // Assumes this exists in OEE_linechart.js
    fetchAndRenderBarCharts?.();    // Assumes this exists in OEE_barchart.js
    fetchAndRenderCostSummary();    // <-- MES: Call the new cost summary function
}

// ฟังก์ชันนี้เหมือนเดิม
/*function ensureDefaultDateInputs() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = dateStr;
    });
}*/

// Event Listeners Setup
window.addEventListener("load", async () => {
    // ensureDefaultDateInputs(); // Handled by applyFiltersAndInitCharts
    await applyFiltersAndInitCharts(); // Populates filters AND triggers initial data load

    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", () => {
                console.log('Filter changed by user. Fetching new data...');
                clearInterval(dashboardAutoUpdateInterval); // Stop auto-update on manual change
                handleFilterChange(); // Fetch new data immediately
                // Optional: Restart auto-update after a delay if desired
                // setTimeout(startAutoUpdate, 60000); 
            });
        }
    });
    
    // Start auto-update only after initial load
    // startAutoUpdate(); // Consider if auto-update is truly needed or desired by default
});