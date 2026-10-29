import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LeadStage = 'New Lead' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Won / Closed';
export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ILead extends Document {
  tenantId: Types.ObjectId;
  tenantCode?: string;
  contactName: string;
  companyName: string;
  estimatedValue: number;
  priority: LeadPriority;
  email: string;
  phone?: string;
  notes?: string;
  stage: LeadStage;
  tags?: string[];
  assignedTo?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  lastActivity?: string;
  expectedClose?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
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
    estimatedValue: {
      type: Number,
      required: [true, 'Estimated value is required'],
      default: 0,
      min: [0, 'Estimated value cannot be negative'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
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
    notes: {
      type: String,
      default: '',
    },
    stage: {
      type: String,
      enum: ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won / Closed'],
      default: 'New Lead',
      index: true,
    },
    tags: {
      type: [String],
      default: ['Enterprise'],
    },
    assignedTo: {
      id: { type: String },
      name: { type: String, default: 'Sales Agent' },
      avatar: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      role: { type: String, default: 'Sales Agent' },
    },
    lastActivity: {
      type: String,
      default: 'Opportunity created in pipeline',
    },
    expectedClose: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast tenant query isolation
LeadSchema.index({ tenantId: 1, stage: 1 });
LeadSchema.index({ tenantId: 1, email: 1 });

export const Lead: Model<ILead> = mongoose.model<ILead>('Lead', LeadSchema);
