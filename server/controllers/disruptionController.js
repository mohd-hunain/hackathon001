const {
  Disruption,
  Schedule,
  Resource,
  BookingRequest,
} = require('../models');

// @desc    Simulate/report a disruption
// @route   POST /api/disruptions
// @access  Protected (MASTER, RESOURCE_OWNER)
const createDisruption = async (req, res) => {
  try {
    const {
      resourceId,
      type,
      startTime,
      estimatedEndTime,
      description,
    } = req.body;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Set resource maintenance status to BREAKDOWN or MAINTENANCE if breakdown
    if (type === 'BREAKDOWN') {
      resource.maintenanceStatus = 'BREAKDOWN';
      await resource.save();
    }

    const start = new Date(startTime);
    const end = estimatedEndTime ? new Date(estimatedEndTime) : new Date(start.getTime() + 4 * 3600 * 1000);

    // Identify affected active or scheduled schedules
    const affectedSchedules = await Schedule.find({
      resourceId,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    const affectedScheduleIds = affectedSchedules.map((s) => s._id);

    // Mark affected schedules as DISRUPTED
    if (affectedScheduleIds.length > 0) {
      await Schedule.updateMany(
        { _id: { $in: affectedScheduleIds } },
        { status: 'DISRUPTED' }
      );

      // Also update linked booking requests to DISRUPTED
      const affectedRequestIds = affectedSchedules.map((s) => s.requestId);
      await BookingRequest.updateMany(
        { _id: { $in: affectedRequestIds } },
        {
          status: 'DISRUPTED',
          explanation: `Disruption [${type}] occurred on resource ${resource.name}: ${description || 'Unexpected disruption'}. Awaiting dynamic reallocation.`,
        }
      );
    }

    const disruption = await Disruption.create({
      resourceId,
      type,
      startTime: start,
      estimatedEndTime: end,
      description: description || `Simulated ${type} event on ${resource.name}`,
      affectedScheduleIds,
      status: 'ACTIVE',
    });

    return res.status(201).json({
      success: true,
      message: 'Disruption recorded and affected schedules marked',
      data: {
        disruption,
        affectedSchedulesCount: affectedScheduleIds.length,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error recording disruption',
    });
  }
};

// @desc    Trigger dynamic reallocation for a disruption
// @route   POST /api/disruptions/:id/reallocate
// @access  Protected (MASTER)
const reallocateDisruption = async (req, res) => {
  try {
    const { id } = req.params;
    const disruption = await Disruption.findById(id).populate('resourceId');

    if (!disruption) {
      return res.status(404).json({
        success: false,
        message: 'Disruption not found',
      });
    }

    // Find affected schedules
    const affectedSchedules = await Schedule.find({
      _id: { $in: disruption.affectedScheduleIds },
    })
      .populate('requestId')
      .populate('farmerId');

    // Find alternative compatible operational resources
    const alternativeResources = await Resource.find({
      _id: { $ne: disruption.resourceId._id },
      category: disruption.resourceId.category,
      type: disruption.resourceId.type,
      maintenanceStatus: 'OPERATIONAL',
    });

    const reallocationResults = [];

    for (const schedule of affectedSchedules) {
      const request = schedule.requestId;
      let reallocated = false;

      // 1. Try finding an alternative operational resource
      if (alternativeResources.length > 0) {
        const altResource = alternativeResources[0];

        // Check conflicts on alternative resource
        const conflict = await Schedule.findOne({
          resourceId: altResource._id,
          status: { $in: ['SCHEDULED', 'ACTIVE'] },
          startTime: { $lt: schedule.endTime },
          endTime: { $gt: schedule.startTime },
        });

        if (!conflict) {
          const explanation = `${disruption.resourceId.name} became unavailable due to ${disruption.type}. Reallocated to ${altResource.name} as the nearest operational compatible resource.`;

          // Update existing schedule
          schedule.resourceId = altResource._id;
          schedule.status = 'SCHEDULED';
          await schedule.save();

          // Update request
          if (request) {
            request.resourceId = altResource._id;
            request.status = 'ALLOCATED';
            request.explanation = explanation;
            await request.save();
          }

          reallocationResults.push({
            scheduleId: schedule._id,
            reallocatedTo: altResource.name,
            strategy: 'ALTERNATIVE_RESOURCE',
            explanation,
          });
          reallocated = true;
        }
      }

      // 2. If no alternative resource or conflict exists, shift to next feasible slot
      if (!reallocated) {
        const shiftedStart = new Date(disruption.estimatedEndTime || Date.now() + 3600 * 1000);
        const durationMs = schedule.endTime - schedule.startTime;
        const shiftedEnd = new Date(shiftedStart.getTime() + durationMs);

        const explanation = `${disruption.resourceId.name} experienced ${disruption.type}. Rescheduled to next feasible slot after disruption recovery at ${shiftedStart.toLocaleTimeString()}.`;

        schedule.startTime = shiftedStart;
        schedule.endTime = shiftedEnd;
        schedule.status = 'SCHEDULED';
        await schedule.save();

        if (request) {
          request.allocatedStart = shiftedStart;
          request.allocatedEnd = shiftedEnd;
          request.status = 'ALLOCATED';
          request.explanation = explanation;
          await request.save();
        }

        reallocationResults.push({
          scheduleId: schedule._id,
          reallocatedTo: disruption.resourceId.name,
          strategy: 'SHIFTED_SLOT',
          explanation,
        });
      }
    }

    disruption.status = 'RESOLVED';
    await disruption.save();

    return res.status(200).json({
      success: true,
      message: 'Dynamic reallocation completed successfully',
      data: {
        disruptionId: disruption._id,
        reallocations: reallocationResults,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error executing dynamic reallocation',
    });
  }
};

// @desc    Get all disruptions
// @route   GET /api/disruptions
// @access  Protected
const getDisruptions = async (req, res) => {
  try {
    const disruptions = await Disruption.find()
      .populate('resourceId', 'name category type location maintenanceStatus')
      .populate({
        path: 'affectedScheduleIds',
        populate: { path: 'farmerId', select: 'name phone' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: disruptions.length,
      data: disruptions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching disruptions',
    });
  }
};

module.exports = {
  createDisruption,
  reallocateDisruption,
  getDisruptions,
};
