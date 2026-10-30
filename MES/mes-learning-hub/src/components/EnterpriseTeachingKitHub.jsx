import React, { useState, useEffect } from 'react';
import {
  FiCheckSquare,
  FiBookOpen,
  FiHelpCircle,
  FiCpu,
  FiLayers,
  FiCode,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiCheck,
  FiPlay,
  FiRefreshCw,
  FiAlertTriangle,
  FiInfo,
  FiAward,
  FiTerminal,
  FiEye,
  FiEyeOff,
  FiMonitor
} from 'react-icons/fi';
import {
  ENTERPRISE_SLIDES_102,
  ENTERPRISE_CODE_EXAMPLES_16,
  ENTERPRISE_WORKSHOPS_DATA,
  ENTERPRISE_TEMPLATES_DATA,
  ENTERPRISE_THEORY_EXAM,
  ENTERPRISE_PRACTICAL_EXAM,
  ENTERPRISE_TEACHING_KIT_PREP,
  ENTERPRISE_INSTRUCTOR_REVIEW_14
} from '../data/enterpriseAppFullData';
import {
  ENTERPRISE_APP_PRE_TEST as ENTERPRISE_PRE_TEST,
  ENTERPRISE_APP_POST_TEST as ENTERPRISE_POST_TEST
} from '../data/enterpriseAppQuizzes';

