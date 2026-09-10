const mongoose = require('mongoose');

const PriorityBreakdownSchema = new mongoose.Schema(
  {
    urgencyDeadline: { type: Number, default: 0, min: 0, max: 25 },
    weatherRisk: { type: Number, default: 0, min: 0, max: 25 },
    cropReadiness: { type: Number, default: 0, min: 0, max: 20 },
    queueWaiting: { type: Number, default: 0, min: 0, max: 15 },
    distanceLogistics: { type: Number, default: 0, min: 0, max: 10 },
    resourceConstraints: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false }
);

const BookingRequestSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
    },
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm ID is required'],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      default: null,
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
    },
    earliestStart: {
      type: Date,
      required: [true, 'Earliest start time is required'],
    },
    latestEnd: {
      type: Date,
      required: [true, 'Latest end time is required'],
    },
    requiredDurationMinutes: {
      type: Number,
      required: [true, 'Required duration in minutes is required'],
      min: [1, 'Required duration must be at least 1 minute'],
    },
    cropStage: {
      type: String,
      enum: {
        values: ['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'],
        message: '{VALUE} is not a valid crop stage',
      },
      required: [true, 'Crop stage is required'],
    },
    urgencyJustification: {
      type: String,
      default: '',
      trim: true,
    },
    weatherRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 25,
    },
    resourceConstraintScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    priorityBreakdown: {
      type: PriorityBreakdownSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: [
          'PENDING',
          'UNDER_REVIEW',
          'SCHEDULED',
          'ALLOCATED',
          'REJECTED',
          'DISRUPTED',
          'CANCELLED',
          'COMPLETED',
        ],
        message: '{VALUE} is not a valid booking request status',
      },
      default: 'PENDING',
      required: [true, 'Status is required'],
    },
    allocatedStart: {
      type: Date,
      default: null,
    },
    allocatedEnd: {
      type: Date,
      default: null,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    syncStatus: {
      type: String,
      enum: {
        values: ['SYNCED', 'PENDING_OFFLINE'],
        message: '{VALUE} is not a valid sync status',
      },
      default: 'SYNCED',
      required: [true, 'Sync status is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BookingRequest', BookingRequestSchema);
