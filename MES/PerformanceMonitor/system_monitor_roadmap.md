# ◈ SYSTEM MONITOR — Development Roadmap

ตัวโปรแกรมตอนนี้ถือว่ามี **foundation ที่แข็งแกร่ง** แล้วครับ (Universal GPU detection, Desktop Widget Mode, Responsive Layout, Real-time Graphs) — ถ้าจะต่อยอดให้เป็น **ระดับ commercial** ได้จริง ผมแนะนำตาม Phase นี้เลยครับ:

---

## Phase 1 — Quick Wins (ทำได้เลยวันนี้ ⚡)

### 1.1 System Tray Icon
- ย่อลง Tray แทนที่จะปิดทิ้ง — โปรแกรมทำงานเบื้องหลังตลอด
- คลิกขวาที่ไอคอน Tray → Show / Desktop Mode / Exit
- ใช้ library: `pystray` + `Pillow`

### 1.2 Kill Process จากตาราง
- คลิกขวาที่ Process ในตาราง → "End Task" เหมือน Task Manager
- เพิ่ม confirmation dialog ก่อน kill

### 1.3 Global Hotkey
- กำหนดปุ่มลัด (เช่น `Ctrl+Shift+M`) เพื่อ Toggle แสดง/ซ่อนหน้าต่าง
- ใช้ library: `keyboard` หรือ `pynput`

### 1.4 Alerts & Notifications
- Toast notification เมื่อ CPU > 90% หรือ RAM > 90% ค้างเกิน 10 วินาที
- ใช้ library: `win10toast` หรือ `plyer`

---

## Phase 2 — Premium Features (1-3 วัน 🔧)

### 2.1 Historical Data + Charts
- บันทึกข้อมูล CPU/RAM/GPU/Network ลง **SQLite** ทุก 5 วินาที
- เพิ่มหน้า "History" แสดงกราฟย้อนหลัง 1h / 6h / 24h / 7d
- สามารถ Export เป็น CSV / HTML Report

### 2.2 Multiple Themes
- เพิ่มธีมให้เลือก: **Cyberpunk** (ปัจจุบัน), **Matrix Green**, **Nord**, **Dracula**, **White**
- เก็บ Theme เป็น dict ใน config file → โหลดจาก JSON
- เพิ่ม Theme Switcher ใน Right-click Menu

### 2.3 Mini Widget Mode
- โหมดลอยขนาดจิ๋ว (200×60px) แสดงแค่ CPU/RAM/GPU แบบ bar
- แปะมุมจอ Always-on-top — ไม่รบกวนสายตา
- กดดับเบิลคลิกเพื่อขยายกลับเป็นเต็มจอ

### 2.4 Per-App Network Usage
- แสดง Top 10 แอปที่ใช้ Network เยอะสุด
- ใช้ `psutil.net_connections()` + map กลับไปหา Process

### 2.5 CPU Temperature (ถ้า Hardware รองรับ)
- ดึงอุณหภูมิ CPU ผ่าน **OpenHardwareMonitor** หรือ **LibreHardwareMonitor** (WMI)
- แสดงใน Gauge เพิ่มอีกตัว

---

## Phase 3 — Pro Level (1-2 สัปดาห์ 🏗️)

### 3.1 Auto-Start with Windows
- เพิ่ม toggle "Start with Windows" ใน Settings
- เขียน Registry key `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- เริ่มแบบ minimized to tray

### 3.2 Remote Monitoring (Network)
- เปิด Web Server เล็กๆ (Flask/FastAPI) ให้เครื่องอื่นเข้าดูผ่าน Browser
- Dashboard เป็น HTML/JS แสดง real-time ผ่าน WebSocket
- ใช้ case: ดู Performance เครื่องในโรงงานจากมือถือ

### 3.3 Disk Health (SMART)
- อ่านข้อมูล SMART ของ SSD/HDD → แสดงสถานะสุขภาพ
- ใช้ `smartmontools` (`smartctl`) หรือ WMI
- เตือนเมื่อ SSD เริ่มเสื่อม

### 3.4 Benchmark Mode
- สร้าง CPU / RAM / Disk stress test ง่ายๆ
- วัด Score → เปรียบเทียบกับ baseline
- Export ผลลัพธ์เป็น Report

### 3.5 Plugin System
- ให้ user เขียน Custom Widget เป็น Python file แล้ว drop ใน `plugins/` folder
- โปรแกรมโหลดอัตโนมัติ → แสดงเป็น card ใน dashboard
- เปิดทางให้ community สร้าง plugin เอง

---

## Phase 4 — Commercial Ready (ถ้าจะเอาไปขายจริง 💰)

### 4.1 Installer (EXE)
- Package เป็น `.exe` ด้วย **PyInstaller** หรือ **Nuitka**
- สร้าง Installer (.msi) ด้วย **Inno Setup** หรือ **NSIS**
- ไอคอนสวยๆ, Desktop shortcut, Start Menu entry

### 4.2 Auto-Update System
- เช็ค version จาก GitHub Releases หรือ server ของตัวเอง
- แจ้งเตือน + ดาวน์โหลดอัปเดตอัตโนมัติ

### 4.3 Multi-Language Support
- รองรับ ไทย / อังกฤษ / ญี่ปุ่น
- ใช้ i18n JSON files

### 4.4 Cross-Platform
- รองรับ macOS + Linux (ปรับ GPU detection, ใช้ `lm-sensors` แทน WMI)
- ใช้ conditional imports

### 4.5 Licensing System
- Free tier: Basic monitoring
- Pro tier: History, Alerts, Remote, Benchmark, Themes
- ใช้ license key validation

---

## Tech Stack ที่แนะนำถ้าจะไปต่อจริงจัง

| ด้าน | ตอนนี้ (v3) | แนะนำอัปเกรด |
|------|------------|--------------|
| **UI Framework** | tkinter (Canvas) | **CustomTkinter** หรือ **DearPyGui** (สวยกว่า + GPU accelerated) |
| **Data Storage** | In-memory only | **SQLite** (history) + **JSON** (config) |
| **Packaging** | .py script | **PyInstaller** → standalone .exe |
| **Charts** | Custom Canvas | **matplotlib** embed หรือ **plotly** (interactive) |
| **Notifications** | ไม่มี | **win10toast** / **plyer** |
| **Tray Icon** | ไม่มี | **pystray** |

---

## สรุป Priority (ถ้าจะทำวันนี้)

> [!TIP]
> **แนะนำทำตามลำดับนี้** — ได้ impact สูงสุดต่อ effort น้อยสุด:
> 1. ✅ System Tray Icon (ย่อลง Tray)
> 2. ✅ Kill Process (คลิกขวาที่ตาราง)
> 3. ✅ Multiple Themes (เปลี่ยนสีได้)
> 4. ✅ Mini Widget Mode (ลอยมุมจอ)
> 5. ✅ Alerts (แจ้งเตือน CPU/RAM สูง)

พร้อมให้ผมลุยทำ Phase ไหนก็แจ้งได้เลยครับ! 🚀
