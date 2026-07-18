import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {

  const getTabStyle = (isActive) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#e0f7fa' : 'transparent',
    color: isActive ? '#00796b' : '#333',
    fontWeight: isActive ? 'bold' : 'normal',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        🏢 EstateFlow CRM
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div 
          style={getTabStyle(activeTab === 'dashboard')}
          onClick={() => setActiveTab('dashboard')}
        >
          <span style={{ fontSize: '1.2rem' }}>📊</span> Dashboard
        </div>
        <div 
          style={getTabStyle(activeTab === 'board')}
          onClick={() => setActiveTab('board')}
        >
          <span style={{ fontSize: '1.2rem' }}>📋</span> Deal Board
        </div>
        <div 
          style={getTabStyle(activeTab === 'clients')}
          onClick={() => setActiveTab('clients')}
        >
          <span style={{ fontSize: '1.2rem' }}>👥</span> Clients
        </div>
        <div 
          style={getTabStyle(activeTab === 'documents')}
          onClick={() => setActiveTab('documents')}
        >
          <span style={{ fontSize: '1.2rem' }}>📁</span> Documents
        </div>
        <div 
          style={getTabStyle(activeTab === 'reports')}
          onClick={() => setActiveTab('reports')}
        >
          <span style={{ fontSize: '1.2rem' }}>📈</span> Reports
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
