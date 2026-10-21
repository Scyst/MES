import { CATEGORY_OFFLINE_IMAGES } from './offlineAssets';

export const courses = [
  // --- Category: เครื่องจักรและวิศวกรรมการผลิต (Manufacturing & Engineering) ---
  {
    id: 'c-ppap',
    title: 'PPAP & Advanced Manufacturing Quality Masterclass',
    description: 'หลักสูตรวิศวกรรมกระบวนการผลิตและคู่มือบำรุงรักษาเครื่องจักร: การจัดทำ PFMEA AIAG-VDA, จุดควบคุมคุณภาพสำคัญ Q-Points (CTQ), ระบบสืบย้อนกลับสมบูรณ์แบบ, แผนการตรวจสอบ, การบำรุงรักษาแม่พิมพ์/เครื่องจักร (PM/TPM), และการรับรองบรรจุภัณฑ์',
    instructor: 'Manufacturing Quality Director',
    duration: '6 hours',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. PPAP Element & Process FMEA (PFMEA) AIAG-VDA',
        content: 'ppap-pfmea'
      },
      {
        id: 'm2',
        title: '2. จุดควบคุมคุณภาพสำคัญ (Q-Points & CTQ / Cpk)',
        content: 'ppap-qpoints'
      },
      {
        id: 'm3',
        title: '3. ระบบตรวจสอบย้อนกลับสมบูรณ์แบบ (End-to-End Traceability)',
        content: 'ppap-traceability'
      },
      {
        id: 'm4',
        title: '4. แผนการตรวจสอบและเกณฑ์มาตรฐาน (Inspection & Acceptance Plans)',
        content: 'ppap-inspection'
      },
      {
        id: 'm5',
        title: '5. แผนบำรุงรักษาแม่พิมพ์และเครื่องจักร (Tooling & Machine Maintenance)',
        content: 'ppap-maintenance'
      },
      {
        id: 'm6',
        title: '6. การทดสอบและรับรองบรรจุภัณฑ์ (Packaging Qualification & Transit)',
        content: 'ppap-packaging'
      }
    ]
  },

  // --- Category: ขั้นตอนการทำงานและระบบมาตรฐาน (SOP & Quality Systems) ---
  {
    id: 'c-iso-9001',
    title: 'ISO 9001:2015 Quality Management Mastery',
    description: 'คู่มือและขั้นตอนการปฏิบัติงานตามมาตรฐานสากล ISO 9001:2015: โครงสร้าง HLS, การควบคุมเอกสาร DCC 45 ฉบับ, การบริหารความเสี่ยง, การควบคุมการผลิต, และแนวทางรับมือการตรวจประเมิน',
    instructor: 'Quality Assurance Expert',
    duration: '3.5 hours',
    category: 'ขั้นตอนการทำงานและระบบมาตรฐาน',
    image: CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
    modules: [
      {
        id: 'm1',
        title: '1. โครงสร้าง HLS, บริบทองค์กร (Clause 4) และการเป็นผู้นำ (Clause 5)',
        content: 'iso-9001-hls'
      },
      {
        id: 'm2',
        title: '2. การบริหารความเสี่ยง โอกาส และโครงสร้างสนับสนุน (Clause 6 & 7)',
        content: 'iso-9001-risk'
      },
      {
        id: 'm3',
        title: '3. การควบคุมการปฏิบัติการและการตรวจสอบย้อนกลับ (Clause 8)',
        content: 'iso-9001-operations'
      },
      {
        id: 'm4',
        title: '4. การประเมินสมรรถนะ การตรวจประเมินภายใน และ CAPA (Clause 9 & 10)',
        content: 'iso-9001-audit'
      }
    ]
  },
  {
    id: 'c-iso-14001',
    title: 'ISO 14001:2015 Environmental Management & Net Zero',
    description: 'คู่มือการจัดการสิ่งแวดล้อมและสารเคมีในโรงงาน: การประเมินลักษณะปัญหาสิ่งแวดล้อม (Aspects/Impacts), การจัดการกากของเสียอันตรายและสารเคมี (กอ.1 / สก.2), อ่างกักเก็บ 110%, และการมุ่งสู่ Eco-Factory',
    instructor: 'Environmental Systems Lead',
    duration: '3 hours',
    category: 'ขั้นตอนการทำงานและระบบมาตรฐาน',
    image: CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
    modules: [
      {
        id: 'm1',
        title: '1. บริบทสิ่งแวดล้อม นโยบาย และกฎหมายอุตสาหกรรม (Clause 4 & 5)',
        content: 'iso-14001-context'
      },
      {
        id: 'm2',
        title: '2. การชี้บ่งประเด็นสิ่งแวดล้อมและมุมมองวงจรชีวิต (Clause 6)',
        content: 'iso-14001-aspects'
      },
      {
        id: 'm3',
        title: '3. การจัดการของเสีย สารเคมี และ Eco-Factory (Clause 8.1)',
        content: 'iso-14001-waste'
      },
      {
        id: 'm4',
        title: '4. แผนซ้อมรับมือเหตุฉุกเฉินและการมุ่งสู่ Net Zero (Clause 8.2, 9 & 10)',
        content: 'iso-14001-emergency'
      }
    ]
  },
  {
    id: 'c-iso-45001',
    title: 'ISO 45001:2018 Occupational Health & Safety (OH&S)',
    description: 'คู่มือมาตรฐานความปลอดภัยและอาชีวอนามัยสำหรับพนักงาน: ลำดับขั้นการควบคุมอันตราย 5 ระดับ, การประเมินความเสี่ยง JSA/HIRA, ระบบตัดแยกพลังงาน LOTO, ใบอนุญาตทำงานเสี่ยงสูง Work Permit, และการมีส่วนร่วมของลูกจ้าง (5.4)',
    instructor: 'Safety & EHS Specialist',
    duration: '3 hours',
    category: 'ขั้นตอนการทำงานและระบบมาตรฐาน',
    image: CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
    modules: [
      {
        id: 'm1',
        title: '1. นโยบายความปลอดภัยและการมีส่วนร่วมของพนักงาน (Clause 4 & 5)',
        content: 'iso-45001-leadership'
      },
      {
        id: 'm2',
        title: '2. การชี้บ่งอันตรายและลำดับขั้นการควบคุม (Clause 6)',
        content: 'iso-45001-hazard'
      },
      {
        id: 'm3',
        title: '3. การควบคุมความปลอดภัยหน้างาน LOTO & Work Permit (Clause 8.1)',
        content: 'iso-45001-operations'
      },
      {
        id: 'm4',
        title: '4. แผนฉุกเฉิน การสืบสวนอุบัติเหตุ และ Near-Miss (Clause 8.2 & 10.2)',
        content: 'iso-45001-emergency'
      }
    ]
  },
  {
    id: 'c-iso-17025',
    title: 'ISO/IEC 17025:2017 Laboratory Competence & Calibration',
    description: 'คู่มือมาตรฐานห้องปฏิบัติการทดสอบและสอบเทียบ: ความเป็นกลางและการรักษาความลับ, การควบคุมอุณหภูมิความชื้นห้องแล็บ, การทวนสอบวิธีทดสอบ, การประมาณค่าความไม่แน่นอนในการวัด (GUM), และความสอบกลับได้ทางมาตรวิทยา',
    instructor: 'Metrology & Lab QA Specialist',
    duration: '2.5 hours',
    category: 'ขั้นตอนการทำงานและระบบมาตรฐาน',
    image: CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
    modules: [
      {
        id: 'm1',
        title: '1. ความเป็นกลาง การรักษาความลับ และโครงสร้างห้องแล็บ (Clause 4 & 5)',
        content: 'iso-17025-general'
      },
      {
        id: 'm2',
        title: '2. ทรัพยากร บุคลากร และการควบคุมสภาพแวดล้อมห้องปฏิบัติการ (Clause 6)',
        content: 'iso-17025-resources'
      },
      {
        id: 'm3',
        title: '3. การทวนสอบวิธีทดสอบและความไม่แน่นอนในการวัด (Clause 7.1 - 7.6)',
        content: 'iso-17025-methods'
      },
      {
        id: 'm4',
        title: '4. ความสอบกลับได้ทางมาตรวิทยาและการประกันคุณภาพผลแล็บ (Clause 7.7 & 8)',
        content: 'iso-17025-traceability'
      }
    ]
  },

  // --- Category: การตรวจโรงงานและเอกสารลูกค้า (Audits & Compliance) ---
  {
    id: 'c-customer-audits',
    title: 'Global Customer QA Audits & ESG Compliance',
    description: 'คู่มือการเตรียมเอกสารและรับมือการตรวจโรงงานจากลูกค้าระดับโลก (Lowe\'s, Costco, Walmart, Home Depot): ระบบเอกสาร 56 รายการ, ขั้นตอน NPI & ECN, การบริหารซัพพลายเออร์และ IQC, CAPA 8D Report, สิทธิมนุษยชน ESG, และ GMP/Recall',
    instructor: 'Global Compliance Auditor',
    duration: '5.5 hours',
    category: 'การตรวจโรงงานและเอกสารลูกค้า',
    image: CATEGORY_OFFLINE_IMAGES['การตรวจโรงงานและเอกสารลูกค้า'],
    modules: [
      {
        id: 'm1',
        title: '1. คลังเอกสารตรวจสอบคุณภาพ 56 รายการ (56 Required QA Documents)',
        content: 'customer-56-docs'
      },
      {
        id: 'm2',
        title: '2. กระบวนการแนะนำผลิตภัณฑ์ใหม่และแจ้งเปลี่ยนวิศวกรรม (NPI & ECN)',
        content: 'customer-npi-ecn'
      },
      {
        id: 'm3',
        title: '3. การควบคุมผู้ส่งมอบและตรวจสอบรับเข้า (Supplier Management & IQC)',
        content: 'customer-supplier-iqc'
      },
      {
        id: 'm4',
        title: '4. การจัดการข้อร้องเรียนและการปฏิบัติการแก้ไข (CAPA & Customer Claims)',
        content: 'customer-capa-claims'
      },
      {
        id: 'm5',
        title: '5. จริยธรรม แรงงาน และสิ่งแวดล้อม (ESG, Human Rights & Code of Conduct)',
        content: 'customer-esg-human-rights'
      },
      {
        id: 'm6',
        title: '6. สุขอนามัยโรงงานและการเรียกคืนสินค้า (GMP, Hygiene & Recall Protocol)',
        content: 'customer-gmp-recall'
      }
    ]
  },

  // --- Category: กรณีศึกษาหน้างานจริง (Live Operational Case Studies) ---
  {
    id: 'c-live-qa',
    title: 'Live Operational QA & Factory Audit Defense',
    description: 'ถอดบทเรียนกรณีศึกษาและปัญหาหน้างานจริงในโรงงาน: รายงานผลการตรวจประเมินจริง ส.ค. 2569, การวิเคราะห์สาเหตุรากเหง้าและปิดข้อบกพร่อง 26-NCR-001 (8D Analysis), เกณฑ์ตรวจ Walmart FCCA 6 หมวด, แร่ขัดแย้ง 3TG (CMRT), และสถิติ Defect Pareto',
    instructor: 'Chief Quality Inspector & Lead Auditor',
    duration: '5 hours',
    category: 'กรณีศึกษาหน้างานจริง',
    image: CATEGORY_OFFLINE_IMAGES['กรณีศึกษาหน้างานจริง'],
    modules: [
      {
        id: 'm1',
        title: '1. ถอดบทเรียนตรวจประเมินจริง สิงหาคม 2569 (Live Process Audit Findings)',
        content: 'live-audit-findings'
      },
      {
        id: 'm2',
        title: '2. กรณีศึกษาวิเคราะห์สาเหตุและปิด NCR (26-NCR-001 8D Analysis)',
        content: 'live-ncr-case'
      },
      {
        id: 'm3',
        title: '3. เจาะลึกเกณฑ์ตรวจประเมินโรงงาน Walmart (Walmart FCCA Defense)',
        content: 'live-walmart-fcca'
      },
      {
        id: 'm4',
        title: '4. การปฏิบัติตามกฎหมายแร่ขัดแย้ง (Conflict Minerals 3TG & CMRT)',
        content: 'live-conflict-minerals'
      },
      {
        id: 'm5',
        title: '5. โรงงานเชิงนิเวศและการใช้พลังงานอย่างมีประสิทธิภาพ (Eco-Factory & Energy)',
        content: 'live-eco-factory'
      },
      {
        id: 'm6',
        title: '6. สถิติของเสียและการแก้ไขปัญหาแบบเจาะลึก (Defect Pareto & Root Cause)',
        content: 'live-defect-pareto'
      }
    ]
  },

  // --- Category: โปรแกรมและระบบดิจิทัล (Software & Digital Systems) ---
  {
    id: 'c3',
    title: 'React + Vite Architecture Guide',
    description: 'คู่มือโครงสร้างและสถาปัตยกรรมแอปพลิเคชันเว็บโรงงาน (React + Vite): โครงสร้างโฟลเดอร์, การจัดการ State, โมดูลระบบ, เทคโนโลยี Stack, และมาตรฐานการพัฒนาโปรแกรมร่วมกันของทีมวิศวกรรม',
    instructor: 'Engineering Team',
    duration: '1.5 hours',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: CATEGORY_OFFLINE_IMAGES['โปรแกรมและระบบดิจิทัล'],
    modules: [
      {
        id: 'm1',
        title: 'ระบบโครงสร้าง (Architecture Overview)',
        content: 'react-arch-overview'
      },
      {
        id: 'm2',
        title: 'โครงสร้างไฟล์และโฟลเดอร์',
        content: 'react-arch-folders'
      },
      {
        id: 'm3',
        title: 'เทคโนโลยีที่ใช้ (Tech Stack)',
        content: 'react-arch-tech'
      },
      {
        id: 'm4',
        title: 'ขั้นตอนการทำงานร่วมกัน (Team Workflow)',
        content: 'team-workflow'
      }
    ]
  },
  {
    id: 'c4',
    title: 'Enterprise System & Security (MES x SAP)',
    description: 'คู่มือระบบหลังบ้าน ความปลอดภัยเครือข่าย และการเชื่อมต่อข้อมูลองค์กร: แผนผังสถาปัตยกรรม Edge-App-ERP, การป้องกันภัยคุกคาม (CSRF/SQL Injection), ระบบสิทธิ์ผู้ใช้งาน (RBAC), และการเชื่อมโยงระบบ SAP',
    instructor: 'Engineering Team',
    duration: '2.5 hours',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: CATEGORY_OFFLINE_IMAGES['โปรแกรมและระบบดิจิทัล'],
    modules: [
      {
        id: 'm1',
        title: 'แผนผังระบบรวม (System Architecture Map)',
        content: 'sys-map'
      },
      {
        id: 'm2',
        title: 'ความปลอดภัยของระบบ (Web Security & CSRF)',
        content: 'sys-security'
      },
      {
        id: 'm3',
        title: 'ระบบสิทธิ์และการเข้าถึง (Auth & RBAC)',
        content: 'sys-auth'
      },
      {
        id: 'm4',
        title: 'การเชื่อมต่อระบบองค์กร (ERP Integration)',
        content: 'sys-integration'
      }
    ]
  },

  // --- Category: การบริหารและการเพิ่มผลผลิต (Lean & Leadership) ---
  {
    id: 'c1',
    title: 'Lean Manufacturing & Industry 4.0',
    description: 'คู่มือการเพิ่มผลผลิตและลดต้นทุนในโรงงาน: แนวคิดลีน (Lean Principles), การกำจัดความสูญเปล่า 8 ประการ (8 Wastes / DOWNTIME), การสร้างผังสายธารคุณค่า (VSM), การวัดประสิทธิผลโดยรวมของเครื่องจักร (OEE), และการก้าวสู่ Smart Factory',
    instructor: 'คุณวุฒิพงศ์ บุญนายวา',
    duration: '3 hours',
    category: 'การบริหารและการเพิ่มผลผลิต',
    image: CATEGORY_OFFLINE_IMAGES['การบริหารและการเพิ่มผลผลิต'],
    modules: [
      {
        id: 'm1',
        title: 'แนวคิดของลีน (Lean Principles)',
        content: 'lean-principles'
      },
      {
        id: 'm2',
        title: 'การลดความสูญเปล่า 8 ประการ (8 Wastes / DOWNTIME)',
        content: 'lean-8-wastes'
      },
      {
        id: 'm3',
        title: 'Value Stream Mapping (VSM) และ OEE',
        content: 'lean-vsm-oEE'
      },
      {
        id: 'm4',
        title: 'การบูรณาการ Lean เข้ากับ Industry 4.0',
        content: 'lean-industry-4'
      }
    ]
  },
  {
    id: 'c2',
    title: 'High-Performance Leader & Shop Floor Management',
    description: 'คู่มือหัวหน้างานและผู้จัดการโรงงาน: การบริหารต้นทุนสินค้า COGS (DM, DL, OH) แบบ End-to-End, วงจรควบคุมและแก้ปัญหา CAP-DO, การเดินสำรวจหน้างาน Digital Gemba, การรายงานแบบ Ho-Ren-So, และการประยุกต์ใช้ AI ในองค์กร',
    instructor: 'คุณชัยรัตน์ บรรเทาทุกข์',
    duration: '4 hours',
    category: 'การบริหารและการเพิ่มผลผลิต',
    image: CATEGORY_OFFLINE_IMAGES['การบริหารและการเพิ่มผลผลิต'],
    modules: [
      {
        id: 'm1',
        title: 'ปัจจัยท้าทายและการบริหาร COGS (End-to-End)',
        content: 'cogs-management'
      },
      {
        id: 'm2',
        title: 'การปรับ KPI จาก Macro สู่ Micro และวงจร CAP-DO',
        content: 'kpi-capdo'
      },
      {
        id: 'm3',
        title: 'Digital Gemba & Data-Driven Problem Solving',
        content: 'digital-gemba'
      },
      {
        id: 'm4',
        title: 'การประยุกต์ใช้ Enterprise AI และ Ho-Ren-So',
        content: 'enterprise-ai'
      }
    ]
  },

  // =========================================================================
  // --- 7 Official Industry 4.0 Curriculums (99 Industrial Solutions / SNC Former) ---
  // =========================================================================

  // 1. Enterprise Application Design, Development & Integration
  {
    id: 'c-enterprise-app',
    title: 'Enterprise Application Design, Development & Integration',
    description: 'หลักสูตรการออกแบบ พัฒนา และบูรณาการแอปพลิเคชันระดับองค์กร: สถาปัตยกรรมระบบองค์กร IT/OT, การออกแบบ Industrial UX/UI สำหรับพนักงานและแดชบอร์ดผู้บริหาร, การพัฒนา Web Application (HTML5, CSS Grid, ES6+ Async/Await), การเชื่อมต่อ IoT & Webhook (Telegram/Teams Alert), การทดสอบระบบ UAT, และความปลอดภัยไซเบอร์ระดับ Enterprise',
    instructor: 'อาจารย์ผู้เชี่ยวชาญและทีมวิศวกรรมดิจิทัล (99 Industrial Solutions / SNC Former)',
    duration: '24 hours (4 days)',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: CATEGORY_OFFLINE_IMAGES['โปรแกรมและระบบดิจิทัล'],
    modules: [
      {
        id: 'm1',
        title: '1. Enterprise System & Digital Industry Landscape (สถาปัตยกรรมและ IT-OT Convergence)',
        content: 'enterprise-app-landscape'
      },
      {
        id: 'm2',
        title: '2. Industrial UX/UI & Software Design (การออกแบบ UI สำหรับพนักงานหน้างานและแดชบอร์ด)',
        content: 'enterprise-app-uxui'
      },
      {
        id: 'm3',
        title: '3. Web & Application Development (HTML5, CSS Grid, ES6+ Async/Await & REST APIs)',
        content: 'enterprise-app-webdev'
      },
      {
        id: 'm4',
        title: '4. Application Integration & IoT Connectivity (RESTful APIs, Webhook & Telegram Alerts)',
        content: 'enterprise-app-integration'
      },
      {
        id: 'm5',
        title: '5. Software Testing, QA Standards & Deployment (Test Case, UAT, Documentation & Cybersecurity)',
        content: 'enterprise-app-qa-security'
      }
    ]
  },

  // 2. Basic Machine Vision and Sensor Inspection Course for Smart Factories
  {
    id: 'c-machine-vision',
    title: 'Basic Machine Vision and Sensor Inspection Course for Smart Factories',
    description: 'หลักสูตรพื้นฐานแมชชีนวิชันและการตรวจสอบด้วยเซนเซอร์สำหรับโรงงานอัจฉริยะ: โครงสร้างกล้องอุตสาหกรรม, เลนส์, แสงสว่าง, การตั้งค่า Hardware (Global Shutter / Optical Setup), Logic ตรวจสอบภาพ Classical & AI Vision, และการปรับจูนเสถียรภาพลดของเสีย (Underkill / Overkill)',
    instructor: 'ทีมวิศวกรรมแมชชีนวิชัน (99 Industrial Solutions / SNC Former)',
    duration: '30 hours (5 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. พื้นฐานระบบ Machine Vision และโครงสร้างระบบตรวจสอบ',
        content: 'vision-basics-structure'
      },
      {
        id: 'm2',
        title: '2. การเตรียมชิ้นงาน อุปกรณ์ภาพ และการตั้งค่า Hardware (Global Shutter & Optical)',
        content: 'vision-hardware-optical'
      },
      {
        id: 'm3',
        title: '3. การเขียน Logic ตรวจสอบภาพด้วย Classical Vision และ AI Vision',
        content: 'vision-logic-ai'
      },
      {
        id: 'm4',
        title: '4. การกำหนดค่ากระบวนการตรวจสอบและทดสอบระบบจริง (Threshold & Overkill Prevention)',
        content: 'vision-conditions-testing'
      }
    ]
  },

  // 3. CAD-CAM for Mold and Die Design and Manufacturing
  {
    id: 'c-cad-cam',
    title: 'CAD-CAM for Mold and Die Design and Manufacturing',
    description: 'หลักสูตร CAD-CAM สำหรับการออกแบบและผลิตแม่พิมพ์ Mold & Die: การออกแบบ CAD 2D/3D (Core/Cavity/Draft Angle), กลยุทธ์การสร้าง Toolpath (Roughing, Semi-finishing, Finishing), การตรวจสอบ Solid Simulation ป้องกันการชน, การจัดการ G-code และการแก้ปัญหาหน้างาน CAD-CAM-CNC',
    instructor: 'ทีมวิศวกรรมแม่พิมพ์ (99 Industrial Solutions / SNC Former)',
    duration: '36 hours (6 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. พื้นฐานกระบวนการ CAD-CAM ในงานแม่พิมพ์ Mold & Die',
        content: 'cadcam-mold-process'
      },
      {
        id: 'm2',
        title: '2. การออกแบบ CAD 2D/3D สำหรับงานแม่พิมพ์ Mold & Die',
        content: 'cadcam-mold-design'
      },
      {
        id: 'm3',
        title: '3. กลยุทธ์การสร้าง Toolpath สำหรับงานกัดแม่พิมพ์',
        content: 'cadcam-toolpath-strategy'
      },
      {
        id: 'm4',
        title: '4. การตรวจสอบ Simulation และการประเมินความพร้อมก่อนกัดจริง',
        content: 'cadcam-simulation-collision'
      },
      {
        id: 'm5',
        title: '5. การจัดการ G-code และการเชื่อมต่อกับเครื่อง CNC',
        content: 'cadcam-gcode-cnc'
      },
      {
        id: 'm6',
        title: '6. การแก้ปัญหาหน้างาน CAD-CAM-CNC (Chatter & Tool Wear)',
        content: 'cadcam-troubleshooting'
      }
    ]
  },

  // 4. CNC Training for Engineers and Technicians in the Industry 4.0
  {
    id: 'c-cnc-4-0',
    title: 'CNC Training for Engineers and Technicians in the Industry 4.0',
    description: 'หลักสูตร CNC สำหรับวิศวกรและช่างเทคนิคยุคอุตสาหกรรม 4.0: โครงสร้างเครื่องจักร Machining Center, การอ่านแบบ Drawing และระบบพิกัด Workpiece Zero (G54-G59), การตั้ง Tool Length Offset, การเขียนโปรแกรม NC (G-Code/M-Code), Cutting Conditions และความปลอดภัยสูงสุด',
    instructor: 'ทีมวิศวกรรมเครื่องจักรกล CNC (99 Industrial Solutions / SNC Former)',
    duration: '30 hours (5 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. ระบบ CNC และโครงสร้างเครื่องจักร Machining Center',
        content: 'cnc-systems-structure'
      },
      {
        id: 'm2',
        title: '2. การอ่านแบบงานและระบบพิกัด Workpiece Zero (G54-G59)',
        content: 'cnc-drawings-coordinates'
      },
      {
        id: 'm3',
        title: '3. การเตรียมชิ้นงาน เครื่องมือ และการตั้งค่า Setup & Tooling',
        content: 'cnc-setup-tooling'
      },
      {
        id: 'm4',
        title: '4. การเขียนและแก้ไขโปรแกรม NC (G-Code/M-Code)',
        content: 'cnc-programming-codes'
      },
      {
        id: 'm5',
        title: '5. การกำหนด Cutting Conditions และทดลองตัดชิ้นงานจริง',
        content: 'cnc-cutting-conditions'
      },
      {
        id: 'm6',
        title: '6. การวางแผนด้านความปลอดภัยในการใช้เครื่อง CNC (Single Block & Dry Run)',
        content: 'cnc-safety-operations'
      }
    ]
  },

  // 5. EV Conversion Architecture and Battery System Design
  {
    id: 'c-ev-conversion',
    title: 'EV Conversion Architecture and Battery System Design',
    description: 'หลักสูตรสถาปัตยกรรมยานยนต์ไฟฟ้าดัดแปลงและการออกแบบระบบแบตเตอรี่: พื้นฐานระบบไฟฟ้ากำลัง DC/AC, ความปลอดภัยไฟฟ้าแรงสูง (High Voltage Safety & MSD), โครงสร้าง Traction Motor/Inverter/OBC, เคมีภัณฑ์แบตเตอรี่ (LFP vs NMC), ระบบ BMS และ Workshop ประกอบแพ็ค 12V 4S2P',
    instructor: 'ทีมวิศวกรรมยานยนต์ไฟฟ้า (99 Industrial Solutions / SNC Former)',
    duration: '30 hours (5 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. พื้นฐานไฟฟ้าและเครื่องมือวัดทางไฟฟ้าเบื้องต้นในรถ EV',
        content: 'ev-electricity-instruments'
      },
      {
        id: 'm2',
        title: '2. อันตรายจากไฟฟ้าแรงสูง การตอบสนองฉุกเฉิน และ PPE',
        content: 'ev-hv-safety-emergency'
      },
      {
        id: 'm3',
        title: '3. สถาปัตยกรรมยานยนต์ไฟฟ้าดัดแปลง (EV Conversion Architecture)',
        content: 'ev-architecture-powertrain'
      },
      {
        id: 'm4',
        title: '4. ทฤษฎีเคมีภัณฑ์แบตเตอรี่และการคำนวณระยะทาง (LFP vs NMC)',
        content: 'ev-battery-chemistry'
      },
      {
        id: 'm5',
        title: '5. BMS และการออกแบบประกอบแบตเตอรี่แพ็ค (Battery Pack Design 12V 4S2P)',
        content: 'ev-bms-pack-design'
      }
    ]
  },

  // 6. PLC Programming for Industrial Automation
  {
    id: 'c-plc-automation',
    title: 'PLC Programming for Industrial Automation',
    description: 'หลักสูตรการเขียนโปรแกรม PLC สำหรับระบบอัตโนมัติในงานอุตสาหกรรม: สัญญาณ I/O (NPN/PNP), รอบการประมวลผล Scan Cycle, คำสั่ง Ladder Diagram (Timer, Counter, MOV), การควบคุมกระบอกสูบนิวแมติกส์และเซนเซอร์, การออกแบบระบบคัดแยกอัตโนมัติ และการแก้ปัญหา Troubleshooting',
    instructor: 'ทีมวิศวกรรมระบบอัตโนมัติและเมคคาทรอนิกส์ (99 Industrial Solutions / SNC Former)',
    duration: '24 hours (4 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. ระบบควบคุมไฟฟ้าและสัญญาณ I/O อุตสาหกรรม (NPN vs PNP)',
        content: 'plc-electrical-io'
      },
      {
        id: 'm2',
        title: '2. โครงสร้างฮาร์ดแวร์ PLC และรอบการประมวลผล Scan Cycle',
        content: 'plc-scan-cycle'
      },
      {
        id: 'm3',
        title: '3. คำสั่งพื้นฐานและคำสั่งประยุกต์ใน Ladder Diagram (Timer, Counter, MOV)',
        content: 'plc-ladder-instructions'
      },
      {
        id: 'm4',
        title: '4. การเชื่อมต่ออุปกรณ์ภาคสนามและการควบคุมอุปกรณ์จริง (Pneumatics & Solenoid)',
        content: 'plc-field-devices'
      },
      {
        id: 'm5',
        title: '5. การออกแบบระบบควบคุมอัตโนมัติและระบบคัดแยกชิ้นงาน (Sorting Station)',
        content: 'plc-sorting-system'
      },
      {
        id: 'm6',
        title: '6. การวิเคราะห์และแก้ไขปัญหาในระบบ PLC (Troubleshooting & I/O Force)',
        content: 'plc-troubleshooting'
      }
    ]
  },

  // 7. Integrated Robotics Programming, Troubleshooting & Intelligent Sensing
  {
    id: 'c-robot-automation',
    title: 'Integrated Robotics Programming, Troubleshooting & Intelligent Sensing',
    description: 'หลักสูตรการเขียนโปรแกรมหุ่นยนต์อุตสาหกรรม การแก้ปัญหา และเทคโนโลยีเซนเซอร์อัจฉริยะ: หุ่นยนต์ 6 แกนและ SCARA, ระบบพิกัด Joint/World/Tool, การเชื่อมต่อสัญญาณ I/O และ Handshaking กับ PLC, มาตรฐานความปลอดภัย ISO 10218, การใช้ Teach Pendant และ Workshop Pick & Place',
    instructor: 'ทีมวิศวกรรมหุ่นยนต์อุตสาหกรรม (99 Industrial Solutions / SNC Former)',
    duration: '18 hours (3 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    modules: [
      {
        id: 'm1',
        title: '1. พื้นฐานหุ่นยนต์อุตสาหกรรมและแนวคิด Industry 4.0 (6-Axis, SCARA, Cobot)',
        content: 'robot-basics-industry4'
      },
      {
        id: 'm2',
        title: '2. โครงสร้างหุ่นยนต์ ระบบพิกัด และโหมดการเคลื่อนที่ (Joint, World, Tool TCP)',
        content: 'robot-kinematics-coordinates'
      },
      {
        id: 'm3',
        title: '3. ระบบไฟฟ้าและสัญญาณ I/O ระหว่างหุ่นยนต์กับสายการผลิต (Handshaking)',
        content: 'robot-io-signals'
      },
      {
        id: 'm4',
        title: '4. มาตรฐานความปลอดภัยในการทำงานร่วมกับหุ่นยนต์ (Safety Light Curtain & Deadman)',
        content: 'robot-safety-standards'
      },
      {
        id: 'm5',
        title: '5. การใช้ Teach Pendant และการเขียนโปรแกรมหุ่นยนต์เบื้องต้น (MOVEJ vs MOVEL)',
        content: 'robot-teach-pendant'
      },
      {
        id: 'm6',
        title: '6. การประยุกต์ใช้งานจริงในโรงงานและ Workshop (Pick & Place & Palletizing)',
        content: 'robot-workshop-applications'
      }
    ]
  }
];
