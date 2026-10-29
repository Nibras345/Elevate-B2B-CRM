import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  tenantId: string;
  maxSeats: number;
  logoUrl?: string;
  currency: string;
  fiscalYear: string;
  defaultTaxRate: number;
  invoiceTerms: string;
  address?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema<ITenant> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company / Tenant name is required'],
      trim: true,
    },
    tenantId: {
      type: String,
      required: [true, 'Tenant ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    maxSeats: {
      type: Number,
      default: 25,
      min: [1, 'A tenant must have at least 1 seat'],
    },
    logoUrl: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'USD ($)',
    },
    fiscalYear: {
      type: String,
      default: 'Jan - Dec',
    },
    defaultTaxRate: {
      type: Number,
      default: 10,
    },
    invoiceTerms: {
      type: String,
      default: 'Net 30 Days',
    },
    address: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', TenantSchema);
