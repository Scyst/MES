import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Activity, ShoppingCart, Truck, FolderOpen, 
  ChevronDown, ChevronRight, Package, Smartphone, ListOrdered, 
  Printer, ScanLine, Wrench, Store, Box, Warehouse, Inbox, 
  Camera, Settings, Users, MonitorPlay, Zap, Heart, Search, FileText, FlaskConical, History
} from 'lucide-react';

const MENU_DATA = [
  {
    title: 'GENERAL',
    items: [
      { name: 'TOOLBOX OS (Home)', icon: Home, href: '/MES/page/dailyLog/dailyLogUI.php', external: true },
      { name: 'OEE Dashboard', icon: Activity, href: '/MES/page/OEE_Dashboard/OEE_Shopfloor.php', external: true },
      { name: 'Material Request', icon: ShoppingCart, href: '/MES/page/storeManagement/materialReq.php', external: true },
      { name: 'Forklift Booking', icon: Truck, href: '/MES/page/forklift/forkliftUI.php', external: true },
      { name: 'Document Center', icon: FolderOpen, href: '/MES/page/documentCenter/documentCenterUI.php', external: true },
    ]
  },
  {
    title: 'PRODUCTION',
    items: [
      { name: 'Production & Inventory', icon: Package, href: '/MES/page/production/productionUI.php', external: true },
      { name: 'Live Job Queue', icon: ListOrdered, href: '/MES/page/production/jobQueueUI.php', external: true },
      { name: 'Tag Printer (WIP/FG)', icon: Printer, href: '/MES/page/production/label_printer.php', external: true },
      { name: 'Scan Barcode', icon: ScanLine, href: '/MES/page/scanBarcode/scanBarcodeUI.php', external: true },
      { name: 'บันทึกเคมีสี (Paint Chem)', icon: FlaskConical, to: '/paint-chem' },
      { name: 'ประวัติเคมีสี', icon: History, to: '/paint-chem/history' },
    ]
  },
  {
    title: 'WAREHOUSE & LOGISTICS',
    items: [
      { name: 'Store Dashboard', icon: Store, href: '/MES/page/storeManagement/storeDashboard.php', external: true },
      { name: 'Inventory Stock', icon: Box, href: '/MES/page/storeManagement/inventoryDashboard.php', external: true },
      { name: 'Warehouse Operations', icon: Warehouse, href: '/MES/page/storeManagement/warehouse_operations.php', external: true },
      { name: 'RM Receiving & Tag', icon: Inbox, href: '/MES/page/storeManagement/rmReceiving.php', external: true },
    ]
  },
  {
    title: 'QUALITY & MT',
    items: [
      { name: 'iQMS (Quality)', icon: MonitorPlay, href: '/MES/page/QMS/qmsDashboard.php', external: true },
      { name: 'Accessories Inspection', icon: Camera, href: '/MES/page/AccessoriesInspection/accessoriesInspectionUI.php', external: true },
      { name: 'PE Enterprise', icon: Wrench, href: '/MES/page/PE/peDashboard.php', external: true },
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { name: 'Management Dashboard', icon: Activity, href: '/MES/page/management/managementDashboard.php', external: true },
      { name: 'Utility & Energy', icon: Zap, href: '/MES/page/management/utilityDashboard.php', external: true },
      { name: 'Mood Insight Report', icon: Heart, href: '/MES/page/dailyLog/moodReport.php', external: true },
    ]
  },
  {
    title: 'SYSTEM ADMIN',
    items: [
      { name: 'System Settings', icon: Settings, href: '/MES/page/systemSettings/systemSettings.php', external: true },
      { name: 'User Manager', icon: Users, href: '/MES/page/userManage/userManageUI.php', external: true },
    ]
  }
];

export default function DesktopSidebar() {
  const [expanded, setExpanded] = useState({ 'GENERAL': true, 'PRODUCTION': true });
  const [search, setSearch] = useState('');
  const location = useLocation();

  const toggleSection = (title) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0 z-20 transition-all duration-300">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="ค้นหาเมนู..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
        {MENU_DATA.map((section, sIdx) => {
          const filteredItems = section.items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
          if (filteredItems.length === 0 && search) return null;

          const isExpanded = expanded[section.title] || search !== '';

          return (
            <div key={sIdx} className="mb-1">
              <button 
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors uppercase tracking-wider"
              >
                <span>{section.title}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {isExpanded && (
                <div className="mt-1 space-y-0.5 px-2">
                  {filteredItems.map((item, iIdx) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    
                    if (item.external) {
                      return (
                        <a 
                          key={iIdx} 
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg transition-colors group"
                        >
                          <Icon size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="truncate">{item.name}</span>
                        </a>
                      );
                    }
                    
                    return (
                      <Link 
                        key={iIdx} 
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        <Icon size={16} className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} transition-colors`} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
