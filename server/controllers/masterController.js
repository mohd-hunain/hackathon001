const {
  BookingRequest,
  Resource,
  Schedule,
  Disruption,
} = require('../models');

// @desc    Get Master dashboard overview
// @route   GET /api/master/dashboard
// @access  Protected (MASTER)
const getMasterDashboard = async (req, res) => {
  try {
    const [
      totalResources,
      operationalResources,
      pendingRequests,
      allocatedRequests,
      activeSchedules,
      activeDisruptions,
    ] = await Promise.all([
      Resource.countDocuments(),
      Resource.countDocuments({ maintenanceStatus: 'OPERATIONAL' }),
      BookingRequest.countDocuments({ status: 'PENDING' }),
      BookingRequest.countDocuments({ status: 'ALLOCATED' }),
      Schedule.countDocuments({ status: { $in: ['SCHEDULED', 'ACTIVE'] } }),
      Disruption.countDocuments({ status: 'ACTIVE' }),
    ]);

    const recentPendingRequests = await BookingRequest.find({ status: 'PENDING' })
      .populate('farmerId', 'name phone')
      .populate('farmId', 'name location cropType cropStage')
      .populate('resourceId', 'name category type')
      .sort({ priorityScore: -1 })
      .limit(10);

    const activeSchedulesList = await Schedule.find({
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
    })
      .populate('farmerId', 'name')
      .populate('resourceId', 'name type location')
      .sort({ startTime: 1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalResources,
          operationalResources,
          pendingRequests,
          allocatedRequests,
          activeSchedules,
          activeDisruptions,
        },
        recentPendingRequests,
        activeSchedules: activeSchedulesList,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching master dashboard data',
    });
  }
};

// @desc    Get all requests sorted by priority score
// @route   GET /api/master/requests
// @access  Protected (MASTER)
const getMasterRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await BookingRequest.find(filter)
      .populate('farmerId', 'name phone email address')
      .populate('farmId', 'name location cropType cropStage')
      .populate('resourceId', 'name category type location operatingWindow maintenanceStatus')
      .sort({ priorityScore: -1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching master requests',
    });
  }
};

// @desc    Detect overlapping requests and scheduling conflicts
// @route   GET /api/master/conflicts
// @access  Protected (MASTER)
const getMasterConflicts = async (req, res) => {
  try {
    // Find pending requests competing for the same resource or same resource type
    const pendingRequests = await BookingRequest.find({
      status: { $in: ['PENDING', 'UNDER_REVIEW'] },
    })
      .populate('farmerId', 'name phone')
      .populate('farmId', 'name location cropType cropStage')
      .populate('resourceId', 'name type location')
      .sort({ priorityScore: -1 });

    const conflicts = [];

    // Check time overlap: newStartTime < existingEndTime && newEndTime > existingStartTime
    for (let i = 0; i < pendingRequests.length; i++) {
      for (let j = i + 1; j < pendingRequests.length; j++) {
        const reqA = pendingRequests[i];
        const reqB = pendingRequests[j];

        const sameResource =
          reqA.resourceId &&
          reqB.resourceId &&
          reqA.resourceId._id.toString() === reqB.resourceId._id.toString();
        const sameType = reqA.resourceType === reqB.resourceType;

        if (sameResource || sameType) {
          const overlap =
            new Date(reqA.earliestStart) < new Date(reqB.latestEnd) &&
            new Date(reqA.latestEnd) > new Date(reqB.earliestStart);

          if (overlap) {
            conflicts.push({
              resourceType: reqA.resourceType,
              resourceId: reqA.resourceId ? reqA.resourceId._id : null,
              resourceName: reqA.resourceId ? reqA.resourceId.name : 'Unassigned',
              competingRequests: [
                {
                  requestId: reqA._id,
                  farmerName: reqA.farmerId ? reqA.farmerId.name : 'Unknown',
                  cropStage: reqA.cropStage,
                  priorityScore: reqA.priorityScore,
                  priorityBreakdown: reqA.priorityBreakdown,
                  earliestStart: reqA.earliestStart,
                  latestEnd: reqA.latestEnd,
                },
                {
                  requestId: reqB._id,
                  farmerName: reqB.farmerId ? reqB.farmerId.name : 'Unknown',
                  cropStage: reqB.cropStage,
                  priorityScore: reqB.priorityScore,
                  priorityBreakdown: reqB.priorityBreakdown,
                  earliestStart: reqB.earliestStart,
                  latestEnd: reqB.latestEnd,
                },
              ],
              recommendation:
                reqA.priorityScore >= reqB.priorityScore
                  ? `Prioritize Farmer ${reqA.farmerId?.name || 'A'} (Score ${reqA.priorityScore} vs ${reqB.priorityScore}) due to higher scarcity priority.`
                  : `Prioritize Farmer ${reqB.farmerId?.name || 'B'} (Score ${reqB.priorityScore} vs ${reqA.priorityScore}) due to higher scarcity priority.`,
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      count: conflicts.length,
      data: conflicts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error detecting conflicts',
    });
  }
};

// @desc    Allocate scarce resource to a request
// @route   POST /api/master/allocate
// @access  Protected (MASTER)
const allocateResource = async (req, res) => {
  try {
    const {
      requestId,
      resourceId,
      allocatedStart,
      allocatedEnd,
      travelBufferBeforeMinutes,
      travelBufferAfterMinutes,
      explanation,
    } = req.body;

    const request = await BookingRequest.findById(requestId).populate('farmerId');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Booking request not found',
      });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Time conflict check against existing confirmed schedules
    const existingConflicts = await Schedule.find({
      resourceId,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      startTime: { $lt: new Date(allocatedEnd) },
      endTime: { $gt: new Date(allocatedStart) },
    });

    if (existingConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Double booking prevented! Selected time window overlaps with an existing schedule.',
        conflictingSchedules: existingConflicts,
      });
    }

    // Default human-readable explanation if not provided
    const allocExplanation =
      explanation ||
      `Allocated ${resource.name} (${resource.type}) to Farmer ${request.farmerId?.name || 'Farmer'} from ${new Date(allocatedStart).toLocaleTimeString()} to ${new Date(allocatedEnd).toLocaleTimeString()} based on priority score ${request.priorityScore}/100 and feasible travel logistics.`;

    // Create Schedule entry
    const schedule = await Schedule.create({
      resourceId,
      requestId,
      farmerId: request.farmerId._id || request.farmerId,
      startTime: allocatedStart,
      endTime: allocatedEnd,
      travelBufferBeforeMinutes: travelBufferBeforeMinutes || resource.bufferMinutes || 30,
      travelBufferAfterMinutes: travelBufferAfterMinutes || resource.bufferMinutes || 30,
      status: 'SCHEDULED',
    });

    // Update BookingRequest
    request.status = 'ALLOCATED';
    request.resourceId = resourceId;
    request.allocatedStart = allocatedStart;
    request.allocatedEnd = allocatedEnd;
    request.explanation = allocExplanation;
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Resource successfully allocated',
      data: {
        schedule,
        request,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error during allocation',
    });
  }
};

module.exports = {
  getMasterDashboard,
  getMasterRequests,
  getMasterConflicts,
  allocateResource,
};
