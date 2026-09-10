const { Farm } = require('../models');

// @desc    Create a new farm
// @route   POST /api/farms
// @access  Protected (FARMER, MASTER)
const createFarm = async (req, res) => {
  try {
    const { name, location, cropType, cropStage } = req.body;

    const farm = await Farm.create({
      farmerId: req.user._id || req.user.id,
      name,
      location,
      cropType,
      cropStage,
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
// @access  Protected (FARMER, MASTER)
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
// @access  Protected (FARMER, MASTER)
const updateFarm = async (req, res) => {
  try {
    const { id } = req.params;
    const farm = await Farm.findById(id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found',
      });
    }

    // Ensure only the farm owner or MASTER can update
    const userId = (req.user._id || req.user.id).toString();
    if (farm.farmerId.toString() !== userId && req.user.role !== 'MASTER') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this farm',
      });
    }

    const { name, location, cropType, cropStage } = req.body;
    if (name) farm.name = name;
    if (location) {
      if (location.latitude !== undefined) farm.location.latitude = location.latitude;
      if (location.longitude !== undefined) farm.location.longitude = location.longitude;
      if (location.village !== undefined) farm.location.village = location.village;
    }
    if (cropType) farm.cropType = cropType;
    if (cropStage) farm.cropStage = cropStage;

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
};
