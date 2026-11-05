// Pre-test and Post-test for Enterprise Application Course
export const ENTERPRISE_APP_PRE_TEST = [
  {
    "clo": "CLO01",
    "q": "ข้อใดเป็นระบบ OT (Operational Technology)",
    "choices": [
      "ระบบ ERP",
      "ระบบบัญชี",
      "อีเมลองค์กร",
      "PLC และ SCADA"
    ],
    "answer": 3,
    "why": "OT คือระบบที่ควบคุมเครื่องจักรและกระบวนการผลิตโดยตรง เช่น PLC, SCADA, HMI ส่วนข้ออื่นเป็นระบบ IT (โครงสร้างระดับตาม IEC 62264 / ISA-95: PLC อยู่ระดับ 1, SCADA ระดับ 2, ERP ระดับ 4)"
  },
  {
    "clo": "CLO01",
    "q": "ระบบ OT ให้ความสำคัญกับอะไรเป็นอันดับแรก",
    "choices": [
      "ความลับของข้อมูล",
      "ความสวยงามของหน้าจอ",
      "ความปลอดภัยและความพร้อมใช้งานของเครื่องจักร",
      "ราคาถูกที่สุด"
    ],
    "answer": 2,
    "why": "OT เน้น Safety และ Availability เพราะเครื่องหยุดหมายถึงสูญเสียการผลิต ส่วน IT เน้น Confidentiality ก่อน (อ้างอิง NIST SP 800-82 Rev.3 Guide to OT Security)"
  },
  {
    "clo": "CLO01",
    "q": "ในสถาปัตยกรรม Client-Server หน้าที่ของ Client คือข้อใด",
    "choices": [
      "แสดงผลและรับข้อมูลจากผู้ใช้",
      "เก็บฐานข้อมูลหลัก",
      "ประมวลผล Business Logic ทั้งหมด",
      "ควบคุมเครื่องจักรโดยตรง"
    ],
    "answer": 0,
    "why": "Client (เช่น เบราว์เซอร์) แสดงผลและรับ Input ส่วน Server ประมวลผลและเก็บข้อมูล"
  },
  {
    "clo": "CLO02",
    "q": "JSON ข้อใดเขียนถูกต้อง",
    "choices": [
      "{name: 'Line A'}",
      "{\"name\": \"Line A\"}",
      "{'name' = 'Line A'}",
      "[name: \"Line A\"]"
    ],
    "answer": 1,
    "why": "ตาม RFC 8259 ชื่อ key และข้อความต้องอยู่ในเครื่องหมายคำพูดคู่ (\") และคั่น key กับ value ด้วย :"
  },
  {
    "clo": "CLO02",
    "q": "จาก JSON {\"machine\": {\"temp\": 72}} ถ้าเก็บไว้ในตัวแปร data จะอ่านค่า 72 อย่างไร",
    "choices": [
      "data.temp",
      "data[temp]",
      "data.machine.temp",
      "machine.temp.data"
    ],
    "answer": 2,
    "why": "temp อยู่ใน object ชื่อ machine จึงต้องอ่านไล่ชั้น data.machine.temp"
  },
  {
    "clo": "CLO02",
    "q": "จาก {\"sensors\": [10, 20, 30]} ค่า data.sensors[1] คือเท่าไร",
    "choices": [
      "10",
      "20",
      "30",
      "undefined"
    ],
    "answer": 1,
    "why": "index ของ Array เริ่มที่ 0 ดังนั้น index 1 คือตัวที่สอง ได้ 20"
  },
  {
    "clo": "CLO02",
    "q": "ข้อใดไม่ใช่ชนิดข้อมูลที่ JSON รองรับ",
    "choices": [
      "boolean",
      "null",
      "array",
      "function"
    ],
    "answer": 3,
    "why": "ตาม RFC 8259 ค่าใน JSON มีแค่ string, number, boolean (true/false), null, object และ array ไม่มี function"
  },
  {
    "clo": "CLO03",
    "q": "แท็กใดเป็น Semantic HTML",
    "choices": [
      "<header>",
      "<span>",
      "<div>",
      "<b>"
    ],
    "answer": 0,
    "why": "header บอกความหมายว่าเป็นส่วนหัวของหน้า ส่วน div และ span ไม่บอกความหมาย และ b แค่ทำตัวหนา (อ้างอิง HTML Living Standard ของ WHATWG)"
  },
  {
    "clo": "CLO03",
    "q": "การเขียน CSS แบบใดเหมาะกับเว็บที่มีหลายหน้าและใช้สไตล์ร่วมกัน",
    "choices": [
      "Inline Style",
      "Internal Style",
      "External Style Sheet (ไฟล์ .css)",
      "เขียนใน JavaScript ทุกครั้ง"
    ],
    "answer": 2,
    "why": "External Style Sheet แยกเป็นไฟล์เดียว ทุกหน้าลิงก์ไปใช้ได้ แก้ที่เดียวเปลี่ยนทั้งเว็บ"
  },
  {
    "clo": "CLO03",
    "q": "ถ้าต้องการตัวแปรที่เปลี่ยนค่าได้ ควรประกาศด้วยคำใด",
    "choices": [
      "const",
      "let",
      "static",
      "final"
    ],
    "answer": 1,
    "why": "let ใช้กับค่าที่เปลี่ยนได้ const ใช้กับค่าคงที่ ส่วน static และ final ไม่ใช่คำประกาศตัวแปรของ JavaScript"
  },
  {
    "clo": "CLO03",
    "q": "ผลลัพธ์ของ '10' + 5 ใน JavaScript คือข้อใด",
    "choices": [
      "15",
      "'15'",
      "Error",
      "'105'"
    ],
    "answer": 3,
    "why": "เมื่อมี String อยู่ด้วย เครื่องหมาย + จะต่อข้อความ ได้ '105' ค่าจาก input เป็น String จึงต้องแปลงด้วย Number() ก่อน"
  },
  {
    "clo": "CLO03",
    "q": "คำสั่งใดเลือก element ที่มี id=\"status\"",
    "choices": [
      "document.getElementById('status')",
      "document.querySelector('status')",
      "document.getElementsByClassName('status')",
      "document.select('#status')"
    ],
    "answer": 0,
    "why": "getElementById เลือกด้วย id โดยตรง ถ้าใช้ querySelector ต้องเขียน '#status' มีเครื่องหมาย #"
  },
  {
    "clo": "CLO03",
    "q": "ถ้าต้องการให้โค้ดทำงานเมื่อผู้ใช้กดปุ่ม ต้องใช้ Event ใด",
    "choices": [
      "onload",
      "onclick",
      "onmouseover",
      "onkeydown"
    ],
    "answer": 1,
    "why": "onclick เกิดเมื่อคลิก ส่วน onmouseover เกิดเมื่อเอาเมาส์ชี้ และ onkeydown เกิดเมื่อกดแป้นพิมพ์"
  },
  {
    "clo": "CLO04",
    "q": "ตามมาตรฐานสีไฟแสดงสถานะ (IEC 60204-1) สีเหลืองหมายถึงอะไร",
    "choices": [
      "เตือน ต้องเฝ้าระวัง",
      "ทำงานปกติ",
      "หยุดฉุกเฉิน",
      "ออฟไลน์"
    ],
    "answer": 0,
    "why": "ตาม IEC 60204-1 และ IEC 60073 ไฟแสดงสถานะใช้ เขียว = ปกติ, เหลือง = ผิดปกติ ต้องเฝ้าระวัง, แดง = ฉุกเฉิน/อันตราย, น้ำเงิน = ต้องให้ผู้ปฏิบัติงานดำเนินการ"
  },
  {
    "clo": "CLO04",
    "q": "หลัก 5-Second Rule ในการออกแบบ Dashboard หมายถึงอะไร",
    "choices": [
      "หน้าเว็บต้องโหลดเสร็จใน 5 วินาที",
      "อัปเดตข้อมูลทุก 5 วินาที",
      "ผู้ดูต้องเข้าใจสถานะหลักได้ภายใน 5 วินาที",
      "มีเมนูไม่เกิน 5 เมนู"
    ],
    "answer": 2,
    "why": "Dashboard ที่ดีทำให้คนดูรู้สถานะสำคัญทันที โดยใช้ขนาด ตำแหน่ง และสีช่วย"
  },
  {
    "clo": "CLO05",
    "q": "HTTP Method ใดใช้สำหรับอ่านข้อมูล",
    "choices": [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    "answer": 0,
    "why": "GET = อ่าน, POST = เพิ่ม, PUT = แก้ไข, DELETE = ลบ ตาม RFC 9110 GET เป็น safe method คืออ่านอย่างเดียว ไม่เปลี่ยนข้อมูลใน Server"
  },
  {
    "clo": "CLO05",
    "q": "ข้อใดอธิบายความต่างระหว่างการเรียก API ปกติกับ Webhook ได้ถูกต้อง",
    "choices": [
      "API ปกติระบบต้นทางส่งมาหาเราเอง ส่วน Webhook เราต้องไปขอ",
      "Webhook ใช้ได้เฉพาะกับอีเมล",
      "ทั้งสองเหมือนกันทุกประการ",
      "API ปกติเราไปขอข้อมูล (Pull) ส่วน Webhook ระบบต้นทางส่งมาทันทีเมื่อเกิดเหตุการณ์ (Push)"
    ],
    "answer": 3,
    "why": "Webhook ทำงานแบบ Push เมื่อเกิด Event จึงไม่ต้องคอยถามซ้ำ ๆ"
  },
  {
    "clo": "CLO05",
    "q": "ในโค้ด fetch(url).then(res => res.json()) คำสั่ง res.json() ทำหน้าที่อะไร",
    "choices": [
      "ส่งข้อมูลไปที่ Server",
      "แปลงข้อมูลที่ได้รับเป็น Object ของ JavaScript",
      "ลบข้อมูลใน Server",
      "บันทึกไฟล์ JSON ลงเครื่อง"
    ],
    "answer": 1,
    "why": "res.json() อ่าน Response แล้วแปลง JSON เป็น Object เพื่อใช้ต่อในโค้ด (อ้างอิง Fetch Living Standard ของ WHATWG)"
  },
  {
    "clo": "CLO06",
    "q": "Test Case ที่ดีต้องมีส่วนใดเพื่อตัดสินว่า Pass หรือ Fail",
    "choices": [
      "ชื่อผู้พัฒนา",
      "สีของหน้าจอ",
      "Expected Result (ผลที่คาดหวัง)",
      "ราคาของระบบ"
    ],
    "answer": 2,
    "why": "นำ Actual Result ไปเทียบกับ Expected Result จึงตัดสินได้ว่าผ่านหรือไม่ ISO/IEC/IEEE 29119-3 กำหนดให้ Test Case ระบุผลที่คาดหวังไว้เสมอ"
  },
  {
    "clo": "CLO06",
    "q": "UAT (User Acceptance Testing) ทำโดยใคร",
    "choices": [
      "นักพัฒนาที่เขียนโค้ด",
      "เครื่องมือทดสอบอัตโนมัติเท่านั้น",
      "ผู้ดูแล Server",
      "ผู้ใช้งานจริงหรือลูกค้า"
    ],
    "answer": 3,
    "why": "UAT คือขั้นสุดท้ายที่ผู้ใช้จริงทดสอบในสภาพเหมือนจริงก่อนยอมรับระบบ (อ้างอิง ISTQB Glossary: acceptance testing)"
  }
];

export const ENTERPRISE_APP_POST_TEST = [
  {
    "clo": "CLO01",
    "q": "ข้อใดเป็นระบบ OT ทั้งหมด",
    "choices": [
      "ERP, CRM และอีเมลองค์กร",
      "PLC, HMI และเซนเซอร์วัดอุณหภูมิ",
      "ฐานข้อมูลบัญชี, HMI และ ERP",
      "เว็บไซต์บริษัท, PLC และอีเมลองค์กร"
    ],
    "answer": 1,
    "why": "PLC, HMI และเซนเซอร์ควบคุมหรือวัดค่าจากกระบวนการผลิตโดยตรงจึงเป็น OT ทั้งหมด ข้ออื่นมีระบบ IT ปนอยู่ (โครงสร้างระดับตาม IEC 62264 / ISA-95)"
  },
  {
    "clo": "CLO01",
    "q": "ทีม IT ต้องการติดตั้งอัปเดตความปลอดภัยให้คอมพิวเตอร์ที่ควบคุมเครื่องจักรทันทีระหว่างกะผลิต ข้อกังวลหลักจากมุมมอง OT คือข้อใด",
    "choices": [
      "หน้าจออาจเปลี่ยนสี",
      "ค่าลิขสิทธิ์ซอฟต์แวร์อาจสูงขึ้น",
      "ข้อมูลอาจถูกส่งออกไปนอกบริษัท",
      "การรีสตาร์ตอาจทำให้เครื่องจักรหยุด กระทบการผลิตและความปลอดภัย"
    ],
    "answer": 3,
    "why": "OT ให้ความสำคัญกับ Safety และ Availability การอัปเดตจึงต้องวางแผนช่วงหยุดเครื่อง ไม่ทำกลางกะผลิต (อ้างอิง NIST SP 800-82 Rev.3)"
  },
  {
    "clo": "CLO01",
    "q": "ในระบบ Dashboard ค่าน้ำ-ไฟของ Workshop ส่วนใดทำงานอยู่ฝั่ง Server",
    "choices": [
      "การตอบค่าน้ำ-ไฟเป็น JSON ผ่าน /api/meter",
      "การเปลี่ยนสีป้ายสถานะเมื่อกดปุ่ม",
      "การตรวจค่าที่ผู้ใช้พิมพ์ในช่อง input ทันที",
      "การแสดงเวลาอัปเดตล่าสุดบนหน้าจอ"
    ],
    "answer": 0,
    "why": "API ที่ตอบข้อมูลอยู่บน Server ส่วนการแสดงผลและการตรวจค่าที่ผู้ใช้พิมพ์ทำด้วย JavaScript ในเบราว์เซอร์ (Client)"
  },
  {
    "clo": "CLO02",
    "q": "JSON ข้อใดถูกต้องทั้งหมด",
    "choices": [
      "{\"line\": \"A\", \"temps\": [72.5, 73.0,]}",
      "{\"line\": \"A\", \"online\": True}",
      "{\"line\": \"A\", \"temps\": [72.5, 73.0]}",
      "{\"line\": \"A\", \"note\": undefined}"
    ],
    "answer": 2,
    "why": "ตาม RFC 8259 ห้ามมี comma ตัวสุดท้ายแม้อยู่ใน Array ค่า boolean ต้องเป็น true ตัวเล็ก และไม่มีค่า undefined"
  },
  {
    "clo": "CLO02",
    "q": "data = {\"line\": {\"name\": \"A\", \"machines\": [{\"id\": \"M-01\", \"sensors\": {\"temp\": 72}}, {\"id\": \"M-02\", \"sensors\": {\"temp\": 65}}]}}  ต้องเขียนอย่างไรจึงได้ค่า 65",
    "choices": [
      "data.machines[1].sensors.temp",
      "data.line.machines[2].sensors.temp",
      "data.line.machines[1].temp",
      "data.line.machines[1].sensors.temp"
    ],
    "answer": 3,
    "why": "ไล่ทีละชั้น: line เป็น Object › machines เป็น Array ตัวที่สองคือ [1] › sensors เป็น Object › อ่าน temp"
  },
  {
    "clo": "CLO02",
    "q": "จาก {\"sensors\": [10, 20, 30, 40]} ค่า data.sensors[data.sensors.length - 2] คือเท่าไร",
    "choices": [
      "20",
      "30",
      "40",
      "undefined"
    ],
    "answer": 1,
    "why": "length คือ 4 ดังนั้น length - 2 คือ index 2 ซึ่งเป็นตัวที่สาม ได้ 30 (index เริ่มที่ 0)"
  },
  {
    "clo": "CLO02",
    "q": "JSON.stringify({ a: 1, b: undefined, c: null }) ได้ผลลัพธ์ใด",
    "choices": [
      "{\"a\":1,\"c\":null}",
      "{\"a\":1,\"b\":undefined,\"c\":null}",
      "{\"a\":1,\"b\":null,\"c\":null}",
      "{\"a\":1}"
    ],
    "answer": 0,
    "why": "JSON ไม่มีชนิด undefined จึงตัด key b ทิ้ง แต่ null เป็นค่าที่ JSON รองรับจึงยังอยู่ (อ้างอิง RFC 8259 และ ECMA-262)"
  },
  {
    "clo": "CLO03",
    "q": "ต้องการทำเมนูลิงก์ไปหน้าต่าง ๆ ของ Dashboard ควรใช้แท็ก Semantic ใดครอบเมนู",
    "choices": [
      "<div class=\"menu\">",
      "<span>",
      "<footer>",
      "<nav>"
    ],
    "answer": 3,
    "why": "nav ใช้สำหรับกลุ่มลิงก์นำทาง div และ span ไม่บอกความหมาย ส่วน footer คือส่วนท้ายของหน้า (อ้างอิง HTML Living Standard ของ WHATWG)"
  },
  {
    "clo": "CLO03",
    "q": "ไฟล์ style.css กำหนด p { color: blue; } แต่ในหน้าเว็บเขียน <p style=\"color: red\">ข้อความ</p> ข้อความจะเป็นสีอะไร",
    "choices": [
      "แดง เพราะ style ที่เขียนในแท็กเจาะจงกว่า",
      "น้ำเงิน เพราะไฟล์ CSS ภายนอกสำคัญที่สุด",
      "ดำ เพราะกฎขัดกันจึงใช้ค่าเริ่มต้น",
      "ม่วง เพราะสีผสมกัน"
    ],
    "answer": 0,
    "why": "Inline style ในแท็กมีลำดับความสำคัญสูงกว่า Selector ในไฟล์ CSS ภายนอก จึงนิยมใช้ External CSS เป็นหลักแล้วหลีกเลี่ยง Inline"
  },
  {
    "clo": "CLO03",
    "q": "โค้ดใดทำงานได้โดยไม่เกิด error",
    "choices": [
      "const max = 240; max = 250;",
      "const list; list = [];",
      "let count = 0; count = count + 1;",
      "let x = 1; let x = 2;"
    ],
    "answer": 2,
    "why": "let เปลี่ยนค่าได้ ส่วน const กำหนดค่าใหม่ไม่ได้และต้องใส่ค่าตอนประกาศ และประกาศ let ชื่อซ้ำในขอบเขตเดียวกันไม่ได้ (อ้างอิง ECMAScript 2015)"
  },
  {
    "clo": "CLO03",
    "q": "ผลลัพธ์ของ '10' - 5 + '5' ใน JavaScript คือข้อใด",
    "choices": [
      "10",
      "'55'",
      "'105'",
      "NaN"
    ],
    "answer": 1,
    "why": "คำนวณจากซ้ายไปขวา: '10' - 5 แปลงเป็นตัวเลขได้ 5 จากนั้น 5 + '5' มี String จึงต่อข้อความได้ '55'"
  },
  {
    "clo": "CLO03",
    "q": "ข้อใดเลือก element เดียวกับ document.getElementById('status')",
    "choices": [
      "document.querySelector('.status')",
      "document.querySelector('status')",
      "document.getElementsByClassName('status')",
      "document.querySelector('#status')"
    ],
    "answer": 3,
    "why": "querySelector ใช้ CSS Selector ต้องใส่ # นำหน้าเพื่อเลือกด้วย id ส่วน . คือ class และไม่ใส่เครื่องหมายคือชื่อแท็ก"
  },
  {
    "clo": "CLO03",
    "q": "ต้องการตรวจค่าแรงดันทุกครั้งที่ผู้ใช้พิมพ์ในช่อง input ทันทีโดยไม่ต้องกดปุ่ม ควรผูก Event ใด",
    "choices": [
      "input",
      "click",
      "load",
      "submit"
    ],
    "answer": 0,
    "why": "Event input เกิดทุกครั้งที่ค่าในช่องเปลี่ยน ส่วน click ต้องกด และ submit เกิดตอนส่งฟอร์ม"
  },
  {
    "clo": "CLO04",
    "q": "ตามมาตรฐาน IEC 60204-1 ไฟแสดงสถานะสีใดหมายถึง \"ต้องให้ผู้ปฏิบัติงานดำเนินการ\"",
    "choices": [
      "เขียว",
      "เหลือง",
      "น้ำเงิน",
      "ขาว"
    ],
    "answer": 2,
    "why": "ตาม IEC 60204-1 และ IEC 60073 น้ำเงิน = ต้องให้ผู้ปฏิบัติงานดำเนินการ, เขียว = ปกติ, เหลือง = ผิดปกติ, แดง = ฉุกเฉิน, ขาว = ไม่มีความหมายเฉพาะ"
  },
  {
    "clo": "CLO04",
    "q": "Dashboard หน้าหนึ่งแสดงตัวเลข 30 ค่าขนาดเท่ากันหมดและใช้สีต่างกัน 10 สี ข้อใดเป็นการปรับที่ตรงหลักการออกแบบมากที่สุด",
    "choices": [
      "เพิ่มค่าให้ครบทุกค่าที่มีในระบบ",
      "ใช้สีต่างกันทุกค่าเพื่อให้แยกง่าย",
      "ย่อตัวเลขให้เล็กลงเพื่อใส่ได้มากขึ้น",
      "แสดงค่าสำคัญไม่กี่ค่าเป็น KPI ขนาดใหญ่ด้านบน และใช้สีเฉพาะบอกสถานะ"
    ],
    "answer": 3,
    "why": "หลัก 5-Second Rule และ Visual Hierarchy: ค่าสำคัญต้องเด่นและอ่านได้ทันที ใช้สีเพื่อบอกสถานะเท่านั้น (ANSI/ISA-101.01 แนะนำให้ใช้สีสดเฉพาะสถานะผิดปกติ)"
  },
  {
    "clo": "CLO05",
    "q": "HTTP Method ใด ถ้าถูกเรียกซ้ำโดยไม่ตั้งใจ มีโอกาสสร้างข้อมูลหรือแจ้งเตือนซ้ำมากที่สุด",
    "choices": [
      "POST",
      "GET",
      "PUT",
      "DELETE"
    ],
    "answer": 0,
    "why": "ตาม RFC 9110 GET, PUT และ DELETE เป็น idempotent เรียกซ้ำผลเหมือนเรียกครั้งเดียว ส่วน POST ไม่ใช่ จึงต้องกันการกดส่งซ้ำ"
  },
  {
    "clo": "CLO05",
    "q": "Dashboard ถาม Server ทุก 30 วินาที ถ้าเครื่องจักรหยุด 1 วินาทีหลังรอบถามล่าสุด Dashboard จะรู้ช้าสุดประมาณเท่าไร และควรแก้อย่างไร",
    "choices": [
      "ประมาณ 1 วินาที ไม่ต้องแก้",
      "ประมาณ 29 วินาที ควรให้ Server ส่ง Webhook มาทันทีเมื่อเกิดเหตุการณ์",
      "ประมาณ 30 นาที ควรเพิ่มรอบเป็นทุก 1 นาที",
      "รู้ทันที เพราะ Polling เป็นแบบ Push"
    ],
    "answer": 1,
    "why": "Polling ต้องรอรอบถามถัดไป (30 - 1 = 29 วินาที) ส่วน Webhook ทำงานแบบ Push ส่งมาทันทีเมื่อเกิดเหตุการณ์"
  },
  {
    "clo": "CLO05",
    "q": "ข้อใดเรียงลำดับการดึงข้อมูลด้วย fetch ได้ถูกต้อง",
    "choices": [
      "แปลงด้วย res.json() › ส่ง Request › ตรวจ res.ok › แสดงผล",
      "ส่ง Request › ได้ Response › ตรวจ res.ok › แปลงด้วย res.json() › แสดงผล",
      "ส่ง Request › แสดงผล › ได้ Response › ตรวจ res.ok",
      "ตรวจ res.ok › ส่ง Request › แปลงด้วย res.json() › แสดงผล"
    ],
    "answer": 1,
    "why": "ต้องได้ Response ก่อนจึงตรวจสถานะได้ และตรวจ res.ok ก่อนแปลงข้อมูล เพราะ fetch ไม่ reject เมื่อได้ 404 หรือ 500 (อ้างอิง Fetch Living Standard ของ WHATWG)"
  },
  {
    "clo": "CLO06",
    "q": "Test Case ใดเขียนผลที่คาดหวัง (Expected Result) ได้ดีที่สุด",
    "choices": [
      "ระบบทำงานถูกต้อง",
      "หน้าจอแสดงผลสวยงาม",
      "กรอก 245 แล้วแสดง \"Warning: แรงดันเกิน 240 V\" สีแดงภายใน 1 วินาที",
      "ไม่พบข้อผิดพลาด"
    ],
    "answer": 2,
    "why": "ผลที่คาดหวังต้องวัดได้และระบุชัดว่าต้องเห็นอะไร จึงตัดสิน Pass/Fail ได้ตรงกันทุกคน (อ้างอิง ISO/IEC/IEEE 29119-3)"
  },
  {
    "clo": "CLO06",
    "q": "ข้อใดไม่ใช่ลักษณะของ UAT (User Acceptance Testing)",
    "choices": [
      "ผู้ใช้จริงทดสอบตามงานที่ทำจริง",
      "ทดสอบก่อนเริ่มใช้งานจริง (Go-Live)",
      "นักพัฒนาเขียนโค้ดทดสอบฟังก์ชันย่อยทีละฟังก์ชัน",
      "ผู้ใช้ลงชื่อยอมรับหรือไม่ยอมรับระบบ"
    ],
    "answer": 2,
    "why": "การทดสอบฟังก์ชันย่อยโดยนักพัฒนาคือ Unit Testing ส่วน UAT ให้ผู้ใช้จริงทดสอบแล้วยอมรับก่อนใช้งานจริง (อ้างอิง ISTQB Glossary)"
  }
];
