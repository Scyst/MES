import { apiGet, apiPost } from './apiClient';

const API_URL = 'api/areaAccess/areaAccessApi.php';

/**
 * Area Access Log API service for the self-contained Toolbox SPA.
 */
export const areaAccessApi = {
  getLocations: () => apiGet(API_URL, { action: 'get_locations' }),

  getHistory: (params = {}) => apiGet(API_URL, { action: 'get_history', ...params }),

  exportRows: (params = {}) => apiGet(API_URL, { action: 'export_rows', ...params }),

  getAutocomplete: (q = '') => apiGet(API_URL, { action: 'get_autocomplete', ...(q ? { q } : {}) }),

  verifyEmployee: (empId) => apiPost(API_URL, { action: 'verify_employee', emp_id: empId }),

  recordAccess: ({ empId, locationId, purpose }) =>
    apiPost(API_URL, {
      action: 'record_access',
      emp_id: empId,
      location_id: locationId,
      purpose,
    }),

  manualEdit: ({ logId, scanIn, scanOut, purpose }) =>
    apiPost(API_URL, {
      action: 'manual_edit',
      log_id: logId,
      scan_in: scanIn,
      scan_out: scanOut,
      purpose,
    }),

  forceCheckout: (logId) => apiPost(API_URL, { action: 'force_checkout', log_id: logId }),

  autoClearGhost: () => apiPost(API_URL, { action: 'auto_clear_ghost' }),
};
