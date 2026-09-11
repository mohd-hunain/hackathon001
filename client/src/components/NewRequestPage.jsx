import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import RequestForm from './RequestForm';

export default function NewRequestPage() {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get('resourceId') || '';
  const farmId = searchParams.get('farmId') || '';

  return (
    <div className="dashboard-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <span className="current">Create Resource Request</span>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ⚡ Submit Agricultural Resource Request
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Request scarce machinery, pumps, or teams under FarmGrid's priority-based scheduling engine.
          </p>
        </div>

        <Link to="/resources" className="btn btn-secondary">
          🔍 Browse Resources Catalog
        </Link>
      </div>

      <div
        className="item-card"
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
          background: 'white',
        }}
      >
        <RequestForm
          preselectedResourceId={resourceId}
          preselectedFarmId={farmId}
        />
      </div>
    </div>
  );
}
