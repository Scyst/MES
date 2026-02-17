import paho.mqtt.client as mqtt
import json
import os
import time
from datetime import datetime
import threading

# ==========================================
# 1. CONFIGURATION
# ==========================================
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1884

# ใช้ Wildcard ตัวที่จับได้ชัวร์ๆ
SUBSCRIBE_TOPIC = "/B9/#"

# Global Variables สำหรับเก็บค่าล่าสุดของแต่ละมิเตอร์
power_data = {}
lpg_data = {}

# ==========================================
# 2. SCREEN DRAWING FUNCTION (Dashboard)
# ==========================================
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def render_dashboard():
    while True:
        clear_screen()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print("=========================================================================================")
        print(f"⚡ REAL-TIME POWER & UTILITY MONITOR | 🕒 Update: {now_str}")
        print("=========================================================================================")

        # --- ตารางมิเตอร์ไฟฟ้า (Power Meters) ---
        print("\n[ ⚡ ELECTRICAL METERS ]")
        print("-" * 89)
        print(f"{'METER NAME':<18} | {'VOLTAGE (V)':<12} | {'CURRENT (A)':<12} | {'POWER (kW)':<12} | {'P.F.':<6} | {'ENERGY (kWh)':<12}")
        print("-" * 89)
        
        if not power_data:
            print(f"{'Waiting for electrical data...':^89}")
        else:
            for meter in sorted(power_data.keys()):
                d = power_data[meter]
                print(f"{meter:<18} | {d['voltage']:<12.2f} | {d['current']:<12.2f} | {d['power']:<12.2f} | {d['pf']:<6.2f} | {d['cumulative']:<12.2f}")

        # --- ตารางก๊าซ/ของเหลว (LPG / Flow Meters) ---
        print("\n[ 🔥 LPG / FLOW METERS ]")
        print("-" * 89)
        print(f"{'METER NAME':<18} | {'FLOW RATE':<15} | {'VELOCITY':<15} | {'CUMULATIVE':<15}")
        print("-" * 89)
        
        if not lpg_data:
            print(f"{'Waiting for LPG/Flow data...':^89}")
        else:
            for meter in sorted(lpg_data.keys()):
                d = lpg_data[meter]
                print(f"{meter:<18} | {d['flow']:<15.2f} | {d['velocity']:<15.2f} | {d['cumulative']:<15.2f}")
        
        print("\n=========================================================================================")
        print("Press Ctrl+C to exit program")
        
        # รีเฟรชหน้าจอทุกๆ 2 วินาที
        time.sleep(2)

# ==========================================
# 3. MQTT CALLBACKS
# ==========================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        client.subscribe(SUBSCRIBE_TOPIC)

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode('utf-8'))
        
        # ป้องกันกรณีส่งมาเป็น List ว่างเปล่า
        if not payload or not isinstance(payload, list):
            return
            
        # ดึง Record ตัวแรก (มักจะเป็นข้อมูลอัปเดตล่าสุด)
        latest = payload[0]
        
        # สกัดชื่อมิเตอร์จาก Topic (เช่น /B9/iPSS/DB_HM_1003_4/Receive -> DB_HM_1003_4)
        parts = topic.split('/')
        if len(parts) >= 4:
            meter_name = parts[3] 
        else:
            meter_name = "UNKNOWN"

        # เช็คว่าเป็นข้อมูลประเภทไหน โดยดูจาก Key ใน JSON
        if "voltage" in latest:
            # ข้อมูลมิเตอร์ไฟฟ้า
            power_data[meter_name] = {
                "voltage": latest.get("voltage", 0),
                "current": latest.get("current", 0),
                "power": latest.get("power", 0),
                "pf": latest.get("power_factor", 0),
                "cumulative": latest.get("cumulative", 0)
            }
        elif "flow" in latest or "velocity" in latest:
            # ข้อมูล LPG / Flow
            lpg_data[meter_name] = {
                "flow": latest.get("flow", 0),
                "velocity": latest.get("velocity", 0),
                "cumulative": latest.get("cumulative", 0)
            }

    except Exception:
        pass # ป้องกันโปรแกรมเด้งหาก JSON format ผิดเพี้ยนบางจังหวะ

# ==========================================
# 4. EXECUTION
# ==========================================
if __name__ == "__main__":
    # เริ่มต้น Thread สำหรับการวาดหน้าจอ (UI Thread)
    ui_thread = threading.Thread(target=render_dashboard, daemon=True)
    ui_thread.start()

    # เริ่มต้น MQTT Client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        clear_screen()
        print("Monitor Terminated.")