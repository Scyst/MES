import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiServer,
  FiDatabase,
  FiCpu,
  FiLayers,
  FiShield,
  FiCheckCircle,
  FiArrowRight,
  FiCode,
  FiActivity,
  FiLock,
  FiAlertTriangle,
  FiTerminal,
  FiPlay,
  FiRefreshCw,
  FiAward,
  FiGitCommit,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import { getUserCourseStatus } from '../trainingAuditStore';

// ============================================================================
// SHARED COMPONENT: Interactive 5-Stage Enterprise Full-Stack Learning Roadmap
// ============================================================================
export const FULLSTACK_ROADMAP_STAGES = [
  {
    stage: 1,
    courseId: 'c-enterprise-app',
    badge: 'STAGE 1 · FRONT-END & API CONSUMER',
    title: 'การออกแบบ พัฒนา และบูรณาการแอปพลิเคชันระดับองค์กร (Front-End & UI)',
    role: 'Level 3 Industrial Front-End Specialist',
    duration: '24 ชม. (4 วัน)',
    color: 'from-purple-600 to-fuchsia-600',
    borderColor: 'border-purple-500/40',
    bgGlow: 'bg-purple-500/10',
    textColor: 'text-purple-300',
    skills: ['ISA-95 & IT/OT', 'IEC 60204-1 UX/UI', 'HTML5 & Flexbox', 'JS ES6+ & DOM', 'Fetch API & Webhook', 'UAT & BVA Testing'],
    summary: 'พื้นฐานการสร้างหน้าจอ Dashboard โรงงาน, การควบคุม DOM ด้วย JavaScript, และการดึงข้อมูลจาก API ที่มีอยู่แล้วมาแสดงผลและแจ้งเตือน'
  },
  {
    stage: 2,
    courseId: 'c-industrial-backend-api',
    badge: 'STAGE 2 · BACK-END & API PROVIDER',
    title: 'Industrial Backend & RESTful API Engineering (Node.js & PHP PDO)',
    role: 'Level 3–4 Backend API Engineer',
    duration: '18 ชม. (3 วัน)',
    color: 'from-blue-600 to-cyan-600',
    borderColor: 'border-cyan-500/40',
    bgGlow: 'bg-cyan-500/10',
    textColor: 'text-cyan-300',
    skills: ['REST API Server', 'JSON Contract', 'PDO Prepared Statements', 'SQL Injection Defense', 'Session / JWT / RBAC', 'CSRF & Audit Log'],
    summary: 'ก้าวข้ามจากผู้เรียกใช้ API สู่ "ผู้สร้าง API Server": เขียนโค้ดฝั่งหลังบ้านรับคำสั่ง GET/POST/PUT/DELETE, ตรวจสอบสิทธิ์, และเชื่อมฐานข้อมูลอย่างปลอดภัย'
  },
  {
    stage: 3,
    courseId: 'c-industrial-database-sql',
    badge: 'STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER',
    title: 'Industrial Database Engineering & SQL Server for MES',
    role: 'Level 4 Industrial Data & DB Architect',
    duration: '24 ชม. (4 วัน)',
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-500/40',
    bgGlow: 'bg-emerald-500/10',
    textColor: 'text-emerald-300',
    skills: ['ER Schema Design', 'Work Order & BOM', 'SQL JOIN & Windowing', 'OEE Stored Procedures', 'ACID Transactions', 'Indexing & Tuning'],
    summary: 'ออกแบบตารางฐานข้อมูลการผลิตจริงบน SQL Server, เขียนคำสั่ง SQL วิเคราะห์ยอดผลิต/ของเสีย, คำนวณ OEE อัตโนมัติ, และทำ Transaction ป้องกันสต็อกเพี้ยน'
  },
  {
    stage: 4,
    courseId: 'c-iiot-nodered-edge',
    badge: 'STAGE 4 · IIoT, NODE-RED & PLC GATEWAY',
    title: 'Industrial IoT (IIoT), Node-RED & PLC Edge Integration',
    role: 'Level 4 IIoT & Edge Integration Engineer',
    duration: '24 ชม. (4 วัน)',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/40',
    bgGlow: 'bg-amber-500/10',
    textColor: 'text-amber-300',
    skills: ['Modbus TCP & Registers', 'OPC-UA & MQTT UNS', 'Node-RED Flows', 'ADC Signal Scaling', 'Store-and-Forward', 'OT Network Security'],
    summary: 'เชื่อมต่อเครื่องจักรจริงเข้าสู่ฐานข้อมูล: ใช้ Node-RED อ่านค่า Register จาก PLC ผ่าน Modbus TCP / MQTT แล้วบันทึกเข้า SQL Server อัตโนมัติแบบเรียลไทม์'
  },
  {
    stage: 5,
    courseId: 'c3',
    secondaryCourseId: 'c4',
    badge: 'STAGE 5 · ENTERPRISE SPA & ERP INTEGRATION',
    title: 'React + Vite Production Architecture & Enterprise Security (MES x SAP)',
    role: 'Level 4 Principal MES Full-Stack Architect',
    duration: '4 ชม. (2 วิชา)',
    color: 'from-rose-600 to-pink-600',
    borderColor: 'border-rose-500/40',
    bgGlow: 'bg-rose-500/10',
    textColor: 'text-rose-300',
    skills: ['React 18 + Vite', 'Component Architecture', 'State & Custom Hooks', 'Defense-in-Depth', 'SAP ERP Sync', 'Production Deployment'],
    summary: 'บูรณาการทุกทักษะเข้าสู่สถาปัตยกรรมระบบ MES ระดับองค์กรด้วย React + Vite เชื่อมต่อระบบวางแผนทรัพยากร SAP ERP ครบวงจร'
  }
];

