import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { PasswordUtil } from '../../src/common/utils/password.util';
import { TokenUtil } from '../../src/common/utils/token.util';
import { bootstrapSuperAdmin } from '../../src/scripts/bootstrap-super-admin';

describe('Authentication & JWT Flow Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create active admin user
    const passwordHash = await PasswordUtil.hash('Admin@123456');
    await UserModel.create({
      employeeCode: 'EMP-ADM-TEST',
      email: 'test.admin@mfolks.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'MANAGEMENT',
      isActive: true,
    });

    // Create inactive admin user
    await UserModel.create({
      employeeCode: 'EMP-INACTIVE',
      email: 'inactive@mfolks.com',
      passwordHash,
      firstName: 'Inactive',
      lastName: 'User',
      role: 'ADMIN',
      department: 'STORES',
      isActive: false,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Valid & Invalid Login Credentials', () => {
    it('should log in successfully with valid credentials and return tokens', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');

      // Requirement 15: Passwords and token hashes are never returned in responses
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('refreshTokenHash');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@mfolks.com',
        password: 'Admin@123456',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('2. Inactive User Login Rejection', () => {
    it('should reject login attempt for deactivated user (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'inactive@mfolks.com',
        password: 'Admin@123456',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Account is deactivated');
    });
  });

  describe('3. Token Verification & Missing / Expired Access Tokens', () => {
    it('should reject protected endpoint when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token is required');
    });

    it('should reject protected endpoint when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid access token');
    });

    it('should authenticate valid access tokens and return current user details', async () => {
      // First log in to obtain real access token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      const accessToken = loginRes.body.data.tokens.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe('test.admin@mfolks.com');
      expect(meRes.body.data.role).toBe('ADMIN');
      expect(meRes.body.data).not.toHaveProperty('passwordHash');
    });
  });

  describe('4. Token Refresh, Rotation & Revocation', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      const refreshToken = loginRes.body.data.tokens.refreshToken;

      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data).toHaveProperty('accessToken');
      expect(refreshRes.body.data).toHaveProperty('refreshToken');
    });

    it('should revoke refresh token upon logout', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      const { accessToken, refreshToken } = loginRes.body.data.tokens;

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.loggedOut).toBe(true);

      // Attempting to refresh with old token must now fail
      const refreshAttempt = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

      expect(refreshAttempt.status).toBe(401);
      expect(refreshAttempt.body.message).toContain('revoked');
    });

    it('should prevent deactivated users from refreshing tokens', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      const { refreshToken } = loginRes.body.data.tokens;

      // Deactivate user in database
      await UserModel.findOneAndUpdate({ email: 'test.admin@mfolks.com' }, { isActive: false });

      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.message).toContain('Account is deactivated');

      // Re-activate user for remaining tests
      await UserModel.findOneAndUpdate({ email: 'test.admin@mfolks.com' }, { isActive: true });
    });
  });

  describe('5. Password Change Functionality', () => {
    it('should change password successfully and revoke existing refresh tokens', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });

      const { accessToken, refreshToken } = loginRes.body.data.tokens;

      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Admin@123456',
          newPassword: 'NewPassword@2026',
          confirmPassword: 'NewPassword@2026',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // Verify old refresh token is revoked by password change
      const refreshOldImmediate = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshOldImmediate.status).toBe(401);

      // Verify login with old password fails
      const oldLoginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'Admin@123456',
      });
      expect(oldLoginRes.status).toBe(401);

      // Verify login with new password succeeds
      const newLoginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'test.admin@mfolks.com',
        password: 'NewPassword@2026',
      });
      expect(newLoginRes.status).toBe(200);

      // Verify old refresh token is still rejected even after new login
      const refreshOldPostLogin = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshOldPostLogin.status).toBe(401);
    });
  });

  describe('6. Idempotent Super Admin Bootstrap', () => {
    it('should create initial Super Admin account when none exists and preserve on rerun', async () => {
      // Remove any existing super admin
      await UserModel.deleteMany({ role: 'SUPER_ADMIN' });

      // Run bootstrap
      await bootstrapSuperAdmin();

      const superAdmin = await UserModel.findOne({ role: 'SUPER_ADMIN' });
      expect(superAdmin).not.toBeNull();
      expect(superAdmin?.role).toBe('SUPER_ADMIN');
      expect(superAdmin?.isActive).toBe(true);

      const originalCreatedAt = superAdmin?.createdAt;

      // Re-run bootstrap (must be idempotent and not duplicate or overwrite)
      await bootstrapSuperAdmin();

      const superAdminCount = await UserModel.countDocuments({ role: 'SUPER_ADMIN' });
      expect(superAdminCount).toBe(1);

      const checkAdmin = await UserModel.findOne({ role: 'SUPER_ADMIN' });
      expect(checkAdmin?.createdAt.getTime()).toBe(originalCreatedAt?.getTime());
    });
  });
});
