import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export type UserDepartment =
  'MANAGEMENT' | 'PRODUCTION' | 'STORES' | 'QUALITY' | 'DISPATCH' | 'MAINTENANCE' | 'ACCOUNTS';

export interface IUser extends Document {
  employeeCode: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: UserDepartment;
  phone?: string;
  isActive: boolean;
  refreshTokenHash?: string;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return passwordHash in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: ['SUPER_ADMIN', 'ADMIN'],
      default: 'ADMIN',
    },
    department: {
      type: String,
      enum: [
        'MANAGEMENT',
        'PRODUCTION',
        'STORES',
        'QUALITY',
        'DISPATCH',
        'MAINTENANCE',
        'ACCOUNTS',
      ],
      default: 'MANAGEMENT',
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, isActive: 1 });

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
