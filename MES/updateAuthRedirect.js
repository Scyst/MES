const fs = require('fs');
let file = 'E:/MES/MES/MES/mes-v2/src/app/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add useLocation to react-router-dom import
content = content.replace(
  "import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';",
  "import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';"
);

// Update ProtectedRoute to pass location
const oldProtectedRoute = `const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};`;

const newProtectedRoute = `const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return children;
};`;

content = content.replace(oldProtectedRoute, newProtectedRoute);
fs.writeFileSync(file, content, 'utf8');

// ---- Update Login.jsx ----
let file2 = 'E:/MES/MES/MES/mes-v2/src/modules/Auth/pages/Login.jsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  "import { useNavigate } from 'react-router-dom';",
  "import { useNavigate, useLocation } from 'react-router-dom';"
);

content2 = content2.replace(
  "const navigate = useNavigate();",
  "const navigate = useNavigate();\n  const location = useLocation();\n  const from = location.state?.from?.pathname + (location.state?.from?.search || '') + (location.state?.from?.hash || '') || '/';"
);

content2 = content2.replace(
  "navigate('/');",
  "navigate(from, { replace: true });"
);

fs.writeFileSync(file2, content2, 'utf8');
