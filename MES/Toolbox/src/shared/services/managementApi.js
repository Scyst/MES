/**
 * Self-contained API client for Toolbox Management Module (#/management):
 * Executive Financial Overview & Production Planning / APS Schedule.
 */
import { apiGet, apiPost } from './apiClient';
import { manpowerSyncApi } from './manpowerApi';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const EXEC_ENDPOINT = `${BASE}api/management/executiveApi.php`;
const PLAN_ENDPOINT = `${BASE}api/management/planningApi.php`;

export const managementExecApi = {
  getDashboard: (params = {}) => apiGet(EXEC_ENDPOINT, { action: 'get_dashboard', ...params }),
  getLineDetails: (line, date) => apiGet(EXEC_ENDPOINT, { action: 'get_line_details', line, date }),
  syncLaborDay: (startDate, endDate) => manpowerSyncApi.syncScans(startDate, endDate),
};

export const managementPlanApi = {
  getFilters: () => apiGet(PLAN_ENDPOINT, { action: 'get_filters' }),
  searchItems: (q) => apiGet(PLAN_ENDPOINT, { action: 'search_items', q }),
  getPlans: (params = {}) => apiGet(PLAN_ENDPOINT, { action: 'get_plans', ...params }),
  savePlan: (payload) => apiPost(PLAN_ENDPOINT, { action: 'save_plan', ...payload }),
  updateCarryOver: (planId, carryOverQty) =>
    apiPost(PLAN_ENDPOINT, { action: 'update_carry_over', plan_id: planId, carry_over_quantity: carryOverQty }),
  deletePlan: (planId) => apiPost(PLAN_ENDPOINT, { action: 'delete_plan', plan_id: planId }),
  deletePlansByRange: (payload) => apiPost(PLAN_ENDPOINT, { action: 'delete_plans_by_range', ...payload }),
  clearAllPlans: () => apiPost(PLAN_ENDPOINT, { action: 'clear_all_plans' }),
  calculateCarryOver: () => apiPost(PLAN_ENDPOINT, { action: 'calculate_carry_over' }),
  importPlansBulk: (plans) => apiPost(PLAN_ENDPOINT, { action: 'import_plans_bulk', plans }),
  autoCreatePlan: (payload) => apiPost(PLAN_ENDPOINT, { action: 'auto_create_plan', ...payload }),
};
