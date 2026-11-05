import React from 'react';

export default function ReactArchFolders() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="mb-10">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            3
          </span>
          โครงสร้างโฟลเดอร์ของโปรเจกต์
        </h3>
        
        <p className="text-slate-400 mb-8 text-lg">
          ไฟล์ทั้งหมดถูกจัดเรียงอย่างเป็นระเบียบตามมาตรฐานของ React และ Vite ทำให้เข้าใจง่ายและหาไฟล์ที่ต้องการได้สะดวก
        </p>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 md:p-8 shadow-2xl overflow-x-auto">
          <div className="font-mono text-sm leading-[2.5] min-w-[500px]">
            {/* Root */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors">
              <span className="text-xl mr-3">📁</span>
              <span className="text-cyan-400 font-bold tracking-wide">mes-toolbox/</span>
            </div>
            
            {/* Config Files */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-6">
              <span className="text-xl mr-3">📄</span>
              <span className="text-slate-200 font-medium w-40">index.html</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                หน้าทางเข้าหลัก (มีอันเดียวในระบบ SPA)
              </span>
            </div>
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-6">
              <span className="text-xl mr-3">📄</span>
              <span className="text-slate-200 font-medium w-40">package.json</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                บอกว่าใช้ Library อะไรบ้าง (เช่น React, Tailwind)
              </span>
            </div>
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-6">
              <span className="text-xl mr-3">📄</span>
              <span className="text-slate-200 font-medium w-40">vite.config.js</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                ตั้งค่าการ Build ของ Vite
              </span>
            </div>

            {/* SRC Folder */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-6 mt-2">
              <span className="text-xl mr-3">📁</span>
              <span className="text-cyan-400 font-bold tracking-wide w-40">src/</span>
              <span className="text-amber-400 font-sans text-sm ml-4 font-semibold">
                ⭐ โค้ดทั้งหมดของเราอยู่ในนี้!
              </span>
            </div>

            {/* Inside SRC */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-14">
              <span className="text-xl mr-3">📄</span>
              <span className="text-slate-200 font-medium w-36">main.jsx</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                จุดเริ่มต้นของ React ที่เอาแอปไปแปะใน index.html
              </span>
            </div>
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-14">
              <span className="text-xl mr-3">📄</span>
              <span className="text-slate-200 font-medium w-36">App.jsx</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                จัดการเส้นทาง URL (Routing) ของทุกหน้า
              </span>
            </div>

            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-14 mt-1">
              <span className="text-xl mr-3">📁</span>
              <span className="text-cyan-400 font-bold tracking-wide w-36">components/</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                ชิ้นส่วนที่ใช้ซ้ำ (เช่น Header, Sidebar, Card)
              </span>
            </div>

            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-14 mt-1">
              <span className="text-xl mr-3">📁</span>
              <span className="text-cyan-400 font-bold tracking-wide w-36">pages/</span>
              <span className="text-slate-500 font-sans text-sm ml-4 border-l border-slate-700 pl-4">
                <span className="text-purple-400 mr-2">←</span>
                หน้าเว็บแต่ละหน้า (แยกเป็นโฟลเดอร์ย่อยได้)
              </span>
            </div>

            {/* Pages Subfolders */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-24">
              <span className="text-xl mr-3">📂</span>
              <span className="text-slate-300 font-medium">production/</span>
            </div>
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-24">
              <span className="text-xl mr-3">📂</span>
              <span className="text-slate-300 font-medium">maintenance/</span>
            </div>

            {/* DIST Folder */}
            <div className="flex items-center hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-colors ml-6 mt-4 pt-2 border-t border-slate-700/50">
              <span className="text-xl mr-3">📁</span>
              <span className="text-emerald-400 font-bold tracking-wide w-40">dist/</span>
              <span className="text-emerald-500 font-sans text-sm ml-4 font-semibold">
                📦 ผลลัพธ์จาก Build ที่พร้อมอัปโหลดขึ้นเซิร์ฟเวอร์
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
