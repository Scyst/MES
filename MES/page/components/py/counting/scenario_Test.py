import requests
import time
import sys
from datetime import datetime, timedelta

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}
OUTPUT_FILE = "api_stability_report_1hr.txt"

# SETTINGS
TEST_DURATION_SEC = 3600  # 1 ชั่วโมง (60 * 60)
INTERVAL_SEC = 60         # รอ 60 วินาทีก่อนเริ่มรอบใหม่ (1 ชั่วโมงจะได้ประมาณ 60 รอบ x 5 เคส)

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================
def get_scenarios():
    """Generate scenarios with updated timestamps for each loop"""
    now = datetime.now()
    current_time = now.replace(microsecond=0)
    today_start = current_time.replace(hour=0, minute=0, second=0)
    yesterday_start = today_start - timedelta(days=1)

    str_now = current_time.isoformat()
    str_today = today_start.isoformat()
    str_yest = yesterday_start.isoformat()

    return [
        {"id": "ALL", "name": "1. All Time",           "payload": {"start": None, "end": None}},
        {"id": "TDY", "name": "2. Today (Start->Now)", "payload": {"start": str_today, "end": None}},
        {"id": "YST", "name": "3. Yesterday (24hr)",   "payload": {"start": str_yest, "end": str_today}},
        {"id": "PST", "name": "4. Past -> Today Start","payload": {"start": None, "end": str_today}},
        {"id": "INS", "name": "5. Instant (Now->Now)", "payload": {"start": str_now, "end": str_now}}
    ]

def write_log(file_handle, text):
    """Write to file and console simultaneously"""
    file_handle.write(text + "\n")
    # Flush to ensure data is saved even if script is stopped
    file_handle.flush() 

# ==========================================
# 3. MAIN EXECUTION
# ==========================================
print(f"Starting 1-Hour Stability Test...")
print(f"Output will be saved to: {OUTPUT_FILE}")
print(f"Please wait... (You can minimize this window)")

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    # --- HEADER ---
    write_log(f, "=" * 80)
    write_log(f, "API STABILITY & SCENARIO AUDIT REPORT")
    write_log(f, "=" * 80)
    write_log(f, f"Start Time      : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    write_log(f, f"Target Endpoint : {URL}")
    write_log(f, f"Duration Plan   : {TEST_DURATION_SEC / 60:.0f} Minutes")
    write_log(f, f"Test Interval   : Every {INTERVAL_SEC} seconds")
    write_log(f, "-" * 80)
    write_log(f, f"{'TIMESTAMP':<20} | {'SCENARIO NAME':<25} | {'LATENCY':<8} | {'RECORDS':<8} | {'STATUS'}")
    write_log(f, "-" * 80)

    start_time = time.time()
    loop_count = 0
    error_count = 0
    
    # --- MAIN LOOP ---
    while (time.time() - start_time) < TEST_DURATION_SEC:
        loop_count += 1
        current_scenarios = get_scenarios() # Regenerate time for "Now" cases
        
        # Print progress on console only (to not clutter log file)
        elapsed = int(time.time() - start_time)
        sys.stdout.write(f"\rRunning Loop {loop_count}... (Elapsed: {elapsed}s / {TEST_DURATION_SEC}s)")
        sys.stdout.flush()

        for case in current_scenarios:
            ts = datetime.now().strftime('%H:%M:%S')
            status = "PASS"
            note = ""
            record_count = 0
            latency_ms = 0

            try:
                req_start = time.time()
                response = requests.post(URL, headers=HEADERS, json=case['payload'], timeout=10)
                latency_ms = (time.time() - req_start) * 1000

                if response.status_code in [200, 201]:
                    data = response.json().get("data", {}).get("result", [])
                    record_count = len(data)
                    
                    # Validate Data Logic
                    negatives = [item for item in data if item.get("counter", 0) < 0]
                    if negatives:
                        status = "FAIL"
                        note = f"Found {len(negatives)} negative values"
                        error_count += 1
                    
                    # Special check for Scenario 5 (Instant) -> Should return 0 records or 0 counter
                    if case['id'] == "INS":
                         total_val = sum(item.get("counter", 0) for item in data)
                         if total_val > 0:
                             status = "WARN"
                             note = "Instant time range has value (Check Filter)"

                else:
                    status = "FAIL"
                    note = f"HTTP {response.status_code}"
                    error_count += 1

            except Exception as e:
                status = "ERROR"
                note = str(e)
                error_count += 1
            
            # Format output line
            log_line = f"{ts:<20} | {case['name']:<25} | {latency_ms:>6.0f}ms | {record_count:>8} | {status} {note}"
            write_log(f, log_line)

        # Wait before next loop
        write_log(f, "-" * 80) # Separator between loops
        time.sleep(INTERVAL_SEC)

    # --- FOOTER ---
    end_time = datetime.now()
    write_log(f, "\n" + "=" * 80)
    write_log(f, "TEST SUMMARY")
    write_log(f, "=" * 80)
    write_log(f, f"Completion Time : {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    write_log(f, f"Total Loops     : {loop_count}")
    write_log(f, f"Total Scenarios : {loop_count * 5}")
    write_log(f, f"Errors Found    : {error_count}")
    
    if error_count == 0:
        write_log(f, "OVERALL RESULT  : PASSED (System is Stable)")
    else:
        write_log(f, "OVERALL RESULT  : FAILED (Errors Detected)")
    write_log(f, "=" * 80)

print(f"\n\n[DONE] 1-Hour Test Complete.")
print(f"Report saved to: {OUTPUT_FILE}")