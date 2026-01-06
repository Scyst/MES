import requests
import json

url = "https://api-gateway-v1.sncformer.com/mes/b9/v1/api/open-api/mes/counter"

# ลองระบุช่วงเวลาที่แคบลง (เช่น ช่วง 1 ชั่วโมง)
payload = {
    "workCenter": "SCEBEA07",
    "start": "2026-01-06T08:00:00.000Z", 
    "end": "2026-01-06T09:00:00.000Z"
}

headers = {'Content-Type': 'application/json'}

response = requests.post(url, headers=headers, json=payload)
print(json.dumps(response.json(), indent=4, ensure_ascii=False))