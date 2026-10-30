import axios from 'axios';

/**
 * Standardized API client for Toolbox modules.
 *
 * Built on the global axios instance on purpose, so the AuthContext interceptors
 * (401 session-expiry redirect) and the X-CSRF-TOKEN default header keep applying.
 *
 * Contract: every call resolves to the server payload `{ success, data, message }`
 * and rejects with an `ApiError` carrying a Thai, user-presentable `message`.
 */

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

let errorNotifier = null;

/** Registered by FeedbackProvider so API failures can surface as toasts. */
export const registerErrorNotifier = (notifier) => {
  errorNotifier = notifier;
};

export class ApiError extends Error {
  constructor(message, { status = 0, payload = null, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.isNetworkError = isNetworkError;
  }
}

const STATUS_MESSAGES = {
  400: 'ข้อมูลที่ส่งไม่ถูกต้อง',
  401: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  403: 'ไม่มีสิทธิ์ดำเนินการ',
  404: 'ไม่พบข้อมูลหรือบริการที่ร้องขอ',
  409: 'ข้อมูลขัดแย้งกับรายการที่มีอยู่',
  422: 'ข้อมูลไม่ผ่านการตรวจสอบ',
  429: 'มีการเรียกใช้งานถี่เกินไป กรุณาลองใหม่ภายหลัง',
  500: 'เกิดข้อผิดพลาดภายในระบบ',
  502: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
  503: 'ระบบไม่พร้อมให้บริการชั่วคราว',
  504: 'เซิร์ฟเวอร์ตอบสนองช้าเกินกำหนด',
};

const OFFLINE_MESSAGE = 'ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง';
const TIMEOUT_MESSAGE = 'หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';

const toApiError = (error) => {
  if (error instanceof ApiError) return error;

  if (error.response) {
    const { status, data } = error.response;
    const serverMessage = data && typeof data === 'object' ? data.message : null;
    return new ApiError(serverMessage || STATUS_MESSAGES[status] || 'เกิดข้อผิดพลาดในการเรียกใช้งานระบบ', {
      status,
      payload: data,
    });
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError(TIMEOUT_MESSAGE, { isNetworkError: true });
  }
  return new ApiError(OFFLINE_MESSAGE, { isNetworkError: true });
};

const isRetryable = (method, apiError) => {
  const isIdempotent = ['get', 'head', 'options'].includes(method);
  const isTransient = apiError.isNetworkError || [502, 503, 504].includes(apiError.status);
  return isIdempotent && isTransient;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {import('axios').AxiosRequestConfig & { notifyError?: boolean }} config
 *   notifyError (default true) shows a toast on failure; set false when the caller renders its own message.
 */
export const request = async (config) => {
  const { notifyError = true, ...axiosConfig } = config;
  const method = (axiosConfig.method || 'get').toLowerCase();
  let attempt = 0;

  for (;;) {
    try {
      const response = await axios({
        withCredentials: true,
        timeout: DEFAULT_TIMEOUT_MS,
        ...axiosConfig,
        method,
      });
      return response.data;
    } catch (rawError) {
      const apiError = toApiError(rawError);
      if (attempt < MAX_RETRIES && isRetryable(method, apiError)) {
        attempt += 1;
        await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      if (notifyError && errorNotifier && apiError.status !== 401) {
        errorNotifier(apiError.message);
      }
      throw apiError;
    }
  }
};

export const apiGet = (url, params, options = {}) => request({ ...options, method: 'get', url, params });

export const apiPost = (url, data, options = {}) => request({ ...options, method: 'post', url, data });

/** Posts as application/x-www-form-urlencoded (legacy PHP endpoints reading $_POST). */
export const apiPostForm = (url, fields, options = {}) =>
  request({
    ...options,
    method: 'post',
    url,
    data: new URLSearchParams(fields),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(options.headers || {}) },
  });

