import axios from 'axios';

const API_URL = '/iot-toolbox/sandbox-b9/MES/MES/page/dailyLog/api/dailyLogManage.php';

// Configure defaults for this specific URL instead of creating a new instance
// so that global interceptors from AuthContext will apply.
const postApi = async (url, params) => {
  return await axios.post(url, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    withCredentials: true
  });
};

export const dailyLogApi = {
  /**
   * Fetch initial dashboard data (today logs, calendar, admin dash data)
   */
  getInitialData: async () => {
    const params = new URLSearchParams();
    params.append('action', 'get_initial_data');
    
    const response = await postApi(API_URL, params);
    return response.data;
  },

  /**
   * Fetch the morning brief (production summary)
   * @param {string} team - The selected team filter ('ALL', etc.)
   * @param {string} date - Optional date string (YYYY-MM-DD)
   */
  getMorningBrief: async (team = 'ALL', date = null) => {
    const params = new URLSearchParams();
    params.append('action', 'get_morning_brief');
    params.append('team', team);
    if (date) params.append('brief_date', date);
    
    const response = await postApi(API_URL, params);
    return response.data;
  },

  /**
   * Mark a supervisor reply as read
   * @param {string} logDate - Format YYYY-MM-DD
   * @param {number} periodId - 1 (Start), 2 (Break), 3 (End)
   */
  markAsRead: async (logDate, periodId) => {
    const params = new URLSearchParams();
    params.append('action', 'mark_as_read');
    params.append('log_date', logDate);
    params.append('period_id', periodId);
    
    const response = await postApi(API_URL, params);
    return response.data;
  },

  /**
   * Submit a daily pulse log
   * @param {Object} data 
   * @param {string} data.action - Always 'save_log'
   * @param {string} data.log_date - YYYY-MM-DD
   * @param {number} data.period_id - 1, 2, or 3
   * @param {number} data.mood - Mood score 1-5
   * @param {number|string} data.qty - Production quantity
   * @param {string} data.note - Additional note
   */
  submitLog: async (data) => {
    const params = new URLSearchParams();
    Object.keys(data).forEach(key => {
      params.append(key, data[key]);
    });
    
    const response = await postApi(API_URL, params);
    return response.data;
  }
};
