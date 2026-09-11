import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRequestById, cancelRequest, getOfflineQueue } from '../services/api';
import PriorityBreakdown from './PriorityBreakdown';

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      // If it's an offline local request
      if (id.startsWith('offline_')) {
        const queue = getOfflineQueue();
        const found = queue.find((item) => item._id === id);
        if (found) {
          setRequest(found);
          return;
        }
      }

      const res = await getRequestById(id);
      if (res && res.success) {
        setRequest(res.data);
      } else {
        setError(res?.message || 'Failed to fetch request details.');
      }
    } catch (err) {
      console.error('Error fetching request:', err);
      // Fallback check in offline queue
      const queue = getOfflineQueue();
      const found = queue.find((item) => item._id === id);
      if (found) {
        setRequest(found);
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          'Could not retrieve booking request from FarmGrid server.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  // Handle Cancel Request
  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) {
      return;
    }

    setCancelling(true);
    try {
      const res = await cancelRequest(id);
      if (res && res.success) {
        setRequest(res.data);
        showToast('Booking request has been cancelled successfully.');
      } else {
        showToast(res?.message || 'Failed to cancel request.', 'error');
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || 'Error cancelling request',
        'error'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <div className="empty-title">Loading Request Details...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="dashboard-container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <Link to="/requests">My Requests</Link>
          <span>/</span>
          <span className="current">Error</span>
        </nav>

        <div className="alert-banner error">
          <span>⚠️ {error || 'Booking request not found.'}</span>
        </div>

        <Link to="/requests" className="btn btn-secondary">
          ← Back to My Requests
        </Link>
      </div>
    );
  }

  const status = (request.status || 'PENDING').toUpperCase();
  const isCancellable = status !== 'CANCELLED' && status !== 'COMPLETED';

  // Format dates helper
  const formatDateTime = (d) => {
    if (!d) return 'Not yet allocated';
    return new Date(d).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

      {/* Breadcrumb Navigation */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <Link to="/requests">My Requests</Link>
        <span>/</span>
        <span className="current">Request #{String(request._id).slice(-6)}</span>
      </nav>

      {/* Header Section */}
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Booking Request Details
            </h1>
            <span className={`badge badge-${status.toLowerCase()}`}>
              {status}
            </span>
            {request.syncStatus === 'PENDING_OFFLINE' ? (
              <span className="conn-badge offline" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                ⚡ Pending Offline Sync
              </span>
            ) : (
              <span className="conn-badge online" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                ✓ Synced with Grid
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{request._id}</code>
            {' • '}Submitted on {formatDateTime(request.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/requests" className="btn btn-secondary btn-sm">
            ← Back to Requests
          </Link>
          {isCancellable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn btn-secondary btn-sm"
              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
              id="btn-cancel-request-details"
            >
              {cancelling ? 'Cancelling...' : '✕ Cancel Request (PATCH)'}
            </button>
          )}
        </div>
      </div>

      {/* Allocated Time Window Banner */}
      {request.allocatedStart && request.allocatedEnd ? (
        <div className="allocated-box">
          <div className="allocated-icon">✅</div>
          <div>
            <div className="allocated-title">Allocated Time Slot Confirmed</div>
            <div className="allocated-time-text">
              {formatDateTime(request.allocatedStart)} → {formatDateTime(request.allocatedEnd)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Resource dispatch has been assigned by FarmGrid Central Scheduler.
            </div>
          </div>
        </div>
      ) : (
        <div className="allocated-box pending">
          <div className="allocated-icon">⏳</div>
          <div>
            <div className="allocated-title">Allocation In Progress</div>
            <div className="allocated-time-text">
              Slot pending conflict check against other regional farmers during your window.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Details & Priority Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Left Column: Farm & Resource Information */}
        <div className="item-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            🌾 Farm & Requested Resource
          </h3>

          <div className="item-details" style={{ marginBottom: '16px' }}>
            <div>
              <div className="detail-label">TARGET FARM</div>
              <div className="detail-value">{request.farmId?.name || 'Registered Plot'}</div>
            </div>
            <div>
              <div className="detail-label">FARM LOCATION</div>
              <div className="detail-value">
                📍 {request.farmId?.location?.village || 'Local Village'}
              </div>
            </div>
            <div>
              <div className="detail-label">CROP TYPE</div>
              <div className="detail-value">{request.farmId?.cropType || 'Field Crop'}</div>
            </div>
            <div>
              <div className="detail-label">BIOLOGICAL STAGE</div>
              <div className="detail-value">{request.cropStage}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Resource Requirements
          </h4>
          <div className="item-details" style={{ marginBottom: '16px' }}>
            <div>
              <div className="detail-label">RESOURCE TYPE</div>
              <div className="detail-value">🚜 {request.resourceType}</div>
            </div>
            <div>
              <div className="detail-label">SPECIFIC RESOURCE</div>
              <div className="detail-value">{request.resourceId?.name || 'Any Compatible Unit'}</div>
            </div>
            <div>
              <div className="detail-label">REQUIRED DURATION</div>
              <div className="detail-value">⏱️ {request.requiredDurationMinutes} minutes</div>
            </div>
            <div>
              <div className="detail-label">DEPOT / HUB</div>
              <div className="detail-value">{request.resourceId?.location?.village || 'Regional Depot'}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Requested Time Window
          </h4>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
            <div><strong>Earliest Start:</strong> {formatDateTime(request.earliestStart)}</div>
            <div style={{ marginTop: '4px' }}><strong>Latest End:</strong> {formatDateTime(request.latestEnd)}</div>
          </div>

          {request.urgencyJustification && (
            <div style={{ marginTop: '16px' }}>
              <div className="detail-label">URGENCY JUSTIFICATION FROM FARMER</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', background: '#f1f5f9', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                "{request.urgencyJustification}"
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Priority Score & Human-Readable Decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Reusable Priority Breakdown */}
          <PriorityBreakdown
            priorityScore={request.priorityScore}
            priorityBreakdown={request.priorityBreakdown}
          />

          {/* Human-Readable Explanation Card */}
          <div className="item-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              📖 Transparent Decision Explanation
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {request.explanation || 'Decision explanation is prepared deterministically by FarmGrid priority scoring engine.'}
            </p>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Weather Risk Score: <strong>{request.weatherRiskScore || 0}/25</strong></span>
              <span>Constraint Severity: <strong>{request.resourceConstraintScore || 0}/5</strong></span>
              <span>Sync: <strong>{request.syncStatus}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
