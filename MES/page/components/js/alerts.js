"use strict";

/**
 * ฟังก์ชันสำหรับอัปเดต UI ของ Sidebar การแจ้งเตือน
 * @param {Array} alerts - Array ของ object การแจ้งเตือนที่ได้จาก API
 */
 function updateAlertsUI(alerts) {
    // 1. กำหนดเป้าหมายไปที่ Element ของ Sidebar ใหม่
    const alertsContainer = document.getElementById('alerts-container-sidebar');
    const alertBadge = document.getElementById('alert-badge');
    const alertCountSidebar = document.getElementById('alert-count-sidebar');
    const alertEmptySidebar = document.getElementById('alert-empty-sidebar');

    // 2. ป้องกัน Error ถ้าหา Element ไม่เจอ
    if (!alertsContainer) return;

    // 3. ล้างเนื้อหาเก่าออกทั้งหมด
    alertsContainer.innerHTML = '';

    const count = alerts.length;

    // 4. อัปเดต Badge ตัวเลขที่กระดิ่ง และข้อความ Header ใน Sidebar
    if (alertCountSidebar) {
        alertCountSidebar.textContent = count;
    }
    if (alertBadge) {
        alertBadge.textContent = count;
        alertBadge.style.display = count > 0 ? 'block' : 'none';
    }

    // 5. สร้างรายการแจ้งเตือนใหม่
    if (count > 0) {
        if (alertEmptySidebar) alertEmptySidebar.style.display = 'none';

        alerts.forEach(alert => {
            const alertItem = document.createElement('a'); // สร้างเป็น <a> tag เพื่อให้คลิกได้
            alertItem.href = `../inventorySettings/inventorySettings.php?tab=item-master-pane&search=${encodeURIComponent(alert.sap_no)}`;
            alertItem.className = 'alert-item'; // ใช้ class ใหม่สำหรับ styling
            
            // สร้าง HTML ภายในที่สวยงามและเหมาะสมกับ Sidebar
            alertItem.innerHTML = `
                <div class="alert-icon">
                    <i class="bi bi-exclamation-triangle-fill text-warning"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.part_no}</div>
                    <div class="alert-subtitle">${alert.sap_no}</div>
                    <div class="alert-details">
                        ปัจจุบัน: ${parseFloat(alert.total_onhand).toFixed(2)} / ต่ำสุด: ${parseFloat(alert.min_stock).toFixed(2)}
                    </div>
                </div>
            `;
            alertsContainer.appendChild(alertItem);
        });

    } else {
        // ถ้าไม่มีการแจ้งเตือน ให้แสดงข้อความ
        if (alertEmptySidebar) alertEmptySidebar.style.display = 'block';
    }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลการแจ้งเตือนจาก API และเรียกอัปเดต UI
 * ถูกสร้างเป็นฟังก์ชัน global เพื่อให้ไฟล์อื่นสามารถเรียกใช้ได้
 */
async function fetchAlerts() {
    try {
        const response = await fetch('../components/api/get_alerts.php');
        if (!response.ok) {
            throw new Error(`Network response was not ok (${response.status})`);
        }
        const data = await response.json();
        if (data.success) {
            updateAlertsUI(data.alerts);
        } else {
            console.error('API Error:', data.message);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

// Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function () {
    // เรียกโหลดการแจ้งเตือนครั้งแรก
    fetchAlerts();
    // ตั้งเวลาให้โหลดซ้ำทุกๆ 1 นาที (60000 มิลลิวินาที)
    setInterval(fetchAlerts, 60000);
});