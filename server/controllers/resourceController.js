const { Resource, Schedule, BookingRequest } = require('../models');

// Valid enum constants
const VALID_CATEGORIES = ['MACHINERY', 'IRRIGATION', 'STORAGE', 'TRANSPORT', 'LABOUR', 'SERVICE'];
const VALID_MAINTENANCE_STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN'];

// Validate HH:MM time format
function isValidTimeString(str) {
  if (typeof str !== 'string') return false;
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// Convert HH:MM to total minutes for comparison
function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

// Validate operating window object
function validateOperatingWindow(operatingWindow) {
  const errors = [];

  if (!operatingWindow || typeof operatingWindow !== 'object') {
    return errors; // Optional field; defaults apply at model level
  }

  const { startTime, endTime } = operatingWindow;

  if (startTime !== undefined) {
    if (!isValidTimeString(startTime)) {
      errors.push('operatingWindow.startTime must be in HH:MM format (e.g., "06:00")');
    }
  }

  if (endTime !== undefined) {
    if (!isValidTimeString(endTime)) {
      errors.push('operatingWindow.endTime must be in HH:MM format (e.g., "18:00")');
    }
  }

  // If both are valid, check that startTime < endTime
  const st = startTime || '06:00';
  const et = endTime || '18:00';
  if (isValidTimeString(st) && isValidTimeString(et)) {
    if (timeToMinutes(st) >= timeToMinutes(et)) {
      errors.push('operatingWindow.startTime must be earlier than operatingWindow.endTime');
    }
  }

  return errors;
}

// @desc    Get all resources for browsing (Farmer-facing & general)
// @route   GET /api/resources
// @access  Protected
// Note: Availability is NOT calculated permanently. A resource with existing bookings
// must still appear because availability depends on requested time windows.
const getAllResources = async (req, res) => {
  try {
    const { category, type, maintenanceStatus } = req.query;
    const filter = {};

    if (category) {
      filter.category = category.trim().toUpperCase();
    }
    if (type) {
      filter.type = { $regex: new RegExp(`^${type.trim()}$`, 'i') };
    }
    if (maintenanceStatus) {
      filter.maintenanceStatus = maintenanceStatus.trim().toUpperCase();
    }

    const resources = await Resource.find(filter)
      .populate('ownerId', 'name phone email')
      .sort({ createdAt: -1 });

    // Explicitly format and map fields needed by Farmers
    const formattedResources = resources.map((resource) => {
      const doc = resource.toObject ? resource.toObject() : resource;
      return {
        _id: doc._id,
        name: doc.name,
        category: doc.category,
        type: doc.type,
        specifications: doc.specifications || '',
        location: {
          latitude: doc.location ? doc.location.latitude : undefined,
          longitude: doc.location ? doc.location.longitude : undefined,
          village: (doc.location && doc.location.village) || '',
        },
        operatingWindow: {
          startTime: (doc.operatingWindow && doc.operatingWindow.startTime) || '06:00',
          endTime: (doc.operatingWindow && doc.operatingWindow.endTime) || '18:00',
        },
        maintenanceStatus: doc.maintenanceStatus || 'OPERATIONAL',
        bufferMinutes: doc.bufferMinutes !== undefined ? doc.bufferMinutes : 30,
        ownerId: doc.ownerId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedResources.length,
      data: formattedResources,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching resources',
    });
  }
};

// @desc    Create a new agricultural resource
// @route   POST /api/resources
// @access  Protected (RESOURCE_OWNER, MASTER)
const createResource = async (req, res) => {
  try {
    const {
      name,
      category,
      type,
      specifications,
      location,
      operatingWindow,
      maintenanceStatus,
      bufferMinutes,
    } = req.body;

    // --- Field-level validation ---
    const validationErrors = [];

    if (!name || typeof name !== 'string' || !name.trim()) {
      validationErrors.push('Resource name is required');
    }

    if (!category) {
      validationErrors.push('Category is required');
    } else if (!VALID_CATEGORIES.includes(category.trim().toUpperCase())) {
      validationErrors.push(
        `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`
      );
    }

    if (!type || typeof type !== 'string' || !type.trim()) {
      validationErrors.push('Resource type is required');
    }

    // Location validation
    if (!location || typeof location !== 'object') {
      validationErrors.push('Location object with latitude and longitude is required');
    } else {
      if (location.latitude === undefined || location.latitude === null || typeof location.latitude !== 'number') {
        validationErrors.push('location.latitude is required and must be a number');
      } else if (location.latitude < -90 || location.latitude > 90) {
        validationErrors.push('location.latitude must be between -90 and 90');
      }
      if (location.longitude === undefined || location.longitude === null || typeof location.longitude !== 'number') {
        validationErrors.push('location.longitude is required and must be a number');
      } else if (location.longitude < -180 || location.longitude > 180) {
        validationErrors.push('location.longitude must be between -180 and 180');
      }
    }

    // Operating window validation
    if (operatingWindow) {
      const windowErrors = validateOperatingWindow(operatingWindow);
      validationErrors.push(...windowErrors);
    }

    // Maintenance status validation
    if (maintenanceStatus) {
      if (!VALID_MAINTENANCE_STATUSES.includes(maintenanceStatus.trim().toUpperCase())) {
        validationErrors.push(
          `Invalid maintenanceStatus "${maintenanceStatus}". Must be one of: ${VALID_MAINTENANCE_STATUSES.join(', ')}`
        );
      }
    }

    // Buffer minutes validation
    if (bufferMinutes !== undefined && bufferMinutes !== null) {
      if (typeof bufferMinutes !== 'number' || isNaN(bufferMinutes)) {
        validationErrors.push('bufferMinutes must be a number');
      } else if (bufferMinutes < 0) {
        validationErrors.push('bufferMinutes cannot be negative');
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Normalise category to uppercase
    const normalizedCategory = category.trim().toUpperCase();
    const normalizedMaintenanceStatus = maintenanceStatus
      ? maintenanceStatus.trim().toUpperCase()
      : 'OPERATIONAL';

    const resource = await Resource.create({
      ownerId: req.user._id || req.user.id,
      name: name.trim(),
      category: normalizedCategory,
      type: type.trim(),
      specifications: specifications ? specifications.trim() : '',
      location,
      operatingWindow: operatingWindow || { startTime: '06:00', endTime: '18:00' },
      maintenanceStatus: normalizedMaintenanceStatus,
      bufferMinutes: bufferMinutes !== undefined && bufferMinutes !== null ? bufferMinutes : 30,
    });

    return res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource,
    });
  } catch (error) {
    // Handle Mongoose validation errors gracefully
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Error creating resource',
    });
  }
};

