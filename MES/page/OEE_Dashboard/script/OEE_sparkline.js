// script/OEE_sparkline.js
"use strict";

const sparklineInstances = {};

function renderSparkline(canvasId, data, color) {
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) return;

    const labels = data.map(d => d.date);
    const values = data.map(d => d.value);

    if (sparklineInstances[canvasId]) {
        const chart = sparklineInstances[canvasId];
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update(); 
    } else {
        sparklineInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    borderColor: color,
                    backgroundColor: color + '33',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }
}