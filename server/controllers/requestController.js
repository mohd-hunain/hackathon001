const mongoose = require('mongoose');
const { BookingRequest, Farm, Resource } = require('../models');

const VALID_CROP_STAGES = ['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'];

// @desc    Submit a new resource booking request
// @route   POST /api/requests
// @access  Protected (FARMER)
const createRequest = async (req, res) => {
  try {
    const {
      farmId,
      resourceId,
      resourceType,
      earliestStart,
      latestEnd,
      requiredDurationMinutes,
      cropStage,
      urgencyJustification,
      weatherRiskScore,
      resourceConstraintScore,
      syncStatus,
    } = req.body;

    const currentFarmerId = (req.user._id || req.user.id).toString();

    // 1. Verify farm exists and belongs to the logged-in Farmer
    if (!farmId || !mongoose.Types.ObjectId.isValid(farmId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Farm ID is required',
      });
    }

    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found',
      });
    }

    if (farm.farmerId.toString() !== currentFarmerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Farm does not belong to the logged-in Farmer',
      });
    }

    // 2. Validate resourceType
    if (!resourceType || typeof resourceType !== 'string' || !resourceType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Resource type is required',
      });
    }

    // 3. Validate optional resourceId format
    if (resourceId && !mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format',
      });
    }

    // 4. Validate requested time window
    if (!earliestStart || !latestEnd) {
      return res.status(400).json({
        success: false,
        message: 'Both earliestStart and latestEnd are required',
      });
    }

    const start = new Date(earliestStart);
    const end = new Date(latestEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for earliestStart or latestEnd',
      });
    }

    // earliestStart must be before latestEnd
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'earliestStart must be before latestEnd',
      });
    }

    // 5. Validate requiredDurationMinutes and verify that it fits inside the window
    if (
      requiredDurationMinutes === undefined ||
      requiredDurationMinutes === null ||
      requiredDurationMinutes === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'requiredDurationMinutes is required',
      });
    }

    const duration = Number(requiredDurationMinutes);
    if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Required duration must be a positive number of minutes',
      });
    }

    const windowMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    if (duration > windowMinutes) {
      return res.status(400).json({
        success: false,
        message: `Required duration (${duration} mins) exceeds the requested time window (${windowMinutes} mins)`,
      });
    }

    // 6. Validate cropStage
    const resolvedCropStage = cropStage || farm.cropStage || 'GROWING';
    if (!VALID_CROP_STAGES.includes(resolvedCropStage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid crop stage: '${resolvedCropStage}'. Valid stages are: ${VALID_CROP_STAGES.join(', ')}`,
      });
    }

    // 7. Prepare the request for the shared priority engine
    // Frontend priorityScore is strictly ignored and calculated only on the backend
    let cropReadinessScore = 10;
    if (resolvedCropStage === 'CRITICAL') {
      cropReadinessScore = 20;
    } else if (resolvedCropStage === 'HARVEST_READY') {
      cropReadinessScore = 18;
    } else if (resolvedCropStage === 'GROWING') {
      cropReadinessScore = 12;
    } else if (resolvedCropStage === 'SOWING') {
      cropReadinessScore = 10;
    }

    let weatherScore = 10;
    if (weatherRiskScore !== undefined && weatherRiskScore !== null && weatherRiskScore !== '') {
      const parsedWeather = Number(weatherRiskScore);
      if (!isNaN(parsedWeather) && isFinite(parsedWeather)) {
        weatherScore = Math.min(25, Math.max(0, parsedWeather));
      }
    }

    let urgencyScore = 15;
    if (windowMinutes <= duration * 1.25) {
      urgencyScore = 24;
    } else if (windowMinutes <= duration * 1.75) {
      urgencyScore = 20;
    } else if (windowMinutes <= duration * 2.5) {
      urgencyScore = 16;
    } else {
      urgencyScore = 12;
    }

    const queueScore = 5;
    const distanceScore = 8;

    let constraintScore = 4;
    if (
      resourceConstraintScore !== undefined &&
      resourceConstraintScore !== null &&
      resourceConstraintScore !== ''
    ) {
      const parsedConstraint = Number(resourceConstraintScore);
      if (!isNaN(parsedConstraint) && isFinite(parsedConstraint)) {
        constraintScore = Math.min(5, Math.max(0, parsedConstraint));
      }
    }

    const priorityScore = Math.min(
      100,
      urgencyScore + weatherScore + cropReadinessScore + queueScore + distanceScore + constraintScore
    );

    const priorityBreakdown = {
      urgencyDeadline: urgencyScore,
      weatherRisk: weatherScore,
      cropReadiness: cropReadinessScore,
      queueWaiting: queueScore,
      distanceLogistics: distanceScore,
      resourceConstraints: constraintScore,
    };

    const explanation = `Request prepared for priority scheduler. Initial score: ${priorityScore}/100 (Urgency: ${urgencyScore}/25, Weather Risk: ${weatherScore}/25, Crop Readiness: ${cropReadinessScore}/20, Queue: ${queueScore}/15, Distance: ${distanceScore}/10, Constraints: ${constraintScore}/5).`;

    // 8. Save the request with status 'PENDING'
    const request = await BookingRequest.create({
      farmerId: currentFarmerId,
      farmId: farm._id,
      resourceId: resourceId || null,
      resourceType: resourceType.trim(),
      earliestStart: start,
      latestEnd: end,
      requiredDurationMinutes: duration,
      cropStage: resolvedCropStage,
      urgencyJustification:
        urgencyJustification && typeof urgencyJustification === 'string'
          ? urgencyJustification.trim()
          : '',
      weatherRiskScore: weatherScore,
      resourceConstraintScore: constraintScore,
      priorityScore,
      priorityBreakdown,
      status: 'PENDING',
      explanation,
      syncStatus: syncStatus || 'SYNCED',
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request created successfully',
      data: request,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error creating booking request',
    });
  }
};

// @desc    Get current farmer's booking requests
// @route   GET /api/requests/my
// @access  Protected (FARMER, MASTER)
const getMyRequests = async (req, res) => {
  try {
    const farmerId = req.user._id || req.user.id;
    const requests = await BookingRequest.find({ farmerId })
      .populate('farmId', 'name location cropType cropStage')
      .populate('resourceId', 'name category type specifications location')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching requests',
    });
  }
};

// @desc    Get single request by ID
// @route   GET /api/requests/:id
// @access  Protected
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BookingRequest.findById(id)
      .populate('farmerId', 'name phone email address')
      .populate('farmId', 'name location cropType cropStage')
      .populate('resourceId', 'name category type specifications location operatingWindow');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Booking request not found',
      });
    }

    // Role verification: only owner, resource owner (if resource assigned), or master can view
    const userId = (req.user._id || req.user.id).toString();
    if (
      request.farmerId._id.toString() !== userId &&
      req.user.role !== 'MASTER' &&
      req.user.role !== 'RESOURCE_OWNER'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request',
      });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching request',
    });
  }
};

// @desc    Cancel a booking request
// @route   PATCH /api/requests/:id/cancel
// @access  Protected (FARMER, MASTER)
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BookingRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Booking request not found',
      });
    }

    const userId = (req.user._id || req.user.id).toString();
    if (request.farmerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request',
      });
    }

    if (request.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking',
      });
    }

    request.status = 'CANCELLED';
    request.explanation = `${request.explanation || ''} [Cancelled by user at ${new Date().toISOString()}]`;
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Booking request cancelled successfully',
      data: request,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error cancelling request',
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  cancelRequest,
};
