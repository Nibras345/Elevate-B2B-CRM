import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type SeatRequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type SeatRequestPlan = 'Per Seat' | 'Package';

export interface ISeatRequest extends Document {
  tenantId: Types.ObjectId;
  planName: 'Per Seat' | 'Package' | string;
  requestedSeats: number;
  totalAmount: number;
  screenshotUrl: string;
  status: SeatRequestStatus;
  requestedBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SeatRequestSchema: Schema<ISeatRequest> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    requestedSeats: {
      type: Number,
      required: [true, 'Requested seats count is required'],
      min: [1, 'Must request at least 1 seat'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    screenshotUrl: {
      type: String,
      required: [true, 'Payment verification screenshot is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const SeatRequest: Model<ISeatRequest> = mongoose.model<ISeatRequest>(
  'SeatRequest',
  SeatRequestSchema
);
export default SeatRequest;

