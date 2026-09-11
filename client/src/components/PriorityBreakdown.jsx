import React from 'react';

const BREAKDOWN_FACTORS = [
  {
    key: 'urgencyDeadline',
    label: 'Urgency / Deadline Proximity',
    shortLabel: 'Urgency',
    max: 25,
    className: 'urgency',
    icon: '⏳',
  },
  {
    key: 'weatherRisk',
    label: 'Weather Risk Exposure',
    shortLabel: 'Weather',
    max: 25,
    className: 'weather',
    icon: '🌧️',
  },
  {
    key: 'cropReadiness',
    label: 'Crop Readiness / Biological Stage',
    shortLabel: 'Crop Stage',
    max: 20,
    className: 'crop',
    icon: '🌱',
  },
  {
    key: 'queueWaiting',
    label: 'Queue Waiting Time',
    shortLabel: 'Queue Wait',
    max: 15,
    className: 'queue',
    icon: '⏱️',
  },
  {
    key: 'distanceLogistics',
    label: 'Distance & Logistics Overhead',
    shortLabel: 'Logistics',
    max: 10,
    className: 'distance',
    icon: '📍',
  },
  {
    key: 'resourceConstraints',
    label: 'Resource Constraints / Scarcity',
    shortLabel: 'Constraints',
    max: 5,
    className: 'constraints',
    icon: '⚙️',
  },
];

export default function PriorityBreakdown({
  priorityScore,
  priorityBreakdown,
  compact = false,
}) {
  const breakdown = priorityBreakdown || {};
  const totalScore = priorityScore !== undefined && priorityScore !== null ? priorityScore : 0;

  if (compact) {
    return (
      <div className="priority-breakdown-card compact">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Official Priority Score:
          </span>
          <span className="priority-number" style={{ fontSize: '0.95rem' }}>
            {totalScore}/100
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
          {BREAKDOWN_FACTORS.map((f) => {
            const val = breakdown[f.key] !== undefined ? breakdown[f.key] : 0;
            return (
              <div key={f.key} style={{ background: 'white', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{f.shortLabel}:</span>{' '}
                <strong>{val}/{f.max}</strong>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="priority-breakdown-card">
      <div className="breakdown-header">
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Transparent Priority Score Breakdown
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Calculated deterministically by FarmGrid backend using 6 official scarcity benchmarks.
          </p>
        </div>

        <div className="breakdown-total-badge">
          <span>Priority:</span>
          <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
            {totalScore}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/100</span>
        </div>
      </div>

      <div className="breakdown-bars-grid">
        {BREAKDOWN_FACTORS.map((f) => {
          const val = breakdown[f.key] !== undefined ? breakdown[f.key] : 0;
          const percentage = Math.min(100, Math.max(0, (val / f.max) * 100));

          return (
            <div key={f.key} className="breakdown-item">
              <div className="breakdown-item-top">
                <span className="breakdown-item-name">
                  {f.icon} {f.label}
                </span>
                <span className="breakdown-item-val">
                  {val} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {f.max} pts</span>
                </span>
              </div>

              <div className="breakdown-track">
                <div
                  className={`breakdown-fill ${f.className}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
