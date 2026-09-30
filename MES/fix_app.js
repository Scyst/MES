const fs = require('fs');
let fileApp = 'E:/MES/MES/MES/mes-v2/src/app/App.jsx';
let contentApp = fs.readFileSync(fileApp, 'utf8');

const regex = /const ProtectedRoute = \(\{ children \}\) => \{[\s\S]*?return children;[\s\S]*?\};/;
const newProtectedRoute = `const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = require('react-router-dom').useLocation();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return children;
};`;

contentApp = contentApp.replace(regex, newProtectedRoute);
fs.writeFileSync(fileApp, contentApp, 'utf8');
