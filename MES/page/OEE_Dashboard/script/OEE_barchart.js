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
 * ฟังก์ชันหลักสำหรับ Render Bar Chart (เป็นฟังก์ชันกลางที่ใช้ซ้ำได้)
 * @param {Chart} chartInstance - Instance ของ Chart เดิม (ถ้ามี)
 * @param {CanvasRenderingContext2D} ctx - Context ของ Canvas ที่จะวาดกราฟ
 * @param {string[]} labels - Array ของ Label แกน X
 * @param {object[]} datasets - Array ของ Datasets สำหรับกราฟ
 * @param {object} customOptions - Options เพิ่มเติมสำหรับปรับแต่งกราฟ
 */
function renderBarChart(chartInstance, ctx, labels, datasets, customOptions = {}) {
    //-- ทำลาย Instance ของ Chart เดิมก่อนที่จะสร้างใหม่ เพื่อป้องกัน Memory Leak --
    if (chartInstance) chartInstance.destroy();

    //-- ตั้งค่า Options พื้นฐานจาก customOptions --
    const isStacked = customOptions.isStacked || false;
    const shouldRotateLabels = customOptions.rotateLabels || false;
    const originalLabels = customOptions.originalLabels || labels; //-- เก็บ Label เดิมไว้ใช้ใน Tooltip --

    //-- กำหนด Options สำหรับแกน X --
    const xScaleOptions = {
        stacked: isStacked,
        ticks: {
            color: '#ccc',
            autoSkip: false, //-- แสดงทุก Label --
            maxRotation: shouldRotateLabels ? 45 : 0, //-- หมุน Label หากจำเป็น --
            minRotation: shouldRotateLabels ? 45 : 0
        },
        grid: { display: false }
    };
    
    //-- ปรับแต่งความหนาของแท่งกราฟเฉพาะสำหรับ partsBarChart --
    if (ctx.canvas.id === 'partsBarChart') {
        xScaleOptions.categoryPercentage = 0.8;
        xScaleOptions.barPercentage = 1.0;
    }

    //-- สร้าง Chart ใหม่ --
    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#ccc' }
                },
                title: { display: false },
                //-- ปรับแต่ง Tooltip (ข้อความที่แสดงเมื่อเอาเมาส์ไปชี้) --
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        //-- แสดง Label ตัวเต็มในหัวข้อของ Tooltip --
                        title: function(tooltipItems) {
                            if (tooltipItems.length > 0) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                return originalLabels[dataIndex]; 
                            }
                            return '';
                        },
                        //-- แสดงผลรวมของ Stacked Bar ในส่วนท้ายของ Tooltip --
                        footer: (tooltipItems) => {
                            if (!isStacked) return '';
                            let sum = 0;
                            tooltipItems.forEach(item => {
                                sum += item.parsed.y || 0;
                            });
                            return 'Total: ' + sum.toLocaleString();
                        }
                    }
                },
                //-- ตั้งค่าการซูมและแพน --
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            },
            layout: { padding: 10 },
            //-- ตั้งค่าแกน X และ Y --
            scales: {
                x: xScaleOptions,
                y: {
                    beginAtZero: true,
                    stacked: isStacked,
                    ticks: { color: '#ccc' },
                    grid: { drawBorder: false, color: '#444' }
                }
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
    try {
        hideErrors();

        //-- ดึงค่า Filter ปัจจุบัน --
        const startDate = document.getElementById("startDate")?.value || '';
        const endDate = document.getElementById("endDate")?.value || '';
        const line = document.getElementById("lineFilter")?.value || '';
        const model = document.getElementById("modelFilter")?.value || '';

        //-- เรียก API เพื่อดึงข้อมูล --
        const params = new URLSearchParams({ startDate, endDate, line, model });
        const response = await fetch(`../../api/OEE_Dashboard/get_oee_barchart.php?${params.toString()}`);
        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.message || "Failed to fetch bar chart data.");
        }
        
        const data = responseData.data;
        
        //-- ส่วนที่ 1: ประมวลผลและ Render "Parts Bar Chart" --
        const originalPartLabels = data.parts.labels;
        const truncatedPartLabels = originalPartLabels.map(label => truncateLabel(label));

        const countTypes = {
            FG:     { label: "Good",   color: "#00C853" },
            NG:     { label: "NG",     color: "#FF5252" },
            HOLD:   { label: "Hold",   color: "#FFD600" },
            REWORK: { label: "Rework", color: "#2979FF" },
            SCRAP:  { label: "Scrap",  color: "#9E9E9E" },
            ETC:    { label: "ETC",    color: "#AA00FF" }
        };

        //-- แปลงข้อมูลจาก API ให้อยู่ในรูปแบบ Datasets ของ Chart.js --
        const partDatasets = Object.entries(countTypes).map(([type, { label, color }]) => {
            return data.parts[type]
                ? { label, data: data.parts[type], backgroundColor: color, borderRadius: 1 }
                : null;
        }).filter(Boolean); //-- กรองค่า null ออก --

        partsBarChartInstance = renderBarChart(
            partsBarChartInstance,
            document.getElementById("partsBarChart").getContext("2d"),
            truncatedPartLabels,
            partDatasets,
            { 
                isStacked: true, 
                rotateLabels: originalPartLabels.length > 8,
                originalLabels: originalPartLabels
            }
        );

        //-- ส่วนที่ 2: ประมวลผลและ Render "Stop Cause Bar Chart" --
        const stopCauseLabels = data.stopCause.labels;
        const rawDatasets = data.stopCause.datasets;

        //-- จัดกลุ่ม Cause ที่หลากหลายให้เป็นกลุ่มมาตรฐาน (Man, Machine, etc.) --
        const causeColors = {
            'Man': '#42A5F5', 'Machine': '#FFA726', 'Method': '#66BB6A',
            'Material': '#EF5350', 'Measurement': '#AB47BC', 'Environment': '#26C6DA',
            'Other': '#BDBDBD'
        };
        const standardCauses = Object.keys(causeColors);
        const consolidatedData = {};
        const numLabels = stopCauseLabels.length;

        //-- เตรียมโครงสร้างข้อมูลสำหรับแต่ละกลุ่มมาตรฐาน --
        standardCauses.forEach(cause => {
            consolidatedData[cause] = {
                label: cause,
                data: new Array(numLabels).fill(0),
                backgroundColor: causeColors[cause],
                borderRadius: 1
            };
        });

        //-- วนลูปข้อมูลดิบจาก API เพื่อรวมยอดเข้ากลุ่มมาตรฐาน --
        rawDatasets.forEach(causeSet => {
            let targetCause = 'Other'; //-- ค่าเริ่มต้นคือ 'Other' --
            const foundCause = standardCauses.find(sc => sc.toLowerCase() === causeSet.label.toLowerCase());

            if (foundCause) {
                targetCause = foundCause; //-- หากพบในกลุ่มมาตรฐาน ให้ใช้กลุ่มนั้น --
            }

            //-- เพิ่มข้อมูลเข้าไปในกลุ่มที่ถูกต้อง --
            for (let i = 0; i < numLabels; i++) {
                consolidatedData[targetCause].data[i] += causeSet.data[i] || 0;
            }
        });

        //-- สร้าง Datasets สุดท้ายโดยกรองกลุ่มที่ไม่มีข้อมูลออก --
        const stopCauseDatasets = Object.values(consolidatedData)
        .filter(dataset => dataset.data.some(d => d > 0));
        
        //-- กราฟจะเป็นแบบ Stacked ก็ต่อเมื่อไม่ได้เลือก Filter Line --
        const shouldStackStopCauseChart = !line;

        stopCauseBarChartInstance = renderBarChart(
            stopCauseBarChartInstance,
            document.getElementById("stopCauseBarChart").getContext("2d"),
            stopCauseLabels,
            stopCauseDatasets,
            { isStacked: shouldStackStopCauseChart }
        );

    } catch (err) {
        console.error("Bar chart fetch failed:", err);
        BarshowError('partsBarChart', 'partsBarError');
        BarshowError('stopCauseBarChart', 'stopCauseBarError');
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