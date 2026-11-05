import { apiGet, apiPost, request } from './apiClient';

const BASE_URL = 'api/store/storeApi.php';

export const storeApi = {
  /**
   * Fetch inventory dashboard with summary metrics and onhand item records
   */
  getInventoryDashboard: async ({
    page = 1,
    limit = 100,
    search = '',
    materialType = 'ALL',
    locationId = 'ALL',
    hideZero = false,
    sort = 'DEFAULT'
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_inventory_dashboard',
      page,
      limit,
      search,
      material_type: materialType,
      location_id: locationId,
      hide_zero: hideZero ? 'true' : 'false',
      sort
    });
  },

  /**
   * Fetch item location breakdown and details
   */
  getItemDetails: async (itemId, locationId = 'ALL', locationType = 'ALL') => {
    return await apiGet(BASE_URL, {
      action: 'get_item_details',
      item_id: itemId,
      location_id: locationId,
      location_type: locationType
    });
  },

  /**
   * Fetch pending cycle count records requiring Manager manual approval
   */
  getPendingCounts: async () => {
    return await apiGet(BASE_URL, { action: 'get_pending_counts' });
  },

  /**
   * Approve or reject a cycle count variance (STRICT MANUAL APPROVAL ONLY)
   */
  processCycleCountApproval: async ({
    countId,
    approvalAction, // 'APPROVE' or 'REJECT'
    selectedChoice = null,
    decisionReason = ''
  }) => {
    return await apiPost(BASE_URL, {
      action: 'approve_cycle_count',
      count_id: countId,
      approval_action: approvalAction,
      selected_choice: selectedChoice,
      decision_reason: decisionReason
    });
  },

  /**
   * Fetch Inventory Record Accuracy (IRA) and Zone Health Metrics
   */
  getZoneHealthMetrics: async ({ startDate = null, endDate = null } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_zone_health_metrics',
      start_date: startDate,
      end_date: endDate
    });
  },

  /**
   * Fetch all warehouse locations grouped by zone with active session status
   */
  getLocationZones: async () => {
    return await apiGet(BASE_URL, { action: 'get_location_zones' });
  },

  /**
   * Start or resume a cycle count session for a specific location
   */
  startCycleCountSession: async (locationId) => {
    return await apiPost(BASE_URL, {
      action: 'cc_start_session',
      location_id: locationId
    });
  },

  /**
   * Scan a tag during cycle count
   */
  scanTag: async ({
    sessionId,
    tagSerialNo,
    actualQty,
    isWrongLocation = false,
    remark = '',
    confirmDiff = false
  }) => {
    return await apiPost(BASE_URL, {
      action: 'cc_scan_tag',
      session_id: sessionId,
      tag_serial_no: tagSerialNo,
      actual_qty: actualQty,
      is_wrong_location: isWrongLocation ? 1 : 0,
      remark,
      confirm_diff: confirmDiff ? 1 : 0
    });
  },

  /**
   * Finish and submit cycle count session for manager review
   */
  finishCycleCountSession: async (sessionId, remarks = '') => {
    return await apiPost(BASE_URL, {
      action: 'cc_finish_session',
      session_id: sessionId,
      remarks
    });
  },

  /**
   * Reset session: delete all counted details and reset to PENDING
   */
  resetCycleCountSession: async (sessionId) => {
    return await apiPost(BASE_URL, {
      action: 'cc_reset_session',
      session_id: sessionId
    });
  },

  /**
   * Cancel empty session: delete session if nothing was counted
   */
  cancelEmptySession: async (sessionId) => {
    return await apiPost(BASE_URL, {
      action: 'cc_cancel_empty_session',
      session_id: sessionId
    });
  },

  /**
   * Update location zones (Batch Assignment)
   */
  updateLocationZones: async (locationIds, zoneName) => {
    return await apiPost(BASE_URL, {
      action: 'update_location_zones',
      location_ids: locationIds,
      zone_name: zoneName
    });
  },

  /**
   * Fetch material categories
   */
  getMaterialCategories: async () => {
    return await apiGet(BASE_URL, { action: 'get_material_categories' });
  },

  /**
   * Fetch stock transactions ledger
   */
  getStockLedger: async ({
    page = 1,
    limit = 50,
    search = '',
    transactionType = 'ALL',
    startDate = '',
    endDate = ''
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_stock_ledger',
      page,
      limit,
      search,
      tx_type: transactionType,
      start_date: startDate,
      end_date: endDate
    });
  }
};
