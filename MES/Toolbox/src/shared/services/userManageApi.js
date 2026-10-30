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
  }
};
