
    // ===== TOP TAB SWITCH =====
    function switchTab(n) {
        document.querySelectorAll('.tab-panel').forEach(function(p,i){ p.classList.toggle('active', i===n-1); });
        document.querySelectorAll('.tab-btn').forEach(function(b,i){ b.classList.toggle('active', i===n-1); });
        if (n === 2) { initQuiz(); }
    }

    // ===== HUB SUB-SECTION SWITCH =====
    function showHub(id, btn) {
        document.querySelectorAll('.hub-section').forEach(function(s){ s.classList.remove('active'); });
        document.querySelectorAll('.sub-pill').forEach(function(p){ p.classList.remove('active'); });
        document.getElementById(id).classList.add('active');
        if (btn) btn.classList.add('active');
        if (id === 'hquiz') initQuiz();
    }

    // ===== ACCORDION =====
    function togglePanel(id) {
        document.getElementById(id).classList.toggle('open');
    }

    // ===== SCROLL ANIMATIONS (Tab 1) =====
    var scrollObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (e.isIntersecting) { e.target.classList.add('in-view'); scrollObserver.unobserve(e.target); }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.observe-me').forEach(function(el){ scrollObserver.observe(el); });

    // ===== VITE FLOW ANIMATION =====
    var flowObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (!e.isIntersecting) return;
            var boxes = e.target.querySelectorAll('.flow-box');
            var arrows = e.target.querySelectorAll('.flow-arrow');
            boxes.forEach(function(b,i){ setTimeout(function(){ b.classList.add('visible'); }, parseInt(b.dataset.delay)||i*300); });
            arrows.forEach(function(a,i){ setTimeout(function(){ a.classList.add('visible'); }, 200+i*300); });
            flowObserver.unobserve(e.target);
        });
    }, { threshold: 0.3 });
    var vf = document.getElementById('viteFlow');
    if (vf) flowObserver.observe(vf);

    // ===== FOLDER TREE =====
    var treeObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (!e.isIntersecting) return;
            e.target.querySelectorAll('.tree-item').forEach(function(item){
                setTimeout(function(){ item.classList.add('visible'); }, parseInt(item.dataset.delay)||0);
            });
            treeObserver.unobserve(e.target);
        });
    }, { threshold: 0.2 });
    var ft = document.getElementById('folderTree');
    if (ft) treeObserver.observe(ft);

    // ===== WORKFLOW TIMELINE =====
    var wfObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (!e.isIntersecting) return;
            document.querySelectorAll('.wf-step').forEach(function(s,i){
                setTimeout(function(){ s.classList.add('visible'); }, i*250);
            });
            wfObserver.unobserve(e.target);
        });
    }, { threshold: 0.1 });
    var tl = document.querySelector('.workflow-timeline');
    if (tl) wfObserver.observe(tl);

    // ===== SPA PAGE SWITCH =====
    function switchPage(pageId, el) {
        document.querySelectorAll('.spa-page').forEach(function(p){
            p.classList.remove('active');
            p.style.removeProperty('opacity'); p.style.removeProperty('transform'); p.style.removeProperty('transition');
        });
        document.querySelectorAll('.spa-sidebar-item').forEach(function(s){ s.classList.remove('active'); });
        var page = document.getElementById('page-'+pageId);
        if (page) {
            page.style.transition = 'none'; page.style.opacity = '0'; page.style.transform = 'translateY(20px)';
            page.classList.add('active');
            requestAnimationFrame(function(){ requestAnimationFrame(function(){
                page.style.transition = 'all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)';
                page.style.opacity = '1'; page.style.transform = 'translateY(0)';
            }); });
        }
        if (el) el.classList.add('active');
    }

    // ===== TERMINAL DEMO =====
    var buildRunning = false;
    function runBuildDemo() {
        if (buildRunning) return;
        buildRunning = true;
        var btn = document.getElementById('runBuildBtn');
        btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none';
        var body = document.getElementById('terminalBody');
        body.innerHTML = '';
        var lines = [
            { text: '<span class="prompt">PS C:\\mes-toolbox&gt; </span><span class="cmd">npm run build</span>', delay: 0 },
            { text: '<span class="output">&gt; mes-toolbox@0.0.0 build</span>', delay: 600 },
            { text: '<span class="output">&gt; vite build</span>', delay: 800 },
            { text: '<span class="highlight">vite v6.3.5</span> <span class="output">building for production...</span>', delay: 1200 },
            { text: '<span class="output">transforming (148) </span><span class="warn">src/pages/Dashboard.jsx...</span>', delay: 1800 },
            { text: '<span class="output">transforming (148) </span><span class="warn">src/pages/production/MachineCockpit.jsx...</span>', delay: 2400 },
            { text: '<span class="output">&#10003; 148 modules transformed.</span>', delay: 3200 },
            { text: '<span class="output">rendering chunks (4)...</span>', delay: 3800 },
            { text: '<span class="ok">dist/index.html</span>                    <span class="output">0.46 kB</span>', delay: 4400 },
            { text: '<span class="ok">dist/assets/index-BQsyq2IA.css</span>    <span class="output">38.72 kB</span>', delay: 4600 },
            { text: '<span class="ok">dist/assets/index-CoCPcntX.js</span>     <span class="output">245.18 kB</span>', delay: 4800 },
            { text: '<span class="output"></span>', delay: 5200 },
            { text: '<span class="ok">&#10003; built in 3.24s</span>', delay: 5400 },
            { text: '<span class="output">&#128230; พร้อมอัปโหลด dist/ ขึ้นเซิร์ฟเวอร์!</span>', delay: 5800 }
        ];
        lines.forEach(function(l) {
            setTimeout(function() {
                var div = document.createElement('div');
                div.className = 'terminal-line visible'; div.innerHTML = l.text;
                body.appendChild(div); body.scrollTop = body.scrollHeight;
            }, l.delay);
        });
        setTimeout(function() {
            btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; buildRunning = false;
        }, 7000);
    }

    // ===== TAILWIND PLAYGROUND =====
    var twStyles = {};
    var twClasses = [];
    function twToggle(btn, prop, val, cls) {
        if (twStyles[prop] === val) {
            delete twStyles[prop];
            twClasses = twClasses.filter(function(c){ return c !== cls; });
            btn.style.background = 'var(--surface2)'; btn.style.color = 'var(--text)';
        } else {
            twStyles[prop] = val;
            if (!twClasses.includes(cls)) twClasses.push(cls);
            btn.style.background = 'rgba(16,185,129,0.2)'; btn.style.color = '#6ee7b7';
        }
        var prev = document.getElementById('twPreview');
        Object.keys(twStyles).forEach(function(k){ prev.style[k] = twStyles[k]; });
        document.getElementById('twClassList').textContent = twClasses.join(' ');
    }
    function twReset() {
        twStyles = {}; twClasses = [];
        var prev = document.getElementById('twPreview');
        prev.removeAttribute('style'); prev.style.padding = '8px 16px'; prev.style.color = '#334155'; prev.style.transition = 'all 0.4s ease';
        document.getElementById('twClassList').textContent = '';
        document.querySelectorAll('.tw-btn').forEach(function(b){ b.style.background = 'var(--surface2)'; b.style.color = 'var(--text)'; });
    }

    // ===== QUIZ =====
    var questions = [
        { q:"ระบบ SSR (Server-Side Rendering) แบบ PHP แตกต่างจาก SPA (React) อย่างไร?", opts:["SSR ส่ง HTML ใหม่ทั้งหน้าทุก Request, SPA ดึงเฉพาะ JSON แล้ว Update DOM","SSR ใช้ JavaScript, SPA ใช้ PHP","SSR เร็วกว่า SPA เสมอ","ทั้งสองแบบทำงานเหมือนกัน"], ans:0, explain:"SSR (PHP) สร้าง HTML ใหม่ทั้งหน้าทุกครั้ง ส่วน SPA (React) โหลด JS ครั้งเดียว แล้วดึงเฉพาะ JSON มา Update เฉพาะส่วนที่เปลี่ยน", cat:"หมวด 1: Architecture" },
        { q:"Decoupled Architecture มีข้อดีต่อการเชื่อมต่อ SAP อย่างไร?", opts:["ทำให้เซิร์ฟเวอร์ทำงานช้าลง","Backend กลายเป็น API Gateway ที่ SAP สามารถเรียกใช้ได้โดยตรง","Frontend และ Backend ต้องอยู่ในเซิร์ฟเวอร์เดียวกัน","ทำให้ต้องเขียนโค้ดมากขึ้น"], ans:1, explain:"เมื่อ Backend เป็น API Gateway, SAP หรือระบบอื่นสามารถเรียก API เดิมได้โดยไม่ต้องพัฒนา Interface ใหม่", cat:"หมวด 1: Architecture" },
        { q:"Vite ทำหน้าที่อะไรในโปรเจกต์ React?", opts:["เป็น CSS Framework เหมือน Bootstrap","เป็น Build Tool ที่แปลง JSX/Tailwind ให้เป็น JS/CSS ที่เบราว์เซอร์เข้าใจ","เป็น Backend Framework เหมือน Express","เป็น Database ORM"], ans:1, explain:"Vite คือ Build Tool ที่แปลงโค้ด JSX และ Tailwind ที่เบราว์เซอร์อ่านไม่ออก ให้กลายเป็นไฟล์ JS/CSS ธรรมดา พร้อม HMR สำหรับ Development", cat:"หมวด 1: Architecture" },
        { q:"SQL Injection ป้องกันได้อย่างไรใน PHP?", opts:["ใช้ htmlspecialchars() กับทุก Input","ใช้ CSRF Token ใน Header","ใช้ PDO Prepared Statements (Parameterized Query)","ตรวจสอบสิทธิ์ผู้ใช้ก่อนรัน Query"], ans:2, explain:"PDO Prepared Statement แยก SQL Command ออกจากตัวแปร ทำให้ Input ของผู้ใช้ถูกมองเป็นข้อมูลเสมอ ไม่ใช่คำสั่ง SQL", cat:"หมวด 2: Security" },
        { q:"CSRF Attack คืออะไร?", opts:["การแทรก Script เข้าไปในหน้าเว็บ","การเดา ID ของ Record คนอื่น","การหลอกให้ผู้ใช้ที่ Login อยู่ส่งคำสั่งโดยไม่ตั้งใจ","การ Brute Force Password"], ans:2, explain:"CSRF หลอกให้ User ที่ Login อยู่กด Link หรือปุ่มที่ส่ง Request ไปยัง Server โดยที่ User ไม่รู้ตัว ป้องกันโดยใช้ Cryptographic Token", cat:"หมวด 2: Security" },
        { q:"IDOR (Insecure Direct Object Reference) คืออะไร?", opts:["การใส่รหัสอันตรายใน URL","การเข้าถึงข้อมูล Record คนอื่นโดยการเดา/เปลี่ยน ID ใน URL","การส่ง Request ซ้ำๆ จนเซิร์ฟเวอร์ล่ม","การขโมย Session Cookie"], ans:1, explain:"IDOR เกิดเมื่อระบบไม่ตรวจสิทธิ์ก่อน เช่น /api/order?id=1001 เปลี่ยนเป็น id=1002 อาจดูข้อมูลคนอื่นได้ ป้องกันด้วย enforceRecordPermission()", cat:"หมวด 2: Security" },
        { q:"BOM (Bill of Materials) ในโมดูล PP คืออะไร?", opts:["รายงานสรุปยอดการผลิตรายวัน","รายการวัตถุดิบที่ต้องใช้ทำผลิตภัณฑ์ 1 หน่วย","ตารางบันทึกการซ่อมบำรุงเครื่องจักร","ใบแจ้งหนี้จากซัพพลายเออร์"], ans:1, explain:"BOM (Bill of Materials) หรือสูตรการผลิต บอกว่าต้องใช้วัตถุดิบอะไรบ้าง ปริมาณเท่าไร เพื่อผลิต 1 หน่วย", cat:"หมวด 3: Enterprise Modules" },
        { q:"ในโมดูล MM, Goods Issue คืออะไร?", opts:["การรับสินค้าจากซัพพลายเออร์เข้าคลัง","การออกใบกำกับภาษี","การเบิกวัตถุดิบออกจากคลังเพื่อใช้ในการผลิต","การตรวจสอบคุณภาพสินค้า"], ans:2, explain:"Goods Issue คือการเบิกวัตถุดิบออกจากคลัง (ตัด Stock) เพื่อใช้ในการผลิต ตรงข้ามกับ Goods Receipt", cat:"หมวด 3: Enterprise Modules" },
        { q:"โมดูล PM (Plant Maintenance) รับผิดชอบเรื่องใด?", opts:["ควบคุมคุณภาพสินค้าสำเร็จรูป","วางแผนการผลิตและจัดสรรเครื่องจักร","บันทึกการแจ้งซ่อมและ Downtime ของเครื่องจักร","จัดการใบสั่งซื้อวัตถุดิบ"], ans:2, explain:"PM (Plant Maintenance) ดูแลงานซ่อมบำรุง บันทึก Downtime และเชื่อมโยงกับ Production Order ที่ได้รับผลกระทบ", cat:"หมวด 3: Enterprise Modules" },
        { q:"BAPI/RFC ในบริบทของ SAP Integration คืออะไร?", opts:["ภาษาโปรแกรมที่ SAP พัฒนา","ฟังก์ชันมาตรฐานของ SAP ที่ระบบภายนอกเรียกใช้ได้โดยตรงผ่าน Network","ฐานข้อมูลกลางสำหรับ Staging ข้อมูล","Middleware สำหรับแปลง Protocol"], ans:1, explain:"BAPI คือฟังก์ชัน SAP ที่ expose ออกมาให้ระบบภายนอกเรียกได้ผ่าน RFC เช่น BAPI_GOODSMVT_CREATE", cat:"หมวด 4: Integration" },
        { q:"Staging Table มีประโยชน์อย่างไร?", opts:["ส่งข้อมูล Real-time ตรงระหว่างระบบ","เป็นตารางกลางที่แต่ละระบบ Batch Job มาอ่าน/เขียน โดยไม่ต้องยิง API หากันโดยตรง","ใช้เก็บ Log Error เท่านั้น","ทดแทน Message Queue ได้ทุกกรณี"], ans:1, explain:"Staging Table ช่วยให้ระบบทำงานแบบ Asynchronous — MES เขียนข้อมูล SAP Batch Job มาอ่านในเวลาที่กำหนด", cat:"หมวด 4: Integration" },
        { q:"Message Queue ช่วยแก้ปัญหาอะไรในระบบ MES-SAP Integration?", opts:["ช่วยให้ UI สวยงาม","ถ้า SAP ล่ม ข้อมูลจะพักในคิวและส่งใหม่เมื่อ SAP กลับมา Online การผลิตไม่หยุด","ทำให้ Database เร็วขึ้น 10 เท่า","แทน CSRF Token"], ans:1, explain:"Message Queue ทำให้ระบบทนทานต่อ Fault — MES ส่งข้อมูลลงคิวโดยไม่รอ SAP ถ้า SAP ล่ม ข้อมูลค้างในคิวและ Retry อัตโนมัติ", cat:"หมวด 4: Integration" }
    ];

    var currentQ = 0, score = 0, answered = false, quizInited = false;
    function initQuiz() {
        currentQ = 0; score = 0; answered = false;
        document.getElementById('scoreCard').classList.remove('show');
        document.getElementById('quizContent').style.display = '';
        renderQuestion();
    }
    function renderQuestion() {
        var q = questions[currentQ];
        document.getElementById('quizTitle').textContent = q.cat;
        document.getElementById('quizQ').textContent = (currentQ+1)+'. '+q.q;
        document.getElementById('quizProg').textContent = 'ข้อ '+(currentQ+1)+' / '+questions.length;
        document.getElementById('quizProgressBar').style.width = ((currentQ/questions.length)*100)+'%';
        document.getElementById('quizFb').className = 'quiz-fb';
        document.getElementById('quizNextBtn').style.display = 'none';
        answered = false;
        var keys = ['A','B','C','D'];
        var optsEl = document.getElementById('quizOpts');
        optsEl.innerHTML = '';
        q.opts.forEach(function(opt,i) {
            var btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.innerHTML = '<span class="opt-key">'+keys[i]+'</span>'+opt;
            btn.onclick = function(){ selectAnswer(i); };
            optsEl.appendChild(btn);
        });
    }
    function selectAnswer(chosen) {
        if (answered) return;
        answered = true;
        var q = questions[currentQ];
        var opts = document.querySelectorAll('.quiz-opt');
        opts.forEach(function(o){ o.classList.add('disabled'); });
        var fb = document.getElementById('quizFb');
        if (chosen === q.ans) {
            score++;
            opts[chosen].classList.add('correct');
            fb.className = 'quiz-fb show hub-alert hub-alert-success';
            fb.innerHTML = '<span class="hub-alert-icon">&#10003;</span><div><strong>ถูกต้อง!</strong> '+q.explain+'</div>';
        } else {
            opts[chosen].classList.add('wrong');
            opts[q.ans].classList.add('correct');
            fb.className = 'quiz-fb show hub-alert hub-alert-danger';
            fb.innerHTML = '<span class="hub-alert-icon">&#10007;</span><div><strong>ไม่ถูกต้อง</strong> — คำตอบที่ถูกคือ "'+q.opts[q.ans]+'"<br><br>'+q.explain+'</div>';
        }
        var nb = document.getElementById('quizNextBtn');
        nb.style.display = '';
        nb.textContent = currentQ < questions.length-1 ? 'ถัดไป \u2192' : 'ดูผลคะแนน \uD83C\uDF89';
    }
    function nextQuestion() {
        currentQ++;
        if (currentQ >= questions.length) { showScore(); } else { renderQuestion(); }
    }
    function showScore() {
        document.getElementById('quizContent').style.display = 'none';
        document.getElementById('scoreCard').classList.add('show');
        document.getElementById('scoreNum').textContent = score+' / '+questions.length;
        document.getElementById('quizProgressBar').style.width = '100%';
        var pct = (score/questions.length)*100;
        var lbl = pct>=90 ? 'ยอดเยี่ยม! เข้าใจเนื้อหาครบถ้วน' : pct>=70 ? 'ดีมาก! ลองทบทวนส่วนที่ผิด' : pct>=50 ? 'พอใช้ได้ แนะนำกลับไปอ่านใหม่' : 'ควรศึกษาเนื้อหาเพิ่มเติม';
        document.getElementById('scoreLbl').textContent = lbl;
    }
    function restartQuiz() { initQuiz(); }

    // ===== GRAPHIC ANIMATION ENGINE =====
    var animTimers = {};
    var genStates = {};
    var genConfig = {
        sqli: { atk: ['sqliA1','sqliA2','sqliA3','sqliA4'], def: ['sqliD1','sqliD2','sqliD3','sqliD4'] },
        xss:  { atk: ['xssA1','xssA2','xssA3','xssA4'],   def: ['xssD1','xssD2','xssD3','xssD4'] },
        idor: { atk: ['idorA1','idorA2','idorA3','idorA4'], def: ['idorD1','idorD2','idorD3','idorD4'] },
        sess: { login: ['sessL1','sessL2','sessL3','sessL4'], req: ['sessR1','sessR2','sessR3','sessR4'] },
        csrf: { atk: ['atk1','atk2','atk3','atk4'], def: ['def1','def2','def3','def4'] }
    };
    var genScenes = {
        sqli: { atk: 'sqliAtk', def: 'sqliDef' },
        xss:  { atk: 'xssAtk',  def: 'xssDef' },
        idor: { atk: 'idorAtk', def: 'idorDef' },
        sess: { login: 'sessLogin', req: 'sessReq' },
        csrf: { atk: 'csrfAtk', def: 'csrfDef' }
    };
    var genButtons = {
        sqli: { atk: 'sqliBtnAtk', def: 'sqliBtnDef' },
        xss:  { atk: 'xssBtnAtk',  def: 'xssBtnDef' },
        idor: { atk: 'idorBtnAtk', def: 'idorBtnDef' },
        sess: { login: 'sessBtnLogin', req: 'sessBtnReq' },
        csrf: { atk: 'csrfBtnAtk', def: 'csrfBtnDef' }
    };
    
    // Mapping format: [source_actor_index, target_actor_index, payload_text, payload_class]
    var animChoreo = {
        'sqli_atk': [
            [1, 2, "✉️ ' OR '1'='1", 'payload-bad'],
            [2, 3, "✉️ POST", 'payload-bad'],
            [3, 4, "[SQL] SELECT...", 'payload-bad'],
            [4, 1, "💥 User Data", 'payload-bad']
        ],
        'sqli_def': [
            [1, 2, "✉️ ' OR '1'='1", 'payload-bad'],
            [2, 3, "✉️ POST", 'payload-bad'],
            [3, 4, "[SQL] PREPARE", 'payload-good'],
            [4, 3, "🛑 Blocks", 'payload-good']
        ],
        'xss_atk': [
            [1, 2, "✉️ <script>", 'payload-bad'],
            [2, 4, "[DB] Save", 'payload-bad'],
            [3, 4, "🌐 View Page", 'payload-good'],
            [4, 1, "🍪 Send Cookie", 'payload-bad']
        ],
        'xss_def': [
            [1, 2, "✉️ <script>", 'payload-bad'],
            [2, 4, "[DB] Save", 'payload-bad'],
            [3, 4, "🌐 View Page", 'payload-good'],
            [4, 4, "🛑 Escaped text", 'payload-good']
        ],
        'idor_atk': [
            [1, 2, "🔑 Login", 'payload-bad'],
            [2, 3, "✉️ ?id=1002", 'payload-bad'],
            [3, 4, "[SQL] SELECT id=1002", 'payload-bad'],
            [4, 1, "💥 Line B Data", 'payload-bad']
        ],
        'idor_def': [
            [1, 2, "🔑 Login", 'payload-bad'],
            [2, 3, "✉️ ?id=1002", 'payload-bad'],
            [3, 3, "🛑 403 Forbidden", 'payload-good'],
            [3, 1, "🛑 Denied", 'payload-good']
        ],
        'sess_login': [
            [1, 2, "🔑 Login", 'payload-good'],
            [2, 3, "✉️ POST", 'payload-good'],
            [3, 4, "[SQL] Check", 'payload-good'],
            [3, 2, "🍪 Set-Cookie", 'payload-good']
        ],
        'sess_req': [
            [1, 2, "คลิก", 'payload-good'],
            [2, 3, "✉️ + 🍪 Cookie", 'payload-good'],
            [3, 4, "[SQL] SELECT", 'payload-good'],
            [3, 2, "📦 Data", 'payload-good']
        ],
        'csrf_atk': [
            [3, 2, "✉️ Hidden Form", 'payload-bad'],
            [2, 4, "✉️ + 🍪 Cookie", 'payload-bad'],
            [4, 4, "💥 Run Query", 'payload-bad'],
            [4, 2, "✅ Success (Fake)", 'payload-bad']
        ],
        'csrf_def': [
            [4, 2, "🔑 + 🛡️ Token", 'payload-good'],
            [3, 2, "✉️ Hidden Form", 'payload-bad'],
            [2, 4, "✉️ + 🍪 (No Token)", 'payload-bad'],
            [4, 2, "🛑 403 Forbidden", 'payload-good']
        ]
    };

    function genKey(prefix, mode) { return prefix + '_' + mode; }
    
    function genShowView(prefix, mode) {
        var scenes = genScenes[prefix];
        var btns = genButtons[prefix];
        Object.keys(scenes).forEach(function(m) {
            var el = document.getElementById(scenes[m]);
            if (el) el.classList.toggle('show', m === mode);
        });
        Object.keys(btns).forEach(function(m) {
            var el = document.getElementById(btns[m]);
            if (!el) return;
            var isActive = (m === mode);
            if (prefix === 'sess') {
                el.className = 'csrf-view-btn' + (isActive ? ' def-active' : '');
            } else {
                el.className = 'csrf-view-btn' + (isActive ? (m === 'atk' ? ' atk-active' : ' def-active') : '');
            }
        });
        
        // Stop autoplay on view switch
        stopAutoPlay(prefix);
    }
    
    // Polyfill for csrf view toggle
    function csrfShowView(mode) { genShowView('csrf', mode); }

    function playGraphicAnim(sceneId, stepIndex, choreoKey) {
        var sceneEl = document.getElementById(sceneId);
        if (!sceneEl) return;
        var layer = sceneEl.querySelector('.anim-layer');
        if (!layer) return;
        
        var choreo = animChoreo[choreoKey];
        if (!choreo || stepIndex >= choreo.length) return;
        
        var move = choreo[stepIndex];
        var sourceId = 'actor_' + sceneId + '_' + move[0];
        var targetId = 'actor_' + sceneId + '_' + move[1];
        
        var sourceEl = document.getElementById(sourceId);
        var targetEl = document.getElementById(targetId);
        if (!sourceEl || !targetEl) return;
        
        // Calculate relative coordinates
        var sceneRect = sceneEl.getBoundingClientRect();
        var sRect = sourceEl.getBoundingClientRect();
        var tRect = targetEl.getBoundingClientRect();
        
        var startX = sRect.left - sceneRect.left + (sRect.width / 2);
        var startY = sRect.top - sceneRect.top + (sRect.height / 2);
        var endX = tRect.left - sceneRect.left + (tRect.width / 2);
        var endY = tRect.top - sceneRect.top + (tRect.height / 2);
        
        // Create payload element
        var payload = document.createElement('div');
        payload.className = 'anim-payload ' + move[3];
        payload.textContent = move[2];
        
        // Set initial position
        payload.style.transform = `translate(${startX}px, ${startY}px) scale(0.5)`;
        layer.appendChild(payload);
        
        // Trigger reflow
        payload.getBoundingClientRect();
        
        // Start animation
        payload.classList.add('active');
        payload.style.transform = `translate(${endX}px, ${endY}px) scale(1)`;
        
        // Cleanup after animation (0.8s)
        setTimeout(function() {
            payload.style.opacity = 0;
            payload.style.transform = `translate(${endX}px, ${endY}px) scale(0)`;
            setTimeout(function() {
                if (payload.parentNode) payload.parentNode.removeChild(payload);
            }, 300);
        }, 1200);
    }

    function genStep(prefix, mode) {
        var key = genKey(prefix, mode);
        if (!genStates[key]) genStates[key] = 0;
        var ids = genConfig[prefix][mode];
        var currentStep = genStates[key];
        
        if (currentStep < ids.length) {
            var el = document.getElementById(ids[currentStep]);
            if (el) el.classList.add('step-show');
            
            // Play graphic animation
            var sceneId = genScenes[prefix][mode];
            playGraphicAnim(sceneId, currentStep, key);
            
            genStates[key]++;
        }
        genUpdateCtrl(prefix, mode);
    }
    
    // Polyfill for csrf step
    function csrfStep(mode) { genStep('csrf', mode); }

    function genReset(prefix, mode) {
        var key = genKey(prefix, mode);
        var ids = genConfig[prefix][mode];
        ids.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('step-show');
        });
        genStates[key] = 0;
        genUpdateCtrl(prefix, mode);
    }
    
    // Polyfill for csrf reset
    function csrfReset(mode) { stopAutoPlay('csrf'); genReset('csrf', mode); }

    function genUpdateCtrl(prefix, mode) {
        var key = genKey(prefix, mode);
        var step  = genStates[key] || 0;
        var total = genConfig[prefix][mode].length;
        var mCap  = mode.charAt(0).toUpperCase() + mode.slice(1);
        
        var btnId = prefix + 'NextBtn' + (prefix === 'csrf' ? mCap : mCap);
        if (prefix === 'csrf') {
            // CSRF uses hardcoded btn names like csrfNextBtnAtk
            btnId = 'csrfNextBtn' + mCap;
        } else {
            btnId = prefix + 'NextBtn' + mCap;
        }
        
        var progId = prefix + 'Prog' + mCap;
        if (prefix === 'csrf') progId = 'csrfProg' + mCap;
        
        var btn  = document.getElementById(btnId);
        var prog = document.getElementById(progId);
        
        if (btn)  btn.disabled = step >= total;
        if (prog) prog.textContent = step + ' / ' + total + ' ขั้นตอน';
    }

    function toggleAutoPlay(prefix, mode) {
        var sceneEl = document.getElementById(genScenes[prefix][mode]);
        var autoBtn = sceneEl ? sceneEl.querySelector('.csrf-ctrl-auto') : null;
        
        if (animTimers[prefix]) {
            stopAutoPlay(prefix);
            return;
        }
        
        // Reset first if at the end
        var key = genKey(prefix, mode);
        var total = genConfig[prefix][mode].length;
        if ((genStates[key] || 0) >= total) {
            genReset(prefix, mode);
        }
        
        if (autoBtn) {
            autoBtn.classList.add('playing');
            autoBtn.innerHTML = '&#9632; Stop';
        }
        
        // Run first step immediately
        genStep(prefix, mode);
        
        // Loop every 2 seconds
        animTimers[prefix] = setInterval(function() {
            var step = genStates[key] || 0;
            if (step >= total) {
                // Wait 3s at the end, then reset and loop
                clearInterval(animTimers[prefix]);
                animTimers[prefix] = setTimeout(function() {
                    genReset(prefix, mode);
                    delete animTimers[prefix];
                    toggleAutoPlay(prefix, mode); // recursive start
                }, 3500);
            } else {
                genStep(prefix, mode);
            }
        }, 2000);
    }
    
    function stopAutoPlay(prefix) {
        if (animTimers[prefix]) {
            clearInterval(animTimers[prefix]);
            clearTimeout(animTimers[prefix]);
            delete animTimers[prefix];
        }
        
        // Reset all auto buttons for this prefix
        var scenes = genScenes[prefix];
        Object.keys(scenes).forEach(function(m) {
            var sceneEl = document.getElementById(scenes[m]);
            if (sceneEl) {
                var btn = sceneEl.querySelector('.csrf-ctrl-auto');
                if (btn) {
                    btn.classList.remove('playing');
                    btn.innerHTML = '&#9654; Auto-play';
                }
            }
        });
    }

window.switchTab = switchTab;
window.showHub = showHub;
window.togglePanel = togglePanel;
window.switchPage = switchPage;
window.runBuildDemo = runBuildDemo;
window.twToggle = twToggle;
window.twReset = twReset;
window.initQuiz = initQuiz;
window.renderQuestion = renderQuestion;
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.showScore = showScore;
window.restartQuiz = restartQuiz;
window.genKey = genKey;
window.genShowView = genShowView;
window.csrfShowView = csrfShowView;
window.playGraphicAnim = playGraphicAnim;
window.genStep = genStep;
window.csrfStep = csrfStep;
window.genReset = genReset;
window.csrfReset = csrfReset;
window.genUpdateCtrl = genUpdateCtrl;
window.toggleAutoPlay = toggleAutoPlay;
window.stopAutoPlay = stopAutoPlay;