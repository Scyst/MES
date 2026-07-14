import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

axios.defaults.withCredentials = true;

// Intercept Express REST calls and translate them to PHP endpoints
axios.interceptors.request.use(config => {
  let url = config.url;
  if (url.startsWith('/api/')) {
    // e.g., /api/tasks/123/comments -> /api/comments.php?taskId=123
    const commentsMatch = url.match(/^\/api\/tasks\/([^/]+)\/comments$/);
    if (commentsMatch) {
      config.url = `api/comments.php?taskId=${commentsMatch[1]}`;
      return config;
    }
    
    // e.g., /api/tasks/123 -> /api/tasks.php?id=123
    const idMatch = url.match(/^\/api\/(tasks|events|links)\/([^/]+)$/);
    if (idMatch) {
      config.url = `api/${idMatch[1]}.php?id=${idMatch[2]}`;
      return config;
    }
    
    // e.g., /api/tasks -> /api/tasks.php
    const baseMatch = url.match(/^\/api\/(tasks|events|links|activities)$/);
    if (baseMatch) {
      config.url = `api/${baseMatch[1]}.php`;
      return config;
    }
    
    // Fallback: strip leading slash so it resolves relatively (e.g. /api/comments.php -> api/comments.php)
    config.url = url.substring(1);
  }
  return config;
});

// Intercept responses to handle 401 Unauthorized globally
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `../../MES/MES/auth/login_form.php?redirect=${currentUrl}`;
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
