// script/OEE_piechart.js
"use strict";

const OEE_TARGETS = {
    oee: 85.0,
    quality: 99.0,
    performance: 90.0,
    availability: 95.0
};

const charts = { oee: null, quality: null, performance: null, availability: null };

/**
 * Toggles the loading state of a chart card.
 * @param {string} elementId - The ID of an element inside the card (like the canvas).
 * @param {boolean} isLoading - True to show loading, false to hide.
 */
function toggleLoadingState(elementId, isLoading) {
    const element = document.getElementById(elementId);
    const card = element ? element.closest('.chart-card') : null;
    if (card) {
        if (isLoading) {
            card.classList.add('is-loading');
        } else {
            card.classList.remove('is-loading');
        }
    }
}

function toggleNoDataMessage(canvasId, show) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        wrapper.classList.remove('has-error');
        show ? wrapper.classList.add('has-no-data') : wrapper.classList.remove('has-no-data');
    }
}

function toggleErrorMessage(canvasId, show) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas ? canvas.closest('.chart-wrapper') : null;
    if (wrapper) {
        wrapper.classList.remove('has-no-data');
        show ? wrapper.classList.add('has-error') : wrapper.classList.remove('has-error');
    }
}

/**
 * Helper function to get CSS variable values.
 * @param {string} varName - The name of the CSS variable.
 * @returns {string} The color value.
 */
function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getChartThemeColors() {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    if (theme === 'dark') {
        return {
            centerTextColor: '#dee2e6', lossBgColor: '#495057',
            successColor: '#66bb6a', warningColor: '#ffa726',
            secondaryTextColor: '#adb5bd'
        };
    } else {
        return {
            centerTextColor: '#212529', lossBgColor: '#e9ecef',
            successColor: '#198754', warningColor: '#dc3545',
            secondaryTextColor: '#6c757d'
        };
    }
}

function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${h}h ${m}m`;
}

function updateInfoBox(infoId, lines, targetValue) {
    const infoBox = document.getElementById(infoId);
    if (!infoBox) return;

    const gridHtml = lines.map(line => {
        const parts = line.split(':');
        const label = parts[0] ? parts[0].trim() : '';
        const value = parts[1] ? parts[1].trim() : '';

        return `
            <div class="info-label">${label}</div>
            <div class="info-value">${value}</div>
        `;
    }).join('');

    infoBox.innerHTML = `<div class="info-grid">${gridHtml}</div>`;

    const targetElement = document.getElementById(`${infoId}-target`);
    if (targetElement) {
        const currentValueText = infoBox.querySelector('.info-value b')?.textContent || '0%';
        const currentValue = parseFloat(currentValueText.replace('%', ''));

        if (!isNaN(currentValue) && targetValue) {
            const percentage = ((currentValue / targetValue) * 100).toFixed(1);
            let colorClass = 'text-danger';
            if (percentage >= 100) {
                colorClass = 'text-success';
            } else if (percentage >= 85) {
                colorClass = 'text-warning';
            }
            targetElement.innerHTML = `vs Target: <span class="${colorClass}">${percentage}%</span>`;
        } else {
            targetElement.innerHTML = '';
        }
    }
}


function renderSimplePieChart(chartName, ctx, labels, data, colors, targetValue, secondaryText = '', hasData = true) {
    if (!ctx) return;
    const themeColors = getChartThemeColors();
    const value = data[0];
    const centerTextColor = value >= targetValue ? themeColors.successColor : themeColors.warningColor;

    const chartConfig = {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, cutout: '80%', borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: true, animation: { duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%` } },
                centerText: {
                    color: centerTextColor,
                    secondaryColor: themeColors.secondaryTextColor,
                    secondaryText: secondaryText,
                    shouldDraw: hasData
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw(chart) {
                const opts = chart.options.plugins.centerText;

                if (!opts.shouldDraw) {
                    return;
                }

                const { width, height, ctx } = chart;
                ctx.restore();

                const mainFontSize = (height / 140).toFixed(2);
                ctx.font = `900 ${mainFontSize}em sans-serif`;
                ctx.textBaseline = "middle";
                const mainText = `${chart.data.datasets[0].data[0].toFixed(1)}%`;
                const mainTextX = Math.round((width - ctx.measureText(mainText).width) / 2);
                const mainTextY = height / 2 - (opts.secondaryText ? 10 : 0);
                ctx.fillStyle = opts.color || '#000';
                ctx.fillText(mainText, mainTextX, mainTextY);

                if (opts.secondaryText) {
                    const secondaryFontSize = (height / 280).toFixed(2);
                    ctx.font = `400 ${secondaryFontSize}em sans-serif`;
                    const secondaryText = opts.secondaryText;
                    const secondaryTextX = Math.round((width - ctx.measureText(secondaryText).width) / 2);
                    const secondaryTextY = mainTextY + (height * 0.15);
                    ctx.fillStyle = opts.secondaryColor || '#888';
                    ctx.fillText(secondaryText, secondaryTextX, secondaryTextY);
                }
                ctx.save();
            }
        }]
    };

    if (charts[chartName]) {
        charts[chartName].data.labels = labels;
        charts[chartName].data.datasets[0].data = data;
        charts[chartName].options.plugins.centerText.color = centerTextColor;
        charts[chartName].options.plugins.centerText.secondaryText = secondaryText;
        charts[chartName].options.plugins.centerText.shouldDraw = hasData;
        charts[chartName].update();
    } else {
        charts[chartName] = new Chart(ctx, chartConfig);
    }
}

