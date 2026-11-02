import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Layers,
  MapPin,
  Clock,
  Coins,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import ItemMasterTab from '../components/ItemMasterTab';
import BomManagerTab from '../components/BomManagerTab';
import LocationsTab from '../components/LocationsTab';
import LineSchedulesTab from '../components/LineSchedulesTab';
import SapValuationTab from '../components/SapValuationTab';

const TABS = [
  { id: 'items', label: 'Item Master', icon: Package, desc: 'ฐานข้อมูลสินค้าและต้นทุนมาตรฐาน' },
  { id: 'bom', label: 'BOM Manager', icon: Layers, desc: 'โครงสร้างและสูตรการผลิตสินค้า' },
  { id: 'locations', label: 'Locations', icon: MapPin, desc: 'ผังและตำแหน่งจัดเก็บสินค้าในคลัง' },
  { id: 'schedules', label: 'Line Schedules', icon: Clock, desc: 'ตารางกะและเวลาทำงานของไลน์ผลิต' },
  { id: 'valuation', label: 'SAP Valuation', icon: Coins, desc: 'เปรียบเทียบมูลค่าสินค้า MES กับ SAP ERP' },
];

export default function SystemSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'items';

  const [lines, setLines] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    // Load common lookups once for all tabs
    systemSettingsApi.getLines().then((res) => {
      if (res && res.success) setLines(res.data || []);
    });
    systemSettingsApi.getModels().then((res) => {
      if (res && res.success) setModels(res.data || []);
    });
  }, []);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>System Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 dark:text-blue-400">Master Data & Settings</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  ตั้งค่าระบบและข้อมูลหลัก (System Settings)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  จัดการ Item Master, BOM สูตรผลิต, ตำแหน่งจัดเก็บ, ตารางกะ และการเชื่อมโยงข้อมูล SAP ERP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'items' && <ItemMasterTab lines={lines} models={models} />}
        {currentTab === 'bom' && <BomManagerTab lines={lines} models={models} />}
        {currentTab === 'locations' && <LocationsTab lines={lines} />}
        {currentTab === 'schedules' && <LineSchedulesTab lines={lines} />}
        {currentTab === 'valuation' && <SapValuationTab />}
      </div>
    </div>
  );
}

