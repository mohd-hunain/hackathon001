import { useState, useEffect, useCallback } from 'react';
import {
  checkIsOnline,
  getQueue,
  getPendingCount,
  enqueueRequest,
  syncOfflineQueue,
  subscribeToQueue,
  setSimulateOffline,
  isSimulateOfflineActive,
} from '../services/offlineQueue';
import api from '../services/api';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(checkIsOnline);
  const [pendingQueue, setPendingQueue] = useState(getQueue);
  const [pendingCount, setPendingCount] = useState(getPendingCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [simulateOffline, setSimulateOfflineState] = useState(isSimulateOfflineActive);

  // Subscribe to reactive queue events
  useEffect(() => {
    const unsubscribe = subscribeToQueue(({ count, queue, isOnline: onlineState }) => {
      setPendingCount(count);
      setPendingQueue(queue);
      setIsOnline(onlineState);
      setSimulateOfflineState(isSimulateOfflineActive());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Trigger manual or programmatic sync
  const syncNow = useCallback(async () => {
    if (!checkIsOnline()) {
      return { offline: true, syncedCount: 0, failedCount: 0, remaining: pendingCount };
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [pendingCount]);

  // Toggle simulated offline mode
  const toggleSimulateOffline = useCallback(() => {
    const next = !isSimulateOfflineActive();
    setSimulateOffline(next);
    setSimulateOfflineState(next);
  }, []);

  /**
   * Submit a request with offline-first support
   * If online: sends normally to POST /api/requests
   * If offline or network error: saves payload locally with status PENDING_OFFLINE
   */
  const submitRequest = useCallback(
    async (payload) => {
      // 1. If currently offline or simulated offline
      if (!checkIsOnline()) {
        const queuedItem = enqueueRequest(payload);
        return {
          success: true,
          offline: true,
          data: queuedItem,
          message: `Request saved offline! Assigned status PENDING_OFFLINE. (${getPendingCount()} pending in local queue).`,
        };
      }

      // 2. If online: attempt normal network submission
      try {
        const res = await api.post('/requests', payload);
        return {
          success: true,
          offline: false,
          data: res.data?.data || res.data,
          message: 'Booking request sent and processed by central dispatch.',
        };
      } catch (err) {
        // 3. Fallback: if network is unreachable (no response or network error), queue offline
        if (!err.response || err.message === 'Network Error') {
          console.warn('Network unreachable. Enqueuing request locally in offline queue.', err);
          const queuedItem = enqueueRequest(payload);
          return {
            success: true,
            offline: true,
            data: queuedItem,
            message: `Connection lost. Request saved locally with status PENDING_OFFLINE. (${getPendingCount()} pending).`,
          };
        }

        // Standard validation or HTTP errors from backend
        throw err;
      }
    },
    []
  );

  return {
    isOnline,
    pendingQueue,
    pendingCount,
    isSyncing,
    syncNow,
    submitRequest,
    simulateOffline,
    toggleSimulateOffline,
  };
}

export default useOfflineQueue;
