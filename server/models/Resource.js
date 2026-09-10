const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: [
          'MACHINERY',
          'IRRIGATION',
          'STORAGE',
          'TRANSPORT',
          'LABOUR',
          'SERVICE',
        ],
        message: '{VALUE} is not a valid resource category',
      },
      required: [true, 'Category is required'],
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
    },
    specifications: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      latitude: {
        type: Number,
        required: [true, 'Resource latitude is required'],
      },
      longitude: {
        type: Number,
        required: [true, 'Resource longitude is required'],
      },
      village: {
        type: String,
        trim: true,
        default: '',
      },
    },
    operatingWindow: {
      startTime: {
        type: String,
        default: '06:00',
        trim: true,
      },
      endTime: {
        type: String,
        default: '18:00',
        trim: true,
      },
    },
    maintenanceStatus: {
      type: String,
      enum: {
        values: ['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN'],
        message: '{VALUE} is not a valid maintenance status',
      },
      default: 'OPERATIONAL',
      required: [true, 'Maintenance status is required'],
    },
    bufferMinutes: {
      type: Number,
      default: 30,
      min: [0, 'Buffer minutes cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Resource', ResourceSchema);
