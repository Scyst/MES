/**
 * Final assessment bank for course `c-enterprise-app`
 * Enterprise Application Design, Development & Integration (BOI STEMPlus Certified Curriculum)
 *
 * Conforming to ISO 9001:2015 Clause 7.2 (Competency & Training Effectiveness Evaluation)
 * Contains dual assessment modes:
 * - Standard Mode: 20 Questions (Level 3 Specialist Certification - Pass Mark 70%)
 * - Expert Mode: 40 Questions (Level 4 Enterprise Architect - Pass Mark 80%)
 */

export const ENTERPRISE_APP_EXAM_STANDARD = [
  {
    "id": "ent-std-1",
    "question": "ข้อใดเป็นระบบ OT ทั้งหมด",
    "options": [
      "A: ERP, CRM และอีเมลองค์กร",
      "B: PLC, HMI และเซนเซอร์วัดอุณหภูมิ",
      "C: ฐานข้อมูลบัญชี, HMI และ ERP",
      "D: เว็บไซต์บริษัท, PLC และอีเมลองค์กร"
    ],
    "correctAnswer": 1,
    "explanation": "PLC, HMI และเซนเซอร์ควบคุมหรือวัดค่าจากกระบวนการผลิตโดยตรงจึงเป็น OT ทั้งหมด ข้ออื่นมีระบบ IT ปนอยู่ (โครงสร้างระดับตาม IEC 62264 / ISA-95)"
  },
  {
    "id": "ent-std-2",
    "question": "ทีม IT ต้องการติดตั้งอัปเดตความปลอดภัยให้คอมพิวเตอร์ที่ควบคุมเครื่องจักรทันทีระหว่างกะผลิต ข้อกังวลหลักจากมุมมอง OT คือข้อใด",
    "options": [
      "A: หน้าจออาจเปลี่ยนสี",
      "B: ค่าลิขสิทธิ์ซอฟต์แวร์อาจสูงขึ้น",
      "C: ข้อมูลอาจถูกส่งออกไปนอกบริษัท",
      "D: การรีสตาร์ตอาจทำให้เครื่องจักรหยุด กระทบการผลิตและความปลอดภัย"
    ],
    "correctAnswer": 3,
    "explanation": "OT ให้ความสำคัญกับ Safety และ Availability การอัปเดตจึงต้องวางแผนช่วงหยุดเครื่อง ไม่ทำกลางกะผลิต (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-std-3",
    "question": "ในระบบ Dashboard ค่าน้ำ-ไฟของ Workshop ส่วนใดทำงานอยู่ฝั่ง Server",
    "options": [
      "A: การตอบค่าน้ำ-ไฟเป็น JSON ผ่าน /api/meter",
      "B: การเปลี่ยนสีป้ายสถานะเมื่อกดปุ่ม",
      "C: การตรวจค่าที่ผู้ใช้พิมพ์ในช่อง input ทันที",
      "D: การแสดงเวลาอัปเดตล่าสุดบนหน้าจอ"
    ],
    "correctAnswer": 0,
    "explanation": "API ที่ตอบข้อมูลอยู่บน Server ส่วนการแสดงผลและการตรวจค่าที่ผู้ใช้พิมพ์ทำด้วย JavaScript ในเบราว์เซอร์ (Client)"
  },
  {
    "id": "ent-std-4",
    "question": "JSON ข้อใดถูกต้องทั้งหมด",
    "options": [
      "A: {\"line\": \"A\", \"temps\": [72.5, 73.0,]}",
      "B: {\"line\": \"A\", \"online\": True}",
      "C: {\"line\": \"A\", \"temps\": [72.5, 73.0]}",
      "D: {\"line\": \"A\", \"note\": undefined}"
    ],
    "correctAnswer": 2,
    "explanation": "ตาม RFC 8259 ห้ามมี comma ตัวสุดท้ายแม้อยู่ใน Array ค่า boolean ต้องเป็น true ตัวเล็ก และไม่มีค่า undefined"
  },
  {
    "id": "ent-std-5",
    "question": "data = {\"line\": {\"name\": \"A\", \"machines\": [{\"id\": \"M-01\", \"sensors\": {\"temp\": 72}}, {\"id\": \"M-02\", \"sensors\": {\"temp\": 65}}]}}  ต้องเขียนอย่างไรจึงได้ค่า 65",
    "options": [
      "A: data.machines[1].sensors.temp",
      "B: data.line.machines[2].sensors.temp",
      "C: data.line.machines[1].temp",
      "D: data.line.machines[1].sensors.temp"
    ],
    "correctAnswer": 3,
    "explanation": "ไล่ทีละชั้น: line เป็น Object › machines เป็น Array ตัวที่สองคือ [1] › sensors เป็น Object › อ่าน temp"
  },
  {
    "id": "ent-std-6",
    "question": "จาก {\"sensors\": [10, 20, 30, 40]} ค่า data.sensors[data.sensors.length - 2] คือเท่าไร",
    "options": [
      "A: 20",
      "B: 30",
      "C: 40",
      "D: undefined"
    ],
    "correctAnswer": 1,
    "explanation": "length คือ 4 ดังนั้น length - 2 คือ index 2 ซึ่งเป็นตัวที่สาม ได้ 30 (index เริ่มที่ 0)"
  },
  {
    "id": "ent-std-7",
    "question": "JSON.stringify({ a: 1, b: undefined, c: null }) ได้ผลลัพธ์ใด",
    "options": [
      "A: {\"a\":1,\"c\":null}",
      "B: {\"a\":1,\"b\":undefined,\"c\":null}",
      "C: {\"a\":1,\"b\":null,\"c\":null}",
      "D: {\"a\":1}"
    ],
    "correctAnswer": 0,
    "explanation": "JSON ไม่มีชนิด undefined จึงตัด key b ทิ้ง แต่ null เป็นค่าที่ JSON รองรับจึงยังอยู่ (อ้างอิง RFC 8259 และ ECMA-262)"
  },
  {
    "id": "ent-std-8",
    "question": "ต้องการทำเมนูลิงก์ไปหน้าต่าง ๆ ของ Dashboard ควรใช้แท็ก Semantic ใดครอบเมนู",
    "options": [
      "A: <div class=\"menu\">",
      "B: <span>",
      "C: <footer>",
      "D: <nav>"
    ],
    "correctAnswer": 3,
    "explanation": "nav ใช้สำหรับกลุ่มลิงก์นำทาง div และ span ไม่บอกความหมาย ส่วน footer คือส่วนท้ายของหน้า (อ้างอิง HTML Living Standard ของ WHATWG)"
  },
  {
    "id": "ent-std-9",
    "question": "ไฟล์ style.css กำหนด p { color: blue; } แต่ในหน้าเว็บเขียน <p style=\"color: red\">ข้อความ</p> ข้อความจะเป็นสีอะไร",
    "options": [
      "A: แดง เพราะ style ที่เขียนในแท็กเจาะจงกว่า",
      "B: น้ำเงิน เพราะไฟล์ CSS ภายนอกสำคัญที่สุด",
      "C: ดำ เพราะกฎขัดกันจึงใช้ค่าเริ่มต้น",
      "D: ม่วง เพราะสีผสมกัน"
    ],
    "correctAnswer": 0,
    "explanation": "Inline style ในแท็กมีลำดับความสำคัญสูงกว่า Selector ในไฟล์ CSS ภายนอก จึงนิยมใช้ External CSS เป็นหลักแล้วหลีกเลี่ยง Inline"
  },
  {
    "id": "ent-std-10",
    "question": "โค้ดใดทำงานได้โดยไม่เกิด error",
    "options": [
      "A: const max = 240; max = 250;",
      "B: const list; list = [];",
      "C: let count = 0; count = count + 1;",
      "D: let x = 1; let x = 2;"
    ],
    "correctAnswer": 2,
    "explanation": "let เปลี่ยนค่าได้ ส่วน const กำหนดค่าใหม่ไม่ได้และต้องใส่ค่าตอนประกาศ และประกาศ let ชื่อซ้ำในขอบเขตเดียวกันไม่ได้ (อ้างอิง ECMAScript 2015)"
  },
  {
    "id": "ent-std-11",
    "question": "ผลลัพธ์ของ '10' - 5 + '5' ใน JavaScript คือข้อใด",
    "options": [
      "A: 10",
      "B: '55'",
      "C: '105'",
      "D: NaN"
    ],
    "correctAnswer": 1,
    "explanation": "คำนวณจากซ้ายไปขวา: '10' - 5 แปลงเป็นตัวเลขได้ 5 จากนั้น 5 + '5' มี String จึงต่อข้อความได้ '55'"
  },
  {
    "id": "ent-std-12",
    "question": "ข้อใดเลือก element เดียวกับ document.getElementById('status')",
    "options": [
      "A: document.querySelector('.status')",
      "B: document.querySelector('status')",
      "C: document.getElementsByClassName('status')",
      "D: document.querySelector('#status')"
    ],
    "correctAnswer": 3,
    "explanation": "querySelector ใช้ CSS Selector ต้องใส่ # นำหน้าเพื่อเลือกด้วย id ส่วน . คือ class และไม่ใส่เครื่องหมายคือชื่อแท็ก"
  },
  {
    "id": "ent-std-13",
    "question": "ต้องการตรวจค่าแรงดันทุกครั้งที่ผู้ใช้พิมพ์ในช่อง input ทันทีโดยไม่ต้องกดปุ่ม ควรผูก Event ใด",
    "options": [
      "A: input",
      "B: click",
      "C: load",
      "D: submit"
    ],
    "correctAnswer": 0,
    "explanation": "Event input เกิดทุกครั้งที่ค่าในช่องเปลี่ยน ส่วน click ต้องกด และ submit เกิดตอนส่งฟอร์ม"
  },
  {
    "id": "ent-std-14",
    "question": "ตามมาตรฐาน IEC 60204-1 ไฟแสดงสถานะสีใดหมายถึง \"ต้องให้ผู้ปฏิบัติงานดำเนินการ\"",
    "options": [
      "A: เขียว",
      "B: เหลือง",
      "C: น้ำเงิน",
      "D: ขาว"
    ],
    "correctAnswer": 2,
    "explanation": "ตาม IEC 60204-1 และ IEC 60073 น้ำเงิน = ต้องให้ผู้ปฏิบัติงานดำเนินการ, เขียว = ปกติ, เหลือง = ผิดปกติ, แดง = ฉุกเฉิน, ขาว = ไม่มีความหมายเฉพาะ"
  },
  {
    "id": "ent-std-15",
    "question": "Dashboard หน้าหนึ่งแสดงตัวเลข 30 ค่าขนาดเท่ากันหมดและใช้สีต่างกัน 10 สี ข้อใดเป็นการปรับที่ตรงหลักการออกแบบมากที่สุด",
    "options": [
      "A: เพิ่มค่าให้ครบทุกค่าที่มีในระบบ",
      "B: ใช้สีต่างกันทุกค่าเพื่อให้แยกง่าย",
      "C: ย่อตัวเลขให้เล็กลงเพื่อใส่ได้มากขึ้น",
      "D: แสดงค่าสำคัญไม่กี่ค่าเป็น KPI ขนาดใหญ่ด้านบน และใช้สีเฉพาะบอกสถานะ"
    ],
    "correctAnswer": 3,
    "explanation": "หลัก 5-Second Rule และ Visual Hierarchy: ค่าสำคัญต้องเด่นและอ่านได้ทันที ใช้สีเพื่อบอกสถานะเท่านั้น (ANSI/ISA-101.01 แนะนำให้ใช้สีสดเฉพาะสถานะผิดปกติ)"
  },
  {
    "id": "ent-std-16",
    "question": "HTTP Method ใด ถ้าถูกเรียกซ้ำโดยไม่ตั้งใจ มีโอกาสสร้างข้อมูลหรือแจ้งเตือนซ้ำมากที่สุด",
    "options": [
      "A: POST",
      "B: GET",
      "C: PUT",
      "D: DELETE"
    ],
    "correctAnswer": 0,
    "explanation": "ตาม RFC 9110 GET, PUT และ DELETE เป็น idempotent เรียกซ้ำผลเหมือนเรียกครั้งเดียว ส่วน POST ไม่ใช่ จึงต้องกันการกดส่งซ้ำ"
  },
  {
    "id": "ent-std-17",
    "question": "Dashboard ถาม Server ทุก 30 วินาที ถ้าเครื่องจักรหยุด 1 วินาทีหลังรอบถามล่าสุด Dashboard จะรู้ช้าสุดประมาณเท่าไร และควรแก้อย่างไร",
    "options": [
      "A: ประมาณ 1 วินาที ไม่ต้องแก้",
      "B: ประมาณ 29 วินาที ควรให้ Server ส่ง Webhook มาทันทีเมื่อเกิดเหตุการณ์",
      "C: ประมาณ 30 นาที ควรเพิ่มรอบเป็นทุก 1 นาที",
      "D: รู้ทันที เพราะ Polling เป็นแบบ Push"
    ],
    "correctAnswer": 1,
    "explanation": "Polling ต้องรอรอบถามถัดไป (30 - 1 = 29 วินาที) ส่วน Webhook ทำงานแบบ Push ส่งมาทันทีเมื่อเกิดเหตุการณ์"
  },
  {
    "id": "ent-std-18",
    "question": "ข้อใดเรียงลำดับการดึงข้อมูลด้วย fetch ได้ถูกต้อง",
    "options": [
      "A: แปลงด้วย res.json() › ส่ง Request › ตรวจ res.ok › แสดงผล",
      "B: ส่ง Request › ได้ Response › ตรวจ res.ok › แปลงด้วย res.json() › แสดงผล",
      "C: ส่ง Request › แสดงผล › ได้ Response › ตรวจ res.ok",
      "D: ตรวจ res.ok › ส่ง Request › แปลงด้วย res.json() › แสดงผล"
    ],
    "correctAnswer": 1,
    "explanation": "ต้องได้ Response ก่อนจึงตรวจสถานะได้ และตรวจ res.ok ก่อนแปลงข้อมูล เพราะ fetch ไม่ reject เมื่อได้ 404 หรือ 500 (อ้างอิง Fetch Living Standard ของ WHATWG)"
  },
  {
    "id": "ent-std-19",
    "question": "Test Case ใดเขียนผลที่คาดหวัง (Expected Result) ได้ดีที่สุด",
    "options": [
      "A: ระบบทำงานถูกต้อง",
      "B: หน้าจอแสดงผลสวยงาม",
      "C: กรอก 245 แล้วแสดง \"Warning: แรงดันเกิน 240 V\" สีแดงภายใน 1 วินาที",
      "D: ไม่พบข้อผิดพลาด"
    ],
    "correctAnswer": 2,
    "explanation": "ผลที่คาดหวังต้องวัดได้และระบุชัดว่าต้องเห็นอะไร จึงตัดสิน Pass/Fail ได้ตรงกันทุกคน (อ้างอิง ISO/IEC/IEEE 29119-3)"
  },
  {
    "id": "ent-std-20",
    "question": "ข้อใดไม่ใช่ลักษณะของ UAT (User Acceptance Testing)",
    "options": [
      "A: ผู้ใช้จริงทดสอบตามงานที่ทำจริง",
      "B: ทดสอบก่อนเริ่มใช้งานจริง (Go-Live)",
      "C: นักพัฒนาเขียนโค้ดทดสอบฟังก์ชันย่อยทีละฟังก์ชัน",
      "D: ผู้ใช้ลงชื่อยอมรับหรือไม่ยอมรับระบบ"
    ],
    "correctAnswer": 2,
    "explanation": "การทดสอบฟังก์ชันย่อยโดยนักพัฒนาคือ Unit Testing ส่วน UAT ให้ผู้ใช้จริงทดสอบแล้วยอมรับก่อนใช้งานจริง (อ้างอิง ISTQB Glossary)"
  }
];

