/**
 * Self-contained API client for Toolbox C-TPAT Loading Report & Completed Document Tracking.
 */
import { apiGet, apiPost, request } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const LOADING_ENDPOINT = `${BASE}api/loading/loadingApi.php`;

export const getLoadingPhotoUrl = (fileOrPath) => {
  if (!fileOrPath) return '';
  const cleanName = String(fileOrPath).replace(/\\/g, '/').split('/').pop();
  return `${LOADING_ENDPOINT}?action=view_photo&file=${encodeURIComponent(cleanName)}`;
};

export const loadingReportApi = {
  getJobs: (params = {}) => apiGet(LOADING_ENDPOINT, { action: 'get_jobs', ...params }),
  getReportDetail: (params = {}) => apiGet(LOADING_ENDPOINT, { action: 'get_report_detail', ...params }),
  saveHeader: (payload) => apiPost(LOADING_ENDPOINT, { action: 'save_header', ...payload }),
  uploadPhoto: (reportId, photoType, fileBlob, filename = 'photo.jpg') => {
    const fd = new FormData();
    fd.append('action', 'upload_photo');
    fd.append('report_id', String(reportId));
    fd.append('photo_type', photoType);
    fd.append('file', fileBlob, filename);
    return request({ method: 'post', url: LOADING_ENDPOINT, data: fd, timeout: 45000 });
  },
  deletePhoto: (reportId, photoType) => apiPost(LOADING_ENDPOINT, { action: 'delete_photo', report_id: reportId, photo_type: photoType }),
  saveChecklistItem: (payload) => apiPost(LOADING_ENDPOINT, { action: 'save_checklist_item', ...payload }),
  saveAllPass: (reportId) => apiPost(LOADING_ENDPOINT, { action: 'save_all_pass', report_id: reportId }),
  finishReport: (reportId) => apiPost(LOADING_ENDPOINT, { action: 'finish_report', report_id: reportId }),
  reopenReport: (reportId) => apiPost(LOADING_ENDPOINT, { action: 'reopen_report', report_id: reportId }),
  searchCompleted: (keyword) => apiGet(LOADING_ENDPOINT, { action: 'search_completed', keyword }),
  generateShareToken: (reportId) => apiPost(LOADING_ENDPOINT, { action: 'generate_share_token', report_id: reportId }),
};
