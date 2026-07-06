export const courses = [
  {
    id: 'c1',
    title: 'Lean Manufacturing & Industry 4.0',
    description: 'เรียนรู้แนวคิดลีน (Lean Principles) การลดความสูญเปล่า 8 ประการ (8 Wastes) การสร้าง Value Stream Mapping (VSM) และการบูรณาการเข้ากับ Industry 4.0 เพื่อมุ่งสู่ Smart Factory',
    instructor: 'คุณวุฒิพงศ์ บุญนายวา',
    duration: '3 hours',
    category: 'Manufacturing Excellence',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600&h=400',
    modules: [
      {
        id: 'm1',
        title: 'แนวคิดของลีน (Lean Principles)',
        content: 'lean-principles' // We will map this to a content component or data
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
    category: 'Leadership & Digital',
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
  {
    id: 'c3',
    title: 'React + Vite Architecture Guide',
    description: 'เจาะลึกโครงสร้างแอปพลิเคชัน React + Vite สำหรับ MES Learning Hub ตั้งแต่เริ่มต้นจนถึงการ Deploy',
    instructor: 'Engineering Team',
    duration: '1.5 hours',
    category: 'Software Architecture',
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
      }
    ]
  },
  {
    id: 'c4',
    title: 'Enterprise System & Security (MES x SAP)',
    description: 'เรียนรู้สถาปัตยกรรมระบบหลังบ้าน การเชื่อมต่อฐานข้อมูล การป้องกันระบบจากภัยคุกคาม (CSRF) และการเชื่อมต่อกับระบบ SAP',
    instructor: 'Engineering Team',
    duration: '2.5 hours',
    category: 'Backend & Security',
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
