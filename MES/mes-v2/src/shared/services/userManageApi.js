import axios from 'axios';

const API_URL = `${import.meta.env.BASE_URL}api/userManage.php`;

// Configure defaults to include credentials
const getApi = async (url, params) => {
  return await axios.get(url, { params, withCredentials: true });
};

const postApi = async (url, data, isFormData = false) => {
  const config = { withCredentials: true };
  if (isFormData) {
    config.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }
  return await axios.post(url, data, config);
};

export const userManageApi = {
  getUsers: async () => {
    const response = await getApi(API_URL, { action: 'read' });
    return response.data;
  },

  syncManpower: async () => {
    const response = await postApi(`${API_URL}?action=sync_manpower`, {});
    return response.data;
  },

  getEmpInfo: async (empId) => {
    const response = await getApi(API_URL, { action: 'get_emp_info', emp_id: empId });
    return response.data;
  },

  createUser: async (userData) => {
    const response = await postApi(`${API_URL}?action=create`, userData);
    return response.data;
  },

  updateUser: async (userData) => {
    const response = await postApi(`${API_URL}?action=update`, userData);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await postApi(`${API_URL}?action=toggle_status`, { id });
    return response.data;
  },

  getPermissions: async (id = 0, role = '') => {
    const response = await getApi(API_URL, { 
      action: 'get_permissions', 
      id, 
      role, 
      _t: Date.now() 
    });
    return response.data;
  }
};
