document.addEventListener('DOMContentLoaded', function () {
    const alertBadge = document.getElementById('alert-badge');
    const alertCount = document.getElementById('alert-count');
    const alertsContainer = document.getElementById('alerts-container');
    const alertFooterEmpty = document.getElementById('alert-footer-empty');

    const fetchAlerts = async () => {
        try {
            const response = await fetch('../components/api/get_alerts.php');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            if (data.success) {
                updateAlertsUI(data.alerts);
            } else {
                console.error('Failed to fetch alerts:', data.message);
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const updateAlertsUI = (alerts) => {
        // Clear previous alerts
        const existingAlerts = alertsContainer.querySelectorAll('.notification-item');
        existingAlerts.forEach(item => item.remove());

        const count = alerts.length;
        alertCount.textContent = count;

        if (count > 0) {
            alertBadge.textContent = count;
            alertBadge.style.display = 'block';
            alertFooterEmpty.style.display = 'none';

            alerts.forEach(alert => {
                const li = document.createElement('li');
                li.className = 'notification-item';
                li.innerHTML = `
                    <i class="bi bi-exclamation-circle text-warning"></i>
                    <div>
                        <h4>สต็อกต่ำ: ${alert.part_no}</h4>
                        <p>${alert.sap_no}</p>
                        <p>ปัจจุบัน: ${parseFloat(alert.total_onhand).toFixed(2)} / ต่ำสุด: ${parseFloat(alert.min_stock).toFixed(2)}</p>
                    </div>
                `;
                // Insert after the dropdown-divider
                alertsContainer.querySelector('.dropdown-divider').after(li);
            });
        } else {
            alertBadge.style.display = 'none';
            alertFooterEmpty.style.display = 'block';
        }
    };

    // Fetch alerts immediately and then every 60 seconds
    fetchAlerts();
    setInterval(fetchAlerts, 60000); 
});