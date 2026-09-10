const mongoose = require('mongoose');

const FarmSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
    },
    location: {
      latitude: {
        type: Number,
        required: [true, 'Farm latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        required: [true, 'Farm longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
      village: {
        type: String,
        trim: true,
        default: '',
      },
    },
    cropType: {
      type: String,
      required: [true, 'Crop type is required'],
      trim: true,
    },
    cropStage: {
      type: String,
      enum: {
        values: ['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'],
        message: '{VALUE} is not a valid crop stage',
      },
      required: [true, 'Crop stage is required'],
      default: 'GROWING',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Farm', FarmSchema);