export function EnterpriseFullStackRoadmapWidget({ compact = false }) {
  const navigate = useNavigate();
  const [expandedStage, setExpandedStage] = useState(null);

  return (
    <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/40 p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[11px] font-black border border-fuchsia-500/30 mb-2">
            <FiLayers className="w-3.5 h-3.5" />
            <span>INDUSTRIAL FULL-STACK CAREER ROADMAP (5-STAGE BLUEPRINT)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white m-0">
            แผนที่เส้นทางพัฒนาทักษะวิศวกรซอฟต์แวร์โรงงานครบวงจร (From Front-End to Full-Stack MES)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 m-0 leading-relaxed">
            ต่อยอดจากหลักสูตร 4 วันในห้องเรียน สู่การสร้าง API หลังบ้าน, การออกแบบฐานข้อมูล SQL Server, และการดึงค่าเครื่องจักร PLC ด้วย IIoT Node-RED ด้วยตนเอง
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400">
            5 Stages · 90+ Hours
          </span>
        </div>
      </div>

      {/* 5-Stage Interactive Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
        {FULLSTACK_ROADMAP_STAGES.map((item) => {
          const status = getUserCourseStatus(item.courseId);
          const isDone = status?.passed || status?.status === 'completed';
          const inProg = !isDone && status?.progressPercent > 0;
          const isExpanded = expandedStage === item.stage;

          return (
            <div
              key={item.stage}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${item.borderColor} bg-slate-950/85 hover:border-white/40 hover:-translate-y-0.5 shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${item.bgGlow} ${item.textColor} ${item.borderColor}`}>
                    STAGE {item.stage}
                  </span>
                  {isDone ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> ผ่านแล้ว
                    </span>
                  ) : inProg ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      กำลังเรียน {status.progressPercent}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">{item.duration}</span>
                  )}
                </div>

                <h3 className="text-sm font-black text-white leading-snug mb-1.5">
                  {item.title}
                </h3>
                <p className="text-[11px] font-semibold text-amber-300/90 mb-2">
                  🎯 {item.role}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {item.summary}
                </p>

                {/* Skill Pills */}
                {(!compact || isExpanded) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5 mt-auto">
                {compact && (
                  <button
                    type="button"
                    onClick={() => setExpandedStage(isExpanded ? null : item.stage)}
                    className="text-[11px] text-slate-400 hover:text-white text-left font-medium cursor-pointer"
                  >
                    {isExpanded ? '▲ ซ่อนทักษะย่อย' : `▼ ดูทักษะที่ได้รับ (${item.skills.length} ทักษะ)`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/course/${item.courseId}`)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-black text-white bg-gradient-to-r ${item.color} hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer`}
                >
                  <span>{isDone ? 'ทบทวนหลักสูตร' : 'เข้าเรียน Stage ' + item.stage}</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// INTERACTIVE SIMULATOR 1: Backend API Contract & SQL Injection Defense Lab
// ============================================================================
function BackendSqlInjectionSimulator() {
  const [empInput, setEmpInput] = useState("EMP-1001");
  const [queryMode, setQueryMode] = useState('prepared'); // 'vulnerable' | 'prepared'

  const isMalicious = empInput.includes("'") || empInput.toLowerCase().includes("or 1=1") || empInput.includes("--");

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            INTERACTIVE SECURITY LAB
          </span>
          <h3 className="text-base font-black text-white mt-1 m-0">
            ห้องทดลองเปรียบเทียบ: Raw String Concatenation vs PDO Prepared Statements
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQueryMode('vulnerable')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
              queryMode === 'vulnerable'
                ? 'bg-rose-600 text-white border-rose-400'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            ❌ โค้ดเสี่ยง (ต่อ String ตรงๆ)
          </button>
          <button
            type="button"
            onClick={() => setQueryMode('prepared')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
              queryMode === 'prepared'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            ✅ มาตรฐาน MES (Prepared Statement)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            จำลองค่าที่ส่งมาจาก Front-End (ลองกดปุ่มโจมตีด้านล่าง):
          </label>
          <input
            type="text"
            value={empInput}
            onChange={(e) => setEmpInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEmpInput("EMP-1001")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
            >
              ค่าปกติ: EMP-1001
            </button>
            <button
              type="button"
              onClick={() => setEmpInput("' OR '1'='1")}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-xs text-rose-300 border border-rose-500/30 cursor-pointer"
            >
              💥 โจมตี: &apos; OR &apos;1&apos;=&apos;1
            </button>
            <button
              type="button"
              onClick={() => setEmpInput("EMP-1'; DROP TABLE WORK_ORDERS;--")}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-xs text-rose-300 border border-rose-500/30 cursor-pointer"
            >
              💥 โจมตี: DROP TABLE
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-2">
          <div className="text-slate-400 font-sans font-bold">คำสั่งที่ประมวลผลในฐานข้อมูล:</div>
          {queryMode === 'vulnerable' ? (
            <>
              <div className="p-2 rounded bg-slate-950 text-rose-300 break-all">
                SELECT emp_id, name, role FROM USERS WHERE emp_id = &apos;{empInput}&apos;;
              </div>
              {isMalicious ? (
                <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 font-sans">
                  🚨 <strong>อันตรายร้ายแรง (SQL Injection สำเร็จ!):</strong> โครงสร้างคำสั่ง SQL ถูกบิดเบือน ข้อมูลพนักงานทั้งหมดรั่วไหล หรือตารางถูกทำลาย!
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 font-sans">
                  ⚠️ ทำงานได้กับข้อมูลปกติ แต่เปิดช่องโหว่ให้ผู้ไม่หวังดีเจาะระบบได้ทันที
                </div>
              )}
            </>
          ) : (
            <>
              <div className="p-2 rounded bg-slate-950 text-emerald-300 break-all">
                PREPARE: SELECT emp_id, name, role FROM USERS WHERE emp_id = :emp_id;<br />
                BIND PARAM :emp_id = &quot;{empInput.replace(/"/g, '\\"')}&quot; (Literal String)
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-sans">
                🛡️ <strong>ปลอดภัย 100%:</strong> ตัวแปรถูกส่งแยกออกจากโครงสร้างคำสั่ง SQL เครื่องหมายอัญประกาศถูกมองเป็นเพียงตัวอักษรธรรมดา ไม่สามารถรันคำสั่งแทรกซ้อนได้
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERACTIVE SIMULATOR 2: SQL Server OEE Stored Procedure Calculator
// ============================================================================
function SqlOeeCalculatorSimulator() {
  const [plannedMin, setPlannedMin] = useState(480);
  const [downtimeMin, setDowntimeMin] = useState(45);
  const [idealCycleSec, setIdealCycleSec] = useState(12);
  const [totalCount, setTotalCount] = useState(2000);
  const [rejectCount, setRejectCount] = useState(40);

  const runTimeMin = Math.max(0, plannedMin - downtimeMin);
  const availability = plannedMin > 0 ? (runTimeMin / plannedMin) * 100 : 0;
  const performance = runTimeMin > 0 ? ((totalCount * (idealCycleSec / 60)) / runTimeMin) * 100 : 0;
  const goodCount = Math.max(0, totalCount - rejectCount);
  const quality = totalCount > 0 ? (goodCount / totalCount) * 100 : 0;
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-950 p-5 space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          INTERACTIVE SQL OEE ENGINE
        </span>
        <h3 className="text-base font-black text-white mt-1 m-0">
          จำลองการคำนวณ OEE ใน Stored Procedure (USP_CALCULATE_LINE_OEE)
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <label className="text-slate-400 block mb-1">เวลากะทำงาน (นาที)</label>
          <input type="number" value={plannedMin} onChange={e => setPlannedMin(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <label className="text-slate-400 block mb-1">เครื่องหยุด Downtime (นาที)</label>
          <input type="number" value={downtimeMin} onChange={e => setDowntimeMin(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <label className="text-slate-400 block mb-1">Cycle Time มาตรฐาน (วินาที)</label>
          <input type="number" value={idealCycleSec} onChange={e => setIdealCycleSec(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <label className="text-slate-400 block mb-1">ยอดผลิตรวม (ชิ้น)</label>
          <input type="number" value={totalCount} onChange={e => setTotalCount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <label className="text-slate-400 block mb-1">ของเสีย NG (ชิ้น)</label>
          <input type="number" value={rejectCount} onChange={e => setRejectCount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Availability (A)</span>
          <span className="text-lg font-black text-cyan-400">{availability.toFixed(1)}%</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Performance (P)</span>
          <span className="text-lg font-black text-purple-400">{performance.toFixed(1)}%</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Quality (Q)</span>
          <span className="text-lg font-black text-emerald-400">{quality.toFixed(1)}%</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
          <span className="text-[11px] text-emerald-300 block font-sans font-bold">OEE รวมสุทธิ</span>
          <span className="text-xl font-black text-amber-400">{oee.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERACTIVE SIMULATOR 3: IIoT PLC Register Scaling & Store-and-Forward Lab
// ============================================================================
function IiotPlcScalerSimulator() {
  const [rawAdc, setRawAdc] = useState(2048);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [bufferCount, setBufferCount] = useState(0);

  // Scale 0-4095 (12-bit ADC) to 0.0 - 10.0 Bar pressure & 0 - 150 C temp
  const pressureBar = ((rawAdc / 4095) * 10).toFixed(2);
  const tempC = ((rawAdc / 4095) * 150).toFixed(1);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            IIoT EDGE GATEWAY SIMULATOR
          </span>
          <h3 className="text-base font-black text-white mt-1 m-0">
            จำลองการแปลงค่า PLC Holding Register (40001) &amp; ระบบ Store-and-Forward
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextState = !networkOnline;
            setNetworkOnline(nextState);
            if (!nextState) setBufferCount(c => c + 3);
            else setBufferCount(0);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
            networkOnline
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}
        >
          {networkOnline ? <FiWifi /> : <FiWifiOff />}
          <span>{networkOnline ? 'LAN โรงงาน: ONLINE (ส่งเข้า SQL ทันที)' : 'LAN โรงงาน: OFFLINE (เก็บลง Edge Buffer)'}</span>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-300">
          <span>ปรับค่าสัญญาณดิบจาก PLC Register 40001 (12-bit ADC: 0 – 4095):</span>
          <span className="font-mono text-amber-400">Raw Value = {rawAdc}</span>
        </div>
        <input
          type="range"
          min="0"
          max="4095"
          value={rawAdc}
          onChange={(e) => {
            setRawAdc(Number(e.target.value));
            if (!networkOnline) setBufferCount(c => c + 1);
          }}
          className="w-full accent-amber-500 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 font-sans font-bold mb-1">1. Modbus TCP Read (PLC)</div>
          <div className="text-amber-300">Reg [40001] = {rawAdc}</div>
          <div className="text-slate-400 text-[11px] mt-1">Function Code 03 (Read Holding Registers)</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 font-sans font-bold mb-1">2. Node-RED Scaling Node</div>
          <div className="text-cyan-300">Pressure: {pressureBar} Bar</div>
          <div className="text-purple-300">Temp: {tempC} °C</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 font-sans font-bold mb-1">3. SQL Server / Edge Queue</div>
          {networkOnline ? (
            <div className="text-emerald-400 font-sans font-bold">
              ✅ INSERT INTO MACHINE_TELEMETRY สำเร็จ (Queue ค้าง: 0)
            </div>
          ) : (
            <div className="text-rose-300 font-sans font-bold">
              📦 เก็บใน Local SQLite Buffer แล้ว {bufferCount} แถว (รอส่งอัตโนมัติเมื่อเน็ตมา)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GENERIC BLUEPRINT LESSON BUILDER FOR THE 3 NEW FULL-STACK COURSES
// ============================================================================
function BlueprintLessonTemplate({
  stageBadge,
  moduleBadge,
  title,
  subtitle,
  whyItMatters,
  architectureFlow,
  coreTopics,
  codeTitle,
  codeSnippet,
  simulator,
  nextCourseHint
}) {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 md:p-8 rounded-2xl border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/30">
            {stageBadge}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            {moduleBadge}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white m-0">{title}</h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">{subtitle}</p>
      </div>

      {/* Why It Bridges the Gap */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2 m-0">
          <FiAward className="text-amber-400" />
          <span>ทำไมทักษะบทนี้จึงสำคัญต่อการเป็น Full-Stack วิศวกรโรงงาน?</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">{whyItMatters}</p>

        {/* Architecture Flow Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {architectureFlow.map((step, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono font-bold text-fuchsia-400">STEP {i + 1}</div>
              <div className="text-xs font-black text-white">{step.title}</div>
              <div className="text-[11px] text-slate-400 leading-snug">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Engineering Topics */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2 m-0">
          <FiLayers className="text-cyan-400" />
          <span>โครงสร้างเนื้อหาและหลักเกณฑ์ทางวิศวกรรม (Engineering Blueprint)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreTopics.map((topic, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="text-sm font-black text-amber-300 m-0">{topic.heading}</h3>
              <p className="text-xs text-slate-300 leading-relaxed m-0">{topic.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Simulator if provided */}
      {simulator}

      {/* Production Code Blueprint */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 m-0">
            <FiTerminal className="text-emerald-400" />
            <span>{codeTitle}</span>
          </h2>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            PRODUCTION PATTERN
          </span>
        </div>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed m-0">
          <code>{codeSnippet}</code>
        </pre>
      </section>

      {/* Full-Stack Career Roadmap Widget */}
      <EnterpriseFullStackRoadmapWidget compact={true} />
    </div>
  );
}

// ============================================================================
// COURSE 2: c-industrial-backend-api (5 Modules)
// ============================================================================
export function BackendApiMod1() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 2 · INDUSTRIAL BACKEND & REST API"
      moduleBadge="MODULE 1 OF 5 · SERVER ARCHITECTURE"
      title="1. สถาปัตยกรรมฝั่ง Server & การออกแบบ RESTful API Contract มาตรฐานโรงงาน"
      subtitle="เข้าใจสิ่งที่เกิดขึ้นหลังคำสั่ง fetch(): โครงสร้าง Request-Response Lifecycle, การออกแบบ JSON Response Contract มาตรฐานเดียวกันทั้งโรงงาน และการแยกชั้น Presentation ออกจาก Business Logic"
      whyItMatters="ในหลักสูตรพื้นฐาน เราเรียนการเขียน fetch('/api/meter') เพื่อดึงข้อมูล แต่ในโลกจริงถ้าไม่มีใครสร้าง '/api/meter' ไว้บน Server หน้าเว็บก็เป็นเพียงกระดาษเปล่า บทเรียนนี้จะสอนวิธีสร้างฝั่ง Server ที่ทำหน้าที่รับคำสั่ง ประมวลผล และส่ง JSON กลับไปหาหน้าเว็บ"
      architectureFlow={[
        { title: '1. Front-End Request', desc: 'เบราว์เซอร์ส่ง HTTP Request พร้อม Header, Token และ JSON Payload' },
        { title: '2. API Gateway / Router', desc: 'Server ตรวจสอบ Method (GET/POST) และส่งเข้าฟังก์ชันที่ตรงกับ Action' },
        { title: '3. Business & DB Layer', desc: 'ตรวจสอบเงื่อนไขวิศวกรรมและดึง/บันทึกข้อมูลลง SQL Server' },
        { title: '4. Standardized JSON', desc: 'ส่งกลับในรูป {"success": bool, "data": mixed, "message": string}' }
      ]}
      coreTopics={[
        {
          heading: 'มาตรฐาน API Response Contract เดียวกันทั้งองค์กร',
          body: 'ทุก API ในระบบ MES ต้องตอบกลับด้วยโครงสร้าง JSON 3 คีย์หลักเสมอ ได้แก่ success (true/false), data (ข้อมูลที่ต้องการส่งกลับ), และ message (ข้อความแจ้งสถานะสำหรับแสดงให้ผู้ใช้เห็น) เพื่อให้ Front-End เขียนโค้ดดักจับได้เป็นมาตรฐานเดียว'
        },
        {
          heading: 'การตั้งค่า CORS & Security Headers',
          body: 'ป้องกันไม่ให้เว็บไซต์แปลกปลอมภายนอกแอบยิงเข้ามาดึงข้อมูลการผลิต ด้วยการกำหนด Access-Control-Allow-Origin เฉพาะโดเมนของโรงงาน พร้อมแนบ X-Content-Type-Options: nosniff และ X-Frame-Options: DENY'
        }
      ]}
      codeTitle="ตัวอย่างโครงสร้างมาตรฐาน Industrial PHP API Endpoint (api_meter.php)"
      codeSnippet={`<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/check_auth.php';

try {
    $action = $_GET['action'] ?? 'get_latest_meter';
    
    if ($action === 'get_latest_meter') {
        $stmt = $pdo->prepare("
            SELECT TOP (20) machine_id, voltage_v, current_a, power_kw, recorded_at
            FROM dbo.ELECTRICAL_METER_LOGS
            WHERE line_code = :line
            ORDER BY recorded_at DESC
        ");
        $stmt->execute([':line' => $_GET['line'] ?? 'LINE-A']);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data'    => $rows,
            'message' => 'ดึงข้อมูลมิเตอร์ไฟฟ้าสำเร็จ'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
} catch (Throwable $e) {
    error_log('[API_METER_ERROR] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูล'
    ], JSON_UNESCAPED_UNICODE);
}`}
    />
  );
}

export function BackendApiMod2() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 2 · INDUSTRIAL BACKEND & REST API"
      moduleBadge="MODULE 2 OF 5 · CRUD ENDPOINTS & VALIDATION"
      title="2. การสร้าง API Endpoint จริง (GET, POST, PUT, DELETE) & Server-Side Validation"
      subtitle="วิธีรับข้อมูลจากฟอร์มและสแกนเนอร์บาร์โค้ดหน้างาน การแปลงชนิดข้อมูล (Type Casting) และการตรวจสอบความถูกต้องฝั่ง Server ก่อนอนุญาตให้แตะฐานข้อมูล"
      whyItMatters="กฎเหล็กของวิศวกรรมซอฟต์แวร์คือ 'ห้ามเชื่อข้อมูลจากฝั่ง Client เด็ดขาด' เพราะผู้ใช้หรือผู้ไม่หวังดีสามารถเปิด DevTools แก้ค่าตัวเลขหรือข้ามการตรวจของ JavaScript หน้าบ้านได้เสมอ ดังนั้น Server ต้องตรวจซ้ำทุกครั้ง"
      architectureFlow={[
        { title: '1. Parse JSON Body', desc: 'อ่านข้อมูลจาก php://input หรือ req.body ใน Node.js' },
        { title: '2. Type Casting', desc: 'แปลงค่าตัวเลขด้วย intval() / floatval() และตัดช่องว่าง trim()' },
        { title: '3. Boundary Check', desc: 'ปฏิเสธค่าติดลบ ค่าศูนย์ หรือค่าที่เกินขีดจำกัดวิศวกรรม (เช่น DECIMAL(10,3))' },
        { title: '4. Execute Mutation', desc: 'ดำเนินการบันทึกข้อมูลและคืนค่า HTTP 200/201 พร้อมเลขที่อ้างอิง' }
      ]}
      coreTopics={[
        {
          heading: 'การตรวจสอบข้อมูลตัวเลขการผลิต (Quantity & Weight Validation)',
          body: 'ยอดผลิต น้ำหนักคอยล์เหล็ก และค่าแรงดันไฟฟ้า ต้องตรวจสอบทั้งค่า 0, ค่าติดลบ, NaN และทศนิยมเกินพิกัด เพื่อป้องกันไม่ให้ข้อมูลขยะเข้าไปทำลายการคำนวณ OEE หรือต้นทุนการผลิต'
        },
        {
          heading: 'การแยก HTTP Method ตามเจตนาใช้งานจริง',
          body: 'ใช้ GET สำหรับดึงรายงานโดยมีการจำกัดจำนวนแถว (TOP / OFFSET-FETCH) เสมอ และใช้ POST/PUT/DELETE สำหรับคำสั่งที่มีการเปลี่ยนแปลงสถานะในฐานข้อมูล'
        }
      ]}
      codeTitle="ตัวอย่างการตรวจสอบ Input Validation ฝั่ง Server ก่อนบันทึกยอดผลิต"
      codeSnippet={`// รับข้อมูล JSON จากคำสั่ง fetch(url, { method: 'POST', body: JSON.stringify(payload) })
$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);

$workOrderNo = trim((string)($payload['workOrderNo'] ?? ''));
$goodQty     = filter_var($payload['goodQty'] ?? null, FILTER_VALIDATE_INT);
$scrapWeight = filter_var($payload['scrapWeight'] ?? null, FILTER_VALIDATE_FLOAT);

if ($workOrderNo === '' || !preg_match('/^WO-\d{4}-\d{4}$/', $workOrderNo)) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'data' => null, 'message' => 'รูปแบบเลขที่ใบสั่งผลิตไม่ถูกต้อง']));
}

if ($goodQty === false || $goodQty < 0 || $goodQty > 100000) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'data' => null, 'message' => 'จำนวนชิ้นงานดีต้องอยู่ระหว่าง 0 ถึง 100,000 ชิ้น']));
}`}
    />
  );
}

export function BackendApiMod3() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 2 · INDUSTRIAL BACKEND & REST API"
      moduleBadge="MODULE 3 OF 5 · PDO & SQL INJECTION DEFENSE"
      title="3. การเชื่อมต่อฐานข้อมูลด้วย Prepared Statements & การป้องกัน SQL Injection 100%"
      subtitle="เรียนรู้ช่องโหว่อันดับ 1 ของเว็บแอปพลิเคชัน และวิธีใช้ PDO Prepared Statements แยกคำสั่ง SQL ออกจากข้อมูลที่ผู้ใช้ป้อนอย่างเด็ดขาด"
      whyItMatters="หากนำข้อความที่ผู้ใช้พิมพ์มาต่อ String เข้ากับคำสั่ง SQL โดยตรง เพียงแค่มีคนพิมพ์เครื่องหมาย Single Quote (') หรือคำสั่ง OR 1=1 ระบบฐานข้อมูลทั้งโรงงานอาจถูกดูดข้อมูลหรือถูกลบตารางทิ้งได้ทันที"
      architectureFlow={[
        { title: '1. SQL Template', desc: 'ส่งโครงสร้างคำสั่งที่มี Placeholder (:work_order) ไปคอมไพล์ที่ SQL Server ก่อน' },
        { title: '2. Execution Plan', desc: 'SQL Server ล็อกโครงสร้างคำสั่งตายตัว ไม่สามารถเปลี่ยนโครงสร้างได้อีก' },
        { title: '3. Parameter Binding', desc: 'ส่งข้อมูลของผู้ใช้ตามเข้าไปในช่องตัวแปรในฐานะข้อมูลตัวอักษรล้วนๆ' },
        { title: '4. Safe Result', desc: 'ประมวลผลอย่างปลอดภัยไร้ความเสี่ยง SQL Injection 100%' }
      ]}
      coreTopics={[
        {
          heading: 'ห้ามต่อ String ในคำสั่ง SQL เด็ดขาด (Zero String Concatenation)',
          body: 'ไม่ว่าตัวแปรนั้นจะมาจากช่องค้นหา, Dropdown, หรือ Barcode Scanner ต้องใช้ $pdo->prepare() และส่งค่าผ่านอาร์เรย์ใน $stmt->execute() ทุกครั้งโดยไม่มีข้อยกเว้น'
        },
        {
          heading: 'การป้องกัน XSS (Cross-Site Scripting) เมื่อส่งข้อมูลกลับ',
          body: 'นอกจากการใช้ Prepared Statement ป้องกันฐานข้อมูลแล้ว ข้อมูลข้อความที่แสดงผลบนหน้า HTML ต้องผ่านการกรองหรือใช้ textContent แทน innerHTML เสมอ'
        }
      ]}
      simulator={<BackendSqlInjectionSimulator />}
      codeTitle="เปรียบเทียบโค้ดที่อันตราย vs โค้ดมาตรฐาน PDO Prepared Statement"
      codeSnippet={`// ❌ ห้ามทำเด็ดขาด (เสี่ยงโดนเจาะระบบด้วย SQL Injection):
// $sql = "SELECT * FROM dbo.INVENTORY_ITEMS WHERE part_no = '" . $_POST['partNo'] . "'";

// ✅ มาตรฐานความปลอดภัยระดับโรงงาน (PDO Prepared Statement):
$stmt = $pdo->prepare("
    SELECT item_id, part_no, part_name, onhand_qty, location_code
    FROM dbo.INVENTORY_ITEMS
    WHERE part_no = :part_no AND is_active = 1
");
$stmt->execute([
    ':part_no' => $partNo
]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);`}
    />
  );
}

export function BackendApiMod4() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 2 · INDUSTRIAL BACKEND & REST API"
      moduleBadge="MODULE 4 OF 5 · AUTH, RBAC & CSRF SECURITY"
      title="4. ระบบยืนยันตัวตน Session Hygiene, JWT, RBAC & CSRF Token Enforcement"
      subtitle="การจัดการสิทธิ์ผู้ใช้งานหลายระดับ (พนักงานเดินเครื่อง, หัวหน้ากะ, วิทยากร, ผู้บริหาร) และการป้องกันการปลอมแปลงคำสั่งข้ามโดเมน (CSRF)"
      whyItMatters="ระบบ MES เปิดให้พนักงานเข้าใช้งานผ่านมือถือส่วนตัว (BYOD) และแท็บเล็ตหน้างาน หากไม่มีการตรวจสอบสิทธิ์ที่ฝั่ง Server พนักงานทั่วไปอาจยิง API อนุมัติยอดสต็อกเอง หรือแก้ไขข้อมูลข้ามแผนกได้"
      architectureFlow={[
        { title: '1. Login & Regenerate', desc: 'ตรวจสอบรหัสผ่านด้วย password_verify() และสร้าง Session ID ใหม่ทันที' },
        { title: '2. Issue CSRF Token', desc: 'สร้างรหัสสุ่ม криптоกราฟิก 64 ตัวอักษรเก็บใน $_SESSION["csrf_token"]' },
        { title: '3. Verify Header', desc: 'ทุกคำสั่ง POST/PUT/DELETE ต้องส่ง X-CSRF-Token มาเทียบกับใน Session' },
        { title: '4. Enforce RBAC', desc: 'ตรวจสอบบทบาท (Role) ว่ามีสิทธิ์อนุมัติหรือแก้ไขโมดูลนั้นหรือไม่' }
      ]}
      coreTopics={[
        {
          heading: 'CSRF Token (Cross-Site Request Forgery Protection)',
          body: 'ป้องกันไม่ให้เว็บภายนอกหลอกใช้เบราว์เซอร์ของหัวหน้างานที่ล็อกอินค้างไว้ส่งคำสั่งอนุมัติโดยไม่รู้ตัว ด้วยการบังคับตรวจ hash_equals($_SESSION["csrf_token"], $token) ทุกครั้ง'
        },
        {
          heading: 'การตั้งค่าคุกกี้ปลอดภัย (HttpOnly, Secure, SameSite=Strict)',
          body: 'ล็อกคุกกี้ Session ไม่ให้ JavaScript แปลกปลอมอ่านค่าได้ (HttpOnly) และบังคับส่งผ่านการเชื่อมต่อเข้ารหัส HTTPS เท่านั้น'
        }
      ]}
      codeTitle="ตัวอย่างการตรวจสิทธิ์ RBAC และ CSRF Token ในฝั่ง Backend"
      codeSnippet={`session_start([
    'cookie_httponly' => true,
    'cookie_secure'   => true,
    'cookie_samesite' => 'Strict'
]);

// 1. ตรวจสอบว่าล็อกอินแล้วหรือยัง
if (empty($_SESSION['user']['emp_id'])) {
    http_response_code(401);
    exit(json_encode(['success' => false, 'data' => null, 'message' => 'กรุณาเข้าสู่ระบบก่อนใช้งาน']));
}

// 2. ตรวจสอบ CSRF Token สำหรับคำสั่งเปลี่ยนแปลงข้อมูล
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $clientToken)) {
        http_response_code(403);
        exit(json_encode(['success' => false, 'data' => null, 'message' => 'CSRF Token ไม่ถูกต้องหรือหมดอายุ']));
    }
}`}
    />
  );
}

export function BackendApiMod5() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 2 · INDUSTRIAL BACKEND & REST API"
      moduleBadge="MODULE 5 OF 5 · TRANSACTIONS & AUDIT TRAIL"
      title="5. Error Handling, Transaction Rollback & ระบบบันทึก Audit Trail มาตรฐาน ISO"
      subtitle="การห่อหุ้มคำสั่งด้วย try...catch, การยกเลิกธุรกรรมอัตโนมัติเมื่อเกิดข้อผิดพลาดกลางคัน และการบันทึกประวัติ oldData / newData เพื่อรองรับการตรวจออดิท"
      whyItMatters="ตามมาตรฐาน ISO 9001 และการตรวจออดิทลูกค้าสากล ทุกการแก้ไขหรือลบข้อมูลสำคัญ (เช่น การปรับยอดสต็อก หรือการอนุมัติใบงาน) ต้องสามารถตรวจสอบย้อนกลับได้ว่า 'ใคร แก้ไขอะไร จากค่าเดิมเท่าไร เป็นค่าใหม่เท่าไร เมื่อเวลาใด'"
      architectureFlow={[
        { title: '1. Fetch Old State', desc: 'ดึงข้อมูลเดิมก่อนแก้ไขเก็บไว้ในตัวแปร $oldData' },
        { title: '2. Begin Transaction', desc: 'เปิด $pdo->beginTransaction() เพื่อมัดรวมชุดคำสั่งเข้าด้วยกัน' },
        { title: '3. Update & Audit Log', desc: 'อัปเดตข้อมูลพร้อมบันทึก $oldData และ $newData ลงตาราง AUDIT_LOGS' },
        { title: '4. Commit or Rollback', desc: 'ถ้าสำเร็จทั้งหมดสั่ง commit() หากพังจุดใดจุดหนึ่งสั่ง rollBack() ทันที' }
      ]}
      coreTopics={[
        {
          heading: 'ห้ามปล่อยให้การแก้ไขทำงานสำเร็จครึ่งเดียว (Atomicity)',
          body: 'เช่น การเบิกอะไหล่ออกจากคลัง ต้องทั้ง (1) ลดจำนวนคงเหลือในตาราง ONHAND และ (2) เพิ่มประวัติในตาราง TRANSACTION_LOG หากขั้นตอนที่ 2 ล้มเหลว ขั้นตอนที่ 1 ต้องถูกยกเลิก (Rollback) กลับเป็นค่าเดิมทันที'
        },
        {
          heading: 'การซ่อนข้อผิดพลาดเชิงเทคนิคจากหน้าจอผู้ใช้',
          body: 'ห้ามแสดงข้อความ SQL Error หรือ Path ของไฟล์ในเซิร์ฟเวอร์ออกทาง JSON เด็ดขาด ให้บันทึกรายละเอียดเทคนิคลงไฟล์ Log หลังบ้าน และส่งข้อความภาษาไทยที่เข้าใจง่ายให้ผู้ใช้แทน'
        }
      ]}
      codeTitle="โครงสร้างมาตรฐาน Try-Catch, Rollback และ Audit Trail"
      codeSnippet={`try {
    $pdo->beginTransaction();

    // 1. อ่านค่าเดิมก่อนแก้ไขเพื่อใช้ทำ Audit Trail
    $stmtOld = $pdo->prepare("SELECT location_id, zone_name, status FROM dbo.LOCATIONS WHERE location_id = :id");
    $stmtOld->execute([':id' => $locationId]);
    $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);

    // 2. อัปเดตข้อมูลใหม่
    $stmtUpd = $pdo->prepare("UPDATE dbo.LOCATIONS SET zone_name = :zone, updated_at = GETDATE() WHERE location_id = :id");
    $stmtUpd->execute([':zone' => $newZoneName, ':id' => $locationId]);

    // 3. บันทึกประวัติการเปลี่ยนแปลง (Audit Log)
    writeAuditLog($pdo, 'LOCATIONS', $locationId, 'UPDATE', $oldData, ['zone_name' => $newZoneName]);

    $pdo->commit();
    echo json_encode(['success' => true, 'data' => null, 'message' => 'อัปเดตโซนคลังสินค้าเรียบร้อยแล้ว']);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog('STORE_API', $e->getMessage(), $payload);
    handleApiError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
}`}
    />
  );
}

// ============================================================================
// COURSE 3: c-industrial-database-sql (5 Modules)
// ============================================================================
export function DatabaseSqlMod1() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER"
      moduleBadge="MODULE 1 OF 5 · MANUFACTURING SCHEMA DESIGN"
      title="1. การออกแบบตารางฐานข้อมูลโรงงาน (ER Diagram: Work Order, BOM, Inventory & Traceability)"
      subtitle="หลักการออกแบบ Relational Database สำหรับสายการผลิต: การกำหนด Primary Key, Foreign Key, ชนิดข้อมูล DECIMAL สำหรับความแม่นยำสูง และการผูกความสัมพันธ์เพื่อสืบย้อนกลับ (Traceability)"
      whyItMatters="หัวใจของระบบ MES คือฐานข้อมูล หากออกแบบตารางไม่ดี (เช่น เก็บทุกอย่างรวมในตารางเดียวเหมือนไฟล์ Excel) ข้อมูลจะซ้ำซ้อน แก้ไขยาก และไม่สามารถสืบย้อนกลับได้เลยว่าสินค้าล็อตที่ส่งให้ลูกค้าผลิตมาจากคอยล์เหล็กม้วนไหน"
      architectureFlow={[
        { title: '1. Master Data Tables', desc: 'ตารางข้อมูลหลัก เช่น ITEMS (รหัสสินค้า), MACHINES, LOCATIONS, USERS' },
        { title: '2. Planning Tables', desc: 'ตารางใบสั่งผลิต WORK_ORDERS และโครงสร้างสูตรการผลิต BOM_HEADERS' },
        { title: '3. Transactional Tables', desc: 'ตารางบันทึกยอดผลิตจริง PRODUCTION_LOGS และรายการเคลื่อนไหวสต็อก' },
        { title: '4. Traceability Link', desc: 'เชื่อมโยง Lot วัตถุดิบ → เครื่องจักร → พนักงาน → Lot สินค้าสำเร็จรูป' }
      ]}
      coreTopics={[
        {
          heading: 'การเลือกชนิดข้อมูลสำหรับงานวิศวกรรมการผลิต (Data Types)',
          body: 'ห้ามใช้ FLOAT กับจำนวนเงินหรือน้ำหนักสต็อกเพราะมีโอกาสเกิดทศนิยมคลาดเคลื่อนจากการปัดเศษฐานสอง ให้ใช้ DECIMAL(18,3) สำหรับน้ำหนัก/ปริมาณ และใช้ DATETIME2 สำหรับเวลาที่มีความละเอียดสูง'
        },
        {
          heading: 'กฎความคงสภาพของข้อมูลอ้างอิง (Foreign Key Constraints)',
          body: 'การผูก Foreign Key ระหว่างตาราง PRODUCTION_LOGS กับ WORK_ORDERS ช่วยป้องกันไม่ให้มีการบันทึกยอดผลิตเข้าสู่ใบสั่งผลิตที่ไม่มีอยู่จริงในระบบ'
        }
      ]}
      codeTitle="ตัวอย่างการสร้างตารางใบสั่งผลิตและบันทึกการผลิตบน SQL Server (DDL)"
      codeSnippet={`CREATE TABLE dbo.WORK_ORDERS (
    wo_id           INT IDENTITY(1,1) PRIMARY KEY,
    wo_number       VARCHAR(30)   NOT NULL UNIQUE,
    part_no         VARCHAR(50)   NOT NULL,
    target_qty      DECIMAL(12,3) NOT NULL CHECK (target_qty > 0),
    completed_qty   DECIMAL(12,3) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'RELEASED',
    planned_start   DATETIME2     NOT NULL,
    created_by      VARCHAR(20)   NOT NULL,
    created_at      DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.PRODUCTION_LOGS (
    log_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    wo_id           INT           NOT NULL REFERENCES dbo.WORK_ORDERS(wo_id),
    machine_code    VARCHAR(20)   NOT NULL,
    coil_lot_no     VARCHAR(50)   NOT NULL,
    good_qty        DECIMAL(12,3) NOT NULL CHECK (good_qty >= 0),
    reject_qty      DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK (reject_qty >= 0),
    operator_emp_id VARCHAR(20)   NOT NULL,
    recorded_at     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);`}
    />
  );
}

export function DatabaseSqlMod2() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER"
      moduleBadge="MODULE 2 OF 5 · PRODUCTION SQL QUERIES"
      title="2. คำสั่ง SQL สำหรับสายการผลิต (SELECT, JOIN, Aggregation & Pagination OFFSET-FETCH)"
      subtitle="การเขียนคำสั่งดึงข้อมูลเชื่อมหลายตาราง, การสรุปยอดผลิตตามกะและแผนกด้วย GROUP BY และการทำ Server-Side Pagination ป้องกันฐานข้อมูลค้าง"
      whyItMatters="ตารางบันทึกข้อมูลเซนเซอร์และยอดผลิตในโรงงานมีขนาดเติบโตขึ้นวันละหลายหมื่นแถว การเขียน SELECT * โดยไม่ระบุคอลัมน์และไม่จำกัดจำนวนแถวจะทำให้ทั้งเซิร์ฟเวอร์และหน้าเว็บของพนักงานค้างทันที"
      architectureFlow={[
        { title: '1. Column Selection', desc: 'ระบุเฉพาะชื่อคอลัมน์ที่ต้องใช้แสดงผล ห้ามใช้ SELECT * กับตารางธุรกรรม' },
        { title: '2. Table Joining', desc: 'ใช้ INNER JOIN หรือ LEFT JOIN เชื่อมรหัสสินค้าเข้ากับชื่อสินค้าและตำแหน่งคลัง' },
        { title: '3. Filtering (WHERE)', desc: 'กรองเฉพาะช่วงวันที่ กะการผลิต หรือไลน์การผลิตที่ต้องการ' },
        { title: '4. Pagination', desc: 'ใช้ ORDER BY คู่กับ OFFSET ... FETCH NEXT N ROWS ONLY เสมอ' }
      ]}
      coreTopics={[
        {
          heading: 'การสรุปผลผลิตและของเสียรายกะด้วย GROUP BY และ CASE WHEN',
          body: 'สามารถรวมยอดชิ้นงานดี (Good), ของเสีย (Reject), และคำนวณเปอร์เซ็นต์ของเสียแยกตามไลน์ผลิตได้ในคิวรีเดียวโดยไม่ต้องดึงข้อมูลดิบมาวนลูปบวกเลขในฝั่งเว็บ'
        },
        {
          heading: 'การแบ่งหน้าข้อมูลที่ฝั่งฐานข้อมูล (Server-Side Pagination)',
          body: 'ส่งเฉพาะข้อมูลหน้าที่ผู้ใช้กำลังเปิดดู (เช่น หน้าละ 50 แถว) ช่วยลดปริมาณข้อมูลที่วิ่งผ่านเครือข่าย Wi-Fi โรงงานได้มากกว่า 99%'
        }
      ]}
      codeTitle="ตัวอย่างคำสั่ง SQL สรุปยอดผลิตประจำวันพร้อมทำ Pagination"
      codeSnippet={`SELECT 
    w.wo_number,
    w.part_no,
    p.machine_code,
    SUM(p.good_qty)   AS total_good_qty,
    SUM(p.reject_qty) AS total_reject_qty,
    CAST(
        SUM(p.reject_qty) * 100.0 / NULLIF(SUM(p.good_qty + p.reject_qty), 0)
        AS DECIMAL(5,2)
    ) AS defect_rate_pct
FROM dbo.PRODUCTION_LOGS AS p
INNER JOIN dbo.WORK_ORDERS AS w ON p.wo_id = w.wo_id
WHERE p.recorded_at >= CAST(SYSDATETIME() AS DATE)
GROUP BY w.wo_number, w.part_no, p.machine_code
ORDER BY total_reject_qty DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;`}
    />
  );
}

export function DatabaseSqlMod3() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER"
      moduleBadge="MODULE 3 OF 5 · OEE STORED PROCEDURES"
      title="3. Stored Procedures & การคำนวณดัชนี OEE / Cycle Time / Scrap Rate แบบ Real-Time"
      subtitle="การสร้างชุดคำสั่ง Stored Procedure ไว้บน SQL Server เพื่อคำนวณประสิทธิผลโดยรวมของเครื่องจักร (OEE = Availability × Performance × Quality) อย่างแม่นยำ"
      whyItMatters="การฝังสูตรคำนวณ OEE ไว้ใน Stored Procedure บนฐานข้อมูล ทำให้ไม่ว่าหน้าเว็บ Dashboard, แอปมือถือของผู้บริหาร, หรือรายงานประจำเดือน จะดึงตัวเลขมาจากแหล่งคำนวณเดียวกัน 100% ไม่เกิดปัญหาตัวเลขไม่ตรงกัน"
      architectureFlow={[
        { title: '1. Availability (A)', desc: 'เวลาเดินเครื่องจริง (Run Time) ÷ เวลาทำงานตามแผน (Planned Production Time)' },
        { title: '2. Performance (P)', desc: '(จำนวนผลิตรวม × Ideal Cycle Time) ÷ เวลาเดินเครื่องจริง' },
        { title: '3. Quality (Q)', desc: 'จำนวนชิ้นงานดี (Good Count) ÷ จำนวนผลิตรวมทั้งหมด (Total Count)' },
        { title: '4. Overall OEE', desc: 'A × P × Q คืนค่ากลับเป็นชุดข้อมูลพร้อมแสดงบนเกจวัดทันที' }
      ]}
      coreTopics={[
        {
          heading: 'การป้องกันข้อผิดพลาดหารด้วยศูนย์ (Divide by Zero Protection)',
          body: 'ในช่วงต้นกะที่เครื่องจักรเพิ่งเปิดและยังไม่มีชิ้นงานออกมา ตัวหารอาจเป็น 0 การใช้ฟังก์ชัน NULLIF(denominator, 0) และ ISNULL(..., 0) ใน SQL Server ช่วยป้องกันไม่ให้ระบบแครช'
        },
        {
          heading: 'ข้อดีของ Stored Procedure ในงานอุตสาหกรรม',
          body: 'SQL Server จะแคชแผนการประมวลผล (Execution Plan) ของ Stored Procedure ไว้ล่วงหน้า ทำให้ทำงานเร็วกว่าการส่ง SQL ยาวๆ จากหน้าเว็บ และสามารถจำกัดสิทธิ์ให้ผู้ใช้รันได้เฉพาะ Procedure โดยไม่ต้องเปิดสิทธิ์อ่านตารางโดยตรง'
        }
      ]}
      simulator={<SqlOeeCalculatorSimulator />}
      codeTitle="ตัวอย่าง Stored Procedure คำนวณ OEE ประจำกะการผลิต"
      codeSnippet={`CREATE OR ALTER PROCEDURE dbo.USP_GET_MACHINE_OEE
    @machine_code VARCHAR(20),
    @shift_date   DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        @machine_code AS machine_code,
        CAST(run_min * 100.0 / NULLIF(planned_min, 0) AS DECIMAL(5,2)) AS availability_pct,
        CAST((total_pcs * ideal_cycle_sec / 60.0) * 100.0 / NULLIF(run_min, 0) AS DECIMAL(5,2)) AS performance_pct,
        CAST((total_pcs - ng_pcs) * 100.0 / NULLIF(total_pcs, 0) AS DECIMAL(5,2)) AS quality_pct
    FROM dbo.SHIFT_MACHINE_SUMMARY
    WHERE machine_code = @machine_code AND shift_date = @shift_date;
END;`}
    />
  );
}

export function DatabaseSqlMod4() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER"
      moduleBadge="MODULE 4 OF 5 · ACID TRANSACTIONS & LOCKING"
      title="4. ACID Transactions, Isolation Levels & การป้องกัน Race Condition ตอนตัดสต็อก"
      subtitle="วิธีควบคุมความถูกต้องของข้อมูลเมื่อพนักงานหลายสิบคนยิงบาร์โค้ดตัดสต็อกพร้อมกันในเสี้ยววินาที ด้วย Transaction และ Row-Level Locking (UPDLOCK)"
      whyItMatters="หากพนักงาน 2 คนสแกนเบิกอะไหล่ชิ้นสุดท้ายในคลังพร้อมกันในเสี้ยววินาที ระบบที่ไม่มี Transaction Locking จะอ่านค่าคงเหลือเป็น 1 ทั้งคู่ และยอมให้เบิกออกไปทั้ง 2 คน ส่งผลให้สต็อกติดลบและข้อมูลคลังสินค้าพังทันที"
      architectureFlow={[
        { title: '1. BEGIN TRAN', desc: 'เริ่มต้นขอบเขตธุรกรรมที่ต้องการรับประกันความถูกต้องแบบกลุ่มก้อน' },
        { title: '2. WITH (UPDLOCK)', desc: 'ล็อกแถวข้อมูลสินค้านั้นชั่วคราวขณะตรวจสอบยอดคงเหลือ ไม่ให้คิวรีอื่นแทรก' },
        { title: '3. Verify Balance', desc: 'ตรวจว่า onhand_qty >= จำนวนที่ต้องการเบิก หากไม่พอให้ THROW Error' },
        { title: '4. Deduct & COMMIT', desc: 'หักยอดคงเหลือ บันทึกสมุดรายวันคลังสินค้า และปลดล็อกเมื่อ COMMIT' }
      ]}
      coreTopics={[
        {
          heading: 'คุณสมบัติ ACID ในระบบฐานข้อมูลโรงงาน',
          body: 'Atomicity (ทำสำเร็จทั้งหมดหรือไม่ทำเลย), Consistency (ข้อมูลเป็นไปตามกฎเกณฑ์เสมอ), Isolation (ธุรกรรมที่รันพร้อมกันไม่กวนกัน), และ Durability (บันทึกแล้วไม่สูญหายแม้ไฟดับ)'
        },
        {
          heading: 'การป้องกัน Deadlock ในฐานข้อมูลขนาดใหญ่',
          body: 'เข้าถึงตารางตามลำดับเดียวกันเสมอ และทำให้ช่วงเวลาที่อยู่ใน Transaction สั้นที่สุด (ห้ามเรียก API ภายนอกหรือส่งอีเมลค้างไว้ในระหว่างเปิด Transaction)'
        }
      ]}
      codeTitle="ตัวอย่างการตัดสต็อกอย่างปลอดภัยไร้ปัญหา Race Condition (T-SQL)"
      codeSnippet={`BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @current_qty DECIMAL(12,3);

    -- ล็อกแถวสินค้านั้นด้วย UPDLOCK เพื่อป้องกันคนอื่นอ่านค่าซ้ำในเสี้ยววินาทีเดียวกัน
    SELECT @current_qty = onhand_qty
    FROM dbo.ONHAND_TABLE WITH (UPDLOCK, ROWLOCK)
    WHERE item_id = @item_id AND location_id = @location_id;

    IF @current_qty IS NULL OR @current_qty < @issue_qty
        THROW 50001, 'ยอดคงเหลือในคลังไม่เพียงพอสำหรับการเบิกจ่าย', 1;

    UPDATE dbo.ONHAND_TABLE
    SET onhand_qty = onhand_qty - @issue_qty, updated_at = SYSDATETIME()
    WHERE item_id = @item_id AND location_id = @location_id;

    INSERT INTO dbo.INVENTORY_TRANSACTIONS (item_id, location_id, trans_type, qty, created_by)
    VALUES (@item_id, @location_id, 'ISSUE', -@issue_qty, @emp_id);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;`}
    />
  );
}

export function DatabaseSqlMod5() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 3 · INDUSTRIAL DATABASE & SQL SERVER"
      moduleBadge="MODULE 5 OF 5 · INDEXING & PERFORMANCE"
      title="5. Indexing Strategy, Query Optimization & การดูแลรักษาฐานข้อมูลระดับล้านแถว"
      subtitle="ทำไมตารางที่เคยเปิดเร็วในวันแรกจึงช้าลงเมื่อใช้งานครบ 6 เดือน? เรียนรู้การสร้าง Non-Clustered Index และการอ่าน Execution Plan เพื่อเพิ่มความเร็วคิวรี 100 เท่า"
      whyItMatters="เมื่อตาราง PRODUCTION_LOGS มีข้อมูลเกิน 1,000,000 แถว หากคอลัมน์ใน WHERE ไม่มี Index ฐานข้อมูลจะต้องกวาดอ่านทุกแถวตั้งแต่แถวที่ 1 ถึงแถวที่ล้าน (Full Table Scan) ทุกครั้งที่เปิดหน้า Dashboard"
      architectureFlow={[
        { title: '1. Identify Slow Query', desc: 'ตรวจสอบคิวรีที่ใช้เวลารันนานหรือมีการทำ Table Scan' },
        { title: '2. Analyze WHERE & JOIN', desc: 'ดูคอลัมน์ที่ใช้กรองข้อมูลบ่อย เช่น recorded_at, machine_code, wo_id' },
        { title: '3. Composite Index', desc: 'สร้าง Non-Clustered Index พร้อมระบุ INCLUDE คอลัมน์ที่ต้องใช้แสดงผล' },
        { title: '4. Index Seek', desc: 'SQL Server กระโดดไปยังตำแหน่งข้อมูลทันทีในเวลาไม่กี่มิลลิวินาที' }
      ]}
      coreTopics={[
        {
          heading: 'Covering Index (Index with Included Columns)',
          body: 'การสร้าง Index บนคอลัมน์ที่ใช้ค้นหา (เช่น machine_code, recorded_at) และแนบคอลัมน์ยอดผลิตไว้ใน INCLUDE ช่วยให้ SQL Server ตอบผลลัพธ์ได้ทันทีจากตัว Index โดยไม่ต้องกลับไปเปิดอ่านตารางหลัก (Key Lookup)'
        },
        {
          heading: 'ข้อห้ามที่ทำให้ Index ไม่ทำงาน (Non-SARGable Queries)',
          body: 'ห้ามครอบฟังก์ชันลงบนคอลัมน์ฝั่งซ้ายของเครื่องหมายเปรียบเทียบ เช่น WHERE YEAR(recorded_at) = 2026 เพราะจะทำให้ Index ถูกข้ามทันที ให้ใช้ช่วงวันที่ WHERE recorded_at >= "2026-01-01" แทน'
        }
      ]}
      codeTitle="ตัวอย่างการสร้าง Covering Index สำหรับหน้า Dashboard การผลิต"
      codeSnippet={`-- ✅ สร้าง Index สำหรับการค้นหายอดผลิตตามเครื่องจักรและช่วงเวลา
CREATE NONCLUSTERED INDEX IX_PRODUCTION_LOGS_MACHINE_DATE
ON dbo.PRODUCTION_LOGS (machine_code ASC, recorded_at DESC)
INCLUDE (wo_id, good_qty, reject_qty, coil_lot_no);

-- ❌ ช้ามาก (ใช้ Index ไม่ได้ เพราะครอบฟังก์ชัน CONVERT ลงบนคอลัมน์):
-- WHERE CONVERT(DATE, recorded_at) = '2026-11-06'

-- ✅ เร็วมาก (Index Seek ทำงานเต็มประสิทธิภาพ):
-- WHERE recorded_at >= '2026-11-06T00:00:00' AND recorded_at < '2026-11-07T00:00:00'`}
    />
  );
}

// ============================================================================
// COURSE 4: c-iiot-nodered-edge (5 Modules)
// ============================================================================
export function IiotEdgeMod1() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 4 · IIoT, NODE-RED & PLC INTEGRATION"
      moduleBadge="MODULE 1 OF 5 · INDUSTRIAL PROTOCOLS"
      title="1. สถาปัตยกรรม Edge Gateway & โปรโตคอลอุตสาหกรรม (Modbus TCP, OPC-UA & MQTT)"
      subtitle="เข้าใจภาษาของเครื่องจักรในโรงงาน: ความแตกต่างระหว่างการดึงข้อมูลแบบ Polling ด้วย Modbus TCP, มาตรฐานสากล OPC-UA และระบบส่งข้อความแบบ Publish/Subscribe ด้วย MQTT"
      whyItMatters="เครื่องจักร PLC ในโรงงานไม่ได้พูดภาษา HTTP หรือ JSON เหมือนเว็บเบราว์เซอร์ การจะนำข้อมูลอุณหภูมิเตาหลอม แรงดันไฮดรอลิก หรือจำนวนชิ้นงานจากเครื่องปั๊มขึ้นรูปเข้าสู่เว็บ MES ได้ เราต้องมี Edge Gateway ทำหน้าที่แปลภาษาเครื่องจักร (OT) ให้เป็นภาษาสารสนเทศ (IT)"
      architectureFlow={[
        { title: '1. Field Sensors & PLC', desc: 'เซนเซอร์วัดค่าส่งสัญญาณ 4-20mA / 24VDC เข้าสู่ PLC Memory' },
        { title: '2. OT Protocol (Modbus/OPC)', desc: 'Edge Box อ่านค่าจาก PLC ผ่านพอร์ต Ethernet อุตสาหกรรม' },
        { title: '3. Node-RED / MQTT Broker', desc: 'แปลงค่าดิบเป็น JSON มาตรฐาน พร้อมแนบ Timestamp และ Machine ID' },
        { title: '4. MES Database & Web', desc: 'บันทึกลง SQL Server และกระจายขึ้นหน้าเว็บ Dashboard แบบเรียลไทม์' }
      ]}
      coreTopics={[
        {
          heading: 'Modbus TCP (Port 502) — มาตรฐานยอดนิยมที่เรียบง่ายและรวดเร็ว',
          body: 'อ่านข้อมูลจากตารางหน่วยความจำของ PLC โดยตรง แบ่งเป็น Coils (สถานะบิต 0/1) และ Holding Registers (ตัวเลข 16-bit) เหมาะกับการดึงค่าจากเครื่องจักรและมิเตอร์ไฟฟ้าในสายการผลิต'
        },
        {
          heading: 'MQTT & OPC-UA — สถาปัตยกรรมสำหรับ Smart Factory ขนาดใหญ่',
          body: 'OPC-UA มีโครงสร้างข้อมูลเชิงอ็อบเจกต์พร้อมระบบเข้ารหัสความปลอดภัยในตัว ส่วน MQTT ใช้รูปแบบ Publish/Subscribe ที่กินแบนด์วิดท์ต่ำมาก เหมาะกับการส่งข้อมูลจากหลายร้อยเครื่องจักรพร้อมกัน'
        }
      ]}
      codeTitle="ตารางเปรียบเทียบโปรโตคอลเชื่อมต่อเครื่องจักรสู่ระบบ MES"
      codeSnippet={`/*
┌──────────────┬────────────┬───────────────────────────┬────────────────────────────────────────┐
│ โปรโตคอล     │ พอร์ตมาตรฐาน│ รูปแบบการสื่อสาร          │ งานที่เหมาะสมที่สุดในโรงงาน             │
├──────────────┼────────────┼───────────────────────────┼────────────────────────────────────────┤
│ Modbus TCP   │ TCP 502    │ Master-Slave (Request)    │ มิเตอร์ไฟฟ้า, PLC เครื่องจักรทั่วไป       │
│ OPC-UA       │ TCP 4840   │ Client-Server / PubSub    │ เครื่องจักร CNC/Robot รุ่นใหม่ที่ต้องการ Security│
│ MQTT         │ TCP 1883   │ Publish / Subscribe       │ ส่งข้อมูลจาก Edge Gateway ขึ้นศูนย์กลาง MES│
│ HTTP REST    │ TCP 80/443 │ Request / Response (JSON) │ เชื่อมต่อระหว่าง Web App กับ API Server   │
└──────────────┴────────────┴───────────────────────────┴────────────────────────────────────────┘
*/`}
    />
  );
}

export function IiotEdgeMod2() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 4 · IIoT, NODE-RED & PLC INTEGRATION"
      moduleBadge="MODULE 2 OF 5 · PLC MEMORY & SCALING"
      title="2. การอ่านค่า PLC Memory Map (Coils, Holding Registers) & การแปลงข้อมูลทางวิศวกรรม"
      subtitle="วิธีอ่านตาราง Address ของ PLC และสูตรคณิตศาสตร์การแปลงค่าสัญญาณอนาล็อกดิบ (Raw ADC 0–4095 หรือ 4–20mA) ให้เป็นหน่วยวัดทางวิศวกรรมจริง (°C, Bar, RPM)"
      whyItMatters="เมื่อเราอ่านค่าอุณหภูมิจาก PLC Register เราจะไม่ได้ตัวเลข 75.5 °C ออกมาตรงๆ แต่จะได้ค่าตัวเลขจำนวนเต็มดิบจากโมดูล Analog-to-Digital (เช่น 2048) หรือค่าที่คูณ 10 เอาไว้ วิศวกร IIoT จึงต้องเข้าใจการทำ Linear Scaling และการรวมตัวเลข 32-bit"
      architectureFlow={[
        { title: '1. Analog Sensor (4-20mA)', desc: 'เซนเซอร์วัดแรงดันส่งกระแสไฟฟ้า 4mA (ต่ำสุด) ถึง 20mA (สูงสุด)' },
        { title: '2. PLC ADC Module', desc: 'แปลงกระแสไฟเป็นตัวเลขดิจิทัล เช่น 0 ถึง 4095 เก็บใน Register 40001' },
        { title: '3. Linear Scaling Formula', desc: 'คำนวณ Eng_Val = ((Raw - Raw_Min) / (Raw_Max - Raw_Min)) * (Max - Min) + Min' },
        { title: '4. JSON Telemetry', desc: 'ได้ค่าจริง เช่น 5.00 Bar พร้อมนำไปตรวจสอบเกณฑ์แจ้งเตือน Alarm' }
      ]}
      coreTopics={[
        {
          heading: 'โครงสร้างรหัสตำแหน่งหน่วยความจำ Modbus (Register Addressing)',
          body: '0xxxx = Coils (อ่าน/เขียนบิต Output), 1xxxx = Discrete Inputs (อ่านบิตเซนเซอร์ Input), 3xxxx = Input Registers (อ่านค่าอนาล็อกอย่างเดียว), และ 4xxxx = Holding Registers (อ่าน/เขียนค่าตัวเลขพารามิเตอร์และยอดผลิต)'
        },
        {
          heading: 'การจัดการข้อมูล 32-bit Integer และ Floating Point (Word Swap / Endianness)',
          body: 'เนื่องจาก Modbus 1 Register เก็บได้เพียง 16-bit (สูงสุด 65,535) หากยอดผลิตสะสมเกินกว่านั้น PLC จะใช้ 2 Registers ต่อกัน (32-bit) ซึ่งต้องจัดลำดับ High Word / Low Word ให้ถูกต้อง'
        }
      ]}
      simulator={<IiotPlcScalerSimulator />}
      codeTitle="ฟังก์ชัน JavaScript ใน Node-RED สำหรับแปลงค่า PLC Register เป็น JSON"
      codeSnippet={`// ข้อมูลที่อ่านได้จากโหนด Modbus Read (Array ของ 16-bit Holding Registers 40001 - 40004)
const regs = msg.payload; // เช่น [2048, 855, 1, 1450]

const rawAdcPressure = regs[0]; // 0 - 4095 (สเกล 0.0 - 10.0 Bar)
const rawTempX10     = regs[1]; // ค่าอุณหภูมิคูณ 10 (855 = 85.5 °C)
const machineStatus  = regs[2]; // 0 = STOP, 1 = RUN, 2 = ALARM
const cycleTimeMs    = regs[3]; // 1450 ms

msg.payload = {
    machineId:   "PRESS-A01",
    pressureBar: Number(((rawAdcPressure / 4095) * 10).toFixed(2)),
    tempCelsius: Number((rawTempX10 / 10).toFixed(1)),
    status:      machineStatus === 1 ? "RUNNING" : machineStatus === 2 ? "ALARM" : "STOPPED",
    cycleTimeSec: Number((cycleTimeMs / 1000).toFixed(2)),
    timestamp:   new Date().toISOString()
};
return msg;`}
    />
  );
}

export function IiotEdgeMod3() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 4 · IIoT, NODE-RED & PLC INTEGRATION"
      moduleBadge="MODULE 3 OF 5 · NODE-RED DATA PIPELINES"
      title="3. การพัฒนา Data Pipeline ด้วย Node-RED (Flow Design, Function Nodes & Edge Logic)"
      subtitle="การใช้งาน Node-RED เครื่องมือมาตรฐานระดับโลกสำหรับเชื่อมต่ออุปกรณ์อุตสาหกรรม: การตั้งเวลาดึงค่า, การกรองสัญญาณรบกวน (Debounce) และการแยกเส้นทางข้อมูล"
      whyItMatters="ในโรงงานของเราใช้ Node-RED เป็นตัวกลางหลักในการเชื่อมต่อเครื่องจักรเข้ากับฐานข้อมูลและส่งแจ้งเตือน การเข้าใจวิธีต่อโหนด Inject, Modbus-Read, Function, Switch, และ MSSQL จะช่วยให้สร้างระบบอัตโนมัติได้ภายในไม่กี่นาที"
      architectureFlow={[
        { title: '1. Trigger / Modbus Flex', desc: 'ตั้งเวลาอ่านค่าจาก PLC ทุก 1–5 วินาทีตามความสำคัญของสัญญาณ' },
        { title: '2. RBE / Deadband Filter', desc: 'ส่งข้อมูลต่อเฉพาะเมื่อค่าเปลี่ยนแปลงเกินเกณฑ์ที่กำหนดเพื่อลดภาระฐานข้อมูล' },
        { title: '3. Switch & Alert Routing', desc: 'แยกเส้นทาง: ข้อมูลปกติบันทึกลง DB / ข้อมูลวิกฤตยิงเข้า Webhook ทันที' },
        { title: '4. Error Catch Node', desc: 'ดักจับกรณีเครื่องจักรปิดไฟหรือสายแลนหลุดเพื่อแจ้งสถานะ Offline' }
      ]}
      coreTopics={[
        {
          heading: 'การใช้ Report by Exception (RBE / Filter Node) ลดขยะในฐานข้อมูล',
          body: 'หากเครื่องจักรจอดนิ่งอยู่ ไม่จำเป็นต้องบันทึกค่าเดิมซ้ำๆ ลงฐานข้อมูลทุกวินาที การตั้ง Deadband Filter จะช่วยให้บันทึกเฉพาะเมื่อสถานะเปลี่ยนหรือเมื่อครบทุกรอบ 1 นาที'
        },
        {
          heading: 'การใช้ Context Memory (flow.get / flow.set) ใน Node-RED',
          body: 'ใช้จดจำสถานะก่อนหน้าของเครื่องจักร เช่น จดจำว่าส่งแจ้งเตือน LINE ไปแล้วหรือยัง เพื่อไม่ให้ยิงข้อความแจ้งเตือนซ้ำรัวๆ ทุกวินาทีขณะที่เครื่องยังซ่อมไม่เสร็จ'
        }
      ]}
      codeTitle="ตัวอย่างโค้ด Function Node ป้องกันการส่งแจ้งเตือนซ้ำ (State Change & Cooldown)"
      codeSnippet={`// ตรวจสอบว่าสถานะเครื่องจักรเปลี่ยนเป็น ALARM ครั้งแรกหรือไม่
const prevStatus = flow.get("lastMachineStatus") || "RUNNING";
const currStatus = msg.payload.status;

flow.set("lastMachineStatus", currStatus);

// ส่งแจ้งเตือนเฉพาะจังหวะที่เปลี่ยนจากสถานะปกติเข้าสู่ ALARM เท่านั้น
if (currStatus === "ALARM" && prevStatus !== "ALARM") {
    msg.alertPayload = {
        text: "🚨 [ALERT] เครื่องจักร " + msg.payload.machineId + " หยุดฉุกเฉิน! อุณหภูมิ: " + msg.payload.tempCelsius + " °C"
    };
    return [msg, msg]; // ออกทั้งขาที่ 1 (บันทึก DB) และขาที่ 2 (ยิง Webhook)
}

return [msg, null]; // ออกเฉพาะขาที่ 1 (บันทึก DB ตามปกติ)`}
    />
  );
}

export function IiotEdgeMod4() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 4 · IIoT, NODE-RED & PLC INTEGRATION"
      moduleBadge="MODULE 4 OF 5 · MQTT UNS & SQL INGESTION"
      title="4. สถาปัตยกรรม MQTT Broker, Unified Namespace (UNS) & การส่งข้อมูลเข้า SQL Server"
      subtitle="การจัดระเบียบโครงสร้างหัวข้อข้อมูลทั้งโรงงานตามมาตรฐาน ISA-95 Unified Namespace และการบันทึกข้อมูลความเร็วสูงเข้าสู่ตาราง SQL Server"
      whyItMatters="เมื่อโรงงานมีเครื่องจักรเป็นร้อยเครื่อง หากตั้งชื่อ Topic หรือส่งข้อมูลสะเปะสะปะจะไม่มีใครหาข้อมูลเจอ การจัดโครงสร้างตามลำดับชั้น Enterprise/Site/Area/Line/Machine ช่วยให้ทุกระบบในองค์กรดึงข้อมูลไปใช้ได้ทันที"
      architectureFlow={[
        { title: '1. ISA-95 Topic Hierarchy', desc: 'เช่น snc/rayong/stamping/line-a/press-01/telemetry' },
        { title: '2. MQTT Broker (EMQX/Mosquitto)', desc: 'ตัวกลางกระจายข้อความความเร็วสูงด้วย QoS 1 (รับประกันส่งถึงมือ)' },
        { title: '3. SQL Ingestion Service', desc: 'Subscriber รับข้อมูลจาก Topic แล้วยิง Parameterized INSERT เข้า SQL' },
        { title: '4. Live WebSocket Push', desc: 'ส่งข้อมูลชุดเดียวกันขึ้นหน้าจอ Cockpit ของพนักงานแบบไม่ต้องกด Refresh' }
      ]}
      coreTopics={[
        {
          heading: 'ระดับการรับประกันการส่งข้อมูล MQTT QoS (Quality of Service)',
          body: 'QoS 0 (ส่งแล้วจบ เหมาะกับกราฟความถี่สูง), QoS 1 (ส่งซ้ำจนกว่าผู้รับจะตอบรับ เหมาะกับข้อมูลการผลิตทั่วไป), และ QoS 2 (รับประกันส่งถึงเพียงครั้งเดียวเท่านั้น เหมาะกับคำสั่งตัดสต็อกหรือนับยอดเงิน)'
        },
        {
          heading: 'การใช้ Retained Message และ Last Will and Testament (LWT)',
          body: 'เมื่อ Edge Box สายแลนหลุดหรือไฟดับ MQTT Broker จะปล่อยข้อความ LWT ที่ตั้งไว้ล่วงหน้า (เช่น {"online": false}) ออกมาอัตโนมัติ ทำให้หน้า Dashboard รู้ทันทีว่าเครื่องจักรขาดการเชื่อมต่อ'
        }
      ]}
      codeTitle="ตัวอย่างโครงสร้าง MQTT Unified Namespace และคำสั่งบันทึกเข้า SQL Server"
      codeSnippet={`// 1. มาตรฐานการตั้งชื่อ MQTT Topic ตามโครงสร้าง ISA-95:
// snc/b9/fabricate/line-02/weld-robot-04/telemetry
// snc/b9/fabricate/line-02/weld-robot-04/status (Retained + LWT)

// 2. คำสั่ง SQL ในโหนด MSSQL-Plus บน Node-RED (ใช้ Parameter ป้องกัน Injection):
INSERT INTO dbo.MACHINE_TELEMETRY_LOGS (
    machine_code,
    line_code,
    pressure_bar,
    temp_celsius,
    machine_status,
    cycle_time_sec,
    recorded_at
)
VALUES (
    @machineId,
    @lineCode,
    @pressureBar,
    @tempCelsius,
    @status,
    @cycleTimeSec,
    SYSDATETIME()
);`}
    />
  );
}

