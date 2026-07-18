import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
MQTT_HOST = "10.1.68.100"
MQTT_PORT = 1884

# ชื่อไฟล์สำหรับบันทึกผลลัพธ์การวิเคราะห์
OUTPUT_FILE = "mqtt_system_profile.json"

# Dictionary สำหรับเก็บสถานะของแต่ละ Topic
topic_registry = {}

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def export_profile_to_file():
    """แปลงข้อมูลสถิติและเซฟลงไฟล์ JSON ให้อ่านง่าย"""
    export_data = {
        "_meta": {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_topics_discovered": len(topic_registry)
        },
        "topics": {}
    }
    
    # เรียงลำดับ Topic ตามตัวอักษรเพื่อให้ค้นหาง่าย
    for topic in sorted(topic_registry.keys()):
        data = topic_registry[topic]
        
        # คำนวณความถี่แบบอ่านง่าย (นาที/วินาที)
        avg_sec = data["average_interval_sec"]
        if avg_sec > 0:
            mins, secs = divmod(int(avg_sec), 60)
            freq_str = f"{mins}m {secs}s" if mins > 0 else f"{int(secs)}s"
        else:
            freq_str = "Calculating..."

        export_data["topics"][topic] = {
            "total_messages_received": data["message_count"],
            "average_update_interval": freq_str,
            "average_interval_seconds": avg_sec,
            "sample_payload": data["sample_payload"]
        }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=4, ensure_ascii=False)

# ==========================================
# MQTT CALLBACKS
# ==========================================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[INFO] Connected to MQTT Broker successfully.")
        client.subscribe("/B9/#")
        client.subscribe("B9/#")
        print(f"[INFO] Radar active. Subscribed to /B9/# and B9/#")
        print(f"[INFO] Profiling data will be saved to: {OUTPUT_FILE}")
        print("[INFO] Listening... (Press Ctrl+C to stop)\\n")
    else:
        print(f"[ERROR] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_raw = msg.payload.decode('utf-8')
    now_ts = time.time()

    # พยายามแปลง Payload เป็น JSON เพื่อให้เซฟลงไฟล์ได้สวยงาม
    try:
        payload_parsed = json.loads(payload_raw)
    except json.JSONDecodeError:
        payload_parsed = payload_raw

    # ตรรกะการวิเคราะห์ข้อมูล
    if topic not in topic_registry:
        # กรณีเจอ Topic ใหม่ เก็บตัวอย่างทันที
        topic_registry[topic] = {
            "message_count": 1,
            "last_seen_ts": now_ts,
            "intervals_sec": [],
            "average_interval_sec": 0,
            "sample_payload": payload_parsed # <--- เก็บตัวอย่าง 1 ชุดที่นี่
        }
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [NEW] Discovered Topic: {topic}")
    else:
        # กรณีเจอ Topic เดิม คำนวณระยะห่าง
        stats = topic_registry[topic]
        interval = now_ts - stats["last_seen_ts"]
        
        stats["intervals_sec"].append(interval)
        stats["last_seen_ts"] = now_ts
        stats["message_count"] += 1
        
        # หาค่าเฉลี่ย
        avg = sum(stats["intervals_sec"]) / len(stats["intervals_sec"])
        stats["average_interval_sec"] = round(avg, 2)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [UPD] {topic:<35} | Count: {stats['message_count']:<4} | Avg Freq: {stats['average_interval_sec']}s")

    # อัปเดตไฟล์ทันทีที่มีความเคลื่อนไหว
    export_profile_to_file()

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    print("============================================================")
    print("MQTT SMART PROFILER (DISCOVERY & FREQUENCY ANALYSIS)")
    print("============================================================")
    
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\\n============================================================")
        print("[INFO] Profiling stopped by user.")
        print(f"[SUCCESS] Final profile saved to: {OUTPUT_FILE}")
        print("============================================================")