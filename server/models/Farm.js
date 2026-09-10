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
      },
      longitude: {
        type: Number,
        required: [true, 'Farm longitude is required'],
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
