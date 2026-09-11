import axios from 'axios';

// Default demo JWT token for FARMER role to ensure dashboard works seamlessly
export const DEMO_FARMER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZTliMTExMTExMTExMTExMTExMTExMSIsInJvbGUiOiJGQVJNRVIiLCJlbWFpbCI6ImZhcm1lckBmYXJtZ3JpZC5pbyIsImlhdCI6MTczMTM1MDAwMH0.signature';

// Default demo JWT token for RESOURCE_OWNER role
export const DEMO_OWNER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZTliMjIyMjIyMjIyMjIyMjIyMjIyMiIsInJvbGUiOiJSRVNPVVJDRV9PV05FUiIsImVtYWlsIjoib3duZXJAZmFybWdyaWQuaW8iLCJpYXQiOjE3ODkwOTE0ODMsImV4cCI6MTc5MTY4MzQ4M30.Xq_1JuTnI54x9UZROJQBjfHIYxrq3NQ-At5yzdzjhjs';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  if (config.headers.Authorization) {
    return config;
  }
  const storedToken = localStorage.getItem('farmgrid_token');
  const storedRole = localStorage.getItem('farmgrid_role');
  const isOwnerContext =
    storedRole === 'RESOURCE_OWNER' ||
    (config.url && (config.url.startsWith('/resources/my') || config.url.includes('/schedule/'))) ||
    (typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/owner'));

  const token = storedToken || (isOwnerContext ? (localStorage.getItem('farmgrid_owner_token') || DEMO_OWNER_TOKEN) : DEMO_FARMER_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import {
  getQueue,
  enqueueRequest,
  removeQueueItem,
  clearQueue,
  syncOfflineQueue,
  checkIsOnline,
} from './offlineQueue';

// Re-export modular offline queue helpers for backwards compatibility
export const getOfflineQueue = getQueue;
export const saveToOfflineQueue = enqueueRequest;
export const removeOfflineItem = removeQueueItem;
export const clearOfflineQueue = clearQueue;
export const syncOfflineRequests = syncOfflineQueue;

// --- API SERVICES ---

// Farms
export const getMyFarms = async () => {
  const res = await api.get('/farms/my');
  return res.data;
};

export const createFarm = async (farmData) => {
  const res = await api.post('/farms', farmData);
  return res.data;
};

export const updateFarm = async (farmId, farmData) => {
  const res = await api.patch(`/farms/${farmId}`, farmData);
  return res.data;
};

// Resources
export const getResources = async (params = {}) => {
  const res = await api.get('/resources', { params });
  return res.data;
};

export const getMyResources = async () => {
  const res = await api.get('/resources/my', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('farmgrid_owner_token') || DEMO_OWNER_TOKEN}`,
    },
  });
  return res.data;
};

export const createResource = async (resourceData) => {
  const res = await api.post('/resources', resourceData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('farmgrid_owner_token') || DEMO_OWNER_TOKEN}`,
    },
  });
  return res.data;
};

export const updateResource = async (id, resourceData) => {
  const res = await api.patch(`/resources/${id}`, resourceData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('farmgrid_owner_token') || DEMO_OWNER_TOKEN}`,
    },
  });
  return res.data;
};

export const deleteResource = async (id) => {
  const res = await api.delete(`/resources/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('farmgrid_owner_token') || DEMO_OWNER_TOKEN}`,
    },
  });
  return res.data;
};

// Schedules
export const getResourceSchedule = async (resourceId) => {
  const res = await api.get(`/schedule/resource/${resourceId}`);
  return res.data;
};

// Requests
export const getMyRequests = async () => {
  const res = await api.get('/requests/my');
  return res.data;
};

export const getRequestById = async (id) => {
  const res = await api.get(`/requests/${id}`);
  return res.data;
};

export const cancelRequest = async (id) => {
  const res = await api.patch(`/requests/${id}/cancel`);
  return res.data;
};

export const createRequest = async (requestData, isSimulatedOffline = false) => {
  // If offline or simulated offline, store locally in localStorage queue
  if (!checkIsOnline() || isSimulatedOffline) {
    const offlineItem = enqueueRequest(requestData);
    const count = getQueue().length;
    return {
      success: true,
      data: offlineItem,
      message: `Request saved offline! Assigned status PENDING_OFFLINE. (${count} request${count > 1 ? 's' : ''} currently queued in offline storage).`,
      offline: true,
      pendingCount: count,
    };
  }

  try {
    const res = await api.post('/requests', requestData);
    return res.data;
  } catch (err) {
    // If network failure occurs, fall back to offline queue
    if (!err.response || err.message === 'Network Error') {
      const offlineItem = enqueueRequest(requestData);
      const count = getQueue().length;
      return {
        success: true,
        data: offlineItem,
        message: `Network offline. Request saved locally with status PENDING_OFFLINE. (${count} pending in local queue).`,
        offline: true,
        pendingCount: count,
      };
    }
    throw err;
  }
};

export default api;
