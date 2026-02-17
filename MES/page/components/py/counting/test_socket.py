import requests
import json
from datetime import datetime

# ==========================================
# 1. SETUP
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}

# เอาเวลาเริ่มต้นของวันนี้ (00:00:00)
now = datetime.now()
start_time = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

# Payload
payload = {
    "start": start_time,
    "end": None
}

print(f"🚀 Sending Request...")
print(f"URL: {URL}")
print("-" * 50)

# ==========================================
# 2. EXECUTE & INSPECT
# ==========================================
try:
    response = requests.post(URL, headers=HEADERS, json=payload, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    
    # ✅ แก้ไขตรงนี้: ยอมรับทั้ง 200 (OK) และ 201 (Created)
    if response.status_code in [200, 201]:
        data = response.json()
        
        # 2.1 แสดงโครงสร้าง JSON เต็มๆ
        print("\n📄 [FULL JSON RESPONSE]")
        # print(json.dumps(data, indent=4, ensure_ascii=False)) # ปิดไว้ก่อนจะได้ไม่รก
        print(f"Status Msg: {data.get('message', 'No Message')}")
        
        # 2.2 เจาะดู Data Structure
        result_list = data.get("data", {}).get("result", [])
        
        if result_list and isinstance(result_list, list) and len(result_list) > 0:
            first_item = result_list[0]
            
            print("\n🛠 [DATABASE SCHEMA ANALYSIS]")
            print(f"Found {len(result_list)} records. Analyzing structure:")
            print("-" * 60)
            print(f"{'KEY (Column Name)':<25} | {'TYPE':<10} | {'EXAMPLE VALUE'}")
            print("-" * 60)
            
            for key, value in first_item.items():
                value_type = type(value).__name__
                str_val = str(value)
                if len(str_val) > 50:
                    str_val = str_val[:47] + "..."
                
                print(f"{key:<25} | {value_type:<10} | {str_val}")
                
            print("-" * 60)
            print("✅ Data Structure พร้อมสำหรับการออกแบบ Table แล้วครับ")
            
        else:
            print("\n⚠️ Warning: No data found in 'data.result'.")
            
    else:
        print(f"\n❌ Error: API returned {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\n❌ Exception: {e}")