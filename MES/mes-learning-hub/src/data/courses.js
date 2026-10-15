export const courses = [
  // --- Category: ISO Systems ---
  {
    id: 'c-iso-9001',
    title: 'ISO 9001:2015 Quality Management Mastery',
    description: 'เจาะลึกมาตรฐานระบบบริหารงานคุณภาพ ISO 9001:2015: โครงสร้าง HLS, ข้อกำหนดสำคัญ Clause 4-10, การประเมินความเสี่ยงและโอกาส, และเทคนิคการรับมือ Auditor ให้ผ่านฉลุย',
    instructor: 'Quality Assurance Expert',
    duration: '3.5 hours',
    category: 'ISO Systems',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600&h=400',
    modules: [
      {
        id: 'm1',
        title: 'ISO 9001:2015 มาตรฐานระบบบริหารงานคุณภาพ & การรับมือ Auditor',
        content: 'iso-9001-mastery'
      }
    ]
  },
  {
    id: 'c-iso-14001',
    title: 'ISO 14001:2015 Environmental Management & Net Zero',
    description: 'การจัดการสิ่งแวดล้อมระดับสากล: การประเมินปัญหาสิ่งแวดล้อม (Aspects/Impacts), วงจรชีวิตผลิตภัณฑ์ (Life Cycle Perspective), การจัดการสารเคมีและของเสียอันตราย, และการลด Carbon Footprint สู่ Eco-Factory',
    instructor: 'Environmental Systems Lead',
    duration: '3 hours',
    category: 'ISO Systems',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600&h=400',
    modules: [
      {
        id: 'm1',
        title: 'ISO 14001:2015 มาตรฐานระบบการจัดการสิ่งแวดล้อม & Eco-Factory',
        content: 'iso-14001-mastery'
      }
    ]
  },
  {
    id: 'c-iso-45001',
    title: 'ISO 45001:2018 Occupational Health & Safety (OH&S)',
    description: 'มาตรฐานอาชีวอนามัยและความปลอดภัยในโรงงาน: ลำดับชั้นการควบคุมอันตราย (Hierarchy of Controls), การประเมินความเสี่ยง JSA/HIRA, การมีส่วนร่วมของพนักงาน (Clause 5.4), และการเตรียมพร้อมรับมือเหตุฉุกเฉิน',
    instructor: 'Safety & EHS Specialist',
    duration: '3 hours',
    category: 'ISO Systems',
    image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=600&h=400',
    modules: [
      {
        id: 'm1',
        title: 'ISO 45001:2018 ระบบการจัดการอาชีวอนามัยและความปลอดภัย',
        content: 'iso-45001-mastery'
      }
    ]
  },
  {
    id: 'c-iso-17025',
    title: 'ISO/IEC 17025:2017 Laboratory Competence & Calibration',
    description: 'ข้อกำหนดทั่วไปว่าด้วยความสามารถของห้องปฏิบัติการทดสอบและสอบเทียบ: ความเป็นกลาง (Impartiality), ความไม่แน่นอนในการวัด (Measurement Uncertainty), ความสอบกลับได้ทางมาตรวิทยา, และ QC Lab Protocols',
    instructor: 'Metrology & Lab QA Specialist',
    duration: '2.5 hours',
    category: 'ISO Systems',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600&h=400',
    modules: [
      {
        id: 'm1',
        title: 'ISO/IEC 17025:2017 ความสามารถของห้องปฏิบัติการทดสอบและสอบเทียบ',
        content: 'iso-17025-mastery'
      }
    ]
  },

  // --- Category: Manufacturing Engineering ---
  {
    id: 'c-ppap',
    title: 'PPAP & Advanced Manufacturing Quality Masterclass',
    description: 'หลักสูตรกระบวนการอนุมัติชิ้นส่วนการผลิต (PPAP 18 องค์ประกอบ) และวิศวกรรมคุณภาพการผลิต: PFMEA, Q-Points (CTQ), Full Traceability, Inspection Plans, Tooling/Equipment Maintenance, และ Packaging Qualification',
    instructor: 'Manufacturing Quality Director',
    duration: '6 hours',
    category: 'Manufacturing Engineering',
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

  // --- Category: Customer Audits & ESG ---
  {
    id: 'c-customer-audits',
    title: 'Global Customer QA Audits & ESG Compliance',
    description: 'เตรียมความพร้อมรับการตรวจโรงงานจากลูกค้าระดับโลก (Lowe\'s, Costco, Walmart, Home Depot): ระบบเอกสาร 56 รายการ, NPI & ECN, การบริหารซัพพลายเออร์ & IQC, CAPA & Claim Defense, จริยธรรมและแรงงาน (ESG), และ GMP/Recall Protocol',
    instructor: 'Global Compliance Auditor',
    duration: '5.5 hours',
    category: 'Customer Audits & ESG',
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

  // --- Category: Live QA & Case Studies ---
  {
    id: 'c-live-qa',
    title: 'Live Operational QA & Factory Audit Defense',
    description: 'หลักสูตรกรณีศึกษาจากหน้างานจริงโรงงาน: ถอดบทเรียนการตรวจประเมินสิงหาคม 2569 (August 2026 Process Audit), การวิเคราะห์และปิดข้อบกพร่อง 26-NCR-001 (8D Report), เกณฑ์ตรวจ Walmart FCCA, แร่ขัดแย้ง 3TG (CMRT), และกลยุทธ์ Defect Pareto',
    instructor: 'Chief Quality Inspector & Lead Auditor',
    duration: '5 hours',
    category: 'Live QA & Case Studies',
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

  // --- Category: Lean & Leadership ---
  {
    id: 'c1',
    title: 'Lean Manufacturing & Industry 4.0',
    description: 'เรียนรู้แนวคิดลีน (Lean Principles) การลดความสูญเปล่า 8 ประการ (8 Wastes) การสร้าง Value Stream Mapping (VSM) และการบูรณาการเข้ากับ Industry 4.0 เพื่อมุ่งสู่ Smart Factory',
    instructor: 'คุณวุฒิพงศ์ บุญนายวา',
    duration: '3 hours',
    category: 'Lean & Leadership',
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
    description: 'คู่มือสำหรับหัวหน้างานและผู้จัดการ: เรียนรู้ปัจจัยท้าทายและการบริหาร COGS แบบ End-to-End, วงจร CAP-DO, Digital Gemba, และการประยุกต์ใช้ AI ในองค์กร',
    instructor: 'คุณชัยรัตน์ บรรเทาทุกข์',
    duration: '4 hours',
    category: 'Lean & Leadership',
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
  },

  // --- Category: Software & Security ---
  {
    id: 'c3',
    title: 'React + Vite Architecture Guide',
    description: 'เจาะลึกโครงสร้างแอปพลิเคชัน React + Vite สำหรับ MES Learning Hub ตั้งแต่เริ่มต้นจนถึงการ Deploy',
    instructor: 'Engineering Team',
    duration: '1.5 hours',
    category: 'Software & Security',
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
    description: 'เรียนรู้สถาปัตยกรรมระบบหลังบ้าน การเชื่อมต่อฐานข้อมูล การป้องกันระบบจากภัยคุกคาม (CSRF) และการเชื่อมต่อกับระบบ SAP',
    instructor: 'Engineering Team',
    duration: '2.5 hours',
    category: 'Software & Security',
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
  }
];
