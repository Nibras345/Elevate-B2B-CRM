import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IClient extends Document {
  tenantId: Types.ObjectId;
  tenantCode?: string;
  contactName: string;
  companyName: string;
  email: string;
  phone?: string;
  lifetimeValue: number;
  convertedAt: Date;
  status: 'Active' | 'Inactive' | 'Pending';
  industry?: string;
  city?: string;
  country?: string;
  openDealsCount?: number;
  invoicesCount?: number;
  lastContacted?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema<IClient> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required for multi-tenant data isolation'],
      index: true,
    },
    tenantCode: {
      type: String,
      index: true,
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    lifetimeValue: {
      type: Number,
      required: [true, 'Lifetime value is required'],
      default: 0,
      min: [0, 'Lifetime value cannot be negative'],
    },
    convertedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending'],
      default: 'Active',
    },
    industry: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    openDealsCount: {
      type: Number,
      default: 0,
    },
    invoicesCount: {
      type: Number,
      default: 0,
    },
    lastContacted: {
      type: String,
      default: 'Converted from Lead',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for tenant isolation and uniqueness checks
ClientSchema.index({ tenantId: 1, email: 1 });
ClientSchema.index({ tenantId: 1, companyName: 1 });

export const Client: Model<IClient> = mongoose.model<IClient>('Client', ClientSchema);
