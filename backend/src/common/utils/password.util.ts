import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export class PasswordUtil {
  /**
   * Hashes a plaintext password using bcrypt with standard salt rounds.
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compares a plaintext candidate password against a stored bcrypt hash.
   */
  static async compare(candidate: string, hash: string): Promise<boolean> {
    return bcrypt.compare(candidate, hash);
  }
}
