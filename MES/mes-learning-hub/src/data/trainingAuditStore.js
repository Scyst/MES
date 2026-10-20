// trainingAuditStore.js - Manufacturing Training Tracking, Competency Matrix & ISO 9001 Clause 7.2 Audit Engine
import { courses } from './courses';
import { getCustomCourses, getCurrentUser, getCommunityPosts, calculateRank, addExp, getUserGrading, saveUserGrading } from './communityStore';
import { getUserAvatarSvg, DEFAULT_COURSE_IMAGE } from './offlineAssets';

// SNC Manufacturing Factory Departments
export const DEPARTMENTS = [
  'แผนกควบคุมคุณภาพ (QC/QA)',
  'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
  'แผนกผลิตประกอบ (Production Assembly)',
  'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)',
  'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)'
];

// Master Employee Roster across factory shifts
export const EMPLOYEES_MASTER = [
  // QC/QA
  {
    empId: 'EMP-3810',
    name: 'ประภาพร รัตนศิลป์',
    role: 'วิศวกรควบคุมคุณภาพอาวุโส (Senior QA Engineer & ISO Lead)',
    department: 'แผนกควบคุมคุณภาพ (QC/QA)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('ประภาพร รัตนศิลป์'),
    joinedDate: '2023-02-15'
  },
  {
    empId: 'EMP-4120',
    name: 'วีระศักดิ์ สุขประเสริฐ',
    role: 'ช่างตรวจสอบมิติขั้นสูง (CMM & GD&T Senior Inspector)',
    department: 'แผนกควบคุมคุณภาพ (QC/QA)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('วีระศักดิ์ สุขประเสริฐ'),
    joinedDate: '2023-06-10'
  },
  {
    empId: 'EMP-5104',
    name: 'สุพัตรา ชนะมาร',
    role: 'เจ้าหน้าที่ตรวจสอบชิ้นส่วนรับเข้า (IQC Inspector)',
    department: 'แผนกควบคุมคุณภาพ (QC/QA)',
    shift: 'Night Shift (20:00 - 05:00)',
    avatar: getUserAvatarSvg('สุพัตรา ชนะมาร'),
    joinedDate: '2024-01-20'
  },
  {
    empId: 'EMP-6218',
    name: 'ธีรภัทร ชาญวิทย์',
    role: 'เจ้าหน้าที่ตรวจสอบคุณภาพในกระบวนการ (IPQC Auditor)',
    department: 'แผนกควบคุมคุณภาพ (QC/QA)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('ธีรภัทร ชาญวิทย์'),
    joinedDate: '2024-05-12'
  },

  // Production Stamping
  {
    empId: 'EMP-5928',
    name: 'สมเกียรติ มั่นคง',
    role: 'หัวหน้ากะฝ่ายผลิต (Production Shift Supervisor)',
    department: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('สมเกียรติ มั่นคง'),
    joinedDate: '2022-08-01'
  },
  {
    empId: 'EMP-7012',
    name: 'บุญมี มงคล',
    role: 'ช่างควบคุมเครื่องปั๊มไฮดรอลิก 300T (Senior Press Operator)',
    department: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
    shift: 'Night Shift (20:00 - 05:00)',
    avatar: getUserAvatarSvg('บุญมี มงคล'),
    joinedDate: '2023-11-05'
  },
  {
    empId: 'EMP-8145',
    name: 'นพรัตน์ แสนดี',
    role: 'ผู้ปฏิบัติการระบบป้อนคอยล์อัตโนมัติ (Coil Feeder Operator)',
    department: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('นพรัตน์ แสนดี'),
    joinedDate: '2024-03-15'
  },
  {
    empId: 'EMP-9032',
    name: 'สิทธิชัย เลิศล้ำ',
    role: 'หัวหน้าสายการผลิตปั๊มขึ้นรูป (Stamping Line Leader)',
    department: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('สิทธิชัย เลิศล้ำ'),
    joinedDate: '2023-04-18'
  },

  // Tooling & PE / Maintenance
  {
    empId: 'EMP-2905',
    name: 'ช่างชาญชัย ศรีสุข',
    role: 'ช่างเทคนิคแม่พิมพ์อาวุโส (Tooling Lead Specialist)',
    department: 'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('ช่างชาญชัย ศรีสุข'),
    joinedDate: '2021-09-01'
  },
  {
    empId: 'EMP-4419',
    name: 'ธวัชชัย บำรุงการ',
    role: 'ช่างซ่อมบำรุงระบบไฟฟ้าและ LOTO (Preventive Maintenance)',
    department: 'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)',
    shift: 'Night Shift (20:00 - 05:00)',
    avatar: getUserAvatarSvg('ธวัชชัย บำรุงการ'),
    joinedDate: '2023-07-22'
  },
  {
    empId: 'EMP-5582',
    name: 'อลงกรณ์ เกียรติเจริญ',
    role: 'ช่างตัดเฉือน CNC Wire-Cut แม่พิมพ์ (Tooling Machinist)',
    department: 'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('อลงกรณ์ เกียรติเจริญ'),
    joinedDate: '2024-02-10'
  },

  // Store & Warehouse
  {
    empId: 'EMP-1880',
    name: 'หัวหน้ากฤษณะ แสงทอง',
    role: 'ผู้จัดการคลังสินค้าและโลจิสติกส์ (Warehouse Manager)',
    department: 'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('กฤษณะ แสงทอง'),
    joinedDate: '2021-03-15'
  },
  {
    empId: 'EMP-5091',
    name: 'อนุชา แก้วมณี',
    role: 'พนักงานขับรถยกและจัดการพื้นที่จัดเก็บ (Forklift Operator)',
    department: 'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('อนุชา แก้วมณี'),
    joinedDate: '2023-10-01'
  },
  {
    empId: 'EMP-7230',
    name: 'มลฑา มั่นจิต',
    role: 'เจ้าหน้าที่บันทึกสต็อกและควบคุม FIFO (Material Controller)',
    department: 'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('มลฑา มั่นจิต'),
    joinedDate: '2024-04-05'
  },

  // Production Assembly
  {
    empId: 'EMP-6631',
    name: 'จิราพร สว่างเนตร',
    role: 'หัวหน้าสายการประกอบ (Assembly Line Supervisor)',
    department: 'แผนกผลิตประกอบ (Production Assembly)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('จิราพร สว่างเนตร'),
    joinedDate: '2023-01-15'
  },
  {
    empId: 'EMP-7742',
    name: 'พรรณทิพา วงศ์ษา',
    role: 'ช่างประกอบและเชื่อมจุดชิ้นงาน (Spot Welding Operator)',
    department: 'แผนกผลิตประกอบ (Production Assembly)',
    shift: 'Day Shift (08:00 - 17:00)',
    avatar: getUserAvatarSvg('พรรณทิพา วงศ์ษา'),
    joinedDate: '2023-09-12'
  },
  {
    empId: 'EMP-8820',
    name: 'สราวุธ พงศ์พิพัฒน์',
    role: 'ช่างทดสอบระบบ EOL และบรรจุกล่อง (Final Tester & Packing)',
    department: 'แผนกผลิตประกอบ (Production Assembly)',
    shift: 'Night Shift (20:00 - 05:00)',
    avatar: getUserAvatarSvg('สราวุธ พงศ์พิพัฒน์'),
    joinedDate: '2024-06-01'
  }
];

