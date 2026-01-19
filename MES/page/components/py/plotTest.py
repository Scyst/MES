import requests
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, timedelta

# ==========================================
# 1. CONFIGURATION
# ==========================================
URL = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"
HEADERS = {'Content-Type': 'application/json'}

# ย้อนหลังกี่วัน?
DAYS_BACK = 1
# ความถี่ (ชั่วโมง)
HOURS_STEP = 1

# ==========================================
# 2. FETCH DATA LOOPER
# ==========================================
now = datetime.now().replace(minute=0, second=0, microsecond=0)
start_time = now - timedelta(days=DAYS_BACK)

print(f"🚀 Mission: Hunting down the BAD Machine!")
print(f"🎯 Time Range: {start_time} -> {now}")
print("-" * 50)

current = start_time
all_records = []

while current <= now:
    t_start = current.isoformat()
    t_end = (current + timedelta(hours=HOURS_STEP)).isoformat()
    
    payload = {"start": t_start, "end": t_end}
    
    try:
        print(f"Fetching: {t_start} ... ", end="")
        response = requests.post(URL, headers=HEADERS, json=payload, timeout=5)
        
        if response.status_code in [200, 201]:
            data = response.json()
            result_list = data.get("data", {}).get("result", [])
            
            if result_list:
                for item in result_list:
                    all_records.append({
                        "Timestamp": current,
                        "Machine": item.get("work_center", "Unknown"),
                        "Counter": item.get("counter", 0)
                    })
                print(f"✅ OK ({len(result_list)} machines)")
            else:
                print("⚠️ No Data")
        else:
            print(f"❌ API Fail ({response.status_code})")
            
    except Exception as e:
        print(f"💀 Error: {e}")

    current += timedelta(hours=HOURS_STEP)

# ==========================================
# 3. PROCESS & PIVOT DATA
# ==========================================
if not all_records:
    print("\n❌ ไม่พบข้อมูลเลยครับพี่ กลับบ้านนอนเถอะ")
    exit()

print("\n📊 Processing Data with Pandas...")
df = pd.DataFrame(all_records)
pivot_df = df.pivot_table(index="Timestamp", columns="Machine", values="Counter")
pivot_df = pivot_df.fillna(0)

# ==========================================
# 4. PLOTTING
# ==========================================
plt.figure(figsize=(14, 8))

# 4.1 พล็อตเส้น
pivot_df.plot(ax=plt.gca(), marker='.', alpha=0.6, colormap='tab20', linewidth=1)

# 4.2 🔥 ไฮไลท์จุดตาย (แก้ Type Error แล้ว)
negatives = df[df['Counter'] < 0]
if not negatives.empty:
    neg_times = mdates.date2num(negatives['Timestamp'])
    plt.scatter(neg_times, negatives['Counter'], 
                color='red', s=100, zorder=5, label='BUG (Negative Value)', edgecolors='black')
    
    print("\n🚨🚨🚨 FOUND BAD MACHINES (NEGATIVE VALUES) 🚨🚨🚨")
    print(negatives[['Timestamp', 'Machine', 'Counter']].to_string(index=False))
else:
    print("\n✅ ไม่พบค่าติดลบ")

# ตกแต่งกราฟ
plt.title(f'Machine Performance Analysis (Last {DAYS_BACK} Days)', fontsize=16, fontweight='bold')
plt.xlabel('Time Timeline', fontsize=12)
plt.ylabel('Counter Value', fontsize=12)
plt.axhline(0, color='black', linewidth=1, linestyle='--')
plt.grid(True, linestyle='--', alpha=0.5)
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%d/%m %H:%M'))
plt.gcf().autofmt_xdate()
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0., title="Machine ID")
plt.tight_layout()

# ==========================================
# 5. SAVE FIRST -> THEN SHOW
# ==========================================
filename = f"machine_analysis_{datetime.now().strftime('%Y%m%d_%H%M')}.png"
plt.savefig(filename)  # <--- สลับเอาบรรทัดนี้ขึ้นมาก่อน
print(f"\n💾 Saved Evidence to: {filename}")

plt.show() # <--- แสดงผลทีหลังสุด