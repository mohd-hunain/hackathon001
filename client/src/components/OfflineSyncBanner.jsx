import React, { useState } from 'react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function OfflineSyncBanner({ onSynced = null }) {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    simulateOffline,
    toggleSimulateOffline,
  } = useOfflineQueue();

  const [notification, setNotification] = useState(null);

  const handleSyncClick = async () => {
    if (!isOnline) {
      setNotification({
        type: 'warning',
        text: 'Cannot sync while offline. Please connect to internet or turn off offline simulation.',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const res = await syncNow();
    if (res.syncedCount > 0) {
      setNotification({
        type: 'success',
        text: `Successfully synchronized ${res.syncedCount} offline request(s) to grid!`,
      });
      if (onSynced) onSynced(res);
    } else if (res.failedCount > 0) {
      setNotification({
        type: 'warning',
        text: `Synced ${res.syncedCount} requests, but ${res.failedCount} request(s) failed validation and remain in queue.`,
      });
    } else {
      setNotification({
        type: 'info',
        text: 'All requests are already synchronized.',
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Toast alert */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 600,
            fontSize: '0.9rem',
            backgroundColor:
              notification.type === 'success'
                ? '#10b981'
                : notification.type === 'warning'
                ? '#f59e0b'
                : '#0284c7',
            color: '#ffffff',
          }}
        >
          {notification.text}
        </div>
      )}

      <section className={`offline-sync-card ${pendingCount > 0 ? 'has-pending' : ''}`}>
        <div className="sync-info">
          <div className={`sync-icon-wrap ${pendingCount > 0 ? 'alert' : ''}`}>
            {pendingCount > 0 ? '⚠️' : '🔄'}
          </div>

          <div className="sync-details">
            <h4>
              Offline Sync Status:{' '}
              {pendingCount > 0 ? (
                <span style={{ color: '#d97706', fontWeight: 700 }}>
                  {pendingCount} Request(s) Pending Offline Sync
                </span>
              ) : (
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  All Requests Synced
                </span>
              )}
            </h4>

            <p style={{ marginTop: '2px' }}>
              {isOnline
                ? pendingCount > 0
                  ? `Internet connection detected. ${pendingCount} offline request(s) ready to send to POST /api/requests.`
                  : 'Connected to FarmGrid Central Dispatch. Requests submitted online are scheduled in real-time.'
                : 'Offline mode active. Requests are saved locally in localStorage with status PENDING_OFFLINE and will automatically sync when connectivity returns.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Simulated Offline Toggle for Demonstrations */}
          <button
            type="button"
            onClick={toggleSimulateOffline}
            className="btn btn-secondary btn-sm"
            title="Simulate losing network connectivity for demonstration"
          >
            {simulateOffline ? '🔌 Turn Online Sim' : '📡 Simulate Offline'}
          </button>

          {/* Sync Button */}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing || !isOnline}
              className="btn btn-primary btn-sm"
              id="btn-sync-offline-queue"
            >
              {isSyncing ? '⏳ Syncing One-by-One...' : `⚡ Sync ${pendingCount} Queued`}
            </button>
          )}

          {/* Online/Offline Status Indicator */}
          <div className={`conn-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="conn-dot"></span>
            {isOnline ? 'Online (Connected)' : 'Offline (Local Queue)'}
          </div>
        </div>
      </section>
    </div>
  );
}
