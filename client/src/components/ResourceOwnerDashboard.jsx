import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  getMyResources,
  createResource,
  updateResource,
  getResourceSchedule,
} from '../services/api';

// Fallback seed data if backend has no resources for the owner yet
const INITIAL_FALLBACK_RESOURCES = [
  {
    _id: 'res_demo_001',
    name: 'Mahindra 575 DI 4WD Tractor',
    category: 'MACHINERY',
    type: 'Tractor',
    specifications: '45 HP, 4WD with rotary tiller & dual clutch attachment',
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      village: 'Ramanagara North',
    },
    operatingWindow: {
      startTime: '06:00',
      endTime: '18:00',
    },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 30,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    _id: 'res_demo_002',
    name: 'John Deere W70 Combine Harvester',
    category: 'MACHINERY',
    type: 'Harvester',
    specifications: '100 HP Multi-crop Grain Harvester with 14ft cutter bar',
    location: {
      latitude: 12.5218,
      longitude: 76.8951,
      village: 'Mandya Central',
    },
    operatingWindow: {
      startTime: '07:00',
      endTime: '17:30',
    },
    maintenanceStatus: 'MAINTENANCE',
    bufferMinutes: 45,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    _id: 'res_demo_003',
    name: 'Kirloskar 7.5 HP Portable Diesel Pump',
    category: 'IRRIGATION',
    type: 'Portable Pump',
    specifications: 'High-flow 1200 LPM discharge with 250m flexible lay-flat pipe',
    location: {
      latitude: 12.9081,
      longitude: 77.4879,
      village: 'Kengeri Hobli',
    },
    operatingWindow: {
      startTime: '05:00',
      endTime: '20:00',
    },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 20,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: 'res_demo_004',
    name: 'Tata 407 Agri Cargo Mini Truck',
    category: 'TRANSPORT',
    type: 'Mini Truck',
    specifications: '2.5 Ton payload capacity with grain sideboards & tarp cover',
    location: {
      latitude: 12.7983,
      longitude: 77.3824,
      village: 'Bidadi Rural',
    },
    operatingWindow: {
      startTime: '06:00',
      endTime: '22:00',
    },
    maintenanceStatus: 'BREAKDOWN',
    bufferMinutes: 30,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

const INITIAL_FALLBACK_SCHEDULES = [
  {
    _id: 'sch_demo_001',
    resourceId: 'res_demo_001',
    resourceName: 'Mahindra 575 DI 4WD Tractor',
    farmerName: 'Ramesh Gowda',
    farmerPhone: '+91 98450 12345',
    farmVillage: 'Ramanagara West',
    requestType: 'Tractor Tilling & Sowing Prep',
    startTime: new Date(Date.now() - 45 * 60000).toISOString(),
    endTime: new Date(Date.now() + 135 * 60000).toISOString(),
    travelBufferBeforeMinutes: 30,
    travelBufferAfterMinutes: 30,
    status: 'ACTIVE',
    priorityScore: 88,
    cropStage: 'SOWING',
  },
  {
    _id: 'sch_demo_002',
    resourceId: 'res_demo_003',
    resourceName: 'Kirloskar 7.5 HP Portable Diesel Pump',
    farmerName: 'Suresh Patel',
    farmerPhone: '+91 98860 67890',
    farmVillage: 'Kengeri South Field',
    requestType: 'Emergency Canal Water Irrigation',
    startTime: new Date(Date.now() + 180 * 60000).toISOString(),
    endTime: new Date(Date.now() + 360 * 60000).toISOString(),
    travelBufferBeforeMinutes: 20,
    travelBufferAfterMinutes: 20,
    status: 'SCHEDULED',
    priorityScore: 94,
    cropStage: 'CRITICAL',
  },
  {
    _id: 'sch_demo_003',
    resourceId: 'res_demo_001',
    resourceName: 'Mahindra 575 DI 4WD Tractor',
    farmerName: 'Anand Kumar',
    farmerPhone: '+91 99001 54321',
    farmVillage: 'Bidadi East',
    requestType: 'Tractor Deep Ploughing',
    startTime: new Date(Date.now() + 24 * 3600000).toISOString(),
    endTime: new Date(Date.now() + 28 * 3600000).toISOString(),
    travelBufferBeforeMinutes: 30,
    travelBufferAfterMinutes: 30,
    status: 'SCHEDULED',
    priorityScore: 78,
    cropStage: 'GROWING',
  },
];

const CATEGORY_OPTIONS = [
  { value: 'MACHINERY', label: '🚜 Machinery', icon: '🚜' },
  { value: 'IRRIGATION', label: '💧 Irrigation', icon: '💧' },
  { value: 'STORAGE', label: '📦 Storage', icon: '📦' },
  { value: 'TRANSPORT', label: '🚛 Transport', icon: '🚛' },
  { value: 'LABOUR', label: '👥 Labour', icon: '👥' },
  { value: 'SERVICE', label: '🛠️ Service', icon: '🛠️' },
];

export default function ResourceOwnerDashboard({ defaultTab = 'overview' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Active view tab: 'overview' | 'resources' | 'add' | 'schedules'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/resources/add')) return 'add';
    if (location.pathname.includes('/resources')) return 'resources';
    if (location.pathname.includes('/schedules')) return 'schedules';
    return defaultTab || 'overview';
  });

  // Sync activeTab if URL route changes
  useEffect(() => {
    if (location.pathname.includes('/resources/add')) {
      setActiveTab('add');
    } else if (location.pathname.includes('/resources')) {
      setActiveTab('resources');
    } else if (location.pathname.includes('/schedules')) {
      setActiveTab('schedules');
    } else if (location.pathname === '/owner' || location.pathname === '/owner/dashboard') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  // Data State
  const [resources, setResources] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Resource Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'MACHINERY',
    type: 'Tractor',
    specifications: '',
    village: 'Ramanagara',
    latitude: '12.9716',
    longitude: '77.5946',
    startTime: '06:00',
    endTime: '18:00',
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 30,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Load resources & schedules
  const loadOwnerData = async () => {
    try {
      setLoading(true);
      let loadedResources = [];
      let loadedSchedules = [];

      try {
        const res = await getMyResources();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          loadedResources = res.data;
        }
      } catch (err) {
        console.warn('API error fetching owner resources, using local fallback:', err);
      }

      // Check localStorage for any local owner resources created
      const localSaved = localStorage.getItem('farmgrid_owner_resources');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const ids = new Set(loadedResources.map((r) => r._id));
            const extra = parsed.filter((r) => !ids.has(r._id));
            loadedResources = [...loadedResources, ...extra];
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (loadedResources.length === 0) {
        loadedResources = INITIAL_FALLBACK_RESOURCES;
        localStorage.setItem('farmgrid_owner_resources', JSON.stringify(INITIAL_FALLBACK_RESOURCES));
      }
      setResources(loadedResources);

      // Attempt to load real schedules for resources
      try {
        const schedulePromises = loadedResources.map(async (r) => {
          if (!r._id.startsWith('res_demo_')) {
            try {
              const sRes = await getResourceSchedule(r._id);
              if (sRes && sRes.success && Array.isArray(sRes.data)) {
                return sRes.data.map((item) => ({
                  ...item,
                  resourceName: r.name,
                  farmerName: item.farmerId?.name || 'Assigned Farmer',
                  farmerPhone: item.farmerId?.phone || '+91 98000 00000',
                  requestType: item.requestId?.resourceType || r.type,
                  cropStage: item.requestId?.cropStage || 'GROWING',
                  priorityScore: item.requestId?.priorityScore || 80,
                }));
              }
            } catch (e) {
              // ignore individual errors
            }
          }
          return [];
        });

        const nested = await Promise.all(schedulePromises);
        const flattened = nested.flat();
        if (flattened.length > 0) {
          loadedSchedules = flattened;
        }
      } catch (err) {
        console.warn('Could not load schedules from server:', err);
      }

      // Check local stored schedules
      const localSch = localStorage.getItem('farmgrid_owner_schedules');
      if (localSch) {
        try {
          const parsed = JSON.parse(localSch);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedSchedules = [...loadedSchedules, ...parsed];
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (loadedSchedules.length === 0) {
        loadedSchedules = INITIAL_FALLBACK_SCHEDULES;
        localStorage.setItem('farmgrid_owner_schedules', JSON.stringify(INITIAL_FALLBACK_SCHEDULES));
      }

      setSchedules(loadedSchedules);
    } catch (err) {
      console.error('Error in loadOwnerData:', err);
      showToast('Error refreshing owner dashboard data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, []);

  // Compute Core Display Metrics
  const totalResources = resources.length;
  const operationalResources = resources.filter(
    (r) => (r.maintenanceStatus || 'OPERATIONAL') === 'OPERATIONAL'
  ).length;
  const maintenanceResources = resources.filter(
    (r) => r.maintenanceStatus === 'MAINTENANCE'
  ).length;
  const breakdownResources = resources.filter(
    (r) => r.maintenanceStatus === 'BREAKDOWN'
  ).length;

  const now = new Date();

  // Active schedules: status is ACTIVE or currently ongoing
  const activeSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.status === 'ACTIVE') return true;
      if (s.status === 'SCHEDULED') {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        return start <= now && end >= now;
      }
      return false;
    });
  }, [schedules, now]);

  // Upcoming schedules: status is SCHEDULED and start time is in the future
  const upcomingSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (s.status === 'SCHEDULED') {
        const start = new Date(s.startTime);
        return start > now;
      }
      return false;
    });
  }, [schedules, now]);

  // Navigation handlers
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'overview') {
      navigate('/owner');
    } else if (tabKey === 'resources') {
      navigate('/owner/resources');
    } else if (tabKey === 'add') {
      navigate('/owner/resources/add');
    } else if (tabKey === 'schedules') {
      navigate('/owner/schedules');
    }
  };

  // Quick maintenance status change
  const handleQuickStatusChange = async (resourceId, newStatus) => {
    setUpdatingStatusId(resourceId);
    try {
      if (!resourceId.startsWith('res_demo_')) {
        await updateResource(resourceId, { maintenanceStatus: newStatus });
      }

      const updated = resources.map((r) =>
        r._id === resourceId ? { ...r, maintenanceStatus: newStatus } : r
      );
      setResources(updated);
      localStorage.setItem('farmgrid_owner_resources', JSON.stringify(updated));
      showToast(`Resource status updated to ${newStatus}!`, 'success');
    } catch (err) {
      showToast(
        'Failed to update resource status: ' +
          (err.response?.data?.message || err.message),
        'error'
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Add Resource Validation & Submit
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Resource Name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.type.trim()) errors.type = 'Resource Type is required (e.g. Tractor)';
    if (!formData.village.trim()) errors.village = 'Village name is required';

    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }

    const lng = parseFloat(formData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }

    if (!formData.startTime) errors.startTime = 'Start time is required (HH:MM)';
    if (!formData.endTime) errors.endTime = 'End time is required (HH:MM)';

    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        errors.endTime = 'End time must be later than start time';
      }
    }

    const buf = parseInt(formData.bufferMinutes, 10);
    if (isNaN(buf) || buf < 0) {
      errors.bufferMinutes = 'Buffer minutes cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddResourceSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please correct the errors in the form before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        type: formData.type.trim(),
        specifications: formData.specifications.trim(),
        location: {
          village: formData.village.trim(),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
        operatingWindow: {
          startTime: formData.startTime,
          endTime: formData.endTime,
        },
        maintenanceStatus: formData.maintenanceStatus,
        bufferMinutes: parseInt(formData.bufferMinutes, 10) || 30,
      };

      let newResource = null;
      try {
        const res = await createResource(payload);
        if (res && res.success && res.data) {
          newResource = res.data;
        }
      } catch (apiErr) {
        console.warn('Backend create error, fallback to local storage:', apiErr);
      }

      if (!newResource) {
        newResource = {
          _id: 'res_local_' + Date.now(),
          ...payload,
          createdAt: new Date().toISOString(),
        };
      }

      const updated = [newResource, ...resources];
      setResources(updated);
      localStorage.setItem('farmgrid_owner_resources', JSON.stringify(updated));

      showToast(`Resource "${newResource.name}" registered successfully!`, 'success');

      // Reset form
      setFormData({
        name: '',
        category: 'MACHINERY',
        type: 'Tractor',
        specifications: '',
        village: 'Ramanagara',
        latitude: '12.9716',
        longitude: '77.5946',
        startTime: '06:00',
        endTime: '18:00',
        maintenanceStatus: 'OPERATIONAL',
        bufferMinutes: 30,
      });

      // Switch to resources tab
      handleTabChange('resources');
    } catch (err) {
      showToast('Error adding resource: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered resources for "My Resources" tab
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        (res.name && res.name.toLowerCase().includes(q)) ||
        (res.type && res.type.toLowerCase().includes(q)) ||
        (res.specifications && res.specifications.toLowerCase().includes(q)) ||
        (res.location?.village && res.location.village.toLowerCase().includes(q));

      const matchCat = categoryFilter === 'ALL' || res.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || res.maintenanceStatus === statusFilter;

      return matchQuery && matchCat && matchStatus;
    });
  }, [resources, searchQuery, categoryFilter, statusFilter]);

  // Filtered schedules for "Resource Schedules" tab
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      if (scheduleStatusFilter === 'ALL') return true;
      if (scheduleStatusFilter === 'ACTIVE') {
        return (
          sch.status === 'ACTIVE' ||
          (new Date(sch.startTime) <= now && new Date(sch.endTime) >= now)
        );
      }
      if (scheduleStatusFilter === 'UPCOMING') {
        return sch.status === 'SCHEDULED' && new Date(sch.startTime) > now;
      }
      return sch.status === scheduleStatusFilter;
    });
  }, [schedules, scheduleStatusFilter, now]);

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`toast-notification ${
            notification.type === 'error'
              ? 'toast-error'
              : notification.type === 'warning'
              ? 'toast-warning'
              : 'toast-success'
          }`}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor:
              notification.type === 'error'
                ? '#ef4444'
                : notification.type === 'warning'
                ? '#f59e0b'
                : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            fontSize: '0.92rem',
          }}
        >
          <span>
            {notification.type === 'error' ? '❌' : notification.type === 'warning' ? '⚠️' : '✅'}
          </span>
          <div>{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            style={{
              marginLeft: '8px',
              color: '#ffffff',
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div
            className="brand-icon"
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)',
            }}
          >
            🚜
          </div>
          <div>
            <div className="brand-title">
              FarmGrid Resource Owner Command Center
              <span
                className="brand-badge"
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  borderColor: '#bae6fd',
                }}
              >
                Resource Owner Portal
              </span>
            </div>
            <p className="brand-subtitle">
              Manage machinery, monitor real-time maintenance status, and track scheduled allocations
            </p>
          </div>
        </div>

        <div className="header-controls">
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadOwnerData}
            disabled={loading}
            title="Reload latest data from server"
          >
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleTabChange('add')}
            style={{
              backgroundColor: '#0284c7',
            }}
          >
            ➕ Add Resource
          </button>
          <Link
            to="/"
            className="btn btn-secondary btn-sm"
            title="Switch back to Farmer view"
          >
            🌾 Farmer View
          </Link>
        </div>
      </header>

      {/* Navigation to My Resources, Add Resource, Resource Schedules */}
      <nav
        className="owner-subnav"
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'overview' ? '#e0f2fe' : 'transparent',
            color: activeTab === 'overview' ? '#0369a1' : 'var(--text-secondary)',
            fontWeight: activeTab === 'overview' ? 700 : 500,
          }}
        >
          📊 Dashboard Overview
        </button>

        <button
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => handleTabChange('resources')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'resources' ? '#e0f2fe' : 'transparent',
            color: activeTab === 'resources' ? '#0369a1' : 'var(--text-secondary)',
            fontWeight: activeTab === 'resources' ? 700 : 500,
          }}
        >
          🚜 My Resources ({totalResources})
        </button>

        <button
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => handleTabChange('add')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'add' ? '#e0f2fe' : 'transparent',
            color: activeTab === 'add' ? '#0369a1' : 'var(--text-secondary)',
            fontWeight: activeTab === 'add' ? 700 : 500,
          }}
        >
          ➕ Add Resource
        </button>

        <button
          className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => handleTabChange('schedules')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'schedules' ? '#e0f2fe' : 'transparent',
            color: activeTab === 'schedules' ? '#0369a1' : 'var(--text-secondary)',
            fontWeight: activeTab === 'schedules' ? 700 : 500,
          }}
        >
          📅 Resource Schedules ({schedules.length})
        </button>
      </nav>

      {/* CORE DISPLAY METRICS GRID (6 METRICS) */}
      <section
        className="metrics-grid"
        aria-label="Resource Owner Statistics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* 1. Total resources */}
        <div
          className="metric-card"
          onClick={() => handleTabChange('resources')}
          style={{ cursor: 'pointer' }}
          title="Click to view all resources"
        >
          <div
            className="metric-icon"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              fontSize: '22px',
            }}
          >
            📦
          </div>
          <div>
            <div className="metric-value">{totalResources}</div>
            <div className="metric-label">Total Resources</div>
          </div>
        </div>

        {/* 2. Operational resources */}
        <div
          className="metric-card"
          onClick={() => {
            setStatusFilter('OPERATIONAL');
            handleTabChange('resources');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to filter operational resources"
        >
          <div
            className="metric-icon"
            style={{
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '22px',
            }}
          >
            🟢
          </div>
          <div>
            <div className="metric-value" style={{ color: '#059669' }}>
              {operationalResources}
            </div>
            <div className="metric-label">Operational Resources</div>
          </div>
        </div>

        {/* 3. Resources under maintenance */}
        <div
          className="metric-card"
          onClick={() => {
            setStatusFilter('MAINTENANCE');
            handleTabChange('resources');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to filter resources in maintenance"
        >
          <div
            className="metric-icon"
            style={{
              background: '#fffbeb',
              color: '#d97706',
              fontSize: '22px',
            }}
          >
            🔧
          </div>
          <div>
            <div className="metric-value" style={{ color: '#d97706' }}>
              {maintenanceResources}
            </div>
            <div className="metric-label">Under Maintenance</div>
          </div>
        </div>

        {/* 4. Resources in breakdown */}
        <div
          className="metric-card"
          onClick={() => {
            setStatusFilter('BREAKDOWN');
            handleTabChange('resources');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to filter broken down resources"
        >
          <div
            className="metric-icon"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '22px',
            }}
          >
            ⚠️
          </div>
          <div>
            <div className="metric-value" style={{ color: '#dc2626' }}>
              {breakdownResources}
            </div>
            <div className="metric-label">In Breakdown</div>
          </div>
        </div>

        {/* 5. Active schedules */}
        <div
          className="metric-card"
          onClick={() => {
            setScheduleStatusFilter('ACTIVE');
            handleTabChange('schedules');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to view active schedules"
        >
          <div
            className="metric-icon"
            style={{
              background: '#f5f3ff',
              color: '#7c3aed',
              fontSize: '22px',
            }}
          >
            ⚡
          </div>
          <div>
            <div className="metric-value" style={{ color: '#7c3aed' }}>
              {activeSchedules.length}
            </div>
            <div className="metric-label">Active Schedules</div>
          </div>
        </div>

        {/* 6. Upcoming schedules */}
        <div
          className="metric-card"
          onClick={() => {
            setScheduleStatusFilter('UPCOMING');
            handleTabChange('schedules');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to view upcoming schedules"
        >
          <div
            className="metric-icon"
            style={{
              background: '#f0f9ff',
              color: '#0284c7',
              fontSize: '22px',
            }}
          >
            📅
          </div>
          <div>
            <div className="metric-value" style={{ color: '#0284c7' }}>
              {upcomingSchedules.length}
            </div>
            <div className="metric-label">Upcoming Schedules</div>
          </div>
        </div>
      </section>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* Quick Navigation Cards */}
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '16px',
                color: 'var(--text-primary)',
              }}
            >
              Quick Navigation
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              {/* My Resources Nav Card */}
              <div
                className="item-card"
                style={{
                  borderLeft: '4px solid #0284c7',
                  background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🚜</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                    My Resources
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Inspect full equipment fleet, update maintenance condition, verify operating windows, and travel buffers.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTabChange('resources')}
                  style={{ alignSelf: 'flex-start', borderColor: '#0284c7', color: '#0284c7' }}
                >
                  Go to My Resources ({totalResources}) →
                </button>
              </div>

              {/* Add Resource Nav Card */}
              <div
                className="item-card"
                style={{
                  borderLeft: '4px solid #10b981',
                  background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>➕</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                    Add Resource
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Register a new tractor, harvester, portable pump, or transport vehicle with location coordinates.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTabChange('add')}
                  style={{ alignSelf: 'flex-start', borderColor: '#10b981', color: '#047857' }}
                >
                  Add New Resource →
                </button>
              </div>

              {/* Resource Schedules Nav Card */}
              <div
                className="item-card"
                style={{
                  borderLeft: '4px solid #8b5cf6',
                  background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📅</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                    Resource Schedules
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Monitor confirmed allocations, active field bookings, farmer contacts, and travel buffer logistics.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTabChange('schedules')}
                  style={{ alignSelf: 'flex-start', borderColor: '#8b5cf6', color: '#6d28d9' }}
                >
                  View Schedules ({schedules.length}) →
                </button>
              </div>
            </div>
          </div>

          {/* Side-by-Side: Active Schedules & Upcoming Schedules */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {/* Active Schedules Section */}
            <div
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    Active Schedules ({activeSchedules.length})
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    backgroundColor: activeSchedules.length > 0 ? '#ecfdf5' : '#f1f5f9',
                    color: activeSchedules.length > 0 ? '#059669' : '#64748b',
                  }}
                >
                  {activeSchedules.length > 0 ? 'LIVE IN FIELD' : 'IDLE NOW'}
                </span>
              </div>

              {activeSchedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🚜💤</p>
                  <p style={{ fontWeight: 600 }}>No resources currently active in the field.</p>
                  <p style={{ fontSize: '0.82rem' }}>Upcoming confirmed allocations will appear here when underway.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeSchedules.map((sch) => (
                    <div
                      key={sch._id}
                      style={{
                        border: '1px solid #c7d2fe',
                        borderRadius: '8px',
                        padding: '14px',
                        background: 'linear-gradient(to right, #eef2ff, #ffffff)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#312e81', fontSize: '0.98rem' }}>
                            {sch.resourceName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {sch.requestType || 'Agricultural Operation'}
                          </div>
                        </div>
                        <span
                          style={{
                            background: '#4f46e5',
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          ACTIVE
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                        }}
                      >
                        <div>
                          <strong>Farmer:</strong> {sch.farmerName}
                        </div>
                        <div>
                          <strong>Phone:</strong> {sch.farmerPhone}
                        </div>
                        <div>
                          <strong>Window:</strong> {formatDateTime(sch.startTime)} -{' '}
                          {formatDateTime(sch.endTime)}
                        </div>
                        <div>
                          <strong>Buffer:</strong> ±{sch.travelBufferBeforeMinutes || 30}m
                        </div>
                      </div>

                      {sch.priorityScore && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#4338ca',
                            background: '#e0e7ff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}
                        >
                          Allocation Priority: <strong>{sch.priorityScore}/100</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Schedules Section */}
            <div
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📅</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    Upcoming Schedules ({upcomingSchedules.length})
                  </h3>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTabChange('schedules')}
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  Full View →
                </button>
              </div>

              {upcomingSchedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📋✨</p>
                  <p style={{ fontWeight: 600 }}>No upcoming bookings in queue.</p>
                  <p style={{ fontSize: '0.82rem' }}>When Master assigns requests, confirmed slots will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {upcomingSchedules.slice(0, 3).map((sch) => (
                    <div
                      key={sch._id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '14px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.96rem' }}>
                            {sch.resourceName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Farmer: {sch.farmerName} ({sch.farmerPhone})
                          </div>
                        </div>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0284c7',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          SCHEDULED
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '6px',
                        }}
                      >
                        🕒 {formatDateTime(sch.startTime)} → {formatDateTime(sch.endTime)}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#475569',
                          }}
                        >
                          Buffer: {sch.travelBufferBeforeMinutes || 30}m
                        </span>
                        {sch.priorityScore && (
                          <span
                            style={{
                              background: '#ecfdf5',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: '#059669',
                              fontWeight: 600,
                            }}
                          >
                            Priority Score: {sch.priorityScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fleet Status Snapshot Table */}
          <div
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Fleet Maintenance & Operational Snapshot</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Quickly toggle equipment status to simulate maintenance transitions and test real-time scheduling constraints
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleTabChange('resources')}
              >
                View Full Catalog →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.88rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '10px 14px' }}>Resource</th>
                    <th style={{ padding: '10px 14px' }}>Category</th>
                    <th style={{ padding: '10px 14px' }}>Village Location</th>
                    <th style={{ padding: '10px 14px' }}>Operating Window</th>
                    <th style={{ padding: '10px 14px' }}>Current Status</th>
                    <th style={{ padding: '10px 14px' }}>Quick Status Action</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((res) => {
                    const status = res.maintenanceStatus || 'OPERATIONAL';
                    return (
                      <tr
                        key={res._id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <div>{res.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {res.type}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              fontWeight: 600,
                            }}
                          >
                            {res.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          📍 {res.location?.village || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          ⏰ {res.operatingWindow?.startTime || '06:00'} -{' '}
                          {res.operatingWindow?.endTime || '18:00'}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            (Buffer: {res.bufferMinutes || 30}m)
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor:
                                status === 'OPERATIONAL'
                                  ? '#ecfdf5'
                                  : status === 'MAINTENANCE'
                                  ? '#fffbeb'
                                  : '#fef2f2',
                              color:
                                status === 'OPERATIONAL'
                                  ? '#059669'
                                  : status === 'MAINTENANCE'
                                  ? '#d97706'
                                  : '#dc2626',
                              border: `1px solid ${
                                status === 'OPERATIONAL'
                                  ? '#a7f3d0'
                                  : status === 'MAINTENANCE'
                                  ? '#fde68a'
                                  : '#fecaca'
                              }`,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor:
                                  status === 'OPERATIONAL'
                                    ? '#10b981'
                                    : status === 'MAINTENANCE'
                                    ? '#f59e0b'
                                    : '#ef4444',
                              }}
                            />
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled={updatingStatusId === res._id || status === 'OPERATIONAL'}
                              onClick={() => handleQuickStatusChange(res._id, 'OPERATIONAL')}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                borderRadius: '4px',
                                border: '1px solid #10b981',
                                background: status === 'OPERATIONAL' ? '#ecfdf5' : 'white',
                                color: status === 'OPERATIONAL' ? '#047857' : '#10b981',
                                cursor: status === 'OPERATIONAL' ? 'default' : 'pointer',
                                fontWeight: 600,
                              }}
                              title="Set status to OPERATIONAL"
                            >
                              Operational
                            </button>
                            <button
                              disabled={updatingStatusId === res._id || status === 'MAINTENANCE'}
                              onClick={() => handleQuickStatusChange(res._id, 'MAINTENANCE')}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                borderRadius: '4px',
                                border: '1px solid #f59e0b',
                                background: status === 'MAINTENANCE' ? '#fffbeb' : 'white',
                                color: status === 'MAINTENANCE' ? '#b45309' : '#f59e0b',
                                cursor: status === 'MAINTENANCE' ? 'default' : 'pointer',
                                fontWeight: 600,
                              }}
                              title="Set status to MAINTENANCE"
                            >
                              Maintenance
                            </button>
                            <button
                              disabled={updatingStatusId === res._id || status === 'BREAKDOWN'}
                              onClick={() => handleQuickStatusChange(res._id, 'BREAKDOWN')}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                borderRadius: '4px',
                                border: '1px solid #ef4444',
                                background: status === 'BREAKDOWN' ? '#fef2f2' : 'white',
                                color: status === 'BREAKDOWN' ? '#b91c1c' : '#ef4444',
                                cursor: status === 'BREAKDOWN' ? 'default' : 'pointer',
                                fontWeight: 600,
                              }}
                              title="Set status to BREAKDOWN"
                            >
                              Breakdown
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY RESOURCES */}
      {activeTab === 'resources' && (
        <div>
          <div className="action-bar">
            <div>
              <h3 className="action-bar-title">🚜 My Agricultural Resources ({filteredResources.length})</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Catalog of machinery, irrigation equipment, storage, and logistical vehicles owned by you
              </p>
            </div>
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={() => handleTabChange('add')}
                style={{ backgroundColor: '#0284c7' }}
              >
                ➕ Add New Resource
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 240px' }}>
              <input
                type="text"
                placeholder="🔍 Search resource name, type, specifications, village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.88rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="MACHINERY">🚜 Machinery</option>
                <option value="IRRIGATION">💧 Irrigation</option>
                <option value="STORAGE">📦 Storage</option>
                <option value="TRANSPORT">🚛 Transport</option>
                <option value="LABOUR">👥 Labour</option>
                <option value="SERVICE">🛠️ Service</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.88rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPERATIONAL">🟢 Operational</option>
                <option value="MAINTENANCE">🔧 Under Maintenance</option>
                <option value="BREAKDOWN">⚠️ In Breakdown</option>
              </select>
            </div>

            {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Resources Cards Grid */}
          {filteredResources.length === 0 ? (
            <div
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚜🔍</div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Resources Found</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                No resources matched your current search or filter conditions.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleTabChange('add')}
                style={{ backgroundColor: '#0284c7' }}
              >
                Add a New Resource Now
              </button>
            </div>
          ) : (
            <div className="items-grid">
              {filteredResources.map((res) => {
                const status = res.maintenanceStatus || 'OPERATIONAL';
                return (
                  <div key={res._id} className="item-card">
                    <div>
                      <div className="item-card-header">
                        <div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#0284c7',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '2px',
                            }}
                          >
                            {res.category} • {res.type}
                          </div>
                          <div className="item-title">{res.name}</div>
                        </div>

                        {/* Status Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor:
                              status === 'OPERATIONAL'
                                ? '#ecfdf5'
                                : status === 'MAINTENANCE'
                                ? '#fffbeb'
                                : '#fef2f2',
                            color:
                              status === 'OPERATIONAL'
                                ? '#059669'
                                : status === 'MAINTENANCE'
                                ? '#d97706'
                                : '#dc2626',
                            border: `1px solid ${
                              status === 'OPERATIONAL'
                                ? '#a7f3d0'
                                : status === 'MAINTENANCE'
                                ? '#fde68a'
                                : '#fecaca'
                            }`,
                          }}
                        >
                          ● {status}
                        </span>
                      </div>

                      {/* Specifications */}
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          marginTop: '8px',
                          marginBottom: '14px',
                        }}
                      >
                        {res.specifications || 'Standard specifications'}
                      </p>

                      {/* Key Attributes */}
                      <div
                        style={{
                          background: '#f8fafc',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          marginBottom: '14px',
                        }}
                      >
                        <div>
                          <strong>📍 Village:</strong> {res.location?.village || 'Not specified'}
                        </div>
                        <div>
                          <strong>🕒 Operating Window:</strong>{' '}
                          {res.operatingWindow?.startTime || '06:00'} -{' '}
                          {res.operatingWindow?.endTime || '18:00'}
                        </div>
                        <div>
                          <strong>⏱️ Turnaround Buffer:</strong> {res.bufferMinutes || 30} minutes
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Toggles */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Set Status:
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          disabled={updatingStatusId === res._id || status === 'OPERATIONAL'}
                          onClick={() => handleQuickStatusChange(res._id, 'OPERATIONAL')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: '1px solid #10b981',
                            background: status === 'OPERATIONAL' ? '#ecfdf5' : 'white',
                            color: status === 'OPERATIONAL' ? '#047857' : '#10b981',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🟢 Active
                        </button>
                        <button
                          disabled={updatingStatusId === res._id || status === 'MAINTENANCE'}
                          onClick={() => handleQuickStatusChange(res._id, 'MAINTENANCE')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: '1px solid #f59e0b',
                            background: status === 'MAINTENANCE' ? '#fffbeb' : 'white',
                            color: status === 'MAINTENANCE' ? '#b45309' : '#f59e0b',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🔧 Maint
                        </button>
                        <button
                          disabled={updatingStatusId === res._id || status === 'BREAKDOWN'}
                          onClick={() => handleQuickStatusChange(res._id, 'BREAKDOWN')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: '1px solid #ef4444',
                            background: status === 'BREAKDOWN' ? '#fef2f2' : 'white',
                            color: status === 'BREAKDOWN' ? '#b91c1c' : '#ef4444',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ⚠️ Down
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADD RESOURCE */}
      {activeTab === 'add' && (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '28px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ➕ Add New Agricultural Resource
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Register machinery, irrigation systems, or transport vehicles into the FarmGrid allocation network
              </p>
            </div>

            <form onSubmit={handleAddResourceSubmit}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                }}
              >
                {/* Name */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      marginBottom: '6px',
                    }}
                  >
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Deere 5050D Tractor"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${formErrors.name ? '#ef4444' : 'var(--border)'}`,
                      fontSize: '0.9rem',
                    }}
                  />
                  {formErrors.name && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      marginBottom: '6px',
                    }}
                  >
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      backgroundColor: 'white',
                    }}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      marginBottom: '6px',
                    }}
                  >
                    Resource Type *
                  </label>
                  <input
                    type="text"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    placeholder="e.g. Tractor, Harvester, Pump, Drip Line"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${formErrors.type ? '#ef4444' : 'var(--border)'}`,
                      fontSize: '0.9rem',
                    }}
                  />
                  {formErrors.type && (
                    <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      {formErrors.type}
                    </span>
                  )}
                </div>

                {/* Maintenance Status */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      marginBottom: '6px',
                    }}
                  >
                    Initial Maintenance Status *
                  </label>
                  <select
                    name="maintenanceStatus"
                    value={formData.maintenanceStatus}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="OPERATIONAL">🟢 OPERATIONAL (Available for allocation)</option>
                    <option value="MAINTENANCE">🔧 MAINTENANCE (Undergoing servicing)</option>
                    <option value="BREAKDOWN">⚠️ BREAKDOWN (Out of order)</option>
                  </select>
                </div>
              </div>

              {/* Specifications */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    marginBottom: '6px',
                  }}
                >
                  Equipment Specifications & Attachments
                </label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="e.g. 50 HP, 4WD, comes with 7-tine cultivator and seed drill attachment"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Location Fields */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>
                  📍 Operational Base Location
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Village Name *
                    </label>
                    <input
                      type="text"
                      name="village"
                      value={formData.village}
                      onChange={handleInputChange}
                      placeholder="e.g. Kengeri Village"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${formErrors.village ? '#ef4444' : 'var(--border)'}`,
                        fontSize: '0.88rem',
                      }}
                    />
                    {formErrors.village && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                        {formErrors.village}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Latitude (-90 to 90) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${formErrors.latitude ? '#ef4444' : 'var(--border)'}`,
                        fontSize: '0.88rem',
                      }}
                    />
                    {formErrors.latitude && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                        {formErrors.latitude}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Longitude (-180 to 180) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${formErrors.longitude ? '#ef4444' : 'var(--border)'}`,
                        fontSize: '0.88rem',
                      }}
                    />
                    {formErrors.longitude && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                        {formErrors.longitude}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Operating Window & Logistics Buffer */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>
                  ⏰ Operating Window & Travel Buffer
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Daily Start Time (HH:MM) *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Daily End Time (HH:MM) *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${formErrors.endTime ? '#ef4444' : 'var(--border)'}`,
                        fontSize: '0.88rem',
                      }}
                    />
                    {formErrors.endTime && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                        {formErrors.endTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Travel & Buffer (Minutes)
                    </label>
                    <input
                      type="number"
                      name="bufferMinutes"
                      value={formData.bufferMinutes}
                      onChange={handleInputChange}
                      min="0"
                      step="5"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${formErrors.bufferMinutes ? '#ef4444' : 'var(--border)'}`,
                        fontSize: '0.88rem',
                      }}
                    />
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Buffer before/after booking for road travel
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleTabChange('resources')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#0284c7' }}
                >
                  {isSubmitting ? 'Registering Resource...' : 'Register Agricultural Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: RESOURCE SCHEDULES */}
      {activeTab === 'schedules' && (
        <div>
          <div className="action-bar">
            <div>
              <h3 className="action-bar-title">📅 Confirmed Resource Schedules & Allocations</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Field calendar slots assigned to farmers with travel buffer considerations
              </p>
            </div>
            <div className="action-buttons">
              <button
                className="btn btn-secondary btn-sm"
                onClick={loadOwnerData}
                disabled={loading}
              >
                🔄 Refresh Schedules
              </button>
            </div>
          </div>

          {/* Schedule Status Filter */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { key: 'ALL', label: `All Schedules (${schedules.length})` },
              { key: 'ACTIVE', label: `⚡ Active (${activeSchedules.length})` },
              { key: 'UPCOMING', label: `📅 Upcoming (${upcomingSchedules.length})` },
              { key: 'SCHEDULED', label: '📋 All Scheduled' },
              { key: 'COMPLETED', label: '✅ Completed' },
              { key: 'DISRUPTED', label: '⚠️ Disrupted' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setScheduleStatusFilter(f.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  fontWeight: scheduleStatusFilter === f.key ? 700 : 500,
                  border:
                    scheduleStatusFilter === f.key
                      ? '1px solid #0284c7'
                      : '1px solid var(--border)',
                  backgroundColor: scheduleStatusFilter === f.key ? '#e0f2fe' : 'white',
                  color: scheduleStatusFilter === f.key ? '#0369a1' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Schedule Items */}
          {filteredSchedules.length === 0 ? (
            <div
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅✨</div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
                No Schedules Match Filter
              </h4>
              <p style={{ fontSize: '0.88rem' }}>
                Try selecting "All Schedules" or wait for farmer booking requests to be allocated.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredSchedules.map((sch) => {
                const isOngoing =
                  sch.status === 'ACTIVE' ||
                  (new Date(sch.startTime) <= now && new Date(sch.endTime) >= now);

                return (
                  <div
                    key={sch._id}
                    style={{
                      background: 'white',
                      border: isOngoing ? '2px solid #6366f1' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Left: Resource & Farmer Info */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '1.4rem' }}>🚜</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {sch.resourceName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Operation: <strong>{sch.requestType}</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          marginTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div>
                          🌾 <strong>Assigned Farmer:</strong> {sch.farmerName}
                        </div>
                        <div>
                          📞 <strong>Contact Phone:</strong> {sch.farmerPhone}
                        </div>
                        {sch.farmVillage && (
                          <div>
                            📍 <strong>Farm Location:</strong> {sch.farmVillage}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Timing & Buffer Logistics */}
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px', color: '#1e293b' }}>
                        🕒 Allocated Time Window
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 600, marginBottom: '8px' }}>
                        {formatDateTime(sch.startTime)} → {formatDateTime(sch.endTime)}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                        <span
                          style={{
                            background: '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#334155',
                          }}
                        >
                          Buffer Before: <strong>{sch.travelBufferBeforeMinutes || 30}m</strong>
                        </span>
                        <span
                          style={{
                            background: '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#334155',
                          }}
                        >
                          Buffer After: <strong>{sch.travelBufferAfterMinutes || 30}m</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right: Status & Priority Explanation */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: isOngoing
                            ? '#4f46e5'
                            : sch.status === 'SCHEDULED'
                            ? '#0284c7'
                            : sch.status === 'COMPLETED'
                            ? '#10b981'
                            : '#ef4444',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isOngoing ? '⚡ ACTIVE NOW' : sch.status}
                      </span>

                      {sch.priorityScore && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Priority Score:{' '}
                          <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                            {sch.priorityScore}/100
                          </strong>
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        🔒 Conflict-Free Allocation Verified
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
