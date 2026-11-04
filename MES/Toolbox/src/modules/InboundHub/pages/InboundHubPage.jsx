import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Briefcase, Warehouse, Globe, Network, RotateCcw, ExternalLink
} from 'lucide-react';
import { InboundHubProvider, useInboundHub } from '../context/InboundHubContext';
import ScmWorkbenchView from '../components/ScmWorkbenchView';
import StoreReceivingView from '../components/StoreReceivingView';
import PartnerPortalView from '../components/PartnerPortalView';
import EcosystemRoadmapView from '../components/EcosystemRoadmapView';

function InboundHubContent() {
  const { resetDemoData, containers, invoices } = useInboundHub();
  const [activeTab, setActiveTab] = useState('SCM');
  const [isProxyUpload, setIsProxyUpload] = useState(false);

  const arrivedCount = containers.filter((c) => c.status === 'ARRIVED_GATE').length;

  const handleSelectTab = (tabKey, proxy = false) => {
    setIsProxyUpload(proxy);
    setActiveTab(tabKey);
  };

  return (
    <div className="mes-page-container">
      {/* ส่วนหัวมาตรฐาน Unified Industrial Design System */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <Container className="w-6 h-6 text-blue-600" />
            Inbound Shipment & Consolidated Invoice Hub
            <span className="mes-badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ml-1">
              Interactive Prototype
            </span>
          </h1>
          <p className="mes-page-subtitle">
            ศูนย์กลางเชื่อมโยงเอกสารและข้อมูลตู้สินค้าระหว่าง ลูกค้า (Partner Portal) — ฝ่ายจัดซื้อ (SCM) — ฝ่ายคลังสินค้า (Store)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/partner-portal"
            target="_blank"
            className="mes-btn-secondary min-h-[34px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิดหน้าจอแยกเฉพาะลูกค้า (Standalone Portal)
          </Link>
          <button
            type="button"
            onClick={resetDemoData}
            className="mes-btn-secondary min-h-[34px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ตข้อมูลสาธิต
          </button>
        </div>
      </div>

      {/* แถบสลับบทบาทผู้ใช้งาน (Role Perspective Switcher สำหรับการนำเสนอผู้บริหาร) */}
      <div className="mes-tab-nav">
        <button
          type="button"
          onClick={() => handleSelectTab('SCM', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'SCM' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Briefcase className="w-4 h-4" />
          1. มุมมองฝ่าย SCM & ผู้บริหาร ({invoices.length} บิล)
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('STORE', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'STORE' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Warehouse className="w-4 h-4" />
          2. มุมมองฝ่าย Store / คลังสินค้า (รอรับ {arrivedCount} ตู้)
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('PARTNER', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'PARTNER' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Globe className="w-4 h-4" />
          3. มุมมองฝั่งลูกค้า (Zero-Entry Portal)
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('ROADMAP', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'ROADMAP' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Network className="w-4 h-4" />
          4. ผังเชื่อมโยงระบบ MES & แผนพัฒนา
        </button>
      </div>

      {/* พื้นที่แสดงผลตามบทบาทที่เลือก (ใช้ State ก้อนเดียวกัน ทดสอบการทำงานข้ามแผนกได้ทันที) */}
      {activeTab === 'SCM' && (
        <ScmWorkbenchView onSwitchToProxyUpload={() => handleSelectTab('PARTNER', true)} />
      )}
      {activeTab === 'STORE' && <StoreReceivingView />}
      {activeTab === 'PARTNER' && <PartnerPortalView isProxyMode={isProxyUpload} />}
      {activeTab === 'ROADMAP' && <EcosystemRoadmapView />}
    </div>
  );
}

export default function InboundHubPage() {
  return (
    <InboundHubProvider>
      <InboundHubContent />
    </InboundHubProvider>
  );
}
