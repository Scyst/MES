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

// Import 7 Official Industry 4.0 Curriculum Lessons (99 Industrial Solutions / SNC Former)
import {
  EnterpriseAppMod1,
  EnterpriseAppMod2,
  EnterpriseAppMod3,
  EnterpriseAppMod4,
  EnterpriseAppMod5
} from '../data/content/EnterpriseAppLessons';

import {
  MachineVisionMod1,
  MachineVisionMod2,
  MachineVisionMod3,
  MachineVisionMod4,
  MachineVisionMod5,
  MachineVisionMod6,
  MachineVisionMod7,
  MachineVisionMod8
} from '../data/content/MachineVisionLessons';

import {
  CadCamMod1,
  CadCamMod2,
  CadCamMod3,
  CadCamMod4,
  CadCamMod5,
  CadCamMod6
} from '../data/content/CadCamLessons';

import {
  CncMod1,
  CncMod2,
  CncMod3,
  CncMod4,
  CncMod5,
  CncMod6
} from '../data/content/CncLessons';

import {
  EvConversionMod1,
  EvConversionMod2,
  EvConversionMod3,
  EvConversionMod4,
  EvConversionMod5
} from '../data/content/EvConversionLessons';

import {
  PlcMod1,
  PlcMod2,
  PlcMod3,
  PlcMod4,
  PlcMod5,
  PlcMod6
} from '../data/content/PlcLessons';

import {
  RobotMod1,
  RobotMod2,
  RobotMod3,
  RobotMod4,
  RobotMod5,
  RobotMod6
} from '../data/content/RobotLessons';

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
    'live-defect-pareto': <LiveDefectParetoLesson />,

    // 1. Enterprise Application Design, Development & Integration
    'enterprise-app-landscape': <EnterpriseAppMod1 />,
    'enterprise-app-uxui': <EnterpriseAppMod2 />,
    'enterprise-app-webdev': <EnterpriseAppMod3 />,
    'enterprise-app-integration': <EnterpriseAppMod4 />,
    'enterprise-app-qa-security': <EnterpriseAppMod5 />,

    // 2. Basic Machine Vision and Sensor Inspection Course for Smart Factories (8 Lessons + Legacy Aliases)
    'vision-m1-basics': <MachineVisionMod1 />,
    'vision-m2-shutter': <MachineVisionMod2 />,
    'vision-m3-lighting': <MachineVisionMod3 />,
    'vision-m4-optics': <MachineVisionMod4 />,
    'vision-m5-opencv': <MachineVisionMod5 />,
    'vision-m6-ai-yolo': <MachineVisionMod6 />,
    'vision-m7-threshold': <MachineVisionMod7 />,
    'vision-m8-workshops-mes': <MachineVisionMod8 />,
    'vision-basics-structure': <MachineVisionMod1 />,
    'vision-hardware-optical': <MachineVisionMod3 />,
    'vision-logic-ai': <MachineVisionMod5 />,
    'vision-conditions-testing': <MachineVisionMod7 />,

    // 3. CAD-CAM for Mold and Die Design and Manufacturing
    'cadcam-mold-process': <CadCamMod1 />,
    'cadcam-mold-design': <CadCamMod2 />,
    'cadcam-toolpath-strategy': <CadCamMod3 />,
    'cadcam-simulation-collision': <CadCamMod4 />,
    'cadcam-gcode-cnc': <CadCamMod5 />,
    'cadcam-troubleshooting': <CadCamMod6 />,

    // 4. CNC Training for Engineers and Technicians in the Industry 4.0
    'cnc-systems-structure': <CncMod1 />,
    'cnc-drawings-coordinates': <CncMod2 />,
    'cnc-setup-tooling': <CncMod3 />,
    'cnc-programming-codes': <CncMod4 />,
    'cnc-cutting-conditions': <CncMod5 />,
    'cnc-safety-operations': <CncMod6 />,

    // 5. EV Conversion Architecture and Battery System Design
    'ev-electricity-instruments': <EvConversionMod1 />,
    'ev-hv-safety-emergency': <EvConversionMod2 />,
    'ev-architecture-powertrain': <EvConversionMod3 />,
    'ev-battery-chemistry': <EvConversionMod4 />,
    'ev-bms-pack-design': <EvConversionMod5 />,

    // 6. PLC Programming for Industrial Automation
    'plc-electrical-io': <PlcMod1 />,
    'plc-scan-cycle': <PlcMod2 />,
    'plc-ladder-instructions': <PlcMod3 />,
    'plc-field-devices': <PlcMod4 />,
    'plc-sorting-system': <PlcMod5 />,
    'plc-troubleshooting': <PlcMod6 />,

    // 7. Integrated Robotics Programming, Troubleshooting & Intelligent Sensing
    'robot-basics-industry4': <RobotMod1 />,
    'robot-kinematics-coordinates': <RobotMod2 />,
    'robot-io-signals': <RobotMod3 />,
    'robot-safety-standards': <RobotMod4 />,
    'robot-teach-pendant': <RobotMod5 />,
    'robot-workshop-applications': <RobotMod6 />
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
