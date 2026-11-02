import { apiGet, apiPost, request } from './apiClient';

const BASE = `${import.meta.env.BASE_URL}api/profile`;
const PROFILE_API = `${BASE}/api_profile.php`;
const AVATAR_API = `${BASE}/api_avatar_upload.php`;
const PERFORMANCE_API = `${import.meta.env.BASE_URL}api/manpower/api_my_performance.php`;

export const profileApi = {
  getMyProfile: async () => {
    return apiGet(PROFILE_API, { action: 'get_my_profile', _t: Date.now() });
  },

  updateMyInfo: async (data) => {
    return apiPost(`${PROFILE_API}?action=update_my_info`, data);
  },

  changePassword: async (data) => {
    return apiPost(`${PROFILE_API}?action=change_password`, data);
  },

  getActivityLogs: async () => {
    return apiGet(PROFILE_API, { action: 'get_activity_log', _t: Date.now() });
  },

  uploadAvatar: async (formData) => {
    return request({
      method: 'post',
      url: AVATAR_API,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getMyPerformance: async () => {
    return apiGet(PERFORMANCE_API, { _t: Date.now() });
  },
};
