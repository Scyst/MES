import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import NewDealModal from './components/NewDealModal';

function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDealCreated = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger re-fetch
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'board':
        return <KanbanBoard refreshTrigger={refreshTrigger} onDealUpdated={handleDealCreated} />;
      default:
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <h2>Module "{activeTab}" is under development.</h2>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Header onOpenModal={() => setIsModalOpen(true)} />
        <main className="page-content">
          {renderContent()}
        </main>
      </div>
      
      <NewDealModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onDealCreated={handleDealCreated} 
      />
    </div>
  );
}

export default App;
