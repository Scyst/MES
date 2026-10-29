import axios from 'axios';

export const PLANNER_BASE_URL = '/iot-toolbox/sandbox-b9/Toolbox/planner';

const PLANNER_ENDPOINTS = new Set([
  'tasks',
  'events',
  'activities',
  'projects',
  'spaces',
  'space_members',
  'users',
  'profile',
  'comments',
  'chat',
  'links',
  'resources',
  'github',
  'upload_attachment',
  'delete_attachment',
  'upload_avatar',
  'upload_chat_attachment',
  'notifications',
  'auth',
]);

let interceptorInitialized = false;

function isPlannerApiCall(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('api/auth.php') || url.startsWith('api/notifications.php')) return true;
  if (!url.startsWith('/api/')) return false;
  const clean = url.slice(5).split('?')[0].split('/')[0].replace(/\.php$/, '');
  return PLANNER_ENDPOINTS.has(clean);
}

function rewriteUploadPathsInValue(val) {
  if (typeof val === 'string') {
    if (val.startsWith('api/uploads/')) {
      return `${PLANNER_BASE_URL}/${val}`;
    }
    if (val.includes('"api/uploads/')) {
      return val.replace(/"api\/uploads\//g, `"${PLANNER_BASE_URL}/api/uploads/`);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(rewriteUploadPathsInValue);
  }
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = rewriteUploadPathsInValue(v);
    }
    return out;
  }
  return val;
}

export function ensurePlannerInterceptors() {
  if (interceptorInitialized) return;
  interceptorInitialized = true;

  axios.interceptors.request.use((config) => {
    const url = config.url || '';
    if (!isPlannerApiCall(url)) return config;

    config.withCredentials = true;

    if (url.startsWith('api/')) {
      config.url = `${PLANNER_BASE_URL}/${url}`;
      return config;
    }

    if (url.startsWith('/api/')) {
      const commentsMatch = url.match(/^\/api\/tasks\/([^/]+)\/comments$/);
      if (commentsMatch) {
        config.url = `${PLANNER_BASE_URL}/api/comments.php?taskId=${commentsMatch[1]}`;
        return config;
      }

      const idMatch = url.match(/^\/api\/([a-zA-Z_]+)\/([^/?]+)$/);
      if (idMatch && !idMatch[1].endsWith('.php')) {
        config.url = `${PLANNER_BASE_URL}/api/${idMatch[1]}.php?id=${idMatch[2]}`;
        return config;
      }

      const baseMatch = url.match(/^\/api\/([a-zA-Z_]+)$/);
      if (baseMatch) {
        config.url = `${PLANNER_BASE_URL}/api/${baseMatch[1]}.php`;
        return config;
      }

      config.url = `${PLANNER_BASE_URL}/${url.substring(1)}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => {
      const reqUrl = response?.config?.url || '';
      if (reqUrl.includes('/Toolbox/planner/api/') && response.data) {
        response.data = rewriteUploadPathsInValue(response.data);
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
}
