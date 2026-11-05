import React from 'react';

export default function SysAuth() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="mb-10">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            🔑
          </span>
          Authentication (การพิสูจน์ตัวตน)
        </h3>
        
        <p className="text-slate-400 mb-6 leading-relaxed">
          ระบบ MES ของเราเลือกใช้ <strong>Session-Based Authentication</strong> แทนที่จะเป็น JWT (JSON Web Token) 
          เนื่องจากเป็นระบบภายในองค์กร (Internal Network) ที่ต้องการความสามารถในการ <strong>เตะผู้ใช้ออก (Revoke) ได้ทันที</strong> เช่น กรณีพนักงานลาออกหรือโดนแฮก
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-amber-900/10 border border-amber-500/30 rounded-2xl p-6">
            <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">📜</span> Session-Based (ที่ MES ใช้)
            </h4>
            <ul className="text-sm text-slate-400 space-y-2 list-none pl-0">
              <li className="flex items-start gap-2"><span className="text-amber-500">•</span> State เก็บ <strong>ฝั่ง Server</strong> (ใน Database)</li>
              <li className="flex items-start gap-2"><span className="text-amber-500">•</span> Browser เก็บแค่รหัส SessionID สั้นๆ</li>
              <li className="flex items-start gap-2"><span className="text-amber-500">•</span> ทุก Request, Server ต้องไปเปิดดู Database</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">✓</span> <strong>ง่ายต่อการ Revoke</strong> (แค่ลบข้อมูลใน DB ออก ใช้งานไม่ได้ทันที)</li>
            </ul>
          </div>

          <div className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-6">
            <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">🎫</span> JWT (JSON Web Token)
            </h4>
            <ul className="text-sm text-slate-400 space-y-2 list-none pl-0">
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span> State เก็บ <strong>ฝั่ง Client</strong> (ซ่อนอยู่ใน Token)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span> Token มีข้อมูลผู้ใช้ครบถ้วน และถูกเซ็นรับรอง (Signature)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span> Server ไม่ต้องดู DB แค่เช็ค Signature ก็พอ</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✗</span> <strong>ยากต่อการ Revoke</strong> (ถ้า Token ยังไม่หมดอายุ จะสั่งยกเลิกทันทีทำได้ยาก ต้องใช้ Blacklist)</li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50 mb-12">
          <h4 className="text-white font-bold mb-4">ลำดับการทำงาน (Session Flow)</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 text-sm">1</div>
              <div>
                <strong className="text-emerald-400 text-sm block mb-1">User Login</strong>
                <p className="text-sm text-slate-400 m-0">ผู้ใช้ส่ง Username/Password ไปที่ <code>/api/auth/login</code></p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 text-sm">2</div>
              <div>
                <strong className="text-emerald-400 text-sm block mb-1">Server ตรวจสอบ & บันทึก</strong>
                <p className="text-sm text-slate-400 m-0">PHP ตรวจรหัสผ่าน ถ้าถูก จะบันทึก Session ใหม่ลง Database (มี Session ID สุ่ม, User ID, Role, เวลาหมดอายุ)</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 text-sm">3</div>
              <div>
                <strong className="text-emerald-400 text-sm block mb-1">ตั้งค่า Cookie</strong>
                <p className="text-sm text-slate-400 m-0">PHP ส่ง HTTP Header <code>Set-Cookie: SessionID=xxxx</code> กลับไปหา Browser</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-sm">4</div>
              <div>
                <strong className="text-emerald-400 text-sm block mb-1">ใช้งาน API ถัดไป</strong>
                <p className="text-sm text-slate-400 m-0">Browser จะแอบแนบ <code>Cookie: SessionID=xxxx</code> ไปกับทุก Request อัตโนมัติ PHP จึงรู้ว่าใครกำลังเรียก API</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            🛡️
          </span>
          Authorization (การกำหนดสิทธิ์ด้วย RBAC)
        </h3>
        
        <p className="text-slate-400 mb-6 leading-relaxed">
          ระบบ MES ใช้หลักการ <strong>RBAC (Role-Based Access Control)</strong> 
          แทนที่จะกำหนดสิทธิ์รายคน (ซึ่งวุ่นวาย) เราจะกำหนดสิทธิ์ตาม <strong>"บทบาท (Role)"</strong> 
          และมอบ Role ให้กับพนักงานแต่ละคน
        </p>

        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-800/80 text-white font-bold">
                <tr>
                  <th className="p-4 border-b border-slate-700">สิทธิ์การใช้งาน</th>
                  <th className="p-4 border-b border-slate-700 text-center text-rose-400">👑 Admin</th>
                  <th className="p-4 border-b border-slate-700 text-center text-amber-400">📊 Manager</th>
                  <th className="p-4 border-b border-slate-700 text-center text-blue-400">⚙️ Operator</th>
                  <th className="p-4 border-b border-slate-700 text-center text-emerald-400">👁️ Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <tr className="hover:bg-slate-800/30">
                  <td className="p-4 text-white">ดู Dashboard (รวม)</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-4 text-white">บันทึกผลผลิต (Production)</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓ (แค่ Line ตัวเอง)</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-4 text-white">อนุมัติเอกสารของเสีย (NCR)</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-4 text-white">จัดการข้อมูลผู้ใช้งานระบบ</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                  <td className="p-4 text-center text-rose-500">✗</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-rose-900/10 border border-rose-500/30 rounded-xl p-6">
          <h4 className="text-rose-400 font-bold mb-3 flex items-center gap-2">
            ⚠️ กฎเหล็กของการทำ Authorization
          </h4>
          <p className="text-sm text-slate-300 mb-4">
            การซ่อนปุ่ม (UI Hiding) ใน React <strong className="text-white">ไม่ใช่การป้องกันความปลอดภัย</strong>! 
            เพราะ Hacker สามารถแอบเรียก URL ของ API ได้ตรงๆ ผ่าน Postman หรือ Developer Tools
          </p>
          <div className="bg-black/40 rounded border border-slate-700 p-3 font-mono text-xs text-slate-400 mb-4">
            // ❌ แค่ซ่อนปุ่มฝั่ง React แบบนี้ไม่พอ!<br/>
            {'{role === "ADMIN" && <ApproveButton /> }'}
          </div>
          <p className="text-sm text-emerald-400 font-bold">
            ✓ ต้องตรวจสิทธิ์ที่ฝั่ง Backend ก่อนทำงานเสมอ (Server-Side Validation)
          </p>
          <div className="bg-black/40 rounded border border-slate-700 p-3 font-mono text-xs text-emerald-400/80 mt-2">
            // ฝั่ง PHP (API)<br/>
            if ($session['role'] !== 'ADMIN') {'{'}<br/>
            &nbsp;&nbsp;http_response_code(403);<br/>
            &nbsp;&nbsp;echo json_encode(['error' ={'>'} 'ไม่มีสิทธิ์']);<br/>
            &nbsp;&nbsp;exit;<br/>
            {'}'}
          </div>
        </div>
      </div>
    </div>
  );
}
