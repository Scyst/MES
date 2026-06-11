import React from 'react';

const Dashboard = () => {
  return (
    <div className="animate-fade-in">
      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon icon-blue">📋</div>
          <div className="summary-info">
            <h3>Total Leads</h3>
            <div className="value">45</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon icon-yellow">⏳</div>
          <div className="summary-info">
            <h3>Waiting for Transfer</h3>
            <div className="value">12</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon icon-green">✅</div>
          <div className="summary-info">
            <h3>Closed Deals</h3>
            <div className="value">28</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon icon-purple">💬</div>
          <div className="summary-info">
            <h3>Active Support</h3>
            <div className="value">7</div>
          </div>
        </div>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '15px' }}>Recent Activity</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }}></div>
            <strong>New Lead:</strong> Toyota Tsusho interested in Zone C (50 Rai) - <em>2 hours ago</em>
          </li>
          <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></div>
            <strong>Document Updated:</strong> EIA approval attached for Siam Kubota - <em>5 hours ago</em>
          </li>
          <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
            <strong>Deal Closed:</strong> Sony Electronics transferred Phase 4 - <em>1 day ago</em>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
