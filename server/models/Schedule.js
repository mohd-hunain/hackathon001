const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource ID is required'],
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingRequest',
      required: [true, 'Booking Request ID is required'],
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    travelBufferBeforeMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Travel buffer before minutes cannot be negative'],
    },
    travelBufferAfterMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Travel buffer after minutes cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'ACTIVE', 'DISRUPTED', 'COMPLETED'],
        message: '{VALUE} is not a valid schedule status',
      },
      default: 'SCHEDULED',
      required: [true, 'Schedule status is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Schedule', ScheduleSchema);
