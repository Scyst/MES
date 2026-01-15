import requests
import json
from websocket import create_connection
from datetime import datetime

WS_URL = "ws://172.16.1.125:1881/mes/b9/prod/ws/v1/utils"
API_URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"

def get_api_data():
    try:
        response = requests.post(API_URL, json={"start": None, "end": None}, timeout=5)
        raw_list = response.json().get("data", {}).get("result", [])
        return {item['work_center']: item['counter'] for item in raw_list}
    except: return {}

def get_ws_data():
    try:
        ws = create_connection(WS_URL, timeout=5)
        data = json.loads(ws.recv())
        ws.close()
        raw_list = data.get("latest", {}).get("raw_data", [])
        # เก็บเป็น Dict เหมือนกัน โดยใช้ชื่อเครื่องเป็น Key ทั้งก้อนข้อมูล
        return {item['work_center']: item for item in raw_list}
    except: return {}

def main():
    api_dict = get_api_data()   # ข้อมูลจาก API (Dict: ชื่อ -> จำนวน)
    ws_dict = get_ws_data()     # ข้อมูลจาก WS (Dict: ชื่อ -> ข้อมูลทั้งหมด)

    # 1. รวบรวมรายชื่อเครื่องทั้งหมดจากทั้ง 2 แหล่ง (ไม่ซ้ำกัน)
    all_machines = set(api_dict.keys()) | set(ws_dict.keys())
    sorted_machines = sorted(list(all_machines)) # เรียงตามตัวอักษร

    print(f"\nตารางรวม (Total: {len(sorted_machines)} เครื่อง)")
    print("=" * 65)
    print(f"{'Work Center':<12} | {'Source':<6} | {'Status':<8} | {'WS':>8} | {'API':>8} | {'Diff':>8}")
    print("-" * 65)

    for wc in sorted_machines:
        # ดึงค่าจาก WS
        ws_item = ws_dict.get(wc)
        ws_count = ws_item.get("counter", 0) if ws_item else None
        status = ws_item.get("status", "-") if ws_item else "No WS"
        
        # ดึงค่าจาก API
        api_count = api_dict.get(wc)

        # วิเคราะห์แหล่งที่มา (Source)
        if ws_item and api_count is not None: source = "BOTH"
        elif ws_item: source = "WS Only"
        else: source = "API Only"

        # จัด format ตัวเลข
        ws_str = f"{ws_count:,}" if ws_count is not None else "-"
        api_str = f"{api_count:,}" if api_count is not None else "-"
        
        # คำนวณ Diff
        if ws_count is not None and api_count is not None:
            diff = ws_count - api_count
            diff_str = f"{diff:+}" if diff != 0 else "0"
        else:
            diff_str = "?"

        print(f"{wc:<12} | {source:<7} | {status:<8} | {ws_str:>8} | {api_str:>8} | {diff_str:>8}")

    print("=" * 65)

if __name__ == "__main__":
    main()