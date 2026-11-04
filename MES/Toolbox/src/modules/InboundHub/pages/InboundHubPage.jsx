import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Container, Briefcase, Warehouse, Globe, Network, RotateCcw, ExternalLink
} from 'lucide-react';
import { InboundHubProvider, useInboundHub } from '../context/InboundHubContext';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import ScmWorkbenchView from '../components/ScmWorkbenchView';
import StoreReceivingView from '../components/StoreReceivingView';
import PartnerPortalView from '../components/PartnerPortalView';
import EcosystemRoadmapView from '../components/EcosystemRoadmapView';

// NOTE: Intentionally >50 lines — Master Inbound Hub Page with URL-Synced Industrial Tabs & Multi-Role Context
function InboundHubContent() {
  const { resetDemoData, containers, invoices } = useInboundHub();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const activeTab = searchParams.get('tab') || 'scm';
  const [isProxyUpload, setIsProxyUpload] = useState(false);

  const arrivedCount = containers.filter((c) => c.status === 'ARRIVED_GATE').length;

  const handleSelectTab = (tabKey, proxy = false) => {
    setIsProxyUpload(proxy);
    setSearchParams({ tab: tabKey });
  };

  const handleResetDemo = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการรีเซ็ตข้อมูลสาธิต',
      message: 'คุณต้องการรีเซ็ตข้อมูลตู้คอนเทนเนอร์, อินวอยซ์, และตัวแปรราคากลับเป็นค่าเริ่มต้นสำหรับสาธิตใช่หรือไม่?',
      confirmText: 'รีเซ็ตข้อมูล',
      cancelText: 'ยกเลิก',
      danger: true,
    });

    if (confirmed) {
      resetDemoData();
      toast.success('รีเซ็ตข้อมูลระบบสาธิต Inbound Hub เรียบร้อยแล้ว');
    }
  };

  return (
    <div className="mes-page-container">
      {/* ส่วนหัวมาตรฐาน Unified Industrial Design System */}
      <div className="mes-page-header">
        <div>
          <h1 className="mes-page-title">
            <Container className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Inbound Shipment & Consolidated Invoice Hub</span>
            <span className="mes-badge bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 ml-1">
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
            rel="noopener noreferrer"
            className="mes-btn-secondary min-h-[36px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>เปิดหน้าจอแยกเฉพาะลูกค้า (Standalone Portal)</span>
          </Link>
          <button
            type="button"
            onClick={handleResetDemo}
            className="mes-btn-secondary min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตข้อมูลสาธิต</span>
          </button>
        </div>
      </div>

      {/* แถบสลับบทบาทผู้ใช้งานมาตรฐาน MES (Underline Tab Navigation) */}
      <div className="mes-tab-nav">
        <button
          type="button"
          onClick={() => handleSelectTab('scm', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'scm' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>1. มุมมองฝ่าย SCM & ผู้บริหาร</span>
          <span className="mes-badge bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 ml-1">
            {invoices.length} บิล
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('store', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'store' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Warehouse className="w-4 h-4" />
          <span>2. มุมมองฝ่าย Store / คลังสินค้า</span>
          {arrivedCount > 0 && (
            <span className="mes-badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ml-1">
              รอรับ {arrivedCount} ตู้
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('partner', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'partner' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Globe className="w-4 h-4" />
          <span>3. มุมมองฝั่งลูกค้า (Zero-Entry Portal)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('roadmap', false)}
          className={`mes-tab-btn cursor-pointer ${activeTab === 'roadmap' ? 'mes-tab-btn-active' : 'mes-tab-btn-inactive'}`}
        >
          <Network className="w-4 h-4" />
          <span>4. ผังเชื่อมโยงระบบ MES & แผนพัฒนา</span>
        </button>
      </div>

      {/* พื้นที่แสดงผลตามบทบาทที่เลือก (Cross-Role Single Source of Truth) */}
      {activeTab === 'scm' && (
        <ScmWorkbenchView onSwitchToProxyUpload={() => handleSelectTab('partner', true)} />
      )}
      {activeTab === 'store' && <StoreReceivingView />}
      {activeTab === 'partner' && <PartnerPortalView isProxyMode={isProxyUpload} />}
      {activeTab === 'roadmap' && <EcosystemRoadmapView />}
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
