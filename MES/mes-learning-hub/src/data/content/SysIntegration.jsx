import React from 'react';

export default function SysIntegration() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="mb-10">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            🔗
          </span>
          การเชื่อมต่อระหว่าง MES และ SAP (Integration Technologies)
        </h3>
        
        <p className="text-slate-400 mb-8 leading-relaxed text-lg">
          ระบบ MES ที่ดีต้องส่งข้อมูลกลับไปยังระบบหลัก (ERP) อย่าง <strong>SAP</strong> ได้อย่างเสถียรและแม่นยำ 
          นี่คือ 4 รูปแบบหลักในการส่งข้อมูล (Integration) พร้อมข้อดี-ข้อเสีย
        </p>

        <div className="space-y-6">
          {/* Method 1 */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
            <h4 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">วิธีที่ 1</span> 
              Middleware (SAP BTP / PI / PO)
            </h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-slate-400 mb-4">
                  ใช้ระบบตัวกลางระดับองค์กร (Middleware) ของ SAP เองในการรับข้อมูลจาก MES (API/JSON) แล้วแปลงเป็น format ที่ SAP ต้องการ (IDoc/RFC) คล้ายกับล่ามแปลภาษา
                </p>
                <div className="flex items-center gap-2 text-xs font-mono bg-black/40 p-3 rounded-lg border border-slate-800 text-slate-500 overflow-x-auto">
                  <span className="text-blue-400">MES (JSON)</span> ➔ 
                  <span className="text-purple-400 font-bold px-2">Middleware</span> ➔ 
                  <span className="text-amber-400">SAP (IDoc/RFC)</span>
                </div>
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl p-4 text-sm">
                <div className="text-emerald-400 font-bold mb-1">✓ ข้อดี:</div>
                <div className="text-slate-400 mb-3 ml-4">• มาตรฐานสูง (Official)<br/>• มีระบบ Monitor ตรวจสอบได้ว่าติดที่ไหน</div>
                <div className="text-rose-400 font-bold mb-1">✗ ข้อเสีย:</div>
                <div className="text-slate-400 ml-4">• ค่าใช้จ่ายสูงมาก (License)<br/>• ต้องใช้ทีม SAP Basis Setup ยุ่งยาก</div>
              </div>
            </div>
          </div>

          {/* Method 2 */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
            <h4 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">วิธีที่ 2</span> 
              BAPI / RFC (เรียกฟังก์ชัน SAP ตรงๆ)
            </h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-slate-400 mb-4">
                  ระบบ MES ยิงข้อมูลตรงเข้าไปที่ฟังก์ชันของ SAP (BAPI) ผ่านโปรโตคอล RFC ทันที เหมือนโทรศัพท์สายตรงหาผู้บริหาร
                </p>
                <div className="bg-black/40 rounded-lg p-3 font-mono text-xs border border-slate-800 text-slate-400">
                  <span className="text-slate-500">// ตัวอย่างยิงเข้า SAP แบบ Real-time</span><br/>
                  call('BAPI_GOODSMVT_CREATE', {'{'}<br/>
                  &nbsp;&nbsp;MATERIAL: 'STEEL-001',<br/>
                  &nbsp;&nbsp;ENTRY_QNT: 500<br/>
                  {'}'});
                </div>
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl p-4 text-sm">
                <div className="text-emerald-400 font-bold mb-1">✓ ข้อดี:</div>
                <div className="text-slate-400 mb-3 ml-4">• Real-time มากๆ ผลลัพธ์ได้ทันที<br/>• รู้ทันทีถ้ามี Error หรือ Stock ไม่พอ</div>
                <div className="text-rose-400 font-bold mb-1">✗ ข้อเสีย:</div>
                <div className="text-slate-400 ml-4">• <strong className="text-rose-300">ถ้า SAP ล่ม MES ก็จะล่มตามไปด้วย!</strong> (ทำงานต่อไม่ได้)</div>
              </div>
            </div>
          </div>

          {/* Method 3 */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
            <h4 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-sm">วิธีที่ 3</span> 
              Staging Tables (ตารางพักข้อมูล)
            </h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-slate-400 mb-4">
                  MES เขียนข้อมูลลง Database ตารางกลาง (Staging) ทิ้งไว้ แล้วให้มีหุ่นยนต์ (Batch Job) จากฝั่ง SAP มาดูดข้อมูลไปทุกๆ 15 หรือ 30 นาที
                </p>
                <div className="flex items-center gap-2 text-xs font-mono bg-black/40 p-3 rounded-lg border border-slate-800 text-slate-500 overflow-x-auto">
                  <span className="text-blue-400">MES Write</span> ➔ 
                  <span className="text-amber-400 font-bold px-2 bg-amber-900/20 rounded">Table (status: PENDING)</span> ➔ 
                  <span className="text-purple-400">SAP Batch Job (Read)</span>
                </div>
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl p-4 text-sm">
                <div className="text-emerald-400 font-bold mb-1">✓ ข้อดี:</div>
                <div className="text-slate-400 mb-3 ml-4">• แยกขาดจากกัน (Decoupled) ชัดเจน<br/>• เขียนง่าย จัดการง่าย (เป็นแค่ SQL)</div>
                <div className="text-rose-400 font-bold mb-1">✗ ข้อเสีย:</div>
                <div className="text-slate-400 ml-4">• ข้อมูลไม่ Real-time (ดีเลย์ตามรอบดูด)<br/>• ถ้ารายการเยอะมาก ตารางจะบวมหนัก</div>
              </div>
            </div>
          </div>

          {/* Method 4 */}
          <div className="bg-emerald-900/10 rounded-2xl border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <h4 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-sm">วิธีที่ 4 (แนะนำ)</span> 
              Message Queue (Asynchronous Workflow)
            </h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-4">
                  วิธีที่ทันสมัยที่สุด (เช่น ใช้ RabbitMQ หรือ Kafka) เมื่อ MES บันทึกผล จะส่งข้อความโยนเข้า "คิว" แล้วจบงานทันที ส่วนคิวจะรับหน้าที่ส่งต่อให้ SAP เอง 
                  <strong>(Fault-Tolerant Design)</strong>
                </p>
                
                <div className="bg-black/60 rounded-xl p-4 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <span className="w-16">ปกติ:</span>
                    <span className="text-emerald-400">Queue</span> ➔ <span className="text-emerald-400">SAP Online</span> ➔ ✓ สำเร็จ
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-16 text-rose-400">SAP ล่ม:</span>
                    <span className="text-amber-400">Queue เก็บไว้</span> ➔ <span className="text-rose-400 font-bold">SAP Offline</span> ➔ <span className="text-amber-400 animate-pulse">รอก่อน (Retry Auto)</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl p-4 text-sm flex flex-col justify-center">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg text-emerald-300">
                  <div className="font-bold text-lg mb-2 flex items-center gap-2">
                    <span>🌟</span> ข้อดีสูงสุด:
                  </div>
                  การผลิตหน้างาน <strong className="text-white text-base">"ไม่หยุดชะงัก"</strong> เด็ดขาด!<br/> 
                  ต่อให้ SAP จะปิดปรับปรุง (Downtime) หรือ Server ล่ม Operator ก็ยังยิงบาร์โค้ดทำงานต่อได้ปกติ 
                  เมื่อ SAP กลับมา Online ข้อมูลในคิวจะไหลเข้าไปเองโดยอัตโนมัติ
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
