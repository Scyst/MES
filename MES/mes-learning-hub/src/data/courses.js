export const courses = [
  // --- Category: เครื่องจักรและวิศวกรรมการผลิต (Manufacturing & Engineering) ---
  {
    id: 'c-ppap',
    title: 'PPAP & Advanced Manufacturing Quality Masterclass',
    description: 'หลักสูตรวิศวกรรมกระบวนการผลิตและคู่มือบำรุงรักษาเครื่องจักร: การจัดทำ PFMEA AIAG-VDA, จุดควบคุมคุณภาพสำคัญ Q-Points (CTQ), ระบบสืบย้อนกลับสมบูรณ์แบบ, แผนการตรวจสอบ, การบำรุงรักษาแม่พิมพ์/เครื่องจักร (PM/TPM), และการรับรองบรรจุภัณฑ์',
    instructor: 'Manufacturing Quality Director',
    duration: '6 hours',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600&h=400',
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
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=600&h=400',
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
  }
];
