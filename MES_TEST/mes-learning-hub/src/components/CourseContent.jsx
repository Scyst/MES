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

export default function CourseContent({ courseId, moduleContent }) {
  // Mapping content IDs to actual React components containing the text/layout
  const contentMap = {
    'lean-principles': <LeanPrinciples />,
    'lean-8-wastes': <LeanWastes />,
    'lean-vsm-oEE': <LeanVsmOee />,
    'lean-industry-4': <LeanIndustry4 />,
    'cogs-management': <CogsManagement />,
    'kpi-capdo': <KpiCapdo />,
    'digital-gemba': <DigitalGemba />,
    'enterprise-ai': <EnterpriseAi />,
    'react-arch-overview': <ReactArchOverview />,
    'react-arch-folders': <ReactArchFolders />,
    'react-arch-tech': <ReactArchTech />,
    'sys-map': <SysMap />,
    'sys-security': <SysSecurity />,
    'sys-auth': <SysAuth />,
    'sys-integration': <SysIntegration />,
    'team-workflow': <TeamWorkflow />
  };

  const ContentComponent = contentMap[moduleContent];

  if (!ContentComponent) {
    return (
      <div className="content-placeholder">
        <h3>Content is being updated...</h3>
        <p>This module ({moduleContent}) is not fully ready yet. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="course-content-wrapper">
      {ContentComponent}
    </div>
  );
}
