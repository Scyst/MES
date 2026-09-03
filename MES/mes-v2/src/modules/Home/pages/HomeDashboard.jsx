import React, { useState, useEffect } from 'react';
import { 
  LineChart, ShoppingCart, Truck, FolderOpen, Boxes, 
  Smartphone, ListOrdered, Barcode, Printer, Ban, 
  Store, Warehouse, Package, MapPin, ShieldCheck, 
  ShieldAlert, Wrench, HeartPulse, ChevronRight,
  Settings, Users, DollarSign, FileText, Zap, Sun, Calendar, Rocket,
  Video, Cuboid, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import DailyPulseWidget from '../components/DailyPulseWidget';
import CalendarWidget from '../components/CalendarWidget';
import MorningBriefModal from '../components/MorningBriefModal';
import NotificationMenu from '../components/NotificationMenu';
import LogModal from '../components/LogModal';
import { useAuth } from '../../../shared/contexts/AuthContext';

const ServiceCard = ({ title, desc, icon: Icon, colorClass, to }) => {
  const isLegacy = to.includes('.php') || to.includes('.html') || to.startsWith('http');
  const className = "group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:border-transparent hover:ring-1 hover:ring-blue-400/50 hover:-translate-y-1 transition-transform transition-shadow duration-300 flex items-center gap-4 px-4 py-3 min-h-[64px] relative overflow-hidden";
  
  const content = (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent group-hover:from-blue-50/50 dark:group-hover:from-blue-900/20 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${colorClass} group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0 relative z-10 pl-1">
        <p className="font-bold text-gray-800 dark:text-gray-100 text-base leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{desc}</p>
      </div>
      <div className="relative z-10 w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors flex-shrink-0">
        <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </>
  );

  return isLegacy ? (
    <a href={to} className={className}>{content}</a>
  ) : (
    <Link to={to} className={className}>{content}</Link>
  );
};

const SectionLabel = ({ label, subLabel, borderColor, textColor }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className={`inline-block w-1 h-4 rounded-full ${borderColor}`}></span>
    <span className={`text-xs font-extrabold tracking-widest uppercase ${textColor}`}>{label}</span>
    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">{subLabel}</span>
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
        
        // Auto show morning brief logic once per day
        const lastSeen = localStorage.getItem('morningBriefSeen');
        if (lastSeen !== todayStr) {
          setBriefModalOpen(true);
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

  useEffect(() => {
    // Listen for custom event from AppLayout
    const handleOpenBrief = () => {
      const isBriefAllowed = data.userRole === 'admin' || data.userRole === 'creator';
      if (isBriefAllowed) {
        setBriefModalOpen(true);
      }
    };
    window.addEventListener('openMorningBrief', handleOpenBrief);
    return () => window.removeEventListener('openMorningBrief', handleOpenBrief);
  }, [data.userRole]);

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

  const { user: authUser } = useAuth();
  
  // Use real user from context, fallback to safe defaults if undefined
  const user = authUser || {
    fullname: 'Guest User',
    emp_id: '-',
    line: '-',
    position: '-'
  };

  const commonServices = [
    { title: 'OEE Dashboard', desc: 'ดูประสิทธิภาพ (ภาพรวม)', icon: LineChart, colorClass: 'bg-gray-100 text-gray-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/OEE_Dashboard/OEE_Shopfloor.php' },
    { title: 'Material Request', desc: 'ระบบขอเบิกพัสดุ/อุปกรณ์', icon: ShoppingCart, colorClass: 'bg-gray-100 text-gray-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/materialReq.php' },
    { title: 'Forklift Booking', desc: 'จองรถและติดตามสถานะโฟร์คลิฟต์', icon: Truck, colorClass: 'bg-gray-100 text-gray-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/forklift/forkliftUI.php' },
    { title: 'Document Center', desc: 'คู่มือและเอกสาร', icon: FolderOpen, colorClass: 'bg-gray-100 text-gray-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/documentCenter/documentCenterUI.php' },
  ];

  const productionServices = [
    { title: 'Production Entry', desc: 'บันทึกผลผลิตประจำวัน', icon: Boxes, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/production/productionUI.php' },
    { title: 'Mobile Entry', desc: 'ลงยอดผ่านมือถือ (New)', icon: Smartphone, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MobileApp/index.html' },
    { title: 'Live Job Queue', desc: 'ระบบจัดการคิวงานหน้าไลน์ (KDS)', icon: ListOrdered, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/production/jobQueueUI.php' },
    { title: 'Scan Barcode', desc: 'ระบบสแกนบาร์โค้ด', icon: Barcode, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/scanBarcode/scanBarcodeUI.php' },
    { title: 'Tag Printer', desc: 'พิมพ์แท็กส่งงาน (WIP/FG)', icon: Printer, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/production/label_printer.php' },
    { title: 'Stop Causes', desc: 'แจ้งซ่อม/บันทึกเครื่องจักรหยุด', icon: Ban, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/PE/peRequest.php' },
  ];

  const warehouseServices = [
    { title: 'Store Dashboard', desc: 'ศูนย์ควบคุมและคิวจ่ายสโตร์', icon: Store, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/storeDashboard.php', roles: ['admin', 'creator', 'manager', 'supervisor', 'store'] },
    { title: 'Inventory Stock', desc: 'ตรวจสอบสต็อกและพิกัดแท็กสินค้า', icon: Boxes, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/inventoryDashboard.php' },
    { title: 'Warehouse Operations', desc: 'จัดการคลังสินค้า (รับเข้า/โหลดขาย)', icon: Warehouse, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/warehouse_operations.php', roles: ['admin', 'creator', 'manager', 'supervisor', 'store'] },
    { title: 'RM Receiving', desc: 'รับวัตถุดิบเข้าคลัง', icon: Package, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/rmReceiving.php', roles: ['admin', 'creator', 'manager', 'supervisor', 'store'] },
    { title: 'Scrap & Replacement', desc: 'เบิก/คืน วัตถุดิบ', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/storeRequest.php' },
    { title: 'Loading Report', desc: 'ตรวจสอบตู้สินค้า (C-TPAT)', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/loadingReport/loading_report.php' },
    { title: 'Customer Tracking', desc: 'ระบบค้นหาเอกสารสำหรับลูกค้า (Public)', icon: MapPin, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/loadingReport/customerPortal.php' },
    { title: 'Transport & Logistics', desc: 'บัญชีเที่ยวรถและค่าขนส่ง', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/fleetLog/fleetLog.php', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Area Access', desc: 'บันทึกเข้า-ออกพื้นที่หวงห้าม', icon: ShieldCheck, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/areaAccess/areaAccess.php' },
    { title: 'CCTV Downloader', desc: 'ดาวน์โหลดข้อมูลกล้องวงจรปิด', icon: Video, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/cctv_downloader/cctv_downloaderUI.php', roles: ['admin', 'creator', 'manager'] },
  ];

  const qualityServices = [
    { title: 'iQMS Dashboard', desc: 'ระบบจัดการคุณภาพ (NCR/CAR)', icon: ShieldAlert, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/QMS/qmsDashboard.php', roles: ['admin', 'creator', 'manager', 'supervisor', 'qa'] },
    { title: 'Accessories Inspection', desc: 'ระบบตรวจเช็คชิ้นส่วนประกอบ (AI Vision)', icon: ShieldCheck, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/AccessoriesInspection/accessoriesInspectionUI.php' },
    { title: 'PE Enterprise', desc: 'ศูนย์กลางจัดการเครื่องจักรและซ่อมบำรุง', icon: Wrench, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/PE/peDashboard.php', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'PE Tech (Mobile)', desc: 'ระบบรับงานและจัดการซ่อมสำหรับช่าง', icon: Smartphone, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/PE/peTechMobile.php' },
    { title: 'Digital Twin', desc: 'ระบบ 3D Monitoring ของโรงงาน', icon: Cuboid, colorClass: 'bg-red-100 text-red-600', to: 'http://10.1.8.142:5173/' },
  ];

  const executiveServices = [
    { title: 'Management Dashboard', desc: 'แดชบอร์ดผู้บริหารระดับสูง', icon: LineChart, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/management/managementDashboard.php', roles: ['admin', 'creator', 'manager'] },
    { title: 'Daily Command Center', desc: 'ศูนย์สั่งการและติดตามสถานะ', icon: ListOrdered, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/planning/daily_meeting.php', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Manpower', desc: 'จัดการกำลังคนประจำวัน', icon: Users, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/manpower/manpowerUI.php', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Employee Grading', desc: 'ประเมินเกรดและรายได้พิเศษ', icon: Star, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/manpower/employeeGrading.php', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Mood Insight Report', desc: 'รายงานวิเคราะห์ภาพรวมความรู้สึก', icon: HeartPulse, colorClass: 'bg-green-100 text-green-600', to: '/mood-insight', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Daily P&L', desc: 'บันทึกและวิเคราะห์งบกำไรขาดทุน', icon: DollarSign, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/dailyPL/pl_entry.php', roles: ['admin', 'creator'] },
    { title: 'Invoice Management', desc: 'ระบบออกบิลและจัดการเวอร์ชัน', icon: FileText, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/autoInvoice/finance_dashboard.php', roles: ['admin', 'creator', 'manager'] },
    { title: 'Sales Tracking', desc: 'ติดตามสถานะ PO', icon: Truck, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/sales/salesDashboard.php', roles: ['admin', 'creator', 'manager'] },
    { title: 'Utility & Energy', desc: 'ติดตามพลังงานและค่าไฟ', icon: Zap, colorClass: 'bg-green-100 text-green-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/management/utilityDashboard.php', roles: ['admin', 'creator', 'manager'] },
  ];

  const systemAdminServices = [
    { title: 'System Settings', desc: 'ตั้งค่าระบบหลัก', icon: Settings, colorClass: 'bg-gray-100 text-gray-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/systemSettings/systemSettings.php', roles: ['admin', 'creator'] },
    { title: 'User Manager', desc: 'จัดการผู้ใช้งานและสิทธิ์', icon: Users, colorClass: 'bg-gray-100 text-gray-700', to: '/admin/users', roles: ['admin', 'creator'] },
  ];

  const sandboxServices = [
    { title: 'Plan Dashboard (Test)', desc: 'ระบบวางแผนการผลิต (ทดสอบ)', icon: LineChart, colorClass: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', to: '/iot-toolbox/sandbox-b9/MES/MES/page/managementCopy/managementDashboard.php', roles: ['admin', 'creator'] },
    { title: 'Production (Test)', desc: 'ระบบบันทึกผลผลิต (ทดสอบ)', icon: Boxes, colorClass: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', to: '/iot-toolbox/sandbox-b9/MES/MES/page/productionCopy/productionUI.php', roles: ['admin', 'creator'] },
    { title: 'Sales Tracking (Test)', desc: 'ติดตามสถานะออเดอร์ (ทดสอบ)', icon: Truck, colorClass: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', to: '/iot-toolbox/sandbox-b9/MES/MES/page/salesCopy/salesDashboard.php', roles: ['admin', 'creator'] },
  ];

  const prototypeServices = [
    { title: 'New MES Toolbox (SPA)', desc: 'ระบบเวอร์ชันใหม่ (ทดลองใช้งาน)', icon: Rocket, colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', to: '/iot-toolbox/sandbox-b9/Toolbox2/#/' },
    { title: 'Learning Hub', desc: 'ศูนย์การเรียนรู้และคู่มือออนไลน์', icon: FolderOpen, colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', to: '/iot-toolbox/sandbox-b9/LearningHub/index.html' },
    { title: 'Team Planner', desc: 'กระดานแผนงานและปฏิทินทีม (New)', icon: Calendar, colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', to: '/iot-toolbox/sandbox-b9/Toolbox/planner/index.html' },
  ];

  const role = user?.role || 'guest';
  const filterByRole = (services) => {
    return services.filter(svc => !svc.roles || svc.roles.includes(role));
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="w-full lg:h-full grid grid-cols-1 lg:grid-cols-12 items-start lg:items-stretch gap-6 md:gap-8 pb-12 lg:pb-0 lg:overflow-hidden">
      
      <div className="flex flex-col gap-4 lg:col-span-5 lg:h-full lg:overflow-y-auto hidden-scrollbar pb-6 lg:pb-0 lg:-ml-6 lg:pl-6">
        
        <div className="flex flex-col gap-4 p-6 bg-[#f4f7fb] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mb-3 drop-shadow-sm">สวัสดี คุณ {user.fullname} 👋</h1>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                <span className="bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">ID: {user.emp_id}</span>
                <span className="bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">Line: {user.line}</span>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">{user.position}</span>
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
          
          {(data.userRole === 'admin' || data.userRole === 'creator') && (
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
          )}
        </div>

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

      <div className="flex flex-col gap-6 lg:col-span-7 lg:pl-6 lg:border-l lg:border-gray-100 dark:lg:border-gray-800 lg:h-full lg:overflow-y-auto custom-scrollbar pb-24 lg:pb-8 lg:-mr-6 lg:pr-8">

        <section>
          <SectionLabel label="COMMON SERVICES" subLabel="บริการส่วนกลาง & แจ้งเรื่อง" borderColor="bg-gray-400" textColor="text-gray-600 dark:text-gray-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filterByRole(commonServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        <section>
          <SectionLabel label="PRODUCTION" subLabel="ปฏิบัติการผลิต" borderColor="bg-blue-500" textColor="text-blue-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filterByRole(productionServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
          </div>
        </section>

        {filterByRole(warehouseServices).length > 0 && (
          <section>
            <SectionLabel label="WAREHOUSE & LOGISTICS" subLabel="คลังสินค้าและจัดส่ง" borderColor="bg-orange-500" textColor="text-orange-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(warehouseServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {filterByRole(qualityServices).length > 0 && (
          <section>
            <SectionLabel label="QUALITY & MAINTENANCE" subLabel="คุณภาพและซ่อมบำรุง" borderColor="bg-red-500" textColor="text-red-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(qualityServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {filterByRole(executiveServices).length > 0 && (
          <section>
            <SectionLabel label="EXECUTIVE & MANAGEMENT" subLabel="บริหารจัดการ" borderColor="bg-green-500" textColor="text-green-700" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(executiveServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {filterByRole(systemAdminServices).length > 0 && (
          <section>
            <SectionLabel label="SYSTEM ADMINISTRATION" subLabel="จัดการระบบ" borderColor="bg-gray-500" textColor="text-gray-700 dark:text-gray-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(systemAdminServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {filterByRole(sandboxServices).length > 0 && (
          <section>
            <SectionLabel label="SANDBOX (TEST ENVIRONMENT)" subLabel="ระบบทดสอบ" borderColor="bg-yellow-500" textColor="text-yellow-600 dark:text-yellow-500" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(sandboxServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {filterByRole(prototypeServices).length > 0 && (
          <section>
            <SectionLabel label="✨ NEW SYSTEM PROTOTYPE ✨" subLabel="ต้นแบบระบบใหม่" borderColor="bg-purple-500" textColor="text-purple-600 dark:text-purple-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filterByRole(prototypeServices).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}
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
