from websocket import create_connection
import json
import time
from datetime import datetime

url = "ws://172.16.1.125:1881/mes/b9/prod/ws/v1/utils"

def format_row(w_center, status, process, count, desc):
    # จัดรูปแบบการแสดงผลให้ตรงแถว (String formatting)
    return f"{w_center:<12} | {status:<8} | {process:<10} | {count:>7} | {desc}"

try:
    print(f"กำลังเชื่อมต่อ: {url} ...")
    ws = create_connection(url)
    print("เชื่อมต่อสำเร็จ กำลังรอข้อมูล...\n")

    while True:
        result = ws.recv()
        
        # 1. แปลงข้อความดิบ (String) ให้เป็น Object (Dictionary)
        try:
            data = json.loads(result)
            
            # เจาะเข้าไปเอาข้อมูลดิบของเครื่องจักร
            machine_list = data.get("latest", {}).get("raw_data", [])
            
            print(f"\n🔁 ได้รับข้อมูลเมื่อ: {datetime.now().strftime('%H:%M:%S')}")
            print("="*80)
            print(format_row("Work Center", "Status", "Process", "Counter", "Description"))
            print("-" * 80)
            
            # 2. วนลูปดึงข้อมูลทีละเครื่อง
            for machine in machine_list:
                w_center = machine.get("work_center", "-")
                status = machine.get("status", "Unknown")
                process = machine.get("actual_process", "-")
                count = machine.get("counter", 0)
                desc = machine.get("description", "")
                
                # แสดงผล
                print(format_row(w_center, status, process, count, desc))
                
            print("="*80)
            print(f"รวมทั้งหมด {len(machine_list)} เครื่อง\n")

        except json.JSONDecodeError:
            print(f"ได้รับข้อมูลที่ไม่ใช่ JSON: {result}")

except KeyboardInterrupt:
    print("\n หยุดการทำงาน")
except Exception as e:
    print(f"\n เกิดข้อผิดพลาด: {e}")
finally:
    if 'ws' in locals() and ws.connected:
        ws.close()
        print(" ปิดการเชื่อมต่อ")