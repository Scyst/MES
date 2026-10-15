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
  Iso9001Lesson, 
  Iso14001Lesson, 
  Iso45001Lesson, 
  Iso17025Lesson 
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

    // ISO Systems
    'iso-9001-mastery': <Iso9001Lesson />,
    'iso-14001-mastery': <Iso14001Lesson />,
    'iso-45001-mastery': <Iso45001Lesson />,
    'iso-17025-mastery': <Iso17025Lesson />,

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
