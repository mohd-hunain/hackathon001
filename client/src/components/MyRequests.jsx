import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyRequests, cancelRequest, getOfflineQueue } from '../services/api';
import PriorityBreakdown from './PriorityBreakdown';
import OfflineSyncBanner from './OfflineSyncBanner';

const STATUS_FILTERS = ['ALL', 'PENDING', 'SCHEDULED', 'ALLOCATED', 'DISRUPTED', 'CANCELLED'];

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [cancellingId, setCancellingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const offline = getOfflineQueue();
      setOfflineQueue(offline);

      const res = await getMyRequests();
      if (res && res.success) {
        setRequests(res.data || []);
      } else {
        setError(res?.message || 'Failed to load booking requests.');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      // Fallback: at least show offline queue if network fails
      const offline = getOfflineQueue();
      setOfflineQueue(offline);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Could not fetch requests from FarmGrid server.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle Cancel Request
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await cancelRequest(id);
      if (res && res.success) {
        showToast('Booking request cancelled successfully.');
        setRequests((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: 'CANCELLED' } : r))
        );
      } else {
        showToast(res?.message || 'Failed to cancel request.', 'error');
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || 'Error cancelling request',
        'error'
      );
    } finally {
      setCancellingId(null);
    }
  };

  // Combine offline pending requests with server requests
  const combinedRequests = [...offlineQueue, ...requests];

  // Filtering
  const filteredRequests = combinedRequests.filter((req) => {
    const q = searchQuery.toLowerCase();
    const farmName = req.farmId?.name || '';
    const resourceName = req.resourceType || '';
    const explanation = req.explanation || '';

    const matchesSearch =
      farmName.toLowerCase().includes(q) ||
      resourceName.toLowerCase().includes(q) ||
      explanation.toLowerCase().includes(q);

    const matchesStatus =
      selectedStatus === 'ALL' || (req.status || 'PENDING') === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const formatWindow = (start, end) => {
    if (!start || !end) return 'Unspecified window';
    return `${new Date(start).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} → ${new Date(end).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {toast && (
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
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <span className="current">My Requests</span>
      </nav>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            📋 My Booking Requests
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Track allocation status, transparent priority scores, schedules, and decision explanations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchRequests}
            className="btn btn-secondary btn-sm"
            title="Refresh requests status"
          >
            🔄 Refresh
          </button>
          <Link to="/requests/new" className="btn btn-primary" id="btn-create-new-request">
            ⚡ Submit New Request
          </Link>
        </div>
      </div>

      {/* Offline Synchronization Banner */}
      <OfflineSyncBanner onSynced={fetchRequests} />

      {/* Filter and Search */}
      <div className="filter-container">
        <div className="search-input-wrap">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            placeholder="Search requests by farm name, resource type, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-chips-list">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            STATUS:
          </span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`filter-chip ${selectedStatus === s ? 'active' : ''}`}
              onClick={() => setSelectedStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-banner error">
          <span>⚠️ <strong>Notice:</strong> {error}</span>
          <button onClick={fetchRequests} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <div className="empty-title">Loading Booking Requests...</div>
          <div className="empty-desc">Fetching transparent priority allocations.</div>
        </div>
      ) : combinedRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Resource Requests Submitted Yet</div>
          <div className="empty-desc">
            Submit your first agricultural machinery or irrigation request to enter the central coordination queue.
          </div>
          <Link
            to="/requests/new"
            className="btn btn-primary"
            style={{ marginTop: '16px', display: 'inline-flex' }}
          >
            ⚡ Submit First Request
          </Link>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No matching requests found</div>
          <div className="empty-desc">
            No requests matched "{searchQuery}" with status "{selectedStatus}".
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '16px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {filteredRequests.map((req) => {
            const status = (req.status || 'PENDING').toUpperCase();
            const isCancellable = status !== 'CANCELLED' && status !== 'COMPLETED';

            return (
              <div key={req._id} className="item-card" id={`request-card-${req._id}`}>
                <div>
                  <div className="item-card-header">
                    <div>
                      <div className="item-title">
                        🚜 {req.resourceType}
                        {req.resourceId?.name && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '6px' }}>
                            ({req.resourceId.name})
                          </span>
                        )}
                      </div>
                      <div className="item-subtitle">
                        🌾 Farm: <strong>{req.farmId?.name || 'Registered Farm'}</strong>
                        {req.farmId?.location?.village && ` • 📍 ${req.farmId.location.village}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={`badge badge-${status.toLowerCase()}`}>
                        {status}
                      </span>
                      {req.syncStatus === 'PENDING_OFFLINE' ? (
                        <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                          ⚡ Pending Offline Sync
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Allocated Time Slot (if confirmed) */}
                  {req.allocatedStart && req.allocatedEnd && (
                    <div className="allocated-box" style={{ padding: '8px 12px', margin: '10px 0' }}>
                      <span style={{ fontSize: '18px' }}>✅</span>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>
                          ALLOCATED TIME SLOT
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600 }}>
                          {formatWindow(req.allocatedStart, req.allocatedEnd)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Core Details Grid */}
                  <div className="item-details" style={{ margin: '10px 0' }}>
                    <div>
                      <div className="detail-label">DURATION</div>
                      <div className="detail-value">{req.requiredDurationMinutes} mins</div>
                    </div>
                    <div>
                      <div className="detail-label">CROP STAGE</div>
                      <div className="detail-value">{req.cropStage}</div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div className="detail-label">REQUESTED WINDOW</div>
                      <div className="detail-value" style={{ fontSize: '0.8rem' }}>
                        🕒 {formatWindow(req.earliestStart, req.latestEnd)}
                      </div>
                    </div>
                  </div>

                  {/* Priority Breakdown Component (Compact mode) */}
                  <div style={{ margin: '12px 0' }}>
                    <PriorityBreakdown
                      priorityScore={req.priorityScore}
                      priorityBreakdown={req.priorityBreakdown}
                      compact={true}
                    />
                  </div>

                  {/* Human-Readable Explanation */}
                  {req.explanation && (
                    <div className="explanation-text" style={{ fontSize: '0.82rem', marginTop: '8px' }}>
                      📖 <strong>Explanation:</strong> {req.explanation}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="card-actions">
                  <Link
                    to={`/requests/${req._id}`}
                    className="btn btn-secondary btn-sm"
                    id={`btn-view-request-${req._id}`}
                  >
                    🔍 View Full Details
                  </Link>

                  {isCancellable && (
                    <button
                      onClick={() => handleCancel(req._id)}
                      disabled={cancellingId === req._id}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#b91c1c', borderColor: '#fecaca', marginLeft: 'auto' }}
                      id={`btn-cancel-request-${req._id}`}
                    >
                      {cancellingId === req._id ? 'Cancelling...' : '✕ Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
