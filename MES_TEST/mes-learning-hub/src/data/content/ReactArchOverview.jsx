import React from 'react';

export default function ReactArchOverview() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-purple-500/30 rounded-xl p-8 mb-8 text-center shadow-lg">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-cyan-300 m-0 pb-4">
          ทำความรู้จักระบบ MES Toolbox ใหม่
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          เรียนรู้แบบ Step-by-Step ว่าทำไมเราถึงเปลี่ยนมาใช้ React + Vite 
          เพื่อแก้ปัญหาระบบแบบเดิม และปูทางสู่ Modern Web Architecture
        </p>
      </div>

      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            1
          </span>
          ปัญหาของระบบเก่า vs ระบบใหม่
        </h3>
        
        <p className="text-slate-400 mb-6 text-lg">
          ก่อนจะเข้าใจว่า Vite คืออะไร มาดูก่อนว่าทำไมเราถึงต้องเปลี่ยน
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border-t-4 border-t-rose-500 border-x border-b border-slate-700/50 shadow-lg hover:-translate-y-1 transition-transform">
            <div className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider rounded-md mb-4">
              ❌ ระบบเก่า (PHP หลายหน้า)
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Multi-Page Application (MPA)</h4>
            <p className="text-slate-400 leading-relaxed text-sm">
              ทุกครั้งที่คลิกเมนู เบราว์เซอร์ต้อง <strong className="text-white">โหลดหน้าใหม่ทั้งหมด</strong> 
              — จอกระพริบขาว, Header/Sidebar โหลดซ้ำ, และทำงานได้ช้าลงเมื่อระบบมีขนาดใหญ่
            </p>
            <div className="mt-6 text-center text-3xl opacity-80">
              📄 ➔ 📄 ➔ 📄 ➔ 📄
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">แต่ละหน้าเป็นคนละไฟล์ .php</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border-t-4 border-t-emerald-500 border-x border-b border-slate-700/50 shadow-lg hover:-translate-y-1 transition-transform">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-md mb-4">
              ✓ ระบบใหม่ (React SPA)
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Single Page Application (SPA)</h4>
            <p className="text-slate-400 leading-relaxed text-sm">
              โหลดเข้ามา <strong className="text-white">ครั้งเดียว</strong> 
              แล้วหลังจากนั้นจะสลับเปลี่ยนเฉพาะเนื้อหาตรงกลาง — ไม่กระพริบ, เร็วมาก, ลื่นไหล
            </p>
            <div className="mt-6 text-center text-4xl opacity-80">
              📱 <span className="text-xl align-middle text-slate-400 ml-2">(แอปเดียว)</span>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">ให้ความรู้สึกเหมือนเปิดแอปมือถือ</p>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            2
          </span>
          สาธิตการทำงานของ SPA (จำลอง)
        </h3>
        
        <p className="text-slate-400 mb-6 text-lg">
          เมื่อคลิกเมนูในระบบ SPA พื้นที่ตรงกลางจะถูกเปลี่ยน (Render ใหม่) โดยที่แถบเครื่องมือและเมนูยังคงอยู่ที่เดิม 
          ส่งผลให้ผู้ใช้รู้สึกว่าระบบทำงานได้รวดเร็วแบบไม่มีสะดุด เหมือนกำลังใช้งานแอปพลิเคชันบนมือถือ
        </p>

        <div className="bg-slate-900/80 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-[180px_1fr] min-h-[300px]">
            {/* Mock Sidebar */}
            <div className="bg-black/40 border-r border-slate-700/50 p-4 flex flex-col gap-2">
              <div className="text-cyan-400 font-bold mb-4 px-2 tracking-wide text-sm">⚙️ MES Toolbox</div>
              <div className="bg-indigo-500/20 text-indigo-300 font-semibold text-sm py-2 px-3 rounded-lg cursor-pointer">📊 Dashboard</div>
              <div className="hover:bg-slate-800 text-slate-400 text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors">🏭 Production</div>
              <div className="hover:bg-slate-800 text-slate-400 text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors">🔧 Maintenance</div>
              <div className="hover:bg-slate-800 text-slate-400 text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors">🛡️ Quality</div>
            </div>
            
            {/* Mock Content */}
            <div className="p-6 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5"></div>
              <div className="relative z-10">
                <h4 className="text-xl font-bold text-white mb-2">📊 Dashboard — ภาพรวมระบบ</h4>
                <p className="text-sm text-slate-400 mb-6">แสดงข้อมูลสรุปการผลิตประจำวัน</p>
                
                {/* Mock Chart */}
                <div className="h-24 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 rounded-lg border border-indigo-500/20 flex items-end gap-2 p-3">
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[60%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[80%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[45%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[90%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[70%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[55%]"></div>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-500 rounded-t-sm h-[85%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-sm flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          สังเกตไหมว่า Header กับ Sidebar ไม่โหลดซ้ำเลย — นี่คือพลังของ React SPA!
        </div>
      </div>
    </div>
  );
}
