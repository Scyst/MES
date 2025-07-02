function updateDateTime() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const fullDateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    const onlyDate = `${day}/${month}/${year}`;
    const onlyTime = `${hours}:${minutes}:${seconds}`;

    const datetimeEl = document.getElementById('datetime');
    const dateEl = document.getElementById('date');
    const timeEl = document.getElementById('time');

    if (datetimeEl) datetimeEl.textContent = fullDateTime;
    if (dateEl) dateEl.textContent = onlyDate;
    if (timeEl) timeEl.textContent = onlyTime;
}

// Update every second
setInterval(updateDateTime, 1000);
updateDateTime(); // Initial call
