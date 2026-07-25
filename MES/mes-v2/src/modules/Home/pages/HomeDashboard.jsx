import React, { useState, useEffect } from 'react';
import { 
  LineChart, ShoppingCart, Truck, FolderOpen, Boxes, 
  Smartphone, ListOrdered, Barcode, Printer, Ban, 
  Store, Warehouse, Package, MapPin, ShieldCheck, 
  ShieldAlert, Wrench, Sun, HeartPulse, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import DailyPulseWidget from '../components/DailyPulseWidget';
import CalendarWidget from '../components/CalendarWidget';
import MorningBriefModal from '../components/MorningBriefModal';
import NotificationMenu from '../components/NotificationMenu';
import LogModal from '../components/LogModal';

const ServiceCard = ({ title, desc, icon: Icon, colorClass, to }) => (
  <Link
    to={to}
    className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 px-4 py-3 min-h-[60px]"
  >
    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform duration-200`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-gray-800 text-sm leading-snug group-hover:text-blue-600 transition-colors">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5 leading-tight">{desc}</p>
    </div>
    <ChevronRight size={14} className="flex-shrink-0 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
  </Link>
);

const SectionLabel = ({ label, subLabel, borderColor, textColor }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className={`inline-block w-1 h-4 rounded-full ${borderColor}`}></span>
    <span className={`text-xs font-extrabold tracking-widest uppercase ${textColor}`}>{label}</span>
    <span className="text-[11px] text-gray-400 font-normal">{subLabel}</span>
  </div>
);

export default function HomeDashboard() {
  const [data, setData] = useState({
    monthlyData: {},
    unreadDates: [],
    todayLogs: {},
    morningBrief: null,
    dashboardData: null,
    factoryMood: null,
    userRole: 'guest'
  });
  
  const [loading, setLoading] = useState(true);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [standaloneLogModal, setStandaloneLogModal] = useState({ isOpen: false, dateStr: '', pid: null });

  // Get "today" in local timezone as YYYY-MM-DD
  const getProductionDate = () => {
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getProductionDate();

  const loadInitialData = async () => {
    try {
      const res = await dailyLogApi.getInitialData();
      if (res.success && res.data) {
        setData(res.data);
        
        // Auto show morning brief logic
        if (res.data.morningBrief) {
          const lastSeen = localStorage.getItem('morningBriefSeen');
          if (lastSeen !== todayStr) {
            setBriefModalOpen(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenStandaloneLog = async (dateStr, pid) => {
    // If it's an unread reply, mark as read first
    const log = data.monthlyData[dateStr]?.[pid];
    if (log && log.reply_message && log.is_read == 0) {
      await dailyLogApi.markAsRead(dateStr, pid);
      // Optimistically update state
      setData(prev => {
        const newData = { ...prev };
        newData.monthlyData[dateStr][pid].is_read = 1;
        
        // Check if day has other unread logs
        const stillHasUnread = [1, 2, 3].some(p => {
          const l = newData.monthlyData[dateStr][p];
          return l && l.reply_message && l.is_read == 0;
        });

        if (!stillHasUnread) {
          newData.unreadDates = newData.unreadDates.filter(d => d !== dateStr);
        }
        return newData;
      });
    }

    setStandaloneLogModal({ isOpen: true, dateStr, pid });
  };

  // Mock User (In a real app, you would get this from Context/Redux)
  const user = {
    fullname: 'Admin User',
    emp_id: 'EMP-001',
    line: 'Line A',
    position: 'Supervisor'
  };

  const commonServices = [
    { title: 'OEE Dashboard', desc: 'ดูประสิทธิภาพ (ภาพรวม)', icon: LineChart, color: 'bg-gray-100 text-gray-700', to: '#' },
    { title: 'Material Request', desc: 'ระบบขอเบิกพัสดุ/อุปกรณ์', icon: ShoppingCart, color: 'bg-gray-100 text-gray-700', to: '#' },
    { title: 'Forklift Booking', desc: 'จองรถและติดตามสถานะโฟร์คลิฟต์', icon: Truck, color: 'bg-gray-100 text-gray-700', to: '#' },
    { title: 'Document Center', desc: 'คู่มือและเอกสาร', icon: FolderOpen, color: 'bg-gray-100 text-gray-700', to: '#' },
  ];

  const productionServices = [
    { title: 'Production Entry', desc: 'บันทึกผลผลิตประจำวัน', icon: Boxes, color: 'bg-blue-100 text-blue-600', to: '#' },
    { title: 'Mobile Entry', desc: 'ลงยอดผ่านมือถือ (New)', icon: Smartphone, color: 'bg-blue-100 text-blue-600', to: '#' },
    { title: 'Live Job Queue', desc: 'ระบบจัดการคิวงานหน้าไลน์ (KDS)', icon: ListOrdered, color: 'bg-blue-100 text-blue-600', to: '#' },
    { title: 'Scan Barcode', desc: 'ระบบสแกนบาร์โค้ด', icon: Barcode, color: 'bg-blue-100 text-blue-600', to: '#' },
    { title: 'Tag Printer', desc: 'พิมพ์แท็กส่งงาน (WIP/FG)', icon: Printer, color: 'bg-blue-100 text-blue-600', to: '#' },
    { title: 'Stop Causes', desc: 'แจ้งซ่อม/บันทึกเครื่องจักรหยุด', icon: Ban, color: 'bg-blue-100 text-blue-600', to: '#' },
  ];

  const warehouseServices = [
    { title: 'Store Dashboard', desc: 'ศูนย์ควบคุมและคิวจ่ายสโตร์', icon: Store, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Inventory Stock', desc: 'ตรวจสอบสต็อกและพิกัดแท็กสินค้า', icon: Boxes, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Warehouse Operations', desc: 'จัดการคลังสินค้า (รับเข้า/โหลดขาย)', icon: Warehouse, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'RM Receiving', desc: 'รับวัตถุดิบเข้าคลัง', icon: Package, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Scrap & Replacement', desc: 'เบิก/คืน วัตถุดิบ', icon: Truck, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Loading Report', desc: 'ตรวจสอบตู้สินค้า (C-TPAT)', icon: Truck, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Customer Tracking', desc: 'ระบบค้นหาเอกสารสำหรับลูกค้า', icon: MapPin, color: 'bg-orange-100 text-orange-600', to: '#' },
    { title: 'Area Access', desc: 'บันทึกเข้า-ออกพื้นที่หวงห้าม', icon: ShieldCheck, color: 'bg-orange-100 text-orange-600', to: '#' },
  ];

  const qualityServices = [
    { title: 'QMS Dashboard', desc: 'จัดการคุณภาพสินค้า', icon: ShieldAlert, color: 'bg-red-100 text-red-600', to: '/qms' },
    { title: 'Maintenance (PE)', desc: 'ระบบแจ้งซ่อมบำรุง', icon: Wrench, color: 'bg-red-100 text-red-600', to: '#' },
  ];

  const executiveServices = [
    { title: 'Mood Insight Report', desc: 'รายงานวิเคราะห์ภาพรวมความรู้สึก', icon: HeartPulse, color: 'bg-green-100 text-green-600', to: '/mood-insight' }
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-start gap-6 md:gap-8 lg:px-4 pb-12">
      
      {/* LEFT COLUMN: Personal & Daily Widgets */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        
        {/* Welcome Box */}
        <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-[#f6f8fd] to-[#f1f5f9] border border-gray-200 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 mb-3 drop-shadow-sm">สวัสดี คุณ {user.fullname} 👋</h1>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-600">
                <span className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">ID: {user.emp_id}</span>
                <span className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">Line: {user.line}</span>
                <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">{user.position}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <NotificationMenu 
                unreadDates={data.unreadDates} 
                monthlyData={data.monthlyData} 
                onOpenLog={handleOpenStandaloneLog} 
              />
            </div>
          </div>
          
          <button 
            onClick={() => setBriefModalOpen(true)} 
            className="w-full mt-2 bg-[#6b48d6] hover:bg-purple-700 text-white p-3 rounded-xl transition-all shadow-[0_4px_10px_rgba(107,72,214,0.3)] hover:shadow-[0_6px_15px_rgba(107,72,214,0.4)] hover:-translate-y-0.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-base font-bold tracking-wide drop-shadow-sm">
              <Sun size={20} />
              <span>ภาพรวมทีมงาน (Dashboard)</span>
            </div>
            <span className="text-xl leading-none">&rsaquo;</span>
          </button>
        </div>

        {/* Daily Pulse */}
        <DailyPulseWidget 
          todayLogs={data.todayLogs} 
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />
        
        {/* Calendar */}
        <CalendarWidget 
          monthlyData={data.monthlyData}
          unreadDates={data.unreadDates}
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />
      </div>

      {/* RIGHT COLUMN: Service Modules */}
      <div className="flex flex-col gap-6 lg:col-span-7 lg:pl-6 lg:border-l lg:border-gray-100">

        {/* Right column header */}
        <div className="pb-3 border-b border-gray-100">
          <h2 className="font-extrabold text-gray-700 text-base">เว็บไซต์บริการ <span className="text-gray-400 font-normal text-sm">(Service Modules)</span></h2>
          <p className="text-xs text-gray-400 mt-0.5">เลือกระบบที่ต้องการใช้งาน — กดการ์ดเพื่อเข้าใช้งาน</p>
        </div>

        <section>
          <SectionLabel label="COMMON SERVICES" subLabel="บริการส่วนกลาง & แจ้งเรื่อง" borderColor="bg-gray-400" textColor="text-gray-500" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {commonServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <SectionLabel label="PRODUCTION" subLabel="ปฏิบัติการผลิต" borderColor="bg-blue-500" textColor="text-blue-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {productionServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <SectionLabel label="WAREHOUSE & LOGISTICS" subLabel="คลังสินค้าและจัดส่ง" borderColor="bg-orange-500" textColor="text-orange-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {warehouseServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <SectionLabel label="QUALITY & MAINTENANCE" subLabel="คุณภาพและซ่อมบำรุง" borderColor="bg-red-500" textColor="text-red-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {qualityServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <SectionLabel label="EXECUTIVE & MANAGEMENT" subLabel="บริหารจัดการ" borderColor="bg-green-500" textColor="text-green-700" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {executiveServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>
      </div>

      {/* Modals */}
      <MorningBriefModal 
        isOpen={briefModalOpen} 
        onClose={() => setBriefModalOpen(false)} 
        initialData={data.morningBrief} 
      />

      {standaloneLogModal.isOpen && (
        <LogModal
          isOpen={standaloneLogModal.isOpen}
          onClose={() => setStandaloneLogModal({ isOpen: false, dateStr: '', pid: null })}
          periodId={standaloneLogModal.pid}
          periodInfo={{ 1: { label: 'เริ่มงาน (Start)' }, 2: { label: 'พักเบรก (Break)' }, 3: { label: 'เลิกงาน (End)' } }[standaloneLogModal.pid]}
          logDate={standaloneLogModal.dateStr}
          existingData={data.monthlyData[standaloneLogModal.dateStr]?.[standaloneLogModal.pid]}
          onSaved={loadInitialData}
        />
      )}
    </div>
  );
}
