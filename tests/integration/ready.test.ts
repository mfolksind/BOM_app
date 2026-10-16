import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app';

describe('GET /api/v1/ready', () => {
  let mongoServer: MongoMemoryServer;

  it('should return 503 Service Unavailable when database is disconnected', async () => {
    // Ensure disconnected state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.data).toHaveProperty('status', 'NOT_READY');
    expect(res.body.data.database.readyState).not.toBe(1);
  });

  describe('When database is connected', () => {
    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    });

    afterAll(async () => {
      await mongoose.disconnect();
      if (mongoServer) {
        await mongoServer.stop();
      }
    });

    it('should return 200 OK and READY status when database is connected', async () => {
      const res = await request(app).get('/api/v1/ready');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'READY');
      expect(res.body.data.database).toHaveProperty('state', 'connected');
      expect(res.body.data.database.readyState).toBe(1);
    });
  });
});