// Department Mandatory Training Matrix (ISO 9001 Clause 7.2)
export const MANDATORY_MATRIX = {
  'แผนกควบคุมคุณภาพ (QC/QA)': ['c-iso-9001', 'c-ppap', 'c-spc-control', 'c-esd-control', 'c-customer-audit', 'c-iso-17025'],
  'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)': ['c-5s-safety', 'c-mes-operation', 'c-iso-45001', 'c-tpm-maintenance', 'c-ppap'],
  'แผนกผลิตประกอบ (Production Assembly)': ['c-5s-safety', 'c-mes-operation', 'c-iso-45001', 'c-esd-control'],
  'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)': ['c-iso-45001', 'c-tpm-maintenance', 'c-ppap', 'c-mes-operation', 'c-iso-14001'],
  'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)': ['c-mes-operation', 'c-5s-safety', 'c-iso-9001', 'c-iso-14001']
};

// Course Standard Quiz Bank & Question Mistake Analytics
export const COURSE_QUIZ_ANALYTICS = {
  'c-ppap': [
    {
      id: 'q1',
      question: 'ค่า Cpk ขั้นต่ำสำหรับ Critical Characteristic (CTQ) ตามมาตรฐาน AIAG คือเท่าใด',
      correctOption: 'Cpk ≥ 1.67 (Initial Study) และ ≥ 1.33 (Ongoing)',
      passRatePercent: 88,
      missedCount: 3,
      totalAnswered: 25,
      insight: 'พนักงานส่วนใหญ่เข้าใจเกณฑ์มาตรฐาน Cpk 1.67 เป็นอย่างดี'
    },
    {
      id: 'q2',
      question: 'ในกระบวนการ Stamping แผ่นเหล็ก SECC หนา 1.2 mm ค่า Die Clearance ควรตั้งอยู่ที่กี่ % ของความหนา',
      correctOption: '8% - 10% ของความหนา (0.096 - 0.120 mm)',
      passRatePercent: 64,
      missedCount: 9,
      totalAnswered: 25,
      insight: 'ข้อนี้มีผู้ตอบผิดสูง (64%) แนะนำให้เน้นย้ำสูตรคำนวณระยะ Feeler Gauge ในการอบรมหน้างาน'
    },
    {
      id: 'q3',
      question: 'ข้อใดคือวัตถุประสงค์หลักของการจัดทำ Process FMEA (PFMEA)',
      correctOption: 'ชี้บ่งและป้องกันสาเหตุของความบกพร่องก่อนส่งมอบถึงลูกค้า',
      passRatePercent: 96,
      missedCount: 1,
      totalAnswered: 25,
      insight: 'พนักงานมีความเข้าใจหลักการเชิงป้องกัน (Defect Prevention) ยอดเยี่ยม'
    }
  ],
  'c-iso-9001': [
    {
      id: 'q1',
      question: 'ข้อกำหนดข้อใดใน ISO 9001:2015 ที่ระบุเรื่องความสามารถและการฝึกอบรมของบุคลากร (Competence)',
      correctOption: 'Clause 7.2 Competence',
      passRatePercent: 92,
      missedCount: 2,
      totalAnswered: 26,
      insight: 'ทีมงานแม่นยำในข้อกำหนดหลักของการประเมินสมรรถนะ'
    },
    {
      id: 'q2',
      question: 'เมื่อพบงานไม่เป็นไปตามข้อกำหนด (Non-conforming Output) ข้อใดคือขั้นตอนแรกที่ต้องทำทันที',
      correctOption: 'กักแยกชิ้นงาน (Quarantine/Hold) และติดป้ายสถานะสีแดง',
      passRatePercent: 100,
      missedCount: 0,
      totalAnswered: 26,
      insight: '100% ตอบถูกต้องตามเกณฑ์การกักกันงานเสีย'
    },
    {
      id: 'q3',
      question: 'การประเมินประสิทธิผลของการฝึกอบรม (Training Effectiveness) ต้องทำเมื่อใด',
      correctOption: 'หลังการฝึกอบรม 30-90 วัน โดยหัวหน้างานประเมินหน้างานจริง',
      passRatePercent: 73,
      missedCount: 7,
      totalAnswered: 26,
      insight: 'พนักงานบางส่วนสับสนระหว่างแบบทดสอบทันทีกับแบบประเมินประสิทธิผลรอบ 90 วัน'
    }
  ],
  'c-mes-operation': [
    {
      id: 'q1',
      question: 'หากเครื่องสแกนบาร์โค้ดไม่สามารถอ่าน QR Code บนพาเลทได้ ควรแก้ไขอย่างไร',
      correctOption: 'พิมพ์แท็กสำรองผ่านฟังก์ชัน Reprint ในระบบ MES และให้ Leader ยืนยัน',
      passRatePercent: 95,
      missedCount: 1,
      totalAnswered: 22,
      insight: 'เข้าใจขั้นตอนการรับมือบาร์โค้ดชำรุดได้ถูกต้อง'
    },
    {
      id: 'q2',
      question: 'เมื่อมีการเปลี่ยน Lot การผลิต ต้องบันทึกอะไรในระบบ MES ก่อนเริ่มเดินเครื่อง',
      correctOption: 'First Piece Inspection (บันทึกผลตรวจสอบชิ้นแรก)',
      passRatePercent: 86,
      missedCount: 3,
      totalAnswered: 22,
      insight: 'เน้นย้ำการสแกน QR อนุมัติ First Piece จาก QC'
    }
  ],
  'c-iso-45001': [
    {
      id: 'q1',
      question: 'ก่อนทำการซ่อมบำรุงเครื่องจักรที่มีระบบนิวเมติกส์และไฮดรอลิก ขั้นตอนสำคัญที่สุดคืออะไร',
      correctOption: 'ตัดแยกลม/ไฟฟ้า ระบายแรงดันตกค้าง และคล้องกุญแจ LOTO ส่วนบุคคล',
      passRatePercent: 96,
      missedCount: 1,
      totalAnswered: 25,
      insight: 'พนักงานเข้าใจลำดับขั้นความปลอดภัย LOTO อย่างเคร่งครัด'
    },
    {
      id: 'q2',
      question: 'ใครเป็นผู้มีสิทธิปลดแม่กุญแจ LOTO ออกจากจุดตัดแยกพลังงาน',
      correctOption: 'เจ้าของกุญแจผู้คล้องเท่านั้น (เว้นแต่ขั้นตอนฉุกเฉินตามระเบียบบริษัท)',
      passRatePercent: 100,
      missedCount: 0,
      totalAnswered: 25,
      insight: '100% ปฏิบัติตามกฎเหล็กความปลอดภัย'
    }
  ],
  'c-esd-control': [
    {
      id: 'q1',
      question: 'สายรัดข้อมือป้องกันไฟฟ้าสถิต (ESD Wrist Strap) ต้องผ่านการทดสอบบ่อยเพียงใด',
      correctOption: 'ทดสอบด้วยเครื่อง ESD Tester ทุกวันก่อนเริ่มงานกะเช้า/ดึก',
      passRatePercent: 91,
      missedCount: 2,
      totalAnswered: 22,
      insight: 'การทดสอบ Daily ESD Check เป็นวินัยที่ดีของแผนก'
    },
    {
      id: 'q2',
      question: 'ค่าความต้านทานมาตรฐานของสายรัดข้อมือ ESD สำหรับงานผลิตอิเล็กทรอนิกส์คือเท่าใด',
      correctOption: 'ระหว่าง 0.75 MΩ ถึง 35 MΩ (1 MΩ Resistor)',
      passRatePercent: 68,
      missedCount: 7,
      totalAnswered: 22,
      insight: 'ข้อควรปรับปรุง: พนักงานจำสับสนระหว่าง 1 MΩ กับ 10 MΩ'
    }
  ]
};

