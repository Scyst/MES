import requests
import time
import os
import sys
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}
INTERVAL = 2  # อัปเดตทุก 2 วินาที
PAYLOAD = {"start": None, "end": None} # ดึงข้อมูล Real-time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_data():
    try:
        response = requests.post(URL, headers=HEADERS, json=PAYLOAD, timeout=5)
        if response.status_code in [200, 201]:
            return response.json().get("data", {}).get("result", [])
    except:
        return None
    return []

# ==========================================
# 2. MAIN EXECUTION
# ==========================================
print("🚀 Connecting to MES API... Please wait.")
history = {}

try:
    while True:
        data_list = get_data()
        
        # ถ้าเชื่อมต่อไม่ได้ ให้แจ้งเตือนแต่อย่าหลุดโปรแกรม
        if data_list is None:
            print(f"\r⚠️ Connection Lost... Retrying in {INTERVAL}s", end="")
            time.sleep(INTERVAL)
            continue

        # สร้าง Dictionary สำหรับ map ข้อมูล
        current_map = {}
        for item in data_list:
            wc = item.get('work_center', 'Unknown')
            # ดึง Status ออกมาโชว์ (ถ้าไม่มีให้ขึ้น N/A)
            st = item.get('status', 'N/A').upper() 
            ct = item.get('counter', 0)
            current_map[wc] = {'count': ct, 'status': st}

        timestamp = datetime.now().strftime("%H:%M:%S")

        # --- วาดหน้าจอ ---
        clear_screen()
        print(f"📊 REAL-TIME PRODUCTION MONITOR (WITH STATUS)")
        print(f"🕒 Update: {timestamp} | 🔗 Endpoint: Connected")
        print("=" * 80)
        # เพิ่มคอลัมน์ STATUS เข้ามาตรงกลาง
        print(f"{'MACHINE ID':<15} | {'STATUS':<15} | {'COUNTER':<10} | {'PREV':<10} | {'FLOW'}")
        print("-" * 80)

        sorted_machines = sorted(current_map.keys())
        run_count = 0
        stop_count = 0

        for wc in sorted_machines:
            curr_data = current_map[wc]
            curr_val = curr_data['count']
            curr_status = curr_data['status']
            
            # ดึงค่าเก่ามาเทียบ
            prev_data = history.get(wc, {'count': curr_val})
            prev_val = prev_data['count']
            
            diff = curr_val - prev_val
            
            # 1. จัดการแสดงผล STATUS (แต่งสี/ไอคอน)
            # ปรับคำ status ตามที่ API ส่งมาจริง (เช่น RUNNING, STOPPED, ALARM)
            if "RUN" in curr_status or "ON" in curr_status:
                status_display = f"🟢 {curr_status}"
                run_count += 1
            elif "STOP" in curr_status or "OFF" in curr_status:
                status_display = f"🔴 {curr_status}"
                stop_count += 1
            elif "ALARM" in curr_status or "ERR" in curr_status:
                status_display = f"⚠️ {curr_status}"
                stop_count += 1
            else:
                status_display = f"⚪ {curr_status}" # สถานะอื่นๆ

            # 2. จัดการแสดงผล FLOW (การไหลของงาน)
            if diff > 0:
                flow_str = f"▲ +{diff}" 
            elif diff < 0:
                flow_str = f"▼ {diff} (Reset?)"
            else:
                flow_str = "-"

            # Print Row
            print(f"{wc:<15} | {status_display:<15} | {curr_val:<10,} | {prev_val:<10,} | {flow_str}")

        print("=" * 80)
        print(f"📌 SUMMARY -> Total: {len(sorted_machines)} | Run: {run_count} | Stop/Other: {stop_count}")
        print("=" * 80)
        print("กด Ctrl+C เพื่อปิดโปรแกรม")

        # อัปเดตประวัติ
        history = current_map
        time.sleep(INTERVAL)

except KeyboardInterrupt:
    print("\n👋 Exiting Monitor.")