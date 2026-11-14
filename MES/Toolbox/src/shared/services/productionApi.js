import { apiGet, apiPost } from './apiClient';

const PROD_URL = 'api/production/productionApi.php';
const JOB_URL = 'api/production/jobApi.php';
const LABEL_URL = 'api/production/transferLabelApi.php';
const SCAN_URL = 'api/production/scanBarcodeApi.php';

export const productionApi = {
  // --- Production Entry & Inventory Reports ---
  getInitialData: () => apiGet(PROD_URL, { action: 'get_initial_data' }),

  executeProduction: (payload) =>
    apiPost(PROD_URL, { action: 'execute_production', ...payload }),

  executeReceipt: (payload) =>
    apiPost(PROD_URL, { action: 'execute_receipt', ...payload }),

  getProductionHistory: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_production_history', ...params }),

  getReceiptHistory: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_receipt_history', ...params }),

  getAllTransactions: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_all_transactions', ...params }),

  getProductionSummary: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_production_summary', ...params }),

  getReceiptSummary: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_receipt_history_summary', ...params }),

  getHourlyCounts: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_production_hourly_counts', ...params }),

  getTransactionDetails: (transactionId) =>
    apiGet(PROD_URL, { action: 'get_transaction_details', transaction_id: transactionId }),

  updateTransaction: (payload) =>
    apiPost(PROD_URL, { action: 'update_transaction', ...payload }),

  deleteTransaction: (transactionId, jobId = null) =>
    apiPost(PROD_URL, { action: 'delete_transaction', transaction_id: transactionId, job_id: jobId }),

  getWipOnhandReport: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_wip_onhand_report', ...params }),

  getWipReportByLot: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_wip_report_by_lot', ...params }),

  getVarianceReport: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_production_variance_report', ...params }),

  getVarianceDetails: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_variance_details', ...params }),

  getStockInventoryReport: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_stock_inventory_report', ...params }),

  getStockDetailsByItem: (itemId) =>
    apiGet(PROD_URL, { action: 'get_stock_details_by_item', item_id: itemId }),

  adjustSingleStock: (payload) =>
    apiPost(PROD_URL, { action: 'adjust_single_stock', ...payload }),

  getStockOnhand: (itemId, locationId) =>
    apiGet(PROD_URL, { action: 'get_stock_onhand', item_id: itemId, location_id: locationId }),

  getEmployeeDailySummary: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_employee_daily_summary', ...params }),

  getTeamUsers: () => apiGet(PROD_URL, { action: 'get_team_users' }),

  getActiveLineUsers: (params = {}) =>
    apiGet(PROD_URL, { action: 'get_active_line_users', ...params }),

  // --- Live Job Queue (KDS) ---
  getJobLocations: () => apiGet(JOB_URL, { action: 'get_locations' }),

  getJobItems: () => apiGet(JOB_URL, { action: 'get_items' }),

  getActiveJobs: (locationId = 'ALL') =>
    apiGet(JOB_URL, { action: 'get_active_jobs', location_id: locationId }),

  getAllJobs: (params = {}) =>
    apiGet(JOB_URL, { action: 'get_all_jobs', ...params }),

  createJob: (payload) =>
    apiPost(JOB_URL, { action: 'create_job', ...payload }),

  startJob: (jobId, ignoreSapWarning = false) =>
    apiPost(JOB_URL, { action: 'start_job', job_id: jobId, ignore_sap_warning: ignoreSapWarning }),

  pauseJob: (jobId) =>
    apiPost(JOB_URL, { action: 'pause_job', job_id: jobId }),

  recordJobOutput: (payload) =>
    apiPost(JOB_URL, { action: 'record_output', ...payload }),

  deleteJobTxn: (txnId, jobId = null) =>
    apiPost(JOB_URL, { action: 'delete_txn', txn_id: txnId, job_id: jobId }),

  closeJob: (jobId) =>
    apiPost(JOB_URL, { action: 'close_job', job_id: jobId }),

  editJob: (payload) =>
    apiPost(JOB_URL, { action: 'edit_job', ...payload }),

  deleteJob: (jobId) =>
    apiPost(JOB_URL, { action: 'delete_job', job_id: jobId }),

  reopenJob: (jobId) =>
    apiPost(JOB_URL, { action: 'reopen_job', job_id: jobId }),

  reorderQueue: (jobIds) =>
    apiPost(JOB_URL, { action: 'reorder_queue', job_ids: jobIds }),

  getJobLogs: (jobNo) =>
    apiGet(JOB_URL, { action: 'get_job_logs', job_no: jobNo }),

  // --- Thermal Tag Printer & Transfer Orders ---
  searchLabelItems: (q) => apiGet(LABEL_URL, { action: 'search_items', q }),

  getLabelHistory: (params = {}) =>
    apiGet(LABEL_URL, { action: 'get_label_history', ...params }),

  createBatchLabels: (payload) =>
    apiPost(LABEL_URL, { action: 'create_batch_transfer_orders', ...payload }),

  getTransferDetails: (transferId) =>
    apiGet(LABEL_URL, { action: 'get_transfer_details', transfer_id: transferId }),

  getLabelsByRange: (payload) =>
    apiPost(LABEL_URL, { action: 'get_labels_by_range', ...payload }),

  updateLabel: (payload) =>
    apiPost(LABEL_URL, { action: 'update_label', ...payload }),

  updateBatchLabels: (payload) =>
    apiPost(LABEL_URL, { action: 'update_batch_labels', ...payload }),

  cancelLabel: (transferUuid) =>
    apiPost(LABEL_URL, { action: 'cancel_label', transfer_uuid: transferUuid }),

  cancelBatchLabels: (payload) =>
    apiPost(LABEL_URL, { action: 'cancel_batch_labels', ...payload }),

  confirmTransfer: (payload) =>
    apiPost(LABEL_URL, { action: 'confirm_transfer', ...payload }),

  reverseTransfer: (transferUuid) =>
    apiPost(LABEL_URL, { action: 'reverse_transfer', transfer_uuid: transferUuid }),

  executeScanSale: (transferUuid) =>
    apiPost(LABEL_URL, { action: 'execute_scan_sale', transfer_uuid: transferUuid }),

  getPendingReceive: (params = {}) =>
    apiGet(LABEL_URL, { action: 'get_pending_receive', ...params }),

  getPendingSell: (params = {}) =>
    apiGet(LABEL_URL, { action: 'get_pending_sell', ...params }),

  bulkConfirmTransfer: (transferUuids, toLocationId = null) =>
    apiPost(LABEL_URL, { action: 'bulk_confirm_transfer', transfer_uuids: transferUuids, to_location_id: toLocationId }),

  bulkExecuteScanSale: (transferUuids) =>
    apiPost(LABEL_URL, { action: 'bulk_execute_scan_sale', transfer_uuids: transferUuids }),

  // --- Scan Barcode Terminal ---
  getScanLocations: () => apiGet(SCAN_URL, { action: 'get_locations' }),

  getScanProduct: (barcode) =>
    apiGet(SCAN_URL, { action: 'get_product', barcode }),

  getScanLogs: (params = {}) =>
    apiGet(SCAN_URL, { action: 'get_logs', ...params }),

  saveScan: (payload) =>
    apiPost(SCAN_URL, { action: 'save_scan', ...payload }),
};
