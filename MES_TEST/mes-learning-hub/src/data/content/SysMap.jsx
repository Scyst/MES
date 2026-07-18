import React from 'react';

export default function SysMap() {
  return (
    <div className="prose max-w-none text-slate-300">
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-xl p-8 mb-8 text-center shadow-lg">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          MES x SAP Knowledge Hub
        </div>
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-cyan-300 m-0 pb-4">
          แผนผังระบบรวม (System Architecture Map)
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          ออกแบบภายใต้กฎ Air-gapped ป้องกันการดึงข้อมูลจากภายนอก
          ทำความเข้าใจสถาปัตยกรรมแบบ Decoupled แยก Frontend ออกจาก Backend อย่างเด็ดขาด
        </p>
      </div>

      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-blue-400">1.</span> โครงสร้างระบบ 4 เลเยอร์ (4-Tier Architecture)
        </h3>
        
        <div className="flex flex-col gap-6 bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          
          {/* Edge Layer */}
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-6 bg-slate-900 px-3 font-bold text-slate-400 text-sm">
              Edge Layer (User Front-end)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold m-0 mb-1 flex items-center gap-2">
                  <span className="text-xl">🌐</span> Browser (React 19)
                </h4>
                <p className="text-sm text-slate-400 m-0">Vite Bundled SPA (No CDNs)</p>
              </div>
              <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-4">
                <h4 className="text-slate-300 font-bold m-0 mb-1 flex items-center gap-2">
                  <span className="text-xl">📡</span> Hardware Scanners
                </h4>
                <p className="text-sm text-slate-400 m-0">Auto-submit, Debounce Logic</p>
              </div>
            </div>
          </div>

          <div className="text-center text-slate-500 text-sm">↓ HTTP REST / Axios (CSRF Protected) ↓</div>

          {/* Application Layer */}
          <div className="border-2 border-dashed border-purple-600/50 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-6 bg-slate-900 px-3 font-bold text-purple-400/80 text-sm">
              Application Layer (API Gateway)
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-2">
              <h4 className="text-purple-400 font-bold m-0 mb-1 flex items-center gap-2">
                <span className="text-xl">💻</span> PHP 8 API & Auth
              </h4>
              <p className="text-sm text-slate-400 m-0">Strict JSON, Session & RBAC, Request Validation</p>
            </div>
          </div>

          <div className="text-center text-slate-500 text-sm">↓ PDO Prepared Statements ↓</div>

          {/* DB & IoT Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border-2 border-dashed border-emerald-600/50 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-6 bg-slate-900 px-3 font-bold text-emerald-400/80 text-sm">
                Database Layer (Core)
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-2 h-full flex flex-col justify-center">
                <h4 className="text-emerald-400 font-bold m-0 mb-1 flex items-center gap-2">
                  <span className="text-xl">🗄️</span> SQL Server 2016
                </h4>
                <p className="text-sm text-slate-400 m-0">ONHAND, TRANSACTIONS, Stored Procedures</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-amber-600/50 rounded-xl p-6 relative flex flex-col gap-3">
              <div className="absolute -top-3 left-6 bg-slate-900 px-3 font-bold text-amber-400/80 text-sm">
                Machine Layer (IoT)
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2 text-center">
                <h4 className="text-amber-400 font-bold m-0 mb-1">🤖 Node-RED</h4>
                <p className="text-xs text-slate-400 m-0">Polling / WS Dashboard</p>
              </div>
              <div className="text-center text-slate-500 text-xs">↕ OPC UA</div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <h4 className="text-amber-400 font-bold m-0 mb-1">⚙️ PLC / Sensors</h4>
                <p className="text-xs text-slate-400 m-0">Press, Weld, Cut Data</p>
              </div>
            </div>
          </div>

          <div className="text-center text-slate-500 text-sm">↓ Asynchronous Sync (RFC/IDoc) ↓</div>

          {/* ERP Layer */}
          <div className="border-2 border-dashed border-rose-600/50 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-6 bg-slate-900 px-3 font-bold text-rose-400/80 text-sm">
              Enterprise ERP Layer
            </div>
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 mt-2">
              <h4 className="text-rose-400 font-bold m-0 mb-1 flex items-center gap-2">
                <span className="text-xl">🏭</span> SAP ERP
              </h4>
              <p className="text-sm text-slate-400 m-0">Modules: Production (PP), Material (MM), Maintenance (PM), Quality (QM)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-cyan-400">2.</span> Decoupled Architecture
        </h3>
        
        <p className="text-slate-400 mb-6 leading-relaxed">
          ในระบบ MES ยุคใหม่นี้ เราได้แยกส่วน <strong>Frontend</strong> และ <strong>Backend</strong> 
          ออกจากกันอย่างเด็ดขาด (Decoupled) โดยให้สื่อสารกันผ่าน <strong>REST API (JSON)</strong> เท่านั้น 
          การทำเช่นนี้มีข้อดีคือทำให้เราสามารถพัฒนา ปรับปรุง และ Scale แต่ละส่วนได้อิสระจากกัน
        </p>

        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center shadow-lg w-full">
              <h4 className="text-blue-400 font-bold mb-4">React 19 Frontend</h4>
              <ul className="text-sm text-slate-400 text-left list-disc pl-4 space-y-2">
                <li>UI Components (Tailwind)</li>
                <li>Client-side Routing (React Router)</li>
                <li>State Management</li>
                <li>Vite 8 Build & Hot Reload</li>
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-3xl text-cyan-400 md:hidden my-2">↕</div>
              <div className="text-3xl text-cyan-400 hidden md:block mx-4">↔</div>
              <div className="text-xs font-bold text-cyan-500 mt-2 text-center">
                REST API<br/>JSON
              </div>
            </div>

            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center shadow-lg w-full">
              <h4 className="text-emerald-400 font-bold mb-4">PHP API Gateway</h4>
              <ul className="text-sm text-slate-400 text-left list-disc pl-4 space-y-2">
                <li>Authentication & CSRF Protection</li>
                <li>Business Logic & Validation</li>
                <li>PDO SQL Server Connection</li>
                <li>Audit Logging</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="text-slate-500">↓</div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-8 py-2 text-amber-400 font-bold">
              SQL Server 2016
            </div>
            
            <div className="text-slate-500 text-sm mt-4">API Gateway ยังทำหน้าที่จ่ายข้อมูลไปให้ระบบอื่นด้วย:</div>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-1 rounded-md text-sm font-semibold">SAP ERP</span>
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-1 rounded-md text-sm font-semibold">Power BI</span>
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-1 rounded-md text-sm font-semibold">Mobile App</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          <span className="font-bold text-lg leading-none">✓</span>
          <div>
            <strong>ข้อดีสำคัญ:</strong> เมื่อ Backend ถูกพัฒนาเป็น API Gateway แล้ว 
            ระบบอย่าง SAP หรือ Power BI จะสามารถเรียกใช้ API รูปแบบเดียวกันกับที่หน้าเว็บใช้ได้โดยตรง 
            โดยไม่ต้องเสียเวลาพัฒนาช่องทางการเชื่อมต่อ (Interface) ขึ้นมาใหม่
          </div>
        </div>
      </div>
    </div>
  );
}
