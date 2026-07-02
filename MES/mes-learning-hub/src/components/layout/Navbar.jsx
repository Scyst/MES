import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="tab-nav">
      <div className="tab-nav-inner">
        <NavLink 
          to="/architecture" 
          className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
        >
          <span className="tab-icon">⚡</span>
          <span>React + Vite Architecture</span>
          <span className="tab-badge">Guide</span>
        </NavLink>
        <NavLink 
          to="/knowledge-hub" 
          className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
        >
          <span className="tab-icon">📚</span>
          <span>Knowledge Hub</span>
          <span className="tab-badge">4 หมวด + Quiz</span>
        </NavLink>
      </div>
    </nav>
  );
}
