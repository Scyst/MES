# System Monitor Pro - Home Setup & Build Guide

เนื่องจากมีการเพิ่มฟีเจอร์ "Widget Mode" ซึ่งต้องใช้การแทรกแซง Native Windows API ทำให้ Rust จำเป็นต้องใช้คอมไพเลอร์ของ C++ ในการสร้างโปรแกรม หากคุณเจอปัญหาเกี่ยวกับการ Build หรือ Dev ที่บ้าน ให้ทำตามขั้นตอนต่อไปนี้:

## 1. การติดตั้ง C++ Build Tools
เพื่อให้โค้ด Rust (`winapi`) คอมไพล์ผ่านบน Windows คุณจำเป็นต้องติดตั้งเครื่องมือคอมไพล์ของ Microsoft
1. ดาวน์โหลด [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. ในหน้าต่าง Installer ให้เลือก **"Desktop development with C++"** (ตรวจสอบให้แน่ใจว่าติ๊กเลือก Windows 10/11 SDK ด้วย)
3. กด Install และรอจนเสร็จสิ้น

## 2. ตั้งค่า Rust ให้ใช้ MSVC Toolchain
เปิด Terminal (PowerShell หรือ CMD) แล้วรันคำสั่ง:
```bash
rustup default stable-x86_64-pc-windows-msvc
```
*คำสั่งนี้จะเปลี่ยนให้ Rust หันไปใช้งาน Build Tools ที่เพิ่งติดตั้งไป แทนที่ตัว GNU แบบเดิม*

## 3. วิธีรันทดสอบ (Dev)
สาเหตุที่คุณเจอ Error `Missing script: "tauri"` ในก่อนหน้านี้ เกิดจากการรันคำสั่งผิดโฟลเดอร์ (รันใน `src-tauri\target\release`) 

**การรันที่ถูกต้อง:** ต้องอยู่ที่โฟลเดอร์หลักของโปรเจกต์ (ที่มีไฟล์ `package.json`)
```bash
# 1. เข้าไปที่โฟลเดอร์หลัก
cd E:\MES\MES\MES\SystemMonitorTauri

# 2. รันคำสั่งนี้
npm run tauri dev
```
*(ถ้ารันที่บ้าน อาจจะต้องเปลี่ยน `E:\...` เป็นพาธที่คุณเซฟโปรเจกต์ไว้ที่บ้าน)*

## 4. สรุปความคืบหน้าของฟีเจอร์ที่มีในตอนนี้
- **Window Modes:** สามารถสลับโหมด Window ปกติ, โหมด Widget (กันกด Win+D) และโหมด Mini (หน้าต่างเล็ก) ได้ผ่าน Settings 
- **Themes:** สามารถสลับระหว่าง Modern Theme และ Classic Theme 
- **Native Notifications:** สามารถตั้งค่าให้ระบบแจ้งเตือนเมื่อ CPU/RAM ทะลุเปอร์เซ็นต์ที่กำหนดได้

คุณสามารถทำการ Pull Branch `agent/performance-monitor` เพื่อนำไปพัฒนาและทดสอบต่อได้ทันทีครับ!