// Initial realistic baseline audit records
const INITIAL_RECORDS = [
  // EMP-3810: ประภาพร (QA Lead) - Super compliant
  {
    recordId: 'rec-001',
    empId: 'EMP-3810',
    courseId: 'c-iso-9001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-10T14:30:00Z',
    expiresAt: '2027-08-10T14:30:00Z',
    certificateId: 'SNC-CERT-2026-0012',
    evaluatedBy: 'VP of Quality Assurance'
  },
  {
    recordId: 'rec-002',
    empId: 'EMP-3810',
    courseId: 'c-ppap',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-15T16:00:00Z',
    expiresAt: '2027-08-15T16:00:00Z',
    certificateId: 'SNC-CERT-2026-0019',
    evaluatedBy: 'Manufacturing Engineering Director'
  },
  {
    recordId: 'rec-003',
    empId: 'EMP-3810',
    courseId: 'c-customer-audit',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-02T10:00:00Z',
    expiresAt: '2027-09-02T10:00:00Z',
    certificateId: 'SNC-CERT-2026-0045',
    evaluatedBy: 'VP of Quality Assurance'
  },
  {
    recordId: 'rec-004',
    empId: 'EMP-3810',
    courseId: 'c-spc-control',
    status: 'completed',
    progressPercent: 100,
    quizScore: 4,
    quizTotal: 5,
    quizPercentage: 80,
    passed: true,
    completedAt: '2026-09-12T11:00:00Z',
    expiresAt: '2027-09-12T11:00:00Z',
    certificateId: 'SNC-CERT-2026-0058',
    evaluatedBy: 'VP of Quality Assurance'
  },
  {
    recordId: 'rec-005',
    empId: 'EMP-3810',
    courseId: 'c-esd-control',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-20T15:30:00Z',
    expiresAt: '2027-09-20T15:30:00Z',
    certificateId: 'SNC-CERT-2026-0082',
    evaluatedBy: 'VP of Quality Assurance'
  },
  {
    recordId: 'rec-006',
    empId: 'EMP-3810',
    courseId: 'c-iso-17025',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-10-01T09:30:00Z',
    expiresAt: '2027-10-01T09:30:00Z',
    certificateId: 'SNC-CERT-2026-0099',
    evaluatedBy: 'Lab Director'
  },

  // EMP-4120: วีระศักดิ์ (QC CMM)
  {
    recordId: 'rec-010',
    empId: 'EMP-4120',
    courseId: 'c-iso-9001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-11T11:00:00Z',
    expiresAt: '2027-08-11T11:00:00Z',
    certificateId: 'SNC-CERT-2026-0014',
    evaluatedBy: 'ประภาพร รัตนศิลป์'
  },
  {
    recordId: 'rec-011',
    empId: 'EMP-4120',
    courseId: 'c-ppap',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 3,
    quizPercentage: 67,
    passed: false, // failed threshold <80%
    completedAt: '2026-08-18T14:00:00Z',
    expiresAt: null,
    certificateId: null,
    evaluatedBy: 'ประภาพร รัตนศิลป์'
  },
  {
    recordId: 'rec-012',
    empId: 'EMP-4120',
    courseId: 'c-spc-control',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-14T10:00:00Z',
    expiresAt: '2027-09-14T10:00:00Z',
    certificateId: 'SNC-CERT-2026-0062',
    evaluatedBy: 'ประภาพร รัตนศิลป์'
  },

  // EMP-5104: สุพัตรา (IQC)
  {
    recordId: 'rec-020',
    empId: 'EMP-5104',
    courseId: 'c-iso-9001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-14T21:00:00Z',
    expiresAt: '2027-08-14T21:00:00Z',
    certificateId: 'SNC-CERT-2026-0018',
    evaluatedBy: 'ประภาพร รัตนศิลป์'
  },
  {
    recordId: 'rec-021',
    empId: 'EMP-5104',
    courseId: 'c-esd-control',
    status: 'in_progress',
    progressPercent: 60,
    quizScore: null,
    quizTotal: null,
    quizPercentage: null,
    passed: false,
    completedAt: null,
    expiresAt: null,
    certificateId: null,
    evaluatedBy: null
  },

  // EMP-5928: สมเกียรติ (Stamping Supervisor)
  {
    recordId: 'rec-030',
    empId: 'EMP-5928',
    courseId: 'c-ppap',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-20T10:00:00Z',
    expiresAt: '2027-08-20T10:00:00Z',
    certificateId: 'SNC-CERT-2026-0022',
    evaluatedBy: 'Manufacturing Director'
  },
  {
    recordId: 'rec-031',
    empId: 'EMP-5928',
    courseId: 'c-mes-operation',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-25T14:30:00Z',
    expiresAt: '2027-08-25T14:30:00Z',
    certificateId: 'SNC-CERT-2026-0028',
    evaluatedBy: 'MES Project Manager'
  },
  {
    recordId: 'rec-032',
    empId: 'EMP-5928',
    courseId: 'c-iso-45001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-01T13:00:00Z',
    expiresAt: '2027-09-01T13:00:00Z',
    certificateId: 'SNC-CERT-2026-0039',
    evaluatedBy: 'Safety Officer'
  },
  {
    recordId: 'rec-033',
    empId: 'EMP-5928',
    courseId: 'c-tpm-maintenance',
    status: 'completed',
    progressPercent: 100,
    quizScore: 4,
    quizTotal: 5,
    quizPercentage: 80,
    passed: true,
    completedAt: '2026-09-10T16:00:00Z',
    expiresAt: '2027-09-10T16:00:00Z',
    certificateId: 'SNC-CERT-2026-0055',
    evaluatedBy: 'PE Manager'
  },
  {
    recordId: 'rec-034',
    empId: 'EMP-5928',
    courseId: 'c-5s-safety',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    // Expiring soon (almost 1 year ago) for demonstration of retraining alert!
    completedAt: '2025-11-20T10:00:00Z',
    expiresAt: '2026-11-20T10:00:00Z',
    certificateId: 'SNC-CERT-2025-0811',
    evaluatedBy: '5S Committee'
  },

  // EMP-7012: บุญมี (Stamping Press Operator)
  {
    recordId: 'rec-040',
    empId: 'EMP-7012',
    courseId: 'c-iso-45001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-05T21:00:00Z',
    expiresAt: '2027-09-05T21:00:00Z',
    certificateId: 'SNC-CERT-2026-0048',
    evaluatedBy: 'สมเกียรติ มั่นคง'
  },
  {
    recordId: 'rec-041',
    empId: 'EMP-7012',
    courseId: 'c-5s-safety',
    status: 'completed',
    progressPercent: 100,
    quizScore: 4,
    quizTotal: 5,
    quizPercentage: 80,
    passed: true,
    completedAt: '2026-09-15T22:00:00Z',
    expiresAt: '2027-09-15T22:00:00Z',
    certificateId: 'SNC-CERT-2026-0065',
    evaluatedBy: 'สมเกียรติ มั่นคง'
  },
  {
    recordId: 'rec-042',
    empId: 'EMP-7012',
    courseId: 'c-tpm-maintenance',
    status: 'in_progress',
    progressPercent: 40,
    quizScore: null,
    quizTotal: null,
    quizPercentage: null,
    passed: false,
    completedAt: null,
    expiresAt: null,
    certificateId: null,
    evaluatedBy: null
  },

  // EMP-2905: ช่างชาญชัย (Tooling Lead)
  {
    recordId: 'rec-050',
    empId: 'EMP-2905',
    courseId: 'c-ppap',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-16T11:00:00Z',
    expiresAt: '2027-08-16T11:00:00Z',
    certificateId: 'SNC-CERT-2026-0020',
    evaluatedBy: 'Manufacturing Director'
  },
  {
    recordId: 'rec-051',
    empId: 'EMP-2905',
    courseId: 'c-iso-45001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-30T15:00:00Z',
    expiresAt: '2027-08-30T15:00:00Z',
    certificateId: 'SNC-CERT-2026-0036',
    evaluatedBy: 'Safety Officer'
  },
  {
    recordId: 'rec-052',
    empId: 'EMP-2905',
    courseId: 'c-tpm-maintenance',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-08T14:00:00Z',
    expiresAt: '2027-09-08T14:00:00Z',
    certificateId: 'SNC-CERT-2026-0051',
    evaluatedBy: 'PE Manager'
  },

  // EMP-1880: กฤษณะ (Warehouse Manager)
  {
    recordId: 'rec-060',
    empId: 'EMP-1880',
    courseId: 'c-mes-operation',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-08-22T09:00:00Z',
    expiresAt: '2027-08-22T09:00:00Z',
    certificateId: 'SNC-CERT-2026-0025',
    evaluatedBy: 'Supply Chain Director'
  },
  {
    recordId: 'rec-061',
    empId: 'EMP-1880',
    courseId: 'c-5s-safety',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-03T11:00:00Z',
    expiresAt: '2027-09-03T11:00:00Z',
    certificateId: 'SNC-CERT-2026-0046',
    evaluatedBy: 'Safety Committee'
  },
  {
    recordId: 'rec-062',
    empId: 'EMP-1880',
    courseId: 'c-iso-9001',
    status: 'completed',
    progressPercent: 100,
    quizScore: 3,
    quizTotal: 3,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-18T14:00:00Z',
    expiresAt: '2027-09-18T14:00:00Z',
    certificateId: 'SNC-CERT-2026-0077',
    evaluatedBy: 'VP of Quality Assurance'
  },

  // EMP-6631: จิราพร (Assembly Supervisor)
  {
    recordId: 'rec-070',
    empId: 'EMP-6631',
    courseId: 'c-esd-control',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-02T13:30:00Z',
    expiresAt: '2027-09-02T13:30:00Z',
    certificateId: 'SNC-CERT-2026-0044',
    evaluatedBy: 'ประภาพร รัตนศิลป์'
  },
  {
    recordId: 'rec-071',
    empId: 'EMP-6631',
    courseId: 'c-mes-operation',
    status: 'completed',
    progressPercent: 100,
    quizScore: 2,
    quizTotal: 2,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-09T10:00:00Z',
    expiresAt: '2027-09-09T10:00:00Z',
    certificateId: 'SNC-CERT-2026-0053',
    evaluatedBy: 'MES Project Manager'
  },
  {
    recordId: 'rec-072',
    empId: 'EMP-6631',
    courseId: 'c-5s-safety',
    status: 'completed',
    progressPercent: 100,
    quizScore: 5,
    quizTotal: 5,
    quizPercentage: 100,
    passed: true,
    completedAt: '2026-09-22T15:00:00Z',
    expiresAt: '2027-09-22T15:00:00Z',
    certificateId: 'SNC-CERT-2026-0085',
    evaluatedBy: 'Safety Officer'
  }
];

