import requests
import json
from datetime import datetime, timedelta

# ==========================================
# CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}

# ==========================================
# TIME SETUP
# ==========================================
now = datetime.now()
current_time = now.replace(microsecond=0) 
today_start = current_time.replace(hour=0, minute=0, second=0)
yesterday_start = today_start - timedelta(days=1)

STR_NOW = current_time.isoformat()
STR_TODAY = today_start.isoformat()
STR_YEST = yesterday_start.isoformat()

# Define Scenarios
test_scenarios = [
    {"id": "ALL",  "name": "1. All Time",           "payload": {"start": None, "end": None}},
    {"id": "TDY",  "name": "2. Today (Start->Now)", "payload": {"start": STR_TODAY, "end": None}},
    {"id": "YST",  "name": "3. Yesterday (24hr)",   "payload": {"start": STR_YEST, "end": STR_TODAY}},
    {"id": "PST",  "name": "4. Past -> Today Start","payload": {"start": None, "end": STR_TODAY}},
    {"id": "INS",  "name": "5. Instant (Now->Now)", "payload": {"start": STR_NOW, "end": STR_NOW}}
]

# ==========================================
# FORMATTING
# ==========================================
W_SCEN = 25
W_TIME = 40
W_MACH = 8
W_COUNT = 12
W_NEG = 8
W_DUR = 8

border_line = f"+{'-'*(W_SCEN+2)}+{'-'*(W_TIME+2)}+{'-'*(W_MACH+2)}+{'-'*(W_COUNT+2)}+{'-'*(W_NEG+2)}+{'-'*(W_DUR+2)}+"
row_format = f"| {{:<{W_SCEN}}} | {{:<{W_TIME}}} | {{:>{W_MACH}}} | {{:>{W_COUNT}}} | {{:>{W_NEG}}} | {{:>{W_DUR}}} |"

results_store = {}
evidence_log = [] # เก็บหลักฐานไว้โชว์ตอนท้าย

# ==========================================
# EXECUTION
# ==========================================
print(f"\n🚀 API SCENARIO TESTING & QA REPORT")
print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(border_line)
print(row_format.format("Scenario", "Time Condition", "Machines", "Total", "Bad(Neg)", "Time"))
print(border_line)

for test in test_scenarios:
    payload = test["payload"]
    t_start = payload['start'] if payload['start'] else "None"
    t_end = payload['end'] if payload['end'] else "None"
    condition_str = f"{t_start} > {t_end}"
    
    if len(condition_str) > W_TIME:
        condition_str = condition_str[:W_TIME-3] + "..."

    try:
        req_start = datetime.now()
        response = requests.post(URL, headers=HEADERS, json=payload, timeout=15)
        duration = (datetime.now() - req_start).total_seconds()
        
        if response.status_code not in [200, 201]:
            raise Exception(f"HTTP {response.status_code}")
            
        data = response.json()
        result_list = data.get("data", {}).get("result", [])
        
        results_store[test["id"]] = result_list
        
        total_count = sum(item.get("counter", 0) for item in result_list)
        machine_count = len(result_list)
        
        # 🔥 หาค่าติดลบแล้วเก็บเข้า Evidence Log
        bad_items = [item for item in result_list if item.get("counter", 0) < 0]
        neg_count = len(bad_items)
        
        if neg_count > 0:
            neg_str = f"❌ {neg_count}"
            # เก็บหลักฐาน
            for bad in bad_items:
                evidence_log.append({
                    "scenario": test["name"],
                    "machine": bad.get("work_center"),
                    "value": bad.get("counter"),
                    "status": bad.get("status", "Unknown")
                })
        else:
            neg_str = f"✅ 0"
        
        count_str = f"{total_count:,}"
        dur_str = f"{duration:.2f}s"
        print(row_format.format(test['name'], condition_str, machine_count, count_str, neg_str, dur_str))

    except Exception as e:
        results_store[test["id"]] = []
        print(row_format.format(test['name'], condition_str, "ERR", "ERR", "ERR", "ERR"))

print(border_line)

# ==========================================
# 🚨 EVIDENCE DUMP (ส่วนสำคัญสำหรับ Dev)
# ==========================================
print("\n🚨 DETAILED EVIDENCE (ส่งให้ทีม Dev ดูส่วนนี้)")
print("=" * 60)

if evidence_log:
    print(f"{'SCENARIO':<25} | {'MACHINE ID':<15} | {'VALUE':<10} | {'STATUS'}")
    print("-" * 60)
    for log in evidence_log:
        print(f"{log['scenario']:<25} | {log['machine']:<15} | {log['value']:<10} | {log['status']}")
    print("-" * 60)
    print("⚠️ Recommendation: Check PLC/Sensor calibration for these machines.")
else:
    print("✅ No corrupted data found. Clean run.")

print("=" * 60)