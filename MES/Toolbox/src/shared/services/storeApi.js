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
      req_id: orderId,
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
  },

  /**
   * Cycle Count Audit History & ISO/IATF Certificate Data
   */
  getCycleCountHistory: async ({
    startDate = '',
    endDate = '',
    locationId = 'ALL',
    status = 'ALL',
    search = '',
    limit = 500
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_cycle_count_history',
      start_date: startDate,
      end_date: endDate,
      location_id: locationId,
      status,
      search,
      limit
    });
  },

  /**
   * Submit Tier 2 Blind Recount for flagged high-variance items
   */
  submitRecount: async ({ countId, recountQty, remark = '' }) => {
    return await apiPost(BASE_URL, {
      action: 'cc_submit_recount',
      count_id: countId,
      recount_qty: recountQty,
      remark
    });
  },

  /**
   * Scrap & Replacement: Get list of scrap/replacement requests with KPIs & pagination
   */
  getScrapRequests: async ({
    status = 'ALL',
    search = '',
    startDate = '',
    endDate = '',
    line = '',
    team = '',
    page = 1,
    limit = 100,
    exportData = false
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_scrap_requests',
      status,
      search,
      start_date: startDate,
      end_date: endDate,
      line,
      team,
      page,
      limit,
      export: exportData ? 'true' : undefined
    });
  },

  /**
   * Scrap & Replacement: Get Scrap Analytics Dashboard metrics & charts
   */
  getScrapDashboard: async ({
    status = 'ALL',
    search = '',
    startDate = '',
    endDate = '',
    line = '',
    team = ''
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_scrap_dashboard',
      status,
      search,
      start_date: startDate,
      end_date: endDate,
      line,
      team
    });
  },

  /**
   * Scrap & Replacement: Create new scrap/replacement request
   */
  createScrapRequest: async ({
    itemId,
    quantity,
    wipLocationId,
    storeLocationId,
    defectSource = 'SNC',
    reason = ''
  }) => {
    return await apiPost(BASE_URL, {
      action: 'create_request',
      item_id: itemId,
      quantity,
      wip_location_id: wipLocationId,
      store_location_id: storeLocationId,
      defect_source: defectSource,
      reason
    });
  },

  /**
   * Scrap & Replacement: Single Approve Request (Manual Approval Only)
   */
  approveScrapRequest: async (transferId) => {
    return await apiPost(BASE_URL, {
      action: 'approve_request',
      transfer_id: transferId
    });
  },

  /**
   * Scrap & Replacement: Single Reject Request
   */
  rejectScrapRequest: async (transferId, rejectReason = '') => {
    return await apiPost(BASE_URL, {
      action: 'reject_request',
      transfer_id: transferId,
      reject_reason: rejectReason
    });
  },

  /**
   * Scrap & Replacement: Bulk Approve Selected Requests (Manual Selection Only)
   */
  bulkApproveScrapRequests: async (transferIds = []) => {
    return await apiPost(BASE_URL, {
      action: 'bulk_approve_requests',
      transfer_ids: transferIds
    });
  },

  /**
   * Scrap & Replacement: Bulk Reject Selected Requests
   */
  bulkRejectScrapRequests: async (transferIds = [], rejectReason = '') => {
    return await apiPost(BASE_URL, {
      action: 'bulk_reject_requests',
      transfer_ids: transferIds,
      reject_reason: rejectReason
    });
  },

  /**
   * Store Order KDS: Fetch store requisition orders queue
   */
  getOrders: async ({
    status = 'ACTIVE',
    startDate = '',
    endDate = ''
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_orders',
      status,
      start_date: startDate,
      end_date: endDate
    });
  },

  /**
   * Store Order KDS: Fetch single requisition order details & items
   */
  getOrderDetails: async (reqId) => {
    return await apiGet(BASE_URL, {
      action: 'get_order_details',
      req_id: reqId
    });
  },

  /**
   * Store Order KDS: Accept order (transition NEW ORDER -> PREPARING)
   */
  acceptOrder: async (reqId) => {
    return await apiPost(BASE_URL, {
      action: 'accept_order',
      req_id: reqId
    });
  },

  /**
   * Store Order KDS: Reject order with reason
   */
  rejectOrder: async (reqId, reason = '') => {
    return await apiPost(BASE_URL, {
      action: 'reject_order',
      req_id: reqId,
      reason
    });
  },

  /**
   * Store Order KDS: Get available RM serial tags for FIFO/manual picking
   */
  getAvailableTagsForItem: async ({
    itemCode = '',
    itemId = null,
    locationId = 'STORE'
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_available_tags_for_item',
      item_code: itemCode,
      item_id: itemId,
      location_id: locationId
    });
  },

  /**
   * Store Order KDS: Confirm issue & deduct stock/tags
   */
  confirmIssue: async ({ reqId, reqNumber, items }) => {
    return await apiPost(BASE_URL, {
      action: 'confirm_issue',
      req_id: reqId,
      req_number: reqNumber,
      items: typeof items === 'string' ? items : JSON.stringify(items)
    });
  },

  /**
   * Store Order KDS: Fetch Waiting K2 PR summary
   */
  getK2Summary: async ({
    status = 'WAITING',
    startDate = '',
    endDate = ''
  } = {}) => {
    return await apiGet(BASE_URL, {
      action: 'get_k2_summary',
      status,
      start_date: startDate,
      end_date: endDate
    });
  },

  /**
   * Store Order KDS: Fetch Waiting K2 PR item requester breakdown
   */
  getK2ItemDetails: async ({
    itemCode,
    status = 'WAITING',
    startDate = '',
    endDate = ''
  }) => {
    return await apiGet(BASE_URL, {
      action: 'get_k2_item_details',
      item_code: itemCode,
      status,
      start_date: startDate,
      end_date: endDate
    });
  },

  /**
   * Store Order KDS: Submit K2 PR Reference Number
   */
  submitK2Pr: async ({ itemCode, k2PrNo }) => {
    return await apiPost(BASE_URL, {
      action: 'submit_k2_pr',
      item_code: itemCode,
      k2_pr_no: k2PrNo
    });
  },

  /**
   * Store PRD Material Return: Check tag before returning to Store
   */
  checkPrdReturnTag: async (serialNo) => {
    return await apiGet(BASE_URL, {
      action: 'check_prd_return_tag',
      serial_no: serialNo
    });
  },

  /**
   * Store PRD Material Return: Confirm return of unused RM tag from Production to Store
   */
  processPrdReturn: async ({
    serialNo,
    locationId,
    returnQty,
    reason = ''
  }) => {
    return await apiPost(BASE_URL, {
      action: 'process_prd_return',
      serial_no: serialNo,
      location_id: locationId,
      return_qty: returnQty,
      reason
    });
  }
};
