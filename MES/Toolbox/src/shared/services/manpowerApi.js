/**
 * Self-contained API client for Toolbox Manpower & Daily Planning (Command Center) modules.
 * All requests go to Toolbox-local endpoints under import.meta.env.BASE_URL.
 */
import { apiGet, apiPost, request } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const OPS_ENDPOINT = `${BASE}api/manpower/dailyOperationsApi.php`;
const MASTER_ENDPOINT = `${BASE}api/manpower/masterDataApi.php`;
const HOLIDAY_ENDPOINT = `${BASE}api/manpower/holidayApi.php`;
const GRADING_ENDPOINT = `${BASE}api/manpower/employeeGradingApi.php`;
const AUDIT5S_ENDPOINT = `${BASE}api/manpower/audit5sApi.php`;
const LEARNING_ENDPOINT = `${BASE}api/learning/learningApi.php`;
const SKILL_ENDPOINT = `${BASE}api/manpower/skillMatrixApi.php`;
const TREND_ENDPOINT = `${BASE}api/manpower/gradingTrendApi.php`;
const SYNC_ENDPOINT = `${BASE}api/manpower/syncScansApi.php`;
const PLANNING_ENDPOINT = `${BASE}api/planning/dailyMeetingApi.php`;

export const manpowerOpsApi = {
  readSummary: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'read_summary', ...params }),
  readDaily: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'read_daily', ...params }),
  readTrend: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'read_trend', ...params }),
  readKpiSummary: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'read_kpi_summary', ...params }),
  readRangeReport: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'read_range_report', ...params }),
  compareCost: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'compare_cost', ...params }),
  integratedAnalysis: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'integrated_analysis', ...params }),
  detectShiftSwaps: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'detect_shift_swaps', ...params }),
  fetchRawCentralScans: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'fetch_raw_central_scans', ...params }),
  exportHistory: (params = {}) => apiGet(OPS_ENDPOINT, { action: 'export_history', ...params }),
  updateLog: (payload) => apiPost(OPS_ENDPOINT, { action: 'update_log', ...payload }),
  updateLogStatus: (logId, status, extra = {}) =>
    apiPost(OPS_ENDPOINT, { action: 'update_log_status', log_id: logId, status, ...extra }),
  deleteLog: (logId) => apiPost(OPS_ENDPOINT, { action: 'delete_log', log_id: logId }),
  clearDay: (date, hardReset = false) => apiPost(OPS_ENDPOINT, { action: 'clear_day', date, hard_reset: hardReset }),
  confirmAnomaly: (logId) => apiPost(OPS_ENDPOINT, { action: 'confirm_anomaly', log_id: logId }),
  batchConfirmAnomaly: (logIds) => apiPost(OPS_ENDPOINT, { action: 'batch_confirm_anomaly', log_ids: logIds }),
  quickSwapShift: (logId, newShiftId, applyFuture = false) =>
    apiPost(OPS_ENDPOINT, { action: 'quick_swap_shift', log_id: logId, new_shift_id: newShiftId, apply_future: applyFuture }),
  batchQuickSwapShift: (logs, applyFuture = false) =>
    apiPost(OPS_ENDPOINT, { action: 'batch_quick_swap_shift', logs, apply_future: applyFuture }),
  batchClearTimes: (logs) => apiPost(OPS_ENDPOINT, { action: 'batch_clear_times', logs }),
};

export const manpowerMasterApi = {
  readStructure: () => apiGet(MASTER_ENDPOINT, { action: 'read_structure' }),
  readSingleEmployee: (empId) => apiGet(MASTER_ENDPOINT, { action: 'read_single_employee', emp_id: empId }),
  readEmployees: (params = {}) => apiGet(MASTER_ENDPOINT, { action: 'read_employees', ...params }),
  readTeamShifts: () => apiGet(MASTER_ENDPOINT, { action: 'read_team_shifts' }),
  updateTeamShift: (payload) => apiPost(MASTER_ENDPOINT, { action: 'update_team_shift', ...payload }),
  createEmployee: (payload) => apiPost(MASTER_ENDPOINT, { action: 'create_employee', ...payload }),
  updateEmployee: (payload) => apiPost(MASTER_ENDPOINT, { action: 'update_employee', ...payload }),
  terminateEmployee: (empId, resignDate) =>
    apiPost(MASTER_ENDPOINT, { action: 'terminate_employee', emp_id: empId, resign_date: resignDate }),
  reactivateEmployee: (empId) => apiPost(MASTER_ENDPOINT, { action: 'reactivate_employee', emp_id: empId }),
  readMappings: () => apiGet(MASTER_ENDPOINT, { action: 'read_mappings' }),
  saveMappings: (mappings) => apiPost(MASTER_ENDPOINT, { action: 'save_mappings', mappings }),
  readTeamSettings: () => apiGet(MASTER_ENDPOINT, { action: 'read_team_settings' }),
  saveTeamSettings: (settings) => apiPost(MASTER_ENDPOINT, { action: 'save_team_settings', settings }),
};

export const manpowerHolidayApi = {
  read: (start, end) => apiGet(HOLIDAY_ENDPOINT, { action: 'read', start, end }),
  save: (payload) => apiPost(HOLIDAY_ENDPOINT, { action: 'save', ...payload }),
  resetDay: (date) => apiPost(HOLIDAY_ENDPOINT, { action: 'delete', date }),
};

