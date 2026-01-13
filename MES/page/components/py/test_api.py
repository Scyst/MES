import requests
import json

# แก้ไข URL ตัด / ที่ซ้ำกันออก
url = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter/all"

# ลองระบุช่วงเวลาที่แคบลง (เช่น ช่วง 1 ชั่วโมง)
payload = {
    "start": None, 
    "end": None  # แก้ไขจาก null เป็น None
}

headers = {'Content-Type': 'application/json'}

try:
    # เพิ่ม timeout เพื่อป้องกันโปรแกรมค้างหากเน็ตมีปัญหา
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    
    # ตรวจสอบสถานะการตอบกลับ (เช่น 200 OK)
    response.raise_for_status() 
    
    print(json.dumps(response.json(), indent=4, ensure_ascii=False))

except requests.exceptions.RequestException as e:
    print(f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {e}")