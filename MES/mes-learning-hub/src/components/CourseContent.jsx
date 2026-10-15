import React from 'react';
import LeanPrinciples from '../data/content/LeanPrinciples';
import LeanWastes from '../data/content/LeanWastes';
import LeanVsmOee from '../data/content/LeanVsmOee';
import LeanIndustry4 from '../data/content/LeanIndustry4';
import CogsManagement from '../data/content/CogsManagement';
import KpiCapdo from '../data/content/KpiCapdo';
import DigitalGemba from '../data/content/DigitalGemba';
import EnterpriseAi from '../data/content/EnterpriseAi';
import ReactArchOverview from '../data/content/ReactArchOverview';
import ReactArchFolders from '../data/content/ReactArchFolders';
import ReactArchTech from '../data/content/ReactArchTech';
import SysMap from '../data/content/SysMap';
import SysSecurity from '../data/content/SysSecurity';
import SysAuth from '../data/content/SysAuth';
import SysIntegration from '../data/content/SysIntegration';
import TeamWorkflow from '../data/content/TeamWorkflow';

// Import New Masterclass Lessons
import { 
  PpapPfmeaLesson, 
  PpapQPointsLesson, 
  PpapTraceabilityLesson, 
  PpapInspectionLesson, 
  PpapMaintenanceLesson, 
  PpapPackagingLesson 
} from '../data/content/PpapLessons';

import { 
  Customer56DocsLesson, 
  CustomerNpiEcnLesson, 
  CustomerSupplierIqcLesson, 
  CustomerCapaClaimsLesson, 
  CustomerEsgHumanRightsLesson, 
  CustomerGmpRecallLesson 
} from '../data/content/CustomerAuditLessons';

import { 
  LiveAuditFindingsLesson, 
  LiveNcrCaseStudyLesson, 
  LiveWalmartFccaLesson, 
  LiveConflictMineralsLesson, 
  LiveEcoFactoryLesson, 
  LiveDefectParetoLesson 
} from '../data/content/LiveAuditLessons';

import { 
  Iso9001HlsLesson,
  Iso9001RiskLesson,
  Iso9001OperationsLesson,
  Iso9001AuditCapaLesson,
  Iso14001ContextLegalLesson,
  Iso14001AspectsLifecycleLesson,
  Iso14001WasteChemicalLesson,
  Iso14001EmergencyAuditLesson,
  Iso45001LeadershipWorkerLesson,
  Iso45001HazardHierarchyLesson,
  Iso45001OperationsLotoLesson,
  Iso45001EmergencyInvestigationLesson,
  Iso17025GeneralStructureLesson,
  Iso17025ResourcesEnvironmentLesson,
  Iso17025MethodsUncertaintyLesson,
  Iso17025TraceabilityQaLesson
} from '../data/content/IsoMasteryLessons';

export default function CourseContent({ courseId, moduleContent }) {
  // Mapping content IDs to actual React components containing the text/layout
  const contentMap = {
    // Lean & Leadership
    'lean-principles': <LeanPrinciples />,
    'lean-8-wastes': <LeanWastes />,
    'lean-vsm-oEE': <LeanVsmOee />,
    'lean-industry-4': <LeanIndustry4 />,
    'cogs-management': <CogsManagement />,
    'kpi-capdo': <KpiCapdo />,
    'digital-gemba': <DigitalGemba />,
    'enterprise-ai': <EnterpriseAi />,

    // Software & Architecture
    'react-arch-overview': <ReactArchOverview />,
    'react-arch-folders': <ReactArchFolders />,
    'react-arch-tech': <ReactArchTech />,
    'sys-map': <SysMap />,
    'sys-security': <SysSecurity />,
    'sys-auth': <SysAuth />,
    'sys-integration': <SysIntegration />,
    'team-workflow': <TeamWorkflow />,

    // ISO 9001:2015
    'iso-9001-hls': <Iso9001HlsLesson />,
    'iso-9001-risk': <Iso9001RiskLesson />,
    'iso-9001-operations': <Iso9001OperationsLesson />,
    'iso-9001-audit': <Iso9001AuditCapaLesson />,
    'iso-9001-mastery': <Iso9001HlsLesson />, // Fallback alias

    // ISO 14001:2015
    'iso-14001-context': <Iso14001ContextLegalLesson />,
    'iso-14001-aspects': <Iso14001AspectsLifecycleLesson />,
    'iso-14001-waste': <Iso14001WasteChemicalLesson />,
    'iso-14001-emergency': <Iso14001EmergencyAuditLesson />,
    'iso-14001-mastery': <Iso14001ContextLegalLesson />, // Fallback alias

    // ISO 45001:2018
    'iso-45001-leadership': <Iso45001LeadershipWorkerLesson />,
    'iso-45001-hazard': <Iso45001HazardHierarchyLesson />,
    'iso-45001-operations': <Iso45001OperationsLotoLesson />,
    'iso-45001-emergency': <Iso45001EmergencyInvestigationLesson />,
    'iso-45001-mastery': <Iso45001LeadershipWorkerLesson />, // Fallback alias

    // ISO/IEC 17025:2017
    'iso-17025-general': <Iso17025GeneralStructureLesson />,
    'iso-17025-resources': <Iso17025ResourcesEnvironmentLesson />,
    'iso-17025-methods': <Iso17025MethodsUncertaintyLesson />,
    'iso-17025-traceability': <Iso17025TraceabilityQaLesson />,
    'iso-17025-mastery': <Iso17025GeneralStructureLesson />, // Fallback alias

    // PPAP & Advanced Manufacturing Quality
    'ppap-pfmea': <PpapPfmeaLesson />,
    'ppap-qpoints': <PpapQPointsLesson />,
    'ppap-traceability': <PpapTraceabilityLesson />,
    'ppap-inspection': <PpapInspectionLesson />,
    'ppap-maintenance': <PpapMaintenanceLesson />,
    'ppap-packaging': <PpapPackagingLesson />,

    // Customer Audits & ESG
    'customer-56-docs': <Customer56DocsLesson />,
    'customer-npi-ecn': <CustomerNpiEcnLesson />,
    'customer-supplier-iqc': <CustomerSupplierIqcLesson />,
    'customer-capa-claims': <CustomerCapaClaimsLesson />,
    'customer-esg-human-rights': <CustomerEsgHumanRightsLesson />,
    'customer-gmp-recall': <CustomerGmpRecallLesson />,

    // Live Operational QA & Audit Defense
    'live-audit-findings': <LiveAuditFindingsLesson />,
    'live-ncr-case': <LiveNcrCaseStudyLesson />,
    'live-walmart-fcca': <LiveWalmartFccaLesson />,
    'live-conflict-minerals': <LiveConflictMineralsLesson />,
    'live-eco-factory': <LiveEcoFactoryLesson />,
    'live-defect-pareto': <LiveDefectParetoLesson />
  };

  const ContentComponent = contentMap[moduleContent];

  if (!ContentComponent) {
    return (
      <div className="content-placeholder p-8 bg-slate-800 rounded-xl border border-slate-700 text-center">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Content is being updated...</h3>
        <p className="text-slate-400">This module ({moduleContent}) is being finalized. Please check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="course-content-wrapper">
      {ContentComponent}
    </div>
  );
}
