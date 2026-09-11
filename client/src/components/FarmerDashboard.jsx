import React, { useState, useEffect } from 'react';
import {
  getMyFarms,
  createFarm,
  getResources,
  getMyRequests,
  createRequest,
  getOfflineQueue,
  syncOfflineRequests,
} from '../services/api';

export default function FarmerDashboard() {
  // State
  const [farms, setFarms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [resources, setResources] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('farms'); // 'farms' | 'requests'

  // Modals
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [selectedResourceForRequest, setSelectedResourceForRequest] = useState(null);

  // Form States
  const [farmForm, setFarmForm] = useState({
    name: '',
    latitude: '12.9716',
    longitude: '77.5946',
    village: 'Kengeri Village',
    cropType: 'Wheat',
    cropStage: 'GROWING',
  });

  const [requestForm, setRequestForm] = useState({
    farmId: '',
    resourceId: '',
    resourceType: 'Tractor',
    earliestStart: '',
    latestEnd: '',
    requiredDurationMinutes: 120,
    cropStage: 'GROWING',
    urgencyJustification: '',
    weatherRiskScore: 10,
    resourceConstraintScore: 4,
  });

  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Listen to network changes
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Internet connection restored. Syncing offline requests...', 'info');
      await handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Network connection lost. Operating in Offline Mode.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize initial datetime-local values for requestForm
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1 hr
    const end = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +5 hrs

    const toLocalISO = (d) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    setRequestForm((prev) => ({
      ...prev,
      earliestStart: toLocalISO(start),
      latestEnd: toLocalISO(end),
    }));
  }, []);

  // Fetch data
  const loadData = async () => {
    try {
      setLoading(true);
      const queue = getOfflineQueue();
      setOfflineQueue(queue);

      if (isOnline && !simulateOffline) {
        try {
          const farmsRes = await getMyFarms();
          if (farmsRes.success) setFarms(farmsRes.data || []);
        } catch (e) {
          console.warn('Could not fetch farms from server', e);
        }

        try {
          const reqRes = await getMyRequests();
          if (reqRes.success) setRequests(reqRes.data || []);
        } catch (e) {
          console.warn('Could not fetch requests from server', e);
        }

        try {
          const resRes = await getResources();
          if (resRes.success) setResources(resRes.data || []);
        } catch (e) {
          console.warn('Could not fetch resources from server', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOnline, simulateOffline]);

  // Handle Offline Sync
  const handleSync = async () => {
    if (!isOnline || simulateOffline) {
      showToast('Cannot sync while offline. Switch to Online mode first.', 'warning');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncOfflineRequests();
      setOfflineQueue(getOfflineQueue());
      await loadData();
      if (result.syncedCount > 0) {
        showToast(`Successfully synced ${result.syncedCount} offline request(s)!`, 'success');
      } else if (result.failedCount > 0) {
        showToast(`Sync completed with ${result.failedCount} failed request(s).`, 'warning');
      } else {
        showToast('All requests are already up to date.', 'info');
      }
    } catch (err) {
      showToast('Error syncing requests: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Combine online requests with offline pending requests
  const combinedRequests = [...offlineQueue, ...requests];

  // Calculated Metrics
  const numFarms = farms.length;
  const pendingCount = combinedRequests.filter((r) => r.status === 'PENDING').length;
  const scheduledCount = combinedRequests.filter((r) => r.status === 'SCHEDULED').length;
  const allocatedCount = combinedRequests.filter((r) => r.status === 'ALLOCATED').length;
  const disruptedCount = combinedRequests.filter((r) => r.status === 'DISRUPTED').length;

  // Handle Farm Submit
  const handleAddFarm = async (e) => {
    e.preventDefault();
    try {
      const lat = parseFloat(farmForm.latitude);
      const lng = parseFloat(farmForm.longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        alert('Latitude must be a valid number between -90 and 90');
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        alert('Longitude must be a valid number between -180 and 180');
        return;
      }

      const payload = {
        name: farmForm.name,
        location: {
          latitude: lat,
          longitude: lng,
          village: farmForm.village,
        },
        cropType: farmForm.cropType,
        cropStage: farmForm.cropStage,
      };

      const res = await createFarm(payload);
      if (res.success) {
        showToast('Farm added successfully!');
        setShowAddFarmModal(false);
        setFarmForm({
          name: '',
          latitude: '12.9716',
          longitude: '77.5946',
          village: '',
          cropType: 'Wheat',
          cropStage: 'GROWING',
        });
        await loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add farm');
    }
  };

  // Handle Request Submit
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      if (!requestForm.farmId) {
        alert('Please select a farm');
        return;
      }

      const start = new Date(requestForm.earliestStart);
      const end = new Date(requestForm.latestEnd);

      if (start >= end) {
        alert('Earliest Start must be before Latest End');
        return;
      }

      const windowMins = Math.floor((end.getTime() - start.getTime()) / 60000);
      const dur = parseInt(requestForm.requiredDurationMinutes, 10);
      if (dur > windowMins) {
        alert(`Required duration (${dur} mins) exceeds the time window (${windowMins} mins)`);
        return;
      }

      const payload = {
        farmId: requestForm.farmId,
        resourceId: requestForm.resourceId || undefined,
        resourceType: requestForm.resourceType,
        earliestStart: start.toISOString(),
        latestEnd: end.toISOString(),
        requiredDurationMinutes: dur,
        cropStage: requestForm.cropStage,
        urgencyJustification: requestForm.urgencyJustification,
        weatherRiskScore: Number(requestForm.weatherRiskScore) || 10,
        resourceConstraintScore: Number(requestForm.resourceConstraintScore) || 4,
      };

      const res = await createRequest(payload, simulateOffline);
      if (res.success) {
        if (res.offline) {
          showToast('Request saved offline! Will sync automatically when connected.', 'warning');
        } else {
          showToast('Resource request submitted successfully!');
        }
        setShowCreateRequestModal(false);
        setSelectedResourceForRequest(null);
        await loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create request');
    }
  };

  const handleOpenRequestModalForResource = (resource) => {
    setSelectedResourceForRequest(resource);
    setRequestForm((prev) => ({
      ...prev,
      resourceId: resource._id,
      resourceType: resource.type,
    }));
    setShowResourcesModal(false);
    setShowCreateRequestModal(true);
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
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
                : notification.type === 'error'
                ? '#ef4444'
                : '#0284c7',
            color: '#ffffff',
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-icon">🌱</div>
          <div>
            <div className="brand-title">
              FarmGrid
              <span className="brand-badge">Farmer Portal</span>
            </div>
            <div className="brand-subtitle">
              Agricultural Resource Coordination Under Scarcity
            </div>
          </div>
        </div>

        <div className="header-controls">
          {/* Simulated Offline Toggle */}
          <button
            onClick={() => {
              const next = !simulateOffline;
              setSimulateOffline(next);
              showToast(
                next
                  ? 'Simulated Offline Mode ACTIVATED. Requests will queue locally.'
                  : 'Simulated Offline Mode DEACTIVATED. Online connectivity restored.',
                next ? 'warning' : 'success'
              );
            }}
            className="btn btn-secondary btn-sm"
            title="Toggle simulated offline mode for hackathon demonstrations"
          >
            {simulateOffline ? '🔌 Exit Offline Sim' : '📡 Simulate Offline'}
          </button>

          {/* Real/Simulated Connection Indicator */}
          <div className={`conn-badge ${isOnline && !simulateOffline ? 'online' : 'offline'}`}>
            <span className="conn-dot"></span>
            {isOnline && !simulateOffline ? 'Online (Synced)' : 'Offline (Local Queue)'}
          </div>
        </div>
      </header>

      {/* Offline Sync Status Area (Rule 577-594) */}
      <section className={`offline-sync-card ${offlineQueue.length > 0 ? 'has-pending' : ''}`}>
        <div className="sync-info">
          <div className={`sync-icon-wrap ${offlineQueue.length > 0 ? 'alert' : ''}`}>
            {offlineQueue.length > 0 ? '⚠️' : '🔄'}
          </div>
          <div className="sync-details">
            <h4>
              Offline Synchronization Status:{' '}
              {offlineQueue.length > 0 ? (
                <span style={{ color: '#d97706' }}>
                  {offlineQueue.length} Request(s) Pending Sync
                </span>
              ) : (
                <span style={{ color: '#059669' }}>All Requests Synced</span>
              )}
            </h4>
            <p>
              {isOnline && !simulateOffline
                ? 'Connected to FarmGrid Central Dispatch. Offline-created requests automatically synchronize upon network restoration.'
                : 'Offline mode active. Requests are stored locally in localStorage and preserved safely until connectivity is restored.'}
            </p>
          </div>
        </div>

        {offlineQueue.length > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing || !isOnline || simulateOffline}
            className="btn btn-primary btn-sm"
          >
            {syncing ? 'Syncing...' : '⚡ Sync Now'}
          </button>
        )}
      </section>

      {/* Metrics & Overview Cards */}
      <section className="metrics-grid">
        {/* 1. Number of farms */}
        <div className="metric-card">
          <div className="metric-icon farms">🚜</div>
          <div>
            <div className="metric-value">{numFarms}</div>
            <div className="metric-label">Registered Farms</div>
          </div>
        </div>

        {/* 2. Pending requests */}
        <div className="metric-card">
          <div className="metric-icon pending">⏳</div>
          <div>
            <div className="metric-value">{pendingCount}</div>
            <div className="metric-label">Pending Requests</div>
          </div>
        </div>

        {/* 3. Scheduled requests */}
        <div className="metric-card">
          <div className="metric-icon scheduled">📅</div>
          <div>
            <div className="metric-value">{scheduledCount}</div>
            <div className="metric-label">Scheduled Slots</div>
          </div>
        </div>

        {/* 4. Allocated requests */}
        <div className="metric-card">
          <div className="metric-icon allocated">✅</div>
          <div>
            <div className="metric-value">{allocatedCount}</div>
            <div className="metric-label">Allocated Requests</div>
          </div>
        </div>

        {/* 5. Disrupted requests */}
        <div className="metric-card">
          <div className="metric-icon disrupted">⚠️</div>
          <div>
            <div className="metric-value">{disruptedCount}</div>
            <div className="metric-label">Disrupted Requests</div>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <section className="action-bar">
        <h2 className="action-bar-title">Farmer Workspace</h2>
        <div className="action-buttons">
          {/* Browse Resources button */}
          <button
            onClick={() => setShowResourcesModal(true)}
            className="btn btn-secondary"
            id="btn-browse-resources"
          >
            🔍 Browse Resources
          </button>

          {/* Add Farm button */}
          <button
            onClick={() => setShowAddFarmModal(true)}
            className="btn btn-secondary"
            id="btn-add-farm"
          >
            🌾 Add Farm
          </button>

          {/* Create Request button */}
          <button
            onClick={() => {
              if (farms.length === 0) {
                alert('Please register at least one farm first before creating a request.');
                setShowAddFarmModal(true);
                return;
              }
              setRequestForm((prev) => ({
                ...prev,
                farmId: farms[0]._id,
              }));
              setShowCreateRequestModal(true);
            }}
            className="btn btn-primary"
            id="btn-create-request"
          >
            ➕ Create Request
          </button>
        </div>
      </section>

      {/* Content Navigation Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'farms' ? 'active' : ''}`}
          onClick={() => setActiveTab('farms')}
        >
          My Farms ({farms.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          My Booking Requests ({combinedRequests.length})
        </button>
      </div>

      {/* Tab 1: My Farms */}
      {activeTab === 'farms' && (
        <section>
          {farms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌾</div>
              <div className="empty-title">No Farms Registered Yet</div>
              <div className="empty-desc">
                Register your farm location and current crop stage to start requesting agricultural resources.
              </div>
              <button
                onClick={() => setShowAddFarmModal(true)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px' }}
              >
                + Register First Farm
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {farms.map((farm) => (
                <div key={farm._id} className="item-card">
                  <div className="item-card-header">
                    <div>
                      <div className="item-title">{farm.name}</div>
                      <div className="item-subtitle">
                        📍 {farm.location?.village || 'Local Farm'}
                      </div>
                    </div>
                    <span className={`badge badge-${(farm.cropStage || 'growing').toLowerCase()}`}>
                      {farm.cropStage}
                    </span>
                  </div>

                  <div className="item-details">
                    <div>
                      <div className="detail-label">CROP TYPE</div>
                      <div className="detail-value">{farm.cropType}</div>
                    </div>
                    <div>
                      <div className="detail-label">COORDINATES</div>
                      <div className="detail-value">
                        {farm.location?.latitude?.toFixed(4)}, {farm.location?.longitude?.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setRequestForm((prev) => ({
                        ...prev,
                        farmId: farm._id,
                        cropStage: farm.cropStage,
                      }));
                      setShowCreateRequestModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Request Resource for Farm
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: My Resource Requests */}
      {activeTab === 'requests' && (
        <section>
          {combinedRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No Resource Requests Submitted</div>
              <div className="empty-desc">
                Browse available tractors, pumps, and harvesters, or submit a custom booking window request.
              </div>
              <button
                onClick={() => setShowCreateRequestModal(true)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px' }}
              >
                + Create First Request
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {combinedRequests.map((req) => (
                <div key={req._id} className="item-card">
                  <div className="item-card-header">
                    <div>
                      <div className="item-title">{req.resourceType}</div>
                      <div className="item-subtitle">
                        {req.farmId?.name || 'Assigned Farm'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={`badge badge-${(req.status || 'pending').toLowerCase()}`}>
                        {req.status}
                      </span>
                      {req.syncStatus === 'PENDING_OFFLINE' && (
                        <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                          ⚡ Pending Sync
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="item-details">
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
                      <div className="detail-value" style={{ fontSize: '0.78rem' }}>
                        {new Date(req.earliestStart).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(req.latestEnd).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {req.priorityScore !== undefined && (
                    <div className="priority-pill">
                      <span>Priority Score:</span>
                      <span className="priority-number">{req.priorityScore}/100</span>
                      {req.priorityBreakdown && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          (U:{req.priorityBreakdown.urgencyDeadline} W:{req.priorityBreakdown.weatherRisk} C:{req.priorityBreakdown.cropReadiness})
                        </span>
                      )}
                    </div>
                  )}

                  {req.explanation && (
                    <div className="explanation-text">{req.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Browse Resources Modal */}
      {showResourcesModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Agricultural Resources Catalog</h3>
              <button onClick={() => setShowResourcesModal(false)} style={{ fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Note: Availability is evaluated dynamically against your requested time window.
                Booked resources remain visible because they become available at other hours.
              </p>

              {resources.length === 0 ? (
                <div className="empty-state">No resources currently listed in grid.</div>
              ) : (
                <div className="items-grid">
                  {resources.map((res) => (
                    <div key={res._id} className="item-card">
                      <div className="item-card-header">
                        <div>
                          <div className="item-title">{res.name}</div>
                          <div className="item-subtitle">
                            {res.category} • {res.type}
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            background:
                              res.maintenanceStatus === 'OPERATIONAL'
                                ? '#ecfdf5'
                                : '#fee2e2',
                            color:
                              res.maintenanceStatus === 'OPERATIONAL'
                                ? '#047857'
                                : '#b91c1c',
                          }}
                        >
                          {res.maintenanceStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {res.specifications || 'Standard agricultural specifications'}
                      </div>

                      <div className="item-details">
                        <div>
                          <div className="detail-label">OPERATING WINDOW</div>
                          <div className="detail-value">
                            {res.operatingWindow?.startTime} - {res.operatingWindow?.endTime}
                          </div>
                        </div>
                        <div>
                          <div className="detail-label">BUFFER TIME</div>
                          <div className="detail-value">{res.bufferMinutes} mins</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <div className="detail-label">LOCATION</div>
                          <div className="detail-value">
                            {res.location?.village || 'Regional Depot'} (
                            {res.location?.latitude?.toFixed(2)}, {res.location?.longitude?.toFixed(2)})
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenRequestModalForResource(res)}
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                      >
                        Request This Resource
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowResourcesModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Farm Modal */}
      {showAddFarmModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Farm Location</h3>
              <button onClick={() => setShowAddFarmModal(false)} style={{ fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddFarm}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Farm Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Kaveri Basin Green Farm"
                    value={farmForm.name}
                    onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude (-90 to 90) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="form-input"
                      value={farmForm.latitude}
                      onChange={(e) => setFarmForm({ ...farmForm, latitude: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude (-180 to 180) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      className="form-input"
                      value={farmForm.longitude}
                      onChange={(e) => setFarmForm({ ...farmForm, longitude: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Village / Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mandya Taluk"
                    value={farmForm.village}
                    onChange={(e) => setFarmForm({ ...farmForm, village: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Crop Type *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Wheat, Rice, Sugarcane"
                      value={farmForm.cropType}
                      onChange={(e) => setFarmForm({ ...farmForm, cropType: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Biological Crop Stage *</label>
                    <select
                      className="form-select"
                      value={farmForm.cropStage}
                      onChange={(e) => setFarmForm({ ...farmForm, cropStage: e.target.value })}
                    >
                      <option value="SOWING">SOWING</option>
                      <option value="GROWING">GROWING</option>
                      <option value="HARVEST_READY">HARVEST_READY</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Farm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Request Modal */}
      {showCreateRequestModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Submit Resource Request</h3>
              <button onClick={() => setShowCreateRequestModal(false)} style={{ fontSize: '20px' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                {selectedResourceForRequest && (
                  <div
                    style={{
                      background: 'var(--primary-light)',
                      border: '1px solid var(--primary-border)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '0.85rem',
                      color: 'var(--primary-dark)',
                    }}
                  >
                    Targeting Resource: <strong>{selectedResourceForRequest.name}</strong> ({selectedResourceForRequest.type})
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Farm *</label>
                  <select
                    className="form-select"
                    required
                    value={requestForm.farmId}
                    onChange={(e) => {
                      const f = farms.find((farm) => farm._id === e.target.value);
                      setRequestForm({
                        ...requestForm,
                        farmId: e.target.value,
                        cropStage: f ? f.cropStage : requestForm.cropStage,
                      });
                    }}
                  >
                    <option value="">-- Choose Farm --</option>
                    {farms.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.cropType} - {f.cropStage})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Resource Type *</label>
                    <select
                      className="form-select"
                      value={requestForm.resourceType}
                      onChange={(e) => setRequestForm({ ...requestForm, resourceType: e.target.value })}
                    >
                      <option value="Tractor">Tractor</option>
                      <option value="Harvester">Harvester</option>
                      <option value="Mini Truck">Mini Truck</option>
                      <option value="Portable Pump">Portable Pump</option>
                      <option value="Drip Line">Drip Line</option>
                      <option value="Sprinkler Set">Sprinkler Set</option>
                      <option value="Drone Spraying">Drone Spraying</option>
                      <option value="Sowing Team">Sowing Team</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Crop Biological Stage *</label>
                    <select
                      className="form-select"
                      value={requestForm.cropStage}
                      onChange={(e) => setRequestForm({ ...requestForm, cropStage: e.target.value })}
                    >
                      <option value="SOWING">SOWING</option>
                      <option value="GROWING">GROWING</option>
                      <option value="HARVEST_READY">HARVEST_READY</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Earliest Possible Start *</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={requestForm.earliestStart}
                      onChange={(e) => setRequestForm({ ...requestForm, earliestStart: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Latest Acceptable End *</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={requestForm.latestEnd}
                      onChange={(e) => setRequestForm({ ...requestForm, latestEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Required Duration (Minutes) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="form-input"
                      value={requestForm.requiredDurationMinutes}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, requiredDurationMinutes: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weather Risk Exposure (0 - 25)</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      className="form-input"
                      value={requestForm.weatherRiskScore}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, weatherRiskScore: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Urgency Justification</label>
                  <textarea
                    rows="2"
                    className="form-textarea"
                    placeholder="e.g. Unseasonal rain alert in 48 hours; harvesting must complete before rain."
                    value={requestForm.urgencyJustification}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, urgencyJustification: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateRequestModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {simulateOffline ? '💾 Save Offline (Queue)' : '🚀 Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
