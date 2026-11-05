import { apiGet, apiPost, request } from './apiClient';

const BASE_URL = 'api/documentCenter/documentCenterAPI.php';
const VIEW_URL = 'api/documentCenter/view_document.php';

export const documentCenterApi = {
  /**
   * Fetch documents and folders
   */
  getDocuments: async (page = 1, limit = 30, search = '', folderPath = '') => {
    return await apiGet(BASE_URL, {
      action: 'get_documents',
      page,
      limit,
      search,
      folderPath,
    });
  },

  /**
   * Get complete hierarchical folder list for pickers
   */
  getFolderTree: async () => {
    return await apiGet(BASE_URL, { action: 'get_folder_tree' });
  },

  /**
   * Create a new folder
   */
  createFolder: async (folderName, parentPath = '') => {
    return await apiPost(BASE_URL, {
      action: 'create_folder',
      folder_name: folderName,
      parent_path: parentPath,
    });
  },

  /**
   * Upload a new document file (FormData)
   */
  uploadDocument: async (formData) => {
    if (!formData.has('action')) {
      formData.append('action', 'upload');
    }
    return await request({
      method: 'post',
      url: BASE_URL,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Revise an existing document with a new file version (FormData)
   */
  reviseDocument: async (formData) => {
    if (!formData.has('action')) {
      formData.append('action', 'revise');
    }
    return await request({
      method: 'post',
      url: BASE_URL,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Rename a document or folder
   */
  renameItem: async ({ id, item_type, old_name, new_name, category }) => {
    return await apiPost(BASE_URL, {
      action: 'rename',
      id,
      item_type,
      old_name,
      new_name,
      category,
    });
  },

  /**
   * Move document or update description
   */
  updateDocument: async ({ document_id, category, description }) => {
    return await apiPost(BASE_URL, {
      action: 'update',
      document_id,
      category,
      description,
    });
  },

  /**
   * Delete documents / folders with password verification
   */
  deleteDocuments: async (docIds, password) => {
    return await apiPost(BASE_URL, {
      action: 'delete',
      docIds,
      password,
    });
  },

  /**
   * Helper to build safe document view / stream URL
   */
  getViewUrl: (id, download = false) => {
    return `${VIEW_URL}?id=${id}${download ? '&download=1' : ''}`;
  },
};
