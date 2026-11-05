import axios from 'axios';

const API_URL = `${import.meta.env.BASE_URL}api/forklift/forkliftApi.php`;

export const forkliftApi = {
  /**
   * Fetch forklift dashboard and real-time fleet statuses
   */
  getDashboard: async () => {
    const res = await axios.get(API_URL, {
      params: { action: 'get_dashboard' },
      withCredentials: true
    });
    return res.data;
  },

  /**
   * Book a forklift (INSTANT walk-in or RESERVE advance)
   */
  bookForklift: async (payload) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      { action: 'book_forklift', ...payload },
      {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      }
    );
    return res.data;
  },

  /**
   * Start a reserved job
   */
  startJob: async (payload) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      { action: 'start_job', ...payload },
      {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      }
    );
    return res.data;
  },

  /**
   * Return forklift (updates end battery & park location)
   */
  returnForklift: async (payload) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      { action: 'return_forklift', ...payload },
      {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      }
    );
    return res.data;
  },

  /**
   * Fetch 24-hour schedule timeline
   */
  getTimeline: async () => {
    const res = await axios.get(API_URL, {
      params: { action: 'get_timeline' },
      withCredentials: true
    });
    return res.data;
  },

  /**
   * Fetch past completed booking history
   */
  getHistory: async (limit = 100) => {
    const res = await axios.get(API_URL, {
      params: { action: 'get_history', limit },
      withCredentials: true
    });
    return res.data;
  },

  /**
   * Save or update a forklift vehicle (Admin / Supervisor)
   */
  saveForklift: async (payload) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      { action: 'save_forklift', ...payload },
      {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      }
    );
    return res.data;
  },

  /**
   * Deactivate a forklift vehicle
   */
  deleteForklift: async (id) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      { action: 'delete_forklift', id },
      {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      }
    );
    return res.data;
  }
};
