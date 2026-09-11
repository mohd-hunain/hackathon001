import axios from 'axios';

// Default demo JWT token for FARMER role to ensure dashboard works seamlessly
const DEMO_FARMER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZTliMTExMTExMTExMTExMTExMTExMSIsInJvbGUiOiJGQVJNRVIiLCJlbWFpbCI6ImZhcm1lckBmYXJtZ3JpZC5pbyIsImlhdCI6MTczMTM1MDAwMH0.signature';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmgrid_token') || DEMO_FARMER_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- OFFLINE SYNC QUEUE HELPER (Rule 577-594 of FARMGRID_RULES.md) ---
const OFFLINE_QUEUE_KEY = 'farmgrid_offline_requests';

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading offline queue', e);
    return [];
  }
};

export const saveToOfflineQueue = (requestData) => {
  const queue = getOfflineQueue();
  const offlineItem = {
    ...requestData,
    _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    status: 'PENDING',
    syncStatus: 'PENDING_OFFLINE',
    createdAt: new Date().toISOString(),
    isLocalOffline: true,
  };
  queue.push(offlineItem);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return offlineItem;
};

export const clearOfflineQueue = () => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
};

export const removeOfflineItem = (id) => {
  const queue = getOfflineQueue().filter((item) => item._id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

// Synchronize all pending offline requests to the backend
export const syncOfflineRequests = async () => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      const payload = {
        farmId: item.farmId,
        resourceId: item.resourceId || undefined,
        resourceType: item.resourceType,
        earliestStart: item.earliestStart,
        latestEnd: item.latestEnd,
        requiredDurationMinutes: Number(item.requiredDurationMinutes),
        cropStage: item.cropStage,
        urgencyJustification: item.urgencyJustification,
        weatherRiskScore: item.weatherRiskScore,
        resourceConstraintScore: item.resourceConstraintScore,
        syncStatus: 'SYNCED',
      };

      await api.post('/requests', payload);
      syncedCount++;
    } catch (err) {
      console.error('Sync failed for item:', item, err);
      failedCount++;
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  return { syncedCount, failedCount };
};

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

// Resources
export const getResources = async (params = {}) => {
  const res = await api.get('/resources', { params });
  return res.data;
};

// Requests
export const getMyRequests = async () => {
  const res = await api.get('/requests/my');
  return res.data;
};

export const createRequest = async (requestData, isSimulatedOffline = false) => {
  // If offline or simulated offline, store locally in localStorage queue
  if (!navigator.onLine || isSimulatedOffline) {
    const offlineItem = saveToOfflineQueue(requestData);
    return {
      success: true,
      data: offlineItem,
      message: 'Request saved offline. Will automatically sync when online.',
      offline: true,
    };
  }

  try {
    const res = await api.post('/requests', requestData);
    return res.data;
  } catch (err) {
    // If network failure occurs, fall back to offline queue
    if (!err.response) {
      const offlineItem = saveToOfflineQueue(requestData);
      return {
        success: true,
        data: offlineItem,
        message: 'Network offline. Request saved locally for automatic sync.',
        offline: true,
      };
    }
    throw err;
  }
};

export default api;
