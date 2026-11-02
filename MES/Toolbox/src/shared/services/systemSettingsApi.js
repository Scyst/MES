import { apiGet, apiPost } from './apiClient';

const BASE = `${import.meta.env.BASE_URL}api/systemSettings`;
const LOCATIONS_API = `${BASE}/locationsManage.php`;
const ITEM_API = `${BASE}/itemMasterManage.php`;
const BOM_API = `${BASE}/bomManager.php`;
const SAP_VALUATION_API = `${BASE}/sapValuationManage.php`;
const SAP_SYNC_API = `${BASE}/sync_sap_items.php`;

export const systemSettingsApi = {
  // ================= Locations =================
  getLocations: async () => {
    return apiGet(LOCATIONS_API, { action: 'read', _t: Date.now() });
  },

  saveLocation: async (data) => {
    return apiPost(`${LOCATIONS_API}?action=save`, data);
  },

  deleteLocation: async (id) => {
    return apiPost(`${LOCATIONS_API}?action=delete`, { location_id: id });
  },

  // ================= Item Master =================
  getItems: async (params = {}) => {
    return apiGet(ITEM_API, { action: 'read', ...params, _t: Date.now() });
  },

  getItemBySap: async (sapNo) => {
    return apiGet(ITEM_API, { action: 'get_item', sap_no: sapNo, _t: Date.now() });
  },

  saveItem: async (data) => {
    return apiPost(`${ITEM_API}?action=save`, data);
  },

  deleteItem: async (itemId) => {
    return apiPost(`${ITEM_API}?action=delete`, { item_id: itemId });
  },

  restoreItem: async (itemId) => {
    return apiPost(`${ITEM_API}?action=restore`, { item_id: itemId });
  },

  getItemRoutes: async (itemId) => {
    return apiGet(ITEM_API, { action: 'read_routes', item_id: itemId, _t: Date.now() });
  },

  saveRoute: async (data) => {
    return apiPost(`${ITEM_API}?action=save_route`, data);
  },

  getLines: async () => {
    return apiGet(ITEM_API, { action: 'read_lines', _t: Date.now() });
  },

  getModels: async (search = '') => {
    return apiGet(ITEM_API, { action: 'read_models', search, _t: Date.now() });
  },

  bulkImportItems: async (items) => {
    return apiPost(`${ITEM_API}?action=bulk_import`, { items });
  },

  getItemAuditTrail: async (itemId, limit = 50) => {
    return apiGet(ITEM_API, { action: 'audit_trail', item_id: itemId, limit, _t: Date.now() });
  },

  // ================= Line Schedules =================
  getSchedules: async (params = {}) => {
    return apiGet(ITEM_API, { action: 'read_schedules', ...params, _t: Date.now() });
  },

  saveSchedule: async (data) => {
    return apiPost(`${ITEM_API}?action=save_schedule`, data);
  },

  deleteSchedule: async (id) => {
    return apiPost(`${ITEM_API}?action=delete_schedule`, { id });
  },

  // ================= BOM Manager =================
  getFgsWithBom: async () => {
    return apiGet(BOM_API, { action: 'get_fgs_with_bom', _t: Date.now() });
  },

  getFgsWithoutBom: async (search = '') => {
    return apiGet(BOM_API, { action: 'get_fgs_without_bom', search, _t: Date.now() });
  },

  getBomVersions: async (fgItemId) => {
    return apiGet(BOM_API, { action: 'get_bom_versions', fg_item_id: fgItemId, _t: Date.now() });
  },

  getBomComponents: async (fgItemId, version = '') => {
    return apiGet(BOM_API, { action: 'get_bom_components', fg_item_id: fgItemId, version, _t: Date.now() });
  },

  getWhereUsed: async (componentItemId) => {
    return apiGet(BOM_API, { action: 'get_where_used', component_item_id: componentItemId, _t: Date.now() });
  },

  addBomComponent: async (data) => {
    return apiPost(`${BOM_API}?action=add_component`, data);
  },

  updateBomComponent: async (data) => {
    return apiPost(`${BOM_API}?action=update_component`, data);
  },

  deleteBomComponent: async (bomId) => {
    return apiPost(`${BOM_API}?action=delete_component`, { bom_id: bomId });
  },

  deleteFullBom: async (fgItemId, bomVersion) => {
    return apiPost(`${BOM_API}?action=delete_full_bom`, { fg_item_id: fgItemId, bom_version: bomVersion });
  },

  rollupBomCost: async (fgItemId, bomVersion) => {
    return apiPost(`${BOM_API}?action=rollup_cost`, { fg_item_id: fgItemId, bom_version: bomVersion });
  },

  createBomRevision: async (data) => {
    return apiPost(`${BOM_API}?action=create_revision`, data);
  },

  approveBomRevision: async (fgItemId, bomVersion) => {
    return apiPost(`${BOM_API}?action=approve_revision`, { fg_item_id: fgItemId, bom_version: bomVersion });
  },

  copyBom: async (data) => {
    return apiPost(`${BOM_API}?action=copy_bom`, data);
  },

  // ================= SAP Valuation & Sync =================
  getSapValuation: async () => {
    return apiGet(SAP_VALUATION_API, { action: 'read', _t: Date.now() });
  },

  syncSapCosts: async (sapNos = []) => {
    return apiPost(`${SAP_VALUATION_API}?action=sync_costs`, { sap_nos: sapNos });
  },

  previewSapSync: async () => {
    return apiGet(SAP_SYNC_API, { action: 'preview', _t: Date.now() });
  },

  executeSapSync: async (selectedSapNos = []) => {
    return apiPost(`${SAP_SYNC_API}?action=sync`, { selected_sap_nos: selectedSapNos });
  }
};

