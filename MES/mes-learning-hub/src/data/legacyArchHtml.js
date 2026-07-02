export const legacyArchHtml = `

    <!-- HERO -->
    <div class="hero">
        <div class="hero-badge">&#128218; LEARNING GUIDE</div>
        <h1>ทำความรู้จักระบบ MES Toolbox ใหม่</h1>
        <p>เรียนรู้แบบ Step-by-Step ว่าทำไมเราถึงเปลี่ยนมาใช้ React + Vite<br>และวิธีการทำงานร่วมกันของทีม</p>
        <div class="scroll-hint">เลื่อนลงเพื่อเริ่มเรียนรู้<span class="arrow"></span></div>
    </div>

    <!-- SECTION 1 -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">1</div>
            <h2>ปัญหาของระบบเก่า vs ระบบใหม่</h2>
            <p class="subtitle">ก่อนจะเข้าใจว่า Vite คืออะไร มาดูก่อนว่าทำไมเราถึงต้องเปลี่ยน</p>
        </div>
        <div class="compare-grid observe-me">
            <div class="compare-card old">
                <div class="tag">&#10060; ระบบเก่า (PHP หลายหน้า)</div>
                <h3>Multi-Page Application</h3>
                <p>ทุกครั้งที่คลิกเมนู เบราว์เซอร์ต้อง <strong>โหลดหน้าใหม่ทั้งหมด</strong> — จอกระพริบขาว, Header/Sidebar โหลดซ้ำ, ช้า</p>
                <div style="margin-top:1rem;text-align:center;font-size:2rem;">&#128196; &#8594; &#128196; &#8594; &#128196; &#8594; &#128196;</div>
                <p style="text-align:center;margin-top:0.5rem;font-size:0.8rem;">แต่ละหน้าเป็นคนละไฟล์ .php</p>
            </div>
            <div class="compare-card new">
                <div class="tag">&#10003; ระบบใหม่ (React SPA)</div>
                <h3>Single Page Application</h3>
                <p>โหลดเข้ามา <strong>ครั้งเดียว</strong> แล้วหลังจากนั้นจะสลับเปลี่ยนเฉพาะเนื้อหาตรงกลาง — ไม่กระพริบ, เร็วมาก, ลื่นไหล</p>
                <div style="margin-top:1rem;text-align:center;font-size:2rem;">&#128241; (แอปเดียว)</div>
                <p style="text-align:center;margin-top:0.5rem;font-size:0.8rem;">ให้ความรู้สึกเหมือนเปิดแอปมือถือ</p>
            </div>
        </div>
    </div>

    <!-- SECTION 2 -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">2</div>
            <h2>แล้ว Vite ทำหน้าที่อะไรในระบบใหม่?</h2>
            <p class="subtitle">Vite (อ่านว่า "วีต") คือ "เครื่องแปลภาษา" ที่แปลงโค้ดที่เราเขียนให้เบราว์เซอร์เข้าใจ</p>
        </div>
        <div class="observe-me">
            <p style="margin-bottom:1.5rem;color:var(--text-dim);">โค้ดที่เราเขียน (React JSX, Tailwind CSS) นั้น <strong style="color:var(--warning)">เบราว์เซอร์อ่านไม่ออก</strong> โดยตรง จำเป็นต้องมี Vite มาทำหน้าที่แปลงและมัดรวมให้เป็นไฟล์ JS/CSS ธรรมดาที่เบราว์เซอร์เข้าใจ</p>
        </div>
        <div class="flow-container" id="viteFlow">
            <div class="flow-box" data-delay="0"><div class="icon">&#9883;&#65039;</div><div class="label">.jsx</div><div class="sub">React Components</div></div>
            <div class="flow-arrow">&#8594;</div>
            <div class="flow-box" data-delay="200"><div class="icon">&#127912;</div><div class="label">.css</div><div class="sub">Tailwind CSS</div></div>
            <div class="flow-arrow">&#8594;</div>
            <div class="flow-box vite-box" data-delay="500"><div class="icon">&#9889;</div><div class="label" style="color:var(--primary-light);font-size:1rem;">Vite</div><div class="sub">แปลง + มัดรวม</div></div>
            <div class="flow-arrow">&#8594;</div>
            <div class="flow-box dist-box" data-delay="800"><div class="icon">&#128230;</div><div class="label" style="color:var(--success);">dist/</div><div class="sub">พร้อมใช้งาน!</div></div>
        </div>
        <div class="observe-me">
            <p style="margin-bottom:1rem;font-weight:600;">&#128187; ลองกดปุ่มด้านล่างเพื่อจำลองว่าเกิดอะไรขึ้นเมื่อรัน <code style="color:var(--success)">npm run build</code>:</p>
        </div>
        <div class="demo-container">
            <div class="demo-titlebar">
                <div class="demo-dot red"></div><div class="demo-dot yellow"></div><div class="demo-dot green"></div>
                <span>Terminal — PowerShell</span>
            </div>
            <div class="demo-body" id="terminalBody">
                <div class="terminal-line visible"><span class="prompt">PS C:\mes-toolbox&gt; </span><span class="cmd" id="terminalPrompt">_</span></div>
            </div>
            <div style="padding:0 1.5rem 1.5rem;">
                <button class="btn-glow" id="runBuildBtn" onclick="runBuildDemo()">&#9654; จำลองรัน npm run build</button>
            </div>
        </div>
    </div>

    <!-- SECTION 3 -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">3</div>
            <h2>Tailwind CSS คืออะไร?</h2>
            <p class="subtitle">วิธีจัดหน้าตาเว็บแบบใหม่ — ไม่ต้องเขียน CSS แยกไฟล์อีกต่อไป</p>
        </div>
        <div class="compare-grid observe-me">
            <div class="compare-card old">
                <div class="tag">&#127912; CSS แบบเดิม</div>
                <h3>เขียน CSS แยกไฟล์</h3>
                <div style="background:var(--bg);border-radius:10px;padding:1rem;margin-top:0.8rem;font-family:'JetBrains Mono',monospace;font-size:0.75rem;line-height:1.8;">
                    <div style="color:var(--text-dim);">/* style.css */</div>
                    <div><span style="color:#f59e0b;">.card</span> {</div>
                    <div style="padding-left:1rem;"><span style="color:var(--accent);">background</span>: white;</div>
                    <div style="padding-left:1rem;"><span style="color:var(--accent);">border-radius</span>: 12px;</div>
                    <div style="padding-left:1rem;"><span style="color:var(--accent);">padding</span>: 16px;</div>
                    <div>}</div>
                    <div style="margin-top:0.5rem;color:var(--text-dim);">/* ต้องเขียนอีกไฟล์ + ตั้งชื่อ class */</div>
                </div>
            </div>
            <div class="compare-card new">
                <div class="tag">&#9889; Tailwind CSS</div>
                <h3>เขียนตรงใน HTML เลย</h3>
                <div style="background:var(--bg);border-radius:10px;padding:1rem;margin-top:0.8rem;font-family:'JetBrains Mono',monospace;font-size:0.75rem;line-height:1.8;">
                    <div style="color:var(--text-dim);">&lt;!-- ไม่ต้องเขียน CSS แยก --&gt;</div>
                    <div>&lt;div class="</div>
                    <div style="padding-left:1rem;"><span style="color:var(--success);">bg-white</span></div>
                    <div style="padding-left:1rem;"><span style="color:var(--accent);">rounded-xl</span></div>
                    <div style="padding-left:1rem;"><span style="color:var(--warning);">p-4</span></div>
                    <div style="padding-left:1rem;"><span style="color:var(--primary-light);">shadow-md</span></div>
                    <div>"&gt;</div>
                    <div style="margin-top:0.5rem;color:var(--success);">&#10003; จบในบรรทัดเดียว!</div>
                </div>
            </div>
        </div>
        <!-- Tailwind Playground -->
        <div class="observe-me">
            <p style="margin-bottom:1rem;font-weight:600;">&#129514; ลองกดปุ่มด้านล่างเพื่อดูว่า Tailwind class แต่ละตัวทำอะไร:</p>
        </div>
        <div class="demo-container observe-me">
            <div class="demo-titlebar"><div class="demo-dot red"></div><div class="demo-dot yellow"></div><div class="demo-dot green"></div><span>Tailwind CSS — Interactive Playground</span></div>
            <div class="demo-body" style="display:flex;flex-direction:column;gap:1rem;">
                <div style="display:flex;align-items:center;justify-content:center;min-height:120px;background:var(--bg);border-radius:12px;padding:1.5rem;">
                    <div id="twPreview" style="padding:8px 16px;color:#334155;transition:all 0.4s ease;">สวัสดี Tailwind! &#127912;</div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                    <button class="tw-btn" onclick="twToggle(this,'backgroundColor','#ffffff','bg-white')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">bg-white</button>
                    <button class="tw-btn" onclick="twToggle(this,'backgroundColor','#3b82f6','bg-blue-500')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">bg-blue-500</button>
                    <button class="tw-btn" onclick="twToggle(this,'backgroundColor','#10b981','bg-emerald-500')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">bg-emerald-500</button>
                    <button class="tw-btn" onclick="twToggle(this,'borderRadius','12px','rounded-xl')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">rounded-xl</button>
                    <button class="tw-btn" onclick="twToggle(this,'borderRadius','9999px','rounded-full')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">rounded-full</button>
                    <button class="tw-btn" onclick="twToggle(this,'padding','24px','p-6')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">p-6</button>
                    <button class="tw-btn" onclick="twToggle(this,'boxShadow','0 10px 25px rgba(0,0,0,0.3)','shadow-xl')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">shadow-xl</button>
                    <button class="tw-btn" onclick="twToggle(this,'fontSize','1.5rem','text-2xl')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">text-2xl</button>
                    <button class="tw-btn" onclick="twToggle(this,'fontWeight','700','font-bold')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">font-bold</button>
                    <button class="tw-btn" onclick="twToggle(this,'border','2px solid #6366f1','border-2')" style="border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all 0.2s;">border-2</button>
                    <button onclick="twReset()" style="border:1px solid var(--danger);background:rgba(239,68,68,0.1);color:var(--danger);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.8rem;cursor:pointer;font-family:'JetBrains Mono',monospace;">&#128260; Reset</button>
                </div>
                <div style="background:var(--bg);border-radius:8px;padding:0.8rem 1rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;">
                    <span style="color:var(--text-dim);">class="</span><span id="twClassList" style="color:var(--success);"></span><span style="color:var(--text-dim);">"</span>
                </div>
            </div>
        </div>
        <div class="observe-me" style="margin-top:1.5rem;">
            <div style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:1.2rem 1.5rem;">
                <h3 style="color:var(--accent);font-weight:700;margin-bottom:0.5rem;">&#128161; สรุปข้อดีของ Tailwind CSS</h3>
                <ul style="color:var(--text-dim);font-size:0.9rem;list-style:none;padding:0;">
                    <li style="margin-bottom:0.4rem;">&#10003; <strong style="color:var(--text);">เร็วกว่า</strong> — ไม่ต้องสลับไปมาระหว่างไฟล์ HTML กับ CSS</li>
                    <li style="margin-bottom:0.4rem;">&#10003; <strong style="color:var(--text);">ไม่ต้องคิดชื่อ class</strong> — ไม่ต้องปวดหัวว่าจะตั้งชื่อว่า <code style="font-size:0.8rem;">.card-wrapper-inner-box</code></li>
                    <li style="margin-bottom:0.4rem;">&#10003; <strong style="color:var(--text);">ไฟล์ CSS เล็กมาก</strong> — Vite จะตัด class ที่ไม่ได้ใช้ออกให้อัตโนมัติ</li>
                    <li>&#10003; <strong style="color:var(--text);">ดูแลง่าย</strong> — เปิดไฟล์มาก็เห็นทุกอย่างรวมกันอยู่ที่เดียว</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- SECTION 4: SPA Demo -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">4</div>
            <h2>สาธิตการทำงานของ SPA</h2>
            <p class="subtitle">ลองกดเมนูด้านซ้ายเพื่อดูว่า "พื้นที่ตรงกลางเปลี่ยน แต่ Header/Sidebar ไม่โหลดซ้ำ"</p>
        </div>
        <div class="spa-demo observe-me">
            <div class="spa-layout">
                <div class="spa-header"><div class="logo">&#9881;&#65039; MES Toolbox</div><div class="user-info">&#128100; Admin</div></div>
                <div class="spa-sidebar">
                    <div class="spa-sidebar-item active" onclick="switchPage('dashboard',this)">&#128202; Dashboard</div>
                    <div class="spa-sidebar-item" onclick="switchPage('production',this)">&#127981; Production</div>
                    <div class="spa-sidebar-item" onclick="switchPage('maintenance',this)">&#128295; Maintenance</div>
                    <div class="spa-sidebar-item" onclick="switchPage('quality',this)">&#128737;&#65039; Quality</div>
                </div>
                <div class="spa-content">
                    <div class="spa-page active" id="page-dashboard">
                        <h3>&#128202; Dashboard — ภาพรวมระบบ</h3><p>แสดงข้อมูลสรุปการผลิตประจำวัน</p>
                        <div class="mock-chart"><div class="mock-bar" style="height:60%"></div><div class="mock-bar" style="height:80%"></div><div class="mock-bar" style="height:45%"></div><div class="mock-bar" style="height:90%"></div><div class="mock-bar" style="height:70%"></div><div class="mock-bar" style="height:55%"></div><div class="mock-bar" style="height:85%"></div></div>
                    </div>
                    <div class="spa-page" id="page-production">
                        <h3>&#127981; Production — บันทึกผลผลิต</h3><p>ตรวจสอบและบันทึกข้อมูลการผลิตแต่ละไลน์</p>
                        <table class="mock-table"><tr><td>Machine</td><td>Status</td><td>Output</td></tr><tr><td>Line A</td><td style="color:var(--success)">&#9679; Running</td><td>1,250</td></tr><tr><td>Line B</td><td style="color:var(--warning)">&#9679; Idle</td><td>890</td></tr><tr><td>Line C</td><td style="color:var(--success)">&#9679; Running</td><td>1,100</td></tr></table>
                    </div>
                    <div class="spa-page" id="page-maintenance">
                        <h3>&#128295; Maintenance — ซ่อมบำรุง</h3><p>รายการแจ้งซ่อมและสถานะล่าสุด</p>
                        <table class="mock-table"><tr><td>Job</td><td>Priority</td><td>Status</td></tr><tr><td>MT-0042</td><td style="color:var(--danger)">สูง</td><td>กำลังดำเนินการ</td></tr><tr><td>MT-0041</td><td style="color:var(--warning)">กลาง</td><td>รอตรวจสอบ</td></tr></table>
                    </div>
                    <div class="spa-page" id="page-quality">
                        <h3>&#128737;&#65039; Quality — คุณภาพ</h3><p>ระบบตรวจสอบคุณภาพและ NCR/CAR</p>
                        <div class="mock-chart"><div class="mock-bar" style="height:20%;background:linear-gradient(to top,var(--success),#34d399)"></div><div class="mock-bar" style="height:15%;background:linear-gradient(to top,var(--success),#34d399)"></div><div class="mock-bar" style="height:40%;background:linear-gradient(to top,var(--warning),#fbbf24)"></div><div class="mock-bar" style="height:10%;background:linear-gradient(to top,var(--success),#34d399)"></div><div class="mock-bar" style="height:25%;background:linear-gradient(to top,var(--success),#34d399)"></div></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="spa-note observe-me"><span class="pulse-dot"></span>สังเกตไหมว่า Header กับ Sidebar ไม่โหลดซ้ำเลย — นี่คือพลังของ SPA!</div>
    </div>

    <!-- SECTION 5: Folder Structure -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">5</div>
            <h2>โครงสร้างโฟลเดอร์ของโปรเจกต์</h2>
            <p class="subtitle">ไฟล์ทั้งหมดถูกจัดเรียงอย่างเป็นระเบียบ เข้าใจง่าย หาง่าย</p>
        </div>
        <div class="tree-container" id="folderTree">
            <div class="tree-item" style="padding-left:0" data-delay="0"><span class="icon">&#128194;</span><span class="highlight-name">mes-toolbox/</span></div>
            <div class="tree-item" data-delay="80"><span class="icon">&#128196;</span><span class="name">index.html</span><span class="desc">&#8592; หน้าทางเข้าหลัก (มีอันเดียว!)</span></div>
            <div class="tree-item" data-delay="160"><span class="icon">&#128196;</span><span class="name">package.json</span><span class="desc">&#8592; บอกว่าใช้ Library อะไรบ้าง</span></div>
            <div class="tree-item" data-delay="240"><span class="icon">&#128196;</span><span class="name">vite.config.js</span><span class="desc">&#8592; ตั้งค่าการ Build</span></div>
            <div class="tree-item" data-delay="320"><span class="icon">&#128194;</span><span class="highlight-name">src/</span><span class="desc">&#8592; &#11088; โค้ดทั้งหมดของเราอยู่ในนี้!</span></div>
            <div class="tree-item" style="padding-left:3rem" data-delay="400"><span class="icon">&#128196;</span><span class="name">main.jsx</span><span class="desc">&#8592; จุดเริ่มต้นของ React</span></div>
            <div class="tree-item" style="padding-left:3rem" data-delay="480"><span class="icon">&#128196;</span><span class="name">App.jsx</span><span class="desc">&#8592; จัดการเส้นทาง URL ทุกหน้า</span></div>
            <div class="tree-item" style="padding-left:3rem" data-delay="560"><span class="icon">&#128194;</span><span class="highlight-name">components/</span><span class="desc">&#8592; ชิ้นส่วนที่ใช้ซ้ำ (Header, Sidebar)</span></div>
            <div class="tree-item" style="padding-left:3rem" data-delay="640"><span class="icon">&#128194;</span><span class="highlight-name">pages/</span><span class="desc">&#8592; หน้าเว็บแต่ละหน้า แยกโฟลเดอร์</span></div>
            <div class="tree-item" style="padding-left:4.5rem" data-delay="720"><span class="icon">&#128193;</span><span class="name">production/</span></div>
            <div class="tree-item" style="padding-left:4.5rem" data-delay="800"><span class="icon">&#128193;</span><span class="name">sales/</span></div>
            <div class="tree-item" style="padding-left:4.5rem" data-delay="880"><span class="icon">&#128193;</span><span class="name">admin/</span></div>
            <div class="tree-item" data-delay="960"><span class="icon">&#128194;</span><span class="highlight-name" style="color:var(--success)">dist/</span><span class="desc">&#8592; &#128230; ผลลัพธ์จาก Build ที่พร้อมอัปโหลดขึ้นเซิร์ฟเวอร์</span></div>
        </div>
    </div>

    <!-- SECTION 6: Workflow -->
    <div class="section-divider"></div>
    <div class="arch-section">
        <div class="observe-me">
            <div class="section-number">6</div>
            <h2>ขั้นตอนการทำงานร่วมกัน</h2>
            <p class="subtitle">วิธีแบ่งงานในทีม — ใครทำอะไร ตอนไหน แบบเข้าใจง่าย</p>
        </div>
        <div class="workflow-timeline">
            <div class="wf-step"><div class="dot"></div><div class="wf-card"><div class="wf-who team">&#128101; ทุกคนในทีม</div><div class="wf-title">① พัฒนาโค้ดบนเครื่องตัวเอง</div><div class="wf-desc">สมาชิกทุกคนสามารถเขียน/แก้โค้ดในโฟลเดอร์ <code style="color:var(--accent)">src/</code> ได้เลยบนเครื่องตัวเอง เปิดดูผลลัพธ์แบบเรียลไทม์ด้วยคำสั่ง:</div><div class="wf-cmd">npm run dev</div></div></div>
            <div class="wf-step"><div class="dot"></div><div class="wf-card"><div class="wf-who team">&#128101; ทุกคนในทีม &#8594; &#128081; ผู้ดูแลหลัก</div><div class="wf-title">② ส่งมอบโค้ดที่แก้ไข</div><div class="wf-desc">พอทำเสร็จแล้ว ให้ส่งไฟล์ที่แก้ไขมาให้ <strong>ผู้ดูแลหลัก</strong> โดยจะใช้ <strong>Git</strong> (แนะนำที่สุด), ส่งไฟล์ทางแชท, หรือก๊อปลง Flash Drive ก็ได้</div></div></div>
            <div class="wf-step"><div class="dot"></div><div class="wf-card"><div class="wf-who lead">&#128081; ผู้ดูแลหลักเท่านั้น</div><div class="wf-title">③ รวมโค้ด + Build</div><div class="wf-desc">ผู้ดูแลหลักจะนำโค้ดทุกคนมารวมกัน ตรวจสอบ แล้วรันคำสั่ง Build เพื่อแพ็คไฟล์สำหรับเซิร์ฟเวอร์</div><div class="wf-cmd">npm run build</div></div></div>
            <div class="wf-step"><div class="dot"></div><div class="wf-card"><div class="wf-who lead">&#128081; ผู้ดูแลหลักเท่านั้น</div><div class="wf-title">④ อัปโหลดขึ้นเซิร์ฟเวอร์ (FileZilla)</div><div class="wf-desc">นำเฉพาะโฟลเดอร์ <code style="color:var(--success)">dist/</code> ไปลากโยนทับบนเซิร์ฟเวอร์ผ่าน FileZilla เหมือนเดิม! <br><strong style="color:var(--warning)">สำคัญ:</strong> อัปโหลดแค่โฟลเดอร์ <code style="color:var(--success)">dist/</code> เท่านั้น</div></div></div>
        </div>
    </div>

    <div class="arch-footer">
        <p>เอกสารสรุปความรู้ระบบ <strong>MES Toolbox</strong></p>
        <p>พัฒนาด้วย React + Vite + Tailwind CSS | สร้างสื่อการสอนโดย <span class="heart">&#9829;</span> Oat</p>
    </div>
`;