import React, { useState, useEffect } from 'react';
import { 
  LineChart, ShoppingCart, Truck, FolderOpen, Boxes, 
  Smartphone, ListOrdered, Barcode, Printer, Ban, 
  Store, Warehouse, Package, MapPin, ShieldCheck, 
  ShieldAlert, Wrench, Sun, HeartPulse
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
    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all flex items-start gap-4 group"
  >
    <div className={`p-3 rounded-lg ${colorClass} group-hover:scale-105 transition-transform`}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-gray-800 text-sm md:text-base">{title}</h4>
      <p className="text-xs md:text-sm text-gray-500 mt-1">{desc}</p>
    </div>
  </Link>
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Box */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-40 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2"></div>
        
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">สวัสดี คุณ {user.fullname} 👋</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm flex items-center gap-2">
              <span className="opacity-70">ID:</span> {user.emp_id}
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm flex items-center gap-2">
              <span className="opacity-70">Line:</span> {user.line}
            </span>
            <span className="bg-blue-500/50 px-3 py-1 rounded-full border border-blue-400/50 backdrop-blur-sm font-semibold">
              {user.position}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3 relative z-10">
          <button onClick={() => setBriefModalOpen(true)} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-colors" title="ดูสรุปประจำวัน">
            <Sun size={24} />
          </button>
          <NotificationMenu 
            unreadDates={data.unreadDates} 
            monthlyData={data.monthlyData} 
            onOpenLog={handleOpenStandaloneLog} 
          />
        </div>
      </div>

      {/* Daily Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyPulseWidget 
          todayLogs={data.todayLogs} 
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />
        <CalendarWidget 
          monthlyData={data.monthlyData}
          unreadDates={data.unreadDates}
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />
      </div>

      {/* Service Grids */}
      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">COMMON SERVICES (บริการส่วนกลาง & แจ้งเรื่อง)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {commonServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-blue-700 border-b border-blue-100 pb-2 mb-4">PRODUCTION (ปฏิบัติการผลิต)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productionServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-orange-600 border-b border-orange-100 pb-2 mb-4">WAREHOUSE & LOGISTICS (คลังสินค้าและจัดส่ง)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {warehouseServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-red-600 border-b border-red-100 pb-2 mb-4">QUALITY & MAINTENANCE (คุณภาพและซ่อมบำรุง)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {qualityServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-green-600 border-b border-green-100 pb-2 mb-4">EXECUTIVE & MANAGEMENT (บริหารจัดการ)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