// --- STORAGE ACCESSORS ---

export function getTrainingRecords() {
  const stored = localStorage.getItem('mes_learning_audit_records');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_RECORDS;
    }
  }
  // Initialize with baseline records
  localStorage.setItem('mes_learning_audit_records', JSON.stringify(INITIAL_RECORDS));
  return INITIAL_RECORDS;
}

export function saveTrainingRecords(records) {
  localStorage.setItem('mes_learning_audit_records', JSON.stringify(records));
}

// Get all employees roster including currently logged-in user dynamically
export function getAllEmployees() {
  const currentUser = getCurrentUser();
  const list = [...EMPLOYEES_MASTER];

  if (!currentUser || !currentUser.isLoggedInReal) {
    return list;
  }

  // If current logged-in user is not in master list, merge them in cleanly
  const currentEmpId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const exists = list.some(e => e.empId === currentEmpId || e.empId === currentUser.emp_id);

  if (!exists) {
    list.unshift({
      empId: currentEmpId,
      name: currentUser.name,
      role: currentUser.role || 'พนักงานปฏิบัติการ (MES User)',
      department: currentUser.role?.includes('ผลิต') 
        ? 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)'
        : currentUser.role?.includes('คลัง') || currentUser.role?.includes('Store')
          ? 'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)'
          : currentUser.role?.includes('QC') || currentUser.role?.includes('QA')
            ? 'แผนกควบคุมคุณภาพ (QC/QA)'
            : 'แผนกผลิตประกอบ (Production Assembly)',
      shift: 'Day Shift (08:00 - 17:00)',
      avatar: currentUser.avatar || getUserAvatarSvg(currentUser.name),
      joinedDate: '2024-01-15'
    });
  }

  return list;
}

// Synchronize training course progress & Post-Test results directly to MES Backend & SQL Server
export async function syncCourseProgressToBackend({
  empId,
  courseId,
  courseTitle = '',
  category = '',
  status = 'completed',
  quizScore = 0,
  quizTotal = 0,
  quizPercentage = 0,
  passed = false,
  certificateId = null
}) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.isLoggedInReal || !empId || empId === 'GUEST' || empId === 'EMP-guest') {
    return null;
  }

  const endpoint = '../MES/MES/page/manpower/api/api_learning.php?action=save_course_progress';

  const payload = {
    emp_id: empId,
    course_id: courseId,
    course_title: courseTitle,
    category: category,
    status: status,
    quiz_score: quizScore,
    quiz_total: quizTotal,
    quiz_percentage: quizPercentage,
    passed: passed ? 1 : 0,
    certificate_id: certificateId
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        if (json.data && json.data.learning_grade) {
          const currentGrading = getUserGrading() || {};
          currentGrading.grade_learning = json.data.learning_grade;
          currentGrading.system_grade_learning = json.data.learning_grade;
          if (json.data.grade_overall) {
            currentGrading.grade_overall = json.data.grade_overall;
          }
          if (typeof json.data.new_skill_count === 'number') {
            currentGrading.skill_count = json.data.new_skill_count;
          }
          if (typeof json.data.passed_courses === 'number') {
            currentGrading.passed_courses = json.data.passed_courses;
          }
          saveUserGrading(currentGrading);
        }
        return json.data;
      }
    }
  } catch {
    // Ignore network error in offline mode
  }
  return null;
}

