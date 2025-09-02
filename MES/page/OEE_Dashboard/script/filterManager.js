"use strict";

let dashboardAutoUpdateInterval;

function startAutoUpdate() {
    clearInterval(dashboardAutoUpdateInterval);
    dashboardAutoUpdateInterval = setInterval(() => {
        console.log('Auto-updating dashboard data...');
        handleFilterChange();
    }, 60000);
}

// ✅ ฟังก์ชัน Helper ใหม่สำหรับเติมข้อมูลลงใน Dropdown
function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">All ${label}</option>`;
    optionsArray.forEach(optionText => {
        const opt = document.createElement("option");
        opt.value = optionText;
        opt.textContent = optionText;
        if (optionText === selectedValue) opt.selected = true;
        selectElement.appendChild(opt);
    });
}

// ✅ แก้ไขฟังก์ชันนี้ให้เรียกใช้ API ใหม่เพียงครั้งเดียว
async function applyFiltersAndInitCharts() {
    const params = new URLSearchParams(window.location.search);
    const line = params.get("line");
    const model = params.get("model");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    // เรียก API ใหม่แค่ครั้งเดียวเพื่อดึงข้อมูล Filter ทั้งหมด
    try {
        const response = await fetch("api/get_dashboard_filters.php");
        const result = await response.json();
        if (result.success) {
            populateSelectWithOptions(document.getElementById("lineFilter"), result.data.lines, "Lines", line);
            populateSelectWithOptions(document.getElementById("modelFilter"), result.data.models, "Models", model);
        }
    } catch (err) {
        console.error("Failed to populate filters:", err);
    }
    
    // ตั้งค่าวันที่จาก URL (ถ้ามี)
    if (startDate) document.getElementById("startDate").value = startDate;
    if (endDate) document.getElementById("endDate").value = endDate;

    // สั่งให้โหลดข้อมูลกราฟ
    handleFilterChange();
}

// ฟังก์ชันนี้เหมือนเดิม
function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // สั่งให้กราฟแต่ละตัวทำงาน
    fetchAndRenderCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarCharts?.();
}

// ฟังก์ชันนี้เหมือนเดิม
function ensureDefaultDateInputs() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = dateStr;
    });
}

// ส่วน Event Listener เหมือนเดิม
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