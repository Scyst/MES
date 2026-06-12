import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('./api/crm/get_dashboard_stats.php');
      const result = await response.json();
      if (result.status === 'success') {
        setStats(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('th-TH').format(value);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  }

  if (!stats) return null;

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'];

  const conversionRate = stats.kpis.totalDeals > 0 
    ? ((stats.kpis.wonDeals / stats.kpis.totalDeals) * 100).toFixed(1) 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingBottom: '20px' }}>
      <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Executive Dashboard</h2>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={kpiCardStyle}>
          <div style={kpiTitleStyle}>Total Pipeline Value</div>
          <div style={{ ...kpiValueStyle, color: 'var(--primary-color)' }}>{formatCurrency(stats.kpis.totalValue)}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiTitleStyle}>Active Deals</div>
          <div style={kpiValueStyle}>{formatNumber(stats.kpis.activeDeals)}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiTitleStyle}>Closed / Won</div>
          <div style={{ ...kpiValueStyle, color: '#10b981' }}>{formatNumber(stats.kpis.wonDeals)}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiTitleStyle}>Win Rate</div>
          <div style={kpiValueStyle}>{conversionRate}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Sales Pipeline Chart */}
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Sales Pipeline (Deals per Stage)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.pipeline} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="count" fill="var(--primary-color)" radius={[4, 4, 0, 0]}>
                {stats.pipeline.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Value Distribution Chart */}
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Value Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.pipeline.filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {stats.pipeline.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Deals Table */}
      <div style={chartCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={chartTitleStyle}>Recent Activity (Top 5)</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px 15px' }}>Deal Title</th>
                <th style={{ padding: '10px 15px' }}>Client</th>
                <th style={{ padding: '10px 15px' }}>Stage</th>
                <th style={{ padding: '10px 15px', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '10px 15px', textAlign: 'right' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentDeals.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No recent deals found.</td></tr>
              ) : (
                stats.recentDeals.map((deal) => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': {backgroundColor: '#f8fafc'} }}>
                    <td style={{ padding: '12px 15px', fontWeight: '500', color: 'var(--text-primary)' }}>{deal.title}</td>
                    <td style={{ padding: '12px 15px', color: 'var(--text-secondary)' }}>{deal.clientName}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500',
                        backgroundColor: deal.stage === 'post-sale' ? '#dcfce7' : '#f1f5f9',
                        color: deal.stage === 'post-sale' ? '#166534' : '#475569',
                        textTransform: 'capitalize'
                      }}>
                        {deal.stage}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      {formatCurrency(deal.value)}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Styles
const kpiCardStyle = {
  backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px',
  border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  display: 'flex', flexDirection: 'column', gap: '10px'
};
const kpiTitleStyle = { fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' };
const kpiValueStyle = { fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' };

const chartCardStyle = {
  backgroundColor: 'var(--surface-color)', padding: '20px', borderRadius: '12px',
  border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};
const chartTitleStyle = { margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' };

export default Dashboard;