export const ENTERPRISE_APP_EXAM_EXPERT = [
  {
    "id": "ent-exp-1",
    "question": "ข้อใดเป็นข้อดีของระบบดิจิทัลเมื่อเทียบกับระบบเอกสารกระดาษ",
    "options": [
      "A: ไม่ต้องสำรองข้อมูลอีกต่อไป",
      "B: ไม่ต้องกำหนดสิทธิ์ว่าใครเข้าถึงข้อมูลได้",
      "C: มีประวัติการแก้ไข ตรวจสอบย้อนหลังได้ว่าใครแก้อะไร",
      "D: ใช้ได้ทันทีโดยไม่ต้องเปลี่ยนวิธีทำงานของคน"
    ],
    "correctAnswer": 2,
    "explanation": "ระบบดิจิทัลเก็บประวัติการแก้ไขได้ ส่วนการสำรองข้อมูล การกำหนดสิทธิ์ และการปรับวิธีทำงานยังจำเป็นเสมอ"
  },
  {
    "id": "ent-exp-2",
    "question": "ข้อใดอธิบายสถาปัตยกรรมแบบ Microservices ได้ถูกต้อง",
    "options": [
      "A: รวมทุกฟังก์ชันไว้ในโปรแกรมเดียวขนาดใหญ่",
      "B: แบ่งระบบเป็นบริการย่อยที่พัฒนาและอัปเดตแยกกันได้",
      "C: แอปที่ทำงานได้เฉพาะบนเครื่องของผู้ใช้",
      "D: ฐานข้อมูลที่มีตารางเดียวสำหรับทุกระบบ"
    ],
    "correctAnswer": 1,
    "explanation": "Microservices แยกระบบเป็นบริการเล็ก ๆ แต่ละบริการ deploy และขยายได้อิสระ"
  },
  {
    "id": "ent-exp-3",
    "question": "ระยะเวลาตอบสนอง (Response Time) ที่ระบบ OT ต้องการโดยทั่วไปอยู่ในระดับใด",
    "options": [
      "A: ระดับมิลลิวินาทีถึงวินาที (Real-time)",
      "B: ระดับวินาทีถึงนาที ยอมให้ช้าได้บ้าง",
      "C: ระดับชั่วโมง",
      "D: ไม่มีข้อกำหนดเรื่องเวลา"
    ],
    "correctAnswer": 0,
    "explanation": "OT ควบคุมเครื่องจักรจึงต้องตอบสนองแบบ Real-time ส่วน IT ยอมรับเวลาระดับวินาทีถึงนาทีได้ (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-exp-4",
    "question": "เหตุใดการอัปเดตซอฟต์แวร์ในระบบ OT จึงทำได้ไม่บ่อยเท่าระบบ IT",
    "options": [
      "A: เพราะระบบ OT ไม่มีซอฟต์แวร์",
      "B: เพราะระบบ OT ใช้งานได้เฉพาะบน Cloud",
      "C: เพราะกฎหมายห้ามอัปเดตระบบในโรงงาน",
      "D: เพราะมักต้องหยุดเครื่องจักร ซึ่งกระทบการผลิตและความปลอดภัย"
    ],
    "correctAnswer": 3,
    "explanation": "OT ทนต่อการหยุดเครื่องได้น้อย การอัปเดตจึงต้องวางแผนและทำนาน ๆ ครั้ง (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-exp-5",
    "question": "Wireframe คืออะไร",
    "options": [
      "A: หน้าจอจริงที่ลงสีและใส่ข้อมูลครบแล้ว",
      "B: เอกสารที่ผู้ใช้ลงชื่อยอมรับระบบ",
      "C: ไฟล์ CSS ที่กำหนดสีของระบบ",
      "D: ภาพร่างโครงหน้าจอแบบง่าย ใช้คุยเรื่องการจัดวางก่อนลงรายละเอียด"
    ],
    "correctAnswer": 3,
    "explanation": "Wireframe คือโครงร่างหน้าจอ (Low-fidelity) ใช้ตกลงการจัดวางก่อนทำ UI จริง (อ้างอิง ISO 9241-210 ใช้ต้นแบบหน้าจอเพื่อทดสอบกับผู้ใช้ตั้งแต่ต้น)"
  },
  {
    "id": "ent-exp-6",
    "question": "หน้าจอบนแท็บเล็ตที่พนักงานใช้หน้างาน ปุ่มควรมีขนาดอย่างน้อยเท่าไร",
    "options": [
      "A: 16 × 16 px",
      "B: 24 × 24 px",
      "C: 44 × 44 px และเว้นระยะระหว่างปุ่ม 8 px ขึ้นไป",
      "D: ไม่ต้องกำหนด เพราะผู้ใช้ซูมได้เอง"
    ],
    "correctAnswer": 2,
    "explanation": "ปุ่มสำหรับการแตะต้องมีขนาดอย่างน้อย 44 × 44 px และเว้นระยะ เพื่อลดการกดพลาด (อ้างอิง WCAG 2.2 เกณฑ์ 2.5.5 แนะนำ 44 × 44 px (AAA) ส่วนขั้นต่ำตามเกณฑ์ 2.5.8 คือ 24 × 24 px (AA))"
  },
  {
    "id": "ent-exp-7",
    "question": "เหตุใดหน้าจอแสดงสถานะเครื่องจักรควรมีไอคอนหรือข้อความกำกับคู่กับสี",
    "options": [
      "A: เพราะผู้ใช้บางคนแยกสีไม่ได้ ไอคอนและข้อความช่วยให้อ่านสถานะได้ทุกคน",
      "B: เพื่อให้หน้าจอดูสวยขึ้นเท่านั้น",
      "C: เพราะเบราว์เซอร์บางตัวแสดงสีไม่ได้",
      "D: เพราะการใช้สีทำให้หน้าเว็บโหลดช้า"
    ],
    "correctAnswer": 0,
    "explanation": "ประมาณ 8% ของผู้ชายมีภาวะตาบอดสี จึงไม่ควรใช้สีเป็นสัญญาณเพียงอย่างเดียว (อ้างอิง WCAG 2.2 เกณฑ์ 1.4.1 Use of Color)"
  },
  {
    "id": "ent-exp-8",
    "question": "เนื้อหาที่อยู่ในส่วนใดของเอกสาร HTML จะแสดงให้ผู้ใช้เห็นบนหน้าเว็บ",
    "options": [
      "A: <head>",
      "B: <body>",
      "C: <!DOCTYPE html>",
      "D: <meta>"
    ],
    "correctAnswer": 1,
    "explanation": "<body> เก็บเนื้อหาที่แสดงผล ส่วน <head> เก็บข้อมูลเกี่ยวกับหน้า เช่น title และการเชื่อมไฟล์ CSS (อ้างอิง HTML Living Standard (WHATWG))"
  },
  {
    "id": "ent-exp-9",
    "question": "ต้องการใช้สไตล์จากไฟล์ style.css ภายนอก ต้องเขียนแท็กใดใน <head>",
    "options": [
      "A: <style src=\"style.css\">",
      "B: <css href=\"style.css\">",
      "C: <script href=\"style.css\">",
      "D: <link rel=\"stylesheet\" href=\"style.css\">"
    ],
    "correctAnswer": 3,
    "explanation": "ไฟล์ CSS ภายนอกเชื่อมด้วย <link rel=\"stylesheet\" href=\"...\">"
  },
  {
    "id": "ent-exp-10",
    "question": "ข้อใดถูกต้องเกี่ยวกับ id และ class",
    "options": [
      "A: id ต้องไม่ซ้ำกันในหน้าเดียว ส่วน class ใช้ซ้ำกับหลาย element ได้",
      "B: class ต้องไม่ซ้ำกัน ส่วน id ใช้ซ้ำได้",
      "C: ทั้ง id และ class ใช้ซ้ำไม่ได้",
      "D: id ใช้ได้เฉพาะกับแท็ก <div>"
    ],
    "correctAnswer": 0,
    "explanation": "id ระบุ element เดียว เหมาะให้ JavaScript เลือก ส่วน class ใช้กับกลุ่ม element ที่แต่งแบบเดียวกัน (อ้างอิง HTML Living Standard กำหนดให้ id ไม่ซ้ำกันในเอกสาร)"
  },
  {
    "id": "ent-exp-11",
    "question": "ต้องการให้การ์ด 3 ใบเรียงต่อกันเป็นแถวเดียว ควรเขียน CSS ใดที่กล่องที่ครอบการ์ด",
    "options": [
      "A: display: flex;",
      "B: display: none;",
      "C: position: absolute;",
      "D: text-align: center;"
    ],
    "correctAnswer": 0,
    "explanation": "display: flex ที่กล่องแม่ทำให้ลูกเรียงเป็นแถว และใช้ gap กำหนดระยะห่างได้ (อ้างอิง CSS Flexible Box Layout Module Level 1 (W3C))"
  },
  {
    "id": "ent-exp-12",
    "question": "ลำดับชั้นของ Box Model จากด้านในออกไปด้านนอกคือข้อใด",
    "options": [
      "A: content → margin → border → padding",
      "B: padding → content → border → margin",
      "C: content → padding → border → margin",
      "D: border → padding → content → margin"
    ],
    "correctAnswer": 2,
    "explanation": "เนื้อหา (content) ถูกล้อมด้วย padding, border และ margin ตามลำดับ (อ้างอิง CSS Box Model Module Level 3 (W3C))"
  },
  {
    "id": "ent-exp-13",
    "question": "เมื่อรันโค้ด  const total = 10;  total = 20;  จะเกิดอะไรขึ้น",
    "options": [
      "A: total มีค่า 20",
      "B: total มีค่า 30",
      "C: total ยังเป็น 10 โดยไม่มี error",
      "D: เกิด error เพราะ const กำหนดค่าใหม่ไม่ได้"
    ],
    "correctAnswer": 3,
    "explanation": "ตัวแปร const กำหนดค่าใหม่ไม่ได้ (TypeError: Assignment to constant variable) ถ้าต้องเปลี่ยนค่าให้ใช้ let (อ้างอิง ECMAScript 2015 (ECMA-262 ฉบับที่ 6))"
  },
  {
    "id": "ent-exp-14",
    "question": "let temp = 85; ถ้า temp > 90 ได้ 'วิกฤต', else if temp > 80 ได้ 'เตือน', else ได้ 'ปกติ' ผลลัพธ์คือข้อใด",
    "options": [
      "A: 'วิกฤต'",
      "B: 'เตือน'",
      "C: 'ปกติ'",
      "D: ได้ทั้ง 'เตือน' และ 'ปกติ'"
    ],
    "correctAnswer": 1,
    "explanation": "85 ไม่มากกว่า 90 แต่มากกว่า 80 จึงเข้าเงื่อนไข else if และหยุดเช็กเงื่อนไขที่เหลือ"
  },
  {
    "id": "ent-exp-15",
    "question": "ถ้า running = true และ temp = 70 นิพจน์ใดได้ผลเป็น true",
    "options": [
      "A: running && temp > 80",
      "B: !running",
      "C: running || temp > 80",
      "D: temp > 80"
    ],
    "correctAnswer": 2,
    "explanation": "|| เป็นจริงเมื่อมีอย่างน้อยหนึ่งฝั่งเป็นจริง running เป็น true จึงได้ true"
  },
  {
    "id": "ent-exp-16",
    "question": "const parts = ['A', 'B', 'C']; parts.push('D'); ค่า parts[3] คืออะไร",
    "options": [
      "A: 'C'",
      "B: เกิด error เพราะ parts เป็น const",
      "C: undefined",
      "D: 'D'"
    ],
    "correctAnswer": 3,
    "explanation": "push เพิ่ม 'D' ต่อท้ายที่ index 3 และ const ห้ามแค่กำหนดค่าใหม่ทั้งตัวแปร แต่แก้ข้างใน Array ได้ (อ้างอิง ECMAScript 2015 (ECMA-262 ฉบับที่ 6))"
  },
  {
    "id": "ent-exp-17",
    "question": "document.querySelector('.card') ได้ผลลัพธ์เป็นอะไร",
    "options": [
      "A: element แรกในหน้าที่มี class=\"card\"",
      "B: ทุก element ที่มี class=\"card\"",
      "C: element ที่มี id=\"card\"",
      "D: ข้อความทั้งหมดใน element ที่ชื่อ card"
    ],
    "correctAnswer": 0,
    "explanation": "querySelector คืน element แรกที่ตรงกับ CSS Selector ถ้าต้องการทุกตัวใช้ querySelectorAll"
  },
  {
    "id": "ent-exp-18",
    "question": "ต้องการแสดงข้อความที่ผู้ใช้พิมพ์ลงบนหน้าเว็บอย่างปลอดภัย ควรใช้คำสั่งใด",
    "options": [
      "A: element.innerHTML = text",
      "B: element.textContent = text",
      "C: document.write(text)",
      "D: element.outerHTML = text"
    ],
    "correctAnswer": 1,
    "explanation": "textContent แสดงเป็นข้อความเสมอ ส่วน innerHTML จะตีความแท็ก HTML จึงเปิดช่องให้ฝังโค้ดอันตราย (XSS) (อ้างอิง OWASP Cross Site Scripting Prevention Cheat Sheet)"
  },
  {
    "id": "ent-exp-19",
    "question": "ในฟังก์ชันที่รับ Event เช่น function onClick(event) ค่า event.target คืออะไร",
    "options": [
      "A: เวลาที่เกิด Event",
      "B: ชื่อฟังก์ชันที่ถูกเรียก",
      "C: element ที่ทำให้เกิด Event เช่น ปุ่มที่ถูกกด",
      "D: หน้าเว็บทั้งหน้า"
    ],
    "correctAnswer": 2,
    "explanation": "event.target ชี้ไปที่ element ต้นเหตุ ทำให้ใช้ฟังก์ชันเดียวกับหลายปุ่มได้"
  },
  {
    "id": "ent-exp-20",
    "question": "ข้อใดเป็น JSON ที่ถูกต้อง",
    "options": [
      "A: {\"temp\": 72.5, \"online\": true}",
      "B: {\"temp\": 72.5,}",
      "C: {'temp': 72.5}",
      "D: {\"temp\": 72.5 // องศา}"
    ],
    "correctAnswer": 0,
    "explanation": "JSON ต้องใช้เครื่องหมายคำพูดคู่ ห้ามมี comma ตัวสุดท้าย และห้ามมี comment (อ้างอิง RFC 8259)"
  },
  {
    "id": "ent-exp-21",
    "question": "data = {\"lines\": [{\"name\": \"A\", \"machines\": [{\"id\": \"M-01\"}, {\"id\": \"M-02\"}]}]}  ต้องเขียนอย่างไรจึงได้ \"M-02\"",
    "options": [
      "A: data.machines[1].id",
      "B: data.lines[0].machines[1].id",
      "C: data.lines.machines[2].id",
      "D: data[0].machines[1]"
    ],
    "correctAnswer": 1,
    "explanation": "ไล่ทีละชั้น: lines เป็น Array เลือกตัวแรก [0] แล้ว machines เป็น Array เลือกตัวที่สอง [1] แล้วอ่าน .id"
  },
  {
    "id": "ent-exp-22",
    "question": "JSON.stringify(obj) ใช้ทำอะไร",
    "options": [
      "A: แปลงข้อความ JSON เป็น Object",
      "B: ตรวจว่า JSON ถูกต้องหรือไม่",
      "C: ลบ key ที่ไม่ใช้ออกจาก Object",
      "D: แปลง Object เป็นข้อความ JSON เพื่อส่งไปยัง Server"
    ],
    "correctAnswer": 3,
    "explanation": "stringify แปลง Object เป็นข้อความ ใช้ตอนส่ง body ส่วน JSON.parse ทำกลับกัน"
  },
  {
    "id": "ent-exp-23",
    "question": "ใน JSON  {\"alarm\": null}  ค่า null หมายถึงอะไร",
    "options": [
      "A: ข้อความว่าง \"\"",
      "B: ตัวเลข 0",
      "C: ไม่มีค่า (ว่างโดยตั้งใจ)",
      "D: ข้อมูลผิดพลาด"
    ],
    "correctAnswer": 2,
    "explanation": "null แปลว่าไม่มีค่า เช่น ตอนนี้ไม่มี alarm ต่างจากข้อความว่างหรือเลข 0 (อ้างอิง RFC 8259)"
  },
  {
    "id": "ent-exp-24",
    "question": "ต้องการแก้สถานะของเครื่อง M-01 ที่มีอยู่แล้วผ่าน REST API ควรใช้ HTTP Method ใด",
    "options": [
      "A: GET",
      "B: PUT",
      "C: POST",
      "D: DELETE"
    ],
    "correctAnswer": 1,
    "explanation": "GET อ่าน, POST สร้างใหม่, PUT แก้ไขข้อมูลเดิม, DELETE ลบ (อ้างอิง RFC 9110 HTTP Semantics: PUT แทนที่ข้อมูลเดิมและเป็น idempotent)"
  },
  {
    "id": "ent-exp-25",
    "question": "API ตอบกลับด้วย Status 404 หมายถึงอะไร",
    "options": [
      "A: สำเร็จ",
      "B: ไม่มีสิทธิ์เข้าถึง",
      "C: Server เกิดข้อผิดพลาดภายใน",
      "D: ไม่พบข้อมูลหรือ URL ที่ขอ"
    ],
    "correctAnswer": 3,
    "explanation": "404 Not Found คือ URL ผิดหรือไม่มีข้อมูลนั้น ส่วน 500 คือ Server พัง และ 401/403 เกี่ยวกับสิทธิ์ (อ้างอิง RFC 9110 HTTP Semantics หมวด Status Codes)"
  },
  {
    "id": "ent-exp-26",
    "question": "เหตุใดหลังเรียก fetch แล้วควรตรวจ response.ok ก่อนใช้ข้อมูล",
    "options": [
      "A: เพราะ fetch ไม่ throw error เมื่อ Server ตอบ 404 หรือ 500 ต้องตรวจเอง",
      "B: เพราะถ้าไม่ตรวจ ข้อมูลจะไม่ถูกแปลงเป็น JSON",
      "C: เพราะ response.ok ทำให้เรียก API ได้เร็วขึ้น",
      "D: เพราะเป็นข้อบังคับของ HTML5"
    ],
    "correctAnswer": 0,
    "explanation": "fetch จะเข้า catch เฉพาะตอนต่อเครือข่ายไม่ได้ ถ้าได้ 404/500 ต้องเช็ก response.ok แล้วจัดการเอง (อ้างอิง Fetch Living Standard (WHATWG): fetch reject เฉพาะเมื่อเกิด network error)"
  },
  {
    "id": "ent-exp-27",
    "question": "การส่งข้อมูล JSON ไปยัง API ด้วย fetch แบบ POST ต้องกำหนด header ใด",
    "options": [
      "A: 'Accept-Language': 'th'",
      "B: 'Cache-Control': 'no-cache'",
      "C: 'Content-Type': 'application/json'",
      "D: 'Content-Type': 'text/html'"
    ],
    "correctAnswer": 2,
    "explanation": "Content-Type: application/json บอก Server ว่า body เป็น JSON และต้องใช้คู่กับ JSON.stringify (อ้างอิง RFC 8259 กำหนด media type application/json)"
  },
  {
    "id": "ent-exp-28",
    "question": "สถานการณ์ใดเหมาะกับการใช้ Webhook มากที่สุด",
    "options": [
      "A: แจ้งหัวหน้างานทันทีเมื่อเครื่องจักรหยุด",
      "B: แสดงกราฟอุณหภูมิที่เปลี่ยนทุกวินาที",
      "C: โหลดรายชื่อพนักงานครั้งเดียวตอนเปิดหน้า",
      "D: คำนวณคะแนนในเบราว์เซอร์"
    ],
    "correctAnswer": 0,
    "explanation": "Webhook ส่งข้อมูลทันทีเมื่อเกิดเหตุการณ์ (Push) เหมาะกับการแจ้งเตือนที่เกิดไม่บ่อยแต่ต้องรู้ทันที"
  },
  {
    "id": "ent-exp-29",
    "question": "การทดสอบว่าหน้าเว็บกับ API ทำงานร่วมกันได้ถูกต้อง เป็นการทดสอบระดับใด",
    "options": [
      "A: Unit Testing",
      "B: Integration Testing",
      "C: User Acceptance Testing",
      "D: ไม่ต้องทดสอบ"
    ],
    "correctAnswer": 1,
    "explanation": "Integration Testing ทดสอบการเชื่อมต่อระหว่างส่วนต่าง ๆ ของระบบ (อ้างอิง ISO/IEC/IEEE 29119 และ ISTQB Glossary)"
  },
  {
    "id": "ent-exp-30",
    "question": "ระบบต้องแจ้งเตือนเมื่อแรงดัน \"เกิน 240 V\" ข้อมูลทดสอบชุดใดตรวจค่าขอบ (Boundary) ได้ดีที่สุด",
    "options": [
      "A: 100 และ 500",
      "B: 0 อย่างเดียว",
      "C: 230 อย่างเดียว",
      "D: 240 (ต้องไม่เตือน) และ 240.1 (ต้องเตือน)"
    ],
    "correctAnswer": 3,
    "explanation": "ค่าขอบคือค่าที่อยู่ตรงเส้นแบ่ง ถ้าเงื่อนไขเขียนผิดเป็น >= จะจับได้จากค่า 240 (อ้างอิง Boundary Value Analysis ตาม ISO/IEC/IEEE 29119-4 และ ISTQB)"
  },
  {
    "id": "ent-exp-31",
    "question": "ข้อใดเป็นระบบ OT ทั้งหมด",
    "options": [
      "A: ERP, CRM และอีเมลองค์กร",
      "B: PLC, HMI และเซนเซอร์วัดอุณหภูมิ",
      "C: ฐานข้อมูลบัญชี, HMI และ ERP",
      "D: เว็บไซต์บริษัท, PLC และอีเมลองค์กร"
    ],
    "correctAnswer": 1,
    "explanation": "PLC, HMI และเซนเซอร์ควบคุมหรือวัดค่าจากกระบวนการผลิตโดยตรงจึงเป็น OT ทั้งหมด ข้ออื่นมีระบบ IT ปนอยู่ (โครงสร้างระดับตาม IEC 62264 / ISA-95)"
  },
  {
    "id": "ent-exp-32",
    "question": "ทีม IT ต้องการติดตั้งอัปเดตความปลอดภัยให้คอมพิวเตอร์ที่ควบคุมเครื่องจักรทันทีระหว่างกะผลิต ข้อกังวลหลักจากมุมมอง OT คือข้อใด",
    "options": [
      "A: หน้าจออาจเปลี่ยนสี",
      "B: ค่าลิขสิทธิ์ซอฟต์แวร์อาจสูงขึ้น",
      "C: ข้อมูลอาจถูกส่งออกไปนอกบริษัท",
      "D: การรีสตาร์ตอาจทำให้เครื่องจักรหยุด กระทบการผลิตและความปลอดภัย"
    ],
    "correctAnswer": 3,
    "explanation": "OT ให้ความสำคัญกับ Safety และ Availability การอัปเดตจึงต้องวางแผนช่วงหยุดเครื่อง ไม่ทำกลางกะผลิต (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-exp-33",
    "question": "ในระบบ Dashboard ค่าน้ำ-ไฟของ Workshop ส่วนใดทำงานอยู่ฝั่ง Server",
    "options": [
      "A: การตอบค่าน้ำ-ไฟเป็น JSON ผ่าน /api/meter",
      "B: การเปลี่ยนสีป้ายสถานะเมื่อกดปุ่ม",
      "C: การตรวจค่าที่ผู้ใช้พิมพ์ในช่อง input ทันที",
      "D: การแสดงเวลาอัปเดตล่าสุดบนหน้าจอ"
    ],
    "correctAnswer": 0,
    "explanation": "API ที่ตอบข้อมูลอยู่บน Server ส่วนการแสดงผลและการตรวจค่าที่ผู้ใช้พิมพ์ทำด้วย JavaScript ในเบราว์เซอร์ (Client)"
  },
  {
    "id": "ent-exp-34",
    "question": "JSON ข้อใดถูกต้องทั้งหมด",
    "options": [
      "A: {\"line\": \"A\", \"temps\": [72.5, 73.0,]}",
      "B: {\"line\": \"A\", \"online\": True}",
      "C: {\"line\": \"A\", \"temps\": [72.5, 73.0]}",
      "D: {\"line\": \"A\", \"note\": undefined}"
    ],
    "correctAnswer": 2,
    "explanation": "ตาม RFC 8259 ห้ามมี comma ตัวสุดท้ายแม้อยู่ใน Array ค่า boolean ต้องเป็น true ตัวเล็ก และไม่มีค่า undefined"
  },
  {
    "id": "ent-exp-35",
    "question": "data = {\"line\": {\"name\": \"A\", \"machines\": [{\"id\": \"M-01\", \"sensors\": {\"temp\": 72}}, {\"id\": \"M-02\", \"sensors\": {\"temp\": 65}}]}}  ต้องเขียนอย่างไรจึงได้ค่า 65",
    "options": [
      "A: data.machines[1].sensors.temp",
      "B: data.line.machines[2].sensors.temp",
      "C: data.line.machines[1].temp",
      "D: data.line.machines[1].sensors.temp"
    ],
    "correctAnswer": 3,
    "explanation": "ไล่ทีละชั้น: line เป็น Object › machines เป็น Array ตัวที่สองคือ [1] › sensors เป็น Object › อ่าน temp"
  },
  {
    "id": "ent-exp-36",
    "question": "จาก {\"sensors\": [10, 20, 30, 40]} ค่า data.sensors[data.sensors.length - 2] คือเท่าไร",
    "options": [
      "A: 20",
      "B: 30",
      "C: 40",
      "D: undefined"
    ],
    "correctAnswer": 1,
    "explanation": "length คือ 4 ดังนั้น length - 2 คือ index 2 ซึ่งเป็นตัวที่สาม ได้ 30 (index เริ่มที่ 0)"
  },
  {
    "id": "ent-exp-37",
    "question": "JSON.stringify({ a: 1, b: undefined, c: null }) ได้ผลลัพธ์ใด",
    "options": [
      "A: {\"a\":1,\"c\":null}",
      "B: {\"a\":1,\"b\":undefined,\"c\":null}",
      "C: {\"a\":1,\"b\":null,\"c\":null}",
      "D: {\"a\":1}"
    ],
    "correctAnswer": 0,
    "explanation": "JSON ไม่มีชนิด undefined จึงตัด key b ทิ้ง แต่ null เป็นค่าที่ JSON รองรับจึงยังอยู่ (อ้างอิง RFC 8259 และ ECMA-262)"
  },
  {
    "id": "ent-exp-38",
    "question": "ต้องการทำเมนูลิงก์ไปหน้าต่าง ๆ ของ Dashboard ควรใช้แท็ก Semantic ใดครอบเมนู",
    "options": [
      "A: <div class=\"menu\">",
      "B: <span>",
      "C: <footer>",
      "D: <nav>"
    ],
    "correctAnswer": 3,
    "explanation": "nav ใช้สำหรับกลุ่มลิงก์นำทาง div และ span ไม่บอกความหมาย ส่วน footer คือส่วนท้ายของหน้า (อ้างอิง HTML Living Standard ของ WHATWG)"
  },
  {
    "id": "ent-exp-39",
    "question": "ไฟล์ style.css กำหนด p { color: blue; } แต่ในหน้าเว็บเขียน <p style=\"color: red\">ข้อความ</p> ข้อความจะเป็นสีอะไร",
    "options": [
      "A: แดง เพราะ style ที่เขียนในแท็กเจาะจงกว่า",
      "B: น้ำเงิน เพราะไฟล์ CSS ภายนอกสำคัญที่สุด",
      "C: ดำ เพราะกฎขัดกันจึงใช้ค่าเริ่มต้น",
      "D: ม่วง เพราะสีผสมกัน"
    ],
    "correctAnswer": 0,
    "explanation": "Inline style ในแท็กมีลำดับความสำคัญสูงกว่า Selector ในไฟล์ CSS ภายนอก จึงนิยมใช้ External CSS เป็นหลักแล้วหลีกเลี่ยง Inline"
  },
  {
    "id": "ent-exp-40",
    "question": "โค้ดใดทำงานได้โดยไม่เกิด error",
    "options": [
      "A: const max = 240; max = 250;",
      "B: const list; list = [];",
      "C: let count = 0; count = count + 1;",
      "D: let x = 1; let x = 2;"
    ],
    "correctAnswer": 2,
    "explanation": "let เปลี่ยนค่าได้ ส่วน const กำหนดค่าใหม่ไม่ได้และต้องใส่ค่าตอนประกาศ และประกาศ let ชื่อซ้ำในขอบเขตเดียวกันไม่ได้ (อ้างอิง ECMAScript 2015)"
  }
];

