import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IInvitation extends Document {
  email: string;
  tenantId: string;
  tenant?: Types.ObjectId;
  role: string;
  department: string;
  token: string;
  expiresAt: Date;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema<IInvitation> = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Invited email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: [true, 'Tenant identifier is required'],
      index: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    role: {
      type: String,
      required: [true, 'Team member role is required'],
      enum: ['Company Admin', 'Sales Agent', 'Support', 'Employee', 'Super Admin'],
      default: 'Sales Agent',
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    token: {
      type: String,
      required: [true, 'Invitation token is required'],
      unique: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on email and tenantId to quickly find pending invites in a tenant
InvitationSchema.index({ email: 1, tenantId: 1 });

export const Invitation: Model<IInvitation> = mongoose.model<IInvitation>(
  'Invitation',
  InvitationSchema
);