function CopyCodeBlock({ title, code, lang = 'code' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
          <FiTerminal className="w-3.5 h-3.5" /> {title || lang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] cursor-pointer"
        >
          {copied ? <><FiCheck className="text-emerald-400" /> คัดลอกแล้ว</> : <><FiCopy /> คัดลอก</>}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

//Formatted text helper that renders **bold** and `code`
function FormattedText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[0.9em] border border-slate-700">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ============================================================================
// LAB 4 VISUAL AIDS (Exact port of teaching-kit/index.html #lab)
// ============================================================================
export function TeachingKitVisualLabs() {
  // 1. API Waiter Demo
  const initialMachines = [
    { id: 'M-01', name: 'Press A', status: 'RUNNING', temp: 72.4 },
    { id: 'M-02', name: 'Press B', status: 'IDLE', temp: 58.0 },
    { id: 'M-03', name: 'Welder C', status: 'RUNNING', temp: 81.2 }
  ];
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiTarget, setApiTarget] = useState('M-02');
  const [machines, setMachines] = useState(initialMachines);
  const [apiStage, setApiStage] = useState('กด "ส่ง Request" เพื่อดูการเดินทางของข้อมูล');
  const [apiStatus, setApiStatus] = useState('');
  const [apiRes, setApiRes] = useState('ยังไม่มี Response');
  const [packetPos, setPacketPos] = useState(null); // 'client' | 'api' | 'server' | 'back'

  const getApiRequestPreview = () => {
    if (apiMethod === 'GET') return 'GET /api/machines HTTP/1.1\nHost: factory.local';
    if (apiMethod === 'POST') return 'POST /api/machines HTTP/1.1\nContent-Type: application/json\n\n{\n  "name": "Cutter D",\n  "status": "IDLE",\n  "temp": 45.0\n}';
    if (apiMethod === 'PUT') return `PUT /api/machines/${apiTarget} HTTP/1.1\nContent-Type: application/json\n\n{\n  "status": "RUNNING",\n  "temp": 76.5\n}`;
    return `DELETE /api/machines/${apiTarget} HTTP/1.1\nHost: factory.local`;
  };

  const handleSendApi = () => {
    setPacketPos('client');
    setApiStage('1. หน้าเว็บ (Client) ส่ง Request ออกไปหา API...');
    setTimeout(() => {
      setPacketPos('api');
      setApiStage('2. API (พนักงานเสิร์ฟ) รับคำสั่งแล้วส่งต่อเข้าฐานข้อมูล Server...');
    }, 350);
    setTimeout(() => {
      setPacketPos('server');
      let nextMachines = [...machines];
      let code = '200 OK';
      let resObj = null;

      if (apiMethod === 'GET') {
        resObj = nextMachines;
      } else if (apiMethod === 'POST') {
        const nextNum = nextMachines.length + 1;
        const created = { id: `M-0${nextNum}`, name: `Cutter ${nextNum}`, status: 'IDLE', temp: 45.0 };
        nextMachines.push(created);
        code = '201 Created';
        resObj = created;
      } else if (apiMethod === 'PUT') {
        const idx = nextMachines.findIndex(m => m.id === apiTarget);
        if (idx >= 0) {
          nextMachines[idx] = { ...nextMachines[idx], status: 'RUNNING', temp: 76.5 };
          resObj = nextMachines[idx];
        } else {
          code = '404 Not Found';
          resObj = { error: `Machine ${apiTarget} not found` };
        }
      } else if (apiMethod === 'DELETE') {
        const exists = nextMachines.some(m => m.id === apiTarget);
        if (exists) {
          nextMachines = nextMachines.filter(m => m.id !== apiTarget);
          code = '200 OK';
          resObj = { deleted: apiTarget, remaining: nextMachines.length };
        } else {
          code = '404 Not Found';
          resObj = { error: `Machine ${apiTarget} not found` };
        }
      }

      setMachines(nextMachines);
      setApiStatus(code);
      setApiRes(JSON.stringify(resObj, null, 2));
      setPacketPos('back');
      setApiStage(`3. Server ประมวลผลเสร็จ ส่ง Response (${code}) กลับมาที่หน้าเว็บ!`);
    }, 800);
  };

  // 2. JSON Path Explorer
  const sampleJsonData = {
    line: 'Line-A',
    shift: 'Day',
    power: { voltage: 230.5, current: 15.8, unit: 'kW' },
    machines: [
      { id: 'M-01', status: 'RUNNING', temp: 72.4 },
      { id: 'M-02', status: 'STOP', temp: 91.0 }
    ],
    alertActive: false
  };
  const [jsonPath, setJsonPath] = useState('data.machines[0].temp');
  const jsonQuickPaths = [
    'data.line',
    'data.power.voltage',
    'data.power.current',
    'data.machines[0].id',
    'data.machines[0].temp',
    'data.machines[1].status',
    'data.alertActive'
  ];

  const evalJsonPath = (expr) => {
    try {
      const cleaned = expr.trim().replace(/^data\.?/, '');
      if (!cleaned) return { val: JSON.stringify(sampleJsonData), type: 'object', err: null };
      const tokens = cleaned.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
      let cur = sampleJsonData;
      for (const tk of tokens) {
        if (cur === undefined || cur === null) {
          return { val: null, type: 'error', err: `TypeError: Cannot read properties of undefined (reading '${tk}')` };
        }
        cur = cur[tk];
      }
      return { val: JSON.stringify(cur), type: typeof cur, err: null };
    } catch (e) {
      return { val: null, type: 'error', err: e.message };
    }
  };
  const pathResult = evalJsonPath(jsonPath);

  // 3. DOM & Event Line Highlighter
  const [domStatus, setDomStatus] = useState('IDLE');
  const [domVolt, setDomVolt] = useState('230');
  const [hitLines, setHitLines] = useState([]);
  const [domLogs, setDomLogs] = useState(['รอผู้เรียนกดปุ่มหรือพิมพ์ค่าแรงดัน...']);

  const domCodeLines = [
    { n: 1, text: "const badge = document.querySelector('#status');" },
    { n: 2, text: "const voltInput = document.querySelector('#volt');" },
    { n: 3, text: "const warnText = document.querySelector('#warn');" },
    { n: 4, text: "" },
    { n: 5, text: "document.querySelector('#btn-start').addEventListener('click', () => {" },
    { n: 6, text: "  badge.textContent = 'RUNNING';" },
    { n: 7, text: "  badge.className = 'badge run';" },
    { n: 8, text: "});" },
    { n: 9, text: "" },
    { n: 10, text: "document.querySelector('#btn-stop').addEventListener('click', () => {" },
    { n: 11, text: "  badge.textContent = 'STOPPED';" },
    { n: 12, text: "  badge.className = 'badge stop';" },
    { n: 13, text: "});" },
    { n: 14, text: "" },
    { n: 15, text: "voltInput.addEventListener('input', (event) => {" },
    { n: 16, text: "  const v = Number(event.target.value);" },
    { n: 17, text: "  warnText.textContent = v > 240 ? '⚠️ Warning: แรงดันเกินพิกัด!' : '';" },
    { n: 18, text: "});" }
  ];

  const triggerDomStart = () => {
    setDomStatus('RUNNING');
    setHitLines([5, 6, 7]);
    setDomLogs(prev => [`[click] #btn-start → บรรทัด 5–7 ทำงาน (status = RUNNING)`, ...prev.slice(0, 4)]);
  };

  const triggerDomStop = () => {
    setDomStatus('STOPPED');
    setHitLines([10, 11, 12]);
    setDomLogs(prev => [`[click] #btn-stop → บรรทัด 10–12 ทำงาน (status = STOPPED)`, ...prev.slice(0, 4)]);
  };

  const triggerDomVolt = (val) => {
    setDomVolt(val);
    setHitLines([15, 16, 17]);
    const num = Number(val);
    setDomLogs(prev => [`[input] #volt = "${val}" → บรรทัด 15–17 ทำงาน (${num > 240 ? 'แจ้งเตือน > 240V' : 'ปกติ'})`, ...prev.slice(0, 4)]);
  };

  // 4. Polling vs Webhook Simulator
  const [simRunning, setSimRunning] = useState(false);
  const [simSec, setSimSec] = useState(0);
  const [pollIntervalSec, setPollIntervalSec] = useState(10);
  const [pollReqs, setPollReqs] = useState(0);
  const [pollSeen, setPollSeen] = useState(0);
  const [pollDelay, setPollDelay] = useState('–');
  const [pollMsg, setPollMsg] = useState('รอเริ่มเวลา');
  const [hookReqs, setHookReqs] = useState(0);
  const [hookSeen, setHookSeen] = useState(0);
  const [hookDelay, setHookDelay] = useState('–');
  const [hookMsg, setHookMsg] = useState('รอเหตุการณ์');
  const [pendingStopAt, setPendingStopAt] = useState(null);

  useEffect(() => {
    if (!simRunning) return;
    const timer = setInterval(() => {
      setSimSec(prev => {
        const next = prev + 1;
        if (next % pollIntervalSec === 0) {
          setPollReqs(r => r + 1);
          setPendingStopAt(stopTime => {
            if (stopTime !== null) {
              const delay = next - stopTime;
              setPollSeen(s => s + 1);
              setPollDelay(`${delay} วินาที`);
              setPollMsg(`เพิ่งตรวจพบว่าเครื่องหยุด! (รู้ช้าไป ${delay} วินาที)`);
              return null;
            } else {
              setPollMsg(`ถาม Server รอบที่ ${next}s: ปกติ (เสีย Request เปล่า)`);
              return null;
            }
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [simRunning, pollIntervalSec]);

  const handleMachineStopEvent = () => {
    if (!simRunning) setSimRunning(true);
    setPendingStopAt(simSec);
    setPollMsg(`⚠️ เครื่องหยุดที่วินาทีที่ ${simSec}! แต่ฝั่ง Polling ยังไม่รู้ ต้องรอรอบถามถัดไป...`);
    setHookReqs(r => r + 1);
    setHookSeen(s => s + 1);
    setHookDelay('0 วินาที (ทันที!)');
    setHookMsg(`🚨 Webhook ยิงแจ้งเตือนทันทีที่วินาทีที่ ${simSec}! ไม่ต้องรอถาม!`);
  };

  const handleResetSim = () => {
    setSimRunning(false);
    setSimSec(0);
    setPollReqs(0);
    setPollSeen(0);
    setPollDelay('–');
    setPollMsg('รอเริ่มเวลา');
    setHookReqs(0);
    setHookSeen(0);
    setHookDelay('–');
    setHookMsg('รอเหตุการณ์');
    setPendingStopAt(null);
  };

  return (
    <div className="space-y-6">
      {/* Demo 1: API Waiter */}
      <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">ชิ้นที่ 1</span>
              API คือพนักงานเสิร์ฟ (Request → API → Server)
            </h3>
            <p className="text-xs text-slate-400">ใช้ประกอบการสอนสไลด์ 75–77: เลือก HTTP Method แล้วกดส่ง ดูการเดินทางของข้อมูลและการเปลี่ยนแปลงในฐานข้อมูลจริง</p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">สไลด์ 75–77</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setApiMethod(m)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                apiMethod === m
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {m}
            </button>
          ))}

          {(apiMethod === 'PUT' || apiMethod === 'DELETE') && (
            <select
              value={apiTarget}
              onChange={e => setApiTarget(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
            >
              {machines.map(m => <option key={m.id} value={m.id}>{m.id} ({m.name})</option>)}
            </select>
          )}

          <button
            type="button"
            onClick={handleSendApi}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <FiPlay className="w-3.5 h-3.5" /> ส่ง Request
          </button>

          <button
            type="button"
            onClick={() => { setMachines(initialMachines); setApiRes('ยังไม่มี Response'); setApiStatus(''); setPacketPos(null); }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
          >
            <FiRefreshCw className="w-3 h-3" /> รีเซ็ตข้อมูล
          </button>
        </div>

        {/* Visual Flow Nodes */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <div className={`p-3 rounded-xl border transition-all ${packetPos === 'client' || packetPos === 'back' ? 'border-cyan-400 bg-cyan-950/40 scale-105' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="font-mono font-black text-cyan-400 text-sm">WEB (Client)</div>
            <div className="text-[11px] text-slate-400">หน้าเว็บ (ลูกค้าสั่งอาหาร)</div>
          </div>
          <div className={`p-3 rounded-xl border transition-all ${packetPos === 'api' ? 'border-amber-400 bg-amber-950/40 scale-105' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="font-mono font-black text-amber-400 text-sm">REST API</div>
            <div className="text-[11px] text-slate-400">พนักงานเสิร์ฟรับ-ส่งคำสั่ง</div>
          </div>
          <div className={`p-3 rounded-xl border transition-all ${packetPos === 'server' ? 'border-emerald-400 bg-emerald-950/40 scale-105' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="font-mono font-black text-emerald-400 text-sm">SERVER + DB</div>
            <div className="text-[11px] text-slate-400">ห้องครัว + ฐานข้อมูลโรงงาน</div>
          </div>
        </div>

        <div className="text-center text-xs font-bold text-cyan-300 bg-cyan-950/30 py-2 rounded-lg border border-cyan-500/20">
          {apiStage}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyCodeBlock title="HTTP Request ที่ส่งไป" code={getApiRequestPreview()} />
          <CopyCodeBlock title={`HTTP Response ${apiStatus ? `(${apiStatus})` : ''}`} code={apiRes} />
        </div>

        <div className="overflow-x-auto">
          <div className="text-xs font-bold text-slate-400 mb-1.5">ข้อมูลเครื่องจักรใน Server ตอนนี้ ({machines.length} เครื่อง):</div>
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">ชื่อเครื่อง</th>
                <th className="p-2">สถานะ</th>
                <th className="p-2">อุณหภูมิ (°C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60 font-mono">
              {machines.map(m => (
                <tr key={m.id}>
                  <td className="p-2 text-cyan-400 font-bold">{m.id}</td>
                  <td className="p-2 font-sans text-slate-200">{m.name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-2 text-amber-300">{m.temp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo 2: JSON Explorer */}
      <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono">ชิ้นที่ 2</span>
              อ่าน JSON ให้เป็น (JSON Path Explorer)
            </h3>
            <p className="text-xs text-slate-400">ใช้กับสไลด์ 73–74 และ Workshop 3: คลิกปุ่มลัดหรือพิมพ์ Path เองเพื่อดูวิธีอ้างอิงค่าจากตัวแปร <code className="text-amber-300">data</code></p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">สไลด์ 73–74 · Workshop 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyCodeBlock title="ตัวแปร data (Response จาก API)" code={JSON.stringify(sampleJsonData, null, 2)} />
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300">คลิกเลือก Path ตัวอย่าง หรือพิมพ์ทดสอบเอง:</div>
            <div className="flex flex-wrap gap-1.5">
              {jsonQuickPaths.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setJsonPath(p)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-all cursor-pointer ${
                    jsonPath === p
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block">ลองพิมพ์ Path เอง (เช่น <code className="text-cyan-300">data.machines[1].temp</code>):</label>
              <input
                type="text"
                value={jsonPath}
                onChange={e => setJsonPath(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-amber-300 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">ผลลัพธ์ที่ได้จากการรัน <code className="text-cyan-300">{jsonPath}</code>:</div>
              {pathResult.err ? (
                <div className="text-xs font-mono text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30">
                  ❌ {pathResult.err}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-black text-emerald-400">{pathResult.val}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">typeof: {pathResult.type}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 m-0">
                💡 ข้อควรจำ: Object ใช้ <code className="text-amber-300">.ชื่อkey</code> ส่วน Array ใช้ <code className="text-amber-300">[ตัวเลข]</code> โดยเริ่มนับตัวแรกที่ index <code className="text-amber-300">0</code> เสมอ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 3: DOM & Event Line Highlighter */}
      <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono">ชิ้นที่ 3</span>
              DOM กับ Event: โค้ดบรรทัดไหนทำงาน
            </h3>
            <p className="text-xs text-slate-400">ใช้กับสไลด์ 58–71 ก่อนเริ่ม Workshop 2: กดปุ่มหรือพิมพ์ค่าแรงดันบนหน้าจอเครื่องจักร บรรทัดโค้ดที่ทำงานจะถูกไฮไลต์สีเหลืองทางขวา</p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">สไลด์ 58–71 · Workshop 2</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">สถานะเครื่อง (#status)</span>
              <span className={`px-4 py-1.5 rounded-lg font-mono font-black text-sm ${
                domStatus === 'RUNNING'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : domStatus === 'STOPPED'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-700 text-slate-200'
              }`}>
                {domStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerDomStart}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Start (#btn-start)
              </button>
              <button
                type="button"
                onClick={triggerDomStop}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Stop (#btn-stop)
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">แรงดันไฟฟ้า #volt (V) — เตือนเมื่อเกิน 240 V:</label>
              <input
                type="number"
                value={domVolt}
                onChange={e => triggerDomVolt(e.target.value)}
                className="w-36 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-white"
              />
              <div className="min-h-[1.5rem] text-xs font-bold text-rose-400">
                {domVolt !== '' && Number(domVolt) > 240 ? '⚠️ Warning: แรงดันเกินพิกัด! (> 240 V)' : ''}
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-800 pt-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Event ที่เกิดขึ้นล่าสุด:</div>
              <ul className="space-y-1 text-xs font-mono text-slate-300 m-0 p-0 list-none">
                {domLogs.map((lg, idx) => (
                  <li key={idx} className={idx === 0 ? 'text-amber-300 font-bold' : 'text-slate-500'}>{lg}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono font-bold text-purple-300">
              script.js (บรรทัดที่ถูกเรียกจะเรืองแสงสีเหลือง)
            </div>
            <pre className="p-2 text-xs font-mono overflow-x-auto m-0 leading-relaxed">
              {domCodeLines.map(line => {
                const isHit = hitLines.includes(line.n);
                return (
                  <div
                    key={line.n}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      isHit ? 'bg-amber-400/25 text-amber-200 font-bold border-l-2 border-amber-400' : 'text-slate-300'
                    }`}
                  >
                    <span className="inline-block w-6 text-right mr-3 text-slate-600 select-none">{line.n}</span>
                    <span>{line.text}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>

      {/* Demo 4: Polling vs Webhook */}
      <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono">ชิ้นที่ 4</span>
              Polling เทียบกับ Webhook (Pull vs Push)
            </h3>
            <p className="text-xs text-slate-400">ใช้กับสไลด์ 86–90: กด "เริ่มเวลา" แล้วกด "เครื่องหยุด!" เมื่อไรก็ได้ ดูความแตกต่างของความเร็วในการรับรู้และจำนวน Request ที่ใช้</p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">สไลด์ 86–90 · Workshop 4</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSimRunning(!simRunning)}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
              simRunning ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {simRunning ? '⏸️ หยุดเวลาชั่วคราว' : '▶️ เริ่มเวลาจำลอง'}
          </button>

          <button
            type="button"
            onClick={handleMachineStopEvent}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg cursor-pointer"
          >
            🚨 กดจำลองเหตุการณ์: เครื่องหยุด!
          </button>

          <label className="text-xs text-slate-300 flex items-center gap-1.5">
            Polling ทุก:
            <select
              value={pollIntervalSec}
              onChange={e => setPollIntervalSec(Number(e.target.value))}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
            >
              <option value={5}>5 วินาที</option>
              <option value={10}>10 วินาที</option>
              <option value={30}>30 วินาที</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleResetSim}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
          >
            เริ่มใหม่
          </button>

          <span className="ml-auto px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
            ⏱️ เวลาจำลอง: {String(Math.floor(simSec / 60)).padStart(2, '0')}:{String(simSec % 60).padStart(2, '0')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-cyan-400">1. Polling: หน้าเว็บคอยถาม Server เป็นรอบ ๆ (Pull)</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xl font-black font-mono text-white">{pollReqs}</div>
                <div className="text-[11px] text-slate-400">Request ที่ส่ง</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xl font-black font-mono text-emerald-400">{pollSeen}</div>
                <div className="text-[11px] text-slate-400">เหตุการณ์ที่รู้แล้ว</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-amber-400 pt-1">{pollDelay}</div>
                <div className="text-[11px] text-slate-400">ความล่าช้า (Delay)</div>
              </div>
            </div>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {pollMsg}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-rose-400">2. Webhook: Server ส่งมาบอกเองเมื่อมีเหตุการณ์ (Push)</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xl font-black font-mono text-white">{hookReqs}</div>
                <div className="text-[11px] text-slate-400">Request ที่ส่ง</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xl font-black font-mono text-emerald-400">{hookSeen}</div>
                <div className="text-[11px] text-slate-400">เหตุการณ์ที่รู้แล้ว</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-emerald-400 pt-1">{hookDelay}</div>
                <div className="text-[11px] text-slate-400">ความล่าช้า (Delay)</div>
              </div>
            </div>
            <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {hookMsg}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN TEACHING KIT HUB COMPONENT (All 6 Tabs)
// ============================================================================
export default function EnterpriseTeachingKitHub({ initialTab = 'prep' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Checklist state persisted in localStorage
  const [checkedMap, setCheckedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('mes_enterprise_teaching_checks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCheck = (id) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    try {
      localStorage.setItem('mes_enterprise_teaching_checks', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const resetChecks = () => {
    setCheckedMap({});
    try {
      localStorage.removeItem('mes_enterprise_teaching_checks');
    } catch {
      // ignore
    }
  };

  // Tab 2: 102 Slides Script state
  const [slideDayFilter, setSlideDayFilter] = useState('all');
  const [slideSearch, setSlideSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const filteredSlides = ENTERPRISE_SLIDES_102.filter(s => {
    const matchDay = slideDayFilter === 'all' || s.day === Number(slideDayFilter);
    const q = slideSearch.trim().toLowerCase();
    if (!q) return matchDay;
    const inTextBlocks = s.textBlocks?.some(tb => tb.some(line => line.toLowerCase().includes(q)));
    const matchQ =
      String(s.n) === q ||
      s.title.toLowerCase().includes(q) ||
      (s.say && s.say.toLowerCase().includes(q)) ||
      (s.ask && s.ask.toLowerCase().includes(q)) ||
      (s.tip && s.tip.toLowerCase().includes(q)) ||
      inTextBlocks;
    return matchDay && matchQ;
  });

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        setFocusIndex(i => Math.min(filteredSlides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setFocusIndex(i => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, filteredSlides.length]);

  // Tab 3: Pre/Post Test state
  const [quizRound, setQuizRound] = useState('pre'); // 'pre' | 'post'
  const [quizMode, setQuizMode] = useState('key'); // 'take' | 'key'
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const currentQuizData = quizRound === 'pre' ? ENTERPRISE_PRE_TEST : ENTERPRISE_POST_TEST;
  const quizQuestions = currentQuizData?.questions || [];

  // Tab 5: Review filter
  const [selectedReviewId, setSelectedReviewId] = useState('all');

  // Tab 6: Examples & Workshops & Exam Key
  const [selectedExId, setSelectedExId] = useState('01');
  const [selectedWsId, setSelectedWsId] = useState('Workshop 1');
  const [showTheoryAnswers, setShowTheoryAnswers] = useState(true);
  const [showPracticalSolution, setShowPracticalSolution] = useState(false);

  const TABS = [
    { id: 'prep', label: '1. เตรียมสอน & เช็กลิสต์' },
    { id: 'script', label: '2. บทพูด & สไลด์ 102 หน้า' },
    { id: 'review', label: '3. ทบทวนผู้สอน (14 หัวข้อ + F12)' },
    { id: 'lab', label: '4. สื่อเข้าใจง่าย (4 ชิ้น)' },
    { id: 'test', label: '5. Pre/Post-test (40 ข้อ)' },
    { id: 'code_exam', label: '6. โค้ดตัวอย่าง 16 ไฟล์ · เฉลย Workshop · ข้อสอบ' }
  ];

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner matching teaching-kit/index.html */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-500/30 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">
          ชุดสอนวิชา App · SNC / 99 Industrial Solutions (Complete Teaching Kit)
        </div>
        <h2 className="text-xl md:text-2xl font-black text-white mb-2">
          การออกแบบ พัฒนา และบูรณาการแอปพลิเคชันระดับองค์กร (Enterprise Application)
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-300">
          <span>หลักสูตร <strong className="text-white">4 วัน</strong> · จันทร์–พฤหัส <strong className="text-white">09:00–16:00</strong></span>
          <span>ทฤษฎี <strong className="text-white">12</strong> · ปฏิบัติ <strong className="text-white">6</strong> · สอบ <strong className="text-white">6</strong> ชั่วโมง (รวม 24 ชม.)</span>
          <span>สไลด์จริง <strong className="text-amber-300">102 หน้า</strong> · โค้ดตัวอย่าง <strong className="text-cyan-300">16 ไฟล์</strong> · Workshop <strong className="text-emerald-300">4 ข้อ</strong></span>
        </div>
      </div>

      {/* Sticky Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-slate-900/95 border border-slate-800 sticky top-2 z-20 backdrop-blur-md shadow-lg">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* =====================================================================
          TAB 1: PREP & COHORT CHECKLIST
         ===================================================================== */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">สิ่งที่ผู้สอนควรมีก่อนเปิดแต่ละรุ่น (ชุดสื่อการสอน 14 รายการ)</h3>
                <p className="text-xs text-slate-400">รายการนี้รวมทุกอย่างที่ทำให้ 4 วันเดินตามแผน แยกสถานะว่าอะไรพร้อมแล้ว อะไรอยู่ในชุดนี้ และอะไรที่ยังต้องเตรียมเพิ่ม</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">● พร้อมใช้</span>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">● มีในชุดนี้</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">● ยังต้องเตรียม</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {ENTERPRISE_TEACHING_KIT_PREP.kitItems.map((item, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{idx + 1}. {item.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed m-0">{item.desc}</p>
                  </div>
                  <span className={`self-start px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                    item.statusType === 'ok'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : item.statusType === 'info'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Phase Interactive Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-white">เช็กลิสต์ต่อรุ่น (ติ๊กได้ทันที ระบบจำไว้ในเบราว์เซอร์เครื่องนี้)</h3>
                <p className="text-xs text-slate-400">ใช้ตรวจสอบความพร้อมตั้งแต่ 1 สัปดาห์ก่อนเริ่มรุ่น จนถึงวันสุดท้ายหลังจบรุ่น</p>
              </div>
              <button
                type="button"
                onClick={resetChecks}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ล้างเช็กลิสต์สำหรับรุ่นใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ENTERPRISE_TEACHING_KIT_PREP.checkSections.map((sec, sIdx) => (
                <div key={sIdx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
                    {sec.title}
                  </h4>
                  <div className="space-y-2">
                    {sec.items.map(item => {
                      const isChecked = Boolean(checkedMap[item.id]);
                      return (
                        <label
                          key={item.id}
                          className="flex items-start gap-2.5 text-xs cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(item.id)}
                            className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className={isChecked ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'}>
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Presenter View Guide */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-base font-black text-white">วิธีเปิดบทพูดตอนสอนจริง</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              {ENTERPRISE_TEACHING_KIT_PREP.presenterSteps.map((st, idx) => (
                <li key={idx}>{st}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: 102 SLIDES & SPEAKER SCRIPT + FOCUS PRESENTER MODE
         ===================================================================== */}
      {activeTab === 'script' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'ทั้งหมด (102 สไลด์)' },
                { id: '1', label: 'วันที่ 1 (สไลด์ 1–35)' },
                { id: '2', label: 'วันที่ 2 (สไลด์ 36–71)' },
                { id: '3', label: 'วันที่ 3 (สไลด์ 72–97)' },
                { id: '4', label: 'วันที่ 4 (สไลด์ 98–102)' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setSlideDayFilter(d.id); setFocusIndex(0); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    slideDayFilter === d.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={slideSearch}
                  onChange={e => { setSlideSearch(e.target.value); setFocusIndex(0); }}
                  placeholder="ค้นหาเลขสไลด์, หัวข้อ, บทพูด เช่น Flexbox, 34, JSON..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => { setFocusMode(!focusMode); setFocusIndex(0); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  focusMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400'
                }`}
              >
                <FiMonitor className="w-3.5 h-3.5" />
                {focusMode ? 'ออกจากโหมดสอนทีละหน้า' : 'โหมดสอนทีละหน้า'}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>แสดง {filteredSlides.length} สไลด์ (ตรงกับไฟล์ PowerPoint ต้นฉบับทุกหน้า)</span>
            {focusMode && <span className="text-amber-400 font-bold">💡 กดปุ่มลูกศรคีย์บอร์ด ← หรือ → เพื่อเปลี่ยนหน้าสไลด์ได้ทันที</span>}
          </div>

          {filteredSlides.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              ไม่พบสไลด์ที่ตรงกับคำค้นหา
            </div>
          ) : focusMode ? (
            /* FOCUS PRESENTER MODE (Single Slide Large View) */
            (() => {
              const s = filteredSlides[Math.min(focusIndex, filteredSlides.length - 1)];
              return (
                <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border-2 border-indigo-500/50 space-y-6 shadow-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={focusIndex <= 0}
                        onClick={() => setFocusIndex(i => Math.max(0, i - 1))}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FiChevronLeft /> ก่อนหน้า
                      </button>
                      <span className="font-mono text-sm font-bold text-amber-400 px-3">
                        หน้า {focusIndex + 1} / {filteredSlides.length} (สไลด์ที่ {s.n})
                      </span>
                      <button
                        type="button"
                        disabled={focusIndex >= filteredSlides.length - 1}
                        onClick={() => setFocusIndex(i => Math.min(filteredSlides.length - 1, i + 1))}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ถัดไป <FiChevronRight />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono text-xs font-bold">
                        วันที่ {s.day} · สไลด์ {s.n}
                      </span>
                      {s.time && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                          ⏱️ {s.time}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black text-white">{s.title}</h3>

                  {/* Speaker Script Callouts (Large Typography for Classroom Delivery) */}
                  <div className="space-y-4">
                    {s.say && (
                      <div className="p-5 rounded-2xl bg-indigo-950/40 border-l-4 border-indigo-400 space-y-1.5">
                        <div className="text-xs font-black uppercase tracking-wider text-indigo-300">🎙️ บทพูดผู้สอน (SAY):</div>
                        <p className="text-base md:text-lg text-white leading-relaxed m-0">{s.say}</p>
                      </div>
                    )}
                    {s.ask && (
                      <div className="p-4 rounded-2xl bg-cyan-950/40 border-l-4 border-cyan-400 space-y-1">
                        <div className="text-xs font-black uppercase tracking-wider text-cyan-300">❓ คำถามชวนคิดถามผู้เรียน (ASK):</div>
                        <p className="text-sm md:text-base text-cyan-100 leading-relaxed m-0">{s.ask}</p>
                      </div>
                    )}
                    {s.tip && (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border-l-4 border-amber-400 space-y-1">
                        <div className="text-xs font-black uppercase tracking-wider text-amber-300">💡 เทคนิคและหมายเหตุผู้สอน (TIP):</div>
                        <p className="text-sm md:text-base text-amber-100 leading-relaxed m-0">{s.tip}</p>
                      </div>
                    )}
                  </div>

                  {/* Slide Content & Images */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">เนื้อหาและภาพประกอบบนสไลด์ที่ {s.n}:</div>
                    {s.textBlocks?.map((tb, idx) => (
                      <ul key={idx} className="list-disc list-inside space-y-1 text-sm text-slate-200">
                        {tb.map((line, lIdx) => <li key={lIdx}>{line}</li>)}
                      </ul>
                    ))}
                    {s.tables?.map((tbl, tIdx) => (
                      <div key={tIdx} className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                          <tbody className="divide-y divide-slate-800">
                            {tbl.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-800 font-bold text-white' : 'bg-slate-900/60 text-slate-300'}>
                                {row.map((cell, cIdx) => <td key={cIdx} className="p-2.5 border-r border-slate-800 last:border-r-0 whitespace-pre-line">{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {s.images?.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {s.images.map((imgUrl, iIdx) => (
                          <div key={iIdx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-2 flex items-center justify-center">
                            <img src={imgUrl} alt={`Slide ${s.n} visual ${iIdx + 1}`} className="max-h-80 object-contain rounded" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* ALL SLIDES LIST VIEW */
            <div className="space-y-3">
              {filteredSlides.map(s => (
                <div key={s.n} className="p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 hover:border-slate-700 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-mono text-xs font-black">
                        สไลด์ {s.n}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">
                        วันที่ {s.day}
                      </span>
                      <h3 className="text-base font-black text-white">{s.title}</h3>
                    </div>
                    {s.time && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-mono text-xs">
                        ⏱️ {s.time}
                      </span>
                    )}
                  </div>

                  {s.say && (
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border-l-4 border-indigo-500 text-xs md:text-sm text-slate-200 leading-relaxed">
                      <strong className="text-indigo-400 block text-[11px] uppercase mb-0.5">🎙️ บทพูด (Say):</strong>
                      {s.say}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {s.ask && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border-l-4 border-cyan-400 text-xs text-cyan-100">
                        <strong className="text-cyan-400 block text-[10px] uppercase mb-0.5">❓ คำถามชวนคิด (Ask):</strong>
                        {s.ask}
                      </div>
                    )}
                    {s.tip && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border-l-4 border-amber-400 text-xs text-amber-100">
                        <strong className="text-amber-400 block text-[10px] uppercase mb-0.5">💡 หมายเหตุผู้สอน (Tip):</strong>
                        {s.tip}
                      </div>
                    )}
                  </div>

                  {/* Expandable Slide Content & Visuals */}
                  {(s.textBlocks?.length > 0 || s.tables?.length > 0 || s.images?.length > 0) && (
                    <details className="pt-1 text-xs">
                      <summary className="cursor-pointer text-slate-400 hover:text-cyan-300 font-semibold select-none">
                        📄 ดูเนื้อหาบนสไลด์และรูปภาพประกอบ ({s.textBlocks?.reduce((a, b) => a + b.length, 0) || 0} บรรทัด{s.images?.length ? ` · ${s.images.length} รูป` : ''})
                      </summary>
                      <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        {s.textBlocks?.map((tb, idx) => (
                          <ul key={idx} className="list-disc list-inside space-y-1 text-slate-300">
                            {tb.map((line, lIdx) => <li key={lIdx}>{line}</li>)}
                          </ul>
                        ))}
                        {s.tables?.map((tbl, tIdx) => (
                          <div key={tIdx} className="overflow-x-auto">
                            <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                              <tbody className="divide-y divide-slate-800">
                                {tbl.map((row, rIdx) => (
                                  <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-800 font-bold text-white' : 'bg-slate-900/60 text-slate-300'}>
                                    {row.map((cell, cIdx) => <td key={cIdx} className="p-2 border-r border-slate-800 last:border-r-0 whitespace-pre-line">{cell}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                        {s.images?.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {s.images.map((imgUrl, iIdx) => (
                              <div key={iIdx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-2 flex items-center justify-center">
                                <img src={imgUrl} alt={`Slide ${s.n}`} className="max-h-56 object-contain rounded" loading="lazy" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: INSTRUCTOR REVIEW (14 Deep Articles + F12 DevTools + 10 Hard Qs)
         ===================================================================== */}
      {activeTab === 'review' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-lg font-black text-white">ทบทวนก่อนสอน: หน้าบ้านและหลังบ้าน (ครบ 14 หัวข้อ + ไล่บั๊กด้วย F12)</h3>
            <p className="text-xs text-slate-300 leading-relaxed m-0">
              ระดับที่ผู้สอนต้องถึงคือ อธิบายเรื่องในสไลด์ได้ด้วยคำพูดตัวเอง และไล่ปัญหาของผู้เรียนระหว่าง Workshop ได้ อ่านจบรอบเดียวประมาณ 45 นาที แต่ละหัวข้อบอกเลขสไลด์ที่เกี่ยวข้องไว้ครบถ้วน
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedReviewId('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                  selectedReviewId === 'all' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                แสดงทั้งหมด (14 หัวข้อ)
              </button>
              {ENTERPRISE_INSTRUCTOR_REVIEW_14.map(art => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => setSelectedReviewId(art.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                    selectedReviewId === art.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {art.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {ENTERPRISE_INSTRUCTOR_REVIEW_14.filter(a => selectedReviewId === 'all' || a.id === selectedReviewId).map(art => (
              <article key={art.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      art.tagType === 'fe'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : art.tagType === 'be'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {art.tagLabel}
                    </span>
                    <h3 className="text-base md:text-lg font-black text-white">{art.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {art.ref}
                  </span>
                </div>

                {art.bullets?.length > 0 && (
                  <ul className="list-disc list-inside space-y-2 text-xs md:text-sm text-slate-200 leading-relaxed">
                    {art.bullets.map((b, idx) => (
                      <li key={idx}><FormattedText text={b} /></li>
                    ))}
                  </ul>
                )}

                {art.flowline && (
                  <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    {art.flowline.map((node, idx) => (
                      <React.Fragment key={idx}>
                        <span className={`px-2.5 py-1 rounded-lg border ${
                          idx === art.flowline.length - 1
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                            : 'bg-slate-900 text-slate-200 border-slate-700'
                        }`}>
                          {node}
                        </span>
                        {idx < art.flowline.length - 1 && <span className="text-slate-500">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {art.code && (
                  <CopyCodeBlock title={`ตัวอย่างโค้ด (${art.title})`} code={art.code} />
                )}

                {art.tip && (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border-l-4 border-amber-400 text-xs space-y-1">
                    <div className="font-black text-amber-300 uppercase">{art.tip.title}</div>
                    <div className="text-amber-100 leading-relaxed"><FormattedText text={art.tip.text} /></div>
                  </div>
                )}

                {art.table && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                      <thead className="bg-slate-800 text-slate-200 font-bold">
                        <tr>
                          {art.table.headers.map((h, i) => <th key={i} className="p-2.5 border-b border-slate-700">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                        {art.table.rows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40">
                            {r.map((c, cIdx) => (
                              <td key={cIdx} className={`p-2.5 ${cIdx === 0 ? 'font-mono font-bold text-amber-300' : 'text-slate-200'}`}>
                                <FormattedText text={c} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {art.faqs?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-xs font-bold text-cyan-400">💬 คำถามที่ผู้เรียนมักถาม & แนวทางตอบ (คลิกเพื่อเปิดดู):</div>
                    {art.faqs.map((f, fIdx) => (
                      <details key={fIdx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs group">
                        <summary className="font-bold text-white cursor-pointer select-none group-hover:text-cyan-300">
                          <FormattedText text={f.q} />
                        </summary>
                        <p className="mt-2 text-slate-300 leading-relaxed pl-3 border-l-2 border-cyan-500 m-0">
                          <FormattedText text={f.a} />
                        </p>
                      </details>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: 4 INTERACTIVE VISUAL LABS
         ===================================================================== */}
      {activeTab === 'lab' && <TeachingKitVisualLabs />}

      {/* =====================================================================
          TAB 5: PRE-TEST / POST-TEST (40 Questions with CLO Breakdown)
         ===================================================================== */}
      {activeTab === 'test' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setQuizRound('pre'); setUserAnswers({}); setQuizSubmitted(false); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quizRound === 'pre' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Pre-test (20 ข้อ · ก่อนเรียน วันที่ 1)
              </button>
              <button
                type="button"
                onClick={() => { setQuizRound('post'); setUserAnswers({}); setQuizSubmitted(false); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quizRound === 'post' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Post-test (20 ข้อ · หลังเรียน วันที่ 4)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuizMode('key')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quizMode === 'key' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                🔑 ตารางเฉลยละเอียดสำหรับผู้สอน
              </button>
              <button
                type="button"
                onClick={() => setQuizMode('take')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  quizMode === 'take' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                ✍️ ลองทำแบบทดสอบ
              </button>
            </div>
          </div>

          {quizMode === 'key' ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <h3 className="text-lg font-black text-white">
                เฉลยและ CLO ที่วัด — {quizRound === 'pre' ? 'Pre-test (20 ข้อ)' : 'Post-test (20 ข้อ)'}
              </h3>
              <div className="space-y-3">
                {quizQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        ข้อที่ {idx + 1}. {q.q}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                        {q.clo} · {q.topic}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {q.choices.map((ch, cIdx) => {
                        const isAns = cIdx === q.answer;
                        return (
                          <div
                            key={cIdx}
                            className={`p-2 rounded-lg border ${
                              isAns
                                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            {['A', 'B', 'C', 'D'][cIdx]}. {ch} {isAns && '✓'}
                          </div>
                        );
                      })}
                    </div>
                    {q.why && (
                      <div className="text-slate-300 bg-slate-900 p-2.5 rounded-lg border-l-2 border-amber-400">
                        <strong className="text-amber-300">เหตุผล:</strong> {q.why}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">ข้อที่ {idx + 1}. {q.q}</span>
                    <span className="font-mono text-slate-400">{q.clo}</span>
                  </div>
                  <div className="space-y-1.5">
                    {q.choices.map((ch, cIdx) => {
                      const picked = userAnswers[idx] === cIdx;
                      const isRight = cIdx === q.answer;
                      return (
                        <label
                          key={cIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                            quizSubmitted
                              ? isRight
                                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-bold'
                                : picked
                                  ? 'bg-rose-950/50 border-rose-500 text-rose-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              : picked
                                ? 'bg-cyan-950/60 border-cyan-400 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={picked}
                            disabled={quizSubmitted}
                            onChange={() => setUserAnswers({ ...userAnswers, [idx]: cIdx })}
                          />
                          <span>{['A', 'B', 'C', 'D'][cIdx]}. {ch}</span>
                        </label>
                      );
                    })}
                  </div>
                  {quizSubmitted && q.why && (
                    <div className="p-2.5 rounded-lg bg-slate-950 border-l-2 border-amber-400 text-slate-300">
                      <strong className="text-amber-300">คำอธิบาย:</strong> {q.why}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuizSubmitted(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  ตรวจคำตอบ ({Object.keys(userAnswers).length}/{quizQuestions.length} ข้อ)
                </button>
                {quizSubmitted && (
                  <span className="font-bold text-sm text-amber-300">
                    คะแนนที่ได้: {quizQuestions.filter((q, i) => userAnswers[i] === q.answer).length} / {quizQuestions.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 6: 16 CODE EXAMPLES, 4 WORKSHOPS STARTER/SOLUTION, & DAY 4 EXAMS
         ===================================================================== */}
      {activeTab === 'code_exam' && (
        <div className="space-y-8">
          {/* Section A: 16 Code Examples */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-white">1. โค้ดตัวอย่างสำหรับสอนครบทั้ง 16 ไฟล์ (โฟลเดอร์ examples/)</h3>
            <p className="text-xs text-slate-400">เรียงตามลำดับสไลด์ ใช้เปิดดูระหว่างสอนหรือคัดลอกไปรันทดสอบสดในห้องเรียน</p>
            <div className="flex flex-wrap gap-1.5">
              {ENTERPRISE_CODE_EXAMPLES_16.map(ex => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedExId(ex.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                    selectedExId === ex.id ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {ex.file}
                </button>
              ))}
            </div>
            {(() => {
              const ex = ENTERPRISE_CODE_EXAMPLES_16.find(e => e.id === selectedExId) || ENTERPRISE_CODE_EXAMPLES_16[0];
              return (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">{ex.title}</h4>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">สไลด์ {ex.slides}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">เปิดด้วย: {ex.runWith}</span>
                    </div>
                  </div>
                  <CopyCodeBlock title={ex.file} code={ex.code} lang={ex.lang} />
                  {ex.extraFile && <CopyCodeBlock title={ex.extraFile} code={ex.extraCode} lang="css" />}
                </div>
              );
            })()}
          </div>

          {/* Section B: 4 Workshops Starter & Solution */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-white">2. โจทย์ Starter Code และเฉลย Solution ของ Workshop 1–4 + Mock API</h3>
            <div className="flex flex-wrap gap-2">
              {ENTERPRISE_WORKSHOPS_DATA.workshops.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWsId(w.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedWsId === w.id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {w.id}: {w.title} ({w.when})
                </button>
              ))}
            </div>
            {(() => {
              const w = ENTERPRISE_WORKSHOPS_DATA.workshops.find(item => item.id === selectedWsId) || ENTERPRISE_WORKSHOPS_DATA.workshops[0];
              return (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-base font-black text-white">{w.id} — {w.title}</h4>
                      <p className="text-slate-300 m-0">🎯 เป้าหมาย: {w.goal}</p>
                    </div>
                    <span className="font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                      {w.slides} · ไฟล์ที่แก้: {w.files}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-bold text-cyan-400">📋 ขั้นตอนการทำ (Steps):</div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-200">
                        {w.steps.map((st, i) => <li key={i}>{st}</li>)}
                      </ol>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-emerald-400">✅ เช็กลิสต์ "ทำเสร็จเมื่อ" (Done Criteria):</div>
                      <ul className="list-disc list-inside space-y-1 text-slate-200">
                        {w.done.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  </div>

                  {w.hints?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                      <div className="font-bold text-amber-300">💡 จุดที่ผู้เรียนมักติดขัด (Troubleshooting Hints):</div>
                      <ul className="list-disc list-inside space-y-1 text-amber-100">
                        {w.hints.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="font-bold text-sky-400 mb-2">📂 โค้ดตั้งต้นสำหรับผู้เรียน (Starter Files):</div>
                      {Object.entries(w.starterFiles || {}).map(([fn, content]) => (
                        <CopyCodeBlock key={fn} title={`starter/${fn}`} code={content} />
                      ))}
                    </div>
                    <div>
                      <div className="font-bold text-emerald-400 mb-2">🔑 โค้ดเฉลยสำหรับผู้สอน (Solution Files):</div>
                      {Object.entries(w.solutionFiles || {}).map(([fn, content]) => (
                        <CopyCodeBlock key={fn} title={`solution/${fn}`} code={content} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <details className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <summary className="font-bold text-amber-300 cursor-pointer">
                🐍 ดูโค้ด API สำรองสำหรับรันบนเครื่องผู้สอน (workshops/mock-api/mock_api.py)
              </summary>
              <div className="mt-3">
                <CopyCodeBlock title="workshops/mock-api/mock_api.py" code={ENTERPRISE_WORKSHOPS_DATA.mockApiPy} lang="python" />
              </div>
            </details>
          </div>

          {/* Section C: Day 4 Official Theory & Practical Exam Key */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-white">3. ข้อสอบทฤษฎี (30 ปรนัย + 2 อัตนัย) และเฉลยสอบปฏิบัติ "The Performance Update"</h3>
              <button
                type="button"
                onClick={() => setShowTheoryAnswers(!showTheoryAnswers)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {showTheoryAnswers ? 'ซ่อนเฉลยข้อสอบทฤษฎี' : 'แสดงเฉลยข้อสอบทฤษฎี'}
              </button>
            </div>

            <details className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs" open>
              <summary className="font-bold text-sm text-cyan-300 cursor-pointer">
                📝 ตอนที่ 1: ข้อสอบทฤษฎีปรนัย 30 ข้อ (30 คะแนน) + อัตนัย 2 ข้อ (20 คะแนน)
              </summary>
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {ENTERPRISE_THEORY_EXAM.partA.map((q, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between font-bold text-white">
                      <span>ข้อ {idx + 1}. {q.q}</span>
                      <span className="text-indigo-300 font-mono">{q.clo} · {q.topic}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {q.choices.map((c, cIdx) => (
                        <div key={cIdx} className={showTheoryAnswers && cIdx === q.answer ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {['ก', 'ข', 'ค', 'ง'][cIdx]}. {c} {showTheoryAnswers && cIdx === q.answer && '✓'}
                        </div>
                      ))}
                    </div>
                    {showTheoryAnswers && q.why && (
                      <div className="text-amber-200/90 text-[11px] pt-1">💡 เฉลย: {q.why}</div>
                    )}
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <h4 className="font-bold text-amber-300 text-sm">ตอนที่ 2: ข้อสอบอัตนัย 2 ข้อ (20 คะแนน)</h4>
                  {ENTERPRISE_THEORY_EXAM.partB.map((qb, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                      <div className="font-bold text-white whitespace-pre-line">ข้ออัตนัยที่ {idx + 1} ({qb.points} คะแนน · {qb.clo}): {qb.q}</div>
                      {showTheoryAnswers && (
                        <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-emerald-200">
                          <div className="font-bold">แนวคำตอบและเกณฑ์ให้คะแนน:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {qb.rubric?.map((r, rIdx) => <li key={rIdx}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <summary className="font-bold text-sm text-emerald-300 cursor-pointer">
                💻 โค้ดตั้งต้น (Starter) และโค้ดเฉลย (Solution) ข้อสอบปฏิบัติ "The Performance Update" (100 คะแนน)
              </summary>
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-sky-400 mb-2">📂 โค้ดตั้งต้นสอบปฏิบัติ (exam/practical/starter):</div>
                  {Object.entries(ENTERPRISE_PRACTICAL_EXAM.starterFiles || {}).map(([fn, content]) => (
                    <CopyCodeBlock key={fn} title={`starter/${fn}`} code={content} />
                  ))}
                </div>
                <div>
                  <div className="font-bold text-emerald-400 mb-2">🔑 โค้ดเฉลยสอบปฏิบัติ (exam/practical/solution):</div>
                  {Object.entries(ENTERPRISE_PRACTICAL_EXAM.solutionFiles || {}).map(([fn, content]) => (
                    <CopyCodeBlock key={fn} title={`solution/${fn}`} code={content} />
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
