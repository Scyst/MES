import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, ShoppingCart, Truck, Bus, FolderOpen, Boxes,
  Smartphone, ListOrdered, Barcode, Printer, Ban,
  Store, Warehouse, Package, MapPin, ShieldCheck,
  ShieldAlert, Wrench, HeartPulse, ChevronRight,
  Settings, Users, DollarSign, FileText, Zap, Sun, Calendar, Rocket,
  Video, Cuboid, Star, FlaskConical, GraduationCap, Search, X, Sparkles, Filter, Network
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
  const isLegacy = to.includes('.php') || to.includes('.html') || to.startsWith('http') || to.startsWith('/iot-toolbox');
  const isPorted = to.startsWith('/') && !isLegacy;

  const className = "group bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md hover:border-transparent hover:ring-2 hover:ring-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 px-3 py-2.5 xl:px-3.5 xl:py-3 min-h-[58px] xl:min-h-[64px] relative overflow-hidden";

  const content = (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 dark:via-blue-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className={`relative flex-shrink-0 w-10 h-10 xl:w-11 xl:h-11 rounded-xl flex items-center justify-center shadow-2xs ${colorClass} group-hover:scale-105 group-hover:shadow-sm transition-transform duration-200`}>
        <Icon size={20} className="xl:w-[22px] xl:h-[22px]" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 relative z-10 pl-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs xl:text-sm leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {title}
          </p>
          {isPorted && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 shadow-2xs">
              ⚡ SPA
            </span>
          )}
        </div>
        <p className="text-[11px] xl:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
          {desc}
        </p>
      </div>

      <div className="relative z-10 w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-700/70 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 transition-colors flex-shrink-0">
        <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </>
  );

  return isLegacy ? (
    <a href={to} className={className}>{content}</a>
  ) : (
    <Link to={to} className={className}>{content}</Link>
  );
};

