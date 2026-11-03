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

const TAB_BUTTON_BASE = 'mes-tab-btn';
const tabClasses = (isActive) =>
  `${TAB_BUTTON_BASE} ${isActive ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`;

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
    <div className="mes-page-container">
      {/* Header section */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <Settings className="text-blue-600 w-6 h-6" /> System Settings
          </h1>
          <p className="mes-page-subtitle">
            ตั้งค่าระบบและจัดการข้อมูลหลัก (Item Master, BOM, Locations, Schedules, SAP)
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
      </div>
    </div>
  );
}
