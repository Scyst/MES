import React, { useState, useEffect } from 'react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', lineId: '', address: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('./api/crm/get_clients.php');
      const result = await response.json();
      if (result.status === 'success') {
        setClients(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone || '',
        email: client.email || '',
        lineId: client.lineId || '',
        address: client.address || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', lineId: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const url = editingClient ? './api/crm/update_client.php' : './api/crm/create_client.php';
    const payload = editingClient ? { ...formData, id: editingClient.id } : formData;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        fetchClients();
        handleCloseModal();
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (client) => {
    if (client.totalDeals > 0) {
      alert(`Cannot delete client "${client.name}" because they have ${client.totalDeals} deals.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      try {
        const response = await fetch('./api/crm/delete_client.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: client.id })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
          fetchClients();
        } else {
          alert(result.message);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading clients...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Client Database</h2>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add New Client
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px' }}>{error}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '15px' }}>Name</th>
              <th style={{ padding: '15px' }}>Contact Info</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Active Deals</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Total Deals</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No clients found. Add one to get started.</td></tr>
            ) : (
              clients.map(client => (
                <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', ':hover': {backgroundColor: '#f8fafc'} }}>
                  <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {client.name}
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {client.phone && <div>📞 {client.phone}</div>}
                    {client.email && <div>✉️ {client.email}</div>}
                    {client.lineId && <div>💬 {client.lineId}</div>}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: client.activeDeals > 0 ? '#dbeafe' : '#f1f5f9', color: client.activeDeals > 0 ? '#1d4ed8' : '#64748b', fontWeight: '600' }}>
                      {client.activeDeals}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {client.totalDeals}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <button onClick={() => handleOpenModal(client)} style={actionBtnStyle}>✏️ Edit</button>
                    <button onClick={() => handleDelete(client)} style={{ ...actionBtnStyle, color: '#ef4444' }}>🗑️ Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={overlayStyle}>
          <div className="animate-fade-in" style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={handleCloseModal} style={closeBtnStyle}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  style={inputStyle} placeholder="John Doe"
                />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Phone Number</label>
                  <input 
                    type="text" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    style={inputStyle} placeholder="081-xxx-xxxx"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Line ID</label>
                  <input 
                    type="text" 
                    value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})}
                    style={inputStyle} placeholder="@lineid"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  style={inputStyle} placeholder="john@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <textarea 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="123 Street Name..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={handleCloseModal} className="btn" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!formData.name}>
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const actionBtnStyle = { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px 10px', fontSize: '0.9rem', fontWeight: '500' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' };

export default Clients;
