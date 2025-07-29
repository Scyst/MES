//-- ตัวแปรสำหรับเก็บ Instance ของ Chart เพื่อให้สามารถทำลายและสร้างใหม่ได้ --
let partsBarChartInstance, stopCauseBarChartInstance;
//-- ลงทะเบียน Plugin สำหรับการซูมและแพนกราฟ --
Chart.register(ChartZoom);

//-- ฟังก์ชันสำหรับซ่อนข้อความ Error และทำให้กราฟกลับมาแสดงผลปกติ --
function hideErrors() {
    ["partsBarError", "stopCauseBarError"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    ["partsBarChart", "stopCauseBarChart"].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) canvas.style.opacity = "1";
    });
}

//-- ฟังก์ชันสำหรับแสดงข้อความ Error บนพื้นที่ของกราฟ --
function BarshowError(chartId, messageId) {
    const canvas = document.getElementById(chartId);
    const errorEl = document.getElementById(messageId);
    if(canvas) canvas.style.opacity = "0.2"; //-- ทำให้กราฟจางลง --
    if(errorEl) errorEl.style.display = "block"; //-- แสดงข้อความ Error --
}

//-- ฟังก์ชันสำหรับตัดข้อความ (Label) ที่ยาวเกินไป --
function truncateLabel(label, maxLength = 4) {
    if (typeof label !== 'string') return '';
    if (label.length > maxLength) {
        return label.substring(0, maxLength) + '...';
    }
    return label;
}

/**
 * ฟังก์ชันหลักสำหรับ Render หรือ Update Bar Chart
 * @param {Chart} chartInstance - Instance ของ Chart เดิม (ถ้ามี)
 * @param {CanvasRenderingContext2D} ctx - Context ของ Canvas ที่จะวาดกราฟ
 * @param {string[]} labels - Array ของ Label แกน X
 * @param {object[]} datasets - Array ของ Datasets สำหรับกราฟ
 * @param {object} customOptions - Options เพิ่มเติมสำหรับปรับแต่งกราฟ
 * @returns {Chart} Instance ของ Chart ที่สร้างหรืออัปเดตแล้ว
 */
function renderBarChart(chartInstance, ctx, labels, datasets, customOptions = {}) {
    // --- ส่วนที่แก้ไข ---
    // ถ้า Chart มีอยู่แล้ว ให้อัปเดตข้อมูลแล้วเรียก .update()
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets = datasets; // ส่ง datasets ทั้งชุดเข้าไปใหม่
        chartInstance.options.plugins.tooltip.callbacks.title = function(tooltipItems) {
            // อัปเดต originalLabels ใน Tooltip ด้วย
            if (tooltipItems.length > 0) {
                const dataIndex = tooltipItems[0].dataIndex;
                return (customOptions.originalLabels || labels)[dataIndex]; 
            }
            return '';
        };
        chartInstance.update();
        return chartInstance; // คืนค่า instance เดิม
    }
    // --- สิ้นสุดส่วนที่แก้ไข ---

    const isStacked = customOptions.isStacked || false;
    const shouldRotateLabels = customOptions.rotateLabels || false;
    const originalLabels = customOptions.originalLabels || labels;
    const unitLabel = customOptions.unitLabel || '';

    datasets.forEach(ds => {
        ds.maxBarThickness = 250;
    });

    const xScaleOptions = {
        stacked: isStacked,
        ticks: { color: '#ccc', autoSkip: false, maxRotation: shouldRotateLabels ? 45 : 0, minRotation: shouldRotateLabels ? 45 : 0 },
        grid: { display: false }
    };

    // ถ้า Chart ยังไม่มี ให้สร้างใหม่
    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800 },
            plugins: {
                legend: { display: true, labels: { color: '#ccc' } },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            if (tooltipItems.length > 0) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                return originalLabels[dataIndex]; 
                            }
                            return '';
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += context.parsed.y.toLocaleString() + ' ' + unitLabel;
                            return label;
                        },
                        footer: (tooltipItems) => {
                            if (!isStacked) return '';
                            let sum = 0;
                            tooltipItems.forEach(item => { sum += item.parsed.y || 0; });
                            return 'Total: ' + sum.toLocaleString() + ' ' + unitLabel;
                        }
                    }
                },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            layout: { padding: 5 },
            scales: {
                x: xScaleOptions,
                y: { beginAtZero: true, stacked: isStacked, ticks: { color: '#ccc' }, grid: { drawBorder: false, color: '#444' } }
            }
        }
    });
}

/**
 * ฟังก์ชันสำหรับเติมข้อมูลในกราฟให้มีจำนวนขั้นต่ำตามที่กำหนด
 * @param {string[]} labels - Array ของ Labels
 * @param {number[]} values - Array ของ Values
 * @param {number} minCount - จำนวนขั้นต่ำที่ต้องการ
 */
function padBarData(labels, values, minCount) {
    const paddedLabels = [...labels];
    const paddedValues = [...values];

    while (paddedLabels.length < minCount) {
        paddedLabels.push("N/A");
        paddedValues.push(0);
    }

    return { labels: paddedLabels, values: paddedValues };
}

/**
 * ฟังก์ชันหลักสำหรับดึงข้อมูลและ Render Bar Chart ทั้งหมด
 */
