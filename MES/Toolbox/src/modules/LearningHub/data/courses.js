import { CATEGORY_OFFLINE_IMAGES, COURSE_OFFLINE_IMAGES, COURSE_PHOTO_MAP, getCourseImage } from './offlineAssets';

export const courses = [
  // --- Category: เครื่องจักรและวิศวกรรมการผลิต (Manufacturing & Engineering) ---
  {
    id: 'c-ppap',
    title: 'PPAP & Advanced Manufacturing Quality Masterclass',
    description: 'หลักสูตรวิศวกรรมกระบวนการผลิตและคู่มือบำรุงรักษาเครื่องจักร: การจัดทำ PFMEA AIAG-VDA, จุดควบคุมคุณภาพสำคัญ Q-Points (CTQ), ระบบสืบย้อนกลับสมบูรณ์แบบ, แผนการตรวจสอบ, การบำรุงรักษาแม่พิมพ์/เครื่องจักร (PM/TPM), และการรับรองบรรจุภัณฑ์',
    instructor: 'Manufacturing Quality Director',
    duration: '6 hours',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: COURSE_PHOTO_MAP['c-ppap'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-iso-9001'] || CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
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
    image: COURSE_PHOTO_MAP['c-iso-14001'] || CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
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
    image: COURSE_PHOTO_MAP['c-iso-45001'] || CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
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
    image: COURSE_PHOTO_MAP['c-iso-17025'] || CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
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
    image: COURSE_PHOTO_MAP['c-customer-audits'] || CATEGORY_OFFLINE_IMAGES['การตรวจโรงงานและเอกสารลูกค้า'],
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
    image: COURSE_PHOTO_MAP['c-live-qa'] || CATEGORY_OFFLINE_IMAGES['กรณีศึกษาหน้างานจริง'],
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
    title: 'Stage 5A: React + Vite Production Architecture Guide (MES SPA)',
    description: 'คู่มือโครงสร้างและสถาปัตยกรรมแอปพลิเคชันเว็บโรงงาน (React + Vite): โครงสร้างโฟลเดอร์, การจัดการ State, โมดูลระบบ, เทคโนโลยี Stack, และมาตรฐานการพัฒนาโปรแกรมร่วมกันของทีมวิศวกรรม',
    instructor: 'Engineering Team (MES Architecture Group)',
    duration: '1.5 hours',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: COURSE_PHOTO_MAP['c3'] || COURSE_OFFLINE_IMAGES['c3'],
    subCategories: ["สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม", "ระบบอัตโนมัติและดิจิทัล", "ทักษะวิชาชีพขั้นสูง", "เปิดรับรองบุคคลภายนอก"],
    tags: ["React", "Vite", "SPA", "Full-Stack", "MES", "Frontend"],
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
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
    title: 'Stage 5B: Enterprise System & Security Architecture (MES x SAP)',
    description: 'คู่มือระบบหลังบ้าน ความปลอดภัยเครือข่าย และการเชื่อมต่อข้อมูลองค์กร: แผนผังสถาปัตยกรรม Edge-App-ERP, การป้องกันภัยคุกคาม (CSRF/SQL Injection), ระบบสิทธิ์ผู้ใช้งาน (RBAC), และการเชื่อมโยงระบบ SAP',
    instructor: 'Engineering Team (MES Security Group)',
    duration: '2.5 hours',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: COURSE_PHOTO_MAP['c4'] || COURSE_OFFLINE_IMAGES['c4'],
    subCategories: ["สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม", "ระบบอัตโนมัติและดิจิทัล", "ทักษะวิชาชีพขั้นสูง", "เปิดรับรองบุคคลภายนอก"],
    tags: ["Security", "SAP", "ERP", "CSRF", "RBAC", "Full-Stack", "MES"],
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
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
    image: COURSE_PHOTO_MAP['c1'] || CATEGORY_OFFLINE_IMAGES['การบริหารและการเพิ่มผลผลิต'],
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
    image: COURSE_PHOTO_MAP['c2'] || CATEGORY_OFFLINE_IMAGES['การบริหารและการเพิ่มผลผลิต'],
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
    image: COURSE_PHOTO_MAP['c-enterprise-app'] || COURSE_OFFLINE_IMAGES['c-enterprise-app'],
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


  // =========================================================================
  // --- Enterprise Full-Stack Continuation Track (Stages 2, 3, 4) ---
  // =========================================================================
  {
    id: 'c-industrial-backend-api',
    title: 'Stage 2: Industrial Backend & RESTful API Engineering (Node.js & PHP PDO)',
    isFeatured: false,
    featuredBadge: '🚀 STAGE 2 · BACKEND & API SERVER',
    description: 'หลักสูตรต่อยอดจาก Front-End สู่การเป็นผู้สร้าง REST API Server ระดับโรงงาน: สถาปัตยกรรมฝั่ง Server, มาตรฐาน JSON Contract, การรับส่งข้อมูล GET/POST/PUT/DELETE, การเชื่อมต่อฐานข้อมูลด้วย PDO Prepared Statements ป้องกัน SQL Injection 100%, ระบบยืนยันตัวตน Session/JWT/RBAC/CSRF, และการบันทึก Audit Trail มาตรฐาน ISO',
    instructor: 'ทีมวิศวกรรมซอฟต์แวร์และสถาปัตยกรรมระบบ (MES Full-Stack Academy)',
    duration: '18 hours (3 days)',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: COURSE_PHOTO_MAP['c-industrial-backend-api'] || COURSE_OFFLINE_IMAGES['c-industrial-backend-api'],
    subCategories: ["สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม", "ระบบอัตโนมัติและดิจิทัล", "ทักษะวิชาชีพขั้นสูง", "เปิดรับรองบุคคลภายนอก"],
    tags: ["Backend", "REST API", "PHP", "Node.js", "PDO", "SQL Injection", "CSRF", "Full-Stack", "MES"],
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. สถาปัตยกรรมฝั่ง Server & การออกแบบ RESTful API Contract มาตรฐานโรงงาน',
        content: 'backend-m1-architecture',
        checkpoint: {
          question: 'ตามมาตรฐานสถาปัตยกรรม MES API ทุก Endpoint ต้องส่งผลลัพธ์ JSON กลับในโครงสร้าง 3 คีย์หลักใดเสมอ?',
          options: [
            'A: {"success": bool, "data": mixed, "message": string}',
            'B: {"status": int, "html": string, "error": bool}',
            'C: {"ok": true, "rows": array}',
            'D: ส่งเป็นข้อความธรรมดาโดยไม่ต้องแปลงเป็น JSON'
          ],
          correctAnswer: 0,
          hint: 'ดูในหัวข้อ API Response Contract มาตรฐานเดียวกันทั้งองค์กร',
          explanation: 'การกำหนดมาตรฐาน {"success", "data", "message"} เหมือนกันทุก API ช่วยให้ฝั่ง Front-End ดักจับสถานะและแสดงแจ้งเตือนได้อย่างเป็นระบบ'
        }
      },
      {
        id: 'm2',
        title: '2. การสร้าง API Endpoint จริง (GET, POST, PUT, DELETE) & Server-Side Validation',
        content: 'backend-m2-endpoints',
        checkpoint: {
          question: 'เหตุใดจึงต้องตรวจสอบความถูกต้องของข้อมูล (Input Validation) ที่ฝั่ง Server ซ้ำอีกครั้ง แม้ว่าหน้าเว็บจะมี JavaScript ตรวจแล้ว?',
          options: [
            'A: เพราะการตรวจที่ฝั่ง Client สามารถถูกข้ามหรือแก้ไขผ่าน DevTools / การยิง API ตรงได้เสมอ',
            'B: เพื่อทำให้เซิร์ฟเวอร์ทำงานช้าลง',
            'C: เพราะเบราว์เซอร์ไม่สามารถรัน JavaScript ได้',
            'D: ไม่จำเป็นต้องตรวจซ้ำ'
          ],
          correctAnswer: 0,
          hint: 'พิจารณาหลักการ Client-side validation is a UX convenience, NOT a security boundary',
          explanation: 'ผู้ไม่หวังดีสามารถส่ง HTTP Request ตรงเข้า API โดยไม่ผ่านหน้าเว็บ ดังนั้น Server จึงเป็นปราการด่านสุดท้ายที่ต้องตรวจสอบชนิดข้อมูลและขอบเขตตัวเลขทุกครั้ง'
        }
      },
      {
        id: 'm3',
        title: '3. การเชื่อมต่อฐานข้อมูลด้วย Prepared Statements & การป้องกัน SQL Injection 100%',
        content: 'backend-m3-pdo-security',
        checkpoint: {
          question: 'กลไกใดที่ป้องกันช่องโหว่ SQL Injection ได้อย่างเด็ดขาด 100% ในการเขียนโค้ดเชื่อมต่อฐานข้อมูล?',
          options: [
            'A: การใช้ Parameterized Queries (PDO Prepared Statements) แยกคำสั่ง SQL ออกจากข้อมูลตัวแปร',
            'B: การนำตัวแปร $_POST มาต่อ String เข้ากับคำสั่ง SELECT โดยตรง',
            'C: การซ่อนชื่อตารางด้วยรหัสลับ',
            'D: การตรวจสอบเฉพาะที่หน้า HTML ด้วย required attribute'
          ],
          correctAnswer: 0,
          hint: 'ทดลองในห้องแล็บ Interactive SQL Injection Defense ด้านบน',
          explanation: 'Prepared Statements จะส่งโครงสร้างคำสั่ง SQL ไปคอมไพล์ที่ฐานข้อมูลก่อน แล้วจึงส่งค่าตัวแปรตามเข้าไปในฐานะข้อมูลล้วนๆ ทำให้ไม่สามารถฉีดคำสั่งแทรกซ้อนได้'
        }
      },
      {
        id: 'm4',
        title: '4. ระบบยืนยันตัวตน Session Hygiene, JWT, RBAC & CSRF Token Enforcement',
        content: 'backend-m4-auth-csrf',
        checkpoint: {
          question: 'ทุกคำสั่งที่เปลี่ยนแปลงข้อมูลในฐานข้อมูล (POST, PUT, DELETE) ต้องตรวจสอบสิ่งใดควบคู่กับ Session เพื่อป้องกันการปลอมแปลงคำสั่งข้ามเว็บไซต์?',
          options: [
            'A: ตรวจสอบ CSRF Token (Cross-Site Request Forgery Token)',
            'B: ตรวจสอบความละเอียดหน้าจอของผู้ใช้',
            'C: ตรวจสอบยี่ห้อโทรศัพท์มือถือ',
            'D: ตรวจสอบความเร็วอินเทอร์เน็ต'
          ],
          correctAnswer: 0,
          hint: 'ดูในหัวข้อ CSRF Token Enforcement',
          explanation: 'การตรวจสอบ CSRF Token ด้วย hash_equals() ยืนยันว่าคำสั่งแก้ไขข้อมูลถูกกดมาจากหน้าเว็บจริงของระบบเรา ไม่ใช่สคริปต์แอบแฝงจากเว็บภายนอก'
        }
      },
      {
        id: 'm5',
        title: '5. Error Handling, Transaction Rollback & ระบบบันทึก Audit Trail มาตรฐาน ISO',
        content: 'backend-m5-audit-resilience',
        checkpoint: {
          question: 'เมื่อเกิดข้อผิดพลาดขึ้นระหว่างการอัปเดตหลายตารางในบล็อก try...catch สิ่งแรกที่ต้องทำในบล็อก catch คือข้อใด?',
          options: [
            'A: สั่งยกเลิกธุรกรรมที่ค้างอยู่ ($pdo->rollBack()) เพื่อคืนค่าข้อมูลกลับสู่สถานะเดิมก่อนเกิดข้อผิดพลาด',
            'B: สั่ง commit() ข้อมูลที่ทำค้างไว้ครึ่งเดียวทันที',
            'C: แสดงรหัสผ่านฐานข้อมูลออกทางหน้าจอเพื่อช่วยวิเคราะห์ปัญหา',
            'D: ลบตารางทิ้งแล้วสร้างใหม่'
          ],
          correctAnswer: 0,
          hint: 'พิจารณาหลักการ Atomicity ในการจัดการ Transaction',
          explanation: 'การทำ rollBack() รับประกันว่าข้อมูลจะไม่ค้างคาครึ่งๆ กลางๆ (เช่น หักสต็อกแล้วแต่บันทึกประวัติไม่สำเร็จ) พร้อมทั้งบันทึก Error Log และส่งข้อความที่ปลอดภัยกลับไปหาผู้ใช้'
        }
      }
    ],
    quiz: [
      {
        id: 'be-q1',
        question: 'ข้อใดคือโครงสร้างมาตรฐานของ JSON Response ที่ API ในระบบ MES ต้องส่งกลับเสมอ?',
        options: [
          'A: {"success": boolean, "data": mixed, "message": string}',
          'B: {"result": string, "code": number}',
          'C: {"payload": array}',
          'D: ไม่จำกัดรูปแบบ'
        ],
        correctAnswer: 0,
        explanation: 'โครงสร้าง {"success", "data", "message"} เป็นสัญญา (API Contract) มาตรฐานที่ช่วยให้ Front-End และ Mobile App ทำงานร่วมกับทุก API ได้อย่างไม่มีข้อผิดพลาด'
      },
      {
        id: 'be-q2',
        question: 'เหตุใดจึงห้ามนำตัวแปรจากผู้ใช้มาต่อ String ในคำสั่ง SQL เช่น "SELECT * FROM USERS WHERE id = " + $id?',
        options: [
          'A: เพราะทำให้เกิดช่องโหว่ SQL Injection ที่ผู้โจมตีสามารถแทรกคำสั่งขโมยหรือทำลายฐานข้อมูลได้',
          'B: เพราะทำให้ตัวอักษรแสดงผลเป็นภาษาต่างดาว',
          'C: เพราะใช้หน่วยความจำมากกว่าปกติเล็กน้อย',
          'D: เพราะ SQL Server ไม่รองรับเครื่องหมายอัญประกาศเดี่ยว'
        ],
        correctAnswer: 0,
        explanation: 'การต่อ String เปิดโอกาสให้ผู้โจมตีป้อนค่าเช่น OR 1=1 เพื่อบิดเบือนตรรกะของคำสั่ง SQL จึงต้องใช้ Prepared Statements เท่านั้น'
      },
      {
        id: 'be-q3',
        question: 'การตั้งค่าคุกกี้ Session ด้วยแฟล็ก HttpOnly มีประโยชน์อย่างไรต่อความปลอดภัยของพนักงานที่ใช้มือถือส่วนตัว?',
        options: [
          'A: ป้องกันไม่ให้สคริปต์ JavaScript แปลกปลอม (XSS) เข้ามาอ่านหรือขโมยค่า Session ID จากเบราว์เซอร์ได้',
          'B: ทำให้เว็บไซต์ทำงานโดยไม่ต้องใช้อินเทอร์เน็ต',
          'C: ช่วยลดขนาดรูปภาพบนหน้าเว็บอัตโนมัติ',
          'D: ปิดกั้นการใช้ HTTPS'
        ],
        correctAnswer: 0,
        explanation: 'แฟล็ก HttpOnly สั่งให้เบราว์เซอร์ซ่อนคุกกี้จาก document.cookie จึงป้องกันการขโมยเซสชันผ่านช่องโหว่ XSS ได้อย่างมีประสิทธิภาพ'
      },
      {
        id: 'be-q4',
        question: 'ตามมาตรฐานการตรวจออดิทโรงงาน การแก้ไขหรือลบข้อมูลสำคัญในฐานข้อมูลต้องบันทึกสิ่งใดลงใน Audit Log เสมอ?',
        options: [
          'A: ข้อมูลก่อนแก้ไข (oldData), ข้อมูลหลังแก้ไข (newData), รหัสผู้ทำรายการ และเวลาที่ทำรายการ',
          'B: บันทึกเฉพาะชื่อหน้าเว็บที่เปิดใช้งาน',
          'C: บันทึกเฉพาะเมื่อเกิด Error เท่านั้น',
          'D: ไม่ต้องบันทึกเพื่อประหยัดพื้นที่ฮาร์ดดิสก์'
        ],
        correctAnswer: 0,
        explanation: 'การบันทึกทั้ง oldData และ newData ทำให้สามารถตรวจสอบย้อนกลับได้ 100% ว่ามีการเปลี่ยนแปลงค่าใดไปเป็นค่าใด'
      }
    ]
  },
  {
    id: 'c-industrial-database-sql',
    title: 'Stage 3: Industrial Database Engineering & SQL Server for MES',
    isFeatured: false,
    featuredBadge: '🗄️ STAGE 3 · DATABASE & SQL SERVER',
    description: 'หลักสูตรการออกแบบและบริหารจัดการฐานข้อมูลโรงงานด้วย Microsoft SQL Server: การออกแบบ ER Schema (Work Order, BOM, Inventory, Traceability), คำสั่ง SQL เชิงลึกและ Server-Side Pagination, การเขียน Stored Procedures คำนวณ OEE แบบ Real-Time, การควบคุม ACID Transactions ป้องกันสต็อกเพี้ยน, และการทำ Indexing รองรับข้อมูลระดับล้านแถว',
    instructor: 'ทีมวิศวกรรมฐานข้อมูลและระบบการผลิต (MES Data Architecture Group)',
    duration: '24 hours (4 days)',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: COURSE_PHOTO_MAP['c-industrial-database-sql'] || COURSE_OFFLINE_IMAGES['c-industrial-database-sql'],
    subCategories: ["สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม", "ระบบอัตโนมัติและดิจิทัล", "ทักษะวิชาชีพขั้นสูง", "เปิดรับรองบุคคลภายนอก"],
    tags: ["SQL Server", "Database", "OEE", "Stored Procedure", "Transaction", "Indexing", "Full-Stack", "MES"],
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. การออกแบบตารางฐานข้อมูลโรงงาน (ER Diagram: Work Order, BOM, Inventory & Traceability)',
        content: 'db-m1-schema-design',
        checkpoint: {
          question: 'ในการเก็บข้อมูลน้ำหนักวัตถุดิบหรือจำนวนสต็อกที่ต้องการความแม่นยำทศนิยม 3 ตำแหน่ง ควรเลือกใช้ชนิดข้อมูลใดใน SQL Server?',
          options: [
            'A: DECIMAL(12,3) หรือ DECIMAL(18,3) เพื่อป้องกันความคลาดเคลื่อนจากการปัดเศษทศนิยมฐานสอง',
            'B: FLOAT เพราะปัดเศษแบบประมาณค่าได้',
            'C: VARCHAR(255) เพื่อเก็บตัวเลขเป็นข้อความ',
            'D: BIT'
          ],
          correctAnswer: 0,
          hint: 'พิจารณาความแม่นยำทางวิศวกรรมและการบัญชีคลังสินค้า',
          explanation: 'ชนิดข้อมูล DECIMAL เก็บค่าตัวเลขทศนิยมแบบ Exact Numeric จึงไม่มีปัญหาทศนิยมเพี้ยนเหมือน FLOAT'
        }
      },
      {
        id: 'm2',
        title: '2. คำสั่ง SQL สำหรับสายการผลิต (SELECT, JOIN, Aggregation & Pagination OFFSET-FETCH)',
        content: 'db-m2-sql-queries',
        checkpoint: {
          question: 'ทำไมจึงห้ามใช้คำสั่ง SELECT * โดยไม่มีการจำกัดจำนวนแถว (TOP หรือ OFFSET-FETCH) กับตารางบันทึกการผลิตขนาดใหญ่?',
          options: [
            'A: เพราะจะดึงข้อมูลจำนวนมหาศาลออกมากินหน่วยความจำและแบนด์วิดท์จนทำให้เซิร์ฟเวอร์และมือถือของผู้ใช้ค้าง',
            'B: เพราะ SQL Server ไม่รู้จักเครื่องหมายดอกจัน (*)',
            'C: เพราะจะทำให้ข้อมูลในตารางถูกลบ',
            'D: ไม่มีผลกระทบใดๆ'
          ],
          correctAnswer: 0,
          hint: 'ดูในหัวข้อ Server-Side Pagination และ Query Efficiency',
          explanation: 'ตารางธุรกรรมในโรงงานมีข้อมูลสะสมหลายแสนถึงหลายล้านแถว จึงต้องระบุเฉพาะคอลัมน์ที่ใช้งานและทำ Server-Side Pagination เสมอ'
        }
      },
      {
        id: 'm3',
        title: '3. Stored Procedures & การคำนวณดัชนี OEE / Cycle Time / Scrap Rate แบบ Real-Time',
        content: 'db-m3-oee-stored-procs',
        checkpoint: {
          question: 'ในการเขียนคำสั่ง SQL คำนวณเปอร์เซ็นต์ OEE หรือของเสีย ฟังก์ชันใดช่วยป้องกันไม่ให้เกิด Error หารด้วยศูนย์ (Divide by Zero) เมื่อเพิ่งเริ่มกะและยอดผลิตยังเป็น 0?',
          options: [
            'A: การใช้ NULLIF(ตัวหาร, 0) ร่วมกับ ISNULL/COALESCE',
            'B: การบวก 100 เข้าไปในตัวหารเสมอ',
            'C: การลบแถวที่เป็น 0 ทิ้งจากฐานข้อมูล',
            'D: ไม่สามารถป้องกันได้ใน SQL'
          ],
          correctAnswer: 0,
          hint: 'ดูในโค้ดตัวอย่าง Stored Procedure คำนวณ OEE',
          explanation: 'NULLIF(total_pcs, 0) จะเปลี่ยนค่าตัวหารที่เป็น 0 ให้กลายเป็น NULL ทำให้ผลหารเป็น NULL แทนที่จะเกิดข้อผิดพลาดแครชทั้งคิวรี'
        }
      },
      {
        id: 'm4',
        title: '4. ACID Transactions, Isolation Levels & การป้องกัน Race Condition ตอนตัดสต็อก',
        content: 'db-m4-acid-transactions',
        checkpoint: {
          question: 'เมื่อพนักงาน 2 คนยิงบาร์โค้ดเบิกสินค้าชิ้นสุดท้ายพร้อมกันในเสี้ยววินาที คำสั่ง Table Hint ใดใน Transaction ที่ช่วยล็อกแถวข้อมูลไม่ให้อ่านค่าซ้ำซ้อนกัน?',
          options: [
            'A: WITH (UPDLOCK, ROWLOCK) ขณะอ่านยอดคงเหลือเพื่อเตรียมอัปเดต',
            'B: WITH (NOLOCK) เพื่ออ่านข้อมูลโดยไม่สนใจการล็อก',
            'C: ORDER BY RAND()',
            'D: TRUNCATE TABLE'
          ],
          correctAnswer: 0,
          hint: 'ดูในตัวอย่างโค้ดการตัดสต็อกไร้ปัญหา Race Condition',
          explanation: 'UPDLOCK จะเข้าล็อกแถวที่กำลังจะแก้ไขไว้ก่อน ทำให้ธุรกรรมที่เข้ามาพร้อมกันต้องรอจนกว่าธุรกรรมแรกจะตัดสต็อกและ COMMIT เสร็จสิ้น'
        }
      },
      {
        id: 'm5',
        title: '5. Indexing Strategy, Query Optimization & การดูแลรักษาฐานข้อมูลระดับล้านแถว',
        content: 'db-m5-indexing-performance',
        checkpoint: {
          question: 'การเขียนเงื่อนไข WHERE ข้อใดที่ทำให้ SQL Server สามารถใช้งาน Index ได้อย่างเต็มประสิทธิภาพ (SARGable Query)?',
          options: [
            "A: WHERE recorded_at >= '2026-11-06' AND recorded_at < '2026-11-07'",
            "B: WHERE CONVERT(VARCHAR, recorded_at, 112) = '20261106'",
            'C: WHERE YEAR(recorded_at) = 2026 AND MONTH(recorded_at) = 11',
            "D: WHERE SUBSTRING(machine_code, 1, 3) = 'PRS'"
          ],
          correctAnswer: 0,
          hint: 'ห้ามครอบฟังก์ชันลงบนคอลัมน์ฝั่งซ้ายของเครื่องหมายเปรียบเทียบ',
          explanation: 'การเปรียบเทียบคอลัมน์โดยตรงกับช่วงเวลาช่วยให้ SQL Server ทำ Index Seek กระโดดไปยังตำแหน่งข้อมูลได้ทันทีโดยไม่ต้องกวาดอ่านทั้งตาราง'
        }
      }
    ],
    quiz: [
      {
        id: 'db-q1',
        question: 'สูตรมาตรฐานสากลในการคำนวณค่าประสิทธิผลโดยรวมของเครื่องจักร (OEE) ในระบบฐานข้อมูล MES คือข้อใด?',
        options: [
          'A: Availability × Performance × Quality',
          'B: (Good Count + Reject Count) ÷ Planned Time',
          'C: Voltage × Current × Power Factor',
          'D: Target Quantity - Completed Quantity'
        ],
        correctAnswer: 0,
        explanation: 'OEE คำนวณจากผลคูณของอัตราการเดินเครื่อง (Availability), ประสิทธิภาพความเร็วการผลิต (Performance), และอัตราคุณภาพชิ้นงานดี (Quality)'
      },
      {
        id: 'db-q2',
        question: 'คุณสมบัติ Atomicity ในหลักการ ACID Transactions ของฐานข้อมูลโรงงานหมายถึงอะไร?',
        options: [
          'A: ชุดคำสั่งในธุรกรรมเดียวกันต้องทำงานสำเร็จครบทุกขั้นตอนทั้งหมด มิฉะนั้นต้องถูกยกเลิก (Rollback) กลับสู่สภาพเดิมทั้งหมด',
          'B: การอนุญาตให้ตารางเก็บข้อมูลซ้ำซ้อนกันได้โดยไม่มีขีดจำกัด',
          'C: การบีบอัดขนาดไฟล์ฐานข้อมูลให้เล็กลงอัตโนมัติ',
          'D: การรันคำสั่งโดยไม่ต้องตรวจสอบสิทธิ์ผู้ใช้'
        ],
        correctAnswer: 0,
        explanation: 'Atomicity รับประกันว่าจะไม่มีข้อมูลตกค้างครึ่งๆ กลางๆ เช่น หากตัดยอดคลังสำเร็จแต่ลงประวัติการเบิกล้มเหลว ระบบต้องคืนยอดคลังกลับทันที'
      },
      {
        id: 'db-q3',
        question: 'การใช้ INCLUDE (good_qty, reject_qty) ในการสร้าง Non-Clustered Index (Covering Index) ช่วยเพิ่มความเร็วได้อย่างไร?',
        options: [
          'A: ทำให้ SQL Server อ่านค่ายอดผลิตได้จบในตัว Index ทันทีโดยไม่ต้องเสียเวลาวิ่งกลับไปเปิดอ่านตารางหลัก (Key Lookup)',
          'B: ทำให้ไม่ต้องเขียนคำสั่ง WHERE อีกต่อไป',
          'C: ช่วยลบข้อมูลเก่าทิ้งอัตโนมัติทุกเที่ยงคืน',
          'D: เปลี่ยนชนิดข้อมูลจากตัวเลขเป็นรูปภาพ'
        ],
        correctAnswer: 0,
        explanation: 'Covering Index เก็บคอลัมน์ที่ใช้แสดงผลแนบไว้ที่ปลายทางของ Index Tree จึงลดการอ่านดิสก์ (I/O) ลงได้อย่างมหาศาล'
      },
      {
        id: 'db-q4',
        question: 'หากต้องการสืบย้อนกลับ (Traceability) ว่าสินค้าสำเร็จรูปที่มีปัญหาผลิตมาจากคอยล์เหล็กม้วนใด ต้องเชื่อมโยงข้อมูลอย่างไร?',
        options: [
          'A: เชื่อมโยงรหัส Lot สินค้าใน PRODUCTION_LOGS เข้ากับ coil_lot_no, machine_code, wo_id และรหัสพนักงานผู้เดินเครื่อง',
          'B: สอบถามจากความจำของพนักงานในกะนั้น',
          'C: ดูจากวันที่สร้างตารางฐานข้อมูล',
          'D: ไม่ต้องเก็บข้อมูลคอยล์เหล็กในฐานข้อมูล'
        ],
        correctAnswer: 0,
        explanation: 'การออกแบบตาราง PRODUCTION_LOGS ให้ผูก Foreign Key และเก็บรหัส Lot วัตถุดิบคู่กับใบสั่งผลิต ทำให้สืบย้อนกลับได้ภายในไม่กี่วินาที'
      }
    ]
  },
  {
    id: 'c-iiot-nodered-edge',
    title: 'Stage 4: Industrial IoT (IIoT), Node-RED & PLC Edge Integration',
    isFeatured: false,
    featuredBadge: '📡 STAGE 4 · IIoT, NODE-RED & PLC',
    description: 'หลักสูตรการเชื่อมโยงฮาร์ดแวร์เครื่องจักรหน้างานเข้าสู่ระบบฐานข้อมูล MES: สถาปัตยกรรม Edge Gateway, โปรโตคอล Modbus TCP / OPC-UA / MQTT, การอ่านค่า PLC Holding Registers และการแปลงสเกลสัญญาณอนาล็อก 4-20mA, การสร้าง Data Pipeline บน Node-RED, โครงสร้าง MQTT Unified Namespace (ISA-95), และระบบ Store-and-Forward ป้องกันข้อมูลสูญหายเมื่อเครือข่ายขัดข้อง',
    instructor: 'ทีมวิศวกรรมระบบอัตโนมัติและ IIoT (Smart Factory Connectivity Group)',
    duration: '24 hours (4 days)',
    category: 'โปรแกรมและระบบดิจิทัล',
    image: COURSE_PHOTO_MAP['c-iiot-nodered-edge'] || COURSE_OFFLINE_IMAGES['c-iiot-nodered-edge'],
    subCategories: ["สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม", "ระบบอัตโนมัติและดิจิทัล", "ระบบอัตโนมัติและหุ่นยนต์", "ทักษะวิชาชีพขั้นสูง", "เปิดรับรองบุคคลภายนอก"],
    tags: ["IIoT", "Node-RED", "PLC", "Modbus", "MQTT", "OPC-UA", "Edge", "Full-Stack", "MES"],
    level: "Level 4 (Certified Expert)",
    isPublicEligible: true,
    modules: [
      {
        id: 'm1',
        title: '1. สถาปัตยกรรม Edge Gateway & โปรโตคอลอุตสาหกรรม (Modbus TCP, OPC-UA & MQTT)',
        content: 'iiot-m1-protocols',
        checkpoint: {
          question: 'โปรโตคอลใดที่ใช้รูปแบบการสื่อสารแบบ Publish / Subscribe ผ่านตัวกลาง (Broker) และกินแบนด์วิดท์ต่ำมาก เหมาะกับการส่งข้อมูลจาก Edge Gateway ขึ้นสู่ระบบกลาง?',
          options: [
            'A: MQTT (Message Queuing Telemetry Transport)',
            'B: FTP (File Transfer Protocol)',
            'C: SMTP',
            'D: VGA'
          ],
          correctAnswer: 0,
          hint: 'ดูในตารางเปรียบเทียบโปรโตคอลเชื่อมต่อเครื่องจักรสู่ระบบ MES',
          explanation: 'MQTT ออกแบบมาสำหรับงาน IoT และอุตสาหกรรมที่มีอุปกรณ์จำนวนมาก ใช้รูปแบบ Publish/Subscribe ที่รวดเร็วและมีระบบรับประกันการส่งข้อมูล (QoS)'
        }
      },
      {
        id: 'm2',
        title: '2. การอ่านค่า PLC Memory Map (Coils, Holding Registers) & การแปลงข้อมูลทางวิศวกรรม',
        content: 'iiot-m2-plc-registers',
        checkpoint: {
          question: 'หากอ่านค่าดิบจาก PLC Holding Register (12-bit ADC: ช่วง 0 ถึง 4095) ได้ค่าเท่ากับ 2048 เมื่อแปลงเป็นแรงดันสเกล 0.0 ถึง 10.0 Bar จะได้ค่าประมาณเท่าใด?',
          options: [
            'A: ประมาณ 5.00 Bar (ครึ่งหนึ่งของสเกลสูงสุด)',
            'B: 204.8 Bar',
            'C: 0.00 Bar',
            'D: 10.00 Bar'
          ],
          correctAnswer: 0,
          hint: 'ทดลองเลื่อนสไลเดอร์ใน IIoT Edge Gateway Simulator ด้านบนที่ค่า 2048',
          explanation: 'ค่า 2048 คือจุดกึ่งกลางของช่วง 0–4095 ดังนั้น (2048 / 4095) × 10 Bar จึงเท่ากับ 5.00 Bar'
        }
      },
      {
        id: 'm3',
        title: '3. การพัฒนา Data Pipeline ด้วย Node-RED (Flow Design, Function Nodes & Edge Logic)',
        content: 'iiot-m3-nodered-flows',
        checkpoint: {
          question: 'ในการเขียน Flow บน Node-RED เพื่อส่งแจ้งเตือนเข้ากลุ่มแชตเมื่อเครื่องจักรขึ้นสถานะ ALARM เราควรออกแบบตรรกะอย่างไรเพื่อไม่ให้ข้อความเด้งรัวซ้ำทุกวินาที?',
          options: [
            'A: เก็บสถานะก่อนหน้าไว้ใน Context (flow.get/set) และส่งแจ้งเตือนเฉพาะจังหวะที่สถานะเปลี่ยนจากปกติเข้าสู่ ALARM ครั้งแรก (State Change Detection)',
            'B: ตั้งเวลาส่งซ้ำทุกๆ 100 มิลลิวินาที',
            'C: ถอดสายแลนออกเมื่อเกิด ALARM',
            'D: ไม่ต้องส่งแจ้งเตือนใดๆ'
          ],
          correctAnswer: 0,
          hint: 'ดูในโค้ดตัวอย่าง Function Node ป้องกันการส่งแจ้งเตือนซ้ำ',
          explanation: 'การตรวจจับขอบขาขึ้นของการเปลี่ยนสถานะ (Rising Edge / State Transition) ช่วยให้ส่งแจ้งเตือนทันทีที่เกิดเหตุโดยไม่สแปมกลุ่มแจ้งเตือน'
        }
      },
      {
        id: 'm4',
        title: '4. สถาปัตยกรรม MQTT Broker, Unified Namespace (UNS) & การส่งข้อมูลเข้า SQL Server',
        content: 'iiot-m4-mqtt-uns-sql',
        checkpoint: {
          question: 'ข้อใดคือการตั้งชื่อ MQTT Topic ตามหลักการ Unified Namespace (UNS / ISA-95) ที่เป็นระเบียบและสื่อความหมายชัดเจนที่สุด?',
          options: [
            'A: snc/rayong/stamping/line-a/press-01/telemetry',
            'B: data123/temp',
            'C: test/my_topic/abc',
            'D: 192.168.1.50'
          ],
          correctAnswer: 0,
          hint: 'พิจารณาการเรียงลำดับชั้นตามมาตรฐาน ISA-95: Enterprise / Site / Area / Line / Machine',
          explanation: 'การจัดลำดับชั้นตามโครงสร้างโรงงานจริงทำให้สามารถใช้ Wildcard (เช่น snc/rayong/stamping/+/+/telemetry) เพื่อดึงข้อมูลทั้งแผนกได้อย่างง่ายดาย'
        }
      },
      {
        id: 'm5',
        title: '5. ระบบ Store-and-Forward (Offline Buffering) & เครือข่ายความปลอดภัย OT Firewall',
        content: 'iiot-m5-edge-resilience',
        checkpoint: {
          question: 'กลไก Store-and-Forward บนอุปกรณ์ Edge Gateway มีหน้าที่สำคัญอย่างไรเมื่อสายแลนหลักของโรงงานเกิดขัดข้องชั่วคราว?',
          options: [
            'A: พักข้อมูลการผลิตพร้อมเวลาที่เกิดเหตุจริง (Source Timestamp) ลงหน่วยความจำในตัวเครื่อง Edge ไว้ก่อน แล้วทยอยส่งเข้าฐานข้อมูลอัตโนมัติเมื่อเครือข่ายกลับมาออนไลน์',
            'B: สั่งหยุดเครื่องจักรในสายการผลิตทั้งหมดทันที',
            'C: ทิ้งข้อมูลช่วงที่เน็ตหลุดไปทั้งหมดโดยไม่ต้องบันทึก',
            'D: สุ่มตัวเลขขึ้นมาใส่แทนข้อมูลจริง'
          ],
          correctAnswer: 0,
          hint: 'ดูในหัวข้อ Offline Buffering และทดลองกดปุ่ม OFFLINE ใน Simulator',
          explanation: 'Store-and-Forward รับประกันว่าข้อมูลยอดผลิตและพารามิเตอร์คุณภาพจะไม่สูญหายแม้ระบบเครือข่ายหรือเซิร์ฟเวอร์กลางจะสะดุดชั่วคราว'
        }
      }
    ],
    quiz: [
      {
        id: 'iiot-q1',
        question: 'พอร์ตมาตรฐาน (Default TCP Port) ของโปรโตคอล Modbus TCP และ MQTT (แบบไม่เข้ารหัส) คือข้อใดตามลำดับ?',
        options: [
          'A: Modbus TCP = 502 และ MQTT = 1883',
          'B: Modbus TCP = 80 และ MQTT = 443',
          'C: Modbus TCP = 3306 และ MQTT = 1433',
          'D: Modbus TCP = 21 และ MQTT = 22'
        ],
        correctAnswer: 0,
        explanation: 'Modbus TCP ใช้พอร์ตมาตรฐาน 502 ส่วน MQTT ใช้พอร์ต 1883 (และ 8883 สำหรับ MQTT over TLS)'
      },
      {
        id: 'iiot-q2',
        question: 'ในโปรโตคอล Modbus ตารางหน่วยความจำชนิดใดที่ใช้เก็บตัวเลขขนาด 16-bit สำหรับอ่านและเขียนค่าพารามิเตอร์หรือยอดผลิต (รหัส 4xxxx)?',
        options: [
          'A: Holding Registers',
          'B: Coils',
          'C: Discrete Inputs',
          'D: HTML Tags'
        ],
        correctAnswer: 0,
        explanation: 'Holding Registers (4xxxx) เป็นเรจิสเตอร์ขนาด 16-bit ที่รองรับทั้งการอ่าน (Function Code 03) และการเขียนค่า (Function Code 06/16)'
      },
      {
        id: 'iiot-q3',
        question: 'ฟีเจอร์ใดของ MQTT ที่ช่วยให้หน้าจอ Dashboard รู้ได้ทันทีว่าอุปกรณ์ Edge Gateway ไฟดับหรือสายแลนหลุด?',
        options: [
          'A: Last Will and Testament (LWT) ที่ให้ Broker ส่งข้อความแจ้งสถานะ Offline แทนอัตโนมัติเมื่อการเชื่อมต่อขาดหาย',
          'B: การให้พนักงานโทรแจ้งทุก 5 นาที',
          'C: การรีสตาร์ตฐานข้อมูลทุกชั่วโมง',
          'D: การเปลี่ยนสีสายแลน'
        ],
        correctAnswer: 0,
        explanation: 'LWT คือข้อความสั่งเสียที่อุปกรณ์ฝากไว้กับ MQTT Broker ตั้งแต่วินาทีที่เชื่อมต่อ หากอุปกรณ์หลุดไปโดยไม่แจ้งปิดตามปกติ Broker จะกระจายข้อความ LWT ทันที'
      },
      {
        id: 'iiot-q4',
        question: 'เมื่อระบบ Store-and-Forward ส่งข้อมูลที่ค้างอยู่ในคิวกลับเข้าฐานข้อมูลหลังเน็ตมา ควรบันทึกเวลาในคอลัมน์ recorded_at อย่างไร?',
        options: [
          'A: ใช้เวลาจริง ณ วินาทีที่เครื่องจักรผลิตชิ้นงานนั้น (Source Timestamp ที่แนบมากับข้อมูลในคิว)',
          'B: ใช้เวลาปัจจุบันของเซิร์ฟเวอร์ตอนที่เน็ตเพิ่งกลับมาเสมอ',
          'C: ปล่อยให้คอลัมน์เวลาเป็นค่าว่าง (NULL)',
          'D: ตั้งเวลาเป็นเที่ยงคืนทั้งหมด'
        ],
        correctAnswer: 0,
        explanation: 'การใช้ Source Timestamp ทำให้ข้อมูลการผลิตยังคงอยู่ในกะและช่วงเวลาที่เกิดขึ้นจริง ไม่เกิดกราฟกระโดดผิดกะเมื่อส่งข้อมูลย้อนหลัง'
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
    image: COURSE_PHOTO_MAP['c-machine-vision'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-cad-cam'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-cnc-4-0'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-ev-conversion'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-plc-automation'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-robot-automation'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    image: COURSE_PHOTO_MAP['c-machine-vision-v2'] || CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
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
    id: 'enterprise-fullstack',
    title: 'สถาปัตยกรรมซอฟต์แวร์โรงงาน & ระบบดิจิทัลครบวงจร (Enterprise Full-Stack & MES Track)',
    subtitle: 'เส้นทางพัฒนาทักษะ 5 ระดับ: จาก Front-End Dashboard สู่การสร้าง REST API, ฐานข้อมูล SQL Server, และการเชื่อมต่อ PLC ด้วย IIoT Node-RED',
    badge: '💻 Full-Stack MES Roadmap',
    filterTag: 'สถาปัตยกรรมซอฟต์แวร์อุตสาหกรรม',
    color: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'border-purple-500/30',
    tagColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20'
  },
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