export function evaluateLearningByPositionTier(skillCount = 0, position = '', sysRole = '') {
  const posUpper = String(position || '').toUpperCase();
  const roleLower = String(sysRole || '').toLowerCase();

  const isTier3 =
    ['creator', 'admin', 'manager'].includes(roleLower) ||
    posUpper.includes('ผู้จัดการ') ||
    posUpper.includes('MINI MD') ||
    posUpper.includes('ประธาน') ||
    posUpper.includes('บริหาร') ||
    posUpper.includes('วิศวกร') ||
    posUpper.includes('ENGINEER');

  const isTier2 =
    !isTier3 &&
    (['supervisor', 'leader', 'planner'].includes(roleLower) ||
      posUpper.includes('หัวหน้า') ||
      posUpper.includes('SUPERVISOR') ||
      posUpper.includes('LEADER') ||
      posUpper.includes('SPECIAL') ||
      posUpper.includes('เทคนิค') ||
      posUpper.includes('QC') ||
      posUpper.includes('QA'));

  if (isTier3) {
    let grade = 'D';
    if (skillCount >= 8) grade = 'A';
    else if (skillCount >= 5) grade = 'B';
    else if (skillCount >= 2) grade = 'C';
    return {
      grade,
      tier_name: 'ระดับบริหารและวิศวกร (Tier 3)',
      target_a: 8,
      target_b: 5,
      target_c: 2,
      criteria_label: 'A (≥ 8 ทักษะ) · B (5-7 ทักษะ) · C (2-4 ทักษะ) · D (0-1 ทักษะ)'
    };
  }

  if (isTier2) {
    let grade = 'D';
    if (skillCount >= 5) grade = 'A';
    else if (skillCount >= 3) grade = 'B';
    else if (skillCount >= 1) grade = 'C';
    return {
      grade,
      tier_name: 'ระดับหัวหน้างานและเทคนิค (Tier 2)',
      target_a: 5,
      target_b: 3,
      target_c: 1,
      criteria_label: 'A (≥ 5 ทักษะ) · B (3-4 ทักษะ) · C (1-2 ทักษะ) · D (0 ทักษะ)'
    };
  }

  let grade = 'D';
  if (skillCount >= 3) grade = 'A';
  else if (skillCount >= 2) grade = 'B';
  else if (skillCount >= 1) grade = 'C';
  return {
    grade,
    tier_name: 'ระดับปฏิบัติการทั่วไป (Tier 1)',
    target_a: 3,
    target_b: 2,
    target_c: 1,
    criteria_label: 'A (≥ 3 ทักษะ) · B (2 ทักษะ) · C (1 ทักษะ) · D (0 ทักษะ)'
  };
}

function applyOptimisticLearningGradeUpdate(empId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.can_view_grading) {
      localStorage.removeItem('mes_learning_user_grading');
      return null;
    }
    const records = getTrainingRecords();
    const passedCount = records.filter(r => r.empId === empId && r.passed).length;
    const currentGrading = getUserGrading() || {
      evaluation_period: new Date().toISOString().slice(0, 7),
      grade_iph: 'B',
      grade_5s: 'A',
      grade_attendance: 'A',
      grade_learning: 'D',
      grade_overall: 'B',
      skill_count: 0,
      passed_courses: 0
    };

    const nextSkillCount = Math.max(Number(currentGrading.skill_count || 0), passedCount);
    const tierEval = evaluateLearningByPositionTier(nextSkillCount, currentUser.role, currentUser.sys_role);
    const nextLearningGrade = tierEval.grade;

    const mapScore = g => (g === 'A' ? 4 : g === 'B' ? 3 : g === 'C' ? 2 : g === 'D' ? 1 : 3);
    const avgScore = (
      mapScore(currentGrading.grade_iph || 'B') +
      mapScore(currentGrading.grade_5s || 'A') +
      mapScore(currentGrading.grade_attendance || 'A') +
      mapScore(nextLearningGrade)
    ) / 4;
    const nextOverall = avgScore >= 3.5 ? 'A' : avgScore >= 2.5 ? 'B' : avgScore >= 1.5 ? 'C' : 'D';

    const updatedGrading = {
      ...currentGrading,
      skill_count: nextSkillCount,
      passed_courses: passedCount,
      grade_learning: nextLearningGrade,
      system_grade_learning: nextLearningGrade,
      grade_overall: nextOverall,
      learning_tier_name: tierEval.tier_name,
      learning_target_a: tierEval.target_a,
      learning_criteria_label: tierEval.criteria_label
    };
    saveUserGrading(updatedGrading);
    return updatedGrading;
  } catch {
    return null;
  }
}

// Record a quiz completion in real-time from DynamicCourseRenderer or CourseViewer
export function recordLiveUserQuizAttempt({ courseId, score, totalQuestions }) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const records = getTrainingRecords();
  const quizPct = Math.round((score / Math.max(1, totalQuestions)) * 100);
  const passed = quizPct >= 80;

  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const existingIdx = records.findIndex(r => r.empId === empId && r.courseId === courseId);

  const newRecord = {
    recordId: existingIdx !== -1 ? records[existingIdx].recordId : `rec-live-${Date.now()}`,
    empId: empId,
    courseId: courseId,
    status: passed ? 'completed' : 'failed',
    progressPercent: 100,
    quizScore: score,
    quizTotal: totalQuestions,
    quizPercentage: quizPct,
    passed: passed,
    completedAt: now.toISOString(),
    expiresAt: passed ? nextYear.toISOString() : null,
    certificateId: passed ? ((existingIdx !== -1 && records[existingIdx].certificateId) ? records[existingIdx].certificateId : `SNC-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`) : null,
    evaluatedBy: 'ระบบประเมินผลอัตโนมัติ (MES Learning Hub Exam System)'
  };

  if (existingIdx !== -1) {
    records[existingIdx] = newRecord;
  } else {
    records.unshift(newRecord);
  }

  saveTrainingRecords(records);

  if (passed) {
    addExp(50, `สอบผ่านแบบทดสอบวัดผลหลักสูตร (${quizPct}%) และได้รับใบรับรองสมรรถนะ`);
    applyOptimisticLearningGradeUpdate(empId);
  }

  try {
    const allMerged = [...courses, ...getCustomCourses()];
    const crs = allMerged.find(c => c.id === courseId);
    syncCourseProgressToBackend({
      empId: empId,
      courseId: courseId,
      courseTitle: crs ? crs.title : courseId,
      category: crs ? crs.category : 'มาตรฐานโรงงาน',
      status: passed ? 'completed' : 'failed',
      quizScore: score,
      quizTotal: totalQuestions,
      quizPercentage: quizPct,
      passed: passed,
      certificateId: newRecord.certificateId
    }).catch(() => {});
  } catch {
    // Ignore async error
  }

  return newRecord;
}

