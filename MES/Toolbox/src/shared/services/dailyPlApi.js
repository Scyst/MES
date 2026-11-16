/**
 * Self-contained API client for Toolbox Daily P&L Entry, Statement & Structure Setup (#/daily-pl).
 */
import { apiGet, apiPost } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const PL_ENTRY_ENDPOINT = `${BASE}api/dailyPl/plEntryApi.php`;
const PL_MASTER_ENDPOINT = `${BASE}api/dailyPl/plMasterApi.php`;

export const dailyPlApi = {
  getActiveLines: (team = 'ALL') => apiGet(PL_ENTRY_ENDPOINT, { action: 'get_active_lines', team }),
  readEntry: (entryDate, section = 'ALL', team = 'ALL') =>
    apiGet(PL_ENTRY_ENDPOINT, { action: 'read', entry_date: entryDate, section, team }),
  saveBatch: (entryDate, section, items) =>
    apiPost(PL_ENTRY_ENDPOINT, { action: 'save_batch', entry_date: entryDate, section, items }),
  toggleLock: (entryDate, section) =>
    apiPost(PL_ENTRY_ENDPOINT, { action: 'toggle_lock', entry_date: entryDate, section }),
  getWorkingDays: (year, month) => apiGet(PL_ENTRY_ENDPOINT, { action: 'get_working_days', year, month }),
  getTargetData: (year, month, section) =>
    apiGet(PL_ENTRY_ENDPOINT, { action: 'get_target_data', year, month, section }),
  saveTarget: (year, month, section, items) =>
    apiPost(PL_ENTRY_ENDPOINT, { action: 'save_target', year, month, section, items }),
  reportRange: (startDate, endDate, section = 'ALL') =>
    apiGet(PL_ENTRY_ENDPOINT, { action: 'report_range', start_date: startDate, end_date: endDate, section }),
  statementYearly: (year, section = 'ALL') =>
    apiGet(PL_ENTRY_ENDPOINT, { action: 'statement_yearly', year, section }),
  statementDaily: (year, month, section = 'ALL') =>
    apiGet(PL_ENTRY_ENDPOINT, { action: 'statement_daily', year, month, section }),
  getExchangeRate: (year, month) => apiGet(PL_ENTRY_ENDPOINT, { action: 'get_exchange_rate', year, month }),
  saveExchangeRate: (year, month, rate) =>
    apiPost(PL_ENTRY_ENDPOINT, { action: 'save_exchange_rate', year, month, rate }),
  getContainerRate: (year, month) => apiGet(PL_ENTRY_ENDPOINT, { action: 'get_container_rate', year, month }),
  saveContainerRate: (year, month, rate) =>
    apiPost(PL_ENTRY_ENDPOINT, { action: 'save_container_rate', year, month, rate }),
  calendarRead: (start, end) => apiGet(PL_ENTRY_ENDPOINT, { action: 'calendar_read', start, end }),
  calendarSave: (payload) => apiPost(PL_ENTRY_ENDPOINT, { action: 'calendar_save', ...payload }),
  calendarDelete: (date) => apiPost(PL_ENTRY_ENDPOINT, { action: 'calendar_delete', date }),
};

export const dailyPlMasterApi = {
  readStructure: (showInactive = false) =>
    apiGet(PL_MASTER_ENDPOINT, { action: 'read', show_inactive: showInactive ? 1 : 0 }),
  saveItem: (payload) => apiPost(PL_MASTER_ENDPOINT, { action: 'save', ...payload }),
  deleteItem: (id) => apiPost(PL_MASTER_ENDPOINT, { action: 'delete', id }),
  restoreItem: (id) => apiPost(PL_MASTER_ENDPOINT, { action: 'restore', id }),
  reorderItems: (items) => apiPost(PL_MASTER_ENDPOINT, { action: 'reorder', items }),
  importBatch: (data) => apiPost(PL_MASTER_ENDPOINT, { action: 'import_batch', data }),
};
