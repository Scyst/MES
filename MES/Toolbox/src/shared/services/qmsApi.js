/**
 * Self-contained API client for Toolbox QMS Module:
 * NCR, CAR 8D, Customer Claims, Concession Requests, and QA/QC Schedule / Planner.
 */
import { apiGet, apiPost, apiPostForm } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const QMS_CASES_ENDPOINT = `${BASE}api/qms/qmsCasesApi.php`;
const QMS_CONCESSION_ENDPOINT = `${BASE}api/qms/concessionApi.php`;
const QMS_SCHEDULE_ENDPOINT = `${BASE}api/qms/qaScheduleApi.php`;
const QMS_UPLOAD_ENDPOINT = `${BASE}api/qms/qmsUploadApi.php`;

/**
 * Resolves QMS / Concession attachment path via authenticated PHP image reader.
 * Supports both legacy "../../uploads/..." and normalized "uploads/..." strings.
 */
export function resolveQmsMediaUrl(rawPath) {
  if (!rawPath) return '';
  const cleaned = String(rawPath).trim().replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
  if (!cleaned) return '';
  return `${QMS_UPLOAD_ENDPOINT}?action=view_image&path=${encodeURIComponent(cleaned)}`;
}

export const qmsCasesApi = {
  list: (params = {}) => apiGet(QMS_CASES_ENDPOINT, { action: 'list', ...params }),
  detail: (caseId) => apiGet(QMS_CASES_ENDPOINT, { action: 'detail', case_id: caseId }),
  masterData: () => apiGet(QMS_CASES_ENDPOINT, { action: 'master_data' }),
  createNcr: (formData) => {
    formData.append('action', 'create_ncr');
    return apiPostForm(QMS_CASES_ENDPOINT, formData);
  },
  updateNcr: (formData) => {
    formData.append('action', 'update_ncr');
    return apiPostForm(QMS_CASES_ENDPOINT, formData);
  },
  saveCar8d: (payload) => {
    if (payload instanceof FormData) {
      payload.append('action', 'save_car_8d');
      return apiPostForm(QMS_CASES_ENDPOINT, payload);
    }
    return apiPost(QMS_CASES_ENDPOINT, { action: 'save_car_8d', ...payload });
  },
  closeClaim: (payload) => apiPost(QMS_CASES_ENDPOINT, { action: 'close_claim', ...payload }),
  rejectCar: (caseId) => apiPost(QMS_CASES_ENDPOINT, { action: 'reject_car', case_id: caseId }),
  cancelCase: (caseId) => apiPost(QMS_CASES_ENDPOINT, { action: 'cancel_case', case_id: caseId }),
  uploadFiles: (formData) => {
    formData.append('action', 'upload_case_files');
    return apiPostForm(QMS_UPLOAD_ENDPOINT, formData);
  },
};

export const qmsConcessionApi = {
  list: (search = '') => apiGet(QMS_CONCESSION_ENDPOINT, { action: 'list', search }),
  get: (id) => apiGet(QMS_CONCESSION_ENDPOINT, { action: 'get', id }),
  getBulk: (ids) => apiGet(QMS_CONCESSION_ENDPOINT, { action: 'get', ids: Array.isArray(ids) ? ids.join(',') : ids }),
  create: (formData) => {
    formData.append('action', 'create');
    return apiPostForm(QMS_CONCESSION_ENDPOINT, formData);
  },
  update: (formData) => {
    formData.append('action', 'update');
    return apiPostForm(QMS_CONCESSION_ENDPOINT, formData);
  },
  approve: ({ id, level, status }) => apiPost(QMS_CONCESSION_ENDPOINT, { action: 'approve', id, level, status }),
};

export const qmsScheduleApi = {
  getSchedule: (params = {}) => apiGet(QMS_SCHEDULE_ENDPOINT, { action: 'get_schedule', ...params }),
  getPendingJobs: (search = '') => apiGet(QMS_SCHEDULE_ENDPOINT, { action: 'get_pending_jobs', search }),
  searchPo: (search) => apiGet(QMS_SCHEDULE_ENDPOINT, { action: 'search_po', search }),
  getQcUsers: () => apiGet(QMS_SCHEDULE_ENDPOINT, { action: 'get_qc_users' }),
  schedulePo: (id, scheduleDate) => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'schedule_po', id, schedule_date: scheduleDate }),
  updateResult: (payload) => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'update_result', ...payload }),
  removeSchedule: (id, force = '0') => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'remove_schedule', id, force }),
  assignInspector: (id, qaInspector) => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'assign_inspector', id, qa_inspector: qaInspector }),
  bulkUpdateTicket: (payload) => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'bulk_update_ticket', ...payload }),
  updatePoDetails: (payload) => apiPost(QMS_SCHEDULE_ENDPOINT, { action: 'update_po_details', ...payload }),
};
