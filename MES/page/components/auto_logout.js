//-- ตัวแปรสำหรับเก็บ ID ของ Timer --
let logoutTimer;

//-- ฟังก์ชันสำหรับรีเซ็ตและตั้งเวลา Logout ใหม่ --
function resetLogoutTimer() {
  //-- เคลียร์ Timer ที่ตั้งไว้ก่อนหน้า (หากมี) --
  clearTimeout(logoutTimer);
  
  //-- ตั้ง Timer ใหม่ให้ทำงานในอีก 5 นาที --
  logoutTimer = setTimeout(() => {
    //-- เมื่อครบ 5 นาที จะแสดงข้อความและส่งผู้ใช้ไปหน้า Logout --
    alert("You were inactive for 5 minutes. Logging out...");
    window.location.href = "../../auth/logout.php?redirect=1";
  }, 5 * 60 * 1000); // 5 นาที (แปลงเป็นมิลลิวินาที)
}

//-- กำหนด Event Listener ให้กับกิจกรรมต่างๆ ของผู้ใช้ --
//-- เมื่อมีกิจกรรมเหล่านี้เกิดขึ้น จะเรียกใช้ฟังก์ชัน resetLogoutTimer --
['click', 'mousemove', 'keydown', 'scroll'].forEach(evt =>
  document.addEventListener(evt, resetLogoutTimer)
);

//-- เรียกใช้ฟังก์ชันครั้งแรกเมื่อโหลดหน้าเว็บ เพื่อเริ่มนับเวลาถอยหลัง --
resetLogoutTimer();