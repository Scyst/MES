import paho.mqtt.client as mqtt
import json

# --- ข้อมูลการเชื่อมต่อ ---
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1883
MQTT_TOPIC = "/Counter/B9"
MQTT_USER = "snc-mqtt"
MQTT_PASS = "snc-mqtt"

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ ระบบพร้อมทำงาน! กำลังรับข้อมูล Real-time...")
        client.subscribe(MQTT_TOPIC)
        # พิมพ์หัวตาราง
        print(f"{'WC':<10} | {'Status':<8} | {'Count':<7} | {'Total':<7} | {'CycleTime':<10} | {'Timestamp'}")
        print("-" * 90)
    else:
        print(f"❌ เชื่อมต่อไม่ได้ Code: {rc}")

def on_message(client, userdata, msg):
    try:
        raw_data = json.loads(msg.payload.decode('utf-8'))
        
        if isinstance(raw_data, list):
            for item in raw_data:
                # ดึงข้อมูลทุกตัวที่มีในรูปภาพ
                wc      = item.get('work_center', 'N/A')
                status  = item.get('status', 'N/A')
                counter = item.get('counter', 0)
                total   = item.get('total', 0)
                cycle   = item.get('cycle_time', 0.0)
                ts      = item.get('timestamp', 'N/A')
                pi_name = item.get('pi_name', 'N/A') # ข้อมูลเพิ่มเติม
                
                # แสดงผลแบบจัดแถวให้ตรงกัน (Formatting)
                print(f"{wc:<10} | {status:<8} | {counter:<7} | {total:<7} | {cycle:<10.2f} | {ts}")
            
            # เว้นบรรทัดเมื่อจบหนึ่งชุดข้อมูลที่ส่งมาพร้อมกัน
            print(f"{'='*90} (Update from {pi_name})") 
            
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการแกะข้อมูล: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(MQTT_HOST, MQTT_PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nปิดโปรแกรม")