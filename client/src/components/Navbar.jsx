import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function Navbar() {
  const { isOnline, pendingCount } = useOfflineQueue();
  const location = useLocation();
  const isOwnerPortal = location.pathname.startsWith('/owner');

  return (
    <header className="navbar">
      <Link to={isOwnerPortal ? '/owner' : '/'} className="navbar-brand">
        <span style={{ fontSize: '1.5rem' }}>{isOwnerPortal ? '🚜' : '🌱'}</span>
        <div>
          <span>FarmGrid</span>
          <span
            className="brand-badge"
            style={{
              marginLeft: '8px',
              backgroundColor: isOwnerPortal ? '#e0f2fe' : undefined,
              color: isOwnerPortal ? '#0369a1' : undefined,
              borderColor: isOwnerPortal ? '#bae6fd' : undefined,
            }}
          >
            {isOwnerPortal ? 'Resource Owner' : 'Farmer'}
          </span>
        </div>
      </Link>

      <nav>
        {isOwnerPortal ? (
          <ul className="navbar-nav">
            <li>
              <NavLink
                to="/owner"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📊 Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/owner/resources"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🚜 My Resources
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/owner/resources/add"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                ➕ Add Resource
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/owner/schedules"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📅 Resource Schedules
              </NavLink>
            </li>
          </ul>
        ) : (
          <ul className="navbar-nav">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📊 Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/farms"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🌾 My Farms
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/farms/add"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                ➕ Add Farm
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/resources"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🚜 Browse Resources
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/requests"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📋 My Requests
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/requests/new"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                ⚡ Create Request
              </NavLink>
            </li>
          </ul>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Switch Portal Button */}
        <Link
          to={isOwnerPortal ? '/' : '/owner'}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: '0.78rem',
            padding: '5px 10px',
            borderColor: isOwnerPortal ? '#a7f3d0' : '#bae6fd',
            color: isOwnerPortal ? '#047857' : '#0369a1',
            backgroundColor: isOwnerPortal ? '#ecfdf5' : '#f0f9ff',
            fontWeight: 600,
          }}
          title={isOwnerPortal ? 'Switch to Farmer View' : 'Switch to Resource Owner View'}
        >
          {isOwnerPortal ? '🌾 Switch to Farmer' : '🚜 Resource Owner View'}
        </Link>

        {/* Connectivity badge */}
        <div className={`conn-badge ${isOnline ? (pendingCount > 0 ? 'offline' : 'online') : 'offline'}`}>
          <span className="conn-dot"></span>
          {isOnline
            ? pendingCount > 0
              ? `Online (${pendingCount} pending)`
              : 'Online'
            : `Offline (${pendingCount} queued)`}
        </div>
      </div>
    </header>
  );
}
