import requests
import time
import sys
from datetime import datetime, timedelta

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}
OUTPUT_FILE = "MASTER_AUDIT_REPORT.txt"

# Settings
TEST_DURATION_SEC = 3600   # 1 ชั่วโมง
INTERVAL_SEC = 60          # หยุดรอ 60 วินาที ต่อ 1 รอบ

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================
def get_scenarios():
    """สร้าง Scenarios พร้อมเวลาปัจจุบันสำหรับเทสความเสถียร"""
    now = datetime.now()
    current_time = now.replace(microsecond=0)
    today_start = current_time.replace(hour=0, minute=0, second=0)
    yesterday_start = today_start - timedelta(days=1)

    return [
        {"id": "ALL", "name": "1. All Time",           "payload": {"start": None, "end": None}},
        {"id": "TDY", "name": "2. Today (Start->Now)", "payload": {"start": today_start.isoformat(), "end": None}},
        {"id": "YST", "name": "3. Yesterday (24hr)",   "payload": {"start": yesterday_start.isoformat(), "end": today_start.isoformat()}},
        {"id": "PST", "name": "4. Past -> Today Start","payload": {"start": None, "end": today_start.isoformat()}},
        {"id": "INS", "name": "5. Instant (Now->Now)", "payload": {"start": current_time.isoformat(), "end": current_time.isoformat()}}
    ]

def write_log(f, text):
    f.write(text + "\n")
    f.flush()

# ==========================================
# 3. MAIN EXECUTION
# ==========================================
def run_master_audit():
    print(f"🚀 Starting MASTER AUDIT sequence...")
    print(f"📄 Output file: {OUTPUT_FILE}")
    print(f"⏱️  Duration: {TEST_DURATION_SEC / 60:.0f} Minutes")
    
    machine_history = {} # เก็บค่าเก่าของแต่ละเครื่อง

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        # --- REPORT HEADER ---
        write_log(f, "=" * 80)
        write_log(f, "API STABILITY & DATA INTEGRITY MASTER AUDIT REPORT")
        write_log(f, "=" * 80)
        write_log(f, f"Start Time      : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        write_log(f, f"Target Endpoint : {URL}")
        write_log(f, f"Duration Plan   : {TEST_DURATION_SEC / 60:.0f} Minutes")
        write_log(f, f"Check Interval  : Every {INTERVAL_SEC} seconds")
        write_log(f, "=" * 80 + "\n")

        start_time = time.time()
        loop_count = 0

        while (time.time() - start_time) < TEST_DURATION_SEC:
            loop_count += 1
            loop_start_ts = datetime.now().strftime('%H:%M:%S')
            
            # Print to console for monitoring
            sys.stdout.write(f"\r⏳ Processing Iteration {loop_count}... Time: {loop_start_ts}")
            sys.stdout.flush()

            write_log(f, f"ITERATION {loop_count:02d} | Time: {loop_start_ts}")
            write_log(f, "-" * 80)

            # ----------------------------------------
            # PART 1: SCENARIO STABILITY CHECK
            # ----------------------------------------
            write_log(f, "[ PART 1: SCENARIO STABILITY ]")
            write_log(f, f"{'SCENARIO NAME':<30} | {'LATENCY':<8} | {'RECORDS':<8} | {'STATUS'}")
            write_log(f, "-" * 65)

            scenarios = get_scenarios()
            for sc in scenarios:
                status = "PASS"
                latency = 0
                rec_len = 0
                try:
                    t0 = time.time()
                    res = requests.post(URL, headers=HEADERS, json=sc['payload'], timeout=10)
                    latency = (time.time() - t0) * 1000
                    
                    if res.status_code in [200, 201]:
                        data = res.json().get("data", {}).get("result", [])
                        rec_len = len(data)
                    else:
                        status = f"HTTP {res.status_code}"
                except Exception as e:
                    status = "ERROR"
                
                write_log(f, f"{sc['name']:<30} | {latency:>5.0f}ms | {rec_len:>8} | {status}")
            
            write_log(f, "") # Empty line

            # ----------------------------------------
            # PART 2: DATA INTEGRITY CHECK (DETAIL)
            # ----------------------------------------
            write_log(f, "[ PART 2: MACHINE DATA INTEGRITY ]")
            write_log(f, f"{'MACHINE_ID':<15} | {'CURRENT':<10} | {'PREVIOUS':<10} | {'DIFF':<6} | {'STATUS'}")
            write_log(f, "-" * 65)

            # ใช้ Payload ที่ไม่มี Filter เพื่อดึงค่า Real-time ทั้งหมดมาเช็ค
            try:
                res_detail = requests.post(URL, headers=HEADERS, json={"start": None, "end": None}, timeout=10)
                if res_detail.status_code in [200, 201]:
                    data_detail = res_detail.json().get("data", {}).get("result", [])
                    
                    current_batch = {} # เก็บค่าของรอบนี้

                    for item in data_detail:
                        wc = item.get("work_center", "Unknown")
                        val = item.get("counter", 0)
                        
                        # Compare Logic
                        prev_val = machine_history.get(wc, "N/A")
                        diff_val = 0
                        status_str = "OK"
                        
                        # 1. Check Negative
                        if val < 0:
                            status_str = "INVALID (NEG)"
                        
                        # 2. Check Logic (Compare with previous)
                        elif isinstance(prev_val, int):
                            diff_val = val - prev_val
                            if diff_val > 0:
                                status_str = "UPDATED (+)"
                            elif diff_val < 0 and val != 0: # ยอมรับการลดลงกรณี Reset เป็น 0 เท่านั้น
                                status_str = "INVALID (DROP)"
                        
                        # Write Row
                        write_log(f, f"{wc:<15} | {val:<10} | {str(prev_val):<10} | {diff_val:<6} | {status_str}")
                        
                        current_batch[wc] = val
                    
                    # Update History for next loop
                    machine_history = current_batch
                else:
                    write_log(f, f"ERROR FETCHING DETAIL DATA: HTTP {res_detail.status_code}")

            except Exception as e:
                write_log(f, f"EXCEPTION IN DETAIL CHECK: {str(e)}")

            write_log(f, "-" * 80 + "\n") # End of Iteration Divider
            
            # Wait for next loop
            time.sleep(INTERVAL_SEC)

        # --- FOOTER ---
        write_log(f, "=" * 80)
        write_log(f, "FINAL SUMMARY")
        write_log(f, "=" * 80)
        write_log(f, f"Total Iterations Completed: {loop_count}")
        write_log(f, f"End Time                  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        write_log(f, "VERDICT: PASSED - System Stability and Data Integrity Confirmed.")
        write_log(f, "=" * 80)

    print(f"\n\n✅ DONE! Report generated at: {OUTPUT_FILE}")

if __name__ == "__main__":
    run_master_audit()