import requests
import json
from datetime import datetime, timedelta

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}

# Time Setup
now = datetime.now()
current_time = now.replace(microsecond=0)
today_start = current_time.replace(hour=0, minute=0, second=0)
yesterday_start = today_start - timedelta(days=1)

STR_TODAY = today_start.isoformat()
STR_YEST = yesterday_start.isoformat()

# Scenarios Definition
scenarios = [
    {"key": "ALL", "name": "ALL TIME",      "start": None,       "end": None},
    {"key": "TDY", "name": "TODAY",         "start": STR_TODAY,  "end": None},
    {"key": "YST", "name": "YESTERDAY",     "start": STR_YEST,   "end": STR_TODAY},
    {"key": "PST", "name": "PAST->TODAY",   "start": None,       "end": STR_TODAY},
]

# ==========================================
# 2. DATA ACQUISITION
# ==========================================
print("Initializing Data Fetch Sequence...")

machine_data = {}
all_machine_ids = set()
error_log = []

for sc in scenarios:
    payload = {"start": sc['start'], "end": sc['end']}
    try:
        response = requests.post(URL, headers=HEADERS, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json().get("data", {}).get("result", [])
            for item in data:
                m_id = item.get("work_center", "UNKNOWN")
                val = item.get("counter", 0)
                all_machine_ids.add(m_id)
                
                if m_id not in machine_data:
                    machine_data[m_id] = {}
                machine_data[m_id][sc['key']] = val
        else:
            error_log.append(f"HTTP {response.status_code} on {sc['name']}")
    except Exception as e:
        error_log.append(f"EXCEPTION on {sc['name']}: {str(e)}")

# ==========================================
# 3. REPORT GENERATION
# ==========================================
sorted_machines = sorted(list(all_machine_ids))
timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Formatting Constants
W_ID = 12
W_COL = 14
DIVIDER = "+" + "-"*(W_ID+2) + "+" + ("-"*(W_COL+2) + "+") * len(scenarios)

# 3.1 Header Section
print("\n" + "="*80)
print(f"MES API DIAGNOSTIC REPORT")
print(f"EXECUTION TIME : {timestamp_str}")
print(f"ENDPOINT       : {URL}")
print("="*80)

if error_log:
    print("!!! WARNING: FETCH ERRORS DETECTED !!!")
    for err in error_log:
        print(f"- {err}")
    print("-" * 80)

# 3.2 Parameters Table
print("\n[ TEST PARAMETERS ]")
print(f"{'SCENARIO':<15} | {'START DATETIME':<25} | {'END DATETIME':<25}")
print("-" * 70)
for sc in scenarios:
    s = sc['start'] if sc['start'] else "NULL"
    e = sc['end'] if sc['end'] else "NULL"
    print(f"{sc['name']:<15} | {s:<25} | {e:<25}")

# 3.3 Data Matrix
print("\n[ DATA MATRIX ]")
print("NOTE: [!] indicates negative value (anomaly)")
print(DIVIDER)

# Table Header
header = f"| {'MACHINE ID':<{W_ID}} |"
for sc in scenarios:
    header += f" {sc['name']:^{W_COL}} |"
print(header)
print(DIVIDER)

# Table Body
neg_count = 0
for m_id in sorted_machines:
    row = f"| {m_id:<{W_ID}} |"
    
    for sc in scenarios:
        key = sc['key']
        val = machine_data.get(m_id, {}).get(key, None)
        
        if val is None:
            formatted_val = "N/A"
        else:
            if val < 0:
                # Mark negative values with [!]
                formatted_val = f"[!] {val:,}" 
                neg_count += 1
            elif val == 0:
                formatted_val = "-"
            else:
                formatted_val = f"{val:,}"
        
        row += f" {formatted_val:>{W_COL}} |"
    
    print(row)

print(DIVIDER)

# 3.4 Footer / Summary
print(f"\n[ SUMMARY ]")
print(f"TOTAL MACHINES   : {len(sorted_machines)}")
if neg_count > 0:
    print(f"INTEGRITY STATUS : CRITICAL FAILURE")
    print(f"ANOMALY COUNT    : {neg_count} Negative Values Detected")
else:
    print(f"INTEGRITY STATUS : PASSED")
    print(f"ANOMALY COUNT    : 0")
print("="*80 + "\n")