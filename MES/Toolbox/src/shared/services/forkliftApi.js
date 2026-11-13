import axios from 'axios';

const API_URL = `${import.meta.env.BASE_URL}api/forklift/forkliftApi.php`;
const HARDWARE_ENDPOINT_PATH = `${import.meta.env.BASE_URL}api/forklift/hardwareTracking.php`;

const postAction = async (action, payload = {}, timeout = 15000) => {
  const res = await axios.post(
    API_URL,
    { action, ...payload },
    {
      withCredentials: true,
      timeout
    }
  );
  return res.data;
};

const getAction = async (action, params = {}, timeout = 15000) => {
  const res = await axios.get(API_URL, {
    params: { action, ...params },
    withCredentials: true,
    timeout
  });
  return res.data;
};

export const forkliftApi = {
  /**
   * Fetch forklift dashboard and real-time fleet statuses
   */
  getDashboard: async () => getAction('get_dashboard'),

  /**
   * Fetch lightweight real-time coordinates for live spatial tracking
   */
  getRealtime: async () => getAction('get_realtime'),

  /**
   * Fetch single forklift status & booking details by code or id (QR Scan parity)
   */
  getSingleForklift: async ({ code = '', id = 0 } = {}) =>
    getAction('get_single_forklift', { code, id }),

  /**
   * Fetch historical tracking trail points for snail-trail / playback
   */
  getTrackingHistory: async ({ code, mode = 'minutes', mins = 60, limit = 150 }) =>
    getAction('get_tracking_history', { code, mode, mins, limit }),

  /**
   * Fetch SQL-aggregated spatial density heatmap buckets
   */
  getHeatmap: async ({ window = '24h', forkliftId = 0 } = {}) =>
    getAction('get_heatmap', { window, forklift_id: forkliftId }, 25000),

  /**
   * Fetch registered Wi-Fi AP fingerprinting zones
   */
  getZones: async () => getAction('get_zones'),

  /**
   * Save or update a Wi-Fi AP zone coordinate (Admin / Supervisor)
   */
  saveZone: async (payload) => postAction('save_zone', payload),

  /**
   * Book a forklift (INSTANT walk-in or RESERVE advance)
   */
  bookForklift: async (payload) => postAction('book_forklift', payload),

  /**
   * Start a reserved job
   */
  startJob: async (payload) => postAction('start_job', payload),

  /**
   * Return forklift (updates end battery & park location)
   */
  returnForklift: async (payload) => postAction('return_forklift', payload),

  /**
   * Report vehicle defect / optionally place into MAINTENANCE
   */
  reportIssue: async (payload) => postAction('report_issue', payload),

  /**
   * Fetch 24-hour schedule timeline
   */
  getTimeline: async () => getAction('get_timeline'),

  /**
   * Fetch past completed booking history
   */
  getHistory: async (limit = 100) => getAction('get_history', { limit }),

  /**
   * Save or update a forklift vehicle (Admin / Supervisor)
   */
  saveForklift: async (payload) => postAction('save_forklift', payload),

  /**
   * Deactivate a forklift vehicle (Admin / Supervisor)
   */
  deleteForklift: async (id) => postAction('delete_forklift', { id }),

  /**
   * Build QR scan target URL for SPA hash router
   */
  buildQrScanUrl: (code) => {
    const cleanCode = String(code || '').trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${import.meta.env.BASE_URL}#/forklift?tab=scan&code=${encodeURIComponent(cleanCode)}`;
  },

  /**
   * Build ESP32 IoT gateway URL for hardware documentation/diagnostics
   */
  getHardwareEndpointUrl: () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${HARDWARE_ENDPOINT_PATH}`;
  }
};
