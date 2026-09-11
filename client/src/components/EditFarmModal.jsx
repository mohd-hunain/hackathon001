import React, { useState, useEffect } from 'react';
import { updateFarm } from '../services/api';

const VALID_CROP_STAGES = [
  { value: 'SOWING', label: 'SOWING (Initial sowing / seed establishment)' },
  { value: 'GROWING', label: 'GROWING (Vegetative & regular growth)' },
  { value: 'HARVEST_READY', label: 'HARVEST_READY (Peak harvest window)' },
  { value: 'CRITICAL', label: 'CRITICAL (Urgent weather/biological risk)' },
];

export default function EditFarmModal({ farm, isOpen, onClose, onFarmUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    village: '',
    latitude: '',
    longitude: '',
    cropType: '',
    cropStage: 'GROWING',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (farm && isOpen) {
      setFormData({
        name: farm.name || '',
        village: farm.location?.village || '',
        latitude: farm.location?.latitude !== undefined ? String(farm.location.latitude) : '',
        longitude: farm.location?.longitude !== undefined ? String(farm.location.longitude) : '',
        cropType: farm.cropType || '',
        cropStage: farm.cropStage || 'GROWING',
      });
      setErrors({});
      setServerError('');
    }
  }, [farm, isOpen]);

  if (!isOpen || !farm) return null;

  // Client-side validation function with user-friendly error messages
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
      errs.cropType = 'Crop type is required (e.g. Wheat, Rice, Cotton).';
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

      const res = await updateFarm(farm._id, payload);

      if (res && res.success) {
        if (onFarmUpdated) {
          onFarmUpdated(res.data);
        }
        onClose();
      } else {
        setServerError(res?.message || 'Failed to update farm details.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'An unexpected error occurred while updating the farm.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Edit Farm Details</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Updating farm information for <strong>{farm.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ fontSize: '20px', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {serverError && (
              <div className="alert-banner error">
                <span>⚠️ {serverError}</span>
                <button
                  type="button"
                  onClick={() => setServerError('')}
                  style={{ color: '#b91c1c' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Farm Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-farm-name">
                Farm Name *
              </label>
              <input
                id="edit-farm-name"
                type="text"
                className={`form-input ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g. Green Valley Farm"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
              />
              {errors.name && <div className="form-error-text">⚠️ {errors.name}</div>}
            </div>

            {/* Village */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-village">
                Village / Taluk
              </label>
              <input
                id="edit-village"
                type="text"
                className="form-input"
                placeholder="e.g. Mandya Taluk, Kaveri Basin"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              />
              <div className="form-hint-text">
                Rural jurisdiction or village settlement where the farm is located.
              </div>
            </div>

            {/* Coordinates */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-latitude">
                  Latitude (-90 to 90) *
                </label>
                <input
                  id="edit-latitude"
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
                <label className="form-label" htmlFor="edit-longitude">
                  Longitude (-180 to 180) *
                </label>
                <input
                  id="edit-longitude"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="preset-chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                📍 Auto-Detect Current GPS
              </button>
            </div>

            {/* Crop Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-crop-type">
                Crop Type *
              </label>
              <input
                id="edit-crop-type"
                type="text"
                className={`form-input ${errors.cropType ? 'is-invalid' : ''}`}
                placeholder="e.g. Wheat, Paddy Rice, Sugarcane, Cotton"
                value={formData.cropType}
                onChange={(e) => {
                  setFormData({ ...formData, cropType: e.target.value });
                  if (errors.cropType) setErrors({ ...errors, cropType: undefined });
                }}
              />
              {errors.cropType && <div className="form-error-text">⚠️ {errors.cropType}</div>}
            </div>

            {/* Crop Stage */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-crop-stage">
                Biological Crop Stage *
              </label>
              <select
                id="edit-crop-stage"
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
                  '🚨 Critical: High vulnerability window (e.g. pest, drought, waterlogging). Receives highest priority in the allocation engine.'}
                {formData.cropStage === 'HARVEST_READY' &&
                  '🌾 Harvest Ready: Crop maturity reached. High urgency to mobilize machinery before weather degradation.'}
                {formData.cropStage === 'SOWING' &&
                  '🌱 Sowing: Planting window requires timely tillage and seeding equipment.'}
                {formData.cropStage === 'GROWING' &&
                  '🌿 Growing: Vegetative development stage. Regular irrigation and maintenance scheduling.'}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              id="btn-submit-edit-farm"
            >
              {loading ? 'Saving Changes...' : '💾 Update Farm (PATCH)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
