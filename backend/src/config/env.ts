import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string({
      required_error:
        'MONGODB_URI is required. Example: mongodb://mongo:27017/erp_db?replicaSet=rs0',
    })
    .min(1, 'MONGODB_URI cannot be empty'),
  JWT_ACCESS_SECRET: z
    .string({
      required_error: 'JWT_ACCESS_SECRET is required for token signing',
    })
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string({
      required_error: 'JWT_REFRESH_SECRET is required for token renewal',
    })
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SUPER_ADMIN_EMAIL: z.string().email().default('superadmin@mfolks.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('SuperAdmin@123456'),
  SUPER_ADMIN_EMPLOYEE_CODE: z.string().default('EMP-SA-001'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}] ${issue.message}`)
      .join('\n');

    console.error('\n❌ Fatal: Invalid or Missing Environment Configuration:');
    console.error(formattedErrors);
    console.error('\nPlease verify your .env file against .env.example\n');

    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    // Return fallback for test suite if process.exit was mocked or prevented
    return envSchema.parse({
      ...process.env,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db_test',
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_key_placeholder_min_16_chars',
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_placeholder_min_16_chars',
    });
  }

  return result.data;
};

export const env = parseEnv();
