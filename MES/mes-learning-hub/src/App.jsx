import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Architecture from './pages/Architecture';
import KnowledgeHub from './pages/KnowledgeHub';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/knowledge-hub" element={<KnowledgeHub />} />
        <Route path="*" element={<Navigate to="/architecture" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
