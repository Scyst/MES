"use strict";
let dashboardAutoUpdateInterval;

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

            // แสดงเวลาที่อัปเดตล่าสุด
            safeSetText('lastUpdate', new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }));

            // 1. REVENUE
            safeSetText('prodRevenueStd', formatNumber(d.TotalStdRevenue, false, 2));
            
            // 2. COGS & CPU
            safeSetText('prodCostTotal', formatNumber(d.TotalStdCost, false, 2));
            safeSetText('valCPU', formatNumber(d.CostPerUnit, false, 2));
            
            // 3. MATERIAL
            safeSetText('prodCostMat', formatNumber(d.TotalMatCost, false, 2));
            safeSetText('prodCostPercentRM', formatNumber(d.PercentRM, true, 1));
            safeSetText('valScrapCost', formatNumber(d.ScrapCostValue, false, 2));
            
            // 4. LABOR
            safeSetText('prodCostDL', formatNumber(d.TotalDLCost, false, 2));
            safeSetText('valDL', formatNumber(d.TotalActualDL || 0, false, 2));
            safeSetText('valOT', formatNumber(d.TotalActualOT || 0, false, 2));
            safeSetText('valLaborEff', formatNumber(d.LaborEfficiency, false, 1) + 'x');
            
            // 5. OVERHEAD
            safeSetText('prodCostOH', formatNumber(d.TotalOHCost, false, 2));
            safeSetText('prodCostPercentOH', formatNumber(d.PercentOH, true, 1));
            
            // 6. GROSS PROFIT
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
            // 1. สร้าง Dropdown ปกติไปก่อน (ยังไม่ต้องยัดค่า Default ตรงนี้)
            populateSelectWithOptions(document.getElementById("lineFilter"), json.data.lines, "Lines", "");
            populateSelectWithOptions(document.getElementById("modelFilter"), json.data.models, "Models", "");

            // ⭐️ 2. สไนเปอร์ค้นหา: วนลูปหาคำว่า "assembly" (ไม่สนตัวเล็กตัวใหญ่) แล้วบังคับเลือก!
            const lineSelect = document.getElementById("lineFilter");
            if (lineSelect) {
                for (let i = 0; i < lineSelect.options.length; i++) {
                    // ถ้าในชื่อตัวเลือกมีคำว่า assembly ให้เลือกทันทีแล้วหยุดค้นหา
                    if (lineSelect.options[i].value.toLowerCase().includes("assembly")) {
                        lineSelect.selectedIndex = i;
                        break; 
                    }
                }
            }
        }
    } catch (err) { console.error(err); }

    // ⭐️ จัดการวันที่เป็น "วันนี้"
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    if (startDateInput) startDateInput.value = todayStr;
    if (endDateInput) endDateInput.value = todayStr;

    // ⭐️ ล้าง URL และเรียกข้อมูล
    window.history.replaceState({}, '', window.location.pathname);
    handleFilterChange();
}

setInterval(() => {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        // อัปเดตเวลาทุก 1 วินาที
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

    // Call renders
    if(typeof fetchAndRenderPieCharts === 'function') fetchAndRenderPieCharts();
    if(typeof fetchAndRenderLineCharts === 'function') fetchAndRenderLineCharts();
    if(typeof fetchAndRenderBarAndTable === 'function') fetchAndRenderBarAndTable();
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