export function IiotEdgeMod5() {
  return (
    <BlueprintLessonTemplate
      stageBadge="STAGE 4 · IIoT, NODE-RED & PLC INTEGRATION"
      moduleBadge="MODULE 5 OF 5 · EDGE RESILIENCE & OT SECURITY"
      title="5. ระบบ Store-and-Forward (Offline Buffering) & เครือข่ายความปลอดภัย OT Firewall"
      subtitle="วิธีออกแบบระบบหน้างานให้ไม่สูญเสียข้อมูลแม้สัญญาณ Wi-Fi หรือเซิร์ฟเวอร์กลางล่ม และการกั้นโซนเครือข่ายเครื่องจักร (OT VLAN) ให้ปลอดภัยจากไวรัสฝั่งสำนักงาน"
      whyItMatters="ในสภาพแวดล้อมโรงงานจริง สัญญาณเครือข่ายอาจสะดุดหรือมีการปิดปรับปรุงเซิร์ฟเวอร์กลาง แต่เครื่องจักรยังคงเดินหน้าผลิตชิ้นงานทุกวินาที ระบบ Edge ที่ดีต้องพักข้อมูลลงหน่วยความจำในตัวแล้วทยอยส่งย้อนหลังอัตโนมัติเมื่อเครือข่ายกลับมา"
      architectureFlow={[
        { title: '1. Detect DB Failure', desc: 'โหนด Catch จับสัญญาณเมื่อเชื่อมต่อ SQL Server หรือ MQTT ไม่สำเร็จ' },
        { title: '2. Local Queue / SQLite', desc: 'เขียนข้อมูลพร้อม Timestamp จริงขณะผลิตลงไฟล์คิวในเครื่อง Edge Box' },
        { title: '3. Heartbeat Recovery', desc: 'ตรวจสอบสถานะเซิร์ฟเวอร์ทุก 30 วินาทีจนกว่าจะกลับมาออนไลน์' },
        { title: '4. Batch Replay', desc: 'ทยอยส่งข้อมูลที่ค้างในคิวเข้าฐานข้อมูลตามลำดับเวลาจริงจนครบ 100%' }
      ]}
      coreTopics={[
        {
          heading: 'การบันทึกเวลาที่เกิดเหตุการณ์จริง (Source Timestamp vs Server Timestamp)',
          body: 'เมื่อส่งข้อมูลย้อนหลังจากคิวที่ค้างไว้ ต้องใช้เวลาที่เครื่องจักรผลิตชิ้นงานนั้นจริงๆ (Source Timestamp) ไม่ใช่เวลาที่ข้อมูลเพิ่งเดินทางมาถึงเซิร์ฟเวอร์ เพื่อไม่ให้รายงานกะการผลิตคลาดเคลื่อน'
        },
        {
          heading: 'การแยกวงแลนเครื่องจักรและการเชื่อมต่อแบบ Read-Only',
          body: 'การดึงข้อมูลมาแสดงผลบน MES ควรตั้งค่าสิทธิ์ที่ PLC หรือ Gateway เป็น Read-Only เสมอเพื่อป้องกันไม่ให้คำสั่งผิดพลาดจากฝั่งระบบสารสนเทศสั่งเปลี่ยนค่าพารามิเตอร์เครื่องจักรโดยไม่ตั้งใจ'
        }
      ]}
      codeTitle="ตัวอย่างตรรกะ Store-and-Forward พักข้อมูลลงคิวเมื่อเครือข่ายขัดข้อง"
      codeSnippet={`// ใน Node-RED: เมื่อเชื่อมต่อฐานข้อมูลไม่สำเร็จ ให้เก็บลงคิวใน Edge Storage
const queue = flow.get("offlineTelemetryQueue") || [];

if (msg.dbError) {
    // จำกัดขนาดคิวสูงสุด 10,000 รายการเพื่อป้องกันหน่วยความจำเต็ม
    if (queue.length < 10000) {
        queue.push(msg.originalPayload);
        flow.set("offlineTelemetryQueue", queue);
    }
    node.status({ fill: "red", shape: "ring", text: "Buffered: " + queue.length + " rows" });
    return null;
}

// เมื่อเครือข่ายกลับมาปกติ ให้ดึงข้อมูลในคิวออกมาส่งเข้าฐานข้อมูลทีละชุด (Batch)
if (msg.triggerReplay && queue.length > 0) {
    const batch = queue.splice(0, 50);
    flow.set("offlineTelemetryQueue", queue);
    node.status({ fill: "green", shape: "dot", text: "Replaying (" + queue.length + " left)" });
    return { payload: batch };
}`}
    />
  );
}
