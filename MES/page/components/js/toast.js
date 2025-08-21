/**
 * ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือน (Toast Notification)
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {string} [color='#28a745'] - สีพื้นหลัง (ค่าเริ่มต้นคือสีเขียว)
 */
function showToast(message, color = '#28a745') {
  //-- ค้นหา Element ของ Toast --
  const toast = document.getElementById('toast');
  //-- หากไม่พบ Element ให้จบการทำงานทันที --
  if (!toast) return;

  //-- กำหนดข้อความและสี พร้อมทำให้ Toast แสดงขึ้นมา --
  toast.textContent = message;
  toast.style.backgroundColor = color;
  toast.style.opacity = 1;
  toast.style.transform = 'translateY(0)'; //-- ทำให้ Toast เลื่อนขึ้นมาในตำแหน่งที่มองเห็น --

  //-- ตั้งเวลาเพื่อซ่อน Toast หลังจากผ่านไป 3 วินาที --
  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = 'translateY(20px)'; //-- ทำให้ Toast เลื่อนลงและจางหายไป --
  }, 3000);
}