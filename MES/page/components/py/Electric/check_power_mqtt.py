import paho.mqtt.client as mqtt
import json
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1884  # Port ใหม่สำหรับค่าไฟ

# หมายเหตุ: หาก Port 1884 ต้องใช้ User/Pass ตัวเดียวกับ 1883 ให้เอา # ออกครับ
# MQTT_USER = "snc-mqtt"
# MQTT_PASS = "snc-mqtt"

# รายการ Topic ทั้งหมดที่ต้องการดึงข้อมูล
TOPICS = [
    "/B9/ECMDB",
    "/B9/DB_PAINT",
    "/B9/DB_SPOTWELDING",
    "/B9/DB_LP1",
    "/B9/DB_LP2",
    "/B9/DB_TEMPORARY",
    "/B9/DB1",
    "/B9/DB_AIRCOM",
    "/B9/DB_LPCN",
    "/B9/DB_ROLLFORMING1",
    "/B9/DB_ROLLFORMING2",
    "/B9/DB_HM_1003_3",
    "/B9/DB_HM_1003_4",
    "/B9/DB_HM_1003_7"
]

# ==========================================
# 2. MQTT CALLBACK FUNCTIONS
# ==========================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[INFO] Connected to MQTT Broker successfully.")
        print("-" * 60)
        
        # วนลูป Subscribe ทุก Topic ที่อยู่ใน List
        for topic in TOPICS:
            client.subscribe(topic)
            print(f"Subscribed -> {topic}")
            
        print("-" * 60)
        print("Waiting for data... (Press Ctrl+C to exit)")
    else:
        print(f"[ERROR] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    topic = msg.topic
    payload_raw = msg.payload.decode('utf-8')
    
    print(f"\n[{timestamp}] TOPIC: {topic}")
    
    try:
        # พยายามแปลงเป็น JSON เพื่อจัดหน้าให้อ่านง่าย
        data_json = json.loads(payload_raw)
        print(json.dumps(data_json, indent=4, ensure_ascii=False))
    except json.JSONDecodeError:
        # หากไม่ใช่ JSON ให้แสดงเป็นข้อความดิบ
        print(f"RAW TEXT: {payload_raw}")

# ==========================================
# 3. MAIN EXECUTION
# ==========================================
def run_mqtt_inspector():
    print("============================================================")
    print("MQTT POWER CONSUMPTION INSPECTOR")
    print(f"Target Broker: {MQTT_HOST}:{MQTT_PORT}")
    print("============================================================")

    # รองรับ paho-mqtt version 2.x
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    # เปิดใช้งานบรรทัดนี้หากระบบต้องใช้ Username/Password
    # client.username_pw_set(MQTT_USER, MQTT_PASS)

    client.on_connect = on_connect
    client.on_message = on_message

    try:
        print("[INFO] Attempting to connect...")
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Disconnected by user. Program terminated.")
    except Exception as e:
        print(f"\n[EXCEPTION] Connection error: {str(e)}")

if __name__ == "__main__":
    run_mqtt_inspector()