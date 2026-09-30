const fs = require('fs');
let file = 'E:/MES/MES/MES/page/paintChem/api/get_history.php';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/ٻẺѹ١ͧ/g, 'รูปแบบวันที่ไม่ถูกต้อง');
content = content.replace(/еͧ DAY  NIGHT/g, 'กะต้องเป็น DAY หรือ NIGHT');
content = content.replace(/ԴͼԴҴк|ԴͼԴҴк/g, 'เกิดข้อผิดพลาดภายในระบบ');
fs.writeFileSync(file, content, 'utf8');
