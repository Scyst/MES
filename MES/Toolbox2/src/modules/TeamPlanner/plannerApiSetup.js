import axios from 'axios';

export const PLANNER_API_DIR = `${import.meta.env.BASE_URL || '/'}api/planner`.replace(/\/$/, '');

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
      return `${PLANNER_API_DIR}/${val.slice(4)}`;
    }
    if (val.includes('"api/uploads/')) {
      return val.replace(/"api\/uploads\//g, `"${PLANNER_API_DIR}/uploads/`);
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
      // e.g. 'api/auth.php?action=me' -> '${PLANNER_API_DIR}/auth.php?action=me'
      config.url = `${PLANNER_API_DIR}/${url.slice(4)}`;
      return config;
    }

    if (url.startsWith('/api/')) {
      const commentsMatch = url.match(/^\/api\/tasks\/([^/]+)\/comments$/);
      if (commentsMatch) {
        config.url = `${PLANNER_API_DIR}/comments.php?taskId=${commentsMatch[1]}`;
        return config;
      }

      const idMatch = url.match(/^\/api\/([a-zA-Z_]+)\/([^/?]+)$/);
      if (idMatch && !idMatch[1].endsWith('.php')) {
        config.url = `${PLANNER_API_DIR}/${idMatch[1]}.php?id=${idMatch[2]}`;
        return config;
      }

      const baseMatch = url.match(/^\/api\/([a-zA-Z_]+)$/);
      if (baseMatch) {
        config.url = `${PLANNER_API_DIR}/${baseMatch[1]}.php`;
        return config;
      }

      // e.g. '/api/tasks.php?...' -> '${PLANNER_API_DIR}/tasks.php?...'
      config.url = `${PLANNER_API_DIR}/${url.slice(5)}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => {
      const reqUrl = response?.config?.url || '';
      if (reqUrl.includes('/api/planner/') && response.data) {
        response.data = rewriteUploadPathsInValue(response.data);
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
}
