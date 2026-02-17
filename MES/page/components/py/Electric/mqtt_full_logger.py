import paho.mqtt.client as mqtt
import json
import os
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1884

# ไฟล์สำหรับบันทึกข้อมูล
TOPIC_FILE = "discovered_topics.txt"
RAW_LOG_FILE = "raw_mqtt_dump.log"

# ตัวแปรเก็บรายชื่อ Topic ที่เจอแล้ว (จะได้ไม่จดซ้ำ)
discovered_topics = set()

# ==========================================
# 2. SETUP ENVIRONMENT
# ==========================================
# ล้างไฟล์ log เก่าทิ้งก่อนเริ่มรันใหม่ (ถ้ามี)
if os.path.exists(RAW_LOG_FILE):
    os.remove(RAW_LOG_FILE)

print("============================================================")
print("MQTT FULL LOGGER & TOPIC DISCOVERY")
print(f"Target Broker: {MQTT_HOST}:{MQTT_PORT}")
print(f"Topic List File: {TOPIC_FILE}")
print(f"Raw Data File: {RAW_LOG_FILE}")
print("============================================================")

# ==========================================
# 3. MQTT CALLBACKS
# ==========================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[INFO] Connected to Broker successfully.")
        
        # กวาดทุกอย่างที่ขึ้นต้นด้วย /B9/ และ B9/
        client.subscribe("/B9/#")
        client.subscribe("B9/#")
        print("[INFO] Radar Active. Subscribed to wildcard '/B9/#'")
        print("[INFO] Listening for data... (Press Ctrl+C to stop)")
        print("-" * 60)
    else:
        print(f"[ERROR] Connection failed. Code: {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_raw = msg.payload.decode('utf-8')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # ------------------------------------------------
    # 1. อัปเดตรายชื่อ Topic (ถ้าเจออันใหม่)
    # ------------------------------------------------
    if topic not in discovered_topics:
        discovered_topics.add(topic)
        
        # เขียนรายชื่อ Topic ทั้งหมดลงไฟล์
        with open(TOPIC_FILE, "w", encoding="utf-8") as f:
            f.write(f"=== DISCOVERED TOPICS (Total: {len(discovered_topics)}) ===\n")
            f.write(f"Last Update: {timestamp}\n")
            f.write("-" * 50 + "\n")
            for t in sorted(discovered_topics):
                f.write(t + "\n")
                
        # แจ้งเตือนบนหน้าจอว่าเจอ Topic ใหม่
        print(f"[{timestamp}] NEW TOPIC DISCOVERED: {topic}")

    # ------------------------------------------------
    # 2. บันทึกข้อมูลดิบลงไฟล์ (Log)
    # ------------------------------------------------
    with open(RAW_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] TOPIC: {topic}\n")
        
        # จัด Format ให้สวยงามถ้าเป็น JSON
        try:
            data_json = json.loads(payload_raw)
            formatted_json = json.dumps(data_json, indent=4, ensure_ascii=False)
            f.write(f"{formatted_json}\n")
        except json.JSONDecodeError:
            f.write(f"{payload_raw}\n")
            
        f.write("-" * 80 + "\n")

# ==========================================
# 4. MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n============================================================")
        print("[INFO] Program stopped by user.")
        print(f"Total Topics Discovered: {len(discovered_topics)}")
        print(f"Check '{TOPIC_FILE}' for the list of topics.")
        print(f"Check '{RAW_LOG_FILE}' for the complete data.")
        print("============================================================")