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
  FiBookOpen
} from 'react-icons/fi';

export default function TrainerGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'scripts' | 'tactics'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-purple-500/40 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border-b border-purple-500/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 text-lg font-bold">
              📘
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>คู่มือวิทยากรและแผนการสอน 3 วัน</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Trainer Guide
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                หลักสูตร Enterprise Application Design, Development &amp; Integration (BOI STEMPlus &middot; 24 ชม.)
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

        {/* Tab Buttons */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex gap-2 overflow-x-auto flex-shrink-0">
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
          
          {/* TAB 1: 3-DAY TIMETABLE & LABS */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-purple-200 text-xs leading-relaxed">
                💡 <strong>โครงสร้าง 3 วันเข้มข้น (วันละ 8 ชั่วโมง รวม 24 ชม.):</strong> เน้นให้ผู้เรียนเข้าใจสถาปัตยกรรมระดับภาพรวมในวันแรก ลงมือเขียนโค้ดและเชื่อมโยง API ในวันที่สอง และทำ IoT Webhook พร้อมสอบวัดผลในวันสุดท้าย
              </div>

              {/* Day 1 */}
              <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/60">
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
              <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/60">
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
              <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/60">
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
            </div>
          )}

          {/* TAB 2: SPEAKER SCRIPTS & KEY TALKING POINTS */}
          {activeTab === 'scripts' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
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

            </div>
          )}

          {/* TAB 3: FRUSTRATION-FREE TEACHING TACTICS */}
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
                    <span>2. ใช้ TA เป็นกันชนคำถามหน้างาน</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    อย่าเดินไปดูหน้าจอผู้เรียนเองเวลามีคนทำไม่ทัน ให้ TA (ผู้ช่วยสอน) เดินไปประกบและกดให้ดู ท่านยืนคุมจังหวะภาพรวมอยู่หน้าห้อง จะได้ไม่เสียสมาธิและไม่เหนื่อย
                  </p>
                </div>

                {/* Tactic 3 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="font-black text-emerald-400 flex items-center gap-2 text-sm">
                    <span>3. เทคนิคตอบคำถามซ้ำโดยไม่พูดซ้ำ</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    ถ้ามีคนถามคำถามเดิมซ้ำ อย่าอธิบายใหม่ตั้งแต่ต้นด้วยคำพูด ให้ใช้เทคนิค <strong>"ชี้เป้า"</strong>: 
                    <br /><em>&ldquo;คำตอบและโค้ดตัวอย่างของข้อนี้ อยู่ในหัวข้อที่ 2 ข้อความแถบสีส้มบนหน้าจอครับ เปิดดูแล้วก็อปปี้มาวางได้เลยครับ&rdquo;</em>
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
            หลักสูตรนี้ได้รับการรับรองบนฐานข้อมูล SQL Server และระบบเกรด 4 มิติเรียบร้อยแล้ว
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