const SectionLabel = ({ label, subLabel, borderColor, textColor, count }) => (
  <div className="flex items-center justify-between gap-2 mb-2.5">
    <div className="flex items-center gap-2">
      <span className={`inline-block w-1.5 h-4 rounded-full ${borderColor}`}></span>
      <span className={`text-xs font-extrabold tracking-wider uppercase ${textColor}`}>{label}</span>
      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">({subLabel})</span>
    </div>
    {count !== undefined && (
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
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

  // PC / Desktop Productivity States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { user: authUser } = useAuth();

  const user = authUser || {
    fullname: 'Guest User',
    emp_id: '-',
    line: '-',
    position: '-',
    role: 'guest'
  };

  const role = user?.role || 'guest';

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
      const status = error?.response?.status || error?.status;
      if (status !== 401) {
        console.error('Error fetching home data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
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
    const log = data.monthlyData[dateStr]?.[pid];
    if (log && log.reply_message && log.is_read == 0) {
      await dailyLogApi.markAsRead(dateStr, pid);
      setData(prev => {
        const newData = { ...prev };
        newData.monthlyData[dateStr][pid].is_read = 1;

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

  // Service Definitions
  const commonServices = useMemo(() => [
    { title: 'My Profile & 4D', desc: 'ข้อมูลส่วนตัวและผลการประเมิน 4 มิติ', icon: Users, colorClass: 'bg-blue-100 text-blue-700', to: '/profile' },
    { title: 'Team Planner', desc: 'กระดานแผนงานและปฏิทินทีม', icon: Calendar, colorClass: 'bg-purple-100 text-purple-700', to: '/planner' },
    { title: 'Shuttle Bus', desc: 'ระบบจองรถรับ-ส่งพนักงาน', icon: Bus, colorClass: 'bg-emerald-100 text-emerald-700', to: '/transport' },
    { title: 'MES Learning Hub', desc: 'ศูนย์การเรียนรู้ & สอบวัดผล (Academy)', icon: GraduationCap, colorClass: 'bg-indigo-100 text-indigo-700', to: '/learning' },
    { title: 'OEE Dashboard', desc: 'ดูประสิทธิภาพ (ภาพรวม)', icon: LineChart, colorClass: 'bg-slate-100 text-slate-700', to: '/iot-toolbox/sandbox-b9/MES/MES/page/OEE_Dashboard/OEE_Shopfloor.php' },
    { title: 'Material Request', desc: 'ระบบขอเบิกพัสดุ/อุปกรณ์', icon: ShoppingCart, colorClass: 'bg-indigo-100 text-indigo-700', to: '/store?tab=requisition', badge: 'SPA' },
    { title: 'Forklift Booking', desc: 'จองรถและติดตามสถานะโฟล์คลิฟท์', icon: Truck, colorClass: 'bg-blue-100 text-blue-700', to: '/forklift' },
    { title: 'Document Center', desc: 'คู่มือและเอกสารการทำงาน (WI/SOP/CAD)', icon: FolderOpen, colorClass: 'bg-indigo-100 text-indigo-700', to: '/documents' },
  ], []);

  const productionServices = useMemo(() => [
    { title: 'PAINT Chemical', desc: 'ระบบบันทึกเคมีสี (Check Sheet)', icon: FlaskConical, colorClass: 'bg-blue-100 text-blue-700', to: '/paint-chem' },
    { title: 'Production Entry', desc: 'บันทึกผลผลิตประจำวัน', icon: Boxes, colorClass: 'bg-blue-100 text-blue-600', to: '/production' },
    { title: 'Mobile Entry', desc: 'ลงยอดผ่านมือถือ (New)', icon: Smartphone, colorClass: 'bg-blue-100 text-blue-600', to: '/iot-toolbox/sandbox-b9/MobileApp/index.html' },
    { title: 'Live Job Queue', desc: 'ระบบจัดการคิวงานหน้าไลน์ (KDS)', icon: ListOrdered, colorClass: 'bg-blue-100 text-blue-600', to: '/production?tab=queue' },
    { title: 'Scan Barcode', desc: 'ระบบสแกนบาร์โค้ด', icon: Barcode, colorClass: 'bg-blue-100 text-blue-600', to: '/scan-barcode' },
    { title: 'Tag Printer', desc: 'พิมพ์แท็กส่งงาน (WIP/FG)', icon: Printer, colorClass: 'bg-blue-100 text-blue-600', to: '/production?tab=printer' },
    { title: 'Stop Causes', desc: 'แจ้งซ่อม/บันทึกเครื่องจักรหยุด', icon: Ban, colorClass: 'bg-blue-100 text-blue-600', to: '/pe/request', badge: 'SPA' },
  ], []);

  const warehouseServices = useMemo(() => [
    { title: 'Inbound Hub (SCM-Store)', desc: 'ศูนย์กลางเชื่อมเอกสาร ลูกค้า–SCM–สโตร์', icon: Package, colorClass: 'bg-orange-100 text-orange-700', to: '/inbound-hub' },
    { title: 'Store & Inventory Hub', desc: 'ศูนย์กลางสต็อกคงคลังและอนุมัติตัดยอด', icon: Store, colorClass: 'bg-orange-100 text-orange-600', to: '/store', badge: 'SPA' },
    { title: 'Visual Cycle Count', desc: 'ตรวจนับสินค้าคลังแบบ Visual Map & Blind Count', icon: Boxes, colorClass: 'bg-orange-100 text-orange-600', to: '/store?tab=cycle-count', badge: 'SPA' },
    { title: 'Store KDS & PRD Return', desc: 'คิวจ่ายพัสดุสโตร์ เปิด K2 และรับคืนวัตถุดิบ', icon: Warehouse, colorClass: 'bg-orange-100 text-orange-600', to: '/store?tab=kds', roles: ['admin', 'creator', 'manager', 'supervisor', 'store'], badge: 'SPA' },
    { title: 'RM Receiving', desc: 'รับวัตถุดิบเข้าคลังและพิมพ์แท็ก QR', icon: Package, colorClass: 'bg-orange-100 text-orange-600', to: '/store?tab=receiving', roles: ['admin', 'creator', 'manager', 'supervisor', 'store'], badge: 'SPA' },
    { title: 'Scrap & Replacement', desc: 'แจ้งของเสีย เบิกทดแทน และวิเคราะห์มูลค่า', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/store?tab=scrap', badge: 'SPA' },
    { title: 'Loading Report', desc: 'ตรวจสอบตู้สินค้า (C-TPAT)', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/loading-report', badge: 'SPA' },
    { title: 'C-TPAT Doc Tracking', desc: 'ค้นหาเอกสาร C-TPAT เสร็จสมบูรณ์', icon: MapPin, colorClass: 'bg-orange-100 text-orange-600', to: '/loading-report?tab=tracking', badge: 'SPA' },
    { title: 'Transport & Logistics', desc: 'บัญชีเที่ยวรถและค่าขนส่ง (Freight FleetLog)', icon: Truck, colorClass: 'bg-orange-100 text-orange-600', to: '/fleet-log', roles: ['admin', 'creator', 'manager', 'supervisor'], badge: 'SPA' },
    { title: 'Area Access', desc: 'บันทึกเข้า-ออกพื้นที่หวงห้าม', icon: ShieldCheck, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/areaAccess/areaAccess.php' },
    { title: 'CCTV Downloader', desc: 'ดาวน์โหลดข้อมูลกล้องวงจรปิด', icon: Video, colorClass: 'bg-orange-100 text-orange-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/cctv_downloader/cctv_downloaderUI.php', roles: ['admin', 'creator', 'manager'] },
  ], []);

  const qualityServices = useMemo(() => [
    { title: 'iQMS Dashboard', desc: 'ระบบจัดการคุณภาพ (NCR/CAR)', icon: ShieldAlert, colorClass: 'bg-red-100 text-red-600', to: '/qms', roles: ['admin', 'creator', 'manager', 'supervisor', 'qa', 'qc'], badge: 'SPA' },
    { title: 'Accessories Inspection', desc: 'ระบบตรวจเช็คชิ้นส่วนประกอบ (AI Vision)', icon: ShieldCheck, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/AccessoriesInspection/accessoriesInspectionUI.php' },
    { title: 'PE Enterprise', desc: 'ศูนย์กลางจัดการเครื่องจักรและซ่อมบำรุง', icon: Wrench, colorClass: 'bg-red-100 text-red-600', to: '/pe', roles: ['admin', 'creator', 'manager', 'supervisor'], badge: 'SPA' },
    { title: 'PE Tech (Mobile)', desc: 'ระบบรับงานและจัดการซ่อมสำหรับช่าง', icon: Smartphone, colorClass: 'bg-red-100 text-red-600', to: '/pe/tech', badge: 'SPA' },
    { title: 'Digital Twin', desc: 'ระบบ 3D Monitoring ของโรงงาน', icon: Cuboid, colorClass: 'bg-red-100 text-red-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/digitalTwin/digitalTwin.html' },
  ], []);

  const executiveServices = useMemo(() => [
    { title: 'Management Dashboard', desc: 'แดชบอร์ดผู้บริหารระดับสูง', icon: LineChart, colorClass: 'bg-emerald-100 text-emerald-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/management/managementDashboard.php', roles: ['admin', 'creator', 'manager'] },
    { title: 'Daily Command Center', desc: 'ศูนย์สั่งการและติดตามสถานะ', icon: ListOrdered, colorClass: 'bg-emerald-100 text-emerald-600', to: '/planning', badge: 'SPA', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Manpower', desc: 'จัดการกำลังคนประจำวัน', icon: Users, colorClass: 'bg-emerald-100 text-emerald-600', to: '/manpower', badge: 'SPA', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Employee Grading', desc: 'ประเมินเกรดและรายได้พิเศษ', icon: Star, colorClass: 'bg-emerald-100 text-emerald-600', to: '/manpower?tab=grading', badge: 'SPA', roles: ['admin', 'creator', 'manager'] },
    { title: 'Mood Insight Report', desc: 'รายงานวิเคราะห์ภาพรวมความรู้สึก', icon: HeartPulse, colorClass: 'bg-emerald-100 text-emerald-600', to: '/mood-report', roles: ['admin', 'creator', 'manager', 'supervisor'] },
    { title: 'Daily P&L', desc: 'บันทึกและวิเคราะห์งบกำไรขาดทุน', icon: DollarSign, colorClass: 'bg-emerald-100 text-emerald-600', to: '/iot-toolbox/sandbox-b9/MES/MES/page/dailyPL/pl_entry.php', roles: ['admin', 'creator'] },
    { title: 'Invoice Management', desc: 'ระบบออกบิลและจัดการเวอร์ชัน', icon: FileText, colorClass: 'bg-emerald-100 text-emerald-600', to: '/auto-invoice', roles: ['admin', 'creator', 'manager', 'planner'], badge: 'SPA' },
    { title: 'Sales Tracking', desc: 'ติดตามสถานะ PO', icon: Truck, colorClass: 'bg-emerald-100 text-emerald-600', to: '/sales', roles: ['admin', 'creator', 'manager', 'planner', 'customer'], badge: 'SPA' },
    { title: 'Shipping Loading', desc: 'ติดตามการจัดส่งและโหลดตู้', icon: Truck, colorClass: 'bg-emerald-100 text-emerald-600', to: '/sales?tab=shipping', roles: ['admin', 'creator', 'manager', 'planner', 'customer'], badge: 'SPA' },
    { title: 'Utility & Energy', desc: 'ติดตามพลังงานและค่าไฟ TOU & LPG', icon: Zap, colorClass: 'bg-emerald-100 text-emerald-600', to: '/utility', roles: ['admin', 'creator', 'manager', 'engineer', 'supervisor'] },
  ], []);

  const systemAdminServices = useMemo(() => [
    { title: 'System Settings', desc: 'ตั้งค่าระบบและข้อมูลหลัก (Master Data)', icon: Settings, colorClass: 'bg-slate-100 text-slate-700', to: '/system-settings', roles: ['admin', 'creator', 'supervisor'] },
    { title: 'User Manager', desc: 'จัดการผู้ใช้งานและสิทธิ์ (PBAC Matrix)', icon: Users, colorClass: 'bg-slate-100 text-slate-700', to: '/admin/users', roles: ['admin', 'creator'] },
    { title: 'System Blueprint', desc: 'พิมพ์เขียวสถาปัตยกรรมและผังระบบโรงงาน', icon: Network, colorClass: 'bg-indigo-100 text-indigo-700', to: '/blueprint', roles: ['admin', 'creator', 'manager', 'supervisor', 'executive'] },
  ], []);

  const sandboxServices = useMemo(() => [
    { title: 'Production (Test)', desc: 'ระบบบันทึกผลผลิต (ทดสอบ)', icon: Boxes, colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', to: '/iot-toolbox/sandbox-b9/MES/MES/page/productionCopy/productionUI.php', roles: ['admin', 'creator'] },
  ], []);

  const filterByRole = (services) => {
    return services.filter(svc => !svc.roles || svc.roles.includes(role));
  };

  // Trainee Filtered List
  const accessibleCommon = useMemo(() => {
    return filterByRole(role === 'trainee'
      ? commonServices.filter(s => ['My Profile & 4D', 'MES Learning Hub'].includes(s.title))
      : commonServices
    );
  }, [role, commonServices]);

  const accessibleProduction = useMemo(() => role === 'trainee' ? [] : filterByRole(productionServices), [role, productionServices]);
  const accessibleWarehouse = useMemo(() => role === 'trainee' ? [] : filterByRole(warehouseServices), [role, warehouseServices]);
  const accessibleQuality = useMemo(() => role === 'trainee' ? [] : filterByRole(qualityServices), [role, qualityServices]);
  const accessibleExecutive = useMemo(() => role === 'trainee' ? [] : filterByRole(executiveServices), [role, executiveServices]);
  const accessibleAdmin = useMemo(() => role === 'trainee' ? [] : filterByRole(systemAdminServices), [role, systemAdminServices]);
  const accessibleSandbox = useMemo(() => role === 'trainee' ? [] : filterByRole(sandboxServices), [role, sandboxServices]);

  // All accessible services merged
  const allAccessibleServices = useMemo(() => [
    ...accessibleCommon.map(s => ({ ...s, category: 'common' })),
    ...accessibleProduction.map(s => ({ ...s, category: 'production' })),
    ...accessibleWarehouse.map(s => ({ ...s, category: 'warehouse' })),
    ...accessibleQuality.map(s => ({ ...s, category: 'quality' })),
    ...accessibleExecutive.map(s => ({ ...s, category: 'executive' })),
    ...accessibleAdmin.map(s => ({ ...s, category: 'admin' })),
    ...accessibleSandbox.map(s => ({ ...s, category: 'sandbox' })),
  ], [
    accessibleCommon, accessibleProduction, accessibleWarehouse,
    accessibleQuality, accessibleExecutive, accessibleAdmin, accessibleSandbox
  ]);

  // Ported SPA modules list
  const portedSpaServices = useMemo(() => {
    return allAccessibleServices.filter(s => s.to.startsWith('/') && !s.to.includes('.php') && !s.to.includes('.html') && !s.to.startsWith('http') && !s.to.startsWith('/iot-toolbox'));
  }, [allAccessibleServices]);

  // Category counts
  const categoryCounts = useMemo(() => ({
    all: allAccessibleServices.length,
    spa: portedSpaServices.length,
    common: accessibleCommon.length,
    production: accessibleProduction.length,
    warehouse: accessibleWarehouse.length,
    quality: accessibleQuality.length,
    executive: accessibleExecutive.length,
    admin: accessibleAdmin.length,
  }), [
    allAccessibleServices.length, portedSpaServices.length, accessibleCommon.length,
    accessibleProduction.length, accessibleWarehouse.length, accessibleQuality.length,
    accessibleExecutive.length, accessibleAdmin.length
  ]);

  // Search filtered results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allAccessibleServices.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.desc && s.desc.toLowerCase().includes(q))
    );
  }, [searchQuery, allAccessibleServices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="w-full lg:h-full grid grid-cols-1 lg:grid-cols-12 items-start lg:items-stretch gap-6 pb-12 lg:pb-0 lg:overflow-hidden">

      {/* Left Sidebar (Greeting, Performance, Daily Pulse, Calendar, Factory Operations) */}
      <div className="flex flex-col gap-3.5 lg:col-span-5 xl:col-span-5 2xl:col-span-5 lg:h-full lg:overflow-y-auto hidden-scrollbar pb-6 lg:pb-0 shrink-0">

        {/* Greeting Card (Balanced, Crisp & Professional) */}
        <div className="flex flex-col gap-3 p-3.5 xl:p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800 dark:to-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-2xs border-l-4 border-l-blue-600">
          <div className="flex justify-between items-start gap-3">
            {/* Left: User Identity */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg xl:text-xl font-extrabold text-slate-800 dark:text-slate-100 truncate">
                สวัสดี {user.fullname} 👋
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1.5">
                <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 shadow-2xs font-mono font-semibold">
                  ID: {user.emp_id}
                </span>
                {user.line && (
                  <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 shadow-2xs truncate max-w-[130px]" title={user.line}>
                    {user.line}
                  </span>
                )}
                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 shadow-2xs font-semibold uppercase">
                  {user.position || user.role || 'ADMIN'}
                </span>
              </div>
            </div>

            {/* Right: Operational Shift & Status Info (Eliminates Empty Space & Balances Layout) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end text-right px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{new Date().getHours() >= 8 && new Date().getHours() < 20 ? 'กะเช้า (Day Shift)' : 'กะดึก (Night Shift)'}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  08:00 - 20:00 • Plant B9
                </div>
              </div>

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
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-2.5 rounded-lg transition-all shadow-2xs hover:shadow-sm hover:-translate-y-0.5 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                <Sun size={16} />
                <span>ภาพรวมทีมงาน (Dashboard)</span>
              </div>
              <ChevronRight size={16} className="opacity-80" />
            </button>
          )}
        </div>

        {/* Daily Pulse Widget */}
        <DailyPulseWidget
          todayLogs={data.todayLogs}
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />

        {/* Calendar Widget (Dynamic Height & Touch-Friendly) */}
        <CalendarWidget
          monthlyData={data.monthlyData}
          unreadDates={data.unreadDates}
          todayDate={todayStr}
          onLogSaved={loadInitialData}
        />
      </div>

      {/* Right Workspace (Search Bar, Categories, Responsive Grid) */}
      <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-7 2xl:col-span-7 lg:pl-6 lg:border-l lg:border-slate-200/80 dark:lg:border-slate-800 lg:h-full lg:overflow-y-auto custom-scrollbar pb-24 lg:pb-8">

        {/* Trainee Academy Welcome Banner */}
        {user.role === 'trainee' && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-5 xl:p-6 text-white shadow-xl space-y-4 border border-blue-500/30">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm shrink-0">
                <GraduationCap size={32} className="text-blue-200" />
              </div>
              <div>
                <h2 className="text-lg xl:text-xl font-bold">ยินดีต้อนรับสู่ MES Learning Hub!</h2>
                <p className="text-blue-100 text-xs xl:text-sm">หลักสูตรวิศวกรรมโรงงานและระบบการผลิตอัจฉริยะ (SNC Former B9)</p>
              </div>
            </div>
            <p className="text-xs xl:text-sm text-blue-100/90 leading-relaxed">
              บัญชีของคุณเปิดใช้งานในฐานะ <b>ผู้เข้าอบรม (Trainee)</b> เรียบร้อยแล้ว สามารถเข้าศึกษาบทเรียน ทำแบบฝึกหัด และเข้าสอบวัดระดับความรู้เพื่อบันทึกประวัติทักษะได้ทันที
            </p>
            <div className="pt-1 flex flex-wrap gap-2.5">
              <Link
                to="/learning"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-800 font-bold rounded-xl shadow-md hover:bg-blue-50 transition-all cursor-pointer text-xs xl:text-sm"
              >
                <span>เข้าสู่ศูนย์เรียนรู้ Learning Hub</span>
                <ChevronRight size={16} />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/20 text-white font-medium rounded-xl transition-all cursor-pointer border border-white/20 text-xs xl:text-sm"
              >
                <Users size={16} />
                <span>ดูโปรไฟล์และผลงาน</span>
              </Link>
            </div>
          </div>
        )}

        {/* Desktop Quick Control Bar (Instant Live Search + Category Filter Tabs) */}
        <div className="bg-white dark:bg-slate-800/95 p-3 xl:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs backdrop-blur-xs flex flex-col gap-3 sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาบริการ / โมดูลในระบบ (เช่น เคมี, User, BOM, รถรับส่ง, ช่าง, ผลิต...)"
                className="w-full pl-9 pr-9 py-2 rounded-xl text-xs xl:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title="ล้างข้อความค้นหา"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Status / Total Indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap pl-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{allAccessibleServices.length}</span> บริการที่ใช้งานได้
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                ⚡ {portedSpaServices.length} SPA
              </span>
            </div>
          </div>

          {/* Category Tabs (Desktop & Mobile Scrollable) */}
          {!isSearching && user.role !== 'trainee' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {categoryCounts.all}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('spa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'spa'
                    ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30'
                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <span>⚡ Toolbox SPA (พอร์ตแล้ว)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === 'spa' ? 'bg-white/25 text-white' : 'bg-blue-200/60 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {categoryCounts.spa}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('common')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'common'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>ส่วนกลาง</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.common}</span>
              </button>

              <button
                onClick={() => setSelectedCategory('production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'production'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>การผลิต</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.production}</span>
              </button>

              <button
                onClick={() => setSelectedCategory('warehouse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'warehouse'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>คลังสินค้า</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.warehouse}</span>
              </button>

              <button
                onClick={() => setSelectedCategory('quality')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'quality'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>คุณภาพ & PE</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.quality}</span>
              </button>

              <button
                onClick={() => setSelectedCategory('executive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'executive'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>บริหารจัดการ</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.executive}</span>
              </button>

              {categoryCounts.admin > 0 && (
                <button
                  onClick={() => setSelectedCategory('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === 'admin'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>จัดการระบบ</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded-full">{categoryCounts.admin}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* View Mode 1: Search Query Results */}
        {isSearching && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                ผลการค้นหาสำหรับ <span className="text-blue-600 dark:text-blue-400">"{searchQuery}"</span>
              </p>
              <span className="text-xs text-slate-400">พบ {searchResults.length} รายการ</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ไม่พบบริการที่ตรงกับคำค้นหา</p>
                <p className="text-xs text-slate-400 mt-1">ลองพิมพ์ด้วยคำอื่น เช่น "เคมี", "User", "BOM", "ขนส่ง", "สโตร์"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {searchResults.map(svc => <ServiceCard key={svc.title} {...svc} />)}
              </div>
            )}
          </section>
        )}

        {/* View Mode 2: Filtered by "⚡ Toolbox SPA (พอร์ตแล้ว)" */}
        {!isSearching && selectedCategory === 'spa' && (
          <section className="space-y-3">
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/60 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles size={16} /> โมดูลที่พอร์ตเข้าสู่ Toolbox SPA เรียบร้อยแล้ว ({portedSpaServices.length} ระบบ)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ระบบเหล่านี้ทำงานในรูปแบบ Single Page Application ทำงานเร็ว ลื่นไหล ปลอดภัยด้วย PBAC และเชื่อมโยงฐานข้อมูลโรงงานแบบเรียลไทม์
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 pl-3 cursor-pointer"
              >
                แสดงทั้งหมด &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {portedSpaServices.map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {/* View Mode 3: Specific Category Tab Selected */}
        {!isSearching && selectedCategory !== 'all' && selectedCategory !== 'spa' && (
          <section className="space-y-3">
            <SectionLabel
              label={
                selectedCategory === 'common' ? 'COMMON SERVICES' :
                selectedCategory === 'production' ? 'PRODUCTION' :
                selectedCategory === 'warehouse' ? 'WAREHOUSE & LOGISTICS' :
                selectedCategory === 'quality' ? 'QUALITY & MAINTENANCE' :
                selectedCategory === 'executive' ? 'EXECUTIVE & MANAGEMENT' :
                selectedCategory === 'admin' ? 'SYSTEM ADMINISTRATION' : 'SERVICES'
              }
              subLabel="โมดูลในหมวดหมู่นี้"
              borderColor={
                selectedCategory === 'common' ? 'bg-slate-400' :
                selectedCategory === 'production' ? 'bg-blue-500' :
                selectedCategory === 'warehouse' ? 'bg-orange-500' :
                selectedCategory === 'quality' ? 'bg-red-500' :
                selectedCategory === 'executive' ? 'bg-emerald-500' :
                selectedCategory === 'admin' ? 'bg-purple-500' : 'bg-slate-400'
              }
              textColor={
                selectedCategory === 'common' ? 'text-slate-600 dark:text-slate-400' :
                selectedCategory === 'production' ? 'text-blue-600 dark:text-blue-400' :
                selectedCategory === 'warehouse' ? 'text-orange-600 dark:text-orange-400' :
                selectedCategory === 'quality' ? 'text-red-600 dark:text-red-400' :
                selectedCategory === 'executive' ? 'text-emerald-600 dark:text-emerald-400' :
                selectedCategory === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600'
              }
              count={
                selectedCategory === 'common' ? accessibleCommon.length :
                selectedCategory === 'production' ? accessibleProduction.length :
                selectedCategory === 'warehouse' ? accessibleWarehouse.length :
                selectedCategory === 'quality' ? accessibleQuality.length :
                selectedCategory === 'executive' ? accessibleExecutive.length :
                selectedCategory === 'admin' ? accessibleAdmin.length : 0
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {(
                selectedCategory === 'common' ? accessibleCommon :
                selectedCategory === 'production' ? accessibleProduction :
                selectedCategory === 'warehouse' ? accessibleWarehouse :
                selectedCategory === 'quality' ? accessibleQuality :
                selectedCategory === 'executive' ? accessibleExecutive :
                selectedCategory === 'admin' ? accessibleAdmin : []
              ).map(svc => <ServiceCard key={svc.title} {...svc} />)}
            </div>
          </section>
        )}

        {/* View Mode 4: All Categories (High-Density Multi-Column Responsive Grid) */}
        {!isSearching && selectedCategory === 'all' && (
          <div className="space-y-5">

            {/* Common Services */}
            <section>
              <SectionLabel label="COMMON SERVICES" subLabel="บริการส่วนกลาง & บริหารทั่วไป" borderColor="bg-slate-400" textColor="text-slate-600 dark:text-slate-400" count={accessibleCommon.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {accessibleCommon.map(svc => <ServiceCard key={svc.title} {...svc} />)}
              </div>
            </section>

            {user.role !== 'trainee' && (
              <>
                {/* Production */}
                {accessibleProduction.length > 0 && (
                  <section>
                    <SectionLabel label="PRODUCTION" subLabel="ปฏิบัติการผลิตและหน้าไลน์" borderColor="bg-blue-500" textColor="text-blue-600 dark:text-blue-400" count={accessibleProduction.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleProduction.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}

                {/* Warehouse & Logistics */}
                {accessibleWarehouse.length > 0 && (
                  <section>
                    <SectionLabel label="WAREHOUSE & LOGISTICS" subLabel="คลังสินค้า การรับเข้า และการจัดส่ง" borderColor="bg-orange-500" textColor="text-orange-600 dark:text-orange-400" count={accessibleWarehouse.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleWarehouse.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}

                {/* Quality & Maintenance */}
                {accessibleQuality.length > 0 && (
                  <section>
                    <SectionLabel label="QUALITY & MAINTENANCE" subLabel="คุณภาพ การตรวจชิ้นส่วน และซ่อมบำรุง" borderColor="bg-red-500" textColor="text-red-600 dark:text-red-400" count={accessibleQuality.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleQuality.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}

                {/* Executive & Management */}
                {accessibleExecutive.length > 0 && (
                  <section>
                    <SectionLabel label="EXECUTIVE & MANAGEMENT" subLabel="บริหารจัดการ การเงิน และกำลังพล" borderColor="bg-emerald-500" textColor="text-emerald-700 dark:text-emerald-400" count={accessibleExecutive.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleExecutive.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}

                {/* System Administration */}
                {accessibleAdmin.length > 0 && (
                  <section>
                    <SectionLabel label="SYSTEM ADMINISTRATION" subLabel="จัดการผู้ใช้ สิทธิ์ และข้อมูลหลัก" borderColor="bg-purple-500" textColor="text-purple-600 dark:text-purple-400" count={accessibleAdmin.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleAdmin.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}

                {/* Sandbox / Testing */}
                {accessibleSandbox.length > 0 && (
                  <section>
                    <SectionLabel label="SANDBOX (TEST ENVIRONMENT)" subLabel="ระบบทดสอบ" borderColor="bg-amber-500" textColor="text-amber-600 dark:text-amber-400" count={accessibleSandbox.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {accessibleSandbox.map(svc => <ServiceCard key={svc.title} {...svc} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
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
