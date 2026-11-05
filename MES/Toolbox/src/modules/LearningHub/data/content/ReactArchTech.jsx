import React from 'react';

export default function ReactArchTech() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="mb-12">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            4
          </span>
          บทบาทของ Vite และ Tailwind CSS
        </h3>
        
        <div className="mb-10">
          <h4 className="text-xl font-bold text-white mb-4 border-l-4 border-purple-500 pl-3">
            Vite คืออะไร? (อ่านว่า "วีต")
          </h4>
          <p className="text-slate-400 mb-6 leading-relaxed">
            Vite คือ "เครื่องมือ Build" (Build Tool) ที่ทำหน้าที่แปลงโค้ดที่เราเขียนให้เบราว์เซอร์เข้าใจ 
            เพราะโค้ดที่เราเขียน (React JSX, Tailwind CSS) นั้น <strong>เบราว์เซอร์อ่านไม่ออกโดยตรง</strong> 
            จำเป็นต้องมี Vite มาทำหน้าที่แปลงและมัดรวมให้เป็นไฟล์ JS/CSS ธรรมดา
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-8 bg-slate-900/50 rounded-2xl border border-slate-700 shadow-inner">
            <div className="text-center">
              <div className="text-4xl mb-2 drop-shadow-md">⚛️</div>
              <div className="font-bold text-cyan-400">.jsx</div>
              <div className="text-xs text-slate-500">React Components</div>
            </div>
            <div className="text-slate-600 hidden md:block">➔</div>
            <div className="text-slate-600 md:hidden">⬇</div>
            
            <div className="text-center">
              <div className="text-4xl mb-2 drop-shadow-md">🎨</div>
              <div className="font-bold text-sky-400">.css</div>
              <div className="text-xs text-slate-500">Tailwind CSS</div>
            </div>
            <div className="text-slate-600 hidden md:block">➔</div>
            <div className="text-slate-600 md:hidden">⬇</div>
            
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center shadow-[0_0_30px_rgba(168,85,247,0.15)] relative">
              <div className="text-4xl mb-2">⚡</div>
              <div className="font-bold text-purple-400 text-lg">Vite</div>
              <div className="text-xs text-slate-400">แปลง + มัดรวม</div>
            </div>
            <div className="text-slate-600 hidden md:block">➔</div>
            <div className="text-slate-600 md:hidden">⬇</div>
            
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 text-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="text-4xl mb-2">📦</div>
              <div className="font-bold text-emerald-400">dist/</div>
              <div className="text-xs text-emerald-500/70">พร้อมใช้งาน!</div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="text-xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-3">
            Tailwind CSS คืออะไร?
          </h4>
          <p className="text-slate-400 mb-6 leading-relaxed">
            Tailwind เป็นวิธีจัดหน้าตาเว็บแบบใหม่ ที่เปลี่ยนแนวคิดจาก <strong>การเขียน CSS แยกไฟล์</strong> 
            มาเป็นการ <strong>เขียน Class เล็กๆ รวมกันใน HTML/JSX โดยตรง (Utility-First)</strong>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border-t-4 border-t-rose-500 border-x border-b border-slate-700/50">
              <div className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider rounded-md mb-4">
                🎨 CSS แบบเดิม (แยกไฟล์)
              </div>
              <div className="bg-black/60 rounded-lg p-4 font-mono text-sm leading-relaxed border border-slate-800">
                <div className="text-slate-500 italic mb-2">/* style.css */</div>
                <div><span className="text-amber-400">.my-card</span> {'{'}</div>
                <div className="pl-4"><span className="text-cyan-400">background</span>: white;</div>
                <div className="pl-4"><span className="text-cyan-400">border-radius</span>: 12px;</div>
                <div className="pl-4"><span className="text-cyan-400">padding</span>: 16px;</div>
                <div>{'}'}</div>
              </div>
              <p className="text-sm text-slate-500 mt-3 text-center">ต้องเขียนอีกไฟล์ + ปวดหัวตั้งชื่อ class</p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border-t-4 border-t-cyan-500 border-x border-b border-slate-700/50">
              <div className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-md mb-4">
                ⚡ Tailwind CSS (Utility-First)
              </div>
              <div className="bg-black/60 rounded-lg p-4 font-mono text-sm leading-relaxed border border-slate-800">
                <div className="text-slate-500 italic mb-2">{'<!-- เขียนคลาสตรงใน HTML -->'}</div>
                <div>
                  <span className="text-pink-400">{'<div '}</span>
                  <span className="text-emerald-400">className</span>
                  <span className="text-white">=</span>
                  <span className="text-amber-300">"bg-white rounded-xl p-4"</span>
                  <span className="text-pink-400">{'>'}</span>
                </div>
              </div>
              <p className="text-sm text-emerald-400 font-semibold mt-3 text-center">✓ จบในบรรทัดเดียว!</p>
            </div>
          </div>
        </div>
        
        <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-6">
          <h4 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
            💡 สรุปข้อดีของ Tailwind CSS
          </h4>
          <ul className="list-none pl-0 space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong className="text-white">เร็วกว่า</strong> — ไม่ต้องสลับหน้าจอไปมาระหว่างไฟล์ HTML กับ CSS</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong className="text-white">ไม่ต้องคิดชื่อ class</strong> — เลิกปวดหัวว่าจะตั้งชื่อ class ว่า <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">.card-wrapper-inner-box</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong className="text-white">ไฟล์ CSS เล็กมาก</strong> — Vite จะตรวจสอบและนำเอาเฉพาะ class ที่เราใช้จริงๆ เท่านั้นไปสร้างไฟล์ CSS ผลลัพธ์</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong className="text-white">ดูแลง่าย</strong> — เปิดไฟล์เดียวเห็นหมดทั้งโค้ด โครงสร้าง และสไตล์</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
