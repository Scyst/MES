import React, { useState } from 'react';
import { 
  FiX, 
  FiCalendar, 
  FiMessageSquare, 
  FiShield, 
  FiClock, 
  FiCheckCircle, 
  FiUsers, 
  FiAlertTriangle, 
  FiCode, 
  FiExternalLink,
  FiZap,
  FiBookOpen,
  FiCamera,
  FiSun,
  FiSliders,
  FiTarget
} from 'react-icons/fi';

export default function TrainerGuideModal({ isOpen, onClose, courseId = 'c-machine-vision' }) {
  const [selectedCourse, setSelectedCourse] = useState(courseId || 'c-machine-vision');
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'scripts' | 'tactics'

  if (!isOpen) return null;

  const isVision = selectedCourse === 'c-machine-vision';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-purple-500/40 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-900 border-b border-purple-500/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 text-lg font-bold">
              {isVision ? '📷' : '💻'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  คู่มือวิทยากรและแผนการสอน 3 วัน
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Trainer Companion
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md sm:max-w-xl">
                {isVision 
                  ? 'หลักสูตร Basic Machine Vision and Sensor Inspection for Smart Factories (BOI STEMPlus &middot; 24-30 ชม.)'
                  : 'หลักสูตร Enterprise Application Design, Development & Integration (BOI STEMPlus &middot; 24 ชม.)'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Course Switcher Bar */}
        <div className="bg-slate-950 px-6 py-2 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-semibold whitespace-nowrap">เลือกวิชาที่สอน:</span>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCourse('c-machine-vision')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isVision 
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FiCamera className="w-3.5 h-3.5" />
              <span>📷 Machine Vision &amp; Sensor Inspection</span>
            </button>
            <button
              onClick={() => setSelectedCourse('c-enterprise-app')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isVision 
                  ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FiCode className="w-3.5 h-3.5" />
              <span>💻 Enterprise App &amp; MES Architecture</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FiCalendar className="w-3.5 h-3.5" />
            <span>1. แผนการสอน 3 วัน (Timetable &amp; Labs)</span>
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'scripts'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FiMessageSquare className="w-3.5 h-3.5" />
            <span>2. สคริปต์บทพูด &amp; จุดเน้นสำคัญ (Talking Points)</span>
          </button>
          <button
            onClick={() => setActiveTab('tactics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tactics'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FiShield className="w-3.5 h-3.5" />
            <span>3. เทคนิคสอนสบาย ไม่หัวร้อน (Frustration-Free Tactics)</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* ========================================================================= */}
          {/* TAB 1: 3-DAY TIMETABLE & LABS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {isVision ? (
                /* MACHINE VISION TIMETABLE */
                <>
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-xs leading-relaxed">
                    💡 <strong>แผนการสอน Machine Vision 3 วัน (วันละ 8 ชม. รวม 24 ชม.):</strong> มุ่งเน้นการเป็น <em>"Industrial Vision Architect"</em> ผู้เลือกฮาร์ดแวร์ เลนส์ และการจัดแสงได้อย่างถูกต้องในวันแรก วิเคราะห์ตรรกะ Rule-Based vs AI ในวันที่สอง และเชื่อมโยงสัญญาณ I/O คัดแยกของเสียเข้าสู่ฐานข้อมูล MES ในวันสุดท้าย
                  </div>

                  {/* Day 1: Optical Hardware & Lighting */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-600 text-white text-xs">DAY 1</span>
                        6 องค์ประกอบหลัก &middot; กล้อง Global Shutter &middot; เทคนิคแสงตัดแสงสะท้อน (Optical &amp; Lighting)
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-cyan-400">ช่วงเช้า (09:00 - 12:00 น.) — ฮาร์ดแวร์และชัตเตอร์</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>6 องค์ประกอบหลักของ Industrial Vision (Camera, Lens, Light, Trigger, IPC, I/O)</li>
                            <li>การคำนวณระยะ FOV, Working Distance และ Optical Resolution</li>
                            <li><strong>ไฮไลต์:</strong> เปรียบเทียบ Global Shutter vs Rolling Shutter บนสายพาน</li>
                            <li><strong>Workshop 1:</strong> เปิดตัวจำลอง Shutter Simulator ทดสอบภาพเอียงเบี้ยว</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-amber-400">ช่วงบ่าย (13:00 - 17:00 น.) — เทคนิคแสง (Lighting Mastery)</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>"Lighting is 80% of Success" &mdash; แสงสว่างคือหัวใจของความแม่นยำ</li>
                            <li>5 เทคนิคแสง: Backlight, Coaxial, Dome, Bar Light, และ CPL Polarizer</li>
                            <li>การแก้ปัญหาแสงวาบขาว (Specular Glare) บนชิ้นงานปั๊มขึ้นรูปเคลือบน้ำมัน</li>
                            <li><strong>Workshop 2:</strong> ใช้ Optical Simulator ปรับมุมฟิลเตอร์ CPL 90° ตัดแสงสะท้อน</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day 2: Rule-Based vs AI Vision */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-violet-600 text-white text-xs">DAY 2</span>
                        ตรรกะการตรวจสอบภาพ &middot; Rule-Based vs AI Deep Learning &middot; ปรับจูน Threshold
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-violet-400">ช่วงเช้า (09:00 - 12:00 น.) — Classical Rule-Based</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>Caliper Tool วัดขนาดมิติ &plusmn;0.01mm และ Sobel Edge Detection</li>
                            <li>การอ่านโค้ด 2D DataMatrix (DPM) ยิงเลเซอร์บนผิวโลหะตาม ISO 15415</li>
                            <li>Blob Analysis ตรวจนับชิ้นงานและเศษขยะในจิ๊ก (Poka-Yoke)</li>
                            <li><strong>Workshop 3:</strong> ทดลองตั้งค่า ROI ตรวจสอบขนาดและนับจำนวนน็อต</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-rose-400">ช่วงบ่าย (13:00 - 17:00 น.) — AI &amp; ป้องกันของเสียหลุด</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>AI Deep Learning Semantic Segmentation ตรวจรอยแตกร้าวและรอยไหม้จุดเชื่อมสปอต</li>
                            <li>การบริหาร Threshold: กฎเหล็ก <strong>Escape Rate = 0 PPM</strong> และคุม <strong>Overkill &lt; 0.5%</strong></li>
                            <li>Confusion Matrix: เข้าใจ False Positive vs False Negative ในอุตสาหกรรม</li>
                            <li><strong>Workshop 4:</strong> จูนค่า Threshold บน Bell Curve ป้องกันงานเสียหลุดรอด</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day 3: Integration, Ejector & MES */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-xs">DAY 3</span>
                        การเชื่อมต่อสายการผลิตจริง &middot; คัดแยกงานเสีย &middot; ส่งผลขึ้นระบบ MES &middot; สอบวัดผล
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-amber-400">ช่วงเช้า (09:00 - 12:00 น.) — สัญญาณ I/O &amp; Ejector</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>การรับสัญญาณ Trigger จาก Photoelectric และ Rotary Encoder</li>
                            <li>Strobe Controller เร่งไฟแฟลช 400% (50 &mu;s) สัมพันธ์กับกล้อง</li>
                            <li>การส่งสัญญาณ 24VDC Digital Out เข้า PLC สั่งกระบอกลมเตะงานเสีย (Pneumatic Ejector)</li>
                            <li><strong>Workshop 5:</strong> จำลองสัญญาณเตะงานเสียด้วย Shift Register Tracking</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-emerald-400">ช่วงบ่าย (13:00 - 17:00 น.) — เชื่อมโยง MES &amp; สอบวัดผล</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>การบันทึก Log ผลตรวจ, ค่ามิติ, และรูปภาพ NG ลงใน SQL Server ผ่าน REST API</li>
                            <li>การทำ Digital Quality Birth History สืบย้อนกลับตามข้อกำหนด IATF 16949</li>
                            <li><strong>15:00 น. สอบวัดผล Post-Test:</strong> ทำข้อสอบ 10 ข้อบนระบบ MES Learning Hub</li>
                            <li><strong>16:00 น. ตรวจรับรอง:</strong> ออกใบรับรองอิเล็กทรอนิกส์ SNC-CERT พร้อมระบบตรวจสอบ QR</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ENTERPRISE APP TIMETABLE */
                <>
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-purple-200 text-xs leading-relaxed">
                    💡 <strong>โครงสร้าง 3 วันเข้มข้น (วันละ 8 ชั่วโมง รวม 24 ชม.):</strong> เน้นให้ผู้เรียนเข้าใจสถาปัตยกรรมระดับภาพรวมในวันแรก ลงมือเขียนโค้ดและเชื่อมโยง API ในวันที่สอง และทำ IoT Webhook พร้อมสอบวัดผลในวันสุดท้าย
                  </div>

                  {/* Day 1 */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-fuchsia-600 text-white text-xs">DAY 1</span>
                        สถาปัตยกรรมระบบองค์กร (IT/OT Landscape) &amp; Industrial UX/UI Design
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-amber-400">ช่วงเช้า (09:00 - 12:00 น.) — สถาปัตยกรรมระบบ</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>ภาพรวม Digital Enterprise และ IT-OT Convergence</li>
                            <li>แบบจำลอง ISA-95 (5 เลเยอร์จากเครื่องจักรสู่ Cloud)</li>
                            <li><strong>Workshop 1:</strong> วิเคราะห์โครงข่ายและโฟลว์ข้อมูลโรงงานจริง</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-cyan-400">ช่วงบ่าย (13:00 - 17:00 น.) — ออกแบบหน้าจอโรงงาน</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>หลักสรีรศาสตร์หน้างาน &amp; กฎ 3-Second Rule</li>
                            <li>การออกแบบ Mobile-first สำหรับช่างและหัวหน้างาน</li>
                            <li><strong>Workshop 2:</strong> วาด Wireframe หน้าจอบันทึกยอดผลิตและ Dashboard</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day 2 */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-600 text-white text-xs">DAY 2</span>
                        การพัฒนา Modern Web Application &amp; บูรณาการ RESTful APIs
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-amber-400">ช่วงเช้า (09:00 - 12:00 น.) — Frontend Core</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>HTML5 Semantic Tags &amp; CSS Grid สำหรับ Industrial Layout</li>
                            <li>JavaScript ES6+ Async/Await, Promises &amp; Fetch API</li>
                            <li><strong>Workshop 3:</strong> สร้าง Line Status Card แบบตอบสนองทุกหน้าจอ</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-cyan-400">ช่วงบ่าย (13:00 - 17:00 น.) — API &amp; Backend Data</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>มาตรฐาน RESTful API Contract และรูปแบบข้อมูล JSON</li>
                            <li>การจัดการ Error (401 Auth, 404 Not Found, 500 Server)</li>
                            <li><strong>Workshop 4:</strong> ยิง API ดึงยอดผลิตสดและสถานะเครื่องจักรขึ้นจอ</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day 3 */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="font-black text-white text-sm flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-xs">DAY 3</span>
                        IoT Webhook, ระบบความปลอดภัย &amp; สอบวัดผล BOI Post-Test
                      </span>
                      <span className="text-xs text-slate-400">8 ชั่วโมง</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-amber-400">ช่วงเช้า (09:00 - 12:00 น.) — IoT &amp; แจ้งเตือนด่วน</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>หลักการเชื่อมต่อ Node-RED กับสัญญาณเซ็นเซอร์หน้างาน</li>
                            <li>การส่ง Webhook แจ้งเตือนเหตุการณ์ฉุกเฉิน (Telegram/Teams)</li>
                            <li><strong>Workshop 5:</strong> จำลองสัญญาณเครื่องจักร Down ส่งเข้ามือถือ</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="font-bold text-emerald-400">ช่วงบ่าย (13:00 - 17:00 น.) — Security &amp; สอบวัดผล</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>Enterprise Security, RBAC สิทธิ์ผู้ใช้งาน และป้องกัน SQL Injection</li>
                            <li><strong>15:00 น. สอบวัดผล Post-Test:</strong> ทุกคนเปิดทำข้อสอบบนระบบ MES Learning Hub</li>
                            <li><strong>16:00 น. ตรวจรับรอง:</strong> ออกใบรับรองอิเล็กทรอนิกส์ SNC-CERT ทันที</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SPEAKER SCRIPTS & KEY TALKING POINTS                               */}
          {/* ========================================================================= */}
          {activeTab === 'scripts' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {isVision ? (
                /* MACHINE VISION SPEAKER SCRIPTS */
                <>
                  {/* Hook Script */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <FiZap />
                      <span>บทพูดเปิดคลาส (Opening Hook — พูดใน 3 นาทีแรก):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-amber-400 text-xs sm:text-sm">
                      &ldquo;สวัสดีทุกท่านครับ หลายคนคิดว่าการทำระบบ Machine Vision คือเรื่องของการเขียนโค้ดคอมพิวเตอร์ลึก ๆ หรือต้องใช้ AI ขั้นเทพ... แต่ในโรงงานจริง กฎเหล็กข้อแรกของวิศวกรวิชันคือ <strong>'แสงสว่างคือ 80% ของความสำเร็จ' (Lighting is King)</strong>... ถ้าคุณจัดแสงให้กล้องมองเห็นขอบและรอยตำหนิชัดเจน โค้ดแค่บรรทัดเดียวก็ตัดสินได้ แต่ถ้าภาพมืด เบลอ หรือแสงสะท้อนจ้า ต่อให้ใช้โมเดล AI ราคาเป็นล้านก็ทายผิด! ตลอด 3 วันนี้ ผมจะพาทุกท่านมาดูเทคนิคการมองเห็นของเครื่องจักรตั้งแต่เรื่องแสง เลนส์ ไปจนถึงการส่งสัญญาณเตะงานเสียจริงครับ&rdquo;
                    </blockquote>
                  </div>

                  {/* Analogy: Global vs Rolling Shutter */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <FiCamera />
                      <span>บทอธิบายทำไมห้ามใช้กล้องเว็บแคมบนสายพาน (Global vs Rolling Shutter):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-cyan-400 text-xs sm:text-sm">
                      &ldquo;มีใครเคยเอามือถือถ่ายรูปใบพัดลมที่กำลังหมุนเร็ว ๆ แล้วเห็นใบพัดมันงอเบี้ยวเหมือนเจลลี่ไหมครับ? นั่นคืออาการของ Rolling Shutter ที่เซนเซอร์อ่านภาพทีละแถวจากบนลงล่าง... ถ้าเราเอาไปส่องชิ้นงานปั๊มขึ้นรูปที่วิ่งอยู่บนสายพาน 30 เมตรต่อนาที ชิ้นงานสี่เหลี่ยมจะถูกถ่ายออกมาเป็นสี่เหลี่ยมด้านขนานทันที! ขนาดที่วัดได้จะเพี้ยนไป 15% นี่คือเหตุผลว่าทำไมโรงงานอุตสาหกรรมถึงต้องใช้ <strong>Global Shutter</strong> ที่เปิดรับแสงทุกพิกเซลพร้อมกันใน 50 ไมโครวินาที ชิ้นงานจึงคมกริบและไม่เบี้ยวครับ&rdquo;
                    </blockquote>
                  </div>

                  {/* Analogy: Polarizer Filter Trick */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <FiSun />
                      <span>บทพูดสาธิตการตัดแสงสะท้อนคราบน้ำมัน (Polarizer Filter Trick):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-emerald-400 text-xs sm:text-sm">
                      &ldquo;เวลาชิ้นงานปั๊มออกมาจากแม่พิมพ์ มันจะมีน้ำมันหล่อเย็นชโลมอยู่ เวลาเปิดไฟส่องตรง แสงสะท้อนจะวาบเข้าเลนส์กล้องจนขาวโพลน กล้องมองไม่เห็นรอยแตก... วิศวกรหน้างานหลายคนคิดว่าต้องเปลี่ยนโปรแกรมใหม่ แต่ความจริงง่ายนิดเดียวครับ แค่ติดฟิลเตอร์ <strong>Polarizer (CPL)</strong> หน้าเลนส์ แล้วหมุนมุมไปที่ 90 องศา แสงสะท้อนจ้าจะหายวับไปทันที รอยแตกรอยร้าวจะโผล่ขึ้นมาคมชัดโดยไม่ต้องแก้โค้ดแม้แต่บรรทัดเดียว!&rdquo;
                    </blockquote>
                  </div>

                  {/* Escape vs Overkill Priority */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <FiTarget />
                      <span>บทพูดเรื่องมาตรฐานคุณภาพ (Escape Defect vs Overkill):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-rose-400 text-xs sm:text-sm">
                      &ldquo;ระหว่าง 'งานดีแต่เครื่องคิดว่าเสีย แล้วเตะทิ้ง' (Overkill) กับ 'งานเสียแต่เครื่องปล่อยหลุดไปถึงมือลูกค้า' (Escape/Underkill) โรงงานเรากลัวอะไรมากกว่ากัน?... หลุดไปหาลูกค้าคือวิกฤตระดับหยุดสายพาน โดนเคลมหลักล้านและกระทบชื่อเสียง ดังนั้นกฎเหล็กของเราคือ <strong>Escape Defect ต้องเป็น 0 PPM เสมอ</strong> ส่วน Overkill ให้ปรับจูนแสงและ Threshold ให้ต่ำกว่า 0.5% เพื่อรักษา Yield การผลิตครับ&rdquo;
                    </blockquote>
                  </div>
                </>
              ) : (
                /* ENTERPRISE APP SPEAKER SCRIPTS */
                <>
                  {/* Hook Script */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <FiZap />
                      <span>บทพูดเปิดคลาส (Opening Hook — พูดใน 3 นาทีแรก):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-amber-400 text-xs sm:text-sm">
                      &ldquo;สวัสดีทุกท่านครับ วันนี้เราไม่ได้มาเรียนเขียนโค้ดเพื่อไปเป็นโปรแกรมเมอร์สร้างเกมหรือเว็บทั่วไป แต่เรากำลังจะมาเรียนการสร้าง <strong>'สะพานเชื่อม'</strong> ระหว่างเครื่องจักรในโรงงานเรา กับข้อมูลในห้องผู้บริหาร... โรงงานที่ฉลาดไม่ใช่โรงงานที่มีเครื่องแพง แต่คือโรงงานที่เครื่องจักรรู้จักส่งเสียงบอกเราได้ทันทีว่าเกิดอะไรขึ้น และระบบที่เราจะทำด้วยกัน 3 วันนี้ จะเป็นของจริงที่ทุกคนนำไปใช้งานได้ทันทีครับ&rdquo;
                    </blockquote>
                  </div>

                  {/* Lab Command Script */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <FiCode />
                      <span>บทพูดสั่งงานช่วงทำ Workshop (ทุ่นแรงวิทยากร):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-cyan-400 text-xs sm:text-sm">
                      &ldquo;สำหรับ Workshop นี้ ผมได้เตรียมคู่มือขั้นตอนและบล็อกโค้ดตัวอย่างไว้บนหน้าจอ MES Learning Hub เรียบร้อยแล้วครับ ให้ทุกคนเปิดไปที่บทเรียนที่กำลังเรียนอยู่ อ่านขั้นตอนตามข้อ 1 ถึงข้อ 3 แล้วลงมือทำตามได้เลย หากติดขัดตรงไหน ยกมือแจ้งน้อง TA ที่เดินประกบอยู่ได้ทันทีครับ&rdquo;
                    </blockquote>
                  </div>

                  {/* Daily Wrap-up Script */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <FiCheckCircle />
                      <span>บทพูดปิดวัน (Daily Wrap-up):</span>
                    </div>
                    <blockquote className="italic text-slate-300 pl-3 border-l-2 border-emerald-400 text-xs sm:text-sm">
                      &ldquo;วันนี้ยอดเยี่ยมมากครับ ทุกคนได้เห็นภาพตั้งแต่โครงสร้างจนเริ่มมีหน้าจอแรกของตัวเอง วันพรุ่งนี้เราจะนำหน้าจอนี้ไปต่อท่อข้อมูลจริงเข้ากับฐานข้อมูล ใครที่ยังอยากทบทวน สามารถล็อกอินเข้ามาอ่านบทเรียนและทำแบบทดสอบย่อย Checkpoint ซ้ำบนระบบได้ตลอด 24 ชั่วโมงครับ&rdquo;
                    </blockquote>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FRUSTRATION-FREE TEACHING TACTICS                                  */}
          {/* ========================================================================= */}
          {activeTab === 'tactics' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-rose-200 text-xs leading-relaxed">
                🎯 <strong>วิธีป้องกันอาการหมดความอดทน / อารมณ์ร้อนเมื่อถูกถามซ้ำ:</strong> วิทยากรที่เหนื่อยล้ามักเกิดจากการพยายามตอบคำถามระดับคลิกเมาส์ทีละคนหน้าห้อง การตั้งระบบกติกาและการใช้เครื่องมือช่วยจะทำให้ท่านสอนได้อย่างสบายใจและเป็นมืออาชีพที่สุด
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Tactic 1 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="font-black text-amber-400 flex items-center gap-2 text-sm">
                    <span>1. กฎ 3 ข้อทองคำก่อนเริ่มคลาส</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    ก่อนเริ่มสอนวันแรก ประกาศกติกาชัดเจน:
                    <br />(1) ช่วงบรรยายขอให้ฟังภาพรวมก่อน ยังไม่ต้องกดตาม
                    <br />(2) เมื่อเข้าสู่ช่วง Lab ให้เปิดอ่านขั้นตอนบนหน้าจอเว็บ
                    <br />(3) สงสัยจุดไหน ให้เขียนโน้ตไว้แล้วถามในช่วง Q&amp;A ท้ายช่วง 15 นาที
                  </p>
                </div>

                {/* Tactic 2 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="font-black text-cyan-400 flex items-center gap-2 text-sm">
                    <span>2. ใช้เครื่องมือ Interactive Simulator บนเว็บตอบแทน</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    ไม่ต้องเสียเวลาอธิบายด้วยคำพูดซ้ำ ให้ผู้เรียนเปิดตัวจำลองบนหน้าจอ:
                    <br />&bull; เรื่องแสงสะท้อน &rarr; ให้กดเล่นตัวจำลองตัดแสง Polarizer บนเว็บ
                    <br />&bull; เรื่องภาพเบี้ยว &rarr; ให้เลื่อนสไลเดอร์ Shutter Speed ดูเอง
                  </p>
                </div>

                {/* Tactic 3 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="font-black text-emerald-400 flex items-center gap-2 text-sm">
                    <span>3. เทคนิคตอบคำถามซ้ำโดยไม่พูดซ้ำ (ชี้เป้า)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    ถ้ามีคนถามคำถามเดิมซ้ำ อย่าอธิบายใหม่ตั้งแต่ต้นด้วยคำพูด ให้ใช้เทคนิค <strong>"ชี้เป้า"</strong>: 
                    <br /><em>&ldquo;คำตอบเรื่องชนิดของแสงข้อนี้ อยู่ในตารางสรุป Lighting Cheat Sheet ในโมดูลที่ 2 บนหน้าจอครับ เปิดดูแล้วเทียบตามชิ้นงานได้เลยครับ&rdquo;</em>
                  </p>
                </div>

                {/* Tactic 4 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="font-black text-purple-400 flex items-center gap-2 text-sm">
                    <span>4. ระบบจับคู่บัดดี้ (Peer Debugging)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    จัดโต๊ะนั่งแบบคู่ (คนใช้คอมคล่อง นั่งข้างคนที่ช้ากว่าเล็กน้อย) ก่อนจะยกมือถามอาจารย์ ให้บัดดี้ข้างๆ ช่วยเช็คหน้าจอก่อน 1 รอบ จะลดคำถามจิปาถะลงได้มากกว่า 70%!
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-slate-400">
            {isVision 
              ? 'หลักสูตร Machine Vision ได้รับการบันทึกลงในฐานข้อมูล SQL Server (Skill ID: 16) เรียบร้อยแล้ว'
              : 'หลักสูตร Enterprise App ได้รับการบันทึกลงในฐานข้อมูล SQL Server (Skill ID: 15) เรียบร้อยแล้ว'
            }
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            เข้าใจแล้ว &middot; ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
