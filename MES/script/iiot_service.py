import paho.mqtt.client as mqtt
import json
from datetime import datetime
import threading
import time
import urllib.request
import urllib.error
import os

# --- Configuration ---
MQTT_BROKER = "10.1.68.100"
MQTT_PORT = 1883
MQTT_TOPIC = "/Counter/B9"
MQTT_USER = "snc-mqtt"
MQTT_PASS = "snc-mqtt"

# Web API Configuration
API_BASE_URL = os.environ.get("MES_API_URL", "http://localhost/MES")
API_URL = f"{API_BASE_URL}/page/PE/api/iiotAPI.php?action=update_telemetry"

def process_payload(payload):
    try:
        # Ensure payload is a list (if it's a single object, wrap it)
        if isinstance(payload, dict):
            payload = [payload]
            
        for item in payload:
            topic_name = item.get("work_center")
            if not topic_name:
                continue
                
            status = str(item.get("status", "UNKNOWN")).upper()
            counter = item.get("counter", 0)
            total = item.get("total", 0)
            cycle_time = item.get("cycle_time", 0)
            
            # Map Python keys to PHP iiotAPI.php expected keys
            post_data = {
                "topic_name": topic_name,
                "live_status": status,
                "live_counter": counter,
                "live_total": total,
                "cycle_time": cycle_time
            }
            
            req_data = json.dumps(post_data).encode('utf-8')
            req = urllib.request.Request(
                API_URL,
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            
            # Call PHP HTTP API using urllib.request standard library
            try:
                with urllib.request.urlopen(req, timeout=5) as response:
                    res_body = response.read().decode('utf-8')
                    res_json = json.loads(res_body)
                    if not res_json.get("success"):
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ API Error: {res_json.get('message')}")
            except urllib.error.HTTPError as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ HTTP Error {e.code}: {e.read().decode('utf-8', errors='ignore')}")
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Request Error: {e}")
                
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Ingestion Error: {e}")

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Connected to MQTT Broker")
        client.subscribe(MQTT_TOPIC)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 📡 Listening to topic: {MQTT_TOPIC} ...")
    else:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ MQTT Connection failed: {rc}")

def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode('utf-8')
        payload_json = json.loads(payload_str)
        
        count = len(payload_json) if isinstance(payload_json, list) else 1
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 📥 Received data for {count} machines. Updating DB...")
        
        # Process in a separate thread so we don't block the MQTT loop
        threading.Thread(target=process_payload, args=(payload_json,)).start()
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Message Error (Not valid JSON?): {e}")

print("=" * 60)
print("🚀 MES IIoT Background Service (MQTT -> SQL)")
print("=" * 60)

try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
except:
    client = mqtt.Client()

client.username_pw_set(MQTT_USER, MQTT_PASS)
client.on_connect = on_connect
client.on_message = on_message

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\n👋 Service stopped.")