export const manpowerGradingApi = {
  getGradingData: (params = {}) => apiGet(GRADING_ENDPOINT, { action: 'get_grading_data', ...params }),
  get5SAudits: (line = 'ALL') => apiGet(GRADING_ENDPOINT, { action: 'get_5s_audits', line }),
  save5SAudit: (payload) => apiPost(GRADING_ENDPOINT, { action: 'save_5s_audit', ...payload }),
  saveGrades: (period, grades) => apiPost(GRADING_ENDPOINT, { action: 'save_grades', period, grades }),
  saveWeightage: (payload) => apiPost(GRADING_ENDPOINT, { action: 'save_weightage', ...payload }),
  verifyPassword: (password) => apiPost(GRADING_ENDPOINT, { action: 'verify_password', password }),
  getCriteria: () => apiGet(GRADING_ENDPOINT, { action: 'get_criteria' }),
  saveCriteria: (criteria) => apiPost(GRADING_ENDPOINT, { action: 'save_criteria', criteria }),
};

export const skillMatrixApi = {
  getMatrix: (params = {}) => apiGet(SKILL_ENDPOINT, { action: 'get_skill_matrix', ...params }),
  updateEmpSkill: (payload) => apiPost(SKILL_ENDPOINT, { action: 'update_emp_skill', ...payload }),
  getDefinitions: () => apiGet(SKILL_ENDPOINT, { action: 'get_skill_definitions' }),
  saveDefinition: (payload) => apiPost(SKILL_ENDPOINT, { action: 'save_skill_definition', ...payload }),
  deleteDefinition: (skillId) => apiPost(SKILL_ENDPOINT, { action: 'delete_skill_definition', skill_id: skillId }),
  toggleActive: (skillId, isActive) => apiPost(SKILL_ENDPOINT, { action: 'toggle_skill_active', skill_id: skillId, is_active: isActive ? 1 : 0 }),
};

export const gradingTrendApi = {
  getTrendData: (params = {}) => apiGet(TREND_ENDPOINT, { action: 'get_trend_data', ...params }),
};

export const manpowerSyncApi = {
  syncScans: (startDate, endDate) => apiPost(SYNC_ENDPOINT, { startDate, endDate }),
};

export const planningApi = {
  getMeeting: (date, shift = 'DAY') => apiGet(PLANNING_ENDPOINT, { action: 'get_meeting', date, shift }),
  getMasterLines: () => apiGet(PLANNING_ENDPOINT, { action: 'get_master_lines' }),
  searchItems: (q) => apiGet(PLANNING_ENDPOINT, { action: 'search_items', q }),
  saveMeeting: (payload) => apiPost(PLANNING_ENDPOINT, { action: 'save_meeting', ...payload }),
  addPlan: (payload) => apiPost(PLANNING_ENDPOINT, { action: 'add_plan', ...payload }),
  updatePlanQty: (payload) => apiPost(PLANNING_ENDPOINT, { action: 'update_plan_qty', ...payload }),
};

export const audit5sApi = {
  getMyAssignments: (evalPeriod = '') => apiGet(AUDIT5S_ENDPOINT, { action: 'get_my_5s_assignments', eval_period: evalPeriod }),
  getRoundDetail: (roundId, extra = {}) => apiGet(AUDIT5S_ENDPOINT, { action: 'get_5s_round_detail', round_id: roundId, ...extra }),
  getAuditorCandidates: (q = '') => apiGet(AUDIT5S_ENDPOINT, { action: 'get_auditor_candidates', q }),
  getDefaultCommittee: () => apiGet(AUDIT5S_ENDPOINT, { action: 'get_default_5s_committee' }),
  saveDefaultCommittee: (members) => apiPost(AUDIT5S_ENDPOINT, { action: 'save_default_5s_committee', members }),
  syncPeriodRounds: (evalPeriod, auditDate) => apiPost(AUDIT5S_ENDPOINT, { action: 'sync_period_5s_rounds', eval_period: evalPeriod, audit_date: auditDate }),
  saveRound: (payload) => apiPost(AUDIT5S_ENDPOINT, { action: 'save_5s_round', ...payload }),
  deleteRound: (roundId) => apiPost(AUDIT5S_ENDPOINT, { action: 'delete_5s_round', round_id: roundId }),
  deletePhoto: (photoId) => apiPost(AUDIT5S_ENDPOINT, { action: 'delete_5s_photo', photo_id: photoId }),
  toggleRoundLock: (roundId, lock) => apiPost(AUDIT5S_ENDPOINT, { action: 'toggle_5s_round_lock', round_id: roundId, lock: lock ? 1 : 0 }),
  submitAudit: (formData) => request({
    method: 'post',
    url: `${AUDIT5S_ENDPOINT}?action=submit_5s_audit`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getPhotoUrl: (fileName) => `${AUDIT5S_ENDPOINT}?action=view_5s_photo&file=${encodeURIComponent(fileName || '')}`,
};

export const learningCurriculumApi = {
  getRules: () => apiGet(LEARNING_ENDPOINT, { action: 'get_curriculum_rules' }),
  saveRule: (payload) => apiPost(LEARNING_ENDPOINT, { action: 'save_curriculum_rule', ...payload }),
  deleteRule: (ruleId) => apiPost(LEARNING_ENDPOINT, { action: 'delete_curriculum_rule', rule_id: ruleId }),
  getCurrentUser: () => apiGet(LEARNING_ENDPOINT, { action: 'get_current_user' }),
};