async function fetchAndRenderBarCharts() {
    //showSpinner();
    try {
        hideErrors();

        const startDate = document.getElementById("startDate")?.value || '';
        const endDate = document.getElementById("endDate")?.value || '';
        const line = document.getElementById("lineFilter")?.value || '';
        const model = document.getElementById("modelFilter")?.value || '';

        const params = new URLSearchParams({ startDate, endDate, line, model });
        const response = await fetch(`../../api/OEE_Dashboard/get_oee_barchart.php?${params.toString()}`);
        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.message || "Failed to fetch bar chart data.");
        }
        
        const data = responseData.data;
        
        // --- ส่วนที่ 1: ประมวลผลและ Render "Parts Bar Chart" ---
        const partsCtx = document.getElementById("partsBarChart").getContext("2d");
        
        if (!data.parts || data.parts.labels.length === 0) {
            partsBarChartInstance = renderBarChart(
                partsBarChartInstance, partsCtx, ['N/A'], [{ label: 'No Data', data: [0], backgroundColor: '#424242' }]
            );
        } else {
            const originalPartLabels = data.parts.labels;
            const shouldTruncateParts = originalPartLabels.length > 8;
            const truncatedPartLabels = shouldTruncateParts ? originalPartLabels.map(label => truncateLabel(label)) : originalPartLabels;
            const countTypes = {
                FG: { label: "Good", color: "#00C853" },
                NG: { label: "NG", color: "#FF5252" },
                HOLD: { label: "Hold", color: "#FFD600" },
                REWORK: { label: "Rework", color: "#2979FF" },
                SCRAP: { label: "Scrap", color: "#9E9E9E" },
                ETC: { label: "ETC", color: "#AA00FF" }
            };
            const partDatasets = Object.entries(countTypes).map(([type, { label, color }]) => {
                return data.parts[type]
                    ? { label, data: data.parts[type], backgroundColor: color, borderRadius: 1 }
                    : null;
            }).filter(Boolean);

            partsBarChartInstance = renderBarChart(
                partsBarChartInstance,
                partsCtx,
                truncatedPartLabels,
                partDatasets,
                { 
                    isStacked: true, 
                    rotateLabels: shouldTruncateParts,
                    originalLabels: originalPartLabels,
                    unitLabel: 'pcs'
                }
            );
        }

        // --- ส่วนที่ 2: ประมวลผลและ Render "Stop Cause Bar Chart" ---
        const stopCauseCtx = document.getElementById("stopCauseBarChart").getContext("2d");

        if (!data.stopCause || data.stopCause.labels.length === 0) {
            stopCauseBarChartInstance = renderBarChart(
                stopCauseBarChartInstance, stopCauseCtx, ['N/A'], [{ label: 'No Data', data: [0], backgroundColor: '#424242' }]
            );
        } else {
            // ... ส่วน Logic การรวมข้อมูล Stop Cause เหมือนเดิม ...
            const stopCauseLabels = data.stopCause.labels;
            const rawDatasets = data.stopCause.datasets;
            const causeColors = { 'Man': '#42A5F5', 'Machine': '#FFA726', 'Method': '#66BB6A', 'Material': '#EF5350', 'Measurement': '#AB47BC', 'Environment': '#26C6DA', 'Other': '#BDBDBD' };
            const standardCauses = Object.keys(causeColors);
            const consolidatedData = {};
            const numLabels = stopCauseLabels.length;
            standardCauses.forEach(cause => {
                consolidatedData[cause] = {
                    label: cause,
                    data: new Array(numLabels).fill(0),
                    backgroundColor: causeColors[cause],
                    borderRadius: 1
                };
            });
            rawDatasets.forEach(causeSet => {
                let targetCause = 'Other';
                const foundCause = standardCauses.find(sc => sc.toLowerCase() === causeSet.label.toLowerCase());
                if (foundCause) { targetCause = foundCause; }
                for (let i = 0; i < numLabels; i++) {
                    consolidatedData[targetCause].data[i] += causeSet.data[i] || 0;
                }
            });
            const stopCauseDatasets = Object.values(consolidatedData).filter(dataset => dataset.data.some(d => d > 0));
            const shouldStackStopCauseChart = !line;

            stopCauseBarChartInstance = renderBarChart(
                stopCauseBarChartInstance,
                stopCauseCtx,
                stopCauseLabels,
                stopCauseDatasets,
                { 
                    isStacked: shouldStackStopCauseChart,
                    unitLabel: 'min' // แก้ไข: เพิ่มหน่วย "นาที"
                }
            );
        }
    } catch (err) {
        console.error("Bar chart fetch failed:", err);
        BarshowError('partsBarChart', 'partsBarError');
        BarshowError('stopCauseBarChart', 'stopCauseBarError');
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

//-- ฟังก์ชันสำหรับสุ่มสี (ไม่ถูกใช้ในโค้ดส่วนนี้) --
function getRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

//-- ฟังก์ชันสำหรับอัปเดต URL ด้วยค่า Filter ปัจจุบัน --
function updateURLParamsFromFilters() {
    const params = new URLSearchParams();
    const startDate = document.getElementById("startDate")?.value;
    const endDate = document.getElementById("endDate")?.value;
    const line = document.getElementById("lineFilter")?.value;
    const model = document.getElementById("modelFilter")?.value;

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (line) params.set("line", line);
    if (model) params.set("model", model);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
}

//-- ฟังก์ชันสำหรับดึงข้อมูลมาใส่ใน Dropdown --
async function populateDropdown(selectId, apiPath, selectedValue = '') {
    try {
        const res = await fetch(apiPath);
        const data = await res.json();
        const select = document.getElementById(selectId);
        if (!select) return;

        const label = selectId === 'lineFilter' ? 'Lines' : 'Models';
        select.innerHTML = `<option value="">All ${label}</option>`;

        data.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });

        if (selectedValue) select.value = selectedValue;

    } catch (err) {
        console.error(`Failed to load ${selectId} options:`, err);
    }
}