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
        populateDropdown("lineFilter", "https://oem.sncformer.com/iot-toolbox/sandbox-b9/oee_dashboard/oee_dashboard-main/OEE_Dashboard/api/OEE_Dashboard/get_lines.php", line),
        populateDropdown("modelFilter", "https://oem.sncformer.com/iot-toolbox/sandbox-b9/oee_dashboard/oee_dashboard-main/OEE_Dashboard/api/OEE_Dashboard/get_models.php", model)
    ]);

    if (startDate) document.getElementById("startDate").value = startDate;
    if (endDate) document.getElementById("endDate").value = endDate;

    fetchAndRenderCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarCharts?.();
}

function handleFilterChange() {
    const startDate = document.getElementById("startDate")?.value || '';
    const endDate = document.getElementById("endDate")?.value || '';
    const line = document.getElementById("lineFilter")?.value || '';
    const model = document.getElementById("modelFilter")?.value || '';

    const params = new URLSearchParams({ startDate, endDate, line, model });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    fetchAndRenderCharts?.();
    fetchAndRenderLineCharts?.();
    fetchAndRenderBarCharts?.();
}

function ensureDefaultDateInputs() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(':').slice(0, 2).join(':');

    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = dateStr;
    });

    document.querySelectorAll('input[type="time"]').forEach(input => {
        if (!input.value) input.value = timeStr;
    });
}

function formatMinutes(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toLocaleString()}h ${mins.toLocaleString()}m`;
}

window.addEventListener("load", () => {
    ensureDefaultDateInputs();

    ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", handleFilterChange);
    });

    applyFiltersAndInitCharts();
});