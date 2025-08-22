// script/OEE_sparkline.js
"use strict";

function renderSparkline(canvasId, data, mainColor) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // ทำลาย instance เก่าทิ้ง (ถ้ามี) เพื่อป้องกัน memory leak
    if (window.sparklineCharts && window.sparklineCharts[canvasId]) {
        window.sparklineCharts[canvasId].destroy();
    }

    const labels = data.map(d => d.date);
    const values = data.map(d => d.value);

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                borderColor: mainColor,
                borderWidth: 2.5, // <<< แก้ไข: ทำให้เส้นหนาขึ้น
                pointRadius: 0, 
                tension: 0.4,
                fill: true, // <<< เพิ่ม: เปิดใช้งานพื้นที่ใต้กราฟ
                backgroundColor: mainColor + '20' // <<< เพิ่ม: กำหนดสีพื้นหลังแบบโปร่งใส
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // ซ่อน Legend
                tooltip: { enabled: false } // ปิด Tooltip
            },
            scales: {
                x: { display: false }, // ซ่อนแกน X
                y: { display: false } // ซ่อนแกน Y
            }
        }
    });

    // เก็บ instance ใหม่ไว้
    if (!window.sparklineCharts) {
        window.sparklineCharts = {};
    }
    window.sparklineCharts[canvasId] = chart;
}