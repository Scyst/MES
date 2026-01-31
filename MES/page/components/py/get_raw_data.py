import requests
import json
import os
from datetime import datetime, timedelta

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}

# ==========================================
# 2. THAI TIME CALCULATION (หัวใจสำคัญ)
# ==========================================
# 1. ตั้งเวลาไทยปัจจุบันก่อน
thai_now = datetime.now().replace(microsecond=0)
thai_today_start = thai_now.replace(hour=0, minute=0, second=0)
thai_yesterday_start = thai_today_start - timedelta(days=1)

# 2. สร้างฟังก์ชันแปลงเวลา (ลบ 7 ชั่วโมง)
def to_api_time(local_dt):
    # ลบ 7 ชั่วโมง เพื่อแปลงเป็น UTC (Server Time)
    utc_dt = local_dt - timedelta(hours=7) 
    return utc_dt.isoformat()

# 3. เตรียมชุดเวลาสำหรับส่ง API (Convert เรียบร้อยแล้ว)
API_STR_NOW = to_api_time(thai_now)
API_STR_TODAY = to_api_time(thai_today_start)
API_STR_YEST = to_api_time(thai_yesterday_start)

# เวลาสำหรับเคส 1 นาที / 5 นาที / 1 ชั่วโมง
API_STR_1MIN = to_api_time(thai_now - timedelta(minutes=1))
API_STR_5MIN = to_api_time(thai_now - timedelta(minutes=7))
API_STR_1HR  = to_api_time(thai_now - timedelta(hours=1))

# ==========================================
# 3. SCENARIO DEFINITIONS (8 Cases)
# ==========================================
scenarios = [
    # --- Standard Cases ---
    {
        "id": "CASE_1_ALL",
        "description": "All Time (No Filter)",
        "payload": {"start": None, "end": None}
    },
    {
        "id": "CASE_2_TODAY",
        "description": f"Today (Thai 00:00 -> Now)",
        "payload": {"start": API_STR_TODAY, "end": None}
    },
    {
        "id": "CASE_3_YESTERDAY",
        "description": "Yesterday (Thai 24 Hours)",
        "payload": {"start": API_STR_YEST, "end": API_STR_TODAY}
    },
    {
        "id": "CASE_4_PAST_TO_TODAY",
        "description": "Past -> Today Start",
        "payload": {"start": None, "end": API_STR_TODAY}
    },
    {
        "id": "CASE_5_INSTANT",
        "description": "Instant Check (Now -> Now)",
        "payload": {"start": API_STR_NOW, "end": API_STR_NOW}
    },
    # --- Recent Cases (Checking Real-time Flow) ---
    {
        "id": "CASE_6_LAST_1MIN",
        "description": "Last 1 Minute",
        "payload": {"start": API_STR_1MIN, "end": API_STR_NOW}
    },
    {
        "id": "CASE_7_LAST_5MIN",
        "description": "Last 5 Minutes",
        "payload": {"start": API_STR_5MIN, "end": API_STR_NOW}
    },
    {
        "id": "CASE_8_LAST_1HR",
        "description": "Last 1 Hour",
        "payload": {"start": API_STR_1HR, "end": API_STR_NOW}
    }
]

# ==========================================
# 4. EXECUTION
# ==========================================
def run_dump():
    print("============================================================")
    print("THAI TIMEZONE RAW DUMP (-7 UTC ADJUSTED)")
    print(f"🇹🇭 Local Time (Thai): {thai_now}")
    print(f"🌍 Server Time (UTC): {to_api_time(thai_now)} (ส่งค่านี้ไปขอ)")
    print("============================================================")

    output_dir = "raw_data_thai_time"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for sc in scenarios:
        print(f"\n[PROCESSING] ID: {sc['id']}")
        # print payload to verify time
        print(f"Payload: {json.dumps(sc['payload'])}")
        
        try:
            response = requests.post(URL, headers=HEADERS, json=sc['payload'], timeout=15)
            
            if response.status_code in [200, 201]:
                raw_data = response.json()
                result_list = raw_data.get("data", {}).get("result", [])
                count = len(result_list)
                
                print(f"✅ OK ({response.status_code}) | Records: {count}")

                # Show sample
                if count > 0:
                    first = result_list[0]
                    # Preview important fields
                    preview = {
                        "wc": first.get("work_center"),
                        "cnt": first.get("counter"),
                        "st": first.get("status", "N/A")
                    }
                    print(f"   Sample: {json.dumps(preview, ensure_ascii=False)}")
                else:
                    print("   ℹ️ Empty List []")

                # Save Full JSON
                filename = f"{output_dir}/{sc['id']}.json"
                with open(filename, "w", encoding="utf-8") as f:
                    json.dump(raw_data, f, indent=4, ensure_ascii=False)
                print(f"   💾 Saved: {filename}")

            else:
                print(f"❌ HTTP Error {response.status_code}")
                print(f"   {response.text}")

        except Exception as e:
            print(f"💀 Error: {e}")
        
        print("-" * 60)

    print(f"\n[DONE] Files saved in folder: '{output_dir}'")

if __name__ == "__main__":
    run_dump()