// transport-system/src/services/api.js
const basePathMatch = window.location.pathname.match(/^(.*\/transport-system)/i);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (basePathMatch ? `${basePathMatch[1]}/api` : '/transport-system/api');

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  
  // Try to parse JSON. Sometimes MES check_auth.php returns HTML if redirected.
  let result;
  try {
    result = await response.json();
  } catch (e) {
    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error('Invalid server response');
  }
  
  if (!result.success) {
    throw new Error(result.message || 'API Error');
  }
  
  return result.data;
}

export const authAPI = {
  getMe: () => fetchAPI('/me.php'),
};

export const masterAPI = {
  getFleet: () => fetchAPI('/master.php?type=fleet'),
  addFleet: (data) => fetchAPI('/master.php?type=fleet', { method: 'POST', body: JSON.stringify(data) }),
  deleteFleet: (id) => fetchAPI(`/master.php?type=fleet&id=${id}`, { method: 'DELETE' }),
  
  getRoutes: () => fetchAPI('/master.php?type=routes'),
  addRoute: (data) => fetchAPI('/master.php?type=routes', { method: 'POST', body: JSON.stringify(data) }),
  deleteRoute: (id) => fetchAPI(`/master.php?type=routes&id=${id}`, { method: 'DELETE' }),
  
  getTimeSlots: () => fetchAPI('/master.php?type=time-slots'),
  addTimeSlot: (data) => fetchAPI('/master.php?type=time-slots', { method: 'POST', body: JSON.stringify(data) }),
  deleteTimeSlot: (id) => fetchAPI(`/master.php?type=time-slots&id=${id}`, { method: 'DELETE' }),
  
  getDepartments: () => fetchAPI('/master.php?type=departments'),
  addDepartment: (data) => fetchAPI('/master.php?type=departments', { method: 'POST', body: JSON.stringify(data) }),
  deleteDepartment: (id) => fetchAPI(`/master.php?type=departments&id=${id}`, { method: 'DELETE' }),
  
  verifyEmployee: (empId) => fetchAPI(`/master/verify_employee.php?empId=${empId}`),
};

export const schedulesAPI = {
  getSchedules: () => fetchAPI('/schedules.php'),
  addSchedule: (data) => fetchAPI('/schedules.php', { method: 'POST', body: JSON.stringify(data) }),
  deleteSchedule: (id) => fetchAPI(`/schedules.php?id=${id}`, { method: 'DELETE' }),
  getBilling: (scheduleId) => fetchAPI(`/schedules/billing.php?scheduleId=${scheduleId}`),
};

export const bookingsAPI = {
  getBookings: async (params = {}) => {
    // Remove undefined and null values to prevent 'undefined' string in URL
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/bookings.php?${query}`);
  },
  addBooking: (data) => fetchAPI('/bookings.php', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id) => fetchAPI('/bookings.php', { method: 'PUT', body: JSON.stringify({ id, action: 'CANCEL' }) }),
  boardPassenger: (id) => fetchAPI('/bookings.php', { method: 'PUT', body: JSON.stringify({ id, action: 'BOARD' }) }),
  smartBoardPassenger: (data) => fetchAPI('/bookings.php', { method: 'PUT', body: JSON.stringify({ ...data, action: 'SMART_BOARD' }) }),
  assignBookingsToSchedule: (scheduleId, bookingIds) => fetchAPI('/bookings.php', { method: 'PUT', body: JSON.stringify({ action: 'ASSIGN_SCHEDULE', scheduleId, bookingIds }) }),
};
