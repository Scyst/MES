import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'board', label: 'Deal Board', icon: '📋' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        🏢 EstateFlow CRM
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <a
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
