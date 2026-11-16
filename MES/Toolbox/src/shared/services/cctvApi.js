import { apiGet, apiPost } from './apiClient';

const API_URL = 'api/cctv/cctvApi.php';

/**
 * CCTV Downloader & Loading Report Video Link API service.
 */
export const cctvApi = {
  getCapabilities: () => apiGet(API_URL, { action: 'get_capabilities' }),

  listFiles: () => apiGet(API_URL, { action: 'list_files' }),

  linkLoading: (date) => apiGet(API_URL, { action: 'link_loading', date }),

  checkStatus: (cameraIp) => apiPost(API_URL, { action: 'check_status', camera_ip: cameraIp }),

  previewCamera: (cameraIp, channel = 1) =>
    apiPost(API_URL, { action: 'preview', camera_ip: cameraIp, channel }),

  startDownload: ({ cameraIp, channel = 1, jobs }) =>
    apiPost(API_URL, {
      action: 'start_download',
      camera_ip: cameraIp,
      channel,
      jobs,
    }),

  deleteFile: (filename) => apiPost(API_URL, { action: 'delete_file', filename }),

  getStreamUrl: (filename, download = false) =>
    `${API_URL}?action=stream_file&file=${encodeURIComponent(filename)}${download ? '&download=1' : ''}`,
};
