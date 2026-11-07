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
  },

  /**
   * Material Requisition: Get items catalog
   */
  getCatalog: async ({
    category = 'ALL',
    subCategory = 'ALL',
    search = '',
    sort = 'DEFAULT',
    page = 1
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_catalog',
      category,
      sub_category: subCategory,
      search,
      sort,
      page
    });
  },

  /**
   * Material Requisition: Master data (WIP locations, items, user line)
   */
  getMasterData: async () => {
    return await apiGet(BASE_URL, { action: 'get_master_data' });
  },

  /**
   * Material Requisition: Active jobs for line fulfillment
   */
  getActiveJobs: async (line = '') => {
    return await apiGet(BASE_URL, {
      action: 'get_active_jobs_for_fulfillment',
      line
    });
  },

  /**
   * Material Requisition: Submit requisition request
   */
  submitRequisition: async ({
    cart,
    remark = '',
    requestType = 'STOCK',
    reservationNumber = '',
    internalJobNo = '',
    destinationLocationId = null
  }) => {
    return await apiPost(BASE_URL, {
      action: 'submit_requisition',
      cart,
      remark,
      request_type: requestType,
      reservation_number: reservationNumber,
      internal_job_no: internalJobNo,
      destination_location_id: destinationLocationId
    });
  },

  /**
   * Material Requisition: Get my submitted orders
   */
  getMyOrders: async ({ startDate = '', endDate = '' } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_my_orders',
      start_date: startDate,
      end_date: endDate
    });
  },

  /**
   * Material Requisition: Get my order details by ID
   */
  getMyOrderDetails: async (reqId) => {
    return await apiGet(BASE_URL, {
      action: 'get_my_order_details',
      req_id: reqId
    });
  },

  /**
   * Material Requisition: Cancel pending order
   */
  cancelMyOrder: async (orderId) => {
    return await apiPost(BASE_URL, {
      action: 'cancel_my_order',
      order_id: orderId
    });
  },

  /**
   * RM Receiving: Get RM history / tags list with KPIs and pagination
   */
  getRmHistory: async ({
    startDate = '',
    endDate = '',
    search = '',
    status = 'ALL',
    page = 1,
    limit = 50,
    exportData = false
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_rm_history',
      start_date: startDate,
      end_date: endDate,
      search,
      status,
      page,
      limit,
      export: exportData ? 'true' : undefined
    });
  },

  /**
   * RM Receiving: Get tags data for printing
   */
  getPrintTags: async (serials = []) => {
    return await apiPost(BASE_URL, {
      action: 'get_print_tags',
      serials: Array.isArray(serials) ? serials.join(',') : serials
    });
  },

  /**
   * RM Receiving: Update print count
   */
  updatePrintStatus: async (serials = []) => {
    return await apiPost(BASE_URL, {
      action: 'update_print_status',
      serials: JSON.stringify(serials)
    });
  },

  /**
   * RM Receiving: Receive scanned tag into warehouse stock
   */
  receiveScannedTag: async ({ barcode, locationId }) => {
    return await apiPost(BASE_URL, {
      action: 'receive_scanned_tag',
      barcode,
      location_id: locationId
    });
  },

  /**
   * RM Receiving: Bulk receive tags into location
   */
  bulkReceiveTags: async ({ serials, locationId }) => {
    return await apiPost(BASE_URL, {
      action: 'bulk_receive_tags',
      serials: JSON.stringify(serials),
      location_id: locationId
    });
  },

  /**
   * RM Receiving: Delete a single tag
   */
  deleteTag: async (serialNo) => {
    return await apiPost(BASE_URL, {
      action: 'delete_tag',
      serial_no: serialNo
    });
  },

  /**
   * RM Receiving: Delete bulk tags
   */
  deleteBulkTags: async (serials) => {
    return await apiPost(BASE_URL, {
      action: 'delete_bulk_tags',
      serials: JSON.stringify(serials)
    });
  },

  /**
   * RM Receiving: Trace tag lifecycle and history
   */
  traceTag: async (serialNo) => {
    return await apiGet(BASE_URL, {
      action: 'trace_tag_v2',
      serial_no: serialNo
    });
  }
};
