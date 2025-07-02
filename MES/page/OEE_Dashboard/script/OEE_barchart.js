let partsBarChartInstance, stopCauseBarChartInstance;
Chart.register(ChartZoom);

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

function BarshowError(chartId, messageId) {
    const canvas = document.getElementById(chartId);
    const errorEl = document.getElementById(messageId);
    if(canvas) canvas.style.opacity = "0.2";
    if(errorEl) errorEl.style.display = "block";
}

function truncateLabel(label, maxLength = 4) {
    if (typeof label !== 'string') return '';
    if (label.length > maxLength) {
        return label.substring(0, maxLength) + '...';
    }
    return label;
}

function renderBarChart(chartInstance, ctx, labels, datasets, customOptions = {}) {
    if (chartInstance) chartInstance.destroy();

    const isStacked = customOptions.isStacked || false;
    const shouldRotateLabels = customOptions.rotateLabels || false;
    const originalLabels = customOptions.originalLabels || labels;

    const xScaleOptions = {
        stacked: isStacked,
        ticks: {
            color: '#ccc',
            autoSkip: false,
            maxRotation: shouldRotateLabels ? 45 : 0,
            minRotation: shouldRotateLabels ? 45 : 0
        },
        grid: { display: false }
    };

    if (ctx.canvas.id === 'partsBarChart') {
        xScaleOptions.categoryPercentage = 0.8;
        xScaleOptions.barPercentage = 1.0;
    }

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


function padBarData(labels, values, minCount) {
    const paddedLabels = [...labels];
    const paddedValues = [...values];

    while (paddedLabels.length < minCount) {
        paddedLabels.push("N/A");
        paddedValues.push(0);
    }

    return { labels: paddedLabels, values: paddedValues };
}

async function fetchAndRenderBarCharts() {
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

        const partDatasets = Object.entries(countTypes).map(([type, { label, color }]) => {
            return data.parts[type]
                ? { label, data: data.parts[type], backgroundColor: color, borderRadius: 1 }
                : null;
        }).filter(Boolean);

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

        const stopCauseLabels = data.stopCause.labels;
        const rawDatasets = data.stopCause.datasets;

        const causeColors = {
            'Man': '#42A5F5', 'Machine': '#FFA726', 'Method': '#66BB6A',
            'Material': '#EF5350', 'Measurement': '#AB47BC', 'Environment': '#26C6DA',
            'Other': '#BDBDBD'
        };
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

            if (foundCause) {
                targetCause = foundCause;
            }

            for (let i = 0; i < numLabels; i++) {
                consolidatedData[targetCause].data[i] += causeSet.data[i] || 0;
            }
        });

        const stopCauseDatasets = Object.values(consolidatedData)
        .filter(dataset => dataset.data.some(d => d > 0));
        
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
function getRandomColor() {
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

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