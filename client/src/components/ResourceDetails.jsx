import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResources } from '../services/api';
import RequestForm from './RequestForm';

export default function ResourceDetails() {
  const { id } = useParams();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getResources();
        if (res && res.success) {
          const found = (res.data || []).find((r) => r._id === id);
          if (found) {
            setResource(found);
          } else {
            setError('Resource not found in the agricultural grid.');
          }
        } else {
          setError('Failed to load resource details.');
        }
      } catch (err) {
        setError(err.message || 'Error fetching resource');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <div className="empty-title">Loading Resource Details...</div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="dashboard-container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <Link to="/resources">Browse Resources</Link>
          <span>/</span>
          <span className="current">Error</span>
        </nav>

        <div className="alert-banner error">
          <span>⚠️ {error || 'Resource not found'}</span>
        </div>

        <Link to="/resources" className="btn btn-secondary">
          ← Back to Resources Catalog
        </Link>
      </div>
    );
  }

  const category = (resource.category || 'MACHINERY').toUpperCase();
  const status = (resource.maintenanceStatus || 'OPERATIONAL').toUpperCase();

  return (
    <div className="dashboard-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <Link to="/resources">Browse Resources</Link>
        <span>/</span>
        <span className="current">{resource.name}</span>
      </nav>

      {/* Resource Overview Banner */}
      <div className="resource-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span className={`category-tag ${category.toLowerCase()}`}>
                {category}
              </span>
              <span className={`status-badge ${status.toLowerCase()}`}>
                {status}
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {resource.name}
            </h1>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Type: <strong>{resource.type}</strong>
            </p>
          </div>

          <Link to="/resources" className="btn btn-secondary">
            ← Browse All Resources
          </Link>
        </div>

        <p style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {resource.specifications || 'Standard agricultural heavy equipment suited for seasonal regional scheduling.'}
        </p>

        {/* Specifications Grid */}
        <div className="spec-grid">
          <div className="spec-item">
            <div className="spec-label">OPERATING WINDOW</div>
            <div className="spec-val">
              🕒 {resource.operatingWindow?.startTime || '06:00'} – {resource.operatingWindow?.endTime || '18:00'}
            </div>
          </div>

          <div className="spec-item">
            <div className="spec-label">REQUIRED BUFFER TIME</div>
            <div className="spec-val">⏱️ {resource.bufferMinutes || 30} minutes</div>
          </div>

          <div className="spec-item">
            <div className="spec-label">BASE DEPOT / VILLAGE</div>
            <div className="spec-val">📍 {resource.location?.village || 'Regional Depot'}</div>
          </div>

          <div className="spec-item">
            <div className="spec-label">DEPOT COORDINATES</div>
            <div className="spec-val" style={{ fontFamily: 'monospace' }}>
              {resource.location?.latitude?.toFixed(4)}, {resource.location?.longitude?.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Request Form Section */}
      <div
        className="item-card"
        style={{
          padding: '28px',
          boxShadow: 'var(--shadow-md)',
          background: 'white',
        }}
      >
        <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ⚡ Submit Booking Request for {resource.name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Select your farm, set your desired start and end window, and specify urgency for the priority allocation algorithm.
          </p>
        </div>

        <RequestForm
          preselectedResourceId={resource._id}
          isEmbedded={true}
        />
      </div>
    </div>
  );
}
