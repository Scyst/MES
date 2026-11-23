import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Layers,
  MapPin,
  Clock,
  Coins,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import ItemMasterTab from '../components/ItemMasterTab';
import BomManagerTab from '../components/BomManagerTab';
import LocationsTab from '../components/LocationsTab';
import LineSchedulesTab from '../components/LineSchedulesTab';
import SapValuationTab from '../components/SapValuationTab';

const HolidayCalendarTab = lazy(() => import('../../Manpower/components/HolidayCalendarTab'));

const TABS = [
  { id: 'items', label: 'Item Master', icon: Package },
  { id: 'bom', label: 'BOM Manager', icon: Layers },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'schedules', label: 'Line Schedules', icon: Clock },
  { id: 'valuation', label: 'SAP Valuation', icon: Coins },
  { id: 'holidays', label: 'ปฏิทินวันหยุด & OT', icon: CalendarDays },
];

const TAB_BUTTON_BASE = 'mes-tab-btn';
const tabClasses = (isActive) =>
  `${TAB_BUTTON_BASE} ${isActive ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`;

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'items';
  const role = String(user?.role || '').toLowerCase();
  const canEditHolidays = ['creator', 'admin', 'manager', 'supervisor'].includes(role);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [lines, setLines] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

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
    <div className="mes-page-container">
      {/* Header section */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <Settings className="text-blue-600 w-6 h-6" /> System Settings
          </h1>
          <p className="mes-page-subtitle">
            ตั้งค่าระบบและจัดการข้อมูลหลัก (Item Master, BOM, Locations, Schedules, SAP, วันหยุดโรงงาน)
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mes-tab-nav">
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
        {currentTab === 'holidays' && (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">กำลังโหลดปฏิทินวันหยุด...</div>}>
            <HolidayCalendarTab canEdit={canEditHolidays} isOnline={isOnline} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
