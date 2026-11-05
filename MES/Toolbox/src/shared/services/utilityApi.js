import axios from 'axios';

const API_URL = `${import.meta.env.BASE_URL}api/utility/utilityApi.php`;

export const utilityApi = {
  /**
   * Fetch utility dashboard metrics, trends and meter statuses
   */
  getDashboard: async ({ startDate, endDate } = {}) => {
    const res = await axios.get(API_URL, {
      params: {
        action: 'get_dashboard',
        startDate,
        endDate
      },
      withCredentials: true
    });
    return res.data;
  },

  /**
   * Fetch TOU tariff rates (Peak, Off-Peak, LPG)
   */
  getTouRates: async () => {
    const res = await axios.get(API_URL, {
      params: { action: 'get_tou_rates' },
      withCredentials: true
    });
    return res.data;
  },

  /**
   * Save updated TOU tariff rates
   */
  saveTouRates: async (rates) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await axios.post(
      API_URL,
      {
        action: 'save_tou_rates',
        rates
      },
      {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      }
    );
    return res.data;
  },

  /**
   * Recalculate utility hourly aggregation for a specific date
   */
  recalculate: async (date) => {
    const res = await axios.post(
      API_URL,
      {
        action: 'recalculate',
        date
      },
      {
        withCredentials: true
      }
    );
    return res.data;
  }
};
