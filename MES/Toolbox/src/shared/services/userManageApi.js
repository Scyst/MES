import { apiGet, apiPost } from './apiClient';

const API_URL = `${import.meta.env.BASE_URL}api/userManage.php`;

const getApi = (url, params) => apiGet(url, params);
const postApi = (url, data) => apiPost(url, data);

export const userManageApi = {
  getUsers: async () => {
    return getApi(API_URL, { action: 'read' });
  },

  syncManpower: async () => {
    return postApi(`${API_URL}?action=sync_manpower`, {});
  },

  getEmpInfo: async (empId) => {
    return getApi(API_URL, { action: 'get_emp_info', emp_id: empId });
  },

  createUser: async (userData) => {
    return postApi(`${API_URL}?action=create`, userData);
  },

  updateUser: async (userData) => {
    return postApi(`${API_URL}?action=update`, userData);
  },

  toggleStatus: async (id) => {
    return postApi(`${API_URL}?action=toggle_status`, { id });
  },

  resetPasswordDefault: async (id) => {
    return postApi(`${API_URL}?action=reset_password_default`, { id });
  },

  getPermissions: async (id = 0, role = '') => {
    return getApi(API_URL, { 
      action: 'get_permissions', 
      id, 
      role, 
      _t: Date.now() 
    });
  },

  getPermissionMatrix: async () => {
    return getApi(API_URL, { action: 'get_permission_matrix' });
  },

  togglePermission: async (roleCode, permCode, isGranted) => {
    return postApi(`${API_URL}?action=toggle_permission`, {
      role_code: roleCode,
      perm_code: permCode,
      is_granted: isGranted ? 1 : 0
    });
  },

  addPermission: async (permCode, description, moduleName) => {
    return postApi(`${API_URL}?action=add_permission`, {
      perm_code: permCode,
      description: description,
      module_name: moduleName
    });
  },

  deletePermission: async (permCode) => {
    return postApi(`${API_URL}?action=delete_permission`, {
      perm_code: permCode
    });
  },

  getLogs: async (filters) => {
    return getApi(API_URL, { action: 'logs', ...filters });
  },

  getPendingApprovals: async () => {
    return getApi(API_URL, { action: 'pending_approvals', _t: Date.now() });
  },

  approveUser: async ({ id, role, line, expires_at, permissions }) => {
    return postApi(`${API_URL}?action=approve_user`, { id, role, line, expires_at, permissions });
  },

  rejectUser: async ({ id, reason }) => {
    return postApi(`${API_URL}?action=reject_user`, { id, reason });
  },

  extendExpiry: async ({ id, days, expires_at }) => {
    return postApi(`${API_URL}?action=extend_expiry`, { id, days, expires_at });
  },

  register: async (payload) => {
    const regUrl = `${import.meta.env.BASE_URL}api/register.php`;
    return postApi(regUrl, payload);
  }
};
