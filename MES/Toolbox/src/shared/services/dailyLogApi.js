import axios from 'axios';

const DAILY_LOG_API_URL = `${import.meta.env.BASE_URL}api/dailyLog/dailyLogManage.php`;
const MOOD_REPORT_API_URL = `${import.meta.env.BASE_URL}api/dailyLog/moodReportApi.php`;

// Post via global axios so AuthContext 401/403 interceptors and X-CSRF-TOKEN apply automatically
const postForm = async (url, payload) => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      params.append(key, String(val));
    }
  });

  const response = await axios.post(url, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    withCredentials: true
  });
  return response.data;
};

export const dailyLogApi = {
  /**
   * Fetch initial dashboard / shift log data for a given YYYY-MM month
   */
  getInitialData: async (month = null, dashDate = null) => {
    return postForm(DAILY_LOG_API_URL, {
      action: 'get_initial_data',
      ...(month ? { month } : {}),
      ...(dashDate ? { dash_date: dashDate } : {})
    });
  },

  /**
   * Fetch the morning brief (production summary)
   */
  getMorningBrief: async (team = 'ALL', date = null) => {
    return postForm(DAILY_LOG_API_URL, {
      action: 'get_morning_brief',
      team,
      ...(date ? { brief_date: date } : {})
    });
  },

  /**
   * Generate an executive shift briefing using Gemini AI
   */
  getMorningBriefAi: async (briefData, team = 'ALL', customPrompt = '', summaryStyle = 'concise') => {
    const url = `${import.meta.env.BASE_URL}api/ai/morningBriefAi.php`;
    const response = await axios.post(
      url,
      {
        brief_data: briefData,
        team,
        custom_prompt: customPrompt,
        summary_style: summaryStyle
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );
    return response.data;
  },

  /**
   * Mark a supervisor reply as read
   */
  markAsRead: async (logDate, periodId) => {
    return postForm(DAILY_LOG_API_URL, {
      action: 'mark_as_read',
      log_date: logDate,
      period_id: periodId
    });
  },

  /**
   * Submit a daily pulse / shift log entry
   */
  submitLog: async (data) => {
    return postForm(DAILY_LOG_API_URL, data);
  },

  // =========================================================================
  // Mood Insight Report & Team Shift Ledger Endpoints
  // =========================================================================

  getReportFilters: async () => {
    return postForm(MOOD_REPORT_API_URL, { action: 'get_filters' });
  },

  getOverviewStats: async ({ startDate, endDate, line = 'All' }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_overview_stats',
      start_date: startDate,
      end_date: endDate,
      line
    });
  },

  getIssuesTable: async ({
    startDate,
    endDate,
    line = 'All',
    periodId = 0,
    onlyNegative = false,
    replyStatus = 'ALL',
    search = '',
    page = 1,
    limit = 20
  }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_issues_table',
      start_date: startDate,
      end_date: endDate,
      line,
      period_id: periodId || 0,
      only_negative: onlyNegative ? 1 : 0,
      reply_status: replyStatus,
      search,
      page,
      limit
    });
  },

  getNegativeAlerts: async ({ startDate, endDate, line = 'All', limit = 100 }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_negative_alerts',
      start_date: startDate,
      end_date: endDate,
      line,
      limit
    });
  },

  getMissingTable: async ({ startDate, endDate, line = 'All', search = '', page = 1, limit = 20 }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_missing_table',
      start_date: startDate,
      end_date: endDate,
      line,
      search,
      page,
      limit
    });
  },

  getUserHistory: async ({ empId = '', userId = 0 }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_user_history',
      emp_id: empId || '',
      user_id: userId || 0
    });
  },

  getExportData: async ({ startDate, endDate, line = 'All', onlyNegative = false, exportType = 'logs' }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'get_export_data',
      start_date: startDate,
      end_date: endDate,
      line,
      only_negative: onlyNegative ? 1 : 0,
      export_type: exportType
    });
  },

  saveReply: async ({ logDate, targetUserId, periodId, replyMessage }) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'save_reply',
      log_date: logDate,
      target_user_id: targetUserId,
      period_id: periodId,
      reply_message: replyMessage
    });
  },

  verifyPrivacyPassword: async (password) => {
    return postForm(MOOD_REPORT_API_URL, {
      action: 'verify_password',
      password
    });
  }
};
