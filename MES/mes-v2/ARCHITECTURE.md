# 🏗️ MES V2 (SPA) Architecture & Migration Guide

*Last Updated: 2026-09-02*

เอกสารนี้ใช้อธิบายโครงสร้างและแนวทางการพอร์ตระบบ MES จาก Legacy (PHP/Bootstrap) มาเป็น SPA (React/Vite/Tailwind)

## 🛠️ 1. Tech Stack
*   **Core Framework:** React 18+ (Component-based)
*   **Build Tool:** Vite (รวดเร็ว, Output ไปที่โฟลเดอร์ `dist/`)
*   **Styling:** Tailwind CSS (แทนที่ Bootstrap) + ไอคอน Lucide React
*   **Routing:** React Router (ใช้ HashRouting `#/` เป็นหลัก เพื่อให้ง่ายต่อการ Deploy แบบ Static บน FTP โดยไม่ต้องยุ่งกับ Server Config มากนัก)
*   **Entry Point:** `index.html` (ตั้งค่าใน `vite.config.js` ให้ Build เป็นไฟล์นี้ เพื่อให้ URL สวยงามและไม่ต้องระบุชื่อไฟล์ตอนเรียกหน้าเว็บ)

## 🏗️ 2. โครงสร้างโฟลเดอร์ (Project Structure)
เราใช้ **Modular Architecture** แยกตามฟีเจอร์หรือระบบงาน:
*   `src/shared/`: Component ที่ใช้ร่วมกัน เช่น `AppLayout`, `Sidebar`, `Topbar`, Context (`AuthContext`), และ API Service พื้นฐาน
*   `src/modules/`: โค้ดของแต่ละหน้า/ระบบงาน (เช่น `Home`, `QMS`, `Production`) ภายในจะมีโฟลเดอร์ย่อย `pages` และ `components`

## 🔄 3. Migration Strategy (แผนการพอร์ตระบบ)
1.  **Strangler Fig Pattern:** ค่อยๆ พอร์ตทีละโมดูล ระบบหลัก (Legacy PHP) จะยังทำงานขนานกันไป ระบบใหม่จะครอบและถูกเชื่อมด้วยลิงก์ (URL)
2.  **Reuse Backend APIs:** ใช้ Backend PHP เดิมที่มีอยู่ โดยให้ React ยิง Axios Request ไปเอา JSON 
    *   ถ้าหน้าเดิมฝัง PHP ไว้ใน HTML ให้สร้างไฟล์ API เล็กๆ ฝั่ง PHP เพื่อ Return เป็น JSON ออกมาแทน
3.  **Authentication & State:** 
    *   ใช้ Session ของ PHP เดิม โดย React จะเรียก `check.php` เพื่อดึงข้อมูล `userRole` ตอนโหลดแอป
    *   เก็บ State ผู้ใช้งานไว้ใน `AuthContext`
4.  **UI/UX:** 
    *   หน้าต่าง Modal เปลี่ยนจากการฝัง Scrollbar ข้างใน เป็นการใช้ Scrollbar ร่วมกับ Browser (ซ่อน Overflow-y ด้านในและให้ Container นอกสุดจัดการแทน)
    *   ใช้ Transition/Animation ผ่าน Tailwind แทน JQuery

## 🔒 4. Role & Permissions
*   **Frontend (UI):** ซ่อนลิงก์หรือปุ่มต่างๆ ตาม Role ที่รับมาจาก `AuthContext` เช่น ใช้ฟังก์ชัน `filterByRole()` ในการกรอง Array ของเมนู
*   **Backend (API):** PHP API ทุกตัวต้องเช็ค `$_SESSION['user']['role']` เพื่อป้องกันคนเอาลิงก์ API ไปเรียกตรงๆ

## 🚀 5. Deployment
*   รันคำสั่ง `npm run build`
*   อัปโหลดไฟล์ทั้งหมดใน `dist/` ไปยัง `/Toolbox2` ผ่าน FTP
*   ตรวจสอบว่าไฟล์หลักคือ `index.html` และ `.htaccess` มีการตั้งค่า `DirectoryIndex index.html` ถูกต้อง
