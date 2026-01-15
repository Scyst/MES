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
    {"name": "1. All Time (None)",      "payload": {"start": None, "end": None}},
    {"name": "2. Today (Start->Now)",   "payload": {"start": STR_TODAY, "end": None}},
    {"name": "3. Yesterday (24hr)",     "payload": {"start": STR_YEST, "end": STR_TODAY}},
    {"name": "4. Past -> Today Start",  "payload": {"start": None, "end": STR_TODAY}},
    {"name": "5. Instant (Now->Now)",   "payload": {"start": STR_NOW, "end": STR_NOW}}
]

# ==========================================
# TABLE FORMATTING LOGIC
# ==========================================
W_SCEN = 25
W_TIME = 46
W_MACH = 10
W_COUNT = 15
W_DUR = 8

border_line = f"+{'-' * (W_SCEN+2)}+{'-' * (W_TIME+2)}+{'-' * (W_MACH+2)}+{'-' * (W_COUNT+2)}+{'-' * (W_DUR+2)}+"
row_format = f"| {{:<{W_SCEN}}} | {{:<{W_TIME}}} | {{:>{W_MACH}}} | {{:>{W_COUNT}}} | {{:>{W_DUR}}} |"

# Storage for later comparison
scenario_data = [] 

# ==========================================
# EXECUTION START
# ==========================================
print(f"\nAPI SCENARIO TESTING REPORT")
print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(border_line)
print(row_format.format("Scenario", "Time Condition (Start > End)", "Machines", "Total Count", "Time"))
print(border_line)

for test in test_scenarios:
    payload = test["payload"]
    t_start = payload['start'] if payload['start'] else "None"
    t_end = payload['end'] if payload['end'] else "None"
    condition_str = f"{t_start} > {t_end}"

    try:
        req_start = datetime.now()
        response = requests.post(URL, headers=HEADERS, json=payload, timeout=10)
        duration = (datetime.now() - req_start).total_seconds()
        
        response.raise_for_status()
        data = response.json()
        result_list = data.get("data", {}).get("result", [])
        
        # Save data for analysis
        scenario_data.append(result_list)
        
        # Calculate stats
        total_count = sum(item.get("counter", 0) for item in result_list)
        machine_count = len(result_list)
        
        # Print Row
        count_str = f"{total_count:,}"
        dur_str = f"{duration:.2f}s"
        print(row_format.format(test['name'], condition_str, machine_count, count_str, dur_str))

    except Exception as e:
        scenario_data.append([]) # Append empty if error
        print(row_format.format(test['name'], condition_str, "ERR", "ERR", "0.00s"))

print(border_line)

# ==========================================
# MISSING MACHINES ANALYSIS
# ==========================================
# Index 1 = Today (Scenario 2)
# Index 2 = Yesterday (Scenario 3)

if len(scenario_data) >= 3:
    list_today = scenario_data[1]
    list_yesterday = scenario_data[2]

    # Extract Work Center names
    machines_today = set(item['work_center'] for item in list_today)
    machines_yesterday = set(item['work_center'] for item in list_yesterday)

    # Find difference (In Yesterday BUT NOT In Today)
    missing_machines = machines_yesterday - machines_today

    print("\nANOMALY DETECTION: YESTERDAY VS TODAY")
    print("-" * 50)
    print(f"Machines Yesterday : {len(machines_yesterday)}")
    print(f"Machines Today     : {len(machines_today)}")
    
    if missing_machines:
        print(f"Difference         : -{len(missing_machines)} machines (Missing in Today's list)")
        print("-" * 50)
        print("LIST OF MISSING MACHINES:")
        for i, name in enumerate(sorted(missing_machines), 1):
            print(f"  {i:02d}. {name}")
        print("-" * 50)
        print("NOTE: If status is 'Current', these machines should not disappear.")
    else:
        print("-" * 50)
        print("STATUS: OK (No missing machines)")
    
    print("=" * 50)