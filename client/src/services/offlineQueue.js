import api from './api';

const OFFLINE_QUEUE_KEY = 'farmgrid_offline_requests';
const OFFLINE_SIM_KEY = 'farmgrid_simulate_offline';
const QUEUE_EVENT_NAME = 'farmgrid:offline_queue_changed';

// Listeners set for reactive UI updates
const listeners = new Set();

const notifyListeners = () => {
  const event = new CustomEvent(QUEUE_EVENT_NAME, {
    detail: {
      count: getQueue().length,
      queue: getQueue(),
      isOnline: checkIsOnline(),
    },
  });
  window.dispatchEvent(event);
  listeners.forEach((listener) => {
    try {
      listener({
        count: getQueue().length,
        queue: getQueue(),
        isOnline: checkIsOnline(),
      });
    } catch (e) {
      console.error('Error in offline queue listener', e);
    }
  });
};

/**
 * Check if the browser is online, considering simulated offline mode
 */
export const checkIsOnline = () => {
  const isSimulated = localStorage.getItem(OFFLINE_SIM_KEY) === 'true';
  if (isSimulated) return false;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

/**
 * Toggle simulated offline mode (useful for hackathon live demonstrations)
 */
export const setSimulateOffline = (simulate) => {
  if (simulate) {
    localStorage.setItem(OFFLINE_SIM_KEY, 'true');
  } else {
    localStorage.removeItem(OFFLINE_SIM_KEY);
  }
  notifyListeners();

  // If returning online, auto-sync queued items
  if (!simulate && navigator.onLine) {
    syncOfflineQueue();
  }
};

export const isSimulateOfflineActive = () => {
  return localStorage.getItem(OFFLINE_SIM_KEY) === 'true';
};

/**
 * Retrieve current offline queue from localStorage
 * Safe against parse errors
 */
export const getQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read offline queue from localStorage', err);
    return [];
  }
};

/**
 * Get count of pending offline requests
 */
export const getPendingCount = () => {
  return getQueue().length;
};

/**
 * Enqueue a new request payload locally
 * Assigns local status PENDING_OFFLINE
 * Strips any passwords, auth tokens, or secrets
 */
export const enqueueRequest = (rawPayload) => {
  const queue = getQueue();

  // Whitelist agricultural fields only to ensure NO passwords/secrets are stored
  const sanitizedPayload = {
    _id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    farmId: rawPayload.farmId,
    resourceId: rawPayload.resourceId || undefined,
    resourceType: String(rawPayload.resourceType || '').trim(),
    earliestStart: rawPayload.earliestStart,
    latestEnd: rawPayload.latestEnd,
    requiredDurationMinutes: Number(rawPayload.requiredDurationMinutes) || 60,
    cropStage: rawPayload.cropStage || 'GROWING',
    urgencyJustification: String(rawPayload.urgencyJustification || '').trim(),
    weatherRiskScore: Number(rawPayload.weatherRiskScore) || 0,
    resourceConstraintScore: Number(rawPayload.resourceConstraintScore) || 0,
    status: 'PENDING',
    syncStatus: 'PENDING_OFFLINE',
    createdAt: new Date().toISOString(),
    isLocalOffline: true,
  };

  queue.push(sanitizedPayload);

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save request to localStorage', err);
    throw new Error('Local storage is full or unavailable.');
  }

  notifyListeners();
  return sanitizedPayload;
};

/**
 * Remove a specific successfully synced request from the queue
 */
export const removeQueueItem = (id) => {
  const currentQueue = getQueue();
  const filtered = currentQueue.filter((item) => item._id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  notifyListeners();
};

/**
 * Clear the entire offline queue
 */
export const clearQueue = () => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  notifyListeners();
};

/**
 * Synchronize offline requests one by one to POST /api/requests
 * - Removes only successfully synced requests
 * - Keeps failed requests in the queue
 * - Updates the UI
 */
let isSyncInProgress = false;

export const syncOfflineQueue = async () => {
  if (isSyncInProgress) {
    return { isSyncing: true, syncedCount: 0, failedCount: 0, remaining: getPendingCount() };
  }

  if (!checkIsOnline()) {
    console.warn('Cannot sync offline queue while offline.');
    return { syncedCount: 0, failedCount: 0, remaining: getPendingCount(), offline: true };
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, remaining: 0 };
  }

  isSyncInProgress = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    // Process items one by one sequentially
    for (const item of queue) {
      // If connection dropped during synchronization, stop processing remaining
      if (!checkIsOnline()) {
        break;
      }

      try {
        const payload = {
          farmId: item.farmId,
          resourceId: item.resourceId || undefined,
          resourceType: item.resourceType,
          earliestStart: item.earliestStart,
          latestEnd: item.latestEnd,
          requiredDurationMinutes: item.requiredDurationMinutes,
          cropStage: item.cropStage,
          urgencyJustification: item.urgencyJustification,
          weatherRiskScore: item.weatherRiskScore,
          resourceConstraintScore: item.resourceConstraintScore,
          syncStatus: 'SYNCED',
        };

        // Post to official endpoint
        await api.post('/requests', payload);

        // Remove ONLY this successfully synced item from storage
        removeQueueItem(item._id);
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync offline request ${item._id}:`, err);
        // Keep failed request in the queue for later retry
        failedCount++;
      }
    }
  } finally {
    isSyncInProgress = false;
    notifyListeners();
  }

  return {
    syncedCount,
    failedCount,
    remaining: getPendingCount(),
  };
};

/**
 * Subscribe to queue changes and online events
 */
export const subscribeToQueue = (callback) => {
  listeners.add(callback);
  // Send current state immediately
  callback({
    count: getQueue().length,
    queue: getQueue(),
    isOnline: checkIsOnline(),
  });

  return () => {
    listeners.delete(callback);
  };
};

// Global browser online/offline event listener setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[FarmGrid OfflineQueue] Browser online event detected. Starting sync...');
    notifyListeners();
    syncOfflineQueue();
  });

  window.addEventListener('offline', () => {
    console.log('[FarmGrid OfflineQueue] Browser offline event detected.');
    notifyListeners();
  });
}
