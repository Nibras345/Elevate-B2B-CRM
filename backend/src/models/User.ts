import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types';

export interface IUserWorkspace {
  tenantId: string;
  tenant?: Types.ObjectId;
  role: UserRole;
  department?: string;
  status: 'Invited' | 'Active';
  joinedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  tenantId: string;
  tenant?: Types.ObjectId;
  tenantIds: string[];
  tenants: Types.ObjectId[];
  workspaces: IUserWorkspace[];
  avatar?: string;
  profilePicture?: string;
  department?: string;
  phone?: string;
  isActive: boolean;
  status: 'Invited' | 'Active';
  resetOtp?: string;
  resetOtpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Corporate email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['Company Admin', 'Employee', 'Sales Agent', 'Support', 'Super Admin'],
      default: 'Company Admin',
      index: true,
    },
    tenantId: {
      type: String,
      default: '',
      index: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    tenantIds: {
      type: [String],
      default: [],
      index: true,
    },
    tenants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
      },
    ],
    workspaces: [
      {
        tenantId: {
          type: String,
          required: true,
          index: true,
        },
        tenant: {
          type: Schema.Types.ObjectId,
          ref: 'Tenant',
        },
        role: {
          type: String,
          enum: ['Company Admin', 'Employee', 'Sales Agent', 'Support', 'Super Admin'],
          default: 'Sales Agent',
        },
        department: {
          type: String,
          default: 'General',
        },
        status: {
          type: String,
          enum: ['Invited', 'Active'],
          default: 'Active',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    avatar: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'Sales & Revenue',
    },
    phone: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Invited', 'Active'],
      default: 'Active',
      index: true,
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Sync tenant arrays & hash password
UserSchema.pre<IUser>('save', async function () {
  // Sync tenantIds array with tenantId
  if (this.tenantId) {
    if (!this.tenantIds) {
      this.tenantIds = [];
    }
    if (!this.tenantIds.includes(this.tenantId)) {
      this.tenantIds.push(this.tenantId);
    }
  }

  // Sync tenants ObjectId array with tenant
  if (this.tenant) {
    if (!this.tenants) {
      this.tenants = [];
    }
    const tenantStr = this.tenant.toString();
    if (!this.tenants.some((t) => t.toString() === tenantStr)) {
      this.tenants.push(this.tenant);
    }
  }

  // Sync workspaces subdocuments array
  if (!this.workspaces) {
    this.workspaces = [];
  }
  if (this.tenantId && !this.workspaces.some((w) => w.tenantId === this.tenantId)) {
    this.workspaces.push({
      tenantId: this.tenantId,
      tenant: this.tenant,
      role: this.role || 'Company Admin',
      department: this.department || 'General',
      status: this.status || 'Active',
      joinedAt: new Date(),
    });
  }

  if (!this.isModified('password')) {
    return;
  }
  // Skip rehashing if password is already a valid bcrypt hash
  if (/^\$2[abxy]\$\d{2}\$[./0-9A-Za-z]{53}$/.test(this.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
