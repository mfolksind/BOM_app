import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UserModel } from '../modules/users/user.model';
import { AuditLogModel } from '../modules/shared/audit-log.model';
import { PasswordUtil } from '../common/utils/password.util';

/**
 * Idempotent Super Admin Bootstrap Script.
 * Ensures the primary Super Admin account exists in the ERP database.
 */
export const bootstrapSuperAdmin = async (
  options: { disconnectOnFinish?: boolean } = {},
): Promise<void> => {
  const disconnectOnFinish = options.disconnectOnFinish ?? false;

  try {
    if (mongoose.connection.readyState !== 1) {
      logger.info('Connecting to database for Super Admin bootstrap...');
      await connectDatabase({ maxRetries: 3, retryIntervalMs: 2000 });
    }

    const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
    const employeeCode = env.SUPER_ADMIN_EMPLOYEE_CODE.toUpperCase();

    // Check if a Super Admin already exists
    const existingSuperAdmin = await UserModel.findOne({
      $or: [{ role: 'SUPER_ADMIN' }, { email }],
    });

    if (existingSuperAdmin) {
      logger.info(
        { email: existingSuperAdmin.email, employeeCode: existingSuperAdmin.employeeCode },
        'Super Admin account already exists. Skipping bootstrap (idempotent, existing credentials preserved).',
      );
      if (disconnectOnFinish) {
        await disconnectDatabase();
      }
      return;
    }

    const passwordHash = await PasswordUtil.hash(env.SUPER_ADMIN_PASSWORD);

    const superAdmin = new UserModel({
      employeeCode,
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });

    await superAdmin.save();

    await AuditLogModel.create({
      action: 'CREATE',
      entityType: 'User',
      entityId: superAdmin._id,
      metadata: { event: 'SUPER_ADMIN_INITIAL_BOOTSTRAP' },
    });

    logger.info(
      {
        email: superAdmin.email,
        employeeCode: superAdmin.employeeCode,
        role: superAdmin.role,
      },
      '✅ Initial Super Admin account successfully created.',
    );

    if (disconnectOnFinish) {
      await disconnectDatabase();
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to bootstrap Super Admin account');
    if (disconnectOnFinish) {
      await disconnectDatabase();
    }
    throw error;
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  void bootstrapSuperAdmin({ disconnectOnFinish: true }).then(() => {
    logger.info('Bootstrap script completed.');
    process.exit(0);
  });
}
