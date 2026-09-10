const { BookingRequest, Farm, Resource } = require('../models');

// @desc    Submit a new resource booking request
// @route   POST /api/requests
// @access  Protected (FARMER, MASTER)
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
      syncStatus,
    } = req.body;

    const farmerId = req.user._id || req.user.id;

    // Verify farm exists and belongs to farmer
    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found',
      });
    }

    // Default benchmark scoring skeleton (will be refined by the full priorityScorer engine)
    const urgencyDeadlineScore = 15;
    const weatherRiskScore = 10;
    const cropReadinessScore = cropStage === 'CRITICAL' ? 20 : cropStage === 'HARVEST_READY' ? 18 : 10;
    const queueWaitingScore = 5;
    const distanceLogisticsScore = 8;
    const resourceConstraintsScore = 4;
    const priorityScore =
      urgencyDeadlineScore +
      weatherRiskScore +
      cropReadinessScore +
      queueWaitingScore +
      distanceLogisticsScore +
      resourceConstraintsScore;

    const priorityBreakdown = {
      urgencyDeadline: urgencyDeadlineScore,
      weatherRisk: weatherRiskScore,
      cropReadiness: cropReadinessScore,
      queueWaiting: queueWaitingScore,
      distanceLogistics: distanceLogisticsScore,
      resourceConstraints: resourceConstraintsScore,
    };

    const explanation = `Request submitted for ${resourceType}. Initial priority score: ${priorityScore}/100 based on crop stage ${cropStage} and scheduling deadlines.`;

    const request = await BookingRequest.create({
      farmerId,
      farmId,
      resourceId: resourceId || null,
      resourceType,
      earliestStart,
      latestEnd,
      requiredDurationMinutes,
      cropStage: cropStage || farm.cropStage,
      urgencyJustification: urgencyJustification || '',
      weatherRiskScore,
      resourceConstraintScore: resourceConstraintsScore,
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
