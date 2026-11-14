/**
 * Self-contained API client for Toolbox Auto Invoice & Packing List Management.
 */
import { apiGet, apiPost } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const INVOICE_ENDPOINT = `${BASE}api/autoInvoice/invoiceApi.php`;

export const getCompanyStampUrl = () => `${BASE}images/company_stamp.png`;

export const autoInvoiceApi = {
  getHistory: (params = {}) => apiGet(INVOICE_ENDPOINT, { action: 'get_history', ...params }),
  getVersions: (invoiceNo) => apiGet(INVOICE_ENDPOINT, { action: 'get_versions', invoice_no: invoiceNo }),
  getDetail: (id) => apiGet(INVOICE_ENDPOINT, { action: 'get_invoice_detail', id }),
  getByNo: (invoiceNo) => apiGet(INVOICE_ENDPOINT, { action: 'get_invoice_by_no', invoice_no: invoiceNo }),
  getExchangeRate: () => apiGet(INVOICE_ENDPOINT, { action: 'get_exchange_rate' }),
  getItemInfo: (sku) => apiGet(INVOICE_ENDPOINT, { action: 'get_item_info', sku }, { notifyError: false }),
  searchItems: (q) => apiGet(INVOICE_ENDPOINT, { action: 'search_items', q }, { notifyError: false }),
  getLastDefaults: () => apiGet(INVOICE_ENDPOINT, { action: 'get_last_invoice_defaults' }),
  importInvoice: (payload) => apiPost(INVOICE_ENDPOINT, { action: 'import_invoice', ...payload }, { timeout: 60000 }),
  updateStatus: (invoiceNo, status, remark = '') =>
    apiPost(INVOICE_ENDPOINT, { action: 'update_status', invoice_no: invoiceNo, status, remark }),
  restoreInvoice: (invoiceNo) => apiPost(INVOICE_ENDPOINT, { action: 'restore_invoice', invoice_no: invoiceNo }),
  updateDecimals: (payload) => apiPost(INVOICE_ENDPOINT, { action: 'update_decimal_settings', ...payload }),
  updateMemo: (invoiceNo, memo) => apiPost(INVOICE_ENDPOINT, { action: 'update_memo', invoice_no: invoiceNo, memo }),
};
