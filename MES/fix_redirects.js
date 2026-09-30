const fs = require('fs');

// Fix App.jsx
let fileApp = 'E:/MES/MES/MES/mes-v2/src/app/App.jsx';
let contentApp = fs.readFileSync(fileApp, 'utf8');

const regexProtectedRoute = /const ProtectedRoute = \(\{ children \}\) => \{[\s\S]*?return children;\n\};/;
const newProtectedRoute = `const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return children;
};`;

contentApp = contentApp.replace(regexProtectedRoute, newProtectedRoute);
fs.writeFileSync(fileApp, contentApp, 'utf8');

// Fix AuthContext.jsx
let fileAuth = 'E:/MES/MES/MES/mes-v2/src/shared/contexts/AuthContext.jsx';
let contentAuth = fs.readFileSync(fileAuth, 'utf8');
if (!contentAuth.includes('useLocation')) {
    contentAuth = contentAuth.replace(
        "import { useNavigate } from 'react-router-dom';",
        "import { useNavigate, useLocation } from 'react-router-dom';"
    );
}

const hookRegex = /const navigate = useNavigate\(\);/;
if (!contentAuth.includes('const location = useLocation();')) {
    contentAuth = contentAuth.replace(
        hookRegex,
        "const navigate = useNavigate();\n  const location = useLocation();"
    );
}

const logoutNavRegex = /navigate\('\/login'\);/g;
contentAuth = contentAuth.replace(
    logoutNavRegex,
    "navigate('/login', { state: { from: location } });"
);

fs.writeFileSync(fileAuth, contentAuth, 'utf8');

