/**
 * Self-contained API client for Toolbox OEE Executive & Shopfloor Live Monitor (#/oee).
 */
import { apiGet } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const OEE_ENDPOINT = `${BASE}api/oee/oeeApi.php`;

export const oeeApi = {
  getFilters: () => apiGet(OEE_ENDPOINT, { action: 'getFilters' }),
  getPieChart: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getPieChart', ...params }),
  getLineChart: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getLineChart', ...params }),
  getHourlySparklines: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getHourlySparklines', ...params }),
  getBarCharts: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getBarCharts', ...params }),
  getDailyProduction: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getDailyProduction', ...params }),
  getCostSummary: (params = {}) => apiGet(OEE_ENDPOINT, { action: 'getCostSummary', ...params }),
};
