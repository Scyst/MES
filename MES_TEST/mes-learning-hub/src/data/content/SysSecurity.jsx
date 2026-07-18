import React from 'react';

export default function SysSecurity() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="bg-gradient-to-r from-rose-900/40 to-red-900/40 border border-rose-500/30 rounded-xl p-8 mb-8 text-center shadow-lg">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-red-300 m-0 pb-4">
          ความปลอดภัยระดับ Enterprise (Security & Vulnerabilities)
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          เรียนรู้ 4 ช่องโหว่สำคัญระดับสากล และวิธีการป้องกันที่ถูกต้องในระบบ MES 
          เพื่อป้องกันข้อมูลรั่วไหลและการถูกโจมตี
        </p>
      </div>

      {/* SQL Injection */}
      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-3">
          <span className="flex items-center justify-center px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            HIGH RISK
          </span>
          1. SQL Injection (SQLi)
        </h3>
        
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
          <div className="flex gap-3 items-start mb-6">
            <span className="text-2xl mt-1">⚠️</span>
            <div>
              <strong className="text-white block mb-1">แก่นของปัญหา:</strong>
              <span className="text-slate-400">Server นำ Input จากผู้ใช้ <strong>ต่อตรงๆ</strong> เข้าไปใน SQL String ทำให้ Hacker แทรกคำสั่ง SQL ปลอมเข้ามาได้</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-5">
              <h4 className="text-rose-400 font-bold mb-3">❌ การเขียนแบบผิด (ต่อ String)</h4>
              <div className="bg-black/60 rounded-lg p-3 font-mono text-sm border border-slate-800 text-slate-300 mb-3">
                $sql = "SELECT * FROM users <br/>
                WHERE username = '" . $_POST['user'] . "'";
              </div>
              <p className="text-sm text-slate-400">
                ถ้า Hacker กรอก <code className="text-rose-400">' OR '1'='1' --</code> <br/>
                จะทำให้ Log-in ผ่านได้ทันทีโดยไม่ต้องรู้รหัสผ่าน!
              </p>
            </div>

            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
              <h4 className="text-emerald-400 font-bold mb-3">✓ การป้องกันด้วย PDO (Prepared Statement)</h4>
              <div className="bg-black/60 rounded-lg p-3 font-mono text-sm border border-slate-800 text-slate-300 mb-3">
                $stmt = $pdo-&gt;prepare(<br/>
                &nbsp;&nbsp;"SELECT * FROM users WHERE username = ?"<br/>
                );<br/>
                $stmt-&gt;execute([$_POST['user']]);
              </div>
              <p className="text-sm text-slate-400">
                PDO จะแยก <strong>"คำสั่ง SQL"</strong> ออกจาก <strong>"ข้อมูล"</strong> ทำให้ Input ไม่สามารถแปลงร่างเป็นคำสั่งได้
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSRF */}
      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-3">
          <span className="flex items-center justify-center px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            HIGH RISK
          </span>
          2. CSRF (Cross-Site Request Forgery)
        </h3>
        
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
          <div className="flex gap-3 items-start mb-6">
            <span className="text-2xl mt-1">⚠️</span>
            <div>
              <strong className="text-white block mb-1">แก่นของปัญหา:</strong>
              <span className="text-slate-400">Browser จะแนบ <strong>Session Cookie</strong> ไปกับทุก Request อัตโนมัติ Hacker จึงสร้างเว็บปลอมมาหลอกให้ Browser เราส่งคำสั่งแก้ไขข้อมูลไปยัง Server ได้โดยที่เราไม่รู้ตัว</span>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-6 border border-slate-700/50 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🍪</div>
            <h4 className="text-white font-bold mb-4">การป้องกันด้วย CSRF Token</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div>
                <h5 className="text-cyan-400 font-bold mb-2">ฝั่ง Backend (PHP)</h5>
                <p className="text-sm text-slate-400 mb-3">สร้างรหัสสุ่ม (Token) เก็บไว้ใน Session และส่งให้ Frontend ทุกครั้งที่ Login</p>
                <div className="bg-slate-900 rounded p-3 font-mono text-xs text-slate-300 border border-slate-700">
                  <span className="text-slate-500">// สร้าง Token</span><br/>
                  $_SESSION['csrf_token'] = bin2hex(random_bytes(32));<br/>
                  <br/>
                  <span className="text-slate-500">// ตรวจสอบ Token เมื่อรับ POST</span><br/>
                  if (!hash_equals($_SESSION['csrf_token'], $_POST['token'])) {'{'}<br/>
                  &nbsp;&nbsp;http_response_code(403); exit;<br/>
                  {'}'}
                </div>
              </div>
              
              <div>
                <h5 className="text-emerald-400 font-bold mb-2">ฝั่ง Frontend (React / Axios)</h5>
                <p className="text-sm text-slate-400 mb-3">แนบ Token ไปกับทุก HTTP Header อัตโนมัติ</p>
                <div className="bg-slate-900 rounded p-3 font-mono text-xs text-slate-300 border border-slate-700">
                  <span className="text-slate-500">// ตั้งค่า Axios Global</span><br/>
                  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;<br/>
                  <br/>
                  <span className="text-slate-500">// เมื่อยิง API ตัว Axios จะแนบ Header ให้เอง</span><br/>
                  await axios.post('/api/delete', data);
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 text-sm text-cyan-300">
            <strong>💡 ทำไมถึงกัน Hacker ได้?</strong> เพราะ Hacker อ่าน Token จากหน้าเว็บเราไม่ได้ (ติด Same-Origin Policy) 
            เมื่อ Hacker ส่ง Request ปลอมมา จะมีแต่ Cookie แต่ไม่มี Token &rarr; Server จึงปฏิเสธ!
          </div>
        </div>
      </div>

      {/* XSS & IDOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
            <span className="flex items-center justify-center px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
              MEDIUM
            </span>
            3. XSS
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            (Cross-Site Scripting) การฝังโค้ด JavaScript อันตรายลงในฐานข้อมูล เพื่อให้ไปรันบนเครื่องผู้ใช้คนอื่น
          </p>
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
            <h4 className="text-emerald-400 font-bold mb-2 text-sm">✓ การป้องกัน</h4>
            <p className="text-sm text-slate-400">
              <strong>React:</strong> ป้องกันให้อัตโนมัติ (Auto-Escaping) แค่ใช้ <code>{'{data}'}</code> แทนการใช้ <code>dangerouslySetInnerHTML</code><br/><br/>
              <strong>PHP:</strong> ใช้ <code>htmlspecialchars()</code> ก่อนพิมพ์ค่าออกหน้าจอ (ถ้าไม่ได้ใช้ React)
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
            <span className="flex items-center justify-center px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
              MEDIUM
            </span>
            4. IDOR
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            (Insecure Direct Object References) การที่ Hacker แอบเปลี่ยน ID ใน URL เพื่อดูข้อมูลของคนอื่นที่ตัวเองไม่มีสิทธิ์
          </p>
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
            <h4 className="text-emerald-400 font-bold mb-2 text-sm">✓ การป้องกัน</h4>
            <p className="text-sm text-slate-400">
              <strong>อย่าเชื่อ ID จาก URL:</strong> Backend ต้องตรวจสอบเสมอว่า User ที่ Login อยู่ ปัจจุบัน <strong>เป็นเจ้าของ</strong> หรือ <strong>มีสิทธิ์</strong> ในข้อมูล ID นั้นจริงๆ ก่อนส่งข้อมูลกลับไป
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
