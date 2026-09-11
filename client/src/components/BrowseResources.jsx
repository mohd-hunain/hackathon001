import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getResources } from '../services/api';
import ResourceCard from './ResourceCard';

const CATEGORIES = [
  { key: 'ALL', label: 'All Resources' },
  { key: 'MACHINERY', label: '🚜 Machinery' },
  { key: 'IRRIGATION', label: '💧 Irrigation' },
  { key: 'STORAGE', label: '📦 Storage' },
  { key: 'TRANSPORT', label: '🚛 Transport' },
  { key: 'LABOUR', label: '👥 Labour' },
  { key: 'SERVICE', label: '🛠️ Services' },
];

export default function BrowseResources() {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchResourceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getResources();
      if (res && res.success) {
        setResources(res.data || []);
      } else {
        setError(res?.message || 'Failed to load agricultural resources.');
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Could not connect to FarmGrid server to fetch resources catalog.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourceData();
  }, []);

  // Filter logic
  const filteredResources = resources.filter((res) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (res.name && res.name.toLowerCase().includes(q)) ||
      (res.type && res.type.toLowerCase().includes(q)) ||
      (res.specifications && res.specifications.toLowerCase().includes(q)) ||
      (res.location?.village && res.location.village.toLowerCase().includes(q));

    const matchesCat = selectedCategory === 'ALL' || res.category === selectedCategory;
    const matchesStatus = statusFilter === 'ALL' || res.maintenanceStatus === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Summary counts
  const machineryCount = resources.filter((r) => r.category === 'MACHINERY').length;
  const irrigationCount = resources.filter((r) => r.category === 'IRRIGATION').length;
  const transportStorageCount = resources.filter(
    (r) => r.category === 'TRANSPORT' || r.category === 'STORAGE'
  ).length;

  return (
    <div className="dashboard-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <span className="current">Browse Resources</span>
      </nav>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🚜 Agricultural Resources Catalog
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Browse available tractors, harvesters, irrigation pumps, and regional depots for allocation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchResourceData}
            className="btn btn-secondary btn-sm"
            title="Refresh resource availability"
          >
            🔄 Refresh
          </button>
          <Link to="/requests/new" className="btn btn-primary" id="btn-create-request-page">
            ⚡ Create Custom Request
          </Link>
        </div>
      </div>

      {/* Rule Notice Callout */}
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          fontSize: '0.85rem',
          color: '#0369a1',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <div>
          <strong>Dynamic Availability:</strong> Booked resources remain listed because agricultural availability depends on your requested time window. The scheduling engine resolves time conflicts mathematically without locking equipment permanently.
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-icon farms">🌱</div>
          <div>
            <div className="metric-value">{resources.length}</div>
            <div className="metric-label">Total Grid Resources</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon allocated">🚜</div>
          <div>
            <div className="metric-value">{machineryCount}</div>
            <div className="metric-label">Machinery Units</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon scheduled">💧</div>
          <div>
            <div className="metric-value">{irrigationCount}</div>
            <div className="metric-label">Irrigation Pumps & Kits</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon pending">📦</div>
          <div>
            <div className="metric-value">{transportStorageCount}</div>
            <div className="metric-label">Transport & Storage</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filter-container">
        <div className="search-input-wrap">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            placeholder="Search by resource name, machine type, specs, or depot village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            STATUS:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="BREAKDOWN">Breakdown</option>
          </select>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`filter-chip ${selectedCategory === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert-banner error">
          <span>⚠️ <strong>Error:</strong> {error}</span>
          <button onClick={fetchResourceData} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Grid of Resource Cards */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <div className="empty-title">Loading Agricultural Resources...</div>
          <div className="empty-desc">Querying FarmGrid equipment registry.</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚜</div>
          <div className="empty-title">No Resources Match Your Filter</div>
          <div className="empty-desc">
            No equipment found for category "{selectedCategory}" and search query "{searchQuery}".
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setStatusFilter('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '16px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res._id}
              resource={res}
              onQuickRequest={(r) => navigate(`/requests/new?resourceId=${r._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
