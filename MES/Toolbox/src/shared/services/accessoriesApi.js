import axios from 'axios';
import { apiGet, apiPost } from './apiClient';

const INSPECTION_API = 'api/accessories/inspectionApi.php';
const PROXY_API = 'api/accessories/camProxy.php';

/**
 * Accessories Inspection (AI Vision + DB Audit Logs) API service.
 */
export const accessoriesApi = {
  getConfigStatus: () => apiGet(INSPECTION_API, { action: 'get_config_status' }),

  getLogs: (params = {}) => apiGet(INSPECTION_API, { action: 'get_logs', ...params }),

  getStreamUrl: (bustTs = Date.now()) => `${PROXY_API}?p=/stream&t=${bustTs}`,

  /** Returns ordered image candidate URLs from Toolbox API -> legacy uploads -> legacy img -> live cam node. */
  getImageCandidates: (filename) => {
    const encoded = encodeURIComponent(filename);
    return [
      `${INSPECTION_API}?action=get_image&file=${encoded}`,
      `/iot-toolbox/sandbox-b9/MES/MES/uploads/accessories_inspection/${encoded}`,
      `/iot-toolbox/sandbox-b9/MES/MES/page/AccessoriesInspection/img/${encoded}`,
      `${PROXY_API}?p=/images/${encoded}`,
    ];
  },

  /** Direct proxy GET/POST returning upstream payload without retry floods during polling. */
  camGet: async (path, timeout = 4000) => {
    const res = await axios.get(`${PROXY_API}?p=${encodeURIComponent(path)}`, { timeout });
    const payload = res.data;
    return payload?.data ?? payload;
  },

  camPost: async (path, body = {}, timeout = 6000) => {
    const res = await axios.post(`${PROXY_API}?p=${encodeURIComponent(path)}`, body, { timeout });
    return res.data?.data ?? res.data;
  },

  // Convenience action wrappers
  getStatus: () => accessoriesApi.camGet('/api/status', 3000),
  getModels: () => accessoriesApi.camGet('/api/models', 5000),
  loadModel: (model) => accessoriesApi.camPost('/api/load_model', { model }, 8000),
  updateSettings: (settings) => accessoriesApi.camPost('/api/settings', settings, 5000),
  startDetection: () => accessoriesApi.camPost('/api/start', {}, 5000),
  captureSnapshot: () => accessoriesApi.camPost('/api/capture', {}, 5000),
  /** Standard POST wrapper kept for symmetry */
  checkHealth: () => apiPost(INSPECTION_API, { action: 'get_config_status' }),
};
