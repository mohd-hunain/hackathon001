const { Resource } = require('../models');

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

    const resource = await Resource.create({
      ownerId: req.user._id || req.user.id,
      name,
      category,
      type,
      specifications: specifications || '',
      location,
      operatingWindow: operatingWindow || { startTime: '06:00', endTime: '18:00' },
      maintenanceStatus: maintenanceStatus || 'OPERATIONAL',
      bufferMinutes: bufferMinutes !== undefined ? bufferMinutes : 30,
    });

    return res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource,
    });
  } catch (error) {
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

    // Check ownership or MASTER role
    const userId = (req.user._id || req.user.id).toString();
    if (resource.ownerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this resource',
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

    if (name) resource.name = name;
    if (category) resource.category = category;
    if (type) resource.type = type;
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
    if (maintenanceStatus) resource.maintenanceStatus = maintenanceStatus;
    if (bufferMinutes !== undefined) resource.bufferMinutes = bufferMinutes;

    await resource.save();

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: resource,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error updating resource',
    });
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Protected (RESOURCE_OWNER, MASTER)
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

    // Check ownership or MASTER role
    const userId = (req.user._id || req.user.id).toString();
    if (resource.ownerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource',
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
