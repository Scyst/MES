import paho.mqtt.client as mqtt
import json
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1884

# เปิดใช้งานหากรอบนี้จำเป็นต้องใช้รหัสผ่าน (ลองแบบไม่ใส่ก่อน ถ้าไม่มาค่อยเอา # ออก)
# MQTT_USER = "snc-mqtt"
# MQTT_PASS = "snc-mqtt"

# ==========================================
# MQTT CALLBACKS
# ==========================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[INFO] Connected to Broker successfully.")
        print("-" * 60)
        
        # 1. ดักจับแบบมี Slash นำหน้า (ตามเอกสาร)
        client.subscribe("/B9/#")
        print("Subscribed -> /B9/# (ดักทุกอย่างที่ขึ้นต้นด้วย /B9/)")
        
        # 2. ดักจับแบบไม่มี Slash นำหน้า (เผื่อเอกสารพิมพ์ผิด)
        client.subscribe("B9/#")
        print("Subscribed -> B9/# (ดักทุกอย่างที่ขึ้นต้นด้วย B9/)")
        
        # 3. ดักจับทุกอย่างในระบบ (กวาดหมดทั้ง Broker)
        # client.subscribe("#") 
        # print("Subscribed -> # (ดักข้อมูลทุก Topic ในระบบ)")
        
        print("-" * 60)
        print("RADAR ACTIVE: Waiting for any data... (Press Ctrl+C to exit)")
    else:
        print(f"[ERROR] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    topic = msg.topic
    payload_raw = msg.payload.decode('utf-8')
    
    print(f"\n[{timestamp}] 🎯 FOUND DATA ON TOPIC: {topic}")
    
    try:
        data_json = json.loads(payload_raw)
        print(json.dumps(data_json, indent=4, ensure_ascii=False))
    except json.JSONDecodeError:
        print(f"RAW TEXT: {payload_raw}")

# ==========================================
# EXECUTION
# ==========================================
def run_radar():
    print("============================================================")
    print("MQTT RADAR SCANNER (WILDCARD MODE)")
    print(f"Target: {MQTT_HOST}:{MQTT_PORT}")
    print("============================================================")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    # client.username_pw_set(MQTT_USER, MQTT_PASS)

    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Radar stopped by user.")
    except Exception as e:
        print(f"\n[EXCEPTION] Error: {str(e)}")

if __name__ == "__main__":
    run_radar()