// Retrieve module completion list for a specific course & user
export function getUserModuleProgress(courseId) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const key = `mes_learning_module_progress_${empId}_${courseId}`;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Mark a single module as completed in real-time
export function markModuleCompleted({ courseId, moduleId, totalModules }) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const key = `mes_learning_module_progress_${empId}_${courseId}`;
  
  let completed = [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) completed = JSON.parse(stored);
  } catch {
    completed = [];
  }

  if (!completed.includes(moduleId)) {
    completed.push(moduleId);
    localStorage.setItem(key, JSON.stringify(completed));
    // Small EXP reward for each lesson read
    addExp(5, `เรียนจบหัวข้อย่อย (${completed.length}/${totalModules})`);
  }

  const progressPercent = Math.min(100, Math.round((completed.length / Math.max(1, totalModules)) * 100));
  const isAllDone = progressPercent >= 100;

  // Sync to training audit records
  const records = getTrainingRecords();
  const existingIdx = records.findIndex(r => (r.empId === empId || r.empId === currentUser.id) && r.courseId === courseId);

  if (existingIdx !== -1) {
    records[existingIdx].progressPercent = progressPercent;
    // Note: Do NOT mark passed=true here. Passing requires passing the post-test assessment (>=80%)
    if (!records[existingIdx].passed) {
      records[existingIdx].status = isAllDone ? 'ready_for_assessment' : 'in_progress';
    }
  } else {
    records.unshift({
      recordId: `rec-live-${Date.now()}`,
      empId: empId,
      courseId: courseId,
      status: isAllDone ? 'ready_for_assessment' : 'in_progress',
      progressPercent: progressPercent,
      quizScore: null,
      quizTotal: null,
      quizPercentage: null,
      passed: false,
      completedAt: null,
      expiresAt: null,
      certificateId: null,
      evaluatedBy: 'ระบบติดตามการเรียนรู้อัตโนมัติ (MES Learning Hub LMS)'
    });
  }

  saveTrainingRecords(records);

  // Sync progress status to backend asynchronously
  try {
    const allMerged = [...courses, ...getCustomCourses()];
    const crs = allMerged.find(c => c.id === courseId);
    syncCourseProgressToBackend({
      empId: empId,
      courseId: courseId,
      courseTitle: crs ? crs.title : courseId,
      category: crs ? crs.category : 'มาตรฐานโรงงาน',
      status: isAllDone ? 'ready_for_assessment' : 'in_progress',
      quizScore: 0,
      quizTotal: 0,
      quizPercentage: 0,
      passed: false,
      certificateId: null
    }).catch(() => {});
  } catch {
    // Ignore async error
  }

  return { completedModules: completed, progressPercent, isAllDone };
}

