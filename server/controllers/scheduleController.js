const { Schedule, Resource, BookingRequest } = require('../models');

// @desc    Get schedule for a specific resource
// @route   GET /api/schedule/resource/:resourceId
// @access  Protected
const getResourceSchedule = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const schedules = await Schedule.find({ resourceId })
      .populate('farmerId', 'name phone')
      .populate('requestId', 'resourceType requiredDurationMinutes cropStage priorityScore')
      .sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      resource: {
        id: resource._id,
        name: resource.name,
        type: resource.type,
        operatingWindow: resource.operatingWindow,
        bufferMinutes: resource.bufferMinutes,
        maintenanceStatus: resource.maintenanceStatus,
      },
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching resource schedule',
    });
  }
};

// @desc    Generate feasible schedule slots
// @route   POST /api/schedule/generate
// @access  Protected (MASTER)
const generateSchedule = async (req, res) => {
  try {
    const { requestId, resourceId } = req.body;

    // Skeleton implementation: calculate potential feasible slot
    let request;
    if (requestId) {
      request = await BookingRequest.findById(requestId).populate('farmId');
    }

    let resource;
    if (resourceId) {
      resource = await Resource.findById(resourceId);
    } else if (request && request.resourceId) {
      resource = await Resource.findById(request.resourceId);
    }

    if (!resource) {
      return res.status(400).json({
        success: false,
        message: 'A valid resource must be provided to evaluate feasible schedule slots',
      });
    }

    const existingSchedules = await Schedule.find({
      resourceId: resource._id,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
    }).sort({ startTime: 1 });

    // Feasible slot skeleton generator
    const candidateStart = request ? new Date(request.earliestStart) : new Date();
    const durationMs = (request ? request.requiredDurationMinutes : 120) * 60 * 1000;
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);

    const isConflict = existingSchedules.some(
      (s) => candidateStart < s.endTime && candidateEnd > s.startTime
    );

    const candidateSlots = [
      {
        resourceId: resource._id,
        resourceName: resource.name,
        startTime: candidateStart,
        endTime: candidateEnd,
        travelBufferBeforeMinutes: resource.bufferMinutes || 30,
        travelBufferAfterMinutes: resource.bufferMinutes || 30,
        isFeasible: !isConflict && resource.maintenanceStatus === 'OPERATIONAL',
        conflictReason: isConflict
          ? 'Time slot overlaps with existing confirmed allocation'
          : resource.maintenanceStatus !== 'OPERATIONAL'
          ? `Resource is currently in ${resource.maintenanceStatus} status`
          : null,
      },
    ];

    return res.status(200).json({
      success: true,
      message: 'Candidate feasible schedule slots generated',
      data: {
        resourceId: resource._id,
        candidateSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating schedule',
    });
  }
};

module.exports = {
  getResourceSchedule,
  generateSchedule,
};
