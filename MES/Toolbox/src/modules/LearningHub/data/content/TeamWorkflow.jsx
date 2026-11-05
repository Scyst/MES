import React from 'react';
import { FiBookOpen, FiEdit3, FiShare2, FiMonitor, FiUploadCloud } from 'react-icons/fi';

export default function TeamWorkflow() {
  return (
    <div className="content-module max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-700/50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-900/30">
          <FiBookOpen />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-100 m-0">Team Collaboration Workflow</h2>
          <p className="text-slate-400 m-0 mt-2 text-lg">คู่มือและขั้นตอนการทำงานร่วมกันภายในทีมพัฒนา</p>
        </div>
      </div>

      <div className="mb-12">
        <p className="text-slate-300 mb-10 leading-relaxed text-lg">
          วิธีแบ่งงานในทีม — ใครทำอะไร ตอนไหน แบบเข้าใจง่าย เพื่อไม่ให้โค้ดทับซ้อนกันและทำให้ระบบสามารถ Build ขึ้น Production ได้อย่างปลอดภัย
        </p>

        <div className="relative pl-8 md:pl-0 space-y-12 before:absolute before:inset-0 before:ml-[39px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/20 before:via-slate-700 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="absolute left-0 md:static md:flex md:items-center md:justify-center w-12 h-12 rounded-full border-4 border-slate-900 bg-blue-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 flex items-center justify-center font-bold text-xl">
              1
            </div>
            <div className="w-full pl-16 md:pl-0 md:w-[calc(50%-3rem)] md:group-even:pr-12 md:group-odd:pl-12">
              <div className="p-6 rounded-2xl border border-slate-700 bg-slate-800/40 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                    👥 ทุกคนในทีม
                  </span>
                </div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl">
                  <FiEdit3 className="text-blue-400" /> พัฒนาโค้ดบนเครื่องตัวเอง
                </h4>
                <p className="text-base text-slate-400 mb-4 leading-relaxed">
                  สมาชิกทุกคนสามารถเขียน/แก้โค้ดในโฟลเดอร์ <code className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">src/</code> ได้เลยบนเครื่องตัวเอง เปิดดูผลลัพธ์แบบเรียลไทม์ด้วยคำสั่ง:
                </p>
                <div className="bg-slate-950 p-4 rounded-xl text-sm font-mono text-emerald-400 border border-slate-800 shadow-inner">
                  npm run dev
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="absolute left-0 md:static md:flex md:items-center md:justify-center w-12 h-12 rounded-full border-4 border-slate-900 bg-purple-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 flex items-center justify-center font-bold text-xl">
              2
            </div>
            <div className="w-full pl-16 md:pl-0 md:w-[calc(50%-3rem)] md:group-even:pr-12 md:group-odd:pl-12">
              <div className="p-6 rounded-2xl border border-slate-700 bg-slate-800/40 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                    👥 ทุกคนในทีม
                  </span>
                  <span className="text-slate-500 text-sm">➔</span>
                  <span className="bg-amber-900/50 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 font-bold flex items-center gap-2">
                    👑 ผู้ดูแลหลัก
                  </span>
                </div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl">
                  <FiShare2 className="text-purple-400" /> ส่งมอบโค้ดที่แก้ไข
                </h4>
                <p className="text-base text-slate-400 m-0 leading-relaxed">
                  พอทำเสร็จแล้ว ให้ส่งไฟล์ที่แก้ไขมาให้ <strong>ผู้ดูแลหลัก</strong> โดยจะใช้ <strong>Git</strong> (แนะนำที่สุด), ส่งไฟล์ทางแชท, หรือก๊อปลง Flash Drive ก็ได้
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="absolute left-0 md:static md:flex md:items-center md:justify-center w-12 h-12 rounded-full border-4 border-slate-900 bg-amber-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 flex items-center justify-center font-bold text-xl">
              3
            </div>
            <div className="w-full pl-16 md:pl-0 md:w-[calc(50%-3rem)] md:group-even:pr-12 md:group-odd:pl-12">
              <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-900/10 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-amber-900/80 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-amber-500/50 font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    👑 ผู้ดูแลหลักเท่านั้น
                  </span>
                </div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl">
                  <FiMonitor className="text-amber-400" /> รวมโค้ด + Build
                </h4>
                <p className="text-base text-slate-400 mb-4 leading-relaxed">
                  ผู้ดูแลหลักจะนำโค้ดทุกคนมารวมกัน ตรวจสอบความถูกต้อง แล้วรันคำสั่ง Build เพื่อแพ็คไฟล์เตรียมนำขึ้นเซิร์ฟเวอร์
                </p>
                <div className="bg-slate-950 p-4 rounded-xl text-sm font-mono text-emerald-400 border border-slate-800 shadow-inner">
                  npm run build
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="absolute left-0 md:static md:flex md:items-center md:justify-center w-12 h-12 rounded-full border-4 border-slate-900 bg-emerald-500 text-white shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 flex items-center justify-center font-bold text-xl">
              4
            </div>
            <div className="w-full pl-16 md:pl-0 md:w-[calc(50%-3rem)] md:group-even:pr-12 md:group-odd:pl-12">
              <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-900/10 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-amber-900/80 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-amber-500/50 font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    👑 ผู้ดูแลหลักเท่านั้น
                  </span>
                </div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl">
                  <FiUploadCloud className="text-emerald-400" /> อัปโหลดขึ้นเซิร์ฟเวอร์
                </h4>
                <p className="text-base text-slate-400 mb-4 leading-relaxed">
                  นำเฉพาะโฟลเดอร์ <code className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/30">dist/</code> ไปลากโยนทับบนเซิร์ฟเวอร์ผ่านโปรแกรม FileZilla
                </p>
                <div className="bg-rose-950/40 border-l-4 border-rose-500 rounded-r-lg p-4 text-sm text-rose-300">
                  <strong className="text-rose-400">ข้อควรระวัง:</strong> อัปโหลดแค่โฟลเดอร์ <code>dist/</code> เท่านั้น ห้ามอัปโหลดโฟลเดอร์อื่น (เช่น <code>src</code> หรือ <code>node_modules</code>) เด็ดขาด
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
