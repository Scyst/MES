/**
 * Self-contained API client for Toolbox Sales Orders, Shipping Schedule, and RM Shortage Forecast.
 */
import { apiGet, apiPost } from './apiClient';

const BASE = import.meta.env.BASE_URL || '/iot-toolbox/sandbox-b9/Toolbox/';
const SALES_ENDPOINT = `${BASE}api/sales/salesOrdersApi.php`;
const SHIPPING_ENDPOINT = `${BASE}api/sales/shippingApi.php`;

export const salesOrdersApi = {
  read: (params = {}) => apiGet(SALES_ENDPOINT, { action: 'read', ...params }),
  getExchangeRate: () => apiGet(SALES_ENDPOINT, { action: 'get_exchange_rate' }),
  forecastRm: (params = {}) => apiGet(SALES_ENDPOINT, { action: 'forecast_rm', ...params }),
  createSingle: (payload) => apiPost(SALES_ENDPOINT, { action: 'create_single', ...payload }),
  updateCell: (id, field, value) => apiPost(SALES_ENDPOINT, { action: 'update_cell', id, field, value }),
  updateCheck: (id, field, checked) => apiPost(SALES_ENDPOINT, { action: 'update_check', id, field, checked }),
  reorderItems: (orderedIds) => apiPost(SALES_ENDPOINT, { action: 'reorder_items', orderedIds }),
  importJson: (rows) => apiPost(SALES_ENDPOINT, { action: 'import_json', data: rows }, { timeout: 60000 }),
  deleteSingle: (id) => apiPost(SALES_ENDPOINT, { action: 'delete_single', id }),
};

export const shippingApi = {
  read: (params = {}) => apiGet(SHIPPING_ENDPOINT, { action: 'read', ...params }),
  updateCell: (id, field, value) => apiPost(SHIPPING_ENDPOINT, { action: 'update_cell', id, field, value }),
  updateCheck: (id, field, checked) => apiPost(SHIPPING_ENDPOINT, { action: 'update_check', id, field, checked }),
  importJson: (rows) => apiPost(SHIPPING_ENDPOINT, { action: 'import_json', data: rows }, { timeout: 60000 }),
};