// Explicit course completion via passing Post-Test Assessment (>=80%)
export function recordCourseCompletion({ 
  courseId, 
  totalModules = 1, 
  moduleIds = [],
  score = 4,
  totalQuestions = 4 
}) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const key = `mes_learning_module_progress_${empId}_${courseId}`;

  // Mark all modules as completed in storage
  if (moduleIds && moduleIds.length > 0) {
    localStorage.setItem(key, JSON.stringify(moduleIds));
  }

  const records = getTrainingRecords();
  const existingIdx = records.findIndex(r => (r.empId === empId || r.empId === currentUser.id) && r.courseId === courseId);
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const quizPct = Math.round((score / Math.max(1, totalQuestions)) * 100);
  const isPassed = quizPct >= 80;

  const certId = `SNC-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const record = {
    recordId: existingIdx !== -1 ? records[existingIdx].recordId : `rec-live-${Date.now()}`,
    empId: empId,
    courseId: courseId,
    status: isPassed ? 'completed' : 'failed',
    progressPercent: 100,
    quizScore: score,
    quizTotal: totalQuestions,
    quizPercentage: quizPct,
    passed: isPassed,
    completedAt: isPassed ? now.toISOString() : null,
    expiresAt: isPassed ? nextYear.toISOString() : null,
    certificateId: isPassed ? ((existingIdx !== -1 && records[existingIdx].certificateId) ? records[existingIdx].certificateId : certId) : null,
    evaluatedBy: 'ฝ่ายฝึกอบรมและพัฒนาบุคลากร (HRD & Training Committee)'
  };

  if (existingIdx !== -1) {
    records[existingIdx] = record;
  } else {
    records.unshift(record);
  }

  saveTrainingRecords(records);
  if (isPassed) {
    addExp(50, `สอบผ่านแบบทดสอบวัดผลหลักสูตร (${quizPct}%) และได้รับใบรับรองสมรรถนะ`);
    applyOptimisticLearningGradeUpdate(empId);
  }

  // Real-time synchronization to MES SQL Server (dbo.LEARNING_RECORDS & dbo.EMP_SKILLS)
  try {
    const allMerged = [...courses, ...getCustomCourses()];
    const crs = allMerged.find(c => c.id === courseId);
    syncCourseProgressToBackend({
      empId: empId,
      courseId: courseId,
      courseTitle: crs ? crs.title : courseId,
      category: crs ? crs.category : 'มาตรฐานโรงงาน',
      status: isPassed ? 'completed' : 'failed',
      quizScore: score,
      quizTotal: totalQuestions,
      quizPercentage: quizPct,
      passed: isPassed,
      certificateId: record.certificateId
    }).catch(() => {});
  } catch {
    // Ignore async error
  }

  return record;
}

// Record failed assessment attempt for audit matrix tracking
export function recordFailedAssessment({ courseId, score = 0, totalQuestions = 4 }) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const records = getTrainingRecords();
  const existingIdx = records.findIndex(r => (r.empId === empId || r.empId === currentUser.id) && r.courseId === courseId);
  const quizPct = Math.round((score / Math.max(1, totalQuestions)) * 100);

  const prevPassed = existingIdx !== -1 && records[existingIdx].passed;

  const record = {
    recordId: existingIdx !== -1 ? records[existingIdx].recordId : `rec-live-${Date.now()}`,
    empId: empId,
    courseId: courseId,
    status: prevPassed ? 'completed' : 'failed',
    progressPercent: 100,
    quizScore: score,
    quizTotal: totalQuestions,
    quizPercentage: quizPct,
    passed: prevPassed,
    completedAt: prevPassed ? records[existingIdx].completedAt : null,
    expiresAt: prevPassed ? records[existingIdx].expiresAt : null,
    certificateId: prevPassed ? records[existingIdx].certificateId : null,
    evaluatedBy: 'ฝ่ายฝึกอบรมและพัฒนาบุคลากร (HRD & Training Committee)'
  };

  if (existingIdx !== -1) {
    records[existingIdx] = record;
  } else {
    records.unshift(record);
  }

  saveTrainingRecords(records);

  // Sync failed attempt to backend
  try {
    const allMerged = [...courses, ...getCustomCourses()];
    const crs = allMerged.find(c => c.id === courseId);
    syncCourseProgressToBackend({
      empId: empId,
      courseId: courseId,
      courseTitle: crs ? crs.title : courseId,
      category: crs ? crs.category : 'มาตรฐานโรงงาน',
      status: prevPassed ? 'completed' : 'failed',
      quizScore: score,
      quizTotal: totalQuestions,
      quizPercentage: quizPct,
      passed: prevPassed,
      certificateId: record.certificateId
    }).catch(() => {});
  } catch {
    // Ignore async error
  }

  return record;
}

// Get user course status for Catalog or Viewer
export function getUserCourseStatus(courseId) {
  const currentUser = getCurrentUser();
  const empId = currentUser.emp_id || `EMP-${currentUser.id || 'ME'}`;
  const records = getTrainingRecords();
  const rec = records.find(r => (r.empId === empId || r.empId === currentUser.id) && r.courseId === courseId);

  if (rec) {
    return {
      status: rec.status,
      progressPercent: rec.progressPercent || (rec.passed ? 100 : 0),
      passed: rec.passed,
      certificateId: rec.certificateId,
      completedAt: rec.completedAt
    };
  }

  return {
    status: 'not_started',
    progressPercent: 0,
    passed: false,
    certificateId: null,
    completedAt: null
  };
}

// --- DUAL-PERSPECTIVE AGGREGATION ENGINES ---

/**
 * Perspective 1: Course-Centric Audit Summary
 * Returns full audit statistics and participant roster for a selected course.
 */
export function getCourseAuditSummary(courseId) {
  const allCourses = [...courses, ...getCustomCourses()];
  const course = allCourses.find(c => c.id === courseId) || courses[0];
  const allEmployees = getAllEmployees();
  const records = getTrainingRecords();

  const courseRecords = records.filter(r => r.courseId === courseId);
  const recordMap = new Map(courseRecords.map(r => [r.empId, r]));

  // Build employee list with status
  const participantRoster = allEmployees.map(emp => {
    const rec = recordMap.get(emp.empId);
    let status = 'not_started';
    let quizPct = null;
    let scoreDisplay = '-';
    let completedDate = '-';
    let certId = '-';
    let expiresAt = null;

    if (rec) {
      status = rec.passed ? 'completed' : (rec.status === 'in_progress' ? 'in_progress' : 'failed');
      quizPct = rec.quizPercentage;
      scoreDisplay = rec.quizTotal !== null ? `${rec.quizScore}/${rec.quizTotal} (${rec.quizPercentage}%)` : '-';
      completedDate = rec.completedAt ? new Date(rec.completedAt).toLocaleDateString('th-TH') : '-';
      certId = rec.certificateId || '-';
      expiresAt = rec.expiresAt;
    }

    return {
      empId: emp.empId,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      shift: emp.shift,
      avatar: emp.avatar,
      status: status,
      quizPercentage: quizPct,
      scoreDisplay: scoreDisplay,
      completedDate: completedDate,
      certificateId: certId,
      expiresAt: expiresAt,
      passed: rec ? rec.passed : false
    };
  });

  const enrolled = participantRoster.filter(p => p.status !== 'not_started');
  const passedList = participantRoster.filter(p => p.passed);
  const inProgressList = participantRoster.filter(p => p.status === 'in_progress');
  const failedList = participantRoster.filter(p => p.status === 'failed');

  const scores = enrolled.filter(p => p.quizPercentage !== null).map(p => p.quizPercentage);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passRate = enrolled.length > 0 ? Math.round((passedList.length / enrolled.length) * 100) : 0;

  // Breakdown by Department
  const deptBreakdown = {};
  DEPARTMENTS.forEach(dept => {
    const deptEmployees = participantRoster.filter(p => p.department === dept);
    const deptPassed = deptEmployees.filter(p => p.passed);
    const complianceRate = deptEmployees.length > 0 ? Math.round((deptPassed.length / deptEmployees.length) * 100) : 0;
    deptBreakdown[dept] = {
      total: deptEmployees.length,
      passed: deptPassed.length,
      complianceRate: complianceRate
    };
  });

  return {
    course: course,
    totalEmployees: allEmployees.length,
    enrolledCount: enrolled.length,
    passedCount: passedList.length,
    inProgressCount: inProgressList.length,
    failedCount: failedList.length,
    notStartedCount: allEmployees.length - enrolled.length,
    avgScorePercent: avgScore,
    passRatePercent: passRate,
    participantRoster: participantRoster,
    deptBreakdown: deptBreakdown,
    quizAnalytics: COURSE_QUIZ_ANALYTICS[courseId] || []
  };
}

export function mapLineToDepartment(lineOrDept = '') {
  const raw = String(lineOrDept || '').trim().toUpperCase();
  if (!raw) return 'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)';
  if (DEPARTMENTS.includes(lineOrDept)) return lineOrDept;

  if (raw.includes('QA') || raw.includes('QC') || raw.includes('CHECK')) {
    return 'แผนกควบคุมคุณภาพ (QC/QA)';
  }
  if (raw.includes('MT') || raw.includes('PE') || raw.includes('TOOL') || raw.includes('IT') || raw.includes('OFFICE') || raw.includes('MANAGEMENT')) {
    return 'แผนกวิศวกรรมการผลิตและแม่พิมพ์ (Tooling & PE)';
  }
  if (raw.includes('ST') || raw.includes('WH') || raw.includes('STORE') || raw.includes('SCM') || raw.includes('LOGISTIC')) {
    return 'แผนกคลังสินค้าและโลจิสติกส์ (Store & Warehouse)';
  }
  if (raw.includes('ASSY') || raw.includes('ASSEMBLY') || raw.includes('PAINT') || raw.includes('WELD')) {
    return 'แผนกผลิตประกอบ (Production Assembly)';
  }
  return 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)';
}

/**
 * Perspective 2: Employee Competency Passport & Skill Matrix
 * Returns skill passport, compliance rate, and gap analysis for an employee.
 */
export function getEmployeeCompetencyPassport(empId, livePassportData = null) {
  const allEmployees = getAllEmployees();
  const currentUser = getCurrentUser();
  const currentEmpId = currentUser.emp_id || `EMP-${currentUser.id || '5928'}`;
  
  let employee = null;
  let currentUserIsMe = false;

  const USER_ID_MAP = {
    'usr-103': 'EMP-1880',
    'usr-102': 'EMP-2905',
    'usr-104': 'EMP-1092',
    'usr-105': 'EMP-4419',
    'usr-001': 'EMP-5928'
  };
  const lookupId = USER_ID_MAP[empId] || empId;

  const isLookingUpMe =
    !lookupId ||
    lookupId === 'me' ||
    lookupId === currentEmpId ||
    lookupId === currentUser.id ||
    (currentUser.username && lookupId === currentUser.username);

  if (isLookingUpMe) {
    currentUserIsMe = true;
    const mappedDept = mapLineToDepartment(currentUser.line || currentUser.department);
    const rawLine = currentUser.line || '';
    employee = (!currentUser.isLoggedInReal && allEmployees.find(e => e.empId === currentEmpId)) || {
      empId: currentEmpId,
      name: currentUser.name,
      role: currentUser.role,
      line: rawLine,
      department: rawLine && !mappedDept.includes(rawLine) ? `${mappedDept} · [${rawLine}]` : mappedDept,
      matrixDepartment: mappedDept,
      shift: currentUser.team_group ? `${currentUser.team_group} (08:00 - 17:00)` : 'Day Shift (08:00 - 17:00)',
      avatar: currentUser.avatar || getUserAvatarSvg(currentUser.name || 'MES'),
      joinedDate: '2023-01-01'
    };
  } else if (livePassportData && livePassportData.employee) {
    const liveEmp = livePassportData.employee;
    const mappedDept = mapLineToDepartment(liveEmp.line || liveEmp.department_api);
    const rawLine = liveEmp.line || '';
    employee = {
      empId: liveEmp.emp_id || lookupId,
      name: liveEmp.name_th || lookupId,
      role: liveEmp.position || 'พนักงานปฏิบัติการ',
      line: rawLine,
      department: rawLine && !mappedDept.includes(rawLine) ? `${mappedDept} · [${rawLine}]` : mappedDept,
      matrixDepartment: mappedDept,
      shift: liveEmp.team_group ? `${liveEmp.team_group} (08:00 - 17:00)` : 'Day Shift (08:00 - 17:00)',
      avatar: getUserAvatarSvg(liveEmp.name_th || lookupId),
      joinedDate: '2023-01-01'
    };
    currentUserIsMe = (employee.empId === currentEmpId);
  } else {
    const matchedStatic = allEmployees.find(e => 
      e.empId === lookupId || 
      e.empId?.toLowerCase() === lookupId?.toLowerCase() ||
      e.name === lookupId ||
      e.name.includes(lookupId) ||
      (typeof lookupId === 'string' && lookupId.includes(e.name))
    );
    employee = matchedStatic || {
      empId: lookupId,
      name: `รหัสพนักงาน ${lookupId}`,
      role: 'พนักงานโรงงาน (กำลังโหลดข้อมูลจากฐานข้อมูล MES...)',
      department: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
      matrixDepartment: 'แผนกผลิตปั๊มขึ้นรูป (Production Stamping)',
      shift: 'Day Shift (08:00 - 17:00)',
      avatar: getUserAvatarSvg(String(lookupId)),
      joinedDate: '2023-01-01'
    };
    currentUserIsMe = (employee.empId === currentEmpId);
  }

  const allCourses = [...courses, ...getCustomCourses()];
  const records = getTrainingRecords();
  const empRecords = records.filter(r => r.empId === employee.empId || (currentUserIsMe && r.empId === currentUser.id));
  const recordMap = new Map(empRecords.map(r => [r.courseId, r]));

  // Merge live SQL Server LEARNING_RECORDS if available
  if (livePassportData && Array.isArray(livePassportData.learning_records)) {
    livePassportData.learning_records.forEach(lr => {
      if (lr && lr.course_id) {
        recordMap.set(lr.course_id, {
          empId: employee.empId,
          courseId: lr.course_id,
          status: lr.status || (Number(lr.passed) === 1 ? 'completed' : 'in_progress'),
          quizScore: lr.quiz_score !== null ? Number(lr.quiz_score) : null,
          quizTotal: lr.quiz_total !== null ? Number(lr.quiz_total) : null,
          quizPercentage: lr.quiz_percentage !== null ? Number(lr.quiz_percentage) : null,
          passed: Number(lr.passed) === 1,
          completedAt: lr.completed_at || lr.updated_at,
          expiresAt: null,
          certificateId: lr.certificate_id || null
        });
      }
    });
  }

  const mandatoryCourseIds = MANDATORY_MATRIX[employee.matrixDepartment || employee.department] || [];

  const courseStatusList = allCourses.map(course => {
    const rec = recordMap.get(course.id);
    const isMandatory = mandatoryCourseIds.includes(course.id);
    let status = 'not_started';
    let quizPct = null;
    let completedDate = '-';
    let expiresAt = null;
    let certId = '-';
    let daysRemaining = null;

    if (rec) {
      status = rec.status;
      quizPct = rec.quizPercentage;
      completedDate = rec.completedAt ? new Date(rec.completedAt).toLocaleDateString('th-TH') : '-';
      expiresAt = rec.expiresAt;
      certId = rec.certificateId || '-';

      if (rec.expiresAt) {
        const diffMs = new Date(rec.expiresAt).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }

    return {
      courseId: course.id,
      title: course.title,
      description: course.description,
      image: course.image || DEFAULT_COURSE_IMAGE,
      category: course.category,
      duration: course.duration,
      isMandatory: isMandatory,
      status: status,
      quizScore: rec?.quizScore ?? null,
      quizTotal: rec?.quizTotal ?? null,
      scoreDisplay: rec && rec.quizTotal !== null ? `${rec.quizScore}/${rec.quizTotal}` : '-',
      quizPercentage: quizPct,
      passed: rec ? rec.passed : false,
      completedDate: completedDate,
      expiresAt: expiresAt,
      daysRemaining: daysRemaining,
      certificateId: certId
    };
  });

  const mandatoryList = courseStatusList.filter(c => c.isMandatory);
  const mandatoryPassed = mandatoryList.filter(c => c.passed);
  const totalPassed = courseStatusList.filter(c => c.passed).length;
  
  // Mandatory Compliance Rate
  const complianceRate = mandatoryList.length > 0 
    ? Math.round((mandatoryPassed.length / mandatoryList.length) * 100) 
    : 100;

  // Skill gaps (mandatory courses not yet passed)
  const skillGaps = mandatoryList.filter(c => !c.passed);

  // Retraining alerts (<60 days remaining or expired)
  const expiringAlerts = courseStatusList.filter(c => c.passed && c.daysRemaining !== null && c.daysRemaining <= 60);

  const scores = courseStatusList.filter(c => c.quizPercentage !== null).map(c => c.quizPercentage);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Community contributions & rank calculation
  const posts = getCommunityPosts();
  const userPosts = posts.filter(p => 
    p.author?.id === employee.empId || 
    p.author?.name === employee.name || 
    (currentUserIsMe && p.author?.id === currentUser.id)
  );
  const totalLikesReceived = userPosts.reduce((acc, p) => acc + (p.likesCount || 0), 0);

  const exp = currentUserIsMe ? currentUser.exp : (employee.exp || 420);
  const rank = calculateRank(exp);

  // Live MES 4-Dimension Grading integration
  const userGrading = getUserGrading();
  const liveGrading = currentUserIsMe && (currentUser.grading || userGrading) ? (currentUser.grading || userGrading) : null;

  return {
    employee: employee,
    currentUserIsMe: currentUserIsMe,
    rank: rank,
    exp: exp,
    userPosts: userPosts,
    totalLikesReceived: totalLikesReceived,
    complianceRate: complianceRate,
    isAuditReady: complianceRate === 100,
    totalCoursesCount: allCourses.length,
    totalPassedCount: totalPassed,
    avgScorePercent: avgScore,
    mandatoryCoursesCount: mandatoryList.length,
    mandatoryPassedCount: mandatoryPassed.length,
    courseStatusList: courseStatusList,
    skillGaps: skillGaps,
    expiringAlerts: expiringAlerts,
    grading: liveGrading
  };
}

/**
 * Executive Level Analytics: Overall Department Compliance & Factory Alerts
 */
export function getOverallAuditAnalytics() {
  const allEmployees = getAllEmployees();
  const allCourses = [...courses, ...getCustomCourses()];
  const records = getTrainingRecords();

  const deptSummaries = DEPARTMENTS.map(dept => {
    const deptEmployees = allEmployees.filter(e => e.department === dept);
    const mandatoryCourseIds = MANDATORY_MATRIX[dept] || [];

    let totalMandatorySlots = deptEmployees.length * mandatoryCourseIds.length;
    let passedSlots = 0;

    deptEmployees.forEach(emp => {
      mandatoryCourseIds.forEach(cId => {
        const hasPassed = records.some(r => r.empId === emp.empId && r.courseId === cId && r.passed);
        if (hasPassed) passedSlots++;
      });
    });

    const rate = totalMandatorySlots > 0 ? Math.round((passedSlots / totalMandatorySlots) * 100) : 100;

    return {
      department: dept,
      totalEmployees: deptEmployees.length,
      complianceRate: rate,
      isTargetAchieved: rate >= 85
    };
  });

  // Calculate overall certifications
  const totalCertificates = records.filter(r => r.passed && r.certificateId).length;

  // Expiring alerts across whole factory
  const expiringList = [];
  records.forEach(r => {
    if (r.passed && r.expiresAt) {
      const diffMs = new Date(r.expiresAt).getTime() - Date.now();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days <= 60) {
        const emp = allEmployees.find(e => e.empId === r.empId);
        const course = allCourses.find(c => c.id === r.courseId);
        if (emp && course) {
          expiringList.push({
            empId: emp.empId,
            empName: emp.name,
            department: emp.department,
            courseTitle: course.title,
            daysRemaining: days,
            isExpired: days <= 0,
            certificateId: r.certificateId
          });
        }
      }
    }
  });

  return {
    totalEmployees: allEmployees.length,
    totalCourses: allCourses.length,
    totalCertificatesIssued: totalCertificates,
    deptSummaries: deptSummaries,
    expiringList: expiringList
  };
}
