import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  MACHINERY: '🚜',
  IRRIGATION: '💧',
  STORAGE: '📦',
  TRANSPORT: '🚛',
  LABOUR: '👥',
  SERVICE: '🛠️',
};

export default function ResourceCard({ resource, onQuickRequest }) {
  const navigate = useNavigate();

  const category = (resource.category || 'MACHINERY').toUpperCase();
  const icon = CATEGORY_ICONS[category] || '🌱';
  const status = (resource.maintenanceStatus || 'OPERATIONAL').toUpperCase();

  return (
    <div className="resource-card" id={`resource-card-${resource._id}`}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <span className={`category-tag ${category.toLowerCase()}`}>
            {icon} {category}
          </span>
          <span className={`status-badge ${status.toLowerCase()}`}>
            {status}
          </span>
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {resource.name}
        </h3>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <strong>Type:</strong> {resource.type}
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px', minHeight: '38px', lineHeight: 1.4 }}>
          {resource.specifications || 'Standard agricultural specifications for regional deployment under scarcity.'}
        </p>
      </div>

      <div>
        <div className="item-details" style={{ marginBottom: '14px' }}>
          <div>
            <div className="detail-label">OPERATING WINDOW</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>
              🕒 {resource.operatingWindow?.startTime || '06:00'} - {resource.operatingWindow?.endTime || '18:00'}
            </div>
          </div>

          <div>
            <div className="detail-label">BUFFER TIME</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>
              ⏱️ {resource.bufferMinutes || 30} mins
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div className="detail-label">BASE LOCATION / DEPOT</div>
            <div className="detail-value" style={{ fontSize: '0.82rem' }}>
              📍 {resource.location?.village || 'Central Hub'}
              {resource.location?.latitude !== undefined && resource.location?.longitude !== undefined && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  ({resource.location.latitude.toFixed(2)}, {resource.location.longitude.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link
            to={`/resources/${resource._id}`}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            id={`btn-view-resource-${resource._id}`}
          >
            📋 Details & Request
          </Link>

          <button
            type="button"
            onClick={() => {
              if (onQuickRequest) {
                onQuickRequest(resource);
              } else {
                navigate(`/requests/new?resourceId=${resource._id}`);
              }
            }}
            className="btn btn-primary btn-sm"
            id={`btn-request-resource-${resource._id}`}
          >
            ⚡ Request
          </button>
        </div>
      </div>
    </div>
  );
}
