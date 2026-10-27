import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/v1/health', () => {
  it('should return 200 OK with operational service status and uptime', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('status', 'UP');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('environment');
    expect(res.body.data).toHaveProperty('nodeVersion');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('should return 200 on root route / with service metadata', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'active');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('version');
  });
});
