import axios from 'axios';

const FLEET_LOG_API_URL = `${import.meta.env.BASE_URL}api/fleetLog/fleetLogApi.php`;

const postForm = async (payload) => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      params.append(key, String(val));
    }
  });

  const response = await axios.post(FLEET_LOG_API_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    withCredentials: true,
    timeout: 20000
  });
  return response.data;
};

export const fleetLogApi = {
  getLogs: async ({
    startDate,
    endDate,
    transType = 'ALL',
    providerType = 'ALL',
    vehicleType = 'ALL',
    search = '',
    page = 1,
    limit = 50
  }) => {
    return postForm({
      action: 'get_logs',
      start_date: startDate,
      end_date: endDate,
      trans_type: transType,
      provider_type: providerType,
      vehicle_type: vehicleType,
      search,
      page,
      limit
    });
  },

  exportLogs: async ({
    startDate,
    endDate,
    transType = 'ALL',
    providerType = 'ALL',
    vehicleType = 'ALL',
    search = ''
  }) => {
    return postForm({
      action: 'export_logs',
      start_date: startDate,
      end_date: endDate,
      trans_type: transType,
      provider_type: providerType,
      vehicle_type: vehicleType,
      search
    });
  },

  getLogDetail: async (logId) => {
    return postForm({ action: 'get_log_detail', log_id: logId });
  },

  saveManualLog: async (data) => {
    return postForm({ action: 'save_manual_log', ...data });
  },

  updateManualLog: async (data) => {
    return postForm({ action: 'update_manual_log', ...data });
  },

  updateQuickCost: async ({ log_id, transport_cost, remark }) => {
    return postForm({
      action: 'update_quick_cost',
      log_id,
      transport_cost,
      remark
    });
  },

  deleteLog: async (logId) => {
    return postForm({ action: 'delete_log', log_id: logId });
  },

  getPendingLoading: async () => {
    return postForm({ action: 'get_pending_loading' });
  },

  syncOutbound: async ({ loading_report_id, transport_cost = 1100 }) => {
    return postForm({
      action: 'sync_outbound',
      loading_report_id,
      transport_cost
    });
  }
};

export default fleetLogApi;