// --- [แก้ไข] แยก Function สำหรับ Fetch Sparkline โดยเฉพาะ ---
async function fetchAndRenderSparklines(startDate, endDate, line, model) {
    const minSparklineDays = 7;
    let apiStartDateStr = startDate; // Start with the provided start date

    try {
        const endDt = new Date(endDate);
        const startDt = new Date(startDate);

        const diffTime = Math.abs(endDt - startDt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays < minSparklineDays && !isNaN(endDt.getTime())) {
            console.log(`Sparkline: Date range (${diffDays} days) < ${minSparklineDays}. Adjusting start date for API.`);
            const adjustedStartDate = new Date(endDt);
            adjustedStartDate.setDate(endDt.getDate() - (minSparklineDays - 1));
            apiStartDateStr = adjustedStartDate.toISOString().split('T')[0];
        }
    } catch(e) {
        console.error("Sparkline: Error parsing dates for min range check:", e);
        // Use original dates if parsing fails
        apiStartDateStr = startDate;
    }

    const params = new URLSearchParams({
        startDate: apiStartDateStr, // Use potentially adjusted start date
        endDate: endDate,
        line: line,
        model: model,
        onlySparkline: 'true' // <== [สำคัญ] เพิ่ม Flag บอก API ให้ส่งแค่ Sparkline
    });

    let sparklineData = []; // Default to empty array

    try {
        console.log(`Sparkline: Fetching data from ${apiStartDateStr} to ${endDate}`);
        const response = await fetch(`api/get_oee_piechart.php?${params.toString()}`); // Call the same API
        if (!response.ok) {
            console.error(`Sparkline API: Network response error ${response.status}`);
        } else {
            const result = await response.json();
            if (result.success && result.sparkline_data) {
                sparklineData = result.sparkline_data;
            } else {
                console.error("Sparkline API: Failed -", result.error || "No sparkline_data returned");
            }
        }
    } catch (err) {
        console.error("Sparkline API fetch failed:", err);
    }

    // Render Sparklines (even if data is empty, it will clear/show empty state)
    if (sparklineData.length > 0) {
        renderSparkline('oeeSparklineChart', sparklineData.map(d => ({date: d.date, value: d.oee})), getCssVar('--mes-chart-color-1'));
        renderSparkline('qualitySparklineChart', sparklineData.map(d => ({date: d.date, value: d.quality})), getCssVar('--mes-chart-color-2'));
        renderSparkline('performanceSparklineChart', sparklineData.map(d => ({date: d.date, value: d.performance})), getCssVar('--mes-chart-color-3'));
        renderSparkline('availabilitySparklineChart', sparklineData.map(d => ({date: d.date, value: d.availability})), getCssVar('--mes-chart-color-4'));
    } else {
         console.log("No sparkline data to render.");
         // Render empty/clear sparklines
         ['oeeSparklineChart', 'qualitySparklineChart', 'performanceSparklineChart', 'availabilitySparklineChart'].forEach(id => {
             renderSparkline(id, [], '#ccc'); // Use a neutral color for empty state
         });
    }
}
// --- [สิ้นสุด Function ใหม่] ---


