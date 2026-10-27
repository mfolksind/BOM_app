import mongoose from 'mongoose';
import { AuditLogModel, AuditActionType } from '../shared/audit-log.model';

export interface RecordAuditParams {
  action: AuditActionType;
  entityType: string;
  entityId: mongoose.Types.ObjectId | string;
  performedBy?: mongoose.Types.ObjectId | string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  session?: mongoose.ClientSession;
}

export class InventoryAuditUtil {
  static async record(params: RecordAuditParams) {
    try {
      const options = { ...(params.session ? { session: params.session } : {}) };
      await AuditLogModel.create(
        [
          {
            action: params.action,
            entityType: params.entityType,
            entityId: new mongoose.Types.ObjectId(params.entityId.toString()),
            performedBy: params.performedBy
              ? new mongoose.Types.ObjectId(params.performedBy.toString())
              : undefined,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            oldValues: params.oldValues,
            newValues: params.newValues,
            metadata: params.metadata,
          },
        ],
        options,
      );
    } catch {
      // Do not block inventory transactions if audit logging fails non-critically
    }
  }
}
