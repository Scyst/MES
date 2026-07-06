import React from 'react';
import { FiBookOpen, FiEdit3, FiShare2, FiMonitor, FiUploadCloud } from 'react-icons/fi';

export default function TeamWiki() {
  return (
    <div className="prose max-w-4xl text-slate-300 bg-slate-900/50 rounded-2xl border border-slate-700/50 p-8 shadow-lg mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-900/30">
          <FiBookOpen />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white m-0">Team Wiki</h2>
          <p className="text-slate-400 m-0 mt-1">คู่มือและขั้นตอนการทำงานร่วมกันภายในทีม</p>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
          <span className="text-blue-400">#</span> ขั้นตอนการทำงานร่วมกัน (Collaboration Workflow)
        </h3>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          วิธีแบ่งงานในทีม — ใครทำอะไร ตอนไหน แบบเข้าใจง่าย เพื่อไม่ให้โค้ดทับซ้อนกันและทำให้ระบบสามารถ Build ขึ้น Production ได้อย่างปลอดภัย
        </p>

        <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:ml-[39px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 group-[.is-active]:bg-blue-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
              1
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700 bg-slate-800/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                  👥 ทุกคนในทีม
                </span>
              </div>
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-lg">
                <FiEdit3 className="text-blue-400" /> พัฒนาโค้ดบนเครื่องตัวเอง
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                สมาชิกทุกคนสามารถเขียน/แก้โค้ดในโฟลเดอร์ <code className="text-blue-400 bg-blue-400/10 px-1 rounded">src/</code> ได้เลยบนเครื่องตัวเอง เปิดดูผลลัพธ์แบบเรียลไทม์ด้วยคำสั่ง:
              </p>
              <div className="bg-black/50 p-2 rounded text-xs font-mono text-emerald-400 border border-slate-700">
                npm run dev
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 group-[.is-active]:bg-purple-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
              2
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700 bg-slate-800/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                  👥 ทุกคนในทีม
                </span>
                <span className="text-slate-500 text-xs">➔</span>
                <span className="bg-amber-900/50 text-amber-400 text-xs px-2 py-1 rounded border border-amber-500/30 font-bold flex items-center gap-1">
                  👑 ผู้ดูแลหลัก
                </span>
              </div>
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-lg">
                <FiShare2 className="text-purple-400" /> ส่งมอบโค้ดที่แก้ไข
              </h4>
              <p className="text-sm text-slate-400 m-0">
                พอทำเสร็จแล้ว ให้ส่งไฟล์ที่แก้ไขมาให้ <strong>ผู้ดูแลหลัก</strong> โดยจะใช้ <strong>Git</strong> (แนะนำที่สุด), ส่งไฟล์ทางแชท, หรือก๊อปลง Flash Drive ก็ได้
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 group-[.is-active]:bg-amber-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
              3
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-500/30 bg-amber-900/10 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-900/80 text-amber-400 text-xs px-2 py-1 rounded border border-amber-500/50 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  👑 ผู้ดูแลหลักเท่านั้น
                </span>
              </div>
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-lg">
                <FiMonitor className="text-amber-400" /> รวมโค้ด + Build
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                ผู้ดูแลหลักจะนำโค้ดทุกคนมารวมกัน ตรวจสอบ แล้วรันคำสั่ง Build เพื่อแพ็คไฟล์สำหรับเซิร์ฟเวอร์
              </p>
              <div className="bg-black/50 p-2 rounded text-xs font-mono text-emerald-400 border border-slate-700">
                npm run build
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 group-[.is-active]:bg-emerald-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
              4
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/10 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-900/80 text-amber-400 text-xs px-2 py-1 rounded border border-amber-500/50 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  👑 ผู้ดูแลหลักเท่านั้น
                </span>
              </div>
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-lg">
                <FiUploadCloud className="text-emerald-400" /> อัปโหลดขึ้นเซิร์ฟเวอร์ (FileZilla)
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                นำเฉพาะโฟลเดอร์ <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded border border-emerald-500/30">dist/</code> ไปลากโยนทับบนเซิร์ฟเวอร์ผ่าน FileZilla เหมือนเดิม! 
              </p>
              <div className="bg-rose-900/20 border border-rose-500/30 rounded p-2 text-xs text-rose-300">
                <strong>สำคัญ:</strong> อัปโหลดแค่โฟลเดอร์ <code>dist/</code> เท่านั้น ห้ามอัปโหลดโฟลเดอร์อื่นเด็ดขาด
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
