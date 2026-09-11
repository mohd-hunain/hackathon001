import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createFarm } from '../services/api';

const VALID_CROP_STAGES = [
  { value: 'SOWING', label: 'SOWING — Initial seed establishment' },
  { value: 'GROWING', label: 'GROWING — Vegetative & vegetative growth' },
  { value: 'HARVEST_READY', label: 'HARVEST_READY — Peak harvest maturity' },
  { value: 'CRITICAL', label: 'CRITICAL — Urgent biological / weather threat' },
];

const QUICK_CROPS = ['Wheat', 'Rice (Paddy)', 'Cotton', 'Sugarcane', 'Maize', 'Tomatoes', 'Soybeans'];

const REGION_PRESETS = [
  { name: 'Mandya Basin', lat: '12.5238', lng: '76.8971', village: 'Mandya Rural' },
  { name: 'Kengeri Belt', lat: '12.9177', lng: '77.4838', village: 'Kengeri Village' },
  { name: 'Hassan Zone', lat: '13.0033', lng: '76.1004', village: 'Hassan Taluk' },
  { name: 'Shimoga Plains', lat: '13.9299', lng: '75.5681', village: 'Shimoga East' },
  { name: 'Raichur Dryland', lat: '16.2120', lng: '77.3439', village: 'Raichur Basin' },
];