async function fetchAndRenderCharts() {
    const chartIds = ["oeePieChart", "qualityPieChart", "performancePieChart", "availabilityPieChart"];
    chartIds.forEach(id => {
        toggleLoadingState(id, true);
        toggleErrorMessage(id, false);
    });

    // --- [แก้ไข] ดึงค่า Filter มาเก็บไว้ก่อน ---
    const filterStartDateStr = document.getElementById("startDate")?.value || '';
    const filterEndDateStr = document.getElementById("endDate")?.value || '';
    const filterLine = document.getElementById("lineFilter")?.value || '';
    const filterModel = document.getElementById("modelFilter")?.value || '';
    // --- [สิ้นสุดการแก้ไข] ---

    try {
        // --- [แก้ไข] API Call 1: สำหรับ Pie Charts ใช้ filter dates ตรงๆ ---
        console.log(`Pie Charts: Fetching data from ${filterStartDateStr} to ${filterEndDateStr}`);
        const pieParams = new URLSearchParams({
            startDate: filterStartDateStr,
            endDate: filterEndDateStr,
            line: filterLine,
            model: filterModel
        });
        const response = await fetch(`api/get_oee_piechart.php?${pieParams.toString()}`);
        if (!response.ok) throw new Error(`Piechart API: Network response was not ok`);

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Piechart API: API error");
        const data = result; // API นี้ส่งข้อมูลกลับมาตรงๆ

        // --- Render Pie Charts และ Info Boxes (ใช้ data จาก Call 1) ---
        const themeColors = getChartThemeColors();
        const lossColor = themeColors.lossBgColor;
        const totalLoss = Math.max(0, 100 - (data.oee || 0));
        const qualityLossRatio = Math.max(0, 1 - ((data.quality || 0) / 100));
        const performanceLossRatio = Math.max(0, 1 - ((data.performance || 0) / 100));
        const availabilityLossRatio = Math.max(0, 1 - ((data.availability || 0) / 100));
        const totalRatio = qualityLossRatio + performanceLossRatio + availabilityLossRatio;

        const oeeHasData = data.oee !== undefined && data.oee !== null;
        toggleNoDataMessage("oeePieChart", !oeeHasData || data.oee <= 0);
        renderSimplePieChart('oee', document.getElementById("oeePieChart")?.getContext("2d"),
            ['OEE', 'Loss'], [data.oee || 0, totalLoss],
            [getCssVar('--mes-chart-color-1'), lossColor], OEE_TARGETS.oee,
            '', oeeHasData && data.oee > 0
        );
         updateInfoBox("oeeInfo", [
            `OEE Loss: <b>${totalLoss.toFixed(1)} %</b>`,
            `Q Contrib: <b>${(totalRatio > 0 ? (qualityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `P Contrib: <b>${(totalRatio > 0 ? (performanceLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`,
            `A Contrib: <b>${(totalRatio > 0 ? (availabilityLossRatio / totalRatio) * totalLoss : 0).toFixed(1)} %</b>`
        ], OEE_TARGETS.oee);

        const qualityHasData = (data.actual_output || 0) > 0;
        toggleNoDataMessage("qualityPieChart", !qualityHasData);
        renderSimplePieChart('quality', document.getElementById("qualityPieChart")?.getContext("2d"),
            ['Good (FG)', 'Defects'], [data.quality || 0, Math.max(0, 100 - (data.quality || 0))],
            [getCssVar('--mes-chart-color-2'), lossColor], OEE_TARGETS.quality,
            `FG: ${(data.fg || 0).toLocaleString()} pcs`, qualityHasData
        );
        updateInfoBox("qualityInfo", [
             `Good (FG): <b>${(data.fg || 0).toLocaleString()}</b> pcs`,
             `Total Defects: <b>${(data.defects || 0).toLocaleString()}</b> pcs`,
             `&nbsp; └ Hold: <b>${(data.hold || 0).toLocaleString()}</b> pcs`,
             `&nbsp; └ Scrap: <b>${(data.scrap || 0).toLocaleString()}</b> pcs`
        ], OEE_TARGETS.quality);

        const performanceHasData = data.runtime !== undefined && data.runtime !== null && data.runtime >= 0;
        toggleNoDataMessage("performancePieChart", !performanceHasData || data.runtime === 0);
        renderSimplePieChart('performance', document.getElementById("performancePieChart")?.getContext("2d"),
            ['Performance', 'Loss'], [data.performance || 0, Math.max(0, 100 - (data.performance || 0))],
            [getCssVar('--mes-chart-color-3'), lossColor], OEE_TARGETS.performance,
            `Actual: ${(data.actual_output || 0).toLocaleString()} pcs`, performanceHasData && (data.performance || 0) > 0 // Check performance > 0
        );
         updateInfoBox("performanceInfo", [
            `Actual: <b>${(data.actual_output || 0).toLocaleString()}</b> pcs`,
            `Theo. Time: <b>${formatMinutes(data.total_theoretical_minutes || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.performance);

        const availabilityHasData = data.planned_time !== undefined && data.planned_time !== null && data.planned_time > 0;
        const runtimePercent = availabilityHasData ? Math.max(0, Math.min(100, ((data.runtime || 0) / data.planned_time) * 100)) : 0;
        const downtimePercent = 100 - runtimePercent;
        toggleNoDataMessage("availabilityPieChart", !availabilityHasData);
        renderSimplePieChart('availability', document.getElementById("availabilityPieChart")?.getContext("2d"),
            ['Runtime', 'Downtime'], [runtimePercent, downtimePercent],
            [getCssVar('--mes-chart-color-4'), lossColor], OEE_TARGETS.availability,
            `Downtime: ${formatMinutes(data.downtime || 0)}`, availabilityHasData
        );
         updateInfoBox("availabilityInfo", [
            `Planned: <b>${formatMinutes(data.planned_time || 0)}</b>`,
            `Downtime: <b>${formatMinutes(data.downtime || 0)}</b>`,
            `Runtime: <b>${formatMinutes(data.runtime || 0)}</b>`
        ], OEE_TARGETS.availability);
        // --- สิ้นสุดการ Render Pie Charts ---

        // --- [แก้ไข] เรียก Function ใหม่สำหรับ Fetch และ Render Sparklines ---
        // ใช้ filter dates เดิมส่งไปให้ Function นี้จัดการปรับวันที่เอง
        await fetchAndRenderSparklines(filterStartDateStr, filterEndDateStr, filterLine, filterModel);
        // --- [สิ้นสุดการแก้ไข] ---

    } catch (err) {
        console.error("Pie chart update failed:", err); // Keep error message specific to pie charts
        chartIds.forEach(id => toggleErrorMessage(id, true));
        // Attempt to clear/reset sparklines on pie chart error
        ['oeeSparklineChart', 'qualitySparklineChart', 'performanceSparklineChart', 'availabilitySparklineChart'].forEach(id => {
             renderSparkline(id, [], '#ccc');
        });
    } finally {
        chartIds.forEach(id => toggleLoadingState(id, false));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme change listener
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                console.log("Theme changed, re-rendering charts...");
                fetchAndRenderCharts(); // Re-render pie charts & sparklines
                fetchAndRenderLineCharts?.();
                fetchAndRenderBarCharts?.();
                fetchAndRenderDailyProductionChart?.();
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});