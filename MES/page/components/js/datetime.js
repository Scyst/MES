//-- ฟังก์ชันสำหรับอัปเดตวันที่และเวลาบนหน้าเว็บ --
function updateDateTime() {
    //-- สร้าง Object Date เพื่อดึงเวลาปัจจุบัน --
    const now = new Date();

    //-- ดึงและจัดรูปแบบส่วนของวันที่ (เติม 0 ข้างหน้าหากเป็นเลขหลักเดียว) --
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือนใน JS เริ่มที่ 0
    const year = now.getFullYear();

    //-- ดึงและจัดรูปแบบส่วนของเวลา --
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    //-- สร้าง String ของวันที่และเวลาในรูปแบบต่างๆ --
    const fullDateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    const onlyDate = `${day}/${month}/${year}`;
    const onlyTime = `${hours}:${minutes}:${seconds}`;

    //-- ดึง Element ที่จะแสดงผลจาก ID --
    const datetimeEl = document.getElementById('datetime');
    const dateEl = document.getElementById('date');
    const timeEl = document.getElementById('time');

    //-- อัปเดตข้อความใน Element (เช็คก่อนว่า Element นั้นมีอยู่จริง) --
    if (datetimeEl) datetimeEl.textContent = fullDateTime;
    if (dateEl) dateEl.textContent = onlyDate;
    if (timeEl) timeEl.textContent = onlyTime;
}

//-- สั่งให้ฟังก์ชัน updateDateTime ทำงานซ้ำทุกๆ 1 วินาที --
setInterval(updateDateTime, 1000);

//-- เรียกใช้ฟังก์ชันทันทีเมื่อโหลดหน้าเว็บ เพื่อแสดงผลครั้งแรกโดยไม่ต้องรอ 1 วินาที --
updateDateTime();