export default function AddFarm({ onFarmCreated }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    village: '',
    latitude: '12.9716',
    longitude: '77.5946',
    cropType: 'Wheat',
    cropStage: 'GROWING',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Field validation function
  const validate = () => {
    const errs = {};

    // 1. Farm name
    if (!formData.name || !formData.name.trim()) {
      errs.name = 'Farm name is required and cannot be empty.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Farm name must be at least 2 characters.';
    }

    // 2. Latitude
    if (formData.latitude === '' || formData.latitude === null || formData.latitude === undefined) {
      errs.latitude = 'Latitude coordinate is required.';
    } else {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || !isFinite(lat)) {
        errs.latitude = 'Latitude must be a valid number.';
      } else if (lat < -90 || lat > 90) {
        errs.latitude = 'Latitude must be between -90 and +90 degrees.';
      }
    }

    // 3. Longitude
    if (formData.longitude === '' || formData.longitude === null || formData.longitude === undefined) {
      errs.longitude = 'Longitude coordinate is required.';
    } else {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || !isFinite(lng)) {
        errs.longitude = 'Longitude must be a valid number.';
      } else if (lng < -180 || lng > 180) {
        errs.longitude = 'Longitude must be between -180 and +180 degrees.';
      }
    }

    // 4. Crop type
    if (!formData.cropType || !formData.cropType.trim()) {
      errs.cropType = 'Crop type is required (e.g. Wheat, Rice, Sugarcane).';
    }

    // 5. Crop stage
    if (!formData.cropStage || !['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'].includes(formData.cropStage)) {
      errs.cropStage = 'Please select a valid biological crop stage.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        location: {
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          village: formData.village.trim(),
        },
        cropType: formData.cropType.trim(),
        cropStage: formData.cropStage,
      };

      const res = await createFarm(payload);

      if (res && res.success) {
        setSuccessMsg('Farm successfully registered in the grid!');
        if (onFarmCreated) {
          onFarmCreated(res.data);
        }
        setTimeout(() => {
          navigate('/farms');
        }, 1200);
      } else {
        setServerError(res?.message || 'Failed to create farm.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'An error occurred while connecting to the server.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      latitude: preset.lat,
      longitude: preset.lng,
      village: preset.village,
    }));
    setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({
        ...prev,
        latitude: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
      },
      (geoError) => {
        setErrors((prev) => ({
          ...prev,
          latitude: `Location error: ${geoError.message || 'Unable to retrieve location.'}`,
        }));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="dashboard-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <Link to="/farms">My Farms</Link>
        <span>/</span>
        <span className="current">Register New Farm</span>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🌾 Register New Farm
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Enter your agricultural land details and coordinates to request scarce machinery & irrigation.
          </p>
        </div>
        <Link to="/farms" className="btn btn-secondary">
          ← Back to My Farms
        </Link>
      </div>

      {serverError && (
        <div className="alert-banner error">
          <span>⚠️ <strong>Error:</strong> {serverError}</span>
          <button type="button" onClick={() => setServerError('')} style={{ color: '#b91c1c' }}>
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner success">
          <span>✅ <strong>Success:</strong> {successMsg} Redirecting to My Farms...</span>
        </div>
      )}

      <div
        className="item-card"
        style={{
          maxWidth: '780px',
          margin: '0 auto',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
          background: 'white',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Identity */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              1. Farm Identification
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="farm-name">
                Farm Name *
              </label>
              <input
                id="farm-name"
                type="text"
                className={`form-input ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g. Tungabhadra Agri Sector 4"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
              />
              {errors.name ? (
                <div className="form-error-text">⚠️ {errors.name}</div>
              ) : (
                <div className="form-hint-text">A unique, recognizable name for this plot or farm holding.</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="village-name">
                Village / Taluk / District
              </label>
              <input
                id="village-name"
                type="text"
                className="form-input"
                placeholder="e.g. Kengeri Hobli, Ramanagara"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              />
              <div className="form-hint-text">
                Helps dispatchers identify local clusters for shared transport & machinery.
              </div>
            </div>
          </div>

          {/* Section 2: Precise Geolocation */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                2. Geolocation Coordinates
              </h3>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="preset-chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                📍 Auto-Detect GPS
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Coordinates are critical for FarmGrid's priority algorithm to calculate transit time, travel buffers, and proximity scores under scarcity.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="farm-lat">
                  Latitude (-90 to 90) *
                </label>
                <input
                  id="farm-lat"
                  type="number"
                  step="any"
                  className={`form-input ${errors.latitude ? 'is-invalid' : ''}`}
                  placeholder="e.g. 12.9716"
                  value={formData.latitude}
                  onChange={(e) => {
                    setFormData({ ...formData, latitude: e.target.value });
                    if (errors.latitude) setErrors({ ...errors, latitude: undefined });
                  }}
                />
                {errors.latitude && <div className="form-error-text">⚠️ {errors.latitude}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="farm-lng">
                  Longitude (-180 to 180) *
                </label>
                <input
                  id="farm-lng"
                  type="number"
                  step="any"
                  className={`form-input ${errors.longitude ? 'is-invalid' : ''}`}
                  placeholder="e.g. 77.5946"
                  value={formData.longitude}
                  onChange={(e) => {
                    setFormData({ ...formData, longitude: e.target.value });
                    if (errors.longitude) setErrors({ ...errors, longitude: undefined });
                  }}
                />
                {errors.longitude && <div className="form-error-text">⚠️ {errors.longitude}</div>}
              </div>
            </div>

            {/* Quick Regional Coordinate Presets */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Demo Coordinates Presets:
              </span>
              <div className="presets-group">
                {REGION_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="preset-chip"
                    onClick={() => handleApplyPreset(p)}
                  >
                    📍 {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Agricultural Crop Parameters */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              3. Crop Details & Biological Stage
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="crop-type">
                Crop Type *
              </label>
              <input
                id="crop-type"
                type="text"
                className={`form-input ${errors.cropType ? 'is-invalid' : ''}`}
                placeholder="e.g. Wheat, Rice, Cotton, Sugarcane"
                value={formData.cropType}
                onChange={(e) => {
                  setFormData({ ...formData, cropType: e.target.value });
                  if (errors.cropType) setErrors({ ...errors, cropType: undefined });
                }}
              />
              {errors.cropType && <div className="form-error-text">⚠️ {errors.cropType}</div>}

              {/* Quick Crop Tags */}
              <div className="presets-group" style={{ marginTop: '8px' }}>
                {QUICK_CROPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`preset-chip ${formData.cropType === c ? 'active' : ''}`}
                    onClick={() => {
                      setFormData({ ...formData, cropType: c });
                      if (errors.cropType) setErrors({ ...errors, cropType: undefined });
                    }}
                  >
                    🌱 {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="crop-stage">
                Biological Crop Stage *
              </label>
              <select
                id="crop-stage"
                className={`form-select ${errors.cropStage ? 'is-invalid' : ''}`}
                value={formData.cropStage}
                onChange={(e) => {
                  setFormData({ ...formData, cropStage: e.target.value });
                  if (errors.cropStage) setErrors({ ...errors, cropStage: undefined });
                }}
              >
                {VALID_CROP_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.cropStage && <div className="form-error-text">⚠️ {errors.cropStage}</div>}

              <div className="stage-desc-card">
                {formData.cropStage === 'CRITICAL' &&
                  '🚨 CRITICAL: High crop vulnerability. FarmGrid grants maximum biological points in scarce allocation.'}
                {formData.cropStage === 'HARVEST_READY' &&
                  '🌾 HARVEST READY: High urgency to deploy harvesters/storage before degradation.'}
                {formData.cropStage === 'SOWING' &&
                  '🌱 SOWING: Seeding and initial irrigation window prioritization.'}
                {formData.cropStage === 'GROWING' &&
                  '🌿 GROWING: Regular cultivation, sprayers, and water pump scheduling.'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <Link to="/farms" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              id="btn-save-new-farm"
            >
              {loading ? 'Creating Farm in Grid...' : '🌾 Save Farm (POST /api/farms)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
