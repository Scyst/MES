import requests
import json
import csv
import time
import os
from datetime import datetime

# ==========================================
# ⚙️ ตั้งค่า (Configuration)
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}
LOG_FILE = f"mes_monitor_{datetime.now().strftime('%Y%m%d')}.csv" # ชื่อไฟล์ตามวันที่
INTERVAL_SEC = 60  # เก็บข้อมูลทุกๆ 60 วินาที (1 นาที)

# ==========================================
# 🛠️ ฟังก์ชันเตรียมไฟล์ CSV
# ==========================================
def init_csv():
    # ถ้ายังไม่มีไฟล์ ให้สร้างใหม่พร้อมหัวตาราง
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Timestamp", "Machine Name", "Counter", "Status_Check"])
        print(f"📁 สร้างไฟล์ Log ใหม่: {LOG_FILE}")
    else:
        print(f"📂 ใช้ไฟล์ Log เดิม: {LOG_FILE}")

# ==========================================
# 🚀 เริ่มการทำงาน (Main Loop)
# ==========================================
def run_logger():
    init_csv()
    print(f"🚀 เริ่มต้นระบบเฝ้าระวัง... (บันทึกทุก {INTERVAL_SEC} วินาที)")
    print("กด Ctrl+C เพื่อหยุดการทำงาน\n")

    try:
        while True:
            # 1. เตรียมเวลา (Start = 00:00 ของวันนี้)
            now = datetime.now()
            current_ts = now.strftime('%Y-%m-%d %H:%M:%S')
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            
            payload = {"start": today_start, "end": None}

            try:
                # 2. ยิง API
                response = requests.post(URL, headers=HEADERS, json=payload, timeout=10)
                
                if response.status_code == 200:
                    data = response.json().get("data", {}).get("result", [])
                    
                    # 3. บันทึกลง CSV
                    with open(LOG_FILE, mode='a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        
                        # วนลูปบันทึกทีละเครื่อง
                        for item in data:
                            name = item.get('work_center', 'Unknown')
                            count = item.get('counter', 0)
                            # เขียนลงไฟล์: เวลา, ชื่อเครื่อง, จำนวน, สถานะ
                            writer.writerow([current_ts, name, count, "OK"])
                    
                    print(f"✅ {current_ts} | บันทึกสำเร็จ: {len(data)} เครื่อง")
                
                else:
                    # กรณี API Error (404, 500)
                    print(f"❌ {current_ts} | API Error: {response.status_code}")
                    with open(LOG_FILE, mode='a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([current_ts, "SYSTEM_ERROR", 0, f"HTTP_{response.status_code}"])

            except Exception as e:
                # กรณีเน็ตหลุด หรือ Timeout
                print(f"⚠️ {current_ts} | Connection Error: {e}")
                with open(LOG_FILE, mode='a', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow([current_ts, "CONNECTION_ERROR", 0, str(e)])

            # 4. พักผ่อนรอรอบถัดไป
            time.sleep(INTERVAL_SEC)

    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานโดยผู้ใช้")
        print(f"💾 ข้อมูลถูกบันทึกไว้ที่: {LOG_FILE}")

if __name__ == "__main__":
    run_logger()