export const ENTERPRISE_APP_EXAM = [
  {
    "id": "ent-th-1",
    "question": "ข้อใดเป็นข้อดีของระบบดิจิทัลเมื่อเทียบกับระบบเอกสารกระดาษ",
    "options": [
      "A: ไม่ต้องสำรองข้อมูลอีกต่อไป",
      "B: ไม่ต้องกำหนดสิทธิ์ว่าใครเข้าถึงข้อมูลได้",
      "C: มีประวัติการแก้ไข ตรวจสอบย้อนหลังได้ว่าใครแก้อะไร",
      "D: ใช้ได้ทันทีโดยไม่ต้องเปลี่ยนวิธีทำงานของคน"
    ],
    "correctAnswer": 2,
    "explanation": "ระบบดิจิทัลเก็บประวัติการแก้ไขได้ ส่วนการสำรองข้อมูล การกำหนดสิทธิ์ และการปรับวิธีทำงานยังจำเป็นเสมอ"
  },
  {
    "id": "ent-th-2",
    "question": "ข้อใดอธิบายสถาปัตยกรรมแบบ Microservices ได้ถูกต้อง",
    "options": [
      "A: รวมทุกฟังก์ชันไว้ในโปรแกรมเดียวขนาดใหญ่",
      "B: แบ่งระบบเป็นบริการย่อยที่พัฒนาและอัปเดตแยกกันได้",
      "C: แอปที่ทำงานได้เฉพาะบนเครื่องของผู้ใช้",
      "D: ฐานข้อมูลที่มีตารางเดียวสำหรับทุกระบบ"
    ],
    "correctAnswer": 1,
    "explanation": "Microservices แยกระบบเป็นบริการเล็ก ๆ แต่ละบริการ deploy และขยายได้อิสระ"
  },
  {
    "id": "ent-th-3",
    "question": "ระยะเวลาตอบสนอง (Response Time) ที่ระบบ OT ต้องการโดยทั่วไปอยู่ในระดับใด",
    "options": [
      "A: ระดับมิลลิวินาทีถึงวินาที (Real-time)",
      "B: ระดับวินาทีถึงนาที ยอมให้ช้าได้บ้าง",
      "C: ระดับชั่วโมง",
      "D: ไม่มีข้อกำหนดเรื่องเวลา"
    ],
    "correctAnswer": 0,
    "explanation": "OT ควบคุมเครื่องจักรจึงต้องตอบสนองแบบ Real-time ส่วน IT ยอมรับเวลาระดับวินาทีถึงนาทีได้ (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-th-4",
    "question": "เหตุใดการอัปเดตซอฟต์แวร์ในระบบ OT จึงทำได้ไม่บ่อยเท่าระบบ IT",
    "options": [
      "A: เพราะระบบ OT ไม่มีซอฟต์แวร์",
      "B: เพราะระบบ OT ใช้งานได้เฉพาะบน Cloud",
      "C: เพราะกฎหมายห้ามอัปเดตระบบในโรงงาน",
      "D: เพราะมักต้องหยุดเครื่องจักร ซึ่งกระทบการผลิตและความปลอดภัย"
    ],
    "correctAnswer": 3,
    "explanation": "OT ทนต่อการหยุดเครื่องได้น้อย การอัปเดตจึงต้องวางแผนและทำนาน ๆ ครั้ง (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "id": "ent-th-5",
    "question": "Wireframe คืออะไร",
    "options": [
      "A: หน้าจอจริงที่ลงสีและใส่ข้อมูลครบแล้ว",
      "B: เอกสารที่ผู้ใช้ลงชื่อยอมรับระบบ",
      "C: ไฟล์ CSS ที่กำหนดสีของระบบ",
      "D: ภาพร่างโครงหน้าจอแบบง่าย ใช้คุยเรื่องการจัดวางก่อนลงรายละเอียด"
    ],
    "correctAnswer": 3,
    "explanation": "Wireframe คือโครงร่างหน้าจอ (Low-fidelity) ใช้ตกลงการจัดวางก่อนทำ UI จริง (อ้างอิง ISO 9241-210 ใช้ต้นแบบหน้าจอเพื่อทดสอบกับผู้ใช้ตั้งแต่ต้น)"
  },
  {
    "id": "ent-th-6",
    "question": "หน้าจอบนแท็บเล็ตที่พนักงานใช้หน้างาน ปุ่มควรมีขนาดอย่างน้อยเท่าไร",
    "options": [
      "A: 16 × 16 px",
      "B: 24 × 24 px",
      "C: 44 × 44 px และเว้นระยะระหว่างปุ่ม 8 px ขึ้นไป",
      "D: ไม่ต้องกำหนด เพราะผู้ใช้ซูมได้เอง"
    ],
    "correctAnswer": 2,
    "explanation": "ปุ่มสำหรับการแตะต้องมีขนาดอย่างน้อย 44 × 44 px และเว้นระยะ เพื่อลดการกดพลาด (อ้างอิง WCAG 2.2 เกณฑ์ 2.5.5 แนะนำ 44 × 44 px (AAA) ส่วนขั้นต่ำตามเกณฑ์ 2.5.8 คือ 24 × 24 px (AA))"
  },
  {
    "id": "ent-th-7",
    "question": "เหตุใดหน้าจอแสดงสถานะเครื่องจักรควรมีไอคอนหรือข้อความกำกับคู่กับสี",
    "options": [
      "A: เพราะผู้ใช้บางคนแยกสีไม่ได้ ไอคอนและข้อความช่วยให้อ่านสถานะได้ทุกคน",
      "B: เพื่อให้หน้าจอดูสวยขึ้นเท่านั้น",
      "C: เพราะเบราว์เซอร์บางตัวแสดงสีไม่ได้",
      "D: เพราะการใช้สีทำให้หน้าเว็บโหลดช้า"
    ],
    "correctAnswer": 0,
    "explanation": "ประมาณ 8% ของผู้ชายมีภาวะตาบอดสี จึงไม่ควรใช้สีเป็นสัญญาณเพียงอย่างเดียว (อ้างอิง WCAG 2.2 เกณฑ์ 1.4.1 Use of Color)"
  },
  {
    "id": "ent-th-8",
    "question": "เนื้อหาที่อยู่ในส่วนใดของเอกสาร HTML จะแสดงให้ผู้ใช้เห็นบนหน้าเว็บ",
    "options": [
      "A: <head>",
      "B: <body>",
      "C: <!DOCTYPE html>",
      "D: <meta>"
    ],
    "correctAnswer": 1,
    "explanation": "<body> เก็บเนื้อหาที่แสดงผล ส่วน <head> เก็บข้อมูลเกี่ยวกับหน้า เช่น title และการเชื่อมไฟล์ CSS (อ้างอิง HTML Living Standard (WHATWG))"
  },
  {
    "id": "ent-th-9",
    "question": "ต้องการใช้สไตล์จากไฟล์ style.css ภายนอก ต้องเขียนแท็กใดใน <head>",
    "options": [
      "A: <style src=\"style.css\">",
      "B: <css href=\"style.css\">",
      "C: <script href=\"style.css\">",
      "D: <link rel=\"stylesheet\" href=\"style.css\">"
    ],
    "correctAnswer": 3,
    "explanation": "ไฟล์ CSS ภายนอกเชื่อมด้วย <link rel=\"stylesheet\" href=\"...\">"
  },
  {
    "id": "ent-th-10",
    "question": "ข้อใดถูกต้องเกี่ยวกับ id และ class",
    "options": [
      "A: id ต้องไม่ซ้ำกันในหน้าเดียว ส่วน class ใช้ซ้ำกับหลาย element ได้",
      "B: class ต้องไม่ซ้ำกัน ส่วน id ใช้ซ้ำได้",
      "C: ทั้ง id และ class ใช้ซ้ำไม่ได้",
      "D: id ใช้ได้เฉพาะกับแท็ก <div>"
    ],
    "correctAnswer": 0,
    "explanation": "id ระบุ element เดียว เหมาะให้ JavaScript เลือก ส่วน class ใช้กับกลุ่ม element ที่แต่งแบบเดียวกัน (อ้างอิง HTML Living Standard กำหนดให้ id ไม่ซ้ำกันในเอกสาร)"
  },
  {
    "id": "ent-th-11",
    "question": "ต้องการให้การ์ด 3 ใบเรียงต่อกันเป็นแถวเดียว ควรเขียน CSS ใดที่กล่องที่ครอบการ์ด",
    "options": [
      "A: display: flex;",
      "B: display: none;",
      "C: position: absolute;",
      "D: text-align: center;"
    ],
    "correctAnswer": 0,
    "explanation": "display: flex ที่กล่องแม่ทำให้ลูกเรียงเป็นแถว และใช้ gap กำหนดระยะห่างได้ (อ้างอิง CSS Flexible Box Layout Module Level 1 (W3C))"
  },
  {
    "id": "ent-th-12",
    "question": "ลำดับชั้นของ Box Model จากด้านในออกไปด้านนอกคือข้อใด",
    "options": [
      "A: content → margin → border → padding",
      "B: padding → content → border → margin",
      "C: content → padding → border → margin",
      "D: border → padding → content → margin"
    ],
    "correctAnswer": 2,
    "explanation": "เนื้อหา (content) ถูกล้อมด้วย padding, border และ margin ตามลำดับ (อ้างอิง CSS Box Model Module Level 3 (W3C))"
  },
  {
    "id": "ent-th-13",
    "question": "เมื่อรันโค้ด  const total = 10;  total = 20;  จะเกิดอะไรขึ้น",
    "options": [
      "A: total มีค่า 20",
      "B: total มีค่า 30",
      "C: total ยังเป็น 10 โดยไม่มี error",
      "D: เกิด error เพราะ const กำหนดค่าใหม่ไม่ได้"
    ],
    "correctAnswer": 3,
    "explanation": "ตัวแปร const กำหนดค่าใหม่ไม่ได้ (TypeError: Assignment to constant variable) ถ้าต้องเปลี่ยนค่าให้ใช้ let (อ้างอิง ECMAScript 2015 (ECMA-262 ฉบับที่ 6))"
  },
  {
    "id": "ent-th-14",
    "question": "let temp = 85; ถ้า temp > 90 ได้ 'วิกฤต', else if temp > 80 ได้ 'เตือน', else ได้ 'ปกติ' ผลลัพธ์คือข้อใด",
    "options": [
      "A: 'วิกฤต'",
      "B: 'เตือน'",
      "C: 'ปกติ'",
      "D: ได้ทั้ง 'เตือน' และ 'ปกติ'"
    ],
    "correctAnswer": 1,
    "explanation": "85 ไม่มากกว่า 90 แต่มากกว่า 80 จึงเข้าเงื่อนไข else if และหยุดเช็กเงื่อนไขที่เหลือ"
  },
  {
    "id": "ent-th-15",
    "question": "ถ้า running = true และ temp = 70 นิพจน์ใดได้ผลเป็น true",
    "options": [
      "A: running && temp > 80",
      "B: !running",
      "C: running || temp > 80",
      "D: temp > 80"
    ],
    "correctAnswer": 2,
    "explanation": "|| เป็นจริงเมื่อมีอย่างน้อยหนึ่งฝั่งเป็นจริง running เป็น true จึงได้ true"
  },
  {
    "id": "ent-th-16",
    "question": "const parts = ['A', 'B', 'C']; parts.push('D'); ค่า parts[3] คืออะไร",
    "options": [
      "A: 'C'",
      "B: เกิด error เพราะ parts เป็น const",
      "C: undefined",
      "D: 'D'"
    ],
    "correctAnswer": 3,
    "explanation": "push เพิ่ม 'D' ต่อท้ายที่ index 3 และ const ห้ามแค่กำหนดค่าใหม่ทั้งตัวแปร แต่แก้ข้างใน Array ได้ (อ้างอิง ECMAScript 2015 (ECMA-262 ฉบับที่ 6))"
  },
  {
    "id": "ent-th-17",
    "question": "document.querySelector('.card') ได้ผลลัพธ์เป็นอะไร",
    "options": [
      "A: element แรกในหน้าที่มี class=\"card\"",
      "B: ทุก element ที่มี class=\"card\"",
      "C: element ที่มี id=\"card\"",
      "D: ข้อความทั้งหมดใน element ที่ชื่อ card"
    ],
    "correctAnswer": 0,
    "explanation": "querySelector คืน element แรกที่ตรงกับ CSS Selector ถ้าต้องการทุกตัวใช้ querySelectorAll"
  },
  {
    "id": "ent-th-18",
    "question": "ต้องการแสดงข้อความที่ผู้ใช้พิมพ์ลงบนหน้าเว็บอย่างปลอดภัย ควรใช้คำสั่งใด",
    "options": [
      "A: element.innerHTML = text",
      "B: element.textContent = text",
      "C: document.write(text)",
      "D: element.outerHTML = text"
    ],
    "correctAnswer": 1,
    "explanation": "textContent แสดงเป็นข้อความเสมอ ส่วน innerHTML จะตีความแท็ก HTML จึงเปิดช่องให้ฝังโค้ดอันตราย (XSS) (อ้างอิง OWASP Cross Site Scripting Prevention Cheat Sheet)"
  },
  {
    "id": "ent-th-19",
    "question": "ในฟังก์ชันที่รับ Event เช่น function onClick(event) ค่า event.target คืออะไร",
    "options": [
      "A: เวลาที่เกิด Event",
      "B: ชื่อฟังก์ชันที่ถูกเรียก",
      "C: element ที่ทำให้เกิด Event เช่น ปุ่มที่ถูกกด",
      "D: หน้าเว็บทั้งหน้า"
    ],
    "correctAnswer": 2,
    "explanation": "event.target ชี้ไปที่ element ต้นเหตุ ทำให้ใช้ฟังก์ชันเดียวกับหลายปุ่มได้"
  },
  {
    "id": "ent-th-20",
    "question": "ข้อใดเป็น JSON ที่ถูกต้อง",
    "options": [
      "A: {\"temp\": 72.5, \"online\": true}",
      "B: {\"temp\": 72.5,}",
      "C: {'temp': 72.5}",
      "D: {\"temp\": 72.5 // องศา}"
    ],
    "correctAnswer": 0,
    "explanation": "JSON ต้องใช้เครื่องหมายคำพูดคู่ ห้ามมี comma ตัวสุดท้าย และห้ามมี comment (อ้างอิง RFC 8259)"
  },
  {
    "id": "ent-th-21",
    "question": "data = {\"lines\": [{\"name\": \"A\", \"machines\": [{\"id\": \"M-01\"}, {\"id\": \"M-02\"}]}]}  ต้องเขียนอย่างไรจึงได้ \"M-02\"",
    "options": [
      "A: data.machines[1].id",
      "B: data.lines[0].machines[1].id",
      "C: data.lines.machines[2].id",
      "D: data[0].machines[1]"
    ],
    "correctAnswer": 1,
    "explanation": "ไล่ทีละชั้น: lines เป็น Array เลือกตัวแรก [0] แล้ว machines เป็น Array เลือกตัวที่สอง [1] แล้วอ่าน .id"
  },
  {
    "id": "ent-th-22",
    "question": "JSON.stringify(obj) ใช้ทำอะไร",
    "options": [
      "A: แปลงข้อความ JSON เป็น Object",
      "B: ตรวจว่า JSON ถูกต้องหรือไม่",
      "C: ลบ key ที่ไม่ใช้ออกจาก Object",
      "D: แปลง Object เป็นข้อความ JSON เพื่อส่งไปยัง Server"
    ],
    "correctAnswer": 3,
    "explanation": "stringify แปลง Object เป็นข้อความ ใช้ตอนส่ง body ส่วน JSON.parse ทำกลับกัน"
  },
  {
    "id": "ent-th-23",
    "question": "ใน JSON  {\"alarm\": null}  ค่า null หมายถึงอะไร",
    "options": [
      "A: ข้อความว่าง \"\"",
      "B: ตัวเลข 0",
      "C: ไม่มีค่า (ว่างโดยตั้งใจ)",
      "D: ข้อมูลผิดพลาด"
    ],
    "correctAnswer": 2,
    "explanation": "null แปลว่าไม่มีค่า เช่น ตอนนี้ไม่มี alarm ต่างจากข้อความว่างหรือเลข 0 (อ้างอิง RFC 8259)"
  },
  {
    "id": "ent-th-24",
    "question": "ต้องการแก้สถานะของเครื่อง M-01 ที่มีอยู่แล้วผ่าน REST API ควรใช้ HTTP Method ใด",
    "options": [
      "A: GET",
      "B: PUT",
      "C: POST",
      "D: DELETE"
    ],
    "correctAnswer": 1,
    "explanation": "GET อ่าน, POST สร้างใหม่, PUT แก้ไขข้อมูลเดิม, DELETE ลบ (อ้างอิง RFC 9110 HTTP Semantics: PUT แทนที่ข้อมูลเดิมและเป็น idempotent)"
  },
  {
    "id": "ent-th-25",
    "question": "API ตอบกลับด้วย Status 404 หมายถึงอะไร",
    "options": [
      "A: สำเร็จ",
      "B: ไม่มีสิทธิ์เข้าถึง",
      "C: Server เกิดข้อผิดพลาดภายใน",
      "D: ไม่พบข้อมูลหรือ URL ที่ขอ"
    ],
    "correctAnswer": 3,
    "explanation": "404 Not Found คือ URL ผิดหรือไม่มีข้อมูลนั้น ส่วน 500 คือ Server พัง และ 401/403 เกี่ยวกับสิทธิ์ (อ้างอิง RFC 9110 HTTP Semantics หมวด Status Codes)"
  },
  {
    "id": "ent-th-26",
    "question": "เหตุใดหลังเรียก fetch แล้วควรตรวจ response.ok ก่อนใช้ข้อมูล",
    "options": [
      "A: เพราะ fetch ไม่ throw error เมื่อ Server ตอบ 404 หรือ 500 ต้องตรวจเอง",
      "B: เพราะถ้าไม่ตรวจ ข้อมูลจะไม่ถูกแปลงเป็น JSON",
      "C: เพราะ response.ok ทำให้เรียก API ได้เร็วขึ้น",
      "D: เพราะเป็นข้อบังคับของ HTML5"
    ],
    "correctAnswer": 0,
    "explanation": "fetch จะเข้า catch เฉพาะตอนต่อเครือข่ายไม่ได้ ถ้าได้ 404/500 ต้องเช็ก response.ok แล้วจัดการเอง (อ้างอิง Fetch Living Standard (WHATWG): fetch reject เฉพาะเมื่อเกิด network error)"
  },
  {
    "id": "ent-th-27",
    "question": "การส่งข้อมูล JSON ไปยัง API ด้วย fetch แบบ POST ต้องกำหนด header ใด",
    "options": [
      "A: 'Accept-Language': 'th'",
      "B: 'Cache-Control': 'no-cache'",
      "C: 'Content-Type': 'application/json'",
      "D: 'Content-Type': 'text/html'"
    ],
    "correctAnswer": 2,
    "explanation": "Content-Type: application/json บอก Server ว่า body เป็น JSON และต้องใช้คู่กับ JSON.stringify (อ้างอิง RFC 8259 กำหนด media type application/json)"
  },
  {
    "id": "ent-th-28",
    "question": "สถานการณ์ใดเหมาะกับการใช้ Webhook มากที่สุด",
    "options": [
      "A: แจ้งหัวหน้างานทันทีเมื่อเครื่องจักรหยุด",
      "B: แสดงกราฟอุณหภูมิที่เปลี่ยนทุกวินาที",
      "C: โหลดรายชื่อพนักงานครั้งเดียวตอนเปิดหน้า",
      "D: คำนวณคะแนนในเบราว์เซอร์"
    ],
    "correctAnswer": 0,
    "explanation": "Webhook ส่งข้อมูลทันทีเมื่อเกิดเหตุการณ์ (Push) เหมาะกับการแจ้งเตือนที่เกิดไม่บ่อยแต่ต้องรู้ทันที"
  },
  {
    "id": "ent-th-29",
    "question": "การทดสอบว่าหน้าเว็บกับ API ทำงานร่วมกันได้ถูกต้อง เป็นการทดสอบระดับใด",
    "options": [
      "A: Unit Testing",
      "B: Integration Testing",
      "C: User Acceptance Testing",
      "D: ไม่ต้องทดสอบ"
    ],
    "correctAnswer": 1,
    "explanation": "Integration Testing ทดสอบการเชื่อมต่อระหว่างส่วนต่าง ๆ ของระบบ (อ้างอิง ISO/IEC/IEEE 29119 และ ISTQB Glossary)"
  },
  {
    "id": "ent-th-30",
    "question": "ระบบต้องแจ้งเตือนเมื่อแรงดัน \"เกิน 240 V\" ข้อมูลทดสอบชุดใดตรวจค่าขอบ (Boundary) ได้ดีที่สุด",
    "options": [
      "A: 100 และ 500",
      "B: 0 อย่างเดียว",
      "C: 230 อย่างเดียว",
      "D: 240 (ต้องไม่เตือน) และ 240.1 (ต้องเตือน)"
    ],
    "correctAnswer": 3,
    "explanation": "ค่าขอบคือค่าที่อยู่ตรงเส้นแบ่ง ถ้าเงื่อนไขเขียนผิดเป็น >= จะจับได้จากค่า 240 (อ้างอิง Boundary Value Analysis ตาม ISO/IEC/IEEE 29119-4 และ ISTQB)"
  }
];
