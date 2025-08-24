"use strict";

let dashboardAutoUpdateInterval;

function startAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        console.log('Auto-updating dashboard data...');
        handleFilterChange();
    }, 60000);
}

async function populateDropdown(id, url, selectedValue = "") {
    const select = document.getElementById(id);
    if (!select) return;
    try {
        const res = await fetch(url);
        const responseData = await res.json();
        if (!responseData.success) {
            console.error(`API call for ${id} failed:`, responseData.message);
            return;
        }
        const data = responseData.data;
        const label = id === "lineFilter" ? "Lines" : "Models";
        select.innerHTML = `<option value="">All ${label}</option>`;
        data.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option;
            opt.textContent = option;
            if (option === selectedValue) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error(`Failed to populate ${id}:`, err);
    }
}

async function applyFiltersAndInitCharts() {
    const params = new URLSearchParams(window.location.search);
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const line = params.get("line");
    const model = params.get("model");

    await Promise.all([
        populateDropdown("lineFilter", "api/get_lines.php", line),
        populateDropdown("modelFilter", "api/get_models.php", model)
    ]);

    if (startDate) document.getElementById("startDate").value = startDate;
    if (endDate) document.getElementById("endDate").value = endDate;

    handleFilterChange();
}

// ★★★ ทำให้ handleFilterChange เป็นแค่ผู้ส่งสาร ★★★
function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // แค่สั่งให้กราฟแต่ละตัวทำงาน ไม่ต้องมี try...catch ที่นี่
    fetchAndRenderCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarCharts?.();
}

function ensureDefaultDateInputs() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = dateStr;
    });
}

window.addEventListener("load", async () => {
    ensureDefaultDateInputs();
    await applyFiltersAndInitCharts();

    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", () => {
                console.log('User changed filter. Restarting auto-update timer.');
                clearInterval(dashboardAutoUpdateInterval);
                handleFilterChange();
                setTimeout(startAutoUpdate, 10000);
            });
        }
    });
    
    startAutoUpdate();
});