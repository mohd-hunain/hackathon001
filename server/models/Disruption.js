const mongoose = require('mongoose');

const DisruptionSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource ID is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['BREAKDOWN', 'WEATHER_ALERT', 'DELAY', 'CANCELLATION'],
        message: '{VALUE} is not a valid disruption type',
      },
      required: [true, 'Disruption type is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Disruption start time is required'],
    },
    estimatedEndTime: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    affectedScheduleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'RESOLVED'],
        message: '{VALUE} is not a valid disruption status',
      },
      default: 'ACTIVE',
      required: [true, 'Disruption status is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model('Disruption', DisruptionSchema);
