"use strict";

/**
 * ฟังก์ชันสำหรับอัปเดต UI ของ Dropdown การแจ้งเตือน
 * @param {Array} alerts - Array ของ object การแจ้งเตือนที่ได้จาก API
 */
function updateAlertsUI(alerts) {
    const alertsContainer = document.getElementById('alerts-container');
    const alertBadge = document.getElementById('alert-badge');
    const alertCount = document.getElementById('alert-count');
    const alertFooterEmpty = document.getElementById('alert-footer-empty');

    if (!alertsContainer) return; // ออกถ้าไม่เจอ element

    // ล้างรายการแจ้งเตือนเก่าและลิงก์ "View All" ออกก่อน
    const existingItems = alertsContainer.querySelectorAll('.notification-item, .view-all-link');
    existingItems.forEach(item => item.remove());

    const count = alerts.length;
    if (alertCount) alertCount.textContent = count;

    if (count > 0) {
        if (alertBadge) {
            alertBadge.textContent = count;
            alertBadge.style.display = 'block';
        }
        if (alertFooterEmpty) alertFooterEmpty.style.display = 'none';

        // แสดงแค่ 4 รายการล่าสุด
        alerts.slice(0, 4).forEach(alert => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            li.innerHTML = `
                <a href="../inventorySettings/inventorySettings.php?tab=item-master-pane&search=${encodeURIComponent(alert.sap_no)}" class="dropdown-item d-flex align-items-start text-wrap">
                    <i class="bi bi-exclamation-circle text-warning me-2 mt-1"></i>
                    <div>
                        <h4 class="mb-0 fs-6">${alert.part_no}</h4>
                        <p class="mb-1 text-muted small">${alert.sap_no}</p>
                        <p class="mb-0 small">ปัจจุบัน: ${parseFloat(alert.total_onhand).toFixed(2)} / ต่ำสุด: ${parseFloat(alert.min_stock).toFixed(2)}</p>
                    </div>
                </a>
            `;
            // เพิ่มรายการใหม่ต่อจาก divider
            const divider = alertsContainer.querySelector('.dropdown-divider');
            if (divider) {
                divider.insertAdjacentElement('afterend', li);
            }
        });

        // เพิ่มลิงก์ "View All"
        const viewAllLi = document.createElement('li');
        viewAllLi.className = 'view-all-link';
        viewAllLi.innerHTML = `
            <li><hr class="dropdown-divider"></li>
            <li class="dropdown-footer">
                <a href="../inventorySettings/inventorySettings.php?tab=item-master-pane">ดูรายการทั้งหมด</a>
            </li>`;
        alertsContainer.appendChild(viewAllLi);

    } else {
        if (alertBadge) alertBadge.style.display = 'none';
        if (alertFooterEmpty) alertFooterEmpty.style.display = 'block';
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