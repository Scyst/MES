import requests
import json
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}
PAYLOAD = {"start": None, "end": None} # ดึงข้อมูลดิบทั้งหมด

# ==========================================
# 2. EXECUTION
# ==========================================
print(f"Start Schema Inspector...")
print(f"Target: {URL}")

try:
    response = requests.post(URL, headers=HEADERS, json=PAYLOAD, timeout=10)
    
    if response.status_code in [200, 201]:
        data_json = response.json()
        result_list = data_json.get("data", {}).get("result", [])
        
        if not result_list:
            print("Data is Empty")
            exit()
            
        print(f"Success! Found {len(result_list)} machines")
        print("="*80)
        
        # -------------------------------------------------------
        # เทคนิค: กวาดหา Key ทั้งหมดที่มี (เผื่อบาง record มี key ไม่เท่ากัน)
        # -------------------------------------------------------
        all_keys = set()
        example_values = {}
        
        for item in result_list:
            for k, v in item.items():
                all_keys.add(k)
                if k not in example_values or example_values[k] is None:
                    example_values[k] = v # เก็บตัวอย่างค่าแรกที่ไม่ใช่ None
        
        sorted_keys = sorted(list(all_keys))
        
        # -------------------------------------------------------
        # แสดงผลตาราง
        # -------------------------------------------------------
        print(f"{'FIELD NAME (KEY)':<25} | {'TYPE':<10} | {'SAMPLE VALUE'}")
        print("-" * 80)
        
        found_status = False
        
        for key in sorted_keys:
            val = example_values.get(key, "N/A")
            val_type = type(val).__name__
            
            # ไฮไลท์ฟิลด์สำคัญ
            prefix = "  "
            if key in ['status', 'counter', 'work_center']:
                prefix = "->"
                if key == 'status': found_status = True
            
            # จัดรูปแบบการแสดงผล
            val_str = str(val)
            if len(val_str) > 40:
                val_str = val_str[:37] + "..."
                
            print(f"{prefix} {key:<23} | {val_type:<10} | {val_str}")
            
        print("-" * 80)
        
        # -------------------------------------------------------
        # สรุปผล
        # -------------------------------------------------------
        if found_status:
            print("Found 'status' field")
        else:
            print("Not found 'status' field")
            
        # (Optional) ปริ้น JSON ตัวเต็ม 1 ตัวเผื่อพี่อยากเห็นรูปแบบ
        print("\n[RAW JSON SAMPLE - 1 RECORD]")
        print(json.dumps(result_list[0], indent=4, ensure_ascii=False))

    else:
        print(f"Error: HTTP {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Exception: {str(e)}")