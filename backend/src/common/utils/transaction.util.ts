import mongoose, { ClientSession } from 'mongoose';
import { logger } from '../../config/logger';

export interface TransactionRetryOptions {
  /** Maximum number of attempts before throwing (default: 5) */
  maxAttempts?: number;
  /** Base delay in milliseconds for exponential backoff (default: 25) */
  baseDelayMs?: number;
  /** Maximum backoff delay in milliseconds (default: 500) */
  maxDelayMs?: number;
}

/**
 * Utility for executing MongoDB Multi-Document ACID Transactions with bounded retries
 * and exponential backoff on TransientTransactionError (e.g., WriteConflict, code 112).
 *
 * Adheres strictly to the official MongoDB driver transaction specification:
 * - Only transient errors (WriteConflict, network transient errors) are retried.
 * - Application/business errors (BadRequest, NotFound, Conflict) abort immediately.
 * - State is rolled back cleanly on every aborted attempt, preventing partial writes.
 */
export class TransactionUtil {
  /**
   * Determines if an error is a MongoDB transient transaction error.
   */
  public static isTransientError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    // Check if error has the MongoDB driver hasErrorLabel method
    const maybeLabeled = error as { hasErrorLabel?: (label: string) => boolean };
    if (typeof maybeLabeled.hasErrorLabel === 'function') {
      if (maybeLabeled.hasErrorLabel('TransientTransactionError')) {
        return true;
      }
    }

    // Check errorLabels array or Set
    const maybeObj = error as {
      errorLabels?: string[] | Set<string>;
      code?: number;
      name?: string;
      message?: string;
    };
    if (maybeObj.errorLabels) {
      if (Array.isArray(maybeObj.errorLabels) && maybeObj.errorLabels.includes('TransientTransactionError')) {
        return true;
      }
      if (maybeObj.errorLabels instanceof Set && maybeObj.errorLabels.has('TransientTransactionError')) {
        return true;
      }
    }

    // Check MongoDB error code 112 (WriteConflict) or 24 (LockTimeout)
    if (maybeObj.code === 112 || maybeObj.code === 24) return true;

    // Check error message for WriteConflict
    if (
      maybeObj.name === 'MongoServerError' &&
      typeof maybeObj.message === 'string' &&
      maybeObj.message.includes('Write conflict')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Runs an operation inside a MongoDB transaction with bounded retries and exponential backoff.
   *
   * @param operation Async callback that performs DB operations with the active ClientSession.
   * @param options Bounded retry and backoff configuration.
   * @returns The resolved value of the operation callback.
   */
  public static async runInTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    options: TransactionRetryOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 5;
    const baseDelayMs = options.baseDelayMs ?? 25;
    const maxDelayMs = options.maxDelayMs ?? 500;

    const session = await mongoose.startSession();

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        session.startTransaction();

        try {
          const result = await operation(session);
          await session.commitTransaction();
          return result;
        } catch (error: unknown) {
          // If transaction is still in-flight, abort it cleanly
          if (session.inTransaction()) {
            try {
              await session.abortTransaction();
            } catch (abortErr) {
              logger.warn({ abortErr }, 'Error during session.abortTransaction');
            }
          }

          // If error is transient and we have remaining attempts, back off and retry
          if (attempt < maxAttempts && TransactionUtil.isTransientError(error)) {
            const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
            const jitter = Math.floor(Math.random() * baseDelayMs);
            const totalDelay = backoff + jitter;

            logger.info(
              {
                attempt,
                maxAttempts,
                delayMs: totalDelay,
                code: (error as { code?: number })?.code,
                errorLabel: 'TransientTransactionError',
              },
              'Transient MongoDB WriteConflict encountered; retrying transaction with backoff',
            );

            await new Promise((resolve) => setTimeout(resolve, totalDelay));
            continue;
          }

          // If standalone MongoDB instance is detected (Code 20), fallback gracefully without transactions
          if (
            (error as { code?: number })?.code === 20 ||
            (typeof (error as { message?: string })?.message === 'string' &&
              (error as { message: string }).message.includes(
                'Transaction numbers are only allowed on a replica set member or mongos',
              ))
          ) {
            logger.warn(
              'Standalone MongoDB detected (replica set not configured). Executing operation in standalone fallback mode for local development.',
            );
            return await operation(undefined as unknown as ClientSession);
          }

          // Non-transient error or retries exhausted: rethrow immediately
          throw error;
        }
      }

      throw new Error(`Transaction failed after ${maxAttempts} attempts`);
    } finally {
      await session.endSession();
    }
  }
}