// @desc    Get resources owned by the logged-in owner
// @route   GET /api/resources/my
// @access  Protected (RESOURCE_OWNER, MASTER)
const getMyResources = async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const resources = await Resource.find({ ownerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching owner resources',
    });
  }
};

// @desc    Update resource details
// @route   PATCH /api/resources/:id
// @access  Protected (RESOURCE_OWNER, MASTER)
const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Check ownership — a Resource Owner can only modify their own resources
    const userId = (req.user._id || req.user.id).toString();
    if (resource.ownerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this resource. You can only modify your own resources.',
      });
    }

    const {
      name,
      category,
      type,
      specifications,
      location,
      operatingWindow,
      maintenanceStatus,
      bufferMinutes,
    } = req.body;

    // --- Field-level validation for update ---
    const validationErrors = [];

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category.trim().toUpperCase())) {
        validationErrors.push(
          `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`
        );
      }
    }

    if (maintenanceStatus !== undefined) {
      if (!VALID_MAINTENANCE_STATUSES.includes(maintenanceStatus.trim().toUpperCase())) {
        validationErrors.push(
          `Invalid maintenanceStatus "${maintenanceStatus}". Must be one of: ${VALID_MAINTENANCE_STATUSES.join(', ')}`
        );
      }
    }

    if (operatingWindow) {
      const windowErrors = validateOperatingWindow(operatingWindow);
      validationErrors.push(...windowErrors);
    }

    if (bufferMinutes !== undefined && bufferMinutes !== null) {
      if (typeof bufferMinutes !== 'number' || isNaN(bufferMinutes)) {
        validationErrors.push('bufferMinutes must be a number');
      } else if (bufferMinutes < 0) {
        validationErrors.push('bufferMinutes cannot be negative');
      }
    }

    if (location) {
      if (location.latitude !== undefined) {
        if (typeof location.latitude !== 'number') {
          validationErrors.push('location.latitude must be a number');
        } else if (location.latitude < -90 || location.latitude > 90) {
          validationErrors.push('location.latitude must be between -90 and 90');
        }
      }
      if (location.longitude !== undefined) {
        if (typeof location.longitude !== 'number') {
          validationErrors.push('location.longitude must be a number');
        } else if (location.longitude < -180 || location.longitude > 180) {
          validationErrors.push('location.longitude must be between -180 and 180');
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Apply updates
    if (name) resource.name = name.trim();
    if (category) resource.category = category.trim().toUpperCase();
    if (type) resource.type = type.trim();
    if (specifications !== undefined) resource.specifications = specifications;
    if (location) {
      if (location.latitude !== undefined) resource.location.latitude = location.latitude;
      if (location.longitude !== undefined) resource.location.longitude = location.longitude;
      if (location.village !== undefined) resource.location.village = location.village;
    }
    if (operatingWindow) {
      if (operatingWindow.startTime) resource.operatingWindow.startTime = operatingWindow.startTime;
      if (operatingWindow.endTime) resource.operatingWindow.endTime = operatingWindow.endTime;
    }
    if (maintenanceStatus) resource.maintenanceStatus = maintenanceStatus.trim().toUpperCase();
    if (bufferMinutes !== undefined) resource.bufferMinutes = bufferMinutes;

    await resource.save();

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: resource,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Error updating resource',
    });
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Protected (RESOURCE_OWNER, MASTER)
// Note: Do not delete resources that are protected by active scheduling constraints
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Check ownership — a Resource Owner can only delete their own resources
    const userId = (req.user._id || req.user.id).toString();
    if (resource.ownerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource. You can only delete your own resources.',
      });
    }

    // --- Active scheduling constraint check ---
    // Prevent deletion if the resource has active schedules (SCHEDULED or ACTIVE)
    const activeSchedules = await Schedule.find({
      resourceId: id,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
    });

    if (activeSchedules.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete this resource. It has ${activeSchedules.length} active or scheduled booking(s). Please wait until all bookings are completed or cancel them first.`,
        activeScheduleCount: activeSchedules.length,
      });
    }

    // Also check for pending/under-review booking requests referencing this resource
    const pendingRequests = await BookingRequest.find({
      resourceId: id,
      status: { $in: ['PENDING', 'UNDER_REVIEW', 'SCHEDULED', 'ALLOCATED'] },
    });

    if (pendingRequests.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete this resource. It has ${pendingRequests.length} pending or active booking request(s). Please resolve them first.`,
        pendingRequestCount: pendingRequests.length,
      });
    }

    await resource.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting resource',
    });
  }
};

module.exports = {
  getAllResources,
  createResource,
  getMyResources,
  updateResource,
  deleteResource,
};
