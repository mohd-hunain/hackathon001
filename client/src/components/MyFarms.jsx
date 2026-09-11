import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyFarms } from '../services/api';
import EditFarmModal from './EditFarmModal';

export default function MyFarms() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Edit Modal State
  const [selectedFarmToEdit, setSelectedFarmToEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyFarms();
      if (res && res.success) {
        setFarms(res.data || []);
      } else {
        setError(res?.message || 'Failed to load farms from the server.');
      }
    } catch (err) {
      console.error('Error fetching farms:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to the backend server to retrieve farms.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleEditClick = (farm) => {
    setSelectedFarmToEdit(farm);
    setShowEditModal(true);
  };

  const handleFarmUpdated = (updatedFarm) => {
    setFarms((prev) =>
      prev.map((f) => (f._id === updatedFarm._id ? updatedFarm : f))
    );
    showNotification(`Farm "${updatedFarm.name}" updated successfully!`);
  };

  // Filter and search
  const filteredFarms = farms.filter((f) => {
    const matchesSearch =
      (f.name && f.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.cropType && f.cropType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.location?.village && f.location.village.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStage = stageFilter === 'ALL' || f.cropStage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Stage counts for quick metrics
  const criticalCount = farms.filter((f) => f.cropStage === 'CRITICAL').length;
  const harvestCount = farms.filter((f) => f.cropStage === 'HARVEST_READY').length;
  const sowingCount = farms.filter((f) => f.cropStage === 'SOWING').length;
  const growingCount = farms.filter((f) => f.cropStage === 'GROWING').length;

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
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
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
        <span className="current">My Farms</span>
      </nav>

      {/* Header Section */}
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🌾 My Registered Farms
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage agricultural plots, geolocations, and crop stages for allocation priority.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchFarms}
            className="btn btn-secondary btn-sm"
            title="Refresh farms list"
          >
            🔄 Refresh
          </button>
          <Link to="/farms/add" className="btn btn-primary" id="btn-add-new-farm-page">
            ➕ Add New Farm
          </Link>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-icon farms">🚜</div>
          <div>
            <div className="metric-value">{farms.length}</div>
            <div className="metric-label">Total Registered Farms</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon disrupted">🚨</div>
          <div>
            <div className="metric-value" style={{ color: criticalCount > 0 ? '#b91c1c' : 'inherit' }}>
              {criticalCount}
            </div>
            <div className="metric-label">Critical Vulnerability</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon scheduled">🌾</div>
          <div>
            <div className="metric-value">{harvestCount}</div>
            <div className="metric-label">Harvest Ready</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon pending">🌱</div>
          <div>
            <div className="metric-value">{sowingCount + growingCount}</div>
            <div className="metric-label">Sowing & Growing</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-container">
        <div className="search-input-wrap">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            placeholder="Search by farm name, crop type, or village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-chips-list">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
            STAGE:
          </span>
          <button
            className={`filter-chip ${stageFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStageFilter('ALL')}
          >
            All ({farms.length})
          </button>
          <button
            className={`filter-chip ${stageFilter === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setStageFilter('CRITICAL')}
          >
            Critical ({criticalCount})
          </button>
          <button
            className={`filter-chip ${stageFilter === 'HARVEST_READY' ? 'active' : ''}`}
            onClick={() => setStageFilter('HARVEST_READY')}
          >
            Harvest Ready ({harvestCount})
          </button>
          <button
            className={`filter-chip ${stageFilter === 'GROWING' ? 'active' : ''}`}
            onClick={() => setStageFilter('GROWING')}
          >
            Growing ({growingCount})
          </button>
          <button
            className={`filter-chip ${stageFilter === 'SOWING' ? 'active' : ''}`}
            onClick={() => setStageFilter('SOWING')}
          >
            Sowing ({sowingCount})
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {error && (
        <div className="alert-banner error">
          <span>⚠️ <strong>Notice:</strong> {error}</span>
          <button onClick={fetchFarms} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>
            🔄
          </div>
          <div className="empty-title">Loading your farms...</div>
          <div className="empty-desc">Connecting to FarmGrid central registry.</div>
        </div>
      ) : farms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌾</div>
          <div className="empty-title">No Farms Registered Yet</div>
          <div className="empty-desc">
            You have not registered any farm holdings. Add your farm location and current crop stage to start requesting equipment.
          </div>
          <Link
            to="/farms/add"
            className="btn btn-primary"
            style={{ marginTop: '16px', display: 'inline-flex' }}
          >
            ➕ Register Your First Farm
          </Link>
        </div>
      ) : filteredFarms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No matching farms found</div>
          <div className="empty-desc">
            No farms matched your search term "{searchQuery}" with stage "{stageFilter}".
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStageFilter('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '16px' }}
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {filteredFarms.map((farm) => (
            <div key={farm._id} className="item-card" id={`farm-card-${farm._id}`}>
              <div className="item-card-header">
                <div>
                  <div className="item-title">{farm.name}</div>
                  <div className="item-subtitle">
                    📍 {farm.location?.village || 'Unspecified Village'}
                  </div>
                </div>
                <span className={`badge badge-${(farm.cropStage || 'growing').toLowerCase()}`}>
                  {farm.cropStage}
                </span>
              </div>

              {/* Detailed Farm Attributes */}
              <div className="item-details">
                <div>
                  <div className="detail-label">CROP TYPE</div>
                  <div className="detail-value" style={{ textTransform: 'capitalize' }}>
                    🌱 {farm.cropType}
                  </div>
                </div>

                <div>
                  <div className="detail-label">BIOLOGICAL STAGE</div>
                  <div className="detail-value">{farm.cropStage}</div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div className="detail-label">GPS COORDINATES</div>
                  <div className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {farm.location?.latitude?.toFixed(4)}, {farm.location?.longitude?.toFixed(4)}
                    <a
                      href={`https://maps.google.com/?q=${farm.location?.latitude},${farm.location?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.78rem' }}
                    >
                      🗺️ Map
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="card-actions">
                <button
                  type="button"
                  onClick={() => handleEditClick(farm)}
                  className="btn btn-secondary btn-sm"
                  id={`btn-edit-farm-${farm._id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  ✏️ Edit Farm
                </button>

                <Link
                  to="/"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: 'auto', textDecoration: 'none' }}
                >
                  ⚡ Request Equipment
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Farm Modal */}
      {selectedFarmToEdit && (
        <EditFarmModal
          farm={selectedFarmToEdit}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFarmToEdit(null);
          }}
          onFarmUpdated={handleFarmUpdated}
        />
      )}
    </div>
  );
}
