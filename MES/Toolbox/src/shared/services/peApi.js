import { apiGet, apiPost } from './apiClient';

const WO_URL = 'api/pe/workOrderApi.php';
const MACHINE_URL = 'api/pe/machineApi.php';
const PARTS_URL = 'api/pe/sparePartsApi.php';
const REQ_URL = 'api/pe/peRequestApi.php';
const UPLOAD_URL = 'api/pe/peUploadApi.php';

/**
 * Builds an authenticated Toolbox URL for PE work-order / machine / spare-part images
 * stored in the shared MES uploads folder.
 */
export function getPeImageUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const cleaned = rawPath.replace(/\\/g, '/').replace(/^(\.\.\/)+/, '').replace(/^\/+/, '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('api/pe/peUploadApi.php')) return cleaned;
  if (/^data:image\//i.test(cleaned)) return cleaned;
  return `${UPLOAD_URL}?action=view_image&path=${encodeURIComponent(cleaned)}`;
}

/**
 * Client-side canvas compression & optional rotation to prevent oversized mobile camera payloads.
 * Always outputs JPEG <= ~1200px wide unless PNG/WebP is already tiny.
 */
export function compressPeImageToBase64(file, { maxSide = 1200, quality = 0.82, rotateDeg = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('ไม่พบไฟล์รูปภาพ'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์ภาพไม่ถูกต้องหรือเสียหาย'));
      img.onload = () => {
        const radians = (rotateDeg * Math.PI) / 180;
        const swap = Math.abs(rotateDeg % 180) === 90;
        let targetW = img.width;
        let targetH = img.height;
        if (Math.max(targetW, targetH) > maxSide) {
          const scale = maxSide / Math.max(targetW, targetH);
          targetW = Math.round(targetW * scale);
          targetH = Math.round(targetH * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = swap ? targetH : targetW;
        canvas.height = swap ? targetW : targetH;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export const peApi = {
  // --- Work Orders & Notifications ---
  getWorkOrders: (params = {}) => apiGet(WO_URL, { action: 'get_work_orders', ...params }),
  createWorkOrder: (payload) => apiPost(WO_URL, { action: 'create_wo', ...payload }),
  updateWorkOrder: (payload) => apiPost(WO_URL, { action: 'update_wo', ...payload }),
  updateWorkOrderStatus: (woId, status) => apiPost(WO_URL, { action: 'update_status_only', wo_id: woId, status }),
  quickAcceptWorkOrder: (woId) => apiPost(WO_URL, { action: 'quick_accept', wo_id: woId }),
  quickStartWorkOrder: (woId) => apiPost(WO_URL, { action: 'quick_start', wo_id: woId }),
  revertWorkOrderStart: (woId) => apiPost(WO_URL, { action: 'revert_start', wo_id: woId }),
  quickCloseWorkOrder: (payload) => apiPost(WO_URL, { action: 'quick_close', ...payload }),
  deleteWorkOrder: (woId) => apiPost(WO_URL, { action: 'delete_wo', wo_id: woId }),
  restoreWorkOrder: (woId) => apiPost(WO_URL, { action: 'restore_wo', wo_id: woId }),
  getMachinesAndTechnicians: () => apiGet(WO_URL, { action: 'get_machines_list' }),
  getNotifications: () => apiGet(WO_URL, { action: 'get_notifications' }, { notifyError: false }),
  clearNotifications: () => apiPost(WO_URL, { action: 'clear_notifications' }),

  // --- Machines Master ---
  getMachines: (params = {}) => apiGet(MACHINE_URL, { action: 'get_machines', ...params }),
  getMachineDetail: (id) => apiGet(MACHINE_URL, { action: 'get_machine', id }),
  saveMachine: (payload) => apiPost(MACHINE_URL, { action: 'save_machine', ...payload }),
  toggleMachineStatus: (machineId, status) => apiPost(MACHINE_URL, { action: 'toggle_status', machine_id: machineId, status }),
  deleteMachine: (machineId) => apiPost(MACHINE_URL, { action: 'delete_machine', machine_id: machineId }),
  restoreMachine: (machineId) => apiPost(MACHINE_URL, { action: 'restore_machine', machine_id: machineId }),
  getLines: () => apiGet(MACHINE_URL, { action: 'get_lines' }),

  // --- Spare Parts & MRO Inventory ---
  getOnhand: () => apiGet(PARTS_URL, { action: 'get_onhand' }),
  getMasterData: () => apiGet(PARTS_URL, { action: 'get_master_data' }),
  processTransaction: (payload) => apiPost(PARTS_URL, { action: 'process_transaction', ...payload }),
  getAvailableParts: () => apiGet(PARTS_URL, { action: 'get_available_parts' }),
  getWoParts: (woId) => apiGet(PARTS_URL, { action: 'get_wo_parts', wo_id: woId }),
  issueParts: (payload) => apiPost(PARTS_URL, { action: 'issue_parts', ...payload }),
  deleteWoPart: (transactionId, woId) => apiPost(PARTS_URL, { action: 'delete_wo_part', transaction_id: transactionId, wo_id: woId }),
  getMtItems: () => apiGet(PARTS_URL, { action: 'get_mt_items' }),
  importMtItems: (rows) => apiPost(PARTS_URL, { action: 'import_mt_items', data: rows }),
  saveMtItem: (payload) => apiPost(PARTS_URL, { action: 'save_mt_item', ...payload }),
  toggleMtItem: (itemId) => apiPost(PARTS_URL, { action: 'toggle_mt_item', item_id: itemId }),
  transferStock: (payload) => apiPost(PARTS_URL, { action: 'transfer_stock', ...payload }),
  cancelReceive: (payload) => apiPost(PARTS_URL, { action: 'cancel_receive', ...payload }),
  adjustStock: (payload) => apiPost(PARTS_URL, { action: 'adjust_stock', ...payload }),
  getTransactions: (limit = 200) => apiGet(PARTS_URL, { action: 'get_transactions', limit }),

  // --- Operator Stop Request / Downtime / Safety Hazard / Pre-Op ---
  getDowntime: (params = {}) => apiGet(REQ_URL, { action: 'get_downtime', ...params }),
  addDowntime: (payload) => apiPost(REQ_URL, { action: 'add_downtime', ...payload }),
  endDowntime: (downtimeId) => apiPost(REQ_URL, { action: 'end_downtime', downtime_id: downtimeId }),
  submitHazardReport: (payload) => apiPost(REQ_URL, { action: 'submit_hazard_report', ...payload }),
  getPreopChecklist: (machineCode) => apiGet(REQ_URL, { action: 'get_checklist', machine_code: machineCode }),
  submitPreop: (payload) => apiPost(REQ_URL, { action: 'submit_preop', ...payload }),

  // --- Shared Image Upload ---
  uploadImageBase64: (base64, folder = 'pe_images', prefix = 'PE_') =>
    apiPost(UPLOAD_URL, { action: 'upload_image', image_base64: base64, folder, prefix }),
};
