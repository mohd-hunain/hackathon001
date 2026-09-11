import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyFarms, getResources, createRequest } from '../services/api';
import { checkIsOnline, getPendingCount } from '../services/offlineQueue';

const VALID_CROP_STAGES = [
  { value: 'SOWING', label: 'SOWING — Planting & initial germination' },
  { value: 'GROWING', label: 'GROWING — Active vegetative growth' },
  { value: 'HARVEST_READY', label: 'HARVEST_READY — Mature crop, high priority harvest window' },
  { value: 'CRITICAL', label: 'CRITICAL — Severe pest, weather, or water threat' },
];

const STANDARD_RESOURCE_TYPES = [
  'Tractor',
  'Harvester',
  'Mini Truck',
  'Portable Pump',
  'Drip Line',
  'Sprinkler Set',
  'Solar Storage',
  'Cold Storage',
  'Drone Spraying',
  'Sowing Team',
  'Weeding Team',
  'Harvesting Team',
];

const DURATION_PRESETS = [
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
  { label: '4 Hours (Half Day)', minutes: 240 },
  { label: '8 Hours (Full Day)', minutes: 480 },
];

export default function RequestForm({
  preselectedResourceId = null,
  preselectedFarmId = null,
  onSuccess = null,
  isEmbedded = false,
}) {
  const navigate = useNavigate();

  // Data sources
  const [farms, setFarms] = useState([]);
  const [resources, setResources] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form Fields
  const [formData, setFormData] = useState({
    farmId: preselectedFarmId || '',
    resourceId: preselectedResourceId || '',
    resourceType: 'Tractor',
    earliestStart: '',
    latestEnd: '',
    requiredDurationMinutes: 120,
    cropStage: 'GROWING',
    urgencyJustification: '',
    weatherRiskScore: 10,
    resourceConstraintScore: 3,
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successBanner, setSuccessBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper to format ISO to datetime-local
  const toLocalISO = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  // Initialize dates
  useEffect(() => {
    const now = new Date();
    // Default window: starting in 2 hours, ending in 8 hours
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      earliestStart: prev.earliestStart || toLocalISO(start),
      latestEnd: prev.latestEnd || toLocalISO(end),
    }));
  }, []);

  // Fetch farms and resources
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [farmsRes, resourcesRes] = await Promise.all([
          getMyFarms().catch(() => ({ success: false, data: [] })),
          getResources().catch(() => ({ success: false, data: [] })),
        ]);

        const farmList = farmsRes.data || [];
        const resList = resourcesRes.data || [];

        setFarms(farmList);
        setResources(resList);

        // Pre-selection handling
        setFormData((prev) => {
          let updatedFarmId = prev.farmId;
          let updatedCropStage = prev.cropStage;
          let updatedResourceId = prev.resourceId || preselectedResourceId || '';
          let updatedResourceType = prev.resourceType;

          if (!updatedFarmId && farmList.length > 0) {
            updatedFarmId = farmList[0]._id;
            updatedCropStage = farmList[0].cropStage || 'GROWING';
          }

          if (updatedResourceId) {
            const match = resList.find((r) => r._id === updatedResourceId);
            if (match) {
              updatedResourceType = match.type || prev.resourceType;
            }
          }

          return {
            ...prev,
            farmId: updatedFarmId,
            cropStage: updatedCropStage,
            resourceId: updatedResourceId,
            resourceType: updatedResourceType,
          };
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [preselectedResourceId, preselectedFarmId]);

  // When a specific resource is chosen, synchronize its type
  const handleResourceSelect = (resId) => {
    if (!resId) {
      setFormData((prev) => ({ ...prev, resourceId: '' }));
      return;
    }
    const match = resources.find((r) => r._id === resId);
    setFormData((prev) => ({
      ...prev,
      resourceId: resId,
      resourceType: match ? match.type : prev.resourceType,
    }));
    if (errors.resourceType) setErrors((prev) => ({ ...prev, resourceType: undefined }));
  };

  // When a farm is selected, auto-sync its default cropStage
  const handleFarmSelect = (fId) => {
    const match = farms.find((f) => f._id === fId);
    setFormData((prev) => ({
      ...prev,
      farmId: fId,
      cropStage: match?.cropStage || prev.cropStage,
    }));
    if (errors.farmId) setErrors((prev) => ({ ...prev, farmId: undefined }));
  };

  // Calculate window and duration compatibility
  const getWindowDetails = () => {
    if (!formData.earliestStart || !formData.latestEnd) {
      return { isValid: false, windowMinutes: 0, error: 'Start and End times are required' };
    }

    const start = new Date(formData.earliestStart);
    const end = new Date(formData.latestEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, windowMinutes: 0, error: 'Invalid datetime format' };
    }

    if (start >= end) {
      return { isValid: false, windowMinutes: 0, error: 'Earliest Start must be strictly before Latest End' };
    }

    const windowMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    const duration = Number(formData.requiredDurationMinutes) || 0;

    if (duration <= 0) {
      return { isValid: false, windowMinutes, error: 'Duration must be greater than 0 minutes' };
    }

    if (duration > windowMinutes) {
      return {
        isValid: false,
        windowMinutes,
        error: `Required duration (${duration} mins) exceeds requested window (${windowMinutes} mins)`,
      };
    }

    const flexibilityMinutes = windowMinutes - duration;

    return {
      isValid: true,
      windowMinutes,
      duration,
      flexibilityMinutes,
      message: `${duration} mins operating time inside ${windowMinutes} mins window (${flexibilityMinutes} mins scheduler buffer)`,
    };
  };

  const windowCheck = getWindowDetails();

  // Validate form before submit
  const validate = () => {
    const errs = {};

    // 1. Farm
    if (!formData.farmId) {
      errs.farmId = 'Please select a registered farm.';
    }

    // 2. Resource Type
    if (!formData.resourceType || !formData.resourceType.trim()) {
      errs.resourceType = 'Resource type is required.';
    }

    // 3. Time Window & Duration
    if (!formData.earliestStart) {
      errs.earliestStart = 'Earliest start time is required.';
    }
    if (!formData.latestEnd) {
      errs.latestEnd = 'Latest acceptable end time is required.';
    }

    if (formData.earliestStart && formData.latestEnd) {
      const start = new Date(formData.earliestStart);
      const end = new Date(formData.latestEnd);

      if (start >= end) {
        errs.latestEnd = 'Latest End must be after Earliest Start.';
      } else {
        const windowMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        const duration = Number(formData.requiredDurationMinutes);

        if (!duration || duration <= 0) {
          errs.requiredDurationMinutes = 'Duration must be greater than 0 minutes.';
        } else if (duration > windowMinutes) {
          errs.requiredDurationMinutes = `Duration (${duration} mins) cannot exceed the time window (${windowMinutes} mins).`;
        }
      }
    }

    // 4. Crop Stage
    if (!formData.cropStage || !['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'].includes(formData.cropStage)) {
      errs.cropStage = 'Please select a valid biological crop stage.';
    }

    // 5. Weather Risk Score
    const weather = Number(formData.weatherRiskScore);
    if (isNaN(weather) || weather < 0 || weather > 25) {
      errs.weatherRiskScore = 'Weather risk input must be between 0 and 25.';
    }

    // 6. Resource Constraint Score
    const constraint = Number(formData.resourceConstraintScore);
    if (isNaN(constraint) || constraint < 0 || constraint > 5) {
      errs.resourceConstraintScore = 'Resource constraint input must be between 0 and 5.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit to POST /api/requests
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessBanner(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      // NOTE: Priority score is NOT calculated on frontend per explicit hackathon rule.
      // Frontend submits purely the collected parameters, and backend calculates the deterministic score.
      const payload = {
        farmId: formData.farmId,
        resourceId: formData.resourceId || undefined,
        resourceType: formData.resourceType.trim(),
        earliestStart: new Date(formData.earliestStart).toISOString(),
        latestEnd: new Date(formData.latestEnd).toISOString(),
        requiredDurationMinutes: Number(formData.requiredDurationMinutes),
        cropStage: formData.cropStage,
        urgencyJustification: formData.urgencyJustification.trim(),
        weatherRiskScore: Number(formData.weatherRiskScore),
        resourceConstraintScore: Number(formData.resourceConstraintScore),
      };

      const res = await createRequest(payload);

      if (res && res.success) {
        const currentPending = getPendingCount();
        setSuccessBanner({
          offline: !!res.offline,
          pendingCount: currentPending,
          message: res.offline
            ? `Request successfully saved offline! Assigned local status PENDING_OFFLINE. (Total pending in offline queue: ${currentPending}). It will automatically synchronize when internet connection returns.`
            : 'Booking request submitted successfully to FarmGrid Central Dispatch!',
        });

        if (onSuccess) {
          onSuccess(res.data);
        } else {
          setTimeout(() => {
            navigate('/requests');
          }, 2000);
        }
      } else {
        setServerError(res?.message || 'Failed to submit request.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'An error occurred while connecting to FarmGrid server.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>🔄</div>
        <div className="empty-title">Loading Farms & Resources...</div>
      </div>
    );
  }

  const isCurrentlyOnline = checkIsOnline();
  const currentPendingCount = getPendingCount();

  return (
    <div>
      {/* Offline Status Notice */}
      {!isCurrentlyOnline && (
        <div
          className="alert-banner error"
          style={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            color: '#b45309',
            marginBottom: '16px',
          }}
        >
          <div>
            <strong>📡 Offline Mode Active:</strong> You are currently offline. Your request will be securely saved in local storage with status <code>PENDING_OFFLINE</code> and will automatically send when connection is restored.
            <div style={{ fontSize: '0.8rem', marginTop: '2px', fontWeight: 600 }}>
              Current offline queue: {currentPendingCount} request{currentPendingCount !== 1 ? 's' : ''} pending sync.
            </div>
          </div>
        </div>
      )}

      {serverError && (
        <div className="alert-banner error">
          <span>⚠️ <strong>Error:</strong> {serverError}</span>
          <button type="button" onClick={() => setServerError('')} style={{ color: '#b91c1c' }}>
            ✕
          </button>
        </div>
      )}

      {successBanner && (
        <div
          className={`alert-banner ${successBanner.offline ? 'error' : 'success'}`}
          style={
            successBanner.offline
              ? { backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e', display: 'block' }
              : {}
          }
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>{successBanner.offline ? '💾' : '✅'}</span>
            <div>
              <strong>{successBanner.offline ? 'Request Saved Offline (PENDING_OFFLINE)' : 'Success!'}</strong>
              <div style={{ marginTop: '2px', fontSize: '0.88rem' }}>{successBanner.message}</div>
              {successBanner.offline && (
                <div style={{ marginTop: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
                  📊 Pending Requests in Local Queue: {successBanner.pendingCount}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Farm notice if no farms registered */}
      {farms.length === 0 && (
        <div className="alert-banner error" style={{ marginBottom: '20px' }}>
          <div>
            <strong>No farms registered!</strong> You need at least one farm with coordinates to schedule resources.
          </div>
          <Link to="/farms/add" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            + Register Farm Now
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 1. Farm Selection */}
        <div className="form-group">
          <label className="form-label" htmlFor="request-farm">
            Target Farm (Location & Soil Readiness) *
          </label>
          <select
            id="request-farm"
            className={`form-select ${errors.farmId ? 'is-invalid' : ''}`}
            value={formData.farmId}
            onChange={(e) => handleFarmSelect(e.target.value)}
          >
            <option value="">-- Choose Farm Holding --</option>
            {farms.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.location?.village || 'Local'} • {f.cropType} • Stage: {f.cropStage})
              </option>
            ))}
          </select>
          {errors.farmId && <div className="form-error-text">⚠️ {errors.farmId}</div>}
          {formData.farmId && (
            <div className="form-hint-text">
              Dispatch coordinates will use farm's registered geolocation for transit & buffer calculations.
            </div>
          )}
        </div>

        {/* 2. Resource Selection */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="request-resource-id">
              Specific Grid Resource (Optional)
            </label>
            <select
              id="request-resource-id"
              className="form-select"
              value={formData.resourceId}
              onChange={(e) => handleResourceSelect(e.target.value)}
            >
              <option value="">-- Any Compatible Resource in Grid --</option>
              {resources.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.category} • {r.type} • {r.location?.village || 'Depot'})
                </option>
              ))}
            </select>
            <div className="form-hint-text">
              Target a specific unit, or leave open for the scheduling engine to find the nearest compatible unit.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="request-resource-type">
              Required Resource Type *
            </label>
            <select
              id="request-resource-type"
              className={`form-select ${errors.resourceType ? 'is-invalid' : ''}`}
              value={formData.resourceType}
              onChange={(e) => {
                setFormData({ ...formData, resourceType: e.target.value });
                if (errors.resourceType) setErrors({ ...errors, resourceType: undefined });
              }}
            >
              {STANDARD_RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.resourceType && <div className="form-error-text">⚠️ {errors.resourceType}</div>}
          </div>
        </div>

        {/* 3. Requested Time Window */}
        <div style={{ marginTop: '10px', marginBottom: '16px' }}>
          <label className="form-label" style={{ marginBottom: '8px' }}>
            Requested Time Window (Earliest Possible Start & Latest Acceptable End) *
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Specifying a flexible time window gives the scheduling engine room to avoid overlaps and route equipment efficiently.
          </p>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="detail-label" htmlFor="earliest-start">
                EARLIEST POSSIBLE START
              </label>
              <input
                id="earliest-start"
                type="datetime-local"
                className={`form-input ${errors.earliestStart ? 'is-invalid' : ''}`}
                value={formData.earliestStart}
                onChange={(e) => {
                  setFormData({ ...formData, earliestStart: e.target.value });
                  if (errors.earliestStart) setErrors({ ...errors, earliestStart: undefined });
                }}
              />
              {errors.earliestStart && <div className="form-error-text">⚠️ {errors.earliestStart}</div>}
            </div>

            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="detail-label" htmlFor="latest-end">
                LATEST ACCEPTABLE END
              </label>
              <input
                id="latest-end"
                type="datetime-local"
                className={`form-input ${errors.latestEnd ? 'is-invalid' : ''}`}
                value={formData.latestEnd}
                onChange={(e) => {
                  setFormData({ ...formData, latestEnd: e.target.value });
                  if (errors.latestEnd) setErrors({ ...errors, latestEnd: undefined });
                }}
              />
              {errors.latestEnd && <div className="form-error-text">⚠️ {errors.latestEnd}</div>}
            </div>
          </div>

          {/* Time Window Live Compatibility Indicator */}
          <div className="window-summary-box">
            <span>
              <strong>Window Status:</strong>{' '}
              {windowCheck.isValid ? (
                <span className="window-valid">✓ {windowCheck.message}</span>
              ) : (
                <span className="window-invalid">✕ {windowCheck.error}</span>
              )}
            </span>
          </div>
        </div>

        {/* 4. Required Duration */}
        <div className="form-group">
          <label className="form-label" htmlFor="required-duration">
            Required Operating Duration (Minutes) *
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              id="required-duration"
              type="number"
              min="1"
              step="15"
              className={`form-input ${errors.requiredDurationMinutes ? 'is-invalid' : ''}`}
              style={{ maxWidth: '200px' }}
              value={formData.requiredDurationMinutes}
              onChange={(e) => {
                setFormData({ ...formData, requiredDurationMinutes: e.target.value });
                if (errors.requiredDurationMinutes) {
                  setErrors({ ...errors, requiredDurationMinutes: undefined });
                }
              }}
            />
            <div className="presets-group" style={{ margin: 0 }}>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  className={`preset-chip ${Number(formData.requiredDurationMinutes) === p.minutes ? 'active' : ''}`}
                  onClick={() => {
                    setFormData({ ...formData, requiredDurationMinutes: p.minutes });
                    if (errors.requiredDurationMinutes) {
                      setErrors({ ...errors, requiredDurationMinutes: undefined });
                    }
                  }}
                >
                  ⏱️ {p.label}
                </button>
              ))}
            </div>
          </div>
          {errors.requiredDurationMinutes && (
            <div className="form-error-text">⚠️ {errors.requiredDurationMinutes}</div>
          )}
        </div>

        {/* 5. Crop Stage */}
        <div className="form-group">
          <label className="form-label" htmlFor="request-crop-stage">
            Current Crop Biological Stage *
          </label>
          <select
            id="request-crop-stage"
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
              '🚨 Critical: Imminent risk. Backend algorithm evaluates highest biological readiness score.'}
            {formData.cropStage === 'HARVEST_READY' &&
              '🌾 Harvest Ready: Priority allocation to prevent crop spoilage and yield loss.'}
            {formData.cropStage === 'SOWING' &&
              '🌱 Sowing: Planting window requires prompt coordination.'}
            {formData.cropStage === 'GROWING' &&
              '🌿 Growing: Vegetative management and regular irrigation.'}
          </div>
        </div>

        {/* 6. Urgency Justification */}
        <div className="form-group">
          <label className="form-label" htmlFor="urgency-justification">
            Urgency Justification & Field Notes
          </label>
          <textarea
            id="urgency-justification"
            rows="3"
            className="form-textarea"
            placeholder="Explain agricultural urgency (e.g. Unseasonal rain alert in 48 hours; harvesting must complete before rain; borewell dried up and requires portable pump urgently)."
            value={formData.urgencyJustification}
            onChange={(e) => setFormData({ ...formData, urgencyJustification: e.target.value })}
          />
          <div className="form-hint-text">
            Provided for human-readable audit trail and transparent decision explanation.
          </div>
        </div>

        {/* 7. Weather Risk Input (0 - 25) */}
        <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="weather-risk-input" style={{ margin: 0 }}>
              🌧️ Weather Risk Exposure Input (0 to 25 Points)
            </label>
            <span className="score-bubble">
              {formData.weatherRiskScore} / 25
            </span>
          </div>
          <div className="score-range-wrap">
            <input
              id="weather-risk-input"
              type="range"
              min="0"
              max="25"
              step="1"
              value={formData.weatherRiskScore}
              onChange={(e) => setFormData({ ...formData, weatherRiskScore: Number(e.target.value) })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>0: Clear Skies / Stable</span>
            <span>12: Moderate Rain Forecast</span>
            <span>25: Extreme Storm / Flood Alert</span>
          </div>
          {errors.weatherRiskScore && <div className="form-error-text">⚠️ {errors.weatherRiskScore}</div>}
        </div>

        {/* 8. Resource Constraint Input (0 - 5) */}
        <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="constraint-input" style={{ margin: 0 }}>
              ⚙️ Resource Constraint / Scarcity Severity Input (0 to 5 Points)
            </label>
            <span className="score-bubble">
              {formData.resourceConstraintScore} / 5
            </span>
          </div>
          <div className="score-range-wrap">
            <input
              id="constraint-input"
              type="range"
              min="0"
              max="5"
              step="1"
              value={formData.resourceConstraintScore}
              onChange={(e) => setFormData({ ...formData, resourceConstraintScore: Number(e.target.value) })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>0: Abundant Alternatives</span>
            <span>3: High Regional Demand</span>
            <span>5: Single Bottleneck Machine in Taluk</span>
          </div>
          {errors.resourceConstraintScore && (
            <div className="form-error-text">⚠️ {errors.resourceConstraintScore}</div>
          )}
        </div>

        {/* Notice on Priority Scoring */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '10px 14px', borderRadius: '8px', margin: '16px 0' }}>
          ℹ️ <strong>Transparent Allocation Rule:</strong> Final priority score (out of 100) and slot feasibility are calculated deterministically by FarmGrid backend services. The frontend does not calculate scores.
        </div>

        {/* Form Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {!isEmbedded && (
            <Link to="/" className="btn btn-secondary">
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={submitting || !windowCheck.isValid || farms.length === 0}
            className="btn btn-primary"
            id="btn-submit-booking-request"
            style={{ minWidth: '180px' }}
          >
            {submitting ? 'Submitting to Grid...' : '🚀 Submit Request (POST /api/requests)'}
          </button>
        </div>
      </form>
    </div>
  );
}
