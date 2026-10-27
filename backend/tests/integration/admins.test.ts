import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { PasswordUtil } from '../../src/common/utils/password.util';
import { TokenUtil } from '../../src/common/utils/token.util';
import { InboundChallanModel } from '../../src/modules/inventory/inbound-challan.model';
import { CustomerModel } from '../../src/modules/customers/customer.model';
import { WarehouseModel } from '../../src/modules/warehouses/warehouse.model';

describe('Admin Management & Two-Role Authorization Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let superAdminToken: string;
  let superAdminId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const passwordHash = await PasswordUtil.hash('SecurePassword@123');

    // Create primary Super Admin
    const superAdmin = await UserModel.create({
      employeeCode: 'EMP-SA-001',
      email: 'primary.superadmin@mfolks.com',
      passwordHash,
      firstName: 'Primary',
      lastName: 'SuperAdmin',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });
    superAdminId = superAdmin._id.toString();
    superAdminToken = TokenUtil.generateAccessToken({
      userId: superAdminId,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
    });

    // Create regular Admin
    const admin = await UserModel.create({
      employeeCode: 'EMP-ADM-001',
      email: 'regular.admin@mfolks.com',
      passwordHash,
      firstName: 'Regular',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'PRODUCTION',
      isActive: true,
    });
    adminId = admin._id.toString();
    adminToken = TokenUtil.generateAccessToken({
      userId: adminId,
      email: admin.email,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Role Authorization Enforcement', () => {
    it('should forbid an Admin from accessing Super Admin endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admins')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });

    it('should forbid an Admin from creating another Admin (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/admins')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeCode: 'EMP-NEW-ADM',
          email: 'new.admin@mfolks.com',
          password: 'Password@123',
          firstName: 'New',
          lastName: 'Admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid an Admin from deactivating another Admin (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admins/${adminId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });

    it('should prevent an Admin from changing their role to SUPER_ADMIN via profile update', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'AttemptedHacker',
          role: 'SUPER_ADMIN', // Ignored or filtered by schema
        });

      expect(res.status).toBe(200);
      // Verify in DB that role was not modified
      const checkUser = await UserModel.findById(adminId);
      expect(checkUser?.role).toBe('ADMIN');
      expect(checkUser?.firstName).toBe('AttemptedHacker');
    });
  });

  describe('2. Super Admin Account Management', () => {
    let createdAdminId: string;

    it('should allow Super Admin to create a new Admin account', async () => {
      const res = await request(app)
        .post('/api/v1/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          employeeCode: 'EMP-ADM-002',
          email: 'stores.admin@mfolks.com',
          password: 'Password@123',
          firstName: 'Stores',
          lastName: 'Manager',
          department: 'STORES',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.email).toBe('stores.admin@mfolks.com');
      expect(res.body.data).not.toHaveProperty('passwordHash');

      createdAdminId = res.body.data.id;
    });

    it('should reject creation of Admin with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          employeeCode: 'EMP-DIFF-001',
          email: 'stores.admin@mfolks.com', // Duplicate
          password: 'Password@123',
          firstName: 'Another',
          lastName: 'Manager',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should allow Super Admin to list Admin accounts with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admins?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page', 1);
    });

    it('should allow Super Admin to get Admin details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admins/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdAdminId);
      expect(res.body.data.email).toBe('stores.admin@mfolks.com');
    });

    it('should allow Super Admin to update Admin details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admins/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'UpdatedStores',
          phone: '9998887776',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('UpdatedStores');
      expect(res.body.data.phone).toBe('9998887776');
    });

    it('should allow Super Admin to deactivate and reactivate an Admin', async () => {
      // Deactivate
      const deactRes = await request(app)
        .patch(`/api/v1/admins/${createdAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'Temporary leave' });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      // Verify deactivated admin cannot log in
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'stores.admin@mfolks.com',
        password: 'Password@123',
      });
      expect(loginRes.status).toBe(401);
      expect(loginRes.body.message).toContain('Account is deactivated');

      // Reactivate
      const reactRes = await request(app)
        .patch(`/api/v1/admins/${createdAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.data.isActive).toBe(true);
    });

    it('should allow Super Admin to reset an Admin password', async () => {
      const resetRes = await request(app)
        .post(`/api/v1/admins/${createdAdminId}/reset-password`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ newPassword: 'BrandNewPassword@2026' });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login with new password succeeds
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'stores.admin@mfolks.com',
        password: 'BrandNewPassword@2026',
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('3. Account Management Safeguards & Data Integrity', () => {
    it('should prevent a Super Admin from deactivating their own account (Self-Protection)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admins/${superAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot deactivate your own account');
    });

    it('should prevent deleting the last active Super Admin account', async () => {
      const res = await request(app)
        .delete(`/api/v1/admins/${superAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot delete your own account');
    });

    it('should prevent permanent deletion of an Admin who has associated ERP records', async () => {
      // Create a test admin
      const passwordHash = await PasswordUtil.hash('Password@123');
      const erpAdmin = await UserModel.create({
        employeeCode: 'EMP-ERP-USER',
        email: 'erp.admin@mfolks.com',
        passwordHash,
        firstName: 'ERP',
        lastName: 'Keeper',
        role: 'ADMIN',
        isActive: true,
      });

      // Create dummy customer & warehouse
      const customer = await CustomerModel.create({
        code: 'CUST-REF-01',
        name: 'Ref Customer',
        contactPerson: 'Ref',
        email: 'ref@cust.com',
        phone: '1234567890',
        billingAddress: {
          street: 'St',
          city: 'Ct',
          state: 'St',
          postalCode: '123456',
          country: 'India',
        },
      });

      const warehouse = await WarehouseModel.create({
        code: 'WH-REF-01',
        name: 'Ref Warehouse',
        type: 'RAW_MATERIAL',
      });

      // Create an InboundChallan referencing erpAdmin as receivedBy
      await InboundChallanModel.create({
        challanNumber: 'IBC-REF-001',
        customerChallanNumber: 'CUST-DC-01',
        customerChallanDate: new Date(),
        customerId: customer._id,
        warehouseId: warehouse._id,
        receivedBy: erpAdmin._id,
      });

      // Attempting to delete erpAdmin must be rejected to prevent breaking ERP records
      const deleteRes = await request(app)
        .delete(`/api/v1/admins/${erpAdmin._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.success).toBe(false);
      expect(deleteRes.body.message).toContain('associated with existing ERP records');
      expect(deleteRes.body.message).toContain('Please deactivate the account instead');
    });

    it('should allow deleting an Admin who has NO associated ERP records', async () => {
      const passwordHash = await PasswordUtil.hash('Password@123');
      const cleanAdmin = await UserModel.create({
        employeeCode: 'EMP-CLEAN-01',
        email: 'clean.admin@mfolks.com',
        passwordHash,
        firstName: 'Clean',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
      });

      const deleteRes = await request(app)
        .delete(`/api/v1/admins/${cleanAdmin._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.deleted).toBe(true);

      const checkInDb = await UserModel.findById(cleanAdmin._id);
      expect(checkInDb).toBeNull();
    });
  });
});
