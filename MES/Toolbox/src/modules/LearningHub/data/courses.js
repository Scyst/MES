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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","วิศวกรรมเครื่องจักรและแม่พิมพ์","มาตรฐานสากลและการตรวจประเมิน"],
    tags: ["PPAP","PFMEA","AIAG-VDA","Q-Points","Traceability","Maintenance","CTQ"],
    isFeatured: true,
    featuredBadge: "⭐ หลักสูตรแนะนำ · AUTOMOTIVE QUALITY",
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["มาตรฐานสากลและการตรวจประเมิน","เปิดรับรองบุคคลภายนอก"],
    tags: ["ISO 9001","Quality Management","HLS","DCC","Risk Management","Audit"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["มาตรฐานสากลและการตรวจประเมิน","สิ่งแวดล้อมและความปลอดภัย"],
    tags: ["ISO 14001","Environment","Net Zero","Carbon Footprint","EMS"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["มาตรฐานสากลและการตรวจประเมิน","สิ่งแวดล้อมและความปลอดภัย"],
    tags: ["ISO 45001","OH&S","Safety","Hazard Assessment","Emergency"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["มาตรฐานสากลและการตรวจประเมิน","การสอบเทียบและห้องปฏิบัติการ"],
    tags: ["ISO 17025","Laboratory","Calibration","Measurement Uncertainty"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["มาตรฐานสากลและการตรวจประเมิน","การตรวจรับรองลูกค้าสากล"],
    tags: ["Customer Audit","ESG","Compliance","Audit Defense","Global Standards"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: false,
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
    subCategories: ["ปฏิบัติการหน้างานจริง","มาตรฐานสากลและการตรวจประเมิน"],
    tags: ["Live QA","Shopfloor","Non-Conformance","CAPA","Problem Solving"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: false,
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
    title: 'การออกแบบ พัฒนา และบูรณาการแอปพลิเคชันระดับองค์กร (Enterprise Application)',
    isFeatured: true,
    featuredBadge: '⭐ หลักสูตรแนะนำ · ENTERPRISE FULL-STACK',
    description: 'หลักสูตรการออกแบบ พัฒนา และบูรณาการแอปพลิเคชันระดับองค์กร: สถาปัตยกรรมระบบองค์กร IT/OT, การออกแบบ Industrial UX/UI สำหรับพนักงานและแดชบอร์ดผู้บริหาร, การพัฒนา Web Application (HTML5, CSS Grid, ES6+ Async/Await), การเชื่อมต่อ IoT & Webhook (Telegram/Teams Alert), การทดสอบระบบ UAT, และความปลอดภัยไซเบอร์ระดับ Enterprise',
    instructor: 'อาจารย์ผู้เชี่ยวชาญและทีมวิศวกรรมดิจิทัล (99 Industrial Solutions / SNC Former)',
    duration: '24 hours (4 days)',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: CATEGORY_OFFLINE_IMAGES['โปรแกรมและระบบดิจิทัล'],
    subCategories: ["ระบบอัตโนมัติและดิจิทัล","สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม","ทักษะวิชาชีพขั้นสูง","เปิดรับรองบุคคลภายนอก"],
    tags: ["MES","Full-Stack","UI/UX","API","IT-OT","Security","App","Enterprise","Web Development"],
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","ระบบอัตโนมัติและหุ่นยนต์","ระบบอัตโนมัติและ AI","เปิดรับรองบุคคลภายนอก","การควบคุมคุณภาพ"],
    tags: ["Machine Vision","AI","YOLO","OpenCV","Smart Factory","Lighting","Optics"],
    isFeatured: true,
    featuredBadge: "⭐ หลักสูตรแนะนำ · SMART FACTORY AI",
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. พื้นฐานระบบ Machine Vision, แผนภาพ AI/CV/MV และวงจรการทำงาน 4 ขั้นตอน',
        content: 'vision-m1-basics'
      },
      {
        id: 'm2',
        title: '2. ประเภทระบบภาพ 1D/2D/3D, องค์ประกอบฮาร์ดแวร์ 6 ส่วน และชัตเตอร์ Global vs Rolling',
        content: 'vision-m2-shutter'
      },
      {
        id: 'm3',
        title: '3. วิศวกรรมการจัดแสงอุตสาหกรรมและการตัดแสงสะท้อนด้วยโพลาไรเซอร์ (Optical Lighting)',
        content: 'vision-m3-lighting'
      },
      {
        id: 'm4',
        title: '4. การคำนวณทางเลนส์ กฎ 3 พิกเซล (3-Pixel Rule) และมาตรฐานพอร์ตเชื่อมต่อกล้อง',
        content: 'vision-m4-optics'
      },
      {
        id: 'm5',
        title: '5. โครงสร้างภาพดิจิทัล ระบบสี BGR/HSV และการประมวลผลภาพด้วย Python & OpenCV',
        content: 'vision-m5-opencv'
      },
      {
        id: 'm6',
        title: '6. เทคโนโลยี AI Deep Learning, โครงข่าย CNN, อัลกอริทึม YOLO และการเลือก Rule-Based vs AI',
        content: 'vision-m6-ai-yolo'
      },
      {
        id: 'm7',
        title: '7. การปรับจูนค่าเกณฑ์ตัดสิน (Threshold Tuning), เส้นโค้งการแจกแจง และ Confusion Matrix',
        content: 'vision-m7-threshold'
      },
      {
        id: 'm8',
        title: '8. เวิร์กช็อปปฏิบัติการหน้างาน, โปรเจกต์ YOLO + PLC และการเชื่อมต่อฐานข้อมูล MES',
        content: 'vision-m8-workshops-mes'
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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","วิศวกรรมเครื่องจักรและแม่พิมพ์","เปิดรับรองบุคคลภายนอก"],
    tags: ["CAD","CAM","Mold & Die","Toolpath","CNC","G-code"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","วิศวกรรมเครื่องจักรและแม่พิมพ์","ปฏิบัติการหน้างานจริง","เปิดรับรองบุคคลภายนอก"],
    tags: ["CNC","Milling","Lathe","Industry 4.0","G-code"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","ยานยนต์ไฟฟ้าและพลังงานสะอาด"],
    tags: ["EV","Battery","BMS","Motor","Inverter","Clean Energy"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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
    subCategories: ["ทักษะวิชาชีพขั้นสูง","ระบบอัตโนมัติและหุ่นยนต์","ปฏิบัติการหน้างานจริง","เปิดรับรองบุคคลภายนอก"],
    tags: ["PLC","Ladder","Pneumatics","I/O","Automation","Troubleshooting"],
    isFeatured: false,
    level: "Level 3 (Certified Specialist)",
    isPublicEligible: true,
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

  // 7. Integrated Robotics Programming, Troubleshooting & Intelligent Sensing (SNC Robot Advance Curriculum)
  {
    id: 'c-robot-automation',
    title: 'Integrated Robotics Programming, Troubleshooting & Intelligent Sensing',
    description: 'หลักสูตรวิศวกรรมหุ่นยนต์อุตสาหกรรมขั้นสูง (SNC Robot Advance & ARAI Academy): สถาปัตยกรรมแขนกล 6 แกน (S/L/U/R/B/T), ผัง 10 Skills Robot, ระบบเซนเซอร์และอุปกรณ์ไฟฟ้า I/O, วงจร Handshaking ป้องกันการชนในแม่พิมพ์ปั๊มขึ้นรูป, ระบบพิกัด 3 มิติและกฎมือขวา, เส้นทาง PTP vs Linear vs Singularity, การเขียนโปรแกรม IF-ELSE, ฟังก์ชัน Position Offset และระบบจัดเรียงพาเลท Matrix Palletizing',
    instructor: 'ทีมวิศวกรรมหุ่นยนต์และระบบอัตโนมัติ (SNC Former / ARAI Academy)',
    duration: '24 hours (3-4 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    subCategories: ["ทักษะวิชาชีพขั้นสูง","ระบบอัตโนมัติและหุ่นยนต์","เปิดรับรองบุคคลภายนอก","คณิตศาสตร์และการคำนวณ"],
    tags: ["Robot","Kinematics","10 Skills","Palletizing","ISO 10218","Yaskawa","ABB"],
    isFeatured: true,
    featuredBadge: "⭐ หลักสูตรแนะนำ · 10 SKILLS",
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. สถาปัตยกรรมหุ่นยนต์ 6 แกน (S/L/U/R/B/T) และมาตรฐาน 10 Skills Robot',
        content: 'robot-basics-architecture'
      },
      {
        id: 'm2',
        title: '2. ระบบเซนเซอร์และอุปกรณ์ไฟฟ้า INPUT - OUTPUT ในสายการผลิต',
        content: 'robot-sensors-io'
      },
      {
        id: 'm3',
        title: '3. วงจรควบคุมสัญญาณ I/O และการทำ Handshaking ป้องกันการชน',
        content: 'robot-handshaking-interlock'
      },
      {
        id: 'm4',
        title: '4. ระบบพิกัด 3 มิติ กฎมือขวา และโหมดการเคลื่อนที่ (Joint, World, Tool TCP)',
        content: 'robot-coordinates-righthand'
      },
      {
        id: 'm5',
        title: '5. รูปแบบเส้นทางการเคลื่อนที่ (PTP / MOVEJ vs MOVEL & Singularity)',
        content: 'robot-motion-trajectories'
      },
      {
        id: 'm6',
        title: '6. การเขียนโปรแกรมหุ่นยนต์ ตัวแปร คณิตศาสตร์ และตรรกะเงื่อนไข (IF-ELSE)',
        content: 'robot-programming-logic'
      },
      {
        id: 'm7',
        title: '7. การคำนวณ TCP, การ Offset ตำแหน่ง และระบบจัดเรียงพาเลท (Palletizing)',
        content: 'robot-offset-palletizing'
      },
      {
        id: 'm8',
        title: '8. มาตรฐานความปลอดภัยสากล ISO 10218, Deadman Switch และการบำรุงรักษา',
        content: 'robot-safety-maintenance'
      },
      {
        id: 'm9',
        title: '9. หุ่นยนต์ร่วมปฏิบัติการ (Cobots), Direct Teaching & มาตรฐานแรงปะทะ ISO/TS 15066',
        content: 'robot-m9-cobots-direct-teaching'
      },
      {
        id: 'm10',
        title: '10. Digital Twin & โปรแกรมหุ่นยนต์ออฟไลน์ (Offline Programming - OLP)',
        content: 'robot-m10-digital-twin-olp'
      },
      {
        id: 'm11',
        title: '11. การเชื่อมต่อโครงข่ายอุตสาหกรรม (PROFINET / EtherCAT) & ข้อมูล OEE สู่ MES',
        content: 'robot-m11-industrial-fieldbus-mes'
      },
      {
        id: 'm12',
        title: '12. ระบบนำทางด้วยภาพ 3 มิติ (3D Vision Guidance) & AI Bin Picking 6-DoF',
        content: 'robot-m12-ai-vision-binpicking'
      }
    ]
  },
  {
    id: 'c-machine-vision-v2',
    title: 'Advanced AI Machine Vision & Industrial Edge Computing',
    description: 'หลักสูตรวิศวกรรมปัญญาประดิษฐ์แมชชีนวิชันและการประมวลผล Edge Computing ขั้นสูงสำหรับโรงงานอัจฉริยะ: สถาปัตยกรรม Edge NPU, เทคโนโลยีเซนเซอร์ 3D Photometric Stereo & High-Speed CMOS, โมเดลตรวจสอบชิ้นงาน Anchor-Free YOLOv8/v11 & Oriented Bounding Box (OBB), การตรวจจับรอยตำหนิแบบไม่ใช้ข้อมูล NG (Unsupervised Anomaly Detection - PatchCore/FastFlow), Vision Transformers (ViT) & Segment Anything (SAM 2), การแปลงโมเดลด้วย TensorRT INT8 Quantization บน Jetson Orin / Hailo NPU, และการส่งข้อมูล Reject ความเร็วสูงเชื่อมต่อ PROFINET & MES',
    instructor: 'ทีมวิศวกรรมปัญญาประดิษฐ์และระบบอัตโนมัติ (AI & Smart Vision Group)',
    duration: '36 hours (5-6 days)',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    subCategories: ["ทักษะวิชาชีพขั้นสูง","ระบบอัตโนมัติและหุ่นยนต์","ระบบอัตโนมัติและ AI","เปิดรับรองบุคคลภายนอก","การควบคุมคุณภาพ"],
    tags: ["Machine Vision","Edge AI","YOLO OBB","PatchCore","TensorRT","3D Vision","NPU"],
    isFeatured: true,
    featuredBadge: "⚡ ADVANCED AI & EDGE NPU",
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. สถาปัตยกรรมระบบ AI Machine Vision ขั้นสูง & การประมวลผล Edge Computing',
        content: 'vision-v2-m1-architecture'
      },
      {
        id: 'm2',
        title: '2. เทคโนโลยีเซนเซอร์ภาพความเร็วสูง, เลนส์ Smart Optics & 3D Photometric Stereo',
        content: 'vision-v2-m2-smart-optics-3d'
      },
      {
        id: 'm3',
        title: '3. Anchor-Free YOLOv8 / YOLOv11 & การตีกรอบตรวจจับชิ้นงานเอียง (Oriented Bounding Box - OBB)',
        content: 'vision-v2-m3-yolo-obb'
      },
      {
        id: 'm4',
        title: '4. การตรวจจับของเสียแบบไม่ต้องมีรูป NG (Unsupervised Defect Detection: PatchCore / FastFlow)',
        content: 'vision-v2-m4-unsupervised-anomaly'
      },
      {
        id: 'm5',
        title: '5. Vision Transformers (ViT) & Segment Anything Model (SAM 2) ในงานอุตสาหกรรม',
        content: 'vision-v2-m5-vit-sam2'
      },
      {
        id: 'm6',
        title: '6. การ Deploy โมเดลบน Edge NPU (Jetson Orin / Hailo) ด้วย TensorRT INT8 Quantization',
        content: 'vision-v2-m6-edge-npu-tensorrt'
      },
      {
        id: 'm7',
        title: '7. ระบบขับดันของเสียความเร็วสูง (High-Speed Reject), PROFINET IRT & Data Pipeline สู่ MES',
        content: 'vision-v2-m7-reject-mes-integration'
      }
    ]
  }
];


export const CURATED_TRACKS = [
  {
    id: 'advanced-skills',
    title: 'หลักสูตรทักษะวิชาชีพขั้นสูง (Advanced Future Skills)',
    subtitle: 'หลักสูตรเฉพาะทางเพื่อยกระดับทักษะบุคลากรตามมาตรฐานอุตสาหกรรม 4.0 และสิทธิประโยชน์พัฒนาทักษะ',
    badge: '✨ High-Impact Track',
    filterTag: 'ทักษะวิชาชีพขั้นสูง',
    color: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/30',
    tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  },
  {
    id: 'robotics-automation',
    title: 'ระบบอัตโนมัติ หุ่นยนต์ และ AI Vision (Robotics & Smart Factory)',
    subtitle: 'การควบคุมแขนกล 6 แกน, การประมวลผลภาพอัจฉริยะ, PLC และระบบดิจิทัลสำหรับโรงงานอัจฉริยะ',
    badge: '🤖 Smart Automation',
    filterTag: 'ระบบอัตโนมัติและหุ่นยนต์',
    color: 'from-fuchsia-500/20 via-violet-500/10 to-transparent',
    borderColor: 'border-fuchsia-500/30',
    tagColor: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20'
  },
  {
    id: 'manufacturing-tooling',
    title: 'วิศวกรรมการผลิตและเทคโนโลยีเครื่องจักร (Manufacturing & Tooling)',
    subtitle: 'กระบวนการ PPAP, การออกแบบแม่พิมพ์ CAD-CAM, เครื่องจักร CNC 4.0 และสถาปัตยกรรมยานยนต์ไฟฟ้า',
    badge: '⚙️ Precision Tooling',
    filterTag: 'วิศวกรรมเครื่องจักรและแม่พิมพ์',
    color: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-500/30',
    tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
  },
  {
    id: 'quality-iso-audits',
    title: 'ระบบมาตรฐานสากลและการตรวจประเมินคุณภาพ (ISO & Global Compliance)',
    subtitle: 'มาตรฐาน ISO 9001, 14001, 45001, 17025 และแนวทางการเตรียมความพร้อมรับการตรวจออดิทสากล',
    badge: '📜 ISO & Audit Ready',
    filterTag: 'มาตรฐานสากลและการตรวจประเมิน',
    color: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/30',
    tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  }
];
