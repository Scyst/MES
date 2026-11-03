import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Layers,
  MapPin,
  Clock,
  Coins,
  Settings,
} from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import ItemMasterTab from '../components/ItemMasterTab';
import BomManagerTab from '../components/BomManagerTab';
import LocationsTab from '../components/LocationsTab';
import LineSchedulesTab from '../components/LineSchedulesTab';
import SapValuationTab from '../components/SapValuationTab';

const TABS = [
  { id: 'items', label: 'Item Master', icon: Package },
  { id: 'bom', label: 'BOM Manager', icon: Layers },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'schedules', label: 'Line Schedules', icon: Clock },
  { id: 'valuation', label: 'SAP Valuation', icon: Coins },
];

const TAB_BUTTON_BASE = 'pb-3 flex items-center gap-2 font-medium transition-colors min-h-[44px] text-sm whitespace-nowrap';
const tabClasses = (isActive) =>
  `${TAB_BUTTON_BASE} ${
    isActive
      ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-400 font-semibold'
      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
  }`;

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
      {/* Header section (Matches User Management style) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Settings className="text-blue-600" /> System Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ตั้งค่าระบบและจัดการข้อมูลหลัก (Item Master, BOM, Locations, Schedules, SAP)
          </p>
        </div>
      </div>

      {/* Tabs Navigation (Matches User Management border-b underline style) */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={tabClasses(isActive)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
