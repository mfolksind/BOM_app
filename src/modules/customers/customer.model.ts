import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ICustomer extends Document {
  code: string;
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  contactPerson: string;
  email: string;
  phone: string;
  billingAddress: IAddress;
  shippingAddresses: IAddress[];
  jobWorkTerms?: string;
  creditDays: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'India', trim: true },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer>(
  {
    code: {
      type: String,
      required: [true, 'Customer code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    billingAddress: {
      type: addressSchema,
      required: [true, 'Billing address is required'],
    },
    shippingAddresses: {
      type: [addressSchema],
      default: [],
    },
    jobWorkTerms: {
      type: String,
      trim: true,
    },
    creditDays: {
      type: Number,
      default: 30,
      min: [0, 'Credit days cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ name: 1 });
customerSchema.index({ gstin: 1 });

export const CustomerModel: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);
