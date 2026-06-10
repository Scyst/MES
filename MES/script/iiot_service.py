import paho.mqtt.client as mqtt
import json
from datetime import datetime
import pyodbc
import threading
import time

# --- Configuration ---
MQTT_BROKER = "10.1.68.100"
MQTT_PORT = 1883
MQTT_TOPIC = "/Counter/B9"
MQTT_USER = "snc-mqtt"
MQTT_PASS = "snc-mqtt"

# Database Configuration
DB_SERVER = "10.1.1.31"
DB_NAME = "PE_MES"
DB_USER = "TOOLBOX"  # Use Toolbox user
DB_PASS = "I1o1@T@#1boX"

# Connection string
CONN_STR = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASS}'

def get_db_connection():
    return pyodbc.connect(CONN_STR)

def process_payload(payload):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
            
            # Safe JSON string for discovery
            safe_payload = json.dumps(item)
            
            # 1. Update PE_IIOT_DISCOVERY
            cursor.execute("""
                UPDATE PE_IIOT_DISCOVERY
                SET last_payload = ?, last_seen = GETDATE()
                WHERE topic_name = ?
            """, (safe_payload, topic_name))
            
            if cursor.rowcount == 0:
                cursor.execute("""
                    INSERT INTO PE_IIOT_DISCOVERY (topic_name, last_payload, last_seen)
                    VALUES (?, ?, GETDATE())
                """, (topic_name, safe_payload))

            # 2. Update PE_IIOT_TELEMETRY (Only if mapped in PE_MACHINES)
            cursor.execute("""
                DECLARE @RealMC VARCHAR(50);
                SELECT TOP 1 @RealMC = machine_code FROM PE_MACHINES WHERE mqtt_topic = ? AND is_active = 1;
                
                IF @RealMC IS NOT NULL
                BEGIN
                    UPDATE PE_IIOT_TELEMETRY 
                    SET live_status = ?, live_counter = ?, live_total = ?, cycle_time = ?, last_updated = GETDATE()
                    WHERE machine_code = @RealMC;
                    
                    IF @@ROWCOUNT = 0
                    BEGIN
                        INSERT INTO PE_IIOT_TELEMETRY (machine_code, live_status, live_counter, live_total, cycle_time, last_updated)
                        VALUES (@RealMC, ?, ?, ?, ?, GETDATE());
                    END
                END
            """, (topic_name, status, counter, total, cycle_time, status, counter, total, cycle_time))

        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Database Error: {e}")

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
