const mongoose = require('mongoose');
const { Farm } = require('../models');

const VALID_CROP_STAGES = ['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'];

const isValidLatitude = (lat) => {
  if (typeof lat === 'boolean' || lat === null || lat === '') return false;
  const num = Number(lat);
  return !isNaN(num) && isFinite(num) && num >= -90 && num <= 90;
};

const isValidLongitude = (lng) => {
  if (typeof lng === 'boolean' || lng === null || lng === '') return false;
  const num = Number(lng);
  return !isNaN(num) && isFinite(num) && num >= -180 && num <= 180;
};

const isValidCropStage = (stage) => {
  return typeof stage === 'string' && VALID_CROP_STAGES.includes(stage);
};

// @desc    Create a new farm
// @route   POST /api/farms
// @access  Protected (FARMER)
const createFarm = async (req, res) => {
  try {
    const { name, location, cropType, cropStage } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Farm name is required',
      });
    }

    if (!location || typeof location !== 'object' || Array.isArray(location)) {
      return res.status(400).json({
        success: false,
        message: 'Farm location is required and must be an object with latitude and longitude',
      });
    }

    if (location.latitude === undefined || location.latitude === null || location.latitude === '') {
      return res.status(400).json({
        success: false,
        message: 'Farm latitude is required',
      });
    }

    if (!isValidLatitude(location.latitude)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be a valid number between -90 and 90',
      });
    }

    if (location.longitude === undefined || location.longitude === null || location.longitude === '') {
      return res.status(400).json({
        success: false,
        message: 'Farm longitude is required',
      });
    }

    if (!isValidLongitude(location.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be a valid number between -180 and 180',
      });
    }

    if (!cropType || typeof cropType !== 'string' || !cropType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Crop type is required',
      });
    }

    if (cropStage !== undefined && cropStage !== null) {
      if (!isValidCropStage(cropStage)) {
        return res.status(400).json({
          success: false,
          message: `Invalid crop stage: '${cropStage}'. Valid stages are: ${VALID_CROP_STAGES.join(', ')}`,
        });
      }
    }

    const farmerId = req.user._id || req.user.id;

    const farm = await Farm.create({
      farmerId,
      name: name.trim(),
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        village: location.village && typeof location.village === 'string' ? location.village.trim() : '',
      },
      cropType: cropType.trim(),
      cropStage: cropStage || 'GROWING',
    });

    return res.status(201).json({
      success: true,
      message: 'Farm created successfully',
      data: farm,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error creating farm',
    });
  }
};

// @desc    Get current user's farms
// @route   GET /api/farms/my
// @access  Protected (FARMER)
const getMyFarms = async (req, res) => {
  try {
    const farmerId = req.user._id || req.user.id;
    const farms = await Farm.find({ farmerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: farms.length,
      data: farms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching farms',
    });
  }
};

// @desc    Update a farm
// @route   PATCH /api/farms/:id
// @access  Protected (FARMER)
const updateFarm = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid farm ID format',
      });
    }

    const farm = await Farm.findById(id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found',
      });
    }

    // Ensure farmer can access only their own farm
    const userId = (req.user._id || req.user.id).toString();
    if (farm.farmerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this farm',
      });
    }

    const { name, location, cropType, cropStage } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Farm name cannot be empty',
        });
      }
      farm.name = name.trim();
    }

    if (location !== undefined) {
      if (!location || typeof location !== 'object' || Array.isArray(location)) {
        return res.status(400).json({
          success: false,
          message: 'Location must be an object',
        });
      }

      if (location.latitude !== undefined) {
        if (!isValidLatitude(location.latitude)) {
          return res.status(400).json({
            success: false,
            message: 'Latitude must be a valid number between -90 and 90',
          });
        }
        farm.location.latitude = Number(location.latitude);
      }

      if (location.longitude !== undefined) {
        if (!isValidLongitude(location.longitude)) {
          return res.status(400).json({
            success: false,
            message: 'Longitude must be a valid number between -180 and 180',
          });
        }
        farm.location.longitude = Number(location.longitude);
      }

      if (location.village !== undefined) {
        farm.location.village = typeof location.village === 'string' ? location.village.trim() : location.village;
      }
    }

    if (cropType !== undefined) {
      if (typeof cropType !== 'string' || !cropType.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Crop type cannot be empty',
        });
      }
      farm.cropType = cropType.trim();
    }

    if (cropStage !== undefined) {
      if (!isValidCropStage(cropStage)) {
        return res.status(400).json({
          success: false,
          message: `Invalid crop stage: '${cropStage}'. Valid stages are: ${VALID_CROP_STAGES.join(', ')}`,
        });
      }
      farm.cropStage = cropStage;
    }

    await farm.save();

    return res.status(200).json({
      success: true,
      message: 'Farm updated successfully',
      data: farm,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Error updating farm',
    });
  }
};

module.exports = {
  createFarm,
  getMyFarms,
  updateFarm,
  isValidLatitude,
  isValidLongitude,
  isValidCropStage,
  VALID_CROP_STAGES,
};
