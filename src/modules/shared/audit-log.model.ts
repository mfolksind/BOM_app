import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditActionType =
  'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'APPROVE' | 'REJECT' | 'CANCEL';

export interface IAuditLog extends Document {
  action: AuditActionType;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  performedBy?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      enum: ['CREATE', 'UPDATE', 'DELETE', 'POST', 'REVERSE', 'APPROVE', 'REJECT', 'CANCEL'],
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    oldValues: {
      type: Schema.Types.Mixed,
    },
    newValues: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
