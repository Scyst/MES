import { useState, useEffect } from 'react';
import hubData from '../data/hubContent.json';
import { legacyHtml } from '../data/legacyHtml';

export default function KnowledgeHub() {
  const [activeHub, setActiveHub] = useState('hoverview');
  
  const knowledgeHubData = hubData.tabs.find(t => t.id === 'knowledge-hub');
  
  useEffect(() => {
    // When activeHub changes, we manually toggle the .active class on the injected sections
    const sections = document.querySelectorAll('.hub-section');
    sections.forEach(s => {
      if (s.id === activeHub) {
        s.classList.add('active');
        // If it's the quiz, we might need to call initQuiz() from legacy logic
        if (activeHub === 'hquiz' && typeof window.initQuiz === 'function') {
           window.initQuiz();
        }
      } else {
        s.classList.remove('active');
      }
    });
  }, [activeHub]);
  
  return (
    <div className="tab-panel active">
      <div className="hub-header">
        <div className="hub-badge">MES x SAP Knowledge Hub</div>
        <h2>Web Architecture &amp; Enterprise Integration</h2>
        <p>สื่อการสอนเชิงลึกครอบคลุมหมวดหมู่ — System Architecture, Security, Enterprise Modules, Integration Technologies</p>
      </div>

      {/* Sub Nav */}
      <div className="sub-nav">
        {knowledgeHubData.modules.map(mod => (
          <button 
            key={mod.id}
            className={`sub-pill ${activeHub === mod.id ? 'active' : ''}`}
            onClick={() => setActiveHub(mod.id)}
          >
            <span className="sub-icon" style={{background: 'rgba(59,130,246,0.12)', color: `var(--${mod.color})`}}>
              {mod.icon}
            </span>
            {mod.title}
          </button>
        ))}
      </div>

      <div className="hub-wrap">
        {/* We inject the legacy HTML here. It contains all the hub-sections. */}
        <div 
          dangerouslySetInnerHTML={{ __html: legacyHtml }} 
        />
      </div>
    </div>
  );
}
