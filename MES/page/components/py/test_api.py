import requests
import json
from datetime import datetime

url = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
payload = {"start": "2026-01-31T01:00:00" , "end": "2026-01-31T02:00:00"}
headers = {'Content-Type': 'application/json'}

def format_row(w_center, count_str):
    # รับค่าเป็น String ทั้งหมดเพื่อความปลอดภัยในการจัดหน้า
    return f"{w_center:<15} | {count_str:>10}"

try:
    print(f"📡 กำลังดึงข้อมูลจาก API...")
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    
    # เจาะข้อมูล
    machine_list = data.get("data", {}).get("result", [])
    
    print(f"\n✅ ดึงข้อมูลสำเร็จ! ({datetime.now().strftime('%H:%M:%S')})")
    print("="*30)
    # ส่วนหัวตาราง (ส่ง string เข้าไปปกติ)
    print(format_row("Work Center", "Counter"))
    print("-" * 30)

    total_count = 0
    for machine in machine_list:
        w_center = machine.get("work_center", "Unknown")
        count = machine.get("counter", 0)
        
        # บวกยอดรวม
        total_count += count
        
        # ✅ แปลงตัวเลขเป็น String พร้อมลูกน้ำ (,) ก่อนส่งไปจัดตาราง
        count_display = f"{count:,}"
        
        print(format_row(w_center, count_display))

    print("="*30)
    print(f"📌 จำนวนเครื่อง: {len(machine_list)} เครื่อง")
    print(f"📌 ยอดผลิตรวม: {total_count:,} ชิ้น\n")

except requests.exceptions.RequestException as e:
    print(f"\n❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: {e}")
except Exception as e:
    print(f"\n❌ Error: {e}")