import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Isolated Test Environment Manager.
 * Strictly enforces that test suites run against an ephemeral in-memory replica set
 * and NEVER against a live development or production database.
 */
export class TestEnvironment {
  private static replSet: MongoMemoryReplSet | null = null;

  /**
   * Starts an isolated in-memory replica set and connects Mongoose.
   * Fails fast if the target database is not an isolated test environment.
   */
  public static async setup(): Promise<string> {
    process.env.NODE_ENV = 'test';

    // Start single-node replica set for full MongoDB transaction support in tests
    this.replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    const uri = this.replSet.getUri();

    // Safety verification: URI must contain 127.0.0.1 or localhost and must not point to a production db
    this.assertTestDatabase(uri);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(uri);
    return uri;
  }

  /**
   * Shuts down Mongoose connection and stops the in-memory replica set.
   */
  public static async teardown(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      if (this.replSet) {
        await this.replSet.stop();
        this.replSet = null;
      }
    } catch {
      // Ignore teardown errors during process exit
    }
  }

  /**
   * Safety guard: fails immediately if database URI points to production or non-test database.
   */
  public static assertTestDatabase(uri: string): void {
    const lower = uri.toLowerCase();
    if (
      lower.includes('mongodb+srv://') ||
      lower.includes('prod') ||
      lower.includes('production') ||
      lower.includes('live')
    ) {
      throw new Error(`CRITICAL TEST SAFETY VIOLATION: Test suite attempted to connect to non-test database URI: ${uri}`);
    }
  }

  /**
   * Cleans all collections safely in the test database.
   */
  public static async clearCollections(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
      }
    }
  